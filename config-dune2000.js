// Local mirror configuration for the Retro Online "dosx" player.
// Generated for Dune 2000 (catalog id dune2000). Data dumped from
// https://cf.ommv.net/bin/windows/ ...

window.LOCAL_GAME_CONFIG = {
    gameId: "dune2000",
    title: "Dune 2000",
    version: "20261009",
    gameBundle: "/games/dune2000.jsdos",
    tool: "/games",
    osImages: "/bin/windows/images/os/WIN95OSR2_EN_OS.DCD",
    gameImages: "/bin/windows/images/game/DUNE2000.DCD",
    cdImages: [
        {
            "link": "/games/bin/windows/images/disc/DUNE2000.DCD",
            "name": "Dune 2000 Disc",
            "size": 732330118,
            "mount": "DUNE2000.cue"
        }
    ],
    toolImage: "/bin/windows/tools/tools.zip",
    win95Patch: "/bin/windows/tools/win95patch.zip",
    imageVersion: "1",
    skipWin95Patch: false,
    forceBuild: "auto",
    settingsType: 1,
    expectedSize: 1483795399,
    requiredFiles: [
        "/games/dune2000.jsdos",
        "/games/bin/windows/tools/tools.zip",
        "/games/bin/windows/images/os/WIN95OSR2_EN_OS.DCD",
        "/games/bin/windows/images/game/DUNE2000.DCD"
    ],
    optionalFiles: [
        "/games/bin/windows/images/disc/DUNE2000.DCD"
    ],
    voodoo: false,
    mt32: false,
    gm: false,
    gmSoundfont: "",
};
