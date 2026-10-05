/* Shared input ownership for physical devices and the mobile controls. */
(function (root) {
    "use strict";
    class GameInput {
        constructor(command, keyCode, sensitivity, wheelSettings = () => ({ direction: 1, sensitivity: 1 }), sendGamepad = () => {}) {
            this.command = command;
            this.keyCode = keyCode;
            this.sensitivity = sensitivity;
            this.wheelSettings = wheelSettings;
            this.wheels = new Map();
            this.sources = new Map();
            this.enabled = true;
            this.sendGamepad = sendGamepad;
            this.padButtons = new Map();
            this.padAxes = new Map();
            this.padSequence = 0;
            this.physicalPad = { axes: [0, 0, 0, 0], buttons: [false, false, false, false] };
            this.lastPad = JSON.stringify(this.physicalPad);
        }
        set(kind, value, pressed, source) {
            if (!source || (!this.enabled && pressed)) return false;
            const token = kind + ":" + value;
            let owners = this.sources.get(token);
            if (pressed) {
                if (!owners) this.sources.set(token, owners = new Set());
                if (owners.has(source)) return true;
                owners.add(source);
                if (owners.size > 1) return true;
            } else {
                if (!owners?.delete(source)) return false;
                if (owners.size) return true;
                this.sources.delete(token);
            }
            if (kind === "key") this.command.sendKeyEvent(value, pressed);
            else this.command.sendMouseButton(value, pressed);
            return true;
        }
        key(code, pressed, source) {
            const key = this.keyCode(code);
            return Number.isInteger(key) && key > 0 && key < 256 && this.set("key", key, pressed, source);
        }
        button(button, pressed, source) {
            return [0, 1, 2].includes(button) && this.set("button", button, pressed, source);
        }
        move(x, y) {
            const gain = Number(this.sensitivity());
            if (!this.enabled || !Number.isFinite(gain) || gain < 0 ||
                !Number.isFinite(x) || !Number.isFinite(y) || !(x || y)) return;
            const dx = x * gain, dy = y * gain;
            if (Number.isFinite(dx) && Number.isFinite(dy)) this.command.sendMouseRelativeMotion(dx, dy);
        }
        wheel(delta, source) {
            if (!this.enabled || !source || !Number.isFinite(delta) || !delta || typeof this.command.sendMouseWheel !== "function") return false;
            let { direction, sensitivity } = this.wheelSettings();
            if (direction !== 1 && direction !== -1) direction = 1;
            if (!Number.isFinite(sensitivity) || sensitivity < 0) sensitivity = 1;
            if (!sensitivity) { this.wheels.delete(source); return false; }
            const scaled = delta * sensitivity * direction;
            if (!Number.isFinite(scaled)) return false;
            const previous = this.wheels.get(source);
            const remainder = previous?.direction === direction && previous?.sensitivity === sensitivity ? previous.remainder : 0;
            const accumulated = Math.max(-2048, Math.min(2048, remainder + scaled));
            const steps = Math.trunc(accumulated);
            this.wheels.set(source, { direction, sensitivity, remainder: accumulated - steps });
            if (!steps || this.command.sendMouseWheel(steps) === true) return true;
            this.wheels.delete(source);
            return false;
        }
        release(source) {
            if (source === undefined) this.wheels.clear(); else this.wheels.delete(source);
            for (const [token, owners] of this.sources) {
                const [kind, value] = token.split(":");
                for (const owner of [...owners]) {
                    if (source === undefined || owner === source) this.set(kind, Number(value), false, owner);
                }
            }
            if (source === undefined) { this.padButtons.clear(); this.padAxes.clear(); }
            else { this.padButtons.delete(source); this.padAxes.delete(source); }
            if (source === undefined || source === "gamepad:physical")
                this.physicalPad = { axes: [0, 0, 0, 0], buttons: [false, false, false, false] };
            this.emitGamepad();
        }
        gamepadButton(button, pressed, source) {
            if (!source || !Number.isInteger(button) || button < 0 || button > 3 || (!this.enabled && pressed)) return false;
            let buttons = this.padButtons.get(source);
            if (pressed) {
                if (!buttons) this.padButtons.set(source, buttons = new Set());
                buttons.add(button);
            } else if (buttons) {
                buttons.delete(button);
                if (!buttons.size) this.padButtons.delete(source);
            }
            this.emitGamepad();
            return true;
        }
        gamepadAxes(pair, x, y, source) {
            if (!this.enabled || !source || ![0, 1].includes(pair) || !Number.isFinite(x) || !Number.isFinite(y)) return false;
            let pairs = this.padAxes.get(source);
            if (!pairs) this.padAxes.set(source, pairs = new Map());
            const order = pairs.get(pair)?.order ?? ++this.padSequence;
            pairs.set(pair, { x: Math.max(-1, Math.min(1, x)), y: Math.max(-1, Math.min(1, y)), order });
            this.emitGamepad();
            return true;
        }
        physicalGamepad(axes, buttons) {
            if (!this.enabled) return;
            this.physicalPad = {
                axes: Array.from({ length: 4 }, (_, i) => Number.isFinite(axes[i]) ? Math.max(-1, Math.min(1, axes[i])) : 0),
                buttons: Array.from({ length: 4 }, (_, i) => buttons[i] === true)
            };
            this.emitGamepad();
        }
        emitGamepad() {
            const axes = [...this.physicalPad.axes], buttons = [...this.physicalPad.buttons];
            for (const held of this.padButtons.values()) for (const index of held) buttons[index] = true;
            for (let pair = 0; pair < 2; pair++) {
                let active;
                for (const pairs of this.padAxes.values()) {
                    const candidate = pairs.get(pair);
                    if (candidate && (!active || candidate.order > active.order)) active = candidate;
                }
                if (active) { axes[pair * 2] = active.x; axes[pair * 2 + 1] = active.y; }
            }
            const state = { axes, buttons }, serialized = JSON.stringify(state);
            if (serialized !== this.lastPad) { this.lastPad = serialized; this.sendGamepad(state); }
        }
        enable(enabled) {
            if (!enabled) this.release();
            this.enabled = enabled;
        }
    }

    class TouchpadGesture {
        constructor(input, timers = root) {
            this.input = input;
            this.timers = timers;
            this.pointers = new Map();
            this.clickQueue = [];
            this.clickTimer = null;
            this.reset();
        }
        has(id) { return this.pointers.has(id); }
        down(id, x, y, time) {
            if (this.has(id)) return false;
            this.pointers.set(id, { x, y, startX: x, startY: y });
            if (this.pointers.size === 1 && this.mode === "idle") {
                this.mode = "single";
                this.leftTap = true;
            } else if (this.pointers.size === 2 && this.mode === "single") {
                this.cancelClicks();
                this.leftTap = false;
                this.mode = "drag";
                this.dragPointerId = id;
                this.input.button(0, true, "touchpad");
            } else {
                // Extra/replaced fingers cancel this gesture until every finger is lifted.
                this.mode = "cancelled";
                this.leftTap = false;
                this.dragPointerId = null;
                this.cancelClicks();
                this.input.release("touchpad");
            }
            return true;
        }
        move(id, x, y) {
            const point = this.pointers.get(id);
            if (!point) return;
            const dx = x - point.x, dy = y - point.y;
            point.x = x; point.y = y;
            if (this.mode === "single") {
                if (this.leftTap) {
                    const distanceX = x - point.startX, distanceY = y - point.startY;
                    // Finger contact/lift jitters: keep an 8 CSS px tap allowance without moving the cursor.
                    if (Math.hypot(distanceX, distanceY) <= 8) return;
                    this.leftTap = false;
                    this.cancelClicks();
                    this.input.move(distanceX, distanceY);
                } else this.input.move(dx, dy);
            } else if (this.mode === "drag" && id === this.dragPointerId) this.input.move(dx, dy);
        }
        up(id, time, cancelled = false) {
            if (!this.has(id)) return;
            if (cancelled) { this.reset(); return; }
            this.pointers.delete(id);
            if (this.mode === "drag" && id === this.dragPointerId) {
                this.input.release("touchpad");
                this.dragPointerId = null;
                // The remaining finger can move freely or anchor another drag, but cannot tap.
                this.mode = "single";
                this.leftTap = false;
            }
            if (this.pointers.size === 0) {
                const button = this.mode === "single" && this.leftTap ? 0 : null;
                this.clearGesture();
                if (button !== null) {
                    this.clickQueue.push(button);
                    if (this.clickTimer === null) this.nextClick();
                }
            }
        }
        cancelPointer(id) {
            if (!this.has(id)) return;
            // A control can take one screen contact without tapping or cancelling the other fingers.
            this.cancelClicks();
            this.leftTap = false;
            this.up(id);
        }
        nextClick() {
            if (!this.clickQueue.length) return;
            const button = this.clickQueue.shift();
            // 2026-09-30: jsdos::DoMouseEvents drains a batch without running the guest between edges.
            // An immediate down/up pair has no observable hold for polling games. Give taps a real
            // press duration and a released interval between clicks (MobilePlayer.Tests/input.test.cjs).
            if (!this.input.button(button, true, "touchpad-click")) { this.cancelClicks(); return; }
            this.clickTimer = this.timers.setTimeout(() => {
                this.input.button(button, false, "touchpad-click");
                this.clickTimer = this.timers.setTimeout(() => {
                    this.clickTimer = null;
                    this.nextClick();
                }, 40);
            }, 80);
        }
        cancelClicks() {
            if (this.clickTimer !== null) this.timers.clearTimeout(this.clickTimer);
            this.clickTimer = null;
            this.clickQueue.length = 0;
            this.input.release("touchpad-click");
        }
        clearGesture() {
            this.input.release("touchpad");
            this.pointers.clear();
            this.mode = "idle";
            this.leftTap = false;
            this.dragPointerId = null;
        }
        reset() { this.cancelClicks(); this.clearGesture(); }
    }
    root.DDYXGameInput = { GameInput, TouchpadGesture };
    if (typeof module === "object" && module.exports) module.exports = root.DDYXGameInput;
})(globalThis);
