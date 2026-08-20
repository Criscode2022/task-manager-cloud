FROM ghcr.io/astral-sh/uv:python3.12-bookworm-slim

WORKDIR /app

COPY pyproject.toml uv.lock ./
COPY auth.py database.py oauth.py server.py ./

RUN uv sync --frozen --no-dev

ENV MCP_TRANSPORT=streamable-http
ENV MCP_HOST=0.0.0.0
ENV PORT=8000

EXPOSE 8000

CMD ["uv", "run", "server.py"]
