// Local mirror configuration for the Retro Online "dosx" player.
// Generated for Dungeon Keeper (catalog id dungeon_keeper). Data dumped from
// https://cf.ommv.net/bin/windows/ ...

window.LOCAL_GAME_CONFIG = {
    gameId: "dungeon_keeper",
    title: "Dungeon Keeper",
    version: "20261009",
    gameBundle: "/games/dkeeper_cd.jsdos",
    tool: "/games",
    // Self-contained DOS bundle: boots directly, no OS/game images.
    osImages: "",
    gameImages: "",
    cdImages: [
        {
            "link": "/games/bin/dos/images/DKEEPER.DCD",
            "name": "Dungeon Keeper Disc",
            "size": 318918902,
            "mount": "DKEEPER.CUE"
        }
    ],
    toolImage: "",
    win95Patch: "",
    imageVersion: "1",
    forceBuild: "auto",
    settingsType: 0,
    expectedSize: 684230124,
    requiredFiles: ["/games/dkeeper_cd.jsdos"],
    optionalFiles: [
        "/games/bin/dos/images/DKEEPER.DCD"
    ],
    voodoo: false,
    mt32: false,
    gm: false,
    gmSoundfont: "",
};
