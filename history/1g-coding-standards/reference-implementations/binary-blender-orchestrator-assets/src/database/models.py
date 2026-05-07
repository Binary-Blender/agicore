"""
Database models for Assets Service

This service owns: Asset, QCTask, QCDecision, ABTestResult
References (foreign keys): Workflow, WorkflowExecution, Tenant
"""
from datetime import datetime
from sqlalchemy import Column, String, DateTime, JSON, ForeignKey, Text, Boolean, Integer, Numeric
from sqlalchemy.orm import declarative_base, relationship
from sqlalchemy.sql import func
import uuid

Base = declarative_base()


# ============================================================================
# REFERENCED MODELS (owned by other services)
# ============================================================================

class Tenant(Base):
    """Multi-tenancy support - OWNED BY EXECUTION SERVICE"""
    __tablename__ = "tenants"

    id = Column(String, primary_key=True)
    name = Column(String(255))
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Workflow(Base):
    """Workflow definitions - OWNED BY EXECUTION SERVICE"""
    __tablename__ = "workflows"

    id = Column(String, primary_key=True)
    tenant_id = Column(String, ForeignKey("tenants.id"))
    name = Column(String(255))
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class WorkflowExecution(Base):
    """Workflow executions - OWNED BY EXECUTION SERVICE"""
    __tablename__ = "workflow_executions"

    id = Column(String, primary_key=True)
    workflow_id = Column(String, ForeignKey("workflows.id"))
    tenant_id = Column(String, ForeignKey("tenants.id"))
    state = Column(String(50))
    started_at = Column(DateTime(timezone=True), server_default=func.now())


# ============================================================================
# MODELS OWNED BY THIS SERVICE
# ============================================================================

class Asset(Base):
    """Assets (images/videos/etc) in the repository"""
    __tablename__ = "assets"

    id = Column(String, primary_key=True, default=lambda: f"asset_{uuid.uuid4().hex[:8]}")
    tenant_id = Column(String, ForeignKey("tenants.id"), nullable=True, index=True)
    type = Column(String(50), default="image")  # "image", "video", "text", "audio"
    url = Column(Text, nullable=False)
    prompt = Column(Text, nullable=True)
    asset_metadata = Column(JSON, default={})
    state = Column(String(50), default="unchecked")  # unchecked, approved, rejected
    archived = Column(Boolean, default=False)

    # Provider tracking
    provider = Column(String(100), nullable=True)
    provider_metadata = Column(JSON, nullable=True)
    quality_metrics = Column(JSON, nullable=True)

    # Lineage tracking
    workflow_id = Column(String, ForeignKey("workflows.id", ondelete="SET NULL"), nullable=True, index=True)
    execution_id = Column(String, ForeignKey("workflow_executions.id", ondelete="SET NULL"), nullable=True, index=True)
    module_id = Column(String, nullable=True, index=True)
    source_asset_ids = Column(JSON, default=[])

    # Organization
    tags = Column(JSON, default=[])
    collection_id = Column(String, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    qc_decisions = relationship("QCDecision", back_populates="asset", cascade="all, delete-orphan")


class QCTask(Base):
    """Quality Control tasks in the queue"""
    __tablename__ = "qc_tasks"

    id = Column(String, primary_key=True, default=lambda: f"qc_{uuid.uuid4().hex[:8]}")
    execution_id = Column(String, ForeignKey("workflow_executions.id"), nullable=False)
    module_id = Column(String, nullable=False)
    task_type = Column(String(50), default="pass_fail")
    status = Column(String(50), default="pending")  # pending, completed
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    execution = relationship("WorkflowExecution")
    decisions = relationship("QCDecision", back_populates="qc_task", cascade="all, delete-orphan")


class QCDecision(Base):
    """Individual QC decisions for assets"""
    __tablename__ = "qc_decisions"

    id = Column(String, primary_key=True, default=lambda: f"qcd_{uuid.uuid4().hex[:8]}")
    qc_task_id = Column(String, ForeignKey("qc_tasks.id"), nullable=False)
    asset_id = Column(String, ForeignKey("assets.id"), nullable=False)
    decision = Column(String(50), nullable=False)  # pass, fail
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    qc_task = relationship("QCTask", back_populates="decisions")
    asset = relationship("Asset", back_populates="qc_decisions")


class ABTestResult(Base):
    """A/B test comparison results"""
    __tablename__ = "ab_test_results"

    id = Column(String, primary_key=True, default=lambda: f"abt_{uuid.uuid4().hex[:8]}")
    execution_id = Column(String, ForeignKey("workflow_executions.id", ondelete="CASCADE"), nullable=False)
    test_type = Column(String(50), nullable=False)
    providers_tested = Column(JSON, nullable=False)
    winner = Column(String(100), nullable=True)
    selection_method = Column(String(50), nullable=False)
    metrics = Column(JSON, nullable=True)
    user_feedback = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
