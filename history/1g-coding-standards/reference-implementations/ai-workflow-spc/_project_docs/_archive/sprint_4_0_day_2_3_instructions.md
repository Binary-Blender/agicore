# Sprint 4.0 Days 2-3: MCP Implementation & Provider Testing

## ✅ Day 1 Accomplishments
- **FIXED:** Provider metadata persistence (commit 96942b2)
- **VERIFIED:** All provider fields saving correctly
- **TESTED:** 4 assets with complete Akool provider data
- **READY:** Foundation complete for MCP and A/B testing

---

## 🎯 Day 2 Priority Tasks (Wednesday)

### Task 1: Create Replicate Provider Comparison Workflow
**Owner:** QA Team  
**Timeline:** 2 hours  
**Purpose:** Validate provider framework with real speed/cost comparison

```python
# Step 1: Create test workflow via API
curl -X POST https://ai-workflow-spc.fly.dev/workflows \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Provider Speed Test - Day 2",
    "description": "Akool vs Replicate comparison",
    "modules": [
      {
        "id": "module_1",
        "type": "start",
        "name": "Initialize",
        "config": {"iterations": 2},
        "position": {"x": 100, "y": 50}
      },
      {
        "id": "module_2",
        "type": "image_generation",
        "name": "Generate with Akool",
        "config": {
          "prompt": "a futuristic city skyline at sunset, photorealistic, highly detailed, 8k resolution",
          "apiKey": "[AKOOL_API_KEY]",
          "provider": "akool"
        },
        "position": {"x": 100, "y": 150}
      },
      {
        "id": "module_3",
        "type": "qc_pass_fail",
        "name": "Quality Check",
        "config": {"task_type": "pass_fail"},
        "position": {"x": 100, "y": 250}
      },
      {
        "id": "module_4",
        "type": "end",
        "name": "Complete",
        "config": {},
        "position": {"x": 100, "y": 350}
      }
    ],
    "connections": [
      {
        "from_module_id": "module_1",
        "from_output": "default",
        "to_module_id": "module_2",
        "to_input": "default"
      },
      {
        "from_module_id": "module_2",
        "from_output": "default",
        "to_module_id": "module_3",
        "to_input": "default"
      },
      {
        "from_module_id": "module_3",
        "from_output": "pass",
        "to_module_id": "module_4",
        "to_input": "default"
      }
    ]
  }'

# Step 2: Execute and time Akool generation
START_TIME=$(date +%s)
curl -X POST https://ai-workflow-spc.fly.dev/workflows/[WORKFLOW_ID]/execute \
  -d '{"parameters": {"iterations": 2}}'
# Record execution_id and timing

# Step 3: Create identical workflow with Replicate
# Change module_2 config to:
{
  "prompt": "a futuristic city skyline at sunset, photorealistic, highly detailed, 8k resolution",
  "provider": "replicate_sdxl",
  "width": 1024,
  "height": 1024,
  "num_inference_steps": 50,
  "guidance_scale": 7.5
}

# Step 4: Execute and compare
# Document timing, cost, and quality differences
```

**Expected Results:**
- Akool: ~15 seconds per image, $0.05 each
- Replicate: ~3 seconds per image, $0.012 each
- Both should have provider metadata persisted

### Task 2: Implement MCP Client Base Class
**Owner:** Backend Team  
**Timeline:** 4 hours  
**Location:** `src/mcp/`

```python
# FILE: src/mcp/__init__.py
"""Model Context Protocol client implementation"""

from .client import MCPClient, MCPTransport
from .registry import MCPServerRegistry

__all__ = ["MCPClient", "MCPTransport", "MCPServerRegistry"]
```

```python
# FILE: src/mcp/client.py
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
        
        await self.transport_handler.send_request(request)
        response = await self.transport_handler.receive_response()
        
        if "error" in response:
            raise RuntimeError(f"Tool call failed: {response['error']}")
        
        result = response.get("result", {})
        content = result.get("content", [])
        
        logger.info(f"Tool {tool_name} returned {len(content)} content items")
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
```

