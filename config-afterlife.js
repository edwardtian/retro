// Local mirror configuration for the Retro Online "dosx" player.
// Generated for Afterlife (catalog id afterlife). Data dumped from
// https://cf.ommv.net/bin/windows/ ...

window.LOCAL_GAME_CONFIG = {
    gameId: "afterlife",
    title: "Afterlife",
    version: "20261009",
    gameBundle: "/games/alife_cd.jsdos",
    tool: "/games",
    // Self-contained DOS bundle: boots directly, no OS/game images.
    osImages: "",
    gameImages: "",
    cdImages: [
        {
            "link": "/games/bin/dos/images/ALIFE.DCD",
            "name": "Afterlife Disc",
            "size": 133639142,
            "mount": "ALIFE.cue"
        }
    ],
    toolImage: "",
    win95Patch: "",
    imageVersion: "1",
    forceBuild: "auto",
    settingsType: 0,
    expectedSize: 268742230,
    requiredFiles: ["/games/alife_cd.jsdos"],
    optionalFiles: [
        "/games/bin/dos/images/ALIFE.DCD"
    ],
    voodoo: false,
    mt32: false,
    gm: false,
    gmSoundfont: "",
};
