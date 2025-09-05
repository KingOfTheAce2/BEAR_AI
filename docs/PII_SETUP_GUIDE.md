# PII (Personally Identifiable Information) System Setup Guide

The BEAR AI PII system provides comprehensive data privacy protection using Microsoft Presidio with custom Dutch language support and policy-based management.

## Quick Start

### 1. Basic Installation

The PII system works with fallback functionality even without Presidio installed. For basic regex-based PII scrubbing, no additional setup is required.

```python
from bear_ai.pii import scrub_pii

# Works immediately with regex-based fallback
text = "My email is john@example.com"
cleaned = scrub_pii(text)  # Returns: "My email is [EMAIL]"
```

### 2. Full Presidio Installation

For advanced PII detection with Dutch language support:

```bash
# Install Presidio dependencies
pip install presidio-analyzer>=2.2.33 presidio-anonymizer>=2.2.33

# Install spaCy and Dutch models
pip install spacy>=3.4.0
python -m spacy download nl_core_news_lg

# Optional: Install transformers for better accuracy
pip install transformers>=4.21.0
```

### 3. Environment Configuration

Set these environment variables to enable advanced features:

```bash
# Enable PII processing (default: false)
export PII_ENABLE=true

# Enable audit logging (default: false)  
export PII_AUDIT=true

# Salt for stable tokenization (generates random if not set)
export PII_SALT=your_random_salt_here

# Audit log directory (default: ./logs/pii/)
export PII_AUDIT_DIR=./logs/pii/

# Confidence threshold for detection (default: 0.8)
export PII_CONFIDENCE_THRESHOLD=0.8
```

## System Architecture

### Core Components

1. **Scrubber** (`src/bear_ai/pii/scrubber.py`)
   - Microsoft Presidio integration
   - Custom Dutch entity recognizers
   - Graceful fallback to regex-based scrubbing

2. **Policy** (`src/bear_ai/pii/policy.py`)
   - Configurable inbound/outbound scrubbing rules
   - Stable tokenization with salted hashes
   - Environment-based configuration

3. **Audit** (`src/bear_ai/pii/audit.py`)
   - SHA256-based audit logging
   - JSONL format for efficient processing
   - No raw text storage for privacy compliance

4. **Dutch Recognizers** (`src/bear_ai/pii/dutch_recognizers.py`)
   - BSN (Burgerservicenummer) validation with 11-test algorithm
   - RSIN (Rechtspersonen Informatienummer) validation
   - Context-aware entity detection

### Package Structure

```
src/bear_ai/pii/
├── __init__.py          # Package exports and backward compatibility
├── scrubber.py          # Main PII detection and anonymization
├── policy.py            # Policy management and configuration
├── audit.py             # Audit logging and reporting
└── dutch_recognizers.py # Custom Dutch entity recognizers
```

## Usage Examples

### Basic Usage

```python
from bear_ai.pii import scrub_pii

# Backward compatible - uses fallback if Presidio not available
text = "Contact me at john.doe@example.com or 123-456-7890"
result = scrub_pii(text)
print(result)  # "Contact me at [EMAIL] or [PHONE]"
```

### Advanced Usage with Policy

```python
from bear_ai.pii import Scrubber, Policy, PolicyConfig

# Create custom policy
config = PolicyConfig(
    inbound_entities={"EMAIL_ADDRESS", "PHONE_NUMBER", "BSN"},
    outbound_entities={"EMAIL_ADDRESS", "PERSON", "ORGANIZATION"},
    confidence_threshold=0.9,
    stable_tokenization=True
)
policy = Policy(config)

# Create scrubber with audit enabled
scrubber = Scrubber(enable_audit=True)

# Scrub inbound text (user input)
user_input = "My BSN is 123456789 and email is test@example.com"
cleaned_input = scrubber.scrub(user_input, policy, direction="inbound")

# Scrub outbound text (model output)
model_output = "John Smith from ACME Corp sent an email"
cleaned_output = scrubber.scrub(model_output, policy, direction="outbound")
```

