# MCP Module Integration for Workflow Builder
## Technical Specification for Individual MCP Server Modules

### Problem Statement
Currently, the Workflow Builder shows a generic "MCP Service" module, requiring users to configure which MCP server to use after dragging it onto the canvas. This creates friction and doesn't showcase the platform's 50+ integrations effectively.

### Solution
Display each installed/available MCP server as its own draggable module in the builder palette, organized by category.

---

## Implementation Guide

### 1. Backend Changes

#### A. Add API Endpoint to Get Installed MCP Servers
```python
# In src/main_workflow_db.py

@app.get("/api/mcp/installed-servers")
async def get_installed_mcp_servers(db: AsyncSession = Depends(get_db)):
    """
    Return list of installed/available MCP servers for the current user/workspace
    """
    # This should match what's shown in the MCP Hub
    installed_servers = [
        {
            "id": "dall-e-3",
            "name": "DALL-E 3",
            "category": "image_generation",
            "icon": "🎨",
            "description": "OpenAI's image generation",
            "tools_count": 1,
            "status": "installed"
        },
        {
            "id": "elevenlabs",
            "name": "ElevenLabs",
            "category": "audio_voice",
            "icon": "🎤",
            "description": "Text-to-speech service",
            "tools_count": 2,
            "status": "installed"
        },
        {
            "id": "github-copilot",
            "name": "GitHub Copilot",
            "category": "code_development",
            "icon": "💻",
            "description": "AI pair programmer",
            "tools_count": 3,
            "status": "installed"
        },
        {
            "id": "stable-diffusion",
            "name": "Stable Diffusion",
            "category": "image_generation",
            "icon": "🖼️",
            "description": "Open-source image generation",
            "tools_count": 3,
            "status": "installed"
        },
        {
            "id": "gpt-4-vision",
            "name": "GPT-4 Vision",
            "category": "multimodal",
            "icon": "👁️",
            "description": "Multimodal AI analysis",
            "tools_count": 2,
            "status": "installed"
        },
        {
            "id": "claude",
            "name": "Claude MCP",
            "category": "text_generation",
            "icon": "🤖",
            "description": "Anthropic's Claude AI",
            "tools_count": 3,
            "status": "installed"
        },
        {
            "id": "whisper-asr",
            "name": "Whisper ASR",
            "category": "audio_voice",
            "icon": "🎙️",
            "description": "Speech recognition",
            "tools_count": 2,
            "status": "installed"
        },
        {
            "id": "langchain",
            "name": "LangChain Tools",
            "category": "orchestration",
            "icon": "🔗",
            "description": "LLM orchestration tools",
            "tools_count": 3,
            "status": "installed"
        }
    ]
    
    return {"servers": installed_servers}
```

### 2. Frontend Changes - Workflow Builder

#### A. Update Module Palette Structure
```javascript
// In frontend/builder.html - Update the Vue component

const { createApp } = Vue;

createApp({
    data() {
        return {
            // Existing data...
            
            // Enhanced module categories with dynamic MCP servers
            moduleCategories: [
                {
                    name: 'Flow Control',
                    icon: '🔄',
                    expanded: true,
                    modules: [
                        { type: 'start', name: 'Start', icon: '▶️', isDraggable: true },
                        { type: 'end', name: 'End', icon: '⏹️', isDraggable: true }
                    ]
                },
                {
                    name: 'AI Generation',
                    icon: '🎨',
                    expanded: true,
                    modules: [] // Will be populated with MCP servers
                },
                {
                    name: 'Text & Language',
                    icon: '📝',
                    expanded: true,
                    modules: [] // Will be populated with MCP servers
                },
                {
                    name: 'Audio & Voice',
                    icon: '🔊',
                    expanded: false,
                    modules: [] // Will be populated with MCP servers
                },
                {
                    name: 'Code & Development',
                    icon: '💻',
                    expanded: false,
                    modules: [] // Will be populated with MCP servers
                },
                {
                    name: 'Data & Analysis',
                    icon: '📊',
                    expanded: false,
                    modules: [] // Will be populated with MCP servers
                },
                {
                    name: 'Quality Control',
                    icon: '✅',
                    expanded: true,
                    modules: [
                        { type: 'qc_pass_fail', name: 'Pass/Fail QC', icon: '✔️❌', isDraggable: true },
                        { type: 'ab_testing', name: 'A/B Testing', icon: '🔀', isDraggable: true }
                    ]
                }
            ],
            
            installedMCPServers: [],
            loadingMCPServers: false
        }
    },
    
    methods: {
        async fetchInstalledMCPServers() {
            this.loadingMCPServers = true;
            try {
                const response = await axios.get('/api/mcp/installed-servers');
                this.installedMCPServers = response.data.servers;
                this.integreateMCPServersIntoPalette();
            } catch (error) {
                console.error('Error fetching MCP servers:', error);
            } finally {
                this.loadingMCPServers = false;
            }
        },
        
        integrateMCPServersIntoPalette() {
            // Map MCP server categories to palette categories
            const categoryMap = {
                'image_generation': 'AI Generation',
                'text_generation': 'Text & Language',
                'audio_voice': 'Audio & Voice',
                'code_development': 'Code & Development',
                'data_analysis': 'Data & Analysis',
                'multimodal': 'AI Generation',
                'orchestration': 'Data & Analysis'
            };
            
            // Clear existing MCP modules
            this.moduleCategories.forEach(cat => {
                if (cat.name !== 'Flow Control' && cat.name !== 'Quality Control') {
                    cat.modules = [];
                }
            });
            
            // Add MCP servers as individual modules
            this.installedMCPServers.forEach(server => {
                const targetCategory = categoryMap[server.category] || 'AI Generation';
                const category = this.moduleCategories.find(cat => cat.name === targetCategory);
                
                if (category) {
                    category.modules.push({
                        type: `mcp_${server.id}`,
                        name: server.name,
                        icon: server.icon,
                        description: server.description,
                        mcpServerId: server.id,
                        toolsCount: server.tools_count,
                        isDraggable: true,
                        isMCP: true
                    });
                }
            });
            
            // Sort modules alphabetically within each category
            this.moduleCategories.forEach(cat => {
                cat.modules.sort((a, b) => a.name.localeCompare(b.name));
            });
        },
        
        // Update the drag start handler
        handleDragStart(module) {
            if (module.isMCP) {
                // Store MCP-specific data
                event.dataTransfer.setData('module', JSON.stringify({
                    type: 'mcp_service',
                    mcpServerId: module.mcpServerId,
                    name: module.name,
                    icon: module.icon,
                    config: {
                        mcp_server: module.mcpServerId,
                        server_name: module.name
                    }
                }));
            } else {
                // Handle regular modules
                event.dataTransfer.setData('module', JSON.stringify(module));
            }
        }
    },
    
    mounted() {
        // Fetch installed MCP servers when component mounts
        this.fetchInstalledMCPServers();
        
        // Refresh MCP servers periodically (every 30 seconds)
        setInterval(() => {
            this.fetchInstalledMCPServers();
        }, 30000);
    }
}).mount('#app');
```

