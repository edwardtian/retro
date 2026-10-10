#!/usr/bin/env python3
"""Local hosting server for the dumped Retro Online "dosx" player.

Why not `python3 -m http.server`? The classic DOSBox-X WebAssembly build needs:
  * Cross-Origin-Opener-Policy: same-origin
  * Cross-Origin-Embedder-Policy: require-corp
so the page becomes cross-origin isolated (SharedArrayBuffer), and the WASM
core must be served with `application/wasm`. Big image files are also
downloaded with Range requests by the emulator, which http.server does not
support. This server handles all three.

It also owns the Workshop's data directory (`--library-dir`, default
`library/`): the `/api/library/*` endpoints create blank machines, take
multi-GB uploads, register games and stream stored files/imaged archives.

Usage:
    python3 serve.py [--host 127.0.0.1] [--port 8000] [--root .] [--library-dir library]
"""

import argparse
import contextlib
import json
import os
import re
import socket
import socketserver
import struct
import sys
import tempfile
import threading
import time
import zipfile

import vhd                     # VHD helpers shared with the workshop and importers
import zlib
import auth                     # accounts, sessions, per-user game grants
from email.utils import formatdate
from http.server import SimpleHTTPRequestHandler
from urllib.parse import parse_qs, quote, urlsplit

# Disc images offered in the player's "Switch Disc" menu. Drop files into
# games/discs/ and they appear there (the player asks for /api/discs).
DISC_DIRECTORY = os.path.join("games", "discs")
DISC_EXTENSIONS = (".iso", ".img", ".cue", ".bin", ".dcd", ".mdf")

MIME = {
    ".html": "text/html; charset=utf-8",
    ".md": "text/plain; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".mjs": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".json": "application/json",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".webp": "image/webp",
    ".ico": "image/x-icon",
    ".ttf": "font/ttf",
    ".woff": "font/woff",
    ".woff2": "font/woff2",
    ".wasm": "application/wasm",
    # Emulator / game data: always download as opaque binary.
    ".jsdos": "application/octet-stream",
    ".dcd": "application/octet-stream",
    ".zip": "application/octet-stream",
    ".vhd": "application/octet-stream",
    ".m4a": "audio/mp4",
}

NO_CACHE_SUFFIXES = (".js", ".wasm", ".html", ".css")
# Game data: the emulator keeps its own copy in the browser's OPFS cache, and a
# stale HTTP copy of a multi-hundred-MB image is never useful. "no-store" keeps
# the browser from answering a replaced file out of its HTTP cache.
NO_STORE_SUFFIXES = (".dcd", ".jsdos", ".zip", ".vhd", ".bin", ".iso")


# --- Workshop library ------------------------------------------------------
# The Workshop page builds the user's own machines and games into one data
# directory (default ./library), which serve.py owns end to end:
#
#   library/library.json       the index: {"windows": [...], "games": [...]}
#   library/windows/<id>.vhd   machine disks (fixed VHDs or uploaded images)
#   library/games/<id>.<ext>   game packs (.ddyx/.zip/...) and patches
#   library/iso/<id>.<ext>     install and utility CDs
#   library/cache/crc.json     CRC32 cache for the streaming zip endpoint
#
# Every path kept in the index is relative to library/, so the directory can be
# moved or deleted as a whole. The images are the user's own; none of this is
# redistributed with the site.
LIBRARY_SUBDIRS = {"windows": "windows", "game": "games", "iso": "iso"}
UPLOAD_EXTENSIONS = (".vhd", ".img", ".ddyx", ".zip", ".iso", ".bin", ".cue")
IMAGE_EXTENSIONS = (".vhd", ".img")
BLANK_MIN_SIZE = 16 << 20              # 16 MiB
BLANK_MAX_SIZE = 64 << 30              # 64 GiB
COPY_CHUNK = 8 << 20                   # 8 MiB, the size import-windows-game.py uses

# The player's Windows flow ("osImages") extracts the archive into
# /home/web_user_x and then mounts /home/web_user_x/sysddiff.vhd as C:, so an
# archive handed to the player has to carry that name (see the ?entry= option
# on the zip endpoints).
ZIP64_LIMIT = 0xFFFFFFFF     # smallest size a 32-bit size field cannot hold
ZIP32_MAX = 0xFFFFFFFF       # the "look in the ZIP64 extra field" placeholder

_LIBRARY_LOCK = threading.RLock()      # one metadata writer per process
_LIBRARY_FILE_LOCK = None              # cross-process guard for library.json


@contextlib.contextmanager
def library_write_lock(directory):
    """Serialise library.json writers across processes.

    The index is a single JSON file and the site is easy to run twice (a second
    `serve.py` on another port, a leftover server), so a threading lock is not
    enough: without this, a writer that read the index earlier silently drops
    entries another process just added.
    """
    global _LIBRARY_FILE_LOCK
    with _LIBRARY_LOCK:
        path = os.path.join(directory, ".library.lock")
        handle = None
        try:
            os.makedirs(directory, exist_ok=True)
            handle = open(path, "a+")
            try:
                import fcntl
                fcntl.flock(handle.fileno(), fcntl.LOCK_EX)
            except ImportError:                       # non-POSIX: best effort
                pass
            yield
        finally:
            if handle is not None:
                try:
                    import fcntl
                    fcntl.flock(handle.fileno(), fcntl.LOCK_UN)
                except ImportError:
                    pass
                handle.close()
_ID_PATTERN = re.compile(r"^[A-Za-z0-9._-]{1,128}$")


class ApiError(Exception):
    """A failure the API reports as {"error": ...} with a status code."""

    def __init__(self, status, message):
        super().__init__(message)
        self.status = status
        self.message = message


def now_stamp():
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


def library_index_path(directory):
    return os.path.join(directory, "library.json")


def library_crc_path(directory):
    return os.path.join(directory, "cache", "crc.json")


def ensure_library(directory):
    """Create the data directory, its subdirectories and an empty index."""
    os.makedirs(directory, exist_ok=True)
    os.makedirs(os.path.join(directory, "cache"), exist_ok=True)
    for sub in LIBRARY_SUBDIRS.values():
        os.makedirs(os.path.join(directory, sub), exist_ok=True)
    if not os.path.isfile(library_index_path(directory)):
        write_library_json(library_index_path(directory), {"windows": [], "games": []})


def write_library_json(path, payload):
    """Atomically replace a JSON file (temp file in the same directory)."""
    os.makedirs(os.path.dirname(path) or ".", exist_ok=True)
    handle, temp = tempfile.mkstemp(prefix="." + os.path.basename(path) + ".",
                                    suffix=".tmp", dir=os.path.dirname(path) or ".")
    os.chmod(temp, 0o644)              # mkstemp is 0600; these are the user's files
    try:
        with os.fdopen(handle, "w", encoding="utf-8") as out:
            json.dump(payload, out, indent=2, ensure_ascii=False)
            out.write("\n")
            out.flush()
            os.fsync(out.fileno())
        os.replace(temp, path)
    except BaseException:
        try:
            os.unlink(temp)
        except OSError:
            pass
        raise


