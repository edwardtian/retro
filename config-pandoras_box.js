// Local mirror configuration for the Retro Online 'dosx' player.
// Deployed by deploy.py on 2026-10-09 10:03:52
// 2026-10-17: register Indeo 5 (IV50) so OPEN.AVI renders video:
// the OS image now ships C:\WINDOWS\SYSTEM\IR50_32.DLL and the
// bundle's DDYX/DDYX1.BIN adds VIDC.IV50=ir50_32.dll to SYSTEM.INI.

window.LOCAL_GAME_CONFIG = {
    "gameId": "pandoras_box",
    "title": "Pandora's Box",
    "version": "20261017220000",
    "gameBundle": "/games/pandoras_box.jsdos",
    "tool": "/games",
    "osImages": "/bin/windows/images/os/pandoras_box_OS.DCD",
    "gameImages": "/bin/windows/images/game/pandoras_box.DCD",
    "cdImages": [
        {
            "link": "/games/bin/windows/images/disc/pandoras_box.DCD",
            "name": "Pandora's Box Disc",
            "size": 711,
            "mount": "LAUNCH.cue"
        }
    ],
    "toolImage": "/bin/windows/tools/tools.zip",
    "win95Patch": "/bin/windows/tools/win95patch.zip",
    "imageVersion": "20261017220000",
    "skipWin95Patch": false,
    "forceBuild": "auto",
    "settingsType": 1,
    "expectedSize": 449989706,
    "requiredFiles": [
        "/games/pandoras_box.jsdos",
        "/games/bin/windows/tools/tools.zip",
        "/games/bin/windows/images/os/pandoras_box_OS.DCD",
        "/games/bin/windows/images/game/pandoras_box.DCD"
    ],
    "optionalFiles": [
        "/games/bin/windows/images/disc/pandoras_box.DCD"
    ],
    "voodoo": false,
    "mt32": false,
    "gm": false,
    "gmSoundfont": ""
};
