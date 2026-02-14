import re
from flask import Blueprint, request, jsonify
from flask_login import login_user, logout_user, login_required, current_user
from models import db, User

bp = Blueprint("auth", __name__, url_prefix="/api/auth")

USERNAME_RE = re.compile(r"^[a-zA-Z0-9_-]{3,30}$")


@bp.route("/signup", methods=["POST"])
def signup():
    data = request.get_json(force=True)
    username = (data.get("username") or "").strip().lower()
    password = data.get("password", "")
    if not USERNAME_RE.match(username):
        return jsonify({"error": "Username must be 3-30 chars (letters, numbers, _ -)"}), 400
    if len(password) < 6:
        return jsonify({"error": "Password must be at least 6 characters"}), 400
    if User.query.filter_by(username=username).first():
        return jsonify({"error": "Username already taken"}), 409
    user = User(username=username)
    user.set_password(password)
    if data.get("height_cm") is not None:
        user.height_cm = float(data["height_cm"])
    if data.get("reach_cm") is not None:
        user.reach_cm = float(data["reach_cm"])
    db.session.add(user)
    db.session.commit()
    login_user(user, remember=True)
    return jsonify(user.to_dict()), 201


@bp.route("/login", methods=["POST"])
def login():
    data = request.get_json(force=True)
    username = (data.get("username") or "").strip().lower()
    password = data.get("password", "")
    remember = data.get("remember", True)
    user = User.query.filter_by(username=username).first()
    if not user or not user.check_password(password):
        return jsonify({"error": "Invalid username or password"}), 401
    login_user(user, remember=remember)
    return jsonify(user.to_dict())


@bp.route("/logout", methods=["POST"])
def logout():
    logout_user()
    return jsonify({"ok": True})


@bp.route("/me", methods=["GET"])
def me():
    if current_user.is_authenticated:
        return jsonify(current_user.to_dict())
    return jsonify(None)


@bp.route("/profile", methods=["PUT"])
@login_required
def update_profile():
    data = request.get_json(force=True)
    if "height_cm" in data:
        current_user.height_cm = float(data["height_cm"]) if data["height_cm"] else None
    if "reach_cm" in data:
        current_user.reach_cm = float(data["reach_cm"]) if data["reach_cm"] else None
    db.session.commit()
    return jsonify(current_user.to_dict())
