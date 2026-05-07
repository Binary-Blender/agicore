"""
Akool Image Generation Provider

Provider implementation for Akool AI image generation API
"""

import asyncio
import aiohttp
import logging
from typing import Dict, Any, List
from src.providers.base import BaseProvider, ProviderType

logger = logging.getLogger(__name__)


class AkoolProvider(BaseProvider):
    """Provider for Akool AI image generation"""

    API_URL = "https://openapi.akool.com/api/open/v3/content/image"

    async def execute(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        """
        Generate images using Akool API

        Args:
            inputs: Dictionary with:
                - prompt: str (required)
                - aspect_ratio: str (optional, default "1:1")
                - num_outputs: int (optional, default 4)

        Returns:
            Dictionary with success, outputs, and metrics
        """
        prompt = inputs.get("prompt")
        aspect_ratio = inputs.get("aspect_ratio", "1:1")
        num_outputs = inputs.get("num_outputs", 4)

        if not prompt:
            return {
                "success": False,
                "error": "Prompt is required"
            }

        logger.info(f"Generating {num_outputs} images with Akool: {prompt}")

        try:
            # Generate images using Akool
            async with aiohttp.ClientSession() as session:
                # Create tasks for parallel execution
                tasks = []
                for i in range(num_outputs):
                    task = self._generate_single_image(session, prompt, aspect_ratio)
                    tasks.append(task)

                # Wait for all tasks to complete
                results = await asyncio.gather(*tasks, return_exceptions=True)

                # Collect successful results
                all_images = []
                for result in results:
                    if isinstance(result, list) and result:
                        all_images.extend(result)
                    elif isinstance(result, Exception):
                        logger.error(f"Image generation task failed: {result}")

                if not all_images:
                    return {
                        "success": False,
                        "error": "All image generation requests failed"
                    }

                # Format outputs
                outputs = []
                for i, url in enumerate(all_images[:num_outputs]):
                    outputs.append({
                        "type": "image",
                        "url": url,
                        "metadata": {
                            "provider": "akool",
                            "prompt": prompt,
                            "aspect_ratio": aspect_ratio,
                            "position": i
                        }
                    })

                logger.info(f"Successfully generated {len(outputs)} images with Akool")

                return {
                    "success": True,
                    "outputs": outputs,
                    "metrics": {
                        "images_requested": num_outputs,
                        "images_generated": len(outputs)
                    }
                }

        except Exception as e:
            logger.error(f"Akool image generation failed: {e}", exc_info=True)
            return {
                "success": False,
                "error": str(e)
            }

    async def _generate_single_image(
        self,
        session: aiohttp.ClientSession,
        prompt: str,
        aspect_ratio: str
    ) -> List[str]:
        """
        Generate a single image request using Akool API

        Returns:
            List of image URLs (Akool returns 4 images per request)
        """
        try:
            # Step 1: Submit image generation request
            headers = {"x-api-key": self.api_key}

            request_body = {
                "prompt": prompt,
                "scale": aspect_ratio
            }

            async with session.post(
                f"{self.API_URL}/createbyprompt",
                json=request_body,
                headers=headers
            ) as response:
                if response.status != 200:
                    text = await response.text()
                    logger.error(f"Akool API error: {response.status} - {text}")
                    return []

                result = await response.json()
                if result.get("code") != 1000:  # Akool uses 1000 for success
                    logger.error(f"Akool API error: {result}")
                    return []

                # Akool returns the ID in the _id field
                task_id = result.get("data", {}).get("_id")
                if not task_id:
                    logger.error(f"No _id in response: {result}")
                    return []

                logger.info(f"Akool generation started with task ID: {task_id}")

            # Step 2: Poll for completion
            max_attempts = 60  # 2 minutes timeout (2s intervals)
            for attempt in range(max_attempts):
                await asyncio.sleep(2)  # Poll every 2 seconds

                poll_url = f"{self.API_URL}/infobymodelid?image_model_id={task_id}"

                async with session.get(poll_url, headers=headers) as response:
                    if response.status != 200:
                        continue

                    result = await response.json()
                    if result.get("code") != 1000:
                        continue

                    data = result.get("data", {})
                    image_status = data.get("image_status")

                    # Status 3 = completed
                    if image_status == 3:
                        # Check for upscaled_urls first (individual images)
                        upscaled_urls = data.get("upscaled_urls", [])
                        if upscaled_urls:
                            logger.info(f"Akool completed: {len(upscaled_urls)} images")
                            return upscaled_urls

                        # Fallback to images array
                        images = data.get("images", [])
                        if images:
                            return images

                        # Fallback to single image field
                        image_url = data.get("image")
                        if image_url:
                            return [image_url]

                        logger.error(f"No image URLs in completed response: {data}")
                        return []

                    # Status 4 = failed
                    elif image_status == 4:
                        error_reasons = data.get("error_reasons", [])
                        logger.error(f"Akool generation failed: {error_reasons}")
                        return []

            logger.error(f"Akool generation timed out for task {task_id}")
            return []

        except Exception as e:
            logger.error(f"Error in Akool image generation: {e}", exc_info=True)
            return []

    def get_config_schema(self) -> Dict[str, Any]:
        """Get configuration schema for Akool provider"""
        return {
            "prompt": {
                "type": "textarea",
                "label": "Image Prompt",
                "required": True,
                "placeholder": "Describe the image you want to generate"
            },
            "aspect_ratio": {
                "type": "select",
                "label": "Aspect Ratio",
                "options": ["1:1", "4:3", "3:4", "16:9", "9:16", "3:2", "2:3"],
                "default": "1:1"
            },
            "num_outputs": {
                "type": "number",
                "label": "Number of Images",
                "default": 4,
                "min": 1,
                "max": 10,
                "help": "Akool generates 4 images per request, so multiples of 4 are most efficient"
            }
        }

    def get_provider_info(self) -> Dict[str, Any]:
        """Get provider metadata"""
        return {
            "name": "Akool",
            "type": ProviderType.IMAGE_GENERATION,
            "description": "AI image generation with 4 variants per request",
            "capabilities": [
                "multi_output",
                "aspect_ratios",
                "fast_generation"
            ],
            "cost_per_request": 0.05,  # Approximate
            "average_time": 15  # seconds
        }

    def validate_inputs(self, inputs: Dict[str, Any]) -> bool:
        """Validate inputs before execution"""
        if "prompt" not in inputs or not inputs["prompt"]:
            return False

        # Validate aspect ratio if provided
        aspect_ratio = inputs.get("aspect_ratio", "1:1")
        valid_ratios = ["1:1", "4:3", "3:4", "16:9", "9:16", "3:2", "2:3"]
        if aspect_ratio not in valid_ratios:
            return False

        # Validate num_outputs if provided
        num_outputs = inputs.get("num_outputs", 1)
        if not isinstance(num_outputs, int) or num_outputs < 1 or num_outputs > 10:
            return False

        return True
