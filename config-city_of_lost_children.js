// Local mirror configuration for the Retro Online "dosx" player.
// Generated for The City of Lost Children (catalog id city_of_lost_children). Data dumped from
// https://cf.ommv.net/bin/windows/ ...

window.LOCAL_GAME_CONFIG = {
    gameId: "city_of_lost_children",
    title: "The City of Lost Children",
    version: "20261009",
    gameBundle: "/games/colc_cd.jsdos",
    tool: "/games",
    // Self-contained DOS bundle: boots directly, no OS/game images.
    osImages: "",
    gameImages: "",
    cdImages: [
        {
            "link": "/games/bin/dos/images/COLC.DCD",
            "name": "The City of Lost Children Disc",
            "size": 523601902,
            "mount": "COLC.cue"
        }
    ],
    toolImage: "",
    win95Patch: "",
    imageVersion: "1",
    forceBuild: "auto",
    settingsType: 0,
    expectedSize: 1067941014,
    requiredFiles: ["/games/colc_cd.jsdos"],
    optionalFiles: [
        "/games/bin/dos/images/COLC.DCD"
    ],
    voodoo: false,
    mt32: false,
    gm: false,
    gmSoundfont: "",
};
