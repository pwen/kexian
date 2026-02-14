import os
import sqlite3
from datetime import datetime
from flask import Flask, render_template, request, jsonify, g

app = Flask(__name__)
DATABASE = os.path.join(os.path.dirname(__file__), "climbing.db")


# ---------------------------------------------------------------------------
# Database helpers
# ---------------------------------------------------------------------------

def get_db():
    """Open a new database connection per-request."""
    if "db" not in g:
        g.db = sqlite3.connect(DATABASE)
        g.db.row_factory = sqlite3.Row
        g.db.execute("PRAGMA foreign_keys = ON")
    return g.db


@app.teardown_appcontext
def close_db(exc):
    db = g.pop("db", None)
    if db is not None:
        db.close()


def init_db():
    """Create tables if they don't exist."""
    db = get_db()
    db.executescript(
        """
        CREATE TABLE IF NOT EXISTS routes (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            name        TEXT    NOT NULL,
            grade       TEXT    NOT NULL,
            location    TEXT,
            style       TEXT    CHECK(style IN ('boulder', 'sport', 'trad')) DEFAULT 'boulder',
            status      TEXT    CHECK(status IN ('project', 'sent', 'abandoned')) DEFAULT 'project',
            notes       TEXT,
            created_at  TEXT    DEFAULT (datetime('now')),
            sent_at     TEXT
        );

        CREATE TABLE IF NOT EXISTS attempts (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            route_id    INTEGER NOT NULL,
            date        TEXT    NOT NULL DEFAULT (date('now')),
            result      TEXT    CHECK(result IN ('send', 'fall', 'progress', 'flash', 'onsight')) DEFAULT 'fall',
            notes       TEXT,
            FOREIGN KEY (route_id) REFERENCES routes(id) ON DELETE CASCADE
        );
        """
    )
    db.commit()


with app.app_context():
    init_db()


# ---------------------------------------------------------------------------
# Pages
# ---------------------------------------------------------------------------

@app.route("/")
def index():
    return render_template("index.html")


# ---------------------------------------------------------------------------
# API – Routes (climbing routes / projects)
# ---------------------------------------------------------------------------

@app.route("/api/routes", methods=["GET"])
def list_routes():
    db = get_db()
    status = request.args.get("status")
    if status:
        rows = db.execute(
            "SELECT * FROM routes WHERE status = ? ORDER BY created_at DESC", (status,)
        ).fetchall()
    else:
        rows = db.execute("SELECT * FROM routes ORDER BY created_at DESC").fetchall()
    return jsonify([dict(r) for r in rows])


@app.route("/api/routes", methods=["POST"])
def create_route():
    data = request.get_json(force=True)
    db = get_db()
    cur = db.execute(
        """INSERT INTO routes (name, grade, location, style, status, notes)
           VALUES (?, ?, ?, ?, ?, ?)""",
        (
            data["name"],
            data["grade"],
            data.get("location", ""),
            data.get("style", "boulder"),
            data.get("status", "project"),
            data.get("notes", ""),
        ),
    )
    db.commit()
    route = db.execute("SELECT * FROM routes WHERE id = ?", (cur.lastrowid,)).fetchone()
    return jsonify(dict(route)), 201


@app.route("/api/routes/<int:route_id>", methods=["PUT"])
def update_route(route_id):
    data = request.get_json(force=True)
    db = get_db()
    fields = []
    values = []
    for col in ("name", "grade", "location", "style", "status", "notes", "sent_at"):
        if col in data:
            fields.append(f"{col} = ?")
            values.append(data[col])
    if not fields:
        return jsonify({"error": "No fields to update"}), 400
    values.append(route_id)
    db.execute(f"UPDATE routes SET {', '.join(fields)} WHERE id = ?", values)
    db.commit()
    route = db.execute("SELECT * FROM routes WHERE id = ?", (route_id,)).fetchone()
    if route is None:
        return jsonify({"error": "Route not found"}), 404
    return jsonify(dict(route))


@app.route("/api/routes/<int:route_id>", methods=["DELETE"])
def delete_route(route_id):
    db = get_db()
    db.execute("DELETE FROM routes WHERE id = ?", (route_id,))
    db.commit()
    return "", 204


# ---------------------------------------------------------------------------
# API – Attempts
# ---------------------------------------------------------------------------

@app.route("/api/routes/<int:route_id>/attempts", methods=["GET"])
def list_attempts(route_id):
    db = get_db()
    rows = db.execute(
        "SELECT * FROM attempts WHERE route_id = ? ORDER BY date DESC", (route_id,)
    ).fetchall()
    return jsonify([dict(r) for r in rows])


@app.route("/api/routes/<int:route_id>/attempts", methods=["POST"])
def create_attempt(route_id):
    data = request.get_json(force=True)
    db = get_db()
    result = data.get("result", "fall")
    cur = db.execute(
        "INSERT INTO attempts (route_id, date, result, notes) VALUES (?, ?, ?, ?)",
        (route_id, data.get("date", datetime.now().strftime("%Y-%m-%d")), result, data.get("notes", "")),
    )
    # Auto-mark route as sent on send/flash/onsight
    if result in ("send", "flash", "onsight"):
        db.execute(
            "UPDATE routes SET status = 'sent', sent_at = ? WHERE id = ? AND status != 'sent'",
            (data.get("date", datetime.now().strftime("%Y-%m-%d")), route_id),
        )
    db.commit()
    attempt = db.execute("SELECT * FROM attempts WHERE id = ?", (cur.lastrowid,)).fetchone()
    return jsonify(dict(attempt)), 201


@app.route("/api/attempts/<int:attempt_id>", methods=["DELETE"])
def delete_attempt(attempt_id):
    db = get_db()
    db.execute("DELETE FROM attempts WHERE id = ?", (attempt_id,))
    db.commit()
    return "", 204


# ---------------------------------------------------------------------------

if __name__ == "__main__":
    app.run(debug=True, port=5001)
