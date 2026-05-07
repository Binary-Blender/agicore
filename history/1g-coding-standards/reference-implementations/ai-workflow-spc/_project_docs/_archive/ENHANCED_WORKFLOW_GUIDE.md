# 🚀 Enhanced AI Workflow Platform

## What's New

You now have a **visual workflow builder** that integrates all your Binary Blender AI components:

1. **Image Generation** - Using Replicate (FLUX Pro/Dev, SDXL)
2. **Video Generation** - Using RunwayML (Gen3 Alpha)
3. **Lip Sync** - Using AKOOL API
4. **Visual Workflow Builder** - Drag-and-drop interface
5. **Multiple QC Types** - Pass/Fail and Rating systems

## Access the Platform

### 🌐 **Go to http://localhost:8002**

You'll see a Visio-style interface where you can:
- **Drag components** from the left palette
- **Connect them** by dragging from output to input ports
- **Configure properties** in the right panel
- **Run workflows** with the play button

## Available Components

### 🎨 AI Generation
- **Image Generator** - Create images with FLUX or Stable Diffusion
- **Video Generator** - Create videos from text or images
- **Lip Sync** - Make images talk with audio

### ✅ Quality Control
- **Pass/Fail QC** - Simple approve/reject
- **Rating QC** - 5-star rating system

### 📥📤 Input/Output
- **Input** - Where you enter prompts
- **Output** - Final result of workflow

## Example Workflows

### 1. Simple Image Generation
```
[Input] → [Image Generator] → [Pass/Fail QC] → [Output]
```

### 2. Image to Video
```
[Input] → [Image Generator] → [Pass/Fail QC] → [Video Generator] → [Pass/Fail QC] → [Output]
```

### 3. Talking Avatar
```
[Input] → [Image Generator] → [Pass/Fail QC] → [Lip Sync] → [Output]
           ↓
        [Audio Input]
```

## How to Use

1. **Build Your Workflow**:
   - Drag components from left palette onto canvas
   - Connect them by dragging from output (right) to input (left) ports
   - Click nodes to configure their properties

2. **Run Workflow**:
   - Click "▶️ Run Workflow"
   - Enter your prompt when asked
   - Review generated content when QC appears
   - Click Pass ✅ or Fail ❌

3. **Save/Load Workflows**:
   - Click "💾 Save" to download workflow as JSON
   - Load by dragging JSON file onto canvas (coming soon)

## API Keys Required

To use real AI generation (not mock images), add these to `.env`:

```bash
# Copy .env.example to .env
cp .env.example .env

# Then add your keys:
REPLICATE_API_TOKEN=your-replicate-key    # For images
RUNWAYML_API_KEY=your-runway-key         # For videos
AKOOL_API_KEY=your-akool-key             # For lip sync
```

## Asset Storage

All generated assets are saved in:
```
C:\Users\Chris\Documents\_DevProjects\ai-workflow-spc\generated_assets\
```

## Features from Binary Blender

This integrates your existing Binary Blender platform:
- Uses the same API endpoints
- Compatible with Binary Blender asset repository
- Supports all the same models and options
- Can be extended with more MCP components

## Extending the Platform

To add more MCP components:

1. Create a new MCP server in `src/mcp_servers/`
2. Register it in `enhanced_workflow.py`
3. Add UI component in `enhanced_ui.html`

## Differences from Original

Your original Binary Blender platform:
- **Was**: Individual apps for each AI tool
- **Is Now**: Unified workflow builder connecting all tools

Benefits:
- **Visual workflows** instead of code
- **Reusable components** via MCP standard
- **Human-in-the-loop QC** at any step
- **Progressive automation** (future: reduce QC as quality improves)

## Next Steps

1. **Add your API keys** to `.env`
2. **Try the example workflows** above
3. **Create complex pipelines** combining multiple AI tools
4. **Save successful workflows** for reuse

The platform is designed to grow with you - add any AI tool as an MCP component and it automatically appears in the workflow builder!

---

**Ready? Open http://localhost:8002 and start building AI workflows visually!** 🎨🎬🗣️