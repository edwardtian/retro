// Local mirror configuration for the Retro Online "dosx" player.
// Generated for Time Commando (catalog id time_commando). Data dumped from
// https://cf.ommv.net/bin/windows/ ...

window.LOCAL_GAME_CONFIG = {
    gameId: "time_commando",
    title: "Time Commando",
    version: "20261009",
    gameBundle: "/games/timecomm_cd.jsdos",
    tool: "/games",
    // Self-contained DOS bundle: boots directly, no OS/game images.
    osImages: "",
    gameImages: "",
    cdImages: [
        {
            "link": "/games/bin/dos/images/TIMECO.DCD",
            "name": "Time Commando Disc",
            "size": 481946581,
            "mount": "TIMECO.cue"
        }
    ],
    toolImage: "",
    win95Patch: "",
    imageVersion: "1",
    forceBuild: "auto",
    settingsType: 0,
    expectedSize: 967532240,
    requiredFiles: ["/games/timecomm_cd.jsdos"],
    optionalFiles: [
        "/games/bin/dos/images/TIMECO.DCD"
    ],
    voodoo: false,
    mt32: false,
    gm: true,
    gmSoundfont: "gugs.zip",
};
