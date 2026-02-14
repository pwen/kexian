from datetime import date
from flask import Blueprint, request, jsonify
from models import db, Project, Session
from routes import _require_owner
from routes.projects import sync_project_status

bp = Blueprint("sessions", __name__)


@bp.route("/api/<username>/projects/<int:project_id>/sessions", methods=["GET"])
def list_sessions(username, project_id):
    sessions = (
        Session.query.filter_by(project_id=project_id)
        .order_by(Session.date.desc())
        .all()
    )
    return jsonify([s.to_dict() for s in sessions])


@bp.route("/api/<username>/projects/<int:project_id>/sessions", methods=["POST"])
def create_session(username, project_id):
    owner, err = _require_owner(username)
    if err:
        return err
    project = db.session.get(Project, project_id)
    if not project or project.user_id != owner.id:
        return jsonify({"error": "Project not found"}), 404
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


@bp.route("/api/<username>/sessions/<int:session_id>", methods=["PUT"])
def update_session(username, session_id):
    owner, err = _require_owner(username)
    if err:
        return err
    s = db.session.get(Session, session_id)
    if s is None:
        return jsonify({"error": "Session not found"}), 404
    project = db.session.get(Project, s.project_id)
    if not project or project.user_id != owner.id:
        return jsonify({"error": "Forbidden"}), 403
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


@bp.route("/api/<username>/sessions/<int:session_id>", methods=["DELETE"])
def delete_session(username, session_id):
    owner, err = _require_owner(username)
    if err:
        return err
    s = db.session.get(Session, session_id)
    if s:
        project = db.session.get(Project, s.project_id)
        if project and project.user_id == owner.id:
            project_id = s.project_id
            db.session.delete(s)
            db.session.commit()
            sync_project_status(project_id)
    return "", 204