def read_index(directory):
    ensure_library(directory)
    with open(library_index_path(directory), encoding="utf-8") as handle:
        index = json.load(handle)
    if not isinstance(index, dict):
        raise ValueError("library.json is not a JSON object")
    index.setdefault("windows", [])
    index.setdefault("games", [])
    return index


def index_update(directory, mutate):
    """Read-modify-write the index under the lock; returns mutate's result."""
    with library_write_lock(directory):
        index = read_index(directory)
        result = mutate(index)
        write_library_json(library_index_path(directory), index)
        return result


def safe_id(value):
    """An id that can never be a path: [A-Za-z0-9._-], never '.' or '..'."""
    if not isinstance(value, str):
        return None
    value = value.strip()
    if not _ID_PATTERN.fullmatch(value) or not value.strip("."):
        return None
    return value


def library_path(directory, relative):
    """Absolute path of a library-relative path, or None if it escapes."""
    if not isinstance(relative, str) or not relative.strip():
        return None
    relative = relative.replace("\\", "/")
    if relative.startswith("/"):
        return None
    root = os.path.realpath(directory)
    candidate = os.path.realpath(os.path.join(root, relative))
    if candidate != root and not candidate.startswith(root + os.sep):
        return None
    return candidate


def parse_size(value):
    """'2G' / '512M' / '1048576' -> bytes, or None when it is not a size."""
    if not isinstance(value, str) or not value.strip():
        return None
    match = re.fullmatch(r"(\d+)\s*([KMGT]?)B?", value.strip().upper())
    if not match:
        return None
    try:
        number = int(match.group(1))
    except ValueError:
        return None                    # absurdly long digit string
    factor = {"": 1, "K": 1 << 10, "M": 1 << 20, "G": 1 << 30, "T": 1 << 40}[match.group(2)]
    return number * factor


def slugify(title, fallback="game"):
    text = (title or "").lower().replace("'", "").replace("\u2019", "")
    slug = re.sub(r"[^a-z0-9]+", "-", text).strip("-")
    return slug[:64].strip("-") or fallback


def crc32_file(path, chunk=COPY_CHUNK):
    crc = 0
    with open(path, "rb") as handle:
        while True:
            block = handle.read(chunk)
            if not block:
                break
            crc = zlib.crc32(block, crc)
    return crc & 0xFFFFFFFF


def copy_stream(source, target, chunk=COPY_CHUNK, limit=None):
    """Stream source -> target; returns (bytes written, CRC32)."""
    crc = 0
    written = 0
    with open(target, "wb") as out:
        while True:
            size = chunk if limit is None else min(chunk, limit - written)
            if size <= 0:
                break
            block = source.read(size)
            if not block:
                break
            crc = zlib.crc32(block, crc)
            out.write(block)
            written += len(block)
    return written, crc & 0xFFFFFFFF


# --- CRC cache -------------------------------------------------------------
# The zip endpoints need the CRC before the first byte goes out, and the files
# are GB-sized, so a CRC is computed once and remembered with the size and
# mtime it belongs to. A replaced file fails the size/mtime check and is read
# again. The cache is a plain JSON side file so library.json stays a clean
# index.
def read_crc_cache(directory):
    try:
        with open(library_crc_path(directory), encoding="utf-8") as handle:
            cache = json.load(handle)
    except (OSError, ValueError):
        return {}
    return cache if isinstance(cache, dict) else {}


def cached_crc32(directory, relative, path):
    """CRC32 of a library file, remembered in cache/crc.json keyed by stat."""
    stat = os.stat(path)
    key = relative.replace(os.sep, "/")
    with _LIBRARY_LOCK:
        cache = read_crc_cache(directory)
        hit = cache.get(key)
        if (isinstance(hit, dict) and hit.get("size") == stat.st_size
                and hit.get("mtime_ns") == stat.st_mtime_ns and isinstance(hit.get("crc"), int)):
            return hit["crc"]
    crc = crc32_file(path)
    remember_crc32(directory, key, stat, crc)
    return crc


def remember_crc32(directory, relative, stat, crc):
    key = relative.replace(os.sep, "/")
    entry = {"size": stat.st_size, "mtime_ns": stat.st_mtime_ns, "crc": crc & 0xFFFFFFFF}
    with _LIBRARY_LOCK:
        cache = read_crc_cache(directory)
        cache[key] = entry
        write_library_json(library_crc_path(directory), cache)


# --- VHD writer ------------------------------------------------------------
# Copied verbatim from import-windows-game.py (vhd_geometry/vhd_checksum/
# vhd_footer) so a blank disk made here is exactly the fixed VHD the importer
# writes: raw data at offset 0 plus a 512-byte footer. DOSBox-X's imgmount
# derives the drive geometry from the partition table at offset 0, which only
# works for a fixed disk (a dynamic VHD starts with its header copy).
VHD_COOKIE = b"conectix"
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


def create_blank_vhd(path, size):
    """Write a fixed VHD: `size` zero bytes streamed in chunks + the footer.

    Returns (file size on disk, CRC32). The data is written to a temp file in
    the same directory and renamed, so a failure never leaves a half disk.
    """
    crc = 0
    zeros = bytes(COPY_CHUNK)
    handle, temp = tempfile.mkstemp(prefix="." + os.path.basename(path) + ".",
                                    suffix=".part", dir=os.path.dirname(path))
    os.chmod(temp, 0o644)              # mkstemp is 0600; these are the user's files
    try:
        with os.fdopen(handle, "wb") as out:
            remaining = size
            while remaining > 0:
                block = zeros if remaining >= COPY_CHUNK else zeros[:remaining]
                out.write(block)
                crc = zlib.crc32(block, crc)
                remaining -= len(block)
            footer = vhd_footer(size, os.urandom(16), 2)
            out.write(footer)
            crc = zlib.crc32(footer, crc)
            out.flush()
            os.fsync(out.fileno())
        os.replace(temp, path)
    except BaseException:
        try:
            os.unlink(temp)
        except OSError:
            pass
        raise
    return size + len(footer), crc & 0xFFFFFFFF


def extract_pack_image(pack_path, image_path):
    """Largest .vhd/.img member of an uploaded save pack -> image_path.

    The player's "Download Save File" hands the machine back as a zip, so an
    upload of that pack has to be unpacked before it is a mountable disk.
    Returns (size, CRC32) or None when the archive holds no such member.
    """
    with zipfile.ZipFile(pack_path) as archive:
        candidates = [info for info in archive.infolist()
                      if not info.is_dir() and info.filename.lower().endswith(IMAGE_EXTENSIONS)]
        if not candidates:
            return None
        member = max(candidates, key=lambda info: info.file_size)
        with archive.open(member) as source:
            return copy_stream(source, image_path)


