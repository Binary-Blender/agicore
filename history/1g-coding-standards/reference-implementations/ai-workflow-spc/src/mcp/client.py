"""MCP Client for connecting to MCP servers via stdio, SSE, or WebSocket"""

import asyncio
import json
import os
import subprocess
import uuid
from enum import Enum
from typing import Dict, Any, List, Optional, AsyncGenerator
from abc import ABC, abstractmethod
import logging

logger = logging.getLogger(__name__)

class MCPTransport(Enum):
    """Supported MCP transport protocols"""
    STDIO = "stdio"
    SSE = "sse"
    WEBSOCKET = "websocket"

class TransportHandler(ABC):
    """Abstract base class for transport handlers"""
    
    @abstractmethod
    async def connect(self) -> None:
        """Establish connection"""
        pass
    
    @abstractmethod
    async def send_request(self, request: Dict[str, Any]) -> None:
        """Send request to server"""
        pass
    
    @abstractmethod
    async def receive_response(self) -> Dict[str, Any]:
        """Receive response from server"""
        pass
    
    @abstractmethod
    async def close(self) -> None:
        """Close connection"""
        pass

class StdioTransportHandler(TransportHandler):
    """Handle stdio transport for MCP servers"""
    
    def __init__(self, command: str, args: List[str] = None, env: Dict[str, str] = None):
        self.command = command
        self.args = args or []
        self.env = {**os.environ, **(env or {})}
        self.process = None
        
    async def connect(self) -> None:
        """Start MCP server process"""
        try:
            self.process = await asyncio.create_subprocess_exec(
                self.command,
                *self.args,
                stdin=asyncio.subprocess.PIPE,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                env=self.env
            )
            logger.info(f"Started MCP server: {self.command} {' '.join(self.args)}")
        except Exception as e:
            logger.error(f"Failed to start MCP server: {e}")
            raise
    
    async def send_request(self, request: Dict[str, Any]) -> None:
        """Send JSON-RPC request via stdin"""
        if not self.process:
            raise RuntimeError("Transport not connected")
        
        request_json = json.dumps(request) + "\n"
        self.process.stdin.write(request_json.encode())
        await self.process.stdin.drain()
        logger.debug(f"Sent request: {request['method']}")
    
    async def receive_response(self) -> Dict[str, Any]:
        """Read JSON-RPC response from stdout"""
        if not self.process:
            raise RuntimeError("Transport not connected")
        
        response_line = await self.process.stdout.readline()
        if not response_line:
            raise RuntimeError("MCP server closed connection")
        
        response = json.loads(response_line.decode())
        logger.debug(f"Received response: {response.get('id', 'notification')}")
        return response
    
    async def close(self) -> None:
        """Terminate MCP server process"""
        if self.process:
            self.process.terminate()
            await self.process.wait()
            logger.info("MCP server process terminated")

