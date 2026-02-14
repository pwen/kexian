# ---------- build stage ----------
FROM python:3.12-slim AS builder

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

WORKDIR /app

# Install dependencies (cached unless pyproject.toml changes)
COPY pyproject.toml uv.lock* ./
RUN uv sync --no-dev --frozen 2>/dev/null || uv sync --no-dev

# ---------- runtime stage ----------
FROM python:3.12-slim

WORKDIR /app

# Copy the virtual environment from builder
COPY --from=builder /app/.venv /app/.venv

# Put the venv on PATH
ENV PATH="/app/.venv/bin:$PATH"

# Copy application code
COPY . .

EXPOSE 5001

# Run migrations then start the server
CMD ["sh", "-c", "flask db upgrade && gunicorn --bind 0.0.0.0:5001 app:app"]
