"""GET -> live status of the two Java addresses, checked from the server (not the visitor's browser).
Uses the mcsrvstat.us v3 API, which requires a descriptive User-Agent. The result is cached at Vercel's
edge for 60 s, so many visitors cost only one check per minute.
Each entry is {online, players}, or null if the check itself could not be completed."""
import json
import urllib.request
from concurrent.futures import ThreadPoolExecutor
try:
    from _common import Base
except ImportError:
    from api._common import Base

TARGETS = {"main": "play.mcpeace.fun", "backup": "node-2.banglaverse.net:25668"}
UA = "PeaceSMP-StatusCheck/1.0 (+https://www.mcpeace.fun)"


def check(addr: str):
    req = urllib.request.Request(f"https://api.mcsrvstat.us/3/{addr}",
                                 headers={"User-Agent": UA, "Accept": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=7) as r:
            d = json.loads(r.read())
        return {"online": bool(d.get("online")), "players": int((d.get("players") or {}).get("online") or 0)}
    except Exception:
        return None


class handler(Base):
    def do_GET(self):
        with ThreadPoolExecutor(max_workers=2) as pool:
            results = list(pool.map(check, TARGETS.values()))
        self.reply(200, dict(zip(TARGETS, results)), cache="public, s-maxage=60, stale-while-revalidate=300")
