// Local mirror configuration for the Retro Online "dosx" player.
// Generated for Populous: The Beginning (catalog id populous_beginning). Data dumped from
// https://cf.ommv.net/bin/windows/ ...

window.LOCAL_GAME_CONFIG = {
    gameId: "populous_beginning",
    title: "Populous: The Beginning",
    version: "20261009",
    gameBundle: "/games/populous.jsdos",
    tool: "/games",
    osImages: "/bin/windows/images/os/WIN95OSR2_EN_OS.DCD",
    gameImages: "/bin/windows/images/game/POPULOUS.DCD",
    cdImages: [
        {
            "link": "/games/bin/windows/images/disc/POPULOUS.DCD",
            "name": "Populous: The Beginning Disc",
            "size": 343260246,
            "mount": "POPULOUS.cue"
        }
    ],
    toolImage: "/bin/windows/tools/tools.zip",
    win95Patch: "/bin/windows/tools/win95patch.zip",
    imageVersion: "1",
    skipWin95Patch: false,
    forceBuild: "auto",
    settingsType: 1,
    expectedSize: 765397954,
    requiredFiles: [
        "/games/populous.jsdos",
        "/games/bin/windows/tools/tools.zip",
        "/games/bin/windows/images/os/WIN95OSR2_EN_OS.DCD",
        "/games/bin/windows/images/game/POPULOUS.DCD"
    ],
    optionalFiles: [
        "/games/bin/windows/images/disc/POPULOUS.DCD"
    ],
    voodoo: true,
    mt32: false,
    gm: false,
    gmSoundfont: "",
};
