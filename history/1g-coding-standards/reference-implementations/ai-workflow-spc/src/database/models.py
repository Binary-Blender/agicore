"""
Database models for the Binary-Blender Orchestrator using SQLAlchemy
"""
from datetime import datetime
from typing import Optional
from sqlalchemy import Column, String, DateTime, JSON, ForeignKey, Text, Boolean, Table, Integer, Numeric
from sqlalchemy.orm import declarative_base, relationship
from sqlalchemy.sql import func
from sqlalchemy.dialects.postgresql import UUID, INET
import uuid

Base = declarative_base()


# ============================================================================
# SPRINT 6.0: ENTERPRISE MODELS
# ============================================================================

class Tenant(Base):
    """Multi-tenancy support - isolated workspaces for organizations"""
    __tablename__ = "tenants"

    id = Column(String, primary_key=True, default=lambda: f"tenant_{uuid.uuid4().hex[:8]}")
    name = Column(String(255), nullable=False)
    domain = Column(String(255), unique=True, nullable=True)  # Custom domain support
    settings = Column(JSON, default={})  # Tenant-specific configuration
    quota_workflows = Column(Integer, default=100)  # Resource quotas
    quota_executions_per_month = Column(Integer, default=1000)
    quota_storage_gb = Column(Integer, default=50)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    users = relationship("User", back_populates="tenant", cascade="all, delete-orphan")
    workflows = relationship("Workflow", back_populates="tenant")
    audit_logs = relationship("AuditLog", back_populates="tenant", cascade="all, delete-orphan")


class User(Base):
    """User management with RBAC"""
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=lambda: f"user_{uuid.uuid4().hex[:8]}")
    tenant_id = Column(String, ForeignKey("tenants.id"), nullable=False, index=True)
    email = Column(String(255), nullable=False, unique=True)
    name = Column(String(255), nullable=True)
    role = Column(String(50), nullable=False, default="viewer")  # admin, workflow_designer, qc_operator, viewer, cost_manager
    password_hash = Column(String(255), nullable=True)  # For local auth
    auth_provider = Column(String(50), default="local")  # local, oauth2, saml, oidc
    is_active = Column(Boolean, default=True)
    last_login = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    tenant = relationship("Tenant", back_populates="users")
    audit_logs = relationship("AuditLog", back_populates="user", cascade="all, delete-orphan")
    created_workflows = relationship("Workflow", foreign_keys="Workflow.created_by", back_populates="creator")


class AuditLog(Base):
    """Comprehensive audit trail for compliance"""
    __tablename__ = "audit_logs"

    id = Column(String, primary_key=True, default=lambda: f"audit_{uuid.uuid4().hex[:8]}")
    tenant_id = Column(String, ForeignKey("tenants.id"), nullable=False, index=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=True, index=True)
    action = Column(String(100), nullable=False, index=True)  # workflow.execute, qc.decision, etc.
    resource_type = Column(String(50), nullable=True)  # workflow, execution, asset, etc.
    resource_id = Column(String, nullable=True, index=True)
    details = Column(JSON, default={})  # Additional context
    ip_address = Column(INET, nullable=True)
    user_agent = Column(Text, nullable=True)
    result = Column(String(50), nullable=False)  # success, failure, unauthorized
    duration_ms = Column(Integer, nullable=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), index=True)

    # Relationships
    tenant = relationship("Tenant", back_populates="audit_logs")
    user = relationship("User", back_populates="audit_logs")


class CostTracking(Base):
    """Real-time cost tracking per execution and MCP server"""
    __tablename__ = "cost_tracking"

    id = Column(String, primary_key=True, default=lambda: f"cost_{uuid.uuid4().hex[:8]}")
    tenant_id = Column(String, ForeignKey("tenants.id"), nullable=False, index=True)
    execution_id = Column(String, ForeignKey("workflow_executions.id", ondelete="CASCADE"), nullable=True, index=True)
    module_id = Column(String, nullable=True)
    mcp_server = Column(String(100), nullable=True, index=True)
    operation = Column(String(100), nullable=True)  # generate_image, generate_text, etc.
    input_tokens = Column(Integer, default=0)
    output_tokens = Column(Integer, default=0)
    compute_time_ms = Column(Integer, default=0)
    cost_usd = Column(Numeric(10, 6), nullable=False)  # Precise cost in USD
    pricing_model = Column(String(50), nullable=True)  # per_token, per_request, per_second
    cost_metadata = Column(JSON, default={})  # Additional cost details
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), index=True)


