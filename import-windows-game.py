#!/usr/bin/env python3
"""Import a Windows 9x machine disk as a "DDYX Windows game" (settingsType 1).

This builds the same layout the original site uses for StarCraft: Brood War, so a
game runs through the identical player flow:

    games/<name>.jsdos                     small bundle: .jsdos/dosbox.conf and
                                           DDYX/starter.ini (auto-launch), stored
                                           and encrypted like the site's bundles
    games/bin/windows/images/os/<OS>.DCD   the machine disk, converted to a
                                           dynamic VHD and named sysddiff.vhd,
                                           which the flow extracts to
                                           /home/web_user_x and mounts as C:
                                           (DOSBox-X needs a real VHD there)
    games/bin/windows/images/disc/<CD>.DCD optional game CD (an ISO inside), which
                                           the flow mounts and offers in the disc
                                           menu ("Switch Disc")

The flow then injects its shell (dshell.exe + SYSTEM.ini + MSDOS.SYS from the
tools archive) and runs the application named in DDYX/starter.ini after Windows
starts, exactly like the StarCraft entry.

Usage:
    python3 import-windows-game.py --disk disks/pandora.img --name pandoras-box \
        --title "Pandora's Box" --starter "C:\\PROGRA~1\\MICROS~1\\PANDOR~1\\PANDORA.EXE" \
        --cd game_to_import/PANDORA.iso --cd-name "Pandora's Box CD"

Then use the printed config snippet as config-<name>.js.
"""

import argparse
import json
import os
import re
import shutil
import struct
import subprocess
import sys
import tempfile
import time

# Password used by every .jsdos/.DCD archive of the original site; the emulator
# applies it automatically.
ARCHIVE_PASSWORD = "You're so talented!"

DOSBOX_CONF = """\
[sdl]
autolock=true
showdetails=true
showmenu=false
mouse_wheel_key=1

[dosbox]
title={title}
memsize={memsize}
startbanner=false
fastbioslogo=true

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
cycles=max

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

# The DOSBox-X build behind this player emulates a 3Dfx Voodoo card by default.
# A Windows 9x guest without the 3dfx drivers stops at "New Hardware Found" and
# asks for the Windows CD, so the card stays off unless a game needs Glide.
[voodoo]
voodoo_card=false

[render]
scaler=none

[autoexec]
@echo off
mount x /home/web_user/DDYX
x:
ddyxauto.bat
"""


def build_zip(out, entries, cwd):
    if os.path.exists(out):
        os.remove(out)                       # zip updates existing archives in place
    started = time.time()
    subprocess.run(["zip", "-q", "-0", "-X", "-P", ARCHIVE_PASSWORD, os.path.abspath(out)] + entries,
                   cwd=cwd, check=True)
    print(f"  {out}  {os.path.getsize(out):,} bytes  ({time.time() - started:.1f}s)")


# --- VHD writer ------------------------------------------------------------
# DOSBox-X's "imgmount c <file>.vhd" dispatches on the extension and requires a
# real VHD ("The specified VHD file is corrupt and cannot be opened" otherwise),
# so a raw machine image has to be wrapped. It must be a *fixed* VHD: DOSBox-X
# derives the drive geometry by reading the image's partition table at offset 0,
# which only works when the disk data starts there (a dynamic VHD begins with its
# header copy, so geometry detection fails with "Could not extract drive
# geometry from image" and the boot then fails). A fixed VHD is the raw disk with
# a 512-byte footer appended, which keeps that offset intact.

VHD_COOKIE = b"conectix"
# 16 heads / 63 sectors per track, the convention the site's own VHDs use; the
# cylinder count is exact for the usual disk sizes.
VHD_HEADS = 16
VHD_SECTORS_PER_TRACK = 63


