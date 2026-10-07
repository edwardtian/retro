// Local mirror configuration for the Retro Online "dosx" player.
// Generated for Command & Conquer (catalog id cnc_tiberian_dawn). Data dumped from
// https://cf.ommv.net/bin/windows/ ...

window.LOCAL_GAME_CONFIG = {
    gameId: "cnc_tiberian_dawn",
    title: "Command & Conquer",
    version: "20261009",
    gameBundle: "/games/cnc_cd.jsdos",
    tool: "/games",
    // Self-contained DOS bundle: boots directly, no OS/game images.
    osImages: "",
    gameImages: "",
    cdImages: [
        {
            "link": "/games/bin/dos/images/CNC_GDI.DCD",
            "name": "GDI Mission Disc",
            "size": 298196354,
            "mount": "CNC_GDI.ISO"
        },
        {
            "link": "/games/bin/dos/images/CNC_NOD.DCD",
            "name": "NOD Mission Disc",
            "size": 283428959,
            "mount": "CNC_NOD.ISO"
        }
    ],
    toolImage: "",
    win95Patch: "",
    imageVersion: "1",
    forceBuild: "auto",
    settingsType: 0,
    expectedSize: 1170057524,
    requiredFiles: ["/games/cnc_cd.jsdos"],
    optionalFiles: [
        "/games/bin/dos/images/CNC_GDI.DCD",
        "/games/bin/dos/images/CNC_NOD.DCD"
    ],
    voodoo: false,
    mt32: false,
    gm: false,
    gmSoundfont: "",
};
