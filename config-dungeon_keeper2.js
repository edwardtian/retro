// Local mirror configuration for the Retro Online "dosx" player.
// Generated for Dungeon Keeper 2 (catalog id dungeon_keeper2). Data dumped from
// https://cf.ommv.net/bin/windows/ ...

window.LOCAL_GAME_CONFIG = {
    gameId: "dungeon_keeper2",
    title: "Dungeon Keeper 2",
    version: "20261009",
    gameBundle: "/games/dk2.jsdos",
    tool: "/games",
    osImages: "/bin/windows/images/os/WIN95OSR2_EN_OS.DCD",
    gameImages: "/bin/windows/images/game/DK2.DCD",
    cdImages: [
        {
            "link": "/games/bin/windows/images/disc/DK2.DCD",
            "name": "Dungeon Keeper 2 Disc",
            "size": 513799548,
            "mount": "DK2.cue"
        }
    ],
    toolImage: "/bin/windows/tools/tools.zip",
    win95Patch: "/bin/windows/tools/win95patch.zip",
    imageVersion: "1",
    skipWin95Patch: false,
    forceBuild: "auto",
    settingsType: 1,
    expectedSize: 1374655587,
    requiredFiles: [
        "/games/dk2.jsdos",
        "/games/bin/windows/tools/tools.zip",
        "/games/bin/windows/images/os/WIN95OSR2_EN_OS.DCD",
        "/games/bin/windows/images/game/DK2.DCD"
    ],
    optionalFiles: [
        "/games/bin/windows/images/disc/DK2.DCD"
    ],
    voodoo: true,
    mt32: false,
    gm: false,
    gmSoundfont: "",
};
