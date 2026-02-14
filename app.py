import os
from datetime import date
import pycountry
from flask import Flask, render_template, request, jsonify, redirect
from flask_migrate import Migrate
from models import db, Project, Session, Location, PROJECT_STATUS, PROJECT_TYPE
from models.session import STYLE_FLASH, STYLE_SEND
from datetime import timedelta


def sync_project_status(project_id):
    """Recalculate project status based on its sessions (ignoring planned)."""
    project = db.session.get(Project, project_id)
    if not project:
        return
    real_sessions = [s for s in project.sessions if not s.planned]
    if not real_sessions:
        project.status = 0  # To Try
    elif any(s.style in (STYLE_FLASH, STYLE_SEND) for s in real_sessions):
        project.status = 3  # Sent
    elif project.last_session.date < date.today() - timedelta(days=180):
        project.status = 2  # On Hold
    else:
        project.status = 1  # Projecting
    db.session.commit()

app = Flask(__name__)

# Railway uses postgres:// but SQLAlchemy needs postgresql://
_db_url = os.environ.get(
    "DATABASE_URL",
    "postgresql://kexian:kexian@localhost:5432/kexian",
)
if _db_url.startswith("postgres://"):
    _db_url = _db_url.replace("postgres://", "postgresql://", 1)

app.config["SQLALCHEMY_DATABASE_URI"] = _db_url
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

db.init_app(app)
migrate = Migrate(app, db)


# ---------------------------------------------------------------------------
# Pages
# ---------------------------------------------------------------------------

@app.route("/")
def index():
    return redirect("/projects")


@app.route("/projects")
@app.route("/ascents")
def spa_page():
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
    locations = Location.query.order_by(Location.country_name, Location.state_name, Location.area).all()
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
    climb_type = request.args.get("type", type=int)
    date_filter = request.args.get("date", type=str)  # "ytd", or a 4-digit year
    query = Project.query.order_by(Project.created_at.desc())
    if status is not None:
        query = query.filter_by(status=status)
    if climb_type is not None:
        query = query.filter_by(type=climb_type)
    if date_filter:
        if date_filter == "ytd":
            start = date(date.today().year, 1, 1)
            query = query.filter(
                Project.sessions.any((Session.date >= start) & (Session.planned == False))
            )
        elif date_filter.isdigit() and len(date_filter) == 4:
            year = int(date_filter)
            start = date(year, 1, 1)
            end = date(year, 12, 31)
            query = query.filter(
                Project.sessions.any(
                    (Session.date >= start) & (Session.date <= end) & (Session.planned == False)
                )
            )
    return jsonify([p.to_dict() for p in query.all()])


@app.route("/api/session-years", methods=["GET"])
def session_years():
    """Return distinct years that have non-planned sessions."""
    rows = (
        db.session.query(db.func.extract("year", Session.date))
        .filter(Session.planned == False)
        .distinct()
        .all()
    )
    years = sorted([int(r[0]) for r in rows], reverse=True)
    return jsonify(years)


VALID_BOULDER_GRADES = {f"V{i}" for i in range(11)}  # V0–V10
VALID_ROPE_GRADES = {
    f"5.{num}{letter}"
    for num in range(11, 14)
    for letter in "abcd"
}  # 5.11a–5.13d


def validate_grade(grade, climb_type):
    """Return an error string if the grade is invalid, else None."""
    if not grade or not grade.strip():
        return "Grade is required."
    if climb_type == 1 and grade not in VALID_BOULDER_GRADES:
        return f"Invalid boulder grade '{grade}'. Must be V0–V10."
    if climb_type in (0, 2) and grade not in VALID_ROPE_GRADES:
        return f"Invalid grade '{grade}'. Must be 5.11a–5.13d."
    return None


@app.route("/api/projects", methods=["POST"])
def create_project():
    data = request.get_json(force=True)
    err = validate_grade(data.get("grade", ""), data.get("type", 1))
    if err:
        return jsonify({"error": err}), 400
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
    err = validate_grade(
        data.get("grade", project.grade),
        data.get("type", project.type),
    )
    if err:
        return jsonify({"error": err}), 400
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
    is_planned = data.get("planned", session_date > date.today())
    s = Session(
        project_id=project_id,
        date=session_date,
        style=int(data.get("style", 0)),
        planned=bool(is_planned),
        notes=data.get("notes", ""),
    )
    db.session.add(s)
    db.session.commit()
    sync_project_status(project_id)
    return jsonify(s.to_dict()), 201


@app.route("/api/sessions/<int:session_id>", methods=["PUT"])
def update_session(session_id):
    s = db.session.get(Session, session_id)
    if s is None:
        return jsonify({"error": "Session not found"}), 404
    data = request.get_json(force=True)
    if "date" in data:
        s.date = date.fromisoformat(data["date"])
    if "style" in data:
        s.style = int(data["style"])
    if "planned" in data:
        s.planned = bool(data["planned"])
    if "notes" in data:
        s.notes = data["notes"]
    db.session.commit()
    sync_project_status(s.project_id)
    return jsonify(s.to_dict())


@app.route("/api/sessions/<int:session_id>", methods=["DELETE"])
def delete_session(session_id):
    s = db.session.get(Session, session_id)
    if s:
        project_id = s.project_id
        db.session.delete(s)
        db.session.commit()
        sync_project_status(project_id)
    return "", 204


# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import glob
    extra_files = glob.glob("templates/**", recursive=True) + glob.glob("static/**", recursive=True)
    app.run(debug=True, port=5001, extra_files=extra_files)
