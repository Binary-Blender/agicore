"""
Base provider interface for AI services

All providers must implement this interface to work with the platform.
"""

from abc import ABC, abstractmethod
from typing import Dict, Any, Optional
from enum import Enum


class ProviderType(Enum):
    """Types of providers supported"""
    IMAGE_GENERATION = "image_generation"
    TEXT_GENERATION = "text_generation"
    AUDIO_GENERATION = "audio_generation"
    VIDEO_GENERATION = "video_generation"
    TRANSLATION = "translation"
    CUSTOM = "custom"


class BaseProvider(ABC):
    """
    Abstract base class for all API providers

    Provides a standardized interface for executing API calls,
    managing configuration, and tracking quality metrics.
    """

    def __init__(self, api_key: str, config: Optional[Dict[str, Any]] = None):
        """
        Initialize the provider

        Args:
            api_key: API key for authentication
            config: Optional configuration parameters
        """
        self.api_key = api_key
        self.config = config or {}

    @abstractmethod
    async def execute(self, inputs: Dict[str, Any]) -> Dict[str, Any]:
        """
        Execute the API call and return standardized output

        Args:
            inputs: Input parameters for the API call

        Returns:
            Dictionary with:
                - success: bool
                - outputs: List[Dict] with generated content
                - metrics: Dict with performance metrics (optional)
                - error: str if success=False
        """
        pass

    @abstractmethod
    def get_config_schema(self) -> Dict[str, Any]:
        """
        Return configuration schema for UI form generation

        Returns:
            Dictionary describing configuration parameters:
            {
                "parameter_name": {
                    "type": "text|textarea|number|select|checkbox|password",
                    "label": "Display label",
                    "required": bool,
                    "default": default_value,
                    "min": min_value (for numbers),
                    "max": max_value (for numbers),
                    "options": [...] (for select),
                    "help": "Help text"
                }
            }
        """
        pass

    @abstractmethod
    def get_provider_info(self) -> Dict[str, Any]:
        """
        Return provider metadata

        Returns:
            Dictionary with:
                - name: str - Display name
                - type: ProviderType
                - description: str
                - capabilities: List[str] - Features supported
                - cost_per_request: float - Estimated cost (optional)
                - average_time: float - Average response time in seconds (optional)
        """
        pass

    @abstractmethod
    def validate_inputs(self, inputs: Dict[str, Any]) -> bool:
        """
        Validate inputs before execution

        Args:
            inputs: Input parameters to validate

        Returns:
            True if valid, False otherwise
        """
        pass

    def get_quality_metrics(self, output: Any) -> Dict[str, float]:
        """
        Extract quality metrics for SPC analysis (optional override)

        Args:
            output: Generated output to analyze

        Returns:
            Dictionary of metric_name -> value
            Examples: resolution, file_size, processing_time, etc.
        """
        return {}
