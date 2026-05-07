# Sprint 6.2 Priority 4: A/B Testing Integration + Next Sprint Planning

## Overview
With Andon Alerts and Bidirectional Editing complete, the final piece of Sprint 6.2 is integrating A/B test results directly into the Standard Work view. This will show which MCP servers are winning and their cost savings.

---

## Priority 4: A/B Testing Integration (2 Days)

### Objective
Display A/B test results in Standard Work view, showing:
- Winner badges for best-performing variants
- Cost savings percentages
- Performance metrics (quality, speed, cost)
- One-click application of winning configurations

---

## Step 1: Database Schema for A/B Results

### 1.1 Create Migration for A/B Test Results Storage

**File: `alembic/versions/010_add_ab_test_results.py`**

```python
"""Add A/B test results tracking

Revision ID: 010_add_ab_test_results
Revises: 009_add_time_overrides
Create Date: 2024-10-31
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = '010_add_ab_test_results'
down_revision = '009_add_time_overrides'
branch_labels = None
depends_on = None

def upgrade():
    # Create table for A/B test results
    op.create_table('ab_test_results',
        sa.Column('id', sa.String(), nullable=False),
        sa.Column('workflow_id', sa.String(), nullable=False),
        sa.Column('module_id', sa.String(), nullable=False),
        sa.Column('variant_a', sa.String(), nullable=False),  # e.g., "replicate_mcp"
        sa.Column('variant_b', sa.String(), nullable=False),  # e.g., "akool_mcp"
        sa.Column('winner', sa.String(), nullable=True),
        sa.Column('tests_run', sa.Integer(), default=0),
        sa.Column('variant_a_wins', sa.Integer(), default=0),
        sa.Column('variant_b_wins', sa.Integer(), default=0),
        sa.Column('variant_a_avg_cost', sa.Float(), default=0.0),
        sa.Column('variant_b_avg_cost', sa.Float(), default=0.0),
        sa.Column('variant_a_avg_time', sa.Float(), default=0.0),
        sa.Column('variant_b_avg_time', sa.Float(), default=0.0),
        sa.Column('variant_a_quality_score', sa.Float(), default=0.0),
        sa.Column('variant_b_quality_score', sa.Float(), default=0.0),
        sa.Column('cost_savings_percent', sa.Float(), default=0.0),
        sa.Column('confidence_level', sa.String(), default='low'),  # low/medium/high
        sa.Column('last_test_at', sa.DateTime(timezone=True)),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), onupdate=sa.func.now()),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['workflow_id'], ['workflows.id'], ondelete='CASCADE'),
        sa.UniqueConstraint('workflow_id', 'module_id', name='uq_workflow_module_ab_test')
    )
    
    # Add index for quick lookups
    op.create_index('ix_ab_test_workflow', 'ab_test_results', ['workflow_id'])
    op.create_index('ix_ab_test_module', 'ab_test_results', ['module_id'])
    
    # Add column to workflow_modules to track selected variant
    op.add_column('workflow_modules',
        sa.Column('selected_variant', sa.String(), nullable=True))
    op.add_column('workflow_modules',
        sa.Column('ab_test_enabled', sa.Boolean(), default=False))

def downgrade():
    op.drop_column('workflow_modules', 'selected_variant')
    op.drop_column('workflow_modules', 'ab_test_enabled')
    op.drop_index('ix_ab_test_module')
    op.drop_index('ix_ab_test_workflow')
    op.drop_table('ab_test_results')
```

### 1.2 Update Database Models

**File: Update `src/database/models.py`** (ADD new model)

