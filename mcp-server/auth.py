"""Authentication helpers for Task Manager MCP.

Supports three credential types, matching the Nest API where possible:

- PIN — 8-digit code, bcrypt hash + HMAC lookup (`PIN_PEPPER`)
- JWT — HS256 access token with `sub` (user id) and `sid` (session id),
  issued with the same `JWT_SECRET` as `apps/api`
- API key — static keys mapped to a user id via env (`MCP_API_KEY` /
  `MCP_API_KEYS`)
"""

from __future__ import annotations

import hashlib
import hmac
import json
import logging
import os
import secrets
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Callable, Literal

import bcrypt
import jwt
from dotenv import load_dotenv

load_dotenv()
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "..", ".env"))

logger = logging.getLogger("task-manager-mcp")

PIN_LENGTH = 8
JWT_ALGORITHM = "HS256"
DEFAULT_SESSION_TTL_SECONDS = 60 * 60 * 24

AuthMethod = Literal["jwt", "api_key", "pin"]
CredentialSource = Literal["argument", "environment", "header"]


class AuthError(ValueError):
    """Raised when authentication is missing or all methods fail."""


@dataclass(frozen=True)
class AuthIdentity:
    user_id: int
    method: AuthMethod
    session_id: str | None = None


@dataclass(frozen=True)
class AuthAttempt:
    method: AuthMethod
    value: str
    source: CredentialSource


@dataclass(frozen=True)
class JwtClaims:
    user_id: int
    session_id: str
    exp: int | None = None


# ---------------------------------------------------------------------------
# PIN
# ---------------------------------------------------------------------------


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


# ---------------------------------------------------------------------------
# JWT (compatible with apps/api AuthService)
# ---------------------------------------------------------------------------


def jwt_secret() -> str:
    secret = os.environ.get("JWT_SECRET")
    if not secret:
        raise AuthError("JWT_SECRET is not configured; cannot issue or verify tokens.")
    return secret


def session_ttl_seconds() -> int:
    raw = os.environ.get("SESSION_TTL_SECONDS", "")
    try:
        ttl = int(raw)
    except ValueError:
        ttl = 0
    return ttl if ttl > 0 else DEFAULT_SESSION_TTL_SECONDS


def extract_bearer_token(value: str | None) -> str:
    """Return the token from `Bearer <token>` or the raw string if unprefixed."""
    header = (value or "").strip()
    if not header:
        return ""
    prefix = "bearer "
    if header.lower().startswith(prefix):
        return header[len(prefix) :].strip()
    return header


def create_access_token(*, user_id: int, session_id: str, expires_at: datetime) -> str:
    """Sign an HS256 JWT with the same claims as the Nest API (`sub`, `sid`)."""
    now = datetime.now(timezone.utc)
    exp = expires_at if expires_at.tzinfo else expires_at.replace(tzinfo=timezone.utc)
    payload = {
        "sid": session_id,
        "sub": str(user_id),
        "iat": int(now.timestamp()),
        "exp": int(exp.timestamp()),
    }
    return jwt.encode(payload, jwt_secret(), algorithm=JWT_ALGORITHM)


def verify_access_token(token: str) -> JwtClaims:
    """Verify a Nest-compatible access token and return its claims."""
    raw = extract_bearer_token(token)
    if not raw:
        raise AuthError("Invalid or expired token")
    try:
        payload = jwt.decode(raw, jwt_secret(), algorithms=[JWT_ALGORITHM])
    except jwt.PyJWTError as exc:
        raise AuthError("Invalid or expired token") from exc

    try:
        user_id = int(payload.get("sub") or 0)
    except (TypeError, ValueError) as exc:
        raise AuthError("Invalid token") from exc
    session_id = str(payload.get("sid") or "")
    if not user_id or not session_id:
        raise AuthError("Invalid token")
    exp = payload.get("exp")
    return JwtClaims(
        user_id=user_id,
        session_id=session_id,
        exp=int(exp) if exp is not None else None,
    )


def session_is_active(row: dict[str, Any] | None, *, now: datetime | None = None) -> bool:
    """Return True when a sessions row is present, unrevoked, and unexpired."""
    if not row or row.get("revoked_at") is not None:
        return False
    expires_at = row.get("expires_at")
    if expires_at is None:
        return False
    if isinstance(expires_at, datetime):
        exp = expires_at if expires_at.tzinfo else expires_at.replace(tzinfo=timezone.utc)
    else:
        exp = datetime.fromisoformat(str(expires_at).replace("Z", "+00:00"))
        if exp.tzinfo is None:
            exp = exp.replace(tzinfo=timezone.utc)
    moment = now or datetime.now(timezone.utc)
    if moment.tzinfo is None:
        moment = moment.replace(tzinfo=timezone.utc)
    return exp > moment


# ---------------------------------------------------------------------------
# API keys
# ---------------------------------------------------------------------------


