from datetime import date
from flask import Blueprint, request, jsonify
from models import db, Project, Session, PROJECT_STATUS, PROJECT_TYPE
from models.session import STYLE_FLASH, STYLE_SEND
from datetime import timedelta
from routes import _get_user_or_404, _require_owner

bp = Blueprint("projects", __name__)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

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


# ---------------------------------------------------------------------------
# API – Enums
# ---------------------------------------------------------------------------

@bp.route("/api/enums", methods=["GET"])
def get_enums():
    return jsonify({"statuses": PROJECT_STATUS, "types": PROJECT_TYPE})


# ---------------------------------------------------------------------------
# API – Projects
# ---------------------------------------------------------------------------

@bp.route("/api/<username>/projects", methods=["GET"])
def list_projects(username):
    user, err = _get_user_or_404(username)
    if err:
        return err
    status_param = request.args.get("status", type=str)
    climb_type = request.args.get("type", type=int)
    date_filter = request.args.get("date", type=str)
    query = Project.query.filter_by(user_id=user.id).order_by(Project.created_at.desc())
    if status_param:
        statuses = [int(s) for s in status_param.split(",") if s.isdigit()]
        if statuses:
            query = query.filter(Project.status.in_(statuses))
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


@bp.route("/api/<username>/session-years", methods=["GET"])
def session_years(username):
    """Return distinct years that have non-planned sessions for this user."""
    user, err = _get_user_or_404(username)
    if err:
        return err
    rows = (
        db.session.query(db.func.extract("year", Session.date))
        .join(Project, Session.project_id == Project.id)
        .filter(Project.user_id == user.id, Session.planned == False)
        .distinct()
        .all()
    )
    years = sorted([int(r[0]) for r in rows], reverse=True)
    return jsonify(years)


@bp.route("/api/<username>/projects", methods=["POST"])
def create_project(username):
    owner, err = _require_owner(username)
    if err:
        return err
    data = request.get_json(force=True)
    err_msg = validate_grade(data.get("grade", ""), data.get("type", 1))
    if err_msg:
        return jsonify({"error": err_msg}), 400
    project = Project(
        user_id=owner.id,
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


@bp.route("/api/<username>/projects/<int:project_id>", methods=["PUT"])
def update_project(username, project_id):
    owner, err = _require_owner(username)
    if err:
        return err
    project = db.session.get(Project, project_id)
    if project is None or project.user_id != owner.id:
        return jsonify({"error": "Project not found"}), 404
    data = request.get_json(force=True)
    err_msg = validate_grade(
        data.get("grade", project.grade),
        data.get("type", project.type),
    )
    if err_msg:
        return jsonify({"error": err_msg}), 400
    for col in ("name", "grade", "type", "status", "pitches", "length", "location_id", "notes"):
        if col in data:
            setattr(project, col, data[col])
    db.session.commit()
    return jsonify(project.to_dict())


@bp.route("/api/<username>/projects/<int:project_id>", methods=["DELETE"])
def delete_project(username, project_id):
    owner, err = _require_owner(username)
    if err:
        return err
    project = db.session.get(Project, project_id)
    if project and project.user_id == owner.id:
        db.session.delete(project)
        db.session.commit()
    return "", 204
