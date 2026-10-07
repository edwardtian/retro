// Local mirror configuration for the Retro Online "dosx" player.
// Generated for Taikou Risshiden III (Chinese) (catalog id taikou_risshiden3_cn). Data dumped from
// https://cf.ommv.net/bin/windows/ ...

window.LOCAL_GAME_CONFIG = {
    gameId: "taikou_risshiden3_cn",
    title: "Taikou Risshiden III (Chinese)",
    version: "20261009",
    gameBundle: "/games/taikou3chs.jsdos",
    tool: "/games",
    osImages: "/bin/windows/images/os/WIN95OSR2_CHS_OS.DCD",
    gameImages: "/bin/windows/images/game/TAIKOU3CHS.DCD",
    cdImages: [
        {
            "link": "/games/bin/windows/images/disc/TAIKOU3CHS.DCD",
            "name": "Taikou Risshiden III (Chinese) Disc",
            "size": 202751852,
            "mount": "TAIKOU3CHS.cue"
        }
    ],
    toolImage: "/bin/windows/tools/tools.zip",
    win95Patch: "/bin/windows/tools/win95patch.zip",
    imageVersion: "1",
    skipWin95Patch: false,
    forceBuild: "auto",
    settingsType: 1,
    expectedSize: 428837183,
    requiredFiles: [
        "/games/taikou3chs.jsdos",
        "/games/bin/windows/tools/tools.zip",
        "/games/bin/windows/images/os/WIN95OSR2_CHS_OS.DCD",
        "/games/bin/windows/images/game/TAIKOU3CHS.DCD"
    ],
    optionalFiles: [
        "/games/bin/windows/images/disc/TAIKOU3CHS.DCD"
    ],
    voodoo: false,
    mt32: false,
    gm: false,
    gmSoundfont: "",
};
