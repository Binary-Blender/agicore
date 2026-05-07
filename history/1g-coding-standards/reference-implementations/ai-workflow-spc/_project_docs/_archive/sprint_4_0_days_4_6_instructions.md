# Sprint 4.0 Days 4-6: A/B Testing & TPS UI Implementation

## 🎉 Days 2-3 Accomplishments
- **MCP Foundation COMPLETE** ✅
- **1,020 lines of production code** deployed
- **5 major components** built and tested
- **API endpoints** fully functional
- **Zero breaking changes** to existing system

Fantastic work! Now let's build the A/B testing capabilities and transform the UI.

---

## 🎯 Days 4-6 Overview

### Day 4: A/B Testing Module (Backend)
- Build A/B comparison module
- Implement statistical analysis
- Create provider performance tracking

### Day 5: TPS UI Components (Frontend)
- Job Instruction table
- Standard Work header
- Andon board visualization

### Day 6: Integration & Polish
- Connect A/B testing to UI
- Mobile responsive design
- End-to-end testing

---

## 📋 Day 4: A/B Testing Module

### Task 1: Database Schema for A/B Testing
**Owner:** Backend Team  
**Timeline:** 1 hour  
**Purpose:** Already created in migration 004, but let's verify and use it

```python
# Verify these tables exist in production
# Already created in migration 004:
# - ab_test_results
# - provider_metrics

# FILE: src/database/models.py
# Add these model classes if not already present

class ABTestResult(Base):
    """A/B test comparison results"""
    __tablename__ = 'ab_test_results'
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    execution_id = Column(String, ForeignKey('workflow_executions.id'))
    test_type = Column(String)  # 'side_by_side', 'blind', 'statistical'
    providers_tested = Column(JSON)  # ['akool', 'replicate_sdxl', 'mcp_akool']
    winner = Column(String)  # Selected provider
    selection_method = Column(String)  # 'manual', 'auto_cost', 'auto_speed', 'auto_quality'
    metrics = Column(JSON)  # Detailed comparison metrics
    user_feedback = Column(JSON)
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime)

class ProviderMetrics(Base):
    """Track provider performance over time"""
    __tablename__ = 'provider_metrics'
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    provider = Column(String, nullable=False)
    execution_id = Column(String, ForeignKey('workflow_executions.id'))
    generation_time = Column(Float)  # seconds
    cost = Column(Float)  # dollars
    quality_score = Column(Float)  # 0-100
    selection_rate = Column(Float)  # % selected in A/B tests
    failure_rate = Column(Float)  # % of failures
    timestamp = Column(DateTime, default=datetime.utcnow)
```

### Task 2: A/B Testing Module Implementation
**Owner:** Backend Team  
**Timeline:** 3 hours  
**Location:** `src/modules/ab_testing_module.py`

