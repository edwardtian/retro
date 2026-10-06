#!/usr/bin/env python3
"""Import a DosWasmX-style hard-disk image (.img) as a .jsdos bundle for this site.

DosWasmX (https://github.com/nbarkhina/DosWasmX, MIT) builds bootable FAT hard-disk
images and boots them with a DOSBox-X configuration that ends in:

    [autoexec]
    imgmount c "<image>.img"
    boot c:

The Retro Online player dumped in this repository boots a bundle the same way:
the bundle is extracted into the emulator's file system and the page sends the
mount/boot commands as "auto_command" in its ddyx-settings message. This script
produces the bundle:

    .jsdos/dosbox.conf   DOSBox-X machine configuration (adapted from DosWasmX's
                         dist/dosbox-x-for-web.conf, MIT licensed)
    <name>.img           the disk image, stored (not deflated) and encrypted with
                         the same ZipCrypto password the site's own bundles use

Usage:
    python3 import-doswasmx-image.py game_to_import/pandoras-box.img \
        --name pandoras-box --memsize 64

Then add a catalog entry + config (the script prints ready-to-paste snippets).
"""

import argparse
import json
import os
import shutil
import subprocess
import sys
import tempfile
import time
import zipfile

# Password used by every .jsdos/.DCD archive served by the original site; the
# emulator core applies it automatically (see DSH.md).
BUNDLE_PASSWORD = "You're so talented!"

DOSBOX_CONF = """\
# DOSBox-X machine configuration for {title}.
# Machine settings follow the DosWasmX project's dist/dosbox-x-for-web.conf
# (MIT licensed - https://github.com/nbarkhina/DosWasmX), which is the
# configuration this image was built with. Adjust and rebuild if needed.

[sdl]
autolock=true
showdetails=true
showmenu=false
mouse_wheel_key=1

[dosbox]
title={title}
memsize={memsize}

[video]
vmemsize=8
vesa modelist width limit=0
vesa modelist height limit=0

[dos]
ver=7.1
hard drive data rate limit=0
floppy drive data rate limit=0

[cpu]
cputype=pentium_mmx
core=normal
cycles=auto

[sblaster]
sbtype=sb16vibra

[fdc, primary]
int13fakev86io=true

[ide, primary]
int13fakeio=true
int13fakev86io=true

[ide, secondary]
int13fakeio=true
int13fakev86io=true
cd-rom insertion delay=4000

[render]
scaler=none

# The DOSBox-X build behind this player emulates a 3Dfx Voodoo card by default.
# A Windows 9x guest without the 3dfx drivers then reports "New Hardware Found:
# 3Dfx Voodoo" and asks for the Windows CD. These images do not need Glide, so
# the card is turned off; set voodoo_card=true if a game really needs it (and
# the guest has drivers).
[voodoo]
voodoo_card=false

[autoexec]
@echo off
mount x /home/web_user_x
x:
if exist x:\\ddyxauto.bat call x:\\ddyxauto.bat
imgmount c /home/web_user_x/{image_name}
boot c:
"""


def human(size):
    for unit in ("B", "KB", "MB", "GB"):
        if size < 1024 or unit == "GB":
            return f"{size:,.1f} {unit}" if unit != "B" else f"{size:,} B"
        size /= 1024


def main():
    parser = argparse.ArgumentParser(description=__doc__,
                                     formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("image", help="path to the .img hard-disk image")
    parser.add_argument("--name", required=True,
                        help="bundle base name, e.g. pandoras-box (image is stored as <name>.img)")
    parser.add_argument("--title", default=None, help="title written into the DOSBox-X config")
    parser.add_argument("--memsize", type=int, default=64, help="RAM in MB (DosWasmX default is 32)")
    parser.add_argument("--out", default=None, help="output path (default games/<name>.jsdos)")
    parser.add_argument("--root", default=os.path.dirname(os.path.abspath(__file__)))
    args = parser.parse_args()

    image = os.path.abspath(args.image)
    if not os.path.isfile(image):
        sys.exit(f"image not found: {image}")
    if shutil.which("zip") is None:
        sys.exit("the Info-ZIP 'zip' tool is required (apt install zip)")

    out = args.out or os.path.join(args.root, "games", args.name + ".jsdos")
    os.makedirs(os.path.dirname(out), exist_ok=True)
    title = args.title or args.name
    image_name = args.name + ".img"

    staging = tempfile.mkdtemp(prefix="doswasmx-import-")
    try:
        # Hard link instead of copying: no extra disk space, no 800 MB copy.
        link = os.path.join(staging, image_name)
        try:
            os.link(image, link)
        except OSError:
            shutil.copy2(image, link)

        conf_dir = os.path.join(staging, ".jsdos")
        os.makedirs(conf_dir, exist_ok=True)
        with open(os.path.join(conf_dir, "dosbox.conf"), "w", encoding="utf-8") as fh:
            fh.write(DOSBOX_CONF.format(title=title, memsize=args.memsize, image_name=image_name))

        print(f"packing {human(os.path.getsize(image))} image (store-only, encrypted)...")
        started = time.time()
        subprocess.run([
            "zip", "-q", "-0", "-X", "-P", BUNDLE_PASSWORD,
            out, os.path.join(".jsdos", "dosbox.conf"), image_name,
        ], cwd=staging, check=True)
        elapsed = time.time() - started
    finally:
        shutil.rmtree(staging, ignore_errors=True)

    size = os.path.getsize(out)
    with zipfile.ZipFile(out) as zf:
        names = zf.namelist()
        encrypted = all(info.flag_bits & 0x1 for info in zf.infolist())
    print(f"wrote {out} ({human(size)}) in {elapsed:.1f}s")
    print(f"  entries: {', '.join(names)}  encrypted={encrypted}")

    bundle_url = "/games/" + os.path.basename(out)
    print("\n--- add to catalog.js -------------------------------------------------")
    print(json.dumps({
        "id": args.name.replace("-", "_"),
        "title": title,
        "os": "windows",
        "osLabel": "Windows 98",
        "year": 1999,
        "publisher": "Microsoft",
        "genre": "Puzzle",
        "playUrl": "/play.html?game=" + args.name.replace("-", "_"),
        "description": "Boots the DosWasmX Windows 98 machine image (image stored under games/).",
        "files": [bundle_url],
        "optionalFiles": [],
    }, indent=4))

    print("\n--- config-" + args.name + ".js --------------------------------------")
    print(f"""window.LOCAL_GAME_CONFIG = {{
    gameId: "{args.name.replace("-", "_")}",
    title: {json.dumps(title)},
    version: "20261007",

    // Bundle that the worker streams and extracts; the image inside it lands at
    // /home/web_user_x/{image_name}.
    gameBundle: "{bundle_url}",
    streamBundle: true,

    // Non-Windows-image mode: no DCD system/game/CD downloads, no Win95 patch.
    settingsType: 0,
    autoCommand: "imgmount c /home/web_user_x/{image_name}\\r\\nboot c:\\r\\n",

    tool: "/games",
    toolImage: "/bin/windows/tools/tools.zip",
    win95Patch: "",
    osImages: "",
    gameImages: "",
    cdImages: [],
    skipWin95Patch: false,
    imageVersion: "1",
    forceBuild: "auto",

    expectedSize: {size},
    requiredFiles: ["{bundle_url}"],
    optionalFiles: []
}};""")


if __name__ == "__main__":
    main()
