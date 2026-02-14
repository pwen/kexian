from flask import Blueprint, render_template, redirect, jsonify
from flask_login import current_user
from models import User

bp = Blueprint("pages", __name__)


@bp.route("/health")
def health():
    return jsonify({"status": "ok"})


@bp.route("/")
def index():
    if current_user.is_authenticated:
        return redirect(f"/{current_user.username}/projects")
    return render_template("index.html", profile_user=None)


@bp.route("/<username>/projects")
@bp.route("/<username>/ascents")
def spa_page(username):
    user = User.query.filter_by(username=username).first()
    if not user:
        return "User not found", 404
    return render_template("index.html", profile_user=user)
