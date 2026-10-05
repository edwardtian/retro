#!/usr/bin/env python3
"""Local hosting server for the dumped Retro Online "dosx" player.

Why not `python3 -m http.server`? The classic DOSBox-X WebAssembly build needs:
  * Cross-Origin-Opener-Policy: same-origin
  * Cross-Origin-Embedder-Policy: require-corp
so the page becomes cross-origin isolated (SharedArrayBuffer), and the WASM
core must be served with `application/wasm`. Big image files are also
downloaded with Range requests by the emulator, which http.server does not
support. This server handles all three.

Usage:
    python3 serve.py [--host 127.0.0.1] [--port 8000] [--root .]
"""

import argparse
import os
import re
import socket
import socketserver
import sys
from email.utils import formatdate
from http.server import SimpleHTTPRequestHandler

MIME = {
    ".html": "text/html; charset=utf-8",
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


class Handler(SimpleHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def guess_type(self, path):
        ext = os.path.splitext(path)[1].lower()
        return MIME.get(ext) or super().guess_type(path)

    def end_headers(self):
        # Cross-origin isolation: required by the classic dosx build
        # (SharedArrayBuffer path). Harmless for the JSPI (dosx-edge) build.
        self.send_header("Cross-Origin-Opener-Policy", "same-origin")
        self.send_header("Cross-Origin-Embedder-Policy", "require-corp")
        self.send_header("Cross-Origin-Resource-Policy", "cross-origin")
        path = self.path.split("?", 1)[0].lower()
        # Never serve stale emulator code after an update of the dump.
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
    args = parser.parse_args()

    os.chdir(args.root)
    Handler.extensions_map.update({})
    with Server((args.host, args.port), Handler) as httpd:
        host, port = httpd.server_address[:2]
        try:
            display = host if host != "0.0.0.0" else "127.0.0.1"
        except Exception:
            display = host
        print("Serving %s on http://%s:%d/  (Ctrl+C to stop)" % (args.root, display, port))
        print("Open http://%s:%d/ in your browser." % (display, port))
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            pass


if __name__ == "__main__":
    main()
