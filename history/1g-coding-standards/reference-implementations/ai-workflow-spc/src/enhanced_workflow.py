#!/usr/bin/env python3
"""
Enhanced Workflow Engine with Multiple MCP Components
Supports image generation, video generation, lip sync, and more
"""

import os
import sys
import json
import asyncio
import uuid
from datetime import datetime
from pathlib import Path
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse
import threading

# Add parent directory to path
sys.path.append(str(Path(__file__).parent))

# Import our MCP servers
from mcp_servers.binary_blender_mcp import BinaryBlenderMCP, SimpleMCPServer


class WorkflowNode:
    """Represents a node in the workflow"""

    def __init__(self, id: str, node_type: str, name: str, config: dict = None):
        self.id = id
        self.type = node_type  # 'input', 'mcp', 'qc', 'output'
        self.name = name
        self.config = config or {}
        self.inputs = []
        self.outputs = []


class WorkflowState:
    """Manages workflow execution state"""

    def __init__(self):
        self.executions = {}
        self.qc_queue = []
        self.mcp_servers = {}
        self._init_mcp_servers()

    def _init_mcp_servers(self):
        """Initialize available MCP servers"""
        # Binary Blender MCP (image, video, lipsync)
        bb_handler = BinaryBlenderMCP()
        self.mcp_servers["binary-blender"] = SimpleMCPServer(bb_handler)

    def create_workflow(self, workflow_def: dict) -> str:
        """Create a new workflow from definition"""
        execution_id = str(uuid.uuid4())[:8]

        execution = {
            "id": execution_id,
            "workflow": workflow_def,
            "status": "running",
            "current_node": None,
            "data": {},
            "created_at": datetime.now().isoformat()
        }

        self.executions[execution_id] = execution
        return execution_id

    async def execute_workflow(self, execution_id: str):
        """Execute a workflow"""
        execution = self.executions[execution_id]
        workflow = execution["workflow"]

        # Find start node
        start_node = None
        for node in workflow["nodes"]:
            if node["type"] == "input":
                start_node = node
                break

        if not start_node:
            execution["status"] = "error"
            execution["error"] = "No input node found"
            return

        # Execute from start node
        await self._execute_node(execution_id, start_node)

    async def _execute_node(self, execution_id: str, node: dict):
        """Execute a single node"""
        execution = self.executions[execution_id]
        execution["current_node"] = node["id"]

        node_type = node["type"]

        if node_type == "input":
            # Pass through input data
            execution["data"][node["id"]] = execution["data"].get("input", {})

        elif node_type == "mcp":
            # Execute MCP component
            result = await self._execute_mcp_node(execution, node)
            execution["data"][node["id"]] = result

        elif node_type == "qc":
            # Create QC task
            qc_task = {
                "execution_id": execution_id,
                "node_id": node["id"],
                "data": self._get_node_input_data(execution, node),
                "config": node.get("config", {})
            }
            self.qc_queue.append(qc_task)
            execution["status"] = "waiting_qc"
            return  # Stop until QC complete

        elif node_type == "output":
            # Store final output
            execution["data"]["output"] = self._get_node_input_data(execution, node)
            execution["status"] = "completed"
            return

        # Continue to next nodes
        for next_node_id in node.get("outputs", []):
            next_node = self._find_node(execution["workflow"], next_node_id)
            if next_node:
                await self._execute_node(execution_id, next_node)

    async def _execute_mcp_node(self, execution: dict, node: dict) -> dict:
        """Execute an MCP component"""
        mcp_server_name = node["config"].get("mcp_server", "binary-blender")
        mcp_server = self.mcp_servers.get(mcp_server_name)

        if not mcp_server:
            return {"error": f"Unknown MCP server: {mcp_server_name}"}

        # Get input data
        input_data = self._get_node_input_data(execution, node)

        # Merge with node config
        tool_name = node["config"].get("tool")
        tool_args = {**node["config"].get("args", {}), **input_data}

        # Call MCP tool
        result = await mcp_server.handle_request({
            "method": "tools/call",
            "params": {
                "name": tool_name,
                "arguments": tool_args
            }
        })

        return result.get("content", {})

    def _get_node_input_data(self, execution: dict, node: dict) -> dict:
        """Get input data for a node"""
        combined_data = {}

        for input_node_id in node.get("inputs", []):
            if input_node_id in execution["data"]:
                data = execution["data"][input_node_id]
                if isinstance(data, dict):
                    combined_data.update(data)
                else:
                    combined_data[input_node_id] = data

        return combined_data

    def _find_node(self, workflow: dict, node_id: str) -> dict:
        """Find a node by ID"""
        for node in workflow["nodes"]:
            if node["id"] == node_id:
                return node
        return None

    def submit_qc(self, execution_id: str, node_id: str, passed: bool, data: dict = None):
        """Submit QC result"""
        execution = self.executions.get(execution_id)
        if not execution:
            return False

        # Store QC result
        if data:
            execution["data"][node_id] = data
        else:
            execution["data"][node_id] = {"passed": passed}

        # Remove from queue
        self.qc_queue = [q for q in self.qc_queue
                        if not (q["execution_id"] == execution_id and q["node_id"] == node_id)]

        # Continue workflow
        if passed:
            execution["status"] = "running"
            node = self._find_node(execution["workflow"], node_id)
            if node:
                # Continue execution asynchronously
                asyncio.create_task(self._continue_from_node(execution_id, node))
        else:
            # Handle failure - could retry or go to error node
            execution["status"] = "qc_failed"

        return True

    async def _continue_from_node(self, execution_id: str, node: dict):
        """Continue workflow execution from a node"""
        execution = self.executions[execution_id]

        # Continue to next nodes
        for next_node_id in node.get("outputs", []):
            next_node = self._find_node(execution["workflow"], next_node_id)
            if next_node:
                await self._execute_node(execution_id, next_node)

    def get_pending_qc(self):
        """Get pending QC tasks"""
        return self.qc_queue

    def get_execution_status(self, execution_id: str):
        """Get execution status"""
        return self.executions.get(execution_id)


