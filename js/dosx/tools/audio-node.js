"use strict";
exports.__esModule = true;
exports.audioNode = audioNode;
const playbackSessions = new WeakMap();

// 2026-10-02: the page only installs the shared descriptor. PCM is produced
// in Wasm and consumed by the Worklet, never relayed through the page.
// Regression: shared_pcm_contract_test.js and shared_pcm_browser_test.js.
function audioNode(ci) {
    if (typeof ci.events().onSoundInit !== "function") {
        throw new Error("Shared PCM requires matching emulator, audio-node and Worklet assets");
    }
    let audioContext = null;
    let gainNode = null;
    let ringBufferNode = null;
    let descriptor = null;
    let control = null;
    let disposed = false;
    let lastAudioState = null;
    let interruption = null;
    let ownsAudioSession = false;
    const audioSession = navigator.audioSession;
    let lastSessionState = audioSession?.state;
    const script = Array.from(document.getElementsByTagName("script"))
        .find(item => item.src.includes("emulators.js"));
    const prefix = script ? script.src.substring(0, script.src.lastIndexOf("/")) : ".";

    function acquireAudioSession() {
        if (!audioSession) return;
        let ownership = playbackSessions.get(audioSession);
        if (!ownership) {
            ownership = { previousType: audioSession.type, users: 0 };
            // WebKit's media/webaudio-background-playback.html requires playback
            // before creating Web Audio. The default auto category is ambient.
            audioSession.type = "playback";
            playbackSessions.set(audioSession, ownership);
        }
        ownership.users++;
        ownsAudioSession = true;
    }
    function releaseAudioSession() {
        if (!ownsAudioSession) return;
        ownsAudioSession = false;
        const ownership = playbackSessions.get(audioSession);
        if (--ownership.users !== 0) return;
        playbackSessions.delete(audioSession);
        // A different page feature may have taken ownership in the meantime.
        if (audioSession.type === "playback") audioSession.type = ownership.previousType;
    }
    function updatePlayback() {
        if (!control) return;
        const active = !disposed && ringBufferNode && audioContext.state === "running" ? 1 : 0;
        const previous = Atomics.load(control, 3);
        // Closed is terminal. Native shutdown may precede the page's exit event.
        if (previous === 2) return;
        if (Atomics.compareExchange(control, 3, previous, disposed ? 2 : active) === previous &&
            previous !== (disposed ? 2 : active)) Atomics.add(control, 2, 1);
    }

    // 2026-10-02: never suspend in response to a system interruption. WebKit's
    // AudioContext::mayResumePlayback skips contexts suspended by script. Also,
    // audioSession.state may stay interrupted until resume reacquires the device;
    // that notification cannot be a prerequisite for requesting playback.
    function resumeWebAudio() {
        if (disposed || !audioContext) return;
        updatePlayback();
        if (audioContext.state === "interrupted" || audioSession?.state === "interrupted") {
            if (!interruption) interruption = {};
        }
        if (document.hidden || audioContext.state === "closed") return;
        if (audioContext.state === "running" && !interruption) return;
        // Never wait for an earlier resume: Safari may leave it pending, and a
        // later gesture must still be able to request playback synchronously.
        const pendingInterruption = interruption;
        audioContext.resume().then(() => {
            if (audioContext.state === "running" && interruption === pendingInterruption) interruption = null;
            updatePlayback();
        }).catch(error => {
            if (!disposed) console.warn("Unable to resume game audio:", error);
        });
    }

    function onForeground() {
        // Reacquire once on foregrounding even if Safari already reports running.
        // Healthy subsequent game input does not need to resume the context.
        if (!disposed && audioContext && !document.hidden) interruption = {};
        resumeWebAudio();
    }
    function onAudioStateChange() {
        updatePlayback();
        if (audioContext.state === lastAudioState) return;
        lastAudioState = audioContext.state;
        if (lastAudioState === "interrupted") interruption = {};
        // Do not seize audio on another app's interruption notification. Explicit
        // foreground/gesture requests may resume even while it says interrupted.
        if (lastAudioState !== "running" && audioSession?.state !== "interrupted") resumeWebAudio();
    }
    function onAudioSessionChange() {
        updatePlayback();
        if (audioSession.state === lastSessionState) return;
        lastSessionState = audioSession.state;
        if (lastSessionState === "interrupted") interruption = {};
        else resumeWebAudio();
    }

    const gestureEvents = ["click", "touchend", "keydown"];
    const gestureOptions = { capture: true, passive: true };
    for (const event of gestureEvents) document.addEventListener(event, resumeWebAudio, gestureOptions);
    document.addEventListener("visibilitychange", onForeground);
    window.addEventListener("pageshow", onForeground);
    window.addEventListener("focus", onForeground);
    // Audio focus may be returned after the page is already visible, without
    // another visibilitychange or AudioContext state transition.
    audioSession?.addEventListener("statechange", onAudioSessionChange);

    function disposeAudio() {
        if (disposed) return;
        disposed = true;
        updatePlayback();
        for (const event of gestureEvents) document.removeEventListener(event, resumeWebAudio, gestureOptions);
        document.removeEventListener("visibilitychange", onForeground);
        window.removeEventListener("pageshow", onForeground);
        window.removeEventListener("focus", onForeground);
        audioSession?.removeEventListener("statechange", onAudioSessionChange);
        if (audioContext) audioContext.removeEventListener("statechange", onAudioStateChange);
        if (ringBufferNode) {
            ringBufferNode.disconnect();
            ringBufferNode.port.close();
        }
        if (gainNode) gainNode.disconnect();
        if (audioContext && audioContext.state !== "closed") {
            audioContext.close().catch(error => console.warn("Unable to close game audio:", error));
        }
        releaseAudioSession();
    }
    function fail(error) {
        if (!disposed) {
            console.error("Unable to initialize game audio:", error);
            disposeAudio();
        }
    }
    ci.events().onExit(disposeAudio);
    ci.events().onSoundInit(shared => {
        if (disposed) return;
        try {
            if (!shared || shared.version !== 1 || !(shared.buffer instanceof SharedArrayBuffer) ||
                shared.capacityFrames !== 4096 || shared.prebufferFrames !== 1024 ||
                !Number.isInteger(shared.sampleRate) || shared.sampleRate < 8000 || shared.sampleRate > 192000 ||
                !Number.isInteger(shared.byteOffset) || shared.byteOffset < 0 || shared.byteOffset % 4 !== 0 ||
                shared.byteOffset + 32 + shared.capacityFrames * 4 > shared.buffer.byteLength) {
                throw new TypeError("The emulator must provide a version 1 shared PCM ring");
            }
            if (descriptor) {
                // Reboot reuses the native allocation and advances Epoch. Keep
                // exactly one consumer; overlapping Worklets cannot share Read.
                if (shared.byteOffset !== descriptor.byteOffset || shared.sampleRate !== descriptor.sampleRate)
                    throw new Error("Shared audio format changed during the session");
                return;
            }
            descriptor = shared;
            control = new Int32Array(shared.buffer, shared.byteOffset, 8);
            acquireAudioSession();
            // Wait for the actual mixer rate, rather than guessing before boot.
            audioContext = new AudioContext({ sampleRate: shared.sampleRate, latencyHint: "interactive" });
            lastAudioState = audioContext.state;
            audioContext.addEventListener("statechange", onAudioStateChange);
            gainNode = audioContext.createGain();
            gainNode.gain.value = 1;
            gainNode.connect(audioContext.destination);
            // 2026-10-02: version the module URL to avoid reusing cached processor code.
            audioContext.audioWorklet.addModule(prefix + "/PCMAWP20261003.js?shared-pcm=1").then(() => {
                if (disposed) return;
                ringBufferNode = new AudioWorkletNode(audioContext, "PCMAWP", {
                    numberOfInputs: 0, outputChannelCount: [2], processorOptions: shared
                });
                ringBufferNode.onprocessorerror = () => fail(new Error("Shared PCM Worklet failed"));
                ringBufferNode.connect(gainNode);
                updatePlayback();
                resumeWebAudio();
            }).catch(fail);
        } catch (error) {
            fail(error);
        }
    });
    return disposeAudio;
}
