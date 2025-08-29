class RAGPipeline:
    def __init__(self):
        raise NotImplementedError("RAG pipeline will handle chunking, indexing, and retrieval")

    def ingest(self, paths):
        raise NotImplementedError

    def query(self, text):
        raise NotImplementedError
