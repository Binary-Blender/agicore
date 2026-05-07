# Sprint 4.0: MCP-Powered Workflow Platform & A/B Testing QC Framework
**Sprint Duration:** 2 weeks  
**Version Target:** v4.0  
**Priority:** High  
**Strategic Goal:** Build MCP-based make.com for AI with SPC-based human QC

---

## Executive Summary

This sprint transforms the platform into an MCP (Model Context Protocol) orchestrator, enabling integration with thousands of existing MCP servers/components while maintaining human quality control checkpoints. We'll demonstrate this with image generation (Akool via custom MCP server + Replicate via MCP) and A/B testing, but the architecture supports ANY MCP-compatible service.

### Strategic Vision Alignment
- **Platform Goal:** Make.com for AI using MCP components with human-in-the-loop QC
- **Integration Strategy:** MCP as the universal protocol for all AI services
- **Quality Philosophy:** Statistical Process Control (SPC) for consistent output quality
- **Extensibility:** Connect any MCP server - text, image, audio, data, APIs, databases
- **This Sprint:** MCP client implementation + A/B testing for MCP outputs

---

## Sprint Overview

### Primary Objectives
1. **MCP Client Implementation** - Core MCP client for connecting to any MCP server
2. **MCP Server Registry** - Dynamic discovery and management of MCP servers
3. **MCP-based Modules** - Workflow modules that execute MCP tool calls
4. **Akool MCP Wrapper** - Wrap existing Akool API as MCP server
5. **Replicate MCP Integration** - Use/create Replicate MCP server
6. **A/B Testing for MCP Outputs** - Compare results from different MCP servers
7. **SPC Foundation** - Quality metrics for MCP server performance

### Success Criteria
- ✅ Platform can connect to any MCP server via stdio, SSE, or WebSocket
- ✅ Users can add MCP servers to their workflow palette
- ✅ Workflow modules can execute MCP tool calls
- ✅ A/B testing works across different MCP servers
- ✅ Both Akool and Replicate working through MCP
- ✅ Quality metrics tracked per MCP server
- ✅ Foundation for connecting 1000s of MCP components

---

## MCP Integration Architecture

### Why MCP?
MCP (Model Context Protocol) provides a standardized way to connect to AI services, APIs, and tools. With thousands of MCP servers already available, this transforms our platform into a universal AI orchestrator.

### MCP Benefits for Our Platform
1. **Instant Access** to thousands of existing components
2. **Standardized Interface** for all integrations  
3. **Built-in Tool Discovery** via MCP protocol
4. **Resource Management** for context and files
5. **Unified Auth** handling across services
6. **Community Ecosystem** of pre-built servers

---

## Technical Architecture

### 1. MCP Client Framework

#### 1.1 Core MCP Client Implementation
```python
# src/mcp/client.py
import asyncio
import json
from typing import Dict, Any, List, Optional, Callable
from enum import Enum
import aiohttp
from abc import ABC, abstractmethod

class MCPTransport(Enum):
    STDIO = "stdio"
    SSE = "sse" 
    WEBSOCKET = "websocket"

class MCPClient:
    """Universal MCP client for connecting to any MCP server"""
    
    def __init__(self, 
                 server_config: Dict[str, Any],
                 transport: MCPTransport = MCPTransport.STDIO):
        self.server_config = server_config
        self.transport = transport
        self.tools: Dict[str, Any] = {}
        self.resources: Dict[str, Any] = {}
        self.connected = False
        self._transport_handler = self._create_transport_handler()
        
    async def connect(self):
        """Initialize connection to MCP server"""
        await self._transport_handler.connect()
        
        # Initialize handshake
        response = await self.request("initialize", {
            "protocolVersion": "0.1.0",
            "capabilities": {
                "tools": True,
                "resources": True,
                "prompts": True,
                "logging": True
            },
            "clientInfo": {
                "name": "ai-workflow-platform",
                "version": "4.0"
            }
        })
        
        # Discover available tools
        tools_response = await self.request("tools/list", {})
        self.tools = {tool["name"]: tool for tool in tools_response.get("tools", [])}
        
        # Discover available resources  
        resources_response = await self.request("resources/list", {})
        self.resources = {r["uri"]: r for r in resources_response.get("resources", [])}
        
        self.connected = True
        return True
        
    async def call_tool(self, tool_name: str, arguments: Dict[str, Any]) -> Dict[str, Any]:
        """Call a tool on the MCP server"""
        if not self.connected:
            await self.connect()
            
        if tool_name not in self.tools:
            raise ValueError(f"Tool {tool_name} not available on this server")
            
        response = await self.request("tools/call", {
            "name": tool_name,
            "arguments": arguments
        })
        
        return response.get("content", [])
    
    async def read_resource(self, uri: str) -> Any:
        """Read a resource from the MCP server"""
        response = await self.request("resources/read", {"uri": uri})
        return response.get("contents", [])
    
    async def request(self, method: str, params: Dict[str, Any]) -> Dict[str, Any]:
        """Send request to MCP server"""
        return await self._transport_handler.request(method, params)
    
    def _create_transport_handler(self):
        """Create appropriate transport handler"""
        if self.transport == MCPTransport.STDIO:
            return StdioTransport(self.server_config)
        elif self.transport == MCPTransport.SSE:
            return SSETransport(self.server_config)
        elif self.transport == MCPTransport.WEBSOCKET:
            return WebSocketTransport(self.server_config)
        else:
            raise ValueError(f"Unsupported transport: {self.transport}")

class StdioTransport:
    """Handle stdio-based MCP communication (for local servers)"""
    
    def __init__(self, config: Dict[str, Any]):
        self.command = config["command"]
        self.args = config.get("args", [])
        self.env = config.get("env", {})
        self.process: Optional[asyncio.subprocess.Process] = None
        self._request_id = 0
        
    async def connect(self):
        """Start the MCP server process"""
        self.process = await asyncio.create_subprocess_exec(
            self.command,
            *self.args,
            stdin=asyncio.subprocess.PIPE,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            env={**os.environ, **self.env}
        )
    
    async def request(self, method: str, params: Dict[str, Any]) -> Dict[str, Any]:
        """Send JSON-RPC request via stdio"""
        self._request_id += 1
        request = {
            "jsonrpc": "2.0",
            "id": self._request_id,
            "method": method,
            "params": params
        }
        
        # Send request
        request_line = json.dumps(request) + "\n"
        self.process.stdin.write(request_line.encode())
        await self.process.stdin.drain()
        
        # Read response
        response_line = await self.process.stdout.readline()
        response = json.loads(response_line.decode())
        
        if "error" in response:
            raise Exception(f"MCP Error: {response['error']}")
            
        return response.get("result", {})

class SSETransport:
    """Handle SSE-based MCP communication (for HTTP servers)"""
    
    def __init__(self, config: Dict[str, Any]):
        self.base_url = config["url"]
        self.headers = config.get("headers", {})
        self.session: Optional[aiohttp.ClientSession] = None
        
    async def connect(self):
        """Initialize HTTP session"""
        self.session = aiohttp.ClientSession()
    
    async def request(self, method: str, params: Dict[str, Any]) -> Dict[str, Any]:
        """Send request via HTTP/SSE"""
        async with self.session.post(
            f"{self.base_url}/{method}",
            json=params,
            headers=self.headers
        ) as response:
            return await response.json()
```