#### B. Update Module Palette HTML Template
```html
<!-- In frontend/builder.html - Module Palette section -->

<div class="module-palette">
    <h3 style="margin-top: 0; padding: 1rem; border-bottom: 1px solid #333;">
        Module Palette
        <button @click="fetchInstalledMCPServers" 
                style="float: right; background: #333; border: none; color: #999; padding: 0.25rem 0.5rem; border-radius: 3px; cursor: pointer;"
                :disabled="loadingMCPServers">
            {{ loadingMCPServers ? '⟳' : '↻' }} Refresh
        </button>
    </h3>
    
    <div v-if="loadingMCPServers" style="padding: 1rem; text-align: center; color: #666;">
        Loading MCP servers...
    </div>
    
    <div v-for="category in moduleCategories" :key="category.name" class="module-category">
        <div @click="category.expanded = !category.expanded" 
             style="padding: 0.75rem; background: #1a1a1a; cursor: pointer; display: flex; align-items: center; gap: 0.5rem;">
            <span style="transition: transform 0.2s;" :style="{transform: category.expanded ? 'rotate(90deg)' : ''}">▶</span>
            <span>{{ category.icon }}</span>
            <span>{{ category.name }}</span>
            <span v-if="category.modules.length > 0" style="margin-left: auto; color: #666; font-size: 0.9rem;">
                ({{ category.modules.length }})
            </span>
        </div>
        
        <div v-show="category.expanded" style="padding: 0.5rem;">
            <div v-if="category.modules.length === 0" style="padding: 1rem; color: #666; text-align: center;">
                No modules available
            </div>
            
            <div v-for="module in category.modules" 
                 :key="module.type"
                 @dragstart="handleDragStart(module)"
                 :draggable="module.isDraggable"
                 class="module-item"
                 style="padding: 0.75rem; margin: 0.25rem 0; background: #2a2a2a; border-radius: 4px; cursor: move; transition: all 0.2s;">
                
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                    <span>{{ module.icon }}</span>
                    <span style="flex: 1;">{{ module.name }}</span>
                    <span v-if="module.isMCP" 
                          style="background: #ff6b35; color: #000; padding: 0.125rem 0.25rem; border-radius: 3px; font-size: 0.7rem; font-weight: bold;">
                        MCP
                    </span>
                </div>
                
                <div v-if="module.description" style="font-size: 0.8rem; color: #666; margin-top: 0.25rem;">
                    {{ module.description }}
                </div>
                
                <div v-if="module.toolsCount" style="font-size: 0.75rem; color: #555; margin-top: 0.25rem;">
                    {{ module.toolsCount }} tool{{ module.toolsCount > 1 ? 's' : '' }} available
                </div>
            </div>
        </div>
    </div>
</div>
```

