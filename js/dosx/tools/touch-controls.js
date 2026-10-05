(function (root) {
    "use strict";
    const model = root.DDYXTouchLayout;
    const stickIcons = { arrows: "keyboard", mouse: "touch-mouse", axes12: "gamepad", axes34: "gamepad" };
    // Clockwise sectors in screen coordinates, starting at the right.
    const arrowDirections = [
        ["ArrowRight"], ["ArrowDown", "ArrowRight"], ["ArrowDown"], ["ArrowDown", "ArrowLeft"],
        ["ArrowLeft"], ["ArrowUp", "ArrowLeft"], ["ArrowUp"], ["ArrowUp", "ArrowRight"]
    ];
    class TouchControls {
        constructor(player) {
            this.player = player;
            this.host = player.controls;
            this.overlay = player.overlay;
            this.mainMenu = player.page.querySelector("#gameControlMenu");
            this.labels = JSON.parse(player.page.querySelector("#gameTouchText").textContent);
            this.text = value => this.labels[value] || value;
            this.events = new AbortController();
            this.runtime = new Map(); this.editPointers = new Map(); this.elements = new Map();
            this.visible = false; this.editing = false; this.loading = false; this.generation = 0;
            this.config = model.defaults(this.host.dataset.gameId);
            this.buildTools();
            this.store = new model.LayoutStore({ gameId: this.host.dataset.gameId, userId: this.host.dataset.userId,
                gold: this.host.dataset.cloud === "true", token: this.host.dataset.requestToken, notify: state => this.notice(state) });
            this.bindPointers();
            this.listen(this.host, "click", e => {
                if (e.detail !== 0) return;
                const id = e.target.closest("[data-touch-control]")?.dataset.touchControl;
                if (this.editing) { if (id) this.select(id); }
                else if (id && this.player.canInput() && !this.loading) {
                    const c = this.control(id), source = "touch-activation:" + id;
                    if (c.type === "stick") return;
                    this.send(c, true, source);
                    const timer = setTimeout(() => { this.player.helper?.ReleaseInput(source); this.activations.delete(timer); }, 80);
                    this.activations.set(timer, source);
                }
            });
            this.activations = new Map();
            const suspend = () => {
                this.releaseAll();
                // Switching accounts in another tab must invalidate reads begun before that switch.
                if (this.loading) { this.store.lastLoadFailed = true; this.store.cancelLoad(); }
            };
            this.listen(window, "blur", suspend);
            this.listen(document, "visibilitychange", () => { if (document.hidden) suspend(); });
            this.listen(document, "keydown", e => {
                if (!this.editing) return;
                if (e.code === "Escape") {
                    e.preventDefault(); e.stopPropagation();
                    if (!this.catalogPanel.hidden) this.hideCatalog(); else this.close();
                }
                if (e.code === "Tab") {
                    const scope = this.catalogPanel.hidden ? this.tools : this.catalogPanel;
                    const focusable = [...scope.querySelectorAll("button:not(:disabled), input")].filter(n => !n.hidden);
                    if (this.catalogPanel.hidden && !this.mouseSettings.hidden) focusable.push(this.sensitivity);
                    const index = focusable.indexOf(document.activeElement);
                    if (focusable.length) {
                        const next = index < 0 ? (e.shiftKey ? focusable.length - 1 : 0) : (index + (e.shiftKey ? -1 : 1) + focusable.length) % focusable.length;
                        e.preventDefault(); focusable[next].focus({ preventScroll: true });
                    }
                }
            }, { capture: true });
            this.listen(window, "storage", e => {
                if (e.key === this.store.key) this.store.cancelLoad();
            });
            this.observer = new ResizeObserver(() => this.layout());
            this.observer.observe(this.host);
            this.observer.observe(this.mainMenu);
            this.render();
        }
        listen(target, name, fn, options = {}) { target.addEventListener(name, fn, { ...options, signal: this.events.signal }); }
        bindPointers() {
            // These controls and the editing surface use Pointer Events, so suppress Safari's native loupe.
            // Keep this on the host: the tools, catalog, sensitivity slider and full keyboard are siblings.
            this.listen(this.host, "touchstart", e => { if (e.cancelable) e.preventDefault(); }, { passive: false });
            // End a captured gesture even if its final event is retargeted outside the overlay.
            this.listen(document, "pointerdown", e => this.down(e), { capture: true });
            this.listen(document, "pointermove", e => this.move(e), { capture: true });
            this.listen(document, "pointerup", e => this.up(e), { capture: true });
            this.listen(document, "pointercancel", e => this.up(e), { capture: true });
            this.listen(this.host, "lostpointercapture", e => {
                if (e.target === this.host && !this.host.hasPointerCapture(e.pointerId)) this.up(e);
            });
            // Safari's final contact list is also authoritative if a PointerEvent end was lost.
            for (const name of ["touchend", "touchcancel"])
                this.listen(document, name, e => this.contactsEnded(e), { capture: true, passive: true });
        }
        button(icon, label, action) {
            const b = document.createElement("button");
            b.type = "button"; b.className = "game-layout-button"; b.title = this.text(label); b.setAttribute("aria-label", this.text(label));
            const img = document.createElement("img"); img.src = "/images/common/" + icon + ".svg"; img.width = img.height = 16; img.alt = "";
            b.append(img); this.listen(b, "click", action); return b;
        }
        stickLabel(target, label) {
            const icon = document.createElement("img"); icon.src = "/images/common/touch-stick.svg";
            icon.alt = ""; icon.draggable = false; icon.className = "game-stick-icon"; icon.width = icon.height = 14;
            const name = document.createElement("span"); name.textContent = label;
            target.append(icon, name);
        }
        buildTools() {
            this.tools = document.createElement("div"); this.tools.className = "game-layout-tools"; this.tools.hidden = true;
            this.settings = this.button("touch-settings", "Edit controls", () => this.open());
            this.remove = this.button("touch-delete", "Delete selected control", () => this.deleteSelected());
            this.add = this.button("touch-add", "Add control", () => this.showCatalog());
            this.done = this.button("close", "Close settings", () => this.close());
            this.tools.append(this.settings, this.remove, this.add, this.done);
            this.remove.hidden = this.add.hidden = this.done.hidden = true;
            this.message = document.createElement("div"); this.message.className = "game-layout-status"; this.message.hidden = true;
            this.message.setAttribute("role", "status"); this.message.setAttribute("aria-live", "polite");
            this.catalogPanel = document.createElement("section"); this.catalogPanel.className = "game-layout-catalog"; this.catalogPanel.hidden = true;
            this.catalogPanel.setAttribute("role", "dialog"); this.catalogPanel.setAttribute("aria-label", this.text("Add control"));
            const heading = document.createElement("div"); heading.className = "game-layout-catalog-heading";
            const title = document.createElement("strong"); title.textContent = this.text("Add control");
            this.catalogClose = this.button("close", "Close list", () => this.hideCatalog());
            heading.append(title, this.catalogClose);
            this.search = document.createElement("input"); this.search.type = "search"; this.search.className = "form-control";
            this.search.placeholder = this.text("Search controls"); this.search.setAttribute("aria-label", this.text("Search controls"));
            this.listen(this.search, "input", () => this.filterCatalog());
            this.categories = document.createElement("div"); this.categories.className = "game-layout-categories";
            for (const [category, icon] of [["Keyboard", "keyboard"], ["Mouse", "touch-mouse"], ["Gamepad", "gamepad"]]) {
                const button = this.button(icon, category, () => { this.category = category; this.filterCatalog(); });
                button.classList.add("game-layout-category"); button.dataset.category = category;
                this.categories.append(button);
            }
            const filters = document.createElement("div"); filters.className = "game-layout-catalog-filters";
            filters.append(this.categories, this.search);
            this.list = document.createElement("div"); this.list.className = "game-layout-catalog-list";
            this.catalogPanel.append(heading, filters, this.list);
            this.mouseSettings = document.createElement("label"); this.mouseSettings.className = "game-stick-settings"; this.mouseSettings.hidden = true;
            const sensitivityLabel = document.createElement("span"); sensitivityLabel.textContent = this.text("Mouse stick sensitivity");
            this.sensitivityValue = document.createElement("output");
            this.sensitivity = document.createElement("input"); this.sensitivity.type = "range";
            this.sensitivity.min = model.MIN_SENSITIVITY; this.sensitivity.max = model.MAX_SENSITIVITY; this.sensitivity.step = model.SENSITIVITY_STEP;
            this.sensitivity.setAttribute("aria-label", this.text("Mouse stick sensitivity"));
            this.listen(this.sensitivity, "input", () => this.setSensitivity());
            this.mouseSettings.append(sensitivityLabel, this.sensitivityValue, this.sensitivity);
            this.overlay.append(this.tools, this.message, this.catalogPanel, this.mouseSettings);
        }
        notice(state) {
            const labels = { localSaved: "Layout saved in this browser.", syncing: "Syncing layout...", cloudSaved: "Layout saved to cloud.",
                cloudError: "Cloud save failed. Your browser copy will be retried next time.", storageError: "Could not save the browser copy.",
                loadError: "Could not read the cloud layout. Your current layout is unchanged.", accountChanged: "Your account changed. Reload this page before syncing layouts.",
                authenticationRequired: "Sign in again, then reopen touch controls to sync your layout.",
                ownerRequired: "Could not verify the layout account. Reload this page and try again.",
                loading: "Loading layout...", limit: "You can add up to 128 controls.", invalid: "The layout could not be saved.",
                editHint: "Drag buttons with one finger; resize them with two fingers." };
            this.message.textContent = this.text(labels[state] || state);
            this.message.classList.remove("is-fading");
            this.message.hidden = false;
            clearTimeout(this.noticeTimer);
            if (["localSaved", "cloudSaved", "editHint"].includes(state)) this.noticeTimer = setTimeout(() => {
                this.message.classList.add("is-fading");
                this.noticeTimer = setTimeout(() => { this.message.hidden = true; }, 300);
            }, 3500);
        }
        control(id) { return this.config.controls.find(c => c.id === id); }
        viewport() {
            const rect = this.host.getBoundingClientRect(), style = getComputedStyle(this.host);
            const v = { width: rect.width, height: rect.height, left: parseFloat(style.paddingLeft) || 8, right: parseFloat(style.paddingRight) || 8,
                top: parseFloat(style.paddingTop) || 8, bottom: parseFloat(style.paddingBottom) || 8, clientX: rect.left, clientY: rect.top };
            return v;
        }
        render() {
            this.releaseAll(); this.elements.clear(); this.host.replaceChildren();
            for (const c of this.config.controls) {
                const button = document.createElement("button"); button.type = "button"; button.dataset.touchControl = c.id;
                button.className = "game-touch-control" + (c.type === "stick" ? " game-touch-stick" : "");
                button.setAttribute("aria-label", model.label(c, this.text));
                if (c.type === "stick") {
                    const thumb = document.createElement("span"); thumb.className = "game-touch-thumb";
                    const icon = document.createElement("img"); icon.src = "/images/common/" + stickIcons[c.binding] + ".svg";
                    icon.alt = ""; icon.draggable = false;
                    thumb.append(icon); button.append(thumb);
                } else button.textContent = model.label(c, this.text);
                this.elements.set(c.id, button); this.host.append(button);
            }
            this.select(this.selected); this.layout(); this.updateDisabled();
        }
        layout() {
            const v = this.viewport();
            if (!v.width || !v.height) return;
            // Keep the editor tools in the input overlay, below all rows of the main menu.
            const menuBottom = this.mainMenu.getBoundingClientRect().bottom - v.clientY;
            this.overlay.style.setProperty("--game-layout-tools-top", Math.max(v.top, menuBottom + 12) + "px");
            const bounds = [v.width, v.height, v.left, v.right, v.top, v.bottom, v.clientX, v.clientY].join(":");
            if (this.lastBounds && this.lastBounds !== bounds) this.releaseAll();
            this.lastBounds = bounds;
            for (const c of this.config.controls) {
                const element = this.elements.get(c.id), g = model.geometry(c, v);
                element.style.left = g.x + "px"; element.style.top = g.y + "px";
                element.style.width = g.width + "px"; element.style.height = g.height + "px";
                const shortest = Math.min(g.width, g.height);
                element.style.fontSize = Math.min(28, Math.max(8, shortest / 44 * 14)) + "px";
                if (c.type !== "stick") element.style.padding = Math.min(5, Math.max(1, (shortest - 20) / 4)) + "px";
            }
            this.layoutMouseSettings(v);
        }
        updateDisabled() {
            for (const element of this.elements.values()) element.disabled = !this.editing && (!this.player.canInput() || this.loading);
            this.settings.disabled = this.loading;
        }
        sync(visible) {
            if (!visible && this.editing) this.close(this.player.ready);
            const changed = visible !== this.visible;
            this.visible = visible; this.tools.hidden = !visible;
            if (changed) {
                this.generation++; this.store.cancelLoad();
                if (visible) void this.load(); else { this.loading = false; this.releaseAll(); }
            }
            this.updateDisabled();
        }
        async load() {
            const generation = this.generation;
            this.loading = true; this.notice("loading"); this.updateDisabled();
            const config = await this.store.load();
            if (generation !== this.generation || !this.visible || this.editing) return;
            if (config) { this.config = config; this.render(); }
            this.loading = false;
            if (this.message.textContent === this.text("Loading layout...")) this.message.hidden = true;
            this.updateDisabled();
        }
        open() {
            if (this.editing || !this.visible || this.loading || !this.player.helper) return;
            this.store.cancelLoad(); this.generation++;
            this.player.helper.ReleaseInput();
            this.restore = { helper: this.player.helper, paused: !!this.player.paused, keyboard: !this.player.keyboard.hidden };
            this.player.showKeyboard(false);
            this.editing = true; this.player.layoutEditing = true;
            this.dirty = false;
            this.host.classList.add("is-editing"); this.player.player.classList.add("is-layout-editing");
            this.settings.hidden = true; this.remove.hidden = this.add.hidden = this.done.hidden = false;
            if (!this.restore.paused) this.player.setPaused(this.player.helper.Pause());
            else this.player.syncInput();
            this.select(null); this.layout(); this.done.focus({ preventScroll: true });
            this.notice("editHint");
        }
        close(resume = true) {
            if (!this.editing) return;
            this.releaseAll(); this.hideCatalog(false);
            const restore = this.restore;
            this.editing = false; this.player.layoutEditing = false; this.restore = null;
            this.host.classList.remove("is-editing"); this.player.player.classList.remove("is-layout-editing");
            this.settings.hidden = false; this.remove.hidden = this.add.hidden = this.done.hidden = true;
            this.select(null);
            try { if (this.dirty || !this.store.lastLoadFailed) this.store.save(this.config); } catch { this.notice("invalid"); }
            if (resume && this.player.ready && this.player.helper === restore.helper) {
                if (!restore.paused && this.player.paused) this.player.setPaused(restore.helper.Pause());
                if (restore.keyboard && this.player.isFullscreen()) this.player.showKeyboard(true);
            }
            this.player.syncInput(); this.layout();
            if (resume && this.visible) this.settings.focus({ preventScroll: true });
        }
        select(id) {
            this.selected = id && this.control(id) ? id : null;
            for (const [key, element] of this.elements) element.classList.toggle("is-selected", this.editing && key === this.selected);
            this.remove.disabled = !this.selected;
            this.layoutMouseSettings();
        }
        layoutMouseSettings(v) {
            const c = this.control(this.selected);
            this.mouseSettings.hidden = !this.editing || !this.catalogPanel.hidden || c?.type !== "stick" || c.binding !== "mouse";
            if (this.mouseSettings.hidden) return;
            v ??= this.viewport();
            if (v.width <= v.left + v.right || v.height <= v.top + v.bottom) { this.mouseSettings.hidden = true; return; }
            this.sensitivity.value = c.sensitivity ?? model.DEFAULT_SENSITIVITY;
            this.sensitivityValue.textContent = Number(this.sensitivity.value).toFixed(2) + "×";
            const g = model.geometry(c, v), width = Math.min(200, v.width - v.left - v.right);
            this.mouseSettings.style.width = width + "px";
            const height = this.mouseSettings.offsetHeight;
            const top = g.y + g.height / 2 + 8;
            const preferredTop = top + height <= v.height - v.bottom ? top : g.y - g.height / 2 - height - 8;
            const minimumTop = Math.max(v.top, this.tools.getBoundingClientRect().bottom - v.clientY + 8);
            this.mouseSettings.style.left = Math.min(Math.max(g.x - width / 2, v.left), v.width - v.right - width) + "px";
            this.mouseSettings.style.top = Math.max(minimumTop, Math.min(preferredTop, v.height - v.bottom - height)) + "px";
        }
        setSensitivity() {
            const c = this.control(this.selected), value = Number(this.sensitivity.value);
            if (!this.editing || c?.type !== "stick" || c.binding !== "mouse" || !Number.isFinite(value)) return;
            c.sensitivity = Math.round(Math.min(model.MAX_SENSITIVITY, Math.max(model.MIN_SENSITIVITY, value)) * 100) / 100;
            this.dirty = true; this.sensitivityValue.textContent = c.sensitivity.toFixed(2) + "×";
        }
        deleteSelected() {
            if (!this.editing || !this.selected) return;
            this.releaseAll(); this.config.controls = this.config.controls.filter(c => c.id !== this.selected);
            this.dirty = true;
            this.selected = null; this.render();
        }
        showCatalog() {
            if (!this.editing) return;
            this.releaseAll(); this.catalogPanel.hidden = false; this.mouseSettings.hidden = true;
            this.search.value = ""; this.category = "Keyboard";
            this.filterCatalog(); this.catalogClose.focus({ preventScroll: true });
        }
        hideCatalog(focus = true) {
            this.catalogPanel.hidden = true; this.layoutMouseSettings();
            if (focus && this.editing) this.add.focus({ preventScroll: true });
        }
        filterCatalog() {
            const query = this.search.value.trim().toLocaleLowerCase(); this.list.replaceChildren();
            for (const button of this.categories.children) button.setAttribute("aria-pressed", String(button.dataset.category === this.category));
            for (const item of model.catalog()) {
                if (item.category !== this.category) continue;
                const text = model.label(item, this.text);
                if (query && !(text + " " + item.binding + " " + this.text(item.category)).toLocaleLowerCase().includes(query)) continue;
                const button = document.createElement("button"); button.type = "button"; button.className = "game-layout-button";
                if (item.type === "stick") { button.classList.add("game-layout-stick-option"); this.stickLabel(button, text); }
                else button.textContent = text;
                button.addEventListener("click", () => this.addControl(item), { once: true });
                this.list.append(button);
            }
        }
        addControl(item) {
            if (this.config.controls.length >= model.MAX_CONTROLS) { this.notice("limit"); return; }
            const c = { id: "c-" + crypto.randomUUID(), type: item.type, binding: item.binding, anchorX: "center", anchorY: "center", x: 0, y: 0, size: null };
            this.config.controls.push(c); this.dirty = true; this.selected = c.id; this.hideCatalog(false); this.render();
        }
        point(e) { const v = this.viewport(); return { x: e.clientX - v.clientX, y: e.clientY - v.clientY, pointerType: e.pointerType }; }
        reconcilePointers(e) {
            if (e.button !== 0) return;
            const pointers = [...this.runtime, ...this.editPointers];
            for (const [id, state] of pointers) {
                if (id === e.pointerId || e.isPrimary && state.pointerType === e.pointerType || !this.host.hasPointerCapture(id))
                    this.finishPointer(id);
            }
        }
        contactsEnded(e) {
            if (e.touches.length) return;
            for (const [id, state] of [...this.runtime, ...this.editPointers])
                if (state.pointerType === "touch") this.finishPointer(id);
        }
        down(e) {
            if (e.button !== 0) return;
            this.reconcilePointers(e);
            if (!this.host.contains(e.target)) return;
            const id = e.target.closest("[data-touch-control]")?.dataset.touchControl;
            if (this.editing) {
                e.preventDefault(); e.stopPropagation();
                if (this.editPointers.size >= 2) return;
                if (!this.editPointers.size) {
                    if (id) this.select(id);
                    if (!this.selected) return;
                    this.editDrag = !!id;
                }
                this.editPointers.set(e.pointerId, this.point(e));
                try { this.host.setPointerCapture(e.pointerId); }
                catch { this.finishPointer(e.pointerId); return; }
                this.editBaseline();
                return;
            }
            if (!id || !this.player.canInput() || this.loading) return;
            this.pressControl(this.control(id), e);
        }
        pressControl(c, e) {
            // A stick has one owner. A fresh press replaces an abandoned (or older) contact.
            if (c.type === "stick") for (const [pointerId, state] of [...this.runtime])
                if (state.control.id === c.id) this.finishPointer(pointerId);
            e.preventDefault(); e.stopPropagation(); this.player.canvas.focus({ preventScroll: true });
            const state = { control: c, source: "touch-control:" + c.id + ":" + e.pointerId, pointerType: e.pointerType, pressed: false, x: 0, y: 0 };
            this.runtime.set(e.pointerId, state);
            try { this.host.setPointerCapture(e.pointerId); }
            catch { this.finishPointer(e.pointerId); return; }
            state.pressed = true;
            this.elements.get(c.id).classList.add("is-pressed");
            if (c.type === "stick") this.moveStick(state, e);
            else this.send(c, true, state.source);
        }
        buttonAt(e) {
            // Captured events keep their original target. Hit-test the actual screen position instead.
            const element = document.elementFromPoint(e.clientX, e.clientY)?.closest("[data-touch-control]");
            if (!element || !this.host.contains(element) || element.disabled) return null;
            const c = this.control(element.dataset.touchControl);
            return c && c.type !== "stick" ? c : null;
        }
        releaseControl(state) {
            if (!state.pressed) return;
            state.pressed = false;
            this.player.helper?.ReleaseInput(state.source);
            if (![...this.runtime.values()].some(p => p.pressed && p.control.id === state.control.id))
                this.elements.get(state.control.id)?.classList.remove("is-pressed");
        }
        slideButton(state, e) {
            const c = this.buttonAt(e);
            if (state.pressed && c?.id === state.control.id) return;
            this.releaseControl(state);
            if (!c) return;
            state.control = c;
            state.source = "touch-control:" + c.id + ":" + e.pointerId;
            state.pressed = true;
            this.elements.get(c.id).classList.add("is-pressed");
            this.send(c, true, state.source);
        }
        editBaseline() {
            this.editStart = model.geometry(this.control(this.selected), this.viewport());
            this.editInitial = [...this.editPointers.values()].map(p => ({ ...p }));
        }
        move(e) {
            if (e.type === "pointermove" && e.pointerType !== "touch" && e.buttons === 0) { this.finishPointer(e.pointerId); return; }
            if (this.editing && this.editPointers.has(e.pointerId)) {
                e.preventDefault(); e.stopPropagation();
                this.editPointers.set(e.pointerId, this.point(e));
                const c = this.control(this.selected), v = this.viewport();
                const points = [...this.editPointers.values()];
                if (points.length === 1 && (!this.editDrag || Math.hypot(points[0].x - this.editInitial[0].x, points[0].y - this.editInitial[0].y) < 3)) return;
                const before = JSON.stringify(c);
                // Keep saved anchors relative to the same screen in edit and play modes.
                const bounds = { ...v, top: Math.max(v.top, this.tools.getBoundingClientRect().bottom - v.clientY + 8) };
                const g = model.editGeometry(this.editStart, this.editInitial, points, bounds, c.type === "stick" ? 64 : 24);
                if (points.length === 2 && (c.size || Math.abs(g.width - this.editStart.width) > .01 || Math.abs(g.height - this.editStart.height) > .01))
                    c.size = { width: Math.round(g.width * 1000) / 1000, height: Math.round(g.height * 1000) / 1000 };
                model.place(c, g.x, g.y, v);
                if (JSON.stringify(c) !== before) this.dirty = true;
                this.layout(); return;
            }
            const state = this.runtime.get(e.pointerId);
            if (this.editing || !this.visible || this.loading || !this.player.canInput()) {
                if (state) this.finishPointer(e.pointerId);
                return;
            }
            if (state) {
                e.preventDefault(); e.stopPropagation();
                // A contact that starts on a stick belongs to it until release, even above other buttons.
                if (state.control.type === "stick") this.moveStick(state, e);
                else if (e.pointerType === "touch") this.slideButton(state, e);
            } else if (e.pointerType === "touch" && this.player.gesture?.has(e.pointerId)) {
                const c = this.buttonAt(e);
                if (!c) return;
                // Transfer only this contact, without tapping or disturbing the other screen fingers.
                this.player.gesture.cancelPointer(e.pointerId);
                this.pressControl(c, e);
            }
        }
        up(e) {
            if (!this.runtime.has(e.pointerId) && !this.editPointers.has(e.pointerId)) return;
            if (e.type === "pointercancel") { this.releaseAll(); return; }
            if (this.editPointers.has(e.pointerId) && e.type === "pointerup") this.move(e);
            this.finishPointer(e.pointerId);
        }
        finishPointer(pointerId) {
            if (!this.runtime.has(pointerId) && !this.editPointers.has(pointerId)) return;
            const edited = this.editPointers.delete(pointerId);
            if (edited && this.editPointers.size) this.editBaseline();
            if (!this.editPointers.size) this.editDrag = false;
            const state = this.runtime.get(pointerId);
            if (state) {
                this.runtime.delete(pointerId); this.releaseControl(state);
                const element = this.elements.get(state.control.id);
                const thumb = element?.querySelector(".game-touch-thumb"); if (thumb) thumb.style.transform = "";
                if (state.control.type === "stick" && ![...this.runtime.values()].some(p => p.control.type === "stick")) this.stopStickFrame();
            }
            if (this.host.hasPointerCapture(pointerId)) this.host.releasePointerCapture(pointerId);
        }
        send(c, down, source) {
            const helper = this.player.helper;
            if (c.type === "key") helper?.Key(c.binding, down, source);
            else if (c.type === "mouse") helper?.MouseButton(Number(c.binding), down, source);
            else if (c.type === "gamepad") helper?.GamepadButton(Number(c.binding), down, source);
            else if (c.type === "wheel" && down) helper?.MouseWheel(c.binding === "up" ? -1 : 1, "touch-wheel:" + c.id);
        }
        moveStick(state, e) {
            const element = this.elements.get(state.control.id), rect = element.getBoundingClientRect(), radius = Math.min(rect.width, rect.height) * .32;
            if (!radius) return;
            let x = (e.clientX - rect.left - rect.width / 2) / radius, y = (e.clientY - rect.top - rect.height / 2) / radius;
            const distance = Math.hypot(x, y), scale = distance > 1 ? 1 / distance : 1;
            x *= scale; y *= scale;
            element.querySelector(".game-touch-thumb").style.transform = `translate(${x * radius}px, ${y * radius}px)`;
            const length = Math.hypot(x, y), gain = length > .12 ? (length - .12) / (.88 * length) : 0;
            state.x = x * gain; state.y = y * gain;
            if (state.control.binding === "arrows") this.moveArrowStick(state);
            else if (state.control.binding !== "mouse") this.player.helper?.GamepadAxes(state.control.binding === "axes12" ? 0 : 1, state.x, state.y, state.source);
            this.startStickFrame();
        }
        moveArrowStick(state) {
            const sector = (Math.round(Math.atan2(state.y, state.x) / (Math.PI / 4)) + 8) % 8;
            const next = new Set(state.x || state.y ? arrowDirections[sector] : []);
            const held = state.arrowKeys || new Set();
            for (const code of held) if (!next.has(code)) this.player.helper?.Key(code, false, state.source);
            for (const code of next) if (!held.has(code)) this.player.helper?.Key(code, true, state.source);
            state.arrowKeys = next;
        }
        stopStickFrame() { if (this.stickFrame) cancelAnimationFrame(this.stickFrame); this.stickFrame = 0; }
        startStickFrame() {
            if (this.stickFrame) return;
            this.stickTime = performance.now();
            const tick = now => {
                this.stickFrame = 0;
                if (!this.player.canInput()) { this.releaseAll(); return; }
                for (const [id, state] of [...this.runtime])
                    if (state.control.type === "stick" && !this.host.hasPointerCapture(id)) this.finishPointer(id);
                const sticks = [...this.runtime.values()].filter(s => s.control.type === "stick");
                if (!sticks.length) return;
                const dt = Math.min(50, now - this.stickTime) / 1000; this.stickTime = now;
                const mice = sticks.filter(s => s.control.binding === "mouse");
                if (mice.length) this.player.helper?.MoveMouse(mice.reduce((s, p) => s + p.x * (p.control.sensitivity ?? model.DEFAULT_SENSITIVITY), 0) * 600 * dt,
                    mice.reduce((s, p) => s + p.y * (p.control.sensitivity ?? model.DEFAULT_SENSITIVITY), 0) * 600 * dt);
                this.stickFrame = requestAnimationFrame(tick);
            };
            this.stickFrame = requestAnimationFrame(tick);
        }
        releaseAll() {
            const ids = [...this.editPointers.keys(), ...this.runtime.keys()], states = [...this.runtime.values()];
            // Remove owners before releasing capture, which can synchronously fire lostpointercapture.
            this.editPointers.clear(); this.runtime.clear(); this.editDrag = false; this.stopStickFrame();
            for (const state of states) this.player.helper?.ReleaseInput(state.source);
            for (const id of ids) if (this.host.hasPointerCapture(id)) this.host.releasePointerCapture(id);
            for (const c of this.config.controls) if (c.type === "wheel") this.player.helper?.ReleaseInput("touch-wheel:" + c.id);
            for (const [timer, source] of this.activations || []) { clearTimeout(timer); this.player.helper?.ReleaseInput(source); }
            this.activations?.clear();
            for (const element of this.elements.values()) {
                element.classList.remove("is-pressed"); const thumb = element.querySelector(".game-touch-thumb"); if (thumb) thumb.style.transform = "";
            }
        }
        dispose() {
            this.close(false); this.store.cancelLoad(); this.generation++; this.visible = false;
            this.store.notify = () => {};
            this.releaseAll(); this.events.abort(); this.observer.disconnect(); clearTimeout(this.noticeTimer);
            this.tools.remove(); this.catalogPanel.remove(); this.message.remove(); this.mouseSettings.remove();
        }
    }
    root.DDYXTouchControls = TouchControls;
    if (typeof module === "object" && module.exports) module.exports = { TouchControls };
})(globalThis);
