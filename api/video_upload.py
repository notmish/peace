"""POST {token, username, link} -> saves video-gallery/<ts>__<user>__<youtubeId>.txt in the repo."""
import base64, re, time
from urllib.parse import urlparse, parse_qs
try:
    from _common import Base, github, valid_token, NAME_RE, BRANCH
except ImportError:
    from api._common import Base, github, valid_token, NAME_RE, BRANCH

FOLDER = "video-gallery"
ID_RE = re.compile(r"^[A-Za-z0-9_-]{11}$")


def youtube_id(link: str) -> str:
    try:
        u = urlparse(link.strip())
        if u.scheme not in ("http", "https"):
            return ""
        host = re.sub(r"^(www|m)\.", "", (u.hostname or "").lower())
        vid = ""
        if host == "youtu.be":
            vid = u.path.lstrip("/").split("/")[0]
        elif host in ("youtube.com", "music.youtube.com", "youtube-nocookie.com"):
            if u.path == "/watch":
                vid = (parse_qs(u.query).get("v") or [""])[0]
            else:
                m = re.match(r"^/(?:shorts|embed|live|v)/([^/?]+)", u.path)
                vid = m.group(1) if m else ""
        return vid if ID_RE.match(vid) else ""
    except Exception:
        return ""


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
        vid = youtube_id(str(d.get("link", "")))
        if not vid:
            return self.reply(400, {"error": "Please paste a valid YouTube link."})
        name = f"{int(time.time() * 1000)}__{user}__{vid}.txt"
        status, _ = github("PUT", f"contents/{FOLDER}/{name}", {
            "message": f"Video gallery: add video by {user}",
            "content": base64.b64encode(f"https://youtu.be/{vid}".encode()).decode(),
            "branch": BRANCH})
        if status in (200, 201):
            return self.reply(200, {"ok": True})
        self.reply(502, {"error": "Could not save the video."})