# --- Streamed store-only zip ----------------------------------------------
def dos_datetime(timestamp):
    """(time, date) in the MS-DOS format a zip header stores."""
    local = time.localtime(timestamp)
    year = max(1980, local.tm_year)
    return ((local.tm_hour << 11) | (local.tm_min << 5) | (local.tm_sec // 2),
            ((year - 1980) << 9) | (local.tm_mon << 5) | local.tm_mday)


def zip_layout(name, size, crc, mtime):
    """The two halves of a one-entry, store-only zip.

    Returns (prologue, epilogue): the local file header that precedes the file
    bytes, and the central directory + end-of-central-directory record that
    follow them. Size and CRC are written up front (no data descriptor), so
    Content-Length is exactly len(prologue) + size + len(epilogue) and the
    bytes can be streamed straight from disk.

    Files of 4 GiB or more need the ZIP64 records, since a 32-bit size field
    would wrap; libzip in the player reads those.
    """
    name_bytes = name.encode("utf-8")
    dos_time, dos_date = dos_datetime(mtime)
    if size >= ZIP64_LIMIT:
        extra = struct.pack("<HHQQ", 0x0001, 16, size, size)
        prologue = struct.pack("<IHHHHHIIIHH", 0x04034B50, 45, 0, 0, dos_time, dos_date, crc,
                               ZIP32_MAX, ZIP32_MAX, len(name_bytes), len(extra)) \
            + name_bytes + extra
        # The machine image is the first (only) member, so its local header is
        # at offset 0 - the offset the central directory must carry.
        extra = struct.pack("<HHQQQ", 0x0001, 24, size, size, 0)
        central = struct.pack("<IHHHHHHIIIHHHHHII", 0x02014B50, 45, 45, 0, 0, dos_time, dos_date,
                              crc, ZIP32_MAX, ZIP32_MAX, len(name_bytes), len(extra),
                              0, 0, 0, 0, ZIP32_MAX) + name_bytes + extra
        # ZIP64 end-of-central-directory record, its locator, and the classic
        # record last (readers find the archive end by scanning back for it).
        eocd = struct.pack("<IQHHIIQQQQ", 0x06064B50, 44, 45, 45, 0, 0, 1, 1,
                           len(central), len(prologue) + size)
        eocd += struct.pack("<IIQI", 0x07064B50, 0, len(prologue) + size + len(central), 1)
        eocd += struct.pack("<IHHHHIIH", 0x06054B50, 0, 0, 0xFFFF, 0xFFFF,
                            0xFFFFFFFF, 0xFFFFFFFF, 0)
    else:
        prologue = struct.pack("<IHHHHHIIIHH", 0x04034B50, 20, 0, 0, dos_time, dos_date, crc,
                               size, size, len(name_bytes), 0) + name_bytes
        central = struct.pack("<IHHHHHHIIIHHHHHII", 0x02014B50, 20, 20, 0, 0, dos_time, dos_date,
                              crc, size, size, len(name_bytes), 0, 0, 0, 0, 0, 0) + name_bytes
        eocd = struct.pack("<IHHHHIIH", 0x06054B50, 0, 0, 1, 1, len(central),
                           len(prologue) + size, 0)
    return prologue, central + eocd


def safe_entry_name(name):
    """A zip member name: one file name, no directory escape."""
    if not isinstance(name, str):
        return None
    name = name.strip()
    if not name or name in (".", "..") or len(name) > 255:
        return None
    if any(char in name for char in "/\\:") or any(ord(char) < 32 for char in name):
        return None
    return name


class Handler(SimpleHTTPRequestHandler):
    protocol_version = "HTTP/1.1"
    # The Workshop's data directory; --library-dir overrides it (the tests
    # point it at a temporary directory).
    library_dir = os.path.join(os.getcwd(), "library")

    # --- accounts ---------------------------------------------------------
    # Filled in by main(): a UserStore, a SessionManager and the catalog-backed
    # AccessControl. With auth_enabled False (--no-auth) every request is
    # treated as an administrator, which keeps the emulator tests usable.
    user_store = None
    sessions = None
    access = None
    auth_enabled = True

    def current_user(self):
        """The signed-in account, or None. Administrators when auth is off."""
        if not self.auth_enabled:
            return {"username": "local", "role": "admin", "games": "*", "disabled": False}
        if self.user_store is None or self.sessions is None:
            return None
        header = self.headers.get("Cookie") or ""
        token = None
        for part in header.split(";"):
            name, _, value = part.strip().partition("=")
            if name == auth.SESSION_COOKIE:
                token = value
                break
        if not token:
            return None
        session = self.sessions.verify(token)
        if not session:
            return None
        record = self.user_store.get(session["sub"])
        if not record or record.get("disabled"):
            return None
        return record

    def wants_html(self):
        return "text/html" in (self.headers.get("Accept") or "")

    def deny(self, status, message, html_page=False):
        """Report a refused request: JSON for APIs, a redirect for pages."""
        if html_page and self.command in ("GET", "HEAD"):
            target = "/login.html?next=" + quote(self.path, safe="") if status == 401 else "/"
            body = ("<p>%s</p><p><a href=\"%s\">Continue</a></p>" % (message, target)).encode("utf-8")
            self.send_response(302 if status == 401 else 403)
            self.send_header("Location", target)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.send_cache_control("no-store")
            self.end_headers()
            if self.command != "HEAD":
                self.wfile.write(body)
            return
        self.send_json(status, {"error": message})

    def check_access(self):
        """Authorise the current request.

        Returns False when the request was refused (the response has already
        been sent), otherwise the signed-in account or None for a public
        request without a session.
        """
        if not self.auth_enabled:
            return self.current_user()
        path, query = self.request_parts()
        scope = self.access.scope_for(path, query)
        is_api = path.startswith("/api/")
        page = self.wants_html() and not is_api

        if isinstance(scope, tuple) and scope[0] == "deny":
            self.deny(403, "not found")
            return False

        user = self.current_user()
        if scope == "public":
            return user
        if user is None:
            self.deny(401, "sign in to continue", html_page=page)
            return False
        if scope == "user":
            return user
        if scope == "admin":
            if user.get("role") != "admin":
                self.deny(403, "administrator access required", html_page=page)
                return False
            return user
        if isinstance(scope, tuple) and scope[0] == "game":
            if not self.access.can_play(user, scope[1]):
                self.deny(403, "your account is not allowed to play this game", html_page=page)
                return False
            return user
        if isinstance(scope, tuple) and scope[0] == "any-game":
            if user.get("role") == "admin" or self.access.grants_all(user):
                return user
            allowed = self.access.allowed_ids(user)
            if not allowed.intersection(scope[1]):
                self.deny(403, "game not assigned to this account")
                return False
            return user
        return user

    def read_json_body(self, limit=64 * 1024):
        try:
            length = int(self.headers.get("Content-Length") or 0)
        except ValueError:
            raise ApiError(400, "invalid Content-Length")
        if length <= 0:
            return {}
        if length > limit:
            raise ApiError(413, "request body too large")
        raw = self.rfile.read(length)
        try:
            payload = json.loads(raw.decode("utf-8"))
        except (ValueError, UnicodeDecodeError):
            raise ApiError(400, "request body must be JSON")
        if not isinstance(payload, dict):
            raise ApiError(400, "request body must be a JSON object")
        return payload

    def session_user_payload(self, record):
        return {
            "user": {
                "name": record.get("username"),
                "role": record.get("role", "user"),
                "games": record.get("games", "*"),
            },
            "visibleGames": self.access.visible_games(record),
            "authEnabled": self.auth_enabled,
        }

    # --- /api/auth/* ------------------------------------------------------
    def auth_login(self):
        payload = self.read_json_body()
        username = str(payload.get("username") or "").strip()
        password = payload.get("password") or ""
        address = self.client_address[0] if self.client_address else None
        if not username or not password:
            raise ApiError(400, "username and password are required")
        if self.user_store.too_many_failures(address, username):
            raise ApiError(429, "too many failed sign-in attempts; try again later")
        record = self.user_store.authenticate(username, password)
        if not record:
            self.user_store.note_failure(address, username)
            raise ApiError(401, "invalid username or password")
        self.user_store.note_success(address, username)
        self.send_response(200)
        self.send_header("Set-Cookie", self.sessions.cookie_header(record["username"]))
        self.send_json_body(self.session_user_payload(record))

    def auth_logout(self):
        self.send_response(200)
        self.send_header("Set-Cookie", self.sessions.cleared_cookie_header())
        self.send_json_body({"ok": True})

    def auth_me(self):
        record = self.current_user()
        if not record:
            self.send_json(401, {"error": "not signed in", "authEnabled": self.auth_enabled})
            return
        self.send_json(200, self.session_user_payload(record))

    def auth_change_password(self):
        record = self.current_user()
        if not record:
            raise ApiError(401, "not signed in")
        payload = self.read_json_body()
        current = payload.get("current") or ""
        new = payload.get("new") or payload.get("password") or ""
        fresh = self.user_store.authenticate(record["username"], current)
        if not fresh:
            raise ApiError(403, "current password is incorrect")
        self.user_store.set_password(record["username"], new)
        # Keep the caller signed in with a cookie bound to the new state.
        self.send_response(200)
        self.send_header("Set-Cookie", self.sessions.cookie_header(record["username"]))
        self.send_json_body({"ok": True})

    def auth_users_list(self):
        self.send_json(200, {"users": self.user_store.list_users()})

    def auth_users_create(self):
        payload = self.read_json_body()
        record = self.user_store.create(
            str(payload.get("username") or "").strip(),
            payload.get("password") or "",
            role=(payload.get("role") or "user"),
            games=payload.get("games", "*"),
        )
        self.send_json(201, {"user": record})

    def auth_users_update(self, username):
        payload = self.read_json_body()
        record = self.user_store.update(
            username,
            password=payload.get("password"),
            role=payload.get("role"),
            games=payload.get("games") if "games" in payload else None,
            disabled=payload.get("disabled") if "disabled" in payload else None,
        )
        self.send_json(200, {"user": record})

    def auth_users_delete(self, username):
        actor = self.current_user()
        self.user_store.delete(username, actor=(actor or {}).get("username"))
        self.send_json(200, {"ok": True})

    def send_json_body(self, payload):
        body = json.dumps(payload).encode("utf-8")
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_cache_control("no-store")
        self.end_headers()
        if self.command != "HEAD":
            self.wfile.write(body)

    # --- disc images offered to the player --------------------------------
    def disc_listing(self):
        # The player's DDYX flow downloads a disc and *extracts* it, so only
        # archive-backed discs (a zip containing the ISO, like the site's .DCD
        # files) can be mounted. A plain .iso is listed as unsupported rather
        # than offered and then failing at mount time.
        root = os.path.join(os.getcwd(), DISC_DIRECTORY)
        discs = []
        if os.path.isdir(root):
            names = sorted(os.listdir(root))
            cues = {os.path.splitext(n)[0].lower() for n in names if n.lower().endswith(".cue")}
            for name in names:
                path = os.path.join(root, name)
                if not os.path.isfile(path):
                    continue
                extension = os.path.splitext(name)[1].lower()
                if extension not in DISC_EXTENSIONS:
                    continue
                if extension == ".bin" and os.path.splitext(name)[0].lower() in cues:
                    continue
                try:
                    with open(path, "rb") as handle:
                        if handle.read(4) != b"PK\x03\x04":
                            print(f"skipping {name}: not a disc archive (wrap it with "
                                  f"import-windows-game.py --cd)")
                            continue
                except OSError:
                    continue
                discs.append({
                    "name": os.path.splitext(name)[0],
                    "link": "/" + DISC_DIRECTORY.replace(os.sep, "/") + "/" + quote(name),
                    "size": os.path.getsize(path),
                })
        body = json.dumps({"discs": discs}).encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_cache_control("no-store")
        self.end_headers()
        self.wfile.write(body)

    # --- request plumbing -------------------------------------------------
    def handle_one_request(self):
        # One handler instance serves every request on a keep-alive
        # connection, so per-response state has to be reset for each of them.
        self._headers_sent = False
        self._cache_control_sent = False
        self._range_remaining = None
        super().handle_one_request()

    def send_response(self, code, message=None):
        self._headers_sent = True
        self._cache_control_sent = False
        super().send_response(code, message)

    def send_cache_control(self, value):
        self.send_header("Cache-Control", value)
        self._cache_control_sent = True

    def send_json(self, status, payload):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_cache_control("no-store")
        self.end_headers()
        if self.command != "HEAD":
            self.wfile.write(body)

    def api(self, endpoint, *args):
        """Run a JSON endpoint: bad input -> 400, surprises -> 500."""
        try:
            endpoint(*args)
        except (ApiError, auth.AuthError) as exc:
            self.send_json(exc.status, {"error": exc.message})
        except (OSError, ValueError, KeyError, zipfile.BadZipFile) as exc:
            if getattr(self, "_headers_sent", False):
                self.log_message("error after the response started: %s", exc)
                return
            self.send_json(500, {"error": "%s: %s" % (type(exc).__name__, exc)})

    def request_parts(self):
        parsed = urlsplit(self.path)
        query = {key: values[-1] for key, values in
                 parse_qs(parsed.query, keep_blank_values=True).items()}
        return parsed.path, query

    def read_json(self, limit=1 << 20):
        try:
            length = int(self.headers.get("Content-Length") or "")
        except ValueError:
            raise ApiError(400, "Content-Length is required")
        if length <= 0:
            raise ApiError(400, "empty request body")
        if length > limit:
            raise ApiError(400, "request body is larger than %d bytes" % limit)
        raw = self.rfile.read(length)
        try:
            payload = json.loads(raw.decode("utf-8"))
        except (UnicodeDecodeError, ValueError) as exc:
            raise ApiError(400, "body is not valid JSON: %s" % exc)
        if not isinstance(payload, dict):
            raise ApiError(400, "body must be a JSON object")
        return payload

    # --- Workshop library API ---------------------------------------------
    def library_index(self):
        self.send_json(200, read_index(self.library_dir))

    def library_file(self, query):
        relative = query.get("path")
        path = library_path(self.library_dir, relative)
        if path is None:
            raise ApiError(400, "path must be a file inside the library")
        if not os.path.isfile(path):
            raise ApiError(404, "no such library file: %s" % relative)
        handle = self.send_file(path, cache="no-store")
        if handle is None:
            return
        try:
            if self.command != "HEAD":
                self.copyfile(handle, self.wfile)
        finally:
            handle.close()

    def library_blank(self, query):
        ident = safe_id(query.get("name"))
        if ident is None:
            raise ApiError(400, "name must be [A-Za-z0-9._-] and not '.' or '..'")
        size = parse_size(query.get("size"))
        if size is None:
            raise ApiError(400, "size must be bytes or a K/M/G/T suffix, e.g. 2G")
        if not BLANK_MIN_SIZE <= size <= BLANK_MAX_SIZE:
            raise ApiError(400, "size must be between 16M and 64G")
        relative = "windows/%s.vhd" % ident
        path = library_path(self.library_dir, relative)
        index = read_index(self.library_dir)
        if os.path.exists(path) or any(w.get("id") == ident for w in index["windows"]):
            raise ApiError(400, "a machine named %s already exists" % ident)
        ensure_library(self.library_dir)
        written, crc = create_blank_vhd(path, size)
        filesystem = None
        if (query.get("format") or "fat32").lower() != "none":
            # An all-zero disk has no partition table and DOSBox-X refuses to
            # mount it (no geometry), so the guest would see no C: at all.
            try:
                info = vhd.format_fat32(path, label="SYSTEM")
                filesystem = "fat%d" % info["fat"]
                crc = crc32_file(path)
            except Exception as error:                     # keep the disk usable anyway
                print("warning: could not format %s: %s" % (relative, error))
        entry = {"id": ident, "name": ident, "file": relative, "size": written,
                 "created": now_stamp(), "crc": crc}
        if filesystem:
            entry["filesystem"] = filesystem
        stat = os.stat(path)
        remember_crc32(self.library_dir, relative, stat, crc)
        index_update(self.library_dir, lambda index: index["windows"].append(entry))
        self.send_json(200, dict(entry, zipUrl="/api/library/windows/%s.zip" % quote(ident)))

    def library_reindex(self, query):
        """Rebuild missing `windows[]` entries from the files on disk.

        The index is a single JSON file, so anything that writes it from a stale
        read (two servers sharing one library, a crash) can drop entries that the
        machine images on disk still justify. This puts them back.
        """
        ensure_library(self.library_dir)
        added = []

        def mutate(index):
            known = {w.get("id") for w in index.get("windows", [])}
            directory = os.path.join(self.library_dir, "windows")
            for name in sorted(os.listdir(directory)):
                base, extension = os.path.splitext(name)
                if extension.lower() not in (".vhd", ".img") or base in known:
                    continue
                relative = "windows/" + name
                path = library_path(self.library_dir, relative)
                if not os.path.isfile(path):
                    continue
                stat = os.stat(path)
                entry = {"id": base, "name": base, "file": relative, "size": stat.st_size,
                         "created": now_stamp(),
                         "crc": cached_crc32(self.library_dir, relative, path)}
                try:
                    filesystem = "fat32" if vhd.read_footer(path) else None
                    entry["geometry"] = vhd.imgmount_geometry(path)
                except Exception:
                    pass
                index.setdefault("windows", []).append(entry)
                added.append(base)
            return None

        index_update(self.library_dir, mutate)
        self.send_json(200, {"added": added, "windows": len(read_index(self.library_dir)["windows"])})

    def library_format(self, query):
        """Partition and format an existing machine disk in place."""
        ident = safe_id(query.get("id"))
        if ident is None:
            raise ApiError(400, "id must be [A-Za-z0-9._-]")
        index = read_index(self.library_dir)
        entry = next((w for w in index["windows"] if w.get("id") == ident), None)
        if entry is None:
            raise ApiError(404, "no machine named %s" % ident)
        path = library_path(self.library_dir, entry["file"])
        if not os.path.isfile(path):
            raise ApiError(404, "machine file is missing")
        try:
            info = vhd.format_fat32(path, label="SYSTEM")
        except Exception as error:
            raise ApiError(400, "could not format: %s" % error)
        crc = crc32_file(path)
        stat = os.stat(path)
        remember_crc32(self.library_dir, entry["file"], stat, crc)
        index_update(self.library_dir, lambda index: [
            w.update({"size": os.path.getsize(path), "crc": crc,
                      "filesystem": "fat%d" % info["fat"]})
            for w in index["windows"] if w.get("id") == ident])
        self.send_json(200, {"id": ident, "file": entry["file"], "size": os.path.getsize(path),
                             "filesystem": "fat%d" % info["fat"], "geometry": vhd.imgmount_geometry(path)})

    def library_upload(self, query):
        kind = (query.get("kind") or "").strip().lower()
        subdir = LIBRARY_SUBDIRS.get(kind)
        if subdir is None:
            raise ApiError(400, "kind must be windows, game or iso")
        supplied = (query.get("file") or "").replace("\\", "/").rsplit("/", 1)[-1]
        extension = os.path.splitext(supplied)[1].lower()
        if extension not in UPLOAD_EXTENSIONS:
            raise ApiError(400, "file must end in one of %s" % ", ".join(UPLOAD_EXTENSIONS))
        ident = safe_id(query.get("name") or os.path.splitext(supplied)[0])
        if ident is None:
            raise ApiError(400, "name must be [A-Za-z0-9._-] (or be derivable from file)")
        try:
            length = int(self.headers.get("Content-Length") or "")
        except ValueError:
            raise ApiError(400, "Content-Length is required")
        if length <= 0:
            raise ApiError(400, "empty upload")

        ensure_library(self.library_dir)
        relative = "%s/%s%s" % (subdir, ident, extension)
        target = library_path(self.library_dir, relative)
        written, crc, signature = self.receive_upload(target, length)
        if written != length:
            try:
                os.unlink(target)
            except OSError:
                pass
            raise ApiError(400, "upload ended after %d of %d bytes" % (written, length))

        if kind != "windows":
            self.send_json(200, {"id": ident, "name": ident, "file": relative, "size": written})
            return

        # A "Download Save File" pack is a zip of the machine; the disk inside
        # it (not the pack) is what can be mounted.
        entry = {"id": ident, "name": ident, "file": relative, "size": written,
                 "created": now_stamp(), "crc": crc}
        stat = os.stat(target)
        unpacked = self.unpack_window_upload(relative, ident, signature)
        if unpacked is None:
            remember_crc32(self.library_dir, relative, stat, crc)
        else:
            image_relative, image_size, image_crc = unpacked
            entry["file"] = image_relative
            entry["size"] = image_size
            entry["crc"] = image_crc
            entry["pack"] = relative
            image_path = library_path(self.library_dir, image_relative)
            remember_crc32(self.library_dir, image_relative, os.stat(image_path), image_crc)

        def register(index):
            # Re-uploading a machine replaces its entry rather than listing it
            # twice (blank creation refuses the id instead: it would destroy a
            # disk that may hold an installed system).
            index["windows"] = [w for w in index["windows"] if w.get("id") != ident]
            index["windows"].append(entry)

        index_update(self.library_dir, register)
        self.send_json(200, entry)

    def receive_upload(self, target, length):
        """Stream the request body to target: (bytes, CRC32, first 4 bytes)."""
        crc = 0
        written = 0
        signature = b""
        with open(target, "wb") as out:
            while written < length:
                block = self.rfile.read(min(COPY_CHUNK, length - written))
                if not block:
                    break
                if len(signature) < 4:
                    signature = (signature + block)[:4]
                crc = zlib.crc32(block, crc)
                out.write(block)
                written += len(block)
        return written, crc & 0xFFFFFFFF, signature

    def unpack_window_upload(self, relative, ident, signature):
        """Pull the machine image out of an uploaded save pack.

        Returns (relative image path, size, CRC32), or None when the upload is
        not a zip pack or holds no .vhd/.img member - then the upload itself is
        the image.
        """
        if signature != b"PK\x03\x04":
            return None
        image_relative = "windows/%s.vhd" % ident
        pack_path = library_path(self.library_dir, relative)
        image_path = library_path(self.library_dir, image_relative)
        if os.path.abspath(pack_path) == os.path.abspath(image_path):
            # An uploaded .vhd that is really a pack: keep it, extracted image
            # takes the plain name.
            pack_relative = "windows/%s.pack%s" % (ident, os.path.splitext(relative)[1])
            pack_path = library_path(self.library_dir, pack_relative)
            os.replace(library_path(self.library_dir, relative), pack_path)
        try:
            extracted = extract_pack_image(pack_path, image_path)
        except Exception:
            extracted = None
        if extracted is None:
            try:
                os.unlink(image_path)
            except OSError:
                pass
            return None
        size, crc = extracted
        return image_relative, size, crc

    def library_game(self):
        payload = self.read_json()
        title = payload.get("title")
        if not isinstance(title, str) or not title.strip():
            raise ApiError(400, "title is required")
        wanted = payload.get("windows")
        index = read_index(self.library_dir)
        machine = None
        if isinstance(wanted, str) and wanted:
            for window in index["windows"]:
                if wanted in (window.get("id"), window.get("name"), window.get("file")):
                    machine = window
                    break
        if machine is None:
            raise ApiError(400, "windows must name an existing machine in the library")
        diff = payload.get("diff") or ""
        if diff:
            path = library_path(self.library_dir, diff)
            if path is None or not os.path.isfile(path):
                raise ApiError(400, "diff does not exist in the library: %s" % diff)
        iso = payload.get("iso") or ""
        if iso and library_path(self.library_dir, iso) is None:
            raise ApiError(400, "iso must be a path inside the library")
        ident = payload.get("id")
        if ident not in (None, "") and safe_id(ident) is None:
            raise ApiError(400, "id must be [A-Za-z0-9._-] and not '.' or '..'")
        year = payload.get("year")
        if isinstance(year, str):
            year = int(year) if year.strip().isdigit() else (year.strip() or None)
        elif year is not None and not isinstance(year, int):
            raise ApiError(400, "year must be a number")

        entry = {"id": None, "title": title.strip(), "year": year,
                 "publisher": payload.get("publisher") or "",
                 "genre": payload.get("genre") or "",
                 "description": payload.get("description") or "",
                 "windows": machine.get("id"), "diff": diff, "iso": iso,
                 "created": now_stamp()}

        def register(index):
            taken = {game.get("id") for game in index["games"]}
            base = safe_id(ident) or slugify(title)
            candidate, suffix = base, 2
            while candidate in taken:
                candidate = "%s-%d" % (base, suffix)
                suffix += 1
            entry["id"] = candidate
            index["games"].append(entry)
            return entry

        self.send_json(200, index_update(self.library_dir, register))

    def library_forget(self, query, section):
        ident = query.get("id")
        if not isinstance(ident, str) or not ident.strip():
            raise ApiError(400, "id is required")
        index = read_index(self.library_dir)
        if not any(item.get("id") == ident for item in index[section]):
            raise ApiError(404, "no %s with id %s" % (section, ident))

        def drop(index):
            index[section] = [item for item in index[section] if item.get("id") != ident]

        index_update(self.library_dir, drop)
        self.send_json(200, {"deleted": ident, "kind": section})

    def library_zip(self, query):
        """Stream one library file as a store-only zip with an exact length."""
        relative = query.get("path")
        path = library_path(self.library_dir, relative)
        if path is None:
            raise ApiError(400, "path must be a file inside the library")
        if not os.path.isfile(path):
            raise ApiError(404, "no such library file: %s" % relative)
        entry_name = query.get("entry")
        if entry_name in (None, ""):
            entry_name = os.path.basename(relative.replace("\\", "/")).upper()
        entry_name = safe_entry_name(entry_name)
        if entry_name is None:
            raise ApiError(400, "entry must be a plain file name (no path separators)")

        head_only = self.command == "HEAD"
        size = os.path.getsize(path)
        crc = 0 if head_only else cached_crc32(self.library_dir, relative, path)
        prologue, epilogue = zip_layout(entry_name, size, crc, os.path.getmtime(path))
        length = len(prologue) + size + len(epilogue)
        self.send_response(200)
        self.send_header("Content-Type", "application/zip")
        self.send_header("Content-Length", str(length))
        self.send_cache_control("no-store")
        self.end_headers()
        if head_only:
            return
        self.wfile.write(prologue)
        with open(path, "rb") as source:
            while True:
                block = source.read(COPY_CHUNK)
                if not block:
                    break
                self.wfile.write(block)
        self.wfile.write(epilogue)

    def library_window_zip(self, ident, query):
        """windows/<id>.zip: the machine image, as a store-only zip.

        The player's osImages flow mounts the extracted `sysddiff.vhd`, so pass
        &entry=sysddiff.vhd when handing this URL to the player.
        """
        ident = safe_id(ident)
        if ident is None:
            raise ApiError(400, "invalid machine id")
        index = read_index(self.library_dir)
        entry = next((w for w in index["windows"] if w.get("id") == ident), None)
        if entry is None:
            raise ApiError(404, "no machine with id %s" % ident)
        window_query = dict(query)
        window_query["path"] = entry.get("file")
        window_query.setdefault("entry", "%s.vhd" % ident)
        self.library_zip(window_query)

    def workshop_config(self, query):
        # The Workshop page owns the config generator; serve.py only delegates
        # to workshop_config.build_config(query, library_dir). The import is
        # deliberately late so a missing or half-written module cannot stop the
        # rest of the site from being served.
        try:
            from workshop_config import build_config
        except Exception as exc:
            raise ApiError(500, "workshop_config.py is not available: %s: %s"
                                % (type(exc).__name__, exc))
        try:
            body = build_config(query, self.library_dir)
        except Exception as exc:
            raise ApiError(500, "workshop_config.build_config failed: %s: %s"
                                % (type(exc).__name__, exc))
        if not isinstance(body, str):
            raise ApiError(500, "workshop_config.build_config did not return a string")
        raw = body.encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "text/javascript")
        self.send_header("Content-Length", str(len(raw)))
        self.send_cache_control("no-store")
        self.end_headers()
        if self.command != "HEAD":
            self.wfile.write(raw)

    # --- routing ----------------------------------------------------------
    def do_GET(self):
        path, query = self.request_parts()
        if self.check_access() is False:
            return
        match = re.fullmatch(r"/api/library/windows/([^/]+)\.zip", path)
        if path == "/api/auth/me":
            self.api(self.auth_me)
        elif path == "/api/auth/users":
            self.api(self.auth_users_list)
        elif path == "/api/discs":
            self.disc_listing()
        elif path == "/api/library":
            self.api(self.library_index)
        elif path == "/api/library/file":
            self.api(self.library_file, query)
        elif path == "/api/library/zip":
            self.api(self.library_zip, query)
        elif path == "/api/workshop/config":
            self.api(self.workshop_config, query)
        elif match:
            self.api(self.library_window_zip, match.group(1), query)
        else:
            super().do_GET()

    def do_HEAD(self):
        path, query = self.request_parts()
        if self.check_access() is False:
            return
        match = re.fullmatch(r"/api/library/windows/([^/]+)\.zip", path)
        if path == "/api/auth/me":
            self.api(self.auth_me)
        elif path == "/api/discs":
            body = b"{}"
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
        elif path == "/api/library/file":
            self.api(self.library_file, query)
        elif path == "/api/library/zip":
            self.api(self.library_zip, query)
        elif match:
            self.api(self.library_window_zip, match.group(1), query)
        else:
            super().do_HEAD()

    def do_POST(self):
        path, query = self.request_parts()
        if self.check_access() is False:
            return
        user_match = re.fullmatch(r"/api/auth/users/([^/]+)", path)
        if path == "/api/auth/login":
            self.api(self.auth_login)
        elif path == "/api/auth/logout":
            self.api(self.auth_logout)
        elif path == "/api/auth/password":
            self.api(self.auth_change_password)
        elif path == "/api/auth/users":
            self.api(self.auth_users_create)
        elif user_match:
            self.api(self.auth_users_update, user_match.group(1))
        elif path == "/api/library/reindex":
            self.library_reindex(query)
        elif path == "/api/library/format":
            self.library_format(query)
        elif path == "/api/library/blank":
            self.api(self.library_blank, query)
        elif path == "/api/library/upload":
            self.api(self.library_upload, query)
        elif path == "/api/library/game":
            self.api(self.library_game)
        else:
            self.send_error(501, "Unsupported method ('POST')")

    def do_DELETE(self):
        path, query = self.request_parts()
        if self.check_access() is False:
            return
        user_match = re.fullmatch(r"/api/auth/users/([^/]+)", path)
        if user_match:
            self.api(self.auth_users_delete, user_match.group(1))
        elif path == "/api/library/game":
            self.api(self.library_forget, query, "games")
        elif path == "/api/library/windows":
            self.api(self.library_forget, query, "windows")
        else:
            self.send_error(501, "Unsupported method ('DELETE')")

    def guess_type(self, path):
        ext = os.path.splitext(path)[1].lower()
        return MIME.get(ext) or super().guess_type(path)

    def end_headers(self):
        # Cross-origin isolation headers. The JSPI (dosx-edge) build REQUIRES a
        # secure, cross-origin isolated page (its worker checks
        # self.crossOriginIsolated): serve via https or http://localhost. A LAN
        # address (e.g. http://192.168.x.x:8000) is never a secure context, so
        # app.js automatically falls back to the classic dosx build there; these
        # headers are harmless for it. Behind a TLS proxy keep these headers
        # intact (proxies forward response headers by default).
        self.send_header("Cross-Origin-Opener-Policy", "same-origin")
        self.send_header("Cross-Origin-Embedder-Policy", "require-corp")
        self.send_header("Cross-Origin-Resource-Policy", "cross-origin")
        path = self.path.split("?", 1)[0].lower()
        # Never serve stale emulator code after an update of the dump. An API
        # handler that already sent its own Cache-Control keeps it.
        if not getattr(self, "_cache_control_sent", False):
            if path.endswith(NO_CACHE_SUFFIXES):
                self.send_header("Cache-Control", "no-cache")
            elif path.endswith(NO_STORE_SUFFIXES):
                self.send_header("Cache-Control", "no-store")
        super().end_headers()

    # --- Range support (single range) -------------------------------------
    def send_head(self):
        path = self.translate_path(self.path.split("?", 1)[0])
        if os.path.isdir(path):
            return super().send_head()
        # Tolerate a trailing slash on a file URL. The emulator's DOSBox-X glue
        # derives the optional Win95 patch language from the *last path segment*
        # of osImages, so config.js can append "/" to that URL to make the
        # lookup miss and skip win95patch.zip (see skipWin95Patch).
        if not os.path.isfile(path) and path.endswith(os.sep) and os.path.isfile(path.rstrip(os.sep)):
            path = path.rstrip(os.sep)
        if not os.path.isfile(path):
            self.send_error(404, "File not found")
            return None
        return self.send_file(path)

    def send_file(self, path, cache=None):
        """Send one file with Range/HEAD support; returns the open handle.

        Shared by static serving and /api/library/file so both use the same
        single-range implementation. `cache` sets an explicit Cache-Control
        (the API always passes "no-store").
        """
        try:
            stat = os.stat(path)
            size = stat.st_size
        except OSError:
            self.send_error(404, "File not found")
            return None

        # Strong validator: a replaced file gets a new ETag, which lets the
        # emulator's downloader drop a stale resumable download and lets the
        # browser revalidate instead of trusting a heuristic freshness lifetime.
        etag = '"%x-%x"' % (int(stat.st_mtime), size)
        if self.headers.get("If-None-Match") == etag:
            self.send_response(304)
            self.send_header("ETag", etag)
            self.send_header("Last-Modified", self.date_time_string(stat.st_mtime))
            if cache:
                self.send_cache_control(cache)
            self.end_headers()
            return None

        range_header = self.headers.get("Range")
        # If-Range: only honour a range request when the validator still matches;
        # otherwise send the whole (changed) file, as required by RFC 9110.
        if_range = self.headers.get("If-Range")
        if if_range and if_range != etag:
            range_header = None
        match = re.match(r"bytes=(\d*)-(\d*)$", range_header or "")
        start, end = 0, size - 1
        partial = False
        if match:
            first, last = match.group(1), match.group(2)
            if first == "" and last != "":
                start = max(0, size - int(last))
            elif first != "":
                start = int(first)
                end = int(last) if last != "" else size - 1
            if start >= size:
                self.send_response(416)
                self.send_header("Content-Range", "bytes */%d" % size)
                self.send_header("Content-Length", "0")
                if cache:
                    self.send_cache_control(cache)
                self.end_headers()
                return None
            end = min(end, size - 1)
            partial = True

        ctype = self.guess_type(path)
        try:
            f = open(path, "rb")
        except OSError:
            self.send_error(404, "File not found")
            return None

        if partial:
            self.send_response(206)
            self.send_header("Content-Range", "bytes %d-%d/%d" % (start, end, size))
        else:
            self.send_response(200)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(end - start + 1))
        self.send_header("Accept-Ranges", "bytes")
        self.send_header("ETag", etag)
        self.send_header("Last-Modified", self.date_time_string(stat.st_mtime))
        if cache:
            self.send_cache_control(cache)
        self.end_headers()
        f.seek(start)
        self._range_remaining = end - start + 1
        return f or None

    def copyfile(self, source, outputfile):
        remaining = getattr(self, "_range_remaining", None)
        if remaining is None:
            return super().copyfile(source, outputfile)
        while remaining > 0:
            chunk = source.read(min(1024 * 1024, remaining))
            if not chunk:
                break
            outputfile.write(chunk)
            remaining -= len(chunk)
        self._range_remaining = None

    def log_message(self, fmt, *args):
        sys.stderr.write("[%s] %s\n" % (self.log_date_time_string(), fmt % args))