#### 1.2 MCP Server Registry
```python
# src/mcp/registry.py
from typing import Dict, List, Optional
import yaml
import json

class MCPServerRegistry:
    """Registry of available MCP servers that can be used in workflows"""
    
    def __init__(self):
        self.servers: Dict[str, MCPServerConfig] = {}
        self._load_builtin_servers()
        
    def _load_builtin_servers(self):
        """Load pre-configured MCP servers"""
        
        # Akool MCP Wrapper (we'll create this)
        self.register_server(MCPServerConfig(
            id="akool_mcp",
            name="Akool Image Generation",
            description="Generate images using Akool AI",
            transport=MCPTransport.STDIO,
            config={
                "command": "python",
                "args": ["-m", "mcp_servers.akool"],
                "env": {}
            },
            category="image_generation",
            requires_api_key=True
        ))
        
        # Replicate MCP Server
        self.register_server(MCPServerConfig(
            id="replicate_mcp",
            name="Replicate Models",
            description="Access Replicate's model library",
            transport=MCPTransport.STDIO,
            config={
                "command": "npx",
                "args": ["-y", "@modelcontextprotocol/server-replicate"],
                "env": {}
            },
            category="image_generation",
            requires_api_key=True
        ))
        
        # Example: Anthropic MCP
        self.register_server(MCPServerConfig(
            id="anthropic_mcp",
            name="Claude AI",
            description="Text generation with Claude",
            transport=MCPTransport.SSE,
            config={
                "url": "https://api.anthropic.com/v1/mcp",
                "headers": {}
            },
            category="text_generation",
            requires_api_key=True
        ))
        
        # Example: Database MCP
        self.register_server(MCPServerConfig(
            id="postgres_mcp",
            name="PostgreSQL",
            description="Query PostgreSQL databases",
            transport=MCPTransport.STDIO,
            config={
                "command": "mcp-server-postgres",
                "args": [],
                "env": {}
            },
            category="database",
            requires_connection_string=True
        ))
    
    def register_server(self, config: MCPServerConfig):
        """Register a new MCP server"""
        self.servers[config.id] = config
    
    def get_server(self, server_id: str) -> Optional[MCPServerConfig]:
        """Get server configuration by ID"""
        return self.servers.get(server_id)
    
    def list_servers(self, category: Optional[str] = None) -> List[MCPServerConfig]:
        """List all registered servers, optionally filtered by category"""
        servers = list(self.servers.values())
        if category:
            servers = [s for s in servers if s.category == category]
        return servers
    
    async def discover_server_tools(self, server_id: str, api_key: Optional[str] = None) -> List[Dict]:
        """Connect to server and discover available tools"""
        config = self.get_server(server_id)
        if not config:
            raise ValueError(f"Unknown server: {server_id}")
            
        # Add API key to environment if needed
        server_config = config.config.copy()
        if config.requires_api_key and api_key:
            server_config.setdefault("env", {})["API_KEY"] = api_key
            
        # Connect and get tools
        client = MCPClient(server_config, config.transport)
        await client.connect()
        return list(client.tools.values())

class MCPServerConfig:
    """Configuration for an MCP server"""
    
    def __init__(self, 
                 id: str,
                 name: str,
                 description: str,
                 transport: MCPTransport,
                 config: Dict[str, Any],
                 category: str,
                 requires_api_key: bool = False,
                 requires_connection_string: bool = False):
        self.id = id
        self.name = name
        self.description = description
        self.transport = transport
        self.config = config
        self.category = category
        self.requires_api_key = requires_api_key
        self.requires_connection_string = requires_connection_string
```

---

### 2. MCP Workflow Module

#### 2.1 Generic MCP Module for Workflows
```python
# src/modules/mcp_module.py
from modules.base import BaseModule
from mcp.client import MCPClient
from mcp.registry import MCPServerRegistry
from typing import Dict, Any, List

class MCPModule(BaseModule):
    """Generic module that executes MCP tool calls"""
    
    def __init__(self, module_id: str, config: Dict[str, Any]):
        super().__init__(module_id, config)
        self.server_id = config.get("mcp_server")
        self.tool_name = config.get("tool_name")
        self.tool_config = config.get("tool_config", {})
        self.api_key = config.get("api_key")
        self.client: Optional[MCPClient] = None
        
    async def execute(self, inputs: Dict[str, Any], execution_context: Dict[str, Any]) -> Dict[str, Any]:
        """Execute MCP tool call"""
        
        # Initialize MCP client if not already connected
        if not self.client:
            registry = MCPServerRegistry()
            server_config = registry.get_server(self.server_id)
            
            if not server_config:
                raise ValueError(f"Unknown MCP server: {self.server_id}")
            
            # Configure with API key if needed
            config = server_config.config.copy()
            if server_config.requires_api_key and self.api_key:
                config.setdefault("env", {})["REPLICATE_API_TOKEN"] = self.api_key
                config.setdefault("env", {})["API_KEY"] = self.api_key
            
            self.client = MCPClient(config, server_config.transport)
            await self.client.connect()
        
        # Prepare tool arguments from config and inputs
        tool_args = self._prepare_tool_arguments(inputs)
        
        # Call the MCP tool
        try:
            result = await self.client.call_tool(self.tool_name, tool_args)
            
            # Process the response based on content type
            outputs = self._process_mcp_response(result)
            
            # Track metrics for SPC
            if self.config.get("track_metrics", True):
                await self._track_metrics(outputs, execution_context)
            
            return {
                "success": True,
                "outputs": outputs,
                "mcp_server": self.server_id,
                "tool": self.tool_name
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "mcp_server": self.server_id,
                "tool": self.tool_name
            }
    
    def _prepare_tool_arguments(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        """Map module config and inputs to MCP tool arguments"""
        args = {}
        
        # Get iterations from previous modules
        iterations = inputs.get("iterations", 1)
        
        # Map configuration to tool arguments
        if self.tool_name == "generate_image":
            args = {
                "prompt": self.tool_config.get("prompt"),
                "model": self.tool_config.get("model", "sdxl"),
                "width": self.tool_config.get("width", 1024),
                "height": self.tool_config.get("height", 1024),
                "num_outputs": iterations
            }
        elif self.tool_name == "generate_text":
            args = {
                "prompt": self.tool_config.get("prompt"),
                "max_tokens": self.tool_config.get("max_tokens", 1000),
                "temperature": self.tool_config.get("temperature", 0.7)
            }
        else:
            # Generic mapping
            args = self.tool_config.copy()
            
        # Override with dynamic inputs if present
        args.update(inputs.get("tool_args", {}))
        
        return args
    
    def _process_mcp_response(self, result: List[Dict]) -> List[Dict]:
        """Process MCP tool response into standardized format"""
        outputs = []
        
        for item in result:
            if item.get("type") == "text":
                outputs.append({
                    "type": "text",
                    "content": item.get("text"),
                    "metadata": {
                        "mcp_server": self.server_id,
                        "tool": self.tool_name
                    }
                })
            elif item.get("type") == "image":
                outputs.append({
                    "type": "image",
                    "url": item.get("data") or item.get("url"),
                    "metadata": {
                        "mcp_server": self.server_id,
                        "tool": self.tool_name,
                        "prompt": self.tool_config.get("prompt")
                    }
                })
            elif item.get("type") == "resource":
                outputs.append({
                    "type": "resource",
                    "uri": item.get("uri"),
                    "content": item.get("text") or item.get("blob"),
                    "metadata": {
                        "mcp_server": self.server_id,
                        "mime_type": item.get("mimeType")
                    }
                })
        
        return outputs
    
    def get_config_schema(self) -> Dict[str, Any]:
        """Dynamic schema based on selected MCP server and tool"""
        # This would be populated dynamically based on tool discovery
        return {
            "mcp_server": {
                "type": "select",
                "label": "MCP Server",
                "required": True,
                "options": []  # Populated from registry
            },
            "tool_name": {
                "type": "select", 
                "label": "Tool",
                "required": True,
                "options": []  # Populated after server selection
            },
            "api_key": {
                "type": "password",
                "label": "API Key (if required)",
                "required": False
            }
            # Tool-specific config added dynamically
        }
```

---

### 3. Akool MCP Server Wrapper

Since Akool doesn't have an MCP server yet, we'll create a wrapper:

