import os, zipfile, json, concurrent.futures, sys

cfg = json.load(open('dl/games_config.json'))
files=set()
def add(rel): files.add(rel)
add("games/bin/windows/tools/tools.zip")
add("games/bin/windows/tools/win95patch.zip")
add("games/bin/windows/images/os/WIN95OSR2_EN_OS.DCD")
add("games/bin/windows/images/os/WIN98SE_EN_OS.DCD")
seen=set()
for g in cfg:
    b=g['bundle']; add("games/"+b.rsplit('/',1)[-1])
    add("games/bin/windows/images/os/"+g['osImages'].rsplit('/',1)[-1])
    gi="https://cf.ommv.net"+g['gameImages']
    if gi not in seen: seen.add(gi); add("games/bin/windows/images/game/"+g['gameImages'].rsplit('/',1)[-1])
    for cd in g['cdImages']:
        if cd['link'] not in seen: seen.add(cd['link']); add("games/bin/windows/images/disc/"+cd['link'].rsplit('/',1)[-1])

PWD=b"You're so talented!"
import zlib
def check(rel):
    if not os.path.exists(rel): return (rel,"MISSING")
    try:
        z=zipfile.ZipFile(rel)
        infos=z.infolist()
        if not infos: return (rel,"EMPTY")
        for m in infos:
            data=z.open(m, pwd=PWD).read()
            if len(data)!=m.file_size: return (rel,f"LEN {len(data)}/{m.file_size}")
            if zlib.crc32(data)!=(m.CRC & 0xffffffff): return (rel,"CRC")
        return (rel,"OK")
    except Exception as e:
        return (rel,f"ERR {type(e).__name__}: {e}")

fl=sorted(files)
bad=[]
with concurrent.futures.ThreadPoolExecutor(max_workers=8) as ex:
    for rel,res in ex.map(check, fl):
        print(f"{res:<12} {rel}", flush=True)
        if res!="OK": bad.append((rel,res))
print("="*50)
print("TOTAL", len(fl))
if bad:
    print("BAD", len(bad))
    for r,e in bad: print("  ",r,e)
    sys.exit(1)
print("ALL VALID (full decompress + CRC pass)")
