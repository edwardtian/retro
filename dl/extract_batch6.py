#!/usr/bin/env python3
"""Fetch all requested retroonline.net pages, extract game configs, merge into dl/games_config.json."""
import re, urllib.request, json, os, sys

BASE = "https://retroonline.net"
GAMES = [
 ("bistro_taiwan","/Windows/Bistro%20Taiwan"),
 ("transport_tycoon_deluxe","/DOSX/Transport%20Tycoon%20Deluxe"),
 ("railroad_tycoon2_platinum","/Windows/Railroad%20Tycoon%20II%20Platinum"),
 ("capitalism_plus","/DOSX/Capitalism%20Plus"),
 ("sm_gettysburg","/Windows/Sid%20Meier's%20Gettysburg!"),
 ("silent_hunter_ce","/DOSX/Silent%20Hunter%3A%20Commander's%20Edition"),
 ("smac","/Windows/Sid%20Meier's%20Alpha%20Centauri"),
 ("smac_xf","/Windows/Sid%20Meier's%20Alien%20Crossfire"),
 ("simcity2000","/DOSX/SimCity%202000"),
 ("sub_culture","/Windows/Sub%20Culture"),
 ("commandos_bel","/Windows/Commandos%3A%20Behind%20Enemy%20Lines"),
 ("civ2_tot","/Windows/Civilization%20II:%20Test%20of%20Time"),
 ("civ2_mpgold","/Windows/Civilization%20II:%20Multiplayer%20Gold%20Edition"),
 ("colonial_plan_cn","/DOSX/Colonial%20Plan%20(Chinese)"),
 ("blade_runner","/Windows/Blade%20Runner"),
 ("army_men","/Windows/Army%20Men"),
 ("army_men2","/Windows/Army%20Men%20II"),
 ("another_world","/DOSX/Another%20World"),
 ("alone_dark3","/DOSX/Alone%20in%20the%20Dark%203"),
 ("age_of_wonders","/Windows/Age%20of%20Wonders"),
 ("anno1602","/Windows/1602%20A.D."),
 ("aerobiz_supersonic_cn","/DOSX/Aerobiz%20Supersonic%20(Chinese)"),
 ("afterlife","/DOSX/Afterlife"),
 ("mdk2","/Windows/MDK2"),
 ("ms_casino","/Windows/Microsoft%20Casino"),
 ("lego_chess","/Windows/Lego%20Chess"),
 ("fallout1","/DOSX/Fallout"),
 ("daikoukai3_cn","/Windows/Daikoukai%20Jidai%20III:%20Costa%20del%20Sol%20(Chinese)"),
 ("theme_park","/DOSX/Theme%20Park"),
 ("dungeon_keeper2","/Windows/Dungeon%20Keeper%202"),
 ("dungeon_keeper","/DOSX/Dungeon%20Keeper"),
 ("syndicate_wars","/DOSX/Syndicate%20Wars"),
 ("planescape_torment","/Windows/Planescape:%20Torment"),
 ("baldurs_gate_saga","/Windows/Baldur's%20Gate:%20The%20Original%20Saga"),
]

def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120"})
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read().decode("utf-8", "replace")

def extract(html, gid):
    out = {"id": gid}
    m = re.search(r"<title>(.*?)\s*-\s*Play in Browser", html, re.S)
    out["title"] = m.group(1).strip() if m else None
    m = re.search(r'https://cf\.ommv\.net/bin/(windows|dos)/([A-Za-z0-9_.\-]+\.jsdos)', html)
    if m:
        out["bundle"] = "https://cf.ommv.net/bin/" + m.group(1) + "/" + m.group(2)
        out["bundle_cat"] = m.group(1)
    m = re.search(r'g_osImages="([^"]+)"', html)
    if m: out["osImages"] = m.group(1)
    m = re.search(r'g_gameImages="([^"]+)"', html)
    if m: out["gameImages"] = m.group(1)
    cds = []
    for cm in re.finditer(r'\{link:"(https://cf\.ommv\.net[^"]+)",name:"([^"]+)",size:(\d+),mount:"([^"]+)"\}', html):
        cds.append({"link": cm.group(1), "name": cm.group(2), "size": int(cm.group(3)), "mount": cm.group(4)})
    out["cdImages"] = cds
    m = re.search(r'g_gameSize=(\d+)', html)
    if m: out["gameSize"] = int(m.group(1))
    for flag in ["CD","Voodoo","Mt32","GM","PC98","OS","Year","Size"]:
        m = re.search(r'"%s":(true|false|\d+)' % flag, html)
        if m: out[flag.lower()] = m.group(1)
    m = re.search(r'"Background":"(https://dosaws\.ddyx\.me[^"]+)"', html)
    out["background"] = m.group(1) if m else None
    m = re.search(r'"Cover":"(https://dosaws\.ddyx\.me[^"]+)"', html)
    out["cover"] = m.group(1) if m else None
    return out

os.makedirs("dl/pages", exist_ok=True)
allc = json.load(open('dl/games_config.json'))
have = {g['id'] for g in allc}
added = updated = 0
for gid, path in GAMES:
    try:
        html = fetch(BASE + path)
    except Exception as e:
        print(f"FETCH-ERR {gid}: {e}", flush=True)
        continue
    open(f"dl/pages/{gid}.html", "w").write(html)
    cfg = extract(html, gid)
    if cfg['id'] in have:
        allc = [g for g in allc if g['id'] != gid]
        updated += 1
    else:
        added += 1
    allc.append(cfg)
    isdos = cfg.get('bundle_cat') == 'dos'
    print(f"OK {gid:24s} dos={isdos} os={cfg.get('osImages','-').split('/')[-1] if cfg.get('osImages') else '-':24s} "
          f"discs={len(cfg['cdImages'])} voodoo={cfg.get('voodoo')} gm={cfg.get('gm')} mt32={cfg.get('mt32')} "
          f"bundle={cfg['bundle'].rsplit('/',1)[-1] if cfg.get('bundle') else 'MISSING'}", flush=True)

json.dump(allc, open('dl/games_config.json','w'), indent=2)
print(f"\nadded={added} updated={updated} total_entries={len(allc)}")
