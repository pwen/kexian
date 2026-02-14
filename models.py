from flask_sqlalchemy import SQLAlchemy
from datetime import datetime, date

db = SQLAlchemy()


# ---------------------------------------------------------------------------
# Enum-like constants (stored as integers in the DB)
# ---------------------------------------------------------------------------

PROJECT_STATUS = {
    0: "To Try",
    1: "Projecting",
    2: "On Hold",
    3: "Sent",
}

PROJECT_TYPE = {
    0: "Sport",
    1: "Boulder",
    2: "Trad",
}


# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------

class Location(db.Model):
    __tablename__ = "locations"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String, nullable=False)
    area = db.Column(db.String, default="")       # e.g. "Buttermilks"
    region = db.Column(db.String, default="")      # e.g. "Bishop, CA"
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    projects = db.relationship("Project", backref="location", lazy=True)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "area": self.area,
            "region": self.region,
        }


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
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


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