```python
# FILE: src/mcp/registry.py
"""Registry for available MCP servers"""

from typing import Dict, Any, List, Optional
from dataclasses import dataclass
from enum import Enum

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
        
        # Akool MCP wrapper
        self.register(MCPServerConfig(
            id="akool_mcp",
            name="Akool Image Generation",
            description="Generate images using Akool AI (via MCP wrapper)",
            category=MCPServerCategory.IMAGE_GENERATION,
            command="python",
            args=["-m", "mcp_servers.akool.server"],
            env={},
            requires_api_key=True,
            api_key_env_var="AKOOL_API_KEY"
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
```

### Task 3: Create Akool MCP Server Wrapper
**Owner:** Backend Team  
**Timeline:** 3 hours  
**Location:** `mcp_servers/akool/`

```python
# FILE: mcp_servers/akool/server.py
#!/usr/bin/env python3
"""
Akool MCP Server
Wraps Akool API as an MCP server for universal access
"""

import asyncio
import json
import sys
import os
import logging
from typing import Dict, Any, List
import aiohttp
from datetime import datetime

# Configure logging to stderr so it doesn't interfere with stdio protocol
logging.basicConfig(
    level=logging.DEBUG if os.getenv("DEBUG") else logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler(sys.stderr)]
)
logger = logging.getLogger(__name__)

class AkoolMCPServer:
    """MCP server wrapper for Akool image generation API"""
    
    def __init__(self):
        self.api_key = os.environ.get("AKOOL_API_KEY")
        if not self.api_key:
            logger.warning("AKOOL_API_KEY not set, server will require key in requests")
        
        self.api_url = "https://openapi.akool.com/api/open/v3/content/image"
        logger.info("Akool MCP Server initialized")
    
    async def run(self):
        """Main server loop - read from stdin, write to stdout"""
        logger.info("Akool MCP Server starting...")
        
        while True:
            try:
                # Read line from stdin
                line = await asyncio.get_event_loop().run_in_executor(None, sys.stdin.readline)
                
                if not line:
                    logger.info("EOF received, shutting down")
                    break
                
                # Parse JSON-RPC request
                request = json.loads(line.strip())
                logger.debug(f"Received request: {request.get('method')}")
                
                # Handle request
                response = await self.handle_request(request)
                
                # Send response to stdout
                print(json.dumps(response), flush=True)
                
            except json.JSONDecodeError as e:
                logger.error(f"Invalid JSON: {e}")
                error_response = {
                    "jsonrpc": "2.0",
                    "id": None,
                    "error": {
                        "code": -32700,
                        "message": "Parse error",
                        "data": str(e)
                    }
                }
                print(json.dumps(error_response), flush=True)
                
            except Exception as e:
                logger.error(f"Unexpected error: {e}", exc_info=True)
                error_response = {
                    "jsonrpc": "2.0",
                    "id": None,
                    "error": {
                        "code": -32603,
                        "message": "Internal error",
                        "data": str(e)
                    }
                }
                print(json.dumps(error_response), flush=True)
    
    async def handle_request(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """Route request to appropriate handler"""
        method = request.get("method")
        request_id = request.get("id")
        
        handlers = {
            "initialize": self.handle_initialize,
            "tools/list": self.handle_tools_list,
            "tools/call": self.handle_tool_call,
            "resources/list": self.handle_resources_list,
        }
        
        handler = handlers.get(method)
        if not handler:
            return {
                "jsonrpc": "2.0",
                "id": request_id,
                "error": {
                    "code": -32601,
                    "message": f"Method not found: {method}"
                }
            }
        
        try:
            if asyncio.iscoroutinefunction(handler):
                result = await handler(request)
            else:
                result = handler(request)
            
            return {
                "jsonrpc": "2.0",
                "id": request_id,
                "result": result
            }
        except Exception as e:
            logger.error(f"Handler error: {e}", exc_info=True)
            return {
                "jsonrpc": "2.0",
                "id": request_id,
                "error": {
                    "code": -32603,
                    "message": str(e)
                }
            }
    
    def handle_initialize(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """Handle initialize request"""
        return {
            "protocolVersion": "0.1.0",
            "serverInfo": {
                "name": "akool-mcp-server",
                "version": "1.0.0",
                "description": "MCP wrapper for Akool image generation API"
            },
            "capabilities": {
                "tools": {},
                "resources": {}
            }
        }
    
    def handle_tools_list(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """List available tools"""
        return {
            "tools": [
                {
                    "name": "generate_image",
                    "description": "Generate images using Akool AI",
                    "inputSchema": {
                        "type": "object",
                        "properties": {
                            "prompt": {
                                "type": "string",
                                "description": "Text prompt for image generation"
                            },
                            "aspect_ratio": {
                                "type": "string",
                                "description": "Image aspect ratio",
                                "enum": ["1:1", "4:3", "3:4", "16:9", "9:16", "3:2", "2:3"],
                                "default": "1:1"
                            },
                            "api_key": {
                                "type": "string",
                                "description": "Akool API key (optional if AKOOL_API_KEY env var is set)"
                            }
                        },
                        "required": ["prompt"]
                    }
                }
            ]
        }
    
    def handle_resources_list(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """List available resources (none for Akool)"""
        return {"resources": []}
    
    async def handle_tool_call(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """Handle tool execution"""
        params = request.get("params", {})
        tool_name = params.get("name")
        arguments = params.get("arguments", {})
        
        if tool_name != "generate_image":
            raise ValueError(f"Unknown tool: {tool_name}")
        
        # Generate image
        content = await self.generate_image(arguments)
        
        return {"content": content}
    
    async def generate_image(self, args: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Generate image using Akool API"""
        prompt = args.get("prompt")
        if not prompt:
            raise ValueError("Prompt is required")
        
        aspect_ratio = args.get("aspect_ratio", "1:1")
        api_key = args.get("api_key") or self.api_key
        
        if not api_key:
            raise ValueError("API key required: provide in arguments or set AKOOL_API_KEY environment variable")
        
        logger.info(f"Generating image with prompt: {prompt[:50]}...")
        start_time = datetime.now()
        
        async with aiohttp.ClientSession() as session:
            # Submit generation request
            submit_payload = {
                "prompt": prompt,
                "scale": aspect_ratio
            }
            
            headers = {"x-api-key": api_key}
            
            async with session.post(self.api_url, json=submit_payload, headers=headers) as response:
                if response.status != 200:
                    error_text = await response.text()
                    logger.error(f"Akool API error: {response.status} - {error_text}")
                    raise RuntimeError(f"Akool API error: {response.status}")
                
                data = await response.json()
                task_id = data.get("_id")
                
                if not task_id:
                    raise RuntimeError(f"No task ID in response: {data}")
                
                logger.debug(f"Task ID: {task_id}")
            
            # Poll for completion
            max_attempts = 30  # 30 * 2 seconds = 1 minute max
            for attempt in range(max_attempts):
                await asyncio.sleep(2)  # Poll every 2 seconds
                
                status_url = f"{self.api_url}/infobymodelid?image_model_id={task_id}"
                
                async with session.get(status_url, headers=headers) as response:
                    if response.status != 200:
                        logger.warning(f"Status check failed: {response.status}")
                        continue
                    
                    status_data = await response.json()
                    image_status = status_data.get("image_status")
                    
                    logger.debug(f"Status: {image_status} (attempt {attempt + 1}/{max_attempts})")
                    
                    if image_status == 3:  # Completed
                        generation_time = (datetime.now() - start_time).total_seconds()
                        logger.info(f"Image generation completed in {generation_time:.1f}s")
                        
                        # Get image URLs
                        upscaled_urls = status_data.get("upscaled_urls", [])
                        
                        if not upscaled_urls:
                            logger.warning("No images in response")
                            return [{
                                "type": "text",
                                "text": "Image generation completed but no images returned"
                            }]
                        
                        # Return images in MCP content format
                        content = []
                        for i, url in enumerate(upscaled_urls):
                            content.append({
                                "type": "image",
                                "url": url,
                                "alt": f"Generated image {i+1}: {prompt[:100]}"
                            })
                        
                        # Add metadata as text
                        content.append({
                            "type": "text",
                            "text": f"Generated {len(upscaled_urls)} images in {generation_time:.1f}s using Akool"
                        })
                        
                        return content
                    
                    elif image_status == 4:  # Failed
                        logger.error("Image generation failed")
                        return [{
                            "type": "text",
                            "text": f"Image generation failed: {status_data.get('error', 'Unknown error')}"
                        }]
            
            # Timeout
            logger.error("Image generation timed out")
            return [{
                "type": "text",
                "text": "Image generation timed out after 60 seconds"
            }]

async def main():
    """Main entry point"""
    server = AkoolMCPServer()
    await server.run()

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info("Server interrupted by user")
    except Exception as e:
        logger.error(f"Server crashed: {e}", exc_info=True)
        sys.exit(1)
```