```python
# Add this new model class
class ABTestResult(Base):
    __tablename__ = "ab_test_results"
    
    id = Column(String, primary_key=True, default=lambda: f"ab_{uuid.uuid4().hex[:12]}")
    workflow_id = Column(String, ForeignKey("workflows.id", ondelete="CASCADE"), nullable=False)
    module_id = Column(String, nullable=False)
    
    # Variants being tested
    variant_a = Column(String, nullable=False)
    variant_b = Column(String, nullable=False)
    winner = Column(String, nullable=True)
    
    # Test statistics
    tests_run = Column(Integer, default=0)
    variant_a_wins = Column(Integer, default=0)
    variant_b_wins = Column(Integer, default=0)
    
    # Performance metrics
    variant_a_avg_cost = Column(Float, default=0.0)
    variant_b_avg_cost = Column(Float, default=0.0)
    variant_a_avg_time = Column(Float, default=0.0)
    variant_b_avg_time = Column(Float, default=0.0)
    variant_a_quality_score = Column(Float, default=0.0)  # 0-100
    variant_b_quality_score = Column(Float, default=0.0)
    
    # Calculated fields
    cost_savings_percent = Column(Float, default=0.0)
    confidence_level = Column(String, default='low')  # low/medium/high based on sample size
    
    # Timestamps
    last_test_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    workflow = relationship("Workflow", back_populates="ab_test_results")
    
    @property
    def has_winner(self):
        """Check if we have enough data to declare a winner"""
        return self.winner is not None and self.tests_run >= 10
    
    @property
    def winning_metrics(self):
        """Get metrics for the winning variant"""
        if not self.winner:
            return None
        
        if self.winner == self.variant_a:
            return {
                "cost": self.variant_a_avg_cost,
                "time": self.variant_a_avg_time,
                "quality": self.variant_a_quality_score,
                "wins": self.variant_a_wins
            }
        else:
            return {
                "cost": self.variant_b_avg_cost,
                "time": self.variant_b_avg_time,
                "quality": self.variant_b_quality_score,
                "wins": self.variant_b_wins
            }

# Update Workflow model to add relationship
class Workflow(Base):
    # ... existing fields ...
    ab_test_results = relationship("ABTestResult", back_populates="workflow", cascade="all, delete-orphan")

# Update WorkflowModule model
class WorkflowModule(Base):
    # ... existing fields ...
    selected_variant = Column(String, nullable=True)
    ab_test_enabled = Column(Boolean, default=False)
```

---

## Step 2: Backend API for A/B Test Results

### 2.1 Create A/B Test Results API

**File: `src/api/ab_testing.py`** (NEW)

