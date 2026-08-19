"""Tests for PIN-based OAuth used by connect-only HTTP MCP clients."""

from __future__ import annotations

import asyncio
from unittest.mock import MagicMock

import pytest
from starlette.datastructures import FormData
from starlette.exceptions import HTTPException

from auth import AuthError
from mcp.server.auth.provider import AuthorizationParams
from mcp.shared.auth import OAuthClientInformationFull
from oauth import MCP_SCOPE, PinOAuthProvider, normalize_public_url
from pydantic import AnyUrl


class _FakeFormRequest:
    def __init__(self, **fields: str) -> None:
        self._form = FormData(fields)

    async def form(self) -> FormData:
        return self._form


def _run(coro):
    return asyncio.run(coro)


@pytest.fixture
def db() -> MagicMock:
    mock = MagicMock()
    mock._lookup_user_id_by_pin.return_value = 42
    mock.issue_session.return_value = {
        "id": 42,
        "token": "jwt-from-oauth",
        "expires_at": "later",
        "expires_in": 3600,
        "session_id": "sid-oauth",
    }
    return mock


@pytest.fixture
def provider(db: MagicMock) -> PinOAuthProvider:
    return PinOAuthProvider("https://mcp.example.com/mcp", db_factory=lambda: db)


@pytest.fixture
def client() -> OAuthClientInformationFull:
    return OAuthClientInformationFull(
        client_id="mobile-client",
        redirect_uris=[AnyUrl("https://client.example/callback")],
        token_endpoint_auth_method="none",
        scope=MCP_SCOPE,
    )


def _start_login(provider: PinOAuthProvider, client: OAuthClientInformationFull) -> str:
    _run(provider.register_client(client))
    url = _run(
        provider.authorize(
            client,
            AuthorizationParams(
                state="client-state",
                scopes=[MCP_SCOPE],
                code_challenge="challenge",
                redirect_uri=AnyUrl("https://client.example/callback"),
                redirect_uri_provided_explicitly=True,
                resource="https://mcp.example.com/mcp",
            ),
        )
    )
    assert url.startswith("https://mcp.example.com/login?state=")
    return url.split("state=", 1)[1]


def test_normalize_public_url_strips_mcp_path() -> None:
    assert normalize_public_url("https://host.example/mcp/") == "https://host.example"
    assert normalize_public_url("https://host.example") == "https://host.example"


def test_authorize_redirects_to_pin_login(
    provider: PinOAuthProvider,
    client: OAuthClientInformationFull,
) -> None:
    state = _start_login(provider, client)
    page = _run(provider.get_login_page(state))
    assert page.status_code == 200
    body = page.body.decode()
    assert "8-digit PIN" in body
    assert state in body


def test_login_rejects_invalid_pin(
    provider: PinOAuthProvider,
    client: OAuthClientInformationFull,
    db: MagicMock,
) -> None:
    state = _start_login(provider, client)
    db._lookup_user_id_by_pin.side_effect = AuthError("Invalid PIN")
    page = _run(provider.handle_login_callback(_FakeFormRequest(pin="00000000", state=state)))
    assert page.status_code == 200
    assert b"Invalid PIN" in page.body


def test_login_issues_code_and_jwt(
    provider: PinOAuthProvider,
    client: OAuthClientInformationFull,
    db: MagicMock,
) -> None:
    state = _start_login(provider, client)
    redirect = _run(provider.handle_login_callback(_FakeFormRequest(pin="12345678", state=state)))
    assert redirect.status_code == 302
    location = redirect.headers["location"]
    assert location.startswith("https://client.example/callback")
    assert "code=" in location
    assert "state=client-state" in location
    db._lookup_user_id_by_pin.assert_called_once_with("12345678")

    code = location.split("code=", 1)[1].split("&", 1)[0]
    loaded = _run(provider.load_authorization_code(client, code))
    assert loaded is not None
    assert loaded.subject == "42"

    token = _run(provider.exchange_authorization_code(client, loaded))
    assert token.access_token == "jwt-from-oauth"
    assert token.token_type == "Bearer"
    assert token.refresh_token
    access = _run(provider.load_access_token("jwt-from-oauth"))
    assert access is not None
    assert access.subject == "42"


def test_login_page_requires_valid_state(provider: PinOAuthProvider) -> None:
    with pytest.raises(HTTPException):
        _run(provider.get_login_page(""))
    with pytest.raises(HTTPException):
        _run(provider.get_login_page("unknown"))
