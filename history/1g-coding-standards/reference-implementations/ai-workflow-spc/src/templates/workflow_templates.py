"""
Workflow Templates Library for Binary-Blender Orchestrator
Pre-built workflow templates to accelerate workflow creation
Sprint 5.0 Week 2 Day 8-9
"""

from typing import List, Dict, Any, Optional
from datetime import datetime
import uuid


class WorkflowTemplate:
    """Represents a workflow template"""

    def __init__(
        self,
        template_id: str,
        name: str,
        description: str,
        category: str,
        modules: List[Dict[str, Any]],
        tags: List[str] = None,
        author: str = "Binary-Blender",
        version: str = "1.0.0"
    ):
        self.id = template_id
        self.name = name
        self.description = description
        self.category = category
        self.modules = modules
        self.tags = tags or []
        self.author = author
        self.version = version
        self.created_at = datetime.utcnow()

    def to_workflow(self, workflow_name: str = None) -> Dict[str, Any]:
        """Convert template to a workflow definition"""
        workflow_id = f"wf_{uuid.uuid4().hex[:8]}"

        # Generate module IDs and positions
        modules_with_ids = []
        y_offset = 100

        for idx, module_def in enumerate(self.modules):
            module_id = f"module_{idx + 1}"

            modules_with_ids.append({
                "id": module_id,
                "type": module_def["type"],
                "name": module_def.get("name", module_def["type"]),
                "config": module_def.get("config", {}),
                "position": {
                    "x": 300,
                    "y": y_offset
                }
            })

            y_offset += 120

        # Generate connections (linear flow)
        connections = []
        for i in range(len(modules_with_ids) - 1):
            connections.append({
                "from_module_id": modules_with_ids[i]["id"],
                "to_module_id": modules_with_ids[i + 1]["id"],
                "from_output": "success",
                "to_input": "trigger",
                "condition": None
            })

        return {
            "id": workflow_id,
            "name": workflow_name or f"{self.name} Instance",
            "description": f"Created from template: {self.name}",
            "modules": modules_with_ids,
            "connections": connections,
            "template_id": self.id,
            "template_version": self.version
        }


