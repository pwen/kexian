import pycountry
from flask import Blueprint, request, jsonify
from models import db, Location

bp = Blueprint("locations", __name__)


# ---------------------------------------------------------------------------
# Countries & Subdivisions (from pycountry / ISO 3166)
# ---------------------------------------------------------------------------

@bp.route("/api/countries", methods=["GET"])
def list_countries():
    countries = sorted(pycountry.countries, key=lambda c: c.name)
    return jsonify([{"code": c.alpha_2, "name": c.name} for c in countries])


@bp.route("/api/countries/<country_code>/subdivisions", methods=["GET"])
def list_subdivisions(country_code):
    subs = pycountry.subdivisions.get(country_code=country_code.upper())
    if subs is None:
        return jsonify([])
    result = sorted(
        [{"code": s.code, "name": s.name, "type": s.type} for s in subs],
        key=lambda s: s["name"],
    )
    return jsonify(result)


# ---------------------------------------------------------------------------
# Locations
# ---------------------------------------------------------------------------

@bp.route("/api/locations", methods=["GET"])
def list_locations():
    locations = Location.query.order_by(
        Location.country_name, Location.state_name, Location.area
    ).all()
    return jsonify([{**l.to_dict(), "display_name": l.display_name()} for l in locations])


@bp.route("/api/locations", methods=["POST"])
def create_location():
    data = request.get_json(force=True)
    country = pycountry.countries.get(alpha_2=data["country_code"])
    if not country:
        return jsonify({"error": "Invalid country code"}), 400
    state_name = ""
    state_code = data.get("state_code", "")
    if state_code:
        sub = pycountry.subdivisions.get(code=state_code)
        if not sub:
            return jsonify({"error": "Invalid subdivision code"}), 400
        state_name = sub.name
    loc = Location(
        country_code=country.alpha_2,
        country_name=country.name,
        state_code=state_code,
        state_name=state_name,
        area=data["area"],
        crag=data.get("crag", ""),
    )
    db.session.add(loc)
    db.session.commit()
    return jsonify({**loc.to_dict(), "display_name": loc.display_name()}), 201
