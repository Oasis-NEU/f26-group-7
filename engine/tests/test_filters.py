from filters import skip_reason


def test_keeps_a_normal_event():
    assert skip_reason("Jazz night in the courtyard", "Performance") is None


def test_skips_school_business():
    assert skip_reason("Graduate Admissions Open House") == "admissions?"


def test_skips_by_event_type_too():
    assert skip_reason("Fall mixer", "Alumni") == "alumni"


def test_whole_words_only():
    # "opt" is a skip-word (work visas), but "option" is fine.
    assert skip_reason("Vegan option potluck") is None