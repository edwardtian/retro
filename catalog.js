// Local game catalog. The entry page (/index.html) renders whatever is listed
// here, so adding another game is a matter of adding an entry plus its files
// (see games/README.md) and, for a different title, its own config + player page.
//
// `files` are the paths the player needs; the list page HEAD-checks them to show
// a Ready / missing-files badge. `optionalFiles` are needed only in some
// configurations (e.g. win95patch.zip is only used by the dosx-edge build).

window.LOCAL_CATALOG = {
    siteName: "Retro Game Playground",
    siteSuffix: "local mirror",

    games: [
        {
            id: "broodwar_cd",
            title: "StarCraft: Brood War",
            os: "windows",
            osLabel: "Windows 95",
            year: 1998,
            publisher: "Blizzard",
            genre: "Real-time strategy",
            players: "1-8 (local skirmish)",
            playUrl: "/play.html",
            // Optional cover art; when empty a gradient tile is drawn instead.
            cover: "",
            accent: ["#2b3a67", "#101828"],
            description: "The Brood War expansion running on a Windows 95 image inside " +
                "DOSBox-X compiled to WebAssembly. Both game CDs are mounted on demand " +
                "through the in-game disc menu.",
            files: [
                "/games/starcraft.jsdos",
                "/games/bin/windows/tools/tools.zip",
                "/games/bin/windows/images/os/WIN95OSR2_EN_OS.DCD",
                "/games/bin/windows/images/game/BROODWAR.DCD"
            ],
            optionalFiles: [
                "/games/bin/windows/tools/win95patch.zip",
                "/games/bin/windows/images/disc/SCBW.DCD",
                "/games/bin/windows/images/disc/SC.DCD"
            ]
        }
    ]
};

// localStorage key used for the "Recently played" ordering.
window.LOCAL_HISTORY_KEY = "local_recently_played";
