"""
DALL-E MCP Module - Specialized module for DALL-E 3 image generation via MCP
"""

from typing import Dict, Any
from .base import BaseModule, ModuleDefinition
from src.mcp.client import MCPClient, MCPTransport
from src.mcp.registry import MCPServerRegistry
import uuid
import logging
import os

logger = logging.getLogger(__name__)


class MCPDalleModule(BaseModule):
    """Module for DALL-E 3 image generation via MCP"""

    def get_definition(self) -> ModuleDefinition:
        """Return module definition"""
        return ModuleDefinition(
            type="mcp_dalle",
            name="DALL-E 3 Image Generation",
            description="Generate images using DALL-E 3 via MCP",
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
                    "size": {
                        "type": "string",
                        "description": "Image size",
                        "enum": ["1024x1024", "1792x1024", "1024x1792"],
                        "default": "1024x1024"
                    },
                    "quality": {
                        "type": "string",
                        "description": "Image quality",
                        "enum": ["standard", "hd"],
                        "default": "standard"
                    },
                    "style": {
                        "type": "string",
                        "description": "Image style",
                        "enum": ["vivid", "natural"],
                        "default": "vivid"
                    },
                    "num_images": {
                        "type": "integer",
                        "description": "Number of images (DALL-E 3 only supports 1)",
                        "default": 1,
                        "minimum": 1,
                        "maximum": 1
                    },
                    "api_key": {
                        "type": "string",
                        "description": "OpenAI API key"
                    }
                },
                "required": ["prompt"]
            },
            icon="🖼️"
        )

    async def execute(self, inputs: Dict[str, Any], execution_context: Dict[str, Any]) -> Dict[str, Any]:
        """Execute DALL-E 3 image generation via MCP"""

        # Get configuration
        prompt = self.config.get("prompt")
        size = self.config.get("size", "1024x1024")
        quality = self.config.get("quality", "standard")
        style = self.config.get("style", "vivid")
        api_key = self.config.get("api_key")

        if not prompt:
            raise ValueError("Prompt is required")

        # Get DALL-E MCP server configuration
        registry = MCPServerRegistry()
        server_config = registry.get("dalle")

        if not server_config:
            raise ValueError("DALL-E MCP server not found in registry")

        logger.info(f"Generating image with DALL-E 3 via MCP: {prompt[:50]}...")
        logger.info(f"Settings: {size}, {quality} quality, {style} style")

        # Prepare MCP client configuration
        client_config = {
            "command": server_config.command,
            "args": server_config.args,
            "env": dict(server_config.env)
        }

        # Add API key if provided or available in environment
        if api_key:
            client_config["env"]["OPENAI_API_KEY"] = api_key
        elif "OPENAI_API_KEY" in os.environ:
            client_config["env"]["OPENAI_API_KEY"] = os.environ["OPENAI_API_KEY"]
        else:
            raise ValueError("OpenAI API key required: provide in configuration or set OPENAI_API_KEY environment variable")

        # Handle iterations from inputs
        iterations = inputs.get("iterations", 1)

        # Execute MCP calls
        all_assets = []

        async with MCPClient(client_config, MCPTransport.STDIO) as client:
            logger.info(f"Connected to DALL-E MCP server")

            # Execute for each iteration
            for i in range(iterations):
                logger.info(f"DALL-E generation iteration {i+1}/{iterations}")

                # Prepare tool arguments
                tool_args = {
                    "prompt": prompt,
                    "size": size,
                    "quality": quality,
                    "style": style,
                    "n": 1  # DALL-E 3 only supports 1 image
                }

                # Call generate_image tool
                content = await client.call_tool("generate_image", tool_args)

                # Process results
                for item in content:
                    if item["type"] == "image":
                        # Create asset for image
                        asset = await self._create_image_asset(
                            item["url"],
                            prompt,
                            item.get("revised_prompt", prompt),  # DALL-E 3 may revise prompts
                            size,
                            quality,
                            style,
                            execution_context
                        )
                        all_assets.append(asset)

        logger.info(f"DALL-E MCP module completed: {len(all_assets)} images generated")

        # Return results - include both "images" and "default" for compatibility
        return {
            "images": all_assets,
            "default": all_assets,  # For workflow connections that use "default"
            "provider": "mcp_dalle",
            "iterations": iterations
        }

    async def _create_image_asset(
        self,
        url: str,
        prompt: str,
        revised_prompt: str,
        size: str,
        quality: str,
        style: str,
        execution_context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Create asset from DALL-E MCP image result"""

        asset_id = f"asset_{uuid.uuid4().hex[:8]}"

        asset_data = {
            "id": asset_id,
            "type": "image",
            "url": url,
            "prompt": prompt,
            "state": "unchecked",
            "archived": False,
            "provider": "mcp_dalle",
            "provider_metadata": {
                "mcp_server": "dalle",
                "tool": "generate_image",
                "size": size,
                "quality": quality,
                "style": style,
                "revised_prompt": revised_prompt  # DALL-E 3 specific
            },
            "quality_metrics": {
                "source": "mcp_dalle",
                "awaiting_qc": True
            },
            "execution_id": execution_context.get("execution_id")
        }

        # Store in execution context for QC
        if "generated_assets" not in execution_context:
            execution_context["generated_assets"] = []
        execution_context["generated_assets"].append(asset_data)

        return asset_data
