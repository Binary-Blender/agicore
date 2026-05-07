"""Image generation module using provider framework"""
import os
from typing import Dict, Any
from .base import BaseModule, ModuleDefinition
from ..database.models import Asset  # Sprint 4.0: Use database Asset model with provider fields
from ..providers import ProviderRegistry
import logging

# Asset states
class AssetState:
    UNCHECKED = "unchecked"
    APPROVED = "approved"
    REJECTED = "rejected"

logger = logging.getLogger(__name__)


class ImageGenerationModule(BaseModule):
    """Module that generates images using AI APIs"""

    def get_definition(self) -> ModuleDefinition:
        return ModuleDefinition(
            type="image_generation",
            name="Image Generator",
            description="Generates images using AI (AKOOL API)",
            category="action",
            inputs=["trigger"],
            outputs=["images"],
            config_schema={
                "type": "object",
                "properties": {
                    "prompt": {
                        "type": "string",
                        "description": "Text prompt for image generation",
                        "minLength": 1
                    },
                    "negative_prompt": {
                        "type": "string",
                        "description": "Negative prompt (what to avoid)",
                        "default": ""
                    },
                    "num_images": {
                        "type": "integer",
                        "description": "Number of images to generate (1-4)",
                        "default": 4,
                        "minimum": 1,
                        "maximum": 4
                    }
                },
                "required": ["prompt"]
            },
            icon="🎨"
        )

    async def execute(self, inputs: Dict[str, Any], execution_context: Dict[str, Any]) -> Dict[str, Any]:
        """Generate images using configured provider"""

        # Get provider configuration (default to akool for backward compatibility)
        provider_id = self.config.get("api_provider", "akool")
        prompt = self.config["prompt"]
        num_images = self.config.get("num_images", 4)

        # Get API key (module config takes precedence, then environment)
        module_api_key = self.config.get("apiKey")
        env_api_key = os.getenv(f"{provider_id.upper()}_API_KEY") or os.getenv("AKOOL_API_KEY")
        api_key = module_api_key or env_api_key

        if not api_key:
            error_msg = (
                f"{provider_id} API key not configured. Please either:\n"
                f"1. Add your API key in the Image Generator module configuration, or\n"
                f"2. Set the {provider_id.upper()}_API_KEY environment variable"
            )
            logger.error(error_msg)
            raise ValueError(error_msg)

        logger.info(f"Generating {num_images} images with {provider_id}: {prompt}")

        try:
            # Get provider from registry
            provider = ProviderRegistry.get_provider(provider_id, api_key)

            # Prepare provider inputs based on provider type
            provider_inputs = self._prepare_provider_inputs(provider_id, inputs)

            # Get iterations from previous modules
            iterations = inputs.get("iterations", 1)

            # Generate images (iterations times if needed)
            all_assets = []
            for iteration in range(iterations):
                logger.info(f"Iteration {iteration + 1}/{iterations}")

                # Execute provider
                result = await provider.execute(provider_inputs)

                if not result.get("success"):
                    error_msg = result.get("error", "Unknown error")
                    logger.error(f"Provider {provider_id} failed: {error_msg}")
                    raise Exception(f"Image generation failed: {error_msg}")

                # Create asset records from provider outputs
                outputs = result.get("outputs", [])
                for output in outputs:
                    asset = Asset(
                        type="image",
                        url=output["url"],
                        prompt=prompt,  # Store prompt directly
                        asset_metadata={  # Database model uses "asset_metadata" not "metadata"
                            **output.get("metadata", {}),
                            "iteration": iteration
                        },
                        execution_id=execution_context.get("execution_id", ""),  # Database model uses "execution_id"
                        state=AssetState.UNCHECKED,
                        # Sprint 4.0: Provider tracking
                        provider=provider_id,
                        provider_metadata=output.get("metadata", {})
                    )
                    all_assets.append(asset)

                    # Store asset in execution context for persistence (JSON-serializable dict)
                    if "assets" not in execution_context:
                        execution_context["assets"] = []
                    execution_context["assets"].append({
                        "id": asset.id,
                        "type": asset.type,
                        "url": asset.url,
                        "prompt": asset.prompt,
                        "state": asset.state,
                        "provider": asset.provider,
                        "provider_metadata": asset.provider_metadata
                    })

            logger.info(f"Successfully generated {len(all_assets)} images using {provider_id}")

            return {
                "images": [{
                    "id": a.id,
                    "type": a.type,
                    "url": a.url,
                    "prompt": a.prompt,
                    "state": a.state,
                    "provider": a.provider,
                    "provider_metadata": a.provider_metadata
                } for a in all_assets],
                "provider": provider_id
            }

        except Exception as e:
            logger.error(f"Image generation failed: {e}", exc_info=True)
            raise

    def _prepare_provider_inputs(self, provider_id: str, inputs: Dict[str, Any]) -> Dict[str, Any]:
        """
        Map module config and inputs to provider-specific format

        Args:
            provider_id: Provider identifier
            inputs: Inputs from previous modules

        Returns:
            Dictionary of provider inputs
        """
        prompt = self.config["prompt"]
        num_images = self.config.get("num_images", 4)

        base_inputs = {
            "prompt": prompt
        }

        if provider_id == "akool":
            base_inputs.update({
                "aspect_ratio": self.config.get("aspect_ratio", "1:1"),
                "num_outputs": num_images
            })
        elif provider_id == "replicate_sdxl":
            base_inputs.update({
                "negative_prompt": self.config.get("negative_prompt", ""),
                "width": self.config.get("width", 1024),
                "height": self.config.get("height", 1024),
                "num_outputs": num_images,
                "guidance_scale": self.config.get("guidance_scale", 7.5),
                "num_inference_steps": self.config.get("num_inference_steps", 25)
            })
        else:
            # Generic mapping for unknown providers
            base_inputs["num_outputs"] = num_images

        return base_inputs