# Accounts and per-user games

The mirror can require a sign-in before anything is served. There is no
self-service registration: the server creates one administrator on first start,
and that administrator creates every other account and decides which games each
account may play.

## Turning it on

Nothing to configure: accounts are on by default.

```sh
python3 serve.py                       # http://127.0.0.1:8000
```

The first start prints the administrator password **once**:

```
Accounts: /srv/retro/auth  (1 account(s))

  Created the first administrator account:
      username: admin
      password: 8kQ2vXr1nB0
  This password is shown once; change it with
      python3 serve.py --set-password admin
  or from http://127.0.0.1:8000/admin.html after signing in.
```

Sign in at `/login.html`, then open **Users** in the navigation bar (visible to
administrators only). Passwords are stored as PBKDF2-HMAC-SHA256 hashes with a
per-account salt in `auth/users.json`; `auth/secret.key` signs session cookies.
Both files are created with mode `600` and the whole `auth/` directory is
refused over HTTP.

For a single-user machine that does not want a login at all:

```sh
python3 serve.py --no-auth          # every request acts as an administrator
```

## Administrator workflow

1. **Users** → *Create account*: username, password, role.
2. Choose **All games** (also covers games added later) or **Only selected
   games** and tick the games this account may use.
3. Edit an account at any time to change its grant, reset its password, disable
   it, or delete it. The last administrator cannot be demoted, disabled or
   deleted, and administrators cannot delete themselves.

Accounts can also be managed from the command line (these run and exit):

```sh
python3 serve.py --list-users
python3 serve.py --create-user alice --role user --games age_of_empires,heart_of_darkness
python3 serve.py --create-user bob   --role admin --games all
python3 serve.py --set-password alice
python3 serve.py --grant alice --games all
python3 serve.py --delete-user alice
```

`--password` supplies the password without an interactive prompt (useful in
scripts). `--games` takes `all`, `*`, or a comma-separated list of catalog ids
(the ids shown in the admin page; they match the `config-<id>.js` file names).

Changes made with the CLI are picked up by a running server within a second.

## What each account can reach

| Request | Required |
| --- | --- |
| `/login.html`, `/js/login.js`, `/css/*`, `/lib/*`, `/fonts/*`, `/api/auth/login`, `/api/auth/me` | public |
| `/`, `/index.html`, `/settings.html`, `/catalog.js`, `/js/*`, `/images/**`, `/api/discs` | signed in |
| `/play.html?game=<id>` | that game granted |
| `/config-<id>.js` | that game granted |
| `/games/...` (game bundles, OS/game/disc images) | one of the games that uses the file is granted; shared archives (e.g. `tools.zip`) are available to anyone with at least one game that needs them |
| `/admin.html`, `/js/admin.js`, `/api/auth/users*`, `/api/library/*`, `/api/workshop/*` | administrator |

Unassigned games are hidden from the game list and refused with **403** even if
the URL is typed directly, so a restricted account cannot download another
game's files. Requests from a signed-out browser are redirected to
`/login.html?next=<page>`; API and asset requests get **401**.

Accounts can change their own password on the admin page, or with
`POST /api/auth/password` (`{"current": "...", "new": "..."}`).

## Sessions

- Cookie `rgp_session`, `HttpOnly`, `SameSite=Lax`, valid for 7 days.
- Signed with HMAC-SHA256 (`auth/secret.key`), so no server-side session table
  is needed and a restart does not sign everybody out.
- Deleting `auth/secret.key` invalidates every session; deleting
  `auth/users.json` starts over with a fresh administrator.
- Failed sign-ins are throttled per address+username (8 failures in 5 minutes
  → `429`).

## Files

```
auth/users.json    accounts: PBKDF2 password records, role, game grants
auth/secret.key    cookie signing key (created on demand)
```

Both live outside version control (`/auth` is in `.gitignore`) and are never
served. `--auth-dir` moves the directory elsewhere.

## Notes

- The site is usually served over plain HTTP on a LAN, where the cookie cannot
  be marked `Secure`. Terminate TLS in front of `serve.py` if the network is
  not trusted.
- `--no-auth` is meant for local development and for the automated player
  tests; it does not create or consult accounts.
