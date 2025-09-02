from __future__ import annotations
import os
import re
from dataclasses import dataclass
from typing import List, Tuple


_WORD_RE = re.compile(r"[A-Za-zÀ-ÖØ-öø-ÿ0-9_']+")


def _tokenize(text: str) -> List[str]:
    return [w.lower() for w in _WORD_RE.findall(text)]


def _read_text_file(path: str) -> str:
    try:
        with open(path, "r", encoding="utf-8", errors="replace") as f:
            return f.read()
    except Exception:
        return ""


def _extract_pdf_text(path: str) -> str:
    try:
        from pypdf import PdfReader  # type: ignore
    except Exception:
        return ""
    try:
        reader = PdfReader(path)
        parts: List[str] = []
        for page in reader.pages:
            try:
                parts.append(page.extract_text() or "")
            except Exception:
                continue
        return "\n".join(p for p in parts if p)
    except Exception:
        return ""


def _extract_docx_text(path: str) -> str:
    try:
        import docx  # type: ignore
    except Exception:
        return ""
    try:
        d = docx.Document(path)
        return "\n".join(p.text for p in d.paragraphs if p.text)
    except Exception:
        return ""


@dataclass
class Snippet:
    file: str
    text: str
    score: float


class RAGPipeline:
    """Very small, dependency-free retrieval for .txt documents.

    - Index: in-memory per query; reads .txt documents under the case docs folder.
    - Scoring: simple TF * IDF-like heuristic over tokens; returns top snippets.
    """

    def __init__(self, docs: List[Tuple[str, str]] | None = None):
        # docs: list of (file_path, file_text)
        self.docs = docs or []

    @classmethod
    def from_case_docs(cls, case_id: str, base_dir: str) -> "RAGPipeline":
        case_dir = os.path.join(base_dir, "docs", case_id)
        items: List[Tuple[str, str]] = []
        if os.path.isdir(case_dir):
            for name in os.listdir(case_dir):
                path = os.path.join(case_dir, name)
                if os.path.isfile(path):
                    low = name.lower()
                    txt = ""
                    if low.endswith(".txt"):
                        txt = _read_text_file(path)
                    elif low.endswith(".pdf"):
                        txt = _extract_pdf_text(path)
                    elif low.endswith(".docx"):
                        txt = _extract_docx_text(path)
                    if txt:
                        items.append((path, txt))
        return cls(items)

    def query(self, query_text: str, top_k: int = 3) -> List[Snippet]:
        q_tokens = _tokenize(query_text)
        if not q_tokens or not self.docs:
            return []
        # Build df over documents
        df = {}
        for _, txt in self.docs:
            toks = set(_tokenize(txt))
            for t in toks:
                df[t] = df.get(t, 0) + 1
        N = max(len(self.docs), 1)

        results: List[Snippet] = []
        for path, txt in self.docs:
            toks = _tokenize(txt)
            if not toks:
                continue
            # simple score: sum(tf * idf) for query tokens
            score = 0.0
            for t in q_tokens:
                tf = toks.count(t) / max(len(toks), 1)
                idf = 1.0
                if t in df:
                    idf = max(0.1, (1.0 + (N / (df[t] or 1))))
                score += tf * idf
            if score > 0:
                # produce a short snippet: first 300 chars around first match
                snippet = txt[:300].strip()
                results.append(Snippet(file=os.path.basename(path), text=snippet, score=score))

        results.sort(key=lambda s: s.score, reverse=True)
        return results[:top_k]
