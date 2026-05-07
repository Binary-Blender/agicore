# src/main.py - Minimal working implementation of AI Workflow with Progressive QC
import asyncio
from typing import Dict, Any, Optional, List
from dataclasses import dataclass, asdict
from enum import Enum
import random
import json
from datetime import datetime
import uuid
import os
import aiohttp

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

class ProcessType(Enum):
    DALLE = "dalle"
    STABLE_DIFFUSION = "stable_diffusion"

@dataclass
class ImageResult:
    """Individual image result with its own QC status"""
    url: str
    qc_result: Optional[str] = None  # 'pass', 'fail', None (not reviewed)
    position: int = 0  # Position in the grid (0-3)

@dataclass
class ImageGenerationTask:
    id: str
    prompt: str
    process_type: ProcessType
    results: Optional[List[ImageResult]] = None  # List of 4 image results
    quality_score: Optional[float] = None
    needs_qc: bool = True
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
        # Convert ImageResult objects to dicts
        if self.results:
            result['results'] = [asdict(r) for r in self.results]
        return result

class SimpleMCPClient:
    """MCP client that uses AKOOL image generation API"""

    def __init__(self):
        self.akool_api_key = os.getenv("AKOOL_API_KEY")
        self.use_real_api = self.akool_api_key is not None
        if self.use_real_api:
            print("Real image generation API: Enabled (using AKOOL)")
        else:
            print("Real image generation API: Disabled (using placeholders)")

    async def upscale_image(self, session: aiohttp.ClientSession, original_id: str, button: str) -> str:
        """Upscale a single image from the grid using U1-U4 buttons"""
        headers = {
            'x-api-key': self.akool_api_key,
            'Content-Type': 'application/json',
        }

        request_body = {
            "_id": original_id,
            "button": button
        }

        print(f"Upscaling image with button {button}")

        async with session.post(
            'https://openapi.akool.com/api/open/v3/content/image/createbybutton',
            headers=headers,
            json=request_body
        ) as response:
            if response.status != 200:
                error_text = await response.text()
                raise Exception(f"AKOOL upscale error: {response.status} - {error_text}")

            upscale_data = await response.json()

            if upscale_data.get('code') != 1000:
                raise Exception(upscale_data.get('msg', 'AKOOL upscale error'))

            upscale_id = upscale_data['data']['_id']

            # Poll for upscale completion
            for attempt in range(60):
                await asyncio.sleep(2)

                async with session.get(
                    f'https://openapi.akool.com/api/open/v3/content/image/infobymodelid?image_model_id={upscale_id}',
                    headers={'x-api-key': self.akool_api_key}
                ) as status_response:
                    if status_response.status != 200:
                        continue

                    status_data = await status_response.json()
                    image_status = status_data['data'].get('image_status', 0)

                    if image_status == 4:  # Failed
                        raise Exception(f'AKOOL upscale {button} failed')

                    if image_status == 3:  # Completed
                        image_url = status_data['data'].get('image')
                        if not image_url:
                            raise Exception(f'No image URL for upscale {button}')

                        print(f"AKOOL upscale {button} completed: {image_url}")
                        return image_url

            raise Exception(f'AKOOL upscale {button} timed out')

    async def generate_image(self, prompt: str, process_type: ProcessType) -> List[str]:
        if self.use_real_api:
            try:
                # Create image generation request to AKOOL
                headers = {
                    'x-api-key': self.akool_api_key,
                    'Content-Type': 'application/json',
                }

                # Use different aspect ratios based on process type
                scale = "1:1" if process_type == ProcessType.DALLE else "16:9"

                request_body = {
                    "prompt": prompt,
                    "scale": scale
                }

                print(f"Creating AKOOL image with prompt: {prompt}, scale: {scale}")

                # Make async HTTP request using aiohttp
                async with aiohttp.ClientSession() as session:
                    async with session.post(
                        'https://openapi.akool.com/api/open/v3/content/image/createbyprompt',
                        headers=headers,
                        json=request_body
                    ) as response:
                        if response.status != 200:
                            error_text = await response.text()
                            raise Exception(f"AKOOL API error: {response.status} - {error_text}")

                        create_data = await response.json()

                        if create_data.get('code') != 1000:
                            raise Exception(create_data.get('msg', 'AKOOL API error'))

                        image_model_id = create_data['data']['_id']
                        print(f"AKOOL image generation task created: {image_model_id}")

                        # Poll for completion (max 60 attempts, 2 seconds each = 2 minutes)
                        for attempt in range(60):
                            await asyncio.sleep(2)

                            async with session.get(
                                f'https://openapi.akool.com/api/open/v3/content/image/infobymodelid?image_model_id={image_model_id}',
                                headers={'x-api-key': self.akool_api_key}
                            ) as status_response:
                                if status_response.status != 200:
                                    continue

                                status_data = await status_response.json()
                                image_status = status_data['data'].get('image_status', 0)

                                if image_status == 4:  # Failed
                                    raise Exception('AKOOL image generation failed')

                                if image_status == 3:  # Completed
                                    grid_url = status_data['data'].get('image')
                                    if not grid_url:
                                        raise Exception('No image URL in AKOOL response')

                                    print(f"AKOOL grid generated successfully: {grid_url}")
                                    print("Starting upscale process for all 4 images...")

                                    # Now upscale all 4 quadrants to get individual images
                                    upscale_tasks = []
                                    for button in ['U1', 'U2', 'U3', 'U4']:
                                        task = self.upscale_image(session, image_model_id, button)
                                        upscale_tasks.append(task)

                                    # Run all upscale tasks in parallel
                                    upscaled_urls = await asyncio.gather(*upscale_tasks)

                                    print(f"All 4 images upscaled successfully")
                                    return upscaled_urls

                        raise Exception('AKOOL image generation timed out after 2 minutes')

            except Exception as e:
                print(f"Real API generation failed: {e}")
                # Fall back to placeholder on error

        # Fallback to placeholder images - return 4 different images
        await asyncio.sleep(random.uniform(1, 3))

        # Mock failure rate (10% for testing)
        if random.random() < 0.1:
            raise Exception(f"Generation failed for {process_type.value}")

        # Return 4 different placeholder image URLs
        width = 800
        height = 600
        base_seed = abs(hash(prompt + str(uuid.uuid4()))) % 1000

        urls = []
        for i in range(4):
            seed = base_seed + i
            urls.append(f"https://picsum.photos/seed/{seed}/{width}/{height}")

        return urls

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
        # Simplified Cpk calculation (normally requires upper/lower spec limits)
        # Here we use pass rate as a proxy
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
        self.ab_test_traffic_split = 0.5  # 50/50 split by default

        # Log whether real API is available
        if hasattr(self.mcp_client, 'use_real_api'):
            print(f"Real image generation API: {'Enabled' if self.mcp_client.use_real_api else 'Disabled (using placeholders)'}")

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

        # Generate images (returns list of 4 URLs)
        try:
            urls = await self.mcp_client.generate_image(prompt, process_type)
            # Create ImageResult objects for each URL
            task.results = [ImageResult(url=url, position=i) for i, url in enumerate(urls)]
        except Exception as e:
            print(f"Generation failed: {e}")
            # Retry with alternative process
            alt_process = (ProcessType.STABLE_DIFFUSION
                          if process_type == ProcessType.DALLE
                          else ProcessType.DALLE)
            task.process_type = alt_process
            urls = await self.mcp_client.generate_image(prompt, alt_process)
            task.results = [ImageResult(url=url, position=i) for i, url in enumerate(urls)]

        # Determine if QC is needed
        task.needs_qc = self.qc_engine.should_sample(task.process_type)

        if task.needs_qc:
            self.pending_qc_tasks.append(task)
            print(f"Task {task.id} sent for QC review (4 images)")
        else:
            # Auto-approve all images
            for img in task.results:
                img.qc_result = "pass"
                self.qc_engine.record_result(task.process_type, True)

            task.quality_score = 1.0
            task.completed_at = datetime.now()
            self.completed_tasks.append(task)
            sampling_rate = self.qc_engine.get_sampling_rate(task.process_type)
            print(f"Task {task.id} auto-approved (4 images, sampling rate: {sampling_rate:.1%})")

        return task

    def submit_qc_result(self, task_id: str, image_position: int, result: str, score: float = None) -> bool:
        """Submit human QC result for a specific image"""
        task = next((t for t in self.pending_qc_tasks if t.id == task_id), None)
        if not task:
            return False

        # Update the specific image result
        if task.results and 0 <= image_position < len(task.results):
            task.results[image_position].qc_result = result
        else:
            return False

        # Check if all images have been reviewed
        all_reviewed = all(img.qc_result is not None for img in task.results)

        if all_reviewed:
            # Calculate overall quality score based on pass rate
            pass_count = sum(1 for img in task.results if img.qc_result == "pass")
            task.quality_score = pass_count / len(task.results)
            task.completed_at = datetime.now()

            # Update statistics for each image result
            for img in task.results:
                passed = img.qc_result == "pass"
                self.qc_engine.record_result(task.process_type, passed)

            # Move to completed
            self.pending_qc_tasks.remove(task)
            self.completed_tasks.append(task)

            print(f"QC completed for {task.id}: {pass_count}/{len(task.results)} passed")
            print(f"New sampling rate for {task.process_type.value}: "
                  f"{self.qc_engine.get_sampling_rate(task.process_type):.1%}")
        else:
            reviewed_count = sum(1 for img in task.results if img.qc_result is not None)
            print(f"Image {image_position + 1} reviewed ({reviewed_count}/{len(task.results)} complete)")

        return True

    def get_stats(self) -> Dict[str, Any]:
        """Get current workflow statistics"""
        return {
            "pending_qc": len(self.pending_qc_tasks),
            "completed": len(self.completed_tasks),
            "ab_test_active": self.ab_test_active,
            "process_stats": {
                "dalle": {
                    **self.qc_engine.process_stats[ProcessType.DALLE],
                    "sampling_rate": self.qc_engine.get_sampling_rate(ProcessType.DALLE),
                    "process_capability": self.qc_engine.get_process_capability(ProcessType.DALLE),
                    "pass_rate": (self.qc_engine.process_stats[ProcessType.DALLE]["passed"] /
                                 self.qc_engine.process_stats[ProcessType.DALLE]["total"]
                                 if self.qc_engine.process_stats[ProcessType.DALLE]["total"] > 0 else 0)
                },
                "stable_diffusion": {
                    **self.qc_engine.process_stats[ProcessType.STABLE_DIFFUSION],
                    "sampling_rate": self.qc_engine.get_sampling_rate(ProcessType.STABLE_DIFFUSION),
                    "process_capability": self.qc_engine.get_process_capability(ProcessType.STABLE_DIFFUSION),
                    "pass_rate": (self.qc_engine.process_stats[ProcessType.STABLE_DIFFUSION]["passed"] /
                                 self.qc_engine.process_stats[ProcessType.STABLE_DIFFUSION]["total"]
                                 if self.qc_engine.process_stats[ProcessType.STABLE_DIFFUSION]["total"] > 0 else 0)
                }
            }
        }