class MCPClient:
    """Client for interacting with MCP servers"""
    
    def __init__(self, config: Dict[str, Any], transport: MCPTransport = MCPTransport.STDIO):
        """
        Initialize MCP client
        
        Args:
            config: Server configuration including command, args, env
            transport: Transport protocol to use
        """
        self.config = config
        self.transport_type = transport
        self.transport_handler = None
        self.connected = False
        self.tools = {}
        self.resources = {}
        self.prompts = {}
        self.server_info = {}
        self._request_id = 0
        
    def _next_request_id(self) -> str:
        """Generate next request ID"""
        self._request_id += 1
        return str(self._request_id)
    
    async def connect(self) -> None:
        """Connect to MCP server and initialize"""
        # Create transport handler
        if self.transport_type == MCPTransport.STDIO:
            self.transport_handler = StdioTransportHandler(
                command=self.config.get("command", "python"),
                args=self.config.get("args", []),
                env=self.config.get("env", {})
            )
        else:
            raise NotImplementedError(f"Transport {self.transport_type} not yet implemented")
        
        # Connect transport
        await self.transport_handler.connect()
        
        # Initialize protocol
        await self._initialize()
        
        # Discover capabilities
        await self._discover_capabilities()
        
        self.connected = True
        logger.info(f"Connected to MCP server: {self.server_info}")
    
    async def _initialize(self) -> None:
        """Initialize MCP protocol"""
        request = {
            "jsonrpc": "2.0",
            "id": self._next_request_id(),
            "method": "initialize",
            "params": {
                "protocolVersion": "0.1.0",
                "capabilities": {
                    "roots": {"listChanged": True},
                    "sampling": {}
                },
                "clientInfo": {
                    "name": "ai-workflow-platform",
                    "version": "4.0"
                }
            }
        }
        
        await self.transport_handler.send_request(request)
        response = await self.transport_handler.receive_response()
        
        if "error" in response:
            raise RuntimeError(f"Initialization failed: {response['error']}")
        
        result = response.get("result", {})
        self.server_info = result.get("serverInfo", {})
        logger.info(f"Initialized MCP server: {self.server_info.get('name')} v{self.server_info.get('version')}")
    
    async def _discover_capabilities(self) -> None:
        """Discover available tools, resources, and prompts"""
        # Discover tools
        tools_request = {
            "jsonrpc": "2.0",
            "id": self._next_request_id(),
            "method": "tools/list",
            "params": {}
        }
        
        await self.transport_handler.send_request(tools_request)
        tools_response = await self.transport_handler.receive_response()
        
        if "result" in tools_response:
            tools = tools_response["result"].get("tools", [])
            self.tools = {tool["name"]: tool for tool in tools}
            logger.info(f"Discovered {len(self.tools)} tools: {list(self.tools.keys())}")
        
        # Discover resources (optional)
        try:
            resources_request = {
                "jsonrpc": "2.0",
                "id": self._next_request_id(),
                "method": "resources/list",
                "params": {}
            }
            
            await self.transport_handler.send_request(resources_request)
            resources_response = await self.transport_handler.receive_response()
            
            if "result" in resources_response:
                self.resources = resources_response["result"].get("resources", [])
                logger.info(f"Discovered {len(self.resources)} resources")
        except Exception as e:
            logger.debug(f"Resources not supported: {e}")
    
    async def call_tool(self, tool_name: str, arguments: Dict[str, Any] = None) -> List[Dict[str, Any]]:
        """
        Call a tool on the MCP server

        Args:
            tool_name: Name of the tool to call
            arguments: Tool arguments

        Returns:
            List of content items from the tool response
        """
        if not self.connected:
            await self.connect()

        if tool_name not in self.tools:
            raise ValueError(f"Tool '{tool_name}' not available. Available tools: {list(self.tools.keys())}")

        request = {
            "jsonrpc": "2.0",
            "id": self._next_request_id(),
            "method": "tools/call",
            "params": {
                "name": tool_name,
                "arguments": arguments or {}
            }
        }

        # Log full request details
        logger.info(f"[MCP-REQUEST] Tool: {tool_name}")
        logger.info(f"[MCP-REQUEST] Arguments: {json.dumps(arguments or {}, indent=2)}")
        logger.debug(f"[MCP-REQUEST] Full request: {json.dumps(request, indent=2)}")

        await self.transport_handler.send_request(request)
        response = await self.transport_handler.receive_response()

        # Log full response details
        logger.info(f"[MCP-RESPONSE] Tool: {tool_name}, Request ID: {request['id']}")
        if "error" in response:
            logger.error(f"[MCP-RESPONSE] ERROR: {json.dumps(response['error'], indent=2)}")
            raise RuntimeError(f"Tool call failed: {response['error']}")

        result = response.get("result", {})
        content = result.get("content", [])

        # Log response summary
        logger.info(f"[MCP-RESPONSE] Returned {len(content)} content items")
        for i, item in enumerate(content):
            item_type = item.get("type", "unknown")
            if item_type == "text":
                text_preview = item.get("text", "")[:200]
                logger.info(f"[MCP-RESPONSE] Item {i+1}: type={item_type}, text={text_preview}...")
            elif item_type == "image":
                url = item.get("url", item.get("data", ""))[:100]
                logger.info(f"[MCP-RESPONSE] Item {i+1}: type={item_type}, url={url}...")
            else:
                logger.info(f"[MCP-RESPONSE] Item {i+1}: type={item_type}, data={str(item)[:200]}...")

        # Log full response at debug level
        logger.debug(f"[MCP-RESPONSE] Full response: {json.dumps(response, indent=2)}")

        return content
    
    async def close(self) -> None:
        """Close MCP server connection"""
        if self.transport_handler:
            await self.transport_handler.close()
            self.connected = False
            logger.info("MCP client closed")
    
    async def __aenter__(self):
        """Async context manager entry"""
        await self.connect()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit"""
        await self.close()
