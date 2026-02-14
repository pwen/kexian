from datetime import datetime
from models import db, PROJECT_STATUS, PROJECT_TYPE


class Project(db.Model):
    __tablename__ = "projects"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String, nullable=False)
    grade = db.Column(db.String, nullable=False)
    type = db.Column(db.Integer, nullable=False, default=1)       # 0=Sport, 1=Boulder, 2=Trad
    status = db.Column(db.Integer, nullable=False, default=0)     # 0=To Try, 1=Projecting, 2=On Hold, 3=Sent
    pitches = db.Column(db.Integer, nullable=True)                # only for sport/trad, >=1
    length = db.Column(db.String, nullable=True)                  # e.g. "30m", "100ft"
    location_id = db.Column(db.Integer, db.ForeignKey("locations.id"), nullable=True)
    notes = db.Column(db.Text, default="")
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    sessions = db.relationship(
        "Session", backref="project", cascade="all, delete-orphan", lazy=True
    )

    @property
    def last_session(self):
        """Return the most recent non-planned session by date, or None."""
        real = [s for s in self.sessions if not s.planned]
        if not real:
            return None
        return max(real, key=lambda s: s.date)

    @property
    def next_session(self):
        """Return the earliest planned session, or None."""
        planned = [s for s in self.sessions if s.planned]
        if not planned:
            return None
        return min(planned, key=lambda s: s.date)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "grade": self.grade,
            "type": self.type,
            "type_label": PROJECT_TYPE.get(self.type, "Unknown"),
            "status": self.status,
            "status_label": PROJECT_STATUS.get(self.status, "Unknown"),
            "pitches": self.pitches,
            "length": self.length,
            "location_id": self.location_id,
            "location": self.location.to_dict() if self.location else None,
            "notes": self.notes,
            "sessions": [s.to_dict() for s in sorted(self.sessions, key=lambda s: (s.planned, s.date), reverse=True)],
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
