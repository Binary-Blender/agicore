"""
AKOOL MCP Module - Specialized module for AKOOL image generation via MCP
"""

from typing import Dict, Any
from .base import BaseModule, ModuleDefinition
from src.mcp.client import MCPClient, MCPTransport
from src.mcp.registry import MCPServerRegistry
import uuid
import logging
import os

logger = logging.getLogger(__name__)


class MCPAkoolModule(BaseModule):
    """Module for AKOOL image generation via MCP"""

    def get_definition(self) -> ModuleDefinition:
        """Return module definition"""
        return ModuleDefinition(
            type="mcp_akool",
            name="AKOOL Image Generation",
            description="Generate images using AKOOL AI via MCP",
            category="action",
            inputs=["trigger"],
            outputs=["images"],
            config_schema={
                "type": "object",
                "properties": {
                    "prompt": {
                        "type": "string",
                        "description": "Image generation prompt"
                    },
                    "negative_prompt": {
                        "type": "string",
                        "description": "Negative prompt (optional)"
                    },
                    "aspect_ratio": {
                        "type": "string",
                        "description": "Image aspect ratio",
                        "enum": ["1:1", "4:3", "3:4", "16:9", "9:16", "3:2", "2:3"],
                        "default": "1:1"
                    },
                    "num_images": {
                        "type": "integer",
                        "description": "Number of images to generate",
                        "default": 4,
                        "minimum": 1,
                        "maximum": 10
                    },
                    "api_key": {
                        "type": "string",
                        "description": "AKOOL API key"
                    }
                },
                "required": ["prompt"]
            },
            icon="🎨"
        )

    async def execute(self, inputs: Dict[str, Any], execution_context: Dict[str, Any]) -> Dict[str, Any]:
        """Execute AKOOL image generation via MCP"""

        # Get configuration
        prompt = self.config.get("prompt")
        negative_prompt = self.config.get("negative_prompt", "")
        aspect_ratio = self.config.get("aspect_ratio", "1:1")
        num_images = self.config.get("num_images", 4)
        api_key = self.config.get("api_key")

        if not prompt:
            raise ValueError("Prompt is required")

        # Get AKOOL MCP server configuration
        registry = MCPServerRegistry()
        server_config = registry.get("akool")

        if not server_config:
            raise ValueError("AKOOL MCP server not found in registry")

        self._log_info(
            execution_context,
            "Starting AKOOL MCP image generation",
            {
                "prompt_preview": prompt[:120],
                "negative_prompt": negative_prompt[:120] if negative_prompt else "",
                "aspect_ratio": aspect_ratio,
                "num_images": num_images,
                "iterations": inputs.get("iterations", 1)
            }
        )
        logger.info(f"Generating {num_images} images with AKOOL via MCP: {prompt[:50]}...")

        # Prepare MCP client configuration
        client_config = {
            "command": server_config.command,
            "args": server_config.args,
            "env": dict(server_config.env)
        }

        # Add API key if provided or available in environment
        if api_key:
            client_config["env"]["AKOOL_API_KEY"] = api_key
        elif "AKOOL_API_KEY" in os.environ:
            client_config["env"]["AKOOL_API_KEY"] = os.environ["AKOOL_API_KEY"]
        else:
            raise ValueError("AKOOL API key required: provide in configuration or set AKOOL_API_KEY environment variable")

        # Handle iterations from inputs
        iterations = inputs.get("iterations", 1)

        # Execute MCP calls
        all_assets = []

        async with MCPClient(client_config, MCPTransport.STDIO) as client:
            logger.info(f"Connected to AKOOL MCP server")
            self._log_info(
                execution_context,
                "Connected to AKOOL MCP server",
                {"server_info": client.server_info}
            )

            # Execute for each iteration
            for i in range(iterations):
                logger.info(f"AKOOL generation iteration {i+1}/{iterations}")
                self._log_info(
                    execution_context,
                    "Invoking AKOOL generate_image tool",
                    {"iteration": i + 1, "total_iterations": iterations}
                )

                # Prepare tool arguments
                tool_args = {
                    "prompt": prompt,
                    "aspect_ratio": aspect_ratio,
                    "num_images": num_images
                }

                # Note: negative_prompt is accepted but not currently used by AKOOL API
                if negative_prompt:
                    tool_args["negative_prompt"] = negative_prompt

                # Call generate_image tool
                content = await client.call_tool("generate_image", tool_args)

                # Process results
                for item in content:
                    if item["type"] == "image":
                        # Create asset for image
                        asset = await self._create_image_asset(
                            item["url"],
                            prompt,
                            aspect_ratio,
                            execution_context
                        )
                        all_assets.append(asset)
                        self._log_info(
                            execution_context,
                            "AKOOL returned image",
                            {"asset_id": asset["id"], "url": asset["url"][:120]}
                        )

                        # Stop if we've reached the requested number of images
                        if len(all_assets) >= num_images:
                            break

                # Break outer loop if we have enough images
                if len(all_assets) >= num_images:
                    break

        logger.info(f"AKOOL MCP module completed: {len(all_assets)} images generated (requested: {num_images})")
        self._log_info(
            execution_context,
            "AKOOL MCP module completed",
            {"generated_images": len(all_assets), "requested_images": num_images}
        )

        # Return results - only use "images" output to avoid duplicate asset creation
        # The "default" output was causing assets to be created twice
        return {
            "images": all_assets,
            "provider": "mcp_akool",
            "iterations": iterations
        }

    async def _create_image_asset(
        self,
        url: str,
        prompt: str,
        aspect_ratio: str,
        execution_context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Create asset from AKOOL MCP image result"""

        asset_id = f"asset_{uuid.uuid4().hex[:8]}"

        asset_data = {
            "id": asset_id,
            "type": "image",
            "url": url,
            "prompt": prompt,
            "state": "unchecked",
            "archived": False,
            "provider": "mcp_akool",
            "provider_metadata": {
                "mcp_server": "akool",
                "tool": "generate_image",
                "aspect_ratio": aspect_ratio
            },
            "quality_metrics": {
                "source": "mcp_akool",
                "awaiting_qc": True
            },
            "execution_id": execution_context.get("execution_id")
        }

        # Store in execution context for QC
        if "generated_assets" not in execution_context:
            execution_context["generated_assets"] = []
        execution_context["generated_assets"].append(asset_data)

        self._log_info(
            execution_context,
            "Registered AKOOL generated asset",
            {
                "asset_id": asset_id,
                "provider": "mcp_akool",
                "url": url[:120]
            }
        )

        return asset_data
