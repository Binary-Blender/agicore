"""Module registry and initialization"""
from .base import BaseModule, ModuleRegistry, module_registry
from .start_module import StartModule
from .end_module import EndModule
from .akool_image_module import AkoolImageModule
from .dalle3_image_module import Dalle3ImageModule
from .qc_with_retry_module import QCWithRetryModule
from .ab_test_module import ABTestModule

# Register built-in modules
module_registry.register("start", StartModule)
module_registry.register("end", EndModule)

# Register image generation modules
module_registry.register("akool_image", AkoolImageModule)
module_registry.register("dalle3_image", Dalle3ImageModule)

# Register QC and testing modules
module_registry.register("qc_with_retry", QCWithRetryModule)
module_registry.register("ab_test", ABTestModule)

__all__ = [
    "BaseModule",
    "ModuleRegistry",
    "module_registry",
    "StartModule",
    "EndModule",
    "AkoolImageModule",
    "Dalle3ImageModule",
    "QCWithRetryModule",
    "ABTestModule"
]
