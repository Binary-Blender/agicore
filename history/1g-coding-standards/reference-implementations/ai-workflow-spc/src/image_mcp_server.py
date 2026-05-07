#!/usr/bin/env python3
"""
Real MCP Server for Image Generation
Supports OpenAI DALL-E, with easy extension for other providers
"""

import os
import base64
import json
import asyncio
from typing import Dict, Any, List
from datetime import datetime
import urllib.request
from pathlib import Path

class ImageGenerationMCP:
    """MCP Server for real image generation"""

    def __init__(self):
        self.name = "image-generation"
        self.api_key = os.getenv("OPENAI_API_KEY", "")
        self.output_dir = Path("/mnt/c/Users/Chris/Documents/_DevProjects/ai-workflow-spc/generated_images")
        self.output_dir.mkdir(exist_ok=True)

    async def list_tools(self) -> List[Dict[str, Any]]:
        """List available tools"""
        return [
            {
                "name": "generate_image",
                "description": "Generate an image from a text prompt using AI",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "prompt": {
                            "type": "string",
                            "description": "Text description of the image to generate"
                        },
                        "size": {
                            "type": "string",
                            "enum": ["256x256", "512x512", "1024x1024"],
                            "default": "512x512",
                            "description": "Image size"
                        },
                        "provider": {
                            "type": "string",
                            "enum": ["openai", "mock"],
                            "default": "mock",
                            "description": "Image generation provider"
                        }
                    },
                    "required": ["prompt"]
                }
            }
        ]

    async def call_tool(self, name: str, arguments: Dict[str, Any]) -> Dict[str, Any]:
        """Execute tool"""
        if name == "generate_image":
            return await self.generate_image(**arguments)
        raise ValueError(f"Unknown tool: {name}")

    async def generate_image(self, prompt: str, size: str = "512x512", provider: str = "mock") -> Dict[str, Any]:
        """Generate image using specified provider"""

        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"image_{timestamp}.png"
        filepath = self.output_dir / filename

        if provider == "openai" and self.api_key:
            # Real OpenAI generation
            try:
                # OpenAI API call
                headers = {
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json"
                }

                data = json.dumps({
                    "model": "dall-e-2",  # Use DALL-E 2 for lower cost
                    "prompt": prompt,
                    "n": 1,
                    "size": size
                }).encode('utf-8')

                req = urllib.request.Request(
                    "https://api.openai.com/v1/images/generations",
                    data=data,
                    headers=headers
                )

                with urllib.request.urlopen(req) as response:
                    result = json.loads(response.read().decode('utf-8'))
                    image_url = result['data'][0]['url']

                    # Download image
                    with urllib.request.urlopen(image_url) as img_response:
                        img_data = img_response.read()
                        filepath.write_bytes(img_data)

                    return {
                        "status": "success",
                        "image_path": str(filepath),
                        "image_url": image_url,
                        "prompt": prompt,
                        "provider": "openai",
                        "cost": 0.016 if size == "256x256" else 0.018 if size == "512x512" else 0.02,
                        "timestamp": timestamp
                    }

            except Exception as e:
                return {
                    "status": "error",
                    "error": str(e),
                    "provider": "openai",
                    "fallback": "using mock instead"
                }

        # Mock generation (free, for testing)
        # Use Lorem Picsum for random images
        mock_url = f"https://picsum.photos/{size.split('x')[0]}"

        try:
            with urllib.request.urlopen(mock_url) as response:
                img_data = response.read()
                filepath.write_bytes(img_data)

            return {
                "status": "success",
                "image_path": str(filepath),
                "image_url": mock_url,
                "prompt": prompt,
                "provider": "mock",
                "cost": 0.0,
                "timestamp": timestamp,
                "note": "Mock image - add OPENAI_API_KEY for real generation"
            }
        except Exception as e:
            return {
                "status": "error",
                "error": str(e),
                "provider": "mock"
            }


# Simple MCP protocol implementation
class SimpleMCPServer:
    """Basic MCP server implementation"""

    def __init__(self, handler):
        self.handler = handler

    async def handle_request(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """Handle incoming MCP request"""
        method = request.get("method")

        if method == "tools/list":
            tools = await self.handler.list_tools()
            return {
                "tools": tools
            }

        elif method == "tools/call":
            name = request.get("params", {}).get("name")
            arguments = request.get("params", {}).get("arguments", {})
            result = await self.handler.call_tool(name, arguments)
            return {
                "content": result
            }

        else:
            return {
                "error": f"Unknown method: {method}"
            }

# Run as standalone server
if __name__ == "__main__":
    import sys

    print("Image Generation MCP Server")
    print("===========================")

    server = ImageGenerationMCP()
    mcp = SimpleMCPServer(server)

    # Simple test
    if "--test" in sys.argv:
        async def test():
            # List tools
            tools = await mcp.handle_request({"method": "tools/list"})
            print("Available tools:", json.dumps(tools, indent=2))

            # Generate test image
            result = await mcp.handle_request({
                "method": "tools/call",
                "params": {
                    "name": "generate_image",
                    "arguments": {
                        "prompt": "A beautiful sunset over mountains",
                        "size": "512x512"
                    }
                }
            })
            print("\nGeneration result:", json.dumps(result, indent=2))

        asyncio.run(test())
    else:
        print("Server ready. Use --test to run a test.")