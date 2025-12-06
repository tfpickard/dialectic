from http.server import BaseHTTPRequestHandler
import json
import time
import sys
import os

# Add parent directory to path to import shared module
sys.path.insert(0, os.path.dirname(__file__))
from _shared import init_db, get_room_messages, save_message, generate_agent_reply, detect_stalemate

class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        """Handle POST request for debate step."""
        try:
            content_length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(content_length).decode()
            data = json.loads(body)

            room_id = data.get("room_id")
            user_prompt = data.get("user_prompt")

            if not room_id:
                self.send_response(400)
                self.send_header("Content-type", "application/json")
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                self.wfile.write(json.dumps({"error": "room_id required"}).encode())
                return

            init_db()

            # Get current messages
            messages = get_room_messages(room_id)
            new_messages = []

            # If user prompt provided, add it as a message
            if user_prompt:
                user_message = {
                    "id": f"user_{int(time.time() * 1000)}",
                    "author": "user",
                    "content": user_prompt,
                    "timestamp": int(time.time() * 1000)
                }
                save_message(room_id, user_message)
                messages.append(user_message)
                # Note: we don't include user message in new_messages because frontend adds it optimistically

            # Generate Alpha's reply
            alpha_content = generate_agent_reply("alpha", room_id, messages, user_prompt)
            alpha_message = {
                "id": f"alpha_{int(time.time() * 1000)}",
                "author": "alpha",
                "content": alpha_content,
                "timestamp": int(time.time() * 1000)
            }
            save_message(room_id, alpha_message)
            messages.append(alpha_message)
            new_messages.append(alpha_message)

            # Small delay to avoid timestamp collision
            time.sleep(0.1)

            # Generate Beta's reply
            beta_content = generate_agent_reply("beta", room_id, messages)
            beta_message = {
                "id": f"beta_{int(time.time() * 1000)}",
                "author": "beta",
                "content": beta_content,
                "timestamp": int(time.time() * 1000)
            }
            save_message(room_id, beta_message)
            new_messages.append(beta_message)

            result = {
                "newMessages": new_messages,
                "stalemate_detected": detect_stalemate(messages)
            }

            self.send_response(200)
            self.send_header("Content-type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(json.dumps(result).encode())

        except Exception as e:
            print(f"Error in step handler: {str(e)}")
            import traceback
            traceback.print_exc()
            self.send_response(500)
            self.send_header("Content-type", "application/json")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(json.dumps({"error": str(e)}).encode())

    def do_OPTIONS(self):
        """Handle CORS preflight request."""
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()
