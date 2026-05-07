"""API endpoints for MCP functionality"""

from fastapi import APIRouter, HTTPException, Query, Depends
from typing import List, Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from src.mcp.registry import MCPServerRegistry, MCPServerCategory, MCPServerConfig
from src.mcp.client import MCPClient, MCPTransport
from src.database.connection import get_db
from src.database.repositories import MCPServerRepository
import logging
import os

router = APIRouter(prefix="/mcp", tags=["MCP"])
logger = logging.getLogger(__name__)
DEFAULT_PREINSTALLED_SERVERS = {"akool", "dalle"}


def _static_server_catalog() -> List[Dict[str, Any]]:
    """Return the static catalog of MCP servers exposed in the marketplace."""
    return [
        {
            "id": "akool",
            "name": "Akool",
            "category": "image_generation",
            "icon": "🎭",
            "description": "AI image & video generation",
            "tools": [],
            "status": "installed"
        },
        {
            "id": "dalle",
            "name": "DALL-E 3",
            "category": "image_generation",
            "icon": "🎨",
            "description": "OpenAI's image generation",
            "tools": [],
            "status": "installed"
        },
        {
            "id": "github-copilot",
            "name": "GitHub Copilot",
            "category": "code_development",
            "icon": "💻",
            "description": "AI pair programmer",
            "status": "installed",
            "tools": [
                {
                    "name": "suggest_code",
                    "description": "Generate code suggestions for a prompt",
                    "input_schema": {
                        "type": "object",
                        "properties": {
                            "language": {
                                "type": "string",
                                "description": "Programming language (e.g. python, typescript)"
                            },
                            "prompt": {
                                "type": "string",
                                "description": "Describe what you want the code to do"
                            }
                        },
                        "required": ["language", "prompt"]
                    },
                    "metadata": {
                        "output_types": ["text"],
                        "builder": {
                            "visible": True,
                            "display_name": "Copilot Code Suggestions",
                            "icon": "💻",
                            "description": "Use GitHub Copilot to draft code in your target language",
                            "category": "code_development",
                            "default_arguments": {
                                "language": "python",
                                "prompt": ""
                            },
                            "field_overrides": {
                                "prompt": {"ui_kind": "prompt", "rows": 8}
                            }
                        }
                    }
                },
                {
                    "name": "review_diff",
                    "description": "Review a code diff and highlight potential issues",
                    "input_schema": {
                        "type": "object",
                        "properties": {
                            "diff": {
                                "type": "string",
                                "description": "Unified diff text to review"
                            },
                            "severity": {
                                "type": "string",
                                "enum": ["info", "warn", "error"],
                                "default": "warn",
                                "description": "Minimum severity to report"
                            }
                        },
                        "required": ["diff"]
                    },
                    "metadata": {
                        "output_types": ["text"],
                        "builder": {
                            "visible": True,
                            "display_name": "Copilot Diff Review",
                            "icon": "🧪",
                            "description": "Lint a diff and enumerate risky changes",
                            "category": "code_development",
                            "default_arguments": {
                                "severity": "warn"
                            },
                            "field_overrides": {
                                "diff": {"ui_kind": "prompt", "rows": 6}
                            }
                        }
                    }
                }
            ]
        },
        {
            "id": "whisper-asr",
            "name": "Whisper ASR",
            "category": "audio_voice",
            "icon": "🎙️",
            "description": "Speech recognition",
            "status": "installed",
            "tools": [
                {
                    "name": "transcribe",
                    "description": "Transcribe audio from a URL",
                    "input_schema": {
                        "type": "object",
                        "properties": {
                            "audio_url": {
                                "type": "string",
                                "description": "Public URL to an audio file"
                            },
                            "language": {
                                "type": "string",
                                "description": "Language hint (e.g. en, es)",
                                "default": "en"
                            }
                        },
                        "required": ["audio_url"]
                    },
                    "metadata": {
                        "output_types": ["text"],
                        "builder": {
                            "visible": True,
                            "display_name": "Whisper Transcription",
                            "icon": "🎙️",
                            "description": "Turn hosted audio into reviewable transcripts",
                            "category": "audio_voice",
                            "default_arguments": {
                                "language": "en"
                            }
                        }
                    }
                }
            ]
        }
    ]


def _get_catalog_entry(server_id: str) -> Optional[Dict[str, Any]]:
    for entry in _static_server_catalog():
        if entry["id"] == server_id:
            return entry
    return None

