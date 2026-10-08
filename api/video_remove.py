"""POST {token, name} -> deletes a video entry from video-gallery/ (admin only)."""
import re
try:
    from _common import Base, github, valid_token, BRANCH
except ImportError:
    from api._common import Base, github, valid_token, BRANCH

FOLDER = "video-gallery"
VID_RE = re.compile(r"^\d{13}__[A-Za-z0-9_]{3,16}__[A-Za-z0-9_-]{11}\.txt$")


class handler(Base):
    def do_POST(self):
        if not self.configured():
            return
        d = self.body()
        name = str(d.get("name", ""))
        if not valid_token(str(d.get("token", "")), "admin"):
            return self.reply(401, {"error": "Admin session expired. Enter the password again."})
        if not VID_RE.match(name):
            return self.reply(400, {"error": "Bad file name."})
        status, info = github("GET", f"contents/{FOLDER}/{name}?ref={BRANCH}")
        if status != 200 or "sha" not in info:
            return self.reply(404, {"error": "Video not found."})
        status, _ = github("DELETE", f"contents/{FOLDER}/{name}", {
            "message": f"Video gallery: remove {name}", "sha": info["sha"], "branch": BRANCH})
        if status == 200:
            return self.reply(200, {"ok": True})
        self.reply(502, {"error": "Could not remove the video."})
