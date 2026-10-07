// Local mirror configuration for the Retro Online "dosx" player.
// Generated for Heart of Darkness (catalog id heart_of_darkness). Data dumped from
// https://cf.ommv.net/bin/windows/ ...

window.LOCAL_GAME_CONFIG = {
    gameId: "heart_of_darkness",
    title: "Heart of Darkness",
    version: "20261009",
    gameBundle: "/games/hod.jsdos",
    tool: "/games",
    osImages: "/bin/windows/images/os/WIN95OSR2_EN_OS.DCD",
    gameImages: "/bin/windows/images/game/HOD.DCD",
    cdImages: [
        {
            "link": "/games/bin/windows/images/disc/HOD.DCD",
            "name": "Heart of Darkness Disc",
            "size": 629534954,
            "mount": "HOD.cue"
        }
    ],
    toolImage: "/bin/windows/tools/tools.zip",
    win95Patch: "/bin/windows/tools/win95patch.zip",
    imageVersion: "1",
    skipWin95Patch: false,
    forceBuild: "auto",
    settingsType: 1,
    expectedSize: 1286874018,
    requiredFiles: [
        "/games/hod.jsdos",
        "/games/bin/windows/tools/tools.zip",
        "/games/bin/windows/images/os/WIN95OSR2_EN_OS.DCD",
        "/games/bin/windows/images/game/HOD.DCD"
    ],
    optionalFiles: [
        "/games/bin/windows/images/disc/HOD.DCD"
    ],
    voodoo: false,
    mt32: false,
    gm: false,
    gmSoundfont: "",
};