class CostRule(Base):
    """Pricing rules for MCP servers and operations"""
    __tablename__ = "cost_rules"

    id = Column(String, primary_key=True, default=lambda: f"cr_{uuid.uuid4().hex[:8]}")
    mcp_server = Column(String(100), nullable=False, index=True)
    operation = Column(String(100), nullable=False)
    pricing_model = Column(String(50), nullable=False)  # per_token, per_request, per_second, per_image
    base_cost = Column(Numeric(10, 6), default=0)  # Base cost per operation
    token_cost = Column(Numeric(10, 8), default=0)  # Cost per token (if applicable)
    rule_metadata = Column(JSON, default={})  # Additional rule metadata (renamed from 'metadata' which is reserved)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class ServerHealth(Base):
    """MCP server health monitoring for auto-failover"""
    __tablename__ = "server_health"

    id = Column(String, primary_key=True, default=lambda: f"health_{uuid.uuid4().hex[:8]}")
    server_id = Column(String(100), nullable=False, unique=True, index=True)
    status = Column(String(20), nullable=False, default="healthy")  # healthy, degraded, unhealthy, offline
    latency_ms = Column(Integer, nullable=True)
    success_rate = Column(Numeric(5, 2), nullable=True)  # 0-100%
    error_count = Column(Integer, default=0)
    last_error = Column(Text, nullable=True)
    circuit_breaker_state = Column(String(20), default="closed")  # closed, open, half-open
    circuit_breaker_reset_at = Column(DateTime(timezone=True), nullable=True)
    last_check = Column(DateTime(timezone=True), server_default=func.now())
    health_metadata = Column(JSON, default={})  # Server health metadata (renamed from 'metadata' which is reserved)