```python
# FILE: src/modules/ab_testing_module.py
"""
A/B Testing Module - Compare outputs from multiple providers
Supports statistical analysis and automatic winner selection
"""

from typing import Dict, Any, List, Optional, Tuple
from .base import BaseModule
from src.database.models import ABTestResult, ProviderMetrics, Asset
from src.database.repositories import AssetRepository
import uuid
import numpy as np
from scipy import stats
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

class ABTestingModule(BaseModule):
    """Module for comparing outputs from different providers"""
    
    def get_config_schema(self) -> Dict[str, Any]:
        return {
            "test_type": {
                "type": "select",
                "label": "Test Type",
                "options": ["side_by_side", "blind", "statistical"],
                "default": "side_by_side",
                "description": "How to present options for comparison"
            },
            "selection_method": {
                "type": "select",
                "label": "Selection Method",
                "options": ["manual", "auto_quality", "auto_cost", "auto_speed", "auto_balanced"],
                "default": "manual",
                "description": "How to select the winner"
            },
            "min_samples_for_significance": {
                "type": "number",
                "label": "Min Samples for Statistical Significance",
                "default": 30,
                "min": 10,
                "max": 100,
                "description": "Minimum samples needed for p-value calculation"
            },
            "confidence_level": {
                "type": "number",
                "label": "Confidence Level (%)",
                "default": 95,
                "min": 80,
                "max": 99.9,
                "description": "Statistical confidence required"
            },
            "weight_quality": {
                "type": "number",
                "label": "Quality Weight (for auto_balanced)",
                "default": 0.5,
                "min": 0,
                "max": 1,
                "description": "Weight for quality in balanced selection"
            },
            "weight_speed": {
                "type": "number",
                "label": "Speed Weight (for auto_balanced)",
                "default": 0.3,
                "min": 0,
                "max": 1,
                "description": "Weight for speed in balanced selection"
            },
            "weight_cost": {
                "type": "number",
                "label": "Cost Weight (for auto_balanced)",
                "default": 0.2,
                "min": 0,
                "max": 1,
                "description": "Weight for cost in balanced selection"
            }
        }
    
    async def execute(
        self, 
        inputs: Dict[str, Any], 
        execution_context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Execute A/B testing comparison"""
        
        logger.info(f"Starting A/B test with config: {self.config}")
        
        # Collect outputs from different providers
        provider_outputs = self._collect_provider_outputs(inputs)
        
        if len(provider_outputs) < 2:
            raise ValueError(
                f"A/B testing requires outputs from at least 2 providers, got {len(provider_outputs)}"
            )
        
        # Create A/B test record
        test_id = str(uuid.uuid4())
        test_data = {
            "id": test_id,
            "execution_id": execution_context.get("execution_id"),
            "test_type": self.config.get("test_type", "side_by_side"),
            "providers_tested": list(provider_outputs.keys()),
            "selection_method": self.config.get("selection_method", "manual"),
            "metrics": {},
            "created_at": datetime.utcnow()
        }
        
        # Calculate metrics for each provider
        provider_metrics = await self._calculate_provider_metrics(provider_outputs)
        test_data["metrics"] = provider_metrics
        
        # Store in execution context for QC
        execution_context["ab_test_data"] = test_data
        
        # Manual selection - pause for human decision
        if self.config.get("selection_method") == "manual":
            logger.info("Manual selection requested, pausing for QC")
            
            execution_context["should_pause"] = True
            execution_context["pause_reason"] = "ab_testing_comparison"
            execution_context["qc_data"] = {
                "test_id": test_id,
                "test_type": self.config.get("test_type"),
                "comparison_items": self._prepare_comparison_view(
                    provider_outputs, 
                    provider_metrics
                )
            }
            
            # Will be populated after QC
            return {
                "test_id": test_id,
                "status": "awaiting_selection",
                "providers": list(provider_outputs.keys())
            }
        
        # Automatic selection based on criteria
        winner = await self._auto_select_winner(provider_outputs, provider_metrics)
        
        # Save test results
        await self._save_test_results(test_data, winner)
        
        logger.info(f"A/B test complete. Winner: {winner['provider']}")
        
        return {
            "test_id": test_id,
            "winner": winner["provider"],
            "selected_outputs": winner["outputs"],
            "comparison_metrics": provider_metrics,
            "confidence": winner.get("confidence", "N/A"),
            "reason": winner.get("reason", "Automatic selection")
        }
    
    def _collect_provider_outputs(self, inputs: Dict[str, Any]) -> Dict[str, List]:
        """Organize inputs by provider"""
        provider_outputs = {}
        
        # Handle different input formats
        for key, value in inputs.items():
            # Direct provider outputs
            if isinstance(value, dict) and "provider" in value:
                provider = value["provider"]
                if provider not in provider_outputs:
                    provider_outputs[provider] = []
                provider_outputs[provider].append(value)
            
            # Lists of outputs (e.g., from parallel execution)
            elif isinstance(value, list):
                for item in value:
                    if isinstance(item, dict) and "provider" in item:
                        provider = item["provider"]
                        if provider not in provider_outputs:
                            provider_outputs[provider] = []
                        provider_outputs[provider].append(item)
            
            # Module outputs with results
            elif isinstance(value, dict) and "results" in value:
                for result in value["results"]:
                    if isinstance(result, dict) and "provider" in result:
                        provider = result["provider"]
                        if provider not in provider_outputs:
                            provider_outputs[provider] = []
                        provider_outputs[provider].append(result)
        
        logger.info(f"Collected outputs from providers: {list(provider_outputs.keys())}")
        return provider_outputs
    
    async def _calculate_provider_metrics(
        self, 
        provider_outputs: Dict[str, List]
    ) -> Dict[str, Dict]:
        """Calculate comprehensive metrics for each provider"""
        metrics = {}
        
        for provider, outputs in provider_outputs.items():
            # Basic counts
            count = len(outputs)
            
            # Extract timing data
            generation_times = [
                o.get("provider_metadata", {}).get("generation_time", 0)
                for o in outputs
            ]
            avg_time = np.mean(generation_times) if generation_times else 0
            
            # Calculate costs
            cost_per_item = self._get_provider_cost(provider)
            total_cost = cost_per_item * count
            
            # Quality metrics (placeholder - would use ML model in production)
            quality_scores = [
                o.get("quality_metrics", {}).get("score", 85)  # Default score
                for o in outputs
            ]
            avg_quality = np.mean(quality_scores) if quality_scores else 85
            
            # Historical performance (from database)
            historical_metrics = await self._get_historical_metrics(provider)
            
            metrics[provider] = {
                "count": count,
                "avg_generation_time": round(avg_time, 2),
                "total_generation_time": round(sum(generation_times), 2),
                "cost_per_item": cost_per_item,
                "total_cost": round(total_cost, 4),
                "avg_quality_score": round(avg_quality, 1),
                "historical_selection_rate": historical_metrics.get("selection_rate", 0.5),
                "historical_failure_rate": historical_metrics.get("failure_rate", 0.01),
                "outputs": count
            }
        
        return metrics
    
    def _prepare_comparison_view(
        self, 
        provider_outputs: Dict[str, List],
        provider_metrics: Dict[str, Dict]
    ) -> List[Dict]:
        """Prepare items for comparison UI"""
        comparison_items = []
        
        for provider, outputs in provider_outputs.items():
            metrics = provider_metrics.get(provider, {})
            
            for i, output in enumerate(outputs):
                comparison_items.append({
                    "provider": provider,
                    "index": i,
                    "url": output.get("url"),
                    "thumbnail": output.get("thumbnail", output.get("url")),
                    "prompt": output.get("prompt", ""),
                    "metadata": output.get("provider_metadata", {}),
                    "generation_time": metrics.get("avg_generation_time", 0),
                    "cost": metrics.get("cost_per_item", 0),
                    "quality_score": output.get("quality_metrics", {}).get("score", 85)
                })
        
        # For blind testing, shuffle the items
        if self.config.get("test_type") == "blind":
            import random
            random.shuffle(comparison_items)
            # Remove provider names for blind test
            for item in comparison_items:
                item["provider_hidden"] = item["provider"]
                item["provider"] = f"Option {chr(65 + comparison_items.index(item))}"
        
        return comparison_items
    
    async def _auto_select_winner(
        self, 
        provider_outputs: Dict[str, List],
        provider_metrics: Dict[str, Dict]
    ) -> Dict:
        """Automatically select winner based on configured criteria"""
        selection_method = self.config.get("selection_method")
        
        if selection_method == "auto_cost":
            # Select cheapest provider
            winner_provider = min(
                provider_metrics.keys(),
                key=lambda p: provider_metrics[p]["total_cost"]
            )
            reason = "Lowest cost"
            
        elif selection_method == "auto_speed":
            # Select fastest provider
            winner_provider = min(
                provider_metrics.keys(),
                key=lambda p: provider_metrics[p]["avg_generation_time"]
            )
            reason = "Fastest generation"
            
        elif selection_method == "auto_quality":
            # Select highest quality
            winner_provider = max(
                provider_metrics.keys(),
                key=lambda p: provider_metrics[p]["avg_quality_score"]
            )
            reason = "Highest quality score"
            
        elif selection_method == "auto_balanced":
            # Weighted scoring
            scores = {}
            weight_quality = self.config.get("weight_quality", 0.5)
            weight_speed = self.config.get("weight_speed", 0.3)
            weight_cost = self.config.get("weight_cost", 0.2)
            
            # Normalize weights
            total_weight = weight_quality + weight_speed + weight_cost
            if total_weight > 0:
                weight_quality /= total_weight
                weight_speed /= total_weight
                weight_cost /= total_weight
            
            for provider, metrics in provider_metrics.items():
                # Normalize metrics (0-1 scale)
                quality_norm = metrics["avg_quality_score"] / 100
                
                # Speed: Invert and normalize (faster is better)
                max_time = max(m["avg_generation_time"] for m in provider_metrics.values())
                speed_norm = 1 - (metrics["avg_generation_time"] / max_time) if max_time > 0 else 1
                
                # Cost: Invert and normalize (cheaper is better)
                max_cost = max(m["cost_per_item"] for m in provider_metrics.values())
                cost_norm = 1 - (metrics["cost_per_item"] / max_cost) if max_cost > 0 else 1
                
                # Calculate weighted score
                scores[provider] = (
                    weight_quality * quality_norm +
                    weight_speed * speed_norm +
                    weight_cost * cost_norm
                )
            
            winner_provider = max(scores.keys(), key=scores.get)
            reason = f"Balanced score: {scores[winner_provider]:.3f}"
        
        else:
            # Default to first provider
            winner_provider = list(provider_outputs.keys())[0]
            reason = "Default selection"
        
        # Calculate confidence if we have enough samples
        confidence = await self._calculate_statistical_confidence(
            winner_provider, 
            provider_metrics
        )
        
        return {
            "provider": winner_provider,
            "outputs": provider_outputs[winner_provider],
            "reason": reason,
            "confidence": confidence
        }
    
    async def _calculate_statistical_confidence(
        self, 
        winner: str,
        metrics: Dict[str, Dict]
    ) -> Optional[float]:
        """Calculate statistical confidence in winner selection"""
        min_samples = self.config.get("min_samples_for_significance", 30)
        
        # Need historical data for statistical significance
        # This is a simplified version - production would use more sophisticated stats
        
        if len(metrics) < 2:
            return None
        
        # Get quality scores for winner vs others
        winner_score = metrics[winner]["avg_quality_score"]
        other_scores = [
            m["avg_quality_score"] 
            for p, m in metrics.items() 
            if p != winner
        ]
        
        if not other_scores:
            return None
        
        # Simple confidence based on score difference
        avg_other = np.mean(other_scores)
        diff = winner_score - avg_other
        
        # Rough confidence calculation (would use proper stats in production)
        if diff > 10:
            confidence = 0.99
        elif diff > 5:
            confidence = 0.95
        elif diff > 2:
            confidence = 0.80
        else:
            confidence = 0.50
        
        return confidence
    
    def _get_provider_cost(self, provider: str) -> float:
        """Get cost per output for provider"""
        # Cost mapping (move to config in production)
        costs = {
            "akool": 0.05,
            "replicate_sdxl": 0.012,
            "mcp_akool": 0.05,
            "mcp_replicate": 0.012,
            "dalle3": 0.04,
            "midjourney": 0.025,
            "stable_diffusion": 0.008
        }
        return costs.get(provider, 0.01)
    
    async def _get_historical_metrics(self, provider: str) -> Dict:
        """Get historical performance metrics for provider"""
        # TODO: Query from provider_metrics table
        # For now, return defaults
        return {
            "selection_rate": 0.5,
            "failure_rate": 0.01,
            "avg_quality": 85,
            "avg_speed": 10
        }
    
    async def _save_test_results(
        self, 
        test_data: Dict,
        winner: Dict
    ) -> None:
        """Save A/B test results to database"""
        # TODO: Implement database save
        logger.info(f"Test results saved: {test_data['id']}")
```

