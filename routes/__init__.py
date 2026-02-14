from flask import jsonify
from flask_login import current_user
from models import db, User


def _get_user_or_404(username):
    """Look up a user by username or return (None, error_response)."""
    user = User.query.filter_by(username=username).first()
    if not user:
        return None, (jsonify({"error": "User not found"}), 404)
    return user, None


def _require_owner(username):
    """Return (user, None) if current_user owns this profile, else (None, error)."""
    if not current_user.is_authenticated:
        return None, (jsonify({"error": "Login required"}), 401)
    user, err = _get_user_or_404(username)
    if err:
        return None, err
    if current_user.id != user.id:
        return None, (jsonify({"error": "Forbidden"}), 403)
    return user, None


def register_blueprints(app):
    """Import and register all route blueprints on the Flask app."""
    from routes.auth import bp as auth_bp
    from routes.pages import bp as pages_bp
    from routes.projects import bp as projects_bp
    from routes.sessions import bp as sessions_bp
    from routes.locations import bp as locations_bp

    app.register_blueprint(auth_bp)
    app.register_blueprint(pages_bp)
    app.register_blueprint(projects_bp)
    app.register_blueprint(sessions_bp)
    app.register_blueprint(locations_bp)
