// Local mirror configuration for the Retro Online "dosx" player.
// Generated for Warcraft II: Beyond the Dark Portal (catalog id warcraft2_beyond). Data dumped from
// https://cf.ommv.net/bin/windows/ ...

window.LOCAL_GAME_CONFIG = {
    gameId: "warcraft2_beyond",
    title: "Warcraft II: Beyond the Dark Portal",
    version: "20261009",
    gameBundle: "/games/wc2_bdp_cd.jsdos",
    tool: "/games",
    // Self-contained DOS bundle: boots directly, no OS/game images.
    osImages: "",
    gameImages: "",
    cdImages: [
        {
            "link": "/games/bin/dos/images/WC2BDP.DCD",
            "name": "Warcraft II: Beyond the Dark Portal Disc",
            "size": 164497999,
            "mount": "WC2BDP.CUE"
        }
    ],
    toolImage: "",
    win95Patch: "",
    imageVersion: "1",
    forceBuild: "auto",
    settingsType: 0,
    expectedSize: 346458212,
    requiredFiles: ["/games/wc2_bdp_cd.jsdos"],
    optionalFiles: [
        "/games/bin/dos/images/WC2BDP.DCD"
    ],
    voodoo: false,
    mt32: false,
    gm: true,
    gmSoundfont: "gugs.zip",
};
