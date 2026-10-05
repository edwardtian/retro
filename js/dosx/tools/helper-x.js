class HelperX {
    #idb
    #settings
    #offscreenCanvasTransfered
    #offscreenCanvas
    #canvas
    #gameWidth
    #gameHeight
    #paused
    #muted
    #input
    #inputEnabled = true;
    #inputReset
    #resizeCanvas
    #unlockPointer
    #gameControllerBasicMapping
    #gameControllerId
    #gameControllerIndex
    #closed = false;
    #preparing = true;

    constructor(bundle, canvas, settings, events) {

        const normalizeMouseWheelSettings = () => {
            if (settings.mouseWheelDirection !== 1 && settings.mouseWheelDirection !== -1) {
                settings.mouseWheelDirection = 1;
            }
            if (!Number.isFinite(settings.mouseWheelSensitivity) || settings.mouseWheelSensitivity < 0) {
                settings.mouseWheelSensitivity = 1;
            }
        };
        normalizeMouseWheelSettings();

        this.#canvas = canvas;
        this.#paused = false;
        this.#muted = false;
        this.#settings = settings;
        this.#inputReset = events.onInputReset;
        this.#gameControllerBasicMapping = null;
        this.#offscreenCanvasTransfered = false;
        this.#idb = new IDB(settings.browserSaveNamespace);


        this.ready = (async () => {
            // 2026-10-03: network startup must have an admitted room before save loading or canvas transfer.
            // Network.Tests covers cancellation and failure without creating an offline emulator.
            if (settings.network?.enabled === true && (!settings.network.roomContext || !settings.network.attachment ||
                typeof events.onBeforeStart !== "function")) throw new Error("A network attachment is required");
            //bundle
            var self = this;
            var bundles = new Array;
            bundles.push(bundle);
            // 2026-09-28: fetch the explicitly selected save BEFORE creating
            // a Worker. A failed download must never become a no-save launch.
            if (settings.startupMode !== undefined) {
                if (!["continue", "restore"].includes(settings.startupMode)) throw new Error("Invalid startup mode");
                if (settings.startupMode === "continue") {
                    if (settings.save !== -1) throw new Error("Continue requires the continue-game option");
                } else {
                    let data;
                    if (settings.save === 0 || settings.cloudVersionId) {
                        const result = await $.ajax({ url: "/api/cloud/aws/getdownloadlink", timeout: 15000,
                            data: { gameid: settings.name, versionid: settings.cloudVersionId } });
                        if (!result.status || !result.url) throw new Error("Cannot obtain the selected cloud save");
                        const response = await axios.get(result.url, { responseType: "arraybuffer", timeout: 60000 * 30,
                            onDownloadProgress: p => events.onExtractProgress(12, "", p.loaded, p.total) });
                        if (response.status !== 200) throw new Error("Cannot download the selected cloud save");
                        data = new Uint8Array(response.data);
                    } else if (settings.save === 1) {
                        data = await this.Load();
                    } else if (settings.save === 2 && settings.upload) {
                        data = new Uint8Array(await settings.upload.arrayBuffer());
                    }
                    if (!data || !data.byteLength) throw new Error("The selected save is missing or empty");
                    bundles.push(data instanceof Uint8Array ? data : new Uint8Array(data));
                }
            } else {
            if (settings.save == 0 || settings.cloudVersionId) {//cloud
                function downloadCloudFile() {
                    return new Promise((resolve) => {
                        var downloadUrl = "/api/cloud/aws/getdownloadlink?gameid=" + settings.name;
                        if (settings.cloudVersionId) {
                            downloadUrl += "&versionid=" + encodeURIComponent(settings.cloudVersionId);
                        }
                        var jqxhr = $.ajax({ url: downloadUrl })
                            .done(function (result) {
                                if (result.status == true) {
                                    //download
                                    axios.get(result.url, {
                                        responseType: 'arraybuffer',
                                        timeout: 60000*30,
                                        onDownloadProgress: (progressEvent) => {
                                            events.onExtractProgress(12, "", progressEvent.loaded, progressEvent.total);
                                        }
                                    }).then(response => {
                                        if (response.status == 200) {
                                            resolve(response.data);
                                        }
                                        else
                                            resolve(null);
                                    }).catch(err => {
                                        console.log(err);
                                        resolve(null);
                                    });
                                }
                                else {
                                    //error upload link not generated,non gold member or other error
                                    resolve(null);
                                }
                            }).fail(function (jqXHR, textStatus) {
                                resolve(null);
                            });
                    });
                }
                var file = await downloadCloudFile();
                if (file !== null)
                    bundles.push(new Uint8Array(file));
                file = undefined;
            } else if (settings.save == 1) {//local
                var result = await this.Load();
                if (!result || !result.byteLength) throw new Error("The selected save is missing or empty");
                bundles.push(result);
            } else if (settings.save == 2) {
                if (settings.upload !== undefined) {
                    bundles.push(new Uint8Array(await settings.upload.arrayBuffer()));
                }
            }
            }

            // A save download may outlive a cancelled admission. Revalidate the live lease before starting.
            if (this.#closed) { this.#idb.Close(); return; }
            const backendNetwork = settings.network?.enabled === true ? events.onBeforeStart() : { enabled: false };
            if (settings.network?.enabled === true && (!backendNetwork?.enabled || !backendNetwork.attachment || !backendNetwork.roomContext))
                throw new Error("The network session is no longer ready");
            //worker webgl
            var isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
            //console.log("Safari:", isSafari);
            isSafari = false;
            if (HTMLCanvasElement.prototype.transferControlToOffscreen && isSafari == false) {
                if (this.#offscreenCanvasTransfered == false) {
                    this.#offscreenCanvas = canvas.transferControlToOffscreen();
                    this.#offscreenCanvasTransfered = true;
                }
                else {//clone canvas
                    this.#offscreenCanvas = canvas.transferControlToOffscreen();
                    this.#offscreenCanvasTransfered = true;
                }
            }
            else {
                console.log("webglWorker disabled");
                this.#offscreenCanvas = undefined;
            }

            ci = emulators.dosboxXWorker(bundles, { name: settings.name, startupMode: settings.startupMode, canvas: this.#offscreenCanvas, onExtractProgress: events.onExtractProgress,version:settings.version, network: backendNetwork });
            return ci.then(async ci => {
                // 2026-10-03: a cancelled download/Worker preparation must not fire onReady later.
                if (this.#closed) { await ci.exit(); this.#idb.Close(); return; }
                this.command = ci;
                window.ci = ci;
                // 2026-09-30: touch and physical devices can hold the same key.
                // Keep source ownership until the final release (MobilePlayer.Tests).
                this.#input = new DDYXGameInput.GameInput(ci, dosXGetKeyCode, () => settings.mouseSensitivity,
                    () => ({ direction: settings.mouseWheelDirection, sensitivity: settings.mouseWheelSensitivity }),
                    state => this.Message("ddyx-gamepad", state));
                if (settings.startupMode !== undefined) ci.events().onMessage((type, ...messages) => {
                    if (type === "error" && this.#preparing) events.onError?.(new Error(messages.join(" ")));
                });

                ci.events().onFrameSize((w, h) => {
                    if (this.#closed || !Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) return;
                    this.#gameWidth = w;
                    this.#gameHeight = h;
                    events.onFrameSize(w, h);
                    this.#resizeCanvas?.();
                });

                if (this.#offscreenCanvas === undefined) {
                    const gl = canvas.getContext("webgl");
                    webGl({
                        canvas,
                        addOnResize: () => { },
                    }, ci);
                }

                audioNode(ci);
                const inputEvents = new AbortController();
                const listen = (target, name, handler, options = {}) => target.addEventListener(name, handler,
                    { ...options, signal: inputEvents.signal });
                let pointerLockPending = false;
                let mouseInputActive = true;
                let savedBodyOverflow = null;
                let mouseWheelRemainder = 0;
                let mouseWheelDirection = settings.mouseWheelDirection;
                let mouseWheelSensitivity = settings.mouseWheelSensitivity;
                const mousePlatform = navigator.userAgentData?.platform || navigator.platform || "";
                const useRawMouseMovement = /^Win/i.test(mousePlatform);
                const ownsPointerLock = () => mouseInputActive && document.pointerLockElement === canvas;
                const releaseMouseButtons = () => this.#input.release("mouse");
                const restoreBodyOverflow = () => {
                    if (savedBodyOverflow !== null) {
                        document.body.style.overflow = savedBodyOverflow;
                        savedBodyOverflow = null;
                    }
                };
                this.#unlockPointer = () => {
                    if (ownsPointerLock()) document.exitPointerLock();
                    restoreBodyOverflow();
                };
                const pointerLockFailed = (error) => {
                    if (!pointerLockPending) {
                        return;
                    }
                    pointerLockPending = false;
                    if (!ownsPointerLock()) {
                        restoreBodyOverflow();
                    }
                    console.warn("Mouse capture failed", error);
                };
                let lastPointerType = "mouse";
                listen(canvas, "pointerdown", e => { lastPointerType = e.pointerType; });
                listen(canvas, "click", async (e) => {
                    if (lastPointerType === "touch" || e.pointerType === "touch" || e.sourceCapabilities?.firesTouchEvents ||
                        !this.#input.enabled || !mouseInputActive || !document.hasFocus() || pointerLockPending || document.pointerLockElement) {
                        return;
                    }
                    if (typeof canvas.requestPointerLock !== "function") {
                        return;
                    }
                    pointerLockPending = true;
                    try {
                        savedBodyOverflow = document.body.style.overflow;
                        document.body.style.overflow = 'hidden';
                        canvas.scrollIntoView({
                            behavior: 'instant',
                            block: 'center',
                            inline: 'center'
                        });
                        await canvas.requestPointerLock({
                            unadjustedMovement: useRawMouseMovement
                        });
                    } catch (error) {
                        pointerLockFailed(error);
                    }
                });

                listen(document, "pointerlockchange", () => {
                    pointerLockPending = false;
                    mouseWheelRemainder = 0;
                    if (!this.#input.enabled || !ownsPointerLock() || !document.hasFocus()) {
                        releaseMouseButtons();
                        if (document.pointerLockElement === canvas) {
                            document.exitPointerLock();
                        }
                        restoreBodyOverflow();
                    }
                });
                listen(document, "pointerlockerror", (event) => {
                    if (pointerLockPending) {
                        pointerLockFailed(event);
                    }
                });
                ci.events().onExit(() => {
                    this.ReleaseInput();
                    this.#input.enable(false);
                    this.#closed = true;
                    inputEvents.abort();
                    this.#idb.Close();
                    cancelAnimationFrame(gamePadFrame);
                    resizeObserver.disconnect();
                    mouseInputActive = false;
                    pointerLockPending = false;
                    mouseWheelRemainder = 0;
                    if (document.pointerLockElement === canvas) {
                        document.exitPointerLock();
                    }
                    restoreBodyOverflow();
                    events.onExit?.(this);
                });

                this.#resizeCanvas = () => {
                    const aspect = this.#gameWidth > 0 && this.#gameHeight > 0 ? this.#gameWidth / this.#gameHeight : 4 / 3;
                    if (!canvas.parentElement.clientWidth || !canvas.parentElement.clientHeight) return;

                    let width = canvas.parentElement.clientWidth;
                    let height = canvas.parentElement.clientWidth / aspect;

                    if (height > canvas.parentElement.clientHeight) {
                        height = canvas.parentElement.clientHeight;
                        width = canvas.parentElement.clientHeight * aspect;
                    }

                    canvas.style.position = "relative";
                    canvas.style.top = (canvas.parentElement.clientHeight - height) / 2 + "px";
                    canvas.style.left = (canvas.parentElement.clientWidth - width) / 2 + "px";
                    canvas.style.width = width + "px";
                    canvas.style.height = height + "px";
                    this.Message("ddyx-canvas-resize", { width: canvas.clientWidth, height: canvas.clientHeight, dpr: window.devicePixelRatio });
                };
                const resizeObserver = new ResizeObserver(this.#resizeCanvas);
                resizeObserver.observe(canvas.parentElement);

                //window.addEventListener("resize", (e) => {
                //    const aspect = this.#gameWidth / this.#gameHeight;

                //    let width = canvas.parentElement.clientWidth;
                //    let height = canvas.parentElement.clientWidth / aspect;

                //    if (height > canvas.parentElement.clientHeight) {
                //        height = canvas.parentElement.clientHeight;
                //        width = canvas.parentElement.clientHeight * aspect;
                //    }

                //    canvas.style.position = "relative";
                //    canvas.style.top = (canvas.parentElement.clientHeight - height) / 2 + "px";
                //    canvas.style.left = (canvas.parentElement.clientWidth - width) / 2 + "px";
                //    canvas.style.width = width + "px";
                //    canvas.style.height = height + "px";
                //    this.Message("ddyx-canvas-resize", { width: canvas.clientWidth, height: canvas.clientHeight, dpr: window.devicePixelRatio });
                //});

                listen(window, "blur", (e) => {
                    mouseWheelRemainder = 0;
                    this.ReleaseInput();
                });
                listen(document, "visibilitychange", () => { if (document.hidden) this.ReleaseInput(); });
                const uiOwnsKeyboard = (target) => target?.closest?.("input, select, textarea, button, a, [contenteditable='true'], [role='menu'], .modal, .dropdown-menu");
                listen(document, "focusin", e => { if (uiOwnsKeyboard(e.target)) this.ReleaseInput(); });
                listen(window, "keydown", (e) => {
                    if (!uiOwnsKeyboard(e.target) && this.Key(e.code, true, "keyboard")) {
                        e.stopPropagation();
                        e.preventDefault();
                    }
                });
                listen(window, "keyup", (e) => {
                    if (this.Key(e.code, false, "keyboard") && !uiOwnsKeyboard(e.target)) {
                        e.stopPropagation();
                        e.preventDefault();
                    }
                });
                listen(canvas, "click", (e) => {
                    if (ownsPointerLock()) {
                        e.stopPropagation();
                        e.preventDefault();
                    }
                });
                listen(canvas, "mousemove", (e) => {
                    if (ownsPointerLock() && document.hasFocus()) {
                        this.MoveMouse(e.movementX, e.movementY);
                        e.stopPropagation();
                        e.preventDefault();
                    }
                });
                listen(canvas, "mousedown", (e) => {
                    if (ownsPointerLock() && document.hasFocus()) {
                        const button = e.button === 0 ? 0 : e.button === 1 ? 2 : e.button === 2 ? 1 : null;
                        if (button !== null) this.MouseButton(button, true, "mouse");
                        e.stopPropagation();
                        e.preventDefault();
                    }
                });
                listen(canvas, "mouseup", (e) => {
                    if (ownsPointerLock()) {
                        const button = e.button === 0 ? 0 : e.button === 1 ? 2 : e.button === 2 ? 1 : null;
                        if (button !== null) this.MouseButton(button, false, "mouse");
                        e.stopPropagation();
                        e.preventDefault();
                    }
                });
                listen(canvas, "wheel", (e) => {
                    if (!this.#input.enabled || !ownsPointerLock() || !document.hasFocus()) {
                        mouseWheelRemainder = 0;
                        return;
                    }
                    e.stopPropagation();
                    e.preventDefault();

                    normalizeMouseWheelSettings();
                    if (mouseWheelDirection !== settings.mouseWheelDirection ||
                        mouseWheelSensitivity !== settings.mouseWheelSensitivity) {
                        mouseWheelRemainder = 0;
                        mouseWheelDirection = settings.mouseWheelDirection;
                        mouseWheelSensitivity = settings.mouseWheelSensitivity;
                    }
                    if (e.ctrlKey || mouseWheelSensitivity === 0 || typeof ci.sendMouseWheel !== "function") {
                        mouseWheelRemainder = 0;
                        return;
                    }

                    let unitsPerStep;
                    switch (e.deltaMode) {
                        case 0: unitsPerStep = 100; break;
                        case 1: unitsPerStep = 3; break;
                        case 2: unitsPerStep = 1; break;
                        default:
                            mouseWheelRemainder = 0;
                            return;
                    }
                    const delta = (e.deltaY / unitsPerStep) * mouseWheelSensitivity * mouseWheelDirection;
                    if (!Number.isFinite(delta)) {
                        mouseWheelRemainder = 0;
                        return;
                    }
                    if (delta === 0) {
                        return;
                    }
                    const accumulated = Math.max(-2048, Math.min(2048, mouseWheelRemainder + delta));
                    const steps = Math.trunc(accumulated);
                    mouseWheelRemainder = accumulated - steps;
                    if (steps !== 0 && ci.sendMouseWheel(steps) !== true) {
                        mouseWheelRemainder = 0;
                    }
                }, { passive: false });
                listen(canvas, "contextmenu", (e) => {
                    if (ownsPointerLock()) {
                        e.preventDefault();
                    }
                });
                function readGamepadSettings() {
                    let mapping;
                    try {
                        mapping = JSON.parse(localStorage.getItem('settings_game_controller_basic_mapping'));
                        self.#gameControllerIndex = localStorage.getItem('settings_game_controller_index');
                        self.#gameControllerId = localStorage.getItem('settings_game_controller_id');
                    } catch { mapping = null; }
                    self.#gameControllerBasicMapping = {
                        axes: Array.isArray(mapping?.axes) ? mapping.axes.slice(0, 64).map(v => [0, 1].includes(v) ? v : null) : [0, null, 1, null],
                        buttons: Array.isArray(mapping?.buttons) ? mapping.buttons.slice(0, 64).map(v => [0, 1, 2, 3].includes(v) ? v : null) : [0, 1, 2, 3]
                    };
                    self.#gameControllerBasicMapping.targetButton0 = [];
                    self.#gameControllerBasicMapping.targetButton1 = [];
                    self.#gameControllerBasicMapping.targetButton2 = [];
                    self.#gameControllerBasicMapping.targetButton3 = [];
                    self.#gameControllerBasicMapping.targetAxis0 = [];
                    self.#gameControllerBasicMapping.targetAxis1 = [];

                    for (const element of self.#gameControllerBasicMapping.buttons.entries()) {
                        if (element[1] == 0)
                            self.#gameControllerBasicMapping.targetButton0.push(element[0]);
                        if (element[1] == 1)
                            self.#gameControllerBasicMapping.targetButton1.push(element[0]);
                        if (element[1] == 2)
                            self.#gameControllerBasicMapping.targetButton2.push(element[0]);
                        if (element[1] == 3)
                            self.#gameControllerBasicMapping.targetButton3.push(element[0]);
                    }
                    for (const element of self.#gameControllerBasicMapping.axes.entries()) {
                        if (element[1] == 0)
                            self.#gameControllerBasicMapping.targetAxis0.push(element[0]);
                        if (element[1] == 1)
                            self.#gameControllerBasicMapping.targetAxis1.push(element[0]);
                    }
                }
                let gamePadFrame;
                listen(window, "focus", (e) => {
                    readGamepadSettings();
                });
                function gamePadLoop() {
                    gamePadFrame = undefined;
                    if (self.#closed) return;
                    if (!self.#input.enabled || !document.hasFocus() || document.hidden) {
                        gamePadFrame = requestAnimationFrame(gamePadLoop);
                        return;
                    }
                    const gamepads = navigator.getGamepads?.();
                    if (!gamepads) {
                        self.#input.release("gamepad:physical");
                        gamePadFrame = requestAnimationFrame(gamePadLoop);
                        return;
                    }
                    var gp = gamepads[0];

                    if (gamepads[self.#gameControllerIndex] && gamepads[self.#gameControllerIndex].id == self.#gameControllerId) {
                        gp = gamepads[self.#gameControllerIndex];
                    }
                    else {
                        var temp = gamepads.find((element) => element && element.id == self.#gameControllerId);
                        if (temp) {
                            gp = temp;
                            self.#gameControllerId = temp.id;
                        }
                    }
                    if (!gp) {
                        self.#input.release("gamepad:physical");
                        gamePadFrame = requestAnimationFrame(gamePadLoop);
                        return;
                    }
                    var button0Pressed = false;
                    var button1Pressed = false;
                    var button2Pressed = false;
                    var button3Pressed = false;
                    self.#gameControllerBasicMapping.targetButton0.forEach(element => {
                        if (gp.buttons[element] && gp.buttons[element].pressed)
                            button0Pressed = true;
                    });
                    self.#gameControllerBasicMapping.targetButton1.forEach(element => {
                        if (gp.buttons[element] && gp.buttons[element].pressed)
                            button1Pressed = true;
                    });
                    self.#gameControllerBasicMapping.targetButton2.forEach(element => {
                        if (gp.buttons[element] && gp.buttons[element].pressed)
                            button2Pressed = true;
                    });
                    self.#gameControllerBasicMapping.targetButton3.forEach(element => {
                        if (gp.buttons[element] && gp.buttons[element].pressed)
                            button3Pressed = true;
                    });

                    var axes = [0, 0, 0, 0];
                    self.#gameControllerBasicMapping.targetAxis0.forEach(element => {
                        if (gp.axes[element]) {
                            if (Math.abs(gp.axes[element]) > Math.abs(axes[0]))
                                axes[0] = gp.axes[element];
                        }
                        if (gp.axes[element + 1]) {
                            if (Math.abs(gp.axes[element+1]) > Math.abs(axes[1]))
                                axes[1] = gp.axes[element+1];
                        }
                    });
                    self.#gameControllerBasicMapping.targetAxis1.forEach(element => {
                        if (gp.axes[element]) {
                            if (Math.abs(gp.axes[element]) > Math.abs(axes[2]))
                                axes[2] = gp.axes[element];
                        }
                        if (gp.axes[element + 1]) {
                            if (Math.abs(gp.axes[element + 1]) > Math.abs(axes[3]))
                                axes[3] = gp.axes[element + 1];
                        }
                    });

                    self.#input.physicalGamepad(axes, [button0Pressed, button1Pressed, button2Pressed, button3Pressed]);
                    gamePadFrame = requestAnimationFrame(gamePadLoop);
                }

                listen(window, "gamepadconnected", (e) => {
                    //console.log(
                    //    "Gamepad connected at index %d: %s. %d buttons, %d axes.",
                    //    e.gamepad.index,
                    //    e.gamepad.id,
                    //    e.gamepad.buttons.length,
                    //    e.gamepad.axes.length,
                    //);
                    readGamepadSettings();
                    if (gamePadFrame === undefined) gamePadLoop();
                });
                listen(window, "gamepaddisconnected", (e) => {
                    console.log(
                        "Gamepad disconnected from index %d: %s",
                        e.gamepad.index,
                        e.gamepad.id,
                    );
                    self.#input.release("gamepad:physical");
                });
                readGamepadSettings();
                if (navigator.getGamepads?.()?.some(pad => pad)) gamePadLoop();
                events.onReady(this);
                return ci;
            });
        })();
        this.ready.catch(error => { if (this.#closed) this.#idb.Close(); else events.onError?.(error); });
    }
    async close() {
        this.#closed = true;
        if (this.command) await this.command.exit();
        else this.#idb.Close();
    }
    Message(msg,data,callback) {
        if (this.#closed) return;
        if (this.command !== undefined) {
            // Startup failures use the retry UI; later save/file-operation
            // failures must not shut down a running game (2026-09-28).
            if (msg === "ddyx-settings" || msg === "ddyx-run") {
                this.command.message(msg, data, () => { this.#preparing = false; callback?.(); });
            } else this.command.message(msg, data, callback);
        }
    }
    Persist(name,callback) {
        var saveFile = ci.persist();
        saveFile.then(value => {
            if (value != null) {
                var blob = new Blob([value.buffer], { type: "application/octet-stream" });
                var link = document.createElement('a');
                link.href = window.URL.createObjectURL(blob);
                var date = new Date();
                var fileName = name + "-" + date.getFullYear() + '' + ('0' + (date.getMonth() + 1)).slice(-2) + '' + ('0' + date.getDate()).slice(-2) + '' + ('0' + date.getHours()).slice(-2) + '' + ('0' + date.getMinutes()).slice(-2) + '' + ('0' + date.getSeconds()).slice(-2) + ".ddyx";
                link.download = fileName;
                link.click();
            }
            if (callback !== undefined)
                callback();
        });
    }
    Save(callback) {
        var saveFile = ci.persist();
        return saveFile.then(value => {
            var result = this.#idb.Save(this.#settings.name, value);
            return result.then(() => {
                if (callback !== undefined)
                    callback();
            });
        });
    }
    SaveToCloud(pcallback,callback) {
        var settings = this.#settings;
        var saveFile = ci.persist();
        saveFile.then(value => {
            var blob = new Blob([value.buffer], { type: "application/octet-stream" });
            if (blob.size <= 0 || blob.size > 1073741824) {
                callback(false, 5);
                return;
            }
            var cleanupCloudSaveHistory = function (requestVerificationToken, callback) {
                $.ajax({
                    url: "/api/cloud/aws/cleanuphistory?gameid=" + settings.name,
                    method: "POST",
                    headers: { RequestVerificationToken: requestVerificationToken }
                })
                    .always(function () {
                        if (callback !== undefined)
                            callback();
                    });
            };
            var jqxhr = $.ajax({ url: "/api/cloud/aws/getuploadlink?gameid=" + settings.name + "&filesize=" + blob.size })
                .done(function (result) {
                    if (result.status == true) {
                        //upload
                        axios.put(result.url,blob,{
                            headers: { "content-type": blob.type },
                            onUploadProgress: (progressEvent) => {
                                pcallback(progressEvent.progress);
                            }
                        }).then(response => {
                            if (response.status == 200) {
                                cleanupCloudSaveHistory(result.requestVerificationToken, function () {
                                    callback(true);
                                });
                            }
                            else
                                callback(false, 4);
                        }).catch(err => {
                            console.log(err);
                            callback(false, 4);
                        });
                    }
                    else {
                        //error upload link not generated,non gold member or other error
                        callback(false,result.code);
                    }
                }).fail(function (jqXHR, textStatus) {
                    callback(false,1);
                });

        });
    }
    Load() {
        return this.#idb.Load(this.#settings.name);
    }
    SaveState(slot, callback) {
        var self = this;
        this.Message("ddyx-save-state", { slot: slot }, function () {
            //self.Save(callback);
            if (callback !== undefined)
                callback();
        });
    }
    LoadState(slot, callback) {
        this.Message("ddyx-load-state", { slot: slot }, function () {
            if (callback !== undefined)
                callback();
        });
    }
    SwitchDisc(index, callback) {
        // 2026-10-04: keep the native completion result; a failed replacement
        // must not make the page select a disc that was never mounted.
        if (this.#closed || !this.command) {
            callback?.({ command: "ddyx-mountdisc", ok: false, error: "The emulator is not running" });
            return;
        }
        this.Message("ddyx-mountdisc", { index: index }, function (result) {
            if (callback !== undefined)
                callback(result);
        });
    }
    Key(code, pressed, source) { return !this.#closed && this.#input?.key(code, pressed, source); }
    MouseButton(button, pressed, source) { return !this.#closed && this.#input?.button(button, pressed, source); }
    MoveMouse(x, y) { if (!this.#closed) this.#input?.move(x, y); }
    MouseWheel(delta, source) { return !this.#closed && this.#input?.wheel(delta, source); }
    GamepadButton(button, pressed, source) { return !this.#closed && this.#input?.gamepadButton(button, pressed, source); }
    GamepadAxes(pair, x, y, source) { return !this.#closed && this.#input?.gamepadAxes(pair, x, y, source); }
    ReleaseInput(source) {
        this.#input?.release(source);
        if (source === undefined) {
            this.#inputReset?.(this);
            this.#unlockPointer?.();
        }
    }
    SetInputEnabled(enabled) {
        if (this.#closed) return;
        if (this.#inputEnabled !== enabled) this.ReleaseInput();
        this.#inputEnabled = enabled;
        this.#input?.enable(enabled && !this.#paused);
    }
    async ToggleFullscreen(target = this.#canvas.parentElement) {
        this.ReleaseInput();
        if (document.fullscreenElement) await document.exitFullscreen();
        else {
            await target.requestFullscreen();
            if (navigator.keyboard?.lock) await navigator.keyboard.lock().catch(() => {});
        }
    }
    SetVoodoo(enableUpscaler, enableAniso) {
        this.Message("ddyx-voodoo", { voodoo_upscaler: enableUpscaler, voodoo_aniso: enableAniso }, function () {

        });
    }
    Pause() {
        if (this.#closed || !this.command) return this.#paused;
        this.ReleaseInput();
        if (this.#paused)
            this.command.resume();
        else
            this.command.pause();

        this.#paused = !this.#paused;
        this.#input.enable(this.#inputEnabled && !this.#paused);
        return this.#paused;
    }
    Mute() {
        if (this.#muted)
            this.command.unmute();
        else
            this.command.mute();

        this.#muted = !this.#muted;
        return this.#muted;

    }
}
