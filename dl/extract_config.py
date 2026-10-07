#!/usr/bin/env python3
import re, json, urllib.request, sys, os

# (catalog_id, page path suffix)
GAMES = [
    ("commandos_bel", "/Windows/Commandos%3A%20Behind%20Enemy%20Lines"),
    ("settlers3_gold", "/Windows/The%20Settlers%20III%3A%20Gold%20Edition"),
    ("age_of_empires", "/Windows/Age%20of%20Empires"),
    ("red_alert_2", "/Windows/Command%20%26%20Conquer%3A%20Red%20Alert%202"),
    ("simcity_3000", "/Windows/SimCity%203000"),
    ("yuris_revenge", "/Windows/Command%20%26%20Conquer%3A%20Yuri's%20Revenge"),
    ("rct_deluxe", "/Windows/RollerCoaster%20Tycoon%20Deluxe"),
    ("diablo2_lod", "/Windows/Diablo%20II%3A%20Lord%20of%20Destruction"),
    ("red_alert", "/Windows/Command%20%26%20Conquer%20Red%20Alert"),
    ("populous_beginning", "/Windows/Populous%3A%20The%20Beginning"),
]

BASE = "https://retroonline.net"

def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120 Safari/537.36"})
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read().decode("utf-8", "replace")

def extract(html, gid):
    out = {"id": gid}
    # game name title
    m = re.search(r"<title>(.*?)\s*-\s*Play in Browser", html, re.S)
    out["title"] = m.group(1).strip() if m else None
    # bundle .jsdos url (cf.ommv.net/bin/windows/<name>.jsdos)
    m = re.search(r'https://cf\.ommv\.net/bin/windows/([A-Za-z0-9_.\-]+\.jsdos)', html)
    if m:
        out["bundle"] = "https://cf.ommv.net/bin/windows/" + m.group(1)
    # os images
    m = re.search(r'g_osImages="([^"]+)"', html)
    if m:
        out["osImages"] = m.group(1)
    # game images
    m = re.search(r'g_gameImages="([^"]+)"', html)
    if m:
        out["gameImages"] = m.group(1)
    # cd images list
    cds = []
    for cm in re.finditer(r'\{link:"(https://cf\.ommv\.net[^"]+)",name:"([^"]+)",size:(\d+),mount:"([^"]+)"\}', html):
        cds.append({"link": cm.group(1), "name": cm.group(2), "size": int(cm.group(3)), "mount": cm.group(4)})
    out["cdImages"] = cds
    # game size
    m = re.search(r'g_gameSize=(\d+)', html)
    if m:
        out["gameSize"] = int(m.group(1))
    # cover / background
    m = re.search(r'"Background":"(https://dosaws\.ddyx\.me[^"]+)"', html)
    if m:
        out["background"] = m.group(1)
    m = re.search(r'"Cover":"(https://dosaws\.ddyx\.me[^"]+)"', html)
    if m:
        out["cover"] = m.group(1)
    # flags
    for flag in ["CD", "Voodoo", "Mt32", "GM", "PC98", "OS", "Year", "Size"]:
        m = re.search(r'"%s":(true|false|\d+)' % flag, html)
        if m:
            out[flag.lower()] = m.group(1)
    return out

os.makedirs("dl/pages", exist_ok=True)
results = []
for gid, path in GAMES:
    html = fetch(BASE + path)
    with open(f"dl/pages/{gid}.html", "w") as f:
        f.write(html)
    cfg = extract(html, gid)
    results.append(cfg)
    print(json.dumps(cfg, indent=2))
    print("=" * 70)

with open("dl/games_config.json", "w") as f:
    json.dump(results, f, indent=2)
print("WROTE dl/games_config.json")
