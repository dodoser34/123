import sys
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / 'frontend'


class Handler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def send_error(self, code, message=None, explain=None):
        page = ROOT / '404.html'
        if code == 404 and page.is_file():
            body = page.read_bytes()
            self.send_response(404)
            self.send_header('Content-Type', 'text/html; charset=utf-8')
            self.send_header('Content-Length', str(len(body)))
            self.end_headers()
            if self.command != 'HEAD':
                self.wfile.write(body)
            return
        super().send_error(code, message, explain)


class Server(ThreadingHTTPServer):
    request_queue_size = 256
    daemon_threads = True


def main() -> None:
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 5174
    server = Server(('127.0.0.1', port), partial(Handler, directory=str(ROOT)))
    print(f'Сайт: http://localhost:{port}  (остановить — Ctrl+C)')
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == '__main__':
    main()
