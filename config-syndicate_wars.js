// Local mirror configuration for the Retro Online "dosx" player.
// Generated for Syndicate Wars (catalog id syndicate_wars). Data dumped from
// https://cf.ommv.net/bin/windows/ ...

window.LOCAL_GAME_CONFIG = {
    gameId: "syndicate_wars",
    title: "Syndicate Wars",
    version: "20261009",
    gameBundle: "/games/swars_cd.jsdos",
    tool: "/games",
    // Self-contained DOS bundle: boots directly, no OS/game images.
    osImages: "",
    gameImages: "",
    cdImages: [
        {
            "link": "/games/bin/dos/images/SWARS.DCD",
            "name": "Syndicate Wars Disc",
            "size": 204922457,
            "mount": "SWARS.CUE"
        }
    ],
    toolImage: "",
    win95Patch: "",
    imageVersion: "1",
    forceBuild: "auto",
    settingsType: 0,
    expectedSize: 443685322,
    requiredFiles: ["/games/swars_cd.jsdos"],
    optionalFiles: [
        "/games/bin/dos/images/SWARS.DCD"
    ],
    voodoo: false,
    mt32: false,
    gm: true,
    gmSoundfont: "gugs.zip",
};
