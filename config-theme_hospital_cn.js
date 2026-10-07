// Local mirror configuration for the Retro Online "dosx" player.
// Generated for Theme Hospital (Chinese) (catalog id theme_hospital_cn). Data dumped from
// https://cf.ommv.net/bin/windows/ ...

window.LOCAL_GAME_CONFIG = {
    gameId: "theme_hospital_cn",
    title: "Theme Hospital (Chinese)",
    version: "20261009",
    gameBundle: "/games/thcn_cd.jsdos",
    tool: "/games",
    // Self-contained DOS bundle: boots directly, no OS/game images.
    osImages: "",
    gameImages: "",
    cdImages: [
        {
            "link": "/games/bin/dos/images/HOSPITCN.DCD",
            "name": "Theme Hospital Disc",
            "size": 144765388,
            "mount": "HOSPITCN.CUE"
        }
    ],
    toolImage: "",
    win95Patch: "",
    imageVersion: "1",
    forceBuild: "auto",
    settingsType: 0,
    expectedSize: 303137997,
    requiredFiles: ["/games/thcn_cd.jsdos"],
    optionalFiles: [
        "/games/bin/dos/images/HOSPITCN.DCD"
    ],
    voodoo: false,
    mt32: false,
    gm: true,
    gmSoundfont: "gugs.zip",
};
