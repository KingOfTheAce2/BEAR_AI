import threading
import tkinter as tk
from tkinter import filedialog, messagebox, ttk
from .download import list_files, resolve_selection, download_many
from .logging_utils import audit_log


class App(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("BEAR AI Model Fetcher")
        self.geometry("560x360")

        self.model_var = tk.StringVar()
        self.include_var = tk.StringVar()
        self.dest_var = tk.StringVar(value="models")

        frm = ttk.Frame(self, padding=12)
        frm.pack(fill="both", expand=True)

        ttk.Label(frm, text="Model id").grid(row=0, column=0, sticky="w")
        ttk.Entry(frm, textvariable=self.model_var, width=50).grid(row=0, column=1, columnspan=2, sticky="we")

        ttk.Label(frm, text="Include filter").grid(row=1, column=0, sticky="w")
        ttk.Entry(frm, textvariable=self.include_var, width=50).grid(row=1, column=1, sticky="we")

        ttk.Label(frm, text="Destination").grid(row=2, column=0, sticky="w")
        ttk.Entry(frm, textvariable=self.dest_var, width=40).grid(row=2, column=1, sticky="we")
        ttk.Button(frm, text="Browse", command=self.pick_dest).grid(row=2, column=2)

        self.files_box = tk.Listbox(frm, height=8)
        self.files_box.grid(row=3, column=0, columnspan=3, sticky="nsew", pady=(8, 4))
        frm.rowconfigure(3, weight=1)
        frm.columnconfigure(1, weight=1)

        btns = ttk.Frame(frm)
        btns.grid(row=4, column=0, columnspan=3, sticky="e", pady=(6, 6))
        ttk.Button(btns, text="List files", command=self.on_list).pack(side="left", padx=4)
        ttk.Button(btns, text="Download", command=self.on_download).pack(side="left", padx=4)

        self.progress = ttk.Progressbar(frm, mode="indeterminate")
        self.progress.grid(row=5, column=0, columnspan=3, sticky="we")

        self.status = tk.StringVar(value="Ready")
        ttk.Label(frm, textvariable=self.status).grid(row=6, column=0, columnspan=3, sticky="w")

    def pick_dest(self):
        path = filedialog.askdirectory() or ""
        if path:
            self.dest_var.set(path)

    def set_busy(self, busy: bool):
        if busy:
            self.progress.start(10)
            self.status.set("Working...")
        else:
            self.progress.stop()
            self.status.set("Ready")

    def on_list(self):
        model = self.model_var.get().strip()
        if not model:
            messagebox.showerror("Error", "Enter a model id")
            return

        def work():
            try:
                files = list_files(model)
                self.files_box.delete(0, tk.END)
                for f in files:
                    self.files_box.insert(tk.END, f)
                audit_log("gui_list", {"model_id": model, "count": len(files)})
            except Exception as e:  # pragma: no cover - UI feedback
                messagebox.showerror("Error", str(e))
            finally:
                self.after(0, lambda: self.set_busy(False))

        self.set_busy(True)
        threading.Thread(target=work, daemon=True).start()

    def on_download(self):
        model = self.model_var.get().strip()
        dest = self.dest_var.get().strip()
        include = self.include_var.get().strip() or None
        if not model:
            messagebox.showerror("Error", "Enter a model id")
            return

        def work():
            try:
                files = resolve_selection(model, include=include)
                if not files:
                    messagebox.showinfo("Info", "No files matched. Try List files")
                    return
                # If user selected items in the listbox, use those
                sel = [self.files_box.get(i) for i in self.files_box.curselection()]
                if sel:
                    files = sel
                paths = download_many(model, files, dest)
                messagebox.showinfo("Done", f"Downloaded {len(paths)} file(s) to {dest}")
                audit_log("gui_download", {"model_id": model, "count": len(paths), "dest": dest})
            except Exception as e:  # pragma: no cover - UI feedback
                messagebox.showerror("Error", str(e))
            finally:
                self.after(0, lambda: self.set_busy(False))

        self.set_busy(True)
        threading.Thread(target=work, daemon=True).start()


def main():
    App().mainloop()


if __name__ == "__main__":
    main()
