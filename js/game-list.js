// Renders the game list from catalog.js with search, platform filter, sorting
// and a per-game readiness badge (files present / missing / corrupt).

(function () {
    "use strict";

    const site = window.LocalSite;
    const games = (site.catalog.games || []).slice();
    const PAGE_SIZE = 10;
    const state = { search: "", os: "all", sort: "title", readiness: new Map(), page: 1 };

    const grid = document.getElementById("game-grid");
    const emptyState = document.getElementById("empty-state");
    const searchInput = document.getElementById("game-search");

    function matches(game) {
        if (state.os !== "all" && game.os !== state.os) return false;
        const needle = state.search.trim().toLowerCase();
        if (!needle) return true;
        const haystack = [game.title, game.publisher, game.genre, game.osLabel, String(game.year)]
            .filter(Boolean).join(" ").toLowerCase();
        return haystack.indexOf(needle) >= 0;
    }

    function sorted(list) {
        const history = site.readHistory();
        return list.slice().sort(function (a, b) {
            if (state.sort === "year") return (b.year || 0) - (a.year || 0);
            if (state.sort === "played") return (history[b.id] || 0) - (history[a.id] || 0);
            return String(a.title).localeCompare(String(b.title));
        });
    }

    function coverElement(game) {
        const cover = document.createElement("div");
        cover.className = "game-cover";
        const colors = game.accent || ["#2b3a67", "#101828"];
        cover.style.background = "linear-gradient(160deg, " + colors[0] + " 0%, " + colors[1] + " 100%)";
        if (game.cover) {
            const img = document.createElement("img");
            img.src = game.cover;
            img.alt = game.title + " cover";
            cover.appendChild(img);
        } else {
            cover.textContent = game.osLabel || "";
        }
        return cover;
    }

    function readinessBadge(game) {
        const result = state.readiness.get(game.id);
        const badge = document.createElement("span");
        badge.className = "badge rounded-pill ";
        if (!result) {
            badge.className += "text-bg-secondary";
            badge.textContent = "checking files...";
            return badge;
        }
        if (result.missing.length === 0 && result.corrupt.length === 0) {
            badge.className += "badge-ready";
            badge.textContent = "Ready to play";
            return badge;
        }
        badge.className += "badge-missing";
        badge.textContent = result.corrupt.length
            ? result.corrupt.length + " corrupt file(s)"
            : result.missing.length + " file(s) missing";
        badge.title = (result.missing.concat(result.corrupt)).join("\n");
        return badge;
    }

    function renderPagination(visible) {
        const host = document.getElementById("game-pagination");
        if (!host) return;
        const pages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
        if (state.page > pages) state.page = pages;
        host.replaceChildren();
        if (pages <= 1) { host.hidden = true; return; }
        host.hidden = false;
        const nav = document.createElement("ul");
        nav.className = "pagination pagination-sm mb-0";
        const item = (label, page, disabled, active) => {
            const li = document.createElement("li");
            li.className = "page-item" + (disabled ? " disabled" : "") + (active ? " active" : "");
            const a = document.createElement("a");
            a.className = "page-link";
            a.href = "#";
            a.textContent = label;
            a.addEventListener("click", function (event) {
                event.preventDefault();
                if (disabled || active) return;
                state.page = page;
                render();
                checkVisibleGames();
                window.scrollTo({ top: 0, behavior: "smooth" });
            });
            li.appendChild(a);
            nav.appendChild(li);
        };
        item("\u00ab", state.page - 1, state.page === 1, false);
        for (let p = 1; p <= pages; p++) item(String(p), p, false, p === state.page);
        item("\u00bb", state.page + 1, state.page === pages, false);
        nav.appendChild(document.createElement("span"));
        host.appendChild(nav);
        const info = document.createElement("span");
        info.className = "local-subtle ms-2";
        info.textContent = visible.length + " game(s), page " + state.page + " of " + pages;
        host.appendChild(info);
    }

    function renderCard(game) {
        const column = document.createElement("div");
        column.className = "col-12 col-lg-6";

        const card = document.createElement("div");
        card.className = "game-card";
        card.appendChild(coverElement(game));

        const body = document.createElement("div");
        body.className = "game-card-body";

        const title = document.createElement("div");
        title.className = "game-title";
        title.textContent = game.title;
        body.appendChild(title);

        const meta = document.createElement("div");
        meta.className = "game-meta";
        meta.textContent = [game.osLabel, game.year, game.publisher, game.genre]
            .filter(Boolean).join(" - ");
        body.appendChild(meta);

        const description = document.createElement("div");
        description.className = "game-desc";
        description.textContent = game.description || "";
        body.appendChild(description);

        const actions = document.createElement("div");
        actions.className = "game-card-actions";
        const play = document.createElement("a");
        play.className = "btn btn-sm btn-primary";
        play.href = game.playUrl || "/play.html";
        play.textContent = "Play";
        play.addEventListener("click", function () { site.markPlayed(game.id); });
        actions.appendChild(play);

        actions.appendChild(readinessBadge(game));
        body.appendChild(actions);
        card.appendChild(body);
        column.appendChild(card);
        return column;
    }

    function render() {
        const visible = sorted(games.filter(matches));
        const pages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
        if (state.page > pages) state.page = pages;
        const start = (state.page - 1) * PAGE_SIZE;
        const slice = visible.slice(start, start + PAGE_SIZE);
        grid.replaceChildren();
        for (const game of slice) grid.appendChild(renderCard(game));
        emptyState.hidden = visible.length > 0;
        renderPagination(visible);
    }

    function firstPage() { state.page = 1; }

    // --- controls ----------------------------------------------------------

    searchInput.addEventListener("input", function () {
        state.search = searchInput.value;
        firstPage();
        render();
        checkVisibleGames();
    });

    document.querySelectorAll("[data-os]").forEach(function (button) {
        button.addEventListener("click", function () {
            state.os = button.dataset.os;
            document.querySelectorAll("[data-os]").forEach(function (other) {
                other.classList.toggle("active", other === button);
            });
            firstPage();
            render();
            checkVisibleGames();
        });
    });

    document.querySelectorAll("[data-sort]").forEach(function (link) {
        link.addEventListener("click", function (event) {
            event.preventDefault();
            state.sort = link.dataset.sort;
            document.querySelectorAll("[data-sort]").forEach(function (other) {
                other.classList.toggle("active", other === link);
            });
            firstPage();
            render();
            checkVisibleGames();
        });
    });

    // --- readiness checking ------------------------------------------------
    // Only the games shown on the current page are HEAD-checked; results are
    // cached per game, so returning to a page never re-checks it.

    let checkRun = 0;
    function checkVisibleGames() {
        const run = ++checkRun;
        const visible = sorted(games.filter(matches));
        const start = (state.page - 1) * PAGE_SIZE;
        (async function () {
            for (const game of visible.slice(start, start + PAGE_SIZE)) {
                if (run !== checkRun) return;          // the page changed meanwhile
                if (state.readiness.has(game.id)) continue;
                try {
                    state.readiness.set(game.id, await site.checkGameFiles(game));
                } catch (error) {
                    state.readiness.set(game.id, { missing: [], corrupt: [], error: String(error) });
                }
                render();
            }
        })();
    }

    // --- start -------------------------------------------------------------

    site.mountNav("games", { rightText: games.length + " game(s) installed" });
    render();
    checkVisibleGames();
})();
