"""
Quick Integration Script for Melody LMS + 11Labs Music
This is a simplified version for immediate integration
"""

import os
import asyncio
from typing import Optional
from elevenlabs import ElevenLabs
from pathlib import Path
from datetime import datetime

# Set your API key here or use environment variable
ELEVENLABS_API_KEY = os.getenv('ELEVENLABS_API_KEY')  # Set this in your .env file


async def generate_melody_training_song(
    lyrics: str,
    style: str = "upbeat corporate training music with clear vocals",
    duration_ms: int = 120000,  # 2 minutes default
    save_path: str = "./generated_songs"
) -> dict:
    """
    Generate a training song from lyrics using 11Labs Music API.
    
    Args:
        lyrics: The song lyrics (can include [Verse], [Chorus] markers)
        style: Musical style description
        duration_ms: Duration in milliseconds (10000-300000)
        save_path: Directory to save the generated MP3
    
    Returns:
        Dictionary with file_path and metadata
    """
    
    # Initialize client
    client = ElevenLabs(api_key=ELEVENLABS_API_KEY)
    
    # Create the full prompt
    prompt = f"""
    Style: {style}
    
    Lyrics:
    {lyrics}
    """
    
    print(f"🎵 Generating song ({duration_ms/1000} seconds)...")
    
    try:
        # Generate the music
        response = await client.music.compose(
            prompt=prompt.strip(),
            duration_ms=duration_ms,
            output_format="mp3_44100_128"  # High quality
        )
        
        # Create save directory
        Path(save_path).mkdir(parents=True, exist_ok=True)
        
        # Save with timestamp
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"training_song_{timestamp}.mp3"
        file_path = Path(save_path) / filename
        
        # Write the audio file
        with open(file_path, 'wb') as f:
            f.write(response.audio)
        
        print(f"✅ Song generated successfully!")
        print(f"📁 Saved to: {file_path}")
        
        return {
            "success": True,
            "file_path": str(file_path),
            "duration_seconds": duration_ms / 1000,
            "timestamp": timestamp
        }
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return {
            "success": False,
            "error": str(e)
        }


# ============ MAIN INTEGRATION FUNCTION ============

async def create_training_module_song(
    policy_document: str,
    generated_lyrics: str,
    emphasis_points: list,
    module_name: str = "training_module"
) -> dict:
    """
    Main function to integrate with Melody LMS.
    Call this after generating lyrics with OpenAI.
    
    Args:
        policy_document: The policy text (for context)
        generated_lyrics: Lyrics from your OpenAI generation
        emphasis_points: List of key points to emphasize
        module_name: Name of the training module
    
    Returns:
        Dictionary with song file path and all metadata
    """
    
    # Determine style based on policy content
    policy_lower = policy_document.lower()
    
    if 'safety' in policy_lower or 'security' in policy_lower:
        style = "professional and serious corporate training music with clear articulation"
    elif 'customer' in policy_lower or 'service' in policy_lower:
        style = "friendly and upbeat customer service training music"
    elif 'compliance' in policy_lower or 'regulation' in policy_lower:
        style = "authoritative but engaging compliance training music"
    else:
        style = "clear and memorable corporate training music with inspiring tone"
    
    # Add emphasis points to the style description
    if emphasis_points:
        emphasis_str = ", ".join(emphasis_points[:3])  # Top 3 points
        style += f", emphasizing themes of {emphasis_str}"
    
    # Generate the song
    result = await generate_melody_training_song(
        lyrics=generated_lyrics,
        style=style,
        duration_ms=120000,  # 2 minutes
        save_path=f"./songs/{module_name}"
    )
    
    # Add module metadata
    if result["success"]:
        result["module_name"] = module_name
        result["emphasis_points"] = emphasis_points
        result["style_used"] = style
    
    return result


# ============ EXAMPLE USAGE ============

async def example():
    """
    Example showing the complete workflow
    """
    
    # Step 1: You already have lyrics from OpenAI
    lyrics_from_openai = """
    [Verse 1]
    Clock in on time, that's how we start the day
    Safety gear on, it's the company way
    Check your equipment before you begin
    Quality matters, we're here to win
    
    [Chorus]
    Follow the handbook, page by page
    Safety first at every stage
    We're a team, we're strong, we're trained
    Excellence is what we've gained
    
    [Verse 2]
    Document everything, keep records clear
    Communication helps us steer
    When in doubt, just ask around
    Together we stand on solid ground
    """
    
    # Step 2: Your policy document (simplified example)
    policy_doc = """
    Employee Safety and Quality Standards Policy:
    All employees must arrive on time and wear appropriate safety equipment.
    Quality control checks are mandatory. Documentation is required for all procedures.
    Team communication is essential for maintaining our high standards.
    """
    
    # Step 3: Key points to emphasize
    key_points = ["safety first", "quality control", "team communication", "documentation"]
    
    # Step 4: Generate the song
    result = await create_training_module_song(
        policy_document=policy_doc,
        generated_lyrics=lyrics_from_openai,
        emphasis_points=key_points,
        module_name="safety_quality_standards"
    )
    
    if result["success"]:
        print(f"\n🎉 Training song ready!")
        print(f"Module: {result['module_name']}")
        print(f"File: {result['file_path']}")
        print(f"Duration: {result['duration_seconds']} seconds")
        return result
    else:
        print(f"\n❌ Failed to generate song: {result['error']}")
        return None


# ============ DIFFERENT STYLE PRESETS ============

STYLE_PRESETS = {
    "safety": "serious and professional safety training music with clear, authoritative vocals",
    "onboarding": "welcoming and upbeat new employee orientation music",
    "compliance": "formal but engaging regulatory compliance training soundtrack",
    "sales": "energetic and motivational sales training music",
    "customer_service": "friendly and approachable customer interaction training music",
    "technical": "modern and focused technical training background music",
    "leadership": "inspiring and powerful leadership development music",
    "diversity": "inclusive and celebratory diversity training music",
    "remote_work": "calm and focused remote work policy training music",
    "data_security": "serious and urgent data protection training music"
}


async def generate_with_preset(
    lyrics: str,
    preset_name: str,
    duration_ms: int = 120000
) -> dict:
    """
    Generate a song using a predefined style preset.
    
    Args:
        lyrics: The song lyrics
        preset_name: One of the keys from STYLE_PRESETS
        duration_ms: Duration in milliseconds
    
    Returns:
        Generation result dictionary
    """
    
    style = STYLE_PRESETS.get(preset_name, STYLE_PRESETS["onboarding"])
    
    return await generate_melody_training_song(
        lyrics=lyrics,
        style=style,
        duration_ms=duration_ms
    )


# ============ RUN THE EXAMPLE ============

if __name__ == "__main__":
    # Make sure to set your ELEVENLABS_API_KEY environment variable!
    if not ELEVENLABS_API_KEY:
        print("⚠️  Please set your ELEVENLABS_API_KEY environment variable")
        print("   You can add it to a .env file or export it in your terminal")
    else:
        print("🚀 Starting Melody LMS Music Generation...")
        asyncio.run(example())
