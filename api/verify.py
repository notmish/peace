"""POST {pin, scope: 'upload'|'admin'} -> {token}. PINs are only ever checked here, against salted hashes in env vars."""
import os, time
try:
    from _common import Base, check_pin, make_token, SECRET
except ImportError:
    from api._common import Base, check_pin, make_token, SECRET


class handler(Base):
    def do_POST(self):
        if not SECRET:
            return self.reply(500, {"error": "Server is not configured."})
        d = self.body()
        scope = d.get("scope")
        env = {"upload": "UPLOAD_CODE_HASH", "admin": "ADMIN_CODE_HASH"}.get(scope)
        if not env:
            return self.reply(400, {"error": "Bad request."})
        if check_pin(str(d.get("pin", ""))[:64], os.environ.get(env, "")):
            return self.reply(200, {"token": make_token(scope)})
        time.sleep(1.2)  # slow down guessing
        self.reply(401, {"error": "Incorrect code."})