### Analysis Only

```python
from bear_ai.pii import Scrubber

scrubber = Scrubber()
entities = scrubber.analyze_only("My name is John and my email is john@test.com")

for entity in entities:
    print(f"Found {entity.entity_type}: {entity.text} (confidence: {entity.score:.2f})")
```

### Dutch Number Validation

```python
from bear_ai.pii import Scrubber

scrubber = Scrubber()

# Validate Dutch BSN
is_valid_bsn = scrubber.validate_dutch_number("123456782", "BSN")
print(f"BSN valid: {is_valid_bsn}")

# Validate Dutch RSIN
is_valid_rsin = scrubber.validate_dutch_number("123456782", "RSIN") 
print(f"RSIN valid: {is_valid_rsin}")
```

### Audit Queries

```python
from bear_ai.pii import Audit
from datetime import datetime, timedelta

audit = Audit()

# Get recent audit entries
entries = audit.query_audit_entries(
    start_date=datetime.now() - timedelta(days=7),
    direction="inbound",
    min_entities=1,
    limit=100
)

# Get audit statistics
stats = audit.get_audit_statistics(days=30)
print(f"Total events: {stats['total_events']}")
print(f"Entities found: {stats['total_entities_found']}")

# Export audit report
audit.export_audit_report(
    output_path="pii_audit_report.json",
    start_date=datetime.now() - timedelta(days=30),
    format="json"
)
```

## Supported Entity Types

### Standard Entities (English)
- `PERSON` - Person names
- `ORGANIZATION` - Organization names  
- `EMAIL_ADDRESS` - Email addresses
- `PHONE_NUMBER` - Phone numbers
- `CREDIT_CARD` - Credit card numbers
- `IP_ADDRESS` - IP addresses
- `DATE_TIME` - Dates and times
- `LOCATION` - Geographic locations
- `URL` - URLs and web addresses
- `IBAN_CODE` - International bank account numbers

### Dutch-Specific Entities
- `BSN` - Burgerservicenummer (Dutch social security number)
- `RSIN` - Rechtspersonen en Samenwerkingsverbanden Informatienummer (Dutch business ID)

### Entity Validation

Dutch entities (BSN, RSIN) use the 11-test checksum algorithm for validation to minimize false positives:

```python
# BSN validation example
def validate_bsn(number):
    digits = [int(d) for d in number if d.isdigit()]
    if len(digits) != 9 or digits[0] == 0:
        return False
    
    checksum = sum(digits[i] * (9 - i) for i in range(8))
    checksum += digits[8] * -1
    return checksum % 11 == 0
```

## Configuration Options

### Policy Configuration

```python
from bear_ai.pii import PolicyConfig

config = PolicyConfig(
    # Entity types to scrub for inbound text (user input)
    inbound_entities={"EMAIL_ADDRESS", "PHONE_NUMBER", "BSN", "RSIN"},
    
    # Entity types to scrub for outbound text (model output)  
    outbound_entities={"EMAIL_ADDRESS", "PERSON", "ORGANIZATION", "BSN", "RSIN"},
    
    # Minimum confidence threshold (0.0 to 1.0)
    confidence_threshold=0.8,
    
    # Whether to require scrubbing for each direction
    require_inbound=True,
    require_outbound=True,
    
    # Use stable tokenization for consistent anonymization
    stable_tokenization=True,
    
    # Custom replacement patterns
    custom_replacements={
        "EMAIL_ADDRESS": "[REDACTED_EMAIL]",
        "PERSON": "[PERSON_X]"
    }
)
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PII_ENABLE` | `false` | Enable advanced PII processing |
| `PII_AUDIT` | `false` | Enable audit logging |
| `PII_SALT` | (generated) | Salt for stable tokenization |
| `PII_AUDIT_DIR` | `./logs/pii/` | Audit log directory |
| `PII_CONFIDENCE_THRESHOLD` | `0.8` | Detection confidence threshold |
| `PII_INBOUND_ENTITIES` | (default set) | Comma-separated entity types for inbound |
| `PII_OUTBOUND_ENTITIES` | (default set) | Comma-separated entity types for outbound |
| `PII_REQUIRE_INBOUND` | `true` | Require inbound scrubbing |
| `PII_REQUIRE_OUTBOUND` | `true` | Require outbound scrubbing |
| `PII_STABLE_TOKENS` | `true` | Enable stable tokenization |

