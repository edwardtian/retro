#!/usr/bin/env python3
import json, html

cfg = json.load(open('dl/games_config.json'))
PWD = b"You're so talented!"

def clean(t):
    t = html.unescape(t)
    return t

# Metadata pulled from the existing catalog.js placeholder entries.
META = {
 "commandos_bel": dict(osLabel="Windows 95", year=1998, publisher="Eidos Interactive", genre="Real-time tactics",
    accent=["#4b5d3a", "#141b10"],
    description="Pyro Studios' squad-based tactics game: infiltrate, sabotage and get out alive. Runs on a Windows 95 image inside DOSBox-X compiled to WebAssembly."),
 "settlers3_gold": dict(osLabel="Windows 98", year=1999, publisher="Blue Byte", genre="Strategy",
    accent=["#3f5a7a", "#101a26"],
    description="Blue Byte's build-and-expand economy strategy game with the Gold Edition content, on a Windows image inside DOSBox-X."),
 "age_of_empires": dict(osLabel="Windows 95", year=1997, publisher="Microsoft", genre="Real-time strategy",
    accent=["#6b5a2f", "#1d1810"],
    description="Ensemble Studios' historical real-time strategy game, from Stone Age to Iron Age, on a Windows 95 image."),
 "red_alert_2": dict(osLabel="Windows 98", year=2000, publisher="Electronic Arts", genre="Real-time strategy",
    accent=["#7a2b2b", "#200d0d"],
    description="Westwood's fast, campy alternate-history RTS with the full Soviet and Allied campaigns."),
 "simcity_3000": dict(osLabel="Windows 98", year=1999, publisher="Electronic Arts", genre="City-building",
    accent=["#2f6b6b", "#0d1f1f"],
    description="Maxis' city simulator: zone, budget, negotiate with neighbours and keep the citizens happy."),
 "yuris_revenge": dict(osLabel="Windows 98", year=2001, publisher="Electronic Arts", genre="Real-time strategy",
    accent=["#5a2f6b", "#170d1d"],
    description="The Red Alert 2 expansion: a third faction, new campaigns and the full original game."),
 "rct_deluxe": dict(osLabel="Windows 98", year=1999, publisher="Hasbro Interactive", genre="Simulation",
    accent=["#2f6b3a", "#0d1d10"],
    description="Chris Sawyer's amusement-park builder with the Loopy Landscapes and Corkscrew Follies parks."),
 "diablo2_lod": dict(osLabel="Windows 98", year=2001, publisher="Blizzard Entertainment", genre="Action RPG",
    accent=["#6b2f2f", "#1a0d0d"],
    description="Blizzard's action RPG with the Lord of Destruction expansion: Act V, two new classes, more loot."),
 "red_alert": dict(osLabel="Windows 95", year=1996, publisher="Westwood Studios", genre="Real-time strategy",
    accent=["#6b3a2f", "#1c0f0c"],
    description="The original alternate-history RTS - Allied and Soviet campaigns, plus the Counterstrike and Aftermath missions."),
 "populous_beginning": dict(osLabel="Windows 95", year=1998, publisher="Electronic Arts", genre="Strategy",
    accent=["#3a2f6b", "#110d1d"],
    description="Bullfrog's 3D god game: shape the land, convert the tribes and wipe out your rivals. Uses 3dfx Voodoo emulation."),
 "aoe2_kings": dict(osLabel="Windows 95", year=1999, publisher="Microsoft", genre="Real-time strategy",
    accent=["#5a3d2f", "#1c1210"],
    description="Ensemble Studios' medieval real-time strategy sequel: 13 civilisations, five campaigns and random-map skirmish."),
 "worms2": dict(osLabel="Windows 95", year=1997, publisher="Team17", genre="Artillery strategy",
    accent=["#2f5a4a", "#101c18"],
    description="Team17's turn-based artillery game: up to 16 teams of worms in destructible 2D battlefields."),
 "fallout2": dict(osLabel="Windows 95", year=1998, publisher="Interplay", genre="Role-playing",
    accent=["#3f4d5c", "#12161c"],
    description="Black Isle's post-apocalyptic role-playing sequel set across the ruins of the west coast."),
 "caesar3": dict(osLabel="Windows 95", year=1998, publisher="Sierra", genre="City-building",
    accent=["#6b4a2f", "#1d1410"],
    description="Impressions' Roman city-builder: manage plebs, patricians, trade, temples and the Emperor's demands."),
 "dune2000": dict(osLabel="Windows 95", year=1998, publisher="Westwood Studios", genre="Real-time strategy",
    accent=["#6b5a2f", "#1c1810"],
    description="Westwood's Dune real-time strategy remake: harvest spice, build armies and fight the Harkonnen."),
 "panzer_general2": dict(osLabel="Windows 95", year=1997, publisher="Strategic Simulations", genre="Strategy",
    accent=["#3f5a3a", "#101c10"],
    description="SSI's turn-based WWII operational wargame across the European and Mediterranean theatres."),
 "myst": dict(osLabel="Windows 95", year=1993, publisher="Broderbund", genre="Adventure",
    accent=["#2f4a5c", "#10161c"],
    description="Cyan's landmark graphic adventure: explore the island of Myst and the Ages linked by its books."),
 "myst_masterpiece": dict(osLabel="Windows 95", year=2000, publisher="Broderbund", genre="Adventure",
    accent=["#2f3f5c", "#10121c"],
    description="The remastered Myst with enhanced 24-bit graphics and smoother QuickTime video."),
 "heart_of_darkness": dict(osLabel="Windows 95", year=1998, publisher="Interplay", genre="Platformer",
    accent=["#3a2f5c", "#12101c"],
    description="Amazing Studio's cinematic platformer: a boy chases his dog into a shadowy world of animated menace."),
 "riven": dict(osLabel="Windows 95", year=1997, publisher="Red Orb Entertainment", genre="Adventure",
    accent=["#2f5c4a", "#101c14"],
    description="The Myst sequel spanning five CDs: solve the puzzle of Riven to free Atrus' wife Catherine."),
 "realmyst": dict(osLabel="Windows 95", year=2000, publisher="UbiSoft", genre="Adventure",
    accent=["#2f4a5c", "#10161c"],
    description="Myst rebuilt as a free-roaming 3D world (3dfx Voodoo), keeping all the original puzzles."),
 "colonization": dict(osLabel="DOS", year=1994, publisher="MicroProse", genre="Strategy",
    accent=["#4a3f2f", "#181410"],
    description="Sid Meier's classic: lead European colonists to the New World, trade and fight for independence. DOS game."),
 "uncharted_waters2_cn": dict(osLabel="DOS", year=1994, publisher="Koei", genre="RPG/Adventure",
    accent=["#2f4a5c", "#10161c"],
    description="Koei's seafaring RPG (Chinese): trade, explore, and chart a path across the age of exploration. DOS game."),
 "bistro2": dict(osLabel="Windows 95", year=1998, publisher="?", genre="Simulation",
    accent=["#5c3a2f", "#1c1210"],
    description="A restaurant-management simulation (Traditional Chinese release) on a Windows 95 image."),
 "warcraft2_tides": dict(osLabel="DOS", year=1995, publisher="Blizzard", genre="Real-time strategy",
    accent=["#2f3f5c", "#10121c"],
    description="Blizzard's orc-vs-human RTS that defined the genre. DOS game, General MIDI audio."),
 "warcraft2_beyond": dict(osLabel="DOS", year=1996, publisher="Blizzard", genre="Real-time strategy",
    accent=["#3a2f5c", "#12101c"],
    description="The Warcraft II expansion: the Alliance strikes into the Dark Portal. DOS game, General MIDI audio."),
 "pharaoh_cleopatra": dict(osLabel="Windows 95", year=2000, publisher="Sierra", genre="City-building",
    accent=["#6b5a2f", "#1d1810"],
    description="Impressions' Egyptian city-builder with the Cleopatra expansion: build monuments and manage the Nile."),
 "cnc_tiberian_dawn": dict(osLabel="DOS", year=1995, publisher="Westwood Studios", genre="Real-time strategy",
    accent=["#5c2f2f", "#1c1010"],
    description="The original Command & Conquer: GDI vs NOD in the Tiberium conflict, on two mission discs."),
 "theme_hospital": dict(osLabel="DOS", year=1997, publisher="Bullfrog", genre="Simulation",
    accent=["#2f5c5c", "#101c1c"],
    description="Bullfrog's comedic hospital-management sim: cure odd diseases, keep patients alive and profits up. General MIDI audio."),
}
DOS_GAMES = {g['id'] for g in json.load(open('dl/games_config.json')) if g.get('bundle_cat') == 'dos' or g.get('os') == '0'}

