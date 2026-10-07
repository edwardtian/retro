// Local mirror configuration for the Retro Online "dosx" player.
// Generated for Lego Chess (catalog id lego_chess). Data dumped from
// https://cf.ommv.net/bin/windows/ ...

window.LOCAL_GAME_CONFIG = {
    gameId: "lego_chess",
    title: "Lego Chess",
    version: "20261009",
    gameBundle: "/games/legochess.jsdos",
    tool: "/games",
    osImages: "/bin/windows/images/os/WIN95OSR2_EN_OS.DCD",
    gameImages: "/bin/windows/images/game/LEGOCHESS.DCD",
    cdImages: [
        {
            "link": "/games/bin/windows/images/disc/LEGOCHESS.DCD",
            "name": "Lego Chess Disc",
            "size": 241280956,
            "mount": "LEGOCHESS.ISO"
        }
    ],
    toolImage: "/bin/windows/tools/tools.zip",
    win95Patch: "/bin/windows/tools/win95patch.zip",
    imageVersion: "1",
    skipWin95Patch: false,
    forceBuild: "auto",
    settingsType: 1,
    expectedSize: 498355649,
    requiredFiles: [
        "/games/legochess.jsdos",
        "/games/bin/windows/tools/tools.zip",
        "/games/bin/windows/images/os/WIN95OSR2_EN_OS.DCD",
        "/games/bin/windows/images/game/LEGOCHESS.DCD"
    ],
    optionalFiles: [
        "/games/bin/windows/images/disc/LEGOCHESS.DCD"
    ],
    voodoo: true,
    mt32: false,
    gm: true,
    gmSoundfont: "gugs.zip",
};