```python
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from datetime import datetime, timedelta
from typing import List, Optional
from pydantic import BaseModel
import random

from src.database.connection import get_db
from src.database.models import ABTestResult, WorkflowModule, WorkflowExecution

router = APIRouter(prefix="/api/ab-testing", tags=["ab_testing"])

class ABTestUpdate(BaseModel):
    """Model for updating A/B test results"""
    module_id: str
    variant_used: str
    execution_time: float
    cost: float
    passed_qc: bool
    quality_score: Optional[float] = None

class ABTestSummary(BaseModel):
    """Summary of A/B test results"""
    module_id: str
    module_name: str
    variant_a: str
    variant_b: str
    winner: Optional[str]
    tests_run: int
    confidence_level: str
    cost_savings_percent: float
    performance_comparison: dict

@router.post("/workflows/{workflow_id}/record-test")
async def record_ab_test_result(
    workflow_id: str,
    test_update: ABTestUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Record the result of an A/B test execution"""
    
    # Get or create A/B test result record
    result = await db.execute(
        select(ABTestResult).where(
            and_(
                ABTestResult.workflow_id == workflow_id,
                ABTestResult.module_id == test_update.module_id
            )
        )
    )
    ab_result = result.scalar_one_or_none()
    
    if not ab_result:
        # Create new A/B test result record (simplified for demo)
        # In production, get variants from module config
        ab_result = ABTestResult(
            workflow_id=workflow_id,
            module_id=test_update.module_id,
            variant_a="replicate_mcp",
            variant_b="akool_mcp"
        )
        db.add(ab_result)
    
    # Update statistics
    ab_result.tests_run += 1
    ab_result.last_test_at = datetime.utcnow()
    
    # Update variant-specific metrics
    if test_update.variant_used == ab_result.variant_a:
        if test_update.passed_qc:
            ab_result.variant_a_wins += 1
        # Update running averages
        ab_result.variant_a_avg_cost = (
            (ab_result.variant_a_avg_cost * (ab_result.tests_run - 1) + test_update.cost) 
            / ab_result.tests_run
        )
        ab_result.variant_a_avg_time = (
            (ab_result.variant_a_avg_time * (ab_result.tests_run - 1) + test_update.execution_time)
            / ab_result.tests_run
        )
        if test_update.quality_score:
            ab_result.variant_a_quality_score = test_update.quality_score
    else:
        if test_update.passed_qc:
            ab_result.variant_b_wins += 1
        ab_result.variant_b_avg_cost = (
            (ab_result.variant_b_avg_cost * (ab_result.tests_run - 1) + test_update.cost)
            / ab_result.tests_run
        )
        ab_result.variant_b_avg_time = (
            (ab_result.variant_b_avg_time * (ab_result.tests_run - 1) + test_update.execution_time)
            / ab_result.tests_run
        )
        if test_update.quality_score:
            ab_result.variant_b_quality_score = test_update.quality_score
    
    # Determine winner if we have enough data
    if ab_result.tests_run >= 10:  # Minimum sample size
        # Simple winner determination (in production, use statistical significance)
        a_score = (ab_result.variant_a_wins / ab_result.tests_run * 100) - ab_result.variant_a_avg_cost * 10
        b_score = (ab_result.variant_b_wins / ab_result.tests_run * 100) - ab_result.variant_b_avg_cost * 10
        
        if abs(a_score - b_score) > 5:  # Significant difference threshold
            ab_result.winner = ab_result.variant_a if a_score > b_score else ab_result.variant_b
            
            # Calculate cost savings
            if ab_result.variant_a_avg_cost > 0 and ab_result.variant_b_avg_cost > 0:
                higher_cost = max(ab_result.variant_a_avg_cost, ab_result.variant_b_avg_cost)
                lower_cost = min(ab_result.variant_a_avg_cost, ab_result.variant_b_avg_cost)
                ab_result.cost_savings_percent = ((higher_cost - lower_cost) / higher_cost) * 100
        
        # Set confidence level based on sample size
        if ab_result.tests_run >= 100:
            ab_result.confidence_level = 'high'
        elif ab_result.tests_run >= 50:
            ab_result.confidence_level = 'medium'
        else:
            ab_result.confidence_level = 'low'
    
    await db.commit()
    
    return {
        "success": True,
        "tests_run": ab_result.tests_run,
        "current_winner": ab_result.winner,
        "confidence": ab_result.confidence_level
    }

@router.get("/workflows/{workflow_id}/results")
async def get_ab_test_results(
    workflow_id: str,
    db: AsyncSession = Depends(get_db)
) -> List[ABTestSummary]:
    """Get all A/B test results for a workflow"""
    
    # Get all A/B test results for this workflow
    result = await db.execute(
        select(ABTestResult)
        .where(ABTestResult.workflow_id == workflow_id)
        .order_by(ABTestResult.module_id)
    )
    ab_results = result.scalars().all()
    
    summaries = []
    for ab_result in ab_results:
        # Get module name
        module_result = await db.execute(
            select(WorkflowModule)
            .where(WorkflowModule.id == ab_result.module_id)
        )
        module = module_result.scalar_one_or_none()
        
        summary = {
            "module_id": ab_result.module_id,
            "module_name": module.name if module else "Unknown",
            "variant_a": ab_result.variant_a,
            "variant_b": ab_result.variant_b,
            "winner": ab_result.winner,
            "tests_run": ab_result.tests_run,
            "confidence_level": ab_result.confidence_level,
            "cost_savings_percent": round(ab_result.cost_savings_percent, 1),
            "performance_comparison": {
                ab_result.variant_a: {
                    "wins": ab_result.variant_a_wins,
                    "win_rate": round(ab_result.variant_a_wins / ab_result.tests_run * 100, 1) if ab_result.tests_run > 0 else 0,
                    "avg_cost": round(ab_result.variant_a_avg_cost, 4),
                    "avg_time": round(ab_result.variant_a_avg_time, 1),
                    "quality_score": round(ab_result.variant_a_quality_score, 1)
                },
                ab_result.variant_b: {
                    "wins": ab_result.variant_b_wins,
                    "win_rate": round(ab_result.variant_b_wins / ab_result.tests_run * 100, 1) if ab_result.tests_run > 0 else 0,
                    "avg_cost": round(ab_result.variant_b_avg_cost, 4),
                    "avg_time": round(ab_result.variant_b_avg_time, 1),
                    "quality_score": round(ab_result.variant_b_quality_score, 1)
                }
            }
        }
        
        summaries.append(summary)
    
    return summaries

@router.post("/workflows/{workflow_id}/apply-winners")
async def apply_ab_test_winners(
    workflow_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Apply all A/B test winners to the workflow configuration"""
    
    # Get all A/B test results with winners
    result = await db.execute(
        select(ABTestResult)
        .where(
            and_(
                ABTestResult.workflow_id == workflow_id,
                ABTestResult.winner.isnot(None)
            )
        )
    )
    ab_results = result.scalars().all()
    
    changes_applied = []
    
    for ab_result in ab_results:
        # Update the module to use the winning variant
        module_result = await db.execute(
            select(WorkflowModule)
            .where(WorkflowModule.id == ab_result.module_id)
        )
        module = module_result.scalar_one_or_none()
        
        if module:
            old_variant = module.selected_variant
            module.selected_variant = ab_result.winner
            module.ab_test_enabled = False  # Disable A/B testing once winner is selected
            
            # Update module config to use winner
            if not module.config:
                module.config = {}
            module.config["mcp_server"] = ab_result.winner
            module.config["ab_test_complete"] = True
            module.config["ab_test_results"] = {
                "winner": ab_result.winner,
                "cost_savings": ab_result.cost_savings_percent,
                "tests_run": ab_result.tests_run,
                "confidence": ab_result.confidence_level
            }
            
            changes_applied.append({
                "module_id": module.id,
                "module_name": module.name,
                "old_variant": old_variant,
                "new_variant": ab_result.winner,
                "cost_savings": round(ab_result.cost_savings_percent, 1)
            })
    
    await db.commit()
    
    return {
        "success": True,
        "changes_applied": len(changes_applied),
        "changes": changes_applied,
        "total_cost_savings": sum(c["cost_savings"] for c in changes_applied)
    }

@router.post("/modules/{module_id}/simulate-ab-test")
async def simulate_ab_test_data(
    module_id: str,
    workflow_id: str,
    num_tests: int = 50,
    db: AsyncSession = Depends(get_db)
):
    """Simulate A/B test data for demonstration purposes"""
    
    # Create or get A/B test result
    result = await db.execute(
        select(ABTestResult).where(
            and_(
                ABTestResult.workflow_id == workflow_id,
                ABTestResult.module_id == module_id
            )
        )
    )
    ab_result = result.scalar_one_or_none()
    
    if not ab_result:
        ab_result = ABTestResult(
            workflow_id=workflow_id,
            module_id=module_id,
            variant_a="replicate_mcp",
            variant_b="akool_mcp"
        )
        db.add(ab_result)
    
    # Simulate test results with realistic bias
    for _ in range(num_tests):
        # Randomly choose variant
        variant = random.choice([ab_result.variant_a, ab_result.variant_b])
        
        # Simulate performance (Replicate slightly better quality, Akool faster/cheaper)
        if variant == "replicate_mcp":
            passed_qc = random.random() < 0.92  # 92% pass rate
            cost = random.uniform(0.012, 0.018)
            time = random.uniform(12, 18)
            quality = random.uniform(85, 95)
        else:  # akool_mcp
            passed_qc = random.random() < 0.88  # 88% pass rate
            cost = random.uniform(0.008, 0.012)
            time = random.uniform(8, 14)
            quality = random.uniform(80, 92)
        
        # Update statistics
        ab_result.tests_run += 1
        
        if variant == ab_result.variant_a:
            if passed_qc:
                ab_result.variant_a_wins += 1
            ab_result.variant_a_avg_cost = (
                (ab_result.variant_a_avg_cost * (ab_result.tests_run - 1) + cost) 
                / ab_result.tests_run
            )
            ab_result.variant_a_avg_time = (
                (ab_result.variant_a_avg_time * (ab_result.tests_run - 1) + time)
                / ab_result.tests_run
            )
            ab_result.variant_a_quality_score = quality
        else:
            if passed_qc:
                ab_result.variant_b_wins += 1
            ab_result.variant_b_avg_cost = (
                (ab_result.variant_b_avg_cost * (ab_result.tests_run - 1) + cost)
                / ab_result.tests_run
            )
            ab_result.variant_b_avg_time = (
                (ab_result.variant_b_avg_time * (ab_result.tests_run - 1) + time)
                / ab_result.tests_run
            )
            ab_result.variant_b_quality_score = quality
    
    # Determine winner
    a_score = (ab_result.variant_a_wins / ab_result.tests_run * 100) - ab_result.variant_a_avg_cost * 100
    b_score = (ab_result.variant_b_wins / ab_result.tests_run * 100) - ab_result.variant_b_avg_cost * 100
    
    ab_result.winner = ab_result.variant_a if a_score > b_score else ab_result.variant_b
    
    # Calculate cost savings
    higher_cost = max(ab_result.variant_a_avg_cost, ab_result.variant_b_avg_cost)
    lower_cost = min(ab_result.variant_a_avg_cost, ab_result.variant_b_avg_cost)
    ab_result.cost_savings_percent = ((higher_cost - lower_cost) / higher_cost) * 100
    
    ab_result.confidence_level = 'high' if num_tests >= 100 else 'medium' if num_tests >= 50 else 'low'
    ab_result.last_test_at = datetime.utcnow()
    
    await db.commit()
    
    return {
        "success": True,
        "tests_simulated": num_tests,
        "winner": ab_result.winner,
        "cost_savings": round(ab_result.cost_savings_percent, 1),
        "results": {
            ab_result.variant_a: {
                "wins": ab_result.variant_a_wins,
                "avg_cost": round(ab_result.variant_a_avg_cost, 4),
                "avg_time": round(ab_result.variant_a_avg_time, 1)
            },
            ab_result.variant_b: {
                "wins": ab_result.variant_b_wins,
                "avg_cost": round(ab_result.variant_b_avg_cost, 4),
                "avg_time": round(ab_result.variant_b_avg_time, 1)
            }
        }
    }
```

