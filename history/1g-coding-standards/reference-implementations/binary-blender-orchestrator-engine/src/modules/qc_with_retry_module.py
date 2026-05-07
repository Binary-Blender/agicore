"""
QC with Retry Module - Quality control with automatic retry on failure
"""
import os
import asyncio
import logging
from typing import Dict, Any, Optional, List
import httpx

from src.modules.base import BaseModule

logger = logging.getLogger(__name__)


class QCWithRetryModule(BaseModule):
    """Quality control with retry logic for failed images"""

    async def execute(self, inputs: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        """
        Perform quality control on assets with retry capability

        Args:
            inputs: {
                "asset_ids": list - Asset IDs to review
            }
            context: {
                "execution_id": str,
                "tenant_id": str,
                "parameters": dict
            }

        Returns:
            {
                "asset_ids": list - Approved asset IDs
                "qc_task_id": str - Created QC task ID
                "status": str - "pending", "approved", or "retry_needed"
            }
        """
        asset_ids = inputs.get('asset_ids', [])
        if not asset_ids:
            logger.warning(f"QC module {self.module_id}: No assets to review")
            return {
                "asset_ids": [],
                "status": "no_assets"
            }

        # Configuration
        max_retries = self.config.get('max_retries', 3)
        retry_module_id = self.config.get('retry_module_id')  # ID of module to retry with
        auto_approve = self.config.get('auto_approve', False)  # Skip human review
        wait_for_review = self.config.get('wait_for_review', False)  # Block until human reviews
        timeout_seconds = self.config.get('timeout_seconds', 300)  # 5 minute default

        logger.info(f"QC module {self.module_id}: Reviewing {len(asset_ids)} assets (max_retries={max_retries})")

        # Get API key
        auth_api_key = context.get('api_key') or os.getenv('API_KEY', 'dev-api-key')
        tenant_id = context['tenant_id']

        if auto_approve:
            # Auto-approve all assets without human review
            logger.info(f"QC module {self.module_id}: Auto-approving {len(asset_ids)} assets")
            await self._update_assets_state(asset_ids, "approved", tenant_id, auth_api_key)
            return {
                "asset_ids": asset_ids,
                "status": "approved",
                "auto_approved": True
            }

        # Create QC task in Assets Service
        qc_task = await self._create_qc_task(
            asset_ids=asset_ids,
            execution_id=context['execution_id'],
            module_id=self.module_id,
            tenant_id=tenant_id,
            api_key=auth_api_key
        )

        if not qc_task:
            raise Exception("Failed to create QC task")

        qc_task_id = qc_task.get('id')
        logger.info(f"QC task created: {qc_task_id}")

        # If configured to wait for review, poll for completion
        if wait_for_review:
            logger.info(f"QC module {self.module_id}: Waiting for human review (timeout={timeout_seconds}s)")
            approved = await self._wait_for_qc_result(
                qc_task_id=qc_task_id,
                tenant_id=tenant_id,
                api_key=auth_api_key,
                timeout=timeout_seconds
            )

            if approved:
                return {
                    "asset_ids": asset_ids,
                    "qc_task_id": qc_task_id,
                    "status": "approved"
                }
            else:
                # QC failed - implement retry logic if configured
                if retry_module_id:
                    logger.warning(f"QC failed, retry_module configured but not yet implemented in MVP")
                    # TODO: In future sprint, trigger retry of generation module

                return {
                    "asset_ids": asset_ids,
                    "qc_task_id": qc_task_id,
                    "status": "failed",
                    "retry_needed": bool(retry_module_id)
                }
        else:
            # Don't wait - return immediately with pending status
            logger.info(f"QC module {self.module_id}: QC task created, not waiting for review")
            return {
                "asset_ids": asset_ids,
                "qc_task_id": qc_task_id,
                "status": "pending"
            }

    async def _create_qc_task(
        self,
        asset_ids: List[str],
        execution_id: str,
        module_id: str,
        tenant_id: str,
        api_key: str
    ) -> Optional[Dict[str, Any]]:
        """Create a QC task in Assets Service"""
        qc_task_data = {
            "execution_id": execution_id,
            "module_id": module_id,
            "asset_ids": asset_ids,
            "status": "pending",
            "criteria": {
                "quality": "Is the image high quality and clear?",
                "relevance": "Does the image match the prompt?",
                "appropriateness": "Is the image appropriate for use?"
            }
        }

        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    f"{self.assets_service_url}/qc/tasks",
                    json=qc_task_data,
                    headers={"Authorization": f"Bearer {api_key}"},
                    timeout=httpx.Timeout(30.0)
                )

                if response.status_code in [200, 201]:
                    return response.json()
                else:
                    logger.error(f"Failed to create QC task: {response.status_code} - {response.text}")
                    return None

            except Exception as e:
                logger.error(f"Error creating QC task: {e}")
                return None

    async def _wait_for_qc_result(
        self,
        qc_task_id: str,
        tenant_id: str,
        api_key: str,
        timeout: int
    ) -> bool:
        """
        Wait for QC task completion with timeout

        Returns:
            bool: True if approved, False if failed or timeout
        """
        start_time = asyncio.get_event_loop().time()
        poll_interval = 5  # Check every 5 seconds

        while (asyncio.get_event_loop().time() - start_time) < timeout:
            async with httpx.AsyncClient() as client:
                try:
                    response = await client.get(
                        f"{self.assets_service_url}/qc/tasks/{qc_task_id}",
                        headers={"Authorization": f"Bearer {api_key}"},
                        timeout=httpx.Timeout(30.0)
                    )

                    if response.status_code == 200:
                        task = response.json()
                        status = task.get('status')

                        if status == 'completed':
                            # Check if it was approved
                            decisions = task.get('decisions', [])
                            if decisions:
                                # All must be approved
                                all_approved = all(d.get('passed', False) for d in decisions)
                                return all_approved
                            # No decisions yet means still pending
                            logger.info(f"QC task {qc_task_id} completed but no decisions yet")
                            return False

                except Exception as e:
                    logger.error(f"Error checking QC task status: {e}")

            await asyncio.sleep(poll_interval)

        # Timeout - auto-fail for safety
        logger.warning(f"QC task {qc_task_id} timed out after {timeout}s")
        return False

    async def _update_assets_state(
        self,
        asset_ids: List[str],
        state: str,
        tenant_id: str,
        api_key: str
    ):
        """Update state for multiple assets"""
        async with httpx.AsyncClient() as client:
            for asset_id in asset_ids:
                try:
                    response = await client.put(
                        f"{self.assets_service_url}/assets/{asset_id}/state",
                        json={"state": state},
                        headers={"Authorization": f"Bearer {api_key}"},
                        timeout=httpx.Timeout(30.0)
                    )

                    if response.status_code != 200:
                        logger.warning(f"Failed to update asset {asset_id} state: {response.status_code}")

                except Exception as e:
                    logger.error(f"Error updating asset {asset_id} state: {e}")
