# Climbing Tracker

A personal app to track climbing projects, log sessions, and celebrate sends.

Built with **Flask**, **SQLAlchemy**, **SQLite**, and **Flask-Migrate**.

## Prerequisites

- Python 3.10+
- [uv](https://docs.astral.sh/uv/) (recommended) or pip

## Setup

```bash
git clone <your-repo-url>
cd kexian
make setup
```

## Usage

```bash
make run        # Start the dev server at http://localhost:5001
make migrate    # Generate a migration after changing models
make upgrade    # Apply pending migrations
make downgrade  # Roll back the last migration
make shell      # Open an interactive Flask shell
make reset-db   # Wipe the database and re-apply all migrations
```

Run `make help` to see all available commands.