### 2.2 Add Router to Main App

**File: Update `src/main_workflow_db.py`** (ADD after line 754)

```python
# Import the new router
from src.api import ab_testing

# Add the router
app.include_router(ab_testing.router)
```

---

## Step 3: Frontend Integration

### 3.1 Add CSS Styles

**File: Update `frontend/tps-builder.html`** (ADD to style section)

```css
/* A/B Testing Styles */
.ab-test-indicator {
    display: inline-block;
    background: linear-gradient(45deg, #ff6b35, #ff8c5a);
    color: white;
    padding: 0.2rem 0.5rem;
    border-radius: 4px;
    font-size: 0.75rem;
    font-weight: bold;
    margin-left: 0.5rem;
}

.ab-results-card {
    background: rgba(255, 107, 53, 0.05);
    border: 1px solid rgba(255, 107, 53, 0.3);
    border-radius: 4px;
    padding: 0.75rem;
    margin-top: 0.5rem;
}

.ab-winner-badge {
    display: inline-block;
    background: linear-gradient(45deg, #00cc00, #00ff00);
    color: #000;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    font-size: 0.85rem;
    font-weight: bold;
    animation: pulse-winner 2s infinite;
}

@keyframes pulse-winner {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.05); }
}

.ab-savings {
    color: #ffaa00;
    font-weight: bold;
    font-size: 1.1rem;
}

.ab-comparison-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.5rem;
    margin-top: 0.5rem;
}

.variant-card {
    background: rgba(255, 255, 255, 0.05);
    padding: 0.5rem;
    border-radius: 4px;
    border: 1px solid rgba(255, 255, 255, 0.1);
}

.variant-card.winner {
    border: 2px solid #00ff00;
    background: rgba(0, 255, 0, 0.05);
}

.variant-metric {
    display: flex;
    justify-content: space-between;
    margin: 0.25rem 0;
    font-size: 0.85rem;
}

.confidence-indicator {
    display: inline-block;
    padding: 0.15rem 0.5rem;
    border-radius: 3px;
    font-size: 0.75rem;
    margin-left: 0.5rem;
}

.confidence-high {
    background: rgba(0, 255, 0, 0.2);
    color: #00ff00;
}

.confidence-medium {
    background: rgba(255, 170, 0, 0.2);
    color: #ffaa00;
}

.confidence-low {
    background: rgba(255, 68, 68, 0.2);
    color: #ff4444;
}

.apply-winners-section {
    background: linear-gradient(135deg, #2a2a2a 0%, #1a1a1a 100%);
    border: 2px solid #00ff00;
    border-radius: 8px;
    padding: 1rem;
    margin: 1rem 0;
    text-align: center;
}

.simulate-btn {
    background: #666;
    color: white;
    border: none;
    padding: 0.5rem 1rem;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.85rem;
}

.simulate-btn:hover {
    background: #777;
}
```

