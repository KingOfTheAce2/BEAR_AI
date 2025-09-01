import threading
import time
import subprocess
import sys
import tkinter as tk
from tkinter import ttk, filedialog, messagebox

BEAR_ICON_PNG = (
    "iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAGUlEQVR4nGNYqqX1"
    "nxLMMGrAqAGjBgwXAwB5AfgQKHmRIgAAAABJRU5ErkJggg=="
)

from .download import list_files_with_sizes, resolve_selection, download_many
from .logging_utils import audit_log
from .hw import hw_summary
from .model_compat import combined_fit
from .throughput import ThroughputMeter
from .inference import LocalInference


class App(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("BEAR AI")
        # Larger default window for high-DPI laptops
        self.geometry("900x640")
        # Optional app icon embedded directly in the source to avoid shipping
        # a separate binary file. If image creation fails (e.g., a headless
        # environment), the default Tk icon is used.
        try:
            self._icon = tk.PhotoImage(data=BEAR_ICON_PNG)
            self.iconphoto(True, self._icon)
        except Exception:
            pass

        self.model_var = tk.StringVar()
        self.include_var = tk.StringVar()
        self.dest_var = tk.StringVar(value="models")
        self.speed_var = tk.StringVar(value="Speed: 0.0 tok/s")
        # Chat controls
        self.chat_model_var = tk.StringVar()
        self.chat_status_var = tk.StringVar(value="Idle")

        # Main notebook with two tabs: Models and Chat
        container = ttk.Frame(self, padding=12)
        container.pack(fill="both", expand=True)
        nb = ttk.Notebook(container)
        nb.pack(fill="both", expand=True)

        # --- Models tab ---
        tab_models = ttk.Frame(nb)
        nb.add(tab_models, text="Models")

        row0 = ttk.Frame(tab_models)
        row0.pack(fill="x", pady=(8, 8))
        ttk.Label(row0, text="Model id").pack(side="left")
        ttk.Entry(row0, textvariable=self.model_var, width=60).pack(side="left", padx=6)
        ttk.Label(row0, text="Include").pack(side="left")
        ttk.Entry(row0, textvariable=self.include_var, width=20).pack(side="left", padx=6)

        row1 = ttk.Frame(tab_models)
        row1.pack(fill="x", pady=(0, 8))
        ttk.Label(row1, text="Destination").pack(side="left")
        ttk.Entry(row1, textvariable=self.dest_var, width=50).pack(side="left", padx=6)
        ttk.Button(row1, text="Browse", command=self.pick_dest).pack(side="left")

        btns = ttk.Frame(tab_models)
        btns.pack(fill="x", pady=(0, 8))
        ttk.Button(btns, text="Assess & List", command=self.on_assess).pack(side="left")
        ttk.Button(btns, text="Download selected", command=self.on_download).pack(side="left", padx=6)
        ttk.Button(btns, text="Run speed benchmark", command=self.on_benchmark).pack(side="left", padx=6)

        columns = ("file", "size_gb", "fit", "hint")
        self.table = ttk.Treeview(tab_models, columns=columns, show="headings", height=14)
        self.table.heading("file", text="File")
        self.table.heading("size_gb", text="Size (GB)")
        self.table.heading("fit", text="Fit")
        self.table.heading("hint", text="Path")
        self.table.column("file", width=500, anchor="w")
        self.table.column("size_gb", width=90, anchor="e")
        self.table.column("fit", width=90, anchor="center")
        self.table.column("hint", width=120, anchor="center")
        self.table.pack(fill="both", expand=True)

        status = ttk.Frame(tab_models)
        status.pack(fill="x", pady=(6, 6))
        self.progress = ttk.Progressbar(status, mode="indeterminate")
        self.progress.pack(side="left", fill="x", expand=True, padx=(0, 8))
        ttk.Label(status, textvariable=self.speed_var).pack(side="right")

        self._busy = False

        # --- Chat tab ---
        tab_chat = ttk.Frame(nb)
        nb.add(tab_chat, text="Chat")
        chat = tab_chat

        rowc0 = ttk.Frame(chat)
        rowc0.pack(fill="x", pady=(0, 6))
        ttk.Label(rowc0, text="GGUF model").pack(side="left")
        ttk.Entry(rowc0, textvariable=self.chat_model_var, width=56).pack(side="left", padx=6)
        ttk.Button(rowc0, text="Browse", command=self.pick_chat_model).pack(side="left")
        ttk.Label(rowc0, textvariable=self.chat_status_var).pack(side="right")

        rowc1 = ttk.Frame(chat)
        rowc1.pack(fill="both", expand=True)
        # Prompt and output side-by-side
        prompt_box = ttk.Frame(rowc1)
        prompt_box.pack(side="left", fill="both", expand=True, padx=(0, 4))
        ttk.Label(prompt_box, text="Prompt").pack(anchor="w")
        self.prompt_text = tk.Text(prompt_box, height=6, wrap="word")
        self.prompt_text.pack(fill="both", expand=True)

        output_box = ttk.Frame(rowc1)
        output_box.pack(side="left", fill="both", expand=True, padx=(4, 0))
        ttk.Label(output_box, text="Response").pack(anchor="w")
        self.output_text = tk.Text(output_box, height=10, wrap="word")
        self.output_text.pack(fill="both", expand=True)

        rowc2 = ttk.Frame(chat)
        rowc2.pack(fill="x", pady=(6, 0))
        self.btn_start = ttk.Button(rowc2, text="Start Chat", command=self.on_chat_start)
        self.btn_start.pack(side="left")
        self.btn_stop = ttk.Button(rowc2, text="Stop", command=self.on_chat_stop, state="disabled")
        self.btn_stop.pack(side="left", padx=(6, 0))
        ttk.Button(rowc2, text="Clear", command=self.on_chat_clear).pack(side="left", padx=(6, 0))
        # Mirror speed meter on chat tab for clarity
        ttk.Label(rowc2, textvariable=self.speed_var).pack(side="right")

        # Chat state
        self._chat_thread = None
        self._chat_stop = threading.Event()
        self._chat_meter = ThroughputMeter()

    def pick_dest(self):
        path = filedialog.askdirectory() or ""
        if path:
            self.dest_var.set(path)

    def pick_chat_model(self):
        p = filedialog.askopenfilename(filetypes=[("GGUF model", "*.gguf"), ("All files", "*.*")]) or ""
        if p:
            self.chat_model_var.set(p)

    def set_busy(self, busy: bool):
        self._busy = busy
        if busy:
            self.progress.start(10)
        else:
            self.progress.stop()

    def on_assess(self):
        model = self.model_var.get().strip()
        if not model:
            messagebox.showerror("Error", "Enter a model id")
            return

        def work():
            try:
                hw = hw_summary()
                files = list_files_with_sizes(model)
                self.table.delete(*self.table.get_children())
                for f in files:
                    size_gb = round(f["size_bytes"] / (1024**3), 2)
                    fit, hint = combined_fit(size_gb, hw["free_ram_gb"], hw["gpu_vram_gb"], f["name"])
                    self.table.insert("", "end", values=(f["name"], f"{size_gb:.2f}", fit, hint))
                audit_log("gui_assess", {"model_id": model, "count": len(files)})
            except Exception as e:
                messagebox.showerror("Error", str(e))
            finally:
                self.after(0, lambda: self.set_busy(False))

        self.set_busy(True)
        threading.Thread(target=work, daemon=True).start()

    def on_download(self):
        model = self.model_var.get().strip()
        dest = self.dest_var.get().strip()
        if not model:
            messagebox.showerror("Error", "Enter a model id")
            return
        selected = [self.table.item(i, "values")[0] for i in self.table.selection()]
        include = self.include_var.get().strip() or None

        def work():
            try:
                files = selected or [self.table.item(i, "values")[0] for i in self.table.get_children()]
                if not selected and include:
                    # If user did not select rows but typed an include filter, re-resolve
                    files = resolve_selection(model, include=include)
                if not files:
                    messagebox.showinfo("Info", "No files selected or matched")
                    return
                paths = download_many(model, files, dest)
                messagebox.showinfo("Done", f"Downloaded {len(paths)} file(s) to {dest}")
                audit_log("gui_download", {"model_id": model, "count": len(paths), "dest": dest})
            except Exception as e:
                messagebox.showerror("Error", str(e))
            finally:
                self.after(0, lambda: self.set_busy(False))

        self.set_busy(True)
        threading.Thread(target=work, daemon=True).start()

    def on_benchmark(self):
        """
        Synthetic token stream for the speed meter.
        Replace with real callbacks from inference when available.
        """

        def work():
            start = time.time()
            tokens = 0
            self.after(0, lambda: self.speed_var.set("Speed: 0.0 tok/s"))
            for _ in range(20):  # 20 windows of streaming
                # Simulate variable chunk sizes and delays
                chunk = 20 + (_ % 7)
                tokens += chunk
                time.sleep(0.15)
                elapsed = time.time() - start
                tps = tokens / max(elapsed, 1e-6)
                self.after(0, lambda v=tps: self.speed_var.set(f"Speed: {v:.1f} tok/s"))
            self.after(
                0,
                lambda: audit_log("gui_benchmark", {"tps": round(tokens / (time.time() - start), 2)}),
            )

        if self._busy:
            return
        threading.Thread(target=work, daemon=True).start()

    # --- Chat ---
    def on_chat_start(self):
        if self._chat_thread and self._chat_thread.is_alive():
            return
        model = self.chat_model_var.get().strip()
        if not model:
            messagebox.showerror("Error", "Choose a GGUF model file first")
            return
        prompt = self.prompt_text.get("1.0", "end").strip()
        if not prompt:
            messagebox.showerror("Error", "Enter a prompt to start")
            return

        self.output_text.delete("1.0", "end")
        self._chat_stop.clear()
        self._chat_meter = ThroughputMeter()
        self.btn_start.configure(state="disabled")
        self.btn_stop.configure(state="normal")
        self.chat_status_var.set("Loading model...")

        def work():
            try:
                llm = LocalInference(model_path=model)
            except Exception as e:
                msg = str(e)
                # Attempt an in-app install of llama-cpp-python (CPU wheel) if missing
                if "llama-cpp-python" in msg:
                    self.after(0, lambda: self.chat_status_var.set("Installing llama runtime (CPU)..."))
                    try:
                        # Try official prebuilt CPU wheels first
                        cmd1 = [
                            sys.executable,
                            "-m",
                            "pip",
                            "install",
                            "--retries",
                            "3",
                            "--timeout",
                            "60",
                            "--extra-index-url",
                            "https://abetlen.github.io/llama-cpp-python/whl/cpu",
                            "llama-cpp-python",
                        ]
                        subprocess.run(cmd1, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
                        # Retry initialization after install
                        try:
                            llm = LocalInference(model_path=model)
                        except Exception as e2:
                            # Second attempt: force wheels from PyPI
                            cmd2 = [
                                sys.executable,
                                "-m",
                                "pip",
                                "install",
                                "--only-binary=:all:",
                                "llama-cpp-python",
                            ]
                            subprocess.run(cmd2, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
                            llm = LocalInference(model_path=model)
                    except Exception:
                        def show_help():
                            messagebox.showerror(
                                "Error",
                                "Failed to install llama-cpp-python automatically.\n\n"
                                "Try one of these commands in PowerShell (from the project folder):\n\n"
                                ".\\.venv\\Scripts\\python.exe -m pip install --extra-index-url "
                                "https://abetlen.github.io/llama-cpp-python/whl/cpu llama-cpp-python\n"
                                ".\\.venv\\Scripts\\python.exe -m pip install --only-binary=:all: llama-cpp-python"
                            )
                        self.after(0, show_help)
                        self.after(0, self._chat_reset_idle)
                        return
                else:
                    self.after(0, lambda: messagebox.showerror("Error", msg))
                    self.after(0, self._chat_reset_idle)
                    return

            self.after(0, lambda: self.chat_status_var.set("Generating..."))
            try:
                for tok in llm.generate(prompt):
                    if self._chat_stop.is_set():
                        break
                    self._chat_meter.on_tokens(len(tok))
                    tps = self._chat_meter.tokens_per_sec()
                    self.after(0, lambda s=tok: self.output_text.insert("end", s))
                    self.after(0, lambda v=tps: self.speed_var.set(f"Speed: {v:.1f} tok/s"))
            finally:
                self.after(0, self._chat_reset_idle)
                audit_log("gui_chat", {"model": model})

        self._chat_thread = threading.Thread(target=work, daemon=True)
        self._chat_thread.start()

    def _chat_reset_idle(self):
        self.btn_start.configure(state="normal")
        self.btn_stop.configure(state="disabled")
        self.chat_status_var.set("Idle")

    def on_chat_stop(self):
        self._chat_stop.set()

    def on_chat_clear(self):
        self.output_text.delete("1.0", "end")


def main():
    App().mainloop()


if __name__ == "__main__":
    main()
