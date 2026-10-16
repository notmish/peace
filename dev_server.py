#!/usr/bin/env python3
"""Local development server for Peace SMP website.
Serves static assets and provides local mock endpoints for /api/gallery, /api/events, /api/videos and /api/status
using local repository folders.
"""
import http.server
import json
import os
import re
import socketserver

PORT = 3000
DIRECTORY = os.path.dirname(os.path.abspath(__file__))


class PeaceDevHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def do_GET(self):
        if self.path.startswith("/api/gallery"):
            return self.serve_gallery()
        elif self.path.startswith("/api/events"):
            return self.serve_events()
        elif self.path.startswith("/api/videos"):
            return self.serve_videos()
        elif self.path.startswith("/api/status"):
            return self.send_json({"main": {"online": True, "players": 0}, "backup": {"online": True, "players": 0}})  # mock
        return super().do_GET()

    def send_json(self, data, code=200):
        body = json.dumps(data).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(body)

    def serve_gallery(self):
        folder = os.path.join(DIRECTORY, "gallery")
        items = []
        if os.path.exists(folder):
            for f in os.listdir(folder):
                if re.match(r"^\d{13}__[A-Za-z0-9_]{3,16}\.jpg$", f):
                    ts, user = f[:-4].split("__")
                    items.append({
                        "name": f,
                        "user": user,
                        "ts": int(ts),
                        "url": f"/gallery/{f}"
                    })
        items.sort(key=lambda x: x["ts"], reverse=True)
        self.send_json({"items": items})

    def serve_events(self):
        folder = os.path.join(DIRECTORY, "event-gallery")
        items = []
        if os.path.exists(folder):
            notes = {f[:-4]: f"/event-gallery/{f}" for f in os.listdir(folder) if f.endswith(".txt")}
            for f in os.listdir(folder):
                if re.match(r"^\d{13}__[A-Za-z0-9_]{3,16}\.jpg$", f):
                    stem = f[:-4]
                    ts, user = stem.split("__")
                    items.append({
                        "name": f,
                        "user": user,
                        "ts": int(ts),
                        "url": f"/event-gallery/{f}",
                        "note_url": notes.get(stem)
                    })
        items.sort(key=lambda x: x["ts"], reverse=True)
        self.send_json({"items": items})

    def serve_videos(self):
        folder = os.path.join(DIRECTORY, "video-gallery")
        items = []
        vid_re = re.compile(r"^(\d{13})__([A-Za-z0-9_]{3,16})__([A-Za-z0-9_-]{11})\.txt$")
        if os.path.exists(folder):
            for f in os.listdir(folder):
                m = vid_re.match(f)
                if m:
                    items.append({
                        "name": f,
                        "ts": int(m.group(1)),
                        "user": m.group(2),
                        "id": m.group(3)
                    })
        items.sort(key=lambda x: x["ts"], reverse=True)
        self.send_json({"items": items})


if __name__ == "__main__":
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("127.0.0.1", PORT), PeaceDevHandler) as httpd:
        print(f"Peace SMP Local Dev Server running at http://localhost:{PORT}")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nShutting down server.")