#### C. Add Hover Effects and Visual Polish
```css
<style>
/* Add to the existing styles in builder.html */

.module-item:hover {
    background: #333 !important;
    transform: translateX(2px);
    box-shadow: 0 2px 8px rgba(255, 107, 53, 0.2);
}

.module-item[draggable="true"] {
    cursor: move;
}

.module-item.dragging {
    opacity: 0.5;
}

.module-category {
    border-bottom: 1px solid #222;
}

/* Special styling for MCP modules */
.module-item[data-mcp="true"] {
    border-left: 3px solid #ff6b35;
}

/* Loading spinner animation */
@keyframes spin {
    to { transform: rotate(360deg); }
}

.module-palette button:disabled {
    animation: spin 1s linear infinite;
}

/* Collapsed/expanded indicator animation */
.category-arrow {
    transition: transform 0.2s ease;
}
</style>
```

### 3. Workflow Canvas Integration

When an MCP module is dropped onto the canvas, it should:

1. **Display the specific MCP server name and icon** (not generic "MCP Service")
2. **Pre-configure the module** with the correct MCP server ID
3. **Show available tools** from that specific MCP server
4. **Display custom configuration** based on the MCP server type

```javascript
// Handle drop event on canvas
handleDrop(event) {
    const moduleData = JSON.parse(event.dataTransfer.getData('module'));
    
    if (moduleData.type === 'mcp_service') {
        // Create a properly configured MCP module
        const newModule = {
            id: `module_${Date.now()}`,
            type: 'mcp_service',
            name: moduleData.name,
            icon: moduleData.icon,
            config: {
                mcp_server: moduleData.mcpServerId,
                server_name: moduleData.server_name,
                // Pre-populate with server-specific defaults
                ...this.getServerDefaults(moduleData.mcpServerId)
            },
            position: {
                x: event.offsetX,
                y: event.offsetY
            }
        };
        
        this.workflow.modules.push(newModule);
    } else {
        // Handle regular modules
        // ... existing code
    }
}

getServerDefaults(serverId) {
    // Return server-specific default configurations
    const defaults = {
        'dall-e-3': {
            tool_name: 'generate_image',
            size: '1024x1024',
            quality: 'standard'
        },
        'claude': {
            tool_name: 'chat',
            model: 'claude-3-opus',
            max_tokens: 1000
        },
        'stable-diffusion': {
            tool_name: 'txt2img',
            steps: 20,
            cfg_scale: 7.5
        },
        // Add more server-specific defaults
    };
    
    return defaults[serverId] || {};
}
```

### 4. Benefits of This Approach

1. **Improved Discoverability** - Users can immediately see all available AI services
2. **Reduced Friction** - No need to configure generic MCP modules
3. **Better Organization** - Services grouped by category (Generation, Text, Audio, etc.)
4. **Visual Clarity** - Each service has its own icon and description
5. **Showcases Platform Value** - Highlights the 50+ integrations visually

### 5. Additional Enhancements

#### A. Search/Filter in Module Palette
```html
<input type="text" 
       v-model="moduleSearchQuery" 
       placeholder="Search modules..." 
       style="width: 100%; padding: 0.5rem; background: #1a1a1a; border: 1px solid #333; color: #fff;">
```

#### B. Favorites/Recently Used
```javascript
// Track frequently used modules
trackModuleUsage(moduleType) {
    const usage = localStorage.getItem('moduleUsage') || '{}';
    const stats = JSON.parse(usage);
    stats[moduleType] = (stats[moduleType] || 0) + 1;
    localStorage.setItem('moduleUsage', JSON.stringify(stats));
}
```

#### C. Module Preview on Hover
```html
<div v-if="hoveredModule" class="module-preview">
    <h4>{{ hoveredModule.name }}</h4>
    <p>{{ hoveredModule.description }}</p>
    <div>Tools: {{ hoveredModule.toolsCount }}</div>
    <div>Category: {{ hoveredModule.category }}</div>
</div>
```

### 6. Testing Checklist

- [ ] All installed MCP servers appear in the palette
- [ ] MCP servers are properly categorized
- [ ] Drag and drop works for MCP modules
- [ ] Dropped modules retain their identity (not generic)
- [ ] Module count badges update correctly
- [ ] Refresh button fetches latest MCP servers
- [ ] Search/filter works if implemented
- [ ] Mobile responsive (if applicable)

### 7. Deployment Steps

```bash
# 1. Update backend with new endpoint
# 2. Update frontend builder.html
# 3. Test locally
npm run dev

# 4. Commit changes
git add -A
git commit -m "feat: Display individual MCP servers as modules in builder"

# 5. Deploy
fly deploy --no-cache

# 6. Verify in production
```

---

## Result

After implementation, users will see:

**Instead of:**
- Generation
  - Image Generation
  - MCP Service (generic)

**They'll see:**
- AI Generation
  - 🎨 DALL-E 3
  - 🖼️ Stable Diffusion
  - 👁️ GPT-4 Vision
  
- Text & Language
  - 🤖 Claude MCP
  - Additional text services...

- Audio & Voice
  - 🎤 ElevenLabs
  - 🎙️ Whisper ASR

This makes the platform much more intuitive and showcases the breadth of integrations immediately in the workflow builder.
