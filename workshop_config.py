#!/usr/bin/env python3
"""Generate player configs for the workshop (`GET /api/workshop/config`).

The workshop page collects files from the user (a Windows installation ISO, a
game ISO, a machine image) and then hands the player page a URL such as

    /play.html?config=/api/workshop/config?mode=gameinstall&iso=game&win=win98se&ram=256

This module turns that query into the `window.LOCAL_GAME_CONFIG` the player
expects, and builds whatever the player has to download for the machine to boot.

Machines are assembled the way this port has verified working: the disk image
travels inside a small `.jsdos` bundle (conf + image) and the boot commands are
passed as `auto_command`, which the player appends to the batch file its
autoexec runs. CDs are declared as `cdImages`, which the same code path
downloads, extracts and mounts (drive D: outside the Windows-image flow).

Nothing here redistributes anything: every image comes from the user's own
library directory.
"""

import hashlib
import json
import os
import re
import shutil
import subprocess
import tempfile
import zipfile

import vhd

# The player's extractor (libzip inside the DOSBox-X build) reads archives made
# by Info-ZIP reliably; a Python-written stored entry made it stall at 0 bytes.
# Bundles are therefore built with the same CLI the verified importers use, and
# encrypted with the password every archive on the site uses.
ARCHIVE_PASSWORD = "You're so talented!"

CACHE_DIR = "cache"
BLANK_FREE_BYTES = 1 << 16          # a "blank" disk is all zeros except the footer

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

# Off unless the machine was built with drivers for it: a Windows guest without
# the 3dfx driver stops at "New Hardware Found" and asks for the install CD.
[voodoo]
voodoo_card={voodoo}

[render]
scaler=none

