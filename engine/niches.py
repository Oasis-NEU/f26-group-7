# Guessing the niche of an event
# NATURAL LANGUAGE PROCESSING IS HARD. This is a very simple approach, and will not be perfect. It just looks for keywords in the event name and description.
# nlp coming soon tho
import re

KEYWORDS = {
    "Records": ["record store", "record fair", "record swap", "vinyl"],
    "Thrift": ["thrift", "vintage", "clothing swap"],
    "Markets": ["market", "flea", "bazaar", "vendors", "craft fair"],
    "Film": ["film", "movie", "screening", "cinema"],
    "Books": ["book", "author", "reading", "poetry", "zine"],
    "Galleries": ["gallery", "exhibit", "exhibition", "fine art", "art show"],
    "Museums": ["museum"],
    "Games": ["board game", "game night", "trivia", "chess", "puzzle"],
    "Makers": ["crafts?", "maker", "diy", "printmaking", "sewing", "knitting", "pottery"],
    "Live music": ["music", "concert", "jazz", "band", "dj", "orchestra", "choir", "recital"],
    "Stage": ["theat(re|er)", "comedy", "improv", "dance", "musical", "opera", "play"],
    "Outdoors": ["outdoor", "garden", "hike", "walking tour", "bird"],
    "Third spots": ["co-?working", "study hall", "open studio", "drop-in"],
}

def guess_niche(*texts):
    """Return the first niche whose words appear in any of the texts.
 
    Words must match whole (so "play" doesn't match "display").
    Returns None if nothing matches; the engine skips those events.
    """
    # *texts means "take any # of strings"
    text = " ".join(t for t in texts if t).lower()
    for niche, words in KEYWORDS.items():
        for word in words:
            if re.search(rf"\b{word}s?\b", text):
                return niche
    return None

