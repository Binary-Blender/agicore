#!/usr/bin/env python3
"""
Simplified version of Binary-Blender Orchestrator Platform that runs without external dependencies
This demonstrates the core concepts using only Python standard library
"""

import json
import asyncio
import random
import uuid
from datetime import datetime
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
import threading
from enum import Enum
from dataclasses import dataclass, asdict
from typing import Dict, Any, Optional, List

# Core classes (same as main.py)
class ProcessType(Enum):
    DALLE = "dalle"
    STABLE_DIFFUSION = "stable_diffusion"

@dataclass
class ImageGenerationTask:
    id: str
    prompt: str
    process_type: ProcessType
    result: Optional[str] = None
    quality_score: Optional[float] = None
    needs_qc: bool = True
    qc_result: Optional[str] = None
    created_at: datetime = None
    completed_at: Optional[datetime] = None

    def __post_init__(self):
        if self.created_at is None:
            self.created_at = datetime.now()

    def to_dict(self):
        """Convert to dictionary for JSON serialization"""
        result = asdict(self)
        result['process_type'] = self.process_type.value
        result['created_at'] = self.created_at.isoformat()
        if self.completed_at:
            result['completed_at'] = self.completed_at.isoformat()
        return result

class SimpleMCPClient:
    """Mock MCP client for testing without real servers"""

    async def generate_image(self, prompt: str, process_type: ProcessType) -> str:
        # Simulate image generation
        await asyncio.sleep(random.uniform(0.5, 1.5))

        # Mock failure rate (10% for testing)
        if random.random() < 0.1:
            raise Exception(f"Generation failed for {process_type.value}")

        # Return mock image URL
        return f"https://picsum.photos/512/512?random={uuid.uuid4().hex[:8]}"

class QCEngine:
    """Simplified QC engine with progressive sampling"""

    def __init__(self):
        self.process_stats = {
            ProcessType.DALLE: {"total": 0, "passed": 0, "failed": 0},
            ProcessType.STABLE_DIFFUSION: {"total": 0, "passed": 0, "failed": 0}
        }

    def should_sample(self, process_type: ProcessType) -> bool:
        """Determine if this task needs QC based on process history"""
        stats = self.process_stats[process_type]

        # Always sample first 10
        if stats["total"] < 10:
            return True

        # Calculate pass rate
        if stats["total"] == 0:
            return True

        pass_rate = stats["passed"] / stats["total"]

        # Determine sampling rate based on performance and volume
        if pass_rate > 0.95 and stats["total"] > 50:
            sampling_rate = 0.05  # 5% sampling
        elif pass_rate > 0.90 and stats["total"] > 30:
            sampling_rate = 0.1   # 10% sampling
        elif pass_rate > 0.80:
            sampling_rate = 0.5   # 50% sampling
        else:
            sampling_rate = 1.0   # 100% sampling

        return random.random() < sampling_rate

    def record_result(self, process_type: ProcessType, passed: bool):
        """Update process statistics"""
        stats = self.process_stats[process_type]
        stats["total"] += 1
        if passed:
            stats["passed"] += 1
        else:
            stats["failed"] += 1

    def get_sampling_rate(self, process_type: ProcessType) -> float:
        """Get current sampling rate for display"""
        stats = self.process_stats[process_type]
        if stats["total"] < 10:
            return 1.0

        if stats["total"] == 0:
            return 1.0

        pass_rate = stats["passed"] / stats["total"]

        if pass_rate > 0.95 and stats["total"] > 50:
            return 0.05
        elif pass_rate > 0.90 and stats["total"] > 30:
            return 0.1
        elif pass_rate > 0.80:
            return 0.5
        return 1.0

    def get_process_capability(self, process_type: ProcessType) -> float:
        """Calculate process capability index (Cpk) - simplified version"""
        stats = self.process_stats[process_type]
        if stats["total"] < 30:
            return 0.0

        pass_rate = stats["passed"] / stats["total"]
        # Simplified Cpk calculation
        if pass_rate >= 0.99:
            return 2.0  # Excellent
        elif pass_rate >= 0.95:
            return 1.33  # Capable
        elif pass_rate >= 0.90:
            return 1.0  # Acceptable
        else:
            return 0.67  # Needs improvement

