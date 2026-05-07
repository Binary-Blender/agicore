"""
Statistical analysis utilities for A/B testing
Simplified version for Sprint 4.0 Days 4-6
"""

from typing import List, Tuple, Dict, Any, Optional
import logging
import math

logger = logging.getLogger(__name__)


class ABTestStatistics:
    """Statistical methods for A/B testing"""

    @staticmethod
    def calculate_mean(data: List[float]) -> float:
        """Calculate mean of data"""
        if not data:
            return 0.0
        return sum(data) / len(data)

    @staticmethod
    def calculate_std_dev(data: List[float]) -> float:
        """Calculate standard deviation"""
        if not data or len(data) < 2:
            return 0.0

        mean = ABTestStatistics.calculate_mean(data)
        variance = sum((x - mean) ** 2 for x in data) / (len(data) - 1)
        return math.sqrt(variance)

    @staticmethod
    def calculate_significance(
        control: List[float],
        treatment: List[float],
        alpha: float = 0.05
    ) -> Tuple[float, bool]:
        """
        Calculate statistical significance using simplified t-test

        Args:
            control: Control group measurements
            treatment: Treatment group measurements
            alpha: Significance level (default 0.05)

        Returns:
            Tuple of (p_value, is_significant)
        """
        if len(control) < 2 or len(treatment) < 2:
            return 1.0, False

        # Calculate means
        mean_control = ABTestStatistics.calculate_mean(control)
        mean_treatment = ABTestStatistics.calculate_mean(treatment)

        # Calculate standard deviations
        std_control = ABTestStatistics.calculate_std_dev(control)
        std_treatment = ABTestStatistics.calculate_std_dev(treatment)

        # Calculate pooled standard error
        n1 = len(control)
        n2 = len(treatment)

        se = math.sqrt((std_control ** 2 / n1) + (std_treatment ** 2 / n2))

        if se == 0:
            return 1.0, False

        # Calculate t-statistic
        t_stat = abs(mean_treatment - mean_control) / se

        # Simplified p-value estimation
        # For proper stats, would use scipy.stats.t.cdf
        # This is a rough approximation
        df = n1 + n2 - 2

        # Rough p-value based on t-statistic and degrees of freedom
        if t_stat > 2.576:  # 99% confidence
            p_value = 0.01
        elif t_stat > 1.96:  # 95% confidence
            p_value = 0.05
        elif t_stat > 1.645:  # 90% confidence
            p_value = 0.10
        else:
            p_value = 0.5

        is_significant = p_value < alpha

        logger.debug(f"T-test: t={t_stat:.3f}, p≈{p_value:.3f}, significant={is_significant}")

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

        mean_a = ABTestStatistics.calculate_mean(group_a)
        mean_b = ABTestStatistics.calculate_mean(group_b)

        # Pooled standard deviation
        std_a = ABTestStatistics.calculate_std_dev(group_a)
        std_b = ABTestStatistics.calculate_std_dev(group_b)
        n_a = len(group_a)
        n_b = len(group_b)

        pooled_std = math.sqrt(
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

        mean = ABTestStatistics.calculate_mean(data)
        std_dev = ABTestStatistics.calculate_std_dev(data)
        n = len(data)

        # Standard error of the mean
        se = std_dev / math.sqrt(n)

        # Z-score for confidence level (approximation)
        if confidence >= 0.99:
            z = 2.576
        elif confidence >= 0.95:
            z = 1.96
        elif confidence >= 0.90:
            z = 1.645
        else:
            z = 1.96  # default to 95%

        margin = z * se

        return mean - margin, mean + margin

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
        # Simplified calculation
        # For proper stats, would use statsmodels.stats.power

        # Z-scores
        z_alpha = 1.96 if alpha == 0.05 else 2.576
        z_beta = 0.84 if power == 0.8 else 1.28

        # Sample size formula
        n = 2 * ((z_alpha + z_beta) / effect_size) ** 2

        return int(math.ceil(n))

    @staticmethod
    def compare_multiple_groups(
        groups: Dict[str, List[float]],
        method: str = "anova"
    ) -> Dict[str, Any]:
        """
        Compare multiple groups (3+ providers)
        Simplified version without scipy

        Args:
            groups: Dictionary of provider -> measurements
            method: 'anova' or 'kruskal' (simplified implementation)

        Returns:
            Test results including significance
        """
        if len(groups) < 2:
            return {"error": "Need at least 2 groups"}

        # Simplified comparison based on means and variances
        group_means = {
            name: ABTestStatistics.calculate_mean(values)
            for name, values in groups.items()
        }

        # Overall mean
        all_values = [v for values in groups.values() for v in values]
        overall_mean = ABTestStatistics.calculate_mean(all_values)

        # Between-group variance (simplified)
        between_var = sum(
            len(values) * (group_means[name] - overall_mean) ** 2
            for name, values in groups.items()
        ) / (len(groups) - 1)

        # Within-group variance (simplified)
        within_var = sum(
            sum((v - group_means[name]) ** 2 for v in values)
            for name, values in groups.items()
        ) / (len(all_values) - len(groups))

        # F-statistic approximation
        f_stat = between_var / within_var if within_var > 0 else 0

        # Simplified significance check
        significant = f_stat > 3.0  # Rough threshold
        p_value = 0.05 if f_stat > 3.0 else 0.5

        result = {
            "method": "Simplified ANOVA",
            "f_statistic": f_stat,
            "p_value": p_value,
            "significant": significant,
            "group_means": group_means
        }

        # Pairwise comparisons if significant
        if significant and len(groups) > 2:
            result["pairwise"] = {}
            providers = list(groups.keys())

            for i in range(len(providers)):
                for j in range(i+1, len(providers)):
                    p1, p2 = providers[i], providers[j]
                    _, is_sig = ABTestStatistics.calculate_significance(
                        groups[p1],
                        groups[p2]
                    )
                    result["pairwise"][f"{p1}_vs_{p2}"] = {
                        "significant": is_sig
                    }

        return result

    @staticmethod
    def interpret_effect_size(effect_size: float) -> str:
        """Interpret Cohen's d effect size"""
        abs_es = abs(effect_size)
        if abs_es < 0.2:
            return "negligible"
        elif abs_es < 0.5:
            return "small"
        elif abs_es < 0.8:
            return "medium"
        else:
            return "large"

    @staticmethod
    def recommend_sample_size(
        current_n: int,
        observed_effect: float,
        target_power: float = 0.8
    ) -> Dict[str, Any]:
        """Recommend sample size based on observed effect"""
        required_n = ABTestStatistics.calculate_sample_size(
            effect_size=observed_effect,
            power=target_power
        )

        return {
            "current_sample_size": current_n,
            "required_sample_size": required_n,
            "additional_samples_needed": max(0, required_n - current_n),
            "is_sufficient": current_n >= required_n,
            "observed_effect_size": observed_effect,
            "effect_interpretation": ABTestStatistics.interpret_effect_size(observed_effect)
        }
