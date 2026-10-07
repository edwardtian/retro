// Local mirror configuration for the Retro Online "dosx" player.
// Generated for Baldur's Gate: The Original Saga (catalog id baldurs_gate_saga). Data dumped from
// https://cf.ommv.net/bin/windows/ ...

window.LOCAL_GAME_CONFIG = {
    gameId: "baldurs_gate_saga",
    title: "Baldur's Gate: The Original Saga",
    version: "20261009",
    gameBundle: "/games/bgtos.jsdos",
    tool: "/games",
    osImages: "/bin/windows/images/os/WIN95OSR2_EN_OS.DCD",
    gameImages: "/bin/windows/images/game/BGTOS.DCD",
    cdImages: [
        {
            "link": "/games/bin/windows/images/disc/BGTOS01.DCD",
            "name": "Baldur's Gate: The Original Saga Disc 1",
            "size": 716999352,
            "mount": "BGTOS01.cue"
        },
        {
            "link": "/games/bin/windows/images/disc/BGTOS02.DCD",
            "name": "Baldur's Gate: The Original Saga Disc 2",
            "size": 732732933,
            "mount": "BGTOS02.cue"
        },
        {
            "link": "/games/bin/windows/images/disc/BGTOS03.DCD",
            "name": "Baldur's Gate: The Original Saga Disc 3",
            "size": 739109758,
            "mount": "BGTOS03.cue"
        }
    ],
    toolImage: "/bin/windows/tools/tools.zip",
    win95Patch: "/bin/windows/tools/win95patch.zip",
    imageVersion: "1",
    skipWin95Patch: false,
    forceBuild: "auto",
    settingsType: 1,
    expectedSize: 4960185034,
    requiredFiles: [
        "/games/bgtos.jsdos",
        "/games/bin/windows/tools/tools.zip",
        "/games/bin/windows/images/os/WIN95OSR2_EN_OS.DCD",
        "/games/bin/windows/images/game/BGTOS.DCD"
    ],
    optionalFiles: [
        "/games/bin/windows/images/disc/BGTOS01.DCD",
        "/games/bin/windows/images/disc/BGTOS02.DCD",
        "/games/bin/windows/images/disc/BGTOS03.DCD"
    ],
    voodoo: false,
    mt32: false,
    gm: false,
    gmSoundfont: "",
};
