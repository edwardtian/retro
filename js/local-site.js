// Shared helpers for the local site pages (game list, settings, player).
// Everything here is written for this mirror; the emulator itself lives in js/.

(function () {
    "use strict";

    const catalog = window.LOCAL_CATALOG || { games: [] };

    // --- formatting --------------------------------------------------------

    function formatBytes(bytes) {
        if (!Number.isFinite(bytes) || bytes < 0) return "unavailable";
        if (bytes < 1024) return bytes + " B";
        const units = ["KB", "MB", "GB", "TB"];
        let value = bytes / 1024;
        let unit = 0;
        while (value >= 1024 && unit < units.length - 1) { value /= 1024; unit++; }
        return (value >= 100 ? value.toFixed(0) : value.toFixed(value >= 10 ? 1 : 2)) + " " + units[unit];
    }

    // --- navigation --------------------------------------------------------

    function renderNav(activePage, options) {
        const settings = options || {};
        const nav = document.createElement("nav");
        nav.className = "local-nav";
        const brand = document.createElement("a");
        brand.className = "local-brand";
        brand.href = "/";
        brand.innerHTML = (catalog.siteName || "Retro Online") +
            ' <span>' + (catalog.siteSuffix || "") + "</span>";
        nav.appendChild(brand);

        const links = document.createElement("div");
        links.className = "local-links";
        [["/", "Games", "games"],
         ["/workshop.html", "Workshop", "workshop"],
         ["/settings.html", "Settings", "settings"]].forEach(function (entry) {
            const a = document.createElement("a");
            a.href = entry[0];
            a.textContent = entry[1];
            if (entry[2] === activePage) a.className = "active";
            links.appendChild(a);
        });
        nav.appendChild(links);

        const right = document.createElement("div");
        right.className = "local-nav-right";
        right.textContent = settings.rightText || "";
        nav.appendChild(right);
        return nav;
    }

    function mountNav(activePage, options) {
        const host = document.getElementById("local-nav");
        if (host) host.replaceWith(renderNav(activePage, options));
    }

    // --- recently played ---------------------------------------------------

    function readHistory() {
        try {
            const value = JSON.parse(localStorage.getItem(window.LOCAL_HISTORY_KEY) || "{}");
            return value && typeof value === "object" ? value : {};
        } catch (error) { return {}; }
    }

    function markPlayed(gameId) {
        const history = readHistory();
        history[gameId] = Date.now();
        try { localStorage.setItem(window.LOCAL_HISTORY_KEY, JSON.stringify(history)); } catch (error) { /* private mode */ }
    }

    // --- file readiness ----------------------------------------------------

    // HEAD-checks the catalog entry's files. Archives are also checked for a ZIP
    // end-of-central-directory record so a truncated download is reported here
    // rather than failing inside the emulator.
    async function checkGameFiles(game) {
        const optionalFiles = game.optionalFiles || [];
        const result = { missing: [], corrupt: [], checked: 0 };
        const paths = (game.files || []).concat(optionalFiles);
        const noteMissing = path => {
            if (optionalFiles.indexOf(path) < 0) result.missing.push(path);
        };
        for (const path of paths) {
            let head;
            try {
                head = await fetch(path, { method: "HEAD", cache: "no-store" });
            } catch (error) {
                noteMissing(path);
                continue;
            }
            if (!head.ok) { noteMissing(path); continue; }
            result.checked++;
            if (!/\.(dcd|zip|jsdos)$/i.test(path)) continue;
            try {
                const response = await fetch(path, { headers: { Range: "bytes=-65536" }, cache: "no-store" });
                if (response.status !== 206) continue;
                const tail = new Uint8Array(await response.arrayBuffer());
                let found = false;
                for (let i = tail.length - 4; i >= 0; i--) {
                    if (tail[i] === 0x50 && tail[i + 1] === 0x4b && tail[i + 2] === 0x05 && tail[i + 3] === 0x06) { found = true; break; }
                }
                if (!found) result.corrupt.push(path);
            } catch (error) { /* best effort */ }
        }
        return result;
    }

    window.LocalSite = {
        catalog: catalog,
        formatBytes: formatBytes,
        renderNav: renderNav,
        mountNav: mountNav,
        readHistory: readHistory,
        markPlayed: markPlayed,
        checkGameFiles: checkGameFiles
    };
})();