# Batch 6 additions (auto-inserted).
META.update({
 "bistro_taiwan": dict(osLabel="DOS" if "bistro_taiwan" in DOS_GAMES else "Windows 95", year=1999, publisher="Unknown", genre="Simulation",
    accent=['#3a4a6b', '#12161f'],
    description="Traditional-Chinese restaurant-management sim running on a Windows 95 image."),
 "transport_tycoon_deluxe": dict(osLabel="DOS" if "transport_tycoon_deluxe" in DOS_GAMES else "Windows 95", year=1999, publisher="MicroProse", genre="Strategy",
    accent=['#5a3d2f', '#1c1210'],
    description="Chris Sawyer's transport empire sim: rail, road, sea and air. DOS game with General MIDI audio."),
 "railroad_tycoon2_platinum": dict(osLabel="DOS" if "railroad_tycoon2_platinum" in DOS_GAMES else "Windows 95", year=1999, publisher="PopTop Software", genre="Strategy",
    accent=['#3f5a4a', '#101c14'],
    description="PopTop's railroad empire builder, with the Platinum edition's campaigns and map editor."),
 "capitalism_plus": dict(osLabel="DOS" if "capitalism_plus" in DOS_GAMES else "Windows 95", year=1999, publisher="Interactive Magic", genre="Business simulation",
    accent=['#5c3a5c', '#1c101c'],
    description="Brightstar's deep business sim: build retail, farming and industrial empires against rival CEOs. DOS game."),
 "sm_gettysburg": dict(osLabel="DOS" if "sm_gettysburg" in DOS_GAMES else "Windows 95", year=1999, publisher="Firaxis", genre="Wargame",
    accent=['#2f5a5c', '#101c1c'],
    description="Firaxis' real-time Civil War wargame refighting the battle of Gettysburg."),
 "silent_hunter_ce": dict(osLabel="DOS" if "silent_hunter_ce" in DOS_GAMES else "Windows 95", year=1999, publisher="Strategic Simulations", genre="Submarine simulator",
    accent=['#5c4a2f', '#1c1610'],
    description="SSI's WWII U-boat simulator, Commander's Edition. DOS game."),
 "smac": dict(osLabel="DOS" if "smac" in DOS_GAMES else "Windows 95", year=1999, publisher="Firaxis", genre="4X strategy",
    accent=['#4a2f5c', '#16101c'],
    description="Sid Meier's sci-fi 4X: seven factions colonise Planet after the Unity mission fails."),
 "smac_xf": dict(osLabel="DOS" if "smac_xf" in DOS_GAMES else "Windows 95", year=1999, publisher="Firaxis", genre="4X strategy",
    accent=['#2f4a5c', '#10161c'],
    description="The Alpha Centauri expansion: seven new factions, new technologies and story events."),
 "simcity2000": dict(osLabel="DOS" if "simcity2000" in DOS_GAMES else "Windows 95", year=1999, publisher="Maxis", genre="City-building",
    accent=['#5c2f3a', '#1c1014'],
    description="Maxis' classic city simulator. DOS game with General MIDI audio."),
 "sub_culture": dict(osLabel="DOS" if "sub_culture" in DOS_GAMES else "Windows 95", year=1999, publisher="Digital Image Design", genre="Action",
    accent=['#3a5c2f', '#141c10'],
    description="Digital Image Design's underwater action game piloting a tiny sub. Uses 3dfx Voodoo."),
 "civ2_tot": dict(osLabel="DOS" if "civ2_tot" in DOS_GAMES else "Windows 95", year=1999, publisher="MicroProse", genre="4X strategy",
    accent=['#5c5a2f', '#1c1c10'],
    description="The reimagined Civilization II, with fantasy and science-fiction extended campaigns."),
 "civ2_mpgold": dict(osLabel="DOS" if "civ2_mpgold" in DOS_GAMES else "Windows 95", year=1999, publisher="MicroProse", genre="4X strategy",
    accent=['#2f3f5c', '#10121c'],
    description="Civilization II with multiplayer plus the Conflicts in Civilization scenario pack."),
 "colonial_plan_cn": dict(osLabel="DOS" if "colonial_plan_cn" in DOS_GAMES else "Windows 95", year=1999, publisher="Unknown", genre="Strategy",
    accent=['#3a4a6b', '#12161f'],
    description="Taiwanese-Chinese DOS strategy game; General MIDI audio."),
 "blade_runner": dict(osLabel="DOS" if "blade_runner" in DOS_GAMES else "Windows 95", year=1999, publisher="Westwood Studios", genre="Adventure",
    accent=['#5a3d2f', '#1c1210'],
    description="Westwood's noir adventure across four CDs, with a branching detective story."),
 "army_men": dict(osLabel="DOS" if "army_men" in DOS_GAMES else "Windows 95", year=1999, publisher="The 3DO Company", genre="Action",
    accent=['#3f5a4a', '#101c14'],
    description="3DO's plastic-soldier campaign: Sarge vs the Tan army."),
 "army_men2": dict(osLabel="DOS" if "army_men2" in DOS_GAMES else "Windows 95", year=1999, publisher="The 3DO Company", genre="Action",
    accent=['#5c3a5c', '#1c101c'],
    description="The sequel: Sarge returns across real-world and toy-box battlefields."),
 "another_world": dict(osLabel="DOS" if "another_world" in DOS_GAMES else "Windows 95", year=1999, publisher="Delphine Software", genre="Cinematic platformer",
    accent=['#2f5a5c', '#101c1c'],
    description="Eric Chahi's cinematic platformer about a physicist stranded on an alien world. DOS game."),
 "alone_dark3": dict(osLabel="DOS" if "alone_dark3" in DOS_GAMES else "Windows 95", year=1999, publisher="I-Motion", genre="Survival horror",
    accent=['#5c4a2f', '#1c1610'],
    description="The third Alone in the Dark: a supernatural western mystery. DOS game."),
 "age_of_wonders": dict(osLabel="DOS" if "age_of_wonders" in DOS_GAMES else "Windows 95", year=1999, publisher="Triumph Studios", genre="Turn-based strategy",
    accent=['#4a2f5c', '#16101c'],
    description="Triumph's fantasy turn-based strategy with twelve races and a sprawling campaign."),
 "anno1602": dict(osLabel="DOS" if "anno1602" in DOS_GAMES else "Windows 95", year=1999, publisher="SUNFLOWERS", genre="City-building",
    accent=['#2f4a5c', '#10161c'],
    description="The first Anno game: settle islands, trade routes and grow a renaissance colony."),
 "aerobiz_supersonic_cn": dict(osLabel="DOS" if "aerobiz_supersonic_cn" in DOS_GAMES else "Windows 95", year=1999, publisher="Koei", genre="Business simulation",
    accent=['#5c2f3a', '#1c1014'],
    description="Koei's airline-business simulation (Chinese). DOS game."),
 "afterlife": dict(osLabel="DOS" if "afterlife" in DOS_GAMES else "Windows 95", year=1999, publisher="LucasArts", genre="Simulation",
    accent=['#3a5c2f', '#141c10'],
    description="LucasArts' heaven-and-hell management sim: build rewards and punishments for souls. DOS game."),
 "mdk2": dict(osLabel="DOS" if "mdk2" in DOS_GAMES else "Windows 95", year=1999, publisher="BioWare", genre="Action",
    accent=['#5c5a2f', '#1c1c10'],
    description="BioWare's sequel with three playable heroes (Kurt, Maxi and Dr. Hawkins). Uses 3dfx Voodoo."),
 "ms_casino": dict(osLabel="DOS" if "ms_casino" in DOS_GAMES else "Windows 95", year=1999, publisher="Microsoft", genre="Casino",
    accent=['#2f3f5c', '#10121c'],
    description="Microsoft's casino collection with full-motion-video dealers and classic table games."),
 "lego_chess": dict(osLabel="DOS" if "lego_chess" in DOS_GAMES else "Windows 95", year=1999, publisher="Lego Media", genre="Chess",
    accent=['#3a4a6b', '#12161f'],
    description="Chess with animated LEGO pieces and two story campaigns. Uses 3dfx Voodoo and General MIDI."),
 "fallout1": dict(osLabel="DOS" if "fallout1" in DOS_GAMES else "Windows 95", year=1999, publisher="Interplay", genre="Role-playing",
    accent=['#5a3d2f', '#1c1210'],
    description="The original post-nuclear role-playing game from the creators of Wasteland. DOS game."),
 "daikoukai3_cn": dict(osLabel="DOS" if "daikoukai3_cn" in DOS_GAMES else "Windows 95", year=1999, publisher="Koei", genre="Trading simulation",
    accent=['#3f5a4a', '#101c14'],
    description="Koei's Age-of-Discovery trading and adventure sim (Traditional Chinese)."),
 "theme_park": dict(osLabel="DOS" if "theme_park" in DOS_GAMES else "Windows 95", year=1999, publisher="Bullfrog", genre="Simulation",
    accent=['#5c3a5c', '#1c101c'],
    description="Bullfrog's theme-park builder: design rides, hire staff and manage profits. DOS game with General MIDI audio."),
 "dungeon_keeper2": dict(osLabel="DOS" if "dungeon_keeper2" in DOS_GAMES else "Windows 95", year=1999, publisher="Bullfrog", genre="Strategy",
    accent=['#2f5a5c', '#101c1c'],
    description="Bullfrog's dungeon-management sequel with real-time combat. Uses 3dfx Voodoo."),
 "dungeon_keeper": dict(osLabel="DOS" if "dungeon_keeper" in DOS_GAMES else "Windows 95", year=1999, publisher="Bullfrog", genre="Strategy",
    accent=['#5c4a2f', '#1c1610'],
    description="Bullfrog's original: dig, build and defend a dungeon against do-gooder heroes. DOS game."),
 "syndicate_wars": dict(osLabel="DOS" if "syndicate_wars" in DOS_GAMES else "Windows 95", year=1999, publisher="Bullfrog", genre="Real-time tactics",
    accent=['#4a2f5c', '#16101c'],
    description="Bullfrog's cyberpunk squad tactics in a city on the brink. DOS game with General MIDI audio."),
 "planescape_torment": dict(osLabel="DOS" if "planescape_torment" in DOS_GAMES else "Windows 95", year=1999, publisher="Black Isle Studios", genre="Role-playing",
    accent=['#2f4a5c', '#10161c'],
    description="Black Isle's Infinity-engine RPG: 'What can change the nature of a man?'"),
 "baldurs_gate_saga": dict(osLabel="DOS" if "baldurs_gate_saga" in DOS_GAMES else "Windows 95", year=1999, publisher="BioWare", genre="Role-playing",
    accent=['#5c2f3a', '#1c1014'],
    description="BioWare's Infinity-engine classic plus the Tales of the Sword Coast expansion, on three CDs."),
})



