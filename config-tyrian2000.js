// Local mirror configuration for the Retro Online "dosx" player.
// Generated for Tyrian 2000 (catalog id tyrian2000). Data dumped from
// https://cf.ommv.net/bin/windows/ ...

window.LOCAL_GAME_CONFIG = {
    gameId: "tyrian2000",
    title: "Tyrian 2000",
    version: "20261009",
    gameBundle: "/games/t2k_cd.jsdos",
    tool: "/games",
    // Self-contained DOS bundle: boots directly, no OS/game images.
    osImages: "",
    gameImages: "",
    cdImages: [
        {
            "link": "/games/bin/dos/images/T2K.DCD",
            "name": "Tyrian 2000 Disc",
            "size": 44795714,
            "mount": "T2K.cue"
        }
    ],
    toolImage: "",
    win95Patch: "",
    imageVersion: "1",
    forceBuild: "auto",
    settingsType: 0,
    expectedSize: 94318498,
    requiredFiles: ["/games/t2k_cd.jsdos"],
    optionalFiles: [
        "/games/bin/dos/images/T2K.DCD"
    ],
    voodoo: false,
    mt32: false,
    gm: true,
    gmSoundfont: "gugs.zip",
};