### 3.2 Update Table to Show A/B Results

**File: Update `frontend/tps-builder.html`** (MODIFY Tool/MCP column)

```html
<!-- Update the Tool/MCP column (around line 510) -->
<td>
    <div class="tool-mcp-cell">
        <!-- Existing MCP server display -->
        <div>{{ step.tool_mcp || 'System' }}</div>
        
        <!-- A/B Test Indicator -->
        <span v-if="isABTestModule(step)" class="ab-test-indicator">
            A/B Test
        </span>
        
        <!-- A/B Test Results Card -->
        <div v-if="abTestResults[step.module_id]" class="ab-results-card">
            <!-- Winner Badge -->
            <div v-if="abTestResults[step.module_id].winner">
                <span class="ab-winner-badge">
                    🏆 Winner: {{ abTestResults[step.module_id].winner }}
                </span>
                <span class="ab-savings">
                    {{ abTestResults[step.module_id].cost_savings_percent }}% savings
                </span>
                <span class="confidence-indicator" 
                      :class="'confidence-' + abTestResults[step.module_id].confidence_level">
                    {{ abTestResults[step.module_id].confidence_level }} confidence
                </span>
            </div>
            
            <!-- Comparison Grid -->
            <div class="ab-comparison-grid">
                <div v-for="(variant, name) in abTestResults[step.module_id].performance_comparison" 
                     :key="name"
                     class="variant-card"
                     :class="{ winner: name === abTestResults[step.module_id].winner }">
                    <strong>{{ name }}</strong>
                    <div class="variant-metric">
                        <span>Win Rate:</span>
                        <span>{{ variant.win_rate }}%</span>
                    </div>
                    <div class="variant-metric">
                        <span>Avg Cost:</span>
                        <span>${{ variant.avg_cost }}</span>
                    </div>
                    <div class="variant-metric">
                        <span>Avg Time:</span>
                        <span>{{ variant.avg_time }}s</span>
                    </div>
                    <div class="variant-metric">
                        <span>Quality:</span>
                        <span>{{ variant.quality_score }}/100</span>
                    </div>
                </div>
            </div>
            
            <!-- Tests Run -->
            <div style="margin-top: 0.5rem; font-size: 0.75rem; opacity: 0.8;">
                Based on {{ abTestResults[step.module_id].tests_run }} tests
            </div>
            
            <!-- Simulate Button (for demo) -->
            <button v-if="!abTestResults[step.module_id].winner || abTestResults[step.module_id].tests_run < 50" 
                    @click="simulateABTest(step.module_id)" 
                    class="simulate-btn">
                Simulate More Tests
            </button>
        </div>
        
        <!-- No Results Yet -->
        <div v-else-if="isABTestModule(step)" class="ab-results-card" style="opacity: 0.6;">
            <em>No A/B test results yet</em>
            <button @click="simulateABTest(step.module_id)" class="simulate-btn" style="margin-top: 0.5rem;">
                Run Simulated Test
            </button>
        </div>
    </div>
</td>
```

