import os
from datetime import timedelta
from flask import Flask, jsonify
from flask_migrate import Migrate
from flask_login import LoginManager
from models import db, User
from routes import register_blueprints

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
app.config["SECRET_KEY"] = os.environ.get("SECRET_KEY", "dev-secret-key-change-me")
app.config["REMEMBER_COOKIE_DURATION"] = timedelta(days=30)

db.init_app(app)
migrate = Migrate(app, db)

# Flask-Login setup
login_manager = LoginManager()
login_manager.init_app(app)


@login_manager.user_loader
def load_user(user_id):
    return db.session.get(User, int(user_id))


@login_manager.unauthorized_handler
def unauthorized():
    return jsonify({"error": "Login required"}), 401


# Register route blueprints
register_blueprints(app)


# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import glob
    extra_files = glob.glob("templates/**", recursive=True) + glob.glob("static/**", recursive=True)
    app.run(debug=True, port=5001, extra_files=extra_files)
