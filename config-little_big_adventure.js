// Local mirror configuration for the Retro Online "dosx" player.
// Generated for Little Big Adventure (catalog id little_big_adventure). Data dumped from
// https://cf.ommv.net/bin/windows/ ...

window.LOCAL_GAME_CONFIG = {
    gameId: "little_big_adventure",
    title: "Little Big Adventure",
    version: "20261009",
    gameBundle: "/games/lba_cd.jsdos",
    tool: "/games",
    // Self-contained DOS bundle: boots directly, no OS/game images.
    osImages: "",
    gameImages: "",
    cdImages: [
        {
            "link": "/games/bin/dos/images/LBA.DCD",
            "name": "Little Big Adventure Disc",
            "size": 193130553,
            "mount": "LBA.cue"
        }
    ],
    toolImage: "",
    win95Patch: "",
    imageVersion: "1",
    forceBuild: "auto",
    settingsType: 0,
    expectedSize: 395026020,
    requiredFiles: ["/games/lba_cd.jsdos"],
    optionalFiles: [
        "/games/bin/dos/images/LBA.DCD",
        "/games/bin/windows/tools/mt32.zip"
    ],
    voodoo: false,
    mt32: true,
    gm: false,
    gmSoundfont: "",
    autoCommand: "CD LBA&#xD;&#xA;LBA",
};
