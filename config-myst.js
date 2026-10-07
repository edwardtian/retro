// Local mirror configuration for the Retro Online "dosx" player.
// Generated for Myst (catalog id myst). Data dumped from
// https://cf.ommv.net/bin/windows/ ...

window.LOCAL_GAME_CONFIG = {
    gameId: "myst",
    title: "Myst",
    version: "20261009",
    gameBundle: "/games/myst.jsdos",
    tool: "/games",
    osImages: "/bin/windows/images/os/WIN95OSR2_EN_OS.DCD",
    gameImages: "/bin/windows/images/game/MYST.DCD",
    cdImages: [
        {
            "link": "/games/bin/windows/images/disc/MYST.DCD",
            "name": "Myst Disc",
            "size": 413313397,
            "mount": "MYST.cue"
        }
    ],
    toolImage: "/bin/windows/tools/tools.zip",
    win95Patch: "/bin/windows/tools/win95patch.zip",
    imageVersion: "1",
    skipWin95Patch: false,
    forceBuild: "auto",
    settingsType: 1,
    expectedSize: 827398509,
    requiredFiles: [
        "/games/myst.jsdos",
        "/games/bin/windows/tools/tools.zip",
        "/games/bin/windows/images/os/WIN95OSR2_EN_OS.DCD",
        "/games/bin/windows/images/game/MYST.DCD"
    ],
    optionalFiles: [
        "/games/bin/windows/images/disc/MYST.DCD"
    ],
    voodoo: false,
    mt32: false,
    gm: false,
    gmSoundfont: "",
};