[autoexec]
@echo off
mount x /home/web_user_x
x:
if exist x:\\ddyxauto.bat call x:\\ddyxauto.bat
"""


# --- library access --------------------------------------------------------

def load_index(library_dir):
    path = os.path.join(library_dir, "library.json")
    try:
        with open(path, encoding="utf-8") as handle:
            index = json.load(handle)
    except (OSError, ValueError):
        index = {}
    index.setdefault("windows", [])
    index.setdefault("games", [])
    return index


def find_entry(index, key, wanted):
    for entry in index.get(key, []):
        if entry.get("id") == wanted:
            return entry
    return None


def find_windows(library_dir, index, wanted):
    """A machine image by id, falling back to the file on disk.

    The index is one JSON file that several things write; if an entry was lost
    (a stale writer, a crash) the image is usually still in `windows/`, and an
    installation must not fail because of that.
    """
    entry = find_entry(index, "windows", wanted)
    if entry is not None:
        return entry
    if not wanted:
        return None
    for name in (wanted + ".vhd", wanted + ".img"):
        relative = os.path.join("windows", name)
        if os.path.isfile(library_path(library_dir, relative)):
            return {"id": wanted, "name": wanted, "file": relative,
                    "size": os.path.getsize(library_path(library_dir, relative))}
    return None


def library_path(library_dir, relative):
    """Resolve a library-relative path, refusing anything outside the library."""
    if not relative:
        return None
    candidate = os.path.normpath(os.path.join(library_dir, relative))
    root = os.path.normpath(library_dir)
    if candidate != root and not candidate.startswith(root + os.sep):
        return None
    return candidate


# --- bundle building -------------------------------------------------------

def _is_blank_image(path):
    """True for an image that is all zeros apart from the trailing VHD footer."""
    size = os.path.getsize(path)
    probe = min(size, 4 << 20)
    with open(path, "rb") as handle:
        chunk = handle.read(probe)
    if any(chunk):
        return False
    if size <= probe:
        return True
    # sample the middle and the end (minus the footer) as well
    with open(path, "rb") as handle:
        for offset in (size // 2, max(0, size - (512 + probe))):
            handle.seek(offset)
            if any(handle.read(min(probe, size - offset))):
                return False
    return True


def build_bundle(library_dir, image_path, image_name, title, memsize, voodoo,
                 auto_command, cache_key_extra=""):
    """Create (or reuse) a `.jsdos` bundle holding the conf and the disk image."""
    stat = os.stat(image_path)
    key = hashlib.sha256("|".join([
        os.path.basename(image_path), str(stat.st_size), str(int(stat.st_mtime)),
        title, str(memsize), str(voodoo), auto_command, cache_key_extra,
    ]).encode("utf-8")).hexdigest()[:20]
    cache = os.path.join(library_dir, CACHE_DIR)
    os.makedirs(cache, exist_ok=True)
    bundle = os.path.join(cache, "bundle-" + key + ".jsdos")
    if os.path.exists(bundle) and os.path.getsize(bundle) > 0:
        return bundle, key

    if shutil.which("zip") is None:
        raise RuntimeError("the Info-ZIP 'zip' tool is required to build bundles")
    stage = tempfile.mkdtemp(prefix=".bundle-", dir=os.path.dirname(bundle) or ".")
    try:
        os.makedirs(os.path.join(stage, ".jsdos"))
        with open(os.path.join(stage, ".jsdos", "dosbox.conf"), "w", encoding="utf-8") as handle:
            handle.write(DOSBOX_CONF.format(title=title, memsize=memsize,
                                            voodoo="true" if voodoo else "false"))
        linked = os.path.join(stage, image_name)
        try:
            os.link(image_path, linked)
        except OSError:
            shutil.copy2(image_path, linked)
        blank = _is_blank_image(image_path)
        # A blank disk is all zeros: deflating it keeps a 2 GB machine a few MB
        # to download. Anything with real data is stored, which is much faster.
        command = ["zip", "-q", "-X", "-P", ARCHIVE_PASSWORD, "-0" if not blank else "-1", bundle,
                   os.path.join(".jsdos", "dosbox.conf"), image_name]
        if os.path.exists(bundle):
            os.remove(bundle)
        subprocess.run(command, cwd=stage, check=True)
    finally:
        shutil.rmtree(stage, ignore_errors=True)
    return bundle, key


def extract_image_from_pack(pack_path, target_path):
    """Pull the machine image out of a pack the player exported.

    "Download Save File" produces a zip of the emulator's files; for a machine
    that boots from a disk image that zip contains the image (possibly as the
    only large member). The largest .vhd/.img/.raw member wins.
    """
    try:
        with zipfile.ZipFile(pack_path) as archive:
            candidates = [info for info in archive.infolist()
                          if re.search(r"\.(vhd|img|raw)$", info.filename, re.I)]
            if not candidates:
                return None
            best = max(candidates, key=lambda info: info.file_size)
            os.makedirs(os.path.dirname(target_path), exist_ok=True)
            temp = target_path + ".part"
            with archive.open(best) as source, open(temp, "wb") as out:
                while True:
                    chunk = source.read(8 << 20)
                    if not chunk:
                        break
                    out.write(chunk)
            os.replace(temp, target_path)
            return target_path
    except (OSError, zipfile.BadZipFile):
        return None


# --- config generation -----------------------------------------------------

def _config_text(config):
    return "window.LOCAL_GAME_CONFIG = " + json.dumps(config, indent=4) + ";\n"


def _error_config(title, message, detail=""):
    """A config the player can load that explains the problem.

    The player's warning box lists the `requiredFiles` it could not fetch, so the
    title carries the reason and the file is a name that makes the cause obvious.
    """
    return _config_text({
        "gameId": "workshop_error",
        "title": title,
        "osLabel": "Workshop",
        "settingsType": 0,
        "gameBundle": "/api/library/file?path=" + message,
        "streamBundle": False,
        "autoCommand": "",
        "cdImages": [], "osImages": "", "gameImages": "",
        "imageVersion": "0",
        "expectedSize": 0,
        "requiredFiles": ["/api/library/file?path=" + (detail or message)],
        "optionalFiles": [],
    })


def build_cd_wrapper(library_dir, relative, mount=None):
    """Wrap a disc image in the store-only *encrypted* zip the player expects.

    The player's extractor handles the ZipCrypto archives the site uses
    everywhere (`zip -P`); an unencrypted stored zip makes it sit at 0 % for
    ever, which is what a hand-written or Python-written archive did. The
    wrapper is cached next to the bundles.
    """
    path = library_path(library_dir, relative)
    if not path or not os.path.isfile(path):
        return None
    mount = (mount or os.path.basename(relative)).upper()
    stat = os.stat(path)
    key = hashlib.sha256("|".join([relative, str(stat.st_size), str(int(stat.st_mtime)), mount])
                         .encode("utf-8")).hexdigest()[:20]
    cache = os.path.join(library_dir, CACHE_DIR)
    os.makedirs(cache, exist_ok=True)
    wrapper = os.path.join(cache, "cd-" + key + ".zip")
    if not os.path.exists(wrapper) or os.path.getsize(wrapper) == 0:
        if shutil.which("zip") is None:
            raise RuntimeError("the Info-ZIP 'zip' tool is required to wrap disc images")
        stage = tempfile.mkdtemp(prefix=".cd-", dir=cache)
        try:
            linked = os.path.join(stage, mount)
            try:
                os.link(path, linked)
            except OSError:
                shutil.copy2(path, linked)
            if os.path.exists(wrapper):
                os.remove(wrapper)
            subprocess.run(["zip", "-q", "-0", "-X", "-P", ARCHIVE_PASSWORD, wrapper, mount],
                           cwd=stage, check=True)
        finally:
            shutil.rmtree(stage, ignore_errors=True)
    return wrapper, key, mount


def _cd_entry(library_dir, relative, name=None):
    wrapped = build_cd_wrapper(library_dir, relative)
    if wrapped is None:
        return None
    wrapper, _key, mount = wrapped
    return {
        # A cached, encrypted zip of the ISO: the player downloads it, extracts
        # it and mounts the entry name below.
        "link": "/api/library/file?path=" + _quote(os.path.relpath(wrapper, library_dir)),
        "name": name or os.path.splitext(os.path.basename(relative))[0],
        "size": os.path.getsize(library_path(library_dir, relative)),
        "mount": mount,
    }


def _quote(value):
    from urllib.parse import quote
    return quote(value, safe="")


def _memsize(query, default=256):
    try:
        value = int(query.get("ram") or default)
    except (TypeError, ValueError):
        return default
    return max(16, min(1024, value))


def _mount_line(image_path, image_name, boot):
    """`imgmount c <file> -size ...` plus the boot command.

    The explicit `-size bps,spc,hpc,cyl` matters: DOSBox-X otherwise derives the
    drive geometry from the image's partition table, and silently ends up with
    no C: at all when that fails (an empty disk, or a disk whose table it cannot
    read). The geometry always comes from the VHD footer, so it is right even
    for an image the emulator has never seen.
    """
    return ("imgmount c /home/web_user_x/" + image_name +
            " -size " + vhd.imgmount_geometry(image_path) + "\r\n" +
            "boot " + boot + ":\r\n")


def build_config(query, library_dir):
    """Return the JavaScript for /api/workshop/config?<query>."""
    mode = (query.get("mode") or "").strip()
    library_dir = os.path.abspath(library_dir)
    index = load_index(library_dir)

    if mode == "wininstall":
        # Boot the freshly created (blank) disk and the Windows CD so the guest
        # can partition, format and install; the first boot target is the CD.
        entry = find_windows(library_dir, index, query.get("disk"))
        if entry is None:
            return _error_config("Cannot start the installation: no machine image called " +
                                 repr(query.get("disk")), "unknown windows image",
                                 "windows/" + (query.get("disk") or "") + ".vhd")
        image = library_path(library_dir, entry.get("file"))
        if not image or not os.path.isfile(image):
            return _error_config("Windows installation", "missing image file", entry.get("file") or "")
        iso = _cd_entry(library_dir, _iso_path_for(index, query.get("iso"), library_dir), "Windows CD") \
            if query.get("iso") else None
        title = "Install " + (entry.get("name") or entry.get("id"))
        bundle, key = build_bundle(
            library_dir, image, os.path.basename(entry["file"]), title,
            _memsize(query), False,
            # The flow mounts CD images as D: outside the Windows-image flow.
            _mount_line(image, os.path.basename(entry["file"]), "d"))
        return _config_text({
            "gameId": "workshop_wininstall",
            "title": title,
            "osLabel": "Windows installation",
            "settingsType": 0,
            "gameBundle": "/api/library/file?path=" + _quote(os.path.relpath(bundle, library_dir)),
            "streamBundle": False,
            "autoCommand": _mount_line(image, os.path.basename(entry["file"]), "d"),
            "cdImages": [iso] if iso else [],
            "osImages": "", "gameImages": "",
            "imageVersion": key,
            "expectedSize": (entry.get("size") or 0) + (iso.get("size") if iso else 0),
            "requiredFiles": ["/api/library/file?path=" + _quote(os.path.relpath(bundle, library_dir))],
            "optionalFiles": [iso["link"]] if iso else [],
        })

    if mode in ("gameinstall", "play"):
        if mode == "play":
            game = find_entry(index, "games", query.get("game"))
            if game is None:
                return _error_config("Workshop game", "unknown game", query.get("game") or "")
            windows = find_windows(library_dir, index, game.get("windows"))
            base = library_path(library_dir, (windows or {}).get("file"))
            # The game installation is exported as a pack; its machine image is
            # pulled out once and reused from then on.
            image = library_path(library_dir, os.path.join("games", game["id"] + ".vhd"))
            if image is None or not os.path.isfile(image):
                pack = library_path(library_dir, game.get("diff"))
                if not pack or not os.path.isfile(pack):
                    return _error_config(game.get("title") or "Workshop game",
                                         "missing game image", game.get("diff") or "")
                extracted = extract_image_from_pack(pack, image)
                if not extracted:
                    # Nothing image-like in the pack: the base image alone still
                    # boots, but the game would not be there.
                    return _error_config(game.get("title") or "Workshop game",
                                         "no disk image inside the uploaded pack",
                                         game.get("diff") or "")
            title = game.get("title") or game.get("id")
            iso = _cd_entry(library_dir, game.get("iso"), title + " CD") if game.get("iso") else None
            bundle, key = build_bundle(
                library_dir, image, os.path.basename(image), title, _memsize(query), False,
                _mount_line(image, os.path.basename(image), "c"),
                cache_key_extra=str(game.get("created") or ""))
            return _config_text({
                "gameId": "custom_" + game["id"],
                "title": title,
                "osLabel": "Windows",
                "year": game.get("year"),
                "publisher": game.get("publisher"),
                "genre": game.get("genre"),
                "settingsType": 0,
                "gameBundle": "/api/library/file?path=" + _quote(os.path.relpath(bundle, library_dir)),
                "streamBundle": False,
                "autoCommand": _mount_line(image, os.path.basename(image), "c"),
                "cdImages": [iso] if iso else [],
                "osImages": "", "gameImages": "",
                "imageVersion": key,
                "expectedSize": os.path.getsize(image) + (iso.get("size") if iso else 0),
                "requiredFiles": ["/api/library/file?path=" + _quote(os.path.relpath(bundle, library_dir))],
                "optionalFiles": [iso["link"]] if iso else [],
            })

        # gameinstall: boot the user's Windows image with the game CD mounted so
        # the installer can run. "Download Save File" then exports the machine.
        entry = find_windows(library_dir, index, query.get("win"))
        if entry is None:
            return _error_config("Cannot start the installation: no machine image called " +
                                 repr(query.get("win")), "unknown windows image",
                                 "windows/" + (query.get("win") or "") + ".vhd")
        image = library_path(library_dir, entry.get("file"))
        if not image or not os.path.isfile(image):
            return _error_config("Game installation", "missing image file", entry.get("file") or "")
        iso = _cd_entry(library_dir, _iso_path_for(index, query.get("iso"), library_dir), "Game CD")
        title = "Install game on " + (entry.get("name") or entry.get("id"))
        bundle, key = build_bundle(
            library_dir, image, os.path.basename(entry["file"]), title, _memsize(query), False,
            "imgmount c /home/web_user_x/" + os.path.basename(entry["file"]) + "\r\nboot c:\r\n")
        return _config_text({
            "gameId": "workshop_gameinstall",
            "title": title,
            "osLabel": "Game installation",
            "settingsType": 0,
            "gameBundle": "/api/library/file?path=" + _quote(os.path.relpath(bundle, library_dir)),
            "streamBundle": False,
            "autoCommand": _mount_line(image, os.path.basename(entry["file"]), "c"),
            "cdImages": [iso] if iso else [],
            "osImages": "", "gameImages": "",
            "imageVersion": key,
            "expectedSize": (entry.get("size") or 0) + (iso.get("size") if iso else 0),
            "requiredFiles": ["/api/library/file?path=" + _quote(os.path.relpath(bundle, library_dir))],
            "optionalFiles": [iso["link"]] if iso else [],
        })

    return _error_config("Workshop", "unknown mode", mode)


def _iso_path_for(index, iso_id, library_dir):
    """ISOs are uploaded as kind=iso; the id is the stored basename sans suffix."""
    if not iso_id:
        return None
    for name in (iso_id + ".iso", iso_id + ".bin", iso_id + ".cue", iso_id):
        candidate = library_path(library_dir, os.path.join("iso", name))
        if candidate and os.path.isfile(candidate):
            return os.path.join("iso", name)
    return None
