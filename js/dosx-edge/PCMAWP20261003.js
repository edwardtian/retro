"use strict";

// 2026-10-02: consume native shared PCM directly, without message allocation
// or a second sample ring. Layout matches src/protocol/shared-pcm.h.
// Regression: shared_pcm_contract_test.js, shared_pcm_browser_test.js.
class PCMAudioWorkletProcessor extends AudioWorkletProcessor {
    constructor(options) {
        super();
        const shared = options.processorOptions;
        if (!shared || shared.version !== 1 || !(shared.buffer instanceof SharedArrayBuffer) ||
            shared.capacityFrames !== 4096 || shared.prebufferFrames !== 1024 ||
            !Number.isInteger(shared.byteOffset) || shared.byteOffset < 0 || shared.byteOffset % 4 !== 0 ||
            shared.byteOffset + 32 + shared.capacityFrames * 4 > shared.buffer.byteLength) {
            throw new TypeError("PCMAWP requires a version 1 shared stereo Int16 PCM ring");
        }
        this.control = new Int32Array(shared.buffer, shared.byteOffset, 8);
        this.pcm = new Int16Array(shared.buffer, shared.byteOffset + 32, shared.capacityFrames * 2);
        this.capacityFrames = shared.capacityFrames;
        this.frameMask = this.capacityFrames - 1;
        this.prebufferFrames = shared.prebufferFrames;
        this.epoch = Atomics.load(this.control, 2);
        this.started = false;
    }

    process(inputs, outputs) {
        const output = outputs[0];
        if (!output || output.length === 0) return Atomics.load(this.control, 3) !== 2;
        const requested = output[0].length;
        const epoch = Atomics.load(this.control, 2);
        const active = Atomics.load(this.control, 3);
        const write = Atomics.load(this.control, 0) >>> 0;
        let read = Atomics.load(this.control, 1) >>> 0;
        if (epoch !== this.epoch || active !== 1) {
            // Only the consumer may discard queued samples. Neither pause nor
            // overflow can make the producer overwrite a quantum being read.
            Atomics.store(this.control, 1, write);
            Atomics.store(this.control, 4, 0);
            this.epoch = epoch;
            this.started = false;
            for (let c = 0; c < output.length; ++c) output[c].fill(0);
            return active !== 2;
        }
        let available = (write - read) >>> 0;
        if (Atomics.exchange(this.control, 4, 0)) {
            // Producer overflow requests catch-up, not a playback reset. Keep
            // recent published PCM playable without another prebuffer gap.
            available = Math.min(available, this.prebufferFrames);
            read = (write - available) >>> 0;
        }
        if (!this.started && available < this.prebufferFrames) {
            for (let c = 0; c < output.length; ++c) output[c].fill(0);
            return true;
        }
        this.started = true;
        const count = Math.min(requested, available);
        if (output.length >= 2) {
            for (let i = 0; i < count; ++i) {
                const at = (read & this.frameMask) * 2;
                output[0][i] = this.pcm[at] / 32768;
                output[1][i] = this.pcm[at + 1] / 32768;
                read = (read + 1) >>> 0;
            }
        } else {
            for (let i = 0; i < count; ++i) {
                const at = (read & this.frameMask) * 2;
                output[0][i] = (this.pcm[at] + this.pcm[at + 1]) / 65536;
                read = (read + 1) >>> 0;
            }
        }
        // Release storage only after copying the samples. A concurrent reset
        // invalidates the whole quantum; it cannot make the producer overwrite it.
        if (Atomics.load(this.control, 2) !== epoch || Atomics.load(this.control, 3) !== 1) {
            read = write;
            this.started = false;
            for (let c = 0; c < output.length; ++c) output[c].fill(0);
        } else {
            for (let c = 0; c < output.length; ++c) {
                if (c >= 2) output[c].fill(0);
                else if (count < requested) output[c].fill(0, count);
            }
            if (count < requested) {
                this.started = false;
            }
        }
        Atomics.store(this.control, 1, read);
        return true;
    }
}

registerProcessor("PCMAWP", PCMAudioWorkletProcessor);
