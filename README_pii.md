PII Scrubbing (Local, Offline)

Overview
- Local Microsoft Presidio integration to sanitize PII on the way into and out of your local LLM.
- English and Dutch support, including custom validators for BSN and RSIN (11-test based).
- Optional append-only audit trail with only hashes/metadata (no raw text).
- CLI tool for quick file/stdin scrubbing.

Install (offline-friendly)
- pip install presidio-analyzer presidio-anonymizer spacy
- python -m spacy download en_core_web_lg
- python -m spacy download nl_core_news_lg

Structure
- pii/
  - __init__.py: exports Scrubber, Policy, Audit
  - config.py: defaults and entity map
  - scrubber.py: Presidio Analyzer/Anonymizer glue
  - custom_nl_ids.py: BSN/RSIN validators and recognizers
  - policy.py: inbound/outbound policy switches
  - audit.py: append-only, hashed audit JSONL
- bin/
  - scrub_text.py: CLI to scrub text (stdin or file)
- tests/
  - test_scrubber_basic.py: smoke test
  - test_custom_nl_ids.py: validator tests

Defaults
- Entities: PERSON, ORGANIZATION, EMAIL_ADDRESS, PHONE_NUMBER, CREDIT_CARD, IBAN, IP_ADDRESS, DATE_TIME, BSN, RSIN
- Anonymization map:
  - EMAIL_ADDRESS -> [EMAIL]
  - PHONE_NUMBER -> [PHONE]
  - CREDIT_CARD -> [CARD]
  - IBAN -> [IBAN]
  - IP_ADDRESS -> [IP]
  - PERSON -> [PERSON_{stable_id}]
  - ORGANIZATION -> [ORG_{stable_id}]
  - DATE_TIME -> [DATE]
  - BSN -> [BSN]
  - RSIN -> [RSIN]
- Stable IDs use salted SHA256: set env var PII_SALT for reproducible tokens. No raw text is persisted by the audit.

Usage: wrap your model call
```python
from pii.scrubber import Scrubber
from pii.policy import Policy
from pii.audit import Audit

scrubber = Scrubber()
policy = Policy(scrubber, require_inbound=True, require_outbound=True)
audit = Audit(enabled=True)  # toggle audits; hashes only, no raw

def run_model(prompt: str) -> str:
    # local LLM call; example placeholder
    return prompt[::-1]

def chat(user_text: str, language: str = "en") -> str:
    inbound_sanitized, ent_in = policy.inbound(user_text, language)
    audit.record("inbound", user_text, inbound_sanitized, ent_in, language)
    raw = run_model(inbound_sanitized)
    outbound_sanitized, ent_out = policy.outbound(raw, language)
    audit.record("outbound", raw, outbound_sanitized, ent_out, language)
    return outbound_sanitized
```

CLI
```bash
echo "My email is a@b.com" | python bin/scrub_text.py --lang en
python bin/scrub_text.py --lang nl --infile sample.txt
```

Tests
```bash
pytest -q tests
```

Compliance note
- Compliance officers own policy thresholds (e.g., min_confidence) and audit retention. This module provides sane defaults and a simple switch for inbound/outbound enforcement and audit enablement.

