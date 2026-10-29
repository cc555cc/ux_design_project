#this file setup a HTTP server that listens for the API requests of the sandwich ordering frontend.
#the frontend sends the user message to /api/chat, the server calls the generate_response function from chatbot.py
#to generate a reply and returns it together with the current order state, which drives the sandwich animation.
#see server/API.md for the full list of endpoints.
import json
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse

from routes.chat import handle_chat, handle_reset, handle_session
from routes.menu import handle_menu
from routes.orders import handle_list_orders


HOST = "127.0.0.1"
PORT = 8000

#(method, path) -> handler(payload or query) returning (status code, response body)
ROUTES = {
    ("POST", "/api/chat"): handle_chat,
    ("POST", "/api/chat/reset"): handle_reset,
    ("GET", "/api/session"): handle_session,
    ("GET", "/api/menu"): handle_menu,
    ("GET", "/api/orders"): handle_list_orders,
}


class ApiHandler(BaseHTTPRequestHandler):
    def send_json(self, status, body):
        response_body = json.dumps(body).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(response_body)))
        self.send_cors_headers()
        self.end_headers()
        self.wfile.write(response_body)

    def send_cors_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_cors_headers()
        self.end_headers()

    def do_GET(self):
        url = urlparse(self.path)
        query = {key: values[0] for key, values in parse_qs(url.query).items()}
        self.dispatch("GET", url.path, query)

    def do_POST(self):
        content_length = int(self.headers.get("Content-Length", "0"))
        raw_body = self.rfile.read(content_length)

        try:
            payload = json.loads(raw_body or b"{}")
        except json.JSONDecodeError:
            self.send_json(400, {"error": "Request body must be valid JSON."})
            return

        if not isinstance(payload, dict):
            self.send_json(400, {"error": "Request body must be a JSON object."})
            return

        self.dispatch("POST", urlparse(self.path).path, payload)

    def dispatch(self, method, path, data):
        handler = ROUTES.get((method, path.rstrip("/")))
        if handler is None:
            self.send_json(404, {"error": f"No route for {method} {path}."})
            return

        try:
            status, body = handler(data)
        except Exception as error:
            status, body = 500, {"error": f"Server error: {error}"}

        self.send_json(status, body)


if __name__ == "__main__":
    server = ThreadingHTTPServer((HOST, PORT), ApiHandler)
    print(f"Serving sandwich ordering API at http://{HOST}:{PORT}")
    server.serve_forever()
