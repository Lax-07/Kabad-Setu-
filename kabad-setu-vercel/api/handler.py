"""Vercel's Python HTTP entrypoint. Never start a listening server here."""
import threading
from urllib.parse import urlparse, parse_qs, urlencode
from server import Handler, init_db

_ready = False
_lock = threading.Lock()


class handler(Handler):
    def route(self):
        parsed = urlparse(self.path)
        query = parse_qs(parsed.query, keep_blank_values=True)
        route = query.pop("_route", [None])[0]
        if route is not None:
            self.path = "/api/" + route + ("?" + urlencode(query, doseq=True) if query else "")

    def ready(self):
        global _ready
        try:
            with _lock:
                if not _ready:
                    init_db()
                    _ready = True
            return True
        except Exception:
            # Keep credentials and database error details out of public responses.
            self.respond({'error': 'Database unavailable. Check DATABASE_URL and the deployment configuration.'}, 503)
            return False

    def do_GET(self):
        if self.ready():
            self.route()
            super().do_GET()

    def do_POST(self):
        if self.ready():
            self.route()
            super().do_POST()
