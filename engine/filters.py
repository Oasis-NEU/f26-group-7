"""Keep out events unintersting to our target audience
or events that they wont be able to and probably dont want to go to"""
SKIP_WORDS = [
    # school business
    "info session", "information session", "admissions?", "open house",
    "orientation", "advising", "office hours", "tutoring", "deadline",
    "application", "registration", "commencement", "convocation",
    # careers and work
    "career fair", "employer", "recruiting", "recruitment", "coffee chat",
    "resume", "interview", "opt", "visa", "training", "professional development",
    # not for students
    "alumni", "faculty", "staff", "donors?", "board meeting", "committee",
    "dissertation", "thesis", "defense", "gala", "fundraiser",
    # online only
    "webinar", "zoom", "virtual", "online",
    # for kids or seniors
    "storytime", "toddlers?", "kids", "children", "family day", "seniors",
]

def skip_reason(*texts):
    """Return a reason to skip an event, or None if it should be kept.

    Looks for words in the event name and description that indicate
    the event is not interesting to our target audience.
    """
    text = " ".join(t for t in texts if t).lower()
    for word in SKIP_WORDS:
        if word in text:
            return word
    return None