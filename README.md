# Climbing Tracker

A personal app to track climbing projects, log sessions, and celebrate sends.

Built with **Flask**, **SQLAlchemy**, **PostgreSQL**, and **Flask-Migrate**.

## Prerequisites

- Python 3.10+
- [uv](https://docs.astral.sh/uv/) (recommended) or pip
- [Docker](https://docs.docker.com/get-docker/) (for running PostgreSQL locally)

## Usage

### Local development (recommended)

```bash
make db                   # start only Postgres
make setup                # install deps + run migrations
make run                  # Flask dev server with hot reload at http://localhost:5001
```

### Full Docker (app + Postgres)

```bash
make docker-up            # everything in the background
make docker-up-logs       # everything with log tailing
```

### All commands

| Command | Description |
|---------|-------------|
| `make db` | Start only Postgres in the background |
| `make run` | Start the dev server at http://localhost:5001 |
| `make migrate m="..."` | Generate a migration after changing models |
| `make upgrade` | Apply pending migrations |
| `make downgrade` | Roll back the last migration |
| `make shell` | Open an interactive Flask shell |
| `make reset-db` | Downgrade to base and re-apply all migrations |
| `make docker-up` | Start containers in the background |
| `make docker-up-logs` | Start containers with log tailing |
| `make docker-down` | Stop containers |
| `make docker-build` | Rebuild the Docker image |
| `make db-dump url="..."` | Dump a database to `backup.sql` |
| `make db-restore` | Restore `backup.sql` into local Postgres |

Run `make help` to see all available commands.

## Syncing prod data locally

```bash
# Pull production database into a local file
make db-dump url="postgres://user:pass@host:5432/dbname"

# Load it into your local Postgres
make db-restore
```

## Deploy to Railway

1. Push this repo to GitHub
2. Go to [railway.app](https://railway.app) and sign in with GitHub
3. Click **New Project → Deploy from GitHub Repo** and select this repo
4. Add a **Postgres** service: click **New → Database → PostgreSQL**
5. Railway auto-sets `DATABASE_URL` — the app picks it up automatically
6. The first deploy runs migrations via the Dockerfile CMD
7. Go to **Settings → Networking → Generate Domain** to get your public URL

That's it! Every `git push` auto-deploys. Railway's Postgres includes daily backups with 7-day retention.
