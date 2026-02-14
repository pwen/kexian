"""
Lightweight SQL migration runner for SQLite.

Migrations live in the `migrations/` folder as numbered .sql files:
    001_initial.sql
    002_add_rating.sql
    ...

Applied migrations are tracked in a `schema_migrations` table.
On app startup, any unapplied migrations are run in order.
"""

import os
import sqlite3


MIGRATIONS_DIR = os.path.join(os.path.dirname(__file__), "migrations")


def ensure_migration_table(db: sqlite3.Connection):
    """Create the tracking table if it doesn't exist."""
    db.execute(
        """
        CREATE TABLE IF NOT EXISTS schema_migrations (
            version TEXT PRIMARY KEY,
            applied_at TEXT DEFAULT (datetime('now'))
        )
        """
    )
    db.commit()


def applied_versions(db: sqlite3.Connection) -> set[str]:
    """Return the set of already-applied migration versions."""
    rows = db.execute("SELECT version FROM schema_migrations").fetchall()
    return {r[0] if isinstance(r, tuple) else r["version"] for r in rows}


def pending_migrations(db: sqlite3.Connection) -> list[tuple[str, str]]:
    """Return (version, filepath) pairs for migrations not yet applied, sorted."""
    applied = applied_versions(db)
    migrations = []
    for filename in sorted(os.listdir(MIGRATIONS_DIR)):
        if not filename.endswith(".sql"):
            continue
        version = filename.removesuffix(".sql")
        if version not in applied:
            migrations.append((version, os.path.join(MIGRATIONS_DIR, filename)))
    return migrations


def run_migrations(db: sqlite3.Connection):
    """Apply all pending migrations in order."""
    ensure_migration_table(db)
    pending = pending_migrations(db)
    if not pending:
        return
    for version, filepath in pending:
        print(f"  Applying migration: {version}")
        with open(filepath) as f:
            sql = f.read()
        db.executescript(sql)
        db.execute("INSERT INTO schema_migrations (version) VALUES (?)", (version,))
        db.commit()
    print(f"  {len(pending)} migration(s) applied.")
