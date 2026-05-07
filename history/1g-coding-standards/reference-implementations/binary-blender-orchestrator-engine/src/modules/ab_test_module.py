"""
A/B Testing Module - Compare and score images from different providers
"""
import os
import logging
from typing import Dict, Any, Optional, List
import httpx

from src.modules.base import BaseModule

logger = logging.getLogger(__name__)


class ABTestModule(BaseModule):
    """A/B testing with real image comparison and scoring"""

    async def execute(self, inputs: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        """
        Compare assets from different sources and determine winner

        Args:
            inputs: {
                "asset_ids_a": list - First set of asset IDs (e.g., from Akool)
                "asset_ids_b": list - Second set of asset IDs (e.g., from DALL-E)
                # OR
                "asset_ids": list - All asset IDs to compare
            }
            context: {
                "execution_id": str,
                "tenant_id": str,
                "parameters": dict
            }

        Returns:
            {
                "winner_asset_ids": list - IDs of winning assets
                "result_asset_id": str - ID of the comparison result asset
                "scores": dict - Scores for each provider
                "confidence": float - Confidence in the winner selection
            }
        """
        # Get API key
        auth_api_key = context.get('api_key') or os.getenv('API_KEY', 'dev-api-key')
        tenant_id = context['tenant_id']

        # Get assets to compare
        asset_ids_a = inputs.get('asset_ids_a', [])
        asset_ids_b = inputs.get('asset_ids_b', [])

        # If not split, try to get all assets and split them
        if not asset_ids_a and not asset_ids_b:
            all_asset_ids = inputs.get('asset_ids', [])
            if all_asset_ids:
                # Split in half
                mid = len(all_asset_ids) // 2
                asset_ids_a = all_asset_ids[:mid]
                asset_ids_b = all_asset_ids[mid:]

        if not asset_ids_a or not asset_ids_b:
            logger.warning(f"A/B test module {self.module_id}: Insufficient assets for comparison")
            return {
                "winner_asset_ids": asset_ids_a or asset_ids_b,
                "status": "insufficient_data",
                "scores": {}
            }

        logger.info(f"A/B test module {self.module_id}: Comparing {len(asset_ids_a)} vs {len(asset_ids_b)} assets")

        # Fetch assets from Assets Service
        assets_a = await self.fetch_assets(asset_ids_a, tenant_id, auth_api_key)
        assets_b = await self.fetch_assets(asset_ids_b, tenant_id, auth_api_key)

        if not assets_a or not assets_b:
            logger.error("Failed to fetch assets for comparison")
            return {
                "winner_asset_ids": asset_ids_a if assets_a else asset_ids_b,
                "status": "fetch_failed",
                "scores": {}
            }

        # Score each set of assets
        score_a = await self._score_asset_set(assets_a)
        score_b = await self._score_asset_set(assets_b)

        # Determine winner
        winner_asset_ids = asset_ids_a if score_a > score_b else asset_ids_b
        winner_provider = assets_a[0]['metadata'].get('provider', 'unknown') if score_a > score_b else assets_b[0]['metadata'].get('provider', 'unknown')
        confidence = abs(score_a - score_b)

        logger.info(f"A/B test results: A={score_a:.3f}, B={score_b:.3f}, Winner={winner_provider}, Confidence={confidence:.3f}")

        # Store detailed comparison result as an asset
        result_data = {
            "type": "ab_test_result",
            "execution_id": context['execution_id'],
            "metadata": {
                "comparison_type": "ab_test",
                "set_a": {
                    "asset_ids": asset_ids_a,
                    "provider": assets_a[0]['metadata'].get('provider', 'unknown'),
                    "score": score_a,
                    "count": len(assets_a),
                    "metrics": await self._get_asset_set_metrics(assets_a)
                },
                "set_b": {
                    "asset_ids": asset_ids_b,
                    "provider": assets_b[0]['metadata'].get('provider', 'unknown'),
                    "score": score_b,
                    "count": len(assets_b),
                    "metrics": await self._get_asset_set_metrics(assets_b)
                },
                "winner": {
                    "asset_ids": winner_asset_ids,
                    "provider": winner_provider,
                    "confidence": confidence
                },
                "scoring_method": self.config.get('scoring_method', 'metadata_based')
            }
        }

        # Create result asset
        result_asset = await self.create_asset(
            asset_data=result_data,
            tenant_id=tenant_id,
            api_key=auth_api_key
        )

        result_asset_id = result_asset.get('id') if result_asset else None

        return {
            "winner_asset_ids": winner_asset_ids,
            "result_asset_id": result_asset_id,
            "scores": {
                "a": score_a,
                "b": score_b
            },
            "providers": {
                "a": assets_a[0]['metadata'].get('provider', 'unknown'),
                "b": assets_b[0]['metadata'].get('provider', 'unknown')
            },
            "winner_provider": winner_provider,
            "confidence": confidence
        }

    async def _score_asset_set(self, assets: List[Dict]) -> float:
        """
        Score a set of assets

        In Sprint 0, this uses simple metadata-based scoring.
        Future sprints can add:
        - ML-based aesthetic scoring
        - Image quality analysis APIs
        - User feedback
        - Performance metrics
        """
        if not assets:
            return 0.0

        total_score = 0.0
        count = len(assets)

        for asset in assets:
            score = await self._score_single_asset(asset)
            total_score += score

        avg_score = total_score / count
        return avg_score

    async def _score_single_asset(self, asset: Dict) -> float:
        """
        Score a single asset based on available criteria

        Returns a score between 0.0 and 1.0
        """
        score = 0.5  # Base score

        metadata = asset.get('metadata', {})
        provider = metadata.get('provider', '').lower()

        # Provider-based scoring (can be customized)
        if provider == 'dalle3':
            score += 0.15  # DALL-E 3 tends to follow prompts well
        elif provider == 'akool':
            score += 0.10  # Akool good for realistic images

        # Quality-based scoring
        quality = metadata.get('quality', 'standard')
        if quality == 'hd' or quality == 'high':
            score += 0.10

        # Size-based scoring (larger can be better)
        size = metadata.get('size', '')
        width = metadata.get('width', 1024)
        height = metadata.get('height', 1024)

        if isinstance(width, int) and isinstance(height, int):
            if width >= 1792 or height >= 1792:
                score += 0.05
        elif 'x' in str(size):
            try:
                w, h = map(int, str(size).split('x'))
                if w >= 1792 or h >= 1792:
                    score += 0.05
            except:
                pass

        # Style-based scoring
        style = metadata.get('style', '')
        if style in ['vivid', 'realistic', 'photorealistic']:
            score += 0.05

        # Has revised prompt (indicates AI safety/improvement applied)
        if metadata.get('revised_prompt'):
            score += 0.05

        # Normalize to 0-1 range
        score = min(1.0, max(0.0, score))

        return score

    async def _get_asset_set_metrics(self, assets: List[Dict]) -> Dict[str, Any]:
        """Get aggregate metrics for a set of assets"""
        if not assets:
            return {}

        providers = [a.get('metadata', {}).get('provider') for a in assets]
        qualities = [a.get('metadata', {}).get('quality') for a in assets]
        styles = [a.get('metadata', {}).get('style') for a in assets]

        return {
            "count": len(assets),
            "providers": list(set(providers)),
            "qualities": list(set(filter(None, qualities))),
            "styles": list(set(filter(None, styles))),
            "avg_prompt_length": sum(
                len(a.get('metadata', {}).get('prompt', ''))
                for a in assets
            ) / len(assets) if assets else 0
        }
