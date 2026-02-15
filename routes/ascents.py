from datetime import date
from flask import Blueprint, request, jsonify
from models import db, Project, Session
from models.session import STYLE_FLASH, STYLE_SEND
from routes import _get_user_or_404

bp = Blueprint("ascents", __name__)


def _build_session_query(user, sends_only=False):
    """Build a base query for non-planned sessions joined with project + location."""
    q = (
        db.session.query(Session, Project)
        .join(Project, Session.project_id == Project.id)
        .filter(Project.user_id == user.id, Session.planned == False)  # noqa: E712
    )
    if sends_only:
        q = q.filter(Session.style.in_([STYLE_FLASH, STYLE_SEND]))

    # Year / YTD filtering
    year = request.args.get("year")
    ytd = request.args.get("ytd")
    if ytd == "1":
        q = q.filter(
            Session.date >= date(date.today().year, 1, 1),
            Session.date <= date.today(),
        )
    elif year:
        try:
            y = int(year)
            q = q.filter(
                Session.date >= date(y, 1, 1),
                Session.date <= date(y, 12, 31),
            )
        except ValueError:
            pass

    return q.order_by(Session.date.desc())


def _session_to_dict(session, project):
    """Serialize a session + project pair for API response."""
    loc = project.location
    return {
        "date": session.date.isoformat() if session.date else None,
        "style": session.style,
        "style_label": {0: "Attempt", 1: "Flash", 2: "Send"}.get(session.style, "Attempt"),
        "project_name": project.name,
        "grade": project.grade,
        "type": project.type,
        "type_label": {0: "Sport", 1: "Boulder", 2: "Trad"}.get(project.type, "Unknown"),
        "location": {
            "crag": loc.crag if loc else "",
            "state_name": loc.state_name if loc else "",
        } if loc else None,
        "notes": session.notes or "",
    }


@bp.route("/api/<username>/ascents", methods=["GET"])
def get_ascents(username):
    """Return sends/flashes with project info, filtered by year."""
    user, err = _get_user_or_404(username)
    if err:
        return err
    rows = _build_session_query(user, sends_only=True).all()
    return jsonify([_session_to_dict(s, p) for s, p in rows])


@bp.route("/api/<username>/stream", methods=["GET"])
def get_stream(username):
    """Return all non-planned sessions with project info, filtered by year."""
    user, err = _get_user_or_404(username)
    if err:
        return err
    rows = _build_session_query(user, sends_only=False).all()
    return jsonify([_session_to_dict(s, p) for s, p in rows])
