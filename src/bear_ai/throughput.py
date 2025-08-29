import time
from collections import deque


class ThroughputMeter:
    """
    Call on_tokens(n) as tokens arrive. Read tokens_per_sec() anytime.
    Uses a moving 2 second window for stability.
    """

    def __init__(self, window_s: float = 2.0):
        self.window_s = window_s
        self.q = deque()  # each entry: (timestamp, tokens)
        self.total_in_window = 0

    def on_tokens(self, n: int):
        now = time.time()
        self.q.append((now, n))
        self.total_in_window += n
        self._evict_old(now)

    def tokens_per_sec(self) -> float:
        now = time.time()
        self._evict_old(now)
        if not self.q:
            return 0.0
        span = max(self.q[-1][0] - self.q[0][0], 1e-6)
        return self.total_in_window / span

    def _evict_old(self, now: float):
        while self.q and now - self.q[0][0] > self.window_s:
            _, n = self.q.popleft()
            self.total_in_window -= n
