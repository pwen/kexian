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

    @property
    def state_short(self):
        """Concise state label: 'CO' for US-CO, first word for long intl names."""
        if not self.state_name:
            return ""
        # US states – use the 2-letter abbreviation from state_code (e.g. US-CO → CO)
        if self.country_code == "US" and self.state_code and "-" in self.state_code:
            suffix = self.state_code.split("-", 1)[1]
            if suffix.isalpha() and len(suffix) <= 3:
                return suffix.upper()
        # International: first word of the state name (e.g. "Guangxi Zhuangzu Zizhiqu" → "Guangxi")
        first = self.state_name.split()[0]
        if first != self.state_name:
            return first
        return self.state_name

    def to_dict(self):
        return {
            "id": self.id,
            "country_code": self.country_code,
            "country_name": self.country_name,
            "state_code": self.state_code,
            "state_name": self.state_name,
            "state_short": self.state_short,
            "area": self.area,
            "crag": self.crag,
        }

    def display_name(self):
        """Human-readable label, e.g. 'Buttermilks, Bishop, California, US'."""
        parts = [self.crag, self.area, self.state_name, self.country_name]
        return ", ".join(p for p in parts if p)
