import json
import os
import shutil
import time
from typing import Any, Dict, List, Optional


APP_DIR = os.path.join(os.path.expanduser("~"), ".bear_ai")
DATA_DIR = os.path.join(APP_DIR, "data")
CASES_PATH = os.path.join(DATA_DIR, "cases.json")
MSGS_PATH = os.path.join(DATA_DIR, "messages.json")
DOCS_PATH = os.path.join(DATA_DIR, "documents.json")


def _ensure_dirs():
    os.makedirs(DATA_DIR, exist_ok=True)


def _load(path: str) -> List[Dict[str, Any]]:
    _ensure_dirs()
    if not os.path.exists(path):
        return []
    try:
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        if isinstance(data, list):
            return data
    except Exception:
        pass
    return []


def _save(path: str, items: List[Dict[str, Any]]):
    _ensure_dirs()
    tmp = path + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(items, f, ensure_ascii=False, indent=2)
    os.replace(tmp, path)


def _gen_id(prefix: str) -> str:
    return f"{prefix}_{int(time.time()*1000)}_{os.urandom(2).hex()}"


# Cases
def list_cases(limit: Optional[int] = None) -> List[Dict[str, Any]]:
    items = _load(CASES_PATH)
    items.sort(key=lambda c: c.get("last_activity", ""), reverse=True)
    return items[:limit] if limit else items


def create_case(name: str, **fields) -> Dict[str, Any]:
    items = _load(CASES_PATH)
    rec = {
        "id": _gen_id("case"),
        "name": name,
        "status": fields.get("status", "active"),
        "client": fields.get("client"),
        "matter_type": fields.get("matter_type"),
        "description": fields.get("description"),
        "last_activity": fields.get("last_activity") or time.strftime("%Y-%m-%dT%H:%M:%S"),
    }
    items.insert(0, rec)
    _save(CASES_PATH, items)
    return rec


def update_case(case_id: str, **patch) -> Optional[Dict[str, Any]]:
    items = _load(CASES_PATH)
    for i, c in enumerate(items):
        if c.get("id") == case_id:
            items[i] = {**c, **patch}
            _save(CASES_PATH, items)
            return items[i]
    return None


def get_case(case_id: str) -> Optional[Dict[str, Any]]:
    for c in _load(CASES_PATH):
        if c.get("id") == case_id:
            return c
    return None


# Messages
def list_messages(case_id: str) -> List[Dict[str, Any]]:
    items = [m for m in _load(MSGS_PATH) if m.get("case_id") == case_id]
    items.sort(key=lambda m: m.get("created_date", ""))
    return items


def add_message(case_id: str, sender: str, content: Any, **fields) -> Dict[str, Any]:
    items = _load(MSGS_PATH)
    rec = {
        "id": _gen_id("msg"),
        "case_id": case_id,
        "sender": sender,
        "content": content,
        "message_type": fields.get("message_type", "text"),
        "task_type": fields.get("task_type"),
        "attachments": fields.get("attachments"),
        "is_draft": fields.get("is_draft", False),
        "is_reviewed": fields.get("is_reviewed", False),
        "exported": fields.get("exported", False),
        "created_date": time.strftime("%Y-%m-%dT%H:%M:%S"),
    }
    items.append(rec)
    _save(MSGS_PATH, items)
    update_case(case_id, last_activity=time.strftime("%Y-%m-%dT%H:%M:%S"))
    return rec


def update_message(msg_id: str, **patch) -> Optional[Dict[str, Any]]:
    items = _load(MSGS_PATH)
    for i, m in enumerate(items):
        if m.get("id") == msg_id:
            items[i] = {**m, **patch}
            _save(MSGS_PATH, items)
            return items[i]
    return None


# Documents
def list_documents(case_id: str) -> List[Dict[str, Any]]:
    items = [d for d in _load(DOCS_PATH) if d.get("case_id") == case_id]
    items.sort(key=lambda d: d.get("created_date", ""), reverse=True)
    return items


def add_document(case_id: str, src_path: str) -> Dict[str, Any]:
    _ensure_dirs()
    items = _load(DOCS_PATH)
    file_name = os.path.basename(src_path)
    dest_dir = os.path.join(DATA_DIR, "docs", case_id)
    os.makedirs(dest_dir, exist_ok=True)
    dest_path = os.path.join(dest_dir, file_name)
    try:
        shutil.copy2(src_path, dest_path)
        stored_path = dest_path
    except Exception:
        # If copy fails, still record the original path
        stored_path = src_path

    rec = {
        "id": _gen_id("doc"),
        "case_id": case_id,
        "name": file_name,
        "file_path": stored_path,
        "file_type": os.path.splitext(file_name)[1].lstrip('.').lower(),
        "file_size": os.path.getsize(stored_path) if os.path.exists(stored_path) else None,
        "created_date": time.strftime("%Y-%m-%dT%H:%M:%S"),
    }
    items.insert(0, rec)
    _save(DOCS_PATH, items)
    return rec

