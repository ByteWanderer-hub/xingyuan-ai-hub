"""Cross-process exclusion and exception release, without image dependencies."""
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

SCRIPTS = Path(__file__).resolve().parents[1] / "scripts"
WORKER = """
import sys, time
from pathlib import Path
sys.path.insert(0, sys.argv[1])
from agent_orchestration import locked
root = Path(sys.argv[2])
if sys.argv[3] == 'raise':
    try:
        with locked(root / 'counter.lock'):
            raise ValueError('synthetic failure inside lock')
    except ValueError:
        pass
for _ in range(10):
    with locked(root / 'counter.lock'):
        path = root / 'counter.txt'
        count = int(path.read_text(encoding='utf-8'))
        time.sleep(0.005)
        path.write_text(str(count + 1), encoding='utf-8')
"""


class FileLockTests(unittest.TestCase):
    def test_processes_serialize_and_exception_releases_lock(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            (root / "counter.txt").write_text("0", encoding="utf-8")
            workers = [subprocess.Popen(
                [sys.executable, "-B", "-c", WORKER, str(SCRIPTS), folder, mode],
                stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True,
            ) for mode in ("raise", "normal", "normal")]
            try:
                for worker in workers:
                    _, error = worker.communicate(timeout=15)
                    self.assertEqual(worker.returncode, 0, error)
                self.assertEqual((root / "counter.txt").read_text(encoding="utf-8"), "30")
            finally:
                for worker in workers:
                    if worker.poll() is None:
                        worker.kill()
                        worker.communicate()
