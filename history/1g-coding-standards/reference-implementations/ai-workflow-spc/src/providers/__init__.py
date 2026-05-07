"""
Provider framework for Binary-Blender Orchestrator

This package contains the generic provider abstraction for integrating
with any AI service API (image generation, text generation, etc.)
"""

from src.providers.base import BaseProvider, ProviderType
from src.providers.registry import ProviderRegistry
from src.providers.image import AkoolProvider, ReplicateProvider

# Auto-register built-in providers
ProviderRegistry.register("akool", AkoolProvider)
ProviderRegistry.register("replicate_sdxl", ReplicateProvider)

__all__ = ['BaseProvider', 'ProviderType', 'ProviderRegistry', 'AkoolProvider', 'ReplicateProvider']