# Batch 7 additions (auto-inserted).
META.update({
 "richman2_cn": dict(osLabel="DOS" if "richman2_cn" in DOS_GAMES else "Windows 95", year=1993, publisher="Softstar", genre="Board-game simulation",
    accent=["#3a4a6b","#12161f"],
    description="Softstar's Monopoly-style board game (Chinese). DOS game."),
 "richman3_cn": dict(osLabel="DOS" if "richman3_cn" in DOS_GAMES else "Windows 95", year=1996, publisher="Softstar", genre="Board-game simulation",
    accent=["#3a4a6b","#12161f"],
    description="Softstar's Monopoly-style board game with maps, cards and rivals (Chinese). DOS game."),
 "sanitarium": dict(osLabel="DOS" if "sanitarium" in DOS_GAMES else "Windows 95", year=1998, publisher="ASC Games", genre="Horror adventure",
    accent=["#3a4a6b","#12161f"],
    description="DreamForge's psychological horror adventure inside a decaying asylum, across three CDs."),
 "sorcerian_forever_cn": dict(osLabel="DOS" if "sorcerian_forever_cn" in DOS_GAMES else "Windows 95", year=1997, publisher="Nihon Falcom", genre="Action RPG",
    accent=["#3a4a6b","#12161f"],
    description="Falcom's side-scrolling action-RPG sequel (Traditional Chinese)."),
 "taikou_risshiden1_cn": dict(osLabel="DOS" if "taikou_risshiden1_cn" in DOS_GAMES else "Windows 95", year=1992, publisher="Koei", genre="Simulation RPG",
    accent=["#3a4a6b","#12161f"],
    description="Koei's Sengoku simulation RPG about rising from peasant to regent (Chinese). DOS game."),
 "taikou_risshiden2_cn": dict(osLabel="DOS" if "taikou_risshiden2_cn" in DOS_GAMES else "Windows 95", year=1995, publisher="Koei", genre="Simulation RPG",
    accent=["#3a4a6b","#12161f"],
    description="The second Taikou Risshiden: serve a daimyo or forge your own path (Chinese)."),
 "taikou_risshiden3_cn": dict(osLabel="DOS" if "taikou_risshiden3_cn" in DOS_GAMES else "Windows 95", year=1997, publisher="Koei", genre="Simulation RPG",
    accent=["#3a4a6b","#12161f"],
    description="The third Taikou Risshiden, set in the wars of Hideyoshi's era (Chinese)."),
 "taikou_risshiden4_cn": dict(osLabel="DOS" if "taikou_risshiden4_cn" in DOS_GAMES else "Windows 95", year=1999, publisher="Koei", genre="Simulation RPG",
    accent=["#3a4a6b","#12161f"],
    description="The fourth Taikou Risshiden with eight playable protagonists (Chinese)."),
 "city_of_lost_children": dict(osLabel="DOS" if "city_of_lost_children" in DOS_GAMES else "Windows 95", year=1997, publisher="Psygnosis", genre="Adventure",
    accent=["#3a4a6b","#12161f"],
    description="Psygnosis' adventure based on the Jeunet & Caro film. DOS game."),
 "hilarious_3kingdoms_cn": dict(osLabel="DOS" if "hilarious_3kingdoms_cn" in DOS_GAMES else "Windows 95", year=1996, publisher="Unknown", genre="Strategy",
    accent=["#3a4a6b","#12161f"],
    description="Comedy take on the Romance of the Three Kingdoms (Chinese). DOS game."),
 "incredible_machine2": dict(osLabel="DOS" if "incredible_machine2" in DOS_GAMES else "Windows 95", year=1994, publisher="Sierra", genre="Puzzle",
    accent=["#3a4a6b","#12161f"],
    description="Sierra's Rube Goldberg contraption puzzler. DOS game with General MIDI audio."),
 "lord_of_beast_cn": dict(osLabel="DOS" if "lord_of_beast_cn" in DOS_GAMES else "Windows 95", year=1998, publisher="Unknown", genre="Strategy RPG",
    accent=["#3a4a6b","#12161f"],
    description="Chinese fantasy strategy-RPG: Chronicle of Amadis (Traditional Chinese)."),
 "lost_vikings": dict(osLabel="DOS" if "lost_vikings" in DOS_GAMES else "Windows 95", year=1993, publisher="Blizzard", genre="Puzzle platformer",
    accent=["#3a4a6b","#12161f"],
    description="Blizzard's (then Silicon & Synapse) puzzle-platformer guiding three vikings home. DOS game."),
 "millionaire_3kingdoms2_cn": dict(osLabel="DOS" if "millionaire_3kingdoms2_cn" in DOS_GAMES else "Windows 95", year=1996, publisher="Unknown", genre="Board-game simulation",
    accent=["#3a4a6b","#12161f"],
    description="Board-game strategy set in the Three Kingdoms era (Chinese). DOS game."),
 "typing_of_the_dead": dict(osLabel="DOS" if "typing_of_the_dead" in DOS_GAMES else "Windows 95", year=2000, publisher="Sega", genre="Typing game",
    accent=["#3a4a6b","#12161f"],
    description="Sega's zombie shooter where the gun is your keyboard. Uses 3dfx Voodoo."),
 "theme_hospital_cn": dict(osLabel="DOS" if "theme_hospital_cn" in DOS_GAMES else "Windows 95", year=1997, publisher="Bullfrog", genre="Simulation",
    accent=["#3a4a6b","#12161f"],
    description="Bullfrog's comedic hospital-management sim (Chinese). DOS game with General MIDI audio."),
 "time_commando": dict(osLabel="DOS" if "time_commando" in DOS_GAMES else "Windows 95", year=1996, publisher="Activision", genre="Action",
    accent=["#3a4a6b","#12161f"],
    description="Adeline's time-travelling martial-arts action game. DOS game with General MIDI audio."),
 "tokimeki_memorial_cn": dict(osLabel="DOS" if "tokimeki_memorial_cn" in DOS_GAMES else "Windows 95", year=1996, publisher="Konami", genre="Dating sim",
    accent=["#3a4a6b","#12161f"],
    description="Konami's classic dating sim, Forever with You (Traditional Chinese), General MIDI audio."),
 "tun_town": dict(osLabel="DOS" if "tun_town" in DOS_GAMES else "Windows 95", year=1996, publisher="Unknown", genre="Simulation",
    accent=["#3a4a6b","#12161f"],
    description="Taiwanese DOS game (Chinese), on two discs, General MIDI audio."),
 "tyrian2000": dict(osLabel="DOS" if "tyrian2000" in DOS_GAMES else "Windows 95", year=1999, publisher="Eclipse Software", genre="Shoot 'em up",
    accent=["#3a4a6b","#12161f"],
    description="Eclipse Software's vertical shooter, the Tyrian 2000 release. DOS game with General MIDI audio."),
 "uw4_puk_cn": dict(osLabel="DOS" if "uw4_puk_cn" in DOS_GAMES else "Windows 95", year=2000, publisher="Koei", genre="Trading simulation",
    accent=["#3a4a6b","#12161f"],
    description="Uncharted Waters IV with the Power-Up Kit (Traditional Chinese)."),
 "uw2_en": dict(osLabel="DOS" if "uw2_en" in DOS_GAMES else "Windows 95", year=1994, publisher="Koei", genre="RPG/Adventure",
    accent=["#3a4a6b","#12161f"],
    description="Uncharted Waters II: New Horizons - trade, explore and duel across the seas. DOS game."),
 "vandal_hearts": dict(osLabel="DOS" if "vandal_hearts" in DOS_GAMES else "Windows 95", year=1997, publisher="Konami", genre="Tactical RPG",
    accent=["#3a4a6b","#12161f"],
    description="Konami's grid-based tactical RPG (Japanese release). Uses 3dfx Voodoo and General MIDI."),
 "vandal_hearts_cn": dict(osLabel="DOS" if "vandal_hearts_cn" in DOS_GAMES else "Windows 95", year=1997, publisher="Konami", genre="Tactical RPG",
    accent=["#3a4a6b","#12161f"],
    description="Konami's grid-based tactical RPG (Traditional Chinese). Uses 3dfx Voodoo and General MIDI."),
 "warhammer_dark_omen": dict(osLabel="DOS" if "warhammer_dark_omen" in DOS_GAMES else "Windows 95", year=1998, publisher="Mindscape", genre="Real-time tactics",
    accent=["#3a4a6b","#12161f"],
    description="Real-time tactics in the Warhammer world, sequel to Shadow of the Horned Rat. Uses 3dfx Voodoo."),
})

