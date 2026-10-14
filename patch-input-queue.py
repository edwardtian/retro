#!/usr/bin/env python3
"""Patch the DDYX wasm input dispatcher so live input never gets scheduled late.

Why
---
The DDYX wasm core funnels every input message (wc-add-key, wc-mouse-move,
wc-mouse-button, wc-mouse-wheel, wc-mouse-sync) through one dispatcher.  It
dispatches an event immediately only when its device-clock event queue is empty
*and* the device clock is still inside a fixed window:

    A      = f64 reference time at object+40 (initialised lazily to the clock)
    C      = -300000.0 (5 minutes)
    t      = floor((clock - A + C) / 1000) + 1
    immediate dispatch  <=>  queue empty and t <= 0

Once the clock passes A - C, every input event is appended to a device-clock
scheduled FIFO with a delivery timestamp of `clock + t`.  Because `t` comes out
of a /1000 (seconds) and is then added to a millisecond clock, the added latency
is `(seconds since the window closed) + 1` milliseconds: it grows ~1 ms per
second of play, for keyboard and mouse alike, while the emulated machine itself
runs normally.  That is the "input latency accumulates over a long session"
regression; the queue also flushes wholesale at 4096 entries.

What this patch does
--------------------
It rewrites the single f64 constant C from -300000.0 to -1e15, i.e. it moves the
window five orders of magnitude into the future.  `t` then evaluates to a large
negative number, so the dispatcher always takes the immediate path when the
queue is empty -- exactly the behaviour the first five minutes of a session
already have.  The queued path itself is left intact for anything that
legitimately schedules events.

The constant occurs exactly once in each wasm build, and the bytes around it are
verified before anything is written, so the script refuses to patch a build whose
dispatcher does not match the analysed binaries.

Usage
-----
    python3 patch-input-queue.py --check
    python3 patch-input-queue.py --apply
    python3 patch-input-queue.py --revert

The patch is not upstream: re-run --check after replacing the wasm files and
re-apply if needed (both builds must be patched, /js/dosx/ and /js/dosx-edge/).
"""

from __future__ import annotations

import argparse
import shutil
import struct
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
TARGETS = (
    Path("js/dosx/wdosbox-x.wasm"),
    Path("js/dosx-edge/wdosbox-x.wasm"),
)

# f64 immediate values, little endian.
ORIGINAL_VALUE = -300000.0
PATCHED_VALUE = -1e15

ORIGINAL = struct.pack("<d", ORIGINAL_VALUE)
PATCHED = struct.pack("<d", PATCHED_VALUE)

# 24 bytes immediately before the f64.const opcode (0x44) of the constant:
#   local.get 0 / f64.load 3 40 / local.tee / f64.const 0.0 / f64.lt / br_if 0
#   / local.get / local.get / f64.sub
CONTEXT_BEFORE = (
    bytes.fromhex("20002b03282211")      # local.get 0 / f64.load 3 40 / local.tee
    + b"\x44" + struct.pack("<d", 0.0)   # f64.const 0.0
    + bytes.fromhex("630d0020132011a1")  # f64.lt / br_if 0 / local.get / local.get / f64.sub
)
# 8 bytes immediately after the f64.const immediate: f64.add then the next opcode.
CONTEXT_AFTER = b"\xa0"

BACKUP_DIR = Path(".probe/wasm-backup")


def locate(data: bytes, immediate: bytes) -> int:
    """Return the offset of the f64.const opcode for `immediate`, or -1."""
    needle = b"\x44" + immediate
    hits = []
    start = 0
    while True:
        index = data.find(needle, start)
        if index < 0:
            break
        hits.append(index)
        start = index + 1
    if len(hits) != 1:
        raise SystemExit(f"expected exactly one f64.const site, found {len(hits)} at {hits}")
    offset = hits[0]
    if data[offset - len(CONTEXT_BEFORE):offset] != CONTEXT_BEFORE:
        raise SystemExit(
            "dispatcher context before the constant does not match the analysed build "
            f"(offset {offset}) - refusing to patch"
        )
    if data[offset + 9:offset + 9 + len(CONTEXT_AFTER)] != CONTEXT_AFTER:
        raise SystemExit(
            "dispatcher context after the constant does not match the analysed build "
            f"(offset {offset}) - refusing to patch"
        )
    return offset


def state_of(data: bytes) -> tuple[str, int]:
    try:
        offset = locate(data, ORIGINAL)
        return "original", offset
    except SystemExit:
        pass
    try:
        offset = locate(data, PATCHED)
        return "patched", offset
    except SystemExit:
        pass
    return "unknown", -1


def describe(value: float) -> str:
    return f"{value:+.6g}"


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--check", action="store_true", help="report the patch state of each build")
    group.add_argument("--apply", action="store_true", help="rewrite the constant to -1e15")
    group.add_argument("--revert", action="store_true", help="restore the constant to -300000.0")
    args = parser.parse_args()

    failures = 0
    for relative in TARGETS:
        path = ROOT / relative
        if not path.exists():
            print(f"{relative}: MISSING")
            failures += 1
            continue
        data = path.read_bytes()
        state, offset = state_of(data)

        if args.check:
            value = ORIGINAL_VALUE if state == "original" else PATCHED_VALUE if state == "patched" else None
            detail = f"constant {describe(value)} at {offset}" if value is not None else "no matching dispatcher site"
            print(f"{relative}: {state.upper():8} ({detail})")
            if state == "unknown":
                failures += 1
            continue

        want = PATCHED_VALUE if args.apply else ORIGINAL_VALUE
        if state == ("patched" if args.apply else "original"):
            print(f"{relative}: already {state} (constant {describe(want)} at {offset})")
            continue
        if state == "unknown":
            print(f"{relative}: dispatcher site not recognised - not touched")
            failures += 1
            continue

        # Back up the untouched build once, next to the other probe output.
        backup = ROOT / BACKUP_DIR / f"{relative.parent.name}-wdosbox-x.wasm"
        if not backup.exists():
            backup.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(path, backup)
            print(f"{relative}: backup written to {BACKUP_DIR / backup.name}")

        out = bytearray(data)
        out[offset + 1:offset + 9] = struct.pack("<d", want)
        path.write_bytes(bytes(out))
        verify_state, verify_offset = state_of(path.read_bytes())
        expected_state = "patched" if args.apply else "original"
        if verify_state != expected_state:
            print(f"{relative}: FAILED verification (state {verify_state})")
            failures += 1
            continue
        print(f"{relative}: {expected_state} (constant {describe(want)} at {verify_offset})")

    if failures:
        print(f"\n{failures} target(s) need attention", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
