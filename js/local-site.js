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

    // --- accounts ----------------------------------------------------------
    // Every page is behind the server's sign-in gate, so this only fills in the
    // navigation chrome. `requireUser` also covers the case where a session
    // expired while a page was open.

    let authResult = null;
    let authPromise = null;

    function loadAuth() {
        if (!authPromise) {
            authPromise = fetch("/api/auth/me", { cache: "no-store" })
                .then(function (response) {
                    return response.json().catch(function () { return {}; })
                        .then(function (payload) { return { ok: response.ok, payload: payload }; });
                })
                .catch(function () { return { ok: false, payload: {} }; })
                .then(function (result) { authResult = result; return result; });
        }
        return authPromise;
    }

    function currentUser() {
        return (authResult && authResult.ok && authResult.payload.user) || null;
    }

    function visibleGames() {
        if (!authResult || !authResult.ok) return [];
        return authResult.payload.visibleGames || [];
    }

    function canPlay(gameId) {
        const visible = visibleGames();
        if (visible === "*") return true;
        return visible.indexOf(gameId) >= 0;
    }

    // Resolves with the account, redirects to the sign-in page when the
    // session is gone, or resolves null when the server has auth disabled.
    function requireUser() {
        return loadAuth().then(function (result) {
            if (result.ok) return result.payload.user;
            if (result.payload && result.payload.authEnabled === false) return null;
            const next = window.location.pathname + window.location.search;
            window.location.replace("/login.html?next=" + encodeURIComponent(next));
            return new Promise(function () { /* navigating away */ });
        });
    }

    function signOut() {
        fetch("/api/auth/logout", { method: "POST", cache: "no-store" })
            .catch(function () { /* the cookie is cleared server-side anyway */ })
            .then(function () { window.location.replace("/login.html"); });
    }

    function authSlot(nav) {
        const slot = document.createElement("div");
        slot.className = "local-auth";
        nav.appendChild(slot);
        loadAuth().then(function (result) {
            slot.replaceChildren();
            if (!result.ok) {
                if (result.payload && result.payload.authEnabled === false) {
                    const note = document.createElement("span");
                    note.className = "local-subtle";
                    note.textContent = "sign-in disabled";
                    slot.appendChild(note);
                    return;
                }
                const link = document.createElement("a");
                link.href = "/login.html";
                link.textContent = "Sign in";
                slot.appendChild(link);
                return;
            }
            const user = result.payload.user || {};
            const name = document.createElement("span");
            name.className = "local-user";
            name.textContent = user.name + (user.role === "admin" ? " (admin)" : "");
            name.title = user.role === "admin" ? "Administrator" : "Signed in";
            slot.appendChild(name);
            if (user.role === "admin") {
                const admin = document.createElement("a");
                admin.href = "/admin.html";
                admin.textContent = "Users";
                slot.appendChild(admin);
            }
            const button = document.createElement("button");
            button.type = "button";
            button.className = "local-signout";
            button.textContent = "Sign out";
            button.addEventListener("click", signOut);
            slot.appendChild(button);
        });
        return slot;
    }

    // --- navigation --------------------------------------------------------

    function renderNav(activePage, options) {
        const settings = options || {};
        const nav = document.createElement("nav");
        nav.className = "local-nav";
        // Keep the host id: pages re-mount the nav after they learn which games
        // the account may see, and mountNav() looks the element up by id.
        nav.id = "local-nav";
        const brand = document.createElement("a");
        brand.className = "local-brand";
        brand.href = "/";
        brand.textContent = catalog.siteName || "Retro Online";
        nav.appendChild(brand);

        const links = document.createElement("div");
        links.className = "local-links";
        [["/", "Games", "games"],
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
        authSlot(nav);
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
        checkGameFiles: checkGameFiles,
        auth: {
            load: loadAuth,
            user: currentUser,
            visibleGames: visibleGames,
            canPlay: canPlay,
            requireUser: requireUser,
            signOut: signOut
        }
    };
})();