class WorkflowTemplatesLibrary:
    """Library of pre-built workflow templates"""

    def __init__(self):
        self.templates = self._initialize_templates()

    def _initialize_templates(self) -> Dict[str, WorkflowTemplate]:
        """Initialize library with pre-built templates"""
        templates = {}

        # Template 1: Image Generation A/B Test
        templates["image_ab_test"] = WorkflowTemplate(
            template_id="template_image_ab_test",
            name="Image Generation A/B Test",
            description="Compare two image providers with statistical analysis",
            category="Image Generation",
            modules=[
                {"type": "start", "config": {"iterations": 10}},
                {
                    "type": "image_generation",
                    "name": "Provider A: Replicate",
                    "config": {"provider": "replicate_sdxl", "prompt": "{{prompt}}"}
                },
                {
                    "type": "image_generation",
                    "name": "Provider B: Akool",
                    "config": {"provider": "akool", "prompt": "{{prompt}}"}
                },
                {
                    "type": "ab_testing",
                    "config": {
                        "test_type": "side_by_side",
                        "selection_method": "auto_balanced"
                    }
                },
                {"type": "qc_pass_fail"},
                {"type": "end"}
            ],
            tags=["image", "ab-test", "comparison", "quality-control"]
        )

        # Template 2: Text Generation & Analysis
        templates["text_analysis"] = WorkflowTemplate(
            template_id="template_text_analysis",
            name="Text Generation & Analysis",
            description="Generate text with Claude and analyze quality",
            category="Text Processing",
            modules=[
                {"type": "start"},
                {
                    "type": "mcp",
                    "name": "Generate Text",
                    "config": {
                        "mcp_server": "claude_mcp",
                        "tool_name": "generate_text",
                        "tool_arguments": {
                            "prompt": "{{prompt}}",
                            "max_tokens": 1000,
                            "temperature": 0.7
                        }
                    }
                },
                {
                    "type": "mcp",
                    "name": "Code Review",
                    "config": {
                        "mcp_server": "claude_mcp",
                        "tool_name": "code_review",
                        "tool_arguments": {
                            "code": "{{generated_text}}",
                            "focus": "all"
                        }
                    }
                },
                {"type": "qc_pass_fail"},
                {"type": "end"}
            ],
            tags=["text", "claude", "mcp", "analysis"]
        )

        # Template 3: Multimedia Content Pipeline
        templates["multimedia_pipeline"] = WorkflowTemplate(
            template_id="template_multimedia",
            name="Multimedia Content Pipeline",
            description="Generate image, text description, and audio narration",
            category="Multimedia",
            modules=[
                {"type": "start"},
                {
                    "type": "mcp",
                    "name": "Generate Image",
                    "config": {
                        "mcp_server": "dalle_mcp",
                        "tool_name": "generate_image",
                        "tool_arguments": {
                            "prompt": "{{image_prompt}}",
                            "size": "1024x1024",
                            "quality": "standard"
                        }
                    }
                },
                {
                    "type": "mcp",
                    "name": "Generate Description",
                    "config": {
                        "mcp_server": "claude_mcp",
                        "tool_name": "generate_text",
                        "tool_arguments": {
                            "prompt": "Describe this image: {{image_url}}",
                            "max_tokens": 500
                        }
                    }
                },
                {
                    "type": "mcp",
                    "name": "Generate Audio",
                    "config": {
                        "mcp_server": "elevenlabs_mcp",
                        "tool_name": "synthesize_speech",
                        "tool_arguments": {
                            "text": "{{description}}",
                            "voice": "Rachel"
                        }
                    }
                },
                {"type": "qc_pass_fail"},
                {"type": "end"}
            ],
            tags=["multimedia", "image", "text", "audio", "mcp"]
        )

        # Template 4: Cost Optimization Workflow
        templates["cost_optimization"] = WorkflowTemplate(
            template_id="template_cost_optimization",
            name="Cost Optimization Workflow",
            description="Use the cheapest provider that meets quality standards",
            category="Optimization",
            modules=[
                {"type": "start", "config": {"iterations": 5}},
                {
                    "type": "image_generation",
                    "name": "Budget Provider",
                    "config": {"provider": "replicate_sdxl", "prompt": "{{prompt}}"}
                },
                {
                    "type": "ab_testing",
                    "config": {
                        "selection_method": "auto_cost",
                        "min_samples_for_significance": 10
                    }
                },
                {"type": "qc_pass_fail"},
                {"type": "end"}
            ],
            tags=["cost", "optimization", "budget"]
        )

        # Template 5: Quality-First Workflow
        templates["quality_first"] = WorkflowTemplate(
            template_id="template_quality_first",
            name="Quality-First Workflow",
            description="Use the highest quality provider regardless of cost",
            category="Quality Control",
            modules=[
                {"type": "start"},
                {
                    "type": "ab_testing",
                    "config": {
                        "selection_method": "auto_quality",
                        "min_samples_for_significance": 20,
                        "confidence_level": 99
                    }
                },
                {
                    "type": "image_generation",
                    "config": {"provider": "{{selected_provider}}", "prompt": "{{prompt}}"}
                },
                {"type": "qc_pass_fail"},
                {"type": "end"}
            ],
            tags=["quality", "premium", "high-end"]
        )

        # Template 6: Speed Optimization
        templates["speed_optimization"] = WorkflowTemplate(
            template_id="template_speed_optimization",
            name="Speed Optimization Workflow",
            description="Use the fastest provider for time-critical content",
            category="Performance",
            modules=[
                {"type": "start"},
                {
                    "type": "mcp",
                    "name": "Fast Text Gen",
                    "config": {
                        "mcp_server": "claude_mcp",
                        "tool_name": "generate_text",
                        "tool_arguments": {
                            "prompt": "{{prompt}}",
                            "max_tokens": 500
                        }
                    }
                },
                {
                    "type": "ab_testing",
                    "config": {"selection_method": "auto_speed"}
                },
                {"type": "end"}
            ],
            tags=["speed", "performance", "fast"]
        )

        # Template 7: Voice Content Generation
        templates["voice_content"] = WorkflowTemplate(
            template_id="template_voice_content",
            name="Voice Content Generation",
            description="Generate script, review it, then convert to speech",
            category="Audio",
            modules=[
                {"type": "start"},
                {
                    "type": "mcp",
                    "name": "Generate Script",
                    "config": {
                        "mcp_server": "claude_mcp",
                        "tool_name": "generate_text",
                        "tool_arguments": {
                            "prompt": "{{script_prompt}}",
                            "max_tokens": 2000
                        }
                    }
                },
                {"type": "qc_pass_fail", "name": "Review Script"},
                {
                    "type": "mcp",
                    "name": "Text to Speech",
                    "config": {
                        "mcp_server": "elevenlabs_mcp",
                        "tool_name": "synthesize_speech",
                        "tool_arguments": {
                            "text": "{{script}}",
                            "voice": "Rachel",
                            "model": "eleven_turbo_v2"
                        }
                    }
                },
                {"type": "qc_pass_fail", "name": "Review Audio"},
                {"type": "end"}
            ],
            tags=["voice", "audio", "script", "tts"]
        )

        return templates

    def get_all(self) -> List[Dict[str, Any]]:
        """Get all templates with metadata"""
        return [
            {
                "id": template.id,
                "name": template.name,
                "description": template.description,
                "category": template.category,
                "tags": template.tags,
                "author": template.author,
                "version": template.version,
                "module_count": len(template.modules)
            }
            for template in self.templates.values()
        ]

    def get_by_id(self, template_id: str) -> Optional[WorkflowTemplate]:
        """Get a specific template by ID"""
        return self.templates.get(template_id)

    def get_by_category(self, category: str) -> List[WorkflowTemplate]:
        """Get all templates in a category"""
        return [
            template for template in self.templates.values()
            if template.category.lower() == category.lower()
        ]

    def search(self, query: str) -> List[WorkflowTemplate]:
        """Search templates by name, description, or tags"""
        query_lower = query.lower()
        results = []

        for template in self.templates.values():
            if (
                query_lower in template.name.lower() or
                query_lower in template.description.lower() or
                any(query_lower in tag.lower() for tag in template.tags)
            ):
                results.append(template)

        return results

    def instantiate(self, template_id: str, workflow_name: str = None) -> Optional[Dict[str, Any]]:
        """Create a workflow instance from a template"""
        template = self.get_by_id(template_id)
        if not template:
            return None

        return template.to_workflow(workflow_name)
