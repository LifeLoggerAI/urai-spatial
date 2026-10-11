"""Serve an existing static build locally with canonical 404s and no listings."""
import argparse
import functools
import http.server
import json
from pathlib import Path
from urllib.parse import urlsplit


class PreviewHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, directory, **kwargs):
        self.output = Path(directory).resolve()
        proof = json.loads((self.output / "api/system/deploy-proof").read_text())
        self.disabled = {entry["route"] for entry in proof["conditionalRoutes"] if not entry["enabled"]}
        super().__init__(*args, directory=str(self.output), **kwargs)

    def send_head(self):
        pathname = urlsplit(self.path).path.rstrip("/") or "/"
        if pathname in self.disabled:
            self.send_error(404)
            return None
        return super().send_head()

    def list_directory(self, path):
        self.send_error(404)
        return None

    def send_error(self, code, message=None, explain=None):
        page = self.output / "404.html"
        if code != 404 or not page.is_file():
            return super().send_error(code, message, explain)
        body = page.read_bytes()
        self.send_response(404)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        if self.command != "HEAD":
            self.wfile.write(body)

    def end_headers(self):
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Referrer-Policy", "no-referrer")
        self.send_header("Content-Security-Policy", "base-uri 'self'; object-src 'none'; frame-ancestors 'self'")
        super().end_headers()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--directory", default="urai-tier1/out")
    parser.add_argument("--port", type=int, default=3000)
    args = parser.parse_args()
    handler = functools.partial(PreviewHandler, directory=args.directory)
    with http.server.ThreadingHTTPServer(("127.0.0.1", args.port), handler) as server:
        print(f"Local review: http://127.0.0.1:{args.port}/home/?demo=1", flush=True)
        server.serve_forever()
