"""GET -> list of YouTube videos stored as small files in the repo's video-gallery/ folder."""
import re
try:
    from _common import Base, github, BRANCH
except ImportError:
    from api._common import Base, github, BRANCH

FOLDER = "video-gallery"
VID_RE = re.compile(r"^(\d{13})__([A-Za-z0-9_]{3,16})__([A-Za-z0-9_-]{11})\.txt$")


class handler(Base):
    def do_GET(self):
        if not self.configured():
            return
        status, data = github("GET", f"contents/{FOLDER}?ref={BRANCH}")
        if status == 404:
            return self.reply(200, {"items": []})
        if status != 200 or not isinstance(data, list):
            return self.reply(502, {"error": "Could not load videos."})
        items = []
        for f in data:
            m = VID_RE.match(f.get("name", ""))
            if m:
                items.append({"name": f["name"], "ts": int(m.group(1)), "user": m.group(2), "id": m.group(3)})
        items.sort(key=lambda i: i["ts"], reverse=True)
        self.reply(200, {"items": items})
