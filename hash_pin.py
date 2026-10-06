#!/usr/bin/env python3
"""Generate salted PBKDF2 hashes for your PINs + a token secret.
Usage: python hash_pin.py            (prompts for the PINs)
Put the printed values in Vercel -> Project -> Settings -> Environment Variables.
Never commit them to the repo."""
import getpass, hashlib, os, secrets


def h(pin: str) -> str:
    salt = os.urandom(16)
    return salt.hex() + "$" + hashlib.pbkdf2_hmac("sha256", pin.encode(), salt, 200_000).hex()


print("UPLOAD_CODE_HASH=" + h(getpass.getpass("Gallery upload code: ")))
print("ADMIN_CODE_HASH=" + h(getpass.getpass("Admin removal password: ")))
print("TOKEN_SECRET=" + secrets.token_hex(32))
