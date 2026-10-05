(function (root) {
    "use strict";
    const MAX_BYTES = 32768, MAX_CONTROLS = 128;
    const MIN_SENSITIVITY = .1, MAX_SENSITIVITY = 2, DEFAULT_SENSITIVITY = .5, SENSITIVITY_STEP = .01;
    const KEY_CODES = [
        ...Array.from({ length: 10 }, (_, i) => "Digit" + i), ...[..."ABCDEFGHIJKLMNOPQRSTUVWXYZ"].map(c => "Key" + c),
        ...Array.from({ length: 12 }, (_, i) => "F" + (i + 1)),
        ...("Escape Tab Backspace Enter Space AltLeft AltRight ControlLeft ControlRight ShiftLeft ShiftRight CapsLock ScrollLock NumLock " +
            "Backquote Minus Equal Backslash BracketLeft BracketRight Semicolon Quote Period Comma Slash UnidentifiedLtGt " +
            "PrintScreen Pause Insert Home PageUp Delete End PageDown ArrowLeft ArrowUp ArrowDown ArrowRight " +
            "NumpadDivide NumpadMultiply NumpadSubtract NumpadAdd NumpadEnter NumpadDecimal MetaLeft ContextMenu MetaRight").split(" "),
        ...Array.from({ length: 10 }, (_, i) => "Numpad" + i)
    ];
    const keys = new Set(KEY_CODES);
    const clamp = (value, low, high) => Math.min(Math.max(value, low), high);
    const bytes = value => new TextEncoder().encode(typeof value === "string" ? value : JSON.stringify(value)).length;
    const clone = value => JSON.parse(JSON.stringify(value));
    function fields(value, names, optional = []) {
        return value && typeof value === "object" && !Array.isArray(value) &&
            names.every(name => Object.hasOwn(value, name)) && Object.keys(value).every(name => names.includes(name) || optional.includes(name));
    }
    function validBinding(type, binding) {
        return typeof binding === "string" && (type === "key" ? keys.has(binding) :
            type === "mouse" ? ["0", "1", "2"].includes(binding) : type === "wheel" ? ["up", "down"].includes(binding) :
            type === "gamepad" ? ["0", "1", "2", "3"].includes(binding) : type === "stick" && ["arrows", "mouse", "axes12", "axes34"].includes(binding));
    }
    function decode(value, gameId, stored) {
        if (!fields(value, ["version", "gameId", "controls"]) || value.version !== 1 || value.gameId !== gameId ||
            typeof gameId !== "string" || !gameId.length || gameId.length > 256 || /[\\/\x00-\x1f\x7f-\x9f]/.test(gameId) ||
            !Array.isArray(value.controls) || value.controls.length > MAX_CONTROLS || bytes(value) > MAX_BYTES) throw new Error("invalid_layout");
        const ids = new Set();
        for (const c of value.controls) {
            if (!fields(c, ["id", "type", "binding", "anchorX", "anchorY", "x", "y", "size"], ["sensitivity"]) ||
                typeof c.id !== "string" || !c.id.length || c.id.length > 64 || /[^a-zA-Z0-9_-]/.test(c.id) || ids.has(c.id) || !validBinding(c.type, c.binding) ||
                !["left", "center", "right"].includes(c.anchorX) || !["top", "center", "bottom"].includes(c.anchorY) ||
                !Number.isFinite(c.x) || !Number.isFinite(c.y) || Math.abs(c.x) > 10000 || Math.abs(c.y) > 10000) throw new Error("invalid_layout");
            ids.add(c.id);
            if (Object.hasOwn(c, "sensitivity") && (c.type !== "stick" || c.binding !== "mouse" ||
                !Number.isFinite(c.sensitivity) || c.sensitivity < MIN_SENSITIVITY || c.sensitivity > (stored ? 3 : MAX_SENSITIVITY))) throw new Error("invalid_layout");
            if (c.size !== null) {
                const min = c.type === "stick" ? 64 : 24;
                if (!fields(c.size, ["width", "height"]) || ![c.size.width, c.size.height].every(n => Number.isFinite(n) && n >= min && n <= 512) ||
                    c.type === "stick" && c.size.width !== c.size.height) throw new Error("invalid_layout");
            }
        }
        const config = clone(value);
        // Previous version-1 layouts allowed up to 3. Preserve the layout while applying the new range.
        if (stored) for (const c of config.controls) if (c.sensitivity > MAX_SENSITIVITY) c.sensitivity = MAX_SENSITIVITY;
        return config;
    }
    function validate(value, gameId) { return decode(value, gameId, false); }
    function readConfig(value, gameId) { return decode(value, gameId, true); }
    function defaults(gameId) {
        const item = (id, type, binding, anchorX, x, y) => ({ id, type, binding, anchorX, anchorY: "bottom", x, y, size: null });
        return { version: 1, gameId, controls: [
            item("up", "key", "ArrowUp", "left", 68, -114), item("left", "key", "ArrowLeft", "left", 22, -68),
            item("down", "key", "ArrowDown", "left", 68, -22), item("right", "key", "ArrowRight", "left", 114, -68),
            item("escape", "key", "Escape", "left", 68, -174), item("mouse-left", "mouse", "0", "right", -94, -70),
            item("mouse-right", "mouse", "1", "right", -30, -70), item("enter", "key", "Enter", "right", -30, -22),
            item("space", "key", "Space", "center", 0, -22)
        ] };
    }
    const keyLabels = { Escape: "Esc", ArrowUp: "↑", ArrowDown: "↓", ArrowLeft: "←", ArrowRight: "→", Backquote: "`", Minus: "-", Equal: "=",
        Backslash: "\\", BracketLeft: "[", BracketRight: "]", Semicolon: ";", Quote: "'", Period: ".", Comma: ",", Slash: "/", UnidentifiedLtGt: "<>",
        Backspace: "⌫", CapsLock: "Caps", ScrollLock: "ScrLk", NumLock: "Num", PrintScreen: "PrtSc", PageUp: "PgUp", PageDown: "PgDn",
        ShiftLeft: "⇧ L", ShiftRight: "⇧ R", ControlLeft: "Ctrl L", ControlRight: "Ctrl R", AltLeft: "Alt L", AltRight: "Alt R",
        MetaLeft: "Win L", MetaRight: "Win R", ContextMenu: "Menu", NumpadDivide: "Num /", NumpadMultiply: "Num *", NumpadSubtract: "Num -",
        NumpadAdd: "Num +", NumpadEnter: "Num ↵", NumpadDecimal: "Num ." };
    function label(c, text = s => s) {
        if (c.type === "key") return keyLabels[c.binding] || (/^(Key|Digit)/.test(c.binding) ? c.binding.replace(/^(Key|Digit)/, "") :
            /^Numpad\d$/.test(c.binding) ? "Num " + c.binding.slice(-1) : c.binding);
        if (c.type === "mouse") return text(["Left click", "Right click", "Middle click"][Number(c.binding)]);
        if (c.type === "wheel") return text(c.binding === "up" ? "Scroll up" : "Scroll down");
        if (c.type === "gamepad") return text("Button") + " " + (Number(c.binding) + 1);
        return text({ arrows: "Arrow keys", mouse: "Mouse stick", axes12: "Gamepad axes 1/2", axes34: "Gamepad axes 3/4" }[c.binding]);
    }
    function catalog() {
        return [
            { type: "stick", binding: "arrows", category: "Keyboard" },
            ...KEY_CODES.map(binding => ({ type: "key", binding, category: "Keyboard" })),
            { type: "stick", binding: "mouse", category: "Mouse" },
            ...["0", "1", "2"].map(binding => ({ type: "mouse", binding, category: "Mouse" })),
            ...["up", "down"].map(binding => ({ type: "wheel", binding, category: "Mouse" })),
            ...["axes12", "axes34"].map(binding => ({ type: "stick", binding, category: "Gamepad" })),
            ...["0", "1", "2", "3"].map(binding => ({ type: "gamepad", binding, category: "Gamepad" }))
        ];
    }
    function size(c, viewportWidth) {
        if (c.size) return { ...c.size };
        if (c.type === "stick") return { width: 120, height: 120 };
        return { width: c.type === "key" && c.binding === "Space" ? clamp(viewportWidth * .24, 88, 160) :
            c.type === "mouse" || c.type === "wheel" || ["Escape", "Enter"].includes(c.binding) ? 60 : 44, height: 44 };
    }
    function origin(c, v) {
        return { x: c.anchorX === "left" ? v.left : c.anchorX === "right" ? v.width - v.right : v.width / 2,
            y: c.anchorY === "top" ? v.top : c.anchorY === "bottom" ? v.height - v.bottom : v.height / 2 };
    }
    function geometry(c, v) {
        let { width, height } = size(c, v.width);
        const fit = Math.max(0, Math.min(1, (v.width - v.left - v.right) / width, (v.height - v.top - v.bottom) / height));
        width *= fit; height *= fit;
        const at = origin(c, v);
        return { x: clamp(at.x + c.x, v.left + width / 2, v.width - v.right - width / 2),
            y: clamp(at.y + c.y, v.top + height / 2, v.height - v.bottom - height / 2), width, height };
    }
    function place(c, x, y, v) {
        const round = n => Math.round(n * 1000) / 1000;
        c.anchorX = x < v.width / 3 ? "left" : x > v.width * 2 / 3 ? "right" : "center";
        c.anchorY = y < v.height / 3 ? "top" : y > v.height * 2 / 3 ? "bottom" : "center";
        const at = origin(c, v);
        c.x = round(x - at.x); c.y = round(y - at.y);
    }
    function editGeometry(start, initialPoints, points, v, minimum) {
        const midpoint = list => ({ x: list.reduce((s, p) => s + p.x, 0) / list.length, y: list.reduce((s, p) => s + p.y, 0) / list.length });
        const from = midpoint(initialPoints), to = midpoint(points);
        let ratio = 1;
        if (points.length === 2) {
            const distance = Math.hypot(initialPoints[1].x - initialPoints[0].x, initialPoints[1].y - initialPoints[0].y);
            if (distance > 1) ratio = Math.hypot(points[1].x - points[0].x, points[1].y - points[0].y) / distance;
            const max = Math.min(512 / start.width, 512 / start.height, (v.width - v.left - v.right) / start.width, (v.height - v.top - v.bottom) / start.height);
            ratio = clamp(ratio, Math.min(max, minimum / Math.min(start.width, start.height)), max);
        }
        const width = start.width * ratio, height = start.height * ratio;
        return { x: clamp(start.x + to.x - from.x, v.left + width / 2, v.width - v.right - width / 2),
            y: clamp(start.y + to.y - from.y, v.top + height / 2, v.height - v.bottom - height / 2), width, height };
    }
    class LayoutStore {
        constructor(options) {
            Object.assign(this, { fetcher: (...args) => fetch(...args), notify: () => {}, ...options });
            this.key = "ddyx:touch-layout:v1:" + (this.userId || "guest") + ":" + this.gameId;
            this.epoch = 0;
            try { this.storage = options.storage === undefined ? root.localStorage : options.storage; }
            catch { this.notify("storageError"); }
        }
        cancelLoad() { this.epoch++; }
        reportFailure(error, notice) {
            this.lastLoadFailed = true;
            if (error?.message === "account_changed") { this.cancelLoad(); notice = "accountChanged"; }
            else if (error?.message === "authentication_required") notice = "authenticationRequired";
            else if (error?.message === "invalid_owner") notice = "ownerRequired";
            this.notify(notice);
        }
        read() {
            if (this.unstored) return this.record;
            try {
                const raw = this.storage?.getItem(this.key);
                if (raw) {
                    if (bytes(raw) > MAX_BYTES + 2048) throw new Error();
                    const record = JSON.parse(raw);
                    if (record.owner !== (this.userId || "guest") || typeof record.revision !== "string" || typeof record.pending !== "boolean") throw new Error();
                    this.record = { ...record, config: readConfig(record.config, this.gameId) };
                }
            } catch { this.notify("storageError"); }
            return this.record;
        }
        write(record, acknowledged = false) {
            const previous = this.record;
            this.record = record;
            try {
                if (!this.storage) throw new Error();
                this.storage.setItem(this.key, JSON.stringify(record)); this.unstored = false;
                return true;
            } catch {
                if (!this.unstored) this.unstoredRevision = previous?.revision;
                this.unstored = true;
                // A stale pending disk copy must not overwrite a newer acknowledged cloud save on reload.
                if (acknowledged) {
                    try {
                        const disk = JSON.parse(this.storage?.getItem(this.key) || "null");
                        if (disk?.pending && (disk.revision === record.revision || disk.revision === this.unstoredRevision)) this.storage.removeItem(this.key);
                    }
                    catch { /* The error is reported below; the in-memory copy remains usable. */ }
                }
                this.notify("storageError"); return false;
            }
        }
        save(config) {
            this.cancelLoad();
            const record = { owner: this.userId || "guest", revision: root.crypto.randomUUID(), pending: !!(this.gold && this.userId), config: validate(config, this.gameId) };
            if (this.write(record)) this.notify("localSaved");
            if (record.pending) void this.flush();
        }
        async request(method, config) {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 10000);
            try {
                const url = "/api/cloud/aws/touchlayout?gameid=" + encodeURIComponent(this.gameId)
                    + (method === "POST" ? "&owner=" + encodeURIComponent(this.userId) : "");
                const response = await this.fetcher(url, {
                    method, credentials: "same-origin", cache: "no-store", signal: controller.signal,
                    headers: method === "POST" ? { "Content-Type": "application/json", RequestVerificationToken: this.token } : {},
                    ...(method === "POST" ? { body: JSON.stringify(config), keepalive: true } : {})
                });
                const result = await response.json();
                if (!response.ok || result?.status !== true) throw new Error(result?.code || "cloud_error");
                if (typeof result.userId !== "string" || !result.userId) throw new Error("invalid_response");
                if (result.userId !== this.userId) throw new Error("account_changed");
                return result;
            } finally { clearTimeout(timeout); }
        }
        flush() {
            if (this.upload) return this.upload;
            if (!this.gold || !this.userId) return Promise.resolve(false);
            // 2026-10-05: One failed identity check must not disable this page forever.
            // Each attempt is owner-checked by the API and its response; a failure keeps
            // this owner's pending copy for the next explicit attempt (touch-layout.test.cjs).
            this.upload = (async () => {
                let record;
                while ((record = this.read())?.pending) {
                    const revision = record.revision;
                    this.notify("syncing");
                    try { await this.request("POST", record.config); }
                    catch (error) { this.reportFailure(error, "cloudError"); return false; }
                    // A response acknowledges only its snapshot, never a newer edit/tab's pending write.
                    const latest = this.read();
                    if (latest?.revision === revision) this.write({ ...latest, pending: false }, true);
                    else if (latest && !latest.pending) this.write({ ...latest, pending: true });
                }
                this.notify("cloudSaved"); return true;
            })().finally(() => { this.upload = null; });
            return this.upload;
        }
        async load() {
            const epoch = ++this.epoch;
            this.lastLoadFailed = false;
            const current = () => epoch === this.epoch;
            const local = this.read();
            if (!this.gold || !this.userId) return local?.config || defaults(this.gameId);
            if (local?.pending && !await this.flush()) { this.lastLoadFailed = true; return current() ? this.read()?.config : null; }
            if (!current()) return null;
            try {
                const revision = this.read()?.revision;
                const result = await this.request("GET");
                if (!current()) return null;
                if (this.read()?.revision !== revision) return this.read()?.config || null;
                if (result.exists === false) return this.read()?.config || defaults(this.gameId);
                if (result.exists !== true) throw new Error("invalid_layout");
                const config = readConfig(result.config, this.gameId);
                this.write({ owner: this.userId, revision: root.crypto.randomUUID(), pending: false, config }, true);
                return config;
            } catch (error) {
                if (current()) { this.reportFailure(error, "loadError"); return this.read()?.config || null; }
                return null;
            }
        }
    }
    root.DDYXTouchLayout = { MAX_BYTES, MAX_CONTROLS, MIN_SENSITIVITY, MAX_SENSITIVITY, DEFAULT_SENSITIVITY, SENSITIVITY_STEP, KEY_CODES, validate, defaults, label, catalog, size, geometry, place, editGeometry, LayoutStore };
    if (typeof module === "object" && module.exports) module.exports = root.DDYXTouchLayout;
})(globalThis);
