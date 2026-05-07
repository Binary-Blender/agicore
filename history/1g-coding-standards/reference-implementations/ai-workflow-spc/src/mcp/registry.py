"""Registry for available MCP servers"""

from typing import Dict, Any, List, Optional
from dataclasses import dataclass
from enum import Enum
import os

class MCPServerCategory(Enum):
    """Categories of MCP servers"""
    IMAGE_GENERATION = "image_generation"
    TEXT_GENERATION = "text_generation"
    AUDIO = "audio"
    VIDEO = "video"
    DATA = "data"
    UTILITY = "utility"

@dataclass
class MCPServerConfig:
    """Configuration for an MCP server"""
    id: str
    name: str
    description: str
    category: MCPServerCategory
    command: str
    args: List[str]
    env: Dict[str, str]
    requires_api_key: bool = False
    api_key_env_var: str = None
    
class MCPServerRegistry:
    """Registry of available MCP servers"""
    
    def __init__(self):
        self._servers = {}
        self._register_default_servers()
    
    def _register_default_servers(self):
        """Register built-in MCP servers"""

        # Get the absolute path to the mcp_servers directory
        base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        akool_server_path = os.path.join(base_dir, "mcp_servers", "akool", "server.py")
        dalle_server_path = os.path.join(base_dir, "mcp_servers", "dalle", "server.py")

        # Akool MCP wrapper
        self.register(MCPServerConfig(
            id="akool",
            name="Akool Image Generation",
            description="Generate images using Akool AI (via MCP wrapper)",
            category=MCPServerCategory.IMAGE_GENERATION,
            command="python3",
            args=[akool_server_path],
            env={},
            requires_api_key=True,
            api_key_env_var="AKOOL_API_KEY"
        ))

        # DALL-E MCP wrapper
        self.register(MCPServerConfig(
            id="dalle",
            name="DALL-E 3 Image Generation",
            description="Generate images using DALL-E 3 via MCP wrapper",
            category=MCPServerCategory.IMAGE_GENERATION,
            command="python3",
            args=[dalle_server_path],
            env={},
            requires_api_key=True,
            api_key_env_var="OPENAI_API_KEY"
        ))

        # Replicate MCP (when available)
        self.register(MCPServerConfig(
            id="replicate_mcp",
            name="Replicate Models",
            description="Access Replicate's model library",
            category=MCPServerCategory.IMAGE_GENERATION,
            command="npx",
            args=["@modelcontextprotocol/server-replicate"],
            env={},
            requires_api_key=True,
            api_key_env_var="REPLICATE_API_KEY"
        ))
    
    def register(self, config: MCPServerConfig) -> None:
        """Register an MCP server"""
        self._servers[config.id] = config
    
    def get(self, server_id: str) -> Optional[MCPServerConfig]:
        """Get MCP server configuration"""
        return self._servers.get(server_id)
    
    def list_all(self) -> List[MCPServerConfig]:
        """List all registered MCP servers"""
        return list(self._servers.values())
    
    def list_by_category(self, category: MCPServerCategory) -> List[MCPServerConfig]:
        """List MCP servers by category"""
        return [s for s in self._servers.values() if s.category == category]