### 3.3 Add Apply Winners Section

**File: Update `frontend/tps-builder.html`** (ADD after the table, before totals)

```html
<!-- A/B Test Winners Application Section -->
<div v-if="hasABTestWinners" class="apply-winners-section">
    <h3 style="color: #00ff00; margin-bottom: 1rem;">
        🎯 A/B Test Winners Available
    </h3>
    <p style="margin-bottom: 1rem;">
        {{ abTestWinnersCount }} modules have identified optimal configurations
        with potential total savings of {{ totalCostSavings }}%
    </p>
    <button @click="applyAllWinners()" class="btn btn-success" style="background: #00cc00; font-size: 1.1rem;">
        ✓ Apply All Winners to Workflow
    </button>
</div>
```

### 3.4 Update Vue.js Methods

**File: Update `frontend/tps-builder.html`** (ADD to Vue app)

```javascript
// Add to data()
data() {
    return {
        // ... existing data ...
        abTestResults: {},
        isLoadingABResults: false
    }
},

// Add to computed
computed: {
    // ... existing computed ...
    
    hasABTestWinners() {
        return Object.values(this.abTestResults).some(r => r.winner);
    },
    
    abTestWinnersCount() {
        return Object.values(this.abTestResults).filter(r => r.winner).length;
    },
    
    totalCostSavings() {
        const savings = Object.values(this.abTestResults)
            .filter(r => r.winner)
            .reduce((sum, r) => sum + r.cost_savings_percent, 0);
        return Math.round(savings);
    }
},

// Add to methods
methods: {
    // ... existing methods ...
    
    async loadABTestResults() {
        if (!this.selectedWorkflow) return;
        
        this.isLoadingABResults = true;
        try {
            const response = await fetch(`/api/ab-testing/workflows/${this.selectedWorkflow.id}/results`);
            if (response.ok) {
                const results = await response.json();
                
                // Map results by module_id
                this.abTestResults = {};
                results.forEach(result => {
                    this.abTestResults[result.module_id] = result;
                });
            }
        } catch (error) {
            console.error('Error loading A/B test results:', error);
        } finally {
            this.isLoadingABResults = false;
        }
    },
    
    isABTestModule(step) {
        return step.module_type === 'ab_testing' || 
               step.module_type === 'mcp_ab_testing' ||
               (step.tool_mcp && step.tool_mcp.includes('mcp'));
    },
    
    async simulateABTest(moduleId) {
        if (!this.selectedWorkflow) return;
        
        const numTests = prompt('How many tests to simulate?', '50');
        if (!numTests) return;
        
        try {
            const response = await fetch(`/api/ab-testing/modules/${moduleId}/simulate-ab-test?workflow_id=${this.selectedWorkflow.id}&num_tests=${numTests}`, {
                method: 'POST'
            });
            
            if (response.ok) {
                const result = await response.json();
                this.showToast('success', `Simulated ${result.tests_simulated} tests. Winner: ${result.winner} (${result.cost_savings}% savings)`);
                
                // Reload A/B results
                await this.loadABTestResults();
            }
        } catch (error) {
            console.error('Error simulating A/B test:', error);
            this.showToast('error', 'Failed to simulate A/B test');
        }
    },
    
    async applyAllWinners() {
        if (!this.selectedWorkflow) return;
        
        if (!confirm('Apply all A/B test winners to the workflow? This will update the workflow configuration.')) {
            return;
        }
        
        try {
            const response = await fetch(`/api/ab-testing/workflows/${this.selectedWorkflow.id}/apply-winners`, {
                method: 'POST'
            });
            
            if (response.ok) {
                const result = await response.json();
                this.showToast('success', 
                    `Applied ${result.changes_applied} winners with total savings of ${result.total_cost_savings}%!`
                );
                
                // Reload workflow to show updated configuration
                await this.loadStandardWork();
                await this.loadABTestResults();
            }
        } catch (error) {
            console.error('Error applying winners:', error);
            this.showToast('error', 'Failed to apply A/B test winners');
        }
    }
},

// Update watch to load A/B results
watch: {
    selectedWorkflow() {
        if (this.selectedWorkflow) {
            this.loadStandardWork();
            this.loadTPSMetrics();
            this.loadAndonStatus();
            this.loadABTestResults();  // Add this
        }
    }
},

// Update mounted to load A/B results
mounted() {
    this.loadWorkflows();
    const urlParams = new URLSearchParams(window.location.search);
    const workflowId = urlParams.get('workflow_id');
    if (workflowId) {
        this.loadWorkflowById(workflowId).then(() => {
            this.loadABTestResults();  // Add this
        });
    }
}
```

