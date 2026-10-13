"""The T Stops, and finding the nearest one to an event"""

import math
import settings

STOPS = [
    {"name": "Kenmore", "lat": 42.348949, "lng": -71.095169, "line": "GL", "area": "Fenway"},
    {"name": "Fenway", "lat": 42.345403, "lng": -71.104213, "line": "GL D", "area": "Fenway"},
    {"name": "Longwood", "lat": 42.341702, "lng": -71.109956, "line": "GL D", "area": "Fenway"},
    {"name": "Museum of Fine Arts", "lat": 42.337711, "lng": -71.095512, "line": "GL E", "area": "Fenway"},
    {"name": "Northeastern University", "lat": 42.340401, "lng": -71.088806, "line": "GL E", "area": "Fenway"},
    {"name": "Symphony", "lat": 42.342687, "lng": -71.085056, "line": "GL E", "area": "Fenway"},
    {"name": "Massachusetts Avenue", "lat": 42.341512, "lng": -71.083423, "line": "OL", "area": "Fenway"},
    {"name": "Ruggles", "lat": 42.336377, "lng": -71.088961, "line": "OL", "area": "Fenway"},
    {"name": "Park Street", "lat": 42.3563946, "lng": -71.0624242, "line": "RL", "area": "Downtown"},
    {"name": "Downtown Crossing", "lat": 42.355518, "lng": -71.060225, "line": "OL", "area": "Downtown"},
    {"name": "State", "lat": 42.358978, "lng": -71.057598, "line": "OL", "area": "Downtown"},
    {"name": "Government Center", "lat": 42.359705, "lng": -71.059215, "line": "BL", "area": "Downtown"},
    {"name": "Boylston", "lat": 42.35302, "lng": -71.06459, "line": "GL", "area": "Downtown"},
    {"name": "Chinatown", "lat": 42.352547, "lng": -71.062752, "line": "OL", "area": "Chinatown"},
    {"name": "Tufts Medical Center", "lat": 42.349662, "lng": -71.063917, "line": "OL", "area": "Chinatown"},
    {"name": "South Station", "lat": 42.352271, "lng": -71.055242, "line": "RL", "area": "Downtown"},
]

def haversine_dist(lat1, lon1, lat2, lon2):
    """Calculate the great circle distance between two points on the earth (specified in decimal degrees)"""
    # Convert decimal degrees to radians
    lat1, lon1, lat2, lon2 = map(math.radians, [lat1, lon1, lat2, lon2])

    # Haversine formula
    dlon = lon2 - lon1
    dlat = lat2 - lat1
    a = math.sin(dlat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2
    c = 2 * math.asin(math.sqrt(a))
    r = 6371000  # Radius of earth in meters
    return c * r
def nearest_stop(lat, lng):
    """Find the nearest T stop to a given event"""
    best = min(STOPS, key=lambda stop: haversine_dist(lat, lng, stop["lat"], stop["lng"]))
    return best, haversine_dist(lat, lng, best["lat"], best["lng"])

def where(lat, lng):
    """The nearest stop's details for a point, or None if it's too far.
 
    Returns the columns the site shows: stop, line, neighborhood and
    walk_minutes.
    """
    stop, meters = nearest_stop(lat, lng)
    if meters > settings.MAX_WALK_METERS:
        return None
    return {
        "stop": stop["name"],
        "line": stop["line"],
        "neighborhood": stop["area"],
        "walk_minutes": max(1, math.ceil(meters / settings.WALK_METERS_PER_MINUTE)),
    }
