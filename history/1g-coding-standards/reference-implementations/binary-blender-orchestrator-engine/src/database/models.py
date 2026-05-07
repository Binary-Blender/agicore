"""
Database models for the Engine Service
"""
from datetime import datetime
from typing import Optional
from sqlalchemy import Column, String, DateTime, JSON, ForeignKey, Text, Boolean, Integer
from sqlalchemy.orm import declarative_base, relationship
from sqlalchemy.sql import func
import uuid

Base = declarative_base()


class Tenant(Base):
    """Multi-tenancy support - isolated workspaces for organizations"""
    __tablename__ = "tenants"

    id = Column(String, primary_key=True, default=lambda: f"tenant_{uuid.uuid4().hex[:8]}")
    name = Column(String(255), nullable=False)
    domain = Column(String(255), unique=True, nullable=True)
    settings = Column(JSON, default={})
    quota_workflows = Column(Integer, default=100)
    quota_executions_per_month = Column(Integer, default=1000)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    workflows = relationship("Workflow", back_populates="tenant")


class Workflow(Base):
    """Workflow definition model"""
    __tablename__ = "workflows"

    id = Column(String, primary_key=True, default=lambda: f"wf_{uuid.uuid4().hex[:8]}")
    tenant_id = Column(String, ForeignKey("tenants.id"), nullable=True, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    state = Column(String(50), default="draft")  # draft, active, paused, completed
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    tenant = relationship("Tenant", back_populates="workflows")
    modules = relationship("WorkflowModule", back_populates="workflow", cascade="all, delete-orphan")
    connections = relationship("WorkflowConnection", back_populates="workflow", cascade="all, delete-orphan")
    executions = relationship("WorkflowExecution", back_populates="workflow", cascade="all, delete-orphan")


class WorkflowModule(Base):
    """Module configuration within a workflow"""
    __tablename__ = "workflow_modules"

    id = Column(String, primary_key=True)  # module_1, module_2, etc
    workflow_id = Column(String, ForeignKey("workflows.id"), nullable=False)
    type = Column(String(100), nullable=False)  # start, image_generation, qc, end, etc
    name = Column(String(255), nullable=False)
    config = Column(JSON, default={})  # Module-specific configuration
    position = Column(JSON, default={"x": 0, "y": 0})  # Visual position in builder

    # Relationships
    workflow = relationship("Workflow", back_populates="modules")


class WorkflowConnection(Base):
    """Connections between modules in a workflow"""
    __tablename__ = "workflow_connections"

    id = Column(String, primary_key=True, default=lambda: f"conn_{uuid.uuid4().hex[:8]}")
    workflow_id = Column(String, ForeignKey("workflows.id"), nullable=False)
    from_module_id = Column(String, nullable=False)
    from_output = Column(String, nullable=False)
    to_module_id = Column(String, nullable=False)
    to_input = Column(String, nullable=False)
    condition = Column(String, nullable=True)  # For conditional routing

    # Relationships
    workflow = relationship("Workflow", back_populates="connections")


class WorkflowExecution(Base):
    """Execution instance of a workflow"""
    __tablename__ = "workflow_executions"

    id = Column(String, primary_key=True, default=lambda: f"exec_{uuid.uuid4().hex[:8]}")
    workflow_id = Column(String, ForeignKey("workflows.id"), nullable=False)
    tenant_id = Column(String, ForeignKey("tenants.id"), nullable=True, index=True)
    state = Column(String(50), default="running")  # running, paused_for_qc, completed, failed
    current_module_id = Column(String, nullable=True)
    execution_data = Column(JSON, default={})  # Store module outputs and context
    paused_data = Column(JSON, nullable=True)  # Store data when paused for QC
    archived = Column(Boolean, default=False)
    started_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    workflow = relationship("Workflow", back_populates="executions")
