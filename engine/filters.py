"""Keep out events unintersting to our target audience
or events that they wont be able to and probably dont want to go to"""
import re


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
    text = " ".join(t for t in texts if t).lower()
    for word in SKIP_WORDS:
        if re.search(rf"\b{word}\b", text):
            return word
    return None