"""
AKOOL Video MCP Module - Image-to-Video conversion via MCP
"""

from typing import Dict, Any, List
from .base import BaseModule, ModuleDefinition
from src.mcp.client import MCPClient, MCPTransport
from src.mcp.registry import MCPServerRegistry
import uuid
import logging
import os
import asyncio

logger = logging.getLogger(__name__)


class MCPAkoolVideoModule(BaseModule):
    """Module for AKOOL image-to-video conversion via MCP"""

    def get_definition(self) -> ModuleDefinition:
        """Return module definition"""
        return ModuleDefinition(
            type="mcp_akool_video",
            name="AKOOL Image to Video",
            description="Convert images to videos using AKOOL AI via MCP",
            category="action",
            inputs=["images"],
            outputs=["videos"],
            config_schema={
                "type": "object",
                "properties": {
                    "prompt": {
                        "type": "string",
                        "description": "Animation instructions for the video"
                    },
                    "negative_prompt": {
                        "type": "string",
                        "description": "Elements to exclude from animation (optional)"
                    },
                    "resolution": {
                        "type": "string",
                        "description": "Video resolution",
                        "enum": ["720p", "1080p", "4k"],
                        "default": "720p"
                    },
                    "video_length": {
                        "type": "integer",
                        "description": "Video duration in seconds",
                        "enum": [5, 10],
                        "default": 5
                    },
                    "audio_type": {
                        "type": "integer",
                        "description": "Audio type: 1=AI-generated, 2=custom upload, 3=none",
                        "enum": [1, 2, 3],
                        "default": 3
                    },
                    "audio_url": {
                        "type": "string",
                        "description": "Custom audio URL (required when audio_type=2)"
                    },
                    "extend_prompt": {
                        "type": "boolean",
                        "description": "Enable algorithmic prompt enhancement",
                        "default": False
                    },
                    "is_premium_model": {
                        "type": "boolean",
                        "description": "Use premium model for faster generation",
                        "default": False
                    },
                    "effect_code": {
                        "type": "string",
                        "description": "Optional Akool effect code (e.g., squish_89244231312)"
                    },
                    "api_key": {
                        "type": "string",
                        "description": "AKOOL API key"
                    }
                },
                "required": ["prompt"]
            },
            icon="🎬"
        )

    async def execute(self, inputs: Dict[str, Any], execution_context: Dict[str, Any]) -> Dict[str, Any]:
        """Execute AKOOL image-to-video conversion via MCP"""

        # Get configuration
        prompt = self.config.get("prompt")
        negative_prompt = self.config.get("negative_prompt", "")
        resolution = self.config.get("resolution", "720p")
        video_length = self.config.get("video_length", 5)
        audio_type = self.config.get("audio_type", 3)
        audio_url = self.config.get("audio_url", "")
        extend_prompt = self.config.get("extend_prompt", False)
        is_premium_model = self.config.get("is_premium_model", False)
        effect_code = self.config.get("effect_code")
        api_key = self.config.get("api_key")

        if not prompt:
            raise ValueError("Prompt is required")
        if audio_type == 2 and not audio_url:
            raise ValueError("Audio URL is required when using custom audio (audio_type=2)")
        if video_length not in (5, 10):
            raise ValueError("Video length must be 5 or 10 seconds for Akool image-to-video")

        # Get input images - they could come from various sources
        input_images = []

        # Check for images in various input formats
        if "images" in inputs:
            if isinstance(inputs["images"], list):
                input_images = inputs["images"]
            else:
                input_images = [inputs["images"]]
        elif "default" in inputs:
            if isinstance(inputs["default"], list):
                input_images = inputs["default"]
            else:
                input_images = [inputs["default"]]

        if not input_images:
            raise ValueError("No input images provided. Connect an image source module.")

        logger.info(f"Converting {len(input_images)} images to videos with AKOOL")

        # Get AKOOL MCP server configuration
        registry = MCPServerRegistry()
        server_config = registry.get("akool")

        if not server_config:
            raise ValueError("AKOOL MCP server not found in registry")

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

        # Process each image
        all_videos = []

        async with MCPClient(client_config, MCPTransport.STDIO) as client:
            logger.info(f"Connected to AKOOL MCP server")

            # Process images in parallel (but limit concurrency to avoid overwhelming the API)
            semaphore = asyncio.Semaphore(3)  # Max 3 concurrent requests

            async def process_image(image_asset):
                async with semaphore:
                    try:
                        # Extract image URL
                        image_url = image_asset.get("url") if isinstance(image_asset, dict) else str(image_asset)

                        logger.info(f"Creating video from image: {image_url[:50]}...")

                        # Prepare tool arguments
                        tool_args = {
                            "image_url": image_url,
                            "prompt": prompt,
                            "negative_prompt": negative_prompt,
                            "resolution": resolution,
                            "video_length": video_length,
                            "audio_type": audio_type,
                            "extend_prompt": extend_prompt,
                            "is_premium_model": is_premium_model
                        }

                        # Add audio_url if audio_type is 2 (custom upload)
                        if audio_type == 2 and audio_url:
                            tool_args["audio_url"] = audio_url
                        if effect_code:
                            tool_args["effect_code"] = effect_code

                        # Call image_to_video tool
                        content = await client.call_tool("image_to_video", tool_args)

                        # Process results
                        videos = []
                        for item in content:
                            if item["type"] == "video":
                                # Create asset for video
                                video_asset = await self._create_video_asset(
                                    item["url"],
                                    image_url,
                                    prompt,
                                    resolution,
                                    video_length,
                                    execution_context
                                )
                                videos.append(video_asset)

                        return videos

                    except Exception as e:
                        logger.error(f"Failed to convert image to video: {str(e)}")
                        return []

            # Process all images in parallel
            tasks = [process_image(img) for img in input_images]
            results = await asyncio.gather(*tasks)

            # Flatten results
            for video_list in results:
                all_videos.extend(video_list)

        logger.info(f"AKOOL video module completed: {len(all_videos)} videos generated from {len(input_images)} images")

        # Return results
        return {
            "videos": all_videos,
            "default": all_videos,  # For workflow connections that use "default"
            "provider": "mcp_akool_video",
            "input_count": len(input_images),
            "output_count": len(all_videos)
        }

    async def _create_video_asset(
        self,
        video_url: str,
        source_image_url: str,
        prompt: str,
        resolution: str,
        video_length: int,
        execution_context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Create asset from AKOOL video result"""

        asset_id = f"asset_{uuid.uuid4().hex[:8]}"

        asset_data = {
            "id": asset_id,
            "type": "video",
            "url": video_url,
            "prompt": prompt,
            "state": "unchecked",  # Awaiting QC just like image outputs
            "archived": False,
            "provider": "mcp_akool_video",
            "provider_metadata": {
                "mcp_server": "akool",
                "tool": "image_to_video",
                "source_image": source_image_url,
                "resolution": resolution,
                "video_length": video_length
            },
            "quality_metrics": {
                "source": "mcp_akool_video",
                "awaiting_qc": True
            },
            "execution_id": execution_context.get("execution_id")
        }

        # Store in execution context for QC
        if "generated_assets" not in execution_context:
            execution_context["generated_assets"] = []
        execution_context["generated_assets"].append(asset_data)

        return asset_data
