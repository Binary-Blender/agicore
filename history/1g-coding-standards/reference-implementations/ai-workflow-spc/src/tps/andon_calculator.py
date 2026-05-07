"""
Andon Alert Calculator for TPS Dashboard
Implements visual management system for workflow health monitoring
"""
from enum import Enum
from typing import Dict, Any, List, Optional
from dataclasses import dataclass
from datetime import datetime


class AndonStatus(str, Enum):
    """Andon board status levels"""
    GREEN = "green"   # All systems normal
    YELLOW = "yellow" # Warning - attention needed
    RED = "red"       # Critical - immediate action required


@dataclass
class AndonAlert:
    """Represents an Andon alert with severity and details"""
    status: AndonStatus
    metric_name: str
    current_value: float
    threshold: float
    severity: str  # "normal", "warning", "critical"
    message: str
    recommendation: str
    timestamp: datetime = None

    def __post_init__(self):
        if self.timestamp is None:
            self.timestamp = datetime.utcnow()


class AndonCalculator:
    """
    Calculates Andon board status based on TPS metrics

    Thresholds based on Toyota Production System standards:
    - Defect Rate: <1% green, 1-3% yellow, >3% red
    - First Pass Yield: >95% green, 90-95% yellow, <90% red
    - Cycle Time vs Takt: <100% green, 100-110% yellow, >110% red
    - OEE: >85% green, 75-85% yellow, <75% red
    """

    # Default thresholds (can be customized per workflow)
    DEFAULT_THRESHOLDS = {
        "defect_rate": {
            "green_max": 1.0,     # < 1%
            "yellow_max": 3.0,    # 1-3%
            # > 3% is red
        },
        "first_pass_yield": {
            "red_max": 90.0,      # < 90%
            "yellow_min": 95.0,   # 90-95%
            # > 95% is green
        },
        "cycle_time_ratio": {
            "green_max": 100.0,   # < 100% of takt
            "yellow_max": 110.0,  # 100-110% of takt
            # > 110% is red
        },
        "oee": {
            "red_max": 75.0,      # < 75%
            "yellow_min": 85.0,   # 75-85%
            # > 85% is green
        }
    }

    def __init__(self, custom_thresholds: Optional[Dict[str, Dict[str, float]]] = None):
        """
        Initialize calculator with optional custom thresholds

        Args:
            custom_thresholds: Override default thresholds for specific metrics
        """
        self.thresholds = self.DEFAULT_THRESHOLDS.copy()
        if custom_thresholds:
            for metric, values in custom_thresholds.items():
                if metric in self.thresholds:
                    self.thresholds[metric].update(values)

    def calculate_andon_status(
        self,
        tps_metrics: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Calculate overall Andon status and generate alerts

        Args:
            tps_metrics: Dictionary containing TPS metrics from TPSMetricsCalculator

        Returns:
            Dictionary with:
            - overall_status: AndonStatus (GREEN/YELLOW/RED)
            - alerts: List of AndonAlert objects
            - metric_statuses: Individual status for each metric
            - summary: Human-readable summary
        """
        alerts: List[AndonAlert] = []
        metric_statuses: Dict[str, AndonStatus] = {}

        # 1. Check Defect Rate
        defect_rate = tps_metrics.get("defect_rate", 0.0)
        defect_status = self._check_defect_rate(defect_rate, alerts)
        metric_statuses["defect_rate"] = defect_status

        # 2. Check First Pass Yield
        fpy = tps_metrics.get("first_pass_yield", 100.0)
        fpy_status = self._check_first_pass_yield(fpy, alerts)
        metric_statuses["first_pass_yield"] = fpy_status

        # 3. Check Cycle Time vs Takt Time
        cycle_time = tps_metrics.get("avg_cycle_time_seconds", 0)
        takt_time = tps_metrics.get("takt_time_seconds", 1)
        cycle_status = self._check_cycle_time(cycle_time, takt_time, alerts)
        metric_statuses["cycle_time"] = cycle_status

        # 4. Check OEE
        oee = tps_metrics.get("oee", 0.0)
        oee_status = self._check_oee(oee, alerts)
        metric_statuses["oee"] = oee_status

        # 5. Determine Overall Status (worst status wins)
        overall_status = self._determine_overall_status(metric_statuses)

        # 6. Generate Summary
        summary = self._generate_summary(overall_status, alerts)

        return {
            "overall_status": overall_status,
            "alerts": [self._alert_to_dict(alert) for alert in alerts],
            "metric_statuses": {k: v.value for k, v in metric_statuses.items()},
            "summary": summary,
            "timestamp": datetime.utcnow().isoformat(),
            "alert_count": {
                "critical": len([a for a in alerts if a.severity == "critical"]),
                "warning": len([a for a in alerts if a.severity == "warning"]),
                "normal": len([a for a in alerts if a.severity == "normal"])
            }
        }

    def _check_defect_rate(self, defect_rate: float, alerts: List[AndonAlert]) -> AndonStatus:
        """Check defect rate and add alerts if needed"""
        thresholds = self.thresholds["defect_rate"]

        if defect_rate < thresholds["green_max"]:
            return AndonStatus.GREEN
        elif defect_rate < thresholds["yellow_max"]:
            alerts.append(AndonAlert(
                status=AndonStatus.YELLOW,
                metric_name="Defect Rate",
                current_value=defect_rate,
                threshold=thresholds["green_max"],
                severity="warning",
                message=f"Defect rate at {defect_rate:.1f}% (target: <{thresholds['green_max']}%)",
                recommendation="Review recent failures. Check for common error patterns. Consider implementing additional quality gates."
            ))
            return AndonStatus.YELLOW
        else:
            alerts.append(AndonAlert(
                status=AndonStatus.RED,
                metric_name="Defect Rate",
                current_value=defect_rate,
                threshold=thresholds["yellow_max"],
                severity="critical",
                message=f"CRITICAL: Defect rate at {defect_rate:.1f}% (threshold: <{thresholds['yellow_max']}%)",
                recommendation="IMMEDIATE ACTION REQUIRED: Stop and analyze root cause. Review all failed executions. Implement corrective measures before continuing production."
            ))
            return AndonStatus.RED

    def _check_first_pass_yield(self, fpy: float, alerts: List[AndonAlert]) -> AndonStatus:
        """Check first pass yield and add alerts if needed"""
        thresholds = self.thresholds["first_pass_yield"]

        if fpy > thresholds["yellow_min"]:
            return AndonStatus.GREEN
        elif fpy > thresholds["red_max"]:
            alerts.append(AndonAlert(
                status=AndonStatus.YELLOW,
                metric_name="First Pass Yield",
                current_value=fpy,
                threshold=thresholds["yellow_min"],
                severity="warning",
                message=f"First Pass Yield at {fpy:.1f}% (target: >{thresholds['yellow_min']}%)",
                recommendation="Investigate why workflows require retries. Focus on improving prompt quality and error handling."
            ))
            return AndonStatus.YELLOW
        else:
            alerts.append(AndonAlert(
                status=AndonStatus.RED,
                metric_name="First Pass Yield",
                current_value=fpy,
                threshold=thresholds["red_max"],
                severity="critical",
                message=f"CRITICAL: First Pass Yield at {fpy:.1f}% (threshold: >{thresholds['red_max']}%)",
                recommendation="IMMEDIATE ACTION REQUIRED: Over 10% of workflows failing on first attempt. Review workflow design and validation logic."
            ))
            return AndonStatus.RED

    def _check_cycle_time(
        self,
        cycle_time: float,
        takt_time: float,
        alerts: List[AndonAlert]
    ) -> AndonStatus:
        """Check cycle time vs takt time and add alerts if needed"""
        if takt_time <= 0:
            return AndonStatus.GREEN  # Can't evaluate without valid takt time

        cycle_ratio = (cycle_time / takt_time) * 100
        thresholds = self.thresholds["cycle_time_ratio"]

        if cycle_ratio < thresholds["green_max"]:
            return AndonStatus.GREEN
        elif cycle_ratio < thresholds["yellow_max"]:
            alerts.append(AndonAlert(
                status=AndonStatus.YELLOW,
                metric_name="Cycle Time",
                current_value=cycle_ratio,
                threshold=thresholds["green_max"],
                severity="warning",
                message=f"Cycle time at {cycle_ratio:.0f}% of takt time (target: <{thresholds['green_max']}%)",
                recommendation="Workflows taking longer than customer demand pace. Look for optimization opportunities in slow modules."
            ))
            return AndonStatus.YELLOW
        else:
            alerts.append(AndonAlert(
                status=AndonStatus.RED,
                metric_name="Cycle Time",
                current_value=cycle_ratio,
                threshold=thresholds["yellow_max"],
                severity="critical",
                message=f"CRITICAL: Cycle time at {cycle_ratio:.0f}% of takt time (threshold: <{thresholds['yellow_max']}%)",
                recommendation="IMMEDIATE ACTION REQUIRED: Cannot meet customer demand at current pace. Identify bottlenecks and implement parallel processing."
            ))
            return AndonStatus.RED

    def _check_oee(self, oee: float, alerts: List[AndonAlert]) -> AndonStatus:
        """Check Overall Equipment Effectiveness and add alerts if needed"""
        thresholds = self.thresholds["oee"]

        if oee > thresholds["yellow_min"]:
            return AndonStatus.GREEN
        elif oee > thresholds["red_max"]:
            alerts.append(AndonAlert(
                status=AndonStatus.YELLOW,
                metric_name="Overall Equipment Effectiveness",
                current_value=oee,
                threshold=thresholds["yellow_min"],
                severity="warning",
                message=f"OEE at {oee:.1f}% (target: >{thresholds['yellow_min']}%)",
                recommendation="System effectiveness below target. Review availability, performance, and quality metrics to identify improvement areas."
            ))
            return AndonStatus.YELLOW
        else:
            alerts.append(AndonAlert(
                status=AndonStatus.RED,
                metric_name="Overall Equipment Effectiveness",
                current_value=oee,
                threshold=thresholds["red_max"],
                severity="critical",
                message=f"CRITICAL: OEE at {oee:.1f}% (threshold: >{thresholds['red_max']}%)",
                recommendation="IMMEDIATE ACTION REQUIRED: System effectiveness critically low. Comprehensive review needed across all TPS metrics."
            ))
            return AndonStatus.RED

    def _determine_overall_status(self, metric_statuses: Dict[str, AndonStatus]) -> AndonStatus:
        """Determine overall Andon status (worst status wins)"""
        if AndonStatus.RED in metric_statuses.values():
            return AndonStatus.RED
        elif AndonStatus.YELLOW in metric_statuses.values():
            return AndonStatus.YELLOW
        else:
            return AndonStatus.GREEN

    def _generate_summary(self, overall_status: AndonStatus, alerts: List[AndonAlert]) -> str:
        """Generate human-readable summary"""
        if overall_status == AndonStatus.GREEN:
            return "✅ All systems operating normally. All TPS metrics within acceptable ranges."
        elif overall_status == AndonStatus.YELLOW:
            warning_count = len([a for a in alerts if a.severity == "warning"])
            metrics = ", ".join(set(a.metric_name for a in alerts if a.severity == "warning"))
            return f"⚠️ {warning_count} warning(s) detected. Attention needed: {metrics}"
        else:  # RED
            critical_count = len([a for a in alerts if a.severity == "critical"])
            metrics = ", ".join(set(a.metric_name for a in alerts if a.severity == "critical"))
            return f"🚨 CRITICAL: {critical_count} metric(s) require immediate attention: {metrics}"

    def _alert_to_dict(self, alert: AndonAlert) -> Dict[str, Any]:
        """Convert AndonAlert to dictionary for JSON serialization"""
        return {
            "status": alert.status.value,
            "metric_name": alert.metric_name,
            "current_value": alert.current_value,
            "threshold": alert.threshold,
            "severity": alert.severity,
            "message": alert.message,
            "recommendation": alert.recommendation,
            "timestamp": alert.timestamp.isoformat()
        }
