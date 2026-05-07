# 11Labs Music Integration for Melody LMS

This integration allows you to automatically generate training songs from policy documents and lyrics using the 11Labs Music API.

## 🚀 Quick Start

### 1. Installation

```bash
pip install elevenlabs python-dotenv aiohttp
```

### 2. Set up your API Key

Create a `.env` file in your project root:

```env
ELEVENLABS_API_KEY=your_api_key_here
```

### 3. Basic Usage

```python
import asyncio
from melody_quick_integration import create_training_module_song

async def generate_song():
    result = await create_training_module_song(
        policy_document="Your policy text here...",
        generated_lyrics="Your OpenAI-generated lyrics here...",
        emphasis_points=["safety", "quality", "teamwork"],
        module_name="safety_training"
    )
    return result

# Run it
asyncio.run(generate_song())
```

## 📁 File Descriptions

### `melody_quick_integration.py`
**Simple, ready-to-use integration** for immediate deployment.
- Quick function to generate songs from lyrics
- Preset styles for different training types
- Automatic file saving with timestamps
- Perfect for getting started quickly

### `elevenlabs_music_generator.py`
**Full-featured module** with advanced capabilities.
- Composition planning for complex songs
- Batch processing support
- HTTP fallback if SDK unavailable
- Section-based lyrics parsing
- Credit estimation
- Comprehensive error handling

## 🎵 Integration with Your Existing Workflow

### Current Melody LMS Flow:
1. ✅ Upload policy document
2. ✅ User specifies emphasis points
3. ✅ OpenAI generates lyrics
4. **NEW →** 11Labs generates the song automatically
5. **NEW →** Song saved and attached to training module

### Code Example for Your App:

```python
from melody_quick_integration import create_training_module_song

async def process_training_module(request):
    # Your existing code to get policy and generate lyrics
    policy = request.files['policy_document'].read()
    emphasis = request.form['emphasis_points']
    
    # Your existing OpenAI lyrics generation
    lyrics = generate_lyrics_with_openai(policy, emphasis)  # Your existing function
    
    # NEW: Generate the actual song
    song_result = await create_training_module_song(
        policy_document=policy,
        generated_lyrics=lyrics,
        emphasis_points=emphasis.split(','),
        module_name=request.form['module_name']
    )
    
    if song_result["success"]:
        # Attach to training module
        training_module.attach_song(song_result["file_path"])
        return {"status": "success", "song_path": song_result["file_path"]}
```

## 🎨 Style Presets

The system includes pre-configured styles for different training types:

- `safety` - Serious, professional safety training
- `onboarding` - Welcoming new employee orientation
- `compliance` - Formal regulatory training
- `sales` - Energetic sales training
- `customer_service` - Friendly service training
- `technical` - Modern technical training
- `leadership` - Inspiring leadership development
- `diversity` - Inclusive diversity training
- `remote_work` - Focused remote work training
- `data_security` - Urgent data protection training

### Using Presets:

```python
from melody_quick_integration import generate_with_preset

result = await generate_with_preset(
    lyrics=your_lyrics,
    preset_name="safety",
    duration_ms=120000  # 2 minutes
)
```

## 🎯 Advanced Features

### Using Composition Plans (Advanced Control)

For more control over song structure:

```python
from elevenlabs_music_generator import MelodyMusicGenerator

generator = MelodyMusicGenerator()

# Generate with detailed planning
result = await generator.generate_training_song(
    lyrics=lyrics_with_sections,  # Lyrics with [Verse], [Chorus] markers
    policy_keywords=["safety", "quality"],
    style="corporate training music",
    duration_ms=150000,  # 2.5 minutes
    use_composition_plan=True  # Enables section-by-section control
)
```

### Batch Processing Multiple Modules

```python
from elevenlabs_music_generator import batch_generate_songs

songs = await batch_generate_songs([
    {"lyrics": lyrics1, "keywords": ["safety"], "duration_ms": 120000},
    {"lyrics": lyrics2, "keywords": ["quality"], "duration_ms": 120000},
    {"lyrics": lyrics3, "keywords": ["teamwork"], "duration_ms": 120000}
], max_concurrent=3)
```

## 🎵 Song Duration Guidelines

- **Minimum**: 10 seconds (10,000 ms)
- **Maximum**: 5 minutes (300,000 ms)
- **Recommended**: 2-3 minutes (120,000-180,000 ms)

## 💰 Credit Usage

- Songs use credits based on duration
- Check your 11Labs dashboard for exact usage
- Pro accounts have generous credit allocations
- Estimate: ~100 credits per second of audio

## 🔧 Troubleshooting

### Common Issues:

1. **"API key not found"**
   - Ensure `.env` file exists with `ELEVENLABS_API_KEY=your_key`
   - Or pass directly: `MelodyMusicGenerator(api_key="your_key")`

2. **"Rate limit exceeded"**
   - Implement delays between requests
   - Use batch processing with `max_concurrent` parameter

3. **"Invalid prompt"**
   - Ensure prompt is under 4,100 characters
   - Individual lyric lines should be under 200 characters

## 📊 Monitoring & Logs

Generated songs are saved with timestamps:
```
./generated_songs/
├── training_song_20240115_143022.mp3
├── training_song_20240115_144531.mp3
└── training_song_composed_20240115_150122.mp3
```

## 🚀 Next Steps

1. **Test with a simple song**: Run `python melody_quick_integration.py`
2. **Integrate with your lyric generator**: Connect to your OpenAI flow
3. **Add to video pipeline**: Use generated MP3s in your video creation
4. **Implement performance tracking**: Select video clips based on quiz scores

## 📝 API Response Format

Successful generation returns:
```python
{
    "success": True,
    "file_path": "/path/to/generated_song.mp3",
    "duration_seconds": 120,
    "timestamp": "20240115_143022",
    "module_name": "safety_training",
    "emphasis_points": ["safety", "quality"],
    "style_used": "professional training music"
}
```

## 🔗 Additional Resources

- [11Labs Music API Docs](https://elevenlabs.io/docs/api-reference/music/compose)
- [11Labs Python SDK](https://github.com/elevenlabs/elevenlabs-python)
- [API Pricing](https://elevenlabs.io/pricing)

## 📧 Support

For 11Labs API issues: [support@elevenlabs.io](mailto:support@elevenlabs.io)
For integration help: Check the example files and test with your API key

---

**Remember**: You're on the Pro account with tons of credits - perfect for generating lots of training content! 🎉
