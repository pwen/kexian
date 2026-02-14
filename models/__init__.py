from flask_sqlalchemy import SQLAlchemy

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

# Import models so they are registered with SQLAlchemy when the package loads
from models.location import Location  # noqa: E402, F401
from models.project import Project    # noqa: E402, F401
from models.session import Session    # noqa: E402, F401
from models.user import User          # noqa: E402, F401
