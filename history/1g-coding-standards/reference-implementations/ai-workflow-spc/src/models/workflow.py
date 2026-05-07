"""Workflow data models for the Binary-Blender Orchestrator"""
from dataclasses import dataclass, field
from typing import List, Dict, Optional, Any
from datetime import datetime
from uuid import uuid4
from enum import Enum


class WorkflowState(str, Enum):
    DRAFT = "draft"
    ACTIVE = "active"
    PAUSED = "paused"
    COMPLETED = "completed"


class ExecutionState(str, Enum):
    RUNNING = "running"
    PAUSED_FOR_QC = "paused_for_qc"
    COMPLETED = "completed"
    FAILED = "failed"


class AssetState(str, Enum):
    UNCHECKED = "unchecked"
    APPROVED = "approved"
    REJECTED = "rejected"


class QCTaskState(str, Enum):
    PENDING = "pending"
    IN_REVIEW = "in_review"
    COMPLETED = "completed"


@dataclass
class Connection:
    """Represents a connection between two modules"""
    from_module_id: str
    from_output: str
    to_module_id: str
    to_input: str
    id: str = field(default_factory=lambda: f"conn_{uuid4().hex[:8]}")
    condition: Optional[str] = None  # For conditional routing (e.g., "fail")


@dataclass
class ModuleConfig:
    """Configuration for a module instance in a workflow"""
    id: str
    type: str
    name: str
    config: Dict[str, Any]
    text_bindings: Dict[str, Any] = field(default_factory=dict)
    ui_overrides: Dict[str, Any] = field(default_factory=dict)
    input_config: Dict[str, Any] = field(default_factory=dict)
    position: Dict[str, float] = field(default_factory=lambda: {"x": 0, "y": 0})


@dataclass
class Workflow:
    """Represents a complete workflow definition"""
    name: str
    description: str
    modules: List[ModuleConfig]
    connections: List[Connection]
    id: str = field(default_factory=lambda: f"wf_{uuid4().hex[:8]}")
    state: WorkflowState = WorkflowState.DRAFT
    created_at: datetime = field(default_factory=datetime.now)
    updated_at: datetime = field(default_factory=datetime.now)


@dataclass
class WorkflowExecution:
    """Represents a single execution of a workflow"""
    workflow_id: str
    id: str = field(default_factory=lambda: f"exec_{uuid4().hex[:8]}")
    state: ExecutionState = ExecutionState.RUNNING
    current_module_id: Optional[str] = None
    execution_data: Dict[str, Any] = field(default_factory=dict)
    started_at: datetime = field(default_factory=datetime.now)
    completed_at: Optional[datetime] = None


@dataclass
class Asset:
    """Represents an asset in the system"""
    type: str
    url: str
    metadata: Dict[str, Any]
    workflow_execution_id: str
    id: str = field(default_factory=lambda: f"asset_{uuid4().hex[:8]}")
    state: AssetState = AssetState.UNCHECKED
    created_at: datetime = field(default_factory=datetime.now)
    updated_at: datetime = field(default_factory=datetime.now)


@dataclass
class QCTask:
    """Represents a quality control task"""
    workflow_execution_id: str
    module_id: str
    assets: List[Asset]
    id: str = field(default_factory=lambda: f"qc_{uuid4().hex[:8]}")
    state: QCTaskState = QCTaskState.PENDING
    reviewer_decision: Optional[Dict[str, Any]] = None
    created_at: datetime = field(default_factory=datetime.now)
    completed_at: Optional[datetime] = None
