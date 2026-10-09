// Local game catalog. The entry page (/index.html) renders whatever is listed
// here, so adding another game is a matter of adding an entry plus its files
// (see games/README.md) and, for a different title, its own config + player page.
//
// `files` are the paths the player needs; the list page HEAD-checks them to show
// a Ready / missing-files badge. `optionalFiles` are needed only in some
// configurations (e.g. win95patch.zip is only used by the dosx-edge build).

window.LOCAL_CATALOG = {
    siteName: "Retro Game Playground",

    games: [
        {
                "id": "pandoras_box",
                "title": "Pandora's Box",
                "os": "windows",
                "osLabel": "Windows 95",
                "year": "1999",
                "publisher": "Microsoft",
                "genre": "Puzzle",
                "players": "1",
                "playUrl": "/play.html?game=pandoras_box",
                "configUrl": "/config-pandoras_box.js",
                "cover": "/images/games/pandoras_box_cover.jpg",
                "accent": [
                        "#2b3a67",
                        "#101828"
                ],
                "description": "Microsoft's puzzle adventure.",
                "files": [
                        "/games/pandoras_box.jsdos",
                        "/games/bin/windows/tools/tools.zip",
                        "/games/bin/windows/images/os/pandoras_box_OS.DCD",
                        "/games/bin/windows/images/game/pandoras_box.DCD"
                ],
                "optionalFiles": [
                        "/games/bin/windows/images/disc/pandoras_box.DCD"
                ]
        },
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
            configUrl: "/config.js",
            // Optional cover art; when empty a gradient tile is drawn instead.
            cover: "/images/games/broodwar_cd_cover.webp",
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
        },
        {
            id: "settlers3_gold",
            title: "The Settlers III: Gold Edition",
            os: "windows",
            osLabel: "Windows 98",
            year: 1999,
            publisher: "Blue Byte",
            genre: "Strategy",
            players: "1",
            playUrl: "/play.html?game=settlers3_gold",
            configUrl: "/config-settlers3_gold.js",
            cover: "/images/games/settlers3_gold_cover.webp",
            accent: ["#3f5a7a", "#101a26"],
            description: "Blue Byte's build-and-expand economy strategy game with the Gold Edition content, on a Windows image inside DOSBox-X.",
            files: [
                "/games/settlers3.jsdos",
                "/games/bin/windows/tools/tools.zip",
                "/games/bin/windows/images/os/WIN95OSR2_EN_OS.DCD",
                "/games/bin/windows/images/game/SETTLERS3.DCD"
            ],
            optionalFiles: [
                "/games/bin/windows/tools/win95patch.zip",
                "/games/bin/windows/images/disc/SETTLERS301.DCD",
                "/games/bin/windows/images/disc/SETTLERS302.DCD"
            ]
        },
        {
            id: "age_of_empires",
            title: "Age of Empires",
            os: "windows",
            osLabel: "Windows 95",
            year: 1997,
            publisher: "Microsoft",
            genre: "Real-time strategy",
            players: "1",
            playUrl: "/play.html?game=age_of_empires",
            configUrl: "/config-age_of_empires.js",
            cover: "/images/games/age_of_empires_cover.webp",
            accent: ["#6b5a2f", "#1d1810"],
            description: "Ensemble Studios' historical real-time strategy game, from Stone Age to Iron Age, on a Windows 95 image.",
            files: [
                "/games/aoe.jsdos",
                "/games/bin/windows/tools/tools.zip",
                "/games/bin/windows/images/os/WIN95OSR2_EN_OS.DCD",
                "/games/bin/windows/images/game/AOEX.DCD"
            ],
            optionalFiles: [
                "/games/bin/windows/tools/win95patch.zip",
                "/games/bin/windows/images/disc/AOE.DCD"
            ]
        },
        {
            id: "red_alert_2",
            title: "Command & Conquer: Red Alert 2",
            os: "windows",
            osLabel: "Windows 98",
            year: 2000,
            publisher: "Electronic Arts",
            genre: "Real-time strategy",
            players: "1",
            playUrl: "/play.html?game=red_alert_2",
            configUrl: "/config-red_alert_2.js",
            cover: "/images/games/red_alert_2_cover.webp",
            accent: ["#7a2b2b", "#200d0d"],
            description: "Westwood's fast, campy alternate-history RTS with the full Soviet and Allied campaigns.",
            files: [
                "/games/ra2.jsdos",
                "/games/bin/windows/tools/tools.zip",
                "/games/bin/windows/images/os/WIN95OSR2_EN_OS.DCD",
                "/games/bin/windows/images/game/RA2.DCD"
            ],
            optionalFiles: [
                "/games/bin/windows/tools/win95patch.zip",
                "/games/bin/windows/images/disc/RA201.DCD",
                "/games/bin/windows/images/disc/RA202.DCD"
            ]
        },
        {
            id: "simcity_3000",
            title: "SimCity 3000",
            os: "windows",
            osLabel: "Windows 98",
            year: 1999,
            publisher: "Electronic Arts",
            genre: "City-building",
            players: "1",
            playUrl: "/play.html?game=simcity_3000",
            configUrl: "/config-simcity_3000.js",
            cover: "/images/games/simcity_3000_cover.webp",
            accent: ["#2f6b6b", "#0d1f1f"],
            description: "Maxis' city simulator: zone, budget, negotiate with neighbours and keep the citizens happy.",
            files: [
                "/games/sc3000.jsdos",
                "/games/bin/windows/tools/tools.zip",
                "/games/bin/windows/images/os/WIN95OSR2_EN_OS.DCD",
                "/games/bin/windows/images/game/SC3000.DCD"
            ],
            optionalFiles: [
                "/games/bin/windows/tools/win95patch.zip",
                "/games/bin/windows/images/disc/SC3000.DCD"
            ]
        },
        {
            id: "yuris_revenge",
            title: "Command & Conquer: Yuri's Revenge",
            os: "windows",
            osLabel: "Windows 98",
            year: 2001,
            publisher: "Electronic Arts",
            genre: "Real-time strategy",
            players: "1",
            playUrl: "/play.html?game=yuris_revenge",
            configUrl: "/config-yuris_revenge.js",
            cover: "/images/games/yuris_revenge_cover.webp",
            accent: ["#5a2f6b", "#170d1d"],
            description: "The Red Alert 2 expansion: a third faction, new campaigns and the full original game.",
            files: [
                "/games/ra2yr.jsdos",
                "/games/bin/windows/tools/tools.zip",
                "/games/bin/windows/images/os/WIN95OSR2_EN_OS.DCD",
                "/games/bin/windows/images/game/RA2.DCD"
            ],
            optionalFiles: [
                "/games/bin/windows/tools/win95patch.zip",
                "/games/bin/windows/images/disc/RA2YR.DCD"
            ]
        },
        {
            id: "rct_deluxe",
            title: "RollerCoaster Tycoon Deluxe",
            os: "windows",
            osLabel: "Windows 98",
            year: 1999,
            publisher: "Hasbro Interactive",
            genre: "Simulation",
            players: "1",
            playUrl: "/play.html?game=rct_deluxe",
            configUrl: "/config-rct_deluxe.js",
            cover: "/images/games/rct_deluxe_cover.webp",
            accent: ["#2f6b3a", "#0d1d10"],
            description: "Chris Sawyer's amusement-park builder with the Loopy Landscapes and Corkscrew Follies parks.",
            files: [
                "/games/rctd.jsdos",
                "/games/bin/windows/tools/tools.zip",
                "/games/bin/windows/images/os/WIN95OSR2_EN_OS.DCD",
                "/games/bin/windows/images/game/RCTD.DCD"
            ],
            optionalFiles: [
                "/games/bin/windows/tools/win95patch.zip",
                "/games/bin/windows/images/disc/RCTD.DCD"
            ]
        },
        {
            id: "diablo2_lod",
            title: "Diablo II: Lord of Destruction",
            os: "windows",
            osLabel: "Windows 98",
            year: 2001,
            publisher: "Blizzard Entertainment",
            genre: "Action RPG",
            players: "1",
            playUrl: "/play.html?game=diablo2_lod",
            configUrl: "/config-diablo2_lod.js",
            cover: "/images/games/diablo2_lod_cover.webp",
            accent: ["#6b2f2f", "#1a0d0d"],
            description: "Blizzard's action RPG with the Lord of Destruction expansion: Act V, two new classes, more loot.",
            files: [
                "/games/d2lod.jsdos",
                "/games/bin/windows/tools/tools.zip",
                "/games/bin/windows/images/os/WIN98SE_EN_OS.DCD",
                "/games/bin/windows/images/game/D2LOD.DCD"
            ],
            optionalFiles: [
                "/games/bin/windows/tools/win95patch.zip",
                "/games/bin/windows/images/disc/D2LOD.DCD",
                "/games/bin/windows/images/disc/D21.DCD"
            ]
        },
        {
            id: "red_alert",
            title: "Command & Conquer Red Alert",
            os: "windows",
            osLabel: "Windows 95",
            year: 1996,
            publisher: "Westwood Studios",
            genre: "Real-time strategy",
            players: "1",
            playUrl: "/play.html?game=red_alert",
            configUrl: "/config-red_alert.js",
            cover: "/images/games/red_alert_cover.webp",
            accent: ["#6b3a2f", "#1c0f0c"],
            description: "The original alternate-history RTS - Allied and Soviet campaigns, plus the Counterstrike and Aftermath missions.",
            files: [
                "/games/ra95.jsdos",
                "/games/bin/windows/tools/tools.zip",
                "/games/bin/windows/images/os/WIN95OSR2_EN_OS.DCD",
                "/games/bin/windows/images/game/RA95.DCD"
            ],
            optionalFiles: [
                "/games/bin/windows/tools/win95patch.zip",
                "/games/bin/windows/images/disc/RA951.DCD",
                "/games/bin/windows/images/disc/RA952.DCD",
                "/games/bin/windows/images/disc/RACS.DCD",
                "/games/bin/windows/images/disc/RATA.DCD"
            ]
        },
        {
            id: "populous_beginning",
            title: "Populous: The Beginning",
            os: "windows",
            osLabel: "Windows 95",
            year: 1998,
            publisher: "Electronic Arts",
            genre: "Strategy",
            players: "1",
            playUrl: "/play.html?game=populous_beginning",
            configUrl: "/config-populous_beginning.js",
            cover: "/images/games/populous_beginning_cover.webp",
            accent: ["#3a2f6b", "#110d1d"],
            description: "Bullfrog's 3D god game: shape the land, convert the tribes and wipe out your rivals. Uses 3dfx Voodoo emulation.",
            files: [
                "/games/populous.jsdos",
                "/games/bin/windows/tools/tools.zip",
                "/games/bin/windows/images/os/WIN95OSR2_EN_OS.DCD",
                "/games/bin/windows/images/game/POPULOUS.DCD"
            ],
            optionalFiles: [
                "/games/bin/windows/tools/win95patch.zip",
                "/games/bin/windows/images/disc/POPULOUS.DCD"
            ]
        },
        {
            id: "aoe2_kings",
            title: "Age of Empires II: The Age of Kings",
            os: "windows",
            osLabel: "Windows 95",
            year: 1999,
            publisher: "Microsoft",
            genre: "Real-time strategy",
            players: "1",
            playUrl: "/play.html?game=aoe2_kings",
            configUrl: "/config-aoe2_kings.js",
            cover: "/images/games/aoe2_kings_cover.webp",
            accent: ["#5a3d2f", "#1c1210"],
            description: "Ensemble Studios' medieval real-time strategy sequel: 13 civilisations, five campaigns and random-map skirmish.",
            files: [
                "/games/aoe2.jsdos",
                "/games/bin/windows/tools/tools.zip",
                "/games/bin/windows/images/os/WIN95OSR2_EN_OS.DCD",
                "/games/bin/windows/images/game/AOE2.DCD"
            ],
            optionalFiles: [
                "/games/bin/windows/tools/win95patch.zip",
                "/games/bin/windows/images/disc/AOE2.DCD"
            ]
        },
        {
            id: "worms2",
            title: "Worms 2",
            os: "windows",
            osLabel: "Windows 95",
            year: 1997,
            publisher: "Team17",
            genre: "Artillery strategy",
            players: "1",
            playUrl: "/play.html?game=worms2",
            configUrl: "/config-worms2.js",
            cover: "/images/games/worms2_cover.webp",
            accent: ["#2f5a4a", "#101c18"],
            description: "Team17's turn-based artillery game: up to 16 teams of worms in destructible 2D battlefields.",
            files: [
                "/games/worms2.jsdos",
                "/games/bin/windows/tools/tools.zip",
                "/games/bin/windows/images/os/WIN95OSR2_EN_OS.DCD",
                "/games/bin/windows/images/game/WORMS2.DCD"
            ],
            optionalFiles: [
                "/games/bin/windows/tools/win95patch.zip",
                "/games/bin/windows/images/disc/WORMS2.DCD"
            ]
        },
        {
            id: "fallout2",
            title: "Fallout 2",
            os: "windows",
            osLabel: "Windows 95",
            year: 1998,
            publisher: "Interplay",
            genre: "Role-playing",
            players: "1",
            playUrl: "/play.html?game=fallout2",
            configUrl: "/config-fallout2.js",
            cover: "/images/games/fallout2_cover.webp",
            accent: ["#3f4d5c", "#12161c"],
            description: "Black Isle's post-apocalyptic role-playing sequel set across the ruins of the west coast.",
            files: [
                "/games/fallout2.jsdos",
                "/games/bin/windows/tools/tools.zip",
                "/games/bin/windows/images/os/WIN95OSR2_EN_OS.DCD",
                "/games/bin/windows/images/game/FALLOUT2.DCD"
            ],
            optionalFiles: [
                "/games/bin/windows/tools/win95patch.zip",
                "/games/bin/windows/images/disc/FALLOUT2.DCD"
            ]
        },
        {
            id: "caesar3",
            title: "Caesar III",
            os: "windows",
            osLabel: "Windows 95",
            year: 1998,
            publisher: "Sierra",
            genre: "City-building",
            players: "1",
            playUrl: "/play.html?game=caesar3",
            configUrl: "/config-caesar3.js",
            cover: "/images/games/caesar3_cover.webp",
            accent: ["#6b4a2f", "#1d1410"],
            description: "Impressions' Roman city-builder: manage plebs, patricians, trade, temples and the Emperor's demands.",
            files: [
                "/games/caesar3.jsdos",
                "/games/bin/windows/tools/tools.zip",
                "/games/bin/windows/images/os/WIN95OSR2_EN_OS.DCD",
                "/games/bin/windows/images/game/CAESAR3.DCD"
            ],
            optionalFiles: [
                "/games/bin/windows/tools/win95patch.zip",
                "/games/bin/windows/images/disc/CAESAR3.DCD"
            ]
        },
        {
            id: "dune2000",
            title: "Dune 2000",
            os: "windows",
            osLabel: "Windows 95",
            year: 1998,
            publisher: "Westwood Studios",
            genre: "Real-time strategy",
            players: "1",
            playUrl: "/play.html?game=dune2000",
            configUrl: "/config-dune2000.js",
            cover: "/images/games/dune2000_cover.webp",
            accent: ["#6b5a2f", "#1c1810"],
            description: "Westwood's Dune real-time strategy remake: harvest spice, build armies and fight the Harkonnen.",
            files: [
                "/games/dune2000.jsdos",
                "/games/bin/windows/tools/tools.zip",
                "/games/bin/windows/images/os/WIN95OSR2_EN_OS.DCD",
                "/games/bin/windows/images/game/DUNE2000.DCD"
            ],
            optionalFiles: [
                "/games/bin/windows/tools/win95patch.zip",
                "/games/bin/windows/images/disc/DUNE2000.DCD"
            ]
        },
        {
            id: "panzer_general2",
            title: "Panzer General II",
            os: "windows",
            osLabel: "Windows 95",
            year: 1997,
            publisher: "Strategic Simulations",
            genre: "Strategy",
            players: "1",
            playUrl: "/play.html?game=panzer_general2",
            configUrl: "/config-panzer_general2.js",
            cover: "/images/games/panzer_general2_cover.webp",
            accent: ["#3f5a3a", "#101c10"],
            description: "SSI's turn-based WWII operational wargame across the European and Mediterranean theatres.",
            files: [
                "/games/panzerg2.jsdos",
                "/games/bin/windows/tools/tools.zip",
                "/games/bin/windows/images/os/WIN95OSR2_EN_OS.DCD",
                "/games/bin/windows/images/game/PANZERG2.DCD"
            ],
            optionalFiles: [
                "/games/bin/windows/tools/win95patch.zip",
                "/games/bin/windows/images/disc/PANZERG2.DCD"
            ]
        },
        {
            id: "myst",
            title: "Myst",
            os: "windows",
            osLabel: "Windows 95",
            year: 1993,
            publisher: "Broderbund",
            genre: "Adventure",
            players: "1",
            playUrl: "/play.html?game=myst",
            configUrl: "/config-myst.js",
            cover: "/images/games/myst_cover.webp",
            accent: ["#2f4a5c", "#10161c"],
            description: "Cyan's landmark graphic adventure: explore the island of Myst and the Ages linked by its books.",
            files: [
                "/games/myst.jsdos",
                "/games/bin/windows/tools/tools.zip",
                "/games/bin/windows/images/os/WIN95OSR2_EN_OS.DCD",
                "/games/bin/windows/images/game/MYST.DCD"
            ],
            optionalFiles: [
                "/games/bin/windows/tools/win95patch.zip",
                "/games/bin/windows/images/disc/MYST.DCD"
            ]
        },
        {
            id: "myst_masterpiece",
            title: "Myst: Masterpiece Edition",
            os: "windows",
            osLabel: "Windows 95",
            year: 2000,
            publisher: "Broderbund",
            genre: "Adventure",
            players: "1",
            playUrl: "/play.html?game=myst_masterpiece",
            configUrl: "/config-myst_masterpiece.js",
            cover: "/images/games/myst_masterpiece_cover.webp",
            accent: ["#2f3f5c", "#10121c"],
            description: "The remastered Myst with enhanced 24-bit graphics and smoother QuickTime video.",
            files: [
                "/games/mystme.jsdos",
                "/games/bin/windows/tools/tools.zip",
                "/games/bin/windows/images/os/WIN95OSR2_EN_OS.DCD",
                "/games/bin/windows/images/game/MYSTME.DCD"
            ],
            optionalFiles: [
                "/games/bin/windows/tools/win95patch.zip",
                "/games/bin/windows/images/disc/MYSTME.DCD"
            ]
        },
        {
            id: "heart_of_darkness",
            title: "Heart of Darkness",
            os: "windows",
            osLabel: "Windows 95",
            year: 1998,
            publisher: "Interplay",
            genre: "Platformer",
            players: "1",
            playUrl: "/play.html?game=heart_of_darkness",
            configUrl: "/config-heart_of_darkness.js",
            cover: "/images/games/heart_of_darkness_cover.webp",
            accent: ["#3a2f5c", "#12101c"],
            description: "Amazing Studio's cinematic platformer: a boy chases his dog into a shadowy world of animated menace.",
            files: [
                "/games/hod.jsdos",
                "/games/bin/windows/tools/tools.zip",
                "/games/bin/windows/images/os/WIN95OSR2_EN_OS.DCD",
                "/games/bin/windows/images/game/HOD.DCD"
            ],
            optionalFiles: [
                "/games/bin/windows/tools/win95patch.zip",
                "/games/bin/windows/images/disc/HOD.DCD"
            ]
        },
        {
            id: "riven",
            title: "Riven",
            os: "windows",
            osLabel: "Windows 95",
            year: 1997,
            publisher: "Red Orb Entertainment",
            genre: "Adventure",
            players: "1",
            playUrl: "/play.html?game=riven",
            configUrl: "/config-riven.js",
            cover: "/images/games/riven_cover.webp",
            accent: ["#2f5c4a", "#101c14"],
            description: "The Myst sequel spanning five CDs: solve the puzzle of Riven to free Atrus' wife Catherine.",
            files: [
                "/games/rtstm.jsdos",
                "/games/bin/windows/tools/tools.zip",
                "/games/bin/windows/images/os/WIN95OSR2_EN_OS.DCD",
                "/games/bin/windows/images/game/RTSTM.DCD"
            ],
            optionalFiles: [
                "/games/bin/windows/tools/win95patch.zip",
                "/games/bin/windows/images/disc/RTSTM01.DCD",
                "/games/bin/windows/images/disc/RTSTM02.DCD",
                "/games/bin/windows/images/disc/RTSTM03.DCD",
                "/games/bin/windows/images/disc/RTSTM04.DCD",
                "/games/bin/windows/images/disc/RTSTM05.DCD"
            ]
        },
        {
            id: "realmyst",
            title: "RealMyst: Interactive 3D Edition",
            os: "windows",
            osLabel: "Windows 95",
            year: 2000,
            publisher: "UbiSoft",
            genre: "Adventure",
            players: "1",
            playUrl: "/play.html?game=realmyst",
            configUrl: "/config-realmyst.js",
            cover: "/images/games/realmyst_cover.webp",
            accent: ["#2f4a5c", "#10161c"],
            description: "Myst rebuilt as a free-roaming 3D world (3dfx Voodoo), keeping all the original puzzles.",
            files: [
                "/games/realmyst.jsdos",
                "/games/bin/windows/tools/tools.zip",
                "/games/bin/windows/images/os/WIN95OSR2_EN_OS.DCD",
                "/games/bin/windows/images/game/REALMYST.DCD"
            ],
            optionalFiles: [
                "/games/bin/windows/tools/win95patch.zip",
                "/games/bin/windows/images/disc/REALMYST.DCD"
            ]
        },
        {
            id: "colonization",
            title: "Sid Meier's Colonization",
            os: "dos",
            osLabel: "DOS",
            year: 1994,
            publisher: "MicroProse",
            genre: "Strategy",
            players: "1",
            playUrl: "/play.html?game=colonization",
            configUrl: "/config-colonization.js",
            cover: "/images/games/colonization_cover.webp",
            accent: ["#4a3f2f", "#181410"],
            description: "Sid Meier's classic: lead European colonists to the New World, trade and fight for independence. DOS game.",
            files: [
                "/games/colonize.jsdos"
            ],
            optionalFiles: [

            ]
        },
        {
            id: "bistro2",
            title: "Bistro 2: Challenge the World (Chinese)",
            os: "windows",
            osLabel: "Windows 95",
            year: 1998,
            publisher: "?",
            genre: "Simulation",
            players: "1",
            playUrl: "/play.html?game=bistro2",
            configUrl: "/config-bistro2.js",
            cover: "/images/games/bistro2_cover.webp",
            accent: ["#5c3a2f", "#1c1210"],
            description: "A restaurant-management simulation (Traditional Chinese release) on a Windows 95 image.",
            files: [
                "/games/bistro2.jsdos",
                "/games/bin/windows/tools/tools.zip",
                "/games/bin/windows/images/os/WIN95OSR2_CHT_OS.DCD",
                "/games/bin/windows/images/game/BISTRO2.DCD"
            ],
            optionalFiles: [
                "/games/bin/windows/tools/win95patch.zip",
                "/games/bin/windows/images/disc/BISTRO2.DCD"
            ]
        },
        {
            id: "uncharted_waters2_cn",
            title: "Uncharted Waters II: New Horizons (Chinese)",
            os: "dos",
            osLabel: "DOS",
            year: 1994,
            publisher: "Koei",
            genre: "RPG/Adventure",
            players: "1",
            playUrl: "/play.html?game=uncharted_waters2_cn",
            configUrl: "/config-uncharted_waters2_cn.js",
            cover: "/images/games/uncharted_waters2_cn_cover.webp",
            accent: ["#2f4a5c", "#10161c"],
            description: "Koei's seafaring RPG (Chinese): trade, explore, and chart a path across the age of exploration. DOS game.",
            files: [
                "/games/uw2.jsdos"
            ],
            optionalFiles: [

            ]
        },
        {
            id: "warcraft2_tides",
            title: "Warcraft II: Tides of Darkness",
            os: "dos",
            osLabel: "DOS",
            year: 1995,
            publisher: "Blizzard",
            genre: "Real-time strategy",
            players: "1",
            playUrl: "/play.html?game=warcraft2_tides",
            configUrl: "/config-warcraft2_tides.js",
            cover: "/images/games/warcraft2_tides_cover.webp",
            accent: ["#2f3f5c", "#10121c"],
            description: "Blizzard's orc-vs-human RTS that defined the genre. DOS game, General MIDI audio.",
            files: [
                "/games/wc2_cd.jsdos"
            ],
            optionalFiles: [

            ]
        },
        {
            id: "warcraft2_beyond",
            title: "Warcraft II: Beyond the Dark Portal",
            os: "dos",
            osLabel: "DOS",
            year: 1996,
            publisher: "Blizzard",
            genre: "Real-time strategy",
            players: "1",
            playUrl: "/play.html?game=warcraft2_beyond",
            configUrl: "/config-warcraft2_beyond.js",
            cover: "/images/games/warcraft2_beyond_cover.webp",
            accent: ["#3a2f5c", "#12101c"],
            description: "The Warcraft II expansion: the Alliance strikes into the Dark Portal. DOS game, General MIDI audio.",
            files: [
                "/games/wc2_bdp_cd.jsdos"
            ],
            optionalFiles: [

            ]
        },
        {
            id: "pharaoh_cleopatra",
            title: "Pharaoh & Cleopatra",
            os: "windows",
            osLabel: "Windows 95",
            year: 2000,
            publisher: "Sierra",
            genre: "City-building",
            players: "1",
            playUrl: "/play.html?game=pharaoh_cleopatra",
            configUrl: "/config-pharaoh_cleopatra.js",
            cover: "/images/games/pharaoh_cleopatra_cover.webp",
            accent: ["#6b5a2f", "#1d1810"],
            description: "Impressions' Egyptian city-builder with the Cleopatra expansion: build monuments and manage the Nile.",
            files: [
                "/games/pharaoh.jsdos",
                "/games/bin/windows/tools/tools.zip",
                "/games/bin/windows/images/os/WIN95OSR2_EN_OS.DCD",
                "/games/bin/windows/images/game/PHARAOH.DCD"
            ],
            optionalFiles: [
                "/games/bin/windows/tools/win95patch.zip",
                "/games/bin/windows/images/disc/PHARAOH.DCD"
            ]
        },
        {
            id: "cnc_tiberian_dawn",
            title: "Command & Conquer",
            os: "dos",
            osLabel: "DOS",
            year: 1995,
            publisher: "Westwood Studios",
            genre: "Real-time strategy",
            players: "1",
            playUrl: "/play.html?game=cnc_tiberian_dawn",
            configUrl: "/config-cnc_tiberian_dawn.js",
            cover: "/images/games/cnc_tiberian_dawn_cover.webp",
            accent: ["#5c2f2f", "#1c1010"],
            description: "The original Command & Conquer: GDI vs NOD in the Tiberium conflict, on two mission discs.",
            files: [
                "/games/cnc_cd.jsdos"
            ],
            optionalFiles: [

            ]
        },
        {
            id: "theme_hospital",
            title: "Theme Hospital",
            os: "dos",
            osLabel: "DOS",
            year: 1997,
            publisher: "Bullfrog",
            genre: "Simulation",
            players: "1",
            playUrl: "/play.html?game=theme_hospital",
            configUrl: "/config-theme_hospital.js",
            cover: "/images/games/theme_hospital_cover.webp",
            accent: ["#2f5c5c", "#101c1c"],
            description: "Bullfrog's comedic hospital-management sim: cure odd diseases, keep patients alive and profits up. General MIDI audio.",
            files: [
                "/games/th_cd.jsdos"
            ],
            optionalFiles: [

            ]
        },
        {
            id: "bistro_taiwan",
            title: "Bistro Taiwan",
            os: "windows",
            osLabel: "Windows 95",
            year: 1999,
            publisher: "Unknown",
            genre: "Simulation",
            players: "1",
            playUrl: "/play.html?game=bistro_taiwan",
            configUrl: "/config-bistro_taiwan.js",
            cover: "/images/games/bistro_taiwan_cover.jpg",
            accent: ["#3a4a6b", "#12161f"],
            description: "Traditional-Chinese restaurant-management sim running on a Windows 95 image.",
            files: [
                "/games/bistro2tw.jsdos",
                "/games/bin/windows/tools/tools.zip",
                "/games/bin/windows/images/os/WIN95OSR2_CHT_OS.DCD",
                "/games/bin/windows/images/game/BISTRO2TW.DCD"
            ],
            optionalFiles: [
                "/games/bin/windows/tools/win95patch.zip"
            ]
        },
        {
            id: "transport_tycoon_deluxe",
            title: "Transport Tycoon Deluxe",
            os: "dos",
            osLabel: "DOS",
            year: 1999,
            publisher: "MicroProse",
            genre: "Strategy",
            players: "1",
            playUrl: "/play.html?game=transport_tycoon_deluxe",
            configUrl: "/config-transport_tycoon_deluxe.js",
            cover: "/images/games/transport_tycoon_deluxe_cover.webp",
            accent: ["#5a3d2f", "#1c1210"],
            description: "Chris Sawyer's transport empire sim: rail, road, sea and air. DOS game with General MIDI audio.",
            files: [
                "/games/ttdx.jsdos"
            ],
            optionalFiles: [

            ]
        },
        {
            id: "railroad_tycoon2_platinum",
            title: "Railroad Tycoon II Platinum",
            os: "windows",
            osLabel: "Windows 95",
            year: 1999,
            publisher: "PopTop Software",
            genre: "Strategy",
            players: "1",
            playUrl: "/play.html?game=railroad_tycoon2_platinum",
            configUrl: "/config-railroad_tycoon2_platinum.js",
            cover: "/images/games/railroad_tycoon2_platinum_cover.webp",
            accent: ["#3f5a4a", "#101c14"],
            description: "PopTop's railroad empire builder, with the Platinum edition's campaigns and map editor.",
            files: [
                "/games/rt2p.jsdos",
                "/games/bin/windows/tools/tools.zip",
                "/games/bin/windows/images/os/WIN95OSR2_EN_OS.DCD",
                "/games/bin/windows/images/game/RT2P.DCD"
            ],
            optionalFiles: [
                "/games/bin/windows/tools/win95patch.zip",
                "/games/bin/windows/images/disc/RT2P.DCD"
            ]
        },
        {
            id: "capitalism_plus",
            title: "Capitalism Plus",
            os: "dos",
            osLabel: "DOS",
            year: 1999,
            publisher: "Interactive Magic",
            genre: "Business simulation",
            players: "1",
            playUrl: "/play.html?game=capitalism_plus",
            configUrl: "/config-capitalism_plus.js",
            cover: "/images/games/capitalism_plus_cover.webp",
            accent: ["#5c3a5c", "#1c101c"],
            description: "Brightstar's deep business sim: build retail, farming and industrial empires against rival CEOs. DOS game.",
            files: [
                "/games/capp_cd.jsdos"
            ],
            optionalFiles: [

            ]
        },
        {
            id: "sm_gettysburg",
            title: "Sid Meier's Gettysburg!",
            os: "windows",
            osLabel: "Windows 95",
            year: 1999,
            publisher: "Firaxis",
            genre: "Wargame",
            players: "1",
            playUrl: "/play.html?game=sm_gettysburg",
            configUrl: "/config-sm_gettysburg.js",
            cover: "/images/games/sm_gettysburg_cover.webp",
            accent: ["#2f5a5c", "#101c1c"],
            description: "Firaxis' real-time Civil War wargame refighting the battle of Gettysburg.",
            files: [
                "/games/smg.jsdos",
                "/games/bin/windows/tools/tools.zip",
                "/games/bin/windows/images/os/WIN95OSR2_EN_OS.DCD",
                "/games/bin/windows/images/game/SMG.DCD"
            ],
            optionalFiles: [
                "/games/bin/windows/tools/win95patch.zip",
                "/games/bin/windows/images/disc/SMG.DCD"
            ]
        },
        {
            id: "silent_hunter_ce",
            title: "Silent Hunter: Commander's Edition",
            os: "dos",
            osLabel: "DOS",
            year: 1999,
            publisher: "Strategic Simulations",
            genre: "Submarine simulator",
            players: "1",
            playUrl: "/play.html?game=silent_hunter_ce",
            configUrl: "/config-silent_hunter_ce.js",
            cover: "/images/games/silent_hunter_ce_cover.webp",
            accent: ["#5c4a2f", "#1c1610"],
            description: "SSI's WWII U-boat simulator, Commander's Edition. DOS game.",
            files: [
                "/games/shce_cd.jsdos"
            ],
            optionalFiles: [

            ]
        },
        {
            id: "smac",
            title: "Sid Meier's Alpha Centauri",
            os: "windows",
            osLabel: "Windows 95",
            year: 1999,
            publisher: "Firaxis",
            genre: "4X strategy",
            players: "1",
            playUrl: "/play.html?game=smac",
            configUrl: "/config-smac.js",
            cover: "/images/games/smac_cover.webp",
            accent: ["#4a2f5c", "#16101c"],
            description: "Sid Meier's sci-fi 4X: seven factions colonise Planet after the Unity mission fails.",
            files: [
                "/games/ac.jsdos",
                "/games/bin/windows/tools/tools.zip",
                "/games/bin/windows/images/os/WIN95OSR2_EN_OS.DCD",
                "/games/bin/windows/images/game/ACPP.DCD"
            ],
            optionalFiles: [
                "/games/bin/windows/tools/win95patch.zip",
                "/games/bin/windows/images/disc/ACPP.DCD"
            ]
        },
        {
            id: "smac_xf",
            title: "Sid Meier's Alien Crossfire",
            os: "windows",
            osLabel: "Windows 95",
            year: 1999,
            publisher: "Firaxis",
            genre: "4X strategy",
            players: "1",
            playUrl: "/play.html?game=smac_xf",
            configUrl: "/config-smac_xf.js",
            cover: "/images/games/smac_xf_cover.webp",
            accent: ["#2f4a5c", "#10161c"],
            description: "The Alpha Centauri expansion: seven new factions, new technologies and story events.",
            files: [
                "/games/acac.jsdos",
                "/games/bin/windows/tools/tools.zip",
                "/games/bin/windows/images/os/WIN95OSR2_EN_OS.DCD",
                "/games/bin/windows/images/game/ACPP.DCD"
            ],
            optionalFiles: [
                "/games/bin/windows/tools/win95patch.zip",
                "/games/bin/windows/images/disc/ACPP.DCD"
            ]
        },
        {
            id: "simcity2000",
            title: "SimCity 2000",
            os: "dos",
            osLabel: "DOS",
            year: 1999,
            publisher: "Maxis",
            genre: "City-building",
            players: "1",
            playUrl: "/play.html?game=simcity2000",
            configUrl: "/config-simcity2000.js",
            cover: "/images/games/simcity2000_cover.webp",
            accent: ["#5c2f3a", "#1c1014"],
            description: "Maxis' classic city simulator. DOS game with General MIDI audio.",
            files: [
                "/games/sc2000.jsdos"
            ],
            optionalFiles: [

            ]
        },
        {
            id: "sub_culture",
            title: "Sub Culture",
            os: "windows",
            osLabel: "Windows 95",
            year: 1999,
            publisher: "Digital Image Design",
            genre: "Action",
            players: "1",
            playUrl: "/play.html?game=sub_culture",
            configUrl: "/config-sub_culture.js",
            cover: "/images/games/sub_culture_cover.webp",
            accent: ["#3a5c2f", "#141c10"],
            description: "Digital Image Design's underwater action game piloting a tiny sub. Uses 3dfx Voodoo.",
            files: [
                "/games/subculture.jsdos",
                "/games/bin/windows/tools/tools.zip",
                "/games/bin/windows/images/os/WIN95OSR2_EN_OS.DCD",
                "/games/bin/windows/images/game/SUBCULTURE.DCD"
            ],
            optionalFiles: [
                "/games/bin/windows/tools/win95patch.zip",
                "/games/bin/windows/images/disc/SUBCULTURE.DCD"
            ]
        },
        {
            id: "commandos_bel",
            title: "Commandos: Behind Enemy Lines",
            os: "windows",
            osLabel: "Windows 95",
            year: 1998,
            publisher: "Eidos Interactive",
            genre: "Real-time tactics",
            players: "1",
            playUrl: "/play.html?game=commandos_bel",
            configUrl: "/config-commandos_bel.js",
            cover: "/images/games/commandos_bel_cover.webp",
            accent: ["#4b5d3a", "#141b10"],
            description: "Pyro Studios' squad-based tactics game: infiltrate, sabotage and get out alive. Runs on a Windows 95 image inside DOSBox-X compiled to WebAssembly.",
            files: [
                "/games/commandos.jsdos",
                "/games/bin/windows/tools/tools.zip",
                "/games/bin/windows/images/os/WIN95OSR2_EN_OS.DCD",
                "/games/bin/windows/images/game/CMDOBEL.DCD"
            ],
            optionalFiles: [
                "/games/bin/windows/tools/win95patch.zip",
                "/games/bin/windows/images/disc/CMDOBEL.DCD"
            ]
        },
        {
            id: "civ2_tot",
            title: "Civilization II: Test of Time",
            os: "windows",
            osLabel: "Windows 95",
            year: 1999,
            publisher: "MicroProse",
            genre: "4X strategy",
            players: "1",
            playUrl: "/play.html?game=civ2_tot",
            configUrl: "/config-civ2_tot.js",
            cover: "/images/games/civ2_tot_cover.webp",
            accent: ["#5c5a2f", "#1c1c10"],
            description: "The reimagined Civilization II, with fantasy and science-fiction extended campaigns.",
            files: [
                "/games/civ2tot.jsdos",
                "/games/bin/windows/tools/tools.zip",
                "/games/bin/windows/images/os/WIN95OSR2_EN_OS.DCD",
                "/games/bin/windows/images/game/CIV2TOT.DCD"
            ],
            optionalFiles: [
                "/games/bin/windows/tools/win95patch.zip",
                "/games/bin/windows/images/disc/CIV2TOT.DCD"
            ]
        },
        {
            id: "civ2_mpgold",
            title: "Civilization II: Multiplayer Gold Edition",
            os: "windows",
            osLabel: "Windows 95",
            year: 1999,
            publisher: "MicroProse",
            genre: "4X strategy",
            players: "1",
            playUrl: "/play.html?game=civ2_mpgold",
            configUrl: "/config-civ2_mpgold.js",
            cover: "/images/games/civ2_mpgold_cover.webp",
            accent: ["#2f3f5c", "#10121c"],
            description: "Civilization II with multiplayer plus the Conflicts in Civilization scenario pack.",
            files: [
                "/games/civ2.jsdos",
                "/games/bin/windows/tools/tools.zip",
                "/games/bin/windows/images/os/WIN95OSR2_EN_OS.DCD",
                "/games/bin/windows/images/game/CIV2.DCD"
            ],
            optionalFiles: [
                "/games/bin/windows/tools/win95patch.zip",
                "/games/bin/windows/images/disc/CIV2.DCD"
            ]
        },
        {
            id: "colonial_plan_cn",
            title: "Colonial Plan (Chinese)",
            os: "dos",
            osLabel: "DOS",
            year: 1999,
            publisher: "Unknown",
            genre: "Strategy",
            players: "1",
            playUrl: "/play.html?game=colonial_plan_cn",
            configUrl: "/config-colonial_plan_cn.js",
            cover: "/images/games/colonial_plan_cn_cover.webp",
            accent: ["#3a4a6b", "#12161f"],
            description: "Taiwanese-Chinese DOS strategy game; General MIDI audio.",
            files: [
                "/games/aps.jsdos"
            ],
            optionalFiles: [

            ]
        },
        {
            id: "blade_runner",
            title: "Blade Runner",
            os: "windows",
            osLabel: "Windows 95",
            year: 1999,
            publisher: "Westwood Studios",
            genre: "Adventure",
            players: "1",
            playUrl: "/play.html?game=blade_runner",
            configUrl: "/config-blade_runner.js",
            cover: "/images/games/blade_runner_cover.webp",
            accent: ["#5a3d2f", "#1c1210"],
            description: "Westwood's noir adventure across four CDs, with a branching detective story.",
            files: [
                "/games/blade.jsdos",
                "/games/bin/windows/tools/tools.zip",
                "/games/bin/windows/images/os/WIN95OSR2_EN_OS.DCD",
                "/games/bin/windows/images/game/BLADE.DCD"
            ],
            optionalFiles: [
                "/games/bin/windows/tools/win95patch.zip",
                "/games/bin/windows/images/disc/BLADE1.DCD",
                "/games/bin/windows/images/disc/BLADE2.DCD",
                "/games/bin/windows/images/disc/BLADE3.DCD",
                "/games/bin/windows/images/disc/BLADE4.DCD"
            ]
        },
        {
            id: "army_men",
            title: "Army Men",
            os: "windows",
            osLabel: "Windows 95",
            year: 1999,
            publisher: "The 3DO Company",
            genre: "Action",
            players: "1",
            playUrl: "/play.html?game=army_men",
            configUrl: "/config-army_men.js",
            cover: "/images/games/army_men_cover.webp",
            accent: ["#3f5a4a", "#101c14"],
            description: "3DO's plastic-soldier campaign: Sarge vs the Tan army.",
            files: [
                "/games/armymen.jsdos",
                "/games/bin/windows/tools/tools.zip",
                "/games/bin/windows/images/os/WIN95OSR2_EN_OS.DCD",
                "/games/bin/windows/images/game/ARMYMEN.DCD"
            ],
            optionalFiles: [
                "/games/bin/windows/tools/win95patch.zip",
                "/games/bin/windows/images/disc/ARMYMEN.DCD"
            ]
        },
        {
            id: "army_men2",
            title: "Army Men II",
            os: "windows",
            osLabel: "Windows 95",
            year: 1999,
            publisher: "The 3DO Company",
            genre: "Action",
            players: "1",
            playUrl: "/play.html?game=army_men2",
            configUrl: "/config-army_men2.js",
            cover: "/images/games/army_men2_cover.webp",
            accent: ["#5c3a5c", "#1c101c"],
            description: "The sequel: Sarge returns across real-world and toy-box battlefields.",
            files: [
                "/games/armymen2.jsdos",
                "/games/bin/windows/tools/tools.zip",
                "/games/bin/windows/images/os/WIN95OSR2_EN_OS.DCD",
                "/games/bin/windows/images/game/ARMYMEN2.DCD"
            ],
            optionalFiles: [
                "/games/bin/windows/tools/win95patch.zip",
                "/games/bin/windows/images/disc/ARMYMEN2.DCD"
            ]
        },
        {
            id: "another_world",
            title: "Another World",
            os: "dos",
            osLabel: "DOS",
            year: 1999,
            publisher: "Delphine Software",
            genre: "Cinematic platformer",
            players: "1",
            playUrl: "/play.html?game=another_world",
            configUrl: "/config-another_world.js",
            cover: "/images/games/another_world_cover.webp",
            accent: ["#2f5a5c", "#101c1c"],
            description: "Eric Chahi's cinematic platformer about a physicist stranded on an alien world. DOS game.",
            files: [
                "/games/aworld.jsdos"
            ],
            optionalFiles: [

            ]
        },
        {
            id: "alone_dark3",
            title: "Alone in the Dark 3",
            os: "dos",
            osLabel: "DOS",
            year: 1999,
            publisher: "I-Motion",
            genre: "Survival horror",
            players: "1",
            playUrl: "/play.html?game=alone_dark3",
            configUrl: "/config-alone_dark3.js",
            cover: "/images/games/alone_dark3_cover.webp",
            accent: ["#5c4a2f", "#1c1610"],
            description: "The third Alone in the Dark: a supernatural western mystery. DOS game.",
            files: [
                "/games/aitd3_cd.jsdos"
            ],
            optionalFiles: [

            ]
        },
        {
            id: "age_of_wonders",
            title: "Age of Wonders",
            os: "windows",
            osLabel: "Windows 95",
            year: 1999,
            publisher: "Triumph Studios",
            genre: "Turn-based strategy",
            players: "1",
            playUrl: "/play.html?game=age_of_wonders",
            configUrl: "/config-age_of_wonders.js",
            cover: "/images/games/age_of_wonders_cover.webp",
            accent: ["#4a2f5c", "#16101c"],
            description: "Triumph's fantasy turn-based strategy with twelve races and a sprawling campaign.",
            files: [
                "/games/aow.jsdos",
                "/games/bin/windows/tools/tools.zip",
                "/games/bin/windows/images/os/WIN95OSR2_EN_OS.DCD",
                "/games/bin/windows/images/game/AOW.DCD"
            ],
            optionalFiles: [
                "/games/bin/windows/tools/win95patch.zip",
                "/games/bin/windows/images/disc/AOW.DCD"
            ]
        },
        {
            id: "anno1602",
            title: "1602 A.D.",
            os: "windows",
            osLabel: "Windows 95",
            year: 1999,
            publisher: "SUNFLOWERS",
            genre: "City-building",
            players: "1",
            playUrl: "/play.html?game=anno1602",
            configUrl: "/config-anno1602.js",
            cover: "/images/games/anno1602_cover.webp",
            accent: ["#2f4a5c", "#10161c"],
            description: "The first Anno game: settle islands, trade routes and grow a renaissance colony.",
            files: [
                "/games/1602ad.jsdos",
                "/games/bin/windows/tools/tools.zip",
                "/games/bin/windows/images/os/WIN95OSR2_EN_OS.DCD",
                "/games/bin/windows/images/game/1602AD.DCD"
            ],
            optionalFiles: [
                "/games/bin/windows/tools/win95patch.zip",
                "/games/bin/windows/images/disc/1602AD.DCD"
            ]
        },
        {
            id: "aerobiz_supersonic_cn",
            title: "Aerobiz Supersonic (Chinese)",
            os: "dos",
            osLabel: "DOS",
            year: 1999,
            publisher: "Koei",
            genre: "Business simulation",
            players: "1",
            playUrl: "/play.html?game=aerobiz_supersonic_cn",
            configUrl: "/config-aerobiz_supersonic_cn.js",
            cover: "/images/games/aerobiz_supersonic_cn_cover.webp",
            accent: ["#5c2f3a", "#1c1014"],
            description: "Koei's airline-business simulation (Chinese). DOS game.",
            files: [
                "/games/as2.jsdos"
            ],
            optionalFiles: [

            ]
        },
        {
            id: "afterlife",
            title: "Afterlife",
            os: "dos",
            osLabel: "DOS",
            year: 1999,
            publisher: "LucasArts",
            genre: "Simulation",
            players: "1",
            playUrl: "/play.html?game=afterlife",
            configUrl: "/config-afterlife.js",
            cover: "/images/games/afterlife_cover.webp",
            accent: ["#3a5c2f", "#141c10"],
            description: "LucasArts' heaven-and-hell management sim: build rewards and punishments for souls. DOS game.",
            files: [
                "/games/alife_cd.jsdos"
            ],
            optionalFiles: [

            ]
        },
        {
            id: "mdk2",
            title: "MDK2",
            os: "windows",
            osLabel: "Windows 95",
            year: 1999,
            publisher: "BioWare",
            genre: "Action",
            players: "1",
            playUrl: "/play.html?game=mdk2",
            configUrl: "/config-mdk2.js",
            cover: "/images/games/mdk2_cover.webp",
            accent: ["#5c5a2f", "#1c1c10"],
            description: "BioWare's sequel with three playable heroes (Kurt, Maxi and Dr. Hawkins). Uses 3dfx Voodoo.",
            files: [
                "/games/mdk2.jsdos",
                "/games/bin/windows/tools/tools.zip",
                "/games/bin/windows/images/os/WIN95OSR2_EN_OS.DCD",
                "/games/bin/windows/images/game/MDK2.DCD"
            ],
            optionalFiles: [
                "/games/bin/windows/tools/win95patch.zip",
                "/games/bin/windows/images/disc/MDK2.DCD"
            ]
        },
        {
            id: "ms_casino",
            title: "Microsoft Casino",
            os: "windows",
            osLabel: "Windows 95",
            year: 1999,
            publisher: "Microsoft",
            genre: "Casino",
            players: "1",
            playUrl: "/play.html?game=ms_casino",
            configUrl: "/config-ms_casino.js",
            cover: "/images/games/ms_casino_cover.webp",
            accent: ["#2f3f5c", "#10121c"],
            description: "Microsoft's casino collection with full-motion-video dealers and classic table games.",
            files: [
                "/games/mscasino.jsdos",
                "/games/bin/windows/tools/tools.zip",
                "/games/bin/windows/images/os/WIN95OSR2_EN_OS.DCD",
                "/games/bin/windows/images/game/MSCASINO.DCD"
            ],
            optionalFiles: [
                "/games/bin/windows/tools/win95patch.zip",
                "/games/bin/windows/images/disc/MSCASINO.DCD"
            ]
        },
        {
            id: "lego_chess",
            title: "Lego Chess",
            os: "windows",
            osLabel: "Windows 95",
            year: 1999,
            publisher: "Lego Media",
            genre: "Chess",
            players: "1",
            playUrl: "/play.html?game=lego_chess",
            configUrl: "/config-lego_chess.js",
            cover: "/images/games/lego_chess_cover.webp",
            accent: ["#3a4a6b", "#12161f"],
            description: "Chess with animated LEGO pieces and two story campaigns. Uses 3dfx Voodoo and General MIDI.",
            files: [
                "/games/legochess.jsdos",
                "/games/bin/windows/tools/tools.zip",
                "/games/bin/windows/images/os/WIN95OSR2_EN_OS.DCD",
                "/games/bin/windows/images/game/LEGOCHESS.DCD"
            ],
            optionalFiles: [
                "/games/bin/windows/tools/win95patch.zip",
                "/games/bin/windows/images/disc/LEGOCHESS.DCD"
            ]
        },
        {
            id: "fallout1",
            title: "Fallout",
            os: "dos",
            osLabel: "DOS",
            year: 1999,
            publisher: "Interplay",
            genre: "Role-playing",
            players: "1",
            playUrl: "/play.html?game=fallout1",
            configUrl: "/config-fallout1.js",
            cover: "/images/games/fallout1_cover.webp",
            accent: ["#5a3d2f", "#1c1210"],
            description: "The original post-nuclear role-playing game from the creators of Wasteland. DOS game.",
            files: [
                "/games/fallout_cd.jsdos"
            ],
            optionalFiles: [

            ]
        },
        {
            id: "daikoukai3_cn",
            title: "Daikoukai Jidai III: Costa del Sol (Chinese)",
            os: "windows",
            osLabel: "Windows 95",
            year: 1999,
            publisher: "Koei",
            genre: "Trading simulation",
            players: "1",
            playUrl: "/play.html?game=daikoukai3_cn",
            configUrl: "/config-daikoukai3_cn.js",
            cover: "/images/games/daikoukai3_cn_cover.webp",
            accent: ["#3f5a4a", "#101c14"],
            description: "Koei's Age-of-Discovery trading and adventure sim (Traditional Chinese).",
            files: [
                "/games/uw3cht.jsdos",
                "/games/bin/windows/tools/tools.zip",
                "/games/bin/windows/images/os/WIN95OSR2_CHT_OS.DCD",
                "/games/bin/windows/images/game/UW3.DCD"
            ],
            optionalFiles: [
                "/games/bin/windows/tools/win95patch.zip",
                "/games/bin/windows/images/disc/UW3.DCD"
            ]
        },
        {
            id: "theme_park",
            title: "Theme Park",
            os: "dos",
            osLabel: "DOS",
            year: 1999,
            publisher: "Bullfrog",
            genre: "Simulation",
            players: "1",
            playUrl: "/play.html?game=theme_park",
            configUrl: "/config-theme_park.js",
            cover: "/images/games/theme_park_cover.webp",
            accent: ["#5c3a5c", "#1c101c"],
            description: "Bullfrog's theme-park builder: design rides, hire staff and manage profits. DOS game with General MIDI audio.",
            files: [
                "/games/tp.jsdos"
            ],
            optionalFiles: [

            ]
        },
        {
            id: "dungeon_keeper2",
            title: "Dungeon Keeper 2",
            os: "windows",
            osLabel: "Windows 95",
            year: 1999,
            publisher: "Bullfrog",
            genre: "Strategy",
            players: "1",
            playUrl: "/play.html?game=dungeon_keeper2",
            configUrl: "/config-dungeon_keeper2.js",
            cover: "/images/games/dungeon_keeper2_cover.webp",
            accent: ["#2f5a5c", "#101c1c"],
            description: "Bullfrog's dungeon-management sequel with real-time combat. Uses 3dfx Voodoo.",
            files: [
                "/games/dk2.jsdos",
                "/games/bin/windows/tools/tools.zip",
                "/games/bin/windows/images/os/WIN95OSR2_EN_OS.DCD",
                "/games/bin/windows/images/game/DK2.DCD"
            ],
            optionalFiles: [
                "/games/bin/windows/tools/win95patch.zip",
                "/games/bin/windows/images/disc/DK2.DCD"
            ]
        },
        {
            id: "dungeon_keeper",
            title: "Dungeon Keeper",
            os: "dos",
            osLabel: "DOS",
            year: 1999,
            publisher: "Bullfrog",
            genre: "Strategy",
            players: "1",
            playUrl: "/play.html?game=dungeon_keeper",
            configUrl: "/config-dungeon_keeper.js",
            cover: "/images/games/dungeon_keeper_cover.webp",
            accent: ["#5c4a2f", "#1c1610"],
            description: "Bullfrog's original: dig, build and defend a dungeon against do-gooder heroes. DOS game.",
            files: [
                "/games/dkeeper_cd.jsdos"
            ],
            optionalFiles: [

            ]
        },
        {
            id: "syndicate_wars",
            title: "Syndicate Wars",
            os: "dos",
            osLabel: "DOS",
            year: 1999,
            publisher: "Bullfrog",
            genre: "Real-time tactics",
            players: "1",
            playUrl: "/play.html?game=syndicate_wars",
            configUrl: "/config-syndicate_wars.js",
            cover: "/images/games/syndicate_wars_cover.webp",
            accent: ["#4a2f5c", "#16101c"],
            description: "Bullfrog's cyberpunk squad tactics in a city on the brink. DOS game with General MIDI audio.",
            files: [
                "/games/swars_cd.jsdos"
            ],
            optionalFiles: [

            ]
        },
        {
            id: "planescape_torment",
            title: "Planescape: Torment",
            os: "windows",
            osLabel: "Windows 95",
            year: 1999,
            publisher: "Black Isle Studios",
            genre: "Role-playing",
            players: "1",
            playUrl: "/play.html?game=planescape_torment",
            configUrl: "/config-planescape_torment.js",
            cover: "/images/games/planescape_torment_cover.webp",
            accent: ["#2f4a5c", "#10161c"],
            description: "Black Isle's Infinity-engine RPG: 'What can change the nature of a man?'",
            files: [
                "/games/pst.jsdos",
                "/games/bin/windows/tools/tools.zip",
                "/games/bin/windows/images/os/WIN95OSR2_EN_OS.DCD",
                "/games/bin/windows/images/game/PST.DCD"
            ],
            optionalFiles: [
                "/games/bin/windows/tools/win95patch.zip",
                "/games/bin/windows/images/disc/PST02.DCD",
                "/games/bin/windows/images/disc/PST03.DCD",
                "/games/bin/windows/images/disc/PST04.DCD"
            ]
        },
        {
            id: "baldurs_gate_saga",
            title: "Baldur's Gate: The Original Saga",
            os: "windows",
            osLabel: "Windows 95",
            year: 1999,
            publisher: "BioWare",
            genre: "Role-playing",
            players: "1",
            playUrl: "/play.html?game=baldurs_gate_saga",
            configUrl: "/config-baldurs_gate_saga.js",
            cover: "/images/games/baldurs_gate_saga_cover.webp",
            accent: ["#5c2f3a", "#1c1014"],
            description: "BioWare's Infinity-engine classic plus the Tales of the Sword Coast expansion, on three CDs.",
            files: [
                "/games/bgtos.jsdos",
                "/games/bin/windows/tools/tools.zip",
                "/games/bin/windows/images/os/WIN95OSR2_EN_OS.DCD",
                "/games/bin/windows/images/game/BGTOS.DCD"
            ],
            optionalFiles: [
                "/games/bin/windows/tools/win95patch.zip",
                "/games/bin/windows/images/disc/BGTOS01.DCD",
                "/games/bin/windows/images/disc/BGTOS02.DCD",
                "/games/bin/windows/images/disc/BGTOS03.DCD"
            ]
        },
        {
            id: "richman2_cn",
            title: "Richman 2 (Chinese)",
            os: "dos",
            osLabel: "DOS",
            year: 1993,
            publisher: "Softstar",
            genre: "Board-game simulation",
            players: "1",
            playUrl: "/play.html?game=richman2_cn",
            configUrl: "/config-richman2_cn.js",
            cover: "/images/games/richman2_cn_cover.webp",
            accent: ["#3a4a6b", "#12161f"],
            description: "Softstar's Monopoly-style board game (Chinese). DOS game.",
            files: [
                "/games/rich2.jsdos"
            ],
            optionalFiles: [

            ]
        },
        {
            id: "richman3_cn",
            title: "Richman 3 (Chinese)",
            os: "dos",
            osLabel: "DOS",
            year: 1996,
            publisher: "Softstar",
            genre: "Board-game simulation",
            players: "1",
            playUrl: "/play.html?game=richman3_cn",
            configUrl: "/config-richman3_cn.js",
            cover: "/images/games/richman3_cn_cover.webp",
            accent: ["#3a4a6b", "#12161f"],
            description: "Softstar's Monopoly-style board game with maps, cards and rivals (Chinese). DOS game.",
            files: [
                "/games/rich3.jsdos"
            ],
            optionalFiles: [

            ]
        },
        {
            id: "sanitarium",
            title: "Sanitarium",
            os: "windows",
            osLabel: "Windows 95",
            year: 1998,
            publisher: "ASC Games",
            genre: "Horror adventure",
            players: "1",
            playUrl: "/play.html?game=sanitarium",
            configUrl: "/config-sanitarium.js",
            cover: "/images/games/sanitarium_cover.webp",
            accent: ["#3a4a6b", "#12161f"],
            description: "DreamForge's psychological horror adventure inside a decaying asylum, across three CDs.",
            files: [
                "/games/sntrm.jsdos",
                "/games/bin/windows/tools/tools.zip",
                "/games/bin/windows/images/os/WIN95OSR2_EN_OS.DCD",
                "/games/bin/windows/images/game/SNTRM.DCD"
            ],
            optionalFiles: [
                "/games/bin/windows/tools/win95patch.zip",
                "/games/bin/windows/images/disc/SNTRM01.DCD",
                "/games/bin/windows/images/disc/SNTRM02.DCD",
                "/games/bin/windows/images/disc/SNTRM03.DCD"
            ]
        },
        {
            id: "sorcerian_forever_cn",
            title: "Sorcerian Forever (Chinese)",
            os: "windows",
            osLabel: "Windows 95",
            year: 1997,
            publisher: "Nihon Falcom",
            genre: "Action RPG",
            players: "1",
            playUrl: "/play.html?game=sorcerian_forever_cn",
            configUrl: "/config-sorcerian_forever_cn.js",
            cover: "/images/games/sorcerian_forever_cn_cover.webp",
            accent: ["#3a4a6b", "#12161f"],
            description: "Falcom's side-scrolling action-RPG sequel (Traditional Chinese).",
            files: [
                "/games/sorfcht.jsdos",
                "/games/bin/windows/tools/tools.zip",
                "/games/bin/windows/images/os/WIN95OSR2_CHT_OS.DCD",
                "/games/bin/windows/images/game/SORFCHT.DCD"
            ],
            optionalFiles: [
                "/games/bin/windows/tools/win95patch.zip",
                "/games/bin/windows/images/disc/SORFCHT.DCD"
            ]
        },
        {
            id: "taikou_risshiden2_cn",
            title: "Taikou Risshiden II (Chinese)",
            os: "windows",
            osLabel: "Windows 95",
            year: 1995,
            publisher: "Koei",
            genre: "Simulation RPG",
            players: "1",
            playUrl: "/play.html?game=taikou_risshiden2_cn",
            configUrl: "/config-taikou_risshiden2_cn.js",
            cover: "/images/games/taikou_risshiden2_cn_cover.webp",
            accent: ["#3a4a6b", "#12161f"],
            description: "The second Taikou Risshiden: serve a daimyo or forge your own path (Chinese).",
            files: [
                "/games/taikou2chs.jsdos",
                "/games/bin/windows/tools/tools.zip",
                "/games/bin/windows/images/os/WIN95OSR2_CHS_OS.DCD",
                "/games/bin/windows/images/game/TAIKOU2CHS.DCD"
            ],
            optionalFiles: [
                "/games/bin/windows/tools/win95patch.zip",
                "/games/bin/windows/images/disc/TAIKOU2CHS.DCD"
            ]
        },
        {
            id: "taikou_risshiden4_cn",
            title: "Taiko Risshiden IV (Chinese)",
            os: "windows",
            osLabel: "Windows 95",
            year: 1999,
            publisher: "Koei",
            genre: "Simulation RPG",
            players: "1",
            playUrl: "/play.html?game=taikou_risshiden4_cn",
            configUrl: "/config-taikou_risshiden4_cn.js",
            cover: "/images/games/taikou_risshiden4_cn_cover.webp",
            accent: ["#3a4a6b", "#12161f"],
            description: "The fourth Taikou Risshiden with eight playable protagonists (Chinese).",
            files: [
                "/games/taikou4cht.jsdos",
                "/games/bin/windows/tools/tools.zip",
                "/games/bin/windows/images/os/WIN95OSR2_CHT_OS.DCD",
                "/games/bin/windows/images/game/TAIKOU4CHT.DCD"
            ],
            optionalFiles: [
                "/games/bin/windows/tools/win95patch.zip",
                "/games/bin/windows/images/disc/TAIKOU4CHT.DCD"
            ]
        },
        {
            id: "taikou_risshiden1_cn",
            title: "Taikō Risshiden (Chinese)",
            os: "dos",
            osLabel: "DOS",
            year: 1992,
            publisher: "Koei",
            genre: "Simulation RPG",
            players: "1",
            playUrl: "/play.html?game=taikou_risshiden1_cn",
            configUrl: "/config-taikou_risshiden1_cn.js",
            cover: "/images/games/taikou_risshiden1_cn_cover.webp",
            accent: ["#3a4a6b", "#12161f"],
            description: "Koei's Sengoku simulation RPG about rising from peasant to regent (Chinese). DOS game.",
            files: [
                "/games/taiko.jsdos"
            ],
            optionalFiles: [

            ]
        },
        {
            id: "taikou_risshiden3_cn",
            title: "Taikou Risshiden III (Chinese)",
            os: "windows",
            osLabel: "Windows 95",
            year: 1997,
            publisher: "Koei",
            genre: "Simulation RPG",
            players: "1",
            playUrl: "/play.html?game=taikou_risshiden3_cn",
            configUrl: "/config-taikou_risshiden3_cn.js",
            cover: "/images/games/taikou_risshiden3_cn_cover.webp",
            accent: ["#3a4a6b", "#12161f"],
            description: "The third Taikou Risshiden, set in the wars of Hideyoshi's era (Chinese).",
            files: [
                "/games/taikou3chs.jsdos",
                "/games/bin/windows/tools/tools.zip",
                "/games/bin/windows/images/os/WIN95OSR2_CHS_OS.DCD",
                "/games/bin/windows/images/game/TAIKOU3CHS.DCD"
            ],
            optionalFiles: [
                "/games/bin/windows/tools/win95patch.zip",
                "/games/bin/windows/images/disc/TAIKOU3CHS.DCD"
            ]
        },
        {
            id: "city_of_lost_children",
            title: "The City of Lost Children",
            os: "dos",
            osLabel: "DOS",
            year: 1997,
            publisher: "Psygnosis",
            genre: "Adventure",
            players: "1",
            playUrl: "/play.html?game=city_of_lost_children",
            configUrl: "/config-city_of_lost_children.js",
            cover: "/images/games/city_of_lost_children_cover.webp",
            accent: ["#3a4a6b", "#12161f"],
            description: "Psygnosis' adventure based on the Jeunet & Caro film. DOS game.",
            files: [
                "/games/colc_cd.jsdos"
            ],
            optionalFiles: [

            ]
        },
        {
            id: "hilarious_3kingdoms_cn",
            title: "The Hilarious Three Kingdoms (Chinese)",
            os: "dos",
            osLabel: "DOS",
            year: 1996,
            publisher: "Unknown",
            genre: "Strategy",
            players: "1",
            playUrl: "/play.html?game=hilarious_3kingdoms_cn",
            configUrl: "/config-hilarious_3kingdoms_cn.js",
            cover: "/images/games/hilarious_3kingdoms_cn_cover.webp",
            accent: ["#3a4a6b", "#12161f"],
            description: "Comedy take on the Romance of the Three Kingdoms (Chinese). DOS game.",
            files: [
                "/games/bxsg.jsdos"
            ],
            optionalFiles: [

            ]
        },
        {
            id: "incredible_machine2",
            title: "The Incredible Machine 2",
            os: "dos",
            osLabel: "DOS",
            year: 1994,
            publisher: "Sierra",
            genre: "Puzzle",
            players: "1",
            playUrl: "/play.html?game=incredible_machine2",
            configUrl: "/config-incredible_machine2.js",
            cover: "/images/games/incredible_machine2_cover.webp",
            accent: ["#3a4a6b", "#12161f"],
            description: "Sierra's Rube Goldberg contraption puzzler. DOS game with General MIDI audio.",
            files: [
                "/games/tim2.jsdos"
            ],
            optionalFiles: [

            ]
        },
        {
            id: "lord_of_beast_cn",
            title: "The Lord of the Beast: Chronicle of Amadis (Chinese)",
            os: "windows",
            osLabel: "Windows 95",
            year: 1998,
            publisher: "Unknown",
            genre: "Strategy RPG",
            players: "1",
            playUrl: "/play.html?game=lord_of_beast_cn",
            configUrl: "/config-lord_of_beast_cn.js",
            cover: "/images/games/lord_of_beast_cn_cover.webp",
            accent: ["#3a4a6b", "#12161f"],
            description: "Chinese fantasy strategy-RPG: Chronicle of Amadis (Traditional Chinese).",
            files: [
                "/games/lob.jsdos",
                "/games/bin/windows/tools/tools.zip",
                "/games/bin/windows/images/os/WIN95OSR2_CHT_OS.DCD",
                "/games/bin/windows/images/game/LOB.DCD"
            ],
            optionalFiles: [
                "/games/bin/windows/tools/win95patch.zip",
                "/games/bin/windows/images/disc/LOB.DCD"
            ]
        },
        {
            id: "lost_vikings",
            title: "The Lost Vikings",
            os: "dos",
            osLabel: "DOS",
            year: 1993,
            publisher: "Blizzard",
            genre: "Puzzle platformer",
            players: "1",
            playUrl: "/play.html?game=lost_vikings",
            configUrl: "/config-lost_vikings.js",
            cover: "/images/games/lost_vikings_cover.webp",
            accent: ["#3a4a6b", "#12161f"],
            description: "Blizzard's (then Silicon & Synapse) puzzle-platformer guiding three vikings home. DOS game.",
            files: [
                "/games/lostvik.jsdos"
            ],
            optionalFiles: [

            ]
        },
        {
            id: "millionaire_3kingdoms2_cn",
            title: "The Millionaire of 3 Kingdoms 2 (Chinese)",
            os: "dos",
            osLabel: "DOS",
            year: 1996,
            publisher: "Unknown",
            genre: "Board-game simulation",
            players: "1",
            playUrl: "/play.html?game=millionaire_3kingdoms2_cn",
            configUrl: "/config-millionaire_3kingdoms2_cn.js",
            cover: "/images/games/millionaire_3kingdoms2_cn_cover.webp",
            accent: ["#3a4a6b", "#12161f"],
            description: "Board-game strategy set in the Three Kingdoms era (Chinese). DOS game.",
            files: [
                "/games/mk2.jsdos"
            ],
            optionalFiles: [

            ]
        },
        {
            id: "typing_of_the_dead",
            title: "The Typing of the Dead",
            os: "windows",
            osLabel: "Windows 95",
            year: 2000,
            publisher: "Sega",
            genre: "Typing game",
            players: "1",
            playUrl: "/play.html?game=typing_of_the_dead",
            configUrl: "/config-typing_of_the_dead.js",
            cover: "/images/games/typing_of_the_dead_cover.webp",
            accent: ["#3a4a6b", "#12161f"],
            description: "Sega's zombie shooter where the gun is your keyboard. Uses 3dfx Voodoo.",
            files: [
                "/games/totd.jsdos",
                "/games/bin/windows/tools/tools.zip",
                "/games/bin/windows/images/os/WIN95OSR2_EN_OS.DCD",
                "/games/bin/windows/images/game/TOTD.DCD"
            ],
            optionalFiles: [
                "/games/bin/windows/tools/win95patch.zip",
                "/games/bin/windows/images/disc/TOTD.DCD"
            ]
        },
        {
            id: "theme_hospital_cn",
            title: "Theme Hospital (Chinese)",
            os: "dos",
            osLabel: "DOS",
            year: 1997,
            publisher: "Bullfrog",
            genre: "Simulation",
            players: "1",
            playUrl: "/play.html?game=theme_hospital_cn",
            configUrl: "/config-theme_hospital_cn.js",
            cover: "/images/games/theme_hospital_cn_cover.webp",
            accent: ["#3a4a6b", "#12161f"],
            description: "Bullfrog's comedic hospital-management sim (Chinese). DOS game with General MIDI audio.",
            files: [
                "/games/thcn_cd.jsdos"
            ],
            optionalFiles: [

            ]
        },
        {
            id: "time_commando",
            title: "Time Commando",
            os: "dos",
            osLabel: "DOS",
            year: 1996,
            publisher: "Activision",
            genre: "Action",
            players: "1",
            playUrl: "/play.html?game=time_commando",
            configUrl: "/config-time_commando.js",
            cover: "/images/games/time_commando_cover.webp",
            accent: ["#3a4a6b", "#12161f"],
            description: "Adeline's time-travelling martial-arts action game. DOS game with General MIDI audio.",
            files: [
                "/games/timecomm_cd.jsdos"
            ],
            optionalFiles: [

            ]
        },
        {
            id: "tokimeki_memorial_cn",
            title: "Tokimeki Memorial: Forever with You (Chinese)",
            os: "windows",
            osLabel: "Windows 95",
            year: 1996,
            publisher: "Konami",
            genre: "Dating sim",
            players: "1",
            playUrl: "/play.html?game=tokimeki_memorial_cn",
            configUrl: "/config-tokimeki_memorial_cn.js",
            cover: "/images/games/tokimeki_memorial_cn_cover.webp",
            accent: ["#3a4a6b", "#12161f"],
            description: "Konami's classic dating sim, Forever with You (Traditional Chinese), General MIDI audio.",
            files: [
                "/games/tmfwycht.jsdos",
                "/games/bin/windows/tools/tools.zip",
                "/games/bin/windows/images/os/WIN95OSR2_CHT_OS.DCD",
                "/games/bin/windows/images/game/TMFWYCHT.DCD"
            ],
            optionalFiles: [
                "/games/bin/windows/tools/win95patch.zip",
                "/games/bin/windows/images/disc/TMFWYCHT.DCD"
            ]
        },
        {
            id: "tun_town",
            title: "Tun Town",
            os: "dos",
            osLabel: "DOS",
            year: 1996,
            publisher: "Unknown",
            genre: "Simulation",
            players: "1",
            playUrl: "/play.html?game=tun_town",
            configUrl: "/config-tun_town.js",
            cover: "/images/games/tun_town_cover.webp",
            accent: ["#3a4a6b", "#12161f"],
            description: "Taiwanese DOS game (Chinese), on two discs, General MIDI audio.",
            files: [
                "/games/tt_cd.jsdos"
            ],
            optionalFiles: [

            ]
        },
        {
            id: "tyrian2000",
            title: "Tyrian 2000",
            os: "dos",
            osLabel: "DOS",
            year: 1999,
            publisher: "Eclipse Software",
            genre: "Shoot 'em up",
            players: "1",
            playUrl: "/play.html?game=tyrian2000",
            configUrl: "/config-tyrian2000.js",
            cover: "/images/games/tyrian2000_cover.webp",
            accent: ["#3a4a6b", "#12161f"],
            description: "Eclipse Software's vertical shooter, the Tyrian 2000 release. DOS game with General MIDI audio.",
            files: [
                "/games/t2k_cd.jsdos"
            ],
            optionalFiles: [

            ]
        },
        {
            id: "uw4_puk_cn",
            title: "Uncharted Waters IV: Porto Estado - Power Up Kit (Chinese)",
            os: "windows",
            osLabel: "Windows 95",
            year: 2000,
            publisher: "Koei",
            genre: "Trading simulation",
            players: "1",
            playUrl: "/play.html?game=uw4_puk_cn",
            configUrl: "/config-uw4_puk_cn.js",
            cover: "/images/games/uw4_puk_cn_cover.webp",
            accent: ["#3a4a6b", "#12161f"],
            description: "Uncharted Waters IV with the Power-Up Kit (Traditional Chinese).",
            files: [
                "/games/uw4pukcht.jsdos",
                "/games/bin/windows/tools/tools.zip",
                "/games/bin/windows/images/os/WIN95OSR2_CHT_OS.DCD",
                "/games/bin/windows/images/game/UW4PUKCHT.DCD"
            ],
            optionalFiles: [
                "/games/bin/windows/tools/win95patch.zip",
                "/games/bin/windows/images/disc/UW4PUKCHT.DCD"
            ]
        },
        {
            id: "uw2_en",
            title: "Uncharted Waters: New Horizons",
            os: "dos",
            osLabel: "DOS",
            year: 1994,
            publisher: "Koei",
            genre: "RPG/Adventure",
            players: "1",
            playUrl: "/play.html?game=uw2_en",
            configUrl: "/config-uw2_en.js",
            cover: "/images/games/uw2_en_cover.webp",
            accent: ["#3a4a6b", "#12161f"],
            description: "Uncharted Waters II: New Horizons - trade, explore and duel across the seas. DOS game.",
            files: [
                "/games/uw2en.jsdos"
            ],
            optionalFiles: [

            ]
        },
        {
            id: "vandal_hearts",
            title: "Vandal Hearts",
            os: "windows",
            osLabel: "Windows 95",
            year: 1997,
            publisher: "Konami",
            genre: "Tactical RPG",
            players: "1",
            playUrl: "/play.html?game=vandal_hearts",
            configUrl: "/config-vandal_hearts.js",
            cover: "/images/games/vandal_hearts_cover.webp",
            accent: ["#3a4a6b", "#12161f"],
            description: "Konami's grid-based tactical RPG (Japanese release). Uses 3dfx Voodoo and General MIDI.",
            files: [
                "/games/vandal.jsdos",
                "/games/bin/windows/tools/tools.zip",
                "/games/bin/windows/images/os/WIN95OSR2_JP_OS.DCD",
                "/games/bin/windows/images/game/VANDAL.DCD"
            ],
            optionalFiles: [
                "/games/bin/windows/tools/win95patch.zip",
                "/games/bin/windows/images/disc/VANDAL.DCD"
            ]
        },
        {
            id: "vandal_hearts_cn",
            title: "Vandal Hearts (Chinese)",
            os: "windows",
            osLabel: "Windows 95",
            year: 1997,
            publisher: "Konami",
            genre: "Tactical RPG",
            players: "1",
            playUrl: "/play.html?game=vandal_hearts_cn",
            configUrl: "/config-vandal_hearts_cn.js",
            cover: "/images/games/vandal_hearts_cn_cover.webp",
            accent: ["#3a4a6b", "#12161f"],
            description: "Konami's grid-based tactical RPG (Traditional Chinese). Uses 3dfx Voodoo and General MIDI.",
            files: [
                "/games/vandalcht.jsdos",
                "/games/bin/windows/tools/tools.zip",
                "/games/bin/windows/images/os/WIN95OSR2_CHT_OS.DCD",
                "/games/bin/windows/images/game/VANDALCHT.DCD"
            ],
            optionalFiles: [
                "/games/bin/windows/tools/win95patch.zip",
                "/games/bin/windows/images/disc/VANDALCHT.DCD"
            ]
        },
        {
            id: "warhammer_dark_omen",
            title: "Warhammer: Dark Omen",
            os: "windows",
            osLabel: "Windows 95",
            year: 1998,
            publisher: "Mindscape",
            genre: "Real-time tactics",
            players: "1",
            playUrl: "/play.html?game=warhammer_dark_omen",
            configUrl: "/config-warhammer_dark_omen.js",
            cover: "/images/games/warhammer_dark_omen_cover.webp",
            accent: ["#3a4a6b", "#12161f"],
            description: "Real-time tactics in the Warhammer world, sequel to Shadow of the Horned Rat. Uses 3dfx Voodoo.",
            files: [
                "/games/whdo.jsdos",
                "/games/bin/windows/tools/tools.zip",
                "/games/bin/windows/images/os/WIN95OSR2_EN_OS.DCD",
                "/games/bin/windows/images/game/WHDO.DCD"
            ],
            optionalFiles: [
                "/games/bin/windows/tools/win95patch.zip",
                "/games/bin/windows/images/disc/WHDO.DCD"
            ]
        },
        {
            id: "millionaire_3kingdoms_cn",
            title: "The Millionaire of 3 Kingdoms (Chinese)",
            os: "dos",
            osLabel: "DOS",
            year: 1994,
            publisher: "Unknown",
            genre: "Board-game simulation",
            players: "1",
            playUrl: "/play.html?game=millionaire_3kingdoms_cn",
            configUrl: "/config-millionaire_3kingdoms_cn.js",
            cover: "/images/games/millionaire_3kingdoms_cn_cover.webp",
            accent: ["#3a4a6b", "#12161f"],
            description: "Board-game strategy set in the Three Kingdoms era (Chinese). DOS game.",
            files: [
                "/games/mk.jsdos"
            ],
            optionalFiles: [

            ]
        },
    ]
};

// localStorage key used for the "Recently played" ordering.
window.LOCAL_HISTORY_KEY = "local_recently_played";