```bash
# FILE: mcp_servers/akool/test_server.sh
#!/bin/bash

# Test script for Akool MCP server

echo "Testing Akool MCP Server..."

# Set API key
export AKOOL_API_KEY="your_key_here"

# Test initialize
echo '{"jsonrpc": "2.0", "id": 1, "method": "initialize", "params": {"protocolVersion": "0.1.0"}}' | python -m mcp_servers.akool.server

# Test tools/list
echo '{"jsonrpc": "2.0", "id": 2, "method": "tools/list", "params": {}}' | python -m mcp_servers.akool.server

# Test generate_image
echo '{"jsonrpc": "2.0", "id": 3, "method": "tools/call", "params": {"name": "generate_image", "arguments": {"prompt": "test image"}}}' | python -m mcp_servers.akool.server
```

---

## 🎯 Day 3 Priority Tasks (Thursday)

### Task 4: Test MCP Integration End-to-End
**Owner:** QA Team  
**Timeline:** 2 hours

```python
# FILE: tests/integration/test_mcp_integration.py

import pytest
import asyncio
import json
from src.mcp.client import MCPClient, MCPTransport
from src.mcp.registry import MCPServerRegistry

class TestMCPIntegration:
    """Test MCP client and server integration"""
    
    @pytest.mark.asyncio
    async def test_akool_mcp_server_connection(self):
        """Test connecting to Akool MCP wrapper"""
        
        # Get server config from registry
        registry = MCPServerRegistry()
        config = registry.get("akool_mcp")
        
        # Add API key to environment
        mcp_config = {
            "command": config.command,
            "args": config.args,
            "env": {"AKOOL_API_KEY": os.getenv("AKOOL_API_KEY")}
        }
        
        # Create client
        client = MCPClient(mcp_config, MCPTransport.STDIO)
        
        try:
            # Connect
            await client.connect()
            assert client.connected
            
            # Check server info
            assert client.server_info.get("name") == "akool-mcp-server"
            
            # Check tools
            assert "generate_image" in client.tools
            
            # Test tool call
            result = await client.call_tool("generate_image", {
                "prompt": "MCP integration test image",
                "aspect_ratio": "1:1"
            })
            
            # Should return content
            assert len(result) > 0
            
            # Should have image content
            images = [c for c in result if c["type"] == "image"]
            assert len(images) > 0
            
            print(f"Successfully generated {len(images)} images via MCP")
            
        finally:
            await client.close()
    
    @pytest.mark.asyncio
    async def test_mcp_client_context_manager(self):
        """Test MCP client as async context manager"""
        
        registry = MCPServerRegistry()
        config = registry.get("akool_mcp")
        
        mcp_config = {
            "command": config.command,
            "args": config.args,
            "env": {"AKOOL_API_KEY": os.getenv("AKOOL_API_KEY")}
        }
        
        async with MCPClient(mcp_config) as client:
            assert client.connected
            
            # Quick tool test
            tools = list(client.tools.keys())
            assert len(tools) > 0
        
        # Should be closed after context
        assert not client.connected
    
    @pytest.mark.asyncio
    async def test_mcp_error_handling(self):
        """Test MCP error handling"""
        
        # Create client with invalid command
        bad_config = {
            "command": "nonexistent_command",
            "args": [],
            "env": {}
        }
        
        client = MCPClient(bad_config)
        
        with pytest.raises(Exception):
            await client.connect()
```

