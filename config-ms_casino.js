// Local mirror configuration for the Retro Online "dosx" player.
// Generated for Microsoft Casino (catalog id ms_casino). Data dumped from
// https://cf.ommv.net/bin/windows/ ...

window.LOCAL_GAME_CONFIG = {
    gameId: "ms_casino",
    title: "Microsoft Casino",
    version: "20261009",
    gameBundle: "/games/mscasino.jsdos",
    tool: "/games",
    osImages: "/bin/windows/images/os/WIN95OSR2_EN_OS.DCD",
    gameImages: "/bin/windows/images/game/MSCASINO.DCD",
    cdImages: [
        {
            "link": "/games/bin/windows/images/disc/MSCASINO.DCD",
            "name": "Microsoft Casino Disc",
            "size": 514112596,
            "mount": "MSCASINO.cue"
        }
    ],
    toolImage: "/bin/windows/tools/tools.zip",
    win95Patch: "/bin/windows/tools/win95patch.zip",
    imageVersion: "1",
    skipWin95Patch: false,
    forceBuild: "auto",
    settingsType: 1,
    expectedSize: 1033949854,
    requiredFiles: [
        "/games/mscasino.jsdos",
        "/games/bin/windows/tools/tools.zip",
        "/games/bin/windows/images/os/WIN95OSR2_EN_OS.DCD",
        "/games/bin/windows/images/game/MSCASINO.DCD"
    ],
    optionalFiles: [
        "/games/bin/windows/images/disc/MSCASINO.DCD"
    ],
    voodoo: false,
    mt32: false,
    gm: false,
    gmSoundfont: "",
};