## Troubleshooting

### Common Issues

1. **Presidio not available**
   - System falls back to regex-based scrubbing
   - Install with: `pip install presidio-analyzer presidio-anonymizer`

2. **Dutch models missing**
   - English models used as fallback
   - Install with: `python -m spacy download nl_core_news_lg`

3. **Performance issues**
   - Lower confidence threshold in policy
   - Reduce entity types being detected
   - Use smaller spaCy models (nl_core_news_sm)

4. **False positives**
   - Increase confidence threshold
   - Use context-aware detection
   - Enable Dutch number validation

### Testing Installation

Run the backward compatibility test:

```bash
python test_pii_backward_compatibility.py
```

Run the setup script to install dependencies:

```bash  
python setup_pii.py
```

### Logs and Debugging

Enable debug logging:

```python
import logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger('bear_ai.pii')
logger.setLevel(logging.DEBUG)
```

Check audit logs:

```bash
# View recent audit entries
tail -f ./logs/pii/pii_audit_$(date +%Y-%m-%d).jsonl

# Search for specific patterns
grep "BSN" ./logs/pii/*.jsonl
```

## Security Considerations

### Privacy by Design

1. **No Raw Text Storage**: Audit logs use SHA256 hashes, never store original text
2. **Salted Hashing**: Consistent tokenization with configurable salt
3. **Append-Only Logs**: Audit trail cannot be modified
4. **Configurable Retention**: Rotate logs based on date

### Compliance Features

- **GDPR Compatible**: Privacy-preserving audit trail
- **Configurable Policies**: Different rules for different data flows
- **Validation Algorithms**: Dutch-specific validation reduces false positives
- **Graceful Degradation**: System remains functional without advanced features

### Best Practices

1. Set a strong, random salt for production: `openssl rand -hex 32`
2. Store audit logs in secure location with restricted access
3. Regularly review entity detection accuracy and adjust thresholds
4. Use separate policies for different data sensitivity levels
5. Monitor audit statistics for anomalies

## Integration Examples

### With Legal Chat System

The PII system integrates seamlessly with the existing legal chat interface:

```python
# In legal_chat.py
from .pii.scrubber import Scrubber
from .pii.policy import Policy
from .pii.audit import Audit

class LegalChatWindow:
    def __init__(self):
        self.scrubber = Scrubber()
        self.policy = Policy()
        
    def process_user_input(self, user_text):
        # Scrub PII from user input before processing
        cleaned_text = self.scrubber.scrub(user_text, self.policy, "inbound")
        return cleaned_text
        
    def process_model_output(self, model_text):
        # Scrub PII from model output before display
        cleaned_text = self.scrubber.scrub(model_text, self.policy, "outbound")
        return cleaned_text
```

### With Document Processing

```python
from bear_ai.pii import Scrubber, Policy

def process_legal_document(document_text):
    scrubber = Scrubber()
    policy = Policy()
    
    # Analyze document for PII
    entities = scrubber.analyze_only(document_text)
    
    if entities:
        print(f"Found {len(entities)} PII entities in document")
        
        # Scrub if needed
        cleaned_doc = scrubber.scrub(document_text, policy, "inbound")
        return cleaned_doc
    
    return document_text
```

## Contributing

To contribute to the PII system:

1. Follow the existing code patterns for graceful fallbacks
2. Add comprehensive tests for new entity types
3. Update documentation for new configuration options
4. Ensure backward compatibility with existing scrub_pii function
5. Add appropriate error handling and logging

## Support

For issues and feature requests:
- Check the troubleshooting section above
- Run the test scripts to diagnose problems
- Review audit logs for detection accuracy
- Consider adjusting policy configuration for your use case