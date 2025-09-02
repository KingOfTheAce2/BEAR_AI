PyInstaller Spec Builds

Build using spec files to bundle spaCy/Presidio resources for offline EXEs.

Prereqs (inside a clean venv):
- pip install -e .[hw,inference]
- pip install pyinstaller presidio-analyzer presidio-anonymizer spacy
- python -m spacy download en_core_web_lg
- python -m spacy download nl_core_news_lg

Build commands:
- pyinstaller packaging/pyinstaller/bear-ai.spec
- pyinstaller packaging/pyinstaller/bear-chat.spec
- pyinstaller packaging/pyinstaller/bear-scrub.spec

Outputs are in dist/ as bear-ai.exe, bear-chat.exe, bear-scrub.exe.

Notes:
- These spec files attempt to collect model/data files for spaCy and Presidio. If you trim languages or models, remove the corresponding collect_data_files entries to reduce size.
- For GUI apps, add console=False in the EXE(...) section to hide the console.

