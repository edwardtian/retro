// Local mirror configuration for the Retro Online "dosx" player.
// Generated for Theme Hospital (catalog id theme_hospital). Data dumped from
// https://cf.ommv.net/bin/windows/ ...

window.LOCAL_GAME_CONFIG = {
    gameId: "theme_hospital",
    title: "Theme Hospital",
    version: "20261009",
    gameBundle: "/games/th_cd.jsdos",
    tool: "/games",
    // Self-contained DOS bundle: boots directly, no OS/game images.
    osImages: "",
    gameImages: "",
    cdImages: [
        {
            "link": "/games/bin/dos/images/HOSPITAL.DCD",
            "name": "Theme Hospital Disc",
            "size": 153774245,
            "mount": "HOSPITAL.cue"
        }
    ],
    toolImage: "",
    win95Patch: "",
    imageVersion: "1",
    forceBuild: "auto",
    settingsType: 0,
    expectedSize: 358847553,
    requiredFiles: ["/games/th_cd.jsdos"],
    optionalFiles: [
        "/games/bin/dos/images/HOSPITAL.DCD"
    ],
    voodoo: false,
    mt32: false,
    gm: true,
    gmSoundfont: "gugs.zip",
};
