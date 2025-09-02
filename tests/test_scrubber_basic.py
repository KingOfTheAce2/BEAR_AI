import pytest


def test_email_replacement():
    try:
        from pii.scrubber import Scrubber
    except Exception:
        pytest.skip("Presidio not installed for test environment")

    s = Scrubber()
    text = "Contact me at alice@example.com"
    out, ents = s.anonymize(text, "en")
    assert "[EMAIL]" in out
    assert any(e["type"] == "EMAIL_ADDRESS" for e in ents)

