import os
import sys

from bear_ai import security


def test_enable_cuda_sets_env(monkeypatch):
    class FakeNvml:
        @staticmethod
        def nvmlInit():
            pass

        @staticmethod
        def nvmlDeviceGetCount():
            return 1

        @staticmethod
        def nvmlShutdown():
            pass

    monkeypatch.setitem(sys.modules, 'pynvml', FakeNvml)
    monkeypatch.delenv('LLAMA_CPP_USE_CUDA', raising=False)

    assert security.enable_cuda() is True
    assert os.environ.get('LLAMA_CPP_USE_CUDA') == '1'