---

## Step 4: Deployment Instructions

### 4.1 Run Database Migration
```bash
# SSH into container or run locally
alembic upgrade head
```

### 4.2 Commit and Deploy
```bash
git add -A
git commit -m "Sprint 6.2 Priority 4: Add A/B testing integration with winner selection"
git push origin main

flyctl deploy
```

---

## Testing & Verification

### Quick Test Flow
1. Go to TPS Builder
2. Select a workflow with MCP modules
3. Click "Run Simulated Test" on any module
4. Watch results populate with winner badges
5. Click "Apply All Winners" to lock in optimal configurations

### What to Verify
- [ ] A/B test indicators appear on relevant modules
- [ ] Simulation creates realistic test data
- [ ] Winner badges show with cost savings
- [ ] Confidence levels display correctly
- [ ] Apply Winners updates workflow configuration
- [ ] Results persist after page refresh

---

# Sprint 7.0 Planning: What Comes Next

## Priority Matrix for Next Sprint

### 🔴 **HIGHEST PRIORITY - Revenue Enablers**

#### 1. **SPC Analytics Dashboard** (3 days)
- Control charts for quality metrics
- Pareto analysis of failure modes
- Trend analysis over time
- **Why Critical:** Your #1 differentiator that NO competitor has

#### 2. **Cost Tracking Dashboard** (2 days)
- Real-time cost per workflow/module
- Cost trends and projections
- ROI calculator
- **Why Critical:** Validates your 30% cost savings claim

