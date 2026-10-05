// 2026-09-28: DOSX and Windows share one selection state machine. Late queries
// never replace a manual choice or an already frozen launch.
(function (root) {
    "use strict";
    const absent = state => state === "missing" || state === "unavailable";
    function deadline(work, ms = 15000) {
        let timer;
        return Promise.race([Promise.resolve().then(work), new Promise((_, reject) => {
            timer = setTimeout(() => reject(new Error("Save query timed out")), ms);
        })]).finally(() => clearTimeout(timer));
    }
    class SaveSources {
        constructor(options) {
            this.options = options;
            this.cloud = { state: "loading", history: [] };
            this.browser = { state: "loading" };
            this.opfs = { state: "loading" };
            this.selected = null; this.manual = false; this.busy = false;
            this.uploading = false; this.generation = 0; this.uploadGeneration = 0;
        }
        notify() { this.options.changed?.(this); }
        autoSelect() {
            if (this.manual || this.busy) return;
            if (this.cloud.state === "available") this.selected = 0;
            else if (absent(this.cloud.state) && this.browser.state === "available") this.selected = 1;
            else if (absent(this.cloud.state) && absent(this.browser.state)) this.selected = -1;
            else this.selected = null;
        }
        async refresh() {
            if (this.busy) return;
            const generation = ++this.generation;
            this.cloud = { state: "loading", history: [] }; this.browser = { state: "loading" };
            this.opfs = { state: "loading" };
            this.autoSelect(); this.notify();
            await Promise.all(["cloud", "browser", "opfs"].map(async key => {
                let value;
                try {
                    value = await deadline(() => this.options[key](), this.options.timeout);
                    if (!value || !["available", "missing", "unavailable"].includes(value.state)) throw new Error("Invalid save status");
                } catch (error) { value = { state: "error", error }; }
                if (generation !== this.generation) return;
                this[key] = value;
                if (key === "cloud" && this.selected >= 3 && this.versionId && !this.busy) {
                    const index = (value.history || []).findIndex(v => v.versionId === this.versionId);
                    this.historyMissing = index < 0;
                    if (index >= 0) this.selected = index + 3;
                }
                this.autoSelect(); this.notify();
            }));
        }
        valid(index = this.selected) {
            if (index === -1) return true;
            if (index === 0) return this.cloud.state === "available";
            if (index === 1) return this.browser.state === "available";
            if (index === 2) return !!this.upload && !this.uploading;
            return index >= 3 && this.cloud.state === "available" && !this.historyMissing &&
                (this.cloud.history || []).some(v => v.versionId === this.versionId);
        }
        select(index) {
            if (!Number.isInteger(index) || index < -1) return false;
            if (this.busy || this.uploading) return false;
            const history = index >= 3 ? this.cloud.history?.[index - 3] : null;
            if (index >= 3 && !history) return false;
            if (index < 3 && !this.valid(index)) return false;
            this.selected = index; this.manual = true; this.historyMissing = false;
            this.versionId = history?.versionId;
            this.notify(); return true;
        }
        async chooseUpload(pick) {
            if (this.busy || this.uploading) return;
            const generation = ++this.uploadGeneration, previous = this.selected, wasManual = this.manual;
            this.manual = true; this.uploading = true; this.notify();
            try {
                const file = await pick();
                if (generation !== this.uploadGeneration) return;
                if (file) {
                    if (!file.size || typeof file.arrayBuffer !== "function") throw new Error("Invalid save file");
                    this.upload = file; this.selected = 2; this.versionId = undefined;
                } else { this.selected = previous; this.manual = wasManual; }
            } catch (error) {
                this.selected = previous; this.manual = wasManual; throw error;
            } finally {
                if (generation === this.uploadGeneration) { this.uploading = false; this.autoSelect(); this.notify(); }
            }
        }
        freeze() {
            if (this.busy || this.uploading || !this.valid()) throw new Error("Select an available save source before starting");
            this.busy = true; this.notify();
            return Object.freeze({ save: this.selected, startupMode: this.selected === -1 ? "continue" : "restore",
                cloudVersionId: this.selected === 0 ? this.cloud.versionId : this.selected >= 3 ? this.versionId : undefined,
                upload: this.selected === 2 ? this.upload : undefined });
        }
        release() { this.busy = false; this.notify(); }
    }
    async function probeCloud(game) {
        const login = await $.ajax({ url: "/api/auth/login", timeout: 15000 });
        // The login endpoint reports service exceptions as status:false/message.
        // That response cannot establish that the user has no cloud permission.
        if (!login || typeof login.status !== "boolean" || login.message !== undefined ||
            login.status && ![0, 1].includes(login.member)) throw new Error("Cannot query login status");
        if (!login.status || login.member !== 1) return { state: "unavailable", history: [] };
        const result = await $.ajax({ url: "/api/cloud/aws/getgamesaveinfo", data: { gameid: game }, timeout: 15000 });
        if (result.status === false && [1, 2].includes(result.code)) return { state: "unavailable", history: [] };
        if (result.status === true && result.exists === true && result.size > 0) return {
            state: "available", size: result.size, date: result.date, versionId: result.versionId,
            history: (result.history || []).filter(v => typeof v.versionId === "string" && v.versionId.length > 0)
        };
        if (result.exists === false) return { state: "missing", history: [] };
        throw new Error("Cannot query cloud saves");
    }
    async function probeBrowser(game, namespace) {
        const db = new IDB(namespace);
        try { await db.Open(); const size = await db.GetSize(game); return { state: size === null ? "missing" : "available", size }; }
        finally { db.Close(); }
    }
    async function probeOPFS(game) {
        // Match the Worker's games/<encoded name> namespace without creating it.
        if (typeof game !== "string" || !game.trim() || game === "." || game === ".." || /[\\/\0]/.test(game)) {
            throw new Error("Invalid OPFS game name");
        }
        const key = encodeURIComponent(game);
        const root = await navigator.storage.getDirectory();
        try {
            const games = await root.getDirectoryHandle("games", { create: false });
            await games.getDirectoryHandle(key, { create: false });
            return { state: "available" };
        } catch (error) {
            if (error.name === "NotFoundError") return { state: "missing" };
            throw error;
        }
    }
    function pickFile() {
        return new Promise((resolve, reject) => {
            const input = document.createElement("input"); input.type = "file";
            input.onchange = () => resolve(input.files?.[0] || null);
            input.oncancel = () => resolve(null);
            try { input.click(); } catch (error) { reject(error); }
        });
    }
    function mount(options) {
        const select = $("#dosWindowSaveSelector"), wrapper = select.parent(), list = wrapper.children("ul");
        const text = options.text;
        $("<option>", { value: -1, text: text.loading }).prependTo(select);
        $("<li>", { rel: -1, text: text.loading }).prependTo(list);
        const row = wrapper.parent().addClass("save-source-row");
        const retry = $("<button>", { type: "button", text: text.retry, class: "save-source-retry" }).hide().insertAfter(wrapper);
        const status = $("<div>", { role: "status", "aria-live": "polite", class: "save-source-status" }).insertAfter(row);
        const label = (key, value) => {
            select.children("option[value='" + key + "']").text(value);
            list.children("li[rel='" + key + "']").text(value);
        };
        const controller = new SaveSources({
            cloud: () => probeCloud(options.game), browser: () => probeBrowser(options.game, options.browserSaveNamespace), opfs: () => probeOPFS(options.game),
            changed(state) {
                label(-1, state.opfs.state === "available" ? text.continue : state.opfs.state === "missing" ? text.fresh :
                    state.opfs.state === "error" ? text.continue + " (" + text.failed + ")" : text.loading);
                select.children("option.cloud-save-history").remove(); list.children("li.cloud-save-history").remove();
                (state.cloud.history || []).forEach((v, i) => {
                    const name = text.history + " " + (i + 1) + " (" + (v.size / 1048576).toFixed(2) + " MB " + new Date(v.date).toLocaleString() + ")";
                    $("<option>", { value: i + 3, text: name, class: "cloud-save-history" }).insertBefore(select.children("option[value='1']"));
                    $("<li>", { rel: i + 3, text: name, class: "cloud-save-history" }).insertBefore(list.children("li[rel='1']"));
                });
                [[0, state.cloud, text.cloud], [1, state.browser, text.browser]].forEach(([key, source, name]) => {
                    const detail = source.state === "available" ? (source.size / 1048576).toFixed(2) + " MB" + (source.date ? " " + new Date(source.date).toLocaleString() : "") :
                        source.state === "loading" ? text.loading : source.state === "error" ? text.failed :
                        source.state === "unavailable" ? text.members : text.empty;
                    label(key, name + " (" + detail + ")");
                });
                label(2, text.upload + (state.upload ? " (" + (state.upload.size / 1048576).toFixed(2) + " MB)" : "..."));
                select.val(state.selected === null ? [] : state.selected);
                wrapper.children("div.select-styled").text(state.selected === null ? text.loading :
                    state.historyMissing ? text.failed : select.children(":selected").text());
                select.children("option").each(function () {
                    const index = Number(this.value), allowed = index === 2 || index >= 3 && state.cloud.state === "available" || state.valid(index);
                    $(this).prop("disabled", !allowed || state.busy || state.uploading);
                    list.children("li[rel='" + index + "']").attr("aria-disabled", String(this.disabled)).toggleClass("disabled", this.disabled);
                });
                // jQuery toggle(undefined) reverses visibility instead of hiding.
                const failed = state.cloud.state === "error" || state.browser.state === "error" || state.opfs.state === "error" || state.historyMissing === true;
                status.text(failed ? text.failed : state.uploading ? text.loading : "");
                retry.toggle(failed && !state.busy).prop("disabled", state.uploading);
                $("#dosWindowGameStartButton").prop("disabled", state.busy || state.uploading || !state.valid());
                options.changed?.(state);
            }
        });
        const choose = async index => {
            try { if (index === 2) await controller.chooseUpload(pickFile); else controller.select(index); }
            catch (error) { options.error(error); }
            controller.notify();
        };
        list.children("li").off("click");
        list.on("click", "li", function (event) {
            event.stopPropagation();
            if ($(this).attr("aria-disabled") === "true") return;
            wrapper.children("div.select-styled").removeClass("active"); list.hide();
            choose(Number($(this).attr("rel")));
        });
        select.on("change", () => choose(Number(select.val())));
        retry.on("click", () => controller.refresh());
        controller.ready = controller.refresh(); return controller;
    }
    root.DDYXSaveSources = { SaveSources, mount, pickFile };
    if (typeof module === "object" && module.exports) module.exports = root.DDYXSaveSources;
})(typeof globalThis === "object" ? globalThis : this);
