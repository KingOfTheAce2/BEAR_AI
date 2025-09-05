import threading
import tkinter as tk
from tkinter import ttk, filedialog, messagebox
from typing import Optional

from .inference import LocalInference
import os

try:
    from .pii.scrubber import Scrubber
    from .pii.policy import Policy
    from .pii.audit import Audit
except Exception:  # Presidio not installed; keep UI functional without PII
    Scrubber = None  # type: ignore
    Policy = None  # type: ignore
    Audit = None  # type: ignore
from .local_store import (
    list_cases,
    create_case,
    list_messages,
    add_message,
    list_documents,
    add_document,
)
from .local_store import DATA_DIR
from .rag import RAGPipeline


class LegalChatWindow(tk.Toplevel):
    def __init__(self, parent: tk.Misc):
        super().__init__(parent)
        self.title("Legal Chat")
        self.geometry("1024x700")
        self.parent = parent

        # State
        self.selected_case_id: Optional[str] = None
        self.selected_action: Optional[str] = None
        self._chat_thread = None
        self._chat_stop = threading.Event()
        self.llm: Optional[LocalInference] = None
        self.pii_policy: Optional[Policy] = None
        self.pii_audit: Optional[Audit] = None
        self.pii_enabled = False

        # Top bar: Model + Export
        top = ttk.Frame(self, padding=(8, 8))
        top.pack(fill="x")
        ttk.Label(top, text="GGUF model:").pack(side="left")
        self.model_var = tk.StringVar()
        ttk.Entry(top, textvariable=self.model_var, width=70).pack(side="left", padx=6)
        ttk.Button(top, text="Browse", command=self._pick_model).pack(side="left")
        ttk.Button(top, text="Export chat", command=self._export_chat).pack(side="right")
        # PII status
        self.pii_status = tk.StringVar(value="PII: off")
        ttk.Label(top, textvariable=self.pii_status).pack(side="right", padx=(0, 8))
        ttk.Button(top, text="PII Settings", command=self._toggle_pii).pack(side="right", padx=(0, 8))

        # Window icon
        try:
            from .gui import _try_load_logo_photoimage, BEAR_ICON_PNG
            icon = _try_load_logo_photoimage() or tk.PhotoImage(data=BEAR_ICON_PNG)
            self.iconphoto(True, icon)
        except Exception:
            pass

        # Main split: cases | chat
        main = ttk.Panedwindow(self, orient=tk.HORIZONTAL)
        main.pack(fill="both", expand=True)

        left = ttk.Frame(main, padding=8)
        right = ttk.Frame(main, padding=8)
        main.add(left, weight=1)
        main.add(right, weight=3)

        # Left: cases list
        ttk.Label(left, text="Cases", font=("Segoe UI", 10, "bold")).pack(anchor="w", pady=(0, 6))
        self.case_list = tk.Listbox(left, height=20)
        self.case_list.pack(fill="both", expand=True)
        self.case_list.bind("<<ListboxSelect>>", lambda e: self._on_select_case())
        row = ttk.Frame(left)
        row.pack(fill="x", pady=(6, 0))
        ttk.Button(row, text="New Case", command=self._new_case).pack(side="left")
        ttk.Button(row, text="Rename", command=self._rename_case).pack(side="left", padx=6)
        ttk.Button(row, text="Delete", command=self._delete_case).pack(side="left")

        # Right: chat area
        head = ttk.Frame(right)
        head.pack(fill="x")
        self.case_title = ttk.Label(head, text="No case selected", font=("Segoe UI", 10, "bold"))
        self.case_title.pack(side="left")

        # Messages view
        mid = ttk.Frame(right)
        mid.pack(fill="both", expand=True, pady=(6, 6))
        self.msgs = tk.Text(mid, wrap="word", state="disabled")
        yscroll = ttk.Scrollbar(mid, orient="vertical", command=self.msgs.yview)
        self.msgs.configure(yscrollcommand=yscroll.set)
        self.msgs.pack(side="left", fill="both", expand=True)
        yscroll.pack(side="left", fill="y")

        # Quick actions
        qa = ttk.Frame(right)
        qa.pack(fill="x", pady=(0, 6))
        ttk.Label(qa, text="Quick actions:").pack(side="left")
        for act in ["summarize", "redline", "draft", "explain", "compare", "research"]:
            ttk.Button(qa, text=act.capitalize(), command=lambda a=act: self._select_action(a)).pack(side="left", padx=4)
        self.action_lbl = ttk.Label(qa, text="")
        self.action_lbl.pack(side="left", padx=8)

        # Input row
        input_row = ttk.Frame(right)
        input_row.pack(fill="x")
        self.prompt = tk.Text(input_row, height=4, wrap="word")
        self.prompt.pack(side="left", fill="both", expand=True)
        side = ttk.Frame(input_row)
        side.pack(side="left", padx=(6, 0))
        ttk.Button(side, text="Attach", command=self._attach_docs).pack(fill="x")
        ttk.Button(side, text="Send", command=self._send_message).pack(fill="x", pady=(6, 0))

        self._reload_cases()
        if self.case_list.size() == 0:
            self._new_case()
        # Initialize PII according to env
        self._setup_pii()

    # Cases
    def _reload_cases(self):
        self.case_list.delete(0, "end")
        for c in list_cases():
            self.case_list.insert("end", f"{c['name']}  [{c['id']}]")
        if self.case_list.size() > 0 and self.case_list.curselection() == ():
            self.case_list.select_set(0)
            self._on_select_case()

    def _current_case_id(self) -> Optional[str]:
        sel = self.case_list.curselection()
        if not sel:
            return None
        item = self.case_list.get(sel[0])
        # format: name  [id]
        if "[" in item and "]" in item:
            return item.split("[")[-1].rstrip("]")
        return None

    def _on_select_case(self):
        cid = self._current_case_id()
        self.selected_case_id = cid
        self.case_title.configure(text=f"Case: {cid or '—'}")
        self._render_messages()

    def _new_case(self):
        name = f"New Case - {self._today()}"
        c = create_case(name)
        self._reload_cases()
        # select new case (assumed at index 0)
        self.case_list.select_clear(0, "end")
        self.case_list.select_set(0)
        self._on_select_case()

    def _rename_case(self):
        cid = self._current_case_id()
        if not cid:
            return
        name = self._simple_prompt("Rename case", "Enter new case name:")
        if not name:
            return
        from .local_store import update_case

        update_case(cid, name=name)
        self._reload_cases()

    def _delete_case(self):
        cid = self._current_case_id()
        if not cid:
            return
        if not messagebox.askyesno("Delete", "Delete this case? This keeps stored files but removes entries."):
            return
        # Remove from JSON files (soft delete: filter out entries)
        from .local_store import CASES_PATH, MSGS_PATH, DOCS_PATH, _load, _save

        _save(CASES_PATH, [c for c in _load(CASES_PATH) if c.get("id") != cid])
        _save(MSGS_PATH, [m for m in _load(MSGS_PATH) if m.get("case_id") != cid])
        _save(DOCS_PATH, [d for d in _load(DOCS_PATH) if d.get("case_id") != cid])
        self._reload_cases()
        self.msgs.configure(state="normal")
        self.msgs.delete("1.0", "end")
        self.msgs.configure(state="disabled")

    # Messages/UI helpers
    def _render_messages(self):
        self.msgs.configure(state="normal")
        self.msgs.delete("1.0", "end")
        if not self.selected_case_id:
            self.msgs.configure(state="disabled")
            return
        for m in list_messages(self.selected_case_id):
            stamp = m.get("created_date", "")
            sender = "You" if m.get("sender") == "user" else "AI"
            mt = m.get("message_type", "text")
            prefix = f"[{stamp}] {sender}: "
            if mt == "document" and m.get("attachments"):
                for a in m["attachments"]:
                    self.msgs.insert("end", f"{prefix}(uploaded) {a.get('file_name')}\n")
            else:
                self.msgs.insert("end", f"{prefix}{m.get('content','')}\n")
        self.msgs.see("end")
        self.msgs.configure(state="disabled")

    def _append_ai(self, text: str):
        self.msgs.configure(state="normal")
        self.msgs.insert("end", text)
        self.msgs.see("end")
        self.msgs.configure(state="disabled")

    # Actions
    def _select_action(self, act: str):
        self.selected_action = act
        self.action_lbl.configure(text=f"Selected: {act}")

    def _attach_docs(self):
        if not self.selected_case_id:
            messagebox.showerror("Error", "Create or select a case first")
            return
        paths = filedialog.askopenfilenames()
        for p in paths or []:
            doc = add_document(self.selected_case_id, p)
            add_message(
                self.selected_case_id,
                sender="user",
                content=f"Uploaded document: {doc['name']}",
                message_type="document",
                attachments=[{"file_name": doc["name"], "file_path": doc["file_path"], "file_type": doc["file_type"]}],
            )
        if paths:
            self._render_messages()

    def _send_message(self):
        if not self.selected_case_id:
            messagebox.showerror("Error", "Create or select a case first")
            return
        text = self.prompt.get("1.0", "end").strip()
        if not text:
            return
        self.prompt.delete("1.0", "end")
        inbound_text = text
        if self.pii_enabled and self.pii_policy:
            try:
                inbound_text, ents = self.pii_policy.inbound(text, "en")
                if self.pii_audit:
                    self.pii_audit.record("inbound", text, inbound_text, ents, "en")
            except Exception as e:
                messagebox.showwarning("PII", f"Inbound scrubbing failed, using raw text: {e}")
        add_message(self.selected_case_id, sender="user", content=inbound_text, message_type="text")
        self._render_messages()

        # Build prompt with context
        case_docs = list_documents(self.selected_case_id)
        doc_ctx = ""
        rag_snips = []
        if case_docs:
            names = ", ".join(d.get("name", "") for d in case_docs)
            doc_ctx = f"Available documents: {names}. "
            # Lightweight RAG over local documents (.txt by default; pdf/docx supported if parsers installed)
            try:
                rag = RAGPipeline.from_case_docs(self.selected_case_id, base_dir=DATA_DIR)
                rag_snips = rag.query(inbound_text, top_k=3)
            except Exception:
                rag_snips = []
        if self.selected_action:
            action = self.selected_action
            self.selected_action = None
            self.action_lbl.configure(text="")
            # Include top snippets if available
            snip_block = "\n\nRelevant excerpts:\n" + "\n".join(f"- {s.file}: {s.text}" for s in rag_snips) if rag_snips else ""
            prompts = {
                "summarize": f"{doc_ctx}Provide a professional legal summary of the following: {text}",
                "redline": f"{doc_ctx}Provide redline suggestions and comments for: {text}",
                "draft": f"{doc_ctx}Draft a professional legal document based on: {text}{snip_block}",
                "explain": f"{doc_ctx}Provide a clear, plain-English explanation of: {text}",
                "compare": f"{doc_ctx}Compare and analyze the following: {text}",
                "research": f"{doc_ctx}Research and provide comprehensive legal analysis on: {text}{snip_block}",
            }
            full_prompt = prompts.get(action, text)
            task_type = action
            is_draft = True
        else:
            snip_block = "\n\nRelevant excerpts:\n" + "\n".join(f"- {s.file}: {s.text}" for s in rag_snips) if rag_snips else ""
            full_prompt = (
                "You are a professional legal AI assistant. Provide helpful, accurate legal guidance while being clear "
                "that this is not formal legal advice. Keep responses professional and concise unless detailed analysis is requested.\n\n"
                f"User question: {inbound_text}{snip_block}"
            )
            task_type = None
            is_draft = False

        # Start generation thread (simple one-shot stream)
        self._chat_stop.clear()

        def work():
            # Lazy-load model
            if not self.llm:
                model = self.model_var.get().strip()
                if not model:
                    self.after(0, lambda: messagebox.showerror("Error", "Choose a GGUF model file first"))
                    return
                try:
                    self.llm = LocalInference(model_path=model)
                except Exception as e:
                    self.after(0, lambda: messagebox.showerror("Error", str(e)))
                    return

            content_acc: list[str] = []
            try:
                for chunk in self.llm.generate(full_prompt, n_predict=512):
                    if self._chat_stop.is_set():
                        break
                    content_acc.append(chunk)
                    if not self.pii_enabled:
                        # Only stream to UI when PII is disabled; otherwise buffer and scrub
                        self.after(0, lambda s=chunk: self._append_ai(s))
            finally:
                content = "".join(content_acc)
                outbound_text = content
                if self.pii_enabled and self.pii_policy:
                    try:
                        outbound_text, ents = self.pii_policy.outbound(content, "en")
                        if self.pii_audit:
                            self.pii_audit.record("outbound", content, outbound_text, ents, "en")
                    except Exception as e:
                        messagebox.showwarning("PII", f"Outbound scrubbing failed, returning raw text: {e}")
                if self.pii_enabled:
                    # Write sanitized text to UI in one go
                    self.after(0, lambda s=outbound_text: self._append_ai(s))
                add_message(
                    self.selected_case_id or "",
                    sender="ai",
                    content=outbound_text or "",
                    message_type="task_result" if task_type else "text",
                    task_type=task_type,
                    is_draft=is_draft,
                )
                # Re-render to ensure order and stamp
                self.after(0, self._render_messages)

        self._append_ai("AI: ")
        self._chat_thread = threading.Thread(target=work, daemon=True)
        self._chat_thread.start()

    # Utils
    def _export_chat(self):
        if not self.selected_case_id:
            return
        if not can_export():
            messagebox.showwarning("Access", "Your role is not permitted to export chats (set BEAR_ROLE).")
            return
        path = filedialog.asksaveasfilename(defaultextension=".txt", filetypes=[("Text", "*.txt"), ("All", "*.*")])
        if not path:
            return
        msgs = list_messages(self.selected_case_id)
        with open(path, "w", encoding="utf-8") as f:
            for m in msgs:
                stamp = m.get("created_date", "")
                sender = "You" if m.get("sender") == "user" else "AI"
                mt = m.get("message_type", "text")
                if mt == "document" and m.get("attachments"):
                    for a in m["attachments"]:
                        f.write(f"[{stamp}] {sender}: (uploaded) {a.get('file_name')}\n")
                else:
                    f.write(f"[{stamp}] {sender}: {m.get('content','')}\n")
        messagebox.showinfo("Exported", f"Saved chat to {path}")

    def _pick_model(self):
        p = filedialog.askopenfilename(filetypes=[("GGUF model", "*.gguf"), ("All files", "*.*")]) or ""
        if p:
            self.model_var.set(p)

    def _setup_pii(self):
        enable_env = os.environ.get("PII_ENABLE", "1")
        audit_env = os.environ.get("PII_AUDIT", "0")
        if Scrubber is None or Policy is None or Audit is None:
            self.pii_enabled = False
            self.pii_status.set("PII: unavailable")
            return
        try:
            scrubber = Scrubber()
            self.pii_policy = Policy(scrubber, require_inbound=True, require_outbound=True)
            self.pii_audit = Audit(enabled=audit_env == "1")
            self.pii_enabled = enable_env == "1"
            self.pii_status.set(f"PII: {'on' if self.pii_enabled else 'off'}")
        except Exception as e:
            self.pii_enabled = False
            self.pii_status.set("PII: error")

    def _toggle_pii(self):
        if self.pii_policy is None:
            self._setup_pii()
            return
        self.pii_enabled = not self.pii_enabled
        self.pii_status.set(f"PII: {'on' if self.pii_enabled else 'off'}")

    def _simple_prompt(self, title: str, prompt: str) -> Optional[str]:
        dlg = tk.Toplevel(self)
        dlg.title(title)
        dlg.resizable(False, False)
        frm = ttk.Frame(dlg, padding=10)
        frm.pack(fill="both", expand=True)
        ttk.Label(frm, text=prompt).pack(anchor="w")
        var = tk.StringVar()
        ent = ttk.Entry(frm, textvariable=var, width=50)
        ent.pack(fill="x", pady=(6, 6))
        ent.focus_set()
        ans = {"value": None}

        def ok():
            ans["value"] = var.get().strip()
            dlg.destroy()

        ttk.Button(frm, text="OK", command=ok).pack(anchor="e")
        dlg.transient(self)
        dlg.grab_set()
        self.wait_window(dlg)
        return ans["value"] or None

    def _today(self) -> str:
        import datetime as _dt

        return _dt.datetime.now().strftime("%Y-%m-%d")
