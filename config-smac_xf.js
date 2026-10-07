// Local mirror configuration for the Retro Online "dosx" player.
// Generated for Sid Meier's Alien Crossfire (catalog id smac_xf). Data dumped from
// https://cf.ommv.net/bin/windows/ ...

window.LOCAL_GAME_CONFIG = {
    gameId: "smac_xf",
    title: "Sid Meier's Alien Crossfire",
    version: "20261009",
    gameBundle: "/games/acac.jsdos",
    tool: "/games",
    osImages: "/bin/windows/images/os/WIN95OSR2_EN_OS.DCD",
    gameImages: "/bin/windows/images/game/ACPP.DCD",
    cdImages: [
        {
            "link": "/games/bin/windows/images/disc/ACPP.DCD",
            "name": "Sid Meier's Alien Crossfire Disc",
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
        "/games/acac.jsdos",
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
