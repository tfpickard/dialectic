from http.server import BaseHTTPRequestHandler
import json
from urllib.parse import urlparse, parse_qs
import sys
import os

# Add parent directory to path to import shared module
sys.path.insert(0, os.path.dirname(__file__))
from _shared import init_db, get_room_messages

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        """Handle GET request for debate history."""
        try:
            parsed_url = urlparse(self.path)
            query_params = parse_qs(parsed_url.query)
            room_id = query_params.get("room_id", [""])[0]

            if not room_id:
                self.send_response(400)
                self.send_header("Content-type", "application/json")
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                self.wfile.write(json.dumps({"error": "room_id required"}).encode())
                return

            init_db()
            messages = get_room_messages(room_id)

            result = {
                "messages": messages,
                "room_id": room_id
            }

            self.send_response(200)
            self.send_header("Content-type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(json.dumps(result).encode())

        except Exception as e:
            print(f"Error in history handler: {str(e)}")
            self.send_response(500)
            self.send_header("Content-type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(json.dumps({"error": str(e)}).encode())

    def do_OPTIONS(self):
        """Handle CORS preflight request."""
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()
