# Fix: Add Missing Modules to Workflow Builder

## Issue Identified
The workflow builder only shows one "Image Generation" module, but based on Sprint 4.0 implementation, you should have:
1. **Image Generation** module with provider selection (Akool/Replicate)
2. **MCP Module** for calling any MCP server
3. **A/B Testing** module for provider comparison

## Quick Fix Instructions

### Option 1: Update Module Registry (Backend)
**File:** `src/modules/__init__.py`

```python
# This file should register all available modules
from .base import BaseModule
from .start_module import StartModule
from .end_module import EndModule
from .image_gen_module import ImageGenerationModule
from .qc_module import QCPassFailModule
from .mcp_module import MCPModule  # ADD THIS
from .ab_testing_module import ABTestingModule  # ADD THIS

# Module registry that the frontend queries
MODULE_REGISTRY = {
    'start': StartModule,
    'end': EndModule,
    'image_generation': ImageGenerationModule,
    'qc_pass_fail': QCPassFailModule,
    'mcp_module': MCPModule,  # ADD THIS
    'ab_testing': ABTestingModule  # ADD THIS
}

def get_available_modules():
    """Return list of available modules for frontend"""
    return [
        {
            'type': 'start',
            'name': 'Start',
            'category': 'Flow Control',
            'icon': '▶️'
        },
        {
            'type': 'end',
            'name': 'End',
            'category': 'Flow Control',
            'icon': '⏹️'
        },
        {
            'type': 'image_generation',
            'name': 'Image Generator',
            'category': 'Generation',
            'icon': '🎨',
            'description': 'Generate images using Akool or Replicate'
        },
        {
            'type': 'mcp_module',
            'name': 'MCP Service',
            'category': 'Generation',
            'icon': '🔌',
            'description': 'Call any MCP server (3000+ services)'
        },
        {
            'type': 'ab_testing',
            'name': 'A/B Testing',
            'category': 'Quality Control',
            'icon': '📊',
            'description': 'Compare outputs from multiple providers'
        },
        {
            'type': 'qc_pass_fail',
            'name': 'Pass/Fail QC',
            'category': 'Quality Control',
            'icon': '✓✗'
        }
    ]
```

### Option 2: Update Frontend Module Palette
**File:** `frontend/builder.html`

Find the section that defines `moduleCategories` in the Vue component and update it:

```javascript
// In the Vue component's data() function
moduleCategories: [
    {
        name: 'Flow Control',
        expanded: true,
        modules: [
            { type: 'start', name: 'Start', icon: '▶️' },
            { type: 'end', name: 'End', icon: '⏹️' }
        ]
    },
    {
        name: 'Generation',
        expanded: true,
        modules: [
            { 
                type: 'image_generation', 
                name: 'Image Generator', 
                icon: '🎨',
                description: 'Akool or Replicate'
            },
            { 
                type: 'mcp_module', 
                name: 'MCP Service', 
                icon: '🔌',
                description: '3000+ AI services'
            }
        ]
    },
    {
        name: 'Quality Control',
        expanded: true,
        modules: [
            { 
                type: 'qc_pass_fail', 
                name: 'Pass/Fail QC', 
                icon: '✓✗' 
            },
            { 
                type: 'ab_testing', 
                name: 'A/B Testing', 
                icon: '📊',
                description: 'Compare providers'
            }
        ]
    }
]
```

### Option 3: Add API Endpoint for Module Discovery
**File:** `src/main_workflow_db.py`

