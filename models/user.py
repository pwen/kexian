from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash
from flask_login import UserMixin
from models import db

# DiceBear avatar styles (cute/fun ones)
AVATAR_STYLES = [
    "adventurer",
    "adventurer-neutral",
    "avataaars",
    "bottts",
    "lorelei",
    "micah",
    "miniavs",
    "open-peeps",
    "personas",
    "pixel-art",
]


class User(db.Model, UserMixin):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(30), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(256), nullable=False)
    height_cm = db.Column(db.Float, nullable=True)          # height in cm
    reach_cm = db.Column(db.Float, nullable=True)           # reach / ape index in cm
    avatar_style = db.Column(db.String(30), nullable=False, default="adventurer")
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    projects = db.relationship(
        "Project", backref="user", cascade="all, delete-orphan", lazy=True
    )

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    @property
    def avatar_url(self):
        """DiceBear avatar URL seeded by username."""
        return f"https://api.dicebear.com/9.x/{self.avatar_style}/svg?seed={self.username}"

    def to_dict(self):
        return {
            "id": self.id,
            "username": self.username,
            "height_cm": self.height_cm,
            "reach_cm": self.reach_cm,
            "avatar_style": self.avatar_style,
            "avatar_url": self.avatar_url,
        }
