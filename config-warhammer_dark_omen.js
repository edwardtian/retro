// Local mirror configuration for the Retro Online "dosx" player.
// Generated for Warhammer: Dark Omen (catalog id warhammer_dark_omen). Data dumped from
// https://cf.ommv.net/bin/windows/ ...

window.LOCAL_GAME_CONFIG = {
    gameId: "warhammer_dark_omen",
    title: "Warhammer: Dark Omen",
    version: "20261009",
    gameBundle: "/games/whdo.jsdos",
    tool: "/games",
    osImages: "/bin/windows/images/os/WIN95OSR2_EN_OS.DCD",
    gameImages: "/bin/windows/images/game/WHDO.DCD",
    cdImages: [
        {
            "link": "/games/bin/windows/images/disc/WHDO.DCD",
            "name": "Warhammer: Dark Omen Disc",
            "size": 510705345,
            "mount": "WHDO.cue"
        }
    ],
    toolImage: "/bin/windows/tools/tools.zip",
    win95Patch: "/bin/windows/tools/win95patch.zip",
    imageVersion: "1",
    skipWin95Patch: false,
    forceBuild: "auto",
    settingsType: 1,
    expectedSize: 1032672394,
    requiredFiles: [
        "/games/whdo.jsdos",
        "/games/bin/windows/tools/tools.zip",
        "/games/bin/windows/images/os/WIN95OSR2_EN_OS.DCD",
        "/games/bin/windows/images/game/WHDO.DCD"
    ],
    optionalFiles: [
        "/games/bin/windows/images/disc/WHDO.DCD"
    ],
    voodoo: true,
    mt32: false,
    gm: false,
    gmSoundfont: "",
};