class SimpleWorkflow:
    """Main workflow orchestrator"""

    def __init__(self):
        self.mcp_client = SimpleMCPClient()
        self.qc_engine = QCEngine()
        self.pending_qc_tasks: List[ImageGenerationTask] = []
        self.completed_tasks: List[ImageGenerationTask] = []
        self.ab_test_active = False
        self.ab_test_traffic_split = 0.5

    async def process_request(self, prompt: str) -> ImageGenerationTask:
        """Process a single image generation request"""

        # Determine which process to use
        if self.ab_test_active and random.random() < self.ab_test_traffic_split:
            process_type = ProcessType.STABLE_DIFFUSION
        else:
            process_type = ProcessType.DALLE

        # Create task
        task = ImageGenerationTask(
            id=f"task_{uuid.uuid4().hex[:8]}",
            prompt=prompt,
            process_type=process_type
        )

        # Generate image
        try:
            task.result = await self.mcp_client.generate_image(prompt, process_type)
        except Exception as e:
            print(f"Generation failed: {e}")
            # Retry with alternative process
            alt_process = (ProcessType.STABLE_DIFFUSION
                          if process_type == ProcessType.DALLE
                          else ProcessType.DALLE)
            task.process_type = alt_process
            task.result = await self.mcp_client.generate_image(prompt, alt_process)

        # Determine if QC is needed
        task.needs_qc = self.qc_engine.should_sample(task.process_type)

        if task.needs_qc:
            self.pending_qc_tasks.append(task)
            print(f"Task {task.id} sent for QC review")
        else:
            # Auto-approve
            task.qc_result = "pass"
            task.quality_score = 1.0
            task.completed_at = datetime.now()
            self.qc_engine.record_result(task.process_type, True)
            self.completed_tasks.append(task)
            sampling_rate = self.qc_engine.get_sampling_rate(task.process_type)
            print(f"Task {task.id} auto-approved (sampling rate: {sampling_rate:.1%})")

        return task

    def submit_qc_result(self, task_id: str, result: str, score: float = None) -> bool:
        """Submit human QC result"""
        task = next((t for t in self.pending_qc_tasks if t.id == task_id), None)
        if not task:
            return False

        task.qc_result = result
        task.quality_score = score or (1.0 if result in ["pass", "a", "b"] else 0.0)
        task.completed_at = datetime.now()

        # Update statistics
        passed = result in ["pass", "a", "b"]
        self.qc_engine.record_result(task.process_type, passed)

        # Move to completed
        self.pending_qc_tasks.remove(task)
        self.completed_tasks.append(task)

        print(f"QC completed for {task.id}: {result}")
        print(f"New sampling rate for {task.process_type.value}: "
              f"{self.qc_engine.get_sampling_rate(task.process_type):.1%}")

        return True

    def get_stats(self) -> Dict[str, Any]:
        """Get current workflow statistics"""
        stats = {
            "pending_qc": len(self.pending_qc_tasks),
            "completed": len(self.completed_tasks),
            "ab_test_active": self.ab_test_active,
            "process_stats": {}
        }

        for process_type in ProcessType:
            process_stats = self.qc_engine.process_stats[process_type]
            stats["process_stats"][process_type.value] = {
                **process_stats,
                "sampling_rate": self.qc_engine.get_sampling_rate(process_type),
                "process_capability": self.qc_engine.get_process_capability(process_type),
                "pass_rate": (process_stats["passed"] / process_stats["total"]
                             if process_stats["total"] > 0 else 0)
            }

        # Add cost savings calculation
        total_tasks = sum(ps["total"] for ps in self.qc_engine.process_stats.values())
        total_qc_performed = sum(1 for t in self.completed_tasks if t.qc_result)

        if total_tasks > 0:
            actual_qc_rate = total_qc_performed / total_tasks
            cost_savings = (1 - actual_qc_rate) * 100
            stats["cost_savings"] = {
                "total_tasks": total_tasks,
                "qc_performed": total_qc_performed,
                "qc_rate": actual_qc_rate,
                "savings_percentage": cost_savings
            }

        return stats

# Global workflow instance
workflow = SimpleWorkflow()

# Simple HTTP server
class APIHandler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_GET(self):
        url = urlparse(self.path)

        if url.path == '/':
            self.send_json({
                "message": "Binary-Blender Orchestrator Platform API (Simple Version)",
                "endpoints": {
                    "generate": "POST /generate - Generate image with progressive QC",
                    "pending_qc": "GET /qc/pending - Get tasks needing review",
                    "submit_qc": "POST /qc/submit - Submit QC decision",
                    "stats": "GET /stats - Get platform statistics"
                }
            })
        elif url.path == '/qc/pending':
            tasks_data = [t.to_dict() for t in workflow.pending_qc_tasks]
            self.send_json({
                "tasks": tasks_data,
                "count": len(tasks_data)
            })
        elif url.path == '/stats':
            self.send_json(workflow.get_stats())
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

        if self.path == '/generate':
            prompt = data.get('prompt', 'Test image')

            # Run async task in sync context
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            task = loop.run_until_complete(workflow.process_request(prompt))
            loop.close()

            self.send_json({
                "task_id": task.id,
                "image_url": task.result,
                "needs_qc": task.needs_qc,
                "process": task.process_type.value,
                "auto_approved": not task.needs_qc
            })

        elif self.path == '/qc/submit':
            success = workflow.submit_qc_result(
                data.get('task_id'),
                data.get('result'),
                data.get('score')
            )

            if success:
                self.send_json({
                    "status": "success",
                    "stats": workflow.get_stats(),
                    "message": f"QC result recorded for task {data.get('task_id')}"
                })
            else:
                self.send_error(404, "Task not found")

        elif self.path == '/ab-test/config':
            workflow.ab_test_active = data.get('active', False)
            workflow.ab_test_traffic_split = data.get('traffic_split', 0.5)

            self.send_json({
                "ab_test_active": workflow.ab_test_active,
                "traffic_split": workflow.ab_test_traffic_split,
                "message": "A/B test configuration updated"
            })
        else:
            self.send_error(404)

    def send_json(self, data):
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps(data).encode())

    def log_message(self, format, *args):
        # Suppress logs for cleaner output
        if "/stats" not in args[0] and "/qc/pending" not in args[0]:
            print(f"{self.address_string()} - {format}" % args)

def run_server():
    server = HTTPServer(('localhost', 8000), APIHandler)
    print("Binary-Blender Orchestrator Platform (Simple Version)")
    print("=========================================")
    print("Server running at http://localhost:8000")
    print("API endpoints available - test with:")
    print('  curl -X POST http://localhost:8000/generate -H "Content-Type: application/json" -d \'{"prompt": "A sunset"}\'')
    print("\nOpen frontend/index.html in your browser for the QC interface")
    print("\nPress Ctrl+C to stop")

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down...")
        server.shutdown()

if __name__ == "__main__":
    run_server()