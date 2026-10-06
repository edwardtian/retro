// Player page bootstrap.
//
// The player page (?game=<id>) serves every entry in catalog.js: this script
// picks the matching config, fills in the page chrome (nav + title) and only
// then loads app.js, which expects window.LOCAL_GAME_CONFIG to exist.
//
// Config per game: catalog entry `configUrl`, defaulting to /config.js.

(function () {
    "use strict";

    const catalog = window.LOCAL_CATALOG || { games: [] };
    const site = window.LocalSite || {};
    const requested = new URLSearchParams(window.location.search).get("game");

    const games = catalog.games || [];
    const game = games.filter(function (item) { return item.id === requested; })[0]
        || games[0];

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

    // The starter screen's info block is dumped markup, so every field is filled
    // from the catalog entry instead of the game it originally shipped with.
    function fillInfo(id, text) {
        const element = document.getElementById(id);
        if (element) element.textContent = text || "";
    }
    fillInfo("gameInfoTitle", game.title);
    fillInfo("gameInfoYear", game.year ? "(" + game.year + ")" : "");
    fillInfo("gameInfoMeta", [game.osLabel, game.genre].filter(Boolean).join(" \u00b7 "));
    fillInfo("gameInfoPublisher", game.publisher);

    loadScript(game.configUrl || "/config.js", function () {
        loadScript("/app.js");
    });
})();