```python
@app.get("/api/modules")
async def get_available_modules():
    """Return list of available modules for the workflow builder"""
    return {
        "modules": [
            {
                "type": "start",
                "name": "Start",
                "category": "Flow Control",
                "icon": "▶️",
                "description": "Workflow entry point"
            },
            {
                "type": "end",
                "name": "End",
                "category": "Flow Control",
                "icon": "⏹️",
                "description": "Workflow termination"
            },
            {
                "type": "image_generation",
                "name": "Image Generator",
                "category": "Generation",
                "icon": "🎨",
                "description": "Generate images with provider selection",
                "config_schema": {
                    "provider": {
                        "type": "select",
                        "label": "Provider",
                        "options": ["akool", "replicate_sdxl"],
                        "default": "replicate_sdxl"
                    },
                    "prompt": {
                        "type": "textarea",
                        "label": "Prompt",
                        "required": True
                    }
                }
            },
            {
                "type": "mcp_module",
                "name": "MCP Service",
                "category": "Generation",
                "icon": "🔌",
                "description": "Call any MCP server",
                "config_schema": {
                    "mcp_server": {
                        "type": "select",
                        "label": "MCP Server",
                        "options": ["akool_mcp", "replicate_mcp", "claude_mcp", "dalle_mcp"]
                    },
                    "tool_name": {
                        "type": "select",
                        "label": "Tool",
                        "depends_on": "mcp_server"
                    }
                }
            },
            {
                "type": "ab_testing",
                "name": "A/B Testing",
                "category": "Quality Control",
                "icon": "📊",
                "description": "Compare outputs from multiple providers",
                "config_schema": {
                    "test_type": {
                        "type": "select",
                        "label": "Test Type",
                        "options": ["side_by_side", "blind", "statistical"],
                        "default": "side_by_side"
                    },
                    "selection_method": {
                        "type": "select",
                        "label": "Selection Method",
                        "options": ["manual", "auto_cost", "auto_speed", "auto_quality", "auto_balanced"],
                        "default": "manual"
                    }
                }
            },
            {
                "type": "qc_pass_fail",
                "name": "Pass/Fail QC",
                "category": "Quality Control",
                "icon": "✓✗",
                "description": "Human quality control checkpoint"
            }
        ]
    }
```

Then update the frontend to fetch modules dynamically:

```javascript
// In frontend/builder.html
async fetchModules() {
    try {
        const response = await axios.get('/api/modules');
        const modules = response.data.modules;
        
        // Group modules by category
        const categories = {};
        modules.forEach(module => {
            if (!categories[module.category]) {
                categories[module.category] = {
                    name: module.category,
                    expanded: true,
                    modules: []
                };
            }
            categories[module.category].modules.push(module);
        });
        
        this.moduleCategories = Object.values(categories);
    } catch (error) {
        console.error('Failed to fetch modules:', error);
    }
},

// Call in mounted()
mounted() {
    this.fetchModules();
}
```

## How the Modules Should Work

### 1. Image Generation Module
When dragged onto canvas, the configuration should show:
- **Provider Dropdown:** Akool, Replicate SDXL
- **Prompt:** Text area for image prompt
- **API Key:** (if BYOK enabled)
- **Additional settings** based on selected provider

### 2. MCP Module
When dragged onto canvas, the configuration should show:
- **MCP Server Dropdown:** List of available MCP servers
- **Tool Dropdown:** Tools available from selected server
- **Tool Arguments:** Dynamic form based on tool schema

### 3. A/B Testing Module
When dragged onto canvas:
- **Test Type:** Side-by-side, Blind, Statistical
- **Selection Method:** Manual, Auto (cost/speed/quality/balanced)
- **Statistical Settings:** Confidence level, min samples

## Testing the Fix

After implementing one of the above options:

1. **Hard refresh the browser:** Ctrl+F5 or Cmd+Shift+R
2. **Check browser console** for any errors
3. **Verify modules appear** in the palette
4. **Test dragging** each new module type
5. **Check configuration** forms appear correctly

## Expected Result

Your Module Palette should show:

```
▼ Flow Control
   ▶️ Start
   ⏹️ End

▼ Generation  
   🎨 Image Generator (Akool or Replicate)
   🔌 MCP Service (3000+ services)

▼ Quality Control
   ✓✗ Pass/Fail QC
   📊 A/B Testing
```

## Quick Debug Commands

```bash
# Check if modules are registered in backend
curl https://ai-workflow-spc.fly.dev/api/modules

# Check browser console for errors
# Open DevTools (F12) and look for any 404 or JavaScript errors

# Verify the modules exist in the codebase
ls src/modules/
# Should show: mcp_module.py, ab_testing_module.py, etc.
```

## If Still Not Working

The issue might be that the frontend is hardcoded with module types. Check:

1. **Frontend builder.html** - Look for hardcoded moduleCategories
2. **API endpoint** - Ensure /api/modules exists and returns data
3. **Module registration** - Verify modules are imported in __init__.py
4. **Browser cache** - Clear cache and cookies for the site

The Image Generation module should have a provider dropdown in its configuration (not separate modules for each provider), and you should definitely see the MCP Module and A/B Testing module options!