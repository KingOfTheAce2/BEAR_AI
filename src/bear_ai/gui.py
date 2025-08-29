import threading
import time
import tkinter as tk
from tkinter import ttk, filedialog, messagebox

from .download import list_files_with_sizes, resolve_selection, download_many
from .logging_utils import audit_log
from .hw import hw_summary
from .model_compat import combined_fit


class App(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("BEAR AI Model Fetcher")
        self.geometry("760x480")

        self.model_var = tk.StringVar()
        self.include_var = tk.StringVar()
        self.dest_var = tk.StringVar(value="models")
        self.speed_var = tk.StringVar(value="Speed: 0.0 tok/s")

        top = ttk.Frame(self, padding=12)
        top.pack(fill="both", expand=True)

        # Inputs
        row0 = ttk.Frame(top)
        row0.pack(fill="x", pady=(0, 8))
        ttk.Label(row0, text="Model id").pack(side="left")
        ttk.Entry(row0, textvariable=self.model_var, width=60).pack(side="left", padx=6)
        ttk.Label(row0, text="Include").pack(side="left")
        ttk.Entry(row0, textvariable=self.include_var, width=20).pack(side="left", padx=6)

        row1 = ttk.Frame(top)
        row1.pack(fill="x", pady=(0, 8))
        ttk.Label(row1, text="Destination").pack(side="left")
        ttk.Entry(row1, textvariable=self.dest_var, width=50).pack(side="left", padx=6)
        ttk.Button(row1, text="Browse", command=self.pick_dest).pack(side="left")

        # Buttons
        btns = ttk.Frame(top)
        btns.pack(fill="x", pady=(0, 8))
        ttk.Button(btns, text="Assess & List", command=self.on_assess).pack(side="left")
        ttk.Button(btns, text="Download selected", command=self.on_download).pack(side="left", padx=6)
        ttk.Button(btns, text="Run speed benchmark", command=self.on_benchmark).pack(side="left", padx=6)

        # Table
        columns = ("file", "size_gb", "fit", "hint")
        self.table = ttk.Treeview(top, columns=columns, show="headings", height=12)
        self.table.heading("file", text="File")
        self.table.heading("size_gb", text="Size (GB)")
        self.table.heading("fit", text="Fit")
        self.table.heading("hint", text="Path")
        self.table.column("file", width=460, anchor="w")
        self.table.column("size_gb", width=90, anchor="e")
        self.table.column("fit", width=90, anchor="center")
        self.table.column("hint", width=100, anchor="center")
        self.table.pack(fill="both", expand=True)

        # Status
        status = ttk.Frame(top)
        status.pack(fill="x")
        self.progress = ttk.Progressbar(status, mode="indeterminate")
        self.progress.pack(side="left", fill="x", expand=True, padx=(0, 8))
        ttk.Label(status, textvariable=self.speed_var).pack(side="right")

        self._busy = False

    def pick_dest(self):
        path = filedialog.askdirectory() or ""
        if path:
            self.dest_var.set(path)

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
                files = selected or [v[0] for v in [self.table.item(i, "values") for i in self.table.get_children()]]
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


def main():
    App().mainloop()


if __name__ == "__main__":
    main()