```python
# mcp_servers/akool/__init__.py
"""MCP Server wrapper for Akool API"""

import asyncio
import json
import sys
import os
from typing import Dict, Any
import aiohttp

class AkoolMCPServer:
    """MCP server wrapper for Akool image generation"""
    
    def __init__(self):
        self.api_key = os.environ.get("API_KEY", "")
        self.api_url = "https://openapi.akool.com/api/open/v3/content/image"
        
    async def handle_request(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """Handle incoming MCP requests"""
        
        method = request.get("method")
        params = request.get("params", {})
        
        if method == "initialize":
            return self.handle_initialize(params)
        elif method == "tools/list":
            return self.handle_list_tools()
        elif method == "tools/call":
            return await self.handle_tool_call(params)
        else:
            return {"error": {"code": -32601, "message": f"Method not found: {method}"}}
    
    def handle_initialize(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Handle initialization handshake"""
        return {
            "protocolVersion": "0.1.0",
            "capabilities": {
                "tools": True,
                "resources": False,
                "prompts": False
            },
            "serverInfo": {
                "name": "akool-mcp-server",
                "version": "1.0.0"
            }
        }
    
    def handle_list_tools(self) -> Dict[str, Any]:
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
                                "description": "Image generation prompt"
                            },
                            "aspect_ratio": {
                                "type": "string",
                                "enum": ["1:1", "4:3", "3:4", "16:9", "9:16"],
                                "default": "1:1"
                            },
                            "num_outputs": {
                                "type": "integer",
                                "default": 1,
                                "minimum": 1,
                                "maximum": 10
                            }
                        },
                        "required": ["prompt"]
                    }
                }
            ]
        }
    
    async def handle_tool_call(self, params: Dict[str, Any]) -> Dict[str, Any]:
        """Handle tool execution"""
        
        tool_name = params.get("name")
        arguments = params.get("arguments", {})
        
        if tool_name == "generate_image":
            content = await self.generate_image(arguments)
            return {"content": content}
        else:
            return {"error": {"code": -32602, "message": f"Unknown tool: {tool_name}"}}
    
    async def generate_image(self, args: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Generate images using Akool API"""
        
        async with aiohttp.ClientSession() as session:
            # Submit generation request
            response = await session.post(
                self.api_url,
                json={
                    "prompt": args["prompt"],
                    "scale": args.get("aspect_ratio", "1:1")
                },
                headers={"x-api-key": self.api_key}
            )
            data = await response.json()
            task_id = data["_id"]
            
            # Poll for completion
            while True:
                status_response = await session.get(
                    f"{self.api_url}/infobymodelid?image_model_id={task_id}",
                    headers={"x-api-key": self.api_key}
                )
                status_data = await status_response.json()
                
                if status_data["image_status"] == 3:  # Completed
                    # Return MCP-formatted content
                    content = []
                    for url in status_data.get("upscaled_urls", []):
                        content.append({
                            "type": "image",
                            "url": url,
                            "alt": args["prompt"]
                        })
                    return content
                    
                elif status_data["image_status"] == 4:  # Failed
                    return [{"type": "text", "text": "Image generation failed"}]
                    
                await asyncio.sleep(2)
    
    async def run(self):
        """Main loop for stdio communication"""
        while True:
            try:
                line = await asyncio.get_event_loop().run_in_executor(None, sys.stdin.readline)
                if not line:
                    break
                    
                request = json.loads(line)
                response = await self.handle_request(request)
                
                # Add JSON-RPC wrapper
                output = {
                    "jsonrpc": "2.0",
                    "id": request.get("id"),
                    "result": response
                }
                
                print(json.dumps(output))
                sys.stdout.flush()
                
            except Exception as e:
                error_response = {
                    "jsonrpc": "2.0",
                    "id": request.get("id") if 'request' in locals() else None,
                    "error": {
                        "code": -32603,
                        "message": str(e)
                    }
                }
                print(json.dumps(error_response))
                sys.stdout.flush()

if __name__ == "__main__":
    server = AkoolMCPServer()
    asyncio.run(server.run())
```

---

### 4. A/B Testing for MCP Outputs

The A/B testing module remains similar but now compares MCP server outputs:

```python
# src/modules/mcp_ab_testing_module.py
from modules.base import BaseModule
from typing import Dict, Any, List

class MCPABTestingModule(BaseModule):
    """A/B testing module for comparing MCP server outputs"""
    
    async def execute(self, inputs: Dict[str, Any], execution_context: Dict[str, Any]) -> Dict[str, Any]:
        """Prepare MCP outputs for A/B testing"""
        
        # Collect outputs from different MCP servers
        test_items = []
        
        for connection_id, module_output in inputs.items():
            if "outputs" in module_output:
                mcp_server = module_output.get("mcp_server", "unknown")
                tool = module_output.get("tool", "unknown")
                
                for output in module_output["outputs"]:
                    test_items.append({
                        "id": f"{mcp_server}_{tool}_{id(output)}",
                        "type": output.get("type"),
                        "content": output.get("url") or output.get("content"),
                        "source": f"{mcp_server}/{tool}",
                        "metadata": output.get("metadata", {}),
                        "mcp_server": mcp_server,
                        "tool": tool
                    })
        
        # Set up QC task
        execution_context["should_pause"] = True
        execution_context["pause_reason"] = "awaiting_mcp_ab_test"
        execution_context["qc_data"] = {
            "test_items": test_items,
            "comparison_type": self.config.get("comparison_type", "select_best"),
            "display_mode": self.config.get("display_mode", "side_by_side")
        }
        
        return {}
```

---

### 5. Database Schema Updates for MCP

```sql
-- Track MCP server usage
CREATE TABLE mcp_servers (
    id VARCHAR PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    transport VARCHAR(50),  -- 'stdio', 'sse', 'websocket'
    config JSON,  -- Server configuration
    category VARCHAR(100),
    added_by VARCHAR(100),  -- User who added the server
    is_public BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Track MCP tool calls
CREATE TABLE mcp_executions (
    id VARCHAR PRIMARY KEY,
    execution_id VARCHAR REFERENCES workflow_executions(id),
    module_id VARCHAR NOT NULL,
    mcp_server VARCHAR NOT NULL,
    tool_name VARCHAR(255) NOT NULL,
    arguments JSON,
    response JSON,
    duration_ms INTEGER,
    success BOOLEAN,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Update assets table for MCP
ALTER TABLE assets ADD COLUMN mcp_server VARCHAR(100);
ALTER TABLE assets ADD COLUMN mcp_tool VARCHAR(255);

-- MCP server performance metrics
CREATE TABLE mcp_metrics (
    id VARCHAR PRIMARY KEY,
    mcp_server VARCHAR NOT NULL,
    tool_name VARCHAR(255),
    metric_type VARCHAR(50),  -- 'latency', 'success_rate', 'quality_score'
    value FLOAT NOT NULL,
    metadata JSON,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_mcp_metrics_server ON mcp_metrics(mcp_server, recorded_at);
CREATE INDEX idx_mcp_executions_server ON mcp_executions(mcp_server);
```

---

### 6. Frontend Updates for MCP Integration

