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

Usage:
    python3 check-game-files.py [--network] [--root .]
"""

import argparse
import os
import sys
import urllib.request

FILES = [
    # (local path, original CDN URL or None when the file is built locally)
    ("games/starcraft.jsdos", "https://cf.ommv.net/bin/windows/starcraft.jsdos"),
    ("games/bin/windows/tools/tools.zip", "https://cf.ommv.net/bin/windows/tools/tools.zip"),
    ("games/bin/windows/tools/win95patch.zip", "https://cf.ommv.net/bin/windows/tools/win95patch.zip"),
    ("games/bin/windows/images/os/WIN95OSR2_EN_OS.DCD", "https://cf.ommv.net/bin/windows/images/os/WIN95OSR2_EN_OS.DCD"),
    ("games/bin/windows/images/game/BROODWAR.DCD", "https://cf.ommv.net/bin/windows/images/game/BROODWAR.DCD"),
    ("games/bin/windows/images/disc/SCBW.DCD", "https://cf.ommv.net/bin/windows/images/disc/SCBW.DCD"),
    ("games/bin/windows/images/disc/SC.DCD", "https://cf.ommv.net/bin/windows/images/disc/SC.DCD"),
    # Built locally by import-windows-game.py / import-doswasmx-image.py, so
    # there is no CDN size to compare against.
    ("games/pandoras-box.jsdos", None),
    ("games/bin/windows/images/os/PANDORAS_BOX_OS.DCD", None),
    ("games/bin/windows/images/disc/PANDORAS_BOX.DCD", None),
]

OPTIONAL = {"games/bin/windows/tools/win95patch.zip",
            "games/bin/windows/images/disc/SCBW.DCD",
            "games/bin/windows/images/disc/SC.DCD"}


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

    failures = 0
    for relative, url in FILES:
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
        elif url is None and status != "missing":
            note = "  [built locally - no CDN copy]"
        optional = " (optional)" if relative in OPTIONAL else ""
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
