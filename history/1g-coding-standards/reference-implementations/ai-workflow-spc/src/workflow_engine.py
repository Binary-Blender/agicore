#!/usr/bin/env python3
"""
Visual Workflow Engine with MCP Components and QC Checkpoints
This will be the backend for the visual workflow builder
"""

import json
import asyncio
import uuid
from typing import Dict, Any, List, Optional
from datetime import datetime
from dataclasses import dataclass, field
from enum import Enum
import os
from pathlib import Path

# Import our MCP server
from image_mcp_server import ImageGenerationMCP, SimpleMCPServer


class NodeType(Enum):
    """Types of nodes in the workflow"""
    MCP_COMPONENT = "mcp_component"
    QC_CHECKPOINT = "qc_checkpoint"
    INPUT = "input"
    OUTPUT = "output"
    DECISION = "decision"


class QCStatus(Enum):
    """QC review status"""
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"


@dataclass
class WorkflowNode:
    """A node in the visual workflow"""
    id: str
    type: NodeType
    name: str
    x: int = 0  # Position for visual representation
    y: int = 0
    config: Dict[str, Any] = field(default_factory=dict)
    inputs: List[str] = field(default_factory=list)  # Connected node IDs
    outputs: List[str] = field(default_factory=list)  # Connected node IDs


@dataclass
class WorkflowExecution:
    """An execution instance of a workflow"""
    id: str
    workflow_id: str
    status: str = "running"
    current_node: Optional[str] = None
    data: Dict[str, Any] = field(default_factory=dict)
    qc_results: Dict[str, QCStatus] = field(default_factory=dict)
    created_at: datetime = field(default_factory=datetime.now)


@dataclass
class QCTask:
    """A quality control task"""
    id: str
    execution_id: str
    node_id: str
    data: Dict[str, Any]
    status: QCStatus = QCStatus.PENDING
    reviewer: Optional[str] = None
    review_time: Optional[datetime] = None
    comments: Optional[str] = None