### Task 5: Create MCP Module for Workflows
**Owner:** Backend Team  
**Timeline:** 3 hours

```python
# FILE: src/modules/mcp_module.py
"""
MCP Module - Universal module for calling any MCP server
Replaces provider-specific modules with dynamic MCP integration
"""

from typing import Dict, Any, List
from .base import BaseModule
from src.mcp.client import MCPClient, MCPTransport
from src.mcp.registry import MCPServerRegistry
import uuid
import asyncio
import logging

logger = logging.getLogger(__name__)

class MCPModule(BaseModule):
    """Module for calling MCP servers"""
    
    def get_config_schema(self) -> Dict[str, Any]:
        """Dynamic schema based on selected MCP server"""
        return {
            "mcp_server": {
                "type": "select",
                "label": "MCP Server",
                "required": True,
                "options": self._get_available_servers()
            },
            "tool_name": {
                "type": "select",
                "label": "Tool",
                "required": True,
                "depends_on": "mcp_server"
            },
            "tool_arguments": {
                "type": "json",
                "label": "Tool Arguments",
                "required": True,
                "schema_from": "tool_name"
            },
            "api_key": {
                "type": "password",
                "label": "API Key (if required)",
                "required": False
            }
        }
    
    def _get_available_servers(self) -> List[Dict[str, str]]:
        """Get list of available MCP servers"""
        registry = MCPServerRegistry()
        servers = registry.list_all()
        
        return [
            {"value": s.id, "label": s.name}
            for s in servers
        ]
    
    async def execute(self, inputs: Dict[str, Any], execution_context: Dict[str, Any]) -> Dict[str, Any]:
        """Execute MCP tool call"""
        
        # Get configuration
        server_id = self.config.get("mcp_server")
        tool_name = self.config.get("tool_name")
        tool_arguments = self.config.get("tool_arguments", {})
        api_key = self.config.get("api_key")
        
        if not server_id:
            raise ValueError("MCP server not specified")
        if not tool_name:
            raise ValueError("Tool name not specified")
        
        # Get server configuration
        registry = MCPServerRegistry()
        server_config = registry.get(server_id)
        
        if not server_config:
            raise ValueError(f"Unknown MCP server: {server_id}")
        
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
        all_results = []
        
        async with MCPClient(client_config, MCPTransport.STDIO) as client:
            logger.info(f"Connected to MCP server: {server_id}")
            
            # Execute for each iteration
            for i in range(iterations):
                logger.info(f"Executing {tool_name} iteration {i+1}/{iterations}")
                
                # Add iteration context to arguments if needed
                args = dict(tool_arguments)
                if iterations > 1:
                    args["_iteration"] = i + 1
                
                # Call tool
                content = await client.call_tool(tool_name, args)
                
                # Process results based on content type
                for item in content:
                    if item["type"] == "image":
                        # Create asset for image
                        asset = await self._create_image_asset(
                            item["url"],
                            item.get("alt", ""),
                            server_id,
                            tool_name,
                            args,
                            execution_context
                        )
                        all_results.append(asset)
                    
                    elif item["type"] == "text":
                        # Add text to results
                        all_results.append({
                            "type": "text",
                            "content": item["text"],
                            "provider": server_id
                        })
                    
                    else:
                        # Pass through other content types
                        all_results.append(item)
        
        logger.info(f"MCP module completed: {len(all_results)} results")
        
        # Return results
        return {
            "results": all_results,
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
        
        asset_id = str(uuid.uuid4())
        
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
        
        return asset_data
```

