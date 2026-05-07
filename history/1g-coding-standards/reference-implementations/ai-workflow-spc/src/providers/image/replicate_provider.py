"""
Replicate Image Generation Provider

Provider implementation for Replicate API (SDXL model)
"""

import asyncio
import aiohttp
import logging
from typing import Dict, Any, List
from src.providers.base import BaseProvider, ProviderType

logger = logging.getLogger(__name__)


class ReplicateProvider(BaseProvider):
    """Provider for Replicate SDXL image generation"""

    API_URL = "https://api.replicate.com/v1/predictions"
    # SDXL 1.0 model version
    MODEL_VERSION = "39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b"

    async def execute(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        """
        Generate images using Replicate SDXL API

        Args:
            inputs: Dictionary with:
                - prompt: str (required)
                - negative_prompt: str (optional)
                - width: int (optional, default 1024)
                - height: int (optional, default 1024)
                - num_outputs: int (optional, default 1)
                - guidance_scale: float (optional, default 7.5)
                - num_inference_steps: int (optional, default 25)

        Returns:
            Dictionary with success, outputs, and metrics
        """
        prompt = inputs.get("prompt")
        if not prompt:
            return {
                "success": False,
                "error": "Prompt is required"
            }

        logger.info(f"Generating images with Replicate SDXL: {prompt}")

        try:
            image_urls = await self._generate_images(inputs)

            if not image_urls:
                return {
                    "success": False,
                    "error": "No images generated"
                }

            # Format outputs
            outputs = []
            for i, url in enumerate(image_urls):
                outputs.append({
                    "type": "image",
                    "url": url,
                    "metadata": {
                        "provider": "replicate_sdxl",
                        "model": "sdxl",
                        "prompt": prompt,
                        "negative_prompt": inputs.get("negative_prompt", ""),
                        "position": i
                    }
                })

            logger.info(f"Successfully generated {len(outputs)} images with Replicate")

            return {
                "success": True,
                "outputs": outputs,
                "metrics": {
                    "images_requested": inputs.get("num_outputs", 1),
                    "images_generated": len(outputs)
                }
            }

        except Exception as e:
            logger.error(f"Replicate image generation failed: {e}", exc_info=True)
            return {
                "success": False,
                "error": str(e)
            }

    async def _generate_images(self, inputs: Dict[str, Any]) -> List[str]:
        """
        Generate images using Replicate API

        Returns:
            List of image URLs
        """
        async with aiohttp.ClientSession() as session:
            # Step 1: Submit prediction
            headers = {
                "Authorization": f"Token {self.api_key}",
                "Content-Type": "application/json"
            }

            prediction_input = {
                "prompt": inputs["prompt"],
                "negative_prompt": inputs.get("negative_prompt", ""),
                "width": inputs.get("width", 1024),
                "height": inputs.get("height", 1024),
                "num_outputs": inputs.get("num_outputs", 1),
                "guidance_scale": inputs.get("guidance_scale", 7.5),
                "num_inference_steps": inputs.get("num_inference_steps", 25)
            }

            request_body = {
                "version": self.MODEL_VERSION,
                "input": prediction_input
            }

            async with session.post(
                self.API_URL,
                json=request_body,
                headers=headers
            ) as response:
                if response.status != 201:
                    text = await response.text()
                    logger.error(f"Replicate API error: {response.status} - {text}")
                    return []

                result = await response.json()
                prediction_id = result.get("id")
                if not prediction_id:
                    logger.error(f"No prediction ID in response: {result}")
                    return []

                logger.info(f"Replicate prediction started: {prediction_id}")

            # Step 2: Poll for completion
            max_attempts = 60  # 2 minutes timeout (2s intervals)
            poll_url = f"{self.API_URL}/{prediction_id}"

            for attempt in range(max_attempts):
                await asyncio.sleep(2)  # Poll every 2 seconds

                async with session.get(poll_url, headers=headers) as response:
                    if response.status != 200:
                        continue

                    result = await response.json()
                    status = result.get("status")

                    if status == "succeeded":
                        # Replicate returns output as array of URLs
                        output = result.get("output", [])
                        if output:
                            logger.info(f"Replicate completed: {len(output)} images")
                            return output
                        else:
                            logger.error(f"No output in successful response: {result}")
                            return []

                    elif status == "failed":
                        error = result.get("error", "Unknown error")
                        logger.error(f"Replicate generation failed: {error}")
                        return []

                    elif status == "canceled":
                        logger.error("Replicate generation was canceled")
                        return []

            logger.error(f"Replicate generation timed out for prediction {prediction_id}")
            return []

    def get_config_schema(self) -> Dict[str, Any]:
        """Get configuration schema for Replicate provider"""
        return {
            "prompt": {
                "type": "textarea",
                "label": "Image Prompt",
                "required": True,
                "placeholder": "Describe the image you want to generate"
            },
            "negative_prompt": {
                "type": "textarea",
                "label": "Negative Prompt",
                "required": False,
                "placeholder": "Things to avoid in the image",
                "help": "Specify what you don't want to see"
            },
            "width": {
                "type": "number",
                "label": "Width (px)",
                "default": 1024,
                "min": 128,
                "max": 2048,
                "step": 64,
                "help": "Must be divisible by 64"
            },
            "height": {
                "type": "number",
                "label": "Height (px)",
                "default": 1024,
                "min": 128,
                "max": 2048,
                "step": 64,
                "help": "Must be divisible by 64"
            },
            "num_outputs": {
                "type": "number",
                "label": "Number of Images",
                "default": 1,
                "min": 1,
                "max": 4
            },
            "guidance_scale": {
                "type": "number",
                "label": "Guidance Scale",
                "default": 7.5,
                "min": 1,
                "max": 20,
                "step": 0.5,
                "help": "Higher values follow prompt more closely (1-20)"
            },
            "num_inference_steps": {
                "type": "number",
                "label": "Inference Steps",
                "default": 25,
                "min": 1,
                "max": 100,
                "help": "More steps = higher quality but slower (25-50 recommended)"
            }
        }

    def get_provider_info(self) -> Dict[str, Any]:
        """Get provider metadata"""
        return {
            "name": "Replicate (SDXL)",
            "type": ProviderType.IMAGE_GENERATION,
            "description": "Stable Diffusion XL for high-quality image generation",
            "capabilities": [
                "negative_prompt",
                "custom_dimensions",
                "guidance_scale",
                "inference_steps"
            ],
            "cost_per_request": 0.012,  # Approximate $0.012 per prediction
            "average_time": 3  # seconds
        }

    def validate_inputs(self, inputs: Dict[str, Any]) -> bool:
        """Validate inputs before execution"""
        # Prompt is required
        if "prompt" not in inputs or not inputs["prompt"]:
            return False

        # Validate dimensions if provided
        width = inputs.get("width", 1024)
        height = inputs.get("height", 1024)

        if not isinstance(width, int) or not isinstance(height, int):
            return False

        if width < 128 or width > 2048 or height < 128 or height > 2048:
            return False

        # Dimensions must be divisible by 64
        if width % 64 != 0 or height % 64 != 0:
            return False

        # Validate num_outputs
        num_outputs = inputs.get("num_outputs", 1)
        if not isinstance(num_outputs, int) or num_outputs < 1 or num_outputs > 4:
            return False

        # Validate guidance_scale if provided
        guidance_scale = inputs.get("guidance_scale", 7.5)
        if not isinstance(guidance_scale, (int, float)) or guidance_scale < 1 or guidance_scale > 20:
            return False

        return True
