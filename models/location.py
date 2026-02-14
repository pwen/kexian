from datetime import datetime
from models import db


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
