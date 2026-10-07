// Local mirror configuration for the Retro Online "dosx" player.
// Generated for Commandos: Behind Enemy Lines (catalog id commandos_bel). Data dumped from
// https://cf.ommv.net/bin/windows/ ...

window.LOCAL_GAME_CONFIG = {
    gameId: "commandos_bel",
    title: "Commandos: Behind Enemy Lines",
    version: "20261009",
    gameBundle: "/games/commandos.jsdos",
    tool: "/games",
    osImages: "/bin/windows/images/os/WIN95OSR2_EN_OS.DCD",
    gameImages: "/bin/windows/images/game/CMDOBEL.DCD",
    cdImages: [
        {
            "link": "/games/bin/windows/images/disc/CMDOBEL.DCD",
            "name": "Commandos: Behind Enemy Lines Disc",
            "size": 483839369,
            "mount": "CMDOBEL.cue"
        }
    ],
    toolImage: "/bin/windows/tools/tools.zip",
    win95Patch: "/bin/windows/tools/win95patch.zip",
    imageVersion: "1",
    skipWin95Patch: false,
    forceBuild: "auto",
    settingsType: 1,
    expectedSize: 1013783187,
    requiredFiles: [
        "/games/commandos.jsdos",
        "/games/bin/windows/tools/tools.zip",
        "/games/bin/windows/images/os/WIN95OSR2_EN_OS.DCD",
        "/games/bin/windows/images/game/CMDOBEL.DCD"
    ],
    optionalFiles: [
        "/games/bin/windows/images/disc/CMDOBEL.DCD"
    ],
    voodoo: false,
    mt32: false,
    gm: false,
    gmSoundfont: "",
};
