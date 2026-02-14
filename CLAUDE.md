# CLAUDE.md – Project Notes

## Package Management
- **Use `uv`** for all dependency management (`uv sync`, `uv run`)
- **Never use `pip` or `pip3`** directly — they will fail due to PEP 668
- After adding a dependency to `pyproject.toml`, run `uv sync` to install it
- To run any Python command: `uv run python ...`

## Python
- The system Python is `python3` (Homebrew, `/opt/homebrew/bin/python3`)
- There is no `python` alias — always use `python3` or `uv run python`

## Common Commands (see Makefile)
- `make setup` — install deps + apply migrations
- `make run` — start dev server on port 5001
- `make migrate m="description"` — generate a new Alembic migration
- `make upgrade` — apply pending migrations
- `make downgrade` — roll back last migration
- `make shell` — open Flask shell
- `make reset-db` — wipe DB and re-apply all migrations

## Database
- PostgreSQL 16 via Docker Compose (port 5432)
- Credentials: `kexian / kexian`, database: `kexian`
- Start with `docker compose up -d`

## Stack
- Flask 3.x, Flask-SQLAlchemy, Flask-Migrate, Flask-Login
- Frontend: vanilla JS SPA, JetBrains Mono font, Flatpickr date picker
- CSS: dark theme with zinc palette + blue accent (#3b82f6)
