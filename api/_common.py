"""Shared helpers for the Peace SMP serverless API (Vercel Python runtime)."""
import os, json, hmac, hashlib, base64, time, re
import urllib.request, urllib.error
from http.server import BaseHTTPRequestHandler

REPO = os.environ.get("GITHUB_REPO", "")            # e.g. "yourname/peace-smp"
BRANCH = os.environ.get("GITHUB_BRANCH", "main")
GH_TOKEN = os.environ.get("GITHUB_TOKEN", "")
SECRET = os.environ.get("TOKEN_SECRET", "").encode()
FOLDER = "gallery"

NAME_RE = re.compile(r"^[A-Za-z0-9_]{3,16}$")                    # Minecraft username
FILE_RE = re.compile(r"^\d{13}__[A-Za-z0-9_]{3,16}\.jpg$")       # <ms timestamp>__<user>.jpg
MAX_BYTES = 3_000_000


def check_pin(pin: str, stored: str) -> bool:
    """stored = '<salt_hex>$<pbkdf2_sha256_hex>' (see hash_pin.py). Constant-time compare."""
    try:
        salt_hex, hash_hex = stored.split("$")
        dk = hashlib.pbkdf2_hmac("sha256", pin.encode(), bytes.fromhex(salt_hex), 200_000)
        return hmac.compare_digest(dk.hex(), hash_hex)
    except Exception:
        return False


def make_token(scope: str, ttl: int = 900) -> str:
    body = f"{scope}.{int(time.time()) + ttl}"
    return f"{body}.{hmac.new(SECRET, body.encode(), hashlib.sha256).hexdigest()}"


def valid_token(token: str, scope: str) -> bool:
    try:
        s, exp, sig = token.split(".")
        good = hmac.new(SECRET, f"{s}.{exp}".encode(), hashlib.sha256).hexdigest()
        return s == scope and int(exp) > time.time() and hmac.compare_digest(sig, good)
    except Exception:
        return False


def github(method: str, path: str, payload=None):
    """Call the GitHub Contents API. Returns (status, json)."""
    req = urllib.request.Request(
        f"https://api.github.com/repos/{REPO}/{path}",
        data=json.dumps(payload).encode() if payload is not None else None,
        method=method,
        headers={
            "Authorization": f"Bearer {GH_TOKEN}",
            "Accept": "application/vnd.github+json",
            "User-Agent": "peace-smp-site",
            "Content-Type": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            return r.status, json.loads(r.read() or b"{}")
    except urllib.error.HTTPError as e:
        try:
            return e.code, json.loads(e.read() or b"{}")
        except Exception:
            return e.code, {}


class Base(BaseHTTPRequestHandler):
    def reply(self, code: int, data):
        body = json.dumps(data).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def body(self) -> dict:
        try:
            n = int(self.headers.get("Content-Length", 0))
            return json.loads(self.rfile.read(n) or b"{}")
        except Exception:
            return {}

    def configured(self) -> bool:
        if not (REPO and GH_TOKEN and SECRET):
            self.reply(500, {"error": "Server is not configured (missing environment variables)."})
            return False
        return True
