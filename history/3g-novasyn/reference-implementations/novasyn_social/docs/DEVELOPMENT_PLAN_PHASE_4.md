# SCREAMO DEVELOPMENT PLAN - PHASE 4
## SPC Module & Automation

**Version:** 1.0
**Last Updated:** 2025-11-23
**Duration:** 2-3 weeks
**Dependencies:** Phases 1-3 complete

---

## TABLE OF CONTENTS

1. [Phase 4 Overview](#phase-4-overview)
2. [Sprint 4.1: SPC Metrics Collection](#sprint-41-spc-metrics-collection)
3. [Sprint 4.2: Control Charts & Analysis](#sprint-42-control-charts--analysis)
4. [Sprint 4.3: Automation Tier Logic](#sprint-43-automation-tier-logic)
5. [Sprint 4.4: SPC Dashboard UI](#sprint-44-spc-dashboard-ui)
6. [Phase 4 Testing & Validation](#phase-4-testing--validation)

---

## PHASE 4 OVERVIEW

### Objectives

Phase 4 implements the Statistical Process Control (SPC) system that enables progressive automation:

- Metrics collection for draft quality
- P-chart analysis for acceptance rates
- Automation tier escalation logic
- Out-of-control action plans (OCAP)
- SPC dashboard and visualizations
- Automated tier adjustments

### Success Criteria

- [ ] SPC metrics calculated correctly
- [ ] Control charts generated
- [ ] Automation tiers adjust based on metrics
- [ ] OCAP triggers when out of control
- [ ] Dashboard shows SPC status
- [ ] Automation progresses safely

---

## SPRINT 4.1: SPC METRICS COLLECTION

**Duration:** 4-5 days

---

### STEP 4.1.1: Create SPC Metrics Model

**File: `backend/src/models/spc_metrics.py`**
```python
from sqlalchemy import Column, String, Float, Integer, Enum, UniqueConstraint, Index
from sqlalchemy.dialects.postgresql import UUID
from src.core.database import Base
import uuid
import enum

class ControlState(str, enum.Enum):
    IN_CONTROL = "IN_CONTROL"
    OUT_OF_CONTROL = "OUT_OF_CONTROL"
    WARNING = "WARNING"

class SPCMetrics(Base):
    __tablename__ = "spc_metrics"

    metric_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    channel_type = Column(String(50), nullable=False)
    response_mode = Column(String(30), nullable=False)

    # Metrics
    acceptance_rate = Column(Float, default=0.0)  # % accepted without edits
    light_edit_rate = Column(Float, default=0.0)  # % with minor edits
    heavy_edit_rate = Column(Float, default=0.0)  # % with major edits
    misclassification_rate = Column(Float, default=0.0)  # % reclassified by user

    # SPC Calculations
    sample_size = Column(Integer, default=0)
    control_state = Column(Enum(ControlState), default=ControlState.WARNING)
    upper_control_limit = Column(Float)
    lower_control_limit = Column(Float)
    mean_value = Column(Float)  # p-bar

    __table_args__ = (
        UniqueConstraint('channel_type', 'response_mode', name='uq_channel_mode'),
        Index('idx_spc_channel_mode', 'channel_type', 'response_mode'),
    )
```

**File: `backend/src/models/automation_tier.py`**
```python
from sqlalchemy import Column, String, Integer, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from src.core.database import Base
import uuid

class AutomationTier(Base):
    __tablename__ = "automation_tiers"

    tier_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    channel_type = Column(String(50), nullable=False)
    response_mode = Column(String(30), nullable=False)

    # Tier: 0 (Manual), 1 (Assisted), 2 (Auto Low-Risk), 3 (Autonomous)
    current_tier = Column(Integer, default=0)
    reason = Column(Text)

    __table_args__ = (
        UniqueConstraint('channel_type', 'response_mode', name='uq_tier_channel_mode'),
    )
```

**Migration:**
```bash
cd backend
alembic revision -m "create spc_metrics and automation_tiers tables"
alembic upgrade head
```

**Acceptance Criteria:**
- [ ] SPCMetrics model created
- [ ] AutomationTier model created
- [ ] Unique constraints in place
- [ ] Migrations applied

---

### STEP 4.1.2: Create SPC Service

**File: `backend/src/services/spc_service.py`**
```python
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from src.models.spc_metrics import SPCMetrics, ControlState
from src.models.automation_tier import AutomationTier
from src.models.feedback_event import FeedbackEvent
from src.models.draft_response import DraftResponse
from src.models.message import Message, ChannelType
from src.core.config import settings
import math
import logging
from typing import Tuple, Dict

logger = logging.getLogger(__name__)

class SPCService:
    """Service for Statistical Process Control calculations"""

    # Rolling window size
    SAMPLE_SIZE = settings.SPC_SAMPLE_SIZE  # Default: 30

    # Tier escalation thresholds
    TIER_1_MIN_SAMPLES = settings.SPC_MIN_SAMPLES_FOR_TIER_1  # Default: 50
    TIER_2_MIN_SAMPLES = settings.SPC_MIN_SAMPLES_FOR_TIER_2  # Default: 100

    TIER_1_ACCEPTANCE_THRESHOLD = 0.80  # 80%
    TIER_2_ACCEPTANCE_THRESHOLD = 0.95  # 95%

    MAX_MISCLASSIFICATION_RATE = 0.05  # 5%
    MAX_HEAVY_EDIT_RATE = 0.10  # 10%

    def __init__(self, db: AsyncSession):
        self.db = db

    async def calculate_metrics(
        self,
        channel_type: ChannelType,
        response_mode: str
    ) -> SPCMetrics:
        """Calculate SPC metrics for a channel/mode combination"""

        # Fetch recent feedback events (rolling window)
        query = (
            select(FeedbackEvent)
            .join(DraftResponse, FeedbackEvent.draft_id == DraftResponse.draft_id)
            .join(Message, DraftResponse.message_id == Message.message_id)
            .where(Message.channel_type == channel_type)
            .where(DraftResponse.response_mode == response_mode)
            .order_by(FeedbackEvent.timestamp.desc())
            .limit(self.SAMPLE_SIZE)
        )

        result = await self.db.execute(query)
        feedback_events = result.scalars().all()

        if not feedback_events:
            logger.warning(f"No feedback data for {channel_type}/{response_mode}")
            return await self._get_or_create_metrics(channel_type.value, response_mode)

        # Calculate metrics
        total = len(feedback_events)
        accepted = sum(1 for f in feedback_events if f.was_accepted)
        light_edits = sum(1 for f in feedback_events if 0.05 < f.edit_distance < 0.2)
        heavy_edits = sum(1 for f in feedback_events if f.edit_distance >= 0.5)

        acceptance_rate = accepted / total if total > 0 else 0.0
        light_edit_rate = light_edits / total if total > 0 else 0.0
        heavy_edit_rate = heavy_edits / total if total > 0 else 0.0

        # Misclassification rate (placeholder - would need reclassification data)
        misclassification_rate = 0.0

        # Calculate control limits
        ucl, lcl = self._calculate_control_limits(acceptance_rate, total)

        # Determine control state
        control_state = self._determine_control_state(
            acceptance_rate,
            ucl,
            lcl,
            heavy_edit_rate,
            misclassification_rate
        )

        # Update or create metrics
        metrics = await self._get_or_create_metrics(channel_type.value, response_mode)
        metrics.acceptance_rate = acceptance_rate
        metrics.light_edit_rate = light_edit_rate
        metrics.heavy_edit_rate = heavy_edit_rate
        metrics.misclassification_rate = misclassification_rate
        metrics.sample_size = total
        metrics.control_state = control_state
        metrics.upper_control_limit = ucl
        metrics.lower_control_limit = lcl
        metrics.mean_value = acceptance_rate

        await self.db.commit()
        await self.db.refresh(metrics)

        logger.info(
            f"SPC metrics updated: {channel_type}/{response_mode} - "
            f"Acceptance: {acceptance_rate:.2%}, State: {control_state.value}"
        )

        return metrics

    def _calculate_control_limits(self, p_bar: float, n: int) -> Tuple[float, float]:
        """Calculate upper and lower control limits for p-chart"""
        if n == 0:
            return 1.0, 0.0

        # Standard deviation
        sigma = math.sqrt((p_bar * (1 - p_bar)) / n)

        # 3-sigma control limits
        ucl = min(1.0, p_bar + 3 * sigma)
        lcl = max(0.0, p_bar - 3 * sigma)

        return ucl, lcl

    def _determine_control_state(
        self,
        acceptance_rate: float,
        ucl: float,
        lcl: float,
        heavy_edit_rate: float,
        misclassification_rate: float
    ) -> ControlState:
        """Determine if process is in control"""

        # Out of control conditions
        if acceptance_rate > ucl or acceptance_rate < lcl:
            return ControlState.OUT_OF_CONTROL

        if heavy_edit_rate > self.MAX_HEAVY_EDIT_RATE:
            return ControlState.OUT_OF_CONTROL

        if misclassification_rate > self.MAX_MISCLASSIFICATION_RATE:
            return ControlState.OUT_OF_CONTROL

        # Warning conditions
        if acceptance_rate < 0.50:  # Below 50% acceptance
            return ControlState.WARNING

        return ControlState.IN_CONTROL

    async def _get_or_create_metrics(
        self,
        channel_type: str,
        response_mode: str
    ) -> SPCMetrics:
        """Get existing metrics or create new"""
        result = await self.db.execute(
            select(SPCMetrics)
            .where(SPCMetrics.channel_type == channel_type)
            .where(SPCMetrics.response_mode == response_mode)
        )
        metrics = result.scalar_one_or_none()

        if not metrics:
            metrics = SPCMetrics(
                channel_type=channel_type,
                response_mode=response_mode
            )
            self.db.add(metrics)
            await self.db.flush()

        return metrics

    async def calculate_all_metrics(self) -> Dict[str, SPCMetrics]:
        """Calculate metrics for all channel/mode combinations"""
        results = {}

        channels = [ChannelType.EMAIL, ChannelType.LINKEDIN_DM]
        modes = ["STANDARD", "AGREE_AMPLIFY", "EDUCATE", "BATTLE"]

        for channel in channels:
            for mode in modes:
                key = f"{channel.value}_{mode}"
                try:
                    metrics = await self.calculate_metrics(channel, mode)
                    results[key] = metrics
                except Exception as e:
                    logger.error(f"Failed to calculate metrics for {key}: {e}")

        return results
```

**Acceptance Criteria:**
- [ ] SPCService created
- [ ] Metrics calculation working
- [ ] Control limits calculated correctly
- [ ] Control state determined
- [ ] All channel/mode combinations supported

---

### STEP 4.1.3: Create SPC API Endpoints

**File: `backend/src/api/spc.py`**
```python
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from src.core.database import get_db
from src.services.spc_service import SPCService
from src.models.message import ChannelType
from src.schemas.spc import SPCMetricsResponse, CalculateRequest
from typing import List

router = APIRouter(prefix="/api/spc", tags=["spc"])

@router.get("/metrics", response_model=List[SPCMetricsResponse])
async def get_all_metrics(db: AsyncSession = Depends(get_db)):
    """Get all SPC metrics"""
    from sqlalchemy import select
    from src.models.spc_metrics import SPCMetrics

    result = await db.execute(select(SPCMetrics))
    metrics = result.scalars().all()
    return metrics

@router.post("/calculate", response_model=SPCMetricsResponse)
async def calculate_metrics(
    request: CalculateRequest,
    db: AsyncSession = Depends(get_db)
):
    """Calculate SPC metrics for specific channel/mode"""
    try:
        service = SPCService(db)
        metrics = await service.calculate_metrics(
            channel_type=ChannelType(request.channel_type),
            response_mode=request.response_mode
        )
        return metrics
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/calculate-all")
async def calculate_all_metrics(db: AsyncSession = Depends(get_db)):
    """Calculate metrics for all channel/mode combinations"""
    try:
        service = SPCService(db)
        results = await service.calculate_all_metrics()
        return {
            "success": True,
            "calculated": len(results),
            "metrics": list(results.values())
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
```

**File: `backend/src/schemas/spc.py`**
```python
from pydantic import BaseModel
from typing import Optional

class SPCMetricsResponse(BaseModel):
    metric_id: str
    channel_type: str
    response_mode: str
    acceptance_rate: float
    light_edit_rate: float
    heavy_edit_rate: float
    misclassification_rate: float
    sample_size: int
    control_state: str
    upper_control_limit: Optional[float]
    lower_control_limit: Optional[float]
    mean_value: Optional[float]

    class Config:
        from_attributes = True

class CalculateRequest(BaseModel):
    channel_type: str
    response_mode: str
```

**Add to `backend/src/main.py`:**
```python
from src.api import spc
app.include_router(spc.router)
```

**Acceptance Criteria:**
- [ ] SPC endpoints created
- [ ] Get all metrics working
- [ ] Calculate single metrics working
- [ ] Calculate all metrics working

---

## SPRINT 4.2: CONTROL CHARTS & ANALYSIS

**Duration:** 3-4 days

---

### STEP 4.2.1: Create Control Chart Data Generator

**File: `backend/src/services/spc_service.py` (add method)**
```python
async def get_control_chart_data(
    self,
    channel_type: ChannelType,
    response_mode: str,
    lookback_days: int = 30
) -> Dict:
    """Get historical data for control chart visualization"""

    from datetime import datetime, timedelta

    # Fetch feedback events over time
    since = datetime.utcnow() - timedelta(days=lookback_days)

    query = (
        select(FeedbackEvent)
        .join(DraftResponse, FeedbackEvent.draft_id == DraftResponse.draft_id)
        .join(Message, DraftResponse.message_id == Message.message_id)
        .where(Message.channel_type == channel_type)
        .where(DraftResponse.response_mode == response_mode)
        .where(FeedbackEvent.timestamp >= since)
        .order_by(FeedbackEvent.timestamp.asc())
    )

    result = await self.db.execute(query)
    feedback_events = result.scalars().all()

    # Calculate rolling acceptance rate
    points = []
    window_size = 10  # Rolling window

    for i in range(len(feedback_events)):
        if i < window_size:
            continue

        window = feedback_events[i - window_size:i]
        accepted = sum(1 for f in window if f.was_accepted)
        rate = accepted / len(window)

        points.append({
            "timestamp": feedback_events[i].timestamp.isoformat(),
            "acceptance_rate": rate,
            "sample_number": i
        })

    # Get current control limits
    metrics = await self._get_or_create_metrics(channel_type.value, response_mode)

    return {
        "points": points,
        "ucl": metrics.upper_control_limit,
        "lcl": metrics.lower_control_limit,
        "mean": metrics.mean_value,
        "control_state": metrics.control_state.value
    }
```

**File: `backend/src/api/spc.py` (add endpoint)**
```python
@router.get("/chart/{channel_type}/{response_mode}")
async def get_control_chart(
    channel_type: str,
    response_mode: str,
    lookback_days: int = 30,
    db: AsyncSession = Depends(get_db)
):
    """Get control chart data"""
    try:
        service = SPCService(db)
        data = await service.get_control_chart_data(
            channel_type=ChannelType(channel_type),
            response_mode=response_mode,
            lookback_days=lookback_days
        )
        return {"success": True, "data": data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
```

**Acceptance Criteria:**
- [ ] Control chart data generator created
- [ ] Rolling acceptance rate calculated
- [ ] Historical points returned
- [ ] Control limits included
- [ ] API endpoint working

---

## SPRINT 4.3: AUTOMATION TIER LOGIC

**Duration:** 5-6 days

---

### STEP 4.3.1: Create Automation Tier Service

**File: `backend/src/services/automation_service.py`**
```python
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from src.models.automation_tier import AutomationTier
from src.models.spc_metrics import SPCMetrics, ControlState
from src.models.message import ChannelType
from src.services.spc_service import SPCService
import logging

logger = logging.getLogger(__name__)

class AutomationService:
    """Service for managing automation tier escalation"""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.spc_service = SPCService(db)

    async def update_automation_tier(
        self,
        channel_type: ChannelType,
        response_mode: str
    ) -> AutomationTier:
        """Update automation tier based on SPC metrics"""

        # Get current metrics
        metrics = await self.spc_service.calculate_metrics(channel_type, response_mode)

        # Get current tier
        tier = await self._get_or_create_tier(channel_type.value, response_mode)

        # Battle mode ALWAYS stays at Tier 0
        if response_mode == "BATTLE":
            tier.current_tier = 0
            tier.reason = "Battle mode requires manual approval"
            await self.db.commit()
            return tier

        # Determine new tier
        new_tier = self._calculate_tier(metrics)
        old_tier = tier.current_tier

        if new_tier != old_tier:
            tier.current_tier = new_tier
            tier.reason = self._get_tier_change_reason(metrics, new_tier, old_tier)
            await self.db.commit()

            logger.info(
                f"Tier changed: {channel_type}/{response_mode} "
                f"{old_tier} → {new_tier}: {tier.reason}"
            )

        return tier

    def _calculate_tier(self, metrics: SPCMetrics) -> int:
        """Calculate appropriate automation tier"""

        # Insufficient samples → Tier 0 or 1
        if metrics.sample_size < self.spc_service.TIER_1_MIN_SAMPLES:
            return 0

        # Out of control → Revert to Tier 0
        if metrics.control_state == ControlState.OUT_OF_CONTROL:
            return 0

        # Warning state → Cap at Tier 1
        if metrics.control_state == ControlState.WARNING:
            return min(1, metrics.sample_size >= self.spc_service.TIER_1_MIN_SAMPLES)

        # IN_CONTROL checks

        # Check for Tier 2 (Auto Low-Risk)
        if (
            metrics.sample_size >= self.spc_service.TIER_2_MIN_SAMPLES and
            metrics.acceptance_rate >= self.spc_service.TIER_2_ACCEPTANCE_THRESHOLD and
            metrics.heavy_edit_rate < self.spc_service.MAX_HEAVY_EDIT_RATE and
            metrics.misclassification_rate < self.spc_service.MAX_MISCLASSIFICATION_RATE
        ):
            return 2

        # Check for Tier 1 (Assisted)
        if (
            metrics.sample_size >= self.spc_service.TIER_1_MIN_SAMPLES and
            metrics.acceptance_rate >= self.spc_service.TIER_1_ACCEPTANCE_THRESHOLD
        ):
            return 1

        # Default to Tier 0
        return 0

    def _get_tier_change_reason(
        self,
        metrics: SPCMetrics,
        new_tier: int,
        old_tier: int
    ) -> str:
        """Generate explanation for tier change"""

        if new_tier > old_tier:
            # Escalation
            if new_tier == 2:
                return (
                    f"Escalated to Tier 2 (Auto Low-Risk): "
                    f"{metrics.sample_size} samples, "
                    f"{metrics.acceptance_rate:.1%} acceptance rate, "
                    f"process in control"
                )
            else:
                return (
                    f"Escalated to Tier 1 (Assisted): "
                    f"{metrics.sample_size} samples, "
                    f"{metrics.acceptance_rate:.1%} acceptance rate"
                )
        else:
            # De-escalation
            if metrics.control_state == ControlState.OUT_OF_CONTROL:
                return (
                    f"De-escalated to Tier {new_tier}: "
                    f"Process out of control "
                    f"(acceptance rate: {metrics.acceptance_rate:.1%})"
                )
            elif metrics.control_state == ControlState.WARNING:
                return (
                    f"De-escalated to Tier {new_tier}: "
                    f"Process in warning state "
                    f"(acceptance rate: {metrics.acceptance_rate:.1%})"
                )
            else:
                return (
                    f"Maintained at Tier {new_tier}: "
                    f"Insufficient samples or performance"
                )

    async def _get_or_create_tier(
        self,
        channel_type: str,
        response_mode: str
    ) -> AutomationTier:
        """Get existing tier or create new"""
        result = await self.db.execute(
            select(AutomationTier)
            .where(AutomationTier.channel_type == channel_type)
            .where(AutomationTier.response_mode == response_mode)
        )
        tier = result.scalar_one_or_none()

        if not tier:
            tier = AutomationTier(
                channel_type=channel_type,
                response_mode=response_mode,
                current_tier=0,
                reason="Initial state"
            )
            self.db.add(tier)
            await self.db.flush()

        return tier

    async def get_all_tiers(self) -> list[AutomationTier]:
        """Get all automation tiers"""
        result = await self.db.execute(select(AutomationTier))
        return result.scalars().all()

    async def should_auto_send(
        self,
        channel_type: ChannelType,
        response_mode: str
    ) -> bool:
        """Check if draft should be auto-sent"""

        tier = await self._get_or_create_tier(channel_type.value, response_mode)

        # Tier 2+ can auto-send STANDARD and AGREE_AMPLIFY
        if tier.current_tier >= 2:
            if response_mode in ["STANDARD", "AGREE_AMPLIFY"]:
                return True

        # All other cases require approval
        return False
```

**Acceptance Criteria:**
- [ ] AutomationService created
- [ ] Tier calculation logic implemented
- [ ] Tier escalation working
- [ ] Tier de-escalation working
- [ ] Battle mode locked at Tier 0
- [ ] Auto-send decision logic working

---

### STEP 4.3.2: Create Automation API Endpoints

**File: `backend/src/api/automation.py`**
```python
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from src.core.database import get_db
from src.services.automation_service import AutomationService
from src.models.message import ChannelType
from src.schemas.automation import AutomationTierResponse
from typing import List

router = APIRouter(prefix="/api/automation", tags=["automation"])

@router.get("/tiers", response_model=List[AutomationTierResponse])
async def get_automation_tiers(db: AsyncSession = Depends(get_db)):
    """Get all automation tiers"""
    service = AutomationService(db)
    tiers = await service.get_all_tiers()
    return tiers

@router.post("/update-tier")
async def update_automation_tier(
    channel_type: str,
    response_mode: str,
    db: AsyncSession = Depends(get_db)
):
    """Update automation tier based on current SPC metrics"""
    try:
        service = AutomationService(db)
        tier = await service.update_automation_tier(
            channel_type=ChannelType(channel_type),
            response_mode=response_mode
        )
        return {"success": True, "tier": tier.current_tier, "reason": tier.reason}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/update-all-tiers")
async def update_all_tiers(db: AsyncSession = Depends(get_db)):
    """Update all automation tiers"""
    service = AutomationService(db)

    channels = [ChannelType.EMAIL, ChannelType.LINKEDIN_DM]
    modes = ["STANDARD", "AGREE_AMPLIFY", "EDUCATE", "BATTLE"]

    results = []
    for channel in channels:
        for mode in modes:
            try:
                tier = await service.update_automation_tier(channel, mode)
                results.append({
                    "channel_type": channel.value,
                    "response_mode": mode,
                    "tier": tier.current_tier,
                    "reason": tier.reason
                })
            except Exception as e:
                logger.error(f"Failed to update tier for {channel}/{mode}: {e}")

    return {"success": True, "updated": len(results), "results": results}
```

**File: `backend/src/schemas/automation.py`**
```python
from pydantic import BaseModel

class AutomationTierResponse(BaseModel):
    tier_id: str
    channel_type: str
    response_mode: str
    current_tier: int
    reason: str

    class Config:
        from_attributes = True
```

**Add to `backend/src/main.py`:**
```python
from src.api import automation
app.include_router(automation.router)
```

**Acceptance Criteria:**
- [ ] Automation endpoints created
- [ ] Get tiers working
- [ ] Update single tier working
- [ ] Update all tiers working

---

### STEP 4.3.3: Create Scheduled SPC Job

**File: `backend/src/jobs/spc_job.py`**
```python
import asyncio
import logging
from src.core.database import AsyncSessionLocal
from src.services.spc_service import SPCService
from src.services.automation_service import AutomationService
from src.models.message import ChannelType

logger = logging.getLogger(__name__)

async def run_spc_calculations():
    """Run SPC calculations and update automation tiers"""
    async with AsyncSessionLocal() as db:
        try:
            # Calculate all metrics
            spc_service = SPCService(db)
            metrics = await spc_service.calculate_all_metrics()

            logger.info(f"Calculated SPC metrics for {len(metrics)} combinations")

            # Update automation tiers
            automation_service = AutomationService(db)

            channels = [ChannelType.EMAIL, ChannelType.LINKEDIN_DM]
            modes = ["STANDARD", "AGREE_AMPLIFY", "EDUCATE", "BATTLE"]

            for channel in channels:
                for mode in modes:
                    tier = await automation_service.update_automation_tier(channel, mode)
                    logger.info(f"{channel.value}/{mode} → Tier {tier.current_tier}")

            logger.info("SPC job completed successfully")

        except Exception as e:
            logger.error(f"SPC job failed: {e}")
            raise

if __name__ == "__main__":
    asyncio.run(run_spc_calculations())
```

**Set up cron job or scheduler:**
```bash
# Run every hour
0 * * * * cd /app/backend && python -m src.jobs.spc_job
```

**Acceptance Criteria:**
- [ ] SPC job created
- [ ] Calculates all metrics
- [ ] Updates all tiers
- [ ] Can be run on schedule
- [ ] Error handling robust

---

## SPRINT 4.4: SPC DASHBOARD UI

**Duration:** 4-5 days

---

### STEP 4.4.1: Create SPC Dashboard Page

**File: `frontend/src/pages/SPCDashboard.tsx`**
```typescript
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Layout } from '../components/Layout';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { Spinner } from '../components/Spinner';
import { ControlChart } from '../components/ControlChart';
import { api } from '../services/api';

export const SPCDashboard: React.FC = () => {
  const { data: metricsData, isLoading: metricsLoading } = useQuery({
    queryKey: ['spc-metrics'],
    queryFn: () => fetch('http://localhost:8000/api/spc/metrics').then(r => r.json()),
  });

  const { data: tiersData, isLoading: tiersLoading } = useQuery({
    queryKey: ['automation-tiers'],
    queryFn: () => fetch('http://localhost:8000/api/automation/tiers').then(r => r.json()),
  });

  if (metricsLoading || tiersLoading) {
    return (
      <Layout>
        <Spinner size="lg" />
      </Layout>
    );
  }

  const metrics = metricsData || [];
  const tiers = tiersData || [];

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-3xl font-bold text-gray-900">SPC Dashboard</h2>
          <p className="text-gray-600 mt-1">Statistical Process Control & Automation Status</p>
        </div>

        {/* Automation Tiers Overview */}
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Current Automation Tiers</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {tiers.map((tier: any) => (
              <div key={`${tier.channel_type}_${tier.response_mode}`} className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="font-medium text-gray-900">{tier.channel_type}</p>
                    <p className="text-sm text-gray-600">{tier.response_mode}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-blue-600">Tier {tier.current_tier}</p>
                    <p className="text-xs text-gray-500">
                      {tier.current_tier === 0 && 'Manual'}
                      {tier.current_tier === 1 && 'Assisted'}
                      {tier.current_tier === 2 && 'Auto Low-Risk'}
                      {tier.current_tier === 3 && 'Autonomous'}
                    </p>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">{tier.reason}</p>
              </div>
            ))}
          </div>
        </Card>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {metrics.map((metric: any) => (
            <Card key={metric.metric_id}>
              <div className="space-y-4">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold text-gray-900">{metric.channel_type}</h4>
                    <p className="text-sm text-gray-600">{metric.response_mode}</p>
                  </div>
                  <Badge
                    text={metric.control_state}
                    variant={
                      metric.control_state === 'IN_CONTROL'
                        ? 'success'
                        : metric.control_state === 'WARNING'
                        ? 'warning'
                        : 'error'
                    }
                  />
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-600">Acceptance Rate</p>
                    <p className="text-lg font-bold text-gray-900">
                      {(metric.acceptance_rate * 100).toFixed(1)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Sample Size</p>
                    <p className="text-lg font-bold text-gray-900">{metric.sample_size}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Light Edits</p>
                    <p className="text-lg font-bold text-gray-900">
                      {(metric.light_edit_rate * 100).toFixed(1)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Heavy Edits</p>
                    <p className="text-lg font-bold text-gray-900">
                      {(metric.heavy_edit_rate * 100).toFixed(1)}%
                    </p>
                  </div>
                </div>

                {/* Control Limits */}
                {metric.upper_control_limit && (
                  <div className="pt-4 border-t border-gray-200 text-xs text-gray-600">
                    <p>UCL: {(metric.upper_control_limit * 100).toFixed(1)}%</p>
                    <p>Mean: {(metric.mean_value * 100).toFixed(1)}%</p>
                    <p>LCL: {(metric.lower_control_limit * 100).toFixed(1)}%</p>
                  </div>
                )}

                {/* Control Chart */}
                <ControlChart
                  channelType={metric.channel_type}
                  responseMode={metric.response_mode}
                />
              </div>
            </Card>
          ))}
        </div>
      </div>
    </Layout>
  );
};
```

**Add route to `frontend/src/App.tsx`:**
```typescript
import { SPCDashboard } from './pages/SPCDashboard';

// In Routes:
<Route path="/spc" element={<SPCDashboard />} />
```

**Acceptance Criteria:**
- [ ] SPC dashboard page created
- [ ] Automation tiers displayed
- [ ] Metrics cards shown
- [ ] Control state badges visible
- [ ] Navigation working

---

### STEP 4.4.2: Create Control Chart Component

**File: `frontend/src/components/ControlChart.tsx`**
```typescript
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine } from 'recharts';

interface ControlChartProps {
  channelType: string;
  responseMode: string;
}

export const ControlChart: React.FC<ControlChartProps> = ({ channelType, responseMode }) => {
  const { data, isLoading } = useQuery({
    queryKey: ['control-chart', channelType, responseMode],
    queryFn: () =>
      fetch(`http://localhost:8000/api/spc/chart/${channelType}/${responseMode}`).then(r => r.json()),
  });

  if (isLoading || !data?.data) {
    return <div className="text-sm text-gray-500">Loading chart...</div>;
  }

  const chartData = data.data;
  const points = chartData.points || [];

  if (points.length === 0) {
    return <div className="text-sm text-gray-500">Insufficient data for chart</div>;
  }

  return (
    <div className="mt-4">
      <LineChart width={500} height={200} data={points}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="sample_number" label={{ value: 'Sample Number', position: 'insideBottom', offset: -5 }} />
        <YAxis label={{ value: 'Acceptance Rate', angle: -90, position: 'insideLeft' }} domain={[0, 1]} />
        <Tooltip formatter={(value: number) => `${(value * 100).toFixed(1)}%`} />
        <Legend />

        {/* Control Limits */}
        {chartData.ucl && (
          <ReferenceLine y={chartData.ucl} stroke="red" strokeDasharray="3 3" label="UCL" />
        )}
        {chartData.mean && (
          <ReferenceLine y={chartData.mean} stroke="blue" strokeDasharray="3 3" label="Mean" />
        )}
        {chartData.lcl && (
          <ReferenceLine y={chartData.lcl} stroke="red" strokeDasharray="3 3" label="LCL" />
        )}

        {/* Data Line */}
        <Line
          type="monotone"
          dataKey="acceptance_rate"
          stroke="#8884d8"
          name="Acceptance Rate"
          dot={{ r: 3 }}
        />
      </LineChart>
    </div>
  );
};
```

**Install charting library:**
```bash
cd frontend
npm install recharts
```

**Acceptance Criteria:**
- [ ] Control chart component created
- [ ] Line chart displaying data
- [ ] Control limits shown
- [ ] Mean line displayed
- [ ] Chart updates with new data

---

## PHASE 4 TESTING & VALIDATION

---

### STEP 4.5.1: SPC Calculation Tests

**File: `backend/tests/test_spc_service.py`**
```python
import pytest
from src.services.spc_service import SPCService

@pytest.mark.asyncio
async def test_control_limit_calculation():
    """Test control limit calculation"""
    service = SPCService(None)

    p_bar = 0.80
    n = 30

    ucl, lcl = service._calculate_control_limits(p_bar, n)

    assert ucl > p_bar
    assert lcl < p_bar
    assert 0 <= lcl <= 1
    assert 0 <= ucl <= 1

@pytest.mark.asyncio
async def test_control_state_determination():
    """Test control state logic"""
    service = SPCService(None)

    # In control
    state = service._determine_control_state(
        acceptance_rate=0.85,
        ucl=0.95,
        lcl=0.70,
        heavy_edit_rate=0.05,
        misclassification_rate=0.02
    )
    assert state == ControlState.IN_CONTROL

    # Out of control (above UCL)
    state = service._determine_control_state(
        acceptance_rate=0.98,
        ucl=0.95,
        lcl=0.70,
        heavy_edit_rate=0.05,
        misclassification_rate=0.02
    )
    assert state == ControlState.OUT_OF_CONTROL
```

**Run tests:**
```bash
cd backend
pytest tests/test_spc_service.py -v
```

**Acceptance Criteria:**
- [ ] SPC calculation tests passing
- [ ] Control limit tests passing
- [ ] Control state tests passing

---

### STEP 4.5.2: Automation Tier Tests

**File: `backend/tests/test_automation_service.py`**
```python
import pytest
from src.services.automation_service import AutomationService
from src.models.spc_metrics import SPCMetrics, ControlState

@pytest.mark.asyncio
async def test_tier_calculation():
    """Test automation tier calculation logic"""
    service = AutomationService(None)

    # Tier 0: Insufficient samples
    metrics = SPCMetrics(
        acceptance_rate=0.90,
        sample_size=20,
        control_state=ControlState.IN_CONTROL,
        heavy_edit_rate=0.05,
        misclassification_rate=0.02
    )
    tier = service._calculate_tier(metrics)
    assert tier == 0

    # Tier 1: Good performance
    metrics.sample_size = 60
    metrics.acceptance_rate = 0.85
    tier = service._calculate_tier(metrics)
    assert tier == 1

    # Tier 2: Excellent performance
    metrics.sample_size = 120
    metrics.acceptance_rate = 0.96
    tier = service._calculate_tier(metrics)
    assert tier == 2

@pytest.mark.asyncio
async def test_battle_mode_locked():
    """Battle mode should always be Tier 0"""
    service = AutomationService(db_session_mock)

    tier = await service.update_automation_tier(
        channel_type=ChannelType.EMAIL,
        response_mode="BATTLE"
    )

    assert tier.current_tier == 0
    assert "manual approval" in tier.reason.lower()
```

**Acceptance Criteria:**
- [ ] Tier calculation tests passing
- [ ] Battle mode lock test passing
- [ ] Escalation logic tested

---

## PHASE 4 COMPLETION CHECKLIST

- [ ] SPC models created
- [ ] SPC metrics calculation working
- [ ] Control charts generated
- [ ] Automation tier logic implemented
- [ ] Tier escalation/de-escalation working
- [ ] Battle mode locked at Tier 0
- [ ] SPC dashboard created
- [ ] Control chart visualization working
- [ ] Scheduled SPC job configured
- [ ] All tests passing
- [ ] Documentation updated

---

**PROCEED TO PHASE 5: Integration & Deployment**

See DEVELOPMENT_PLAN_PHASE_5.md for final deployment steps.
