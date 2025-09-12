class ExportPlugin:
    name = "base"

    def export(self, conversation, dest_path):
        raise NotImplementedError("Implement export to PDF, DOCX, or JSONL")