class WorkflowEngine:
    """Core workflow execution engine"""

    def __init__(self):
        self.workflows: Dict[str, Dict[str, Any]] = {}
        self.executions: Dict[str, WorkflowExecution] = {}
        self.qc_tasks: Dict[str, QCTask] = {}
        self.mcp_servers: Dict[str, Any] = {}

        # Initialize MCP servers
        self._init_mcp_servers()

        # Data directory
        self.data_dir = Path("/mnt/c/Users/Chris/Documents/_DevProjects/ai-workflow-spc/workflow_data")
        self.data_dir.mkdir(exist_ok=True)

    def _init_mcp_servers(self):
        """Initialize available MCP servers"""
        # Image generation MCP
        image_server = ImageGenerationMCP()
        self.mcp_servers["image-generation"] = SimpleMCPServer(image_server)

        # Future MCP servers can be added here:
        # self.mcp_servers["text-generation"] = TextGenerationMCP()
        # self.mcp_servers["data-transform"] = DataTransformMCP()
        # self.mcp_servers["web-scraper"] = WebScraperMCP()

    def create_workflow(self, name: str) -> str:
        """Create a new workflow"""
        workflow_id = str(uuid.uuid4())
        self.workflows[workflow_id] = {
            "id": workflow_id,
            "name": name,
            "nodes": {},
            "created_at": datetime.now().isoformat()
        }
        return workflow_id

    def add_node(self, workflow_id: str, node: WorkflowNode) -> bool:
        """Add a node to workflow"""
        if workflow_id not in self.workflows:
            return False

        self.workflows[workflow_id]["nodes"][node.id] = {
            "id": node.id,
            "type": node.type.value,
            "name": node.name,
            "x": node.x,
            "y": node.y,
            "config": node.config,
            "inputs": node.inputs,
            "outputs": node.outputs
        }
        return True

    def connect_nodes(self, workflow_id: str, from_node_id: str, to_node_id: str) -> bool:
        """Connect two nodes"""
        if workflow_id not in self.workflows:
            return False

        nodes = self.workflows[workflow_id]["nodes"]
        if from_node_id not in nodes or to_node_id not in nodes:
            return False

        # Add connection
        if to_node_id not in nodes[from_node_id]["outputs"]:
            nodes[from_node_id]["outputs"].append(to_node_id)
        if from_node_id not in nodes[to_node_id]["inputs"]:
            nodes[to_node_id]["inputs"].append(from_node_id)

        return True

    async def execute_workflow(self, workflow_id: str, input_data: Dict[str, Any]) -> str:
        """Execute a workflow"""
        if workflow_id not in self.workflows:
            raise ValueError(f"Workflow {workflow_id} not found")

        # Create execution
        execution = WorkflowExecution(
            id=str(uuid.uuid4()),
            workflow_id=workflow_id,
            data={"input": input_data}
        )
        self.executions[execution.id] = execution

        # Find start node (INPUT type)
        workflow = self.workflows[workflow_id]
        start_node = None
        for node in workflow["nodes"].values():
            if node["type"] == NodeType.INPUT.value:
                start_node = node
                break

        if not start_node:
            raise ValueError("No input node found in workflow")

        # Execute workflow
        await self._execute_node(execution, start_node)

        return execution.id

    async def _execute_node(self, execution: WorkflowExecution, node: Dict[str, Any]):
        """Execute a single node"""
        execution.current_node = node["id"]
        node_type = NodeType(node["type"])

        if node_type == NodeType.INPUT:
            # Pass through input data
            execution.data[node["id"]] = execution.data["input"]

        elif node_type == NodeType.MCP_COMPONENT:
            # Execute MCP component
            result = await self._execute_mcp_component(node, execution)
            execution.data[node["id"]] = result

        elif node_type == NodeType.QC_CHECKPOINT:
            # Create QC task
            qc_task = QCTask(
                id=str(uuid.uuid4()),
                execution_id=execution.id,
                node_id=node["id"],
                data=self._get_node_input_data(execution, node)
            )
            self.qc_tasks[qc_task.id] = qc_task
            execution.data[node["id"]] = {"qc_task_id": qc_task.id}

            # Wait for QC (in real system, this would be async)
            execution.status = "waiting_for_qc"
            return  # Stop execution until QC is complete

        elif node_type == NodeType.OUTPUT:
            # Store output
            execution.data["output"] = self._get_node_input_data(execution, node)
            execution.status = "completed"
            return

        # Continue to next nodes
        for next_node_id in node["outputs"]:
            next_node = self.workflows[execution.workflow_id]["nodes"][next_node_id]
            await self._execute_node(execution, next_node)

    async def _execute_mcp_component(self, node: Dict[str, Any], execution: WorkflowExecution) -> Dict[str, Any]:
        """Execute an MCP component"""
        mcp_type = node["config"].get("mcp_type", "image-generation")
        mcp_server = self.mcp_servers.get(mcp_type)

        if not mcp_server:
            raise ValueError(f"Unknown MCP type: {mcp_type}")

        # Get input data from previous nodes
        input_data = self._get_node_input_data(execution, node)

        # Call MCP tool
        tool_name = node["config"].get("tool", "generate_image")
        tool_args = {**node["config"].get("tool_args", {}), **input_data}

        result = await mcp_server.handle_request({
            "method": "tools/call",
            "params": {
                "name": tool_name,
                "arguments": tool_args
            }
        })

        return result.get("content", {})

    def _get_node_input_data(self, execution: WorkflowExecution, node: Dict[str, Any]) -> Dict[str, Any]:
        """Get combined input data from all input nodes"""
        combined_data = {}

        for input_node_id in node["inputs"]:
            if input_node_id in execution.data:
                data = execution.data[input_node_id]
                if isinstance(data, dict):
                    combined_data.update(data)
                else:
                    combined_data[input_node_id] = data

        return combined_data

    def submit_qc(self, qc_task_id: str, status: QCStatus, reviewer: str = "user", comments: str = "") -> bool:
        """Submit QC review result"""
        if qc_task_id not in self.qc_tasks:
            return False

        qc_task = self.qc_tasks[qc_task_id]
        qc_task.status = status
        qc_task.reviewer = reviewer
        qc_task.review_time = datetime.now()
        qc_task.comments = comments

        # Update execution
        execution = self.executions[qc_task.execution_id]
        execution.qc_results[qc_task.node_id] = status

        # If approved, continue workflow
        if status == QCStatus.APPROVED:
            asyncio.create_task(self._continue_workflow(execution, qc_task.node_id))

        return True

    async def _continue_workflow(self, execution: WorkflowExecution, from_node_id: str):
        """Continue workflow execution after QC approval"""
        workflow = self.workflows[execution.workflow_id]
        node = workflow["nodes"][from_node_id]

        # Continue to next nodes
        for next_node_id in node["outputs"]:
            next_node = workflow["nodes"][next_node_id]
            await self._execute_node(execution, next_node)

    def get_pending_qc_tasks(self) -> List[Dict[str, Any]]:
        """Get all pending QC tasks"""
        pending = []
        for task in self.qc_tasks.values():
            if task.status == QCStatus.PENDING:
                pending.append({
                    "id": task.id,
                    "execution_id": task.execution_id,
                    "node_id": task.node_id,
                    "data": task.data,
                    "workflow_id": self.executions[task.execution_id].workflow_id
                })
        return pending

    def save_workflow(self, workflow_id: str):
        """Save workflow to disk"""
        if workflow_id not in self.workflows:
            return False

        filepath = self.data_dir / f"workflow_{workflow_id}.json"
        with open(filepath, 'w') as f:
            json.dump(self.workflows[workflow_id], f, indent=2)

        return True

    def load_workflow(self, workflow_id: str) -> bool:
        """Load workflow from disk"""
        filepath = self.data_dir / f"workflow_{workflow_id}.json"
        if not filepath.exists():
            return False

        with open(filepath, 'r') as f:
            self.workflows[workflow_id] = json.load(f)

        return True


