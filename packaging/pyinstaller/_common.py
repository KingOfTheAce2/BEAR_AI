from PyInstaller.utils.hooks import collect_data_files, collect_submodules


def collect_presidio_spacy_datas_and_hiddenimports():
    datas = []
    hiddenimports = []

    # spaCy language models (optional, if installed)
    for pkg in ("en_core_web_lg", "nl_core_news_lg"):
        try:
            datas += collect_data_files(pkg)
        except Exception:
            pass

    # spaCy base resources (configs, tokenizers, etc.)
    try:
        datas += collect_data_files("spacy")
    except Exception:
        pass

    # Presidio resources
    for pkg in ("presidio_analyzer", "presidio_anonymizer"):
        try:
            datas += collect_data_files(pkg)
            hiddenimports += collect_submodules(pkg)
        except Exception:
            pass

    return datas, hiddenimports