### Task 6: API Endpoints for MCP
**Owner:** Backend Team  
**Timeline:** 2 hours

```python
# FILE: src/api/mcp_endpoints.py
"""API endpoints for MCP functionality"""

from fastapi import APIRouter, HTTPException, Depends
from typing import List, Dict, Any
from src.mcp.registry import MCPServerRegistry, MCPServerCategory
from src.mcp.client import MCPClient, MCPTransport
import logging

router = APIRouter(prefix="/mcp", tags=["MCP"])
logger = logging.getLogger(__name__)

@router.get("/servers")
async def list_mcp_servers(category: MCPServerCategory = None) -> Dict[str, Any]:
    """List available MCP servers"""
    registry = MCPServerRegistry()
    
    if category:
        servers = registry.list_by_category(category)
    else:
        servers = registry.list_all()
    
    return {
        "servers": [
            {
                "id": s.id,
                "name": s.name,
                "description": s.description,
                "category": s.category.value,
                "requires_api_key": s.requires_api_key
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
            "api_key_env_var": server.api_key_env_var
        }
    }

@router.get("/servers/{server_id}/tools")
async def get_mcp_server_tools(server_id: str, api_key: str = None) -> Dict[str, Any]:
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
                    "input_schema": tool_info.get("inputSchema", {})
                })
            
            return {
                "server_id": server_id,
                "server_name": server.name,
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
    api_key: str = None
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
    
    if server.requires_api_key and api_key:
        client_config["env"][server.api_key_env_var] = api_key
    
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

# Add router to main app
# In src/main_workflow_db.py:
# from src.api.mcp_endpoints import router as mcp_router
# app.include_router(mcp_router)
```