@router.get("/servers")
async def list_mcp_servers(category: Optional[str] = None) -> Dict[str, Any]:
    """List available MCP servers"""
    registry = MCPServerRegistry()
    
    if category:
        try:
            cat_enum = MCPServerCategory(category)
            servers = registry.list_by_category(cat_enum)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid category: {category}")
    else:
        servers = registry.list_all()
    
    return {
        "servers": [
            {
                "id": s.id,
                "name": s.name,
                "description": s.description,
                "category": s.category.value,
                "requires_api_key": s.requires_api_key,
                "command": s.command
            }
            for s in servers
        ],
        "total": len(servers)
    }

@router.get("/servers/{server_id}")
async def get_mcp_server(server_id: str) -> Dict[str, Any]:
    """Get details for a specific MCP server"""
    registry = MCPServerRegistry()
    server = registry.get(server_id)
    
    if not server:
        raise HTTPException(status_code=404, detail=f"MCP server {server_id} not found")
    
    return {
        "server": {
            "id": server.id,
            "name": server.name,
            "description": server.description,
            "category": server.category.value,
            "requires_api_key": server.requires_api_key,
            "api_key_env_var": server.api_key_env_var,
            "command": server.command,
            "args": server.args
        }
    }

@router.get("/servers/{server_id}/tools")
async def get_mcp_server_tools(
    server_id: str, 
    api_key: Optional[str] = Query(None, description="API key if required")
) -> Dict[str, Any]:
    """Discover tools available in an MCP server"""
    registry = MCPServerRegistry()
    server = registry.get(server_id)
    
    if not server:
        raise HTTPException(status_code=404, detail=f"MCP server {server_id} not found")
    
    # Prepare client configuration
    client_config = {
        "command": server.command,
        "args": server.args,
        "env": dict(server.env)
    }
    
    # Add API key if required
    if server.requires_api_key:
        if api_key:
            client_config["env"][server.api_key_env_var] = api_key
        elif server.api_key_env_var in os.environ:
            client_config["env"][server.api_key_env_var] = os.environ[server.api_key_env_var]
        else:
            raise HTTPException(
                status_code=400,
                detail=f"API key required for {server.name}"
            )
    
    try:
        # Connect to MCP server and discover tools
        async with MCPClient(client_config, MCPTransport.STDIO) as client:
            tools = []
            for tool_name, tool_info in client.tools.items():
                tools.append({
                    "name": tool_name,
                    "description": tool_info.get("description", ""),
                    "input_schema": tool_info.get("inputSchema", {}),
                    "metadata": tool_info.get("metadata", {})
                })
            
            return {
                "server_id": server_id,
                "server_name": server.name,
                "server_version": client.server_info.get("version"),
                "tools": tools,
                "total": len(tools)
            }
    
    except Exception as e:
        logger.error(f"Failed to connect to MCP server {server_id}: {e}")
        raise HTTPException(
            status_code=503,
            detail=f"Failed to connect to MCP server: {str(e)}"
        )

@router.post("/servers/{server_id}/test")
async def test_mcp_server(
    server_id: str,
    tool_name: str,
    arguments: Dict[str, Any] = None,
    api_key: Optional[str] = None
) -> Dict[str, Any]:
    """Test an MCP server by calling a tool"""
    registry = MCPServerRegistry()
    server = registry.get(server_id)
    
    if not server:
        raise HTTPException(status_code=404, detail=f"MCP server {server_id} not found")
    
    # Prepare client configuration
    client_config = {
        "command": server.command,
        "args": server.args,
        "env": dict(server.env)
    }
    
    # Add API key if required
    if server.requires_api_key:
        if api_key:
            client_config["env"][server.api_key_env_var] = api_key
        elif server.api_key_env_var in os.environ:
            client_config["env"][server.api_key_env_var] = os.environ[server.api_key_env_var]
    
    try:
        async with MCPClient(client_config, MCPTransport.STDIO) as client:
            # Call the tool
            content = await client.call_tool(tool_name, arguments or {})
            
            return {
                "server_id": server_id,
                "tool": tool_name,
                "arguments": arguments,
                "content": content,
                "success": True
            }
    
    except Exception as e:
        logger.error(f"MCP test failed: {e}")
        return {
            "server_id": server_id,
            "tool": tool_name,
            "arguments": arguments,
            "error": str(e),
            "success": False
        }

