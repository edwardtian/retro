// Local mirror configuration for the Retro Online "dosx" player.
// Generated for Silent Hunter: Commander's Edition (catalog id silent_hunter_ce). Data dumped from
// https://cf.ommv.net/bin/windows/ ...

window.LOCAL_GAME_CONFIG = {
    gameId: "silent_hunter_ce",
    title: "Silent Hunter: Commander's Edition",
    version: "20261009",
    gameBundle: "/games/shce_cd.jsdos",
    tool: "/games",
    // Self-contained DOS bundle: boots directly, no OS/game images.
    osImages: "",
    gameImages: "",
    cdImages: [
        {
            "link": "/games/bin/dos/images/SHCE.DCD",
            "name": "Silent Hunter: Commander's Edition Disc",
            "size": 259535938,
            "mount": "SHCE.ISO"
        }
    ],
    toolImage: "",
    win95Patch: "",
    imageVersion: "1",
    forceBuild: "auto",
    settingsType: 0,
    expectedSize: 533792606,
    requiredFiles: ["/games/shce_cd.jsdos"],
    optionalFiles: [
        "/games/bin/dos/images/SHCE.DCD"
    ],
    voodoo: false,
    mt32: false,
    gm: false,
    gmSoundfont: "",
};
