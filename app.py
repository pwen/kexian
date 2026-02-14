import os
from datetime import date
import pycountry
from flask import Flask, render_template, request, jsonify
from flask_migrate import Migrate
from models import db, Project, Session, Location, PROJECT_STATUS, PROJECT_TYPE

app = Flask(__name__)
app.config["SQLALCHEMY_DATABASE_URI"] = os.environ.get(
    "DATABASE_URL",
    "postgresql://kexian:kexian@localhost:5432/kexian",
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
# API – Countries & Subdivisions (from pycountry / ISO 3166)
# ---------------------------------------------------------------------------

@app.route("/api/countries", methods=["GET"])
def list_countries():
    countries = sorted(pycountry.countries, key=lambda c: c.name)
    return jsonify([{"code": c.alpha_2, "name": c.name} for c in countries])


@app.route("/api/countries/<country_code>/subdivisions", methods=["GET"])
def list_subdivisions(country_code):
    subs = pycountry.subdivisions.get(country_code=country_code.upper())
    if subs is None:
        return jsonify([])
    result = sorted(
        [{"code": s.code, "name": s.name, "type": s.type} for s in subs],
        key=lambda s: s["name"],
    )
    return jsonify(result)


# ---------------------------------------------------------------------------
# API – Locations
# ---------------------------------------------------------------------------

@app.route("/api/locations", methods=["GET"])
def list_locations():
    locations = Location.query.order_by(Location.country, Location.state, Location.area).all()
    return jsonify([{**l.to_dict(), "display_name": l.display_name()} for l in locations])


@app.route("/api/locations", methods=["POST"])
def create_location():
    data = request.get_json(force=True)
    # Validate country code
    country = pycountry.countries.get(alpha_2=data["country_code"])
    if not country:
        return jsonify({"error": "Invalid country code"}), 400
    # Validate subdivision code if provided
    state_name = ""
    state_code = data.get("state_code", "")
    if state_code:
        sub = pycountry.subdivisions.get(code=state_code)
        if not sub:
            return jsonify({"error": "Invalid subdivision code"}), 400
        state_name = sub.name
    loc = Location(
        country_code=country.alpha_2,
        country_name=country.name,
        state_code=state_code,
        state_name=state_name,
        area=data["area"],
        crag=data.get("crag", ""),
    )
    db.session.add(loc)
    db.session.commit()
    return jsonify({**loc.to_dict(), "display_name": loc.display_name()}), 201


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
    import glob
    extra_files = glob.glob("templates/**", recursive=True) + glob.glob("static/**", recursive=True)
    app.run(debug=True, port=5001, extra_files=extra_files)