# Example workflow creation
def create_example_workflow(engine: WorkflowEngine) -> str:
    """Create an example image generation workflow with QC"""

    # Create workflow
    workflow_id = engine.create_workflow("Image Generation with QC")

    # Add nodes
    input_node = WorkflowNode(
        id="input",
        type=NodeType.INPUT,
        name="User Input",
        x=100, y=200
    )

    image_gen_node = WorkflowNode(
        id="image_gen",
        type=NodeType.MCP_COMPONENT,
        name="Generate Image",
        x=300, y=200,
        config={
            "mcp_type": "image-generation",
            "tool": "generate_image",
            "tool_args": {
                "size": "512x512",
                "provider": "mock"  # or "openai" with API key
            }
        }
    )

    qc_node = WorkflowNode(
        id="qc_checkpoint",
        type=NodeType.QC_CHECKPOINT,
        name="Quality Review",
        x=500, y=200,
        config={
            "review_type": "image_quality",
            "instructions": "Review the generated image for quality and appropriateness"
        }
    )

    output_node = WorkflowNode(
        id="output",
        type=NodeType.OUTPUT,
        name="Final Output",
        x=700, y=200
    )

    # Add nodes to workflow
    engine.add_node(workflow_id, input_node)
    engine.add_node(workflow_id, image_gen_node)
    engine.add_node(workflow_id, qc_node)
    engine.add_node(workflow_id, output_node)

    # Connect nodes
    engine.connect_nodes(workflow_id, "input", "image_gen")
    engine.connect_nodes(workflow_id, "image_gen", "qc_checkpoint")
    engine.connect_nodes(workflow_id, "qc_checkpoint", "output")

    # Save workflow
    engine.save_workflow(workflow_id)

    return workflow_id


if __name__ == "__main__":
    # Test the workflow engine
    async def test():
        engine = WorkflowEngine()

        # Create example workflow
        workflow_id = create_example_workflow(engine)
        print(f"Created workflow: {workflow_id}")

        # Execute workflow
        execution_id = await engine.execute_workflow(
            workflow_id,
            {"prompt": "A futuristic city at sunset"}
        )
        print(f"Started execution: {execution_id}")

        # Check pending QC
        pending = engine.get_pending_qc_tasks()
        print(f"Pending QC tasks: {len(pending)}")

        if pending:
            # Simulate QC approval
            task = pending[0]
            engine.submit_qc(task["id"], QCStatus.APPROVED, comments="Looks good!")
            print("QC approved!")

    asyncio.run(test())