"""
SPC (Statistical Process Control) Calculator
Sprint 7.0 - Advanced Analytics for TPS Workflows

Provides comprehensive SPC analytics:
- Control Charts (X-bar, P-charts) with UCL/LCL
- Western Electric Rules for out-of-control detection
- Process Capability (Cp, Cpk, Pp, Ppk)
- Pareto Analysis (80/20 defect prioritization)
- Trend Detection with linear regression
"""
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime, timedelta
from dataclasses import dataclass, asdict
from enum import Enum
import statistics
import math


class ControlChartType(str, Enum):
    """Types of control charts"""
    XBAR = "xbar"  # X-bar chart (average chart for continuous data)
    P = "p"  # P-chart (proportion chart for defect rates)
    C = "c"  # C-chart (count chart for defects)


class OutOfControlRule(str, Enum):
    """Western Electric Rules for detecting out-of-control conditions"""
    RULE_1 = "rule_1"  # Point beyond 3σ
    RULE_2 = "rule_2"  # 2 of 3 consecutive points beyond 2σ
    RULE_3 = "rule_3"  # 4 of 5 consecutive points beyond 1σ
    RULE_4 = "rule_4"  # 8 consecutive points on same side of center
    RULE_5 = "rule_5"  # 6 consecutive points trending up or down
    RULE_6 = "rule_6"  # 15 consecutive points within 1σ (unusually stable)
    RULE_7 = "rule_7"  # 14 consecutive points alternating up/down (oscillation)
    RULE_8 = "rule_8"  # 8 consecutive points beyond 1σ (both sides)


@dataclass
class ControlLimits:
    """Control chart limits"""
    center_line: float  # CL - Process average
    ucl: float  # Upper Control Limit (CL + 3σ)
    lcl: float  # Lower Control Limit (CL - 3σ)
    ucl_2sigma: float  # Warning limit (CL + 2σ)
    lcl_2sigma: float  # Warning limit (CL - 2σ)
    ucl_1sigma: float  # Zone C (CL + 1σ)
    lcl_1sigma: float  # Zone C (CL - 1σ)
    sigma: float  # Standard deviation


@dataclass
class OutOfControlViolation:
    """Detected out-of-control condition"""
    rule: OutOfControlRule
    index: int  # Data point index where violation detected
    severity: str  # "critical", "warning", "minor"
    message: str
    recommendation: str


@dataclass
class ProcessCapability:
    """Process capability indices"""
    cp: float  # Potential capability (ignores centering)
    cpk: float  # Actual capability (accounts for centering)
    pp: float  # Performance capability (long-term)
    ppk: float  # Performance capability (long-term, centered)
    sigma_level: float  # Six Sigma level (DPMO-based)
    interpretation: str


@dataclass
class ParetoItem:
    """Single item in Pareto analysis"""
    category: str
    count: int
    percentage: float
    cumulative_percentage: float


@dataclass
class TrendAnalysis:
    """Trend detection results"""
    has_trend: bool
    slope: float  # Positive = improving, Negative = degrading
    r_squared: float  # Goodness of fit (0-1)
    interpretation: str
    forecast_next: Optional[float] = None  # Predicted next value


