// Local mirror configuration for the Retro Online "dosx" player.
// Generated for Planescape: Torment (catalog id planescape_torment). Data dumped from
// https://cf.ommv.net/bin/windows/ ...

window.LOCAL_GAME_CONFIG = {
    gameId: "planescape_torment",
    title: "Planescape: Torment",
    version: "20261009",
    gameBundle: "/games/pst.jsdos",
    tool: "/games",
    osImages: "/bin/windows/images/os/WIN95OSR2_EN_OS.DCD",
    gameImages: "/bin/windows/images/game/PST.DCD",
    cdImages: [
        {
            "link": "/games/bin/windows/images/disc/PST02.DCD",
            "name": "Planescape: Torment Disc 2",
            "size": 395534280,
            "mount": "PST02.cue"
        },
        {
            "link": "/games/bin/windows/images/disc/PST03.DCD",
            "name": "Planescape: Torment Disc 3",
            "size": 340375806,
            "mount": "PST03.cue"
        },
        {
            "link": "/games/bin/windows/images/disc/PST04.DCD",
            "name": "Planescape: Torment Disc 4",
            "size": 466588422,
            "mount": "PST04.cue"
        }
    ],
    toolImage: "/bin/windows/tools/tools.zip",
    win95Patch: "/bin/windows/tools/win95patch.zip",
    imageVersion: "1",
    skipWin95Patch: false,
    forceBuild: "auto",
    settingsType: 1,
    expectedSize: 2404997016,
    requiredFiles: [
        "/games/pst.jsdos",
        "/games/bin/windows/tools/tools.zip",
        "/games/bin/windows/images/os/WIN95OSR2_EN_OS.DCD",
        "/games/bin/windows/images/game/PST.DCD"
    ],
    optionalFiles: [
        "/games/bin/windows/images/disc/PST02.DCD",
        "/games/bin/windows/images/disc/PST03.DCD",
        "/games/bin/windows/images/disc/PST04.DCD"
    ],
    voodoo: false,
    mt32: false,
    gm: false,
    gmSoundfont: "",
};
