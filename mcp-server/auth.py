"""PIN hashing compatible with the Task Manager Angular app (SHA-256 hex)."""

from __future__ import annotations

import hashlib
import random


def generate_pin() -> str:
    """Generate a random 4-digit PIN."""
    return str(random.randint(1000, 9999))


def hash_pin(pin: str) -> str:
    """Hash a PIN using SHA-256, returning a lowercase hex digest."""
    return hashlib.sha256(pin.encode("utf-8")).hexdigest()


def verify_pin(pin: str, stored_hash: str) -> bool:
    """Return True when the PIN matches the stored hash."""
    return hash_pin(pin) == stored_hash
