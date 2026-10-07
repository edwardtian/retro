// Local mirror configuration for the Retro Online "dosx" player.
// Generated for Fallout (catalog id fallout1). Data dumped from
// https://cf.ommv.net/bin/windows/ ...

window.LOCAL_GAME_CONFIG = {
    gameId: "fallout1",
    title: "Fallout",
    version: "20261009",
    gameBundle: "/games/fallout_cd.jsdos",
    tool: "/games",
    // Self-contained DOS bundle: boots directly, no OS/game images.
    osImages: "",
    gameImages: "",
    cdImages: [
        {
            "link": "/games/bin/dos/images/FALLOUT.DCD",
            "name": "Fallout Disc",
            "size": 609403939,
            "mount": "FALLOUT.ISO"
        }
    ],
    toolImage: "",
    win95Patch: "",
    imageVersion: "1",
    forceBuild: "auto",
    settingsType: 0,
    expectedSize: 1125758832,
    requiredFiles: ["/games/fallout_cd.jsdos"],
    optionalFiles: [
        "/games/bin/dos/images/FALLOUT.DCD"
    ],
    voodoo: false,
    mt32: false,
    gm: false,
    gmSoundfont: "",
};
