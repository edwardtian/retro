// Local mirror configuration for the Retro Online "dosx" player.
// Generated for Panzer General II (catalog id panzer_general2). Data dumped from
// https://cf.ommv.net/bin/windows/ ...

window.LOCAL_GAME_CONFIG = {
    gameId: "panzer_general2",
    title: "Panzer General II",
    version: "20261009",
    gameBundle: "/games/panzerg2.jsdos",
    tool: "/games",
    osImages: "/bin/windows/images/os/WIN95OSR2_EN_OS.DCD",
    gameImages: "/bin/windows/images/game/PANZERG2.DCD",
    cdImages: [
        {
            "link": "/games/bin/windows/images/disc/PANZERG2.DCD",
            "name": "Panzer General II Disc",
            "size": 512461048,
            "mount": "PANZERG2.cue"
        }
    ],
    toolImage: "/bin/windows/tools/tools.zip",
    win95Patch: "/bin/windows/tools/win95patch.zip",
    imageVersion: "1",
    skipWin95Patch: false,
    forceBuild: "auto",
    settingsType: 1,
    expectedSize: 1037372491,
    requiredFiles: [
        "/games/panzerg2.jsdos",
        "/games/bin/windows/tools/tools.zip",
        "/games/bin/windows/images/os/WIN95OSR2_EN_OS.DCD",
        "/games/bin/windows/images/game/PANZERG2.DCD"
    ],
    optionalFiles: [
        "/games/bin/windows/images/disc/PANZERG2.DCD"
    ],
    voodoo: false,
    mt32: false,
    gm: false,
    gmSoundfont: "",
};
