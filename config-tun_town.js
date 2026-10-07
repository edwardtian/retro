// Local mirror configuration for the Retro Online "dosx" player.
// Generated for Tun Town (catalog id tun_town). Data dumped from
// https://cf.ommv.net/bin/windows/ ...

window.LOCAL_GAME_CONFIG = {
    gameId: "tun_town",
    title: "Tun Town",
    version: "20261009",
    gameBundle: "/games/tt_cd.jsdos",
    tool: "/games",
    // Self-contained DOS bundle: boots directly, no OS/game images.
    osImages: "",
    gameImages: "",
    cdImages: [
        {
            "link": "/games/bin/dos/images/TT01.DCD",
            "name": "Tun Town Disc 1",
            "size": 254659285,
            "mount": "TT01.cue"
        },
        {
            "link": "/games/bin/dos/images/TT02.DCD",
            "name": "Tun Town Disc 2",
            "size": 141431993,
            "mount": "TT02.cue"
        }
    ],
    toolImage: "",
    win95Patch: "",
    imageVersion: "1",
    forceBuild: "auto",
    settingsType: 0,
    expectedSize: 960824547,
    requiredFiles: ["/games/tt_cd.jsdos"],
    optionalFiles: [
        "/games/bin/dos/images/TT01.DCD",
        "/games/bin/dos/images/TT02.DCD"
    ],
    voodoo: false,
    mt32: false,
    gm: true,
    gmSoundfont: "gugs.zip",
};