class CompositeServer(Base):
    """Composite MCP servers - combine multiple servers into one logical unit"""
    __tablename__ = "composite_servers"

    id = Column(String, primary_key=True, default=lambda: f"composite_{uuid.uuid4().hex[:8]}")
    tenant_id = Column(String, ForeignKey("tenants.id"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    components = Column(JSON, nullable=False)  # Array of component configs
    workflows = Column(JSON, nullable=False)  # Workflow definitions for composition
    is_active = Column(Boolean, default=True)
    created_by = Column(String, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class MCPServerConfig(Base):
    """Custom MCP server configurations created via the builder"""
    __tablename__ = "mcp_server_configs"

    id = Column(String, primary_key=True, default=lambda: f"mcp_config_{uuid.uuid4().hex[:8]}")
    tenant_id = Column(String, ForeignKey("tenants.id"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    base_url = Column(String(500), nullable=False)
    auth_type = Column(String(50), nullable=False)  # none, api_key, oauth2, custom
    auth_config = Column(JSON, default={})  # Auth configuration
    tools = Column(JSON, nullable=False)  # Tool definitions
    generated_code = Column(JSON, nullable=True)  # Generated TypeScript and Python code
    deployment_status = Column(String(50), default="draft")  # draft, deployed, failed
    version = Column(String(50), default="1.0.0")
    created_by = Column(String, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


# ============================================================================
# EXISTING MODELS (Updated with tenant_id for multi-tenancy)
# ============================================================================


class Workflow(Base):
    """Workflow definition model"""
    __tablename__ = "workflows"

    id = Column(String, primary_key=True, default=lambda: f"wf_{uuid.uuid4().hex[:8]}")
    tenant_id = Column(String, ForeignKey("tenants.id"), nullable=True, index=True)  # Nullable for backward compatibility
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    state = Column(String(50), default="draft")  # draft, active, paused, completed
    created_by = Column(String, ForeignKey("users.id"), nullable=True)  # User who created this workflow
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    tenant = relationship("Tenant", back_populates="workflows")
    creator = relationship("User", foreign_keys=[created_by], back_populates="created_workflows")
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
    config = Column(JSON, default={})  # Module-specific configuration (including API keys)
    text_bindings = Column(JSON, default={})  # Field-level bindings to upstream module outputs
    ui_overrides = Column(JSON, default={})  # UI customization metadata (prompt/API-key flags, etc.)
    input_config = Column(JSON, default={})  # Explicit input source configuration
    position = Column(JSON, default={"x": 0, "y": 0})  # Visual position in builder

    # TPS/Standard Work fields (Sprint 6.0 - Unified Workflow Studio)
    work_element_type = Column(String(50), nullable=True)  # 'setup', 'value-add', 'inspection', 'wait'
    manual_time = Column(Numeric(10, 2), default=0)  # Manual operation time in seconds
    auto_time = Column(Numeric(10, 2), default=0)  # Automated operation time in seconds
    quality_points = Column(JSON, nullable=True)  # Quality check points
    key_points = Column(JSON, nullable=True)  # Critical instructions
    tools_required = Column(JSON, nullable=True)  # Tools/resources needed
    sequence_number = Column(Integer, nullable=True)  # Step order in Standard Work

    # Sprint 6.2: Bidirectional Editing - Time Overrides
    manual_time_override = Column(Numeric(10, 2), nullable=True)  # User-defined manual time override
    auto_time_override = Column(Numeric(10, 2), nullable=True)  # User-defined auto time override

    # Relationships
    workflow = relationship("Workflow", back_populates="modules")

    # Helper properties for effective time values
    @property
    def has_time_override(self):
        """Check if this module has any time overrides"""
        return self.manual_time_override is not None or self.auto_time_override is not None

    @property
    def effective_manual_time(self):
        """Get the effective manual time (override takes precedence)"""
        if self.manual_time_override is not None:
            return self.manual_time_override
        return self.manual_time if self.manual_time else 0

    @property
    def effective_auto_time(self):
        """Get the effective auto time (override takes precedence)"""
        if self.auto_time_override is not None:
            return self.auto_time_override
        return self.auto_time if self.auto_time else 0


class WorkflowConnection(Base):
    """Connections between modules in a workflow"""
    __tablename__ = "workflow_connections"

    id = Column(String, primary_key=True, default=lambda: f"conn_{uuid.uuid4().hex[:8]}")
    workflow_id = Column(String, ForeignKey("workflows.id"), nullable=False)
    from_module_id = Column(String, nullable=False)
    from_output = Column(String, nullable=False)
    to_module_id = Column(String, nullable=False)
    to_input = Column(String, nullable=False)
    condition = Column(String, nullable=True)  # For conditional routing (e.g., "fail")

    # Relationships
    workflow = relationship("Workflow", back_populates="connections")


class WorkflowExecution(Base):
    """Execution instance of a workflow"""
    __tablename__ = "workflow_executions"

    id = Column(String, primary_key=True, default=lambda: f"exec_{uuid.uuid4().hex[:8]}")
    workflow_id = Column(String, ForeignKey("workflows.id"), nullable=False)
    tenant_id = Column(String, ForeignKey("tenants.id"), nullable=True, index=True)  # Nullable for backward compatibility
    state = Column(String(50), default="running")  # running, paused_for_qc, completed, failed
    current_module_id = Column(String, nullable=True)
    execution_data = Column(JSON, default={})  # Store module outputs and context
    paused_data = Column(JSON, nullable=True)  # Store data when paused for QC
    archived = Column(Boolean, default=False)  # Soft delete flag
    started_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    workflow = relationship("Workflow", back_populates="executions")
    qc_tasks = relationship("QCTask", back_populates="execution", cascade="all, delete-orphan")


class AssetCollection(Base):
    """Collections/Folders that organize assets"""
    __tablename__ = "asset_collections"

    id = Column(String, primary_key=True, default=lambda: f"col_{uuid.uuid4().hex[:8]}")
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    parent_id = Column(String, ForeignKey("asset_collections.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    parent = relationship("AssetCollection", remote_side="AssetCollection.id", backref="children")
    assets = relationship("Asset", back_populates="collection")


class Asset(Base):
    """Assets (images/videos/etc) in the repository"""
    __tablename__ = "assets"

    id = Column(String, primary_key=True, default=lambda: f"asset_{uuid.uuid4().hex[:8]}")
    tenant_id = Column(String, ForeignKey("tenants.id"), nullable=True, index=True)  # Nullable for backward compatibility
    type = Column(String(50), default="image")  # "image", "video", "text", "audio"
    url = Column(Text, nullable=False)
    prompt = Column(Text, nullable=True)
    asset_metadata = Column(JSON, default={})  # Additional metadata (renamed from 'metadata' to avoid SQLAlchemy conflict)
    state = Column(String(50), default="unchecked")  # unchecked, approved, rejected
    archived = Column(Boolean, default=False)  # Soft delete flag
    text_content = Column(Text, nullable=True)
    payload = Column(JSON, nullable=True)

    # Provider tracking (Sprint 4.0)
    provider = Column(String(100), nullable=True)  # Which provider generated this asset (e.g., "akool", "replicate_sdxl")
    provider_metadata = Column(JSON, nullable=True)  # Provider-specific metadata
    quality_metrics = Column(JSON, nullable=True)  # Quality metrics for SPC

    # Lineage tracking (Asset-Centric Architecture)
    workflow_id = Column(String, ForeignKey("workflows.id", ondelete="SET NULL"), nullable=True, index=True)
    execution_id = Column(String, ForeignKey("workflow_executions.id", ondelete="SET NULL"), nullable=True, index=True)
    module_id = Column(String, nullable=True, index=True)  # Module that created this asset
    source_asset_ids = Column(JSON, default=[])  # Array of asset IDs that were inputs to create this

    # Organization
    tags = Column(JSON, default=[])  # Array of tags for filtering/search
    collection_id = Column(String, ForeignKey("asset_collections.id", ondelete="SET NULL"), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    qc_decisions = relationship("QCDecision", back_populates="asset", cascade="all, delete-orphan")
    collection = relationship("AssetCollection", back_populates="assets")


class InstalledMCPServer(Base):
    """Tracks which MCP servers are installed/available in the workspace"""
    __tablename__ = "installed_mcp_servers"

    id = Column(Integer, primary_key=True, autoincrement=True)
    server_id = Column(String(100), unique=True, nullable=False, index=True)
    status = Column(String(50), nullable=False, default="installed")
    config = Column(JSON, default=dict)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False
    )


class QCTask(Base):
    """Quality Control tasks in the queue"""
    __tablename__ = "qc_tasks"

    id = Column(String, primary_key=True, default=lambda: f"qc_{uuid.uuid4().hex[:8]}")
    execution_id = Column(String, ForeignKey("workflow_executions.id"), nullable=False)
    module_id = Column(String, nullable=False)  # Which module created this QC task
    task_type = Column(String(50), default="pass_fail")
    status = Column(String(50), default="pending")  # pending, completed
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    execution = relationship("WorkflowExecution", back_populates="qc_tasks")
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
    test_type = Column(String(50), nullable=False)  # 'side_by_side', 'blind', 'statistical'
    providers_tested = Column(JSON, nullable=False)  # ['akool', 'replicate_sdxl', 'mcp_akool']
    winner = Column(String(100), nullable=True)  # Selected provider
    selection_method = Column(String(50), nullable=False)  # 'manual', 'auto_cost', 'auto_speed', 'auto_quality'
    metrics = Column(JSON, nullable=True)  # Detailed comparison metrics
    user_feedback = Column(JSON, nullable=True)  # User notes and feedback
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)


class ProviderMetrics(Base):
    """Track provider performance over time for SPC analysis"""
    __tablename__ = "provider_metrics"

    id = Column(String, primary_key=True, default=lambda: f"pm_{uuid.uuid4().hex[:8]}")
    provider = Column(String(100), nullable=False, index=True)  # Provider identifier
    execution_id = Column(String, ForeignKey("workflow_executions.id", ondelete="CASCADE"), nullable=True)
    generation_time = Column(JSON, nullable=True)  # Seconds (stored as float in JSON for flexibility)
    cost = Column(JSON, nullable=True)  # Dollars
    quality_score = Column(JSON, nullable=True)  # 0-100
    selection_rate = Column(JSON, nullable=True)  # % selected in A/B tests
    failure_rate = Column(JSON, nullable=True)  # % of failures
    extra_metadata = Column(JSON, nullable=True)  # Additional provider-specific metrics
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), index=True)