# FastAPI application
app = FastAPI(title="Binary-Blender Orchestrator Platform", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize workflow
workflow = SimpleWorkflow()

# Pydantic models for API
class GenerateRequest(BaseModel):
    prompt: str

class QCSubmission(BaseModel):
    task_id: str
    image_position: int  # 0-3 for the 4 images
    result: str  # 'pass', 'fail'
    score: Optional[float] = None

class ABTestConfig(BaseModel):
    active: bool
    traffic_split: float = 0.5  # Percentage going to variant

# API Endpoints
@app.post("/generate")
async def generate_image(request: GenerateRequest):
    """Generate an image with progressive QC"""
    task = await workflow.process_request(request.prompt)

    # Extract image URLs from results
    images = []
    if task.results:
        for result in task.results:
            images.append({
                "url": result.url,
                "qc_result": result.qc_result,
                "position": result.position
            })

    return {
        "task_id": task.id,
        "images": images,
        "needs_qc": task.needs_qc,
        "process": task.process_type.value,
        "auto_approved": not task.needs_qc,
        "prompt": task.prompt
    }

@app.get("/qc/pending")
async def get_pending_qc():
    """Get pending QC tasks"""
    return {
        "tasks": [
            {
                "id": t.id,
                "prompt": t.prompt,
                "images": [
                    {
                        "url": img.url,
                        "position": img.position,
                        "qc_result": img.qc_result
                    }
                    for img in (t.results or [])
                ],
                "process": t.process_type.value,
                "created_at": t.created_at.isoformat()
            }
            for t in workflow.pending_qc_tasks
        ],
        "count": len(workflow.pending_qc_tasks)
    }

@app.post("/qc/submit")
async def submit_qc(submission: QCSubmission):
    """Submit QC result"""
    success = workflow.submit_qc_result(
        submission.task_id,
        submission.image_position,
        submission.result,
        submission.score
    )
    if not success:
        raise HTTPException(status_code=404, detail="Task not found")
    return {
        "status": "success",
        "stats": workflow.get_stats(),
        "message": f"QC result recorded for task {submission.task_id}"
    }

@app.get("/stats")
async def get_stats():
    """Get workflow statistics"""
    stats = workflow.get_stats()

    # Add cost savings calculation
    total_tasks = sum(ps["total"] for ps in stats["process_stats"].values())
    total_qc_performed = sum(1 for t in workflow.completed_tasks if t.qc_result)

    if total_tasks > 0:
        actual_qc_rate = total_qc_performed / total_tasks
        cost_savings = (1 - actual_qc_rate) * 100  # Percentage saved
        stats["cost_savings"] = {
            "total_tasks": total_tasks,
            "qc_performed": total_qc_performed,
            "qc_rate": actual_qc_rate,
            "savings_percentage": cost_savings
        }

    return stats

@app.post("/ab-test/config")
async def configure_ab_test(config: ABTestConfig):
    """Configure A/B testing"""
    workflow.ab_test_active = config.active
    workflow.ab_test_traffic_split = config.traffic_split
    return {
        "ab_test_active": workflow.ab_test_active,
        "traffic_split": workflow.ab_test_traffic_split,
        "message": "A/B test configuration updated"
    }

@app.get("/ab-test/results")
async def get_ab_test_results():
    """Get A/B test comparison results"""
    dalle_stats = workflow.qc_engine.process_stats[ProcessType.DALLE]
    sd_stats = workflow.qc_engine.process_stats[ProcessType.STABLE_DIFFUSION]

    # Calculate statistical significance (simplified)
    dalle_rate = dalle_stats["passed"] / dalle_stats["total"] if dalle_stats["total"] > 0 else 0
    sd_rate = sd_stats["passed"] / sd_stats["total"] if sd_stats["total"] > 0 else 0

    # Determine winner (needs minimum 30 samples each)
    winner = None
    if dalle_stats["total"] >= 30 and sd_stats["total"] >= 30:
        if abs(dalle_rate - sd_rate) > 0.05:  # 5% difference threshold
            winner = "dalle" if dalle_rate > sd_rate else "stable_diffusion"

    return {
        "dalle": {
            "total": dalle_stats["total"],
            "pass_rate": dalle_rate,
            "sampling_rate": workflow.qc_engine.get_sampling_rate(ProcessType.DALLE)
        },
        "stable_diffusion": {
            "total": sd_stats["total"],
            "pass_rate": sd_rate,
            "sampling_rate": workflow.qc_engine.get_sampling_rate(ProcessType.STABLE_DIFFUSION)
        },
        "winner": winner,
        "confidence": "high" if winner and abs(dalle_rate - sd_rate) > 0.1 else "medium"
    }

@app.get("/")
async def root():
    """Serve the frontend UI"""
    frontend_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "frontend", "index.html")
    if os.path.exists(frontend_path):
        return FileResponse(frontend_path)
    else:
        # Fallback to API documentation
        return {
            "message": "Binary-Blender Orchestrator Platform API",
            "docs": "/docs",
            "endpoints": {
                "generate": "POST /generate - Generate image with progressive QC",
                "pending_qc": "GET /qc/pending - Get tasks needing review",
                "submit_qc": "POST /qc/submit - Submit QC decision",
                "stats": "GET /stats - Get platform statistics",
                "ab_test": "POST /ab-test/config - Configure A/B testing",
                "assets": "GET /assets - Get approved assets"
            }
        }

@app.get("/assets")
async def get_assets():
    """Get approved assets from the repository"""
    approved_assets = []

    for task in workflow.completed_tasks:
        if task.results:
            # Add each approved image as a separate asset
            for img in task.results:
                if img.qc_result == "pass":
                    approved_assets.append({
                        "id": f"{task.id}_{img.position}",
                        "task_id": task.id,
                        "position": img.position,
                        "prompt": task.prompt,
                        "image_url": img.url,
                        "process": task.process_type.value,
                        "approved_at": task.completed_at.isoformat(),
                        "quality_score": task.quality_score
                    })
    return {
        "assets": approved_assets,
        "count": len(approved_assets)
    }

if __name__ == "__main__":
    import uvicorn
    print("Starting Binary-Blender Orchestrator Platform...")
    print("API docs available at: http://localhost:8000/docs")
    print("To test: curl -X POST http://localhost:8000/generate -H 'Content-Type: application/json' -d '{\"prompt\": \"A beautiful sunset\"}'")
    uvicorn.run(app, host="0.0.0.0", port=8000)