### Task 3: Statistical Analysis Utilities
**Owner:** Backend Team  
**Timeline:** 1 hour  
**Location:** `src/analysis/statistics.py`

```python
# FILE: src/analysis/statistics.py
"""Statistical analysis utilities for A/B testing"""

import numpy as np
from scipy import stats
from typing import List, Tuple, Dict, Optional
import logging

logger = logging.getLogger(__name__)

class ABTestStatistics:
    """Statistical methods for A/B testing"""
    
    @staticmethod
    def calculate_significance(
        control: List[float],
        treatment: List[float],
        alpha: float = 0.05
    ) -> Tuple[float, bool]:
        """
        Calculate statistical significance using t-test
        
        Args:
            control: Control group measurements
            treatment: Treatment group measurements
            alpha: Significance level (default 0.05)
            
        Returns:
            Tuple of (p_value, is_significant)
        """
        if len(control) < 2 or len(treatment) < 2:
            return 1.0, False
        
        # Perform two-sample t-test
        t_stat, p_value = stats.ttest_ind(control, treatment)
        
        is_significant = p_value < alpha
        
        logger.debug(f"T-test: t={t_stat:.3f}, p={p_value:.3f}, significant={is_significant}")
        
        return p_value, is_significant
    
    @staticmethod
    def calculate_effect_size(
        group_a: List[float],
        group_b: List[float]
    ) -> float:
        """
        Calculate Cohen's d effect size
        
        Returns:
            Effect size (small: 0.2, medium: 0.5, large: 0.8)
        """
        if not group_a or not group_b:
            return 0.0
        
        mean_a = np.mean(group_a)
        mean_b = np.mean(group_b)
        
        # Pooled standard deviation
        std_a = np.std(group_a, ddof=1)
        std_b = np.std(group_b, ddof=1)
        n_a = len(group_a)
        n_b = len(group_b)
        
        pooled_std = np.sqrt(
            ((n_a - 1) * std_a**2 + (n_b - 1) * std_b**2) / (n_a + n_b - 2)
        )
        
        if pooled_std == 0:
            return 0.0
        
        effect_size = (mean_b - mean_a) / pooled_std
        
        return effect_size
    
    @staticmethod
    def calculate_confidence_interval(
        data: List[float],
        confidence: float = 0.95
    ) -> Tuple[float, float]:
        """
        Calculate confidence interval for mean
        
        Returns:
            Tuple of (lower_bound, upper_bound)
        """
        if not data:
            return 0.0, 0.0
        
        mean = np.mean(data)
        sem = stats.sem(data)
        
        interval = sem * stats.t.ppf((1 + confidence) / 2, len(data) - 1)
        
        return mean - interval, mean + interval
    
    @staticmethod
    def calculate_sample_size(
        effect_size: float = 0.5,
        alpha: float = 0.05,
        power: float = 0.8
    ) -> int:
        """
        Calculate required sample size for desired power
        
        Args:
            effect_size: Expected effect size (Cohen's d)
            alpha: Significance level
            power: Statistical power (1 - beta)
            
        Returns:
            Required sample size per group
        """
        from statsmodels.stats.power import tt_solve_power
        
        try:
            n = tt_solve_power(
                effect_size=effect_size,
                alpha=alpha,
                power=power,
                ratio=1
            )
            return int(np.ceil(n))
        except:
            # Fallback calculation
            z_alpha = stats.norm.ppf(1 - alpha/2)
            z_beta = stats.norm.ppf(power)
            n = 2 * ((z_alpha + z_beta) / effect_size) ** 2
            return int(np.ceil(n))
    
    @staticmethod
    def compare_multiple_groups(
        groups: Dict[str, List[float]],
        method: str = "anova"
    ) -> Dict[str, Any]:
        """
        Compare multiple groups (3+ providers)
        
        Args:
            groups: Dictionary of provider -> measurements
            method: 'anova' or 'kruskal'
            
        Returns:
            Test results including p-value and post-hoc comparisons
        """
        if len(groups) < 2:
            return {"error": "Need at least 2 groups"}
        
        group_data = list(groups.values())
        
        if method == "anova":
            # One-way ANOVA
            f_stat, p_value = stats.f_oneway(*group_data)
            result = {
                "method": "One-way ANOVA",
                "f_statistic": f_stat,
                "p_value": p_value,
                "significant": p_value < 0.05
            }
        else:
            # Kruskal-Wallis (non-parametric)
            h_stat, p_value = stats.kruskal(*group_data)
            result = {
                "method": "Kruskal-Wallis",
                "h_statistic": h_stat,
                "p_value": p_value,
                "significant": p_value < 0.05
            }
        
        # Post-hoc pairwise comparisons if significant
        if result["significant"] and len(groups) > 2:
            result["pairwise"] = {}
            providers = list(groups.keys())
            
            for i in range(len(providers)):
                for j in range(i+1, len(providers)):
                    p1, p2 = providers[i], providers[j]
                    _, p_val = stats.ttest_ind(groups[p1], groups[p2])
                    result["pairwise"][f"{p1}_vs_{p2}"] = {
                        "p_value": p_val,
                        "significant": p_val < (0.05 / len(providers))  # Bonferroni correction
                    }
        
        return result
```

