"""
Akool Image Generation Module - Production Ready with Real API Integration
"""
import os
import asyncio
import logging
from typing import Dict, Any, Optional
import httpx

from src.modules.base import BaseModule

logger = logging.getLogger(__name__)


class AkoolImageModule(BaseModule):
    """Production Akool image generation with real API"""

    AKOOL_API_URL = "https://openapi.akool.com/api/open/v3/image/generate"
    POLL_INTERVAL = 10  # seconds
    MAX_POLLS = 30  # 5 minutes total

    async def execute(self, inputs: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        """
        Generate images using Akool API

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
                "provider": str - "akool"
            }
        """
        api_key = os.getenv(self.config.get('api_key_env', 'AKOOL_API_KEY'))
        if not api_key:
            raise ValueError("Akool API key not configured. Set AKOOL_API_KEY environment variable.")

        # Get prompt from inputs or context parameters
        prompt = inputs.get('prompt') or context.get('parameters', {}).get('prompt')
        if not prompt:
            raise ValueError("Prompt is required for image generation")

        # Get configuration
        count = self.config.get('count', 1)
        style = self.config.get('style', 'realistic')
        width = self.config.get('width', 1024)
        height = self.config.get('height', 1024)

        logger.info(f"Akool module {self.module_id}: Generating {count} images with prompt: '{prompt}'")

        # Generate images
        asset_ids = []
        for i in range(count):
            try:
                image_url = await self._generate_single_image(
                    api_key=api_key,
                    prompt=prompt,
                    style=style,
                    width=width,
                    height=height
                )

                # Create asset in Assets Service
                asset_data = {
                    "type": "image",
                    "url": image_url,
                    "execution_id": context['execution_id'],
                    "metadata": {
                        "provider": "akool",
                        "prompt": prompt,
                        "style": style,
                        "width": width,
                        "height": height,
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
                    logger.info(f"Akool image {i+1}/{count} created: {asset['id']}")
                else:
                    logger.error(f"Failed to create asset for image {i+1}")

            except Exception as e:
                logger.error(f"Failed to generate Akool image {i+1}/{count}: {str(e)}")
                # Continue with remaining images

        if not asset_ids:
            raise Exception("Failed to generate any images with Akool")

        return {
            "asset_ids": asset_ids,
            "provider": "akool",
            "count": len(asset_ids)
        }

    async def _generate_single_image(
        self,
        api_key: str,
        prompt: str,
        style: str,
        width: int,
        height: int
    ) -> str:
        """Generate a single image via Akool API"""
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }

        payload = {
            "prompt": prompt,
            "style": style,
            "width": width,
            "height": height,
            "num_images": 1
        }

        async with httpx.AsyncClient() as client:
            try:
                # Submit generation request
                response = await client.post(
                    self.AKOOL_API_URL,
                    headers=headers,
                    json=payload,
                    timeout=httpx.Timeout(60.0)
                )

                if response.status_code != 200:
                    error_text = response.text
                    raise Exception(f"Akool API error: {response.status_code} - {error_text}")

                result = response.json()

                # Handle async generation if needed
                if result.get('status') == 'processing':
                    job_id = result.get('job_id')
                    if not job_id:
                        raise Exception("Akool returned processing status but no job_id")

                    logger.info(f"Akool job {job_id} started, polling for completion...")
                    image_url = await self._poll_for_completion(client, job_id, headers)
                elif result.get('status') == 'completed':
                    image_url = result.get('image_url') or result.get('output_url')
                    if not image_url:
                        raise Exception("Akool returned completed but no image URL")
                else:
                    # Direct URL response
                    image_url = result.get('image_url') or result.get('output_url') or result.get('url')
                    if not image_url:
                        # Sometimes the response is a list
                        if isinstance(result, list) and len(result) > 0:
                            image_url = result[0].get('url')
                        if not image_url:
                            raise Exception(f"Unexpected Akool response format: {result}")

                return image_url

            except httpx.TimeoutException:
                raise Exception("Akool API timeout after 60 seconds")
            except Exception as e:
                raise Exception(f"Akool generation failed: {str(e)}")

    async def _poll_for_completion(self, client: httpx.AsyncClient, job_id: str, headers: dict) -> str:
        """Poll Akool API for job completion"""
        poll_url = f"https://openapi.akool.com/api/open/v3/jobs/{job_id}"

        for attempt in range(self.MAX_POLLS):
            await asyncio.sleep(self.POLL_INTERVAL)

            try:
                response = await client.get(poll_url, headers=headers, timeout=httpx.Timeout(30.0))

                if response.status_code == 200:
                    result = response.json()
                    status = result.get('status')

                    if status == 'completed':
                        image_url = result.get('output_url') or result.get('image_url') or result.get('url')
                        if not image_url:
                            raise Exception(f"Akool job completed but no image URL in response: {result}")
                        return image_url
                    elif status == 'failed':
                        error_msg = result.get('error') or result.get('message', 'Unknown error')
                        raise Exception(f"Akool job failed: {error_msg}")
                    elif status == 'processing':
                        logger.info(f"Akool job {job_id} still processing (attempt {attempt + 1}/{self.MAX_POLLS})...")
                        continue
                    else:
                        logger.warning(f"Akool job {job_id} unknown status: {status}")

            except httpx.TimeoutException:
                logger.warning(f"Timeout polling Akool job {job_id}, retrying...")
                continue
            except Exception as e:
                logger.error(f"Error polling Akool job {job_id}: {str(e)}")
                raise

        raise Exception(f"Akool generation timed out after {self.MAX_POLLS * self.POLL_INTERVAL} seconds")