def vhd_geometry(size):
    total_sectors = size // 512
    cylinders = min(total_sectors // (VHD_HEADS * VHD_SECTORS_PER_TRACK), 65535)
    return cylinders, VHD_HEADS, VHD_SECTORS_PER_TRACK


def vhd_checksum(block):
    return (~sum(block)) & 0xFFFFFFFF


def vhd_footer(size, unique_id, disk_type):
    cylinders, heads, sectors = vhd_geometry(size)
    footer = bytearray(512)
    footer[0:8] = VHD_COOKIE
    struct.pack_into(">I", footer, 8, 0x00000002)             # features: reserved
    struct.pack_into(">I", footer, 12, 0x00010000)            # file format version
    # Fixed disks have no header structure to point at.
    struct.pack_into(">Q", footer, 16, 0xFFFFFFFFFFFFFFFF)
    struct.pack_into(">I", footer, 24, int(time.time()) - 946684800)   # seconds since 2000-01-01
    footer[28:32] = b"win "
    struct.pack_into(">I", footer, 32, 0x000A0000)            # creator version
    footer[36:40] = b"Wi2k"
    struct.pack_into(">Q", footer, 40, size)                  # original size
    struct.pack_into(">Q", footer, 48, size)                  # current size
    struct.pack_into(">I", footer, 56, (cylinders << 16) | (heads << 8) | sectors)
    struct.pack_into(">I", footer, 60, disk_type)             # 2 = fixed
    footer[68:84] = unique_id
    struct.pack_into(">I", footer, 64, vhd_checksum(footer))
    return bytes(footer)


def convert_to_vhd(source, target):
    """Raw disk image -> fixed VHD (data at offset 0, footer appended)."""
    size = os.path.getsize(source)
    started = time.time()
    with open(source, "rb") as src, open(target, "wb") as dst:
        shutil.copyfileobj(src, dst, 8 << 20)
        dst.write(vhd_footer(size, os.urandom(16), 2))
    print(f"  {target}  {os.path.getsize(target):,} bytes "
          f"(fixed VHD, {time.time() - started:.0f}s)")



# --- minimal FAT reader ----------------------------------------------------
# The DDYX flow copies DDYX1.BIN over C:\WINDOWS\SYSTEM.ini and DDYX2.BIN over
# C:\MSDOS.SYS. The tools archive ships the *Windows 95* versions, and its
# SYSTEM.ini names display.drv=pnpdrvr.drv - a driver a Windows 98 disk does not
# have, which makes the guest boot with no display driver at all (a black screen
# that never changes). Files placed in the bundle's DDYX/ folder are copied over
# the tools archive afterwards, so the guest's own files can be injected instead.
# Reading them needs just enough FAT to fetch two files.

class FatImage:
    """Read-only lookups in the FAT12/16/32 volume of a raw disk or VHD."""

    def __init__(self, path):
        self.fh = open(path, "rb")
        self.base = self._partition_offset()
        bpb = self._read(self.base, 512)
        self.bytes_per_sector = struct.unpack_from("<H", bpb, 11)[0]
        self.sectors_per_cluster = bpb[13]
        reserved = struct.unpack_from("<H", bpb, 14)[0]
        fats = bpb[16]
        self.root_entries = struct.unpack_from("<H", bpb, 17)[0]
        fat_sectors = struct.unpack_from("<H", bpb, 22)[0] or struct.unpack_from("<I", bpb, 36)[0]
        self.root_cluster = struct.unpack_from("<I", bpb, 44)[0]
        self.fat_base = self.base + reserved * self.bytes_per_sector
        self.data_base = self.fat_base + fats * fat_sectors * self.bytes_per_sector
        self.cluster_bytes = self.sectors_per_cluster * self.bytes_per_sector
        if not self.bytes_per_sector:
            raise ValueError("not a FAT volume")

    def _partition_offset(self):
        self.fh.seek(0)
        mbr = self.fh.read(512)
        for i in range(4):
            entry = mbr[446 + i * 16: 446 + (i + 1) * 16]
            if entry[4] in (0x01, 0x04, 0x06, 0x0B, 0x0C, 0x0E) and entry[0] != 0:
                return struct.unpack_from("<I", entry, 8)[0] * 512
        return 0

    def _read(self, offset, length):
        self.fh.seek(offset)
        return self.fh.read(length)

    def _cluster_offset(self, cluster):
        return self.data_base + (cluster - 2) * self.cluster_bytes

    def _next_cluster(self, cluster):
        entry = self.fat_base + cluster * 4                 # FAT32 only; enough here
        value = struct.unpack("<I", self._read(entry, 4))[0] & 0x0FFFFFFF
        return None if value >= 0x0FFFFFF8 else value

    def _chain(self, cluster):
        seen = 0
        while cluster and cluster < 0x0FFFFFF8 and seen < 100000:
            yield cluster
            cluster = self._next_cluster(cluster)
            seen += 1

    def _entries(self, cluster):
        for current in self._chain(cluster):
            data = self._read(self._cluster_offset(current), self.cluster_bytes)
            for i in range(0, len(data), 32):
                entry = data[i:i + 32]
                if not entry or entry[0] == 0:
                    return
                yield entry

    @staticmethod
    def _short_name(entry):
        name = entry[0:8].decode("latin-1").rstrip(" ")
        extension = entry[8:11].decode("latin-1").rstrip(" ")
        return name + ("." + extension if extension else "")

    def listdir(self, path):
        cluster = self.root_cluster
        for part in [p for p in path.replace("\\", "/").split("/") if p and p != "."]:
            found = None
            for entry in self._entries(cluster):
                if entry[0] == 0xE5 or entry[11] & 0x0F == 0x0F or entry[11] & 0x08:
                    continue
                if self._short_name(entry).upper() == part.upper():
                    found = struct.unpack_from("<H", entry, 20)[0] << 16 | \
                            struct.unpack_from("<H", entry, 26)[0]
                    break
            if found is None:
                raise FileNotFoundError(path)
            cluster = found
        return cluster

    def read_file(self, path):
        directory, _, name = path.replace("\\", "/").rpartition("/")
        cluster = self.listdir(directory)
        for entry in self._entries(cluster):
            if entry[0] == 0xE5 or entry[11] & 0x0F == 0x0F or entry[11] & 0x08:
                continue
            if self._short_name(entry).upper() == name.upper():
                size = struct.unpack_from("<I", entry, 28)[0]
                start = struct.unpack_from("<H", entry, 20)[0] << 16 | \
                        struct.unpack_from("<H", entry, 26)[0]
                data = bytearray()
                for current in self._chain(start):
                    data += self._read(self._cluster_offset(current), self.cluster_bytes)
                    if len(data) >= size:
                        break
                return bytes(data[:size])
        raise FileNotFoundError(path)


def main():
    parser = argparse.ArgumentParser(description=__doc__,
                                     formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--disk", required=True, help="Windows 9x machine disk (.img)")
    parser.add_argument("--name", required=True, help="bundle base name, e.g. pandoras-box")
    parser.add_argument("--title", required=True, help="game title")
    parser.add_argument("--starter", required=True,
                        help="program the guest should launch, e.g. C:\\GAME\\GAME.EXE")
    parser.add_argument("--memsize", type=int, default=128, help="RAM in MB (site uses 256 for Win95)")
    parser.add_argument("--os-image", default=None,
                        help="name of the system archive (default <NAME>_OS.DCD)")
    parser.add_argument("--dshell", action="store_true",
                        help="make the guest's shell dshell.exe so it auto-starts the game "
                             "(default: keep the guest's own shell)")
    parser.add_argument("--no-shell-override", action="store_true",
                        help="do not inject the guest's own SYSTEM.INI/MSDOS.SYS "
                             "(keeps the Windows 95 ones from the tools archive)")
    parser.add_argument("--no-vhd", action="store_true",
                        help="the --disk input is already a VHD (skip conversion)")
    parser.add_argument("--cd", default=None, help="optional game CD image (.iso)")
    parser.add_argument("--cd-name", default=None, help="display name for the CD")
    parser.add_argument("--root", default=os.path.dirname(os.path.abspath(__file__)))
    args = parser.parse_args()

    disk = os.path.abspath(args.disk)
    if not os.path.isfile(disk):
        sys.exit(f"disk not found: {disk}")
    if shutil.which("zip") is None:
        sys.exit("the Info-ZIP 'zip' tool is required (apt install zip)")

    os_image = args.os_image or (args.name.upper().replace("-", "_") + "_OS.DCD")
    bundle = os.path.join(args.root, "games", args.name + ".jsdos")
    os_archive = os.path.join(args.root, "games", "bin", "windows", "images", "os", os_image)
    for path in (bundle, os_archive):
        os.makedirs(os.path.dirname(path), exist_ok=True)

    # --- 1. the bundle: dosbox config + starter.ini -----------------------
    stage = tempfile.mkdtemp(prefix="ddx-bundle-")
    try:
        os.makedirs(os.path.join(stage, ".jsdos"))
        os.makedirs(os.path.join(stage, "DDYX"))
        with open(os.path.join(stage, ".jsdos", "dosbox.conf"), "w", encoding="utf-8") as fh:
            fh.write(DOSBOX_CONF.format(title=args.title, memsize=args.memsize))
        with open(os.path.join(stage, "DDYX", "starter.ini"), "w", encoding="utf-8") as fh:
            fh.write("[start]\napp=" + args.starter + "\n")

        # The tools archive (extracted to /home/web_user/DDYX) carries the
        # Windows 95 SYSTEM.ini/MSDOS.SYS that the flow copies into C:. This
        # bundle's DDYX/ folder is copied over that folder afterwards, so files
        # placed here win. Inject the guest's own two files: the Win95
        # SYSTEM.ini sets shell=dshell.exe and a Win95 driver set, which a
        # Windows 98 guest answers with a black screen that never changes.
        if not args.no_shell_override:
            fat = FatImage(disk)
            system_ini = fat.read_file("\\WINDOWS\\SYSTEM.INI").decode("latin-1")
            msdos_sys = fat.read_file("\\MSDOS.SYS").decode("latin-1")
            if args.dshell:
                system_ini = re.sub(r"(?im)^shell\s*=.*$", "shell=dshell.exe", system_ini)
            with open(os.path.join(stage, "DDYX", "DDYX1.BIN"), "w", encoding="latin-1") as fh:
                fh.write(system_ini)
            with open(os.path.join(stage, "DDYX", "DDYX2.BIN"), "w", encoding="latin-1") as fh:
                fh.write(msdos_sys)
            shell = "dshell.exe (auto-start)" if args.dshell else "the guest's own"
            print(f"  injected the guest's SYSTEM.INI / MSDOS.SYS, shell = {shell}")
        print("bundle:")
        entries = [".jsdos/dosbox.conf", os.path.join("DDYX", "starter.ini")]
        entries += [os.path.join("DDYX", name) for name in ("DDYX1.BIN", "DDYX2.BIN")
                    if os.path.exists(os.path.join(stage, "DDYX", name))]
        build_zip(bundle, entries, stage)
    finally:
        shutil.rmtree(stage, ignore_errors=True)

    # --- 2. the system image archive (mounted as C:) ----------------------
    # The flow mounts this file as "imgmount c .../sysddiff.vhd"; DOSBox-X picks
    # its VHD driver from the extension, so the disk must really be a VHD. Stage
    # inside the workspace so nothing large is copied across file systems.
    stage = tempfile.mkdtemp(prefix=".import-os-", dir=args.root)
    try:
        linked = os.path.join(stage, "sysddiff.vhd")
        with open(disk, "rb") as handle:                     # already a VHD?
            handle.seek(-512, os.SEEK_END)
            is_vhd = handle.read(8) == VHD_COOKIE
        if is_vhd or args.no_vhd:
            try:
                os.link(disk, linked)
            except OSError:
                shutil.copy2(disk, linked)
        else:
            print("converting the machine disk to a dynamic VHD:")
            convert_to_vhd(disk, linked)
        print("system image archive:")
        build_zip(os_archive, ["sysddiff.vhd"], stage)
    finally:
        shutil.rmtree(stage, ignore_errors=True)

    # --- 3. optional game CD ----------------------------------------------
    cd_entry = None
    if args.cd:
        cd = os.path.abspath(args.cd)
        if not os.path.isfile(cd):
            sys.exit(f"CD image not found: {cd}")
        mount = os.path.basename(cd).upper()
        cd_archive = os.path.join(args.root, "games", "bin", "windows", "images", "disc",
                                  args.name.upper().replace("-", "_") + ".DCD")
        os.makedirs(os.path.dirname(cd_archive), exist_ok=True)
        stage = tempfile.mkdtemp(prefix=".import-cd-", dir=args.root)
        try:
            linked = os.path.join(stage, mount)
            try:
                os.link(cd, linked)
            except OSError:
                shutil.copy2(cd, linked)
            print("game CD archive:")
            build_zip(cd_archive, [mount], stage)
        finally:
            shutil.rmtree(stage, ignore_errors=True)
        cd_entry = {
            # Disc links are fetched directly by the worker, not via tool + path,
            # so this one is site-absolute (the osImages path above is not).
            "link": "/games/bin/windows/images/disc/" + os.path.basename(cd_archive),
            "name": args.cd_name or args.title + " CD",
            "size": os.path.getsize(cd),
            "mount": mount,
        }

    # --- config snippet ---------------------------------------------------
    game_id = args.name.replace("-", "_")
    print("\n--- config-" + args.name + ".js --------------------------------------")
    config = {
        "gameId": game_id,
        "title": args.title,
        "version": "20261007",
        "gameBundle": "/games/" + os.path.basename(bundle),
        "streamBundle": False,
        "settingsType": 1,
        "tool": "/games",
        "toolImage": "/bin/windows/tools/tools.zip",
        "win95Patch": "",
        "osImages": "/bin/windows/images/os/" + os_image,
        "gameImages": "",
        "cdImages": [cd_entry] if cd_entry else [],
        "skipWin95Patch": False,
        "imageVersion": "1",
        "forceBuild": "auto",
        "expectedSize": os.path.getsize(disk) + (os.path.getsize(args.cd) if args.cd else 0),
        "requiredFiles": ["/games/" + os.path.basename(bundle),
                          "/games/bin/windows/images/os/" + os_image],
        "optionalFiles": [],
    }
    print("window.LOCAL_GAME_CONFIG = " + json.dumps(config, indent=4) + ";")
    print("\nThe DDYX flow mounts the archive's sysddiff.vhd as C:, injects its shell and")
    print("runs the starter.ini entry, so the guest boots straight into the game.")


if __name__ == "__main__":
    main()
