import os

DEFAULTS = {
    "language_default": "en",
    "languages": ["en", "nl"],
    "min_confidence": 0.5,
    "anonymization_map": {
        "EMAIL_ADDRESS": "[EMAIL]",
        "PHONE_NUMBER": "[PHONE]",
        "CREDIT_CARD": "[CARD]",
        "IBAN": "[IBAN]",
        "IP_ADDRESS": "[IP]",
        "PERSON": "[PERSON_{stable_id}]",
        "ORGANIZATION": "[ORG_{stable_id}]",
        "DATE_TIME": "[DATE]",
        "BSN": "[BSN]",
        "RSIN": "[RSIN]",
    },
    "entities_enabled": [
        "PERSON",
        "ORGANIZATION",
        "EMAIL_ADDRESS",
        "PHONE_NUMBER",
        "CREDIT_CARD",
        "IBAN",
        "IP_ADDRESS",
        "DATE_TIME",
        "BSN",
        "RSIN",
    ],
}


def get_salt():
    return os.environ.get("PII_SALT", "dev_salt_change_me")

