// Local startup script for the dumped Retro Online "dosx" player.
// Ported from the original StarCraft: Brood War page startup code with the
// site-specific parts removed: ads, ad-blocker checks, analytics, game-time
// tracking, cloud saves, and online multiplayer. The player itself
// (js/dosx/*) runs unmodified.
//
// Requires: jquery, bootstrap bundle, bowser, config.js, and the player
// scripts loaded via LoadScriptsSequentially() (see index.html).

"use strict";

const config = window.LOCAL_GAME_CONFIG;

// NOTE: `ci` must exist as a global before HelperX runs. helper-x.js assigns
// `ci = emulators.dosboxXWorker(...)` from inside a class method, which is
// strict mode, so assigning to an undeclared name throws
// "ReferenceError: ci is not defined". The original page declares `var ci;`
// in its page-level script; this port must do the same.
var ci;

var g_gamePage;
var g_helperX;
var g_selectedCD = 0;
var g_selectedSFS = 2;          // 1 = browser save, 2 = fresh / upload
var g_saveFileBlob = undefined;
var g_startRequested = false;
var g_startupReady = false;
var g_resChangedCount = 0;
var g_resChanged = false;
var g_discSwapPending = false;
var g_discSwapSpinning = false;

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

function LoadScriptsSequentially(scripts) {
    let promise = Promise.resolve();
    for (const src of scripts) {
        promise = promise.then(() => new Promise((resolve, reject) => {
            const element = document.createElement("script");
            element.src = src;
            element.onload = resolve;
            element.onerror = () => reject(new Error("Failed to load " + src));
            document.head.appendChild(element);
        }));
    }
    return promise;
}

function showWarning(message) {
    $("#warningModalMessage").html(message);
    $("#warningModal").modal("show");
}

function reportStartFailure(error) {
    console.error(error);
    showWarning((error && error.message) ? error.message : String(error));
}

function updateDiscSwapStatus() {
    $("#loadingText").text(g_gamePage && g_gamePage.paused
        ? "Disc change queued. Resume the game to continue."
        : (g_discSwapSpinning ? "Waiting for the disc to spin up..." : "Switching Disc..."));
}

function setSaveProgress(visible, opacity) {
    if (visible) $("#dosWindowLoading").fadeTo(1, opacity || 0.85);
    else $("#dosWindowLoading").fadeOut();
}

// ---------------------------------------------------------------------------
// Browser / build selection (ported from the original page, plus an override)
//
// The original picks the JSPI build ("dosx-edge") for Chrome/Edge > 132 and for
// Safari/Firefox that expose WebAssembly.Suspending, otherwise the classic
// build ("dosx", needs cross-origin isolation). The two builds need slightly
// different support files: dosx-edge additionally fetches
// /bin/windows/tools/win95patch.zip. You can force a build in config.js
// (forceBuild) or per page load with ?build=dosx / ?build=dosx-edge.
// ---------------------------------------------------------------------------

var scripts = [];
var wasmPrefix = "/js/dosx/";
switch (bowser.getParser(window.navigator.userAgent).getBrowser().name) {
    case "Safari":
        wasmPrefix = (typeof WebAssembly.Suspending === "function") ? "/js/dosx-edge/" : "/js/dosx/";
        $("#browserSafariWarning").css("display", "block");
        break;
    case "Firefox":
        wasmPrefix = (typeof WebAssembly.Suspending === "function") ? "/js/dosx-edge/" : "/js/dosx/";
        $("#browserFirefoxWarning").css("display", "block");
        break;
    case "Chrome":
    case "Microsoft Edge": {
        const majorVersion = parseInt(bowser.getParser(window.navigator.userAgent).getBrowser().version.split(".")[0], 10);
        if (majorVersion <= 132) $("#browserOtherWarning").css("display", "block");
        wasmPrefix = "/js/dosx-edge/";
        break;
    }
    default:
        $("#browserOtherWarning").css("display", "block");
        wasmPrefix = "/js/dosx-edge/";
}

(function applyBuildOverride() {
    const requested = new URLSearchParams(window.location.search).get("build") || config.forceBuild;
    if (requested === "dosx") wasmPrefix = "/js/dosx/";
    else if (requested === "dosx-edge") wasmPrefix = "/js/dosx-edge/";
    else if (requested && requested !== "auto") showWarning("Unknown build '" + requested + "' in config.forceBuild/?build= - using " + wasmPrefix);
})();

