// Local mirror configuration for the Retro Online "dosx" player.
// Generated for Vandal Hearts (catalog id vandal_hearts). Data dumped from
// https://cf.ommv.net/bin/windows/ ...

window.LOCAL_GAME_CONFIG = {
    gameId: "vandal_hearts",
    title: "Vandal Hearts",
    version: "20261009",
    gameBundle: "/games/vandal.jsdos",
    tool: "/games",
    osImages: "/bin/windows/images/os/WIN95OSR2_JP_OS.DCD",
    gameImages: "/bin/windows/images/game/VANDAL.DCD",
    cdImages: [
        {
            "link": "/games/bin/windows/images/disc/VANDAL.DCD",
            "name": "ヴァンダルハーツ ～失われた古代文明～ Disc",
            "size": 182065574,
            "mount": "VANDAL.ISO"
        }
    ],
    toolImage: "/bin/windows/tools/tools.zip",
    win95Patch: "/bin/windows/tools/win95patch.zip",
    imageVersion: "1",
    skipWin95Patch: false,
    forceBuild: "auto",
    settingsType: 1,
    expectedSize: 364354338,
    requiredFiles: [
        "/games/vandal.jsdos",
        "/games/bin/windows/tools/tools.zip",
        "/games/bin/windows/images/os/WIN95OSR2_JP_OS.DCD",
        "/games/bin/windows/images/game/VANDAL.DCD"
    ],
    optionalFiles: [
        "/games/bin/windows/images/disc/VANDAL.DCD"
    ],
    voodoo: true,
    mt32: false,
    gm: true,
    gmSoundfont: "gugs.zip",
};
