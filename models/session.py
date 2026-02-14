from datetime import date
from models import db


class Session(db.Model):
    __tablename__ = "sessions"

    id = db.Column(db.Integer, primary_key=True)
    project_id = db.Column(db.Integer, db.ForeignKey("projects.id"), nullable=False)
    date = db.Column(db.Date, nullable=False, default=date.today)
    notes = db.Column(db.Text, default="")

    def to_dict(self):
        return {
            "id": self.id,
            "project_id": self.project_id,
            "date": self.date.isoformat() if self.date else None,
            "notes": self.notes,
        }
