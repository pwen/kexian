# Climbing Tracker

A personal app to track climbing projects, log sessions, and celebrate sends.

Built with **Flask**, **SQLAlchemy**, **PostgreSQL**, and **Flask-Migrate**.

## Prerequisites

- Python 3.10+
- [uv](https://docs.astral.sh/uv/) (recommended) or pip
- [Docker](https://docs.docker.com/get-docker/) (for running PostgreSQL locally)

## Setup

```bash
git clone <your-repo-url>
cd kexian

# Start local Postgres
make docker-up      # or: docker compose up -d db

# Install deps & run migrations
make setup
```

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
