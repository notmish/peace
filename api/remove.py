"""POST {token, name} -> deletes gallery/<name> from the repo (admin only)."""
try:
    from _common import Base, github, valid_token, FILE_RE, FOLDER, BRANCH
except ImportError:
    from api._common import Base, github, valid_token, FILE_RE, FOLDER, BRANCH


class handler(Base):
    def do_POST(self):
        if not self.configured():
            return
        d = self.body()
        name = str(d.get("name", ""))
        if not valid_token(str(d.get("token", "")), "admin"):
            return self.reply(401, {"error": "Admin session expired. Enter the password again."})
        if not FILE_RE.match(name):
            return self.reply(400, {"error": "Bad file name."})
        status, info = github("GET", f"contents/{FOLDER}/{name}?ref={BRANCH}")
        if status != 200 or "sha" not in info:
            return self.reply(404, {"error": "Picture not found."})
        status, _ = github("DELETE", f"contents/{FOLDER}/{name}", {
            "message": f"Gallery: remove {name}", "sha": info["sha"], "branch": BRANCH})
        if status == 200:
            return self.reply(200, {"ok": True})
        self.reply(502, {"error": "Could not remove the picture."})
