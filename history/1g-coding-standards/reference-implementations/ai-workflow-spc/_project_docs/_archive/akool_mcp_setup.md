# Akool MCP Server Setup

## Directory Structure
```
mcp_servers/
└── akool/
    ├── package.json
    ├── index.js (or index.py)
    ├── README.md
    └── .env.example
```

## Option 1: Python Implementation (Recommended)

### package.json (for Python wrapper)
```json
{
  "name": "@custom/akool-mcp-server",
  "version": "1.0.0",
  "description": "MCP server wrapper for Akool image generation API",
  "bin": {
    "akool-mcp": "./run.sh"
  },
  "scripts": {
    "start": "python -m akool_mcp_server"
  },
  "keywords": ["mcp", "akool", "image-generation", "ai"],
  "author": "Binary-Blender",
  "license": "MIT",
  "mcp": {
    "type": "stdio",
    "capabilities": {
      "tools": true,
      "resources": false,
      "prompts": false
    }
  }
}
```

### run.sh
```bash
#!/bin/bash
python -m akool_mcp_server
```

### requirements.txt
```
aiohttp>=3.9.1
asyncio
typing-extensions>=4.0.0
```

## Option 2: Node.js Implementation

### package.json (for Node.js)
```json
{
  "name": "@custom/akool-mcp-server",
  "version": "1.0.0",
  "description": "MCP server wrapper for Akool image generation API",
  "main": "index.js",
  "bin": {
    "akool-mcp": "./index.js"
  },
  "scripts": {
    "start": "node index.js"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^0.1.0",
    "axios": "^1.6.0"
  },
  "keywords": ["mcp", "akool", "image-generation", "ai"],
  "author": "Binary-Blender",
  "license": "MIT"
}
```

### index.js (Node.js starter)
```javascript
#!/usr/bin/env node

const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const axios = require('axios');

class AkoolMCPServer {
    constructor() {
        this.apiKey = process.env.AKOOL_API_KEY || process.env.API_KEY;
        this.apiUrl = 'https://openapi.akool.com/api/open/v3/content/image';
        
        this.server = new Server(
            {
                name: 'akool-mcp-server',
                version: '1.0.0',
            },
            {
                capabilities: {
                    tools: {},
                },
            }
        );
        
        this.setupTools();
        this.setupErrorHandling();
    }
    
    setupTools() {
        // Register the generate_image tool
        this.server.setRequestHandler('tools/list', async () => ({
            tools: [
                {
                    name: 'generate_image',
                    description: 'Generate images using Akool AI',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            prompt: {
                                type: 'string',
                                description: 'Image generation prompt',
                            },
                            aspect_ratio: {
                                type: 'string',
                                enum: ['1:1', '4:3', '3:4', '16:9', '9:16'],
                                default: '1:1',
                            },
                            num_outputs: {
                                type: 'integer',
                                default: 1,
                                minimum: 1,
                                maximum: 10,
                            },
                        },
                        required: ['prompt'],
                    },
                },
            ],
        }));
        
        // Handle tool calls
        this.server.setRequestHandler('tools/call', async (request) => {
            if (request.params.name === 'generate_image') {
                return await this.generateImage(request.params.arguments);
            }
            throw new Error(`Unknown tool: ${request.params.name}`);
        });
    }
    
    async generateImage(args) {
        try {
            // Submit generation request
            const response = await axios.post(
                this.apiUrl,
                {
                    prompt: args.prompt,
                    scale: args.aspect_ratio || '1:1',
                },
                {
                    headers: { 'x-api-key': this.apiKey },
                }
            );
            
            const taskId = response.data._id;
            
            // Poll for completion
            while (true) {
                const statusResponse = await axios.get(
                    `${this.apiUrl}/infobymodelid?image_model_id=${taskId}`,
                    {
                        headers: { 'x-api-key': this.apiKey },
                    }
                );
                
                if (statusResponse.data.image_status === 3) {
                    // Success - return formatted content
                    const content = statusResponse.data.upscaled_urls.map(url => ({
                        type: 'image',
                        url: url,
                        alt: args.prompt,
                    }));
                    
                    return { content };
                } else if (statusResponse.data.image_status === 4) {
                    // Failed
                    return {
                        content: [
                            {
                                type: 'text',
                                text: 'Image generation failed',
                            },
                        ],
                    };
                }
                
                // Wait before polling again
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        } catch (error) {
            console.error('Error generating image:', error);
            return {
                content: [
                    {
                        type: 'text',
                        text: `Error: ${error.message}`,
                    },
                ],
            };
        }
    }
    
    setupErrorHandling() {
        this.server.onerror = (error) => {
            console.error('[MCP Error]', error);
        };
        
        process.on('SIGINT', async () => {
            await this.server.close();
            process.exit(0);
        });
    }
    
    async run() {
        const transport = new StdioServerTransport();
        await this.server.connect(transport);
        console.error('Akool MCP Server running on stdio');
    }
}

// Start the server
const server = new AkoolMCPServer();
server.run().catch(console.error);
```