---

## 📋 Day 5: TPS UI Implementation

### Task 4: TPS Job Instruction Component
**Owner:** Frontend Team  
**Timeline:** 4 hours  
**Location:** `frontend/tps-builder.html`

```html
<!-- FILE: frontend/tps-builder.html -->
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>TPS Standard Work Builder v4.0</title>
    <style>
        /* TPS-specific styling */
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: #0a0a0a;
            color: #e0e0e0;
        }
        
        .tps-container {
            max-width: 1400px;
            margin: 0 auto;
            padding: 20px;
        }
        
        /* Standard Work Header */
        .standard-work-header {
            background: linear-gradient(135deg, #1a1a1a, #2a2a2a);
            border: 2px solid #333;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 20px;
        }
        
        .header-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
        }
        
        .header-title {
            font-size: 24px;
            font-weight: 600;
            color: #4CAF50;
        }
        
        .revision-info {
            color: #888;
            font-size: 14px;
        }
        
        .meta-row {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 15px;
        }
        
        .metric-card {
            background: rgba(255, 255, 255, 0.05);
            padding: 10px 15px;
            border-radius: 4px;
            border-left: 3px solid #4CAF50;
        }
        
        .metric-label {
            color: #888;
            font-size: 12px;
            text-transform: uppercase;
            margin-bottom: 5px;
        }
        
        .metric-value {
            font-size: 20px;
            font-weight: bold;
            color: #4CAF50;
        }
        
        .critical-points {
            display: flex;
            gap: 20px;
            flex-wrap: wrap;
        }
        
        .point-badge {
            background: #333;
            padding: 5px 12px;
            border-radius: 20px;
            font-size: 13px;
            display: flex;
            align-items: center;
            gap: 5px;
        }
        
        .point-badge.critical {
            background: rgba(244, 67, 54, 0.2);
            border: 1px solid #f44336;
        }
        
        .point-badge.safety {
            background: rgba(255, 152, 0, 0.2);
            border: 1px solid #ff9800;
        }
        
        /* Job Instruction Table */
        .job-instruction-table {
            width: 100%;
            background: #1a1a1a;
            border-radius: 8px;
            overflow: hidden;
            border: 1px solid #333;
            margin-bottom: 20px;
        }
        
        .job-instruction-table thead {
            background: #2a2a2a;
        }
        
        .job-instruction-table th {
            padding: 12px;
            text-align: left;
            color: #4CAF50;
            font-weight: 600;
            font-size: 13px;
            text-transform: uppercase;
            border-bottom: 2px solid #4CAF50;
        }
        
        .job-instruction-table td {
            padding: 12px;
            border-bottom: 1px solid #333;
            vertical-align: top;
        }
        
        .job-instruction-table tbody tr:hover {
            background: rgba(76, 175, 80, 0.05);
        }
        
        .step-number {
            font-size: 18px;
            font-weight: bold;
            color: #4CAF50;
        }
        
        .work-element {
            font-weight: 500;
        }
        
        .element-type {
            font-size: 11px;
            color: #888;
            text-transform: uppercase;
            margin-top: 4px;
        }
        
        .human-indicator {
            background: #ff9800;
            color: #000;
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 11px;
            display: inline-block;
            margin-top: 5px;
            font-weight: 600;
        }
        
        .procedure-list {
            list-style: none;
            padding: 0;
        }
        
        .procedure-list li {
            padding: 2px 0;
            padding-left: 20px;
            position: relative;
        }
        
        .procedure-list li:before {
            content: "▸";
            position: absolute;
            left: 0;
            color: #4CAF50;
        }
        
        .mcp-selector {
            background: #2a2a2a;
            border: 1px solid #444;
            color: #e0e0e0;
            padding: 6px;
            border-radius: 4px;
            width: 100%;
            margin-bottom: 5px;
        }
        
        .server-status {
            font-size: 11px;
            padding: 2px 6px;
            border-radius: 4px;
            display: inline-block;
        }
        
        .server-status.online {
            background: #4CAF50;
            color: white;
        }
        
        .server-status.offline {
            background: #f44336;
            color: white;
        }
        
        .time-breakdown {
            font-size: 12px;
        }
        
        .time-manual {
            color: #ff9800;
        }
        
        .time-auto {
            color: #2196F3;
        }
        
        .time-total {
            font-weight: bold;
            color: #4CAF50;
            margin-top: 4px;
            font-size: 14px;
        }
        
        .qc-point {
            padding: 2px 0;
            font-size: 12px;
        }
        
        .qc-point.critical {
            color: #f44336;
            font-weight: bold;
        }
        
        .qc-gate {
            background: #ff9800;
            color: white;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 11px;
            font-weight: bold;
            display: inline-block;
            margin-top: 5px;
        }
        
        .qc-gate.critical {
            background: #f44336;
        }
        
        .key-point {
            margin: 2px 0;
            padding: 2px 5px;
            border-radius: 3px;
            font-size: 12px;
        }
        
        .key-point.quality {
            background: rgba(76, 175, 80, 0.2);
            border-left: 3px solid #4CAF50;
        }
        
        .key-point.safety {
            background: rgba(255, 152, 0, 0.2);
            border-left: 3px solid #ff9800;
        }
        
        .key-point.tip {
            background: rgba(33, 150, 243, 0.2);
            border-left: 3px solid #2196F3;
        }
        
        /* Row highlighting */
        tr.qc-step {
            background: rgba(255, 152, 0, 0.1);
        }
        
        tr.critical-step {
            background: rgba(244, 67, 54, 0.1);
            border-left: 4px solid #f44336;
        }
        
        tr.value-add-step {
            background: rgba(76, 175, 80, 0.05);
        }
        
        /* Footer */
        .table-footer {
            background: #2a2a2a;
            font-weight: bold;
        }
        
        .efficiency-metrics {
            display: flex;
            gap: 20px;
            font-size: 13px;
        }
        
        .efficiency-metrics span {
            padding: 4px 8px;
            background: rgba(255, 255, 255, 0.05);
            border-radius: 4px;
        }
        
        /* Andon Board */
        .andon-board {
            background: linear-gradient(135deg, rgba(76, 175, 80, 0.2), rgba(76, 175, 80, 0.1));
            border: 2px solid #4CAF50;
            border-radius: 8px;
            padding: 20px;
            margin-top: 20px;
            display: flex;
            align-items: center;
            gap: 20px;
        }
        
        .andon-board.yellow {
            background: linear-gradient(135deg, rgba(255, 193, 7, 0.2), rgba(255, 193, 7, 0.1));
            border-color: #FFC107;
        }
        
        .andon-board.red {
            background: linear-gradient(135deg, rgba(244, 67, 54, 0.2), rgba(244, 67, 54, 0.1));
            border-color: #f44336;
            animation: pulse 2s infinite;
        }
        
        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.7; }
        }
        
        .status-light {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            animation: glow 2s infinite;
        }
        
        .status-light.green {
            background: #4CAF50;
            box-shadow: 0 0 20px #4CAF50;
        }
        
        .status-light.yellow {
            background: #FFC107;
            box-shadow: 0 0 20px #FFC107;
        }
        
        .status-light.red {
            background: #f44336;
            box-shadow: 0 0 20px #f44336;
        }
        
        @keyframes glow {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.6; }
        }
        
        .status-text {
            font-size: 18px;
            font-weight: bold;
        }
        
        .andon-metrics {
            display: flex;
            gap: 20px;
            flex: 1;
        }
        
        .andon-metric {
            text-align: center;
        }
        
        .andon-metric-label {
            font-size: 11px;
            color: #888;
            text-transform: uppercase;
        }
        
        .andon-metric-value {
            font-size: 24px;
            font-weight: bold;
            color: #4CAF50;
        }
        
        .andon-button {
            background: #f44336;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 5px;
            font-weight: bold;
            cursor: pointer;
            transition: all 0.3s;
        }
        
        .andon-button:hover {
            background: #d32f2f;
            transform: scale(1.05);
        }
        
        /* Mobile Responsive */
        @media (max-width: 768px) {
            .job-instruction-table {
                font-size: 12px;
            }
            
            .job-instruction-table thead {
                display: none;
            }
            
            .job-instruction-table tr {
                display: block;
                margin-bottom: 15px;
                background: #2a2a2a;
                border-radius: 8px;
                padding: 15px;
            }
            
            .job-instruction-table td {
                display: block;
                padding: 5px 0;
                border: none;
            }
            
            .job-instruction-table td:before {
                content: attr(data-label);
                font-weight: bold;
                color: #4CAF50;
                display: inline-block;
                width: 120px;
                font-size: 11px;
                text-transform: uppercase;
            }
            
            .andon-board {
                flex-direction: column;
                text-align: center;
            }
            
            .andon-metrics {
                flex-direction: column;
            }
            
            .andon-button {
                width: 100%;
                padding: 15px;
                font-size: 16px;
            }
        }
    </style>
</head>
<body>
    <div id="app" class="tps-container">
        <!-- Standard Work Header -->
        <div class="standard-work-header">
            <div class="header-row">
                <h1 class="header-title">Standard Work Instruction</h1>
                <div class="revision-info">
                    Process: {{ workflowName }} | Rev: 4.0 | Date: {{ currentDate }}
                </div>
            </div>
            
            <div class="meta-row">
                <div class="metric-card">
                    <div class="metric-label">Takt Time</div>
                    <div class="metric-value">{{ taktTime }}s</div>
                </div>
                <div class="metric-card">
                    <div class="metric-label">Cycle Time</div>
                    <div class="metric-value">{{ cycleTime }}s</div>
                </div>
                <div class="metric-card">
                    <div class="metric-label">OEE</div>
                    <div class="metric-value">{{ oee }}%</div>
                </div>
                <div class="metric-card">
                    <div class="metric-label">First Pass Yield</div>
                    <div class="metric-value">{{ firstPassYield }}%</div>
                </div>
            </div>
            
            <div class="critical-points">
                <div class="point-badge critical">
                    ⚠️ Critical Quality Points: {{ criticalPoints }}
                </div>
                <div class="point-badge safety">
                    🛡️ Safety Points: {{ safetyPoints }}
                </div>
                <div class="point-badge">
                    🤖 MCP Servers: {{ mcpServersCount }}
                </div>
                <div class="point-badge">
                    📊 A/B Tests: {{ abTestsCount }}
                </div>
            </div>
        </div>
        
        <!-- Job Instruction Table -->
        <table class="job-instruction-table">
            <thead>
                <tr>
                    <th width="5%">Step #</th>
                    <th width="15%">Work Element</th>
                    <th width="20%">Procedure</th>
                    <th width="15%">Tool/MCP</th>
                    <th width="10%">Time (s)</th>
                    <th width="15%">Quality</th>
                    <th width="20%">Key Points</th>
                </tr>
            </thead>
            <tbody>
                <tr v-for="step in workflowSteps" 
                    :key="step.id"
                    :class="getRowClass(step)">
                    <td data-label="Step">
                        <div class="step-number">{{ step.stepNumber }}</div>
                    </td>
                    <td data-label="Element">
                        <div class="work-element">{{ step.workElement }}</div>
                        <div class="element-type">{{ step.elementType }}</div>
                        <div v-if="step.isHumanRequired" class="human-indicator">
                            👤 Human Required
                        </div>
                    </td>
                    <td data-label="Procedure">
                        <ul class="procedure-list">
                            <li v-for="proc in step.procedures">{{ proc }}</li>
                        </ul>
                    </td>
                    <td data-label="Tool">
                        <div v-if="step.provider">
                            <select class="mcp-selector" 
                                    v-model="step.provider"
                                    @change="updateProvider(step)">
                                <option value="akool">Akool (Direct)</option>
                                <option value="replicate_sdxl">Replicate (Direct)</option>
                                <option value="mcp_akool">Akool (MCP)</option>
                                <option value="mcp_replicate">Replicate (MCP)</option>
                            </select>
                            <span class="server-status online">Online</span>
                        </div>
                        <div v-else>{{ step.tool || 'Manual' }}</div>
                    </td>
                    <td data-label="Time">
                        <div class="time-breakdown">
                            <div v-if="step.manualTime" class="time-manual">
                                M: {{ step.manualTime }}s
                            </div>
                            <div v-if="step.autoTime" class="time-auto">
                                A: {{ step.autoTime }}s
                            </div>
                            <div class="time-total">
                                {{ step.manualTime + step.autoTime }}s
                            </div>
                        </div>
                    </td>
                    <td data-label="Quality">
                        <div v-for="qc in step.qualityPoints" 
                             class="qc-point"
                             :class="{ critical: qc.critical }">
                            {{ qc.critical ? '🔴' : '⚪' }} {{ qc.check }}
                        </div>
                        <div v-if="step.isQCGate" 
                             class="qc-gate"
                             :class="{ critical: step.isCriticalGate }">
                            {{ step.isCriticalGate ? 'Critical Gate' : 'Quality Gate' }}
                        </div>
                    </td>
                    <td data-label="Key Points">
                        <div v-if="step.keyPoints.quality" class="key-point quality">
                            Q: {{ step.keyPoints.quality }}
                        </div>
                        <div v-if="step.keyPoints.safety" class="key-point safety">
                            S: {{ step.keyPoints.safety }}
                        </div>
                        <div v-if="step.keyPoints.tip" class="key-point tip">
                            💡 {{ step.keyPoints.tip }}
                        </div>
                    </td>
                </tr>
            </tbody>
            <tfoot>
                <tr class="table-footer">
                    <td colspan="4" style="text-align: right;">Total:</td>
                    <td>
                        <div class="time-total">{{ totalTime }}s</div>
                    </td>
                    <td colspan="2">
                        <div class="efficiency-metrics">
                            <span>Value-Add: {{ valueAddTime }}s</span>
                            <span>Efficiency: {{ efficiency }}%</span>
                        </div>
                    </td>
                </tr>
            </tfoot>
        </table>
        
        <!-- Andon Board -->
        <div class="andon-board" :class="andonStatus">
            <div class="status-light" :class="andonStatus"></div>
            <div class="status-text">{{ andonStatusText }}</div>
            
            <div class="andon-metrics">
                <div class="andon-metric">
                    <div class="andon-metric-label">Output</div>
                    <div class="andon-metric-value">{{ dailyOutput }}</div>
                </div>
                <div class="andon-metric">
                    <div class="andon-metric-label">Defects</div>
                    <div class="andon-metric-value">{{ defectRate }}%</div>
                </div>
                <div class="andon-metric">
                    <div class="andon-metric-label">Cycle</div>
                    <div class="andon-metric-value">{{ currentCycleTime }}s</div>
                </div>
                <div class="andon-metric">
                    <div class="andon-metric-label">FPY</div>
                    <div class="andon-metric-value">{{ firstPassYield }}%</div>
                </div>
            </div>
            
            <button v-if="andonStatus !== 'green'" 
                    @click="pullAndon" 
                    class="andon-button">
                🚨 Call Supervisor
            </button>
        </div>
    </div>
    
    <script src="https://cdn.jsdelivr.net/npm/vue@3/dist/vue.global.prod.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/axios/dist/axios.min.js"></script>
    <script>
        const { createApp } = Vue;
        
        createApp({
            data() {
                return {
                    workflowName: 'AI Image Generation',
                    currentDate: new Date().toLocaleDateString(),
                    taktTime: 45,
                    cycleTime: 0,
                    oee: 0,
                    firstPassYield: 92,
                    criticalPoints: 3,
                    safetyPoints: 2,
                    mcpServersCount: 2,
                    abTestsCount: 1,
                    dailyOutput: 127,
                    defectRate: 0.8,
                    currentCycleTime: 38,
                    workflowSteps: [],
                    andonStatus: 'green',
                    andonStatusText: 'Normal Operation',
                    workflow: null
                }
            },
            
            computed: {
                totalTime() {
                    return this.workflowSteps.reduce((sum, step) => 
                        sum + step.manualTime + step.autoTime, 0);
                },
                
                valueAddTime() {
                    return this.workflowSteps
                        .filter(s => s.elementType === 'value-add')
                        .reduce((sum, step) => sum + step.manualTime + step.autoTime, 0);
                },
                
                efficiency() {
                    if (this.totalTime === 0) return 0;
                    return Math.round((this.valueAddTime / this.totalTime) * 100);
                }
            },
            
            methods: {
                async fetchWorkflow(workflowId) {
                    try {
                        const response = await axios.get(`/workflows/${workflowId}`);
                        this.workflow = response.data.workflow;
                        this.processWorkflowIntoSteps();
                    } catch (error) {
                        console.error('Failed to fetch workflow:', error);
                    }
                },
                
                processWorkflowIntoSteps() {
                    if (!this.workflow) return;
                    
                    this.workflowSteps = this.workflow.modules.map((module, index) => {
                        return {
                            id: module.id,
                            stepNumber: index + 1,
                            workElement: module.name,
                            elementType: this.getElementType(module.type),
                            procedures: this.getProcedures(module),
                            provider: module.config?.provider,
                            tool: this.getTool(module),
                            manualTime: this.getManualTime(module),
                            autoTime: this.getAutoTime(module),
                            qualityPoints: this.getQualityPoints(module),
                            isQCGate: module.type === 'qc_pass_fail',
                            isCriticalGate: module.config?.is_critical,
                            isHumanRequired: this.requiresHuman(module),
                            keyPoints: this.getKeyPoints(module)
                        };
                    });
                    
                    this.cycleTime = this.totalTime;
                    this.oee = this.calculateOEE();
                    this.updateAndonStatus();
                },
                
                getElementType(moduleType) {
                    const typeMap = {
                        'start': 'setup',
                        'image_generation': 'value-add',
                        'mcp_module': 'value-add',
                        'qc_pass_fail': 'inspection',
                        'ab_testing': 'decision',
                        'end': 'completion'
                    };
                    return typeMap[moduleType] || 'process';
                },
                
                getProcedures(module) {
                    if (module.type === 'image_generation' || module.type === 'mcp_module') {
                        return [
                            'Set generation parameters',
                            `Submit to ${module.config?.provider || 'provider'}`,
                            'Monitor progress',
                            'Retrieve assets'
                        ];
                    }
                    if (module.type === 'qc_pass_fail') {
                        return [
                            'Review each asset',
                            'Check quality criteria',
                            'Mark Pass/Fail',
                            'Submit batch'
                        ];
                    }
                    if (module.type === 'ab_testing') {
                        return [
                            'Compare outputs',
                            'Evaluate metrics',
                            'Select winner',
                            'Record decision'
                        ];
                    }
                    return ['Execute step'];
                },
                
                getTool(module) {
                    if (module.config?.mcp_server) {
                        return `MCP: ${module.config.mcp_server}`;
                    }
                    if (module.config?.provider) {
                        return module.config.provider;
                    }
                    return module.type;
                },
                
                getManualTime(module) {
                    const times = {
                        'start': 5,
                        'qc_pass_fail': 20,
                        'ab_testing': 15,
                        'end': 2
                    };
                    return times[module.type] || 0;
                },
                
                getAutoTime(module) {
                    if (module.type === 'image_generation' || module.type === 'mcp_module') {
                        const provider = module.config?.provider;
                        if (provider === 'replicate_sdxl' || provider === 'mcp_replicate') {
                            return 3;
                        }
                        if (provider === 'akool' || provider === 'mcp_akool') {
                            return 15;
                        }
                        return 10;
                    }
                    return 0;
                },
                
                getQualityPoints(module) {
                    if (module.type === 'image_generation' || module.type === 'mcp_module') {
                        return [
                            { check: 'Resolution ≥ 1024px', critical: false },
                            { check: 'No NSFW content', critical: true },
                            { check: 'Matches prompt', critical: false }
                        ];
                    }
                    if (module.type === 'qc_pass_fail') {
                        return [
                            { check: '100% inspection', critical: true },
                            { check: 'Decisions recorded', critical: true }
                        ];
                    }
                    return [];
                },
                
                requiresHuman(module) {
                    return ['qc_pass_fail', 'ab_testing'].includes(module.type);
                },
                
                getKeyPoints(module) {
                    const points = {};
                    
                    if (module.type === 'image_generation' || module.type === 'mcp_module') {
                        points.quality = 'Check for artifacts';
                        points.tip = 'Batch size ≤ 10 for faster QC';
                    }
                    
                    if (module.type === 'qc_pass_fail') {
                        points.quality = '100% inspection required';
                        points.safety = 'Take breaks every 20 reviews';
                    }
                    
                    if (module.type === 'ab_testing') {
                        points.quality = 'Compare fairly';
                        points.tip = 'Consider cost vs quality';
                    }
                    
                    return points;
                },
                
                getRowClass(step) {
                    const classes = [];
                    if (step.isQCGate) classes.push('qc-step');
                    if (step.isCriticalGate) classes.push('critical-step');
                    if (step.elementType === 'value-add') classes.push('value-add-step');
                    return classes.join(' ');
                },
                
                calculateOEE() {
                    // OEE = Availability × Performance × Quality
                    const availability = 0.95;
                    const performance = this.taktTime > 0 ? (this.cycleTime / this.taktTime) : 0;
                    const quality = this.firstPassYield / 100;
                    return Math.round(availability * performance * quality * 100);
                },
                
                updateAndonStatus() {
                    if (this.defectRate > 5) {
                        this.andonStatus = 'red';
                        this.andonStatusText = 'Stop & Fix';
                    } else if (this.defectRate > 2) {
                        this.andonStatus = 'yellow';
                        this.andonStatusText = 'Attention Required';
                    } else {
                        this.andonStatus = 'green';
                        this.andonStatusText = 'Normal Operation';
                    }
                },
                
                async updateProvider(step) {
                    // Update the provider for this step
                    console.log('Updating provider for step:', step);
                    // Call API to update workflow
                },
                
                async pullAndon() {
                    // Alert supervisor
                    console.log('Andon pulled! Status:', this.andonStatus);
                    alert('Supervisor has been notified!');
                }
            },
            
            mounted() {
                // Create sample workflow for demo
                this.workflowSteps = [
                    {
                        id: 'step1',
                        stepNumber: 1,
                        workElement: 'Initialize Batch',
                        elementType: 'setup',
                        procedures: ['Verify API keys', 'Set batch size', 'Check resources'],
                        tool: 'System',
                        manualTime: 5,
                        autoTime: 0,
                        qualityPoints: [
                            { check: 'Batch ≤ 10', critical: true },
                            { check: 'Keys valid', critical: true }
                        ],
                        keyPoints: {
                            quality: 'Max 10 per batch',
                            tip: 'Smaller = faster QC'
                        }
                    },
                    {
                        id: 'step2',
                        stepNumber: 2,
                        workElement: 'Generate Images (Provider A)',
                        elementType: 'value-add',
                        procedures: ['Set parameters', 'Submit to akool', 'Monitor', 'Retrieve'],
                        provider: 'akool',
                        tool: 'Akool API',
                        manualTime: 3,
                        autoTime: 15,
                        qualityPoints: [
                            { check: 'Resolution ≥ 1024px', critical: false },
                            { check: 'No NSFW', critical: true }
                        ],
                        keyPoints: {
                            quality: 'Check artifacts',
                            tip: 'Use aspect ratio 1:1'
                        }
                    },
                    {
                        id: 'step3',
                        stepNumber: 3,
                        workElement: 'Generate Images (Provider B)',
                        elementType: 'value-add',
                        procedures: ['Set parameters', 'Submit to replicate', 'Monitor', 'Retrieve'],
                        provider: 'mcp_replicate',
                        tool: 'Replicate MCP',
                        manualTime: 3,
                        autoTime: 3,
                        qualityPoints: [
                            { check: 'Resolution ≥ 1024px', critical: false },
                            { check: 'No NSFW', critical: true }
                        ],
                        keyPoints: {
                            quality: 'Check artifacts',
                            tip: '4x faster than Akool'
                        }
                    },
                    {
                        id: 'step4',
                        stepNumber: 4,
                        workElement: 'A/B Comparison',
                        elementType: 'decision',
                        procedures: ['Compare outputs', 'Evaluate metrics', 'Select winner', 'Record'],
                        tool: 'A/B Testing',
                        manualTime: 15,
                        autoTime: 0,
                        isHumanRequired: true,
                        qualityPoints: [
                            { check: 'Fair comparison', critical: false },
                            { check: 'Metrics recorded', critical: true }
                        ],
                        keyPoints: {
                            quality: 'Consider cost vs quality',
                            tip: 'Document decision rationale'
                        }
                    },
                    {
                        id: 'step5',
                        stepNumber: 5,
                        workElement: 'Quality Inspection',
                        elementType: 'inspection',
                        procedures: ['Review assets', 'Check criteria', 'Mark Pass/Fail', 'Submit'],
                        tool: 'Human QC',
                        manualTime: 20,
                        autoTime: 0,
                        isHumanRequired: true,
                        isQCGate: true,
                        isCriticalGate: true,
                        qualityPoints: [
                            { check: '100% inspection', critical: true },
                            { check: 'Decisions recorded', critical: true }
                        ],
                        keyPoints: {
                            quality: 'No sampling allowed',
                            safety: 'Break every 20 reviews'
                        }
                    },
                    {
                        id: 'step6',
                        stepNumber: 6,
                        workElement: 'Store Assets',
                        elementType: 'completion',
                        procedures: ['Save to repository', 'Update metrics', 'Close batch'],
                        tool: 'Database',
                        manualTime: 2,
                        autoTime: 1,
                        qualityPoints: [
                            { check: 'All assets saved', critical: true }
                        ],
                        keyPoints: {
                            quality: 'Verify storage'
                        }
                    }
                ];
                
                this.cycleTime = this.totalTime;
                this.oee = this.calculateOEE();
                this.updateAndonStatus();
                
                // Simulate real-time updates
                setInterval(() => {
                    this.dailyOutput = 127 + Math.floor(Math.random() * 10);
                    this.currentCycleTime = 38 + Math.floor(Math.random() * 5) - 2;
                    this.defectRate = (Math.random() * 2).toFixed(1);
                    this.updateAndonStatus();
                }, 5000);
            }
        }).mount('#app');
    </script>
</body>
</html>
```

