#!/usr/bin/env python3
"""
Simple Image Generation Workflow with Pass/Fail QC
"""

import os
import json
import asyncio
import uuid
from datetime import datetime
from pathlib import Path
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse
import urllib.request
import threading


class ImageGenerator:
    """Simple image generator using free APIs or OpenAI"""

    def __init__(self):
        self.api_key = os.getenv("OPENAI_API_KEY", "")
        self.output_dir = Path("/mnt/c/Users/Chris/Documents/_DevProjects/ai-workflow-spc/generated_images")
        self.output_dir.mkdir(exist_ok=True)

    def generate_image(self, prompt: str, attempt: int = 1) -> dict:
        """Generate an image and save locally"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"image_{timestamp}_attempt{attempt}.jpg"
        filepath = self.output_dir / filename

        try:
            # Use Lorem Picsum for free testing (or OpenAI if API key exists)
            if self.api_key and False:  # Set to True to use OpenAI
                # OpenAI implementation here
                pass
            else:
                # Free mock images
                size = 512
                mock_url = f"https://picsum.photos/{size}?random={uuid.uuid4().hex[:8]}"

                with urllib.request.urlopen(mock_url) as response:
                    img_data = response.read()
                    filepath.write_bytes(img_data)

                return {
                    "success": True,
                    "image_path": str(filepath),
                    "prompt": prompt,
                    "attempt": attempt,
                    "provider": "mock"
                }

        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }


class WorkflowState:
    """Manages workflow executions"""

    def __init__(self):
        self.generator = ImageGenerator()
        self.executions = {}
        self.qc_queue = []

    def start_workflow(self, prompt: str) -> str:
        """Start a new workflow execution"""
        execution_id = str(uuid.uuid4())[:8]

        execution = {
            "id": execution_id,
            "prompt": prompt,
            "status": "generating",
            "attempts": [],
            "current_image": None,
            "created_at": datetime.now().isoformat()
        }

        self.executions[execution_id] = execution

        # Generate first image
        self._generate_image(execution_id)

        return execution_id

    def _generate_image(self, execution_id: str):
        """Generate an image for the execution"""
        execution = self.executions[execution_id]
        attempt_num = len(execution["attempts"]) + 1

        result = self.generator.generate_image(execution["prompt"], attempt_num)

        if result["success"]:
            execution["current_image"] = result["image_path"]
            execution["attempts"].append({
                "number": attempt_num,
                "image_path": result["image_path"],
                "status": "pending_qc",
                "generated_at": datetime.now().isoformat()
            })

            # Add to QC queue
            self.qc_queue.append({
                "execution_id": execution_id,
                "attempt": attempt_num,
                "image_path": result["image_path"],
                "prompt": execution["prompt"]
            })

            execution["status"] = "pending_qc"
        else:
            execution["status"] = "error"
            execution["error"] = result.get("error")

    def submit_qc(self, execution_id: str, passed: bool):
        """Submit QC result"""
        if execution_id not in self.executions:
            return False

        execution = self.executions[execution_id]

        # Update current attempt
        if execution["attempts"]:
            current_attempt = execution["attempts"][-1]
            current_attempt["status"] = "passed" if passed else "failed"
            current_attempt["reviewed_at"] = datetime.now().isoformat()

        if passed:
            execution["status"] = "completed"
            execution["final_image"] = execution["current_image"]
        else:
            # Generate new image
            if len(execution["attempts"]) < 5:  # Max 5 attempts
                execution["status"] = "regenerating"
                self._generate_image(execution_id)
            else:
                execution["status"] = "failed_max_attempts"

        # Remove from QC queue
        self.qc_queue = [q for q in self.qc_queue if q["execution_id"] != execution_id]

        return True

    def get_pending_qc(self):
        """Get next QC task"""
        if self.qc_queue:
            return self.qc_queue[0]
        return None

    def get_execution_status(self, execution_id: str):
        """Get execution details"""
        return self.executions.get(execution_id)


# Global workflow state
workflow = WorkflowState()


# API Handler
class APIHandler(BaseHTTPRequestHandler):
    """Simple HTTP API handler"""

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_GET(self):
        url = urlparse(self.path)

        if url.path == '/':
            # Serve the HTML UI
            ui_path = Path(__file__).parent.parent / "ui.html"
            if ui_path.exists():
                self.send_response(200)
                self.send_header('Content-Type', 'text/html')
                self.end_headers()
                with open(ui_path, 'rb') as f:
                    self.wfile.write(f.read())
            else:
                self.send_error(404, "UI file not found")

        elif url.path == '/api':
            self.send_json({
                "message": "Simple Image Workflow API",
                "endpoints": {
                    "start": "POST /workflow/start",
                    "qc_pending": "GET /qc/pending",
                    "qc_submit": "POST /qc/submit",
                    "status": "GET /workflow/{id}/status"
                }
            })

        elif url.path == '/qc/pending':
            task = workflow.get_pending_qc()
            self.send_json({"task": task})

        elif url.path.startswith('/workflow/') and url.path.endswith('/status'):
            execution_id = url.path.split('/')[2]
            status = workflow.get_execution_status(execution_id)
            if status:
                self.send_json(status)
            else:
                self.send_error(404)

        elif url.path.startswith('/image/'):
            # Serve images
            filename = url.path.split('/')[-1]
            filepath = workflow.generator.output_dir / filename
            if filepath.exists():
                self.send_response(200)
                self.send_header('Content-Type', 'image/jpeg')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                with open(filepath, 'rb') as f:
                    self.wfile.write(f.read())
            else:
                self.send_error(404)

        else:
            self.send_error(404)

    def do_POST(self):
        content_length = int(self.headers.get('Content-Length', 0))
        post_data = self.rfile.read(content_length)

        try:
            data = json.loads(post_data) if post_data else {}
        except:
            self.send_error(400, "Invalid JSON")
            return

        if self.path == '/workflow/start':
            prompt = data.get('prompt', 'A beautiful landscape')
            execution_id = workflow.start_workflow(prompt)

            self.send_json({
                "execution_id": execution_id,
                "status": "started",
                "message": "Workflow started, generating image..."
            })

        elif self.path == '/qc/submit':
            execution_id = data.get('execution_id')
            passed = data.get('passed', False)

            if workflow.submit_qc(execution_id, passed):
                self.send_json({
                    "status": "success",
                    "next_action": "completed" if passed else "regenerating"
                })
            else:
                self.send_error(404, "Execution not found")

        else:
            self.send_error(404)

    def send_json(self, data):
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps(data).encode())

    def log_message(self, format, *args):
        # Only log important messages
        try:
            if len(args) > 0 and isinstance(args[0], str) and "image" not in args[0]:
                print(f"{self.address_string()} - {format}" % args)
        except:
            pass  # Suppress logging errors


# Start server
def run_server():
    server = HTTPServer(('localhost', 8001), APIHandler)
    print("\nSimple Image Workflow Server")
    print("============================")
    print("Server running at http://localhost:8001")
    print("\nAPI Endpoints:")
    print("  POST /workflow/start       - Start new workflow")
    print("  GET  /qc/pending          - Get pending QC task")
    print("  POST /qc/submit           - Submit QC decision")
    print("  GET  /workflow/{id}/status - Get workflow status")
    print("\nOpen ui.html in your browser for the visual interface")
    print("\nPress Ctrl+C to stop")

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down...")
        server.shutdown()


if __name__ == "__main__":
    run_server()