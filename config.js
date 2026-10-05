// Local mirror configuration for the Retro Online "dosx" (DOSBox-X WebAssembly) player.
//
// The player code (js/dosx, js/dosx-edge, js/dosx/tools) is dumped verbatim from
// retroonline.net. This file replaces the per-game settings that the original
// page hard-codes for "StarCraft: Brood War" (gameId 100000).
//
// IMPORTANT: no game data is included in this dump. The URLs below must point at
// game files YOU supply (see games/README.md). All paths are absolute from the
// site root ("/...") because the emulator worker resolves relative URLs against
// its own script location, not the page.

window.LOCAL_GAME_CONFIG = {
    // Identifier used for browser saves (IndexedDB). Keep stable across sessions.
    gameId: "broodwar_cd",

    // Display name shown on the local page.
    title: "StarCraft: Brood War",

    // Player build tag reported to the emulator (matches the original page).
    version: "20261007",

    // The .jsdos launcher bundle (zip with .jsdos/dosbox.conf + differencing VHDs).
    // The original page downloads it from:
    //   https://cf.ommv.net/bin/windows/starcraft.jsdos
    gameBundle: "/games/starcraft.jsdos",

    // Base URL for the disk-image CDN. The emulator worker concatenates
    // hardware.tool + the paths below. The original uses "https://cf.ommv.net",
    // but that server only returns CORS headers for retroonline.net origins, so a
    // local mirror must serve everything same-origin.
    tool: "/games",

    // Compressed OS / game / disc images (zip-based .DCD archives), resolved as
    // tool + path. Original values for reference:
    //   https://cf.ommv.net + /bin/windows/images/os/WIN95OSR2_EN_OS.DCD
    //   https://cf.ommv.net + /bin/windows/images/game/BROODWAR.DCD
    //   https://cf.ommv.net + /bin/windows/images/disc/SCBW.DCD
    //   https://cf.ommv.net + /bin/windows/images/disc/SC.DCD
    osImages: "/bin/windows/images/os/WIN95OSR2_EN_OS.DCD",
    gameImages: "/bin/windows/images/game/BROODWAR.DCD",
    cdImages: [
        { link: "/games/bin/windows/images/disc/SCBW.DCD", name: "Broodwar Disc", size: 624322283, mount: "SCBW.ISO" },
        { link: "/games/bin/windows/images/disc/SC.DCD", name: "Starcraft Disc", size: 640959727, mount: "SC.ISO" }
    ],

    // Generic DOSBox-X tool image fetched by the worker:
    //   tool + "/bin/windows/tools/tools.zip"        (always)
    //   tool + "/bin/windows/tools/win95patch.zip"   (only the dosx-edge build,
    //                                                 when the OS image is one of
    //                                                 WIN95OSR2_{EN,CHS,CHT,JP}_OS.DCD)
    //   tool + "/bin/windows/tools/mt32.zip"         (only when mt32 is enabled)
    toolImage: "/bin/windows/tools/tools.zip",
    win95Patch: "/bin/windows/tools/win95patch.zip",

    // Cache-busting version for the game images (bundle, OS image, game image,
    // CD images). The emulator caches every downloaded image in the browser's
    // OPFS cache keyed by URL and validates that cache by *size*, so replacing a
    // file with a copy of the same byte count (e.g. re-downloading the
    // 113,649,877-byte BROODWAR.DCD) would otherwise keep using the cached,
    // broken archive. Bump this string whenever you replace a game file, then
    // reload the page: the new URLs bypass both the OPFS cache and the browser
    // HTTP cache. (tools.zip and win95patch.zip are requested by the emulator
    // core with fixed paths and are not affected.)
    imageVersion: "2",

    // The dosx-edge build derives a patch language from the OS image filename
    // (WIN95OSR2_EN_OS.DCD -> EN) and, when it matches, patches three disk
    // drivers inside the image using win95patch.zip. If that archive is not
    // available, set skipWin95Patch: true (or load the page with ?nopatch=1):
    // the OS image URL is then sent with a trailing "/" so the language lookup
    // misses and the emulator boots the unpatched image instead. serve.py
    // tolerates the trailing slash on file URLs.
    skipWin95Patch: false,

    // Which emulator build to use:
    //   "auto"      - original behaviour: dosx-edge (JSPI) for Chrome/Edge > 132
    //                 and JSPI-capable Safari/Firefox, classic "dosx" otherwise
    //   "dosx"      - force the classic build. It needs cross-origin isolation
    //                 (serve.py provides it) but does NOT need win95patch.zip.
    //   "dosx-edge" - force the JSPI build. Needs win95patch.zip.
    // Can also be overridden per page load with ?build=dosx / ?build=dosx-edge
    forceBuild: "auto",

    // Windows 95/98 style boot with differencing VHD from the bundle.
    // type: 1 = "Windows game" mode in the DDYX wasm layer.
    settingsType: 1,

    // Rough total size of all images; used for the storage-quota warning only.
    expectedSize: 737972160,

    // Files checked (HEAD) at startup so a missing-data situation is obvious.
    requiredFiles: [
        "/games/starcraft.jsdos",
        "/games/bin/windows/tools/tools.zip",
        "/games/bin/windows/images/os/WIN95OSR2_EN_OS.DCD",
        "/games/bin/windows/images/game/BROODWAR.DCD"
    ],
    optionalFiles: [
        "/games/bin/windows/images/disc/SCBW.DCD",
        "/games/bin/windows/images/disc/SC.DCD"
    ]
};
