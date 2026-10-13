from stops import haversine_dist, nearest_stop, where

def test_one_kilometer_north():
    # insuracne in case something changes with stops or distance formula
    # 0.009 degrees of latitude is about 1 km anywhere on Earth.
    meters = haversine_dist(42.35, -71.06, 42.359, -71.06)
    assert 990 < meters < 1010

def test_nearest_stop_to_the_mfa_is_the_mfa():
    stop, meters = nearest_stop(42.3394, -71.0940)  # the museum's front door
    assert stop["name"] == "Museum of Fine Arts"
    assert meters < 300

def test_where_gives_stop_line_area_and_walk():
    spot = where(42.3555, -71.0604)  # Washington St, downtown
    assert spot == {
        "stop": "Downtown Crossing",
        "line": "OL",
        "neighborhood": "Downtown",
        "walk_minutes": 1,
    }

def test_where_skips_places_far_from_our_stops():
    assert where(42.3734, -71.1189) is None  # Harvard Square