META.update({
 "millionaire_3kingdoms_cn": dict(osLabel="DOS" if "millionaire_3kingdoms_cn" in DOS_GAMES else "Windows 95", year=1994, publisher="Unknown", genre="Board-game simulation",
    accent=["#3a4a6b","#12161f"],
    description="Board-game strategy set in the Three Kingdoms era (Chinese). DOS game."),
})

def files_for(g):
    bundle = g['bundle'].rsplit('/',1)[-1]
    is_dos = g.get('bundle_cat') == 'dos' or g.get('os') == '0' or not g.get('osImages')
    if is_dos:
        return [f"/games/{bundle}"], []
    os_img = g['osImages'].rsplit('/',1)[-1]
    game_img = g['gameImages'].rsplit('/',1)[-1]
    req = [f"/games/{bundle}", "/games/bin/windows/tools/tools.zip",
           f"/games/bin/windows/images/os/{os_img}", f"/games/bin/windows/images/game/{game_img}"]
    opt = ["/games/bin/windows/tools/win95patch.zip"] + [cd['link'].replace('https://cf.ommv.net','/games') for cd in g['cdImages']]
    return req, opt

def jslist(arr):
    # Produce a clean indented JS array literal (strings only).
    pad = " " * 16
    inner = ",\n".join(pad + json.dumps(x) for x in arr)
    return "[\n" + inner + "\n            ]"