#### 6.1 MCP Server Management UI
```javascript
// New page: mcp_servers.html
const MCPServerManager = {
    template: `
        <div class="mcp-manager">
            <h2>MCP Server Registry</h2>
            
            <!-- Add new MCP server -->
            <div class="add-server-section">
                <h3>Add MCP Server</h3>
                <select v-model="newServer.type">
                    <option value="stdio">Local (stdio)</option>
                    <option value="sse">HTTP (SSE)</option>
                    <option value="websocket">WebSocket</option>
                </select>
                
                <input v-if="newServer.type === 'stdio'" 
                       v-model="newServer.command"
                       placeholder="Command (e.g., 'npx -y @modelcontextprotocol/server-name')">
                       
                <input v-if="newServer.type !== 'stdio'"
                       v-model="newServer.url"
                       placeholder="Server URL">
                       
                <button @click="testConnection">Test Connection</button>
                <button @click="addServer" :disabled="!connectionTested">Add to Registry</button>
            </div>
            
            <!-- List of available MCP servers -->
            <div class="server-list">
                <h3>Available MCP Servers</h3>
                
                <div v-for="category in serverCategories" :key="category">
                    <h4>{{ category }}</h4>
                    <div v-for="server in serversByCategory[category]" 
                         :key="server.id"
                         class="server-card">
                        <div class="server-info">
                            <strong>{{ server.name }}</strong>
                            <span class="server-id">{{ server.id }}</span>
                            <p>{{ server.description }}</p>
                        </div>
                        <div class="server-tools">
                            <button @click="discoverTools(server.id)">
                                Discover Tools
                            </button>
                            <div v-if="serverTools[server.id]" class="tool-list">
                                <div v-for="tool in serverTools[server.id]" 
                                     :key="tool.name"
                                     class="tool-item">
                                    <code>{{ tool.name }}</code>
                                    <span>{{ tool.description }}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- MCP Server marketplace/discovery -->
            <div class="marketplace">
                <h3>Discover MCP Servers</h3>
                <p>Browse thousands of MCP servers from the community:</p>
                <ul>
                    <li><a href="https://github.com/modelcontextprotocol/servers" target="_blank">Official MCP Servers</a></li>
                    <li><a href="https://mcp.run" target="_blank">MCP Registry</a></li>
                    <li><a href="#" @click="importFromURL">Import from URL</a></li>
                </ul>
            </div>
        </div>
    `,
    data() {
        return {
            servers: [],
            serverTools: {},
            newServer: {
                type: 'stdio',
                command: '',
                url: '',
                name: '',
                description: ''
            },
            connectionTested: false
        }
    },
    computed: {
        serverCategories() {
            return [...new Set(this.servers.map(s => s.category))];
        },
        serversByCategory() {
            return this.servers.reduce((acc, server) => {
                if (!acc[server.category]) acc[server.category] = [];
                acc[server.category].push(server);
                return acc;
            }, {});
        }
    },
    methods: {
        async loadServers() {
            const response = await axios.get('/mcp/servers');
            this.servers = response.data.servers;
        },
        
        async discoverTools(serverId) {
            const apiKey = prompt('Enter API key (if required):');
            const response = await axios.post(`/mcp/servers/${serverId}/discover`, {
                api_key: apiKey
            });
            this.$set(this.serverTools, serverId, response.data.tools);
        },
        
        async testConnection() {
            // Test MCP server connection
            const response = await axios.post('/mcp/test-connection', this.newServer);
            if (response.data.success) {
                this.connectionTested = true;
                alert('Connection successful! Tools discovered: ' + 
                      response.data.tools.map(t => t.name).join(', '));
            }
        },
        
        async addServer() {
            const response = await axios.post('/mcp/servers', this.newServer);
            await this.loadServers();
            this.newServer = { type: 'stdio', command: '', url: '' };
            this.connectionTested = false;
        }
    },
    mounted() {
        this.loadServers();
    }
};
```

#### 6.2 Workflow Builder MCP Module Selection
```javascript
// Update builder.html to include MCP modules
const MCPModulePalette = {
    template: `
        <div class="mcp-palette">
            <h3>MCP Components</h3>
            
            <!-- Quick access to common MCP servers -->
            <div class="quick-mcp">
                <div class="mcp-module-tile" 
                     v-for="server in featuredServers"
                     :key="server.id"
                     @click="addMCPModule(server)"
                     draggable="true"
                     @dragstart="onDragStart($event, server)">
                    <div class="icon">{{ server.icon }}</div>
                    <div class="name">{{ server.name }}</div>
                </div>
            </div>
            
            <!-- Browse all MCP servers -->
            <button @click="showMCPBrowser = true">
                Browse All MCP Servers
            </button>
            
            <!-- MCP Browser Modal -->
            <div v-if="showMCPBrowser" class="mcp-browser-modal">
                <div class="modal-content">
                    <input v-model="searchQuery" placeholder="Search MCP servers...">
                    
                    <div class="server-grid">
                        <div v-for="server in filteredServers"
                             :key="server.id"
                             class="server-option"
                             @click="selectMCPServer(server)">
                            <strong>{{ server.name }}</strong>
                            <p>{{ server.description }}</p>
                            <span class="category">{{ server.category }}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `,
    data() {
        return {
            featuredServers: [
                { id: 'replicate_mcp', name: 'Replicate', icon: '🎨', category: 'image' },
                { id: 'anthropic_mcp', name: 'Claude', icon: '💬', category: 'text' },
                { id: 'github_mcp', name: 'GitHub', icon: '🐙', category: 'code' },
                { id: 'postgres_mcp', name: 'PostgreSQL', icon: '🐘', category: 'database' }
            ],
            allServers: [],
            showMCPBrowser: false,
            searchQuery: ''
        }
    },
    computed: {
        filteredServers() {
            return this.allServers.filter(s => 
                s.name.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
                s.description.toLowerCase().includes(this.searchQuery.toLowerCase())
            );
        }
    },
    methods: {
        addMCPModule(server) {
            // Add MCP module to workflow canvas
            const module = {
                id: `module_${Date.now()}`,
                type: 'mcp_module',
                name: server.name,
                config: {
                    mcp_server: server.id,
                    category: server.category
                },
                position: { x: 100, y: 100 }
            };
            this.$emit('add-module', module);
        }
    }
};
```

---

## Implementation Plan

### Phase 1: MCP Foundation (Days 1-4)
1. **Day 1:** MCP Client Implementation
   - Core MCP client with stdio/SSE/WebSocket support
   - JSON-RPC communication
   - Tool discovery

2. **Day 2:** MCP Server Registry
   - Registry for managing MCP servers
   - Server configuration storage
   - Dynamic tool discovery

3. **Day 3:** Akool MCP Wrapper
   - Create MCP server wrapper for Akool
   - Test with existing workflows
   - Ensure backward compatibility

4. **Day 4:** Replicate MCP Integration
   - Install official Replicate MCP server
   - Test image generation through MCP
   - Compare with Akool wrapper

### Phase 2: Workflow Integration (Days 5-7)
5. **Day 5:** MCP Module Implementation
   - Generic MCP module for workflows
   - Dynamic configuration based on tools
   - Tool argument mapping

6. **Day 6:** A/B Testing for MCP
   - Update A/B testing for MCP outputs
   - Track MCP server performance
   - Quality metrics per server

7. **Day 7:** Database & API Updates
   - Add MCP tables
   - API endpoints for MCP management
   - Tool discovery endpoints

### Phase 3: UI Integration (Days 8-10)
8. **Day 8:** MCP Server Manager UI
   - Add/remove MCP servers
   - Test connections
   - Browse available tools

9. **Day 9:** Workflow Builder Updates
   - MCP module palette
   - Drag-and-drop MCP modules
   - Dynamic tool configuration

10. **Day 10:** Testing & Polish
    - End-to-end MCP workflows
    - A/B testing with multiple MCP servers
    - Performance optimization

---

## MCP Servers to Consider

### Already Available
- **Replicate** - Image/video generation
- **Anthropic** - Claude AI
- **OpenAI** - GPT models
- **GitHub** - Code repositories
- **PostgreSQL** - Database queries
- **Slack** - Messaging
- **Google Drive** - File management
- **Brave Search** - Web search
- **EXA** - Semantic search

### Create Wrappers For
- **Akool** - Image generation (this sprint)
- **ElevenLabs** - Voice synthesis
- **Midjourney** - Image generation
- **Runway** - Video generation
- **Perplexity** - Research

### Future Opportunities
- **Custom MCP servers** for proprietary APIs
- **Composite MCP servers** that chain multiple tools
- **MCP marketplace** within the platform

---

## Success Metrics

### Technical Success
- [ ] MCP client can connect to any standard MCP server
- [ ] Akool and Replicate both working through MCP
- [ ] A/B testing comparing MCP server outputs
- [ ] Tool discovery working dynamically
- [ ] 5+ different MCP servers tested

### Platform Success
- [ ] Users can add any MCP server to their workflow
- [ ] Workflows portable between MCP servers
- [ ] Foundation for 1000s of integrations
- [ ] Clear path to community MCP servers

### Architecture Success
- [ ] Clean separation between MCP and workflow logic
- [ ] Extensible to any MCP server type
- [ ] Performance metrics tracked per server
- [ ] No vendor lock-in