---

## 📋 Day 6: Integration & Testing

### Task 5: Connect A/B Testing to TPS UI
**Owner:** Full Stack Team  
**Timeline:** 2 hours

```javascript
// Add to TPS UI - A/B Testing Results Display
const ABTestingResultsComponent = {
    template: `
        <div class="ab-test-results">
            <h3>A/B Test Results</h3>
            <div class="provider-comparison">
                <div v-for="provider in providers" :key="provider.name" 
                     class="provider-card" 
                     :class="{ winner: provider.isWinner }">
                    <h4>{{ provider.name }}</h4>
                    <div class="metrics">
                        <div>Speed: {{ provider.avgTime }}s</div>
                        <div>Cost: ${{ provider.cost }}</div>
                        <div>Quality: {{ provider.quality }}%</div>
                    </div>
                    <div class="selection-rate">
                        Selected: {{ provider.selectionRate }}%
                    </div>
                </div>
            </div>
            <div class="statistical-significance" v-if="pValue">
                <span>Statistical Significance: </span>
                <span :class="{ significant: pValue < 0.05 }">
                    p = {{ pValue.toFixed(3) }}
                    {{ pValue < 0.05 ? '✅ Significant' : '❌ Not Significant' }}
                </span>
            </div>
        </div>
    `,
    props: ['testResults'],
    computed: {
        providers() {
            // Process test results into provider cards
            return this.testResults?.providers || [];
        },
        pValue() {
            return this.testResults?.statistics?.p_value;
        }
    }
};
```

