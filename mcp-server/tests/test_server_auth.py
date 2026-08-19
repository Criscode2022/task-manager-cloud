"""Tests for MCP tool wiring around multi-method auth."""

from __future__ import annotations

import json
from unittest.mock import MagicMock

import pytest

from auth import AuthError, AuthIdentity
import server


@pytest.fixture
def db(monkeypatch: pytest.MonkeyPatch) -> MagicMock:
    mock_db = MagicMock()
    monkeypatch.setattr(server, "get_db", lambda: mock_db)
    return mock_db


def test_whoami_reports_method(db: MagicMock) -> None:
    db.resolve_identity.return_value = AuthIdentity(
        user_id=7,
        method="jwt",
        session_id="sid-7",
    )
    payload = json.loads(server.whoami(token="hdr.pay.sig"))
    assert payload == {"user_id": 7, "method": "jwt", "session_id": "sid-7"}
    db.resolve_identity.assert_called_once_with(pin=None, token="hdr.pay.sig", api_key=None)


def test_login_returns_nest_shaped_session(db: MagicMock) -> None:
    db.login_with_pin.return_value = {
        "id": 3,
        "token": "jwt-token",
        "expires_at": "2026-08-20T00:00:00+00:00",
        "expires_in": 86400,
        "session_id": "sid-3",
    }
    text = server.login("12345678")
    assert "user_id: 3" in text
    assert "token: jwt-token" in text
    db.login_with_pin.assert_called_once_with("12345678")


def test_logout_revokes_jwt_session(db: MagicMock) -> None:
    db.resolve_identity.return_value = AuthIdentity(
        user_id=3,
        method="jwt",
        session_id="sid-3",
    )
    assert "Session revoked" in server.logout(token="jwt-token")
    db.revoke_session.assert_called_once_with(3, "sid-3")


def test_logout_noop_for_pin(db: MagicMock) -> None:
    db.resolve_identity.return_value = AuthIdentity(user_id=3, method="pin")
    text = server.logout(pin="12345678")
    assert "nothing to revoke" in text
    db.revoke_session.assert_not_called()


def test_search_tasks_uses_resolved_user(db: MagicMock) -> None:
    db.resolve_identity.return_value = AuthIdentity(user_id=11, method="api_key")
    db.search_tasks.return_value = []
    assert "No tasks matched" in server.search_tasks(query="milk", api_key="k")
    db.search_tasks.assert_called_once()
    assert db.search_tasks.call_args.kwargs["user_id"] == 11


def test_create_user_includes_token_when_jwt_configured(db: MagicMock) -> None:
    db.create_user.return_value = {"id": 4, "created_at": "now"}
    db.issue_session.return_value = {
        "id": 4,
        "token": "new-jwt",
        "expires_at": "later",
        "expires_in": 86400,
        "session_id": "sid-4",
    }
    text = server.create_user()
    assert "user_id: 4" in text
    assert "token: new-jwt" in text
    assert "pin:" in text


def test_create_user_still_returns_pin_without_jwt_secret(db: MagicMock) -> None:
    db.create_user.return_value = {"id": 4, "created_at": "now"}
    db.issue_session.side_effect = AuthError("JWT_SECRET is not configured")
    text = server.create_user()
    assert "user_id: 4" in text
    assert "pin:" in text
    assert "TASK_MANAGER_PIN=" in text