---

## Notes for Claude Code

1. **MCP is the key differentiator** - This makes the platform instantly compatible with thousands of tools
2. **Start with the MCP client** - Get stdio working first, then SSE/WebSocket
3. **Create the Akool wrapper** - Shows how to wrap any API as MCP
4. **Use official Replicate MCP** - Install via `npx -y @modelcontextprotocol/server-replicate`
5. **Keep Replicate API key**: `YOUR_REPLICATE_API_KEY_HERE`
6. **Test with multiple servers** - Try at least 3-4 different MCP servers
7. **Think ecosystem** - This is about building a platform for ALL MCP servers

---

**Sprint Ready for MCP Implementation** ✅

This updated plan transforms your platform into an MCP orchestrator, instantly compatible with thousands of existing MCP servers while maintaining your human QC and SPC vision. The A/B testing now compares outputs from different MCP servers, giving users data-driven insights into which AI services work best for their needs.

---

## Technical Architecture

### 1. Generic API Provider Framework

#### 1.1 Provider Interface (Abstract Base)
```python
# src/providers/base.py
from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional
from enum import Enum

class ProviderType(Enum):
    IMAGE_GENERATION = "image_generation"
    TEXT_GENERATION = "text_generation"
    AUDIO_GENERATION = "audio_generation"
    VIDEO_GENERATION = "video_generation"
    TRANSLATION = "translation"
    CUSTOM = "custom"

class BaseProvider(ABC):
    """Generic interface for all API providers"""
    
    def __init__(self, api_key: str, config: Optional[Dict[str, Any]] = None):
        self.api_key = api_key
        self.config = config or {}
        
    @abstractmethod
    async def execute(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        """Execute the API call and return standardized output"""
        pass
    
    @abstractmethod
    def get_config_schema(self) -> Dict[str, Any]:
        """Return configuration schema for UI form generation"""
        pass
    
    @abstractmethod
    def get_provider_info(self) -> Dict[str, Any]:
        """Return provider metadata (name, type, capabilities, costs, etc.)"""
        pass
    
    @abstractmethod
    def validate_inputs(self, inputs: Dict[str, Any]) -> bool:
        """Validate inputs before execution"""
        pass
    
    def get_quality_metrics(self, output: Any) -> Dict[str, float]:
        """Extract quality metrics for SPC analysis (optional override)"""
        return {}
```

#### 1.2 Provider Registry Pattern
```python
# src/providers/registry.py
class ProviderRegistry:
    """Central registry for all API providers"""
    
    _providers: Dict[str, Type[BaseProvider]] = {}
    
    @classmethod
    def register(cls, provider_id: str, provider_class: Type[BaseProvider]):
        """Register a new provider"""
        cls._providers[provider_id] = provider_class
    
    @classmethod
    def get_provider(cls, provider_id: str, api_key: str, config: Dict = None) -> BaseProvider:
        """Instantiate a provider by ID"""
        if provider_id not in cls._providers:
            raise ValueError(f"Unknown provider: {provider_id}")
        return cls._providers[provider_id](api_key, config)
    
    @classmethod
    def list_providers(cls, provider_type: Optional[ProviderType] = None) -> List[Dict]:
        """List all registered providers, optionally filtered by type"""
        providers = []
        for provider_id, provider_class in cls._providers.items():
            provider_info = provider_class.get_provider_info()
            if provider_type is None or provider_info["type"] == provider_type:
                providers.append({
                    "id": provider_id,
                    **provider_info
                })
        return providers
```

---

### 2. Image Generation Provider Implementations

#### 2.1 Akool Provider (Refactored)
```python
# src/providers/image/akool_provider.py
from providers.base import BaseProvider, ProviderType
import aiohttp
import asyncio

class AkoolProvider(BaseProvider):
    """Akool image generation provider"""
    
    API_URL = "https://openapi.akool.com/api/open/v3/content/image"
    
    async def execute(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        async with aiohttp.ClientSession() as session:
            # Submit generation request
            response = await session.post(
                self.API_URL,
                json={
                    "prompt": inputs["prompt"],
                    "scale": inputs.get("aspect_ratio", "1:1")
                },
                headers={"x-api-key": self.api_key}
            )
            data = await response.json()
            task_id = data["_id"]
            
            # Poll for completion
            while True:
                status_response = await session.get(
                    f"{self.API_URL}/infobymodelid?image_model_id={task_id}",
                    headers={"x-api-key": self.api_key}
                )
                status_data = await status_response.json()
                
                if status_data["image_status"] == 3:  # Completed
                    return {
                        "success": True,
                        "outputs": [{
                            "type": "image",
                            "url": url,
                            "metadata": {
                                "provider": "akool",
                                "task_id": task_id,
                                "prompt": inputs["prompt"]
                            }
                        } for url in status_data["upscaled_urls"]],
                        "metrics": {
                            "generation_time": status_data.get("processing_time", 0)
                        }
                    }
                elif status_data["image_status"] == 4:  # Failed
                    return {"success": False, "error": "Generation failed"}
                    
                await asyncio.sleep(2)
    
    def get_config_schema(self) -> Dict[str, Any]:
        return {
            "prompt": {
                "type": "textarea",
                "label": "Image Prompt",
                "required": True
            },
            "aspect_ratio": {
                "type": "select",
                "label": "Aspect Ratio",
                "options": ["1:1", "4:3", "3:4", "16:9", "9:16"],
                "default": "1:1"
            }
        }
    
    def get_provider_info(self) -> Dict[str, Any]:
        return {
            "name": "Akool",
            "type": ProviderType.IMAGE_GENERATION,
            "description": "AI image generation with 4 variants per request",
            "capabilities": ["multi_output", "aspect_ratios"],
            "cost_per_request": 0.05,  # Example pricing
            "average_time": 15  # seconds
        }
    
    def validate_inputs(self, inputs: Dict[str, Any]) -> bool:
        return "prompt" in inputs and len(inputs["prompt"]) > 0

# Register the provider
ProviderRegistry.register("akool", AkoolProvider)
```

#### 2.2 Replicate Provider (New)
```python
# src/providers/image/replicate_provider.py
from providers.base import BaseProvider, ProviderType
import aiohttp
import asyncio

class ReplicateProvider(BaseProvider):
    """Replicate image generation provider using SDXL"""
    
    API_URL = "https://api.replicate.com/v1/predictions"
    MODEL_VERSION = "39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b"
    
    async def execute(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        async with aiohttp.ClientSession() as session:
            # Submit prediction
            response = await session.post(
                self.API_URL,
                json={
                    "version": self.MODEL_VERSION,
                    "input": {
                        "prompt": inputs["prompt"],
                        "negative_prompt": inputs.get("negative_prompt", ""),
                        "width": inputs.get("width", 1024),
                        "height": inputs.get("height", 1024),
                        "num_outputs": inputs.get("num_outputs", 1),
                        "guidance_scale": inputs.get("guidance_scale", 7.5),
                        "num_inference_steps": inputs.get("steps", 25)
                    }
                },
                headers={
                    "Authorization": f"Token {self.api_key}",
                    "Content-Type": "application/json"
                }
            )
            data = await response.json()
            prediction_id = data["id"]
            
            # Poll for completion
            while True:
                status_response = await session.get(
                    f"{self.API_URL}/{prediction_id}",
                    headers={"Authorization": f"Token {self.api_key}"}
                )
                status_data = await status_response.json()
                
                if status_data["status"] == "succeeded":
                    return {
                        "success": True,
                        "outputs": [{
                            "type": "image",
                            "url": url,
                            "metadata": {
                                "provider": "replicate",
                                "model": "sdxl",
                                "prediction_id": prediction_id,
                                "prompt": inputs["prompt"],
                                "seed": status_data.get("input", {}).get("seed")
                            }
                        } for url in status_data["output"]],
                        "metrics": {
                            "generation_time": status_data.get("metrics", {}).get("predict_time", 0),
                            "queue_time": status_data.get("metrics", {}).get("queue_time", 0)
                        }
                    }
                elif status_data["status"] == "failed":
                    return {"success": False, "error": status_data.get("error", "Generation failed")}
                
                await asyncio.sleep(1)
    
    def get_config_schema(self) -> Dict[str, Any]:
        return {
            "prompt": {
                "type": "textarea",
                "label": "Image Prompt",
                "required": True
            },
            "negative_prompt": {
                "type": "textarea",
                "label": "Negative Prompt",
                "required": False,
                "placeholder": "Things to avoid in the image"
            },
            "width": {
                "type": "number",
                "label": "Width",
                "default": 1024,
                "min": 128,
                "max": 2048,
                "step": 64
            },
            "height": {
                "type": "number",
                "label": "Height",
                "default": 1024,
                "min": 128,
                "max": 2048,
                "step": 64
            },
            "num_outputs": {
                "type": "number",
                "label": "Number of Images",
                "default": 1,
                "min": 1,
                "max": 4
            },
            "guidance_scale": {
                "type": "number",
                "label": "Guidance Scale",
                "default": 7.5,
                "min": 1,
                "max": 20,
                "step": 0.5,
                "help": "Higher values follow prompt more closely"
            }
        }
    
    def get_provider_info(self) -> Dict[str, Any]:
        return {
            "name": "Replicate (SDXL)",
            "type": ProviderType.IMAGE_GENERATION,
            "description": "Stable Diffusion XL for high-quality image generation",
            "capabilities": ["negative_prompt", "custom_dimensions", "seed_control"],
            "cost_per_request": 0.012,  # Example pricing
            "average_time": 3  # seconds
        }
    
    def validate_inputs(self, inputs: Dict[str, Any]) -> bool:
        if "prompt" not in inputs or len(inputs["prompt"]) == 0:
            return False
        width = inputs.get("width", 1024)
        height = inputs.get("height", 1024)
        return 128 <= width <= 2048 and 128 <= height <= 2048

# Register the provider
ProviderRegistry.register("replicate_sdxl", ReplicateProvider)
```

