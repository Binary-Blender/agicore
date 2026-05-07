"""Module registration and initialization"""
from .base import module_registry
from .start_module import StartModule
from .image_gen_module import ImageGenerationModule
from .qc_module import QCModule
from .end_module import EndModule
from .mcp_module import MCPModule  # Sprint 4.0: Universal MCP module
from .ab_testing_module import ABTestingModule  # Sprint 4.0 Days 4-6: A/B Testing
from .mcp_akool_module import MCPAkoolModule  # Sprint 6.2: AKOOL MCP module
from .mcp_dalle_module import MCPDalleModule  # Sprint 6.2: DALL-E MCP module
from .mcp_akool_video_module import MCPAkoolVideoModule  # Sprint 6.2: AKOOL Video MCP module
from .asset_loader_module import AssetLoaderModule  # Asset repository loader module


def register_all_modules():
    """Register all available modules"""
    module_registry.register(StartModule)
    module_registry.register(ImageGenerationModule)
    module_registry.register(QCModule)
    module_registry.register(EndModule)
    module_registry.register(MCPModule)  # Sprint 4.0: Universal MCP module
    module_registry.register(ABTestingModule)  # Sprint 4.0 Days 4-6: A/B Testing
    module_registry.register(MCPAkoolModule)  # Sprint 6.2: AKOOL MCP module
    module_registry.register(MCPDalleModule)  # Sprint 6.2: DALL-E MCP module
    module_registry.register(MCPAkoolVideoModule)  # Sprint 6.2: AKOOL Video MCP module
    module_registry.register(AssetLoaderModule)


# Auto-register modules on import
register_all_modules()


__all__ = [
    "module_registry",
    "StartModule",
    "ImageGenerationModule",
    "QCModule",
    "EndModule",
    "MCPModule",  # Sprint 4.0
    "ABTestingModule",  # Sprint 4.0 Days 4-6
    "MCPAkoolModule",  # Sprint 6.2
    "MCPDalleModule",  # Sprint 6.2
    "MCPAkoolVideoModule",  # Sprint 6.2
    "AssetLoaderModule"
]
