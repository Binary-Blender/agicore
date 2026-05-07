"""
Provider registry for managing AI service providers

Centralized registry for registering, discovering, and instantiating providers.
"""

from typing import Dict, List, Optional, Type
from src.providers.base import BaseProvider, ProviderType
import logging

logger = logging.getLogger(__name__)


class ProviderRegistry:
    """
    Central registry for all API providers

    Singleton pattern for managing provider classes and instances.
    """

    _providers: Dict[str, Type[BaseProvider]] = {}

    @classmethod
    def register(cls, provider_id: str, provider_class: Type[BaseProvider]):
        """
        Register a new provider

        Args:
            provider_id: Unique identifier for the provider (e.g., "akool", "replicate_sdxl")
            provider_class: Provider class (not instance)
        """
        if provider_id in cls._providers:
            logger.warning(f"Provider {provider_id} is already registered, overwriting")

        cls._providers[provider_id] = provider_class
        logger.info(f"Registered provider: {provider_id}")

    @classmethod
    def get_provider(
        cls,
        provider_id: str,
        api_key: str,
        config: Optional[Dict] = None
    ) -> BaseProvider:
        """
        Instantiate a provider by ID

        Args:
            provider_id: Provider identifier
            api_key: API key for authentication
            config: Optional configuration parameters

        Returns:
            Instantiated provider

        Raises:
            ValueError: If provider_id is not registered
        """
        if provider_id not in cls._providers:
            raise ValueError(
                f"Unknown provider: {provider_id}. "
                f"Available providers: {list(cls._providers.keys())}"
            )

        provider_class = cls._providers[provider_id]
        return provider_class(api_key, config)

    @classmethod
    def list_providers(
        cls,
        provider_type: Optional[ProviderType] = None
    ) -> List[Dict]:
        """
        List all registered providers, optionally filtered by type

        Args:
            provider_type: Optional filter by provider type

        Returns:
            List of provider info dictionaries
        """
        providers = []

        for provider_id, provider_class in cls._providers.items():
            try:
                # Get provider info (creates temporary instance)
                temp_instance = provider_class(api_key="", config={})
                provider_info = temp_instance.get_provider_info()

                # Apply type filter if specified
                if provider_type is None or provider_info.get("type") == provider_type:
                    providers.append({
                        "id": provider_id,
                        **provider_info
                    })
            except Exception as e:
                logger.error(f"Error getting info for provider {provider_id}: {e}")

        return providers

    @classmethod
    def get_provider_schema(cls, provider_id: str) -> Dict:
        """
        Get configuration schema for a provider

        Args:
            provider_id: Provider identifier

        Returns:
            Configuration schema dictionary

        Raises:
            ValueError: If provider_id is not registered
        """
        if provider_id not in cls._providers:
            raise ValueError(f"Unknown provider: {provider_id}")

        provider_class = cls._providers[provider_id]
        temp_instance = provider_class(api_key="", config={})
        return temp_instance.get_config_schema()

    @classmethod
    def is_registered(cls, provider_id: str) -> bool:
        """
        Check if a provider is registered

        Args:
            provider_id: Provider identifier

        Returns:
            True if registered, False otherwise
        """
        return provider_id in cls._providers

    @classmethod
    def unregister(cls, provider_id: str):
        """
        Unregister a provider (mainly for testing)

        Args:
            provider_id: Provider identifier
        """
        if provider_id in cls._providers:
            del cls._providers[provider_id]
            logger.info(f"Unregistered provider: {provider_id}")

    @classmethod
    def clear_registry(cls):
        """
        Clear all registered providers (mainly for testing)
        """
        cls._providers.clear()
        logger.info("Cleared provider registry")