---

## 📊 Testing & Validation Checklist

### Day 2 Completion Criteria
- [ ] Provider comparison workflow created and executed
- [ ] Timing documented: Akool vs Replicate
- [ ] Cost calculation verified
- [ ] MCP client base class implemented
- [ ] Akool MCP server wrapper created
- [ ] Basic MCP tests passing

### Day 3 Completion Criteria
- [ ] MCP integration tested end-to-end
- [ ] MCP module for workflows implemented
- [ ] API endpoints for MCP working
- [ ] Can discover tools from MCP servers
- [ ] Can execute tools via MCP
- [ ] Provider metadata includes MCP tracking

### Performance Targets
- [ ] Akool generation: ~15 seconds
- [ ] Replicate generation: ~3 seconds (via provider, future via MCP)
- [ ] MCP overhead: <100ms per call
- [ ] Tool discovery: <500ms

### Quality Gates
- [ ] All tests passing
- [ ] No regression in existing workflows
- [ ] Provider metadata persisting correctly
- [ ] MCP servers starting/stopping cleanly

---

## 🚀 Next Steps (Day 4-6)

Once MCP foundation is complete, move to:

1. **A/B Testing Module**
   - Side-by-side comparison UI
   - Statistical significance calculations
   - Provider selection tracking

2. **More MCP Servers**
   - Replicate official MCP server
   - Claude MCP integration
   - DALL-E wrapper

3. **TPS UI Components**
   - Job instruction table
   - Andon board
   - Mobile responsive design

---

## 🐛 Troubleshooting Guide

### MCP Server Won't Start
```bash
# Check Python path
which python

# Test server directly
AKOOL_API_KEY=xxx python -m mcp_servers.akool.server

# Check for port conflicts
lsof -i :8000

# Enable debug logging
DEBUG=1 python -m mcp_servers.akool.server
```

### MCP Client Connection Issues
```python
# Test with minimal config
config = {
    "command": "echo",
    "args": ["test"],
    "env": {}
}
client = MCPClient(config)
await client.connect()  # Should fail gracefully
```

### Provider Metadata Not Saving
```sql
-- Check database directly
SELECT id, provider, provider_metadata 
FROM assets 
WHERE created_at > NOW() - INTERVAL '1 hour';

-- Verify columns exist
\d assets
```

---

## 📈 Success Metrics

By end of Day 3, you should have:

1. **Provider Framework**: ✅ COMPLETE (Day 1)
2. **MCP Foundation**: 🔄 IN PROGRESS
   - Client implementation
   - Server wrappers
   - API integration
3. **Testing Coverage**: 
   - Provider comparison data
   - MCP integration tests
   - End-to-end validation

Keep the momentum going! The foundation you're building will revolutionize how the platform handles AI services. 🚀