#!/usr/bin/env python3
"""Insert META.update({...}) for batch-7 games into dl/gen_catalog.py (before def files_for)."""
import json

YEARS = {g['id']: g.get('Year') for g in json.load(open('dl/games_config.json'))}

EXTRA = {
 "richman2_cn": ("Softstar", "Board-game simulation", 1993,
    "Softstar's Monopoly-style board game (Chinese). DOS game."),
 "richman3_cn": ("Softstar", "Board-game simulation", 1996,
    "Softstar's Monopoly-style board game with maps, cards and rivals (Chinese). DOS game."),
 "sanitarium": ("ASC Games", "Horror adventure", 1998,
    "DreamForge's psychological horror adventure inside a decaying asylum, across three CDs."),
 "sorcerian_forever_cn": ("Nihon Falcom", "Action RPG", 1997,
    "Falcom's side-scrolling action-RPG sequel (Traditional Chinese)."),
 "taikou_risshiden1_cn": ("Koei", "Simulation RPG", 1992,
    "Koei's Sengoku simulation RPG about rising from peasant to regent (Chinese). DOS game."),
 "taikou_risshiden2_cn": ("Koei", "Simulation RPG", 1995,
    "The second Taikou Risshiden: serve a daimyo or forge your own path (Chinese)."),
 "taikou_risshiden3_cn": ("Koei", "Simulation RPG", 1997,
    "The third Taikou Risshiden, set in the wars of Hideyoshi's era (Chinese)."),
 "taikou_risshiden4_cn": ("Koei", "Simulation RPG", 1999,
    "The fourth Taikou Risshiden with eight playable protagonists (Chinese)."),
 "city_of_lost_children": ("Psygnosis", "Adventure", 1997,
    "Psygnosis' adventure based on the Jeunet & Caro film. DOS game."),
 "hilarious_3kingdoms_cn": ("Unknown", "Strategy", 1996,
    "Comedy take on the Romance of the Three Kingdoms (Chinese). DOS game."),
 "incredible_machine2": ("Sierra", "Puzzle", 1994,
    "Sierra's Rube Goldberg contraption puzzler. DOS game with General MIDI audio."),
 "lord_of_beast_cn": ("Unknown", "Strategy RPG", 1998,
    "Chinese fantasy strategy-RPG: Chronicle of Amadis (Traditional Chinese)."),
 "lost_vikings": ("Blizzard", "Puzzle platformer", 1993,
    "Blizzard's (then Silicon & Synapse) puzzle-platformer guiding three vikings home. DOS game."),
 "millionaire_3kingdoms2_cn": ("Unknown", "Board-game simulation", 1996,
    "Board-game strategy set in the Three Kingdoms era (Chinese). DOS game."),
 "typing_of_the_dead": ("Sega", "Typing game", 2000,
    "Sega's zombie shooter where the gun is your keyboard. Uses 3dfx Voodoo."),
 "theme_hospital_cn": ("Bullfrog", "Simulation", 1997,
    "Bullfrog's comedic hospital-management sim (Chinese). DOS game with General MIDI audio."),
 "time_commando": ("Activision", "Action", 1996,
    "Adeline's time-travelling martial-arts action game. DOS game with General MIDI audio."),
 "tokimeki_memorial_cn": ("Konami", "Dating sim", 1996,
    "Konami's classic dating sim, Forever with You (Traditional Chinese), General MIDI audio."),
 "tun_town": ("Unknown", "Simulation", 1996,
    "Taiwanese DOS game (Chinese), on two discs, General MIDI audio."),
 "tyrian2000": ("Eclipse Software", "Shoot 'em up", 1999,
    "Eclipse Software's vertical shooter, the Tyrian 2000 release. DOS game with General MIDI audio."),
 "uw4_puk_cn": ("Koei", "Trading simulation", 2000,
    "Uncharted Waters IV with the Power-Up Kit (Traditional Chinese)."),
 "uw2_en": ("Koei", "RPG/Adventure", 1994,
    "Uncharted Waters II: New Horizons - trade, explore and duel across the seas. DOS game."),
 "vandal_hearts": ("Konami", "Tactical RPG", 1997,
    "Konami's grid-based tactical RPG (Japanese release). Uses 3dfx Voodoo and General MIDI."),
 "vandal_hearts_cn": ("Konami", "Tactical RPG", 1997,
    "Konami's grid-based tactical RPG (Traditional Chinese). Uses 3dfx Voodoo and General MIDI."),
 "warhammer_dark_omen": ("Mindscape", "Real-time tactics", 1998,
    "Real-time tactics in the Warhammer world, sequel to Shadow of the Horned Rat. Uses 3dfx Voodoo."),
}

lines = ["", "# Batch 7 additions (auto-inserted).", "META.update({"]
for gid, (pub, genre, yr_default, desc) in EXTRA.items():
    yr = YEARS.get(gid)
    yr = int(yr) if yr and str(yr).isdigit() else yr_default
    lines.append(f' "{gid}": dict(osLabel="DOS" if "{gid}" in DOS_GAMES else "Windows 95", year={yr}, publisher="{pub}", genre="{genre}",')
    lines.append(f'    accent=["#3a4a6b","#12161f"],')
    lines.append(f'    description="{desc}"),')
lines.append("})")

block = "\n".join(lines) + "\n"
path = "dl/gen_catalog.py"
src = open(path).read()
if "richman2_cn" in src:
    print("already patched"); raise SystemExit
anchor = "def files_for(g):"
assert anchor in src
src = src.replace(anchor, block + "\n" + anchor, 1)
open(path, "w").write(src)
print("inserted META.update with", len(EXTRA), "entries")
