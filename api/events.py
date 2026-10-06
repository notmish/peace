"""GET -> list of event pictures (+ optional note file) in the repo's event-gallery/ folder."""
import re
try:
    from _common import Base, github, BRANCH, REPO
except ImportError:
    from api._common import Base, github, BRANCH, REPO

FOLDER = "event-gallery"
IMG_RE = re.compile(r"^(\d{13})__([A-Za-z0-9_]{3,16})\.jpg$")
TXT_RE = re.compile(r"^(\d{13}__[A-Za-z0-9_]{3,16})\.txt$")


class handler(Base):
    def do_GET(self):
        if not self.configured():
            return
        status, data = github("GET", f"contents/{FOLDER}?ref={BRANCH}")
        if status == 404:
            return self.reply(200, {"items": []})
        if status != 200 or not isinstance(data, list):
            return self.reply(502, {"error": "Could not load event records."})

        def url(f):
            return f.get("download_url") or f"https://raw.githubusercontent.com/{REPO}/{BRANCH}/{FOLDER}/{f['name']}"

        notes = {m.group(1): url(f) for f in data if (m := TXT_RE.match(f.get("name", "")))}
        items = []
        for f in data:
            m = IMG_RE.match(f.get("name", ""))
            if m:
                items.append({"name": f["name"], "user": m.group(2), "ts": int(m.group(1)),
                              "url": url(f), "note_url": notes.get(f["name"][:-4])})
        items.sort(key=lambda i: i["ts"], reverse=True)
        self.reply(200, {"items": items})
