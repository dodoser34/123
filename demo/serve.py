import importlib.util
import sys
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parent


def main():
    spec = importlib.util.spec_from_file_location('demo_builder', ROOT / 'build.py')
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    print(module.build(), flush=True)
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 5175

    class Handler(SimpleHTTPRequestHandler):
        def end_headers(self):
            self.send_header('Cache-Control', 'no-store')
            super().end_headers()

    class Server(ThreadingHTTPServer):
        request_queue_size = 256
        daemon_threads = True

    server = Server(('127.0.0.1', port), partial(Handler, directory=str(module.OUTPUT)))
    print(f'Демо: http://localhost:{port}  (остановить — Ctrl+C)', flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == '__main__':
    main()
