// Settings page logic for the local mirror.
//
// Implements the same two areas as the original site's /Settings page:
//   * Game controller - default controller + basic mapping (The same
//     localStorage keys the dumped player reads are written here, so the
//     mapping takes effect in the game: settings_game_controller_id,
//     settings_game_controller_index, settings_game_controller_basic_mapping.)
//   * Storage - browser quota, local game cache size (IndexedDB image stores +
//     OPFS), local save size (js-dos-cache databases) and clearing them.
// Plus a "Player defaults" area for the options this mirror exposes (mouse,
// 3Dfx upscaler, default save source).

(function () {
    "use strict";

    const site = window.LocalSite;
    const config = window.LOCAL_GAME_CONFIG || {};
    const gameId = config.gameId || "game";

    // Storage layout used by the player (same databases the original lists).
    const IMAGE_DATABASES = [
        ["/home/web_user", "FILE_DATA"],
        ["/home/web_user/DDYXXCD", "FILE_DATA"],
        ["/home/web_user_x", "FILE_DATA"],
        ["emscripten_filesystem", "FILES"]
    ];
    const SAVE_DATABASES = [
        ["js-dos-cache (emulators-ui-saves)", "files"],
        ["js-dos-cache-x", "files"]
    ];

    const BASIC_MAPPING_KEY = "settings_game_controller_basic_mapping";
    const CONTROLLER_ID_KEY = "settings_game_controller_id";
    const CONTROLLER_INDEX_KEY = "settings_game_controller_index";
    const ADVANCED_KEY = "local_advanced_mappings";
    const DEFAULT_BASIC_MAPPING = { axes: [0, null, 1, null], buttons: [0, 1, 2, 3] };

    const bytes = site.formatBytes;

    // ------------------------------------------------------------------ nav
    site.mountNav("settings");

    // -------------------------------------------------------------- storage

    const storage = {
        refreshing: null,
        clearing: false
    };

    function storageError(message) {
        const box = document.getElementById("storage-error");
        box.textContent = message || "";
        box.hidden = !message;
    }

    function readDatabaseSize(name, store) {
        return indexedDB.databases().then(function (databases) {
            if (!databases.some(function (db) { return db.name === name; })) return 0;
            return new Promise(function (resolve, reject) {
                const request = indexedDB.open(name);
                let created = false;
                request.onupgradeneeded = function () {
                    // Opening a missing database would create it; abort instead.
                    created = true;
                    request.transaction.abort();
                };
                request.onblocked = function () { reject(new Error("Database is in use: " + name)); };
                request.onerror = function () { created ? resolve(0) : reject(request.error); };
                request.onsuccess = function () {
                    const db = request.result;
                    if (created || !db.objectStoreNames.contains(store)) { db.close(); resolve(0); return; }
                    let total = 0;
                    const transaction = db.transaction([store], "readonly");
                    const cursorRequest = transaction.objectStore(store).openCursor();
                    cursorRequest.onsuccess = function () {
                        const cursor = cursorRequest.result;
                        if (!cursor) return;
                        const value = cursor.value;
                        const size = value && Number.isFinite(value.byteLength) ? value.byteLength
                            : value && value.contents && Number.isFinite(value.contents.byteLength) ? value.contents.byteLength
                                : 0;
                        total += size;
                        cursor.continue();
                    };
                    cursorRequest.onerror = function () { reject(cursorRequest.error); };
                    transaction.oncomplete = function () { db.close(); resolve(total); };
                    transaction.onabort = transaction.onerror = function () {
                        db.close();
                        reject(transaction.error || new Error("Cannot read " + name));
                    };
                };
            });
        });
    }

    function readOpfsSize(onProgress) {
        if (!navigator.storage || !navigator.storage.getDirectory) return Promise.resolve(0);
        return navigator.storage.getDirectory().then(function walkRoot(root) {
            let total = 0;
            async function walk(directory) {
                for await (const handle of directory.values()) {
                    if (handle.kind === "directory") { await walk(handle); continue; }
                    try {
                        const file = await handle.getFile();
                        total += file.size;
                        if (onProgress) onProgress(file.size);
                    } catch (error) {
                        if (error.name !== "NotFoundError") throw error;
                    }
                }
            }
            return walk(root).then(function () { return total; });
        });
    }

    function refreshBrowserUsage() {
        return navigator.storage.estimate().then(function (estimate) {
            const used = estimate.usage;
            const quota = estimate.quota;
            if (!Number.isFinite(used) || !Number.isFinite(quota) || quota <= 0) throw new Error("unavailable");
            const percentage = Math.min(100, Math.ceil(used / quota * 100));
            const free = Math.max(0, quota - used);
            document.getElementById("usage-bar").style.width = percentage + "%";
            document.getElementById("available-bar").style.width = (100 - percentage) + "%";
            document.getElementById("span-used").textContent = bytes(used);
            document.getElementById("span-free").textContent = bytes(free);
            document.getElementById("span-quota").textContent = bytes(quota);
        }).catch(function (error) {
            console.error("Cannot estimate browser storage", error);
            ["span-used", "span-free", "span-quota"].forEach(function (id) {
                document.getElementById(id).textContent = "unavailable";
            });
        });
    }

    function measureCategory(databases, outputId, spinnerId, includeOpfs) {
        const output = document.getElementById(outputId);
        const spinner = document.getElementById(spinnerId);
        let total = 0;
        spinner.hidden = false;
        output.textContent = "Calculating...";
        const tasks = databases.map(function (entry) {
            return readDatabaseSize(entry[0], entry[1]).then(function (size) {
                total += size;
                output.textContent = "Calculating... " + bytes(total);
                return size;
            });
        });
        if (includeOpfs) {
            tasks.push(readOpfsSize(function (size) {
                total += size;
                output.textContent = "Calculating... " + bytes(total);
            }));
        }
        return Promise.allSettled(tasks).then(function (results) {
            spinner.hidden = true;
            const failures = results.filter(function (r) { return r.status === "rejected"; });
            if (failures.length) {
                output.textContent = "Unavailable";
                failures.forEach(function (f) { console.error("Cannot measure storage", f.reason); });
                throw new Error("Some storage could not be measured");
            }
            output.textContent = bytes(total);
        });
    }

    function refreshStorageUsage() {
        if (storage.clearing) return Promise.resolve();
        if (storage.refreshing) return storage.refreshing;
        storageError("");
        storage.refreshing = Promise.all([
            refreshBrowserUsage(),
            measureCategory(IMAGE_DATABASES, "cache-size", "cache-spinner", true),
            measureCategory(SAVE_DATABASES, "saves-size", "saves-spinner", false)
        ]).catch(function (error) {
            storageError("Storage could not be read completely. Close other tabs of this site and refresh.");
            console.error(error);
        }).finally(function () { storage.refreshing = null; });
        return storage.refreshing;
    }

    function deleteDatabase(name) {
        return new Promise(function (resolve, reject) {
            const request = indexedDB.deleteDatabase(name);
            request.onblocked = function () { reject(new Error("Database is in use: " + name)); };
            request.onerror = function () { reject(request.error); };
            request.onsuccess = function () { resolve(); };
        });
    }

    function activeGameLocks() {
        if (!navigator.locks || !navigator.locks.query) return Promise.resolve([]);
        return navigator.locks.query().then(function (state) {
            return (state.held || []).map(function (lock) { return lock.name; })
                .filter(function (name) { return name.indexOf("ddyx-") === 0; });
        }).catch(function () { return []; });
    }

    function clearOpfs() {
        if (!navigator.storage || !navigator.storage.getDirectory) return Promise.resolve();
        return navigator.storage.getDirectory().then(function (root) {
            const errors = [];
            async function clearDirectory(directory) {
                const entries = [];
                for await (const entry of directory.entries()) entries.push(entry);
                for (const entry of entries) {
                    try {
                        await directory.removeEntry(entry[0], { recursive: true });
                    } catch (error) {
                        if (error.name !== "NotFoundError") errors.push(error);
                    }
                }
            }
            return clearDirectory(root).then(function () {
                if (errors.length) throw new Error("Some cached files could not be removed");
            });
        });
    }

    function clearStorage(images) {
        if (storage.clearing) return Promise.resolve();
        storage.clearing = true;
        document.querySelectorAll("[data-clearing]").forEach(function (button) { button.disabled = true; });
        const buttons = [document.getElementById("clear-cache"), document.getElementById("clear-saves")];
        buttons.forEach(function (button) { button.disabled = true; });

        return activeGameLocks().then(function (locks) {
            if (locks.length) {
                throw new Error("A game is running in another tab (" + locks.length +
                    " active lock(s)). Close it before clearing storage.");
            }
            if (storage.refreshing) return storage.refreshing;
        }).then(function () {
            storageError("");
            const databases = images ? IMAGE_DATABASES : SAVE_DATABASES;
            const tasks = databases.map(function (entry) { return deleteDatabase(entry[0]); });
            if (images) tasks.push(clearOpfs());
            return Promise.allSettled(tasks).then(function (results) {
                const failures = results.filter(function (r) { return r.status === "rejected"; });
                failures.forEach(function (f) { console.error("Cannot clear storage", f.reason); });
                return Promise.all([refreshBrowserUsage(), refreshStorageUsage()]).then(function () {
                    if (failures.length) {
                        throw new Error("Some data could not be cleared. Close all game tabs and try again.");
                    }
                });
            });
        }).catch(function (error) {
            storageError(error.message);
            console.error(error);
        }).finally(function () {
            storage.clearing = false;
            buttons.forEach(function (button) { button.disabled = false; });
            checkDeleteWord();
        });
    }

    function checkDeleteWord() {
        const input = document.getElementById("delete-word");
        document.getElementById("confirm-clear-saves").disabled =
            storage.clearing || input.value !== "DEL";
    }

    document.getElementById("confirm-clear-cache").addEventListener("click", function () {
        bootstrap.Modal.getOrCreateInstance(document.getElementById("clearCacheModal")).hide();
        clearStorage(true);
    });
    document.getElementById("confirm-clear-saves").addEventListener("click", function () {
        bootstrap.Modal.getOrCreateInstance(document.getElementById("clearSavesModal")).hide();
        clearStorage(false);
    });
    document.getElementById("delete-word").addEventListener("input", checkDeleteWord);
    document.getElementById("clearSavesModal").addEventListener("hidden.bs.modal", function () {
        document.getElementById("delete-word").value = "";
        checkDeleteWord();
    });
    document.getElementById("tab-storage-button").addEventListener("shown.bs.tab", refreshStorageUsage);

    // ----------------------------------------------------------- controller

    const controller = {
        list: [],
        selectedId: localStorage.getItem(CONTROLLER_ID_KEY),
        selectedIndex: Number(localStorage.getItem(CONTROLLER_INDEX_KEY)),
        mapping: loadMapping(),
        advanced: loadAdvanced(),
        selectedAdvanced: -1,
        modified: false,
        frame: undefined
    };

    function loadMapping() {
        try {
            const stored = JSON.parse(localStorage.getItem(BASIC_MAPPING_KEY) || "null");
            if (stored && Array.isArray(stored.axes) && Array.isArray(stored.buttons)) return stored;
        } catch (error) { /* fall through to defaults */ }
        return JSON.parse(JSON.stringify(DEFAULT_BASIC_MAPPING));
    }

    function saveMapping() {
        localStorage.setItem(BASIC_MAPPING_KEY, JSON.stringify(controller.mapping));
    }

    function loadAdvanced() {
        try {
            const stored = JSON.parse(localStorage.getItem(ADVANCED_KEY) || "[]");
            return Array.isArray(stored) ? stored : [];
        } catch (error) { return []; }
    }

    function saveAdvanced() {
        localStorage.setItem(ADVANCED_KEY, JSON.stringify(controller.advanced));
    }

    function currentGamepad() {
        const pads = navigator.getGamepads ? navigator.getGamepads() : [];
        if (!pads) return null;
        const byId = Array.prototype.find.call(pads, function (pad) {
            return pad && pad.id === controller.selectedId;
        });
        if (byId) return byId;
        return pads[0] || null;
    }

    function selectController(pad) {
        controller.selectedId = pad.id;
        controller.selectedIndex = pad.index;
        localStorage.setItem(CONTROLLER_ID_KEY, pad.id);
        localStorage.setItem(CONTROLLER_INDEX_KEY, String(pad.index));
        renderControllerList();
        renderMapping();
        startLoop();
    }

    function renderControllerList() {
        const list = document.getElementById("controller-list");
        list.replaceChildren();
        controller.list.forEach(function (pad) {
            if (!pad) return;
            const item = document.createElement("label");
            item.className = "list-group-item d-flex align-items-center gap-2";
            const radio = document.createElement("input");
            radio.type = "radio";
            radio.className = "form-check-input";
            radio.name = "controller";
            radio.checked = pad.id === controller.selectedId;
            radio.addEventListener("click", function () { selectController(pad); });
            const text = document.createElement("span");
            text.textContent = pad.id;
            item.appendChild(radio);
            item.appendChild(text);
            list.appendChild(item);
        });
        document.getElementById("controller-hint").hidden = controller.list.length > 0;
        document.getElementById("mapping-area").hidden = !currentGamepad();
    }

    function mappingSelect(label, value, options, onChange) {
        const wrapper = document.createElement("div");
        wrapper.className = "dropdown";
        const select = document.createElement("select");
        select.className = "form-select form-select-sm mapping-select";
        options.forEach(function (option) {
            const element = document.createElement("option");
            element.value = option[0] === null ? "" : String(option[0]);
            element.textContent = option[1];
            if (String(value === null ? "" : value) === element.value) element.selected = true;
            select.appendChild(element);
        });
        select.addEventListener("change", function () {
            onChange(select.value === "" ? null : Number(select.value));
            saveMapping();
            controller.modified = true;
            updateAdvancedButtons();
        });
        wrapper.appendChild(select);
        wrapper.title = label;
        return wrapper;
    }

    function renderMapping() {
        const pad = currentGamepad();
        const axesArea = document.getElementById("axes-area");
        const buttonsArea = document.getElementById("buttons-area");
        axesArea.replaceChildren();
        buttonsArea.replaceChildren();
        if (!pad) return;

        const pairs = Math.floor((pad.axes ? pad.axes.length : 0) / 2);
        for (let pair = 0; pair < pairs; pair++) {
            const cell = document.createElement("div");
            cell.className = "controller-pad";
            const stick = document.createElement("div");
            stick.className = "axis-stick";
            const nub = document.createElement("div");
            nub.className = "axis-nub";
            nub.dataset.pair = String(pair);
            const x = pad.axes[pair * 2] || 0;
            const y = pad.axes[pair * 2 + 1] || 0;
            nub.style.transform = "translate(" + (x * 50) + "%," + (y * 50) + "%) scale(0.25)";
            stick.appendChild(nub);
            cell.appendChild(stick);
            cell.appendChild(mappingSelect("Axis pair " + (pair + 1),
                controller.mapping.axes[pair * 2],
                [[null, "None"], [0, "Axis 1-2"], [1, "Axis 3-4"]],
                function (value) { controller.mapping.axes[pair * 2] = value; }));
            axesArea.appendChild(cell);
        }

        const buttons = pad.buttons ? pad.buttons.length : 0;
        for (let index = 0; index < buttons; index++) {
            const cell = document.createElement("div");
            cell.className = "controller-pad";
            const dot = document.createElement("div");
            dot.className = "controller-dot";
            dot.dataset.button = String(index);
            dot.textContent = String(index + 1);
            cell.appendChild(dot);
            cell.appendChild(mappingSelect("Button " + (index + 1),
                controller.mapping.buttons[index],
                [[null, "None"], [0, "Button 1"], [1, "Button 2"], [2, "Button 3"], [3, "Button 4"]],
                function (value) { controller.mapping.buttons[index] = value; }));
            buttonsArea.appendChild(cell);
        }
        renderAdvanced();
    }

    function startLoop() {
        cancelAnimationFrame(controller.frame);
        const pad = currentGamepad();
        if (!pad) return;
        (function loop() {
            const active = currentGamepad();
            if (active) {
                document.querySelectorAll(".axis-nub").forEach(function (nub) {
                    const pair = Number(nub.dataset.pair);
                    const x = active.axes[pair * 2] || 0;
                    const y = active.axes[pair * 2 + 1] || 0;
                    nub.style.transform = "translate(" + (x * 50) + "%," + (y * 50) + "%) scale(0.25)";
                });
                document.querySelectorAll(".controller-dot").forEach(function (dot) {
                    const index = Number(dot.dataset.button);
                    const pressed = active.buttons[index] && active.buttons[index].pressed;
                    dot.classList.toggle("pressed", !!pressed);
                });
            }
            controller.frame = requestAnimationFrame(loop);
        })();
    }

    // --- advanced mappings (local substitute for the site's cloud storage) --

    function updateAdvancedButtons() {
        const select = document.getElementById("advanced-mapping-select");
        select.replaceChildren();
        const none = document.createElement("option");
        none.value = "-1";
        none.textContent = controller.advanced.length ? "Select a mapping..." : "No saved mappings";
        select.appendChild(none);
        controller.advanced.forEach(function (entry, index) {
            const option = document.createElement("option");
            option.value = String(index);
            option.textContent = entry.name;
            if (index === controller.selectedAdvanced) option.selected = true;
            select.appendChild(option);
        });
        document.getElementById("advanced-mapping-save").disabled =
            controller.selectedAdvanced < 0 || !controller.modified;
        document.getElementById("advanced-mapping-delete").disabled = controller.selectedAdvanced < 0;
        document.getElementById("advanced-mapping-apply").disabled = controller.selectedAdvanced < 0;
    }

    function renderAdvanced() {
        updateAdvancedButtons();
        const status = document.getElementById("advanced-mapping-status");
        status.textContent = controller.selectedAdvanced >= 0
            ? "Selected: " + controller.advanced[controller.selectedAdvanced].name +
              (controller.modified ? " (modified - press Save)" : "")
            : "Mappings are stored in this browser.";
    }

    document.getElementById("advanced-mapping-select").addEventListener("change", function (event) {
        controller.selectedAdvanced = Number(event.target.value);
        renderAdvanced();
    });

    document.getElementById("advanced-mapping-apply").addEventListener("click", function () {
        if (controller.selectedAdvanced < 0) return;
        controller.mapping = JSON.parse(JSON.stringify(controller.advanced[controller.selectedAdvanced].mapping));
        saveMapping();
        controller.modified = false;
        renderMapping();
    });

    document.getElementById("advanced-mapping-save").addEventListener("click", function () {
        if (controller.selectedAdvanced < 0) return;
        controller.advanced[controller.selectedAdvanced].mapping =
            JSON.parse(JSON.stringify(controller.mapping));
        saveAdvanced();
        controller.modified = false;
        renderAdvanced();
        document.getElementById("advanced-mapping-status").textContent = "Saved in this browser.";
    });

    document.getElementById("advanced-mapping-delete").addEventListener("click", function () {
        if (controller.selectedAdvanced < 0) return;
        controller.advanced.splice(controller.selectedAdvanced, 1);
        controller.selectedAdvanced = -1;
        saveAdvanced();
        renderAdvanced();
    });

    const newMappingName = document.getElementById("new-mapping-name");
    newMappingName.addEventListener("input", function () {
        const length = newMappingName.value.trim().length;
        document.getElementById("confirm-new-mapping").disabled = length < 1 || length > 32;
    });
    document.getElementById("confirm-new-mapping").addEventListener("click", function () {
        const name = newMappingName.value.trim();
        if (!name) return;
        controller.advanced.push({ name: name, mapping: JSON.parse(JSON.stringify(controller.mapping)) });
        controller.selectedAdvanced = controller.advanced.length - 1;
        saveAdvanced();
        bootstrap.Modal.getOrCreateInstance(document.getElementById("newMappingModal")).hide();
        newMappingName.value = "";
        document.getElementById("confirm-new-mapping").disabled = true;
        renderAdvanced();
    });

    window.addEventListener("gamepadconnected", function (event) {
        if (!controller.list.some(function (pad) { return pad && pad.index === event.gamepad.index; })) {
            controller.list.push(event.gamepad);
        }
        if (controller.selectedId === null) {
            selectController(event.gamepad);
        } else {
            // A controller was already chosen earlier: keep it and draw its
            // mapping controls (they cannot be built before a pad exists).
            renderControllerList();
            renderMapping();
            startLoop();
        }
    });

    window.addEventListener("gamepaddisconnected", function (event) {
        controller.list = controller.list.filter(function (pad) { return pad.index !== event.gamepad.index; });
        const remaining = currentGamepad();
        if (remaining) selectController(remaining);
        else { cancelAnimationFrame(controller.frame); renderControllerList(); }
    });

    // ------------------------------------------------------- player defaults

    const playerKeys = {
        mouseSensitivity: "settings_mouse_sensitivity",
        wheelDirection: "settings_mouse_wheel_direction",
        wheelSensitivity: "settings_mouse_wheel_sensitivity",
        upscaler: "settings_3dfx_upscaler_gameid_" + gameId,
        aniso: "settings_3dfx_aniso_gameid_" + gameId,
        saveSource: "settings_sfs"
    };

    function readNumber(key, fallback) {
        const raw = localStorage.getItem(key);
        // Number(null) is 0, so a missing key must be rejected before converting.
        if (raw === null || raw === "") return fallback;
        const value = Number(raw);
        return Number.isFinite(value) ? value : fallback;
    }

    function loadPlayerDefaults() {
        const sensitivity = readNumber(playerKeys.mouseSensitivity, 1);
        const wheel = readNumber(playerKeys.wheelSensitivity, 1);
        const direction = readNumber(playerKeys.wheelDirection, 1);
        document.getElementById("mouse-sensitivity").value = String(sensitivity);
        document.getElementById("wheel-sensitivity").value = String(wheel);
        document.getElementById("wheel-direction").value = direction === -1 ? "-1" : "1";
        document.getElementById("mouse-sensitivity-value").textContent = sensitivity.toFixed(1);
        document.getElementById("wheel-sensitivity-value").textContent = wheel.toFixed(1);
        document.getElementById("voodoo-upscaler").checked = localStorage.getItem(playerKeys.upscaler) === "true";
        document.getElementById("voodoo-aniso").checked = localStorage.getItem(playerKeys.aniso) === "true";
        const source = localStorage.getItem(playerKeys.saveSource);
        document.getElementById("save-source").value = (source === "1" || source === "2") ? source : "auto";
    }

    document.getElementById("mouse-sensitivity").addEventListener("input", function (event) {
        document.getElementById("mouse-sensitivity-value").textContent = Number(event.target.value).toFixed(1);
    });
    document.getElementById("wheel-sensitivity").addEventListener("input", function (event) {
        document.getElementById("wheel-sensitivity-value").textContent = Number(event.target.value).toFixed(1);
    });

    document.getElementById("player-defaults-save").addEventListener("click", function () {
        localStorage.setItem(playerKeys.mouseSensitivity, document.getElementById("mouse-sensitivity").value);
        localStorage.setItem(playerKeys.wheelSensitivity, document.getElementById("wheel-sensitivity").value);
        localStorage.setItem(playerKeys.wheelDirection, document.getElementById("wheel-direction").value);
        localStorage.setItem(playerKeys.upscaler, String(document.getElementById("voodoo-upscaler").checked));
        localStorage.setItem(playerKeys.aniso, String(document.getElementById("voodoo-aniso").checked));
        const source = document.getElementById("save-source").value;
        if (source === "auto") localStorage.removeItem(playerKeys.saveSource);
        else localStorage.setItem(playerKeys.saveSource, source);
        const status = document.getElementById("player-defaults-status");
        status.textContent = "Saved. Applies the next time a game starts.";
        setTimeout(function () { status.textContent = ""; }, 4000);
    });

    document.getElementById("player-defaults-reset").addEventListener("click", function () {
        Object.keys(playerKeys).forEach(function (key) { localStorage.removeItem(playerKeys[key]); });
        loadPlayerDefaults();
        document.getElementById("player-defaults-status").textContent = "Reset to defaults.";
        setTimeout(function () { document.getElementById("player-defaults-status").textContent = ""; }, 4000);
    });

    // ------------------------------------------------------------ start-up

    loadPlayerDefaults();
    renderControllerList();
    renderMapping();
    refreshStorageUsage();

    // Pick up controllers that were already connected before this page loaded.
    if (navigator.getGamepads) {
        const pads = Array.prototype.filter.call(navigator.getGamepads(), Boolean);
        if (pads.length) {
            controller.list = pads;
            if (controller.selectedId === null) selectController(pads[0]);
            else { renderControllerList(); renderMapping(); startLoop(); }
        }
    }
})();
