from bear_ai.security import scrub_pii


def test_scrub_basic_patterns():
    s = (
        "Email: alice@example.com, Phone: (415) 555-1234, SSN: 123-45-6789, "
        "Card: 4111 1111 1111 1111, IP: 192.168.1.10"
    )
    out = scrub_pii(s)
    assert "[EMAIL]" in out
    assert "[PHONE]" in out
    assert "[SSN]" in out
    assert "[CARD]" in out
    assert "[IP]" in out

