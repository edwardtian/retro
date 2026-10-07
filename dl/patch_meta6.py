#!/usr/bin/env python3
"""Insert META.update({...}) for the batch-6 games into dl/gen_catalog.py."""
import json, io

YEARS = {g['id']: g.get('Year') for g in json.load(open('dl/games_config.json'))}

EXTRA = {
 "bistro_taiwan": ("Unknown", "Simulation", "Traditional-Chinese restaurant-management sim running on a Windows 95 image."),
 "transport_tycoon_deluxe": ("MicroProse", "Strategy", "Chris Sawyer's transport empire sim: rail, road, sea and air. DOS game with General MIDI audio."),
 "railroad_tycoon2_platinum": ("PopTop Software", "Strategy", "PopTop's railroad empire builder, with the Platinum edition's campaigns and map editor."),
 "capitalism_plus": ("Interactive Magic", "Business simulation", "Brightstar's deep business sim: build retail, farming and industrial empires against rival CEOs. DOS game."),
 "sm_gettysburg": ("Firaxis", "Wargame", "Firaxis' real-time Civil War wargame refighting the battle of Gettysburg."),
 "silent_hunter_ce": ("Strategic Simulations", "Submarine simulator", "SSI's WWII U-boat simulator, Commander's Edition. DOS game."),
 "smac": ("Firaxis", "4X strategy", "Sid Meier's sci-fi 4X: seven factions colonise Planet after the Unity mission fails."),
 "smac_xf": ("Firaxis", "4X strategy", "The Alpha Centauri expansion: seven new factions, new technologies and story events."),
 "simcity2000": ("Maxis", "City-building", "Maxis' classic city simulator. DOS game with General MIDI audio."),
 "sub_culture": ("Digital Image Design", "Action", "Digital Image Design's underwater action game piloting a tiny sub. Uses 3dfx Voodoo."),
 "civ2_tot": ("MicroProse", "4X strategy", "The reimagined Civilization II, with fantasy and science-fiction extended campaigns."),
 "civ2_mpgold": ("MicroProse", "4X strategy", "Civilization II with multiplayer plus the Conflicts in Civilization scenario pack."),
 "colonial_plan_cn": ("Unknown", "Strategy", "Taiwanese-Chinese DOS strategy game; General MIDI audio."),
 "blade_runner": ("Westwood Studios", "Adventure", "Westwood's noir adventure across four CDs, with a branching detective story."),
 "army_men": ("The 3DO Company", "Action", "3DO's plastic-soldier campaign: Sarge vs the Tan army."),
 "army_men2": ("The 3DO Company", "Action", "The sequel: Sarge returns across real-world and toy-box battlefields."),
 "another_world": ("Delphine Software", "Cinematic platformer", "Eric Chahi's cinematic platformer about a physicist stranded on an alien world. DOS game."),
 "alone_dark3": ("I-Motion", "Survival horror", "The third Alone in the Dark: a supernatural western mystery. DOS game."),
 "age_of_wonders": ("Triumph Studios", "Turn-based strategy", "Triumph's fantasy turn-based strategy with twelve races and a sprawling campaign."),
 "anno1602": ("SUNFLOWERS", "City-building", "The first Anno game: settle islands, trade routes and grow a renaissance colony."),
 "aerobiz_supersonic_cn": ("Koei", "Business simulation", "Koei's airline-business simulation (Chinese). DOS game."),
 "afterlife": ("LucasArts", "Simulation", "LucasArts' heaven-and-hell management sim: build rewards and punishments for souls. DOS game."),
 "mdk2": ("BioWare", "Action", "BioWare's sequel with three playable heroes (Kurt, Maxi and Dr. Hawkins). Uses 3dfx Voodoo."),
 "ms_casino": ("Microsoft", "Casino", "Microsoft's casino collection with full-motion-video dealers and classic table games."),
 "lego_chess": ("Lego Media", "Chess", "Chess with animated LEGO pieces and two story campaigns. Uses 3dfx Voodoo and General MIDI."),
 "fallout1": ("Interplay", "Role-playing", "The original post-nuclear role-playing game from the creators of Wasteland. DOS game."),
 "daikoukai3_cn": ("Koei", "Trading simulation", "Koei's Age-of-Discovery trading and adventure sim (Traditional Chinese)."),
 "theme_park": ("Bullfrog", "Simulation", "Bullfrog's theme-park builder: design rides, hire staff and manage profits. DOS game with General MIDI audio."),
 "dungeon_keeper2": ("Bullfrog", "Strategy", "Bullfrog's dungeon-management sequel with real-time combat. Uses 3dfx Voodoo."),
 "dungeon_keeper": ("Bullfrog", "Strategy", "Bullfrog's original: dig, build and defend a dungeon against do-gooder heroes. DOS game."),
 "syndicate_wars": ("Bullfrog", "Real-time tactics", "Bullfrog's cyberpunk squad tactics in a city on the brink. DOS game with General MIDI audio."),
 "planescape_torment": ("Black Isle Studios", "Role-playing", "Black Isle's Infinity-engine RPG: 'What can change the nature of a man?'"),
 "baldurs_gate_saga": ("BioWare", "Role-playing", "BioWare's Infinity-engine classic plus the Tales of the Sword Coast expansion, on three CDs."),
}

def accent_for(i):
    palettes = [["#3a4a6b","#12161f"],["#5a3d2f","#1c1210"],["#3f5a4a","#101c14"],["#5c3a5c","#1c101c"],
                ["#2f5a5c","#101c1c"],["#5c4a2f","#1c1610"],["#4a2f5c","#16101c"],["#2f4a5c","#10161c"],
                ["#5c2f3a","#1c1014"],["#3a5c2f","#141c10"],["#5c5a2f","#1c1c10"],["#2f3f5c","#10121c"]]
    return palettes[i % len(palettes)]

lines = ["", "# Batch 6 additions (auto-inserted).", "META.update({"]
for i, (gid, (pub, genre, desc)) in enumerate(EXTRA.items()):
    yr = YEARS.get(gid)
    yr = int(yr) if yr and str(yr).isdigit() else 1999
    acc = accent_for(i)
    lines.append(f' "{gid}": dict(osLabel="DOS" if "{gid}" in DOS_GAMES else "Windows 95", year={yr}, publisher="{pub}", genre="{genre}",')
    lines.append(f'    accent={acc},')
    lines.append(f'    description="{desc}"),')
lines.append("})")

block = "\n".join(lines) + "\n"

path = "dl/gen_catalog.py"
src = open(path).read()
if "bistro_taiwan" in src:
    print("already patched")
    raise SystemExit

# Insert after the META dict's closing brace.
idx = src.index("META = {")
depth = 0
i = idx + len("META ")
end = None
while i < len(src):
    if src[i] == '{': depth += 1
    elif src[i] == '}':
        depth -= 1
        if depth == 0:
            end = i + 1
            break
    i += 1
assert end, "META dict close not found"
# Also need DOS_GAMES defined before META.update for osLabel choice.
dos_def = "DOS_GAMES = {g['id'] for g in json.load(open('dl/games_config.json')) if g.get('bundle_cat') == 'dos' or g.get('os') == '0'}\n"
new = src[:end] + "\n" + dos_def + block + src[end:]
open(path, "w").write(new)
print("inserted META.update with", len(EXTRA), "entries")
