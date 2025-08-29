from pathlib import Path
from unittest.mock import patch

from bear_ai.__main__ import main


def test_cli_lists_files(capsys):
    with patch("bear_ai.__main__.list_model_files") as mock_list:
        mock_list.return_value = ["a.gguf", "b.gguf"]
        main(["owner/repo", "--list"])
        mock_list.assert_called_once_with("owner/repo")
    captured = capsys.readouterr()
    assert "a.gguf" in captured.out
    assert "b.gguf" in captured.out


@patch("bear_ai.__main__.download_model")
def test_cli_downloads_model(mock_download, tmp_path: Path, capsys):
    mock_download.return_value = tmp_path / "model.gguf"
    main(["owner/repo", "model.gguf", "--dest", str(tmp_path)])
    mock_download.assert_called_once_with("owner/repo", "model.gguf", destination=tmp_path)
    captured = capsys.readouterr()
    assert f"Model downloaded to {tmp_path / 'model.gguf'}" in captured.out
