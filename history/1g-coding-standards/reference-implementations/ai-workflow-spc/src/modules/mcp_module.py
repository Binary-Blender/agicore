"""
MCP Module - Universal module for calling any MCP server
Replaces provider-specific modules with dynamic MCP integration
"""

from typing import Dict, Any, List
from .base import BaseModule, ModuleDefinition
from src.mcp.client import MCPClient, MCPTransport
from src.mcp.registry import MCPServerRegistry
import uuid
import asyncio
import logging
import os

logger = logging.getLogger(__name__)

class MCPModule(BaseModule):
    """Module for calling MCP servers"""
    
    def get_definition(self) -> ModuleDefinition:
        """Return module definition"""
        return ModuleDefinition(
            type="mcp",
            name="MCP Tool Call",
            description="Universal module for calling any MCP server",
            category="action",
            inputs=["trigger"],
            outputs=["default", "results", "images", "videos", "audio", "text"],
            config_schema={
                "type": "object",
                "properties": {
                    "mcp_server": {
                        "type": "string",
                        "description": "MCP Server ID",
                        "enum": self._get_available_server_ids()
                    },
                    "tool_name": {
                        "type": "string",
                        "description": "Tool name to call"
                    },
                    "tool_arguments": {
                        "type": "object",
                        "description": "Tool arguments (JSON object)"
                    },
                    "api_key": {
                        "type": "string",
                        "description": "API key (if required by server)"
                    }
                },
                "required": ["mcp_server", "tool_name"]
            },
            icon="🔌"
        )
    
    def _get_available_server_ids(self) -> List[str]:
        """Get list of available MCP server IDs"""
        registry = MCPServerRegistry()
        return [s.id for s in registry.list_all()]
    
    async def execute(self, inputs: Dict[str, Any], execution_context: Dict[str, Any]) -> Dict[str, Any]:
        """Execute MCP tool call"""
        
        # Get configuration
        server_id = self.config.get("mcp_server")
        tool_name = self.config.get("tool_name")
        tool_arguments = self.config.get("tool_arguments", {})
        api_key = self.config.get("api_key") or tool_arguments.get("api_key")
        
        if not server_id:
            raise ValueError("MCP server not specified")
        if not tool_name:
            raise ValueError("Tool name not specified")
        
        # Get server configuration
        registry = MCPServerRegistry()
        server_config = registry.get(server_id)
        
        if not server_config:
            raise ValueError(f"Unknown MCP server: {server_id}")

        self._log_info(
            execution_context,
            "Starting MCP tool call",
            {
                "server_id": server_id,
                "tool_name": tool_name,
                "iterations": inputs.get("iterations", 1),
                "tool_arguments": tool_arguments
            }
        )
        logger.info(f"Executing MCP call: {server_id}.{tool_name}")

        # Prepare MCP client configuration
        client_config = {
            "command": server_config.command,
            "args": server_config.args,
            "env": dict(server_config.env)
        }
        
        # Add API key if required
        if server_config.requires_api_key:
            if api_key:
                client_config["env"][server_config.api_key_env_var] = api_key
            elif server_config.api_key_env_var in os.environ:
                client_config["env"][server_config.api_key_env_var] = os.environ[server_config.api_key_env_var]
            else:
                raise ValueError(f"API key required for {server_config.name}")
        
        # Handle iterations from inputs
        iterations = inputs.get("iterations", 1)
        
        # Execute MCP calls
        all_assets = []
        images_output: List[str] = []
        videos_output: List[str] = []
        audio_output: List[str] = []
        text_output: List[str] = []
        default_output: List[str] = []
        source_asset_ids = self._flatten_input_asset_ids()
        
        async with MCPClient(client_config, MCPTransport.STDIO) as client:
            logger.info(f"Connected to MCP server: {server_id}")
            logger.info(f"Server: {client.server_info.get('name')} v{client.server_info.get('version')}")
            self._log_info(
                execution_context,
                "Connected to MCP server",
                {
                    "server_id": server_id,
                    "server_info": client.server_info
                }
            )
            
            # Execute for each iteration
            for i in range(iterations):
                logger.info(f"Executing {tool_name} iteration {i+1}/{iterations}")
                self._log_info(
                    execution_context,
                    "Invoking MCP tool",
                    {
                        "server_id": server_id,
                        "tool_name": tool_name,
                        "iteration": i + 1,
                        "total_iterations": iterations
                    }
                )
                
                # Add iteration context to arguments if needed
                args = dict(tool_arguments)
                if iterations > 1:
                    args["_iteration"] = i + 1
                
                # Call tool
                content = await client.call_tool(tool_name, args)
                
                # Process results based on content type
                for item in content:
                    asset = await self._create_asset_from_content(
                        item=item,
                        server_id=server_id,
                        tool_name=tool_name,
                        tool_arguments=args,
                        source_asset_ids=source_asset_ids,
                        execution_context=execution_context
                    )
                    if asset:
                        default_output.append(asset.id)
                        all_assets.append({"asset_id": asset.id, "type": asset.type})
                        if asset.type == "image":
                            images_output.append(asset.id)
                        elif asset.type == "video":
                            videos_output.append(asset.id)
                        elif asset.type == "audio":
                            audio_output.append(asset.id)
                        elif asset.type == "text":
                            text_output.append(asset.id)
                    else:
                        logger.warning(f"Unsupported MCP content item: {item}")
        
        logger.info(f"MCP module completed: {len(default_output)} assets")
        self._log_info(
            execution_context,
            "MCP tool call completed",
            {
                "server_id": server_id,
                "tool_name": tool_name,
                "result_count": len(default_output)
            }
        )
        
        # Return results
        return {
            "default": default_output,
            "results": default_output,
            "images": images_output,
            "videos": videos_output,
            "audio": audio_output,
            "text": text_output,
            "mcp_server": server_id,
            "tool": tool_name,
            "iterations": iterations
        }

    async def _create_image_asset(
        self,
        url: str,
        prompt: str,
        server_id: str,
        tool_name: str,
        arguments: Dict[str, Any],
        execution_context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Create asset from MCP image result"""
        
        asset_id = f"asset_{uuid.uuid4().hex[:8]}"
        
        asset_data = {
            "id": asset_id,
            "type": "image",
            "url": url,
            "prompt": prompt or arguments.get("prompt", ""),
            "state": "unchecked",
            "archived": False,
            # MCP-specific provider tracking
            "provider": f"mcp_{server_id}",
            "provider_metadata": {
                "mcp_server": server_id,
                "tool": tool_name,
                "arguments": arguments,
                "generation_time": None  # Would need timing
            },
            "quality_metrics": {
                "source": "mcp",
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
            "Registered MCP generated asset",
            {
                "asset_id": asset_id,
                "provider": f"mcp_{server_id}",
                "tool": tool_name,
                "url": url[:120]
            }
        )

        return asset_data

    async def _create_asset_from_content(
        self,
        *,
        item: Dict[str, Any],
        server_id: str,
        tool_name: str,
        tool_arguments: Dict[str, Any],
        source_asset_ids: List[str],
        execution_context: Dict[str, Any]
    ):
        item_type = item.get("type", "data")
        provider_metadata = {
            "mcp_server": server_id,
            "tool": tool_name,
            "arguments": tool_arguments,
            "metadata": item.get("metadata", {})
        }
        base_metadata = {
            "provider": f"mcp_{server_id}",
            "provider_metadata": provider_metadata,
            "source_asset_ids": source_asset_ids
        }

        if item_type == "image":
            base_metadata["prompt"] = item.get("alt") or tool_arguments.get("prompt")
            asset = await self.create_asset(
                asset_type="image",
                url=item.get("url"),
                metadata=base_metadata,
                execution_context=execution_context
            )
            return asset

        if item_type == "video":
            base_metadata["prompt"] = tool_arguments.get("prompt")
            base_metadata["state"] = "N/A"
            asset = await self.create_asset(
                asset_type="video",
                url=item.get("url"),
                metadata=base_metadata,
                execution_context=execution_context
            )
            return asset

        if item_type == "audio":
            asset = await self.create_asset(
                asset_type="audio",
                url=item.get("url"),
                metadata=base_metadata,
                execution_context=execution_context
            )
            return asset

        if item_type == "text":
            asset = await self.create_asset(
                asset_type="text",
                text_content=item.get("text"),
                metadata=base_metadata,
                payload=item,
                execution_context=execution_context
            )
            return asset

        # Generic payload asset
        asset = await self.create_asset(
            asset_type=item_type or "data",
            url=item.get("url"),
            metadata=base_metadata,
            payload=item,
            execution_context=execution_context
        )
        return asset
