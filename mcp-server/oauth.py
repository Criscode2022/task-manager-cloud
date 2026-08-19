"""PIN-based OAuth authorization server for HTTP MCP clients.

Connect-only clients (no assistant) cannot call the `login` tool. They open
OAuth in a browser, the user types an 8-digit PIN, and the client receives a
Nest-compatible JWT as the Bearer access token.
"""

from __future__ import annotations

import html
import logging
import secrets
import time
from typing import Any, Callable

from pydantic import AnyHttpUrl
from starlette.exceptions import HTTPException
from starlette.requests import Request
from starlette.responses import HTMLResponse, RedirectResponse, Response

from auth import AuthError, verify_access_token
from mcp.server.auth.provider import (
    AccessToken,
    AuthorizationCode,
    AuthorizationParams,
    OAuthAuthorizationServerProvider,
    RefreshToken,
    TokenError,
    construct_redirect_uri,
)
from mcp.shared.auth import OAuthClientInformationFull, OAuthToken

logger = logging.getLogger("task-manager-mcp")

MCP_SCOPE = "tasks"
AUTH_CODE_TTL_SECONDS = 300
REFRESH_TTL_SECONDS = 60 * 60 * 24 * 30


def normalize_public_url(url: str) -> str:
    """Origin of the MCP server (strip trailing slash and optional /mcp)."""
    cleaned = url.strip().rstrip("/")
    if cleaned.endswith("/mcp"):
        cleaned = cleaned[: -len("/mcp")].rstrip("/")
    return cleaned


