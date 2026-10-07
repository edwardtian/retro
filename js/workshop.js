// Workshop page logic for the local mirror.
//
// Four wizards that create machines and games through the library API served by
// serve.py:
//   1. New Windows installation - upload an install ISO, create a blank HDD and
//      boot the player with a generated machine config.
//   2. Add a Windows VHD      - upload the player's "Download Save File" output
//      (or a raw disk) as a reusable Windows image.
//   3. New game installation  - upload a game ISO and boot an existing Windows
//      image with it mounted as the guest's CD drive.
//   4. Add a new game         - upload the game DDYX and register it, so it
//      shows up in the game list.
// The library section below the tabs lists and deletes what the server stores.
//
// The API answers {"error": "..."} with HTTP 400 on bad input, so nothing here
// trusts a response body: every field is guarded and every failure is surfaced
// in the status line of the wizard that caused it.

(function () {
    "use strict";

    const site = window.LocalSite || {};
    const formatBytes = typeof site.formatBytes === "function"
        ? site.formatBytes
        : function (bytes) { return Number.isFinite(bytes) ? bytes + " B" : "unavailable"; };

    if (typeof site.mountNav === "function") {
        site.mountNav("workshop", { rightText: "create machines and games" });
    }

    const RAM_VALUES = ["64", "128", "192", "256", "384"];

    // ----------------------------------------------------------------- utils

    function $(id) {
        return document.getElementById(id);
    }

    function valueOf(id) {
        const element = $(id);
        return element ? String(element.value || "") : "";
    }

    function fileOf(id) {
        const element = $(id);
        return element && element.files && element.files.length ? element.files[0] : null;
    }

    function parseJson(text) {
        try {
            const value = JSON.parse(text);
            return value && typeof value === "object" ? value : null;
        } catch (error) {
            return null;
        }
    }

    // Status lines are recycled for progress, success and errors: an error is
    // the same element with Bootstrap's text-danger applied.
    function setStatus(element, message, isError) {
        if (!element) return;
        element.replaceChildren();
        element.textContent = message || "";
        element.classList.toggle("text-danger", !!isError);
        element.hidden = !message;
    }

    function setProgress(wrapper, fraction) {
        if (!wrapper) return;
        const bar = wrapper.querySelector(".progress-bar");
        const percent = Math.max(0, Math.min(100, Math.round((fraction || 0) * 100)));
        wrapper.hidden = false;
        if (bar) {
            bar.style.width = percent + "%";
            bar.setAttribute("aria-valuenow", String(percent));
            bar.textContent = percent + "%";
        }
    }

    function resetProgress(wrapper) {
        if (!wrapper) return;
        const bar = wrapper.querySelector(".progress-bar");
        if (bar) {
            bar.style.width = "0%";
            bar.setAttribute("aria-valuenow", "0");
            bar.textContent = "";
        }
        wrapper.hidden = true;
    }

    // Library entries are addressed by `id`; a couple of the API's replies carry
    // only the relative file path, so fall back to that.
    function idOf(entry) {
        if (!entry) return "";
        if (entry.id !== undefined && entry.id !== null && entry.id !== "") return String(entry.id);
        return entry.file ? String(entry.file) : "";
    }

    function setBusy(button, busy) {
        if (!button) return;
        if (busy) {
            if (button.dataset.label === undefined) button.dataset.label = button.textContent;
            button.disabled = true;
            button.textContent = "Working...";
        } else {
            button.disabled = false;
            if (button.dataset.label !== undefined) {
                button.textContent = button.dataset.label;
                delete button.dataset.label;
            }
        }
    }

    // Error text for a failed request: the API's {"error": "..."} when present,
    // otherwise the HTTP status. Never assumes a JSON body.
    function requestError(payload, status) {
        if (payload && typeof payload.error === "string" && payload.error) return payload.error;
        return "HTTP " + status;
    }

    // One XHR helper for every call, so uploads can report progress through the
    // same code path as plain requests.
    function request(method, url, body, contentType) {
        return new Promise(function (resolve, reject) {
            const xhr = new XMLHttpRequest();
            xhr.open(method, url);
            if (contentType) xhr.setRequestHeader("Content-Type", contentType);
            xhr.onload = function () {
                const payload = parseJson(xhr.responseText);
                if (xhr.status >= 200 && xhr.status < 300) {
                    resolve(payload || {});
                } else {
                    reject(new Error(requestError(payload, xhr.status)));
                }
            };
            xhr.onerror = function () { reject(new Error("network error")); };
            xhr.onabort = function () { reject(new Error("request aborted")); };
            xhr.send(body === undefined || body === null ? null : body);
        });
    }

    // Raw-body upload with an upload progress event (the reason the wizards use
    // XMLHttpRequest instead of fetch).
    function uploadFile(file, kind, name, progress) {
        const url = "/api/library/upload?kind=" + encodeURIComponent(kind) +
            "&name=" + encodeURIComponent(name) +
            "&file=" + encodeURIComponent(file.name);
        return new Promise(function (resolve, reject) {
            const xhr = new XMLHttpRequest();
            xhr.open("POST", url);
            xhr.setRequestHeader("Content-Type", "application/octet-stream");
            if (progress && xhr.upload) {
                xhr.upload.addEventListener("progress", function (event) {
                    if (event.lengthComputable) setProgress(progress, event.loaded / event.total);
                });
            }
            xhr.onload = function () {
                const payload = parseJson(xhr.responseText);
                if (xhr.status >= 200 && xhr.status < 300) {
                    if (payload) resolve(payload);
                    else reject(new Error("the upload response was not valid JSON"));
                } else {
                    reject(new Error(requestError(payload, xhr.status)));
                }
            };
            xhr.onerror = function () { reject(new Error("network error")); };
            xhr.onabort = function () { reject(new Error("upload aborted")); };
            xhr.send(file);
        });
    }

    function slugify(text) {
        const slug = String(text || "").toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "");
        return slug || "game";
    }

    function baseName(fileName) {
        return String(fileName || "").replace(/\.[^.]+$/, "") || "upload";
    }

    function ramSelectValue(id) {
        const value = valueOf(id);
        return RAM_VALUES.indexOf(value) >= 0 ? value : "256";
    }

    // ============================================================ 1. windows

    async function runWindowsInstall() {
        const status = $("wininstall-status");
        const progress = $("wininstall-progress");
        const submit = $("wininstall-submit");
        const file = fileOf("wininstall-iso");
        const name = valueOf("wininstall-name").trim();
        const ram = ramSelectValue("wininstall-ram");
        const hdd = valueOf("wininstall-hdd") || "2G";

        if (!file) {
            setStatus(status, "Choose a Windows installation ISO (.iso or .img).", true);
            return;
        }
        if (!name) {
            setStatus(status, "Enter a name for the machine (for example win98se).", true);
            return;
        }

        setBusy(submit, true);
        resetProgress(progress);
        setStatus(status, "Uploading " + file.name + "...");
        if (progress) progress.hidden = false;
        try {
            const iso = await uploadFile(file, "iso", name, progress);
            const isoId = idOf(iso);
            if (!isoId) throw new Error("the server did not return an image id for the ISO");

            resetProgress(progress);
            setStatus(status, "Creating a " + hdd + " blank hard disk...");
            let diskId = null;
            try {
                const disk = await request("POST",
                    "/api/library/blank?name=" + encodeURIComponent(name) +
                    "&size=" + encodeURIComponent(hdd));
                diskId = idOf(disk);
            } catch (error) {
                // A machine with this name already exists: reuse it, so a
                // second attempt (after a failed install, say) does not need a
                // new name - the ISO above is already stored under it.
                if (/already exists/i.test(error.message || "")) {
                    diskId = name;
                    setStatus(status, "Reusing the existing disk " + name + "...");
                } else {
                    throw error;
                }
            }
            if (!diskId) throw new Error("the server did not return an id for the blank disk");

            setStatus(status, "Starting the installer in the player...");
            location.href = "/play.html?config=" + encodeURIComponent(
                "/api/workshop/config?mode=wininstall&iso=" + isoId +
                "&disk=" + diskId + "&ram=" + ram);
        } catch (error) {
            resetProgress(progress);
            setStatus(status, "Could not start the installation: " + error.message, true);
            setBusy(submit, false);
        }
    }

    // ========================================================= 2. windows vhd

    async function runAddWindows() {
        const status = $("addvhd-status");
        const progress = $("addvhd-progress");
        const submit = $("addvhd-submit");
        const file = fileOf("addvhd-file");
        const name = valueOf("addvhd-name").trim();

        if (!file) {
            setStatus(status, "Choose the Windows image file (.ddyx, .zip, .vhd or .img).", true);
            return;
        }
        if (!name) {
            setStatus(status, "Enter a name for this Windows image (for example win98se).", true);
            return;
        }

        setBusy(submit, true);
        resetProgress(progress);
        setStatus(status, "Uploading " + file.name + "...");
        if (progress) progress.hidden = false;
        try {
            const entry = await uploadFile(file, "windows", name, progress);
            resetProgress(progress);
            setStatus(status, "Uploaded " + (entry.name || name) + " (" +
                formatBytes(Number(entry.size)) + "). It is listed under Library.");
            await refreshLibrary();
        } catch (error) {
            resetProgress(progress);
            setStatus(status, "Could not add the Windows image: " + error.message, true);
        }
        setBusy(submit, false);
    }

    // ========================================================== 3. game install

    async function runGameInstall() {
        const status = $("gameinstall-status");
        const progress = $("gameinstall-progress");
        const submit = $("gameinstall-submit");
        const winId = valueOf("gameinstall-win");
        const file = fileOf("gameinstall-iso");
        const name = valueOf("gameinstall-name").trim() || baseName(file && file.name);
        const ram = ramSelectValue("gameinstall-ram");

        if (!winId) {
            setStatus(status, "No Windows image is available. Add one in \"Add a Windows VHD\" first.", true);
            return;
        }
        if (!file) {
            setStatus(status, "Choose the game's installation ISO (.iso or .img).", true);
            return;
        }

        setBusy(submit, true);
        resetProgress(progress);
        setStatus(status, "Uploading " + file.name + "...");
        if (progress) progress.hidden = false;
        try {
            const iso = await uploadFile(file, "iso", name, progress);
            const isoId = idOf(iso);
            if (!isoId) throw new Error("the server did not return an image id for the ISO");

            setStatus(status, "Starting the game installer in the player...");
            location.href = "/play.html?config=" + encodeURIComponent(
                "/api/workshop/config?mode=gameinstall&iso=" + isoId +
                "&win=" + winId + "&ram=" + ram);
        } catch (error) {
            resetProgress(progress);
            setStatus(status, "Could not start the game installation: " + error.message, true);
            setBusy(submit, false);
        }
    }

    // ============================================================= 4. new game

    async function runAddGame() {
        const status = $("addgame-status");
        const progress = $("addgame-progress");
        const submit = $("addgame-submit");
        const winId = valueOf("addgame-win");
        const file = fileOf("addgame-file");
        const title = valueOf("addgame-title").trim();

        // The title is validated first: it is what the user sees, and an entry
        // without one is useless in the game list.
        if (!title) {
            setStatus(status, "Enter a title for the game.", true);
            return;
        }
        if (!file) {
            setStatus(status, "Choose the game's DDYX file (.ddyx, .zip, .vhd or .img).", true);
            return;
        }
        if (!winId) {
            setStatus(status, "No Windows image is available. Add one in \"Add a Windows VHD\" first.", true);
            return;
        }

        const yearText = valueOf("addgame-year").trim();
        const year = yearText && Number.isFinite(Number(yearText)) ? Number(yearText) : null;

        setBusy(submit, true);
        resetProgress(progress);
        setStatus(status, "Uploading " + file.name + "...");
        if (progress) progress.hidden = false;
        try {
            const uploaded = await uploadFile(file, "game", slugify(title), progress);
            const diff = uploaded && (uploaded.file || uploaded.path);
            if (!diff) throw new Error("the upload did not return a file path");

            resetProgress(progress);
            setStatus(status, "Registering the game...");
            const entry = await request("POST", "/api/library/game", JSON.stringify({
                title: title,
                year: year,
                publisher: valueOf("addgame-publisher").trim() || null,
                genre: valueOf("addgame-genre").trim() || null,
                description: valueOf("addgame-description").trim() || null,
                windows: winId,
                diff: diff
            }), "application/json");

            setStatus(status, "Added \"" + ((entry && entry.title) || title) + "\" - ");
            const link = document.createElement("a");
            link.href = "/";
            link.textContent = "your game now appears in the game list";
            status.appendChild(link);
            status.appendChild(document.createTextNode("."));
            status.hidden = false;
            status.classList.remove("text-danger");

            const form = $("form-addgame");
            if (form) form.reset();
            await refreshLibrary();
        } catch (error) {
            resetProgress(progress);
            setStatus(status, "Could not add the game: " + error.message, true);
        }
        setBusy(submit, false);
    }

    // ================================================================ library

    const library = { windows: [], games: [] };

    function libraryErrorText(error) {
        const message = error && error.message ? error.message : "unknown error";
        if (/HTTP (404|405|501)/.test(message)) {
            return "Could not load the library: " + message +
                " - the /api/library endpoints are not available on this server yet.";
        }
        return "Could not load the library: " + message;
    }

    function cell(text, className) {
        const td = document.createElement("td");
        td.textContent = text === undefined || text === null ? "" : String(text);
        if (className) td.className = className;
        return td;
    }

    function renderWindowsRow(entry) {
        const row = document.createElement("tr");
        row.dataset.id = entry && entry.id !== undefined && entry.id !== null ? String(entry.id) : "";

        row.appendChild(cell(entry && entry.name ? entry.name : "(unnamed)"));
        row.appendChild(cell(formatBytes(Number(entry && entry.size)), "workshop-size"));
        row.appendChild(cell(entry && entry.created ? entry.created : "", "workshop-created"));

        const actions = document.createElement("td");
        actions.className = "text-end workshop-row-actions";
        if (entry && entry.file) {
            const download = document.createElement("a");
            download.className = "btn btn-sm btn-outline-secondary me-1";
            download.href = "/api/library/file?path=" + encodeURIComponent(entry.file);
            download.textContent = "Download";
            actions.appendChild(download);
        }
        const remove = document.createElement("button");
        remove.type = "button";
        remove.className = "btn btn-sm btn-outline-danger";
        remove.textContent = "Delete";
        remove.addEventListener("click", function () {
            deleteLibraryEntry("windows", row.dataset.id, remove);
        });
        actions.appendChild(remove);
        row.appendChild(actions);
        return row;
    }

    function renderGameRow(entry) {
        const row = document.createElement("tr");
        row.dataset.id = entry && entry.id !== undefined && entry.id !== null ? String(entry.id) : "";

        row.appendChild(cell(entry && entry.title ? entry.title : "(untitled)"));
        const details = [entry && entry.year, entry && entry.publisher, entry && entry.genre]
            .filter(Boolean).join(" - ");
        const detailsCell = cell(details, "local-subtle");
        detailsCell.title = (entry && entry.description) || "";
        row.appendChild(detailsCell);
        row.appendChild(cell(windowsName(entry && entry.windows)));

        const actions = document.createElement("td");
        actions.className = "text-end workshop-row-actions";
        const remove = document.createElement("button");
        remove.type = "button";
        remove.className = "btn btn-sm btn-outline-danger";
        remove.textContent = "Delete";
        remove.addEventListener("click", function () {
            deleteLibraryEntry("game", row.dataset.id, remove);
        });
        actions.appendChild(remove);
        row.appendChild(actions);
        return row;
    }

    function windowsName(id) {
        if (id === undefined || id === null || id === "") return "";
        const match = library.windows.filter(function (entry) {
            return String(entry && entry.id) === String(id);
        })[0];
        return match && match.name ? match.name : String(id);
    }

    function renderLibrary() {
        const windowsBody = $("library-windows");
        const gamesBody = $("library-games");
        if (windowsBody) {
            windowsBody.replaceChildren();
            library.windows.forEach(function (entry) {
                windowsBody.appendChild(renderWindowsRow(entry || {}));
            });
        }
        if (gamesBody) {
            gamesBody.replaceChildren();
            library.games.forEach(function (entry) {
                gamesBody.appendChild(renderGameRow(entry || {}));
            });
        }
        const windowsEmpty = $("library-windows-empty");
        if (windowsEmpty) windowsEmpty.hidden = library.windows.length > 0;
        const gamesEmpty = $("library-games-empty");
        if (gamesEmpty) gamesEmpty.hidden = library.games.length > 0;
        fillWindowsSelect("gameinstall-win", "gameinstall-win-hint");
        fillWindowsSelect("addgame-win", "addgame-win-hint");
    }

    // Both wizard selects list the same images; an empty list disables them and
    // points at the wizard that creates one.
    function fillWindowsSelect(selectId, hintId) {
        const select = $(selectId);
        const hint = $(hintId);
        if (!select) return;
        const previous = select.value;
        select.replaceChildren();

        if (library.windows.length === 0) {
            const option = document.createElement("option");
            option.value = "";
            option.textContent = "No Windows image available";
            select.appendChild(option);
            select.disabled = true;
            if (hint) hint.textContent = "Add one in \"Add a Windows VHD\" first.";
            return;
        }

        select.disabled = false;
        if (hint) hint.textContent = "";
        library.windows.forEach(function (entry) {
            const option = document.createElement("option");
            option.value = entry && entry.id !== undefined && entry.id !== null ? String(entry.id) : "";
            option.textContent = entry && entry.name ? entry.name : option.value;
            if (entry && entry.size !== undefined) {
                option.textContent += " (" + formatBytes(Number(entry.size)) + ")";
            }
            select.appendChild(option);
        });
        if (previous && library.windows.some(function (entry) {
            return entry && String(entry.id) === previous;
        })) {
            select.value = previous;
        }
    }

    async function refreshLibrary() {
        const status = $("library-status");
        setStatus(status, "Loading the library...");
        try {
            const payload = await request("GET", "/api/library");
            library.windows = payload && Array.isArray(payload.windows) ? payload.windows : [];
            library.games = payload && Array.isArray(payload.games) ? payload.games : [];
            renderLibrary();
            setStatus(status, "");
            return true;
        } catch (error) {
            library.windows = [];
            library.games = [];
            renderLibrary();
            setStatus(status, libraryErrorText(error), true);
            return false;
        }
    }

    async function deleteLibraryEntry(kind, id, button) {
        const status = $("library-status");
        if (button) button.disabled = true;
        try {
            await request("DELETE", "/api/library/" + kind + "?id=" + encodeURIComponent(id));
            await refreshLibrary();
            setStatus(status, "Deleted " + kind + " entry " + id + ".");
        } catch (error) {
            if (button) button.disabled = false;
            setStatus(status, "Could not delete " + kind + " entry " + id + ": " + error.message, true);
        }
    }

    // ================================================================= wiring

    function onSubmit(formId, handler) {
        const form = $(formId);
        if (!form) return;
        form.addEventListener("submit", function (event) {
            event.preventDefault();
            Promise.resolve(handler()).catch(function (error) {
                // Each handler reports its own failures; this is the last net so
                // a bug can never leave the page silently stuck.
                const status = form.querySelector(".workshop-status");
                setStatus(status, "Unexpected error: " + (error && error.message), true);
            });
        });
    }

    onSubmit("form-wininstall", runWindowsInstall);
    onSubmit("form-addvhd", runAddWindows);
    onSubmit("form-gameinstall", runGameInstall);
    onSubmit("form-addgame", runAddGame);

    const refresh = $("library-refresh");
    if (refresh) refresh.addEventListener("click", function () { refreshLibrary(); });

    // Exposed for tests: lets the smoke test read the page's own view of the
    // library instead of scraping the DOM for it.
    window.WorkshopPage = {
        refreshLibrary: refreshLibrary,
        library: library,
        uploadFile: uploadFile
    };

    refreshLibrary();
})();