def parse_api_keys(
    *,
    single_key: str | None = None,
    single_user_id: str | None = None,
    keys_spec: str | None = None,
) -> dict[str, int]:
    """Parse API key → user id mappings from env-style strings.

    `keys_spec` may be JSON (`{"key": 1}`) or a comma-separated list of
    `key:user_id` pairs. Duplicate keys keep the last mapping.
    """
    mapping: dict[str, int] = {}

    if single_key and single_user_id:
        try:
            mapping[single_key] = int(single_user_id)
        except ValueError as exc:
            raise AuthError("MCP_API_KEY_USER_ID must be an integer user id.") from exc

    spec = (keys_spec or "").strip()
    if not spec:
        return mapping

    if spec.startswith("{"):
        try:
            parsed = json.loads(spec)
        except json.JSONDecodeError as exc:
            raise AuthError("MCP_API_KEYS must be valid JSON object or key:user_id list.") from exc
        if not isinstance(parsed, dict):
            raise AuthError("MCP_API_KEYS JSON must be an object of key → user_id.")
        for key, user_id in parsed.items():
            try:
                mapping[str(key)] = int(user_id)
            except (TypeError, ValueError) as exc:
                raise AuthError("MCP_API_KEYS values must be integer user ids.") from exc
        return mapping

    for part in spec.split(","):
        item = part.strip()
        if not item:
            continue
        if ":" not in item:
            raise AuthError("MCP_API_KEYS entries must look like key:user_id.")
        key, user_id = item.rsplit(":", 1)
        key = key.strip()
        if not key:
            raise AuthError("MCP_API_KEYS entries must look like key:user_id.")
        try:
            mapping[key] = int(user_id.strip())
        except ValueError as exc:
            raise AuthError("MCP_API_KEYS user ids must be integers.") from exc
    return mapping


def load_api_keys() -> dict[str, int]:
    return parse_api_keys(
        single_key=os.environ.get("MCP_API_KEY"),
        single_user_id=os.environ.get("MCP_API_KEY_USER_ID"),
        keys_spec=os.environ.get("MCP_API_KEYS"),
    )


def _secure_equals(left: str, right: str) -> bool:
    try:
        return hmac.compare_digest(left.encode("utf-8"), right.encode("utf-8"))
    except (TypeError, ValueError):
        return False


def lookup_api_key_user_id(api_key: str, keys: dict[str, int] | None = None) -> int:
    """Return the user id bound to `api_key`, using constant-time compares."""
    mapping = keys if keys is not None else load_api_keys()
    if not mapping:
        raise AuthError("No API keys are configured.")
    matched: int | None = None
    for stored, user_id in mapping.items():
        if _secure_equals(stored, api_key):
            matched = user_id
    if matched is None:
        raise AuthError("Invalid API key")
    return matched


# ---------------------------------------------------------------------------
# Multi-method resolver (first successful source wins)
# ---------------------------------------------------------------------------


def collect_auth_attempts(
    pin: str | None = None,
    token: str | None = None,
    api_key: str | None = None,
    authorization: str | None = None,
) -> list[AuthAttempt]:
    """Build ordered credential attempts: args, HTTP header, then environment.

    A Bearer header is tried as both a JWT and an API key so HTTP clients
    that only support Method → Bearer token can use either credential.
    """
    attempts: list[AuthAttempt] = []
    seen: set[tuple[AuthMethod, str]] = set()

    def add(method: AuthMethod, value: str | None, source: CredentialSource) -> None:
        if not value:
            return
        normalized = extract_bearer_token(value) if method in {"jwt", "api_key"} else value
        if not normalized:
            return
        key = (method, normalized)
        if key in seen:
            return
        seen.add(key)
        attempts.append(AuthAttempt(method=method, value=normalized, source=source))

    add("jwt", token, "argument")
    add("api_key", api_key, "argument")
    add("pin", pin, "argument")
    header = extract_bearer_token(authorization)
    add("jwt", header, "header")
    add("api_key", header, "header")
    add("jwt", os.environ.get("TASK_MANAGER_TOKEN"), "environment")
    add("api_key", os.environ.get("MCP_API_KEY"), "environment")
    add("pin", os.environ.get("TASK_MANAGER_PIN"), "environment")
    return attempts


def run_auth_attempts(
    attempts: list[AuthAttempt],
    *,
    verify_jwt: Callable[[str], AuthIdentity],
    verify_api_key: Callable[[str], AuthIdentity],
    verify_pin: Callable[[str], AuthIdentity],
) -> AuthIdentity:
    """Try each credential; return the first identity that verifies."""
    if not attempts:
        raise AuthError(
            "No credentials provided. Pass pin, token, or api_key, or set "
            "TASK_MANAGER_PIN, TASK_MANAGER_TOKEN, or MCP_API_KEY."
        )

    handlers: dict[AuthMethod, Callable[[str], AuthIdentity]] = {
        "jwt": verify_jwt,
        "api_key": verify_api_key,
        "pin": verify_pin,
    }
    last_error: AuthError | None = None
    for attempt in attempts:
        try:
            identity = handlers[attempt.method](attempt.value)
            logger.info(
                "Authenticated user %s via %s (%s)",
                identity.user_id,
                attempt.method,
                attempt.source,
            )
            return identity
        except AuthError as exc:
            last_error = exc
            logger.info(
                "Auth method %s via %s failed: %s",
                attempt.method,
                attempt.source,
                exc,
            )
            continue

    tried = ", ".join(f"{a.method} via {a.source}" for a in attempts)
    detail = str(last_error) if last_error else "unknown error"
    raise AuthError(
        f"Authentication failed (tried {tried}). Last error: {detail}. "
        "Provide a valid PIN, JWT access token, or API key."
    )
