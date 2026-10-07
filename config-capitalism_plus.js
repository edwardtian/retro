// Local mirror configuration for the Retro Online "dosx" player.
// Generated for Capitalism Plus (catalog id capitalism_plus). Data dumped from
// https://cf.ommv.net/bin/windows/ ...

window.LOCAL_GAME_CONFIG = {
    gameId: "capitalism_plus",
    title: "Capitalism Plus",
    version: "20261009",
    gameBundle: "/games/capp_cd.jsdos",
    tool: "/games",
    // Self-contained DOS bundle: boots directly, no OS/game images.
    osImages: "",
    gameImages: "",
    cdImages: [
        {
            "link": "/games/bin/dos/images/CAPPLUS.DCD",
            "name": "Capitalism Plus Disc",
            "size": 135274944,
            "mount": "CAPPLUS.cue"
        }
    ],
    toolImage: "",
    win95Patch: "",
    imageVersion: "1",
    forceBuild: "auto",
    settingsType: 0,
    expectedSize: 278791050,
    requiredFiles: ["/games/capp_cd.jsdos"],
    optionalFiles: [
        "/games/bin/dos/images/CAPPLUS.DCD"
    ],
    voodoo: false,
    mt32: false,
    gm: false,
    gmSoundfont: "",
};
