// Local mirror configuration for the Retro Online "dosx" player.
// Generated for Taikou Risshiden II (Chinese) (catalog id taikou_risshiden2_cn). Data dumped from
// https://cf.ommv.net/bin/windows/ ...

window.LOCAL_GAME_CONFIG = {
    gameId: "taikou_risshiden2_cn",
    title: "Taikou Risshiden II (Chinese)",
    version: "20261009",
    gameBundle: "/games/taikou2chs.jsdos",
    tool: "/games",
    osImages: "/bin/windows/images/os/WIN95OSR2_CHS_OS.DCD",
    gameImages: "/bin/windows/images/game/TAIKOU2CHS.DCD",
    cdImages: [
        {
            "link": "/games/bin/windows/images/disc/TAIKOU2CHS.DCD",
            "name": "Taikou Risshiden II (Chinese) Disc",
            "size": 82561522,
            "mount": "TAIKOU2CHS.cue"
        }
    ],
    toolImage: "/bin/windows/tools/tools.zip",
    win95Patch: "/bin/windows/tools/win95patch.zip",
    imageVersion: "1",
    skipWin95Patch: false,
    forceBuild: "auto",
    settingsType: 1,
    expectedSize: 169703625,
    requiredFiles: [
        "/games/taikou2chs.jsdos",
        "/games/bin/windows/tools/tools.zip",
        "/games/bin/windows/images/os/WIN95OSR2_CHS_OS.DCD",
        "/games/bin/windows/images/game/TAIKOU2CHS.DCD"
    ],
    optionalFiles: [
        "/games/bin/windows/images/disc/TAIKOU2CHS.DCD"
    ],
    voodoo: false,
    mt32: false,
    gm: false,
    gmSoundfont: "",
};