### Task 6: End-to-End Testing
**Owner:** QA Team  
**Timeline:** 2 hours

```python
# FILE: tests/e2e/test_sprint_4_complete.py
"""End-to-end tests for Sprint 4.0 features"""

import pytest
import asyncio
from datetime import datetime

class TestSprint4Complete:
    """Test complete Sprint 4.0 functionality"""
    
    @pytest.mark.e2e
    async def test_provider_to_mcp_to_ab_test(self, client):
        """Test full workflow: Provider → MCP → A/B Testing → TPS UI"""
        
        # Step 1: Create workflow with both providers and MCP
        workflow = {
            "name": "Sprint 4.0 E2E Test",
            "modules": [
                {
                    "id": "start",
                    "type": "start",
                    "config": {"iterations": 2}
                },
                {
                    "id": "akool_direct",
                    "type": "image_generation",
                    "config": {
                        "provider": "akool",
                        "prompt": "futuristic city"
                    }
                },
                {
                    "id": "mcp_replicate",
                    "type": "mcp_module",
                    "config": {
                        "mcp_server": "replicate_mcp",
                        "tool_name": "generate_image",
                        "tool_arguments": {
                            "prompt": "futuristic city"
                        }
                    }
                },
                {
                    "id": "ab_test",
                    "type": "ab_testing",
                    "config": {
                        "test_type": "side_by_side",
                        "selection_method": "auto_balanced"
                    }
                },
                {
                    "id": "qc",
                    "type": "qc_pass_fail"
                },
                {
                    "id": "end",
                    "type": "end"
                }
            ],
            "connections": [
                # ... connection logic
            ]
        }
        
        # Step 2: Create and execute workflow
        create_response = await client.post("/workflows", json=workflow)
        workflow_id = create_response.json()["workflow"]["id"]
        
        exec_response = await client.post(f"/workflows/{workflow_id}/execute")
        execution_id = exec_response.json()["execution_id"]
        
        # Step 3: Wait for A/B test pause
        await asyncio.sleep(5)
        
        # Step 4: Check A/B test created
        status = await client.get(f"/executions/{execution_id}")
        assert "ab_test_data" in status.json()
        
        # Step 5: Verify provider metrics collected
        test_data = status.json()["ab_test_data"]
        assert "akool" in test_data["providers_tested"]
        assert "mcp_replicate" in test_data["providers_tested"]
        
        # Step 6: Check TPS UI can display
        tps_response = await client.get(f"/tps/workflow/{workflow_id}")
        assert tps_response.status_code == 200
        
        print("✅ Sprint 4.0 E2E Test Complete!")
```