---

### 3. Generic A/B Testing QC Module

#### 3.1 A/B Testing Module Implementation
```python
# src/modules/ab_testing_module.py
from modules.base import BaseModule
from typing import Dict, Any, List

class ABTestingModule(BaseModule):
    """Generic A/B testing QC module for comparing outputs from multiple sources"""
    
    def __init__(self, module_id: str, config: Dict[str, Any]):
        super().__init__(module_id, config)
        self.comparison_type = config.get("comparison_type", "select_best")
        self.display_mode = config.get("display_mode", "side_by_side")
        self.allow_multiple_selection = config.get("allow_multiple", False)
        self.require_notes = config.get("require_notes", False)
        self.track_metrics = config.get("track_metrics", True)
    
    async def execute(self, inputs: Dict[str, Any], execution_context: Dict[str, Any]) -> Dict[str, Any]:
        """Prepare A/B test for human QC"""
        
        # Collect all inputs from previous modules
        test_items = self._collect_test_items(inputs, execution_context)
        
        # Set up QC task
        execution_context["should_pause"] = True
        execution_context["pause_reason"] = "awaiting_ab_test_qc"
        execution_context["qc_data"] = {
            "test_items": test_items,
            "comparison_type": self.comparison_type,
            "display_mode": self.display_mode,
            "metadata": {
                "test_id": f"ab_test_{self.module_id}",
                "created_at": datetime.utcnow().isoformat()
            }
        }
        
        return {}  # Outputs will be populated after QC completion
    
    def _collect_test_items(self, inputs: Dict[str, Any], context: Dict[str, Any]) -> List[Dict]:
        """Collect and standardize items for comparison"""
        test_items = []
        
        # Get outputs from all connected modules
        for connection_id, module_output in inputs.items():
            if "outputs" in module_output:
                for output in module_output["outputs"]:
                    test_items.append({
                        "id": output.get("id", str(uuid.uuid4())),
                        "type": output.get("type", "unknown"),
                        "content": output.get("url") or output.get("text") or output.get("data"),
                        "source": output.get("metadata", {}).get("provider", "unknown"),
                        "metadata": output.get("metadata", {}),
                        "metrics": output.get("metrics", {})
                    })
        
        return test_items
    
    def get_config_schema(self) -> Dict[str, Any]:
        return {
            "comparison_type": {
                "type": "select",
                "label": "Comparison Type",
                "options": [
                    {"value": "select_best", "label": "Select Best"},
                    {"value": "rank_all", "label": "Rank All"},
                    {"value": "pass_fail_each", "label": "Pass/Fail Each"},
                    {"value": "score_each", "label": "Score Each (1-10)"}
                ],
                "default": "select_best"
            },
            "display_mode": {
                "type": "select",
                "label": "Display Mode",
                "options": [
                    {"value": "side_by_side", "label": "Side by Side"},
                    {"value": "overlay", "label": "Overlay/Toggle"},
                    {"value": "sequential", "label": "Sequential"}
                ],
                "default": "side_by_side"
            },
            "allow_multiple": {
                "type": "checkbox",
                "label": "Allow Multiple Selection",
                "default": False
            },
            "require_notes": {
                "type": "checkbox",
                "label": "Require QC Notes",
                "default": False
            },
            "track_metrics": {
                "type": "checkbox",
                "label": "Track Quality Metrics for SPC",
                "default": True
            }
        }
```

#### 3.2 Enhanced QC Interface for A/B Testing
```javascript
// Frontend component for A/B testing QC (Vue 3)
const ABTestingQC = {
    template: `
        <div class="ab-testing-qc">
            <h3>A/B Test Comparison</h3>
            <div class="test-info">
                <span>Comparing {{ testItems.length }} variants</span>
                <span>Type: {{ comparisonType }}</span>
            </div>
            
            <div :class="['comparison-container', displayMode]">
                <div v-for="(item, index) in testItems" 
                     :key="item.id"
                     class="test-item"
                     :class="{selected: isSelected(item.id)}">
                    
                    <!-- Image comparison -->
                    <div v-if="item.type === 'image'" class="image-container">
                        <img :src="item.content" :alt="item.metadata.prompt">
                        <div class="source-label">{{ item.source }}</div>
                        <div class="metrics" v-if="item.metrics">
                            <span>Time: {{ item.metrics.generation_time }}s</span>
                        </div>
                    </div>
                    
                    <!-- Text comparison (future) -->
                    <div v-else-if="item.type === 'text'" class="text-container">
                        <div class="text-content">{{ item.content }}</div>
                        <div class="source-label">{{ item.source }}</div>
                    </div>
                    
                    <!-- Selection controls based on comparison type -->
                    <div class="controls">
                        <button v-if="comparisonType === 'select_best'"
                                @click="selectBest(item.id)"
                                :class="{primary: selectedBest === item.id}">
                            Select as Best
                        </button>
                        
                        <div v-if="comparisonType === 'rank_all'" class="rank-control">
                            <label>Rank:</label>
                            <input type="number" 
                                   v-model="rankings[item.id]"
                                   :min="1" 
                                   :max="testItems.length">
                        </div>
                        
                        <div v-if="comparisonType === 'pass_fail_each'" class="pass-fail-control">
                            <button @click="setDecision(item.id, 'pass')"
                                    :class="{success: decisions[item.id] === 'pass'}">
                                Pass
                            </button>
                            <button @click="setDecision(item.id, 'fail')"
                                    :class="{danger: decisions[item.id] === 'fail'}">
                                Fail
                            </button>
                        </div>
                        
                        <div v-if="comparisonType === 'score_each'" class="score-control">
                            <label>Score:</label>
                            <input type="range" 
                                   v-model="scores[item.id]"
                                   min="1" 
                                   max="10">
                            <span>{{ scores[item.id] || 5 }}/10</span>
                        </div>
                    </div>
                    
                    <!-- Optional notes -->
                    <div v-if="requireNotes" class="notes-section">
                        <textarea v-model="notes[item.id]" 
                                  placeholder="Add notes (required)">
                        </textarea>
                    </div>
                </div>
            </div>
            
            <!-- Blind test mode toggle (hides source labels) -->
            <div class="test-options">
                <label>
                    <input type="checkbox" v-model="blindMode">
                    Blind Test Mode (hide sources)
                </label>
            </div>
            
            <!-- Submit button -->
            <button @click="submitABTestResults" 
                    :disabled="!isValidSubmission()"
                    class="submit-btn primary">
                Submit A/B Test Results
            </button>
        </div>
    `,
    data() {
        return {
            selectedBest: null,
            rankings: {},
            decisions: {},
            scores: {},
            notes: {},
            blindMode: false
        }
    },
    methods: {
        selectBest(itemId) {
            this.selectedBest = itemId;
        },
        setDecision(itemId, decision) {
            this.decisions[itemId] = decision;
        },
        isValidSubmission() {
            // Validation logic based on comparison type
            if (this.comparisonType === 'select_best') {
                return this.selectedBest !== null;
            }
            // Add other validation rules
            return true;
        },
        async submitABTestResults() {
            const results = {
                comparison_type: this.comparisonType,
                results: this.compileResults(),
                metrics: this.calculateMetrics(),
                timestamp: new Date().toISOString()
            };
            
            await this.submitToBackend(results);
        }
    }
};
```

