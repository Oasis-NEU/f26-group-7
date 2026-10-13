from niches import guess_niche


def test_music():
    assert guess_niche("Jazz trio in the courtyard") == "Live music"


def test_specific_niche_wins():
    # "vinyl" (Records) is checked before "music" (Live music).
    assert guess_niche("Vinyl and music swap") == "Records"


def test_whole_words_only():
    assert guess_niche("Window display") is None


def test_plural_words_match():
    assert guess_niche("Three short films") == "Film"


def test_looks_at_every_text():
    assert guess_niche("Fall open house", "Exhibition") == "Galleries"


def test_nothing_matches():
    assert guess_niche("Graduate admissions info session") is None