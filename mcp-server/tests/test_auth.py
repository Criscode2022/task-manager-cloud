"""Unit tests for PIN, JWT, API key, and multi-method auth resolution."""

from __future__ import annotations

import hashlib
from datetime import datetime, timedelta, timezone

import jwt
import pytest

from auth import (
    AuthError,
    AuthIdentity,
    collect_auth_attempts,
    create_access_token,
    extract_bearer_token,
    generate_pin,
    hash_pin,
    is_valid_pin,
    lookup_api_key_user_id,
    parse_api_keys,
    pin_lookup_key,
    run_auth_attempts,
    session_is_active,
    session_ttl_seconds,
    verify_access_token,
    verify_pin,
)


@pytest.fixture
def pin_pepper(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("PIN_PEPPER", "unit-test-pin-pepper-32-chars-min")


@pytest.fixture
def jwt_secret(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("JWT_SECRET", "unit-test-jwt-secret-32-chars-min")


@pytest.fixture
def clear_auth_env(monkeypatch: pytest.MonkeyPatch) -> None:
    for key in (
        "TASK_MANAGER_PIN",
        "TASK_MANAGER_TOKEN",
        "MCP_API_KEY",
        "MCP_API_KEY_USER_ID",
        "MCP_API_KEYS",
    ):
        monkeypatch.delenv(key, raising=False)


def test_generate_pin_is_eight_digits() -> None:
    pin = generate_pin()
    assert is_valid_pin(pin)
    assert len(set(generate_pin() for _ in range(8))) > 1


def test_is_valid_pin() -> None:
    assert is_valid_pin("12345678")
    assert not is_valid_pin("1234")
    assert not is_valid_pin("1234567a")
    assert not is_valid_pin("")


def test_pin_lookup_requires_pepper(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("PIN_PEPPER", raising=False)
    with pytest.raises(RuntimeError, match="PIN_PEPPER"):
        pin_lookup_key("12345678")


def test_hash_and_verify_pin(pin_pepper: None) -> None:
    pin = "48291037"
    stored = hash_pin(pin)
    assert stored != pin
    assert verify_pin(pin, stored)
    assert not verify_pin("00000000", stored)


def test_verify_legacy_sha256_pin() -> None:
    pin = "1234"
    legacy = hashlib.sha256(pin.encode("utf-8")).hexdigest()
    assert verify_pin(pin, legacy)
    assert not verify_pin("9999", legacy)


def test_lookup_key_is_deterministic(pin_pepper: None) -> None:
    assert pin_lookup_key("12345678") == pin_lookup_key("12345678")
    assert pin_lookup_key("12345678") != pin_lookup_key("87654321")


def test_extract_bearer_token() -> None:
    assert extract_bearer_token("Bearer abc.def") == "abc.def"
    assert extract_bearer_token("bearer xyz") == "xyz"
    assert extract_bearer_token("  Bearer  tok  ") == "tok"
    assert extract_bearer_token("raw-token") == "raw-token"
    assert extract_bearer_token("") == ""
    assert extract_bearer_token(None) == ""


def test_create_and_verify_access_token(jwt_secret: None) -> None:
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=5)
    token = create_access_token(user_id=42, session_id="sid-1", expires_at=expires_at)
    header = jwt.get_unverified_header(token)
    assert header["alg"] == "HS256"
    claims = verify_access_token(token)
    assert claims.user_id == 42
    assert claims.session_id == "sid-1"
    assert verify_access_token(f"Bearer {token}").user_id == 42


def test_verify_access_token_rejects_tampered(jwt_secret: None) -> None:
    with pytest.raises(AuthError, match="Invalid or expired"):
        verify_access_token("not-a-jwt")


def test_verify_access_token_rejects_expired(jwt_secret: None) -> None:
    expires_at = datetime.now(timezone.utc) - timedelta(seconds=5)
    token = create_access_token(user_id=1, session_id="sid-expired", expires_at=expires_at)
    with pytest.raises(AuthError, match="Invalid or expired"):
        verify_access_token(token)


def test_verify_access_token_requires_secret(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("JWT_SECRET", raising=False)
    with pytest.raises(AuthError, match="JWT_SECRET"):
        verify_access_token("anything")


def test_session_ttl_defaults(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("SESSION_TTL_SECONDS", raising=False)
    assert session_ttl_seconds() == 86400
    monkeypatch.setenv("SESSION_TTL_SECONDS", "not-a-number")
    assert session_ttl_seconds() == 86400
    monkeypatch.setenv("SESSION_TTL_SECONDS", "3600")
    assert session_ttl_seconds() == 3600


def test_session_is_active_with_datetime_and_iso() -> None:
    now = datetime(2026, 8, 19, 12, 0, tzinfo=timezone.utc)
    future = now + timedelta(hours=1)
    assert session_is_active({"expires_at": future, "revoked_at": None}, now=now)
    assert session_is_active({"expires_at": future.isoformat(), "revoked_at": None}, now=now)
    assert not session_is_active({"expires_at": future, "revoked_at": now}, now=now)
    assert not session_is_active({"expires_at": now - timedelta(seconds=1)}, now=now)
    assert not session_is_active(None, now=now)


def test_parse_api_keys_json_csv_and_single() -> None:
    assert parse_api_keys(
        single_key="solo",
        single_user_id="9",
        keys_spec='{"alice": 1, "bob": 2}',
    ) == {"solo": 9, "alice": 1, "bob": 2}
    assert parse_api_keys(keys_spec="alpha:10, beta:20") == {"alpha": 10, "beta": 20}
    assert parse_api_keys(keys_spec="key-with:colon:3") == {"key-with:colon": 3}


def test_parse_api_keys_rejects_bad_spec() -> None:
    with pytest.raises(AuthError):
        parse_api_keys(keys_spec="no-colon")
    with pytest.raises(AuthError):
        parse_api_keys(single_key="k", single_user_id="x")
    with pytest.raises(AuthError):
        parse_api_keys(keys_spec='["not", "an", "object"]')


def test_lookup_api_key_user_id() -> None:
    keys = {"good-key": 4, "other": 5}
    assert lookup_api_key_user_id("good-key", keys) == 4
    with pytest.raises(AuthError, match="Invalid API key"):
        lookup_api_key_user_id("nope", keys)
    with pytest.raises(AuthError, match="No API keys"):
        lookup_api_key_user_id("anything", {})


def test_collect_auth_attempts_order(clear_auth_env: None, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("TASK_MANAGER_TOKEN", "env-jwt")
    monkeypatch.setenv("MCP_API_KEY", "env-key")
    monkeypatch.setenv("TASK_MANAGER_PIN", "11111111")
    attempts = collect_auth_attempts(
        pin="22222222",
        token="Bearer arg-jwt",
        api_key="arg-key",
    )
    assert [(a.method, a.value, a.source) for a in attempts] == [
        ("jwt", "arg-jwt", "argument"),
        ("api_key", "arg-key", "argument"),
        ("pin", "22222222", "argument"),
        ("jwt", "env-jwt", "environment"),
        ("api_key", "env-key", "environment"),
        ("pin", "11111111", "environment"),
    ]


def test_collect_auth_attempts_from_authorization_header(
    clear_auth_env: None,
) -> None:
    attempts = collect_auth_attempts(authorization="Bearer abc.def.ghi")
    assert [(a.method, a.value, a.source) for a in attempts] == [
        ("jwt", "abc.def.ghi", "header"),
        ("api_key", "abc.def.ghi", "header"),
    ]


def test_collect_auth_attempts_skips_duplicates(
    clear_auth_env: None,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("TASK_MANAGER_PIN", "12345678")
    attempts = collect_auth_attempts(pin="12345678")
    assert len(attempts) == 1
    assert attempts[0].source == "argument"


def test_run_auth_attempts_first_success_wins(clear_auth_env: None) -> None:
    calls: list[str] = []

    def verify_jwt(value: str) -> AuthIdentity:
        calls.append(f"jwt:{value}")
        raise AuthError("bad jwt")

    def verify_api_key(value: str) -> AuthIdentity:
        calls.append(f"api_key:{value}")
        return AuthIdentity(user_id=99, method="api_key")

    def verify_pin(value: str) -> AuthIdentity:
        calls.append(f"pin:{value}")
        return AuthIdentity(user_id=1, method="pin")

    identity = run_auth_attempts(
        collect_auth_attempts(pin="12345678", token="bad", api_key="secret"),
        verify_jwt=verify_jwt,
        verify_api_key=verify_api_key,
        verify_pin=verify_pin,
    )
    assert identity == AuthIdentity(user_id=99, method="api_key")
    assert calls == ["jwt:bad", "api_key:secret"]


def test_run_auth_attempts_falls_back_to_pin(clear_auth_env: None) -> None:
    identity = run_auth_attempts(
        collect_auth_attempts(pin="12345678", token="expired"),
        verify_jwt=lambda _v: (_ for _ in ()).throw(AuthError("expired")),
        verify_api_key=lambda _v: (_ for _ in ()).throw(AuthError("no keys")),
        verify_pin=lambda pin: AuthIdentity(user_id=5, method="pin"),
    )
    assert identity.user_id == 5
    assert identity.method == "pin"


def test_run_auth_attempts_requires_credentials(clear_auth_env: None) -> None:
    with pytest.raises(AuthError, match="No credentials provided"):
        run_auth_attempts(
            collect_auth_attempts(),
            verify_jwt=lambda _v: AuthIdentity(1, "jwt"),
            verify_api_key=lambda _v: AuthIdentity(1, "api_key"),
            verify_pin=lambda _v: AuthIdentity(1, "pin"),
        )


def test_run_auth_attempts_all_fail(clear_auth_env: None) -> None:
    with pytest.raises(AuthError, match="Authentication failed"):
        run_auth_attempts(
            collect_auth_attempts(pin="00000000"),
            verify_jwt=lambda _v: (_ for _ in ()).throw(AuthError("no")),
            verify_api_key=lambda _v: (_ for _ in ()).throw(AuthError("no")),
            verify_pin=lambda _v: (_ for _ in ()).throw(AuthError("Invalid PIN")),
        )
