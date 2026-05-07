"""
DALL-E 3 Image Generation Module - Production Ready with OpenAI API
"""
import os
import logging
from typing import Dict, Any
import httpx

from src.modules.base import BaseModule

logger = logging.getLogger(__name__)


class Dalle3ImageModule(BaseModule):
    """Production DALL-E 3 image generation with OpenAI API"""

    OPENAI_API_URL = "https://api.openai.com/v1/images/generations"

    async def execute(self, inputs: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        """
        Generate images using DALL-E 3 API

        Args:
            inputs: {
                "prompt": str - The image generation prompt
            }
            context: {
                "execution_id": str,
                "tenant_id": str,
                "parameters": dict - Initial workflow parameters
            }

        Returns:
            {
                "asset_ids": list - List of created asset IDs
                "provider": str - "dalle3"
            }
        """
        api_key = os.getenv(self.config.get('api_key_env', 'DALLE_API_KEY'))
        if not api_key:
            api_key = os.getenv('OPENAI_API_KEY')  # Fallback to standard OpenAI env var

        if not api_key:
            raise ValueError("OpenAI API key not configured. Set DALLE_API_KEY or OPENAI_API_KEY environment variable.")

        # Get prompt from inputs or context parameters
        prompt = inputs.get('prompt') or context.get('parameters', {}).get('prompt')
        if not prompt:
            raise ValueError("Prompt is required for image generation")

        # Get configuration
        count = self.config.get('count', 1)
        size = self.config.get('size', '1024x1024')  # 1024x1024, 1024x1792, 1792x1024
        quality = self.config.get('quality', 'standard')  # standard or hd
        style = self.config.get('style', 'vivid')  # vivid or natural

        logger.info(f"DALL-E 3 module {self.module_id}: Generating {count} images with prompt: '{prompt}'")

        # Generate images (DALL-E 3 only supports 1 image per request)
        asset_ids = []
        for i in range(count):
            try:
                image_url, revised_prompt = await self._generate_single_image(
                    api_key=api_key,
                    prompt=prompt,
                    size=size,
                    quality=quality,
                    style=style
                )

                # Create asset in Assets Service
                asset_data = {
                    "type": "image",
                    "url": image_url,
                    "execution_id": context['execution_id'],
                    "metadata": {
                        "provider": "dalle3",
                        "original_prompt": prompt,
                        "revised_prompt": revised_prompt,
                        "size": size,
                        "quality": quality,
                        "style": style,
                        "index": i + 1,
                        "total": count
                    }
                }

                # Get API key from context or environment
                auth_api_key = context.get('api_key') or os.getenv('API_KEY', 'dev-api-key')

                asset = await self.create_asset(
                    asset_data=asset_data,
                    tenant_id=context['tenant_id'],
                    api_key=auth_api_key
                )

                if asset:
                    asset_ids.append(asset['id'])
                    logger.info(f"DALL-E 3 image {i+1}/{count} created: {asset['id']}")
                else:
                    logger.error(f"Failed to create asset for DALL-E 3 image {i+1}")

            except Exception as e:
                logger.error(f"Failed to generate DALL-E 3 image {i+1}/{count}: {str(e)}")
                # Continue with remaining images

        if not asset_ids:
            raise Exception("Failed to generate any images with DALL-E 3")

        return {
            "asset_ids": asset_ids,
            "provider": "dalle3",
            "count": len(asset_ids)
        }

    async def _generate_single_image(
        self,
        api_key: str,
        prompt: str,
        size: str,
        quality: str,
        style: str
    ) -> tuple[str, str]:
        """
        Generate a single image via OpenAI DALL-E 3 API

        Returns:
            tuple: (image_url, revised_prompt)
        """
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }

        payload = {
            "model": "dall-e-3",
            "prompt": prompt,
            "size": size,
            "quality": quality,
            "style": style,
            "n": 1  # DALL-E 3 only supports n=1
        }

        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    self.OPENAI_API_URL,
                    headers=headers,
                    json=payload,
                    timeout=httpx.Timeout(120.0)  # DALL-E 3 can be slow, especially with HD quality
                )

                if response.status_code != 200:
                    error_text = response.text
                    try:
                        error_json = response.json()
                        error_msg = error_json.get('error', {}).get('message', error_text)
                    except:
                        error_msg = error_text
                    raise Exception(f"OpenAI API error: {response.status_code} - {error_msg}")

                result = response.json()

                # Extract image URL and revised prompt
                if 'data' not in result or len(result['data']) == 0:
                    raise Exception(f"Unexpected OpenAI response format: {result}")

                image_data = result['data'][0]
                image_url = image_data.get('url')
                revised_prompt = image_data.get('revised_prompt', prompt)

                if not image_url:
                    raise Exception("OpenAI response missing image URL")

                return image_url, revised_prompt

            except httpx.TimeoutException:
                raise Exception("OpenAI API timeout after 120 seconds")
            except Exception as e:
                if "OpenAI API" in str(e) or "timeout" in str(e).lower():
                    raise
                raise Exception(f"DALL-E 3 generation failed: {str(e)}")