// Cache busting. The emulator caches every downloaded image in the browser's
// OPFS under /ddyx-downloads/<category>/<sha256(url)>/ and validates that cache
// by *size* (plus a HEAD Content-Length check). A game file that is replaced by
// a new copy of the same size therefore keeps its old cached archive. Adding
// config.imageVersion to the image URLs changes the cache key, so a replaced
// file is downloaded again. Bump it whenever you swap a game file.
function versioned(url) {
    const version = config.imageVersion;
    if (!version || typeof url !== "string" || url === "") return url;
    return url + (url.indexOf("?") >= 0 ? "&" : "?") + "v=" + encodeURIComponent(version);
}

// The edge build skips its Win95 driver patch when the last path segment of the
// osImages URL is not a known image name; a trailing slash achieves that (the
// server tolerates it). Keep the slash before any query string.
function skipPatchVariant(url) {
    const [path, query] = String(url).split(/(?=[?#])/);
    return path.replace(/\/*$/, "/") + (query || "");
}

// Files this build needs beyond the base set (see games/README.md).
function requiredFilesForBuild() {
    const files = config.requiredFiles.map(versioned);
    if (wasmPrefix !== "/js/dosx/" && config.win95Patch) files.push(config.tool + config.win95Patch);
    return files;
}

function optionalFilesForBuild() {
    // config.optionalFiles holds site-absolute paths. cdImages[].link is a full
    // URL too (both glues fetch it directly, exactly like the original page's
    // https://cf.ommv.net/... links), unlike osImages/gameImages which the
    // emulator resolves against config.tool.
    const fromConfig = config.optionalFiles.map(versioned);
    const fromCdImages = config.cdImages.map(cd => versioned(cd.link));
    return Array.from(new Set(fromConfig.concat(fromCdImages)));
}

function useSkipWin95Patch() {
    return config.skipWin95Patch === true || new URLSearchParams(window.location.search).has("nopatch");
}

function checkGameBrowserSupport() {
    const edgeBuild = wasmPrefix !== "/js/dosx/";
    if (edgeBuild || (window.crossOriginIsolated === true && typeof SharedArrayBuffer === "function")) return true;
    showWarning("This page is served without cross-origin isolation (COOP/COEP). Start it with the included server: python3 serve.py");
    return false;
}

// ---------------------------------------------------------------------------
// Save source selection (browser IndexedDB / fresh / upload)
// ---------------------------------------------------------------------------

async function refreshSaveSelector() {
    const select = document.getElementById("dosWindowSaveSelector");
    let hasBrowserSave = false;
    try {
        const idb = new IDB("dosx");
        const size = await idb.GetSize(config.gameId);
        hasBrowserSave = Number.isSafeInteger(size) && size > 0;
        idb.Close();
    } catch (error) { hasBrowserSave = false; }

    select.options.length = 0;
    select.add(new Option("Browser save" + (hasBrowserSave ? "" : " (none yet - press Save in game first)"), "1"));
    select.add(new Option("Start fresh", "2"));
    select.add(new Option("Upload save file...", "3"));
    if (!hasBrowserSave) select.options[0].disabled = true;
    select.value = hasBrowserSave ? "1" : "2";
    applySaveSelection(select.value);
}

// Value "3" (upload) still launches with save=2 + a file blob, matching the
// legacy HelperX protocol: save=1 loads the browser save, save=2 with an
// upload uses that file, save=2 without starts fresh.
function applySaveSelection(value) {
    if (value === "3") {
        g_selectedSFS = 2; // blob decides; without a file this stays fresh
        return;
    }
    g_selectedSFS = parseInt(value, 10);
    g_saveFileBlob = undefined;
}

function pickSaveFile() {
    const select = document.getElementById("dosWindowSaveSelector");
    const input = document.createElement("input");
    input.type = "file";
    input.onchange = e => {
        const file = e.target.files[0];
        if (!file) { select.value = "2"; applySaveSelection("2"); return; }
        const reader = new FileReader();
        reader.readAsArrayBuffer(file);
        reader.onload = readerEvent => {
            g_saveFileBlob = new Blob([readerEvent.target.result]);
            g_selectedSFS = 2;
            select.options[2].text = "Upload... (" + (g_saveFileBlob.size / 1024 / 1024).toFixed(2) + " MB)";
        };
    };
    input.click();
}

// ---------------------------------------------------------------------------
// Startup
// ---------------------------------------------------------------------------

scripts.push(wasmPrefix + "emulators.js?v=20261007");
scripts.push("/js/dosx/tools/audio-node.js?v=dXMuEJ0v9bnKy-1jG4coLgGAaq-oGk-rbVXFpCMKQjU");
scripts.push("/js/dosx/tools/webgl.js?v=20261007");
scripts.push("/js/dosx/tools/key.js?v=20261007");
scripts.push("/js/dosx/tools/indexdb.js?v=20261007");
scripts.push("/js/dosx/tools/game-input.js?v=AQtqf7kEcspwrRRjqv812NSvaFn5AgVpLZXDBactTfc");
scripts.push("/js/dosx/tools/helper-x.js?v=hWjPudNvKxm0wTZcKDHk6wppIZ7qPx655Ke7ypIfovs");
scripts.push("/js/dosx/tools/touch-layout.js?v=lcpOE2bqddRKeFaj2wSnQNMplZ6CvVzQDE85oLeeczU");
scripts.push("/js/dosx/tools/touch-controls.js?v=hICCX_MSvc2p7LqOMdfusJty8Cr5B-wx-b-ikOklYwk");
scripts.push("/js/dosx/tools/game-player.js?v=jJ5ff2tbLpynzOT7yjSXvl-W646R1558M9d5PWSVhhY");
scripts.push("/js/dosx/tools/save-sources.js?v=20261007");

LoadScriptsSequentially(scripts).then(async () => {
    g_gamePage = new DDYXGamePlayer(document.querySelector(".game-page"));
    emulators.pathPrefix = wasmPrefix;

    // Storage quota warning (as on the original page).
    try {
        const estimate = await navigator.storage.estimate();
        const availableSize = estimate.quota - estimate.usage;
        if (availableSize < config.expectedSize) {
            $("#diskspaceWarningUsage").html((estimate.usage < 1073741824) ? Math.ceil(estimate.usage / 1048576) + " MB" : (estimate.usage / 1073741824).toFixed(2) + " GB");
            $("#diskspaceWarningAvailable").html((availableSize < 1073741824) ? Math.ceil(availableSize / 1048576) + " MB" : (availableSize / 1073741824).toFixed(2) + " GB");
            $("#browserDiskspaceWarning").css("display", "block");
        }
    } catch (error) { /* quota check is advisory only */ }

    // Probe the configured game files so a missing-data situation is obvious
    // before trying to boot. Archive files (.dcd/.zip/.jsdos) are additionally
    // checked for a ZIP end-of-central-directory record in their last 64 KB:
    // a download that was preallocated at full size but aborted early looks
    // "complete" by size yet cannot be opened by the emulator, which would
    // otherwise only surface as "Cannot open archive" after a long extraction.
    async function probeFiles(paths) {
        const problems = [];
        for (const path of paths) {
            let head;
            try {
                // cache: "no-store" so a replaced game file is always re-checked
                // instead of being answered from the browser's HTTP cache.
                head = await fetch(path, { method: "HEAD", cache: "no-store" });
            } catch (error) {
                problems.push({ path, problem: "missing" });
                continue;
            }
            if (!head.ok) {
                problems.push({ path, problem: "missing" });
                continue;
            }
            if (!/\.(dcd|zip|jsdos)$/i.test(path)) continue;
            try {
                const response = await fetch(path, { headers: { Range: "bytes=-65536" }, cache: "no-store" });
                // Only trust the check when the server honoured the range
                // request; otherwise this would download multi-hundred-MB files.
                if (response.status !== 206) continue;
                const tail = new Uint8Array(await response.arrayBuffer());
                let found = false;
                for (let i = tail.length - 4; i >= 0; i--) {
                    if (tail[i] === 0x50 && tail[i + 1] === 0x4b && tail[i + 2] === 0x05 && tail[i + 3] === 0x06) { found = true; break; }
                }
                if (!found) problems.push({ path, problem: "corrupt" });
            } catch (error) { /* tail check is best effort */ }
        }
        return problems;
    }

    const startupChecks = [];
    startupChecks.push(refreshSaveSelector());
    startupChecks.push(probeFiles(requiredFilesForBuild().concat(optionalFilesForBuild())).then(problems => {
        if (problems.length === 0) return;
        const missing = problems.filter(p => p.problem === "missing").map(p => p.path);
        const corrupt = problems.filter(p => p.problem === "corrupt").map(p => p.path);
        const needsPatch = wasmPrefix !== "/js/dosx/" && missing.some(path => path.indexOf("win95patch") >= 0);
        const lines = [];
        if (missing.length) lines.push(missing.map(path => "<code>" + path + "</code>").join("<br>"));
        if (corrupt.length) {
            lines.push("<br><strong>Corrupt or truncated archive</strong> (no ZIP end-of-central-directory record in the last 64 KB - the file is usually a download that was preallocated at full size but never finished):<br>" +
                corrupt.map(path => "<code>" + path + "</code>").join("<br>"));
        }
        $("#missingFilesWarning").css("display", "block");
        $("#missingFilesList").html(
            "<strong>Build in use: <code>" + wasmPrefix + "</code></strong><br>" + lines.join("<br>") +
            (needsPatch ? "<br><br>This build needs the Win95 patch archive (~53 KB). Either supply it, or boot without it by opening <code>/?nopatch=1</code> (or setting <code>skipWin95Patch: true</code> in config.js)." : "")
        );
    }));

    // CD selector (pre-start default disc) + in-game "Switch Disc" menu items.
    (function buildCdSelectors() {
        const select = document.getElementById("dosWindowCDImageSelector");
        select.options.length = 0;
        config.cdImages.forEach((cd, index) => select.add(new Option(cd.name, String(index))));
        select.value = "0";
        const menu = document.getElementById("CDListMenu");
        menu.innerHTML = "";
        config.cdImages.forEach((cd, index) => {
            const li = document.createElement("li");
            li.id = "CDList";
            const a = document.createElement("a");
            a.className = "dropdown-item btn-light btn-sm";
            a.href = "#";
            a.dataset.cdid = String(index);
            a.textContent = cd.name + (Number.isFinite(cd.size) ? " (" + Math.round(cd.size / 1024 / 1024 * 0.95) + " MB)" : "");
            li.appendChild(a);
            menu.appendChild(li);
        });
    })();
    $("#dosWindowCDImageSelector").change(function () { g_selectedCD = $("#dosWindowCDImageSelector").val(); });
    $("#dosWindowSaveSelector").change(function () {
        const value = $("#dosWindowSaveSelector").val();
        if (value === "3") {
            pickSaveFile();
            return;
        }
        applySaveSelection(value);
    });

    $("#dosWindowGameStartButton").prop("disabled", false);
    // The original page reveals the game window once startup checks finish:
    //   $("#dosWindowFrame").css("visibility","visible").fadeTo(1000,1);
    // Without this the frame (and everything inside it) stays invisible.
    $("#dosWindowFrame").css("visibility", "visible").fadeTo(1000, 1);

    Promise.all(startupChecks).then(() => {
        g_startupReady = true;
        updatePlayButtonVisibility();
    }).catch(error => showWarning(error.message));

    // Agreement checkbox gates the Play button (local edition defaults to unchecked).
    $("#gameUserAgreementAgreed").change(updatePlayButtonVisibility);
}).catch(error => showWarning(error.message));

function updatePlayButtonVisibility() {
    const button = $("#dosWindowGameStartButton");
    if (g_startupReady && !g_startRequested && $("#gameUserAgreementAgreed").prop("checked")) {
        // jQuery fadeIn() only touches display; make sure no inline visibility
        // rule keeps the button unclickable.
        button.css("visibility", "").stop(true, true).fadeIn(1000);
    } else {
        button.stop(true, true).hide();
    }
}

// ---------------------------------------------------------------------------
// Launch
// ---------------------------------------------------------------------------

function startGame() {
    if (!checkGameBrowserSupport() || g_startRequested) return;
    g_startRequested = true;
    launchPreparedGame();
}

async function launchPreparedGame() {
    $("#dosWindowGameStartButton").hide();
    $("#gameUserAgreement").hide();
    g_gamePage.startLoading();

    const select = document.getElementById("dosWindowSaveSelector");
    if (select && select.selectedIndex >= 0) select.disabled = true;

    $("#dosWindowLoadingMessage").fadeIn("slow", function () { $("#dosWindowStarter").hide(); });

    try {
        const bundleUrl = versioned(config.gameBundle);
        const response = await fetch(bundleUrl, { cache: "no-store" });
        if (!response.ok) throw new Error("Game package download failed (" + response.status + "). Place your own .jsdos bundle at " + config.gameBundle + " - see games/README.md");
        const total = Number(response.headers.get("content-length")) || 0;
        const reader = response.body.getReader();
        const chunks = [];
        let loaded = 0;
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            chunks.push(value);
            loaded += value.byteLength;
            $("#loadingText").html("Downloading game package" + (total > 0 ? "... " + (loaded / total * 100).toFixed(0) + " % (" + (loaded / 1024 / 1024).toFixed(2) + " / " + (total / 1024 / 1024).toFixed(2) + " MB)" : "... " + (loaded / 1024 / 1024).toFixed(2) + " MB"));
        }
        const bundle = new Uint8Array(loaded);
        let offset = 0;
        for (const chunk of chunks) { bundle.set(chunk, offset); offset += chunk.byteLength; }
        run(bundle);
    } catch (error) {
        g_startRequested = false;
        reportStartFailure(error);
        $("#dosWindowLoadingMessage").fadeOut();
        $("#dosWindowStarter").show();
        $("#dosWindowGameStartButton").show();
    }
}

function run(fileBundle) {
    g_resChangedCount = 0;
    const settings = {
        name: config.gameId,
        save: g_selectedSFS,
        upload: g_saveFileBlob,
        mouseSensitivity: 1.0,
        mouseWheelDirection: 1,
        mouseWheelSensitivity: 1.0,
        version: config.version
    };
    g_helperX = new HelperX(fileBundle, document.getElementById("canvas"), settings, {
        onError: reportStartFailure,
        onInputReset: helper => g_gamePage.resetControls(helper),
        onExit: helper => {
            g_gamePage.detach(helper);
        },
        onReady: function (helper) {
            $(window).bind("beforeunload", function () {
                return "Please save before leaving the page; otherwise, you may lose your game progress.";
            });
            // The edge build patches three drivers inside the Win95 image when it
            // recognises the OS image filename. Appending "/" makes that lookup
            // miss (serve.py tolerates the trailing slash), so booting works
            // without win95patch.zip.
            const rawOsImages = useSkipWin95Patch() ? skipPatchVariant(config.osImages) : config.osImages;
            helper.Message("ddyx-settings", {
                "type": config.settingsType,
                "baseurl": window.location.origin,
                "option": "",
                "voodoo_upscaler": false,
                "voodoo_aniso": false,
                "auto_command": undefined,
                "hardware": {
                    "voodoo": false,
                    "tool": config.tool,
                    "mt32": false,
                    "gm": false,
                    "gmsf": "",
                    "cdImages": config.cdImages.map(cd => Object.assign({}, cd, { link: versioned(cd.link) })),
                    "selectedCD": g_selectedCD,
                    "osImages": versioned(rawOsImages),
                    "gameImages": versioned(config.gameImages)
                }
            }, function () {
                $("#loadingText").html("Game download completed, starting...");
                $("#gameControlMenu").fadeIn(1000);
            });
        },
        onProgress: function (type, message) { console.log(type, message); },
        onFrameSize: function (width, height) {
            g_gamePage.setFrameSize(width, height);
            if (width > 0 && height > 0 && g_resChangedCount > 3) {
                $("#dosWindowFrame,#dosWindow,#canvas").css("aspect-ratio", String(width / height));
            } else {
                $("#loadingText").html("Game download completed, starting... " + Math.min(g_resChangedCount * 25, 100) + " %");
            }
            g_resChangedCount++;
            if (width >= 640 && height >= 480 && g_resChangedCount > 2) {
                setTimeout(function () {
                    $("#loadingText").html("Game download completed, starting... 100 %");
                    g_resChanged = true;
                    $("#dosWindowLoading").fadeOut();
                }, 10000);
            }
        },
        onExtractProgress: function (index, file, current, total) {
            var header;
            switch (index) {
                case -1: {
                    showWarning("Error: Reading IDB data failed. <br> Possible causes: <br>1. Your browser does not support IDB or has an IDB size limitation (for instance, Firefox). Please install and use the latest version of Chrome. <br> 2. Your system disk does not have enough space.");
                    break;
                }
                case 14: {
                    if (!g_discSwapPending) return;
                    g_discSwapSpinning = true;
                    updateDiscSwapStatus();
                    return;
                }
                case 13: { header = "Downloading hard drive image"; break; }
                case 0: { header = "Decompressing hard drive image"; break; }
                case 1: { header = "Downloading OS image"; break; }
                case 2: { header = "Decompressing OS image"; break; }
                case 3: { header = "Downloading Game image"; break; }
                case 4: { header = "Decompressing Game image"; break; }
                case 5: { header = "Downloading CD image"; break; }
                case 6: { header = "Decompressing CD image"; break; }
                case 7: { header = "Downloading Tool image"; break; }
                case 8: { header = "Decompressing Tool image"; break; }
                case 9: { header = "Downloading system component"; break; }
                case 10: { header = "Game download completed, starting..."; $("#loadingText").html(); break; }
                case 11: { header = "Saving..."; $("#loadingText").html(); break; }
                default: { header = "Preparing..."; break; }
            }
            if (header === undefined) return;
            const hasTotal = Number.isFinite(current) && current >= 0 && Number.isFinite(total) && total > 0;
            const showBytes = typeof file === "string" && file !== "" && index !== 11;
            let percent = hasTotal ? current / total * 100 : 0;
            if (hasTotal && showBytes && file.startsWith("/")) percent = current < total ? Math.min(99, 10 + percent * 0.9) : 100;
            if (hasTotal && showBytes) {
                $("#loadingText").html(header + "... " + percent.toFixed(0) + " % (" + (current / 1024 / 1024).toFixed(2) + " / " + (total / 1024 / 1024).toFixed(2) + " MB)");
            } else if (hasTotal) {
                $("#loadingText").html(header + "... " + (current / total * 100).toFixed(2) + " %");
            } else {
                $("#loadingText").html(header);
            }
        }
    });
}

// ---------------------------------------------------------------------------
// In-game controls (ported; FullScreen / Keyboard / TouchScreen are wired
// internally by DDYXGamePlayer)
// ---------------------------------------------------------------------------

// Delegated binding: the #CDList items are created by buildCdSelectors() inside
// the async startup, i.e. after this script runs. A direct $("#CDList a").click()
// would match nothing and the disc menu would silently do nothing.
$(document).on("click", "#CDList a", function (event) {
    event.preventDefault();
    if (g_discSwapPending) return;
    const index = Number($(this).prop("dataset").cdid);
    const helper = g_helperX;
    g_discSwapPending = true;
    g_discSwapSpinning = false;
    updateDiscSwapStatus();
    $("#dosWindowLoadingMessage").show();
    $("#dosWindowLoading").fadeTo(1, 0.85);
    let completed = false;
    function finishDiscSwap(result) {
        if (completed) return;
        completed = true;
        g_discSwapPending = false;
        g_discSwapSpinning = false;
        if (helper !== g_helperX) return;
        $("#dosWindowLoading").fadeOut();
        if (result?.command === "ddyx-mountdisc" && result.ok === true) {
            g_selectedCD = index;
            return;
        }
        const message = result?.command === "ddyx-mountdisc" && result.ok === false
            ? (result.error || "Unable to switch disc.")
            : "The emulator version does not support confirmed disc changes. Reload the page to update it.";
        showWarning(message);
    }
    try {
        helper.SwitchDisc(index, finishDiscSwap);
    } catch (error) {
        finishDiscSwap({ command: "ddyx-mountdisc", ok: false, error: error.message });
    }
});

$("#dosWindowGameStartButton").click(function () {
    if (!g_startupReady || !checkGameBrowserSupport() || g_startRequested) return;
    startGame();
});

$("#Mute").click(function () {
    var r = g_helperX.Mute();
    $("#Mute").attr("aria-pressed", String(r));
});

$("#Pause").click(function () {
    var r = g_helperX.Pause();
    g_gamePage.setPaused(r);
    if (g_discSwapPending) updateDiscSwapStatus();
    $("#Pause").attr("aria-pressed", String(r));
    if (r) {
        $("#Pause").html("<img src='/images/common/play.svg' alt='' width='16' height='16'>");
    } else {
        $("#Pause").html("<img src='/images/common/pause.svg' alt='' width='16' height='16'>");
    }
});

$("#Save").click(function () {
    setSaveProgress(true);
    g_helperX.Save(function () { setSaveProgress(false); refreshSaveSelector(); });
});

$("#SaveDownload").click(function () {
    $("#loadingText").html("Saving...");
    setSaveProgress(true);
    g_helperX.Persist(config.title, function () { setSaveProgress(false); });
});