#### 3. **Workflow Templates Library** (2 days)
- Pre-built workflows for common use cases
- Industry-specific templates
- One-click deployment
- **Why Critical:** Reduces time-to-value for new customers

### 🟡 **MEDIUM PRIORITY - User Experience**

#### 4. **MCP Server Health Monitor** (2 days)
- Real-time status of all connected MCP servers
- Automatic failover configuration
- Performance benchmarks
- **Why:** Prevents workflow failures

#### 5. **Mobile Responsive TPS Builder** (3 days)
- Tablet optimization for shop floor use
- Touch-friendly interface
- Offline capability
- **Why:** Enables Gemba walks

#### 6. **Workflow Version Control** (3 days)
- Git-like versioning for workflows
- Rollback capability
- Change tracking
- **Why:** Enterprise requirement

### 🟢 **LOWER PRIORITY - Nice to Have**

#### 7. **Advanced Authentication** (3 days)
- SSO integration
- Role-based access control
- Team workspaces
- **Why:** Enterprise feature

#### 8. **Workflow Marketplace** (5 days)
- Share/sell workflow templates
- Community ratings
- Revenue sharing
- **Why:** Creates network effects

---

## Recommended Sprint 7.0 Scope (2 Weeks)

### Week 1: Analytics & Cost
1. **SPC Analytics Dashboard** - Show your differentiation
2. **Cost Tracking Dashboard** - Prove your value proposition

### Week 2: Templates & Health
3. **Workflow Templates Library** - Accelerate adoption
4. **MCP Server Health Monitor** - Ensure reliability

This combination:
- **Validates your unique value** (SPC + Cost savings)
- **Accelerates customer onboarding** (Templates)
- **Ensures production reliability** (Health monitor)

---

## Success Metrics to Track

### From Sprint 6.2
- How many times are times edited?
- How many Andon alerts trigger?
- A/B test winner adoption rate

### For Sprint 7.0
- Average workflow creation time (should drop 50% with templates)
- Cost savings documented per customer
- Quality improvements from SPC insights
- MCP server uptime/reliability

---

## Technical Debt to Address

1. **Add comprehensive error handling** for MCP server failures
2. **Implement caching** for Standard Work generation
3. **Add WebSocket support** for real-time updates
4. **Create automated tests** for critical paths
5. **Document API endpoints** with Swagger/OpenAPI

---

## Competitive Positioning Update

With Sprint 6.2 complete, you now have:
- ✅ **Only platform with TPS/Standard Work** (Nobody else has this)
- ✅ **Only platform with integrated SPC** (Coming in Sprint 7)
- ✅ **Built-in A/B testing** (Others require custom implementation)
- ✅ **Visual Andon alerts** (Unique operational excellence feature)
- ✅ **Bidirectional editing** (Continuous improvement built-in)

You're successfully building the **"Toyota Production System for AI Workflows"** - a genuinely unique position in the market!