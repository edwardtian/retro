#!/usr/bin/env python3
"""Accounts, sessions and per-user game grants for the local mirror server.

There is no self-service registration: the first start creates an `admin`
account with a random password (printed once on the console), and that admin
creates every other account — from the /admin.html page or with the
``--create-user`` / ``--grant`` / ``--set-password`` command line switches.

State lives in a directory that is never served over HTTP:

    <auth-dir>/users.json    accounts, PBKDF2 password hashes, game grants
    <auth-dir>/secret.key    HMAC key for session cookies (created on demand)

A grant is either the string ``"*"`` (all games, including games added later)
or a list of catalog game ids. The catalog is read from ``catalog.js`` without
executing it, which also yields the path -> game mapping used to protect the
per-game files under /games/.

Only the standard library is used; the PBKDF2-HMAC-SHA256 hashes are written
with their own parameters so the iteration count can be raised later without
locking existing accounts out.
"""

import base64
import hashlib
import hmac
import json
import os
import re
import secrets
import threading
import time

PBKDF2_ALGORITHM = "pbkdf2_sha256"
PBKDF2_ITERATIONS = 200_000
PBKDF2_SALT_BYTES = 16
PASSWORD_MIN_LENGTH = 6
SESSION_TTL_SECONDS = 7 * 24 * 3600
SESSION_COOKIE = "rgp_session"
SESSION_RENEW_AFTER = 24 * 3600          # re-issue the cookie daily
LOGIN_MAX_FAILURES = 8                    # per (address, user) window
LOGIN_FAILURE_WINDOW = 300
ROLES = ("admin", "user")

USERNAME_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._-]{0,31}$")


class AuthError(Exception):
    """A failure the server reports to the client with a status code."""

    def __init__(self, status, message):
        super().__init__(message)
        self.status = status
        self.message = message


# ---------------------------------------------------------------------------
# Catalog scanning (catalog.js is plain data; never execute it)
# ---------------------------------------------------------------------------

def _bracket_end(text, start):
    """Index just past the bracket opening at `start`, string-aware."""
    depth, i, in_string, escaped = 0, start, False, False
    while i < len(text):
        char = text[i]
        if in_string:
            if escaped:
                escaped = False
            elif char == "\\":
                escaped = True
            elif char == '"':
                in_string = False
        elif char == '"':
            in_string = True
        elif char in "[{":
            depth += 1
        elif char in "]}":
            depth -= 1
            if depth == 0:
                return i + 1
        i += 1
    return len(text)


def _string_array(block, key):
    match = re.search(r'(?:"%s"|%s)\s*:\s*\[' % (key, key), block)
    if not match:
        return []
    start = block.index("[", match.start())
    inner = block[start + 1:_bracket_end(block, start) - 1]
    return [value.replace('\\"', '"') for value in re.findall(r'"((?:[^"\\]|\\.)*)"', inner)]


def parse_catalog(text):
    """Return [{id, title, configUrl, files, optionalFiles}] from catalog.js.

    Entries are written with both quoted and bare keys, so fields are matched
    with a per-entry regex over the balanced object literal rather than with a
    JSON parser.
    """
    games = []
    seen = set()
    for match in re.finditer(r'(?:"id"|id)\s*:\s*"([^"]+)"', text):
        brace = text.rindex("{", 0, match.start())
        block = text[brace:_bracket_end(text, brace)]
        game_id = match.group(1)
        if game_id in seen:
            continue
        seen.add(game_id)
        title = re.search(r'(?:"title"|title)\s*:\s*"((?:[^"\\]|\\.)*)"', block)
        config = re.search(r'(?:"configUrl"|configUrl)\s*:\s*"([^"]*)"', block)
        files = _string_array(block, "files")
        games.append({
            "id": game_id,
            "title": title.group(1) if title else game_id,
            "configUrl": config.group(1) if config else None,
            "files": files,
            "optionalFiles": _string_array(block, "optionalFiles"),
        })
    return games


def load_catalog(root):
    """Read catalog.js; returns [] when it is missing or unreadable."""
    path = os.path.join(root, "catalog.js")
    try:
        with open(path, "r", encoding="utf-8") as handle:
            return parse_catalog(handle.read())
    except OSError:
        return []


# ---------------------------------------------------------------------------
# Passwords
# ---------------------------------------------------------------------------

def hash_password(password, iterations=PBKDF2_ITERATIONS):
    if not isinstance(password, str) or len(password) < PASSWORD_MIN_LENGTH:
        raise AuthError(400, "password must be at least %d characters" % PASSWORD_MIN_LENGTH)
    salt = secrets.token_bytes(PBKDF2_SALT_BYTES)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, iterations)
    return {
        "algorithm": PBKDF2_ALGORITHM,
        "iterations": iterations,
        "salt": salt.hex(),
        "hash": digest.hex(),
    }


def verify_password(record, password):
    """Constant-time check of a stored password record."""
    if not isinstance(record, dict) or record.get("algorithm") != PBKDF2_ALGORITHM:
        return False
    try:
        salt = bytes.fromhex(record.get("salt", ""))
        expected = bytes.fromhex(record.get("hash", ""))
        iterations = int(record.get("iterations", PBKDF2_ITERATIONS))
    except (TypeError, ValueError):
        return False
    if not salt or not expected or iterations <= 0:
        return False
    digest = hashlib.pbkdf2_hmac("sha256", (password or "").encode("utf-8"), salt, iterations)
    return hmac.compare_digest(digest, expected)


# ---------------------------------------------------------------------------
# Sessions: signed cookies, no server-side session table
# ---------------------------------------------------------------------------

def _b64encode(raw):
    return base64.urlsafe_b64encode(raw).rstrip(b"=").decode("ascii")


def _b64decode(text):
    padding = "=" * (-len(text) % 4)
    return base64.urlsafe_b64decode(text + padding)


class SessionManager:
    def __init__(self, secret_path, ttl=SESSION_TTL_SECONDS):
        self.secret_path = secret_path
        self.ttl = ttl
        self._lock = threading.Lock()
        self._secret = None

    def secret(self):
        with self._lock:
            if self._secret is None:
                self._secret = self._load_secret()
            return self._secret

    def _load_secret(self):
        try:
            with open(self.secret_path, "rb") as handle:
                raw = handle.read()
            if len(raw) >= 32:
                return raw
        except OSError:
            pass
        raw = secrets.token_bytes(48)
        directory = os.path.dirname(self.secret_path)
        if directory:
            os.makedirs(directory, exist_ok=True)
        temporary = self.secret_path + ".tmp"
        with open(temporary, "wb") as handle:
            handle.write(raw)
        os.replace(temporary, self.secret_path)
        try:
            os.chmod(self.secret_path, 0o600)
        except OSError:
            pass
        return raw

    def _sign(self, payload):
        return hmac.new(self.secret(), payload, hashlib.sha256).digest()

    def issue(self, username):
        payload = json.dumps({
            "sub": username,
            "iat": int(time.time()),
            "exp": int(time.time()) + self.ttl,
        }, separators=(",", ":")).encode("utf-8")
        return "%s.%s" % (_b64encode(payload), _b64encode(self._sign(payload)))

    def verify(self, token):
        """Return {"sub", "iat", "exp"} for a valid token, else None."""
        if not isinstance(token, str) or token.count(".") != 1:
            return None
        payload_part, signature_part = token.split(".", 1)
        try:
            payload = _b64decode(payload_part)
            signature = _b64decode(signature_part)
        except (ValueError, TypeError):
            return None
        if not hmac.compare_digest(signature, self._sign(payload)):
            return None
        try:
            data = json.loads(payload.decode("utf-8"))
        except (ValueError, UnicodeDecodeError):
            return None
        if not isinstance(data, dict) or not isinstance(data.get("sub"), str):
            return None
        if int(data.get("exp", 0)) < time.time():
            return None
        return data

    def cookie_header(self, username, path="/"):
        value = self.issue(username)
        return "%s=%s; Path=%s; HttpOnly; SameSite=Lax; Max-Age=%d" % (
            SESSION_COOKIE, value, path, self.ttl)

    def cleared_cookie_header(self, path="/"):
        return "%s=; Path=%s; HttpOnly; SameSite=Lax; Max-Age=0" % (SESSION_COOKIE, path)


