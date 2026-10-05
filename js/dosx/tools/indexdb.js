class IDB {
    #db = null;
    #opening = null;
    #storeName = "files";
    #databaseName;
    // Keep DOS browser saves shared with the original DOS page.
    constructor(namespace = "dosx") {
        if (namespace === "dos") this.#databaseName = "js-dos-cache (emulators-ui-saves)";
        else if (namespace === "dosx") this.#databaseName = "js-dos-cache-x";
        else throw new Error("Invalid browser save namespace");
    }
    Open() {
        if (this.#db) return Promise.resolve(true);
        if (this.#opening) return this.#opening;
        // 2026-09-28: upgrade is not open success; failures are not missing rows.
        this.#opening = new Promise((resolve, reject) => {
            const request = window.indexedDB.open(this.#databaseName, 1);
            let settled = false;
            const fail = error => {
                if (settled) return;
                settled = true; clearTimeout(timer); reject(error || new Error("Cannot open browser saves"));
            };
            const timer = setTimeout(() => fail(new Error("Browser save database timed out")), 15000);
            request.onupgradeneeded = () => {
                if (!request.result.objectStoreNames.contains(this.#storeName)) request.result.createObjectStore(this.#storeName);
            };
            request.onerror = () => fail(request.error);
            request.onblocked = () => fail(new Error("Browser save database is blocked"));
            request.onsuccess = () => {
                if (settled) { request.result.close(); return; }
                settled = true; clearTimeout(timer); this.#db = request.result;
                this.#db.onversionchange = () => this.Close(); resolve(true);
            };
        }).finally(() => { this.#opening = null; });
        return this.#opening;
    }
    Close() { this.#db?.close(); this.#db = null; }
    async #request(key, data, write) {
        await this.Open();
        return new Promise((resolve, reject) => {
            const transaction = this.#db.transaction(this.#storeName, write ? "readwrite" : "readonly");
            const request = write ? transaction.objectStore(this.#storeName).put(data, key) : transaction.objectStore(this.#storeName).get(key);
            const timer = write ? null : setTimeout(() => {
                try { transaction.abort(); } catch (_) { /* The completed transaction may already be inactive. */ }
                reject(new Error("Browser save transaction timed out"));
            }, 15000);
            transaction.oncomplete = () => { clearTimeout(timer); resolve(request.result === undefined ? null : request.result); };
            transaction.onabort = transaction.onerror = () => { clearTimeout(timer); reject(transaction.error || request.error || new Error("Browser save transaction failed")); };
        });
    }
    async Save(key, data) {
        if (!(data instanceof ArrayBuffer) && !(data instanceof Uint8Array)) throw new Error("Invalid browser save");
        if (this.#databaseName === "js-dos-cache (emulators-ui-saves)" && data instanceof Uint8Array) {
            // Legacy readers expect an ArrayBuffer containing only the ZIP bytes.
            data = data.byteOffset === 0 && data.byteLength === data.buffer.byteLength && data.buffer instanceof ArrayBuffer
                ? data.buffer : new Uint8Array(data).buffer;
        }
        return this.#request(key, data, true);
    }
    async Load(key) {
        const value = await this.#request(key, undefined, false);
        if (value === null) return null;
        if (value instanceof ArrayBuffer) return new Uint8Array(value);
        if (value instanceof Uint8Array) return value;
        throw new Error("Invalid browser save");
    }
    async GetSize(key) {
        const value = await this.Load(key);
        if (value === null) return null;
        if (!Number.isSafeInteger(value.byteLength) || value.byteLength <= 0) throw new Error("Invalid browser save");
        return value.byteLength;
    }
}