class SPCCalculator:
    """
    Statistical Process Control Calculator

    NO competitor has this level of SPC analytics for AI workflows.
    This is our #1 technical differentiator.
    """

    def __init__(self):
        self.confidence_level = 0.997  # 3-sigma = 99.7% confidence

    # ===== CONTROL CHARTS =====

    def calculate_control_limits(
        self,
        data: List[float],
        chart_type: ControlChartType = ControlChartType.XBAR,
        sample_size: int = 1
    ) -> ControlLimits:
        """
        Calculate control chart limits

        Args:
            data: Historical process data
            chart_type: Type of control chart
            sample_size: Sample size for subgroup charts (default 1 for individuals)

        Returns:
            ControlLimits with UCL, LCL, center line, and sigma zones
        """
        if not data or len(data) < 2:
            raise ValueError("Need at least 2 data points for control limits")

        # Calculate center line (process average)
        center_line = statistics.mean(data)

        # Calculate standard deviation based on chart type
        if chart_type == ControlChartType.XBAR:
            # For X-bar chart, use moving range method for individuals
            if sample_size == 1:
                # Individual values - use moving range
                moving_ranges = [abs(data[i] - data[i-1]) for i in range(1, len(data))]
                avg_moving_range = statistics.mean(moving_ranges)
                # Convert to sigma using d2 constant (1.128 for n=2)
                sigma = avg_moving_range / 1.128
            else:
                # Subgroup data
                sigma = statistics.stdev(data)

        elif chart_type == ControlChartType.P:
            # P-chart for proportions (defect rate)
            # sigma = sqrt(p(1-p)/n)
            p = center_line
            sigma = math.sqrt(p * (1 - p) / sample_size) if sample_size > 0 else 0

        elif chart_type == ControlChartType.C:
            # C-chart for counts
            # sigma = sqrt(c)
            sigma = math.sqrt(center_line)

        else:
            sigma = statistics.stdev(data)

        # Calculate control limits
        ucl = center_line + (3 * sigma)
        lcl = max(0, center_line - (3 * sigma))  # Can't be negative

        # Calculate warning limits (2σ)
        ucl_2sigma = center_line + (2 * sigma)
        lcl_2sigma = max(0, center_line - (2 * sigma))

        # Calculate zone limits (1σ)
        ucl_1sigma = center_line + sigma
        lcl_1sigma = max(0, center_line - sigma)

        return ControlLimits(
            center_line=center_line,
            ucl=ucl,
            lcl=lcl,
            ucl_2sigma=ucl_2sigma,
            lcl_2sigma=lcl_2sigma,
            ucl_1sigma=ucl_1sigma,
            lcl_1sigma=lcl_1sigma,
            sigma=sigma
        )

    def detect_out_of_control(
        self,
        data: List[float],
        limits: ControlLimits
    ) -> List[OutOfControlViolation]:
        """
        Apply Western Electric Rules to detect out-of-control conditions

        Args:
            data: Process data points
            limits: Control limits

        Returns:
            List of violations found
        """
        violations = []

        if len(data) < 2:
            return violations

        # Rule 1: Any point beyond 3σ
        for i, value in enumerate(data):
            if value > limits.ucl or value < limits.lcl:
                violations.append(OutOfControlViolation(
                    rule=OutOfControlRule.RULE_1,
                    index=i,
                    severity="critical",
                    message=f"Point {i+1} exceeds 3σ control limits ({value:.2f})",
                    recommendation="Investigate special cause - this is an unusual event requiring immediate attention"
                ))

        # Rule 2: 2 of 3 consecutive points beyond 2σ (same side)
        if len(data) >= 3:
            for i in range(len(data) - 2):
                window = data[i:i+3]
                above_2sigma = sum(1 for v in window if v > limits.ucl_2sigma)
                below_2sigma = sum(1 for v in window if v < limits.lcl_2sigma)

                if above_2sigma >= 2:
                    violations.append(OutOfControlViolation(
                        rule=OutOfControlRule.RULE_2,
                        index=i+2,
                        severity="warning",
                        message=f"2 of 3 points exceed 2σ upper limit",
                        recommendation="Process trending upward - investigate potential systematic shift"
                    ))
                elif below_2sigma >= 2:
                    violations.append(OutOfControlViolation(
                        rule=OutOfControlRule.RULE_2,
                        index=i+2,
                        severity="warning",
                        message=f"2 of 3 points below 2σ lower limit",
                        recommendation="Process trending downward - investigate potential systematic shift"
                    ))

        # Rule 3: 4 of 5 consecutive points beyond 1σ (same side)
        if len(data) >= 5:
            for i in range(len(data) - 4):
                window = data[i:i+5]
                above_1sigma = sum(1 for v in window if v > limits.ucl_1sigma)
                below_1sigma = sum(1 for v in window if v < limits.lcl_1sigma)

                if above_1sigma >= 4:
                    violations.append(OutOfControlViolation(
                        rule=OutOfControlRule.RULE_3,
                        index=i+4,
                        severity="warning",
                        message=f"4 of 5 points exceed 1σ upper limit",
                        recommendation="Possible process shift upward - monitor closely"
                    ))
                elif below_1sigma >= 4:
                    violations.append(OutOfControlViolation(
                        rule=OutOfControlRule.RULE_3,
                        index=i+4,
                        severity="warning",
                        message=f"4 of 5 points below 1σ lower limit",
                        recommendation="Possible process shift downward - monitor closely"
                    ))

        # Rule 4: 8 consecutive points on same side of center line
        if len(data) >= 8:
            for i in range(len(data) - 7):
                window = data[i:i+8]
                all_above = all(v > limits.center_line for v in window)
                all_below = all(v < limits.center_line for v in window)

                if all_above or all_below:
                    violations.append(OutOfControlViolation(
                        rule=OutOfControlRule.RULE_4,
                        index=i+7,
                        severity="warning",
                        message=f"8 consecutive points on {'above' if all_above else 'below'} center line",
                        recommendation="Process mean has shifted - consider adjusting baseline"
                    ))

        # Rule 5: 6 consecutive points steadily increasing or decreasing
        if len(data) >= 6:
            for i in range(len(data) - 5):
                window = data[i:i+6]
                increasing = all(window[j] < window[j+1] for j in range(5))
                decreasing = all(window[j] > window[j+1] for j in range(5))

                if increasing:
                    violations.append(OutOfControlViolation(
                        rule=OutOfControlRule.RULE_5,
                        index=i+5,
                        severity="warning",
                        message=f"6 consecutive points steadily increasing",
                        recommendation="Strong upward trend detected - investigate root cause"
                    ))
                elif decreasing:
                    violations.append(OutOfControlViolation(
                        rule=OutOfControlRule.RULE_5,
                        index=i+5,
                        severity="warning",
                        message=f"6 consecutive points steadily decreasing",
                        recommendation="Strong downward trend detected - investigate root cause"
                    ))

        # Rule 6: 15 consecutive points within 1σ (unusually stable)
        if len(data) >= 15:
            for i in range(len(data) - 14):
                window = data[i:i+15]
                all_within = all(
                    limits.lcl_1sigma <= v <= limits.ucl_1sigma
                    for v in window
                )

                if all_within:
                    violations.append(OutOfControlViolation(
                        rule=OutOfControlRule.RULE_6,
                        index=i+14,
                        severity="minor",
                        message=f"15 consecutive points within 1σ - unusually stable",
                        recommendation="Process may be over-controlled or data collection issue"
                    ))

        # Rule 7: 14 consecutive points alternating up and down
        if len(data) >= 14:
            for i in range(len(data) - 13):
                window = data[i:i+14]
                alternating = all(
                    (window[j] < window[j+1] and window[j+1] > window[j+2]) or
                    (window[j] > window[j+1] and window[j+1] < window[j+2])
                    for j in range(12)
                )

                if alternating:
                    violations.append(OutOfControlViolation(
                        rule=OutOfControlRule.RULE_7,
                        index=i+13,
                        severity="minor",
                        message=f"14 consecutive points oscillating",
                        recommendation="Check for systematic alternating patterns in process"
                    ))

        # Rule 8: 8 consecutive points beyond 1σ (both sides)
        if len(data) >= 8:
            for i in range(len(data) - 7):
                window = data[i:i+8]
                beyond_1sigma = sum(
                    1 for v in window
                    if v > limits.ucl_1sigma or v < limits.lcl_1sigma
                )

                if beyond_1sigma >= 8:
                    violations.append(OutOfControlViolation(
                        rule=OutOfControlRule.RULE_8,
                        index=i+7,
                        severity="warning",
                        message=f"8 consecutive points beyond 1σ limits",
                        recommendation="Process variability has increased - investigate causes"
                    ))

        return violations

    # ===== PROCESS CAPABILITY =====

    def calculate_process_capability(
        self,
        data: List[float],
        lower_spec_limit: float,
        upper_spec_limit: float,
        target: Optional[float] = None
    ) -> ProcessCapability:
        """
        Calculate process capability indices

        Args:
            data: Process data
            lower_spec_limit: LSL - Lower specification limit
            upper_spec_limit: USL - Upper specification limit
            target: Target value (defaults to midpoint)

        Returns:
            ProcessCapability with Cp, Cpk, Pp, Ppk, sigma level
        """
        if len(data) < 2:
            raise ValueError("Need at least 2 data points for capability analysis")

        if target is None:
            target = (upper_spec_limit + lower_spec_limit) / 2

        # Calculate process statistics
        mean = statistics.mean(data)
        stdev = statistics.stdev(data)

        # Cp - Potential capability (assumes process centered at target)
        # Cp = (USL - LSL) / (6σ)
        cp = (upper_spec_limit - lower_spec_limit) / (6 * stdev)

        # Cpk - Actual capability (accounts for process centering)
        # Cpk = min[(USL - mean)/(3σ), (mean - LSL)/(3σ)]
        cpu = (upper_spec_limit - mean) / (3 * stdev)
        cpl = (mean - lower_spec_limit) / (3 * stdev)
        cpk = min(cpu, cpl)

        # Pp and Ppk (performance capability - same formulas, but using overall sigma)
        # For our purposes, Pp ≈ Cp and Ppk ≈ Cpk
        pp = cp
        ppk = cpk

        # Calculate sigma level from Cpk
        # Sigma level = Cpk * 3
        sigma_level = cpk * 3

        # Interpretation
        if cpk >= 2.0:
            interpretation = "World-class (6σ capable)"
        elif cpk >= 1.67:
            interpretation = "Excellent (5σ capable)"
        elif cpk >= 1.33:
            interpretation = "Good (4σ capable)"
        elif cpk >= 1.0:
            interpretation = "Adequate (3σ capable)"
        elif cpk >= 0.67:
            interpretation = "Poor - improvement needed"
        else:
            interpretation = "Critical - immediate action required"

        return ProcessCapability(
            cp=cp,
            cpk=cpk,
            pp=pp,
            ppk=ppk,
            sigma_level=sigma_level,
            interpretation=interpretation
        )

    # ===== PARETO ANALYSIS =====

    def calculate_pareto_data(
        self,
        defect_counts: Dict[str, int]
    ) -> List[ParetoItem]:
        """
        Calculate Pareto analysis (80/20 rule) for defect prioritization

        Args:
            defect_counts: Dictionary of defect category -> count

        Returns:
            List of ParetoItems sorted by count (descending)
        """
        if not defect_counts:
            return []

        # Sort by count descending
        sorted_items = sorted(
            defect_counts.items(),
            key=lambda x: x[1],
            reverse=True
        )

        total = sum(defect_counts.values())
        cumulative = 0
        pareto_items = []

        for category, count in sorted_items:
            percentage = (count / total) * 100 if total > 0 else 0
            cumulative += percentage

            pareto_items.append(ParetoItem(
                category=category,
                count=count,
                percentage=percentage,
                cumulative_percentage=cumulative
            ))

        return pareto_items

    # ===== TREND DETECTION =====

    def detect_trends(
        self,
        data: List[float],
        timestamps: Optional[List[datetime]] = None
    ) -> TrendAnalysis:
        """
        Detect trends using linear regression

        Args:
            data: Process data points
            timestamps: Optional timestamps (for time-based analysis)

        Returns:
            TrendAnalysis with slope, R², and forecast
        """
        if len(data) < 3:
            return TrendAnalysis(
                has_trend=False,
                slope=0.0,
                r_squared=0.0,
                interpretation="Insufficient data for trend analysis"
            )

        # Use simple indices as x-values if no timestamps provided
        x_values = list(range(len(data)))
        y_values = data

        # Calculate linear regression
        n = len(data)
        sum_x = sum(x_values)
        sum_y = sum(y_values)
        sum_xy = sum(x * y for x, y in zip(x_values, y_values))
        sum_x2 = sum(x * x for x in x_values)
        sum_y2 = sum(y * y for y in y_values)

        # Slope (b) and intercept (a)
        # b = (n*Σxy - Σx*Σy) / (n*Σx² - (Σx)²)
        denominator = (n * sum_x2 - sum_x * sum_x)
        if denominator == 0:
            slope = 0
        else:
            slope = (n * sum_xy - sum_x * sum_y) / denominator

        # a = (Σy - b*Σx) / n
        intercept = (sum_y - slope * sum_x) / n

        # R-squared (coefficient of determination)
        # R² = 1 - (SSres / SStot)
        mean_y = sum_y / n
        ss_tot = sum((y - mean_y) ** 2 for y in y_values)
        ss_res = sum((y - (slope * x + intercept)) ** 2 for x, y in zip(x_values, y_values))

        r_squared = 1 - (ss_res / ss_tot) if ss_tot != 0 else 0

        # Determine if trend is significant
        # R² > 0.7 indicates strong correlation
        has_trend = r_squared > 0.7 and abs(slope) > 0.01

        # Forecast next value
        next_x = len(data)
        forecast_next = slope * next_x + intercept

        # Interpretation
        if not has_trend:
            interpretation = "No significant trend detected"
        elif slope > 0:
            interpretation = f"Strong upward trend (R²={r_squared:.2f}) - process improving"
        else:
            interpretation = f"Strong downward trend (R²={r_squared:.2f}) - process degrading"

        return TrendAnalysis(
            has_trend=has_trend,
            slope=slope,
            r_squared=r_squared,
            interpretation=interpretation,
            forecast_next=forecast_next if has_trend else None
        )

    # ===== HELPER METHODS =====

    def to_dict(self, obj) -> Dict[str, Any]:
        """Convert dataclass to dictionary for JSON serialization"""
        if isinstance(obj, (ControlLimits, OutOfControlViolation, ProcessCapability, ParetoItem, TrendAnalysis)):
            result = asdict(obj)
            # Convert enums to strings
            for key, value in result.items():
                if isinstance(value, Enum):
                    result[key] = value.value
            return result
        return obj


# Singleton instance
_spc_calculator_instance = None

def get_spc_calculator() -> SPCCalculator:
    """Get or create singleton SPCCalculator instance"""
    global _spc_calculator_instance
    if _spc_calculator_instance is None:
        _spc_calculator_instance = SPCCalculator()
    return _spc_calculator_instance