out = []
out.append("// Local game catalog. The entry page (/index.html) renders whatever is listed")
out.append("// here, so adding another game is a matter of adding an entry plus its files")
out.append("// (see games/README.md) and, for a different title, its own config + player page.")
out.append("//")
out.append("// `files` are the paths the player needs; the list page HEAD-checks them to show")
out.append("// a Ready / missing-files badge. `optionalFiles` are needed only in some")
out.append("// configurations (e.g. win95patch.zip is only used by the dosx-edge build).")
out.append("")
out.append("window.LOCAL_CATALOG = {")
out.append('    siteName: "Retro Game Playground",')
out.append("")
out.append("    games: [")

games = []
# existing broodwar entry, kept verbatim-ish
games.append("""        {
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
        },""")

# 10 dumped games
for g in cfg:
    gid = g['id']
    title = clean(g['title'])
    meta = META[gid]
    req, opt = files_for(g)
    # Cover file extension follows the CDN source (most are .webp, a few .jpg).
    src_cover = g.get('cover') or ''
    ext = src_cover.rsplit('.', 1)[-1] if src_cover else 'webp'
    cover = f"/images/games/{gid}_cover.{ext}"
    is_dos = g.get('bundle_cat') == 'dos' or g.get('os') == '0' or not g.get('osImages')
    os_field = "dos" if is_dos else "windows"
    e = f"""        {{
            id: "{gid}",
            title: {json.dumps(title, ensure_ascii=False)},
            os: "{os_field}",
            osLabel: {json.dumps(meta['osLabel'])},
            year: {meta['year']},
            publisher: {json.dumps(meta['publisher'])},
            genre: {json.dumps(meta['genre'])},
            players: "1",
            playUrl: "/play.html?game={gid}",
            configUrl: "/config-{gid}.js",
            cover: {json.dumps(cover)},
            accent: {json.dumps(meta['accent'])},
            description: {json.dumps(meta['description'], ensure_ascii=False)},
            files: {jslist(req)},
            optionalFiles: {jslist(opt)}
        }},"""
    games.append(e)

out.extend(games)
out.append("""    ]
};""")
out.append("")
out.append("// localStorage key used for the \"Recently played\" ordering.")
out.append('window.LOCAL_HISTORY_KEY = "local_recently_played";')
out.append("")

open('catalog.js','w').write("\n".join(out)+"\n")
print("wrote catalog.js with", len(games), "games")
