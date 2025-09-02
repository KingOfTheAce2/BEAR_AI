from .scrubber import Scrubber


class Policy:
    def __init__(self, scrubber: Scrubber, require_inbound: bool = True, require_outbound: bool = True):
        self.scrubber = scrubber
        self.require_inbound = require_inbound
        self.require_outbound = require_outbound

    def inbound(self, text: str, language: str = "en") -> tuple[str, list]:
        if not self.require_inbound:
            return text, []
        return self.scrubber.anonymize(text, language)

    def outbound(self, text: str, language: str = "en") -> tuple[str, list]:
        if not self.require_outbound:
            return text, []
        return self.scrubber.anonymize(text, language)

