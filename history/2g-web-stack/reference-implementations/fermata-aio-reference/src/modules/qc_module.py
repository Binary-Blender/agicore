"""Quality Control module for human review"""
from typing import Dict, Any, List
from datetime import datetime
from .base import BaseModule, ModuleDefinition
from ..models.workflow import QCTask, QCTaskState, AssetState
import logging

logger = logging.getLogger(__name__)


class QCModule(BaseModule):
    """Module that pauses workflow for human quality control review"""

    def get_definition(self) -> ModuleDefinition:
        return ModuleDefinition(
            type="qc_review",
            name="QC Review",
            description="Human review pass/fail for assets",
            category="action",
            inputs=["images"],
            outputs=["approved_images"],
            config_schema={
                "type": "object",
                "properties": {
                    "review_mode": {
                        "type": "string",
                        "enum": ["individual", "batch"],
                        "default": "individual",
                        "description": "Review images individually or as a batch"
                    },
                    "auto_reject_threshold": {
                        "type": "number",
                        "minimum": 0,
                        "maximum": 1,
                        "description": "Auto-reject if confidence below this threshold",
                        "default": 0
                    },
                    "max_retries": {
                        "type": "integer",
                        "minimum": 1,
                        "maximum": 10,
                        "description": "Maximum number of times to re-run a previous step when QC fails",
                        "default": 1
                    },
                    "failAction": {
                        "type": "string",
                        "enum": ["retry", "end"],
                        "description": "Whether QC failure should trigger a retry or end the workflow",
                        "default": "retry"
                    },
                    "retryStep": {
                        "type": "integer",
                        "minimum": 1,
                        "description": "Step number to restart when QC fails",
                        "default": 1
                    }
                }
            },
            icon="✅"
        )

    async def execute(self, inputs: Dict[str, Any], execution_context: Dict[str, Any]) -> Dict[str, Any]:
        """Execute QC module - creates QC task and pauses workflow"""
        images = inputs.get("images", [])

        if not images:
            self._log_warning(
                execution_context,
                "QC module received no images",
                {"input_keys": list(inputs.keys())}
            )
            logger.warning("No images provided to QC module")
            return {"approved_images": []}

        # Check if we're resuming from a pause
        qc_task_id = execution_context.get("current_qc_task_id")

        if qc_task_id:
            # We're resuming - check QC results
            qc_results = execution_context.get("qc_results", {})
            self._log_info(
                execution_context,
                "Resuming QC module with existing results",
                {"qc_task_id": qc_task_id, "result_count": len(qc_results)}
            )
            return await self._process_qc_results(images, qc_results, execution_context)

        else:
            # Create new QC task
            qc_task = QCTask(
                workflow_execution_id=execution_context.get("execution_id", ""),
                module_id=self.module_id,
                assets=[img for img in images]  # Store image data
            )

            # Store QC task in execution context
            execution_context["current_qc_task_id"] = qc_task.id
            execution_context["qc_tasks"] = execution_context.get("qc_tasks", [])
            execution_context["qc_tasks"].append(qc_task.__dict__)

            # Add to global QC queue (in real system, this would be persisted)
            if "qc_queue" not in execution_context.get("global_context", {}):
                execution_context.setdefault("global_context", {})["qc_queue"] = []

            # Convert task to dict and ensure it has "images" field for workflow engine
            task_dict = qc_task.__dict__
            task_dict["images"] = task_dict.get("assets", [])  # Ensure "images" field exists
            execution_context["global_context"]["qc_queue"].append(task_dict)

            logger.info(f"Created QC task {qc_task.id} with {len(images)} images")

            # Set QC data for workflow engine to persist
            execution_context["qc_data"] = {
                "task_type": "pass_fail",
                "images": images
            }

            # Signal workflow engine to pause
            execution_context["should_pause"] = True
            execution_context["pause_reason"] = "awaiting_qc"
            self._log_info(
                execution_context,
                "Created QC task and pausing workflow",
                {"qc_task_id": qc_task.id, "image_count": len(images)}
            )

            # Return empty results for now - will be filled on resume
            return {"approved_images": []}

    async def _process_qc_results(self, images: List[Dict[str, Any]],
                                 qc_results: Dict[str, Any],
                                 execution_context: Dict[str, Any]) -> Dict[str, Any]:
        """Process QC results after resume"""
        approved_image_ids = []
        rejected_image_ids = []

        # Process each image's QC result
        for image in images:
            image_id = image.get("id")
            decision = qc_results.get(image_id, {}).get("decision")

            if decision == "pass":
                # Asset state is already updated in the database by the QC review endpoint
                # Just collect the asset ID for output
                approved_image_ids.append(image_id)
                logger.info(f"Image {image_id} approved")
                self._log_info(
                    execution_context,
                    "QC approved asset",
                    {"asset_id": image_id}
                )

            elif decision == "fail":
                # Asset state is already updated in the database by the QC review endpoint
                # Just collect the asset ID for output
                rejected_image_ids.append(image_id)
                logger.info(f"Image {image_id} rejected")
                self._log_info(
                    execution_context,
                    "QC rejected asset",
                    {"asset_id": image_id}
                )

        # Update QC task as completed
        qc_task_id = execution_context.get("current_qc_task_id")
        if qc_task_id and "qc_tasks" in execution_context:
            for task in execution_context["qc_tasks"]:
                if task["id"] == qc_task_id:
                    task["state"] = QCTaskState.COMPLETED.value
                    task["completed_at"] = datetime.now().isoformat()
                    task["reviewer_decision"] = qc_results
                    break

        # Clear QC context
        execution_context.pop("current_qc_task_id", None)
        execution_context.pop("qc_results", None)

        logger.info(f"QC complete: {len(approved_image_ids)} approved, {len(rejected_image_ids)} rejected")
        self._log_info(
            execution_context,
            "QC task completed",
            {
                "qc_task_id": qc_task_id,
                    "approved_count": len(approved_image_ids),
                    "rejected_count": len(rejected_image_ids)
                }
            )

        # Determine whether we need to trigger a retry workflow branch
        rejected_count = len(rejected_image_ids)
        fail_action = (self.config.get("failAction") or self.config.get("fail_action") or "retry").lower()
        max_retries_raw = self.config.get("max_retries")
        retry_step_raw = self.config.get("retryStep") or self.config.get("retry_step")

        try:
            max_retries = int(max_retries_raw) if max_retries_raw is not None else 1
        except (TypeError, ValueError):
            max_retries = 1

        try:
            retry_step_number = int(retry_step_raw) if retry_step_raw is not None else None
        except (TypeError, ValueError):
            retry_step_number = None

        if max_retries < 1:
            max_retries = 1

        if rejected_count > 0:
            self._log_warning(
                execution_context,
                "QC detected rejected assets",
                {
                    "rejected_count": rejected_count,
                    "fail_action": fail_action,
                    "max_retries": max_retries,
                    "retry_step": retry_step_number
                }
            )

            if fail_action == "retry" and retry_step_number:
                retry_state = execution_context.setdefault("qc_retry_state", {})
                module_state = retry_state.setdefault(
                    self.module_id,
                    {"attempts": 0, "max_retries": max_retries}
                )
                attempts_used = module_state.get("attempts", 0)
                allowed_attempts = module_state.get("max_retries", max_retries)

                if attempts_used < allowed_attempts:
                    module_state["attempts"] = attempts_used + 1
                    execution_context["retry_request"] = {
                        "step_number": retry_step_number,
                        "requested_by": self.module_id,
                        "reason": "qc_failure",
                        "attempt": module_state["attempts"],
                        "max_attempts": allowed_attempts
                    }
                    self._log_info(
                        execution_context,
                        "QC failure triggered step retry",
                        {
                            "retry_step": retry_step_number,
                            "attempt": module_state["attempts"],
                            "max_attempts": allowed_attempts
                        }
                    )
                else:
                    self._log_warning(
                        execution_context,
                        "QC retry limit reached, not retrying further",
                        {
                            "retry_step": retry_step_number,
                            "attempts_used": attempts_used,
                            "max_attempts": allowed_attempts
                        }
                    )
            elif fail_action == "end":
                self._log_info(
                    execution_context,
                    "QC failure configured to end workflow",
                    {"rejected_count": rejected_count}
                )
        else:
            # Reset retry tracking when QC passes
            retry_state = execution_context.get("qc_retry_state", {})
            if retry_state.get(self.module_id):
                retry_state.pop(self.module_id, None)

        # Return asset IDs (not full objects) to prevent BaseModule wrapper from creating duplicates
        # Asset states are already updated in DB by the QC review endpoint
        return {
            "approved_images": approved_image_ids,
            "rejected_images": rejected_image_ids
        }

    async def on_pause(self, execution_context: Dict[str, Any]) -> None:
        """Called when workflow pauses for QC"""
        logger.info(f"Workflow paused for QC task: {execution_context.get('current_qc_task_id')}")
        self._log_info(
            execution_context,
            "Workflow paused awaiting QC",
            {"qc_task_id": execution_context.get("current_qc_task_id")}
        )

    async def on_resume(self, execution_context: Dict[str, Any], resume_data: Dict[str, Any]) -> None:
        """Called when workflow resumes with QC results"""
        qc_results = resume_data.get("qc_results", {})
        execution_context["qc_results"] = qc_results
        logger.info(f"Workflow resuming with QC results for {len(qc_results)} images")
        self._log_info(
            execution_context,
            "Workflow resuming after QC",
            {"qc_task_id": execution_context.get("current_qc_task_id"), "result_count": len(qc_results)}
        )