---

### 4. Database Schema Updates

#### 4.1 New Tables for Provider Tracking and SPC

```sql
-- Track which provider generated each asset
ALTER TABLE assets ADD COLUMN provider VARCHAR(100);
ALTER TABLE assets ADD COLUMN provider_metadata JSON;
ALTER TABLE assets ADD COLUMN quality_metrics JSON;

-- A/B Test Results table for SPC analysis
CREATE TABLE ab_test_results (
    id VARCHAR PRIMARY KEY,
    execution_id VARCHAR REFERENCES workflow_executions(id),
    module_id VARCHAR NOT NULL,
    test_type VARCHAR(50),  -- 'select_best', 'rank_all', etc.
    test_items JSON,  -- Array of items compared
    results JSON,  -- User selections/rankings/scores
    metrics JSON,  -- Calculated quality metrics
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Provider Performance Metrics table (for SPC)
CREATE TABLE provider_metrics (
    id VARCHAR PRIMARY KEY,
    provider_id VARCHAR NOT NULL,
    metric_type VARCHAR(50),  -- 'generation_time', 'quality_score', 'selection_rate'
    value FLOAT NOT NULL,
    metadata JSON,
    workflow_id VARCHAR REFERENCES workflows(id),
    execution_id VARCHAR REFERENCES workflow_executions(id),
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for SPC queries
CREATE INDEX idx_provider_metrics_provider_time ON provider_metrics(provider_id, recorded_at);
CREATE INDEX idx_provider_metrics_type ON provider_metrics(metric_type);
```

---

### 5. Module Updates

#### 5.1 Updated Image Generation Module
```python
# src/modules/image_gen_module.py
from modules.base import BaseModule
from providers.registry import ProviderRegistry

class ImageGenerationModule(BaseModule):
    """Enhanced image generation module with provider selection"""
    
    async def execute(self, inputs: Dict[str, Any], execution_context: Dict[str, Any]) -> Dict[str, Any]:
        # Get provider from config
        provider_id = self.config.get("api_provider", "akool")
        api_key = self.config.get("apiKey")
        
        # Get provider instance from registry
        provider = ProviderRegistry.get_provider(provider_id, api_key)
        
        # Prepare inputs based on provider requirements
        provider_inputs = self._prepare_provider_inputs(inputs, provider_id)
        
        # Execute through provider
        iterations = inputs.get("iterations", 1)
        all_outputs = []
        
        for i in range(iterations):
            result = await provider.execute(provider_inputs)
            
            if result["success"]:
                # Create assets with provider tracking
                for output in result["outputs"]:
                    asset = await self._create_asset(
                        output=output,
                        provider_id=provider_id,
                        metrics=result.get("metrics", {})
                    )
                    all_outputs.append(asset)
            else:
                # Handle provider-specific errors
                raise Exception(f"Provider {provider_id} failed: {result.get('error')}")
        
        return {
            "images": all_outputs,
            "provider": provider_id,
            "total_generated": len(all_outputs)
        }
    
    def _prepare_provider_inputs(self, inputs: Dict, provider_id: str) -> Dict:
        """Map generic inputs to provider-specific format"""
        base_inputs = {
            "prompt": self.config.get("prompt")
        }
        
        if provider_id == "akool":
            base_inputs["aspect_ratio"] = self.config.get("aspect_ratio", "1:1")
        elif provider_id == "replicate_sdxl":
            base_inputs.update({
                "negative_prompt": self.config.get("negative_prompt", ""),
                "width": self.config.get("width", 1024),
                "height": self.config.get("height", 1024),
                "num_outputs": self.config.get("num_outputs", 1),
                "guidance_scale": self.config.get("guidance_scale", 7.5)
            })
        
        return base_inputs
```

---

### 6. API Endpoint Updates

#### 6.1 New Provider Endpoints
```python
# Add to src/main_workflow_db.py

@app.get("/providers")
async def list_providers(provider_type: Optional[str] = None):
    """List all available API providers"""
    providers = ProviderRegistry.list_providers(
        provider_type=ProviderType(provider_type) if provider_type else None
    )
    return {"providers": providers}

@app.get("/providers/{provider_id}/schema")
async def get_provider_schema(provider_id: str):
    """Get configuration schema for a specific provider"""
    provider_class = ProviderRegistry._providers.get(provider_id)
    if not provider_class:
        raise HTTPException(status_code=404, detail="Provider not found")
    
    return {
        "provider_id": provider_id,
        "schema": provider_class().get_config_schema(),
        "info": provider_class().get_provider_info()
    }

@app.post("/ab-test/{task_id}/submit")
async def submit_ab_test_results(
    task_id: str,
    results: Dict[str, Any],
    db: AsyncSession = Depends(get_db)
):
    """Submit A/B test results"""
    # Store results
    ab_test_result = ABTestResult(
        id=str(uuid.uuid4()),
        execution_id=results["execution_id"],
        module_id=results["module_id"],
        test_type=results["comparison_type"],
        test_items=results["test_items"],
        results=results["results"],
        metrics=results.get("metrics", {}),
        notes=results.get("notes")
    )
    
    db.add(ab_test_result)
    
    # Track provider metrics for SPC
    for item_id, item_result in results["results"].items():
        if "selected" in item_result and item_result["selected"]:
            # Track selection rate
            metric = ProviderMetric(
                id=str(uuid.uuid4()),
                provider_id=item_result["provider"],
                metric_type="selection_rate",
                value=1.0,
                metadata={"ab_test_id": ab_test_result.id}
            )
            db.add(metric)
    
    await db.commit()
    
    # Resume workflow with A/B test results
    await resume_workflow_after_ab_test(task_id, results)
    
    return {"success": True, "ab_test_id": ab_test_result.id}

@app.get("/metrics/spc/{provider_id}")
async def get_provider_spc_metrics(
    provider_id: str,
    metric_type: str = "selection_rate",
    days: int = 30,
    db: AsyncSession = Depends(get_db)
):
    """Get SPC metrics for a provider"""
    cutoff_date = datetime.utcnow() - timedelta(days=days)
    
    stmt = select(ProviderMetric).where(
        and_(
            ProviderMetric.provider_id == provider_id,
            ProviderMetric.metric_type == metric_type,
            ProviderMetric.recorded_at >= cutoff_date
        )
    ).order_by(ProviderMetric.recorded_at)
    
    result = await db.execute(stmt)
    metrics = result.scalars().all()
    
    # Calculate SPC values
    values = [m.value for m in metrics]
    if values:
        mean = statistics.mean(values)
        stdev = statistics.stdev(values) if len(values) > 1 else 0
        ucl = mean + (3 * stdev)  # Upper Control Limit
        lcl = mean - (3 * stdev)  # Lower Control Limit
        
        return {
            "provider_id": provider_id,
            "metric_type": metric_type,
            "data_points": len(values),
            "mean": mean,
            "stdev": stdev,
            "ucl": ucl,
            "lcl": lcl,
            "values": values,
            "timestamps": [m.recorded_at.isoformat() for m in metrics]
        }
    
    return {"provider_id": provider_id, "message": "No data available"}
```

