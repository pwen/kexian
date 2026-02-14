from datetime import datetime
from models import db


class Location(db.Model):
    __tablename__ = "locations"

    id = db.Column(db.Integer, primary_key=True)
    country_code = db.Column(db.String(2), nullable=False)      # ISO 3166-1 alpha-2, e.g. "US"
    country_name = db.Column(db.String, nullable=False)          # e.g. "United States"
    state_code = db.Column(db.String(6), default="")             # ISO 3166-2, e.g. "US-CA"
    state_name = db.Column(db.String, default="")                # e.g. "California"
    area = db.Column(db.String, nullable=False)                  # e.g. "Bishop", "Rocklands"
    crag = db.Column(db.String, default="")                      # e.g. "Buttermilks" (optional)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    projects = db.relationship("Project", backref="location", lazy=True)

    def to_dict(self):
        return {
            "id": self.id,
            "country_code": self.country_code,
            "country_name": self.country_name,
            "state_code": self.state_code,
            "state_name": self.state_name,
            "area": self.area,
            "crag": self.crag,
        }

    def display_name(self):
        """Human-readable label, e.g. 'Buttermilks, Bishop, California, US'."""
        parts = [self.crag, self.area, self.state_name, self.country_name]
        return ", ".join(p for p in parts if p)