# Global workflow state
workflow_state = WorkflowState()


# API Handler
class APIHandler(BaseHTTPRequestHandler):
    """HTTP API handler"""

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_GET(self):
        url = urlparse(self.path)

        if url.path == '/':
            # Serve the enhanced UI
            ui_path = Path(__file__).parent.parent / "enhanced_ui.html"
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
                "message": "Enhanced Workflow API",
                "endpoints": {
                    "create": "POST /workflow/create",
                    "execute": "POST /workflow/execute",
                    "qc_pending": "GET /qc/pending",
                    "qc_submit": "POST /qc/submit",
                    "status": "GET /workflow/{id}/status",
                    "mcp_tools": "GET /mcp/tools"
                }
            })

        elif url.path == '/mcp/tools':
            # List all available MCP tools
            all_tools = {}
            for server_name, server in workflow_state.mcp_servers.items():
                result = asyncio.run(server.handle_request({"method": "tools/list"}))
                all_tools[server_name] = result.get("tools", [])
            self.send_json(all_tools)

        elif url.path == '/qc/pending':
            tasks = workflow_state.get_pending_qc()
            self.send_json({"tasks": tasks})

        elif url.path.startswith('/workflow/') and url.path.endswith('/status'):
            execution_id = url.path.split('/')[2]
            status = workflow_state.get_execution_status(execution_id)
            if status:
                self.send_json(status)
            else:
                self.send_error(404)

        elif url.path.startswith('/assets/'):
            # Serve generated assets
            filename = url.path.split('/')[-1]
            filepath = Path("/mnt/c/Users/Chris/Documents/_DevProjects/ai-workflow-spc/generated_assets") / filename
            if filepath.exists():
                content_type = 'image/jpeg' if filename.endswith('.jpg') else \
                              'image/png' if filename.endswith('.png') else \
                              'video/mp4' if filename.endswith('.mp4') else \
                              'application/octet-stream'

                self.send_response(200)
                self.send_header('Content-Type', content_type)
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

        if self.path == '/workflow/create':
            # Create workflow from definition
            workflow_def = data.get('workflow')
            if not workflow_def:
                self.send_error(400, "Workflow definition required")
                return

            execution_id = workflow_state.create_workflow(workflow_def)
            self.send_json({
                "execution_id": execution_id,
                "status": "created"
            })

        elif self.path == '/workflow/execute':
            # Execute a workflow
            execution_id = data.get('execution_id')
            input_data = data.get('input', {})

            execution = workflow_state.get_execution_status(execution_id)
            if not execution:
                self.send_error(404, "Execution not found")
                return

            execution["data"]["input"] = input_data

            # Start execution
            asyncio.run(workflow_state.execute_workflow(execution_id))

            self.send_json({
                "status": "started",
                "execution_id": execution_id
            })

        elif self.path == '/qc/submit':
            execution_id = data.get('execution_id')
            node_id = data.get('node_id')
            passed = data.get('passed', False)
            result_data = data.get('data', {})

            if workflow_state.submit_qc(execution_id, node_id, passed, result_data):
                self.send_json({"status": "success"})
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
        # Suppress logs
        pass


def run_server():
    server = HTTPServer(('localhost', 8002), APIHandler)
    print("\n🚀 Enhanced Binary-Blender Orchestrator")
    print("================================")
    print("Server running at http://localhost:8002")
    print("\nAvailable MCP Components:")
    print("- Image Generation (FLUX, SDXL)")
    print("- Video Generation (RunwayML)")
    print("- Lip Sync (AKOOL)")
    print("\nOpen http://localhost:8002 for the visual workflow builder")
    print("\nPress Ctrl+C to stop")

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down...")
        server.shutdown()


if __name__ == "__main__":
    run_server()