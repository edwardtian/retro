#!/usr/bin/env python3
import json, html, re, os

cfg = json.load(open('dl/games_config.json'))

def clean_title(t):
    t = html.unescape(t)
    return t

def js_str(s):
    return json.dumps(s, ensure_ascii=False)

VERSION = "20261009"

def write_config(g):
    gid = g['id']
    title = clean_title(g['title'])
    bundle = g['bundle'].rsplit('/', 1)[-1]
    is_dos = g.get('bundle_cat') == 'dos' or g.get('os') == '0' or not g.get('osImages')

    voodoo = g.get('voodoo') == 'true'
    mt32 = g.get('mt32') == 'true'
    gm = g.get('gm') == 'true'

    L = []
    L.append("// Local mirror configuration for the Retro Online \"dosx\" player.")
    L.append(f"// Generated for {title} (catalog id {gid}). Data dumped from")
    L.append("// https://cf.ommv.net/bin/windows/ ...")
    L.append("")
    L.append("window.LOCAL_GAME_CONFIG = {")
    L.append(f"    gameId: {js_str(gid)},")
    L.append(f"    title: {js_str(title)},")
    L.append(f"    version: {js_str(VERSION)},")
    L.append(f"    gameBundle: {js_str('/games/' + bundle)},")
    L.append('    tool: "/games",')

    if not is_dos:
        os_img = g['osImages'].rsplit('/', 1)[-1]
        game_img = g['gameImages'].rsplit('/', 1)[-1]
        cds = []
        for cd in g['cdImages']:
            fname = cd['link'].rsplit('/', 1)[-1]
            cds.append({"link": f"/games/bin/windows/images/disc/{fname}",
                        "name": clean_title(cd['name']), "size": cd['size'], "mount": cd['mount']})
        expected = int(g.get('size') or 0) + sum(c['size'] for c in cds)
        req = [f"/games/{bundle}", "/games/bin/windows/tools/tools.zip",
               f"/games/bin/windows/images/os/{os_img}", f"/games/bin/windows/images/game/{game_img}"]
        opt = [cd['link'] for cd in cds]
        L.append(f"    osImages: {js_str('/bin/windows/images/os/' + os_img)},")
        L.append(f"    gameImages: {js_str('/bin/windows/images/game/' + game_img)},")
        L.append("    cdImages: " + json.dumps(cds, ensure_ascii=False, indent=4).replace('\n', '\n    ') + ",")
        L.append('    toolImage: "/bin/windows/tools/tools.zip",')
        L.append('    win95Patch: "/bin/windows/tools/win95patch.zip",')
        L.append('    imageVersion: "1",')
        L.append('    skipWin95Patch: false,')
        L.append('    forceBuild: "auto",')
        L.append('    settingsType: 1,')
        L.append(f"    expectedSize: {expected},")
        L.append("    requiredFiles: " + json.dumps(req, indent=4).replace('\n', '\n    ') + ",")
        L.append("    optionalFiles: " + json.dumps(opt, indent=4).replace('\n', '\n    ') + ",")
    else:
        # Self-contained DOS bundle (e.g. Colonization) that boots directly.
        # Some DOS games still ship CD image(s) under bin/dos/images/.
        dos_cds = []
        for cd in g.get('cdImages', []):
            fname = cd['link'].rsplit('/', 1)[-1]
            dos_cds.append({"link": f"/games/bin/dos/images/{fname}",
                            "name": clean_title(cd['name']), "size": cd['size'], "mount": cd['mount']})
        expected = int(g.get('size') or 0) + sum(c['size'] for c in dos_cds)
        L.append('    // Self-contained DOS bundle: boots directly, no OS/game images.')
        L.append('    osImages: "",')
        L.append('    gameImages: "",')
        if dos_cds:
            L.append("    cdImages: " + json.dumps(dos_cds, ensure_ascii=False, indent=4).replace('\n', '\n    ') + ",")
        else:
            L.append('    cdImages: [],')
        L.append('    toolImage: "",')
        L.append('    win95Patch: "",')
        L.append('    imageVersion: "1",')
        L.append('    forceBuild: "auto",')
        L.append('    settingsType: 0,')
        L.append(f"    expectedSize: {expected},")
        L.append('    requiredFiles: [' + js_str('/games/' + bundle) + '],')
        L.append("    optionalFiles: " + json.dumps([c['link'] for c in dos_cds], indent=4).replace('\n', '\n    ') + ",")

    L.append("    voodoo: " + ("true" if voodoo else "false") + ",")
    L.append("    mt32: " + ("true" if mt32 else "false") + ",")
    L.append("    gm: " + ("true" if gm else "false") + ",")
    L.append('    gmSoundfont: ' + (js_str("gugs.zip") if gm else '""') + ",")
    L.append("};")
    open(f"config-{gid}.js", "w").write("\n".join(L) + "\n")
    print(f"wrote config-{gid}.js  dos={is_dos} voodoo={voodoo} mt32={mt32} gm={gm}")

for g in cfg:
    write_config(g)

print("done")
