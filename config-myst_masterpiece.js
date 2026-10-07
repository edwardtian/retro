// Local mirror configuration for the Retro Online "dosx" player.
// Generated for Myst: Masterpiece Edition (catalog id myst_masterpiece). Data dumped from
// https://cf.ommv.net/bin/windows/ ...

window.LOCAL_GAME_CONFIG = {
    gameId: "myst_masterpiece",
    title: "Myst: Masterpiece Edition",
    version: "20261009",
    gameBundle: "/games/mystme.jsdos",
    tool: "/games",
    osImages: "/bin/windows/images/os/WIN95OSR2_EN_OS.DCD",
    gameImages: "/bin/windows/images/game/MYSTME.DCD",
    cdImages: [
        {
            "link": "/games/bin/windows/images/disc/MYSTME.DCD",
            "name": "Myst: Masterpiece Edition Disc",
            "size": 500384499,
            "mount": "MYSTME.cue"
        }
    ],
    toolImage: "/bin/windows/tools/tools.zip",
    win95Patch: "/bin/windows/tools/win95patch.zip",
    imageVersion: "1",
    skipWin95Patch: false,
    forceBuild: "auto",
    settingsType: 1,
    expectedSize: 1015488192,
    requiredFiles: [
        "/games/mystme.jsdos",
        "/games/bin/windows/tools/tools.zip",
        "/games/bin/windows/images/os/WIN95OSR2_EN_OS.DCD",
        "/games/bin/windows/images/game/MYSTME.DCD"
    ],
    optionalFiles: [
        "/games/bin/windows/images/disc/MYSTME.DCD"
    ],
    voodoo: false,
    mt32: false,
    gm: false,
    gmSoundfont: "",
};
