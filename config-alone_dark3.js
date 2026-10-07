// Local mirror configuration for the Retro Online "dosx" player.
// Generated for Alone in the Dark 3 (catalog id alone_dark3). Data dumped from
// https://cf.ommv.net/bin/windows/ ...

window.LOCAL_GAME_CONFIG = {
    gameId: "alone_dark3",
    title: "Alone in the Dark 3",
    version: "20261009",
    gameBundle: "/games/aitd3_cd.jsdos",
    tool: "/games",
    // Self-contained DOS bundle: boots directly, no OS/game images.
    osImages: "",
    gameImages: "",
    cdImages: [
        {
            "link": "/games/bin/dos/images/AITD3.DCD",
            "name": "Alone in the Dark 3 Disc",
            "size": 329295931,
            "mount": "AITD3.ISO"
        }
    ],
    toolImage: "",
    win95Patch: "",
    imageVersion: "1",
    forceBuild: "auto",
    settingsType: 0,
    expectedSize: 691880267,
    requiredFiles: ["/games/aitd3_cd.jsdos"],
    optionalFiles: [
        "/games/bin/dos/images/AITD3.DCD"
    ],
    voodoo: false,
    mt32: false,
    gm: false,
    gmSoundfont: "",
};