# ---------------------------------------------------------------------------
# User store
# ---------------------------------------------------------------------------

class UserStore:
    def __init__(self, directory):
        self.directory = directory
        self.path = os.path.join(directory, "users.json")
        self._lock = threading.RLock()
        self._users = {}
        self._failures = {}
        self._file_stamp = None
        self._stamp_checked = 0.0
        self._load()

    # --- persistence ------------------------------------------------------
    def _stat_stamp(self):
        try:
            stat = os.stat(self.path)
            return (stat.st_mtime_ns, stat.st_size)
        except OSError:
            return None

    def _maybe_reload(self, force=False):
        """Pick up accounts changed by another process (the --create-user CLI).

        The check is a cheap stat, throttled to once per second on the hot path
        (every request resolves its session); sign-in always re-checks so a
        deleted account cannot log in again.
        """
        now = time.monotonic()
        if not force and now - self._stamp_checked < 1.0:
            return
        with self._lock:
            self._stamp_checked = now
            if self._stat_stamp() != self._file_stamp:
                self._load()

    def _load(self):
        with self._lock:
            self._users = {}
            try:
                with open(self.path, "r", encoding="utf-8") as handle:
                    data = json.load(handle)
                users = data.get("users") if isinstance(data, dict) else None
                if isinstance(users, dict):
                    self._users = {name: record for name, record in users.items()
                                   if isinstance(record, dict)}
            except (OSError, ValueError):
                self._users = {}
            self._file_stamp = self._stat_stamp()
            self._stamp_checked = time.monotonic()

    def _save(self):
        os.makedirs(self.directory, exist_ok=True)
        payload = {"version": 1, "users": self._users}
        temporary = self.path + ".tmp"
        with open(temporary, "w", encoding="utf-8") as handle:
            json.dump(payload, handle, indent=2, sort_keys=True)
            handle.write("\n")
        os.replace(temporary, self.path)
        try:
            os.chmod(self.path, 0o600)
        except OSError:
            pass
        self._file_stamp = self._stat_stamp()

    def reload(self):
        self._load()

    # --- queries ----------------------------------------------------------
    def get(self, username):
        self._maybe_reload()
        with self._lock:
            record = self._users.get(username)
            return dict(record, username=username) if record else None

    def list_users(self):
        self._maybe_reload()
        with self._lock:
            return [self.public(name) for name in sorted(self._users)]

    def public(self, username):
        with self._lock:
            record = self._users.get(username)
            if not record:
                return None
            return {
                "username": username,
                "role": record.get("role", "user"),
                "games": record.get("games", "*"),
                "disabled": bool(record.get("disabled", False)),
                "created": record.get("created"),
                "updated": record.get("updated"),
            }

    def count_admins(self):
        self._maybe_reload()
        with self._lock:
            return sum(1 for record in self._users.values()
                       if record.get("role") == "admin" and not record.get("disabled"))

    # --- mutations --------------------------------------------------------
    @staticmethod
    def validate_username(username):
        if not isinstance(username, str) or not USERNAME_RE.match(username):
            raise AuthError(400, "username must be 1-32 characters: letters, digits, '.', '_' or '-'")
        return username

    @staticmethod
    def validate_games(games):
        """Normalise a grant: "*" (all) or a list of unique catalog ids."""
        if games is None:
            return "*"
        if isinstance(games, str):
            if games.strip().lower() in ("*", "all", ""):
                return "*"
            games = [part for part in games.split(",") if part.strip()]
        if not isinstance(games, list):
            raise AuthError(400, "games must be '*' or a list of game ids")
        cleaned = []
        for value in games:
            if not isinstance(value, str) or not value.strip():
                raise AuthError(400, "game ids must be non-empty strings")
            value = value.strip()
            if value in ("*", "all") and len(games) == 1:
                return "*"
            if value not in cleaned:
                cleaned.append(value)
        return cleaned

    def create(self, username, password, role="user", games="*"):
        self.validate_username(username)
        if role not in ROLES:
            raise AuthError(400, "role must be one of: %s" % ", ".join(ROLES))
        password_record = hash_password(password)
        grant = self.validate_games(games)
        with self._lock:
            if username in self._users:
                raise AuthError(409, "user '%s' already exists" % username)
            now = int(time.time())
            self._users[username] = {
                "password": password_record,
                "role": role,
                "games": grant,
                "disabled": False,
                "created": now,
                "updated": now,
            }
            self._save()
            return self.public(username)

    def update(self, username, password=None, role=None, games=None, disabled=None):
        with self._lock:
            record = self._users.get(username)
            if not record:
                raise AuthError(404, "no such user: %s" % username)
            if password is not None:
                record["password"] = hash_password(password)
            if role is not None:
                if role not in ROLES:
                    raise AuthError(400, "role must be one of: %s" % ", ".join(ROLES))
                if record.get("role") == "admin" and role != "admin" and self.count_admins() <= 1:
                    raise AuthError(400, "cannot demote the last administrator")
                record["role"] = role
            if games is not None:
                record["games"] = self.validate_games(games)
            if disabled is not None:
                disabled = bool(disabled)
                if disabled and record.get("role") == "admin" and self.count_admins() <= 1:
                    raise AuthError(400, "cannot disable the last administrator")
                record["disabled"] = disabled
            record["updated"] = int(time.time())
            self._save()
            return self.public(username)

    def delete(self, username, actor=None):
        with self._lock:
            record = self._users.get(username)
            if not record:
                raise AuthError(404, "no such user: %s" % username)
            if actor and actor == username:
                raise AuthError(400, "you cannot delete your own account")
            if record.get("role") == "admin" and self.count_admins() <= 1:
                raise AuthError(400, "cannot delete the last administrator")
            del self._users[username]
            self._save()
            return True

    def set_password(self, username, password):
        return self.update(username, password=password)

    def authenticate(self, username, password):
        """Return the public record on success, else None."""
        self._maybe_reload(force=True)
        with self._lock:
            record = self._users.get(username)
            stored = record.get("password") if record else None
            if not record or record.get("disabled"):
                verify_password(stored or {"algorithm": PBKDF2_ALGORITHM,
                                           "iterations": PBKDF2_ITERATIONS,
                                           "salt": "00" * PBKDF2_SALT_BYTES,
                                           "hash": "00" * 32}, password)
                return None
            if not verify_password(stored, password):
                return None
            return self.public(username)

    # --- login throttling -------------------------------------------------
    def too_many_failures(self, address, username):
        key = (address or "?", (username or "").lower())
        now = time.time()
        with self._lock:
            failures = [stamp for stamp in self._failures.get(key, [])
                        if now - stamp < LOGIN_FAILURE_WINDOW]
            self._failures[key] = failures
            return len(failures) >= LOGIN_MAX_FAILURES

    def note_failure(self, address, username):
        key = (address or "?", (username or "").lower())
        with self._lock:
            self._failures.setdefault(key, []).append(time.time())

    def note_success(self, address, username):
        key = (address or "?", (username or "").lower())
        with self._lock:
            self._failures.pop(key, None)

    # --- bootstrap --------------------------------------------------------
    def ensure_admin(self, username="admin"):
        """Create the first administrator on an empty store.

        Returns (created, password); the password is only set on creation.
        """
        with self._lock:
            if self._users:
                return False, None
            password = secrets.token_urlsafe(9)
            self.create(username, password, role="admin", games="*")
            return True, password

    def import_users(self, users):
        """Replace the store (used by the CLI and tests)."""
        with self._lock:
            self._users = users
            self._save()


