"""GET -> list of pictures stored in the repo's gallery/ folder (newest first)."""
try:
    from _common import Base, github, FILE_RE, FOLDER, BRANCH, REPO
except ImportError:
    from api._common import Base, github, FILE_RE, FOLDER, BRANCH, REPO


class handler(Base):
    def do_GET(self):
        if not self.configured():
            return
        status, data = github("GET", f"contents/{FOLDER}?ref={BRANCH}")
        if status == 404:
            return self.reply(200, {"items": []})
        if status != 200 or not isinstance(data, list):
            return self.reply(502, {"error": "Could not load the gallery."})
        items = []
        for f in data:
            n = f.get("name", "")
            if FILE_RE.match(n):
                ts, user = n[:-4].split("__")
                url = f.get("download_url") or f"https://raw.githubusercontent.com/{REPO}/{BRANCH}/{FOLDER}/{n}"
                items.append({"name": n, "user": user, "ts": int(ts), "url": url})
        items.sort(key=lambda i: i["ts"], reverse=True)
        self.reply(200, {"items": items})
