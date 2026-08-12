"""PIN helpers for Task Manager MCP (8-digit, bcrypt + lookup HMAC)."""

from __future__ import annotations

import hashlib
import hmac
import os
import secrets

import bcrypt

PIN_LENGTH = 8


def generate_pin() -> str:
    """Generate a cryptographically random 8-digit PIN."""
    return "".join(str(secrets.randbelow(10)) for _ in range(PIN_LENGTH))


def is_valid_pin(pin: str) -> bool:
    return isinstance(pin, str) and pin.isdigit() and len(pin) == PIN_LENGTH


def pin_lookup_key(pin: str) -> str:
    pepper = os.environ.get("PIN_PEPPER")
    if not pepper:
        raise RuntimeError("PIN_PEPPER must be set in the environment.")
    return hmac.new(pepper.encode("utf-8"), pin.encode("utf-8"), hashlib.sha256).hexdigest()


def hash_pin(pin: str) -> str:
    """Hash a PIN with bcrypt (salt embedded in the hash)."""
    return bcrypt.hashpw(pin.encode("utf-8"), bcrypt.gensalt(rounds=12)).decode("utf-8")


def verify_pin(pin: str, stored_hash: str) -> bool:
    """Return True when the PIN matches the stored hash (bcrypt or legacy SHA-256)."""
    if not stored_hash:
        return False
    if len(stored_hash) == 64 and all(c in "0123456789abcdef" for c in stored_hash.lower()):
        legacy = hashlib.sha256(pin.encode("utf-8")).hexdigest()
        return hmac.compare_digest(legacy, stored_hash.lower())
    try:
        return bcrypt.checkpw(pin.encode("utf-8"), stored_hash.encode("utf-8"))
    except ValueError:
        return False