# ---------------------------------------------------------------------------
# Access control: who may fetch which path
# ---------------------------------------------------------------------------

PUBLIC_EXACT = {
    "/login.html",
    "/js/login.js",
    "/favicon.ico",
    "/favicon.svg",
}
PUBLIC_PREFIXES = (
    "/lib/",
    "/css/",
    "/fonts/",
)
# Endpoints that must work before a session exists.
PUBLIC_API = (
    "/api/auth/login",
    "/api/auth/logout",
    "/api/auth/me",
)
ADMIN_PREFIXES = (
    "/admin.html",
    "/js/admin.js",
    "/api/auth/users",
    "/api/library",
    "/api/workshop/",
)


class AccessControl:
    """Maps request paths to the scope a caller needs.

    scope is one of:
      "public"            no session required
      "user"              any signed-in account
      "admin"             administrator accounts only
      ("game", <id>)      a signed-in account allowed to play <id>
    """

    def __init__(self, root):
        self.root = root
        self.games = []
        self.game_by_id = {}
        self.game_by_config = {}
        self.games_by_path = {}
        self.paths = []
        self.reload()

    def reload(self):
        self.games = load_catalog(self.root)
        self.game_by_id = {game["id"]: game for game in self.games}
        self.game_by_config = {}
        self.games_by_path = {}
        for game in self.games:
            if game.get("configUrl"):
                self.game_by_config[game["configUrl"].split("?", 1)[0]] = game["id"]
            for path in game["files"] + game["optionalFiles"]:
                self.games_by_path.setdefault(path, set()).add(game["id"])
        self.paths = sorted(self.games_by_path)

    # --- grants -----------------------------------------------------------
    @staticmethod
    def grants_all(record):
        return bool(record) and record.get("games") == "*"

    @staticmethod
    def allowed_ids(record):
        if not record:
            return set()
        games = record.get("games", [])
        return set(games) if isinstance(games, list) else set()

    def can_play(self, record, game_id):
        if not record or record.get("disabled"):
            return False
        if record.get("role") == "admin" or self.grants_all(record):
            return True
        return game_id in self.allowed_ids(record)

    def visible_games(self, record):
        """Game ids the account may see, or '*' for everything."""
        if not record:
            return []
        if record.get("role") == "admin" or self.grants_all(record):
            return "*"
        known = set(self.game_by_id)
        return sorted(self.allowed_ids(record) & known)

    # --- request scopes ---------------------------------------------------
    @staticmethod
    def _first(value):
        """Query values arrive either as a string or as a parsed list."""
        if isinstance(value, (list, tuple)):
            return value[0] if value else None
        return value

    def scope_for(self, path, query):
        """Return the scope needed for a path (with its parsed query)."""
        if path in PUBLIC_EXACT or any(path.startswith(p) for p in PUBLIC_PREFIXES):
            return "public"
        if path in PUBLIC_API:
            return "public"
        if path.startswith("/auth/") or path == "/auth":
            return ("deny", "not found")
        if any(path.startswith(p) for p in ADMIN_PREFIXES):
            return "admin"
        if path in ("/play.html", "/play"):
            game_id = self._first((query or {}).get("game"))
            if game_id:
                return ("game", game_id)
            return "user"
        # /config.js is the default player config (also used when no game is
        # named); hand-written config-*.js files map to their catalog entry.
        config_game = None if path == "/config.js" else self.game_by_config.get(path)
        if config_game:
            return ("game", config_game)
        if path.startswith("/config-"):
            return "user"
        owners = self.games_by_path.get(path)
        if owners:
            return ("any-game", sorted(owners))
        if path.startswith("/games/") or path.startswith("/images/games/"):
            return "user"
        return "user"


# ---------------------------------------------------------------------------
# Command line helpers (used by serve.py --list-users and friends)
# ---------------------------------------------------------------------------

def describe_grant(record, access):
    games = record.get("games", "*") if record else "*"
    if games == "*":
        return "all games"
    known = [g for g in games if g in access.game_by_id] if access else list(games)
    unknown = [g for g in games if access and g not in access.game_by_id]
    text = "%d game(s)" % len(games)
    if unknown:
        text += " (%d not in catalog: %s)" % (len(unknown), ", ".join(sorted(unknown)[:3]))
    return text
