// Local mirror configuration for the Retro Online "dosx" player.
// Generated for Vandal Hearts (Chinese) (catalog id vandal_hearts_cn). Data dumped from
// https://cf.ommv.net/bin/windows/ ...

window.LOCAL_GAME_CONFIG = {
    gameId: "vandal_hearts_cn",
    title: "Vandal Hearts (Chinese)",
    version: "20261009",
    gameBundle: "/games/vandalcht.jsdos",
    tool: "/games",
    osImages: "/bin/windows/images/os/WIN95OSR2_CHT_OS.DCD",
    gameImages: "/bin/windows/images/game/VANDALCHT.DCD",
    cdImages: [
        {
            "link": "/games/bin/windows/images/disc/VANDALCHT.DCD",
            "name": "ヴァンダルハーツ ～失われた古代文明～ (CHT) Disc",
            "size": 186363031,
            "mount": "VANDALCHT.ISO"
        }
    ],
    toolImage: "/bin/windows/tools/tools.zip",
    win95Patch: "/bin/windows/tools/win95patch.zip",
    imageVersion: "1",
    skipWin95Patch: false,
    forceBuild: "auto",
    settingsType: 1,
    expectedSize: 373043095,
    requiredFiles: [
        "/games/vandalcht.jsdos",
        "/games/bin/windows/tools/tools.zip",
        "/games/bin/windows/images/os/WIN95OSR2_CHT_OS.DCD",
        "/games/bin/windows/images/game/VANDALCHT.DCD"
    ],
    optionalFiles: [
        "/games/bin/windows/images/disc/VANDALCHT.DCD"
    ],
    voodoo: true,
    mt32: false,
    gm: true,
    gmSoundfont: "gugs.zip",
};
