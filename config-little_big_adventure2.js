// Local mirror configuration for the Retro Online "dosx" player.
// Generated for Little Big Adventure 2 (catalog id little_big_adventure2). Data dumped from
// https://cf.ommv.net/bin/windows/ ...

window.LOCAL_GAME_CONFIG = {
    gameId: "little_big_adventure2",
    title: "Little Big Adventure 2",
    version: "20261009",
    gameBundle: "/games/lba2_cd.jsdos",
    tool: "/games",
    // Self-contained DOS bundle: boots directly, no OS/game images.
    osImages: "",
    gameImages: "",
    cdImages: [
        {
            "link": "/games/bin/dos/images/LBA2.DCD",
            "name": "Little Big Adventure 2 Disc",
            "size": 438231901,
            "mount": "LBA2.cue"
        }
    ],
    toolImage: "",
    win95Patch: "",
    imageVersion: "1",
    forceBuild: "auto",
    settingsType: 0,
    expectedSize: 904563014,
    requiredFiles: ["/games/lba2_cd.jsdos"],
    optionalFiles: [
        "/games/bin/dos/images/LBA2.DCD"
    ],
    voodoo: false,
    mt32: false,
    gm: false,
    gmSoundfont: "",
    autoCommand: "CD TWINSEN&#xD;&#xA;TWINSEN",
};
