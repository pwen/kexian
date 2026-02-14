from datetime import date
from models import db


# Style constants
STYLE_ATTEMPT = 0
STYLE_FLASH = 1
STYLE_SEND = 2

SESSION_STYLES = {STYLE_ATTEMPT: "Attempt", STYLE_FLASH: "Flash", STYLE_SEND: "Send"}


class Session(db.Model):
    __tablename__ = "sessions"

    id = db.Column(db.Integer, primary_key=True)
    project_id = db.Column(db.Integer, db.ForeignKey("projects.id"), nullable=False)
    date = db.Column(db.Date, nullable=False, default=date.today)
    style = db.Column(db.Integer, nullable=False, default=STYLE_ATTEMPT)
    notes = db.Column(db.Text, default="")

    def to_dict(self):
        return {
            "id": self.id,
            "project_id": self.project_id,
            "date": self.date.isoformat() if self.date else None,
            "style": self.style,
            "style_label": SESSION_STYLES.get(self.style, "Attempt"),
            "notes": self.notes,
        }
