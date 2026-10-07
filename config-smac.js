// Local mirror configuration for the Retro Online "dosx" player.
// Generated for Sid Meier's Alpha Centauri (catalog id smac). Data dumped from
// https://cf.ommv.net/bin/windows/ ...

window.LOCAL_GAME_CONFIG = {
    gameId: "smac",
    title: "Sid Meier's Alpha Centauri",
    version: "20261009",
    gameBundle: "/games/ac.jsdos",
    tool: "/games",
    osImages: "/bin/windows/images/os/WIN95OSR2_EN_OS.DCD",
    gameImages: "/bin/windows/images/game/ACPP.DCD",
    cdImages: [
        {
            "link": "/games/bin/windows/images/disc/ACPP.DCD",
            "name": "Sid Meier's Alpha Centauri Disc 1",
            "size": 564325116,
            "mount": "ACPP.cue"
        }
    ],
    toolImage: "/bin/windows/tools/tools.zip",
    win95Patch: "/bin/windows/tools/win95patch.zip",
    imageVersion: "1",
    skipWin95Patch: false,
    forceBuild: "auto",
    settingsType: 1,
    expectedSize: 1161725220,
    requiredFiles: [
        "/games/ac.jsdos",
        "/games/bin/windows/tools/tools.zip",
        "/games/bin/windows/images/os/WIN95OSR2_EN_OS.DCD",
        "/games/bin/windows/images/game/ACPP.DCD"
    ],
    optionalFiles: [
        "/games/bin/windows/images/disc/ACPP.DCD"
    ],
    voodoo: false,
    mt32: false,
    gm: false,
    gmSoundfont: "",
};
