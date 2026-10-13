from collections import Counter
from datetime import datetime, timezone

from pipeline import finish

START = datetime(2026, 10, 12, tzinfo=timezone.utc)
END = datetime(2026, 10, 26, tzinfo=timezone.utc)


def candidate(**changes):
    """A good candidate near Symphony; change fields to test each check."""
    event = {
        "title": "Jazz night",
        "texts": ["Jazz night"],
        "venue": "A basement",
        "lat": 42.3427,
        "lng": -71.0851,
        "start_at": "2026-10-14T20:00:00-04:00",
        "source": "Test",
        "source_id": "test:1",
        "source_url": "https://example.com/1",
    }
    return {**event, **changes}


def test_keeps_a_good_event():
    skipped = Counter()
    rows = finish([candidate()], START, END, skipped)
    assert len(rows) == 1
    row = rows[0]
    assert row["niche"] == "Live music"
    assert row["stop"] == "Symphony"
    assert row["adults_only"] is False
    assert "texts" not in row and "lat" not in row
    assert not skipped


def test_counts_why_events_were_skipped():
    skipped = Counter()
    candidates = [
        candidate(start_at="2026-12-01T20:00:00-05:00"),
        candidate(texts=["Alumni jazz night"]),
        candidate(texts=["Untitled"]),
        candidate(lat=42.3734, lng=-71.1189),
    ]
    assert finish(candidates, START, END, skipped) == []
    assert skipped == Counter(
        {
            "not in the next two weeks": 1,
            'skip-word "alumni"': 1,
            "doesn't fit a niche": 1,
            "too far from our T stops": 1,
        }
    )


def test_a_source_can_set_the_niche():
    rows = finish([candidate(texts=["Untitled"], niche="Stage")], START, END, Counter())
    assert rows[0]["niche"] == "Stage"