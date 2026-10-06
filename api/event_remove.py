"""POST {token, name} -> deletes the event picture (and its note) from event-gallery/ (admin only)."""
import re
try:
    from _common import Base, github, valid_token, BRANCH
except ImportError:
    from api._common import Base, github, valid_token, BRANCH

FOLDER = "event-gallery"
IMG_RE = re.compile(r"^(\d{13}__[A-Za-z0-9_]{3,16})\.jpg$")


class handler(Base):
    def do_POST(self):
        if not self.configured():
            return
        d = self.body()
        name = str(d.get("name", ""))
        if not valid_token(str(d.get("token", "")), "admin"):
            return self.reply(401, {"error": "Admin session expired. Enter the password again."})
        m = IMG_RE.match(name)
        if not m:
            return self.reply(400, {"error": "Bad file name."})
        ok = False
        for fname in (name, m.group(1) + ".txt"):
            status, info = github("GET", f"contents/{FOLDER}/{fname}?ref={BRANCH}")
            if status == 200 and "sha" in info:
                s, _ = github("DELETE", f"contents/{FOLDER}/{fname}", {
                    "message": f"Event gallery: remove {fname}", "sha": info["sha"], "branch": BRANCH})
                ok = ok or (fname == name and s == 200)
        if ok:
            return self.reply(200, {"ok": True})
        self.reply(502, {"error": "Could not remove the picture."})
