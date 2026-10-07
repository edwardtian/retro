// Local mirror configuration for the Retro Online "dosx" player.
// Generated for The Typing of the Dead (catalog id typing_of_the_dead). Data dumped from
// https://cf.ommv.net/bin/windows/ ...

window.LOCAL_GAME_CONFIG = {
    gameId: "typing_of_the_dead",
    title: "The Typing of the Dead",
    version: "20261009",
    gameBundle: "/games/totd.jsdos",
    tool: "/games",
    osImages: "/bin/windows/images/os/WIN95OSR2_EN_OS.DCD",
    gameImages: "/bin/windows/images/game/TOTD.DCD",
    cdImages: [
        {
            "link": "/games/bin/windows/images/disc/TOTD.DCD",
            "name": "The Typing of the Dead Disc",
            "size": 566498379,
            "mount": "TOTD.cue"
        }
    ],
    toolImage: "/bin/windows/tools/tools.zip",
    win95Patch: "/bin/windows/tools/win95patch.zip",
    imageVersion: "1",
    skipWin95Patch: false,
    forceBuild: "auto",
    settingsType: 1,
    expectedSize: 1545591757,
    requiredFiles: [
        "/games/totd.jsdos",
        "/games/bin/windows/tools/tools.zip",
        "/games/bin/windows/images/os/WIN95OSR2_EN_OS.DCD",
        "/games/bin/windows/images/game/TOTD.DCD"
    ],
    optionalFiles: [
        "/games/bin/windows/images/disc/TOTD.DCD"
    ],
    voodoo: true,
    mt32: false,
    gm: false,
    gmSoundfont: "",
};
