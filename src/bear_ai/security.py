def enable_cuda():
    """
    Future: detect and enable CUDA for local inference runtimes.
    Options:
      - llama.cpp CUDA build flags
      - PyTorch + bitsandbytes
    """
    raise NotImplementedError


def scrub_pii(text: str) -> str:
    """
    Future integration:
      - Microsoft Presidio pipeline for NER based detection + anonymization
      - NVIDIA NeMo Guardrails for in-session redaction and policy checks
    """
    raise NotImplementedError
