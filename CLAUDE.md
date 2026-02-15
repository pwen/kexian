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

## Models (`models/`)
- **User** — username, password_hash, height_cm, reach_cm, avatar_style; DiceBear avatar URL
- **Project** — name, grade, type (0=Sport,1=Boulder,2=Trad), status (0=ToTry,1=Projecting,2=OnHold,3=Sent), pitches, length, user_id, location_id
- **Session** — date, style (0=Attempt,1=Flash,2=Send), planned (bool), notes, project_id
- **Location** — country_code/name, state_code/name, area, crag

## Routes (`routes/`)
- **pages.py** — SPA page routes (`/`, `/<user>/projects|ascents|locations|profile`), `/health`
- **auth.py** — `/api/auth/` — signup, login, logout, me, profile (PUT height/reach)
- **projects.py** — `/api/<user>/projects` — CRUD, session-years endpoint
- **sessions.py** — `/api/<user>/projects/<id>/sessions` — CRUD
- **locations.py** — `/api/locations` — list, create, update, delete; `/api/countries` + subdivisions

## Frontend JS (`static/js/`)
- **app.js** — entry point, imports and boots all modules
- **api.js** — `api()` fetch helper, `currentUser`, `profileUser`, `isOwner()`, `apiBase()`
- **router.js** — tab switching, URL filter state, `switchTab()`, `getActiveTab()`
- **auth.js** — login/signup modals, auth nav, profile tab populate/save
- **projects.js** — project table render, sort (status→last_session), filter, CRUD modal
- **sessions.js** — session modal, edit/delete
- **locations.js** — location select in project modal, locations tab (list/edit/delete)

## Templates (`templates/`)
- **index.html** — shell: head, nav, `{% include %}` partials, boot scripts
- **partials/_auth_modals.html** — login + signup modals
- **partials/_tab_projects.html** — projects tab (filters, list, project modal; includes session & location modals)
- **partials/_session_modal.html** — log/edit session modal
- **partials/_location_modal.html** — create location modal (used from project form)
- **partials/_tab_ascents.html** — ascents tab (placeholder)
- **partials/_tab_locations.html** — locations management tab + edit location modal
- **partials/_tab_profile.html** — profile tab (height/reach form)
