#!/usr/bin/env python3
"""Fetch batch-7 retroonline.net pages, extract configs, merge into dl/games_config.json."""
import re, urllib.request, json, os

BASE = "https://retroonline.net"
GAMES = [
 ("richman2_cn","/DOSX/Richman%202%20(Chinese)"),
 ("richman3_cn","/DOSX/Richman%203%20%20(Chinese)"),
 ("sanitarium","/Windows/Sanitarium"),
 ("sorcerian_forever_cn","/Windows/Sorcerian%20Forever%20(Chinese)"),
 ("taikou_risshiden2_cn","/Windows/Taikou%20Risshiden%20II%20(Chinese)"),
 ("taikou_risshiden4_cn","/Windows/Taiko%20Risshiden%20IV%20(Chinese)"),
 ("taikou_risshiden1_cn","/DOSX/Taik%C5%8D%20Risshiden%20(Chinese)"),
 ("taikou_risshiden3_cn","/Windows/Taikou%20Risshiden%20III%20(Chinese)"),
 ("city_of_lost_children","/DOSX/The%20City%20of%20Lost%20Children"),
 ("hilarious_3kingdoms_cn","/DOSX/The%20Hilarious%20Three%20Kingdoms%20(Chinese)"),
 ("incredible_machine2","/DOSX/The%20Incredible%20Machine%202"),
 ("lord_of_beast_cn","/Windows/The%20Lord%20of%20the%20Beast:%20Chronicle%20of%20Amadis%20(Chinese)"),
 ("lost_vikings","/DOSX/The%20Lost%20Vikings"),
 ("millionaire_3kingdoms2_cn","/DOSX/The%20Millionaire%20of%203%20Kingdoms%202%20(Chinese)"),
 ("typing_of_the_dead","/Windows/The%20Typing%20of%20the%20Dead"),
 ("theme_hospital_cn","/DOSX/Theme%20Hospital%20(Chinese)"),
 ("time_commando","/DOSX/Time%20Commando"),
 ("tokimeki_memorial_cn","/Windows/Tokimeki%20Memorial:%20Forever%20with%20You%20(Chinese)"),
 ("tun_town","/DOSX/Tun%20Town"),
 ("tyrian2000","/DOSX/Tyrian%202000"),
 ("uw4_puk_cn","/Windows/Uncharted%20Waters%20IV:%20Porto%20Estado%20-%20Power%20Up%20Kit%20(Chinese)"),
 ("uw2_en","/DOSX/Uncharted%20Waters%3A%20New%20Horizons"),
 ("vandal_hearts","/Windows/Vandal%20Hearts"),
 ("vandal_hearts_cn","/Windows/Vandal%20Hearts%20(Chinese)"),
 ("warhammer_dark_omen","/Windows/Warhammer:%20Dark%20Omen"),
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
added = 0
for gid, path in GAMES:
    try:
        html = fetch(BASE + path)
    except Exception as e:
        print(f"FETCH-ERR {gid}: {e}", flush=True)
        continue
    open(f"dl/pages/{gid}.html", "w").write(html)
    cfg = extract(html, gid)
    allc = [g for g in allc if g['id'] != gid]
    allc.append(cfg)
    added += 1
    isdos = cfg.get('bundle_cat') == 'dos'
    osimg = cfg['osImages'].split('/')[-1] if cfg.get('osImages') else '-'
    print(f"OK {gid:26s} dos={isdos} os={osimg:22s} discs={len(cfg['cdImages'])} "
          f"voodoo={cfg.get('voodoo')} gm={cfg.get('gm')} year={cfg.get('Year')} "
          f"bundle={cfg['bundle'].rsplit('/',1)[-1] if cfg.get('bundle') else 'MISSING'}", flush=True)

json.dump(allc, open('dl/games_config.json','w'), indent=2)
print(f"\nprocessed={added} total_entries={len(allc)}")