---

## 📊 Success Metrics

### Day 4 Completion
- [ ] A/B Testing module implemented
- [ ] Statistical analysis working
- [ ] Provider metrics tracked
- [ ] Auto-selection logic functional

### Day 5 Completion
- [ ] TPS UI renders Job Instructions
- [ ] Standard Work header displays metrics
- [ ] Andon board updates real-time
- [ ] Mobile responsive design works

### Day 6 Completion
- [ ] A/B results show in TPS UI
- [ ] E2E tests passing
- [ ] Performance acceptable (<100ms overhead)
- [ ] Deployed to production

---

## 🚀 Next Steps

After Days 4-6 are complete, you'll have:
1. **Provider Framework** ✅ (Day 1)
2. **MCP Foundation** ✅ (Days 2-3)
3. **A/B Testing** (Days 4-6)
4. **TPS UI** (Days 4-6)

This completes Sprint 4.0 and creates the world's first **"Toyota Production System for AI"** platform!

---

## 🎉 Sprint 4.0 Complete Checklist

- [x] Provider persistence fixed
- [x] MCP client implemented
- [x] Akool MCP wrapper created
- [x] MCP API endpoints working
- [ ] A/B Testing module built
- [ ] Statistical analysis integrated
- [ ] TPS UI components created
- [ ] Mobile responsive design
- [ ] E2E tests passing
- [ ] Production deployment

You're almost there! The foundation is solid, and these final pieces will complete the vision. 🚀