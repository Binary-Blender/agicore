"""
Standard Work Converter - Converts visual workflows to TPS Standard Work format
Sprint 6.0 - Unified Workflow Studio
"""
from typing import List, Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from src.database.models import Workflow, WorkflowModule, WorkflowConnection
import logging

logger = logging.getLogger(__name__)


class StandardWorkConverter:
    """Convert visual workflow modules to TPS Standard Work format"""

    # Timing estimates for different MCP servers (in seconds)
    MCP_SERVER_TIMES = {
        'akool': {'auto': 15, 'manual': 3},
        'mcp_akool': {'auto': 15, 'manual': 3},
        'dall-e-3': {'auto': 15, 'manual': 3},
        'claude': {'auto': 5, 'manual': 2},
        'stable-diffusion': {'auto': 18, 'manual': 3},
        'gpt-4-vision': {'auto': 8, 'manual': 2},
        'elevenlabs': {'auto': 10, 'manual': 2},
        'whisper-asr': {'auto': 12, 'manual': 3},
        'github-copilot': {'auto': 7, 'manual': 2},
        'langchain': {'auto': 8, 'manual': 2},
        'replicate_sdxl': {'auto': 3, 'manual': 2},
        'mcp_replicate': {'auto': 3, 'manual': 2},
    }

    async def convert_to_standard_work(
        self,
        workflow: Workflow,
        db: AsyncSession
    ) -> List[Dict[str, Any]]:
        """Convert workflow modules to Standard Work steps"""

        # Get ordered modules (by position or explicit sequence)
        modules = await self._get_ordered_modules(workflow.id, db)

        if not modules:
            logger.warning(f"No modules found for workflow {workflow.id}")
            return []

        standard_work_steps = []
        step_number = 1

        for module in modules:
            step = await self._module_to_standard_work_step(module, step_number, db)
            if step:  # Skip null steps (like pure routing)
                standard_work_steps.append(step)
                step_number += 1

        return standard_work_steps

    async def _get_ordered_modules(
        self,
        workflow_id: str,
        db: AsyncSession
    ) -> List[WorkflowModule]:
        """Get modules in execution order"""

        # Fetch all modules
        result = await db.execute(
            select(WorkflowModule)
            .where(WorkflowModule.workflow_id == workflow_id)
            .order_by(WorkflowModule.sequence_number, WorkflowModule.id)
        )
        modules = result.scalars().all()

        if not modules:
            return []

        # If no sequence numbers are set, try to order by connections
        if all(m.sequence_number is None for m in modules):
            return await self._order_by_connections(workflow_id, modules, db)

        return list(modules)

    async def _order_by_connections(
        self,
        workflow_id: str,
        modules: List[WorkflowModule],
        db: AsyncSession
    ) -> List[WorkflowModule]:
        """Order modules by following connections from start node"""

        # Get all connections
        result = await db.execute(
            select(WorkflowConnection)
            .where(WorkflowConnection.workflow_id == workflow_id)
        )
        connections = result.scalars().all()

        # Build adjacency map
        next_map = {}
        for conn in connections:
            next_map[conn.from_module_id] = conn.to_module_id

        # Find start module
        start_module = next((m for m in modules if m.type == 'start'), None)
        if not start_module:
            # No start node, return modules as-is
            return modules

        # Follow connections to build ordered list
        ordered = []
        current_id = start_module.id
        visited = set()
        module_map = {m.id: m for m in modules}

        while current_id and current_id not in visited:
            if current_id in module_map:
                ordered.append(module_map[current_id])
                visited.add(current_id)
            current_id = next_map.get(current_id)

        # Add any remaining modules that weren't visited
        for module in modules:
            if module.id not in visited:
                ordered.append(module)

        return ordered

    async def _module_to_standard_work_step(
        self,
        module: WorkflowModule,
        step_number: int,
        db: AsyncSession
    ) -> Optional[Dict[str, Any]]:
        """Convert a single module to Standard Work step"""

        # Determine work element type
        element_type = self._get_element_type(module.type)

        # Get timing based on module type and config
        timing = self._get_module_timing(module)

        # Generate procedure steps
        procedures = self._generate_procedures(module)

        # Identify quality points
        quality_points = self._identify_quality_points(module)

        # Generate key points
        key_points = self._generate_key_points(module)

        # Get tool/MCP server name
        tool_mcp = self._get_tool_or_mcp(module)

        # Sprint 6.2: Include override indicators for UI display
        has_manual_override = hasattr(module, 'manual_time_override') and module.manual_time_override is not None
        has_auto_override = hasattr(module, 'auto_time_override') and module.auto_time_override is not None

        step_data = {
            "step_number": step_number,
            "work_element": module.name,
            "element_type": element_type,
            "procedures": procedures,
            "tool_mcp": tool_mcp,
            "manual_time": float(timing['manual']),
            "auto_time": float(timing['auto']),
            "total_time": float(timing['manual'] + timing['auto']),
            "quality_points": quality_points,
            "key_points": key_points,
            "module_id": module.id,
            "module_type": module.type,
            # Override indicators for bidirectional editing UI
            "has_manual_override": has_manual_override,
            "has_auto_override": has_auto_override
        }

        return step_data

    def _get_element_type(self, module_type: str) -> str:
        """Map module type to work element type"""
        mapping = {
            'start': 'setup',
            'end': 'inspection',
            'qc_pass_fail': 'inspection',
            'ab_testing': 'inspection',
            'mcp_service': 'value-add',
            'image_generation': 'value-add',
        }

        # Check if it's a dynamic MCP module (mcp_akool, mcp_claude, etc)
        if module_type.startswith('mcp_'):
            return 'value-add'

        return mapping.get(module_type, 'value-add')

    def _get_module_timing(self, module: WorkflowModule) -> Dict[str, float]:
        """Get realistic timing for module - prioritizes user overrides"""

        # PRIORITY 1: Check for time overrides (Sprint 6.2 - Bidirectional Editing)
        # User-defined overrides take absolute precedence
        manual_time = module.manual_time_override if hasattr(module, 'manual_time_override') and module.manual_time_override is not None else None
        auto_time = module.auto_time_override if hasattr(module, 'auto_time_override') and module.auto_time_override is not None else None

        # PRIORITY 2: Check if module has explicit timing set (from TPS Builder or API)
        if manual_time is None and module.manual_time is not None:
            manual_time = module.manual_time
        if auto_time is None and module.auto_time is not None:
            auto_time = module.auto_time

        # If we have both values from overrides or explicit settings, return them
        if manual_time is not None and auto_time is not None:
            return {
                'manual': float(manual_time),
                'auto': float(auto_time)
            }

        # PRIORITY 3: Calculate based on type (fallback for missing values)
        if module.type == 'start':
            return {'manual': 5, 'auto': 0}
        elif module.type == 'end':
            return {'manual': 2, 'auto': 0}
        elif module.type == 'qc_pass_fail':
            return {'manual': 20, 'auto': 0}
        elif module.type == 'ab_testing':
            return {'manual': 15, 'auto': 0}
        elif module.type == 'mcp_service' or module.type.startswith('mcp_'):
            # Get specific MCP server timing
            mcp_server = module.config.get('mcp_server', '') if module.config else ''

            # For mcp_akool type modules, extract 'akool' as the server name
            if module.type.startswith('mcp_') and not mcp_server:
                mcp_server = module.type  # Use the full type as server identifier

            return self.MCP_SERVER_TIMES.get(
                mcp_server,
                {'manual': 3, 'auto': 10}  # Default
            )
        else:
            return {'manual': 3, 'auto': 10}

    def _generate_procedures(self, module: WorkflowModule) -> List[str]:
        """Generate procedure steps for module"""

        procedures = []

        if module.type == 'start':
            procedures = [
                "Verify API keys and credentials",
                "Set batch size and parameters",
                "Check system resources",
                "Initialize workflow context"
            ]
        elif module.type == 'mcp_service' or module.type.startswith('mcp_'):
            server_name = module.config.get('mcp_server', 'service') if module.config else 'service'
            if module.type.startswith('mcp_') and not module.config.get('mcp_server'):
                # Extract server name from module type (e.g., mcp_akool -> Akool)
                server_name = module.type.replace('mcp_', '').replace('_', ' ').title()

            procedures = [
                "Configure input parameters",
                f"Submit request to {server_name}",
                "Monitor processing progress",
                "Retrieve and validate results"
            ]
        elif module.type == 'qc_pass_fail':
            procedures = [
                "Review each asset individually",
                "Check against quality criteria",
                "Mark as Pass or Fail",
                "Record decision and notes"
            ]
        elif module.type == 'ab_testing':
            procedures = [
                "Compare outputs side-by-side",
                "Evaluate cost and quality metrics",
                "Select preferred option",
                "Document selection rationale"
            ]
        elif module.type == 'end':
            procedures = [
                "Verify all outputs generated",
                "Save results to repository",
                "Update workflow metrics",
                "Close workflow execution"
            ]
        else:
            procedures = ["Execute module operation"]

        return procedures

    def _identify_quality_points(self, module: WorkflowModule) -> List[Dict[str, str]]:
        """Identify quality check points for module"""

        # Check if module has explicit quality points
        if module.quality_points:
            return module.quality_points

        quality_points = []

        if module.type == 'start':
            quality_points.append({
                "point": "Batch size ≤ 10 items",
                "severity": "critical"
            })
            quality_points.append({
                "point": "All API keys validated",
                "severity": "critical"
            })
        elif module.type == 'mcp_service' or module.type.startswith('mcp_'):
            quality_points.append({
                "point": "Output resolution ≥ 1024px",
                "severity": "major"
            })
            quality_points.append({
                "point": "No NSFW or inappropriate content",
                "severity": "critical"
            })
            quality_points.append({
                "point": "Matches input prompt requirements",
                "severity": "major"
            })
        elif module.type == 'qc_pass_fail':
            quality_points.append({
                "point": "100% inspection required",
                "severity": "critical"
            })
            quality_points.append({
                "point": "All decisions documented",
                "severity": "major"
            })
        elif module.type == 'ab_testing':
            quality_points.append({
                "point": "Fair comparison methodology",
                "severity": "major"
            })
            quality_points.append({
                "point": "All metrics captured",
                "severity": "critical"
            })

        return quality_points

    def _generate_key_points(self, module: WorkflowModule) -> Dict[str, str]:
        """Generate key points for module"""

        # Check if module has explicit key points
        if module.key_points:
            return module.key_points

        key_points = {}

        if module.type == 'start':
            key_points = {
                "quality": "Maximum 10 items per batch",
                "tip": "Smaller batches = faster QC turnaround"
            }
        elif module.type == 'mcp_service' or module.type.startswith('mcp_'):
            server = module.config.get('mcp_server', '') if module.config else ''

            # Image generation servers
            if any(x in server.lower() or x in module.type.lower()
                   for x in ['dall-e', 'stable-diffusion', 'akool', 'image']):
                key_points = {
                    "quality": "Check for artifacts and distortions",
                    "tip": "Use consistent aspect ratio (1:1 preferred)"
                }
            # Text generation servers
            elif any(x in server.lower() or x in module.type.lower()
                    for x in ['claude', 'gpt', 'text']):
                key_points = {
                    "quality": "Verify output coherence and accuracy",
                    "tip": "Consider cost vs quality tradeoffs"
                }
            # Audio servers
            elif any(x in server.lower() or x in module.type.lower()
                    for x in ['elevenlabs', 'whisper', 'audio']):
                key_points = {
                    "quality": "Check audio clarity and accuracy",
                    "tip": "Test with various input samples"
                }
            else:
                key_points = {
                    "quality": "Verify output meets requirements",
                    "tip": "Monitor processing time"
                }
        elif module.type == 'qc_pass_fail':
            key_points = {
                "quality": "No sampling - inspect every item",
                "safety": "Take breaks every 20 reviews to maintain focus"
            }
        elif module.type == 'ab_testing':
            key_points = {
                "quality": "Consider cost, speed, and quality",
                "tip": "Document decision rationale for future reference"
            }

        return key_points

    def _get_tool_or_mcp(self, module: WorkflowModule) -> str:
        """Get tool/MCP server name for display"""

        if module.type == 'start':
            return 'System'
        elif module.type == 'end':
            return 'System'
        elif module.type == 'qc_pass_fail':
            return 'Human QC'
        elif module.type == 'ab_testing':
            return 'A/B Testing'
        elif module.type == 'mcp_service':
            server = module.config.get('mcp_server', 'MCP') if module.config else 'MCP'
            # Return formatted name
            server_names = {
                'akool': 'Akool',
                'mcp_akool': 'Akool (MCP)',
                'dall-e-3': 'DALL-E 3',
                'claude': 'Claude',
                'stable-diffusion': 'Stable Diffusion',
                'gpt-4-vision': 'GPT-4 Vision',
                'elevenlabs': 'ElevenLabs',
                'whisper-asr': 'Whisper ASR',
                'github-copilot': 'GitHub Copilot',
                'langchain': 'LangChain',
                'replicate_sdxl': 'Replicate SDXL',
                'mcp_replicate': 'Replicate (MCP)'
            }
            return server_names.get(server, server.replace('_', ' ').title())
        elif module.type.startswith('mcp_'):
            # Extract and format MCP server name from module type
            server_name = module.type.replace('mcp_', '').replace('_', ' ').title()
            return f"{server_name} (MCP)"
        else:
            return module.type.replace('_', ' ').title()


# Singleton instance
_converter_instance = None

def get_standard_work_converter() -> StandardWorkConverter:
    """Get or create singleton StandardWorkConverter instance"""
    global _converter_instance
    if _converter_instance is None:
        _converter_instance = StandardWorkConverter()
    return _converter_instance