---

### 7. Frontend Updates for Workflow Builder

#### 7.1 Dynamic Provider Selection in Image Module Config
```javascript
// Update builder.html module configuration
const moduleConfig = {
    async mounted() {
        // Load available providers when configuring image module
        if (this.module.type === 'image_generation') {
            const response = await axios.get('/providers?provider_type=image_generation');
            this.availableProviders = response.data.providers;
        }
    },
    
    watch: {
        'config.api_provider': async function(newProvider) {
            // Load provider-specific schema when provider changes
            const response = await axios.get(`/providers/${newProvider}/schema`);
            this.providerSchema = response.data.schema;
            this.updateConfigForm();
        }
    },
    
    methods: {
        updateConfigForm() {
            // Dynamically update form fields based on provider schema
            this.formFields = this.mergeSchemas(
                this.baseSchema,
                this.providerSchema
            );
        }
    }
};
```

---

## Implementation Plan

### Phase 1: Foundation (Days 1-3)
1. **Day 1:** Create provider framework and registry
   - BaseProvider abstract class
   - ProviderRegistry implementation
   - Database schema updates

2. **Day 2:** Refactor Akool integration
   - Implement AkoolProvider class
   - Update ImageGenerationModule to use registry
   - Test existing workflows still work

3. **Day 3:** Add Replicate provider
   - Implement ReplicateProvider class
   - Test Replicate API integration
   - Verify multi-provider switching

### Phase 2: A/B Testing QC (Days 4-6)
4. **Day 4:** Create A/B Testing Module
   - ABTestingModule implementation
   - QC task creation for A/B tests
   - Database updates for A/B results

5. **Day 5:** Frontend A/B Testing Interface
   - Vue component for A/B comparison
   - Side-by-side comparison view
   - Selection/ranking controls

6. **Day 6:** Connect A/B Testing to Workflow
   - Resume workflow after A/B test
   - Route based on A/B results
   - Test end-to-end flow

### Phase 3: SPC Foundation (Days 7-8)
7. **Day 7:** Metrics Collection
   - Provider metrics tracking
   - Quality score calculation
   - Database storage

8. **Day 8:** Basic SPC Reporting
   - API endpoints for metrics
   - Simple visualization
   - Control limit calculations

### Phase 4: UI/UX Polish (Days 9-10)
9. **Day 9:** Workflow Builder Updates
   - Dynamic provider selection
   - Provider-specific config forms
   - Visual indicators for providers

10. **Day 10:** Testing & Documentation
    - End-to-end testing
    - Update documentation
    - Performance optimization

---

## Testing Scenarios

### 1. Single Provider Workflow
- Create workflow with only Replicate
- Verify image generation works
- Check asset creation with provider metadata

### 2. A/B Test Workflow
- Create workflow with both Akool and Replicate modules
- Connect both to A/B Testing module
- Verify side-by-side comparison
- Test selection and workflow continuation

### 3. SPC Metrics Tracking
- Run multiple A/B tests
- Check selection rates tracked
- Verify metrics API returns correct data
- Confirm control limits calculated

### 4. Edge Cases
- Provider API failures
- Mixed content types (future)
- Large batch comparisons
- Network timeouts

---

## Configuration & Secrets

### Environment Variables to Add
```bash
# Replicate API (for testing, will be BYOK in production)
REPLICATE_API_KEY=YOUR_REPLICATE_API_KEY_HERE

# Feature flags
ENABLE_AB_TESTING=true
ENABLE_SPC_METRICS=true
```

### Fly.io Secrets Update
```bash
flyctl secrets set REPLICATE_API_KEY="YOUR_REPLICATE_API_KEY_HERE" -a ai-workflow-spc
```

---

## Migration Script

```python
# alembic/versions/004_add_provider_support.py
"""Add provider support and A/B testing

Revision ID: 004
Revises: 003
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

def upgrade():
    # Add provider columns to assets
    op.add_column('assets', sa.Column('provider', sa.String(100)))
    op.add_column('assets', sa.Column('provider_metadata', postgresql.JSON))
    op.add_column('assets', sa.Column('quality_metrics', postgresql.JSON))
    
    # Create A/B test results table
    op.create_table('ab_test_results',
        sa.Column('id', sa.String, primary_key=True),
        sa.Column('execution_id', sa.String, sa.ForeignKey('workflow_executions.id')),
        sa.Column('module_id', sa.String, nullable=False),
        sa.Column('test_type', sa.String(50)),
        sa.Column('test_items', postgresql.JSON),
        sa.Column('results', postgresql.JSON),
        sa.Column('metrics', postgresql.JSON),
        sa.Column('notes', sa.Text),
        sa.Column('created_at', sa.TIMESTAMP(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'))
    )
    
    # Create provider metrics table
    op.create_table('provider_metrics',
        sa.Column('id', sa.String, primary_key=True),
        sa.Column('provider_id', sa.String, nullable=False),
        sa.Column('metric_type', sa.String(50)),
        sa.Column('value', sa.Float, nullable=False),
        sa.Column('metadata', postgresql.JSON),
        sa.Column('workflow_id', sa.String, sa.ForeignKey('workflows.id')),
        sa.Column('execution_id', sa.String, sa.ForeignKey('workflow_executions.id')),
        sa.Column('recorded_at', sa.TIMESTAMP(timezone=True), server_default=sa.text('CURRENT_TIMESTAMP'))
    )
    
    # Add indexes
    op.create_index('idx_provider_metrics_provider_time', 'provider_metrics', ['provider_id', 'recorded_at'])
    op.create_index('idx_provider_metrics_type', 'provider_metrics', ['metric_type'])

def downgrade():
    op.drop_index('idx_provider_metrics_type')
    op.drop_index('idx_provider_metrics_provider_time')
    op.drop_table('provider_metrics')
    op.drop_table('ab_test_results')
    op.drop_column('assets', 'quality_metrics')
    op.drop_column('assets', 'provider_metadata')
    op.drop_column('assets', 'provider')
```

---

## Success Metrics

### Technical Success
- [ ] Both Akool and Replicate providers working
- [ ] A/B testing module comparing outputs
- [ ] Provider metrics being tracked
- [ ] Clean abstraction allowing easy addition of new providers

### Business Success
- [ ] Users can compare quality between providers
- [ ] Cost/quality tradeoffs visible
- [ ] Foundation for SPC quality control
- [ ] Path clear for adding text/audio/video providers

### Architecture Success
- [ ] Generic provider framework extensible to any API type
- [ ] A/B testing works for any content type
- [ ] Database schema supports future provider types
- [ ] No breaking changes to existing workflows

---

## Notes for Claude Code

1. **Start with the provider framework** - This is the foundation everything else builds on
2. **Keep Replicate API key in config** - It's BYOK but we have a test key: `YOUR_REPLICATE_API_KEY_HERE`
3. **Test incrementally** - Get each provider working individually before A/B testing
4. **Preserve existing functionality** - All current workflows must continue working
5. **Use the registry pattern** - Makes adding new providers trivial later
6. **Think generic** - This sprint is for images, but design for any content type
7. **Track everything** - We're building toward SPC, so capture all metrics

---

## Questions for Clarification

Before starting implementation, consider:
1. Should A/B tests be blind by default (hide provider names)?
2. What quality metrics matter most for SPC tracking?
3. Should we add cost estimates to provider selection?
4. Do we need provider fallback (if one fails, try another)?
5. Should A/B testing support more than 2 providers at once?

---

**Sprint Ready for Implementation** ✅

This sprint plan provides the foundation for your make.com-style AI platform with human QC checkpoints. The generic provider framework and A/B testing module will support any API type as you expand beyond image generation to text, audio, video, and other AI services.