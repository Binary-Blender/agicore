"""
A/B Testing Module - Compare outputs from multiple providers
Supports statistical analysis and automatic winner selection
Sprint 4.0 Days 4-6
"""

from typing import Dict, Any, List, Optional
from .base import BaseModule, ModuleDefinition
import uuid
import logging
from datetime import datetime

logger = logging.getLogger(__name__)


class ABTestingModule(BaseModule):
    """Module for comparing outputs from different providers"""

    def get_definition(self) -> ModuleDefinition:
        return ModuleDefinition(
            type="ab_testing",
            name="A/B Testing",
            description="Compare outputs from multiple providers for quality/cost/speed analysis",
            category="decision",
            inputs=["results"],
            outputs=["winner", "comparison_metrics"],
            config_schema={
                "type": "object",
                "properties": {
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
                        "max": 100
                    },
                    "confidence_level": {
                        "type": "number",
                        "label": "Confidence Level (%)",
                        "default": 95,
                        "min": 80,
                        "max": 99.9
                    },
                    "weight_quality": {
                        "type": "number",
                        "label": "Quality Weight (for auto_balanced)",
                        "default": 0.5,
                        "min": 0,
                        "max": 1
                    },
                    "weight_speed": {
                        "type": "number",
                        "label": "Speed Weight (for auto_balanced)",
                        "default": 0.3,
                        "min": 0,
                        "max": 1
                    },
                    "weight_cost": {
                        "type": "number",
                        "label": "Cost Weight (for auto_balanced)",
                        "default": 0.2,
                        "min": 0,
                        "max": 1
                    }
                },
                "required": ["test_type", "selection_method"]
            },
            icon="🔬"
        )

    async def execute(
        self,
        inputs: Dict[str, Any],
        execution_context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Execute A/B testing comparison - compares existing outputs from previous modules"""

        self._log_info(
            execution_context,
            "Starting A/B testing comparison",
            {"config": self.config, "input_keys": list(inputs.keys())}
        )
        logger.info(f"Starting A/B test with config: {self.config}")
        logger.info("A/B Testing: Comparing existing inputs from previous modules")

        # Collect outputs from different providers from inputs
        provider_outputs = self._collect_provider_outputs(inputs, execution_context)

        if len(provider_outputs) < 2:
            self._log_error(
                execution_context,
                "A/B testing requires outputs from at least two providers",
                {"provider_count": len(provider_outputs), "providers": list(provider_outputs.keys())}
            )
            raise ValueError(
                f"A/B testing requires outputs from at least 2 providers, got {len(provider_outputs)}"
            )

        # Create A/B test record
        test_id = f"abt_{uuid.uuid4().hex[:8]}"
        test_data = {
            "id": test_id,
            "execution_id": execution_context.get("execution_id"),
            "test_type": self.config.get("test_type", "side_by_side"),
            "providers_tested": list(provider_outputs.keys()),
            "provider_labels": {
                provider: self._get_provider_display_name(provider, provider_outputs)
                for provider in provider_outputs
            },
            "selection_method": self.config.get("selection_method", "manual"),
            "metrics": {},
            "created_at": datetime.utcnow().isoformat()
        }

        # Calculate metrics for each provider
        provider_metrics = await self._calculate_provider_metrics(provider_outputs)
        test_data["metrics"] = provider_metrics

        # Store in execution context for QC
        execution_context["ab_test_data"] = test_data
        self._log_info(
            execution_context,
            "Collected provider outputs for A/B testing",
            {
                "providers": list(provider_outputs.keys()),
                "provider_counts": {p: len(items) for p, items in provider_outputs.items()}
            }
        )

        # Manual selection - pause for human decision
        if self.config.get("selection_method") == "manual":
            # Check if we're resuming from QC (QC results already available)
            if execution_context.get("qc_results"):
                logger.info("QC results found, using them instead of pausing again")
                # Process QC results and determine winner
                winner = await self._process_qc_results(
                    execution_context["qc_results"],
                    provider_outputs,
                    provider_metrics,
                    execution_context
                )

                # Save test results
                await self._save_test_results(test_data, winner, execution_context)

                # Mark rejected assets
                if "rejected_asset_ids" in winner and winner["rejected_asset_ids"]:
                    logger.info(f"[AB-EXEC] Marking {len(winner['rejected_asset_ids'])} rejected assets")
                    for rejected_id in winner["rejected_asset_ids"]:
                        try:
                            await self._asset_repo.update_state(rejected_id, "rejected")
                            logger.info(f"[AB-EXEC] Marked asset {rejected_id} as rejected")
                        except Exception as e:
                            logger.error(f"[AB-EXEC] Failed to mark asset {rejected_id} as rejected: {e}")

                logger.info(f"A/B test complete (from QC). Winner: {winner['provider']}")
                self._log_info(
                    execution_context,
                    "A/B test completed via QC selection",
                    {"winner": winner["provider"], "reason": winner.get("reason")}
                )

                return {
                    "test_id": test_id,
                    "winner": winner["provider"],
                    "selected_outputs": winner["outputs"],
                    "images": winner["outputs"],  # For image output compatibility
                    "default": winner["outputs"],  # For generic workflow connections
                    "comparison_metrics": provider_metrics,
                    "confidence": "user_selected",
                    "reason": "Manual selection via QC"
                }

            logger.info("Manual selection requested, pausing for QC")
            self._log_info(
                execution_context,
                "Pausing workflow for manual QC selection",
                {
                    "test_id": test_id,
                    "providers": list(provider_outputs.keys()),
                    "items_for_review": sum(len(items) for items in provider_outputs.values())
                }
            )

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
        winner = await self._auto_select_winner(provider_outputs, provider_metrics, execution_context)

        # Save test results
        await self._save_test_results(test_data, winner, execution_context)

        logger.info(f"A/B test complete. Winner: {winner['provider']}")
        self._log_info(
            execution_context,
            "A/B test completed with automatic selection",
            {
                "winner": winner["provider"],
                "reason": winner.get("reason"),
                "confidence": winner.get("confidence")
            }
        )

        return {
            "test_id": test_id,
            "winner": winner["provider"],
            "selected_outputs": winner["outputs"],
            "images": winner["outputs"],  # For image output compatibility
            "default": winner["outputs"],  # For generic workflow connections
            "comparison_metrics": provider_metrics,
            "confidence": winner.get("confidence", "N/A"),
            "reason": winner.get("reason", "Automatic selection")
        }

    def _collect_provider_outputs(
        self,
        inputs: Dict[str, Any],
        execution_context: Dict[str, Any]
    ) -> Dict[str, List]:
        """Organize inputs by provider (variant-aware to support same provider twice)"""
        provider_outputs: Dict[str, List] = {}

        def add_output(item: Dict[str, Any], source_key: str = "unknown") -> None:
            if not isinstance(item, dict):
                return
            provider_key, display_name = self._determine_provider_variant(item, source_key)
            item["provider_display_name"] = display_name
            provider_outputs.setdefault(provider_key, []).append(item)

        for key, value in inputs.items():
            if isinstance(value, dict) and "results" in value:
                for result in value.get("results", []):
                    add_output(result, key)
            elif isinstance(value, dict):
                add_output(value, key)
            elif isinstance(value, list):
                for item in value:
                    add_output(item, key)

        logger.info(f"Collected outputs from providers: {list(provider_outputs.keys())}")
        logger.info(f"Provider output counts: {{{', '.join([f'{k}: {len(v)}' for k, v in provider_outputs.items()])}}}")
        self._log_info(
            execution_context,
            "Collected provider outputs",
            {p: len(items) for p, items in provider_outputs.items()}
        )
        return provider_outputs

    def _determine_provider_variant(
        self,
        item: Dict[str, Any],
        source_key: str = "unknown"
    ) -> (str, str):
        """Return a unique provider key and human label for an output item"""
        provider = item.get("provider") or item.get("provider_metadata", {}).get("provider")
        provider = provider or source_key or "unknown"

        metadata = item.get("metadata") or {}
        provider_metadata = item.get("provider_metadata") or {}
        module_id = (
            item.get("module_id")
            or metadata.get("module_id")
            or provider_metadata.get("module_id")
        )
        module_label = (
            item.get("module_label")
            or metadata.get("module_label")
            or provider_metadata.get("module_label")
        )

        if module_id:
            display_label = module_label or f"{provider} ({module_id[-4:]})"
            provider_key = f"{provider}:{module_id}"
        elif source_key and source_key != provider:
            display_label = module_label or f"{provider} [{source_key}]"
            provider_key = f"{provider}:{source_key}"
        else:
            display_label = module_label or provider
            provider_key = provider

        return provider_key, display_label

    def _get_provider_display_name(
        self,
        provider_key: str,
        provider_outputs: Dict[str, List]
    ) -> str:
        """Fetch human-friendly label for a provider key"""
        outputs = provider_outputs.get(provider_key, [])
        if outputs:
            return outputs[0].get("provider_display_name", provider_key)
        return provider_key

    async def _calculate_provider_metrics(
        self,
        provider_outputs: Dict[str, List]
    ) -> Dict[str, Dict]:
        """Calculate comprehensive metrics for each provider"""
        metrics = {}

        for provider, outputs in provider_outputs.items():
            # Basic counts
            count = len(outputs)
            provider_display = outputs[0].get("provider_display_name") if outputs else provider

            # Extract timing data
            generation_times = [
                o.get("provider_metadata", {}).get("generation_time", 0)
                for o in outputs
                if o.get("provider_metadata", {}).get("generation_time") is not None
            ]
            avg_time = sum(generation_times) / len(generation_times) if generation_times else 0

            # Calculate costs
            cost_per_item = self._get_provider_cost(self._get_base_provider(provider))
            total_cost = cost_per_item * count

            # Quality metrics (placeholder - would use ML model in production)
            quality_scores = [
                o.get("quality_metrics", {}).get("score", 85)  # Default score
                for o in outputs
            ]
            avg_quality = sum(quality_scores) / len(quality_scores) if quality_scores else 85

            metrics[provider] = {
                "count": count,
                "avg_generation_time": round(avg_time, 2),
                "total_generation_time": round(sum(generation_times), 2) if generation_times else 0,
                "cost_per_item": cost_per_item,
                "total_cost": round(total_cost, 4),
                "avg_quality_score": round(avg_quality, 1),
                "outputs": count,
                "display_name": provider_display
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
                display_name = output.get("provider_display_name", provider)
                comparison_items.append({
                    "asset_id": output.get("id"),  # CRITICAL: Include asset ID for frontend submission
                    "provider": display_name,
                    "provider_key": provider,
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
            for idx, item in enumerate(comparison_items):
                item["provider_hidden"] = item["provider"]
                item["provider"] = f"Option {chr(65 + idx)}"

        return comparison_items

    async def _process_qc_results(
        self,
        qc_results: Dict[str, Any],
        provider_outputs: Dict[str, List],
        provider_metrics: Dict[str, Dict],
        execution_context: Dict[str, Any]
    ) -> Dict:
        """Process QC results to determine winner from manual selection"""
        logger.info(f"[AB-QC] ========== A/B Testing Processing QC Results ==========")
        logger.info(f"[AB-QC] QC results received: {qc_results}")
        logger.info(f"[AB-QC] Provider outputs: {list(provider_outputs.keys())}")
        for provider, assets in provider_outputs.items():
            display_name = self._get_provider_display_name(provider, provider_outputs)
            logger.info(f"[AB-QC] Provider '{display_name}' ({provider}) has {len(assets)} assets:")
            for i, asset in enumerate(assets):
                logger.info(f"[AB-QC]   Asset {i+1}: id={asset.get('id')}, url={asset.get('url', '')[:100]}")
        self._log_info(
            execution_context,
            "Processing QC results for A/B testing",
            {
                "qc_result_count": len(qc_results),
                "providers": list(provider_outputs.keys())
            }
        )

        # QC results should contain decisions for each asset
        # Find which asset was selected (decision == "pass" or "select")
        selected_asset_id = None
        for asset_id, decision_data in qc_results.items():
            logger.info(f"[AB-QC] Checking asset_id={asset_id}, decision={decision_data.get('decision')}")
            if decision_data.get("decision") in ["pass", "select"]:
                selected_asset_id = asset_id
                logger.info(f"[AB-QC] ✓ SELECTED asset_id={selected_asset_id}")
                break

        if not selected_asset_id:
            logger.warning("[AB-QC] No asset was selected in QC, defaulting to first provider")
            self._log_warning(
                execution_context,
                "No QC selection recorded; defaulting to first provider",
                {"providers": list(provider_outputs.keys())}
            )
            winner_provider = list(provider_outputs.keys())[0]
            return {
                "provider": winner_provider,
                "outputs": provider_outputs[winner_provider],
                "confidence": "default",
                "reason": "No selection made, using default"
            }

        # Find which provider generated the selected asset and return ONLY that asset
        winner_provider = None
        selected_asset = None
        for provider, assets in provider_outputs.items():
            for asset in assets:
                if asset.get("id") == selected_asset_id:
                    winner_provider = provider
                    selected_asset = asset
                    logger.info(f"[AB-QC] Found matching asset in provider '{provider}'")
                    logger.info(f"[AB-QC] Selected asset details: {asset}")
                    break
            if winner_provider:
                break

        if not winner_provider or not selected_asset:
            logger.error(f"[AB-QC] ERROR: Could not find provider for selected asset {selected_asset_id}")
            self._log_error(
                execution_context,
                "Selected asset not found among provider outputs",
                {"selected_asset_id": selected_asset_id}
            )
            winner_provider = list(provider_outputs.keys())[0]
            # Return only the first asset instead of all
            return {
                "provider": winner_provider,
                "outputs": [provider_outputs[winner_provider][0]] if provider_outputs[winner_provider] else [],
                "confidence": "default",
                "reason": "Asset not found, using default"
            }

        logger.info(f"[AB-QC] Winner from QC: {winner_provider}")
        logger.info(f"[AB-QC] Returning ONLY asset ID: {selected_asset_id}")

        # Collect all asset IDs from all providers for rejection marking
        all_asset_ids = []
        for provider, assets in provider_outputs.items():
            for asset in assets:
                asset_id = asset.get("id")
                if asset_id:
                    all_asset_ids.append(asset_id)

        # Identify rejected assets (all except the selected one)
        rejected_asset_ids = [aid for aid in all_asset_ids if aid != selected_asset_id]
        logger.info(f"[AB-QC] Rejected asset IDs: {rejected_asset_ids}")

        result = {
            "provider": winner_provider,
            "outputs": [selected_asset_id],  # Only the selected asset ID!
            "confidence": "user_selected",
            "reason": "Manual selection via QC",
            "selected_asset_id": selected_asset_id,
            "rejected_asset_ids": rejected_asset_ids  # Track rejected assets
        }
        logger.info(f"[AB-QC] Final result to return: {result}")
        logger.info(f"[AB-QC] ========== A/B Testing QC Processing Complete ==========")
        self._log_info(
            execution_context,
            "QC selection completed",
            {
                "winner": winner_provider,
                "selected_asset_id": selected_asset_id,
                "rejected_count": len(rejected_asset_ids)
            }
        )
        return result

    async def _auto_select_winner(
        self,
        provider_outputs: Dict[str, List],
        provider_metrics: Dict[str, Dict],
        execution_context: Dict[str, Any]
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
                max_time = max(m["avg_generation_time"] for m in provider_metrics.values() if m["avg_generation_time"] > 0)
                speed_norm = 1 - (metrics["avg_generation_time"] / max_time) if max_time > 0 else 1

                # Cost: Invert and normalize (cheaper is better)
                max_cost = max(m["cost_per_item"] for m in provider_metrics.values() if m["cost_per_item"] > 0)
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

        # Calculate confidence
        confidence = self._calculate_simple_confidence(winner_provider, provider_metrics)

        log_details = {
            "selection_method": selection_method,
            "winner": winner_provider,
            "reason": reason,
            "confidence": confidence
        }
        if selection_method == "auto_balanced":
            log_details["scores"] = scores
        self._log_info(
            execution_context,
            "Auto-selected A/B test winner",
            log_details
        )

        return {
            "provider": winner_provider,
            "outputs": provider_outputs[winner_provider],
            "reason": reason,
            "confidence": confidence
        }

    def _calculate_simple_confidence(
        self,
        winner: str,
        metrics: Dict[str, Dict]
    ) -> Optional[float]:
        """Calculate simple confidence in winner selection"""

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
        avg_other = sum(other_scores) / len(other_scores)
        diff = winner_score - avg_other

        # Rough confidence calculation
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

    def _get_base_provider(self, provider_key: str) -> str:
        """Strip variant suffix from provider key"""
        if not provider_key:
            return "unknown"
        return provider_key.split(":", 1)[0]

    async def _save_test_results(
        self,
        test_data: Dict,
        winner: Dict,
        execution_context: Dict[str, Any]
    ) -> None:
        """Save A/B test results to database"""
        # Update test data with winner
        test_data["winner"] = winner["provider"]
        test_data["completed_at"] = datetime.utcnow().isoformat()

        # Store in execution context for engine to persist
        if "ab_test_results" not in execution_context:
            execution_context["ab_test_results"] = []
        execution_context["ab_test_results"].append(test_data)

        logger.info(f"Test results saved: {test_data['id']}")
        self._log_info(
            execution_context,
            "Persisted A/B test results",
            {
                "test_id": test_data["id"],
                "winner": test_data["winner"],
                "providers_tested": test_data.get("providers_tested", []),
                "selection_method": self.config.get("selection_method")
            }
        )
