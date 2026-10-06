// Configuration for "Pandora's Box", running through the same DDYX Windows-game
// flow as the StarCraft: Brood War entry (settingsType 1).
//
// How the flow works (identical to StarCraft):
//   1. the small bundle below supplies .jsdos/dosbox.conf and DDYX/starter.ini;
//   2. osImages is downloaded, extracted to /home/web_user_x and its
//      sysddiff.vhd is mounted as C: (for StarCraft that file is a differencing
//      disk over the Win95 patch parent; here the machine disk is self-contained,
//      so the archive holds the whole Windows 98 disk under that name);
//   3. the flow injects its shell (dshell.exe + SYSTEM.ini + MSDOS.SYS from the
//      tools archive) and runs the starter.ini entry once Windows is up, so the
//      guest boots straight into the game;
//   4. cdImages are offered in the "Switch Disc" menu and mounted on demand.
//
// Built by import-windows-game.py from the DosWasmX Windows 98 image and the
// game CD (game_to_import/PANDORA.iso).

window.LOCAL_GAME_CONFIG = {
    gameId: "pandoras_box",
    title: "Pandora's Box",
    version: "20261007",

    // Bundle: dosbox.conf (Windows 98 machine settings, Voodoo off) + the
    // DDYX/starter.ini that names the program to auto-start.
    gameBundle: "/games/pandoras-box.jsdos",

    // Windows-image flow, like StarCraft.
    settingsType: 1,

    // Tools archive (provides dshell.exe / SYSTEM.ini / MSDOS.SYS).
    tool: "/games",
    toolImage: "/bin/windows/tools/tools.zip",

    // System disk. The archive contains sysddiff.vhd, which the flow mounts as C:.
    osImages: "/bin/windows/images/os/PANDORAS_BOX_OS.DCD",
    gameImages: "",
    // Disc links are fetched directly by the worker (like the original page's
    // https://cf.ommv.net/... URLs), so they are site-absolute - unlike osImages/
    // gameImages, which the worker resolves as tool + path.
    cdImages: [
        {
            link: "/games/bin/windows/images/disc/PANDORAS_BOX.DCD",
            name: "Pandora's Box CD",
            size: 570525696,
            mount: "PANDORA.ISO"
        }
    ],

    // No Win95 driver patch: patchLanguage() only matches WIN95OSR2_*_OS.DCD
    // names, and this system image is a Windows 98 disk.
    win95Patch: "",
    skipWin95Patch: false,

    // Bump to force a re-download/extract after replacing the disk or an archive.
    imageVersion: "5",
    forceBuild: "auto",

    // Machine disk + CD (used for the browser storage warning).
    expectedSize: 1375635456,

    requiredFiles: [
        "/games/pandoras-box.jsdos",
        "/games/bin/windows/images/os/PANDORAS_BOX_OS.DCD"
    ],
    optionalFiles: [
        "/games/bin/windows/images/disc/PANDORAS_BOX.DCD"
    ]
};