async def _discover_server_tools(server_config: MCPServerConfig) -> List[Dict[str, Any]]:
    """Attempt to discover tool schemas for a registered MCP server."""
    client_config = {
        "command": server_config.command,
        "args": server_config.args,
        "env": dict(server_config.env)
    }

    try:
        async with MCPClient(client_config, MCPTransport.STDIO) as client:
            tools = []
            for tool_name, tool_info in client.tools.items():
                tool = {
                    "name": tool_name,
                    "description": tool_info.get("description", ""),
                    "input_schema": tool_info.get("inputSchema", {}),
                    "metadata": tool_info.get("metadata", {}),
                }
                tools.append(_augment_tool_metadata(
                    tool,
                    default_category=server_config.category.value
                ))
            return tools
    except Exception as exc:
        logger.warning(f"Failed to discover tools for {server_config.id}: {exc}")
        return []


def _augment_tool_metadata(
    tool: Dict[str, Any],
    default_icon: Optional[str] = None,
    default_category: Optional[str] = None
) -> Dict[str, Any]:
    """Ensure tools carry normalized builder metadata for the UI."""
    tool_copy = dict(tool)
    metadata = dict(tool_copy.get("metadata") or {})
    builder_meta = dict(metadata.get("builder") or {})

    if default_icon and not builder_meta.get("icon"):
        builder_meta["icon"] = default_icon

    if default_category and not builder_meta.get("category"):
        builder_meta["category"] = default_category

    builder_meta.setdefault("visible", True)
    field_overrides = builder_meta.get("field_overrides")
    if field_overrides is None or not isinstance(field_overrides, dict):
        builder_meta["field_overrides"] = {}
    metadata["builder"] = builder_meta
    tool_copy["metadata"] = metadata
    return tool_copy


def _is_tool_visible(tool: Dict[str, Any]) -> bool:
    """Return True if the tool should appear as an individual builder module."""
    metadata = tool.get("metadata") or {}
    builder_meta = metadata.get("builder") or {}
    if builder_meta.get("visible") is False:
        return False
    if builder_meta.get("hidden") is True:
        return False
    return True


@router.post("/servers/{server_id}/install")
async def install_mcp_server(
    server_id: str,
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """Mark an MCP server as installed so its tools appear in the builder."""
    if not _get_catalog_entry(server_id):
        raise HTTPException(status_code=404, detail=f"MCP server '{server_id}' not found in catalog")

    repo = MCPServerRepository(db)
    record = await repo.mark_installed(server_id)
    return {"server_id": server_id, "status": record.status}


@router.post("/servers/{server_id}/uninstall")
async def uninstall_mcp_server(
    server_id: str,
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """Mark an MCP server as uninstalled to remove its tools from the builder."""
    if not _get_catalog_entry(server_id):
        raise HTTPException(status_code=404, detail=f"MCP server '{server_id}' not found in catalog")

    repo = MCPServerRepository(db)
    record = await repo.mark_uninstalled(server_id)
    return {"server_id": server_id, "status": record.status}


@router.get("/installed-servers")
async def get_installed_mcp_servers(db: AsyncSession = Depends(get_db)) -> Dict[str, Any]:
    """
    Return list of installed/available MCP servers for the workflow builder.
    Includes discovered tool schemas when available so the UI can render config forms.
    """
    registry = MCPServerRegistry()
    repo = MCPServerRepository(db)
    status_map = await repo.list_status_map()
    enriched_servers = []

    for server in _static_server_catalog():
        entry = dict(server)
        server_id = entry["id"]
        status = status_map.get(server_id)
        if status is None:
            status = "installed" if server_id in DEFAULT_PREINSTALLED_SERVERS else "not_installed"

        entry["status"] = status
        entry["installed"] = status != "not_installed"

        tools = [
            _augment_tool_metadata(
                tool,
                default_icon=entry.get("icon"),
                default_category=entry.get("category")
            )
            for tool in entry.get("tools", [])
        ]

        server_config = registry.get(server_id)
        if server_config:
            discovered = await _discover_server_tools(server_config)
            if discovered:
                tools = [
                    _augment_tool_metadata(
                        tool,
                        default_icon=entry.get("icon"),
                        default_category=server_config.category.value
                    )
                    for tool in discovered
                ]

        tools = [tool for tool in tools if _is_tool_visible(tool)]
        entry["tools"] = tools
        entry["tools_count"] = len(tools)
        enriched_servers.append(entry)

    return {"servers": enriched_servers}
