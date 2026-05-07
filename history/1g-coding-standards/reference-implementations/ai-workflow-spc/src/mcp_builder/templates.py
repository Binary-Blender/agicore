"""
MCP Server Template Library - Sprint 6.0
Pre-built templates for common API patterns
"""
from typing import Dict, List
from dataclasses import dataclass
from src.mcp_builder.code_generator import ToolDefinition, ToolParameter, AuthType


@dataclass
class MCPTemplate:
    """Template definition for MCP server"""
    id: str
    name: str
    description: str
    category: str
    auth_type: AuthType
    auth_config: Dict
    base_url_placeholder: str
    tools: List[ToolDefinition]
    icon: str = "🔧"
    tags: List[str] = None


class MCPTemplateLibrary:
    """Library of pre-built MCP server templates"""

    def __init__(self):
        self.templates = self._load_templates()

    def _load_templates(self) -> Dict[str, MCPTemplate]:
        """Load all available templates"""
        return {
            "openai_compatible": self._openai_compatible_template(),
            "rest_crud": self._rest_crud_template(),
            "graphql": self._graphql_template(),
            "webhook_handler": self._webhook_handler_template(),
            "file_storage": self._file_storage_template(),
            "text_generation": self._text_generation_template(),
            "image_generation": self._image_generation_template(),
            "database_query": self._database_query_template(),
        }

    def get_template(self, template_id: str) -> MCPTemplate:
        """Get a template by ID"""
        return self.templates.get(template_id)

    def list_templates(self, category: str = None) -> List[MCPTemplate]:
        """List all templates, optionally filtered by category"""
        templates = list(self.templates.values())

        if category:
            templates = [t for t in templates if t.category == category]

        return templates

    def _openai_compatible_template(self) -> MCPTemplate:
        """Template for OpenAI-compatible APIs"""
        return MCPTemplate(
            id="openai_compatible",
            name="OpenAI-Compatible API",
            description="Template for any OpenAI-compatible text generation API",
            category="Text Generation",
            auth_type=AuthType.API_KEY,
            auth_config={
                "header_name": "Authorization",
                "header_prefix": "Bearer "
            },
            base_url_placeholder="https://api.example.com/v1",
            icon="💬",
            tags=["text", "openai", "llm"],
            tools=[
                ToolDefinition(
                    name="chat_completion",
                    description="Create a chat completion",
                    method="POST",
                    path="/chat/completions",
                    parameters=[
                        ToolParameter(
                            name="model",
                            type="string",
                            description="Model to use",
                            required=True
                        ),
                        ToolParameter(
                            name="messages",
                            type="array",
                            description="Array of message objects",
                            required=True
                        ),
                        ToolParameter(
                            name="temperature",
                            type="number",
                            description="Sampling temperature",
                            required=False,
                            default="0.7"
                        ),
                        ToolParameter(
                            name="max_tokens",
                            type="number",
                            description="Maximum tokens to generate",
                            required=False,
                            default="1000"
                        ),
                    ],
                    response_mapping={"content": "$.choices[0].message.content"}
                ),
                ToolDefinition(
                    name="list_models",
                    description="List available models",
                    method="GET",
                    path="/models",
                    parameters=[],
                    response_mapping={"models": "$.data"}
                ),
            ]
        )

    def _rest_crud_template(self) -> MCPTemplate:
        """Template for REST CRUD operations"""
        return MCPTemplate(
            id="rest_crud",
            name="REST CRUD API",
            description="Standard REST API with Create, Read, Update, Delete operations",
            category="REST",
            auth_type=AuthType.API_KEY,
            auth_config={
                "header_name": "X-API-Key",
                "header_prefix": ""
            },
            base_url_placeholder="https://api.example.com",
            icon="📦",
            tags=["rest", "crud"],
            tools=[
                ToolDefinition(
                    name="list_items",
                    description="List all items",
                    method="GET",
                    path="/items",
                    parameters=[
                        ToolParameter(
                            name="page",
                            type="number",
                            description="Page number",
                            required=False,
                            default="1"
                        ),
                        ToolParameter(
                            name="limit",
                            type="number",
                            description="Items per page",
                            required=False,
                            default="10"
                        ),
                    ],
                    response_mapping={"items": "$.items"}
                ),
                ToolDefinition(
                    name="get_item",
                    description="Get a specific item by ID",
                    method="GET",
                    path="/items/{id}",
                    parameters=[
                        ToolParameter(
                            name="id",
                            type="string",
                            description="Item ID",
                            required=True
                        ),
                    ],
                    response_mapping={"item": "$"}
                ),
                ToolDefinition(
                    name="create_item",
                    description="Create a new item",
                    method="POST",
                    path="/items",
                    parameters=[
                        ToolParameter(
                            name="name",
                            type="string",
                            description="Item name",
                            required=True
                        ),
                        ToolParameter(
                            name="description",
                            type="string",
                            description="Item description",
                            required=False
                        ),
                    ],
                    response_mapping={"item": "$"}
                ),
                ToolDefinition(
                    name="update_item",
                    description="Update an existing item",
                    method="PUT",
                    path="/items/{id}",
                    parameters=[
                        ToolParameter(
                            name="id",
                            type="string",
                            description="Item ID",
                            required=True
                        ),
                        ToolParameter(
                            name="name",
                            type="string",
                            description="New item name",
                            required=False
                        ),
                        ToolParameter(
                            name="description",
                            type="string",
                            description="New item description",
                            required=False
                        ),
                    ],
                    response_mapping={"item": "$"}
                ),
                ToolDefinition(
                    name="delete_item",
                    description="Delete an item",
                    method="DELETE",
                    path="/items/{id}",
                    parameters=[
                        ToolParameter(
                            name="id",
                            type="string",
                            description="Item ID to delete",
                            required=True
                        ),
                    ],
                    response_mapping={"success": "$.success"}
                ),
            ]
        )

    def _graphql_template(self) -> MCPTemplate:
        """Template for GraphQL APIs"""
        return MCPTemplate(
            id="graphql",
            name="GraphQL API",
            description="GraphQL query and mutation operations",
            category="GraphQL",
            auth_type=AuthType.API_KEY,
            auth_config={
                "header_name": "Authorization",
                "header_prefix": "Bearer "
            },
            base_url_placeholder="https://api.example.com",
            icon="🔍",
            tags=["graphql", "query"],
            tools=[
                ToolDefinition(
                    name="graphql_query",
                    description="Execute a GraphQL query",
                    method="POST",
                    path="/graphql",
                    parameters=[
                        ToolParameter(
                            name="query",
                            type="string",
                            description="GraphQL query string",
                            required=True
                        ),
                        ToolParameter(
                            name="variables",
                            type="object",
                            description="Query variables",
                            required=False
                        ),
                    ],
                    response_mapping={"data": "$.data"}
                ),
            ]
        )

    def _webhook_handler_template(self) -> MCPTemplate:
        """Template for webhook handling"""
        return MCPTemplate(
            id="webhook_handler",
            name="Webhook Handler",
            description="Handle incoming webhooks and events",
            category="Webhooks",
            auth_type=AuthType.CUSTOM,
            auth_config={},
            base_url_placeholder="https://webhook.example.com",
            icon="📡",
            tags=["webhook", "events"],
            tools=[
                ToolDefinition(
                    name="register_webhook",
                    description="Register a new webhook URL",
                    method="POST",
                    path="/webhooks",
                    parameters=[
                        ToolParameter(
                            name="url",
                            type="string",
                            description="Webhook callback URL",
                            required=True
                        ),
                        ToolParameter(
                            name="events",
                            type="array",
                            description="Events to subscribe to",
                            required=True
                        ),
                    ],
                    response_mapping={"webhook_id": "$.id"}
                ),
            ]
        )

    def _file_storage_template(self) -> MCPTemplate:
        """Template for file upload/download"""
        return MCPTemplate(
            id="file_storage",
            name="File Storage API",
            description="Upload and download files",
            category="Storage",
            auth_type=AuthType.API_KEY,
            auth_config={
                "header_name": "X-API-Key",
                "header_prefix": ""
            },
            base_url_placeholder="https://storage.example.com",
            icon="📁",
            tags=["storage", "files"],
            tools=[
                ToolDefinition(
                    name="upload_file",
                    description="Upload a file",
                    method="POST",
                    path="/files",
                    parameters=[
                        ToolParameter(
                            name="file_name",
                            type="string",
                            description="Name of the file",
                            required=True
                        ),
                        ToolParameter(
                            name="file_content",
                            type="string",
                            description="Base64 encoded file content",
                            required=True
                        ),
                    ],
                    response_mapping={"url": "$.url"}
                ),
                ToolDefinition(
                    name="get_file",
                    description="Get file metadata",
                    method="GET",
                    path="/files/{file_id}",
                    parameters=[
                        ToolParameter(
                            name="file_id",
                            type="string",
                            description="File ID",
                            required=True
                        ),
                    ],
                    response_mapping={"file": "$"}
                ),
            ]
        )

    def _text_generation_template(self) -> MCPTemplate:
        """Template for text generation APIs"""
        return MCPTemplate(
            id="text_generation",
            name="Text Generation API",
            description="Generic text generation service",
            category="Text Generation",
            auth_type=AuthType.API_KEY,
            auth_config={
                "header_name": "Authorization",
                "header_prefix": "Bearer "
            },
            base_url_placeholder="https://api.textgen.com",
            icon="✍️",
            tags=["text", "ai", "generation"],
            tools=[
                ToolDefinition(
                    name="generate_text",
                    description="Generate text from a prompt",
                    method="POST",
                    path="/generate",
                    parameters=[
                        ToolParameter(
                            name="prompt",
                            type="string",
                            description="Input prompt",
                            required=True
                        ),
                        ToolParameter(
                            name="max_length",
                            type="number",
                            description="Maximum length of generated text",
                            required=False,
                            default="100"
                        ),
                    ],
                    response_mapping={"text": "$.generated_text"}
                ),
            ]
        )

    def _image_generation_template(self) -> MCPTemplate:
        """Template for image generation APIs"""
        return MCPTemplate(
            id="image_generation",
            name="Image Generation API",
            description="Generate images from text prompts",
            category="Image Generation",
            auth_type=AuthType.API_KEY,
            auth_config={
                "header_name": "Authorization",
                "header_prefix": "Bearer "
            },
            base_url_placeholder="https://api.imagegen.com",
            icon="🎨",
            tags=["image", "ai", "generation"],
            tools=[
                ToolDefinition(
                    name="generate_image",
                    description="Generate an image from a text prompt",
                    method="POST",
                    path="/generate",
                    parameters=[
                        ToolParameter(
                            name="prompt",
                            type="string",
                            description="Text description of the image",
                            required=True
                        ),
                        ToolParameter(
                            name="width",
                            type="number",
                            description="Image width in pixels",
                            required=False,
                            default="1024"
                        ),
                        ToolParameter(
                            name="height",
                            type="number",
                            description="Image height in pixels",
                            required=False,
                            default="1024"
                        ),
                    ],
                    response_mapping={"image_url": "$.url"}
                ),
            ]
        )

    def _database_query_template(self) -> MCPTemplate:
        """Template for database query APIs"""
        return MCPTemplate(
            id="database_query",
            name="Database Query API",
            description="Execute database queries via API",
            category="Data",
            auth_type=AuthType.API_KEY,
            auth_config={
                "header_name": "X-Database-Key",
                "header_prefix": ""
            },
            base_url_placeholder="https://db.example.com",
            icon="🗄️",
            tags=["database", "query", "data"],
            tools=[
                ToolDefinition(
                    name="execute_query",
                    description="Execute a database query",
                    method="POST",
                    path="/query",
                    parameters=[
                        ToolParameter(
                            name="query",
                            type="string",
                            description="SQL query to execute",
                            required=True
                        ),
                        ToolParameter(
                            name="parameters",
                            type="object",
                            description="Query parameters",
                            required=False
                        ),
                    ],
                    response_mapping={"rows": "$.rows"}
                ),
            ]
        )


# Singleton instance
_template_library = None


def get_template_library() -> MCPTemplateLibrary:
    """Get the template library singleton"""
    global _template_library
    if _template_library is None:
        _template_library = MCPTemplateLibrary()
    return _template_library
