"""POST {token, username, note, image(base64 JPEG)} -> event-gallery/<ts>__<user>.jpg (+ .txt note)."""
import base64, time
try:
    from _common import Base, github, valid_token, NAME_RE, BRANCH, MAX_BYTES
except ImportError:
    from api._common import Base, github, valid_token, NAME_RE, BRANCH, MAX_BYTES

FOLDER = "event-gallery"


class handler(Base):
    def do_POST(self):
        if not self.configured():
            return
        d = self.body()
        if not valid_token(str(d.get("token", "")), "upload"):
            return self.reply(401, {"error": "Permission expired. Please enter the code again."})
        user = str(d.get("username", "")).strip()
        if not NAME_RE.match(user):
            return self.reply(400, {"error": "Username must be 3-16 letters, numbers or underscores."})
        try:
            raw = base64.b64decode(str(d.get("image", "")).split(",")[-1], validate=True)
        except Exception:
            return self.reply(400, {"error": "Invalid image."})
        if len(raw) > MAX_BYTES or raw[:3] != b"\xff\xd8\xff":
            return self.reply(400, {"error": "Image must be a JPEG under 3 MB."})
        note = str(d.get("note", "")).strip()[:300]
        stem = f"{int(time.time() * 1000)}__{user}"
        status, _ = github("PUT", f"contents/{FOLDER}/{stem}.jpg", {
            "message": f"Event gallery: add picture by {user}",
            "content": base64.b64encode(raw).decode(), "branch": BRANCH})
        if status not in (200, 201):
            return self.reply(502, {"error": "Could not save the picture."})
        if note:
            github("PUT", f"contents/{FOLDER}/{stem}.txt", {
                "message": f"Event gallery: note by {user}",
                "content": base64.b64encode(note.encode("utf-8")).decode(), "branch": BRANCH})
        self.reply(200, {"ok": True})