class Server(socketserver.ThreadingTCPServer):
    allow_reuse_address = True
    daemon_threads = True


def main():
    parser = argparse.ArgumentParser(description="Serve the local player mirror with COOP/COEP + Range support.")
    parser.add_argument("--host", default="127.0.0.1", help="bind address (default 127.0.0.1)")
    parser.add_argument("--port", type=int, default=8000, help="port (default 8000)")
    parser.add_argument("--root", default=os.path.dirname(os.path.abspath(__file__)), help="web root (default: script directory)")
    parser.add_argument("--library-dir", default="library",
                        help="Workshop data directory, relative to --root (default: library)")
    parser.add_argument("--auth-dir", default="auth",
                        help="account data directory, never served over HTTP "
                             "(default: auth, relative to --root)")
    parser.add_argument("--no-auth", action="store_true",
                        help="disable sign-in checks (single-user local use; every "
                             "request acts as an administrator)")
    # Account administration (no self-service registration): these run and exit.
    parser.add_argument("--list-users", action="store_true", help="list accounts and exit")
    parser.add_argument("--create-user", metavar="NAME", help="create an account and exit")
    parser.add_argument("--set-password", metavar="NAME", help="set an account password and exit")
    parser.add_argument("--delete-user", metavar="NAME", help="delete an account and exit")
    parser.add_argument("--grant", metavar="NAME", help="replace an account's games and exit")
    parser.add_argument("--password", help="password for --create-user/--set-password (else prompt)")
    parser.add_argument("--role", default="user", choices=list(auth.ROLES),
                        help="role for --create-user (default: user)")
    parser.add_argument("--games", default="*",
                        help="games for --create-user/--grant: '*' or comma-separated ids")
    args = parser.parse_args()

    os.chdir(args.root)
    Handler.library_dir = os.path.abspath(args.library_dir)
    ensure_library(Handler.library_dir)
    Handler.extensions_map.update({})

    auth_dir = os.path.abspath(args.auth_dir)
    Handler.user_store = auth.UserStore(auth_dir)
    Handler.sessions = auth.SessionManager(os.path.join(auth_dir, "secret.key"))
    Handler.access = auth.AccessControl(os.getcwd())
    Handler.auth_enabled = not args.no_auth
    # Create the signing key eagerly so a broken auth directory fails at start
    # rather than on the first sign-in.
    Handler.sessions.secret()

    def ask_password(prompt="Password: "):
        if args.password:
            return args.password
        import getpass
        first = getpass.getpass(prompt)
        if not first:
            parser.error("empty password")
        return first

    def report(record):
        print("%-20s role=%-5s games=%s" % (
            record["username"], record["role"],
            auth.describe_grant(record, Handler.access)))

    if args.list_users:
        users = Handler.user_store.list_users()
        if not users:
            print("no accounts yet (one is created on server start)")
        for record in users:
            report(record)
        return

    if args.create_user:
        password = ask_password("New password for %s: " % args.create_user)
        report(Handler.user_store.create(args.create_user, password,
                                         role=args.role, games=args.games))
        print("created. Games can be changed later with --grant %s all|<ids>" % args.create_user)
        return

    if args.set_password:
        password = ask_password("New password for %s: " % args.set_password)
        report(Handler.user_store.set_password(args.set_password, password))
        print("password updated.")
        return

    if args.delete_user:
        Handler.user_store.delete(args.delete_user)
        print("deleted %s" % args.delete_user)
        return

    if args.grant:
        record = Handler.user_store.update(args.grant, games=args.games)
        report(record)
        return

    # No administration command: start serving. The first start on an empty
    # store creates the administrator whose password is printed once below.
    admin_created, admin_password = Handler.user_store.ensure_admin()

    with Server((args.host, args.port), Handler) as httpd:
        host, port = httpd.server_address[:2]
        try:
            display = host if host != "0.0.0.0" else "127.0.0.1"
        except Exception:
            display = host
        print("Serving %s on http://%s:%d/  (Ctrl+C to stop)" % (args.root, display, port))
        print("Open http://%s:%d/ in your browser." % (display, port))
        print("Workshop library: %s" % Handler.library_dir)
        if Handler.auth_enabled:
            print("Accounts: %s  (%d account(s))" % (auth_dir, len(Handler.user_store.list_users())))
            if admin_created:
                print("")
                print("  Created the first administrator account:")
                print("      username: admin")
                print("      password: %s" % admin_password)
                print("  This password is shown once; change it with")
                print("      python3 serve.py --set-password admin")
                print("  or from http://%s:%d/admin.html after signing in." % (display, port))
                print("")
        else:
            print("Accounts: DISABLED (--no-auth): every request acts as an administrator.")
        # Keep the banner (and the one-time admin password) visible when stdout
        # is a pipe or a file, as it is under nohup / a process manager.
        sys.stdout.flush()
        if display in ("127.0.0.1", "localhost"):
            print("Fast JSPI build: available (http://localhost is a secure context).")
        else:
            print("Note: non-localhost http is NOT a secure context, so the fast JSPI")
            print("build is skipped and games use the classic build automatically.")
            print("Host the same tree behind https (e.g. https://retro.playmake.io ->")
            print("this server) to get the JSPI build; keep the COOP/COEP headers.")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            pass


if __name__ == "__main__":
    main()
