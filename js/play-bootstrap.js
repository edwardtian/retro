// Player page bootstrap.
//
// Two ways in:
//   ?game=<id>    an entry in catalog.js (config from its `configUrl`)
//   ?config=<url> an explicitly named config script, used by the workshop for
//                 the machines it generates (Windows/game installations)
//
// It fills in the page chrome (nav + title + starter info) and only then loads
// app.js, which expects window.LOCAL_GAME_CONFIG to exist.

(function () {
    "use strict";

    const catalog = window.LOCAL_CATALOG || { games: [] };
    const site = window.LocalSite || {};
    const params = new URLSearchParams(window.location.search);
    const requested = params.get("game");
    const explicitConfig = params.get("config");

    const games = catalog.games || [];
    const game = games.filter(function (item) { return item.id === requested; })[0]
        || (!requested ? games[0] : null);

    function loadScript(src, onLoad) {
        const script = document.createElement("script");
        script.src = src;
        script.onload = onLoad;
        script.onerror = function () {
            // The server refuses config scripts for games the account was not
            // granted, and refuses everything once a session has expired.
            const text = document.getElementById("loadingText");
            if (text) {
                text.textContent = "This game could not be loaded. It may not be assigned to " +
                    "your account, or your sign-in expired - open the game list and try again.";
            }
        };
        document.head.appendChild(script);
    }

    // The starter screen's info block is dumped markup, so every field is filled
    // from the catalog entry instead of the game it originally shipped with.
    function showStarterInfo(info) {
        const fill = function (id, text) {
            const element = document.getElementById(id);
            if (element) element.textContent = text || "";
        };
        fill("gameInfoTitle", info.title);
        fill("gameInfoYear", info.year ? "(" + info.year + ")" : "");
        fill("gameInfoMeta", [info.osLabel, info.genre].filter(Boolean).join(" \u00b7 "));
        fill("gameInfoPublisher", info.publisher);
    }

    // The starter screen's cover box renders exactly what the game list shows
    // for the entry: the catalog cover image over the accent gradient, or — for
    // entries without cover art — the gradient tile with the platform label
    // (same rendering as coverElement() in js/game-list.js).
    function showCover(info) {
        const box = document.getElementById("dosWindowGameCover");
        if (!box) return;
        box.replaceChildren();
        const colors = info.accent || ["#2b3a67", "#101828"];
        box.style.background = "linear-gradient(160deg, " + colors[0] + " 0%, " + colors[1] + " 100%)";
        if (info.cover) {
            const img = document.createElement("img");
            img.src = info.cover;
            img.alt = (info.title || "Game") + " cover";
            img.style.width = "100%";
            img.style.height = "100%";
            img.style.objectFit = "cover";
            box.appendChild(img);
            return;
        }
        const label = document.createElement("span");
        label.textContent = info.osLabel || "";
        label.style.cssText = "color:#fff;font-size:0.68rem;text-align:center;padding:6px;" +
            "text-shadow:0 1px 2px rgba(0,0,0,.6)";
        box.style.alignItems = "flex-end";
        box.appendChild(label);
    }

    if (explicitConfig) {
        // A generated machine: the config carries its own title and chrome.
        loadScript(explicitConfig, function () {
            const generated = window.LOCAL_GAME_CONFIG || {};
            if (generated.title) {
                const heading = document.getElementById("page-title");
                if (heading) heading.textContent = generated.title;
                document.title = generated.title + " - " + ((site.catalog && site.catalog.siteName) || "Retro Game Playground");
            }
            if (site.mountNav) site.mountNav("games", { rightText: generated.osLabel || "" });
            showStarterInfo(generated);
            showCover(generated);
            loadScript("/app.js");
        });
        return;
    }

    if (!game) {
        // Nothing configured: still show the page chrome and let app.js report
        // the missing files through its normal warning box.
        loadScript("/config.js", function () { loadScript("/app.js"); });
        return;
    }

    if (site.mountNav && site.catalog) {
        site.mountNav("games", { rightText: game.osLabel || "" });
    }
    const title = document.getElementById("page-title");
    if (title && site.catalog) {
        title.textContent = game.title;
        document.title = game.title + " - " + site.catalog.siteName;
    }

    showStarterInfo(game);
    showCover(game);

    loadScript(game.configUrl || "/config.js", function () {
        loadScript("/app.js");
    });
})();