class PinOAuthProvider(OAuthAuthorizationServerProvider[AuthorizationCode, RefreshToken, AccessToken]):
    """Authorization-code + PKCE provider that authenticates with a Task Cloud PIN."""

    def __init__(
        self,
        public_url: str,
        *,
        db_factory: Callable[[], Any] | None = None,
    ) -> None:
        self.public_url = normalize_public_url(public_url)
        self._db_factory = db_factory
        self.clients: dict[str, OAuthClientInformationFull] = {}
        self.auth_codes: dict[str, AuthorizationCode] = {}
        self.tokens: dict[str, AccessToken] = {}
        self.refresh_tokens: dict[str, RefreshToken] = {}
        self.state_mapping: dict[str, dict[str, str | None]] = {}

    def _db(self) -> Any:
        if self._db_factory is not None:
            return self._db_factory()
        from database import get_db

        return get_db()

    async def get_client(self, client_id: str) -> OAuthClientInformationFull | None:
        return self.clients.get(client_id)

    async def register_client(self, client_info: OAuthClientInformationFull) -> None:
        if not client_info.client_id:
            raise ValueError("No client_id provided")
        self.clients[client_info.client_id] = client_info

    async def authorize(self, client: OAuthClientInformationFull, params: AuthorizationParams) -> str:
        state = params.state or secrets.token_hex(16)
        self.state_mapping[state] = {
            "redirect_uri": str(params.redirect_uri),
            "code_challenge": params.code_challenge,
            "redirect_uri_provided_explicitly": str(params.redirect_uri_provided_explicitly),
            "client_id": client.client_id,
            "resource": params.resource,
            "oauth_state": params.state,
        }
        return f"{self.public_url}/login?state={state}"

    def login_page_html(self, state: str, error: str | None = None) -> str:
        safe_state = html.escape(state, quote=True)
        error_html = (
            f'<p class="error">{html.escape(error)}</p>' if error else ""
        )
        return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Task Cloud MCP login</title>
  <style>
    :root {{ color-scheme: light dark; }}
    body {{
      font-family: system-ui, sans-serif;
      max-width: 22rem;
      margin: 3rem auto;
      padding: 0 1.25rem;
      line-height: 1.4;
    }}
    h1 {{ font-size: 1.25rem; }}
    label {{ display: block; font-weight: 600; margin-bottom: 0.35rem; }}
    input {{
      width: 100%;
      box-sizing: border-box;
      padding: 0.7rem;
      font-size: 1.25rem;
      letter-spacing: 0.2em;
      text-align: center;
    }}
    button {{
      width: 100%;
      margin-top: 1rem;
      padding: 0.75rem;
      border: 0;
      border-radius: 0.5rem;
      background: #2563eb;
      color: white;
      font-size: 1rem;
      font-weight: 600;
    }}
    .error {{ color: #b91c1c; }}
    p {{ color: #64748b; }}
  </style>
</head>
<body>
  <h1>Task Cloud MCP</h1>
  <p>Enter your 8-digit PIN to connect this client. No assistant is required.</p>
  {error_html}
  <form method="post" action="/login">
    <input type="hidden" name="state" value="{safe_state}" />
    <label for="pin">PIN</label>
    <input id="pin" name="pin" inputmode="numeric" pattern="[0-9]*" maxlength="8"
           autocomplete="one-time-code" required autofocus />
    <button type="submit">Sign in</button>
  </form>
</body>
</html>
"""

    async def get_login_page(self, state: str, error: str | None = None) -> HTMLResponse:
        if not state:
            raise HTTPException(400, "Missing state parameter")
        if state not in self.state_mapping:
            raise HTTPException(400, "Invalid or expired login session")
        return HTMLResponse(self.login_page_html(state, error))

    async def handle_login_callback(self, request: Request) -> Response:
        form = await request.form()
        pin = form.get("pin")
        state = form.get("state")
        if not isinstance(pin, str) or not isinstance(state, str) or not pin or not state:
            raise HTTPException(400, "Missing pin or state")

        state_data = self.state_mapping.get(state)
        if not state_data:
            raise HTTPException(400, "Invalid or expired login session")

        try:
            user_id = self._db()._lookup_user_id_by_pin(pin)
        except AuthError:
            return await self.get_login_page(state, error="Invalid PIN")
        except Exception as exc:  # PIN_PEPPER / DB misconfig
            logger.exception("OAuth PIN login failed: %s", exc)
            return await self.get_login_page(state, error="Login is not available right now")

        redirect_uri = state_data["redirect_uri"]
        code_challenge = state_data["code_challenge"]
        client_id = state_data["client_id"]
        resource = state_data.get("resource")
        oauth_state = state_data.get("oauth_state")
        assert redirect_uri is not None
        assert code_challenge is not None
        assert client_id is not None

        code = secrets.token_urlsafe(24)
        self.auth_codes[code] = AuthorizationCode(
            code=code,
            client_id=client_id,
            redirect_uri=AnyHttpUrl(redirect_uri),
            redirect_uri_provided_explicitly=state_data["redirect_uri_provided_explicitly"] == "True",
            expires_at=time.time() + AUTH_CODE_TTL_SECONDS,
            scopes=[MCP_SCOPE],
            code_challenge=code_challenge,
            resource=resource,
            subject=str(user_id),
        )
        del self.state_mapping[state]
        return RedirectResponse(
            url=construct_redirect_uri(redirect_uri, code=code, state=oauth_state),
            status_code=302,
            headers={"Cache-Control": "no-store"},
        )

    async def load_authorization_code(
        self,
        client: OAuthClientInformationFull,
        authorization_code: str,
    ) -> AuthorizationCode | None:
        code = self.auth_codes.get(authorization_code)
        if code is None:
            return None
        if code.expires_at < time.time():
            del self.auth_codes[authorization_code]
            return None
        return code

    def _issue_oauth_token(self, client_id: str, user_id: int, scopes: list[str], resource: str | None) -> OAuthToken:
        session = self._db().issue_session(user_id)
        access = session["token"]
        ttl = int(session["expires_in"])
        self.tokens[access] = AccessToken(
            token=access,
            client_id=client_id,
            scopes=scopes,
            expires_at=int(time.time()) + ttl,
            resource=resource,
            subject=str(user_id),
        )
        refresh = secrets.token_urlsafe(32)
        self.refresh_tokens[refresh] = RefreshToken(
            token=refresh,
            client_id=client_id,
            scopes=scopes,
            expires_at=int(time.time()) + REFRESH_TTL_SECONDS,
            subject=str(user_id),
        )
        return OAuthToken(
            access_token=access,
            token_type="Bearer",
            expires_in=ttl,
            scope=" ".join(scopes),
            refresh_token=refresh,
        )

    async def exchange_authorization_code(
        self,
        client: OAuthClientInformationFull,
        authorization_code: AuthorizationCode,
    ) -> OAuthToken:
        stored = self.auth_codes.pop(authorization_code.code, None)
        if stored is None:
            raise TokenError("invalid_grant", "Invalid authorization code")
        if not client.client_id:
            raise TokenError("invalid_client", "No client_id provided")
        user_id = int(stored.subject or 0)
        if not user_id:
            raise TokenError("invalid_grant", "Authorization code has no user")
        return self._issue_oauth_token(
            client.client_id,
            user_id,
            stored.scopes,
            stored.resource,
        )

    async def load_access_token(self, token: str) -> AccessToken | None:
        cached = self.tokens.get(token)
        if cached is not None:
            if cached.expires_at and cached.expires_at < time.time():
                self.tokens.pop(token, None)
                return None
            return cached
        try:
            claims = verify_access_token(token)
            self._db().require_valid_session(claims.user_id, claims.session_id)
        except (AuthError, Exception):
            return None
        return AccessToken(
            token=token,
            client_id="task-cloud",
            scopes=[MCP_SCOPE],
            expires_at=claims.exp,
            subject=str(claims.user_id),
        )

    async def load_refresh_token(
        self,
        client: OAuthClientInformationFull,
        refresh_token: str,
    ) -> RefreshToken | None:
        token = self.refresh_tokens.get(refresh_token)
        if token is None:
            return None
        if token.expires_at and token.expires_at < time.time():
            del self.refresh_tokens[refresh_token]
            return None
        return token

    async def exchange_refresh_token(
        self,
        client: OAuthClientInformationFull,
        refresh_token: RefreshToken,
        scopes: list[str],
    ) -> OAuthToken:
        stored = self.refresh_tokens.pop(refresh_token.token, None)
        if stored is None or not stored.subject:
            raise TokenError("invalid_grant", "Invalid refresh token")
        if not client.client_id:
            raise TokenError("invalid_client", "No client_id provided")
        return self._issue_oauth_token(
            client.client_id,
            int(stored.subject),
            scopes or stored.scopes,
            None,
        )

    async def revoke_token(self, token: AccessToken | RefreshToken) -> None:
        raw = token.token
        self.tokens.pop(raw, None)
        self.refresh_tokens.pop(raw, None)
        try:
            claims = verify_access_token(raw)
            self._db().revoke_session(claims.user_id, claims.session_id)
        except Exception:
            return


def oauth_enabled() -> bool:
    transport = os_transport()
    return transport in {"http", "streamable-http", "streamable_http"} and bool(
        os_public_url()
    )


def os_transport() -> str:
    import os

    return os.environ.get("MCP_TRANSPORT", "stdio").strip().lower()


def os_public_url() -> str | None:
    import os

    raw = os.environ.get("MCP_PUBLIC_URL") or os.environ.get("MCP_ISSUER_URL")
    return normalize_public_url(raw) if raw else None

