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
            document.getElementById("loadingText").textContent =
                "Failed to load " + src;
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

    if (explicitConfig) {
        // A generated machine: the config carries its own title and chrome.
        loadScript(explicitConfig, function () {
            const generated = window.LOCAL_GAME_CONFIG || {};
            if (generated.title) {
                const heading = document.getElementById("page-title");
                if (heading) heading.textContent = generated.title;
                document.title = generated.title + " - " + ((site.catalog && site.catalog.siteName) || "Retro Game Playground");
            }
            if (site.mountNav) site.mountNav("games", { rightText: generated.osLabel || "Workshop" });
            showStarterInfo(generated);
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

    loadScript(game.configUrl || "/config.js", function () {
        loadScript("/app.js");
    });
})();
