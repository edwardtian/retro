#!/usr/bin/env python3
"""Check the game files in games/ before booting the local player.

The emulator opens every .DCD/.jsdos/.zip as a ZIP archive. A download that was
preallocated at full size but aborted early looks complete by size while its
central directory (at the very end of the file) is missing; the emulator then
fails late with "Cannot open archive". This script catches that in a second.

Checks per file:
  * exists
  * ZIP end-of-central-directory record within the last 64 KB
  * trailing zero run (a long run means the file was never fully written)
  * with --network: compares size against the original CDN metadata (HEAD only,
    no content is downloaded)

The set of files to check is derived automatically from the player config
scripts (config.js, config-<id>.js): every image URL each
game declares becomes a file to verify.

Usage:
    python3 check-game-files.py [--network] [--root .]
"""

import argparse
import glob
import os
import re
import sys
import urllib.request

# Files that are built locally (no CDN size to compare against).
BUILT_LOCALLY = set()

# Files needed only in some configurations: match by pattern instead of
# listing every file, so newly added games work without editing this script.
#  * CD / disc images are mounted on demand from the in-game disc menu
#  * win95patch.zip is only used by the dosx-edge (JSPI) build
#  * gugs.zip is only fetched by games with General MIDI audio
def is_optional(relative):
    return ("/images/disc/" in relative
            or "/dos/images/" in relative
            or relative.endswith("tools/win95patch.zip")
            or relative.endswith("tools/gugs.zip"))


def config_files():
    """Return {local_path: CDN_url_or_None} derived from every config script."""
    entries = {}  # local path -> CDN url (None when built locally)

    def add(local, cdn=None):
        local = local.lstrip("/")
        if local not in entries:
            entries[local] = cdn

    cdn_root = "https://cf.ommv.net"
    for path in sorted(glob.glob(os.path.join(os.path.dirname(os.path.abspath(__file__)), "config*.js"))):
        try:
            text = open(path, encoding="utf-8").read()
        except OSError:
            continue
        # gameBundle: "/games/<name>.jsdos"
        m = re.search(r'gameBundle\s*:\s*"([^"]+)"', text)
        if m:
            add(m.group(1), cdn_root + m.group(1).lstrip("/games"))
        # osImages / gameImages / toolImage / win95Patch are resolved against tool (/games)
        for field in ("osImages", "gameImages", "toolImage", "win95Patch"):
            m = re.search(r'%s\s*:\s*"([^"]+)"' % field, text)
            if m and m.group(1).startswith("/bin/"):
                add("/games" + m.group(1), cdn_root + m.group(1))
        # cdImages: full site-absolute /games/bin/... links
        for m in re.finditer(r'link\s*:\s*"(/games/bin/windows/images/disc/[^"]+)"', text):
            add(m.group(1), cdn_root + m.group(1).lstrip("/games"))
        # requiredFiles / optionalFiles arrays
        for m in re.finditer(r'"(/games/bin/windows/[^"]+\.(?:DCD|zip|jsdos))"', text):
            add(m.group(1), cdn_root + m.group(1).lstrip("/games"))
    return entries


def remote_size(url):
    request = urllib.request.Request(url, method="HEAD", headers={
        "User-Agent": "Mozilla/5.0",
        "Origin": "https://retroonline.net",
    })
    with urllib.request.urlopen(request, timeout=20) as response:
        length = response.headers.get("Content-Length")
        return int(length) if length and length.isdigit() else None


def check(path):
    """Return (status, detail) where status is ok | missing | corrupt."""
    if not os.path.isfile(path):
        return "missing", "file not found"
    size = os.path.getsize(path)
    with open(path, "rb") as handle:
        handle.seek(max(0, size - 65536))
        tail = handle.read()
    if tail.rfind(b"PK\x05\x06") < 0:
        zeros = 0
        for byte in reversed(tail):
            if byte == 0:
                zeros += 1
            else:
                break
        return "corrupt", f"no ZIP end-of-central-directory in last 64 KB (trailing zeros: {zeros:,})"
    zeros = 0
    for byte in reversed(tail):
        if byte == 0:
            zeros += 1
        else:
            break
    return "ok", f"{size:,} bytes, trailing zeros: {zeros}"


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--network", action="store_true", help="also compare sizes against the CDN (HEAD requests only)")
    parser.add_argument("--root", default=os.path.dirname(os.path.abspath(__file__)))
    args = parser.parse_args()

    files = config_files()
    if not files:
        print("No config scripts found; nothing to check.")
        return 1

    failures = 0
    for relative in sorted(files):
        url = files[relative]
        path = os.path.join(args.root, relative)
        status, detail = check(path)
        note = ""
        if args.network and status != "missing" and url:
            try:
                expected = remote_size(url)
                actual = os.path.getsize(path)
                if expected is not None and expected != actual:
                    note = f"  [size differs from CDN: {expected:,}]"
                    status = "corrupt"
            except Exception as error:  # network is best effort
                note = f"  [CDN check failed: {error}]"
        elif (url is None or relative in BUILT_LOCALLY) and status != "missing":
            note = "  [built locally - no CDN copy]"
        optional = " (optional)" if is_optional(relative) else ""
        mark = {"ok": "OK      ", "missing": "MISSING ", "corrupt": "CORRUPT "}[status]
        if status == "corrupt":
            failures += 1
        print(f"{mark}{relative}{optional}\n         {detail}{note}")

    print()
    if failures:
        print(f"{failures} file(s) corrupt - re-download them (see games/README.md).")
        return 1
    print("No corrupt archives found.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
