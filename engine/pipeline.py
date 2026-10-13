"""The steps every event goes through, whatever source it came from."""

from datetime import datetime

from filters import skip_reason
from niches import guess_niche
from stops import where


def finish(candidates, start, end, skipped):
    """Turn a source's candidates into rows for the database.

    Each candidate is a dict with the event's details, plus `texts` (words
    to judge it by), `lat` and `lng`. An event is kept only if it passes
    every check. `skipped` counts why the others were dropped.
    """
    rows = []
    for event in candidates:
        when = datetime.fromisoformat(event["start_at"])
        if not start <= when < end:
            skipped["not in the next two weeks"] += 1
            continue

        word = skip_reason(*event["texts"])
        if word:
            skipped[f'skip-word "{word}"'] += 1
            continue

        niche = event.get("niche") or guess_niche(*event["texts"])
        if niche is None:
            skipped["doesn't fit a niche"] += 1
            continue

        spot = where(event["lat"], event["lng"])
        if spot is None:
            skipped["too far from our T stops"] += 1
            continue

        rows.append(
            {
                "title": event["title"],
                "niche": niche,
                "venue": event["venue"],
                "start_at": when.isoformat(),
                "change_type": event.get("change_type"),
                "adults_only": event.get("adults_only", False),
                "source": event["source"],
                "source_id": event["source_id"],
                "source_url": event["source_url"],
                **spot,
            }
        )
    return rows