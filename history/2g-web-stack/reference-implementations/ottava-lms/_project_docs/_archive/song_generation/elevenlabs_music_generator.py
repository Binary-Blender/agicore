"""
11Labs Music Generator for Melody LMS
This module handles automatic music generation from policy documents and lyrics
using the ElevenLabs Music API.

Requirements:
pip install elevenlabs python-dotenv
"""

import os
import json
import asyncio
from typing import Optional, Dict, Any, List
from datetime import datetime
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Optional: Import ElevenLabs SDK (install with: pip install elevenlabs)
try:
    from elevenlabs.client import ElevenLabs, AsyncElevenLabs
    ELEVENLABS_AVAILABLE = True
except ImportError:
    ELEVENLABS_AVAILABLE = False
    print("Warning: ElevenLabs SDK not installed. Using HTTP requests instead.")

# For HTTP fallback
import requests
import aiohttp


class MelodyMusicGenerator:
    """
    Generate training music using 11Labs Music API for the Melody LMS.
    """
    
    def __init__(self, api_key: Optional[str] = None):
        """
        Initialize the music generator.
        
        Args:
            api_key: ElevenLabs API key. If not provided, will try to load from environment.
        """
        self.api_key = api_key or os.getenv('ELEVENLABS_API_KEY')
        if not self.api_key:
            raise ValueError("ElevenLabs API key is required. Set ELEVENLABS_API_KEY environment variable or pass it directly.")
        
        # Initialize SDK client if available
        if ELEVENLABS_AVAILABLE:
            self.client = ElevenLabs(api_key=self.api_key)
            self.async_client = AsyncElevenLabs(api_key=self.api_key)
        else:
            self.client = None
            self.async_client = None
        
        # Base API URL for HTTP fallback
        self.base_url = "https://api.elevenlabs.io/v1"
        
        # Default music generation settings
        self.default_settings = {
            "output_format": "mp3_44100_128",  # High quality MP3
            "default_duration_ms": 120000,  # 2 minutes default
            "style": "upbeat corporate training",
            "tempo": "moderate",
            "mood": "professional and engaging"
        }
    
    # ==================== MAIN GENERATION METHODS ====================
    
    async def generate_training_song(
        self,
        lyrics: str,
        policy_keywords: List[str],
        style: Optional[str] = None,
        duration_ms: Optional[int] = None,
        use_composition_plan: bool = False
    ) -> Dict[str, Any]:
        """
        Generate a complete training song from lyrics and policy information.
        
        Args:
            lyrics: The generated song lyrics (with or without section markers)
            policy_keywords: Important keywords from the policy to emphasize
            style: Musical style (e.g., "upbeat corporate", "mellow acoustic", "energetic pop")
            duration_ms: Song duration in milliseconds (10000-300000)
            use_composition_plan: Whether to use detailed composition planning
        
        Returns:
            Dictionary containing:
                - audio_data: The generated audio file (bytes)
                - metadata: Song metadata including duration, format, etc.
                - composition_plan: The plan used (if applicable)
                - file_path: Path to saved file (if saved)
        """
        
        # Prepare the prompt
        prompt = self._create_music_prompt(lyrics, policy_keywords, style)
        
        if use_composition_plan:
            # Generate and use a composition plan for more control
            plan = await self.generate_composition_plan(prompt, duration_ms)
            result = await self.generate_from_plan(plan)
        else:
            # Simple prompt-based generation
            result = await self.generate_from_prompt(prompt, duration_ms)
        
        return result
    
    async def generate_from_prompt(
        self,
        prompt: str,
        duration_ms: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Generate music from a simple text prompt.
        
        Args:
            prompt: Text description of the desired music
            duration_ms: Duration in milliseconds (optional)
        
        Returns:
            Dictionary with audio data and metadata
        """
        
        duration_ms = duration_ms or self.default_settings["default_duration_ms"]
        
        if ELEVENLABS_AVAILABLE and self.async_client:
            # Use SDK
            try:
                response = await self.async_client.music.compose(
                    prompt=prompt,
                    duration_ms=duration_ms,
                    output_format=self.default_settings["output_format"]
                )
                
                # Save the audio
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                filename = f"training_song_{timestamp}.mp3"
                file_path = Path(f"./generated_music/{filename}")
                file_path.parent.mkdir(exist_ok=True)
                
                with open(file_path, 'wb') as f:
                    f.write(response.audio)
                
                return {
                    "audio_data": response.audio,
                    "metadata": {
                        "duration_ms": duration_ms,
                        "format": self.default_settings["output_format"],
                        "prompt": prompt,
                        "generated_at": datetime.now().isoformat()
                    },
                    "file_path": str(file_path)
                }
            except Exception as e:
                print(f"SDK error: {e}")
                # Fall back to HTTP
        
        # HTTP fallback
        return await self._http_generate(prompt, duration_ms)
    
    async def generate_composition_plan(
        self,
        prompt: str,
        duration_ms: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Generate a detailed composition plan from a prompt.
        This gives more control over the song structure.
        
        Args:
            prompt: Text description of the desired music
            duration_ms: Target duration
        
        Returns:
            Composition plan dictionary
        """
        
        # Parse lyrics into sections if they contain markers
        sections = self._parse_lyrics_sections(prompt)
        
        # Create a composition plan
        plan = {
            "type": "composition_plan",
            "version": "1.0",
            "duration_ms": duration_ms or self.default_settings["default_duration_ms"],
            "sections": []
        }
        
        # Build sections based on lyrics structure
        if sections:
            for section in sections:
                plan["sections"].append({
                    "name": section["name"],
                    "lyrics": section["lyrics"],
                    "style": section.get("style", self.default_settings["style"]),
                    "duration_percentage": section.get("duration_percentage", 100 / len(sections))
                })
        else:
            # Single section for simple prompt
            plan["sections"] = [{
                "name": "Main",
                "prompt": prompt,
                "style": self.default_settings["style"],
                "duration_percentage": 100
            }]
        
        return plan
    
    async def generate_from_plan(
        self,
        composition_plan: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Generate music using a detailed composition plan.
        
        Args:
            composition_plan: Structured plan for the composition
        
        Returns:
            Dictionary with audio data and metadata
        """
        
        if ELEVENLABS_AVAILABLE and self.async_client:
            try:
                response = await self.async_client.music.compose(
                    composition_plan=composition_plan,
                    output_format=self.default_settings["output_format"]
                )
                
                # Save the audio
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                filename = f"training_song_composed_{timestamp}.mp3"
                file_path = Path(f"./generated_music/{filename}")
                file_path.parent.mkdir(exist_ok=True)
                
                with open(file_path, 'wb') as f:
                    f.write(response.audio)
                
                return {
                    "audio_data": response.audio,
                    "metadata": {
                        "duration_ms": composition_plan.get("duration_ms"),
                        "format": self.default_settings["output_format"],
                        "composition_plan": composition_plan,
                        "generated_at": datetime.now().isoformat()
                    },
                    "file_path": str(file_path)
                }
            except Exception as e:
                print(f"SDK error: {e}")
        
        # HTTP fallback
        return await self._http_generate_with_plan(composition_plan)
    
    # ==================== HELPER METHODS ====================
    
    def _create_music_prompt(
        self,
        lyrics: str,
        policy_keywords: List[str],
        style: Optional[str] = None
    ) -> str:
        """
        Create a comprehensive music generation prompt.
        
        Args:
            lyrics: Song lyrics
            policy_keywords: Keywords to emphasize
            style: Musical style
        
        Returns:
            Formatted prompt for music generation
        """
        
        style = style or self.default_settings["style"]
        
        # Build the prompt
        prompt_parts = [
            f"Style: {style}",
            f"Tempo: {self.default_settings['tempo']}",
            f"Mood: {self.default_settings['mood']}",
            f"Key themes: {', '.join(policy_keywords[:5])}",  # Top 5 keywords
            "",
            "Lyrics:",
            lyrics
        ]
        
        return "\n".join(prompt_parts)
    
    def _parse_lyrics_sections(self, lyrics: str) -> List[Dict[str, Any]]:
        """
        Parse lyrics into sections (verse, chorus, etc.)
        
        Args:
            lyrics: Raw lyrics text
        
        Returns:
            List of section dictionaries
        """
        
        sections = []
        current_section = None
        current_lyrics = []
        
        # Look for section markers like [Verse], [Chorus], etc.
        for line in lyrics.split('\n'):
            if line.strip().startswith('[') and line.strip().endswith(']'):
                # Save previous section
                if current_section:
                    sections.append({
                        "name": current_section,
                        "lyrics": '\n'.join(current_lyrics).strip()
                    })
                
                # Start new section
                current_section = line.strip()[1:-1]
                current_lyrics = []
            else:
                current_lyrics.append(line)
        
        # Add the last section
        if current_section:
            sections.append({
                "name": current_section,
                "lyrics": '\n'.join(current_lyrics).strip()
            })
        
        return sections if sections else [{
            "name": "Main",
            "lyrics": lyrics
        }]
    
    # ==================== HTTP FALLBACK METHODS ====================
    
    async def _http_generate(
        self,
        prompt: str,
        duration_ms: int
    ) -> Dict[str, Any]:
        """
        Generate music using direct HTTP API calls.
        Fallback for when SDK is not available.
        """
        
        url = f"{self.base_url}/music/compose"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "prompt": prompt,
            "duration_ms": duration_ms,
            "output_format": self.default_settings["output_format"]
        }
        
        async with aiohttp.ClientSession() as session:
            async with session.post(url, headers=headers, json=payload) as response:
                if response.status == 200:
                    audio_data = await response.read()
                    
                    # Save the audio
                    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                    filename = f"training_song_{timestamp}.mp3"
                    file_path = Path(f"./generated_music/{filename}")
                    file_path.parent.mkdir(exist_ok=True)
                    
                    with open(file_path, 'wb') as f:
                        f.write(audio_data)
                    
                    return {
                        "audio_data": audio_data,
                        "metadata": {
                            "duration_ms": duration_ms,
                            "format": self.default_settings["output_format"],
                            "prompt": prompt,
                            "generated_at": datetime.now().isoformat()
                        },
                        "file_path": str(file_path)
                    }
                else:
                    error_text = await response.text()
                    raise Exception(f"HTTP error {response.status}: {error_text}")
    
    async def _http_generate_with_plan(
        self,
        composition_plan: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Generate music with composition plan using HTTP API.
        """
        
        url = f"{self.base_url}/music/compose"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "composition_plan": composition_plan,
            "output_format": self.default_settings["output_format"]
        }
        
        async with aiohttp.ClientSession() as session:
            async with session.post(url, headers=headers, json=payload) as response:
                if response.status == 200:
                    audio_data = await response.read()
                    
                    # Save the audio
                    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                    filename = f"training_song_composed_{timestamp}.mp3"
                    file_path = Path(f"./generated_music/{filename}")
                    file_path.parent.mkdir(exist_ok=True)
                    
                    with open(file_path, 'wb') as f:
                        f.write(audio_data)
                    
                    return {
                        "audio_data": audio_data,
                        "metadata": {
                            "duration_ms": composition_plan.get("duration_ms"),
                            "format": self.default_settings["output_format"],
                            "composition_plan": composition_plan,
                            "generated_at": datetime.now().isoformat()
                        },
                        "file_path": str(file_path)
                    }
                else:
                    error_text = await response.text()
                    raise Exception(f"HTTP error {response.status}: {error_text}")
    
    # ==================== UTILITY METHODS ====================
    
    def customize_style(
        self,
        genre: str = "corporate",
        mood: str = "professional",
        tempo: str = "moderate",
        instruments: List[str] = None
    ) -> str:
        """
        Create a custom style description for music generation.
        
        Args:
            genre: Music genre
            mood: Desired mood
            tempo: Tempo description
            instruments: List of instruments to include
        
        Returns:
            Style prompt string
        """
        
        style_parts = [
            f"{mood} {genre}",
            f"{tempo} tempo"
        ]
        
        if instruments:
            style_parts.append(f"featuring {', '.join(instruments)}")
        
        return ", ".join(style_parts)
    
    def estimate_credits(self, duration_ms: int) -> Dict[str, Any]:
        """
        Estimate credit usage for a generation.
        
        Note: These are approximate values. Check 11Labs documentation for exact pricing.
        """
        
        seconds = duration_ms / 1000
        estimated_credits = seconds * 100  # Approximate credit calculation
        
        return {
            "duration_seconds": seconds,
            "estimated_credits": estimated_credits,
            "note": "Check your 11Labs dashboard for exact credit usage"
        }


# ==================== EXAMPLE USAGE ====================

async def example_integration():
    """
    Example of how to integrate with the Melody LMS workflow.
    """
    
    # Initialize the generator
    generator = MelodyMusicGenerator()
    
    # Example lyrics from your lyric generation system
    example_lyrics = """
    [Verse 1]
    Safety first is what we say
    Check the seals every day
    Quality control is key
    Following policy sets us free
    
    [Chorus]
    We follow the rules, we follow the guide
    Company standards are our pride
    Training makes us better every day
    This is the Melody LMS way
    
    [Verse 2]
    Document each step you take
    Double-check for safety's sake
    Team communication is our goal
    Playing our important role
    """
    
    # Policy keywords extracted from document
    policy_keywords = [
        "safety", "quality control", "documentation",
        "communication", "compliance", "standards"
    ]
    
    # Generate the training song
    try:
        # Method 1: Simple generation
        print("Generating training song...")
        result = await generator.generate_training_song(
            lyrics=example_lyrics,
            policy_keywords=policy_keywords,
            style="upbeat corporate pop with inspiring vocals",
            duration_ms=120000,  # 2 minutes
            use_composition_plan=False
        )
        
        print(f"✓ Song generated successfully!")
        print(f"  File saved to: {result['file_path']}")
        print(f"  Duration: {result['metadata']['duration_ms']/1000} seconds")
        
        # Method 2: With composition plan for more control
        print("\nGenerating with composition plan...")
        result_composed = await generator.generate_training_song(
            lyrics=example_lyrics,
            policy_keywords=policy_keywords,
            style="professional training video background music",
            duration_ms=150000,  # 2.5 minutes
            use_composition_plan=True
        )
        
        print(f"✓ Composed song generated successfully!")
        print(f"  File saved to: {result_composed['file_path']}")
        
    except Exception as e:
        print(f"Error generating music: {e}")


# ==================== INTEGRATION FUNCTIONS ====================

async def generate_from_policy_document(
    policy_text: str,
    lyrics: str,
    emphasis_points: List[str],
    api_key: Optional[str] = None
) -> Dict[str, Any]:
    """
    Direct integration function for the Melody LMS.
    
    Args:
        policy_text: The policy document text (for context)
        lyrics: Generated lyrics from your system
        emphasis_points: Key points to emphasize from the policy
        api_key: Optional API key (uses environment variable if not provided)
    
    Returns:
        Dictionary containing the generated audio and metadata
    """
    
    generator = MelodyMusicGenerator(api_key=api_key)
    
    # Determine style based on content
    if any(word in policy_text.lower() for word in ['safety', 'security', 'compliance']):
        style = "serious and professional corporate training music"
    elif any(word in policy_text.lower() for word in ['team', 'culture', 'values']):
        style = "upbeat and inspiring team-building music"
    else:
        style = "clear and engaging educational background music"
    
    # Generate the song
    result = await generator.generate_training_song(
        lyrics=lyrics,
        policy_keywords=emphasis_points,
        style=style,
        duration_ms=120000,  # 2 minutes default
        use_composition_plan=True  # Use plan for better structure
    )
    
    return result


# ==================== BATCH PROCESSING ====================

async def batch_generate_songs(
    song_requests: List[Dict[str, Any]],
    api_key: Optional[str] = None,
    max_concurrent: int = 3
) -> List[Dict[str, Any]]:
    """
    Generate multiple songs in batch with concurrency control.
    
    Args:
        song_requests: List of dictionaries with lyrics, keywords, etc.
        api_key: API key
        max_concurrent: Maximum concurrent generations
    
    Returns:
        List of generation results
    """
    
    generator = MelodyMusicGenerator(api_key=api_key)
    results = []
    
    # Process in batches to respect rate limits
    for i in range(0, len(song_requests), max_concurrent):
        batch = song_requests[i:i+max_concurrent]
        
        tasks = [
            generator.generate_training_song(
                lyrics=req['lyrics'],
                policy_keywords=req['keywords'],
                style=req.get('style'),
                duration_ms=req.get('duration_ms', 120000)
            )
            for req in batch
        ]
        
        batch_results = await asyncio.gather(*tasks)
        results.extend(batch_results)
        
        # Small delay between batches to respect rate limits
        if i + max_concurrent < len(song_requests):
            await asyncio.sleep(2)
    
    return results


# Run the example if this file is executed directly
if __name__ == "__main__":
    asyncio.run(example_integration())
