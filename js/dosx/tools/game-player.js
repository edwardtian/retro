(function (root) {
    "use strict";
    const key = (label, code = label, options = {}) => ({ label, code, ...options });
    const pageKey = (label, page) => ({ label, page, style: "utility" });
    const latch = (label, code) => key(label, code, { latch: true, style: "utility" });
    const backspace = () => key("⌫", "Backspace", { style: "utility wide" });
    const shifted = (label, code) => key(label, code, { shift: true });

    // Keep the phone's four rows in both orientations. PC-only keys have their own pages.
    function keyboardRows(name, labels = {}, shift = false) {
        const letters = text => [...text].map(letter => key(shift ? letter : letter.toLowerCase(), "Key" + letter));
        const bottom = (first, second = pageKey("Fn", "functions")) => [first, second,
            key(labels.space || "space", "Space", { style: "space" }),
            key(labels.enter || "return", "Enter", { style: "utility return" }),
            { label: "⌄", close: true, aria: labels.close || "Close keyboard", style: "utility" }];
        switch (name) {
            case "symbols": return [
                [..."1234567890"].map(n => key(n, "Digit" + n)),
                [key("-", "Minus"), key("/", "Slash"), shifted(":", "Semicolon"), key(";", "Semicolon"), shifted("(", "Digit9"), shifted(")", "Digit0"), shifted("$", "Digit4"), shifted("&", "Digit7"), shifted("@", "Digit2"), shifted('"', "Quote")],
                [pageKey("#+=", "symbols2"), key(".", "Period"), key(",", "Comma"), shifted("?", "Slash"), shifted("!", "Digit1"), key("'", "Quote"), backspace()],
                bottom(pageKey("ABC", "letters"))];
            case "symbols2": return [
                [key("[", "BracketLeft"), key("]", "BracketRight"), shifted("{", "BracketLeft"), shifted("}", "BracketRight"), shifted("#", "Digit3"), shifted("%", "Digit5"), shifted("^", "Digit6"), shifted("*", "Digit8"), shifted("+", "Equal"), key("=", "Equal")],
                [shifted("_", "Minus"), key("\\", "Backslash"), shifted("|", "Backslash"), shifted("~", "Backquote"), shifted("<", "Comma"), shifted(">", "Period"), key("`", "Backquote"), shifted("$", "Digit4"), shifted("&", "Digit7"), shifted("@", "Digit2")],
                [pageKey("123", "symbols"), key(".", "Period"), key(",", "Comma"), shifted("?", "Slash"), shifted("!", "Digit1"), key("'", "Quote"), backspace()],
                bottom(pageKey("ABC", "letters"))];
            case "functions": return [
                [1, 2, 3, 4, 5, 6].map(n => key("F" + n)), [7, 8, 9, 10, 11, 12].map(n => key("F" + n)),
                [key("Esc", "Escape"), key("Tab"), latch("Ctrl", "ControlLeft"), latch("Alt", "AltLeft"), latch("⇧", "ShiftLeft"), backspace()],
                bottom(pageKey("ABC", "letters"), pageKey("↔", "navigation"))];
            case "navigation": return [
                [key("Home"), key("End"), key("PgUp", "PageUp"), key("PgDn", "PageDown")],
                [key("Ins", "Insert"), key("Del", "Delete"), key("Esc", "Escape"), key("Tab")],
                [latch("Ctrl", "ControlLeft"), latch("Alt", "AltLeft"), key("←", "ArrowLeft"), key("↑", "ArrowUp"), key("↓", "ArrowDown"), key("→", "ArrowRight")],
                bottom(pageKey("ABC", "letters"))];
            default: return [letters("QWERTYUIOP"), letters("ASDFGHJKL"),
                [latch("⇧", "ShiftLeft"), ...letters("ZXCVBNM"), backspace()],
                bottom(pageKey("123", "symbols"))];
        }
    }

    class GamePlayer {
        constructor(page) {
            this.page = page;
            const byId = id => page.querySelector("#" + id);
            this.player = byId("gamePlayer");
            this.canvas = byId("canvas");
            this.touchSurface = byId("dosWindow");
            this.keyboard = byId("gameKeyboard");
            this.controls = byId("gameTouchControls");
            this.overlay = byId("gameInputOverlay");
            this.status = byId("gamePlayerStatus");
            this.held = new Map();
            this.latched = new Set();
            this.ready = false;
            this.pageFullscreen = false;
            this.fullscreenRequest = null;
            this.aspect = 4 / 3;
            this.touchControlsEnabled = matchMedia("(any-pointer: coarse)").matches || navigator.maxTouchPoints > 0;
            this.events = new AbortController();
            const listen = (target, name, fn, options = {}) => target?.addEventListener(name, fn, { ...options, signal: this.events.signal });
            this.player.dataset.stage = "starter";
            for (const button of this.player.querySelectorAll("#gameControlMenu button")) {
                const label = button.getAttribute("aria-label") || button.title || button.getAttribute("data-bs-original-title") || button.closest("[title]")?.title;
                if (label) button.setAttribute("aria-label", label);
            }
            this.fullscreenLabel = byId("FullScreen").getAttribute("aria-label");
            byId("TouchScreen").setAttribute("aria-pressed", String(this.touchControlsEnabled));
            this.bindMenuEvents();
            listen(byId("Keyboard"), "click", () => this.showKeyboard(this.keyboard.hidden));
            listen(byId("TouchScreen"), "click", () => this.showTouchControls(!this.touchControlsEnabled));
            listen(byId("FullScreen"), "click", () => this.toggleFullscreen());
            // Prevent mode switches from taking focus and releasing latched Ctrl/Alt.
            listen(this.keyboard, "pointerdown", e => {
                if (e.target.closest("[data-keyboard-page], [data-keyboard-close]")) {
                    e.preventDefault(); this.canvas.focus({ preventScroll: true });
                }
            });
            listen(this.keyboard, "click", e => {
                const tab = e.target.closest("[data-keyboard-page]");
                if (tab) this.switchKeyboard(tab.dataset.keyboardPage);
                if (e.target.closest("[data-keyboard-close]")) this.showKeyboard(false);
            });
            this.renderKeyboard("letters");
            listen(this.player, "pointerdown", e => this.press(e));
            listen(this.player, "pointerup", e => this.release(e));
            listen(this.player, "pointercancel", () => this.helper?.ReleaseInput());
            listen(this.player, "lostpointercapture", e => this.release(e));
            listen(this.player, "contextmenu", e => {
                if (e.target.closest(".game-layout-catalog input")) return;
                if (e.target.closest("#dosWindow, #gameInputOverlay, #gameControlMenu, .game-layout-tools")) e.preventDefault();
            });
            // Keyboard/screen-reader activation has no pointerdown/up pair.
            listen(this.player, "click", e => {
                const button = e.target.closest("[data-game-key], [data-mouse-button]");
                if (!button || e.detail !== 0 || !this.canInput()) return;
                if (button.hasAttribute("data-latch")) this.toggleLatch(button);
                else { this.sendButton(button, true, "activation"); this.sendButton(button, false, "activation"); }
            });
            listen(document, "fullscreenchange", () => this.fullscreenChanged());
            listen(document, "visibilitychange", () => this.syncInput());
            listen(window, "resize", () => this.layout());
            listen(window.visualViewport, "resize", () => this.layout());
            listen(window.visualViewport, "scroll", () => this.layout());
            listen(matchMedia("(orientation: landscape)"), "change", () => { this.helper?.ReleaseInput(); this.layout(); });
            listen(window, "pagehide", () => this.dispose());
            this.loadingObserver = new MutationObserver(() => this.syncInput());
            for (const element of [byId("dosWindowLoading"), document.getElementById("login-layer")])
                if (element) this.loadingObserver.observe(element, { attributes: true, attributeFilter: ["style", "class", "hidden"] });
            this.modalHandler = e => {
                if (e.type === "show") { this.modalOpen = true; this.helper?.ReleaseInput(); this.exitFullscreen(); }
                else this.modalOpen = !!document.querySelector(".modal.show");
                this.syncInput();
            };
            this.menuHandler = e => {
                this.menuOpen = e.type === "show" || !!this.player.querySelector(".dropdown-menu.show");
                this.syncInput();
            };
            $(document).on("show.bs.modal.gamePlayer hidden.bs.modal.gamePlayer", this.modalHandler);
            $(this.player).on("show.bs.dropdown.gamePlayer hidden.bs.dropdown.gamePlayer", this.menuHandler);
            this.touchUI = new DDYXTouchControls(this);
            this.layout();
        }
        canInput() { return this.ready && !this.blocked; }
        isFullscreen() { return this.pageFullscreen || document.fullscreenElement === this.player; }
        bindMenuEvents() {
            // Bootstrap delegates some actions in document capture; intercept before that phase.
            window.addEventListener("click", e => this.handleMenuClick(e), { capture: true, signal: this.events.signal });
        }
        handleMenuClick(e) {
            if (!this.isFullscreen()) return;
            const menu = this.page.querySelector("#gameControlMenu");
            if (!menu.contains(e.target)) return;
            const groups = [...menu.querySelectorAll(":scope > .btn-group")];
            const opacity = groups.map(group => Number(getComputedStyle(group).opacity));
            this.restartMenuFade();
            // Compare the animated opacity with the restored style, including hover/focus styling.
            // The first click while fading or faded only reveals the menu, without reaching actions.
            if (groups.some((group, index) => Number(getComputedStyle(group).opacity) > opacity[index] + .001)) {
                e.preventDefault();
                e.stopImmediatePropagation();
            }
        }
        restartMenuFade() {
            if (!this.isFullscreen()) return;
            const menu = this.page.querySelector("#gameControlMenu");
            // Commit the animation reset so repeated clicks restart its five-second delay.
            menu.classList.add("is-menu-active");
            void menu.offsetWidth;
            menu.classList.remove("is-menu-active");
        }
        setFrameSize(width, height) {
            if (!(width > 0 && height > 0 && Number.isFinite(width) && Number.isFinite(height))) return;
            this.aspect = width / height;
            this.layout();
        }
        startLoading() { this.player.dataset.stage = "loading"; this.layout(); }
        setPaused(paused) {
            this.paused = paused;
            const button = this.page.querySelector("#Pause");
            if (button) {
                button.setAttribute("aria-pressed", String(paused));
                const icon = document.createElement("img"); icon.src = "/images/common/" + (paused ? "play" : "pause") + ".svg";
                icon.alt = ""; icon.width = icon.height = 16; button.replaceChildren(icon);
            }
            this.syncInput();
        }
        attach(helper) {
            this.detach();
            this.helper = helper;
            this.ready = true;
            this.paused = false;
            this.player.dataset.stage = "running";
            this.canvas = this.page.querySelector("#canvas");
            this.canvas.tabIndex = 0;
            this.gesture = new DDYXGameInput.TouchpadGesture({
                move: (x, y) => helper.MoveMouse(x, y), button: (b, down, source) => helper.MouseButton(b, down, source),
                release: source => helper.ReleaseInput(source)
            });
            // This container fills fullscreen, including the black bars. UI overlays are siblings.
            this.touchEvents = new AbortController();
            const listen = (name, fn, options = {}) => this.touchSurface.addEventListener(name, fn, { ...options, signal: this.touchEvents.signal });
            const isTouchTarget = target => target === this.canvas || this.isFullscreen() && target === this.touchSurface;
            // Safari's loupe gesture is not cancelled by preventing pointerdown or contextmenu.
            // Only cancel touches owned by the touchpad; menus and native scrolling keep their defaults.
            listen("touchstart", e => {
                if (e.cancelable && this.canInput() && isTouchTarget(e.target)) e.preventDefault();
            }, { passive: false });
            listen("pointerdown", e => {
                if (e.pointerType !== "touch" || !this.canInput()) return;
                if (!isTouchTarget(e.target)) return;
                e.preventDefault(); this.canvas.focus({ preventScroll: true });
                if (this.gesture.down(e.pointerId, e.clientX, e.clientY, e.timeStamp)) {
                    try { this.touchSurface.setPointerCapture(e.pointerId); }
                    catch { this.gesture.up(e.pointerId, e.timeStamp, true); }
                }
            });
            listen("pointermove", e => {
                if (!this.gesture.has(e.pointerId)) return;
                e.preventDefault(); this.gesture.move(e.pointerId, e.clientX, e.clientY);
            });
            listen("pointerup", e => {
                // The release can contain a final position not delivered by pointermove.
                this.gesture.move(e.pointerId, e.clientX, e.clientY);
                this.gesture.up(e.pointerId, e.timeStamp);
            });
            listen("pointercancel", () => helper.ReleaseInput());
            listen("lostpointercapture", e => {
                // Ignore capture changes bubbling from the canvas or another descendant.
                if (e.target === this.touchSurface) this.gesture.up(e.pointerId, e.timeStamp, true);
            });
            this.syncInput(); this.layout();
        }
        detach(helper) {
            if (helper && helper !== this.helper) return;
            this.touchUI?.close(false);
            this.exitFullscreen();
            this.helper?.ReleaseInput();
            this.touchEvents?.abort();
            this.helper = null;
            this.ready = false;
            this.resetControls();
            this.controls.hidden = true;
            this.showKeyboard(false);
            this.player.dataset.stage = "starter";
            this.syncInput();
        }
        syncInput() {
            const visible = element => element && getComputedStyle(element).display !== "none" && !element.hidden;
            const login = visible(document.getElementById("login-layer"));
            if (login && (this.isFullscreen() || this.fullscreenRequest)) this.exitFullscreen();
            if (document.hidden && this.fullscreenRequest) this.fullscreenRequest.cancelled = true;
            this.blocked = !this.ready || this.paused || this.layoutEditing || document.hidden || this.modalOpen || this.menuOpen || login ||
                visible(this.page.querySelector("#dosWindowLoading"));
            this.helper?.SetInputEnabled(!this.blocked);
            this.controls.hidden = !this.ready || !this.touchControlsEnabled || !this.isFullscreen();
            this.overlay.classList.toggle("game-input-combined", !this.controls.hidden && !this.keyboard.hidden);
            // The screen remains a touchpad independently of either virtual input overlay.
            const touchActive = this.canInput();
            this.canvas.classList.toggle("game-touch-surface", touchActive);
            this.touchSurface.classList.toggle("game-touch-surface", touchActive && this.isFullscreen());
            for (const button of this.player.querySelectorAll("[data-game-key], [data-mouse-button]")) button.disabled = this.blocked;
            this.touchUI?.sync(!this.controls.hidden);
        }
        sendButton(button, pressed, source) {
            if (pressed && button.dataset.shift) this.helper?.Key("ShiftLeft", true, source);
            if (button.dataset.gameKey) this.helper?.Key(button.dataset.gameKey, pressed, source);
            else this.helper?.MouseButton(Number(button.dataset.mouseButton), pressed, source);
            if (!pressed && button.dataset.shift) this.helper?.Key("ShiftLeft", false, source);
        }
        toggleLatch(button) {
            const code = button.dataset.gameKey;
            const pressed = !this.latched.has(code);
            if (pressed) this.latched.add(code); else this.latched.delete(code);
            this.helper.Key(code, pressed, "latch:" + code);
            this.updateModifiers();
        }
        updateModifiers() {
            for (const button of this.player.querySelectorAll("[data-latch]"))
                button.setAttribute("aria-pressed", String(this.latched.has(button.dataset.gameKey)));
            for (const button of this.player.querySelectorAll('#gameKeyboard [data-game-key^="Key"]')) {
                const letter = button.dataset.gameKey.slice(3);
                button.textContent = this.latched.has("ShiftLeft") ? letter : letter.toLowerCase();
            }
        }
        press(e) {
            const button = e.target.closest("[data-game-key], [data-mouse-button]");
            if (!button || e.button !== 0 || !this.canInput()) return;
            e.preventDefault();
            this.canvas.focus({ preventScroll: true });
            button.setPointerCapture(e.pointerId);
            // Quick controls press immediately for holds/drags; keyboard swipes cancel typing.
            const pending = e.pointerType === "touch" && !!button.closest("#gameKeyboard");
            if (pending) {
                this.held.set(e.pointerId, { button, pending, x: e.clientX, y: e.clientY });
                button.classList.add("is-pressed");
            } else if (button.hasAttribute("data-latch")) this.toggleLatch(button);
            else {
                this.held.set(e.pointerId, { button, pending: false });
                this.sendButton(button, true, "pointer:" + e.pointerId);
                button.classList.add("is-pressed");
            }
        }
        release(e) {
            const held = this.held.get(e.pointerId);
            if (!held) return;
            const { button } = held;
            this.held.delete(e.pointerId);
            if (held.pending && e.type === "pointerup" && this.canInput() &&
                Math.hypot(e.clientX - held.x, e.clientY - held.y) <= 10) {
                if (button.hasAttribute("data-latch")) this.toggleLatch(button);
                else {
                    this.sendButton(button, true, "pointer:" + e.pointerId);
                    this.sendButton(button, false, "pointer:" + e.pointerId);
                }
            } else if (!held.pending) this.sendButton(button, false, "pointer:" + e.pointerId);
            this.helper?.ReleaseInput("pointer:" + e.pointerId);
            if (![...this.held.values()].some(item => item.button === button)) button.classList.remove("is-pressed");
        }
        releasePointers() {
            for (const [id, { button }] of this.held) {
                this.helper?.ReleaseInput("pointer:" + id);
                button.classList.remove("is-pressed");
            }
            this.held.clear();
            this.gesture?.reset();
        }
        resetControls(helper) {
            if (helper && helper !== this.helper) return;
            this.touchUI?.releaseAll();
            this.gesture?.reset();
            this.held.clear(); this.latched.clear();
            for (const button of this.player.querySelectorAll("[data-game-key], [data-mouse-button]")) button.classList.remove("is-pressed");
            this.updateModifiers();
        }
        switchKeyboard(name) {
            this.releasePointers();
            // Number/symbol labels describe the character sent; retain Ctrl/Alt for chords.
            if (name.startsWith("symbols")) {
                this.latched.delete("ShiftLeft");
                this.helper?.ReleaseInput("latch:ShiftLeft");
            }
            this.renderKeyboard(name);
        }
        renderKeyboard(name) {
            const host = this.keyboard.querySelector("#gameKeyboardKeys");
            host.replaceChildren();
            this.keyboard.dataset.layout = name;
            const labels = { space: this.keyboard.dataset.spaceLabel, enter: this.keyboard.dataset.returnLabel, close: this.keyboard.dataset.closeLabel };
            for (const row of keyboardRows(name, labels, this.latched.has("ShiftLeft"))) {
                const line = document.createElement("div"); line.className = "game-key-row";
                for (const item of row) {
                    const button = document.createElement("button");
                    button.type = "button"; button.textContent = item.label;
                    if (item.style) button.className = item.style.split(" ").map(style => "game-key-" + style).join(" ");
                    if (item.page) button.dataset.keyboardPage = item.page;
                    else if (item.close) button.dataset.keyboardClose = "";
                    else {
                        button.dataset.gameKey = item.code;
                        if (item.shift) button.dataset.shift = "true";
                        if (item.latch) { button.dataset.latch = ""; button.setAttribute("aria-pressed", String(this.latched.has(item.code))); }
                    }
                    button.setAttribute("aria-label", item.aria || (item.latch ? item.code : item.label));
                    line.append(button);
                }
                host.append(line);
            }
            this.syncInput();
        }
        showTouchControls(show) {
            this.touchControlsEnabled = !!show;
            this.page.querySelector("#TouchScreen").setAttribute("aria-pressed", String(this.touchControlsEnabled));
            // TouchControls.sync releases its own sources when hidden, leaving screen gestures intact.
            this.syncInput();
        }
        showKeyboard(show) {
            show = !!show && this.ready && this.isFullscreen() && !this.layoutEditing;
            this.helper?.ReleaseInput();
            this.keyboard.hidden = !show;
            this.page.querySelector("#Keyboard").setAttribute("aria-expanded", String(show));
            this.syncInput();
        }
        async toggleFullscreen() {
            if (this.isFullscreen()) return this.exitFullscreen();
            if (!this.ready || !this.helper || this.fullscreenRequest || this.modalOpen || document.hidden) return;
            this.status.hidden = true;
            this.helper.ReleaseInput();
            this.scroll = { left: window.scrollX, top: window.scrollY };
            const request = { helper: this.helper, cancelled: false, nativeEntered: false };
            this.fullscreenRequest = request;
            let nativeFailed = typeof this.player.requestFullscreen !== "function" || document.fullscreenEnabled === false;
            if (!nativeFailed) {
                try { await request.helper.ToggleFullscreen(this.player); }
                catch { nativeFailed = true; }
            }
            this.fullscreenRequest = null;
            if (request.cancelled || !this.ready || this.helper !== request.helper || this.modalOpen || document.hidden) {
                if (document.fullscreenElement === this.player) await this.exitFullscreen();
                else this.scroll = null;
                return;
            }
            // Some mobile browsers expose the API but reject the request. Use
            // the same full-window layout without changing the canvas or Worker.
            if (nativeFailed && document.fullscreenElement !== this.player) this.enterPageFullscreen();
            else if (!this.isFullscreen()) this.scroll = null;
        }
        enterPageFullscreen() {
            if (this.isFullscreen() || !this.ready) return;
            this.helper?.ReleaseInput();
            this.scroll ??= { left: window.scrollX, top: window.scrollY };
            this.pageScrollStyles = [
                [document.body, { position: "fixed", top: -this.scroll.top + "px", left: -this.scroll.left + "px", width: "100%", overflow: "hidden" }],
                [document.documentElement, { overflow: "hidden" }]
            ].map(([element, styles]) => ({
                element,
                previous: Object.entries(styles).map(([name, value]) => {
                    const previous = { name, value: element.style.getPropertyValue(name), priority: element.style.getPropertyPriority(name) };
                    element.style.setProperty(name, value);
                    return previous;
                })
            }));
            this.pageFullscreen = true;
            this.player.classList.add("is-page-fullscreen");
            this.fullscreenChanged();
        }
        leavePageFullscreen() {
            if (!this.pageFullscreen) return;
            // Release pointer lock before restoring the body styles it also uses.
            this.helper?.ReleaseInput();
            this.pageFullscreen = false;
            this.player.classList.remove("is-page-fullscreen");
            for (const { element, previous } of this.pageScrollStyles) {
                for (const { name, value, priority } of previous) {
                    if (value) element.style.setProperty(name, value, priority);
                    else element.style.removeProperty(name);
                }
            }
            this.pageScrollStyles = null;
        }
        fullscreenChanged() {
            const nativeActive = document.fullscreenElement === this.player;
            if (nativeActive && this.fullscreenRequest?.cancelled) { this.exitFullscreen(); return; }
            if (this.fullscreenRequest) {
                if (nativeActive) this.fullscreenRequest.nativeEntered = true;
                else if (this.fullscreenRequest.nativeEntered) this.fullscreenRequest.cancelled = true;
            }
            if (nativeActive && this.pageFullscreen) this.leavePageFullscreen();
            this.helper?.ReleaseInput();
            const active = this.isFullscreen();
            const button = this.page.querySelector("#FullScreen");
            button.setAttribute("aria-pressed", String(active));
            const label = active ? this.status.dataset.fullscreenExit : this.fullscreenLabel;
            button.setAttribute("aria-label", label);
            button.setAttribute("data-bs-original-title", label);
            window.bootstrap?.Tooltip?.getInstance(button)?.hide();
            if (active && this.canInput()) this.canvas.focus({ preventScroll: true });
            if (!active) {
                this.showKeyboard(false);
                if (this.scroll) window.scrollTo({ ...this.scroll, behavior: "instant" });
                this.scroll = null;
            }
            this.syncInput(); this.layout();
        }
        async exitFullscreen() {
            this.touchUI?.close();
            if (this.fullscreenRequest) this.fullscreenRequest.cancelled = true;
            if (this.pageFullscreen) {
                this.leavePageFullscreen();
                this.fullscreenChanged();
            }
            if (document.fullscreenElement === this.player) {
                try { await document.exitFullscreen(); }
                catch { this.showStatus(this.status.dataset.fullscreenError); }
            }
        }
        layout() {
            const viewport = window.visualViewport;
            const height = viewport?.height || window.innerHeight;
            if (this.pageFullscreen) {
                for (const [name, value] of Object.entries({ width: viewport?.width || window.innerWidth, height,
                    top: viewport?.offsetTop || 0, left: viewport?.offsetLeft || 0 }))
                    this.player.style.setProperty("--game-viewport-" + name, value + "px");
            }
            this.player.style.setProperty("--game-frame-width", Math.min(this.player.clientWidth, Math.max(160, height - 70) * this.aspect) + "px");
            this.touchUI?.layout();
        }
        showStatus(text) { this.status.textContent = text; this.status.hidden = false; }
        dispose() {
            this.detach();
            this.touchUI?.dispose();
            this.events.abort(); this.loadingObserver.disconnect();
            $(document).off(".gamePlayer", this.modalHandler);
            $(this.player).off(".gamePlayer", this.menuHandler);
        }
    }
    root.DDYXGamePlayer = GamePlayer;
    if (typeof module === "object" && module.exports) module.exports = { GamePlayer, keyboardRows };
})(globalThis);
