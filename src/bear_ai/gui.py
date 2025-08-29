"""Simple Tkinter GUI for downloading Hugging Face models.

This minimal interface is part of the BEAR AI scaffolding. It allows users to
enter a model repository ID, select a file, and download it to a chosen
location without using the command line.
"""

from __future__ import annotations

import tkinter as tk
from tkinter import ttk, filedialog, messagebox
from pathlib import Path

from .model_downloader import download_model, list_model_files


class DownloaderApp:
    """Basic model downloader GUI."""

    def __init__(self, root: tk.Tk) -> None:
        self.root = root
        self.root.title("BEAR AI Model Downloader")

        self.model_var = tk.StringVar(root)
        self.file_var = tk.StringVar(root)
        self.dest_var = tk.StringVar(root, value="models")

        main = ttk.Frame(root, padding=10)
        main.grid(column=0, row=0, sticky="nsew")

        ttk.Label(main, text="Model ID:").grid(row=0, column=0, sticky="w")
        ttk.Entry(main, textvariable=self.model_var, width=40).grid(
            row=0, column=1, columnspan=2, sticky="ew"
        )

        ttk.Label(main, text="Filename:").grid(row=1, column=0, sticky="w")
        ttk.Entry(main, textvariable=self.file_var, width=40).grid(
            row=1, column=1, columnspan=2, sticky="ew"
        )

        ttk.Label(main, text="Destination:").grid(row=2, column=0, sticky="w")
        ttk.Entry(main, textvariable=self.dest_var, width=30).grid(
            row=2, column=1, sticky="ew"
        )
        ttk.Button(main, text="Browse", command=self.browse_dest).grid(
            row=2, column=2, sticky="w"
        )

        ttk.Button(main, text="List Files", command=self.list_files).grid(
            row=3, column=0, pady=5
        )
        ttk.Button(main, text="Download", command=self.download).grid(
            row=3, column=2, pady=5, sticky="e"
        )

    def browse_dest(self) -> None:
        directory = filedialog.askdirectory(initialdir=self.dest_var.get() or ".")
        if directory:
            self.dest_var.set(directory)

    def list_files(self) -> None:
        try:
            files = list_model_files(self.model_var.get())
            message = "\n".join(files) if files else "No files found."
            messagebox.showinfo("Available files", message)
        except Exception as exc:  # pragma: no cover - UI feedback
            messagebox.showerror("Error", str(exc))

    def download(self) -> None:
        try:
            path = download_model(
                self.model_var.get(),
                self.file_var.get(),
                Path(self.dest_var.get()),
            )
            messagebox.showinfo("Success", f"Model downloaded to {path}")
        except Exception as exc:  # pragma: no cover - UI feedback
            messagebox.showerror("Error", str(exc))


def main() -> None:
    """Launch the Tkinter application."""
    root = tk.Tk()
    DownloaderApp(root)
    root.mainloop()


if __name__ == "__main__":  # pragma: no cover - manual launch
    main()
