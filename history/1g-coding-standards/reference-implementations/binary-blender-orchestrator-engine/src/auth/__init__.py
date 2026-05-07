"""
Authentication module for Binary Blender Orchestrator

This module handles JWT token validation and tenant extraction.

IMPORTANT: Don't import submodules here - it causes circular imports in tests.
Users should import directly:
    from src.auth.middleware import get_current_tenant  # Good

NOT:
    from src.auth import middleware  # Bad - causes circular imports
"""

__all__ = ["models", "service", "middleware", "routes"]
