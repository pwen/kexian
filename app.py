import os
from datetime import date
from flask import Flask, render_template, request, jsonify
from flask_migrate import Migrate
from models import db, Project, Session, Location, PROJECT_STATUS, PROJECT_TYPE

app = Flask(__name__)
app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///" + os.path.join(
    os.path.dirname(__file__), "climbing.db"
)
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

db.init_app(app)
migrate = Migrate(app, db)


# ---------------------------------------------------------------------------
# Pages
# ---------------------------------------------------------------------------

@app.route("/")
def index():
    return render_template("index.html")


# ---------------------------------------------------------------------------
# API – Enums (for populating dropdowns)
# ---------------------------------------------------------------------------

@app.route("/api/enums", methods=["GET"])
def get_enums():
    return jsonify({"statuses": PROJECT_STATUS, "types": PROJECT_TYPE})


# ---------------------------------------------------------------------------
# API – Locations
# ---------------------------------------------------------------------------

@app.route("/api/locations", methods=["GET"])
def list_locations():
    locations = Location.query.order_by(Location.name).all()
    return jsonify([l.to_dict() for l in locations])


@app.route("/api/locations", methods=["POST"])
def create_location():
    data = request.get_json(force=True)
    loc = Location(
        name=data["name"],
        area=data.get("area", ""),
        region=data.get("region", ""),
    )
    db.session.add(loc)
    db.session.commit()
    return jsonify(loc.to_dict()), 201


# ---------------------------------------------------------------------------
# API – Projects
# ---------------------------------------------------------------------------

@app.route("/api/projects", methods=["GET"])
def list_projects():
    status = request.args.get("status", type=int)
    query = Project.query.order_by(Project.created_at.desc())
    if status is not None:
        query = query.filter_by(status=status)
    return jsonify([p.to_dict() for p in query.all()])


@app.route("/api/projects", methods=["POST"])
def create_project():
    data = request.get_json(force=True)
    project = Project(
        name=data["name"],
        grade=data["grade"],
        type=data.get("type", 1),
        status=data.get("status", 0),
        pitches=data.get("pitches"),
        length=data.get("length"),
        location_id=data.get("location_id"),
        notes=data.get("notes", ""),
    )
    db.session.add(project)
    db.session.commit()
    return jsonify(project.to_dict()), 201


@app.route("/api/projects/<int:project_id>", methods=["PUT"])
def update_project(project_id):
    project = db.session.get(Project, project_id)
    if project is None:
        return jsonify({"error": "Project not found"}), 404
    data = request.get_json(force=True)
    for col in ("name", "grade", "type", "status", "pitches", "length", "location_id", "notes"):
        if col in data:
            setattr(project, col, data[col])
    db.session.commit()
    return jsonify(project.to_dict())


@app.route("/api/projects/<int:project_id>", methods=["DELETE"])
def delete_project(project_id):
    project = db.session.get(Project, project_id)
    if project:
        db.session.delete(project)
        db.session.commit()
    return "", 204


# ---------------------------------------------------------------------------
# API – Sessions
# ---------------------------------------------------------------------------

@app.route("/api/projects/<int:project_id>/sessions", methods=["GET"])
def list_sessions(project_id):
    sessions = (
        Session.query.filter_by(project_id=project_id)
        .order_by(Session.date.desc())
        .all()
    )
    return jsonify([s.to_dict() for s in sessions])


@app.route("/api/projects/<int:project_id>/sessions", methods=["POST"])
def create_session(project_id):
    data = request.get_json(force=True)
    session_date = date.fromisoformat(data["date"]) if "date" in data else date.today()
    s = Session(
        project_id=project_id,
        date=session_date,
        notes=data.get("notes", ""),
    )
    db.session.add(s)
    db.session.commit()
    return jsonify(s.to_dict()), 201


@app.route("/api/sessions/<int:session_id>", methods=["DELETE"])
def delete_session(session_id):
    s = db.session.get(Session, session_id)
    if s:
        db.session.delete(s)
        db.session.commit()
    return "", 204


# ---------------------------------------------------------------------------

if __name__ == "__main__":
    app.run(debug=True, port=5001)