## Testing the MCP Server

### 1. Direct Testing
```bash
# Set API key
export AKOOL_API_KEY="your_api_key_here"

# Test with Python version
python -m akool_mcp_server

# Or test with Node version
node index.js
```

### 2. Testing with MCP Client
```python
# test_akool_mcp.py
import asyncio
import json
import subprocess

async def test_akool_mcp():
    # Start the MCP server
    process = await asyncio.create_subprocess_exec(
        'python', '-m', 'akool_mcp_server',
        stdin=asyncio.subprocess.PIPE,
        stdout=asyncio.subprocess.PIPE,
        env={'AKOOL_API_KEY': 'your_key'}
    )
    
    # Send initialize request
    request = {
        "jsonrpc": "2.0",
        "id": 1,
        "method": "initialize",
        "params": {
            "protocolVersion": "0.1.0",
            "capabilities": {}
        }
    }
    
    process.stdin.write((json.dumps(request) + '\n').encode())
    await process.stdin.drain()
    
    # Read response
    response = await process.stdout.readline()
    print("Initialize response:", response.decode())
    
    # List tools
    request = {
        "jsonrpc": "2.0",
        "id": 2,
        "method": "tools/list",
        "params": {}
    }
    
    process.stdin.write((json.dumps(request) + '\n').encode())
    await process.stdin.drain()
    
    response = await process.stdout.readline()
    print("Tools:", response.decode())
    
    # Call generate_image tool
    request = {
        "jsonrpc": "2.0",
        "id": 3,
        "method": "tools/call",
        "params": {
            "name": "generate_image",
            "arguments": {
                "prompt": "A beautiful sunset over mountains",
                "aspect_ratio": "16:9"
            }
        }
    }
    
    process.stdin.write((json.dumps(request) + '\n').encode())
    await process.stdin.drain()
    
    response = await process.stdout.readline()
    print("Image generation result:", response.decode())
    
    # Cleanup
    process.terminate()
    await process.wait()

# Run the test
asyncio.run(test_akool_mcp())
```

## Integration with Platform

### 1. Register the MCP Server
```python
# In your platform code
registry.register_server(MCPServerConfig(
    id="akool_mcp",
    name="Akool Image Generation",
    description="Generate images using Akool AI",
    transport=MCPTransport.STDIO,
    config={
        "command": "python",
        "args": ["-m", "akool_mcp_server"],
        "env": {}  # API key will be added at runtime
    },
    category="image_generation",
    requires_api_key=True
))
```

### 2. Use in Workflows
```python
# Create an MCP module that uses Akool
module = MCPModule(
    module_id="module_123",
    config={
        "mcp_server": "akool_mcp",
        "tool_name": "generate_image",
        "tool_config": {
            "prompt": "Futuristic cityscape",
            "aspect_ratio": "16:9"
        },
        "api_key": "user_provided_key"
    }
)

# Execute the module
result = await module.execute(inputs, context)
```

## Environment Variables

### .env.example
```bash
# Akool API Configuration
AKOOL_API_KEY=your_akool_api_key_here

# Optional: Override API URL for testing
AKOOL_API_URL=https://openapi.akool.com/api/open/v3/content/image

# MCP Server Configuration
MCP_SERVER_NAME=akool-mcp-server
MCP_SERVER_VERSION=1.0.0
```

## Deployment

### Local Development
```bash
cd mcp_servers/akool
npm install  # or pip install -r requirements.txt
npm start    # or python -m akool_mcp_server
```

### Docker Deployment
```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY akool_mcp_server/ .
ENV PYTHONUNBUFFERED=1
CMD ["python", "-m", "akool_mcp_server"]
```

### As Part of Platform
The MCP server will be started automatically by the platform when a workflow uses an Akool module:

```python
# Platform starts the server when needed
client = MCPClient({
    "command": "python",
    "args": ["-m", "akool_mcp_server"],
    "env": {"AKOOL_API_KEY": user_api_key}
})
await client.connect()
```

## Notes for Implementation

1. **Error Handling**: Always wrap API calls in try/catch
2. **Polling**: Akool requires polling for completion (2-second intervals)
3. **Image URLs**: Use `upscaled_urls` array from response
4. **Status Codes**: 1=queuing, 2=processing, 3=completed, 4=failed
5. **MCP Format**: Return content as array of objects with type and data
6. **API Key**: Can come from environment or be passed at runtime

---

This MCP server wrapper makes Akool accessible to any MCP-compatible platform, not just yours. Once created, it can be shared with the community for others to use!