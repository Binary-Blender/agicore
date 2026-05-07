"""Workflow modules package

This package contains all module types and the module registry.
Import this package to access the module_registry for registering custom modules.
"""
from .base import BaseModule, ModuleDefinition, module_registry
from .qc_module import QCModule

# Register built-in modules so they're available to the workflow engine
module_registry.register(QCModule)

__all__ = ["BaseModule", "ModuleDefinition", "module_registry", "QCModule"]
