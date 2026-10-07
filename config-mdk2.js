// Local mirror configuration for the Retro Online "dosx" player.
// Generated for MDK2 (catalog id mdk2). Data dumped from
// https://cf.ommv.net/bin/windows/ ...

window.LOCAL_GAME_CONFIG = {
    gameId: "mdk2",
    title: "MDK2",
    version: "20261009",
    gameBundle: "/games/mdk2.jsdos",
    tool: "/games",
    osImages: "/bin/windows/images/os/WIN95OSR2_EN_OS.DCD",
    gameImages: "/bin/windows/images/game/MDK2.DCD",
    cdImages: [
        {
            "link": "/games/bin/windows/images/disc/MDK2.DCD",
            "name": "MDK2 Disc",
            "size": 493579726,
            "mount": "MDK2.cue"
        }
    ],
    toolImage: "/bin/windows/tools/tools.zip",
    win95Patch: "/bin/windows/tools/win95patch.zip",
    imageVersion: "1",
    skipWin95Patch: false,
    forceBuild: "auto",
    settingsType: 1,
    expectedSize: 1196428591,
    requiredFiles: [
        "/games/mdk2.jsdos",
        "/games/bin/windows/tools/tools.zip",
        "/games/bin/windows/images/os/WIN95OSR2_EN_OS.DCD",
        "/games/bin/windows/images/game/MDK2.DCD"
    ],
    optionalFiles: [
        "/games/bin/windows/images/disc/MDK2.DCD"
    ],
    voodoo: true,
    mt32: false,
    gm: false,
    gmSoundfont: "",
};
