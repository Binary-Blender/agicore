# NovaSyn AI — Session Export

## User

let's discuss what an app for writer's might look like.  we'll want tools for generating content, transforming content, organizing content, etc.  these are a few documents that might have some ideas we can use.  it would also be nice to include some canva-like features, but with a focus on desktop publishing tools and creating pdf output.

## AI (claude-opus-4-6)



# NovaSyn Writer — The Complete Vision

Let me think through this holistically. You're essentially describing three integrated workspaces in one app:

1. **An AI writing engine** (generate, transform, expand, refine)
2. **A content organization system** (encyclopedia, KB, project management)
3. **A desktop publishing / layout tool** (Canva-like but PDF-focused)

And all of it running locally in Electron, SQLite database, multi-model, with the full NovaSyn ecosystem integration (Send-To, Vault, Orchestrator, etc.)

Let me build this out.

---

## THE THREE WORKSPACES

```
NovaSyn Writer
├── 📝 THE FORGE (Writing & Generation)
│   ├── AI-assisted writing
│   ├── Content transformation
│   ├── Discovery writing mode
│   └── Multi-model comparison for prose
│
├── 📚 THE LIBRARY (Organization & Knowledge)
│   ├── Encyclopedia system
│   ├── Personal Knowledge Base
│   ├── Project structure
│   └── Timeline & continuity tracking
│
└── 🎨 THE PRESS (Layout & Publishing)
    ├── Page layout editor
    ├── Template system
    ├── Typography controls
    └── PDF export engine
```

The key insight: **these aren't separate modes you switch between. They're panels that work together.** You're writing in the Forge, referencing your Library, and seeing a live preview in the Press — all at once.

---

## WORKSPACE 1: THE FORGE (Writing & Generation)

### The Editor

The core writing experience. Not a basic textarea — a proper rich text editor with AI woven into every interaction.

```
┌─────────────────────────────────────────────────────────────────┐
│ THE FORGE                                          Chapter 3 ▾ │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  [B] [I] [U] [H1] [H2] [H3] [—] [❝] [🔗] [📷] │ Model: Claude ▾│
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                                                         │   │
│  │  The house breathed around her. That was the only       │   │
│  │  word for it — a slow, patient respiration that lived   │   │
│  │  in the walls and beneath the floorboards. She'd        │   │
│  │  noticed it the first night, lying awake in the         │   │
│  │  upstairs bedroom with its sloped ceiling and           │   │
│  │  water-stained wallpaper, listening to the old place    │   │
│  │  settle and shift like something dreaming.              │   │
│  │                                                         │   │
│  │  ▊                                                      │   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Words: 1,247 / 2,500 target  │  Reading time: 5 min          │
│  Session: 847 words            │  Context: 3,200 / 128K tokens │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│ 💡 AI Panel                                        [Collapse ▾]│
│                                                                 │
│ [Continue Writing] [Expand Selection] [Rewrite Selection]       │
│ [Brainstorm] [Dialogue Polish] [Describe Setting]               │
│ [Custom Prompt...]                                              │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────┐    │
│ │ AI suggestion will appear here when you use a tool...   │    │
│ │                                                         │    │
│ │                    [Accept] [Reject] [Edit] [Compare]   │    │
│ └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

### AI Writing Tools

These are the core generation and transformation tools, accessible via toolbar, right-click, or keyboard shortcuts:

**Generation Tools (Create New Content)**

```
CONTINUE WRITING
├── Takes the last 500-1000 words as context
├── Plus the chapter outline beats
├── Plus relevant encyclopedia entries
├── Generates the next 200-500 words
├── Discovery mode: Higher temperature, surprise you
├── Outline mode: Follows the beat sequence strictly
└── Keyboard shortcut: Ctrl+Shift+Enter

BRAINSTORM
├── "Give me 5 ways this scene could go"
├── "What would [character] do in this situation?"
├── "What sensory details could I add here?"
├── "What's the most unexpected thing that could happen?"
├── Results appear as a list you can pick from
├── Selected idea gets inserted or used as a prompt
└── Keyboard shortcut: Ctrl+Shift+B

WRITE SCENE FROM BEAT
├── Select a beat from your chapter outline
├── AI generates a full scene from that beat
├── Uses encyclopedia for character voices, settings
├── Respects MUST INCLUDE / MUST NOT INCLUDE
└── Great for getting past blank page paralysis

DIALOGUE GENERATOR
├── Select two characters from your encyclopedia
├── Describe what they need to discuss/accomplish
├── AI generates dialogue in their established voices
├── Includes beats, pauses, subtext notes
└── You refine and integrate into the narrative
```

**Transformation Tools (Modify Existing Content)**

```
EXPAND SELECTION
├── Select a paragraph or passage
├── AI expands it with more detail
├── Options: Sensory detail / Internal monologue / 
│   Action beats / Dialogue / Description
├── Respects established voice and tone
└── Keyboard shortcut: Ctrl+Shift+E

COMPRESS SELECTION
├── Select a passage that's too long
├── AI tightens it while keeping essential content
├── Options: Light trim / Heavy trim / Summary only
└── Keyboard shortcut: Ctrl+Shift+C

REWRITE SELECTION
├── Select text, AI rewrites in different ways
├── Options: More emotional / More action / 
│   More literary / More conversational /
│   Different POV / Different tense
├── Side-by-side comparison with original
└── Keyboard shortcut: Ctrl+Shift+R

DIALOGUE POLISH
├── Select dialogue passage
├── AI adjusts to match character voice profiles
├── Shows what changed and why
└── From the Encyclopedia Prompt System methodology

TONE SHIFT
├── Select passage
├── Shift emotional register
├── Options: Darker / Lighter / More tense / 
│   More reflective / More urgent / More dreamlike
└── Maintains plot information while changing feel

SHOW DON'T TELL
├── Select a "telling" passage
│   ("She was angry and scared")
├── AI rewrites as "showing"
│   ("Her hands trembled as she gripped 
│    the edge of the table, knuckles white...")
└── One of the most useful tools for fiction writers

VOICE MATCH
├── Paste a sample of your own writing (or from your KB)
├── AI analyzes the style
├── Select text in your draft
├── AI rewrites to match the voice sample
└── This is the KB/voice training from Course 6 in action
```

**Analysis Tools (Understand Your Content)**

```
CONSISTENCY CHECK
├── Scans current chapter against encyclopedia
├── Flags contradictions
│   "⚠️ You wrote Elias has brown eyes in paragraph 3, 
│    but his encyclopedia entry says gray with blue flecks"
├── Flags timeline issues
│   "⚠️ This chapter is set October 5th but the previous 
│    chapter ended on October 7th"
└── Flags unresolved references

PACING ANALYSIS
├── Analyzes scene-by-scene pacing
├── Visualizes action vs reflection vs dialogue ratio
├── Highlights slow sections and rushed sections
├── Suggests where to expand or trim
└── Shows as a heat map along the chapter

READABILITY METRICS
├── Reading level (Flesch-Kincaid, etc.)
├── Sentence length variation
├── Word frequency (flag overused words)
├── Paragraph length distribution
├── Dialogue-to-narrative ratio
└── Passive voice percentage

CHARACTER VOICE AUDIT
├── Analyzes dialogue across chapters
├── "Are all characters sounding the same?"
├── Flags where Character A sounds like Character B
├── Suggests differentiation based on voice profiles
└── Shows vocabulary and sentence pattern differences
```

### Discovery Writing Mode

This deserves its own section because it maps directly to the Shawn Inmon approach from your reference material:

```
┌─────────────────────────────────────────────────────────────────┐
│ 🔮 DISCOVERY MODE                                    [Exit ▾]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Temperature: ████████░░ 0.8    │  Surprise Level: Medium      │
│                                                                 │
│  Current Thread: "She opened the basement door and—"            │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                                                         │   │
│  │  [Your writing space — you write freely here]           │   │
│  │                                                         │   │
│  │  She opened the basement door and the smell hit her     │   │
│  │  first. Not mildew or dust — something older. Like      │   │
│  │  stone that had been wet for centuries. The stairs       │   │
│  │  descended into a darkness so complete it seemed to      │   │
│  │  have texture, and from somewhere far below, she         │   │
│  │  heard ▊                                                │   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─ DISCOVERY SUGGESTIONS ──────────────────────────────────┐  │
│  │                                                           │  │
│  │  🎲 "...a sound like breathing — slow, patient,          │  │
│  │      rhythmic, as if the house itself had lungs"          │  │
│  │      [Insert] [Modify] [New Suggestion]                   │  │
│  │                                                           │  │
│  │  🎲 "...dripping. Steady, metronomic. But the pipes      │  │
│  │      had been dry for forty years"                        │  │
│  │      [Insert] [Modify] [New Suggestion]                   │  │
│  │                                                           │  │
│  │  🎲 "...her own name, spoken in a voice she recognized   │  │
│  │      but couldn't place"                                  │  │
│  │      [Insert] [Modify] [New Suggestion]                   │  │
│  │                                                           │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  💡 "What if the basement connects to something?"              │
│  💡 "What if she finds evidence someone else was here?"        │
│  💡 "What if the journal has an entry about this exact moment?"│
│                                                                 │
│  [Generate More Suggestions] [Follow Thread: ___________]       │
│                                                                 │
│  ── Discovery Log ──────────────────────────────────────────── │
│  • Started with: "She opened the basement door"                │
│  • Thread: Discovered the sound / breathing motif              │
│  • Thread: The basement predates the house                     │
│  • Surprise: She found a second journal (!)                    │
│  • NOTE: This changes the plot — update encyclopedia?          │
│  ──────────────────────────────────────────────────────────── │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**How Discovery Mode Works:**

- You write freely, like any writing app
- AI generates **suggestions** as you write (not replacements — options)
- Higher temperature means wilder suggestions
- You can accept, reject, modify, or ignore
- The **Discovery Log** tracks the path you took, including surprises
- "What if" prompts appear when you pause, nudging you to explore
- You can "Follow Thread" — tell the AI a direction and get more suggestions along that line
- After the session, you can review the Discovery Log and decide what to keep
- **Crucially:** Discovery Mode doesn't require an outline. It's the opposite of the Encyclopedia method. It's Shawn Inmon's "writing to the end of the headlights"

**The Bridge Between Discovery and Structure:**

After a discovery session, you can:
```
[Convert Discovery Session to...]
├── Encyclopedia entries (characters/settings that emerged)
├── Chapter outline (structure what you discovered)
├── Plot timeline (place events in sequence)
└── Continue in structured mode from here
```

This means writers can **discover first, then organize** — or **organize first, then generate.** Both workflows are supported.

---

## WORKSPACE 2: THE LIBRARY (Organization & Knowledge)

### Project Structure

```
┌─────────────────────────────────────────────────────────────────┐
│ 📚 THE LIBRARY                                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  📁 THE JOURNAL (Novel Project)                                 │
│  ├── 📋 Encyclopedia                                           │
│  │   ├── 👤 Characters                                         │
│  │   │   ├── Narrator (unnamed)                                │
│  │   │   ├── Elias                                             │
│  │   │   ├── Jess (supporting)                                 │
│  │   │   └── + Add Character                                   │
│  │   ├── 🌍 World & Settings                                   │
│  │   │   ├── Ashwick (overview)                                │
│  │   │   ├── The House on Miller Road                          │
│  │   │   ├── The Bridge                                        │
│  │   │   ├── The Oak Tree                                      │
│  │   │   ├── The Hollow Bean                                   │
│  │   │   ├── The Cemetery                                      │
│  │   │   └── + Add Location                                    │
│  │   ├── ⚙️ Rules & Mechanics                                  │
│  │   │   ├── The Veil                                          │
│  │   │   ├── The Journal (the object itself)                   │
│  │   │   └── + Add Rule                                        │
│  │   ├── 📅 Timeline                                           │
│  │   │   └── October 1 – November 20                           │
│  │   └── 🔗 Relationships                                      │
│  │       └── Narrator ↔ Elias (visual graph)                   │
│  │                                                              │
│  ├── 📖 Manuscript                                             │
│  │   ├── Ch 1: "The House" ✅ (2,503 words)                    │
│  │   ├── Ch 2: "The Familiar Stranger" ✅ (2,847 words)        │
│  │   ├── Ch 3: "The Shared Dream" 🔄 (1,247 / 2,500)          │
│  │   ├── Ch 4: "Names on Stone" ⬜ (outline ready)             │
│  │   ├── Ch 5: "The First Kiss" ⬜ (outline ready)             │
│  │   ├── Ch 6: "The Truth" ⬜ (outline ready)

*3/1/2026, 4:34:15 PM*

---

## User

keep going.

## AI (claude-opus-4-6)

# **CONTINUING: THE LIBRARY**

```
│  │   ├── Ch 7: "The Bargain" ⬜ (outline ready)               │
│  │   ├── Ch 8: "October 23rd" ⬜ (outline ready)              │
│  │   ├── Ch 9: "After" ⬜ (outline ready)                     │
│  │   ├── Ch 10: "The Journal" ⬜ (outline ready)              │
│  │   └── + Add Chapter                                         │
│  │                                                              │
│  ├── 📊 Outline                                                │
│  │   ├── Act 1: Arrival & Discovery (Ch 1-3)                  │
│  │   ├── Act 2: Love & Truth (Ch 4-7)                         │
│  │   ├── Act 3: Loss & Transcendence (Ch 8-10)                │
│  │   └── Beat Sheet (full outline view)                        │
│  │                                                              │
│  ├── 🧠 Knowledge Base                                         │
│  │   ├── Ideas (half-baked thoughts, voice notes)              │
│  │   ├── Stories (life experiences, lessons)                   │
│  │   ├── Frameworks (how I think about writing)                │
│  │   ├── Voice Profile (extracted from my writing)             │
│  │   └── Research Notes                                        │
│  │                                                              │
│  ├── 📎 Source Material                                        │
│  │   ├── Original YouTube Shorts scripts                       │
│  │   ├── Inspiration images                                    │
│  │   ├── Reference articles                                    │
│  │   └── Mood board                                            │
│  │                                                              │
│  ├── 🔍 Continuity Tracker                                     │
│  │   ├── Active plants (foreshadowing placed)                  │
│  │   ├── Unresolved threads                                    │
│  │   ├── Character knowledge states                            │
│  │   └── Timeline conflicts (0 ✅)                              │
│  │                                                              │
│  └── 📈 Project Stats                                          │
│      ├── Total words: 6,597 / 25,000 target (26%)             │
│      ├── Chapters complete: 2 / 10                             │
│      ├── API cost so far: $1.23                                │
│      ├── Writing sessions: 7                                   │
│      └── Average words per session: 942                        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Encyclopedia Entry Editor

When you click on any encyclopedia entry, it opens in a structured form that maps directly to the Encyclopedia Prompt System templates:

```
┌─────────────────────────────────────────────────────────────────┐
│ 👤 CHARACTER: Elias                           [Save] [Delete]   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Role: [Love Interest          ▾]                               │
│  Status: [Active ▾] First Appears: [Chapter 2 ▾]               │
│                                                                 │
│  ── PHYSICAL ────────────────────────────────────────────────── │
│  Age: [Appears late 20s, actually ageless              ]        │
│  Appearance:                                                    │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Dark hair, needs cutting. Gray eyes with blue flecks.   │   │
│  │ Wears an old coat that feels anachronistic — like it    │   │
│  │ belongs to another century. Touch is cool, not cold.    │   │
│  │ When solid: fully present, real. When fading:           │   │
│  │ translucent, smoke-like at the edges.                   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ── PSYCHOLOGICAL ───────────────────────────────────────────── │
│  Core Motivation: [To be with her, however briefly         ]    │
│  Greatest Fear:   [That she won't come back                ]    │
│  Secret/Wound:    [Knows more about the loop than he says  ]    │
│  Emotion Style:   [Sad smiles, patient silences, rare      ]    │
│                   [intensity when it matters                ]    │
│                                                                 │
│  ── VOICE ───────────────────────────────────────────────────── │
│  Speech Patterns:                                               │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Measured, thoughtful. Speaks like someone with all the  │   │
│  │ time in the world (because he does). Occasional         │   │
│  │ archaic phrasing. Direct about emotions when it         │   │
│  │ matters. Never rushes. Lets silences breathe.           │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Sample Dialogue:                                               │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ "It's you." (first words — recognition)                 │   │
│  │ "I don't remember details. I remember feelings."        │   │
│  │ "Every October I wake up knowing someone is coming.     │   │
│  │  I just didn't know it would be you."                   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ── ARC ─────────────────────────────────────────────────────── │
│  Starting State:  [Waiting, hoping, uncertain              ]    │
│  Key Moments:     [Ch2: Found | Ch5: Kiss | Ch8: Lost     ]    │
│  Ending State:    [Scattered, waiting again                ]    │
│                                                                 │
│  ── RELATIONSHIPS ───────────────────────────────────────────── │
│  → Narrator: [Recognition → Love → Loss → Eternal bond    ]    │
│  → The House: [Drawn to it, doesn't know why               ]   │
│  → The Veil:  [Subject to its rules, cannot resist pull    ]   │
│                                                                 │
│  ── CONTINUITY NOTES ────────────────────────────────────────── │
│  ⚠️ Auto-tracked:                                               │
│  • Ch2: Described as "dark hair, gray eyes" ✅                  │
│  • Ch2: Coat described as "old, wrong century" ✅               │
│  • Ch3: Touch described as "cool like autumn water" ✅          │
│  • Ch3: Says he "remembers feelings, not details" ✅            │
│                                                                 │
│  ── AI TOOLS ────────────────────────────────────────────────── │
│  [Generate Full Profile from Notes]                             │
│  [Extract from Manuscript] (scans chapters for mentions)        │
│  [Generate Dialogue Samples]                                    │
│  [Compare Against Manuscript] (find inconsistencies)            │
│  [Send to AI Chat for Discussion]                               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### The Knowledge Base Integration

This pulls directly from Course 6 — Building Your Personal Knowledge Base. The KB lives inside the project but can also be global across all projects:

```
┌─────────────────────────────────────────────────────────────────┐
│ 🧠 KNOWLEDGE BASE                                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Scope: [This Project ▾] [Global ▾] [Both]                     │
│                                                                 │
│  📁 Ideas                                                       │
│  ├── "What if the journal is writing itself in real time?"      │
│  ├── "Autumn as metaphor for liminality — things ending         │
│  │    and beginning simultaneously"                              │
│  ├── "The ticking in the walls = heartbeat of the house"        │
│  ├── "Time isn't linear, it's circular — that's the real       │
│  │    theme, not just the plot"                                  │
│  └── + Add Idea                                                 │
│                                                                 │
│  📁 Stories (Personal experiences to draw from)                  │
│  ├── "Moving to a small town after burnout — that feeling       │
│  │    of arriving somewhere that feels like it was waiting"      │
│  ├── "Finding my grandmother's letters — the handwriting        │
│  │    felt alive even though she'd been gone for years"          │
│  └── + Add Story                                                │
│                                                                 │
│  📁 Frameworks                                                   │
│  ├── "My rule: Every chapter should end with the reader         │
│  │    needing to turn the page"                                  │
│  ├── "Dialogue should never be on-the-nose. People talk         │
│  │    around what they mean."                                    │
│  ├── "Setting is character. The house is a person."             │
│  └── + Add Framework                                            │
│                                                                 │
│  📁 Voice Profile                                                │
│  ├── Tone: Literary but accessible, melancholic not maudlin     │
│  ├── Sentence structure: Mix of long flowing and short sharp    │
│  ├── Favorite devices: Sensory detail, synesthesia,             │
│  │    personification of place                                   │
│  ├── Avoids: Clichés, purple prose, over-explaining emotion     │
│  └── [Regenerate from Manuscript] [Regenerate from Samples]     │
│                                                                 │
│  ── AI TOOLS ────────────────────────────────────────────────── │
│  [Analyze My Voice from This KB]                                │
│  [Generate Content Using KB Only]                               │
│  [Find Connections Between Ideas]                               │
│  [Suggest What's Missing from My KB]                            │
│  [Export KB Summary for Other Models]                            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Chapter Outline Editor

The outline view maps directly to the Encyclopedia Prompt System's chapter outline template, but presented visually:

```
┌─────────────────────────────────────────────────────────────────┐
│ 📊 OUTLINE — Chapter 3: "The Shared Dream"                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Timeline: [October 5th-6th        ]                            │
│  Settings: [The house, the bridge, the Hollow Bean  ]           │
│  Characters: [Narrator ▾] [Elias ▾] [+ Add]                    │
│  Target Length: [2,500 words]                                   │
│                                                                 │
│  ── BEAT SEQUENCE ───────────────────────────────────────────── │
│  (Drag to reorder)                                              │
│                                                                 │
│  ☐ 1. Morning — she re-reads the journal, notices new          │
│       handwriting has appeared overnight                        │
│       [Expand ▾] [AI: Write Scene] [Notes]                     │
│                                                                 │
│  ☐ 2. Walking to meet Elias — internal monologue about         │
│       trust, whether this is real or she's losing her mind      │
│       [Expand ▾] [AI: Write Scene] [Notes]                     │
│                                                                 │
│  ☐ 3. Meeting at the bridge — he's sitting on the rail,        │
│       feet dangling, looks younger in daylight                  │
│       [Expand ▾] [AI: Write Scene] [Notes]                     │
│                                                                 │
│  ☐ 4. The conversation — she asks direct questions, he         │
│       answers what he can, admits there are things he           │
│       doesn't understand about his own existence                │
│       [Expand ▾] [AI: Write Scene] [Notes]                     │
│                                                                 │
│  ☐ 5. The shared dream revelation — both dreamed of a          │
│       field of dead flowers, holding hands, couldn't            │
│       see each other's faces                                    │
│       [Expand ▾] [AI: Write Scene] [Notes]                     │
│                                                                 │
│  ☐ 6. Coffee at the Hollow Bean — Jess doesn't seem to         │
│       notice anything strange about Elias                       │
│       [Expand ▾] [AI: Write Scene] [Notes]                     │
│                                                                 │
│  ☐ 7. Walking home alone — processing, the ache is real,       │
│       she doesn't want to go back to the empty house            │
│       [Expand ▾] [AI: Write Scene] [Notes]                     │
│                                                                 │
│  ☐ 8. Night — new journal entry appears: October 6th           │
│       "The dream was real. All of them were."                   │
│       [Expand ▾] [AI: Write Scene] [Notes]                     │
│                                                                 │
│  [+ Add Beat]                                                   │
│                                                                 │
│  ── EMOTIONAL ARC ───────────────────────────────────────────── │
│  Opens with:  [Confusion, cautious hope              ]          │
│  Moves through: [Trust building, wonder, vulnerability]         │
│  Closes with: [Deeper connection, fear of losing it   ]         │
│                                                                 │
│  ── MUST INCLUDE ────────────────────────────────────────────── │
│  ☑ Shared dream (dead flowers field, holding hands)             │
│  ☑ Jess at coffee shop — establishes she can't see             │
│    anything odd about Elias                                     │
│  ☑ New journal entry appearing                                  │
│  ☑ His admission: "I don't understand it either"               │
│  [+ Add Required Element]                                       │
│                                                                 │
│  ── MUST NOT INCLUDE ────────────────────────────────────────── │
│  ☒ Kiss (save for Chapter 5)                                   │
│  ☒ Full explanation of veil (save for Chapter 6-8)             │
│  ☒ Past life names Eleanor/Thomas (save for Chapter 4)         │
│  [+ Add Restriction]                                            │
│                                                                 │
│  ── CHAPTER AI TOOLS ────────────────────────────────────────── │
│  [Generate Full Chapter from Outline]                           │
│  [Generate Scene-by-Scene]                                      │
│  [Discovery Write This Chapter]                                 │
│  [Check Outline Against Encyclopedia]                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### The Continuity Tracker

This is one of the most valuable tools for novel-length work. It runs automatically as you write:

```
┌─────────────────────────────────────────────────────────────────┐
│ 🔍 CONTINUITY

*3/1/2026, 4:35:38 PM*

---

## User

keep going

## AI (claude-opus-4-6)

# **CONTINUING: CONTINUITY TRACKER**

```
┌─────────────────────────────────────────────────────────────────┐
│ 🔍 CONTINUITY TRACKER                                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ── ACTIVE PLANTS (Foreshadowing Placed) ────────────────────── │
│                                                                 │
│  🌱 Ch1: Ticking in the walls                                   │
│     Plants: Something alive about the house                     │
│     Pays off: Ch8 (ticking stops when Elias disappears)         │
│     Status: ✅ Planted  ⬜ Paid off                              │
│                                                                 │
│  🌱 Ch1: Realtor says "it has history"                          │
│     Plants: Deeper backstory to the house                       │
│     Pays off: Ch4 (Eleanor and Thomas revealed)                 │
│     Status: ✅ Planted  ⬜ Paid off                              │
│                                                                 │
│  🌱 Ch2: Jess at coffee shop — doesn't notice Elias is odd     │
│     Plants: Others can't perceive him fully                     │
│     Pays off: Ch7 (nobody remembers him after veil closes)      │
│     Status: ✅ Planted  ⬜ Paid off                              │
│                                                                 │
│  🌱 Ch2: Elias knows things about the house he shouldn't       │
│     Plants: He's been here before / connected to the house      │
│     Pays off: Ch6 (he IS the house's ghost / Thomas)            │
│     Status: ✅ Planted  ⬜ Paid off                              │
│                                                                 │
│  🌱 Ch3: Shared dream — field of dead flowers                   │
│     Plants: Past life connection                                │
│     Pays off: Ch4 (the field was real, 1891)                    │
│     Status: ✅ Planted  ⬜ Paid off                              │
│                                                                 │
│  [+ Add Plant Manually]                                         │
│  [AI: Scan Manuscript for Untracked Plants]                     │
│                                                                 │
│  ── UNRESOLVED THREADS ──────────────────────────────────────── │
│                                                                 │
│  🧵 Who maintains the graves at the cemetery?                   │
│     Introduced: Ch2 (mentioned in passing)                      │
│     Needs resolution by: Ch9 or Ch10                            │
│     Status: ⚠️ No resolution planned — add to outline?          │
│                                                                 │
│  🧵 Why was the house empty for exactly 40 years?              │
│     Introduced: Ch1 (realtor dialogue)                          │
│     Needs resolution by: Ch6-8                                  │
│     Status: ✅ Addressed in Ch6 outline                         │
│                                                                 │
│  🧵 The narrator's life before Ashwick — what broke?           │
│     Introduced: Ch1 (hinted, water stain apartment)             │
│     Needs resolution by: Ch9 (after Elias leaves)               │
│     Status: ✅ Addressed in Ch9 outline                         │
│                                                                 │
│  [AI: Find Threads I Missed]                                    │
│                                                                 │
│  ── CHARACTER KNOWLEDGE STATES ──────────────────────────────── │
│                                                                 │
│  As of Chapter 3:                                               │
│                                                                 │
│  NARRATOR KNOWS:           NARRATOR DOESN'T KNOW:              │
│  ├── Journal exists         ├── Who wrote it                    │
│  ├── Elias exists           ├── The veil mechanic               │
│  ├── They share dreams      ├── Eleanor & Thomas                │
│  ├── He's not "normal"      ├── He will disappear Oct 23        │
│  └── She feels drawn to him └── She will write the journal      │
│                                                                 │
│  ELIAS KNOWS:              ELIAS DOESN'T KNOW:                  │
│  ├── She was coming         ├── Her name (she has none)         │
│  ├── The October cycle      ├── How to stay                     │
│  ├── He forgets details     ├── That this October is different  │
│  ├── The house matters      ├── (or DOES he know? Ch6 reveal)  │
│  └── She's "the one"       └──                                  │
│                                                                 │
│  [Update After Current Chapter]                                 │
│  [AI: Verify Against Manuscript]                                │
│                                                                 │
│  ── TIMELINE VERIFICATION ───────────────────────────────────── │
│                                                                 │
│  Oct 1  ██ Ch1: Arrival, first two days                        │
│  Oct 2  ██ Ch1: Cleaning, settling in                          │
│  Oct 3  ██ Ch1: Finding journal / Ch2: Meeting Elias           │
│  Oct 4  ██ Ch2: New entry appears, processing                  │
│  Oct 5  ██ Ch3: Shared dream conversation ← YOU ARE HERE       │
│  Oct 6  ░░ Ch3: New entry, deepening bond                      │
│  Oct 7  ░░ Ch4: Cemetery visit, names on stone                 │
│  ...                                                            │
│  Oct 15 ░░ Ch5: The first kiss (under the oak)                 │
│  ...                                                            │
│  Oct 23 ░░ Ch8: The veil closes, Elias scattered               │
│  ...                                                            │
│  Nov 20 ░░ Ch10: She writes the journal, loop closes           │
│                                                                 │
│  Conflicts Found: 0 ✅                                          │
│  Gaps: Oct 8-14 needs events assigned ⚠️                        │
│                                                                 │
│  [AI: Suggest Events for Timeline Gaps]                         │
│  [Export Timeline as Visual]                                    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### The Relationship Map

A visual graph showing character relationships and how they evolve:

```
┌─────────────────────────────────────────────────────────────────┐
│ 🔗 RELATIONSHIP MAP                          [Chapter: 3 ▾]    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│                    ┌──────────┐                                 │
│                    │ Narrator │                                 │
│                    └────┬─────┘                                 │
│           ╱             │              ╲                        │
│     ───────────   ──────┴──────   ──────────                   │
│     Recognition   Curiosity +     Stranger →                   │
│     → Trust       Fear            Comfort                      │
│     ───────────   ──────┬──────   ──────────                   │
│          ╱              │              ╲                        │
│   ┌──────────┐   ┌──────┴─────┐   ┌──────────┐               │
│   │  Elias   │   │  The House │   │   Jess   │               │
│   └──────────┘   └────────────┘   └──────────┘               │
│          ╲                                                      │
│     ───────────                                                │
│     Subject to                                                  │
│     ───────────                                                │
│          ╲                                                      │
│   ┌──────────────┐                                             │
│   │   The Veil   │                                             │
│   └──────────────┘                                             │
│                                                                 │
│  ── RELATIONSHIP DETAIL ─────────────────────────────────────── │
│                                                                 │
│  Click any connection to see evolution:                         │
│                                                                 │
│  Narrator → Elias:                                             │
│  Ch2: "Stranger who feels familiar" (Recognition)               │
│  Ch3: "Beginning to trust despite logic" (Growing bond)         │
│  Ch4: ░░ (not yet written)                                      │
│  Ch5: ░░ (not yet written)                                      │
│  ...                                                            │
│                                                                 │
│  [AI: Suggest Relationship Development for Next Chapter]        │
│  [Export as Image for Reference]                                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## WORKSPACE 3: THE PRESS (Layout & Publishing)

This is where NovaSyn Writer becomes more than a writing tool. It becomes a **publishing tool.** Think Canva meets InDesign, but focused on document output — books, ebooks, PDFs, reports, newsletters, zines.

### The Core Philosophy

```
Most writers go:
  Write in Google Docs → Export to Word → 
  Fight with formatting → Import to InDesign → 
  Spend 3 days learning InDesign → Give up → 
  Pay someone $500 to format their book

NovaSyn Writer goes:
  Write → Click "Layout" → Choose template → 
  Adjust if you want → Export PDF

The layout happens WHERE you wrote.
No export. No import. No lost formatting.
No learning a separate tool.
```

### The Layout Editor

```
┌─────────────────────────────────────────────────────────────────┐
│ 🎨 THE PRESS                                    [Preview ▾]    │
├──────────────────┬──────────────────────────────────────────────┤
│                  │                                              │
│  📐 Layout       │   ┌──────────────────────┐                  │
│                  │   │ ┌──────────────────┐ │                  │
│  Template:       │   │ │                  │ │                  │
│  [Novel 6x9 ▾]  │   │ │   THE JOURNAL    │ │                  │
│                  │   │ │                  │ │                  │
│  Page Size:      │   │ │   A Novel        │ │                  │
│  [6" × 9"   ▾]  │   │ │                  │ │                  │
│                  │   │ │                  │ │                  │
│  Margins:        │   │ │                  │ │                  │
│  Top: [0.75"]    │   │ │    ❦            │ │                  │
│  Bottom: [0.75"] │   │ │                  │ │                  │
│  Inside: [0.85"] │   │ │                  │ │                  │
│  Outside: [0.65"]│   │ └──────────────────┘ │                  │
│                  │   │         1             │                  │
│  Bleed: [0.125"] │   └──────────────────────┘                  │
│                  │                                              │
│  ── Typography ──│   ┌──────────────────────┐                  │
│                  │   │ ┌──────────────────┐ │                  │
│  Body Font:      │   │ │                  │ │                  │
│  [Garamond   ▾]  │   │ │  Chapter One     │ │                  │
│  Size: [11pt]    │   │ │  THE HOUSE       │ │                  │
│  Leading: [14pt] │   │ │                  │ │                  │
│                  │   │ │  The house        │ │                  │
│  Chapter Title:  │   │ │  breathed around  │ │                  │
│  [Didot      ▾]  │   │ │  her. That was    │ │                  │
│  Size: [24pt]    │   │ │  the only word    │ │                  │
│  Style: [SC   ▾] │   │ │  for it — a slow, │ │                  │
│                  │   │ │  patient respir-  │ │                  │
│  Headers/Footer: │   │ │  ation that lived │ │                  │
│  [Author - Title]│   │ │  in the walls and │ │                  │
│  Size: [8pt]     │   │ │  beneath the      │ │                  │
│                  │   │ │  floorboards.     │ │                  │
│  ── Elements ──  │   │ │                  │ │                  │
│                  │   │ └──────────────────┘ │                  │
│  Drop Caps: [✓]  │   │         3             │                  │
│  Scene Break: ❦  │   └──────────────────────┘                  │
│  Chapter Start:  │                                              │
│  [New Recto  ▾]  │   Page 3 of 127         [◀ ▶]              │
│                  │                                              │
│  ── Export ────  │   Zoom: [75% ▾] [Fit ▾] [Spread ▾]         │
│                  │                                              │
│  [Export PDF]    │                                              │
│  [Export EPUB]   │                                              │
│  [Export Print-  │                                              │
│   Ready PDF]     │                                              │
│  [Export Docx]   │                                              │
│                  │                                              │
└──────────────────┴──────────────────────────────────────────────┘
```

### Template Library

Pre-built templates for common publishing needs:

```
┌─────────────────────────────────────────────────────────────────┐
│ 📑 TEMPLATE LIBRARY                                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ── BOOKS ───────────────────────────────────────────────────── │
│                                                                 │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐             │
│  │ ┌─────┐ │ │ ┌─────┐ │ │ ┌─────┐ │ │ ┌─────┐ │             │
│  │ │Novel│ │ │ │Novel│ │ │ │Paper│ │ │ │ Chil-│ │             │
│  │ │6×9  │ │ │ │5.5×8│ │ │ │back │ │ │ │dren's│ │             │
│  │ │     │ │ │ │.5   │ │ │ │Mass │ │ │ │     │ │             │
│  │ └─────┘ │ │ └─────┘ │ │ └─────┘ │ │ └─────┘ │             │
│  │ Trade   │ │ Digest  │ │ Mass    │ │ Picture  │             │
│  │ Paper-  │ │         │ │ Market  │ │ Book     │             │
│  │ back    │ │         │ │         │ │ 8.5×11   │             │
│  └─

*3/1/2026, 4:36:55 PM*

---

## User

keep going

## AI (claude-opus-4-6)

# **CONTINUING: TEMPLATE LIBRARY**

```
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘             │
│                                                                 │
│  ── DOCUMENTS ───────────────────────────────────────────────── │
│                                                                 │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐             │
│  │ ┌─────┐ │ │ ┌─────┐ │ │ ┌─────┐ │ │ ┌─────┐ │             │
│  │ │     │ │ │ │News-│ │ │ │Rept.│ │ │ │Prop-│ │             │
│  │ │ A4  │ │ │ │lttr │ │ │ │     │ │ │ │osal │ │             │
│  │ │     │ │ │ │     │ │ │ │     │ │ │ │     │ │             │
│  │ └─────┘ │ │ └─────┘ │ │ └─────┘ │ │ └─────┘ │             │
│  │ Standard│ │ News-   │ │ Business│ │ Proposal │             │
│  │ Document│ │ letter  │ │ Report  │ │          │             │
│  │ Letter/ │ │ 2-col   │ │ w/cover │ │ w/cover  │             │
│  │ A4      │ │         │ │         │ │          │             │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘             │
│                                                                 │
│  ── CREATIVE ────────────────────────────────────────────────── │
│                                                                 │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐             │
│  │ ┌─────┐ │ │ ┌─────┐ │ │ ┌─────┐ │ │ ┌─────┐ │             │
│  │ │Zine │ │ │ │Chap-│ │ │ │Port-│ │ │ │Look-│ │             │
│  │ │     │ │ │ │book │ │ │ │flio │ │ │ │book │ │             │
│  │ │     │ │ │ │     │ │ │ │     │ │ │ │     │ │             │
│  │ └─────┘ │ │ └─────┘ │ │ └─────┘ │ │ └─────┘ │             │
│  │ Zine    │ │ Chap-   │ │ Port-   │ │ Look-   │             │
│  │ Half-   │ │ book/   │ │ folio   │ │ book/   │             │
│  │ Letter  │ │ Poetry  │ │ Letter  │ │ Brand   │             │
│  │         │ │         │ │ Land-   │ │ Guide   │             │
│  │         │ │         │ │ scape   │ │         │             │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘             │
│                                                                 │
│  ── ACADEMIC & PROFESSIONAL ─────────────────────────────────── │
│                                                                 │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐             │
│  │ ┌─────┐ │ │ ┌─────┐ │ │ ┌─────┐ │ │ ┌─────┐ │             │
│  │ │Thes-│ │ │ │White│ │ │ │Case │ │ │ │Work-│ │             │
│  │ │is   │ │ │ │Paper│ │ │ │Study│ │ │ │book │ │             │
│  │ │     │ │ │ │     │ │ │ │     │ │ │ │     │ │             │
│  │ └─────┘ │ │ └─────┘ │ │ └─────┘ │ │ └─────┘ │             │
│  │ Thesis/ │ │ White   │ │ Case    │ │ Workbook │             │
│  │ Dissert-│ │ Paper   │ │ Study   │ │ /Course  │             │
│  │ ation   │ │         │ │         │ │ Material │             │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘             │
│                                                                 │
│  ── SOCIAL / MARKETING ──────────────────────────────────────── │
│                                                                 │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐             │
│  │ ┌─────┐ │ │ ┌─────┐ │ │ ┌─────┐ │ │ ┌─────┐ │             │
│  │ │Lead │ │ │ │Media│ │ │ │Slide│ │ │ │One- │ │             │
│  │ │Mag- │ │ │ │Kit  │ │ │ │Deck │ │ │ │Page │ │             │
│  │ │net  │ │ │ │     │ │ │ │     │ │ │ │r    │ │             │
│  │ └─────┘ │ │ └─────┘ │ │ └─────┘ │ │ └─────┘ │             │
│  │ Lead    │ │ Media   │ │ Present-│ │ One-    │             │
│  │ Magnet  │ │ Kit /   │ │ ation   │ │ Pager / │             │
│  │ PDF     │ │ Press   │ │ Slides  │ │ Flyer   │             │
│  │ Guide   │ │ Kit     │ │ 16:9    │ │         │             │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘             │
│                                                                 │
│  [+ Create Custom Template]                                     │
│  [Import Template (.nswt file)]                                 │
│  [Browse Community Templates] (NS Marketplace)                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Page Element Tools

This is where the Canva-like functionality lives. You can add visual elements to any page:

```
┌─────────────────────────────────────────────────────────────────┐
│ 🎨 PAGE ELEMENTS                                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ── TEXT ─────────────────────────────────────────────────────── │
│  [Body Text]  [Heading]  [Caption]  [Pull Quote]  [Sidebar]    │
│  [Footnote]   [Callout Box]  [Running Header]  [Page Number]   │
│                                                                 │
│  ── IMAGES ──────────────────────────────────────────────────── │
│  [Insert Image]  [Image from Vault]  [Image from NS Studio]    │
│  [AI Generate Image] → opens prompt, sends to NS Studio,       │
│                        returns image directly into layout       │
│  [Image Frame]  [Full Bleed Image]  [Inline Image]             │
│                                                                 │
│  ── SHAPES & LINES ──────────────────────────────────────────── │
│  [Rectangle]  [Circle]  [Line]  [Divider]  [Custom Shape]      │
│  [Arrow]  [Bracket]  [Ornament ❦]  [Border Frame]              │
│                                                                 │
│  ── TABLES ──────────────────────────────────────────────────── │
│  [Simple Table]  [Styled Table]  [Comparison Table]             │
│  [AI: Generate Table from Data]                                 │
│                                                                 │
│  ── SPECIAL ─────────────────────────────────────────────────── │
│  [Table of Contents] (auto-generated from headings)             │
│  [Index] (auto-generated from marked terms)                     │
│  [Bibliography / Works Cited]                                   │
│  [Title Page]  [Half Title]  [Copyright Page]                   │
│  [Dedication Page]  [Epigraph Page]                             │
│  [About the Author]                                             │
│  [Chapter Title Page]                                           │
│  [Part Divider]                                                 │
│  [Blank Page]                                                   │
│  [QR Code]                                                      │
│                                                                 │
│  ── AI-POWERED ELEMENTS ─────────────────────────────────────── │
│  [AI: Generate Cover Design]                                    │
│     → Prompt for concept, sends to NS Studio,                   │
│       returns sized to template, placed on cover page           │
│  [AI: Generate Chapter Headers]                                 │
│     → Consistent decorative elements for all chapters           │
│  [AI: Generate Ornamental Dividers]                             │
│     → Scene break flourishes matching book style                │
│  [AI: Suggest Layout Improvements]                              │
│     → Analyzes current layout, suggests better spacing,         │
│       typography, element placement                             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Typography Controls

Real desktop publishing typography, not just font size:

```
┌─────────────────────────────────────────────────────────────────┐
│ 🔤 TYPOGRAPHY                                                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ── FONT SELECTION ──────────────────────────────────────────── │
│                                                                 │
│  Body:     [Garamond Premier Pro ▾] [11pt] [Regular ▾]         │
│  Headings: [Didot                ▾] [24pt] [Bold    ▾]         │
│  Captions: [Gill Sans            ▾] [8pt]  [Italic  ▾]        │
│  Code:     [JetBrains Mono       ▾] [9pt]  [Regular ▾]        │
│                                                                 │
│  [Browse Fonts...] [Font Pairing Suggestions (AI)]              │
│                                                                 │
│  ── PARAGRAPH ───────────────────────────────────────────────── │
│                                                                 │
│  Leading (line spacing):  [14pt      ]  ← point-precise        │
│  Paragraph spacing:       [Before: 0pt] [After: 6pt]           │
│  First line indent:       [0.25"     ]                          │
│  Alignment:  [Left] [Center] [Right] [Justify]                 │
│  Hyphenation: [✓ Auto] [Min word length: 6]                    │
│  Widow/Orphan control: [✓ On]                                  │
│  Keep with next: [✓ for headings]                               │
│                                                                 │
│  ── CHARACTER ───────────────────────────────────────────────── │
│                                                                 │
│  Kerning:    [Optical ▾]                                        │
│  Tracking:   [0      ]  ← letter spacing                       │
│  Baseline:   [0pt    ]  ← shift up/down                        │
│  Small Caps: [Off ▾]                                            │
│  Ligatures:  [✓ On]  (fi, fl, ff, ffi, ffl)                    │
│  OpenType:   [✓ Old-style numerals]                             │
│              [✓ Contextual alternates]                          │
│              [  Swash capitals]                                  │
│              [  Ornaments]                                       │
│                                                                 │
│  ── DROP CAPS ───────────────────────────────────────────────── │
│                                                                 │
│  Style: [Classic 3-line ▾]                                      │
│  ┌────────────────────────────┐                                 │
│  │ T  he house breathed      │ ← Preview                       │
│  │    around her. That was   │                                  │
│  │    the only word for it—  │                                  │
│  │ a slow, patient           │                                  │
│  └────────────────────────────┘                                 │
│  Lines: [3]  Font: [Match body ▾]  Color: [Black ▾]            │
│  Apply to: [First paragraph of each chapter ▾]                  │
│                                                                 │
│  ── STYLES ──────────────────────────────────────────────────── │
│  (Reusable named styles — change once, updates everywhere)      │
│                                                                 │
│  📝 Body Text          [Edit]                                   │
│  📝 Body First Para    [Edit]  (no indent, drop cap)            │
│  📝 Chapter Title      [Edit]                                   │
│  📝 Chapter Subtitle   [Edit]                                   │
│  📝 Scene Break        [Edit]                                   │
│  📝 Dialogue           [Edit]  (optional: different indent)     │
│  📝 Journal Entry      [Edit]  (italic, indented, different     │
│                                 font for handwritten feel)      │
│  📝 Internal Thought   [Edit]                                   │
│  📝 Block Quote        [Edit]                                   │
│  📝 Epigraph           [Edit]                                   │
│  [+ Create Style]                                               │
│                                                                 │
│  [AI: Suggest Styles for This Template]                         │
│  [AI: Analyze Professional Book and Extract Styles]             │
│     → Upload a PDF you admire, AI extracts the typography       │
│       settings and creates matching styles                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Master Pages

Like InDesign master pages — define recurring layout elements once:

```
┌─────────────────────────────────────────────────────────────────┐
│ 📄 MASTER PAGES                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ── DEFINED MASTERS ─────────────────────────────────────────── │
│                                                                 │
│  [A] Default Spread                                             │
│  ┌──────────┐ ┌──────────┐                                     │
│  

*3/1/2026, 4:38:00 PM*

---

## User

keep going

## AI (claude-opus-4-6)

# **CONTINUING: MASTER PAGES**

```
│  [A] Default Spread                                             │
│  ┌──────────┐ ┌──────────┐                                     │
│  │ ┌──────┐ │ │ ┌──────┐ │                                     │
│  │ │Header│ │ │ │Header│ │                                     │
│  │ │Author│ │ │ │Title │ │                                     │
│  │ │      │ │ │ │      │ │                                     │
│  │ │ Body │ │ │ │ Body │ │                                     │
│  │ │ Text │ │ │ │ Text │ │                                     │
│  │ │ Area │ │ │ │ Area │ │                                     │
│  │ │      │ │ │ │      │ │                                     │
│  │ │  pg# │ │ │ │  pg# │ │                                     │
│  │ └──────┘ │ │ └──────┘ │                                     │
│  └──────────┘ └──────────┘                                     │
│  Left (verso)  Right (recto)                                    │
│                                                                 │
│  [B] Chapter Opener                                             │
│  ┌──────────┐ ┌──────────┐                                     │
│  │          │ │ ┌──────┐ │                                     │
│  │  (blank  │ │ │      │ │                                     │
│  │   verso  │ │ │ Ch.# │ │                                     │
│  │   or end │ │ │Title │ │                                     │
│  │   of     │ │ │      │ │                                     │
│  │   prev.  │ │ │ Body │ │                                     │
│  │   chap.) │ │ │ Text │ │                                     │
│  │          │ │ │ starts│ │                                     │
│  │          │ │ │ lower │ │                                     │
│  │          │ │ │  pg# │ │                                     │
│  │          │ │ └──────┘ │                                     │
│  └──────────┘ └──────────┘                                     │
│  (Chapters always start on right/recto page)                    │
│                                                                 │
│  [C] Front Matter                                               │
│  ┌──────────┐ ┌──────────┐                                     │
│  │ ┌──────┐ │ │ ┌──────┐ │                                     │
│  │ │      │ │ │ │      │ │                                     │
│  │ │Center│ │ │ │Center│ │                                     │
│  │ │vert  │ │ │ │vert  │ │                                     │
│  │ │      │ │ │ │      │ │                                     │
│  │ │No hdr│ │ │ │No hdr│ │                                     │
│  │ │No pg#│ │ │ │No pg#│ │                                     │
│  │ └──────┘ │ │ └──────┘ │                                     │
│  └──────────┘ └──────────┘                                     │
│  (Title, copyright, dedication — no headers/page numbers)       │
│                                                                 │
│  [D] Full Page Image                                            │
│  ┌──────────┐                                                   │
│  │ ┌──────┐ │                                                   │
│  │ │      │ │                                                   │
│  │ │ Full │ │                                                   │
│  │ │Bleed │ │                                                   │
│  │ │Image │ │                                                   │
│  │ │      │ │                                                   │
│  │ │      │ │                                                   │
│  │ └──────┘ │                                                   │
│  └──────────┘                                                   │
│  (For illustrated books, chapter art, etc.)                     │
│                                                                 │
│  [E] Newsletter / Multi-Column                                  │
│  ┌──────────┐                                                   │
│  │ ┌──────┐ │                                                   │
│  │ │Banner│ │                                                   │
│  │ ├──┬───┤ │                                                   │
│  │ │  │   │ │                                                   │
│  │ │C1│ C2│ │                                                   │
│  │ │  │   │ │                                                   │
│  │ │  │   │ │                                                   │
│  │ └──┴───┘ │                                                   │
│  └──────────┘                                                   │
│                                                                 │
│  [+ Create Master Page]                                         │
│  [AI: Generate Master Pages for This Project Type]              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### The Cover Designer

A dedicated sub-tool for book covers since that's what most writers struggle with:

```
┌─────────────────────────────────────────────────────────────────┐
│ 📕 COVER DESIGNER                                               │
├──────────────────┬──────────────────────────────────────────────┤
│                  │                                              │
│  Cover Type:     │   ┌────────────────────────────────────┐    │
│  [Ebook    ▾]    │   │  ┌──────┐  ┌──────────┐  ┌──────┐ │    │
│  [Paperback ▾]   │   │  │      │  │          │  │      │ │    │
│  [Hardcover ▾]   │   │  │ Back │  │  Spine   │  │Front │ │    │
│                  │   │  │      │  │          │  │      │ │    │
│  Dimensions:     │   │  │      │  │  THE     │  │      │ │    │
│  Front: 6×9"     │   │  │ Back │  │  JOURNAL │  │[img] │ │    │
│  Spine: 0.52"    │   │  │ text │  │          │  │      │ │    │
│  (auto from      │   │  │      │  │          │  │Title │ │    │
│   page count)    │   │  │      │  │          │  │Author│ │    │
│                  │   │  │ ISBN │  │          │  │      │ │    │
│  ── LAYERS ──    │   │  │ Bar  │  │          │  │      │ │    │
│                  │   │  │      │  │          │  │      │ │    │
│  [✓] Background  │   │  └──────┘  └──────────┘  └──────┘ │    │
│  [✓] Cover Image │   │                                    │    │
│  [✓] Title       │   │  Full wrap preview (paperback)     │    │
│  [✓] Subtitle    │   └────────────────────────────────────┘    │
│  [✓] Author Name │                                              │
│  [✓] Spine Text  │   ┌────────────────────┐                    │
│  [✓] Back Cover  │   │ ┌────────────────┐ │                    │
│  [ ] Blurb       │   │ │                │ │                    │
│  [ ] Barcode     │   │ │    THE         │ │                    │
│  [ ] Endorsements│   │ │    JOURNAL     │ │                    │
│                  │   │ │                │ │                    │
│  ── GENERATE ──  │   │ │   [AI-generated│ │                    │
│                  │   │ │    cover image] │ │                    │
│  [AI: Generate   │   │ │                │ │                    │
│   Cover Concept] │   │ │    A Novel     │ │                    │
│                  │   │ │                │ │                    │
│  Describe your   │   │ │  by Author     │ │                    │
│  vision:         │   │ │                │ │                    │
│  ┌────────────┐  │   │ └────────────────┘ │                    │
│  │ Atmospheric│  │   │  Front only preview │                    │
│  │ autumn     │  │   └────────────────────┘                    │
│  │ scene, old │  │                                              │
│  │ stone      │  │   View: [Front ▾] [Full Wrap ▾]             │
│  │ bridge,    │  │         [Back ▾] [Spine ▾]                  │
│  │ fog, gold  │  │                                              │
│  │ and amber  │  │                                              │
│  │ leaves...  │  │                                              │
│  └────────────┘  │                                              │
│                  │                                              │
│  Model:          │                                              │
│  [Flux 1.1   ▾]  │                                              │
│                  │                                              │
│  [Generate 4     │                                              │
│   Variations]    │                                              │
│                  │                                              │
│  [Send Prompt to │                                              │
│   NS Studio for  │                                              │
│   More Control]  │                                              │
│                  │                                              │
│  ── EXPORT ──    │                                              │
│                  │                                              │
│  [Export Cover   │                                              │
│   PDF (print)]   │                                              │
│  [Export Cover   │                                              │
│   JPG (ebook)]   │                                              │
│  [Export Full    │                                              │
│   Wrap PDF]      │                                              │
│  [KDP Cover      │                                              │
│   Template]      │                                              │
│  [IngramSpark    │                                              │
│   Cover Template]│                                              │
│                  │                                              │
└──────────────────┴──────────────────────────────────────────────┘
```

### Export Engine

The real power of The Press — generating professional output:

```
┌─────────────────────────────────────────────────────────────────┐
│ 📤 EXPORT                                                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ── PDF EXPORT ──────────────────────────────────────────────── │
│                                                                 │
│  [📄 Screen PDF]                                                │
│  ├── 72 DPI images                                              │
│  ├── RGB color                                                  │
│  ├── Smaller file size                                          │
│  ├── Good for: Email, web download, reading on screen           │
│  └── Bookmarks from chapter headings                            │
│                                                                 │
│  [🖨️ Print-Ready PDF]                                           │
│  ├── 300 DPI images                                             │
│  ├── CMYK color conversion                                      │
│  ├── Bleed marks and crop marks                                 │
│  ├── Embedded fonts (all glyphs)                                │
│  ├── PDF/X-1a or PDF/X-4 standard                              │
│  ├── Good for: Professional printing, KDP, IngramSpark          │
│  └── Options:                                                   │
│      ├── Include crop marks: [✓]                                │
│      ├── Include bleed: [✓] [0.125"]                            │
│      ├── Color profile: [US Web Coated SWOP ▾]                  │
│      ├── Flatten transparency: [✓]                              │
│      └── PDF standard: [PDF/X-1a ▾]                             │
│                                                                 │
│  [📱 Interactive PDF]                                            │
│  ├── Clickable TOC                                              │
│  ├── Hyperlinks                                                 │
│  ├── Bookmarks                                                  │
│  ├── Form fields (for workbooks)                                │
│  ├── Good for: Lead magnets, courses, interactive documents     │
│  └── Options:                                                   │
│      ├── Include navigation buttons: [✓]                        │
│      ├── Clickable TOC: [✓]                                     │
│      ├── External hyperlinks: [✓]                               │
│      └── Form fields: [✓]                                       │
│                                                                 │
│  ── EBOOK EXPORT ────────────────────────────────────────────── │
│                                                                 │
│  [📱 EPUB]                                                       │
│  ├── Reflowable text                                            │
│  ├── Chapter navigation                                         │
│  ├── Cover image embedded                                       │
│  ├── Metadata (author, title, ISBN, description)                │
│  ├── Good for: Apple Books, Kobo, generic ereaders              │
│  └── Options:                                                   │
│      ├── EPUB version: [3.0 ▾]                                  │
│      ├── Include TOC: [✓]                                       │
│      ├── Cover image: [auto from cover designer ▾]              │
│      ├── CSS styling: [Embedded ▾]                              │
│      └── Font embedding: [✓]                                    │
│                                                                 │
│  [📱 MOBI / KPF]                                                │
│  ├── Kindle-optimized format                                    │
│  ├── KDP-ready upload                                           │
│  ├── Good for: Amazon Kindle Direct Publishing                  │
│  └── Options:                                                   │
│      ├── Kindle Create compatible: [✓]                          │
│      └── Enhanced typesetting: [✓]                              │
│                                                                 │
│  ── DOCUMENT EXPORT ─────────────────────────────────────────── │
│                                                                 │
│  [📝 DOCX]                                                       │
│  ├── Microsoft Word compatible                                  │
│  ├── Styles preserved                                           │
│  ├── Track changes compatible                                   │
│  ├── Good for: Sending to editors, agents, collaborators        │
│  └── Options:                                                   │
│      ├── Include comments: [✓]                                  │
│      ├── Style mapping: [Standard ▾]                            │
│      └── Manuscript format: [✓] (Courier, double-spaced,       │
│          1" margins — industry standard submission format)       │
│                                                                 │
│  [📝 Markdown]                                                   │
│  ├── Plain text with formatting                                 │
│  ├── Good for: GitHub, blogs, static sites, archival            │
│  └── Options:                                                   │
│      ├── Flavor: [CommonMark ▾] [GFM ▾]                        │
│      ├── Include front matter: [✓] (YAML)                       │

*3/1/2026, 4:41:11 PM*

---

## User

keep going

## AI (claude-opus-4-6)

# **CONTINUING: EXPORT ENGINE**

```
│      └── Image handling: [Inline ▾] [Separate folder ▾]        │
│                                                                 │
│  [📝 Plain Text]                                                 │
│  ├── Just the words, no formatting                              │
│  ├── Good for: Word counts, backups, imports to other tools     │
│  └── Options:                                                   │
│      ├── Include chapter headings: [✓]                          │
│      ├── Scene break marker: [***]                              │
│      └── Line wrapping: [None ▾] [80 chars ▾]                  │
│                                                                 │
│  [📝 HTML]                                                       │
│  ├── Web-ready with CSS                                         │
│  ├── Good for: Blog posts, web publishing, Substack             │
│  └── Options:                                                   │
│      ├── Inline CSS: [✓] or External stylesheet: [✓]           │
│      ├── Include images: [✓]                                    │
│      └── Single file or per-chapter: [Single ▾]                 │
│                                                                 │
│  ── AUDIOBOOK PREP ──────────────────────────────────────────── │
│                                                                 │
│  [🎙️ Audiobook Script]                                          │
│  ├── Clean text optimized for narration                         │
│  ├── Pronunciation guides for unusual names/words               │
│  ├── Chapter markers                                            │
│  ├── Narrator direction notes (optional)                        │
│  ├── Good for: Sending to narrator, or AI narration             │
│  └── Options:                                                   │
│      ├── Include pronunciation guide: [✓]                       │
│      │   "Ashwick" → ASH-wick                                   │
│      │   "Elias" → eh-LIE-us                                   │
│      ├── Include narrator notes: [✓]                            │
│      │   [Whispered] "It's you."                                │
│      │   [Pause 2 seconds]                                      │
│      ├── Strip visual-only elements: [✓]                        │
│      │   (images, tables, layout-specific content)              │
│      └── [Send to NS Studio for AI Narration]                   │
│           → sends clean script to NS Studio                     │
│           → NS Studio generates audio chapter by chapter        │
│           → audio files return to project assets                │
│                                                                 │
│  ── BATCH EXPORT ────────────────────────────────────────────── │
│                                                                 │
│  [⚡ Export All Formats]                                         │
│  ├── Select which formats to generate simultaneously            │
│  ├── ☑ Screen PDF                                               │
│  ├── ☑ Print-Ready PDF                                          │
│  ├── ☑ EPUB                                                     │
│  ├── ☑ MOBI/KPF                                                │
│  ├── ☐ DOCX                                                     │
│  ├── ☐ Markdown                                                 │
│  ├── ☑ Audiobook Script                                         │
│  ├── ☑ Cover (JPG + PDF)                                        │
│  └── [Export All Selected] → outputs to /exports/ folder        │
│                                                                 │
│  ── PUBLISHING PRESETS ──────────────────────────────────────── │
│                                                                 │
│  These bundle the exact specs each platform needs:              │
│                                                                 │
│  [📦 Amazon KDP Package]                                         │
│  ├── Interior: Print-Ready PDF (KDP specs)                      │
│  ├── Cover: Full wrap PDF (KDP cover calculator specs)          │
│  ├── Ebook: KPF file                                            │
│  ├── Ebook cover: JPG (2560×1600)                               │
│  └── Creates a folder ready to upload                           │
│                                                                 │
│  [📦 IngramSpark Package]                                        │
│  ├── Interior: PDF/X-1a (IngramSpark specs)                     │
│  ├── Cover: Full wrap PDF (IngramSpark template)                │
│  └── Creates a folder ready to upload                           │
│                                                                 │
│  [📦 Draft2Digital Package]                                      │
│  ├── EPUB (D2D specs)                                           │
│  ├── Cover JPG                                                  │
│  └── Metadata file                                              │
│                                                                 │
│  [📦 Smashwords Package]                                         │
│  ├── EPUB (Smashwords specs)                                    │
│  ├── DOCX (Smashwords style guide compliant)                    │
│  └── Cover JPG                                                  │
│                                                                 │
│  [📦 Blog / Newsletter Package]                                  │
│  ├── HTML per chapter                                           │
│  ├── Featured images per chapter                                │
│  ├── Social media cards (auto-generated)                        │
│  └── Email-friendly version                                     │
│                                                                 │
│  [📦 Submission Package]                                         │
│  ├── Manuscript format DOCX                                     │
│  │   (Courier 12pt, double-spaced, 1" margins,                  │
│  │    header: Author / Title / Page#)                           │
│  ├── Synopsis (1-2 pages)                                       │
│  │   [AI: Generate Synopsis from Manuscript]                    │
│  ├── Query letter template                                      │
│  │   [AI: Generate Query Letter]                                │
│  └── Author bio                                                 │
│                                                                 │
│  [+ Create Custom Preset]                                       │
│  [Browse Community Presets] (NS Marketplace)                    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## THE INTEGRATED WORKSPACE

Now let me show how all three workspaces come together as one unified experience. This is the default layout when you're actively working on a project:

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│ NovaSyn Writer — The Journal                     [Forge] [Library] [Press] [⚙️]    │
├────────────────────┬────────────────────────────────────────┬────────────────────────┤
│                    │                                        │                        │
│  📚 LIBRARY        │  📝 THE FORGE                          │  🎨 PRESS PREVIEW      │
│  (Sidebar)         │  (Main Editor)                         │  (Live Layout)         │
│                    │                                        │                        │
│  📖 Manuscript     │  Chapter 3: "The Shared Dream"         │  ┌──────────────────┐ │
│  ├ Ch1 ✅          │                                        │  │ ┌──────────────┐ │ │
│  ├ Ch2 ✅          │  ┌──────────────────────────────────┐  │  │ │              │ │ │
│  ├ Ch3 🔄 ←       │  │                                  │  │  │ │  The Shared  │ │ │
│  ├ Ch4 ⬜          │  │  Morning came gray and uncertain │  │  │ │  Dream       │ │ │
│  ├ Ch5 ⬜          │  │  — the kind of October morning   │  │  │ │              │ │ │
│  └ ...             │  │  where the sky can't decide      │  │  │ │  Morning came│ │ │
│                    │  │  between rain and simply          │  │  │ │  gray and    │ │ │
│  📋 Encyclopedia   │  │  remaining overcast forever. She  │  │  │ │  uncertain — │ │ │
│  ├ 👤 Narrator     │  │  checked the journal first.      │  │  │ │  the kind of │ │ │
│  ├ 👤 Elias ←      │  │  Still there. The entry from     │  │  │ │  October     │ │ │
│  ├ 🌍 The Bridge   │  │  yesterday hadn't vanished in    │  │  │ │  morning     │ │ │
│  ├ ⚙️ The Veil     │  │  the night, hadn't turned out    │  │  │ │  where the   │ │ │
│  └ ...             │  │  to be something she'd imagined  │  │  │ │  sky can't   │ │ │
│                    │  │  while half-asleep. The ink was   │  │  │ │  decide...   │ │ │
│  📊 Outline        │  │  dark, the handwriting steady,   │  │  │ │              │ │ │
│  Beat 1 ✅         │  │  and the words still said what   │  │  │ └──────────────┘ │ │
│  Beat 2 ✅         │  │  they'd said before:             │  │  │       47          │ │
│  Beat 3 🔄 ←      │  │                                  │  │  └──────────────────┘ │
│  Beat 4 ⬜         │  │  Find him before autumn ends.    │  │                        │
│  Beat 5 ⬜         │  │                                  │  │  Page 47 of ~127       │
│  ...               │  │  She closed the journal and▊     │  │  [◀ ▶]                │
│                    │  │                                  │  │                        │
│  🔍 Continuity     │  └──────────────────────────────────┘  │  Layout:               │
│  Plants: 5 active  │                                        │  [Novel 6×9 ▾]         │
│  Threads: 3 open   │  Words: 1,247 / 2,500 │ Beat 3 of 8   │  [Update Preview]      │
│  Conflicts: 0 ✅   │                                        │                        │
│                    │  ── AI Panel ──────────────────────── │                        │
│  🧠 KB Quick       │  [Continue] [Expand] [Rewrite]        │  📤 Quick Export:       │
│  └ "autumn =       │  [Brainstorm] [Custom...]              │  [PDF] [EPUB] [DOCX]   │
│     liminality"    │                                        │                        │
│                    │  📌 Active Context:                    │                        │
│  ── References ──  │  ☑ Ch3 Outline  ☑ Narrator            │                        │
│  Drag encyclopedia │  ☑ Elias  ☑ The Bridge                │                        │
│  entries here to   │  ☑ Previous chapter summary            │                        │
│  include in AI     │  Tokens: 4,200 / 128K                  │                        │
│  context ↓         │                                        │                        │
│  ┌──────────────┐  │                                        │                        │
│  │ Drop here    │  │                                        │                        │
│  └──────────────┘  │                                        │                        │
│                    │                                        │                        │
├────────────────────┴────────────────────────────────────────┴────────────────────────┤
│  Status: Synced ✅ │ API: Claude Sonnet │ Cost this session: $0.12 │ Auto-save: On   │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

### The Reference Drag-and-Drop System

This is the killer UX for the encyclopedia integration. Instead of manually pasting encyclopedia entries into prompts, you **drag references into the AI context panel:**

```
How it works:

1. You're writing Chapter 3
2. You need the AI to know about Elias's voice
3. In the Library sidebar, you DRAG "👤 Elias" into the 
   "Active Context" zone
4. Now every AI operation automatically includes 
   Elias's encyclopedia entry
5. You drag "🌍 The Bridge" in too
6. Now the AI knows the setting details
7. You drag "⚙️ The Veil" in
8. Now the AI won't contradict the rules

The AI context panel shows exactly what's loaded:

┌─ Active Context ──────────────────────────────┐
│                                                │
│  📌 Auto-included:                             │
│  ├── Ch3 Outline (beat sequence)    [842 tok]  │
│  ├── Previous chapter summary       [215 tok]  │
│  └── Voice profile (from KB)        [380 tok]  │
│                                                │
│  📎 Manually added (drag here):                │
│  ├── 👤 Narrator (character)        [520 tok]  │
│  ├── 👤 Elias (character)           [680 tok]  │
│  ├── 🌍 The Bridge (setting)        [310 tok]  │
│  ├── ⚙️ The Veil (rules)            [450 tok]  │
│  └── [× remove] for each                      │
│                                                │
│  Total context: 3,397 / 128,000 tokens         │
│  ████░░░░░░░░░░░░░░░░░░░░ 2.7%                │
│                                                │
│  💡 Suggested additions for this chapter:      │
│  ├── 🌍 The Hollow Bean (mentioned in outline) │
│  └── 👤 Jess (appears in beat 6)               │
│      [Add Suggested] [Dismiss]                 │
│                                                │
└────────────────────────────────────────────────┘
```

**The AI suggests context it thinks you need** based on the chapter outline. If your outline mentions the Hollow Bean, it suggests adding that setting entry. If a character appears in a beat you haven't written yet, it suggests loading their profile.

This is the Encyclopedia Prompt System methodology, but instead of manually copying and pasting encyclopedia entries into prompts (which is tedious and error-prone), the app handles it visually with drag-and-drop and smart suggestions.

---

## MULTI-MODEL WRITING WORKFLOWS

Since this is a NovaSyn app, multi-model is baked in everywhere:

### Side-by-Side Generation

```
┌─────────────────────────────────────────────────────────────────┐
│ 🔀 COMPARE MODELS — Continue from "She closed the journal and" │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─ Claude Sonnet ─────────────────────────────────────────┐   │
│  │                                                         │   │
│  │  She closed the journal and pressed her fingers to the  │   │
│  │  leather cover, half expecting it to be warm — to pulse │   │
│  │  like a living thing. It didn't. It was just a book.    │   │
│  │  Just paper and ink and old glue. But the words inside  │   │
│  │  it knew things they shouldn't, and she was going to    │   │
│  │

*3/1/2026, 4:42:36 PM*

---

## User

keep going

## AI (claude-opus-4-6)

# **CONTINUING: MULTI-MODEL WRITING WORKFLOWS**

```
│  │  the bridge anyway, because somewhere between logic     │   │
│  │  and the ache in her chest, the ache was winning.       │   │
│  │                                                         │   │
│  │  Tokens: 487 │ Cost: $0.003 │ Time: 2.1s               │   │
│  │  [Accept This] [Edit & Accept] [Save to Vault]          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─ GPT-4o ────────────────────────────────────────────────┐   │
│  │                                                         │   │
│  │  She closed the journal and sat with it in her lap,     │   │
│  │  watching dust motes drift through the morning light.   │   │
│  │  Outside, the maples along Miller Road had turned       │   │
│  │  overnight — yesterday's green replaced by a cathedral  │   │
│  │  of amber and rust. She should have been questioning    │   │
│  │  everything. A journal that predicted the future. A     │   │
│  │  man at a bridge she'd never visited. Instead she was   │   │
│  │  lacing up her boots.                                   │   │
│  │                                                         │   │
│  │  Tokens: 512 │ Cost: $0.004 │ Time: 1.8s               │   │
│  │  [Accept This] [Edit & Accept] [Save to Vault]          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─ Gemini Pro ────────────────────────────────────────────┐   │
│  │                                                         │   │
│  │  She closed the journal. The silence in the house       │   │
│  │  felt different now — not empty but expectant, like     │   │
│  │  held breath. Through the window she could see the      │   │
│  │  road curving away toward town, and beyond it, the      │   │
│  │  treeline where she knew the path to the bridge began.  │   │
│  │  She hadn't eaten. She wasn't hungry. Hunger belonged   │   │
│  │  to a version of her that hadn't found impossible       │   │
│  │  words in a locked drawer.                              │   │
│  │                                                         │   │
│  │  Tokens: 463 │ Cost: $0.002 │ Time: 1.5s               │   │
│  │  [Accept This] [Edit & Accept] [Save to Vault]          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ── HYBRID TOOLS ────────────────────────────────────────────── │
│                                                                 │
│  [Merge Best Parts] — AI combines the strongest elements        │
│    from all three into a single passage                         │
│                                                                 │
│  [Rate & Learn] — Score each 1-5, system learns which          │
│    model matches your voice for future routing                  │
│                                                                 │
│  [Generate More] — Same prompt, more variations from            │
│    the same or different models                                 │
│                                                                 │
│  [A/B History] — View past comparisons and which model          │
│    you chose, building a preference profile over time           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Model Routing for Writing Tasks

Over time, the app learns which models you prefer for different writing tasks:

```
┌─────────────────────────────────────────────────────────────────┐
│ 🎯 MODEL PREFERENCES (Learned from your choices)               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Task                    Preferred Model    Win Rate            │
│  ─────────────────────── ────────────────── ──────────          │
│  Narrative prose         Claude Sonnet      78%                 │
│  Dialogue                Claude Sonnet      82%                 │
│  Action scenes           GPT-4o             65%                 │
│  Description/setting     Gemini Pro         71%                 │
│  Internal monologue      Claude Sonnet      85%                 │
│  Brainstorming           GPT-4o             60%                 │
│  Plot suggestions        Claude Sonnet      72%                 │
│  Rewriting/polish        Claude Sonnet      74%                 │
│  Summarization           Gemini Pro         68%                 │
│  Consistency checking    GPT-4o             63%                 │
│                                                                 │
│  Based on 247 comparisons over 14 sessions.                     │
│                                                                 │
│  Auto-route: [✓ On]                                             │
│  When auto-route is on, the app automatically selects           │
│  your preferred model for each task type. You can               │
│  always override with the model dropdown.                       │
│                                                                 │
│  [Reset Preferences] [Export as Training Data]                  │
│  [Send to ThrashForge for Council Learning]                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## CONTENT TRANSFORMATION PIPELINES

These are more complex workflows that chain multiple AI operations together. Perfect candidates for the Orchestrator, but also available as one-click actions within Writer:

### Short Story → Novel Pipeline

This is the core use case from the Encyclopedia Prompt System:

```
┌─────────────────────────────────────────────────────────────────┐
│ ⚡ TRANSFORM: Short Story → Novel                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Source Material:                                               │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ [Paste or import your short story / episodes / outline] │   │
│  │                                                         │   │
│  │ Or: [Import from Vault] [Import from NS Chat]           │   │
│  │     [Import from file] [Import from clipboard]          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Source word count: 3,500 words (10 episodes)                   │
│                                                                 │
│  Target: [Novella ~25K ▾] [Novel ~50K ▾] [Novel ~80K ▾]        │
│  Expansion ratio: ~7x                                           │
│                                                                 │
│  ── PIPELINE STEPS ──────────────────────────────────────────── │
│                                                                 │
│  Step 1: ANALYZE SOURCE                              [Auto]     │
│  ├── AI reads your source material                              │
│  ├── Identifies characters, settings, plot points               │
│  ├── Maps emotional arc                                         │
│  ├── Identifies themes                                          │
│  └── Output: Analysis summary for your review                   │
│                                                                 │
│  Step 2: GENERATE ENCYCLOPEDIA                    [Auto + QC]   │
│  ├── AI generates character entries from source                 │
│  ├── AI generates world/setting entries                         │
│  ├── AI generates rules/mechanics entries                       │
│  ├── AI generates timeline                                      │
│  ├── 👤 QC GATE: Review and edit generated entries              │
│  └── Output: Complete encyclopedia                              │
│                                                                 │
│  Step 3: GENERATE CHAPTER OUTLINE                 [Auto + QC]   │
│  ├── AI maps source material to chapter structure               │
│  ├── AI expands beats for each chapter                          │
│  ├── AI identifies MUST INCLUDE / MUST NOT INCLUDE              │
│  ├── AI sets target word counts per chapter                     │
│  ├── 👤 QC GATE: Review and edit outline                        │
│  └── Output: Complete chapter-by-chapter outline                │
│                                                                 │
│  Step 4: GENERATE CHAPTERS                        [Auto + QC]   │
│  ├── For each chapter:                                          │
│  │   ├── Assemble context (encyclopedia + outline + summary)    │
│  │   ├── Generate chapter using Encyclopedia Prompt             │
│  │   ├── Run consistency check against encyclopedia             │
│  │   ├── 👤 QC GATE: Review chapter (accept/revise/regenerate) │
│  │   ├── Update encyclopedia with new information               │
│  │   └── Generate previous chapter summary for next             │
│  └── Output: Complete first draft                               │
│                                                                 │
│  Step 5: REVISION PASS                            [Auto + QC]   │
│  ├── AI reads complete manuscript                               │
│  ├── Flags inconsistencies                                      │
│  ├── Flags pacing issues                                        │
│  ├── Flags voice inconsistencies                                │
│  ├── Suggests expansions for thin sections                      │
│  ├── 👤 QC GATE: Review suggestions, apply selectively         │
│  └── Output: Revised manuscript                                 │
│                                                                 │
│  Step 6: LAYOUT & EXPORT                             [Auto]     │
│  ├── Apply selected template                                    │
│  ├── Generate cover (if desired)                                │
│  ├── Generate all export formats                                │
│  └── Output: Publication-ready files                            │
│                                                                 │
│  ── ESTIMATED ───────────────────────────────────────────────── │
│  Time: ~2-4 hours (including QC gates)                          │
│  API cost: ~$3-8                                                │
│  Output: ~25,000 word novella, publication-ready                │
│                                                                 │
│  [Run Pipeline] [Run as Orchestrator Workflow] [Save as Template]│
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Blog Post → Lead Magnet Pipeline

```
┌─────────────────────────────────────────────────────────────────┐
│ ⚡ TRANSFORM: Blog Post → Lead Magnet PDF                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Source: [Paste blog post or import from Vault]                 │
│                                                                 │
│  Step 1: ANALYZE & EXPAND                                       │
│  ├── Identify core concepts                                     │
│  ├── Expand each concept into a section                         │
│  ├── Add actionable steps / exercises                           │
│  ├── Generate section summaries                                 │
│  └── Add examples and case studies                              │
│                                                                 │
│  Step 2: STRUCTURE                                              │
│  ├── Generate table of contents                                 │
│  ├── Write introduction                                         │
│  ├── Write conclusion / next steps                              │
│  ├── Add call-to-action                                         │
│  └── 👤 QC GATE: Review structure                               │
│                                                                 │
│  Step 3: DESIGN                                                 │
│  ├── Apply lead magnet template                                 │
│  ├── Generate cover page                                        │
│  ├── Add branded elements (logo, colors, fonts)                 │
│  ├── Generate section header images                             │
│  │   → sends prompts to NS Studio                               │
│  └── Add callout boxes, pull quotes, visual elements            │
│                                                                 │
│  Step 4: EXPORT                                                 │
│  ├── Interactive PDF with clickable TOC                         │
│  ├── Cover image for landing page                               │
│  ├── Social media cards for promotion                           │
│  └── Email-friendly summary version                             │
│                                                                 │
│  Estimated: 15-30 min │ Cost: ~$0.50-1.00                      │
│                                                                 │
│  [Run Pipeline]                                                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Content → Course Material Pipeline

```
┌─────────────────────────────────────────────────────────────────┐
│ ⚡ TRANSFORM: Content → Course / Workbook                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Source: [Existing content — articles, notes, KB entries]       │
│                                                                 │
│  Step 1: CURRICULUM DESIGN                                      │
│  ├── AI analyzes source content                                 │
│  ├── Identifies teachable concepts                              │
│  ├── Organizes into logical module sequence                     │
│  ├── Identifies knowledge prerequisites                         │
│  └── 👤 QC GATE: Review and reorder modules                    │
│                                                                 │
│  Step 2: MODULE GENERATION                                      │
│  ├── For each module:                                           │
│  │   ├── Learning objectives                                    │
│  │   ├── Core lesson content                                    │
│  │   ├── Examples and illustrations                             │
│  │   ├── Exercises and activities                               │
│  │   ├── Key takeaways                                          │
│  │   ├── Reflection questions                                   │
│  │   └── Blank space for student notes (in layout)              │
│  └── 👤 QC GATE: Review each module                            │
│                                                                 │
│  Step 3: WORKBOOK LAYOUT                                        │
│  ├── Apply workbook template (8.5×11)                           │
│  ├── Fill-in-the-blank exercises                                │
│  ├── Checkbox lists                                             │
│  ├── Journal prompts with lined space                           │
│  ├── Progress trackers                                          │
│  ├── Section dividers                                           │
│  └── Interactive PDF form fields                                │
│                                                                 │
│  Step 4: SUPPLEMENTARY MATERIALS                                │
│  ├── Quick-reference cheat sheet (1-2 pages)                    │
│  ├── Slide deck version (send to NS Studio for presentation)    │
│  ├── Email sequence for course delivery                         │
│  └── Certificate of completion template                         │
│                                                                 │
│  [Run Pipeline]                                                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Other Transform Pipelines

```
Available Pipelines:
├── Blog Post → Twitter/X Thread
├── Blog Post → Newsletter Edition
├── Research Notes → White Paper
├── Interview Transcript → Article
├── Meeting Notes → Action Items + Summary PDF
├── Outline → Full Article
├── Full Article → Executive Summary
├── Multiple Articles → Compilation Book
├── Podcast Transcript → Show Notes + Blog Post
├── YouTube Script → Blog Post
├── Brain Dump → Organized Document
├── KB Entries → Content Calendar (30 posts)
├── Novel Chapter → Audiobook Script
├── Technical Doc → User-Friendly Guide
├── Long-Form → Social Media Carousel Script
└── [+ Create Custom Pipeline]
    [Browse Community

*3/1/2026, 4:43:53 PM*

---

## User

keep going

## AI (claude-opus-4-6)

# **CONTINUING: CUSTOM PIPELINES & ADVANCED FEATURES**

```
└── [+ Create Custom Pipeline]
    [Browse Community Pipelines] (NS Marketplace)
```

### Custom Pipeline Builder

For power users who want to create their own transformation workflows:

```
┌─────────────────────────────────────────────────────────────────┐
│ 🔧 CUSTOM PIPELINE BUILDER                                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Pipeline Name: [My Content Repurposing Pipeline        ]       │
│  Description:   [Takes a blog post and creates 5 formats]       │
│                                                                 │
│  ── STEPS (Drag to reorder) ─────────────────────────────────── │
│                                                                 │
│  ┌─ Step 1 ───────────────────────────────────────────────┐    │
│  │  Type: [AI Transform ▾]                                │    │
│  │  Action: Analyze source content                        │    │
│  │  Model: [Auto ▾]                                       │    │
│  │  Prompt: "Analyze this content and extract:            │    │
│  │   - Core argument / thesis                             │    │
│  │   - Key supporting points (3-5)                        │    │
│  │   - Target audience                                    │    │
│  │   - Emotional tone                                     │    │
│  │   - Best quotes / memorable lines"                     │    │
│  │  Output variable: {{analysis}}                         │    │
│  │  QC Gate: [Off ▾]                                      │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                 │
│  ┌─ Step 2 ───────────────────────────────────────────────┐    │
│  │  Type: [AI Transform ▾]                                │    │
│  │  Action: Generate Twitter thread                       │    │
│  │  Model: [GPT-4o ▾]                                     │    │
│  │  Prompt: "Using this analysis: {{analysis}}            │    │
│  │   Create a 10-tweet thread. First tweet is a hook.     │    │
│  │   Last tweet is a CTA. Use my voice from: {{kb}}"      │    │
│  │  Output variable: {{twitter_thread}}                   │    │
│  │  QC Gate: [On — Review before continuing ▾]            │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                 │
│  ┌─ Step 3 ───────────────────────────────────────────────┐    │
│  │  Type: [AI Transform ▾]                                │    │
│  │  Action: Generate newsletter edition                   │    │
│  │  Model: [Claude ▾]                                     │    │
│  │  Prompt: "Using this analysis: {{analysis}}            │    │
│  │   Write a newsletter edition. Personal opening,        │    │
│  │   3 key insights, actionable takeaway, sign-off.       │    │
│  │   Voice: {{kb.voice_profile}}"                         │    │
│  │  Output variable: {{newsletter}}                       │    │
│  │  QC Gate: [On ▾]                                       │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                 │
│  ┌─ Step 4 ───────────────────────────────────────────────┐    │
│  │  Type: [AI Generate Image ▾]                           │    │
│  │  Action: Create social media card                      │    │
│  │  Send to: NS Studio                                    │    │
│  │  Prompt: "Clean, minimal social card with the quote:   │    │
│  │   '{{analysis.best_quote}}'                            │    │
│  │   Style: dark background, serif font, amber accent"    │    │
│  │  Output variable: {{social_card}}                      │    │
│  │  QC Gate: [On — Pick best from 4 variations ▾]         │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                 │
│  ┌─ Step 5 ───────────────────────────────────────────────┐    │
│  │  Type: [Layout & Export ▾]                             │    │
│  │  Action: Create lead magnet PDF                        │    │
│  │  Template: [Lead Magnet ▾]                             │    │
│  │  Content: {{source}} expanded with {{analysis}}        │    │
│  │  Cover image: {{social_card}}                          │    │
│  │  Export: [Interactive PDF]                              │    │
│  │  Output variable: {{lead_magnet_pdf}}                  │    │
│  │  QC Gate: [On — Final review before export ▾]          │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                 │
│  ┌─ Step 6 ───────────────────────────────────────────────┐    │
│  │  Type: [Save & Organize ▾]                             │    │
│  │  Actions:                                              │    │
│  │  ├── Save {{twitter_thread}} to Vault as "prompt"      │    │
│  │  ├── Save {{newsletter}} to Vault as "document"        │    │
│  │  ├── Save {{social_card}} to Vault as "image"          │    │
│  │  ├── Save {{lead_magnet_pdf}} to Vault as "document"   │    │
│  │  └── Export all to /exports/[date]/                    │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                 │
│  ── VARIABLES ───────────────────────────────────────────────── │
│  {{source}} — Original input content                            │
│  {{kb}} — Your Knowledge Base                                   │
│  {{kb.voice_profile}} — Your voice profile from KB              │
│  {{analysis}} — Output from Step 1                              │
│  {{analysis.best_quote}} — Extracted sub-field                  │
│  {{twitter_thread}} — Output from Step 2                        │
│  {{newsletter}} — Output from Step 3                            │
│  {{social_card}} — Output from Step 4                           │
│  {{lead_magnet_pdf}} — Output from Step 5                       │
│                                                                 │
│  [Save Pipeline] [Run Now] [Send to Orchestrator]               │
│  [Share to Marketplace]                                         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## SPECIALIZED WRITING MODES

Beyond the general editor, these are purpose-built writing environments:

### Screenplay / Script Mode

```
┌─────────────────────────────────────────────────────────────────┐
│ 🎬 SCRIPT MODE                                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Format: [Screenplay ▾] [Stage Play ▾] [TV Script ▾]           │
│          [Podcast Script ▾] [YouTube Script ▾]                  │
│                                                                 │
│  ── Screenplay Format ───────────────────────────────────────── │
│                                                                 │
│  FADE IN:                                                       │
│                                                                 │
│  EXT. STONE BRIDGE — ASHWICK — DAY                              │
│                                                                 │
│  A creek runs beneath, choked with red and gold leaves.         │
│  The bridge is old — centuries old — its stone worn             │
│  smooth by generations of hands and weather.                    │
│                                                                 │
│  A WOMAN (late 20s, carrying herself like someone running       │
│  from something) approaches from the dirt path. She stops       │
│  at the bridge's edge.                                          │
│                                                                 │
│  At the far end, a MAN sits on the railing, feet dangling      │
│  over the creek. Dark hair. Old coat. He turns.                 │
│                                                                 │
│                         ELIAS                                   │
│                    It's you.                                    │
│                                                                 │
│  She freezes. Not from fear. From recognition.                  │
│                                                                 │
│                         NARRATOR                                │
│                    Do I know you?                               │
│                                                                 │
│                         ELIAS                                   │
│                    (a sad smile)                                │
│                    That's a complicated question.               │
│                                                                 │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  Auto-formatting:                                               │
│  ├── Type "INT." or "EXT." → auto-formats as scene heading     │
│  ├── Type character name → auto-CAPS, centers dialogue          │
│  ├── Tab → cycles through: Action → Character → Dialogue →     │
│  │         Parenthetical → Action                               │
│  ├── Parentheticals auto-format in (parentheses)                │
│  └── Page breaks at industry-standard positions                 │
│                                                                 │
│  AI Tools (Script-Specific):                                    │
│  [Continue Scene] [Write Next Scene from Beat]                  │
│  [Rewrite Dialogue — More Subtext]                              │
│  [Add Stage Directions]                                         │
│  [Convert Narrative → Screenplay] ← huge feature                │
│  [Convert Screenplay → Narrative] ← reverse                    │
│  [Generate Shot List from Scene]                                │
│                                                                 │
│  Export: [Final Draft .fdx] [Fountain .fountain]                │
│          [PDF (industry format)] [DOCX]                         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Poetry Mode

```
┌─────────────────────────────────────────────────────────────────┐
│ 📜 POETRY MODE                                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Form: [Free Verse ▾] [Sonnet ▾] [Haiku ▾] [Villanelle ▾]     │
│        [Limerick ▾] [Ghazal ▾] [Prose Poem ▾] [Custom ▾]      │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                                                         │   │
│  │  The house breathes and I count its ribs —              │   │
│  │  each floorboard a bone, each draft a sigh              │   │
│  │  through walls that remember hands                      │   │
│  │  I haven't had yet.                                     │   │
│  │                                                         │   │
│  │  October thins the skin between                         │   │
│  │  what was and what almost is,                           │   │
│  │  and I am standing at the seam,                         │   │
│  │  fingers pressed to the place                           │   │
│  │  where the light leaks through.                         │   │
│  │                                                         │   │
│  │  ▊                                                      │   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ── POETRY ANALYSIS ─────────────────────────────────────────── │
│  Lines: 10  │  Stanzas: 2  │  Syllables avg: 7.3               │
│  Meter: Free verse (no consistent meter detected)               │
│  Rhyme: Unrhymed (ribs/sigh near-rhyme detected)               │
│  Devices: Personification, metaphor, enjambment                │
│                                                                 │
│  AI Tools (Poetry-Specific):                                    │
│  [Suggest Next Stanza] [Find Rhymes for "___"]                  │
│  [Analyze Meter] [Suggest Line Breaks]                          │
│  [Rewrite in Form: ___] [Generate Variations]                   │
│  [Tighten — Remove Weak Words]                                  │
│  [Expand Image — More Sensory Detail]                           │
│                                                                 │
│  Layout Preview:                                                │
│  [Chapbook Format] [Single Poem Page] [Broadside]               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Non-Fiction / Article Mode

```
┌─────────────────────────────────────────────────────────────────┐
│ 📰 ARTICLE MODE                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Type: [Blog Post ▾] [Long-Form Article ▾] [Essay ▾]           │
│        [Tutorial ▾] [Listicle ▾] [Opinion ▾] [Review ▾]        │
│                                                                 │
│  ── STRUCTURE PANEL ─────────────────────────────────────────── │
│                                                                 │
│  ☑ Title / Headline                                             │
│    "How to Build an AI Writing Suite That Actually Works"       │
│    [AI: Generate 10 Headlines] [A/B Score Headlines]            │
│                                                                 │
│  ☑ Hook / Lede (first 2-3 sentences)                           │
│    [AI: Generate 5 Hook Variations]                             │
│                                                                 │
│  ☑ Sections                                                     │
│    ├── H2: The Problem with Current AI Writing Tools            │
│    ├── H2: What Writers Actually Need                           │
│    ├── H2: The Three-Workspace Approach                         │
│    │   ├── H3: The Forge (Generation)                          │
│    │   ├── H3: The Library (Organization)                      │
│    │   └── H3: The Press (Publishing)                          │
│    ├── H2: How It All Connects                                 │
│    └── H2: What This Means for Writers                         │
│    [AI: Generate Outline from Topic]                            │
│    [AI: Expand Outline with Subpoints]                          │
│                                                                 │
│  ☑ Conclusion / CTA                                             │
│    [AI: Generate Conclusion from Article]                       │
│                                                                 │
│  ☐ Meta Description (for SEO)                                   │
│    [AI: Generate from Article]                                  │
│                                                                 │
│  ── ARTICLE-SPECIFIC AI TOOLS ───────────────────────────────── │
│                                                                 │
│  [Research Topic] → sends to NS Research, returns findings      │
│  [Add Statistics] → AI finds relevant data points               │
│  [Add Expert Quote] → AI generates attributed quotes            │
│  [Strengthen Argument] → AI adds supporting evidence            │
│  [Add Transition] → smooth connection between sections          │
│  [SEO Optimize

*3/1/2026, 4:45:07 PM*

---

## User

keep going

## AI (claude-opus-4-6)

# **CONTINUING: ARTICLE MODE & MORE FEATURES**

```
│  [SEO Optimize] → analyzes keyword density, suggests            │
│    improvements, adds semantic keywords naturally                │
│  [Readability Check] → Flesch score, sentence complexity,       │
│    jargon detection, suggests simplifications                    │
│  [Fact Check] → flags claims that should be verified,           │
│    sends to NS Research for source finding                      │
│  [Add Internal Links] → suggests where to link to other         │
│    content from your vault/projects                             │
│  [Generate Social Snippets] → pull quotes, tweetable            │
│    lines, OG description                                        │
│                                                                 │
│  ── CONTENT SCORING ─────────────────────────────────────────── │
│                                                                 │
│  ┌─ Article Quality Score ────────────────────────────────┐    │
│  │                                                        │    │
│  │  Overall: 82/100                                       │    │
│  │                                                        │    │
│  │  Hook Strength:      ████████░░ 80   "Good — could    │    │
│  │                                       be more specific"│    │
│  │  Structure:          █████████░ 90   "Clear, logical   │    │
│  │                                       progression"     │    │
│  │  Evidence/Support:   ██████░░░░ 60   "Needs more data │    │
│  │                                       or examples"     │    │
│  │  Readability:        █████████░ 88   "Accessible,     │    │
│  │                                       good flow"       │    │
│  │  Voice Consistency:  █████████░ 92   "Matches your    │    │
│  │                                       KB voice well"   │    │
│  │  Actionability:      ███████░░░ 70   "Add more        │    │
│  │                                       specific steps"  │    │
│  │  SEO:                ██████░░░░ 62   "Missing target  │    │
│  │                                       keywords in H2s" │    │
│  │                                                        │    │
│  │  [Improve Weakest Areas] [Detailed Report]             │    │
│  │                                                        │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Journaling / Brain Dump Mode

A low-friction mode for capturing ideas before they're organized:

```
┌─────────────────────────────────────────────────────────────────┐
│ 💭 BRAIN DUMP MODE                                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  No structure. No rules. No judgment. Just write.               │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                                                         │   │
│  │  okay so I've been thinking about this idea where       │   │
│  │  the house is actually alive, like not metaphorically   │   │
│  │  but literally alive, and the ticking isn't pipes it's  │   │
│  │  a heartbeat. and what if the journal isn't just        │   │
│  │  predicting the future but actually CREATING it, like   │   │
│  │  whatever she writes becomes true? that changes         │   │
│  │  everything because then at the end when she writes     │   │
│  │  the journal she's not just closing the loop she's      │   │
│  │  literally authoring her own love story into existence.  │   │
│  │                                                         │   │
│  │  also I keep thinking about the autumn thing, how       │   │
│  │  October is the month where everything is dying but     │   │
│  │  it's the most beautiful death, and that's basically    │   │
│  │  the whole metaphor of the story — the most beautiful   │   │
│  │  things are temporary. or ARE they? because the loop    │   │
│  │  makes them eternal. temporary and eternal at the same  │   │
│  │  time. that's the paradox.                              │   │
│  │                                                         │   │
│  │  need to figure out: why 40 years empty? what happened  │   │
│  │  40 years ago that closed the veil? was there another   │   │
│  │  woman? another October?                                │   │
│  │                                                         │   │
│  │  ▊                                                      │   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Words: 189 │ Time writing: 4 min │ No grammar check (off)     │
│                                                                 │
│  ── AFTER YOU'RE DONE ───────────────────────────────────────── │
│                                                                 │
│  [AI: Extract Ideas] → pulls out distinct ideas, adds to KB    │
│  [AI: Find Questions] → identifies unanswered questions         │
│  [AI: Organize into Outline] → structures the dump             │
│  [AI: Extract Encyclopedia Updates] → new facts to add         │
│  [AI: Convert to Prose] → rewrites as polished writing         │
│  [Save to KB as Idea] [Save to Project Notes]                   │
│  [Send to NS Chat for Discussion]                               │
│                                                                 │
│  ── VOICE CAPTURE ───────────────────────────────────────────── │
│                                                                 │
│  [🎤 Voice to Text] → speak your brain dump, auto-transcribe   │
│     Uses: Local Whisper or API transcription                    │
│     Perfect for: Walking, driving, shower thoughts              │
│     Output: Raw text in brain dump, ready for AI processing    │
│                                                                 │
│  Recent voice captures:                                         │
│  ├── 🎤 "walk_oct15_afternoon" (3:42) — about the ending      │
│  ├── 🎤 "shower_thought_veil" (0:58) — veil mechanics idea    │
│  └── 🎤 "driving_character" (2:15) — Jess backstory idea      │
│  [Transcribe All] [Merge into Current Dump]                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## VERSION HISTORY & REVISION TRACKING

Writers need to track changes across drafts. Not Git-level complexity, but meaningful version tracking:

```
┌─────────────────────────────────────────────────────────────────┐
│ 📜 VERSION HISTORY — Chapter 3: "The Shared Dream"             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ── VERSIONS ────────────────────────────────────────────────── │
│                                                                 │
│  v5 (Current) — Today, 2:34 PM                                  │
│  ├── Words: 2,547                                               │
│  ├── Changes: Expanded bridge scene, polished dialogue          │
│  ├── AI operations: 3 (expand, dialogue polish, rewrite)        │
│  └── [Current Version]                                          │
│                                                                 │
│  v4 — Today, 11:15 AM                                           │
│  ├── Words: 2,310                                               │
│  ├── Changes: Added Hollow Bean scene (beat 6)                  │
│  ├── AI operations: 2 (write scene, continue)                   │
│  └── [View] [Compare with Current] [Restore]                   │
│                                                                 │
│  v3 — Yesterday, 9:47 PM                                        │
│  ├── Words: 1,847                                               │
│  ├── Changes: Rewrote opening, added dream sequence             │
│  ├── AI operations: 4 (rewrite, brainstorm, expand ×2)          │
│  └── [View] [Compare with Current] [Restore]                   │
│                                                                 │
│  v2 — Yesterday, 3:20 PM                                        │
│  ├── Words: 1,247                                               │
│  ├── Changes: First AI-generated draft of beats 1-3             │
│  ├── AI operations: 1 (generate chapter from outline)           │
│  └── [View] [Compare with Current] [Restore]                   │
│                                                                 │
│  v1 — Oct 14, 7:00 PM                                           │
│  ├── Words: 340                                                 │
│  ├── Changes: Initial notes and rough opening paragraph         │
│  ├── AI operations: 0 (manual writing)                          │
│  └── [View] [Compare with Current] [Restore]                   │
│                                                                 │
│  ── COMPARISON VIEW ─────────────────────────────────────────── │
│  Comparing: [v3 ▾] vs [v5 (Current) ▾]                         │
│                                                                 │
│  ┌─────────────────────┐ ┌─────────────────────┐               │
│  │ v3 (Yesterday)      │ │ v5 (Current)        │               │
│  │                     │ │                     │               │
│  │ Morning came gray   │ │ Morning came gray   │               │
│  │ and uncertain.      │ │ and uncertain — the  │               │
│  │ [-She woke early,-] │ │ [+kind of October   +│               │
│  │ [-checked the-]     │ │ [+morning where the +│               │
│  │ [-journal.-]        │ │ [+sky can't decide  +│               │
│  │                     │ │ [+between rain and  +│               │
│  │                     │ │ [+simply remaining  +│               │
│  │                     │ │ [+overcast forever.+]│               │
│  │ Still there.        │ │ She checked the      │               │
│  │                     │ │ journal first.       │               │
│  │                     │ │ Still there.         │               │
│  └─────────────────────┘ └─────────────────────┘               │
│                                                                 │
│  Changes: +700 words │ 12 additions │ 3 deletions │ 8 edits    │
│                                                                 │
│  [Merge Selected Changes] [Restore Specific Passages]           │
│                                                                 │
│  ── SNAPSHOTS ───────────────────────────────────────────────── │
│  (Manual save points with notes)                                │
│                                                                 │
│  📸 "Before major revision" — Oct 14                            │
│  📸 "Draft 1 complete" — Oct 16                                 │
│  📸 "After editor feedback" — (future)                          │
│  [Create Snapshot]                                              │
│                                                                 │
│  ── AI OPERATION LOG ────────────────────────────────────────── │
│  (Every AI change tracked — you always know what the AI did)    │
│                                                                 │
│  Today, 2:34 PM — EXPAND (Claude Sonnet)                        │
│  ├── Selected: "They walked to the bridge..." (42 words)       │
│  ├── Result: Expanded to 127 words                              │
│  ├── Prompt context: Elias profile + Bridge setting             │
│  └── [View original] [View AI output] [View final edit]        │
│                                                                 │
│  Today, 2:28 PM — DIALOGUE POLISH (Claude Sonnet)               │
│  ├── Selected: Elias-Narrator conversation (189 words)         │
│  ├── Result: Polished to 203 words                              │
│  ├── Changes: Adjusted Elias voice, added pauses                │
│  └── [View original] [View AI output] [View final edit]        │
│                                                                 │
│  Today, 11:15 AM — WRITE SCENE (GPT-4o)                        │
│  ├── Beat 6: "Coffee at the Hollow Bean"                       │
│  ├── Generated: 463 words                                       │
│  ├── Context: Narrator + Jess + Hollow Bean + Outline           │
│  └── [View generated] [View after edits]                       │
│                                                                 │
│  [Export Full Operation Log]                                    │
│  [Calculate AI vs Human Contribution]                           │
│                                                                 │
│  ── CONTRIBUTION METRICS ────────────────────────────────────── │
│                                                                 │
│  This chapter:                                                  │
│  ├── Human-written: 1,102 words (43%)                          │
│  ├── AI-generated (unedited): 487 words (19%)                  │
│  ├── AI-generated (human-edited): 958 words (38%)              │
│  └── Total: 2,547 words                                        │
│                                                                 │
│  Full manuscript:                                               │
│  ├── Human-written: 38%                                        │
│  ├── AI-generated (unedited): 22%                              │
│  ├── AI-generated (human-edited): 40%                          │
│  └── "Amplified authorship" — your ideas, AI-assisted prose    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## COLLABORATION FEATURES

Even though NovaSyn is single-user by design, writers need to work with editors, beta readers, and collaborators:

### Editor / Beta Reader Mode

```
┌─────────────────────────────────────────────────────────────────┐
│ 👥 COLLABORATION                                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ── SHARE FOR REVIEW ────────────────────────────────────────── │
│                                                                 │
│  [Export Review Copy]                                            │
│  ├── Format: [DOCX with Comments ▾]                             │
│  │           [PDF with Annotations ▾]                           │
│  │           [NovaSyn Review Package (.nsrev) ▾]                │
│  ├── Include: ☑ Manuscript                                      │
│  │           ☑ Chapter summaries                                │
│  │           ☐ Encyclopedia (for context)                       │
│  │           ☐ Outline                                          │
│  │           ☑ Author notes / questions for reviewer            │
│  └── Send to: [Email ▾] [Export to folder ▾] [NS Vault ▾]      │
│                                                                 │
│  ── QUESTIONS FOR REVIEWER ──────────────────────────────────── │
│  (Attach specific questions to specific passages)               │
│                                                                 │
│  📌 Ch3, para 7: "Does the dream sequence feel earned or       │
│     does it come out of nowhere?"                               │
│  📌 Ch3, para 12: "Is Elias's dialogue too cryptic here?       │
│     Can you tell what he means?"                                │
│

*3/1/2026, 4:46:34 PM*

---

## User

keep going

## AI (claude-opus-4-6)

# **CONTINUING: COLLABORATION FEATURES**

```
│  📌 Ch3, para 18: "Too many adjectives in this paragraph?      │
│     Trying to decide what to cut."                              │
│  📌 General: "Does the pacing feel right? Does the middle      │
│     sag anywhere?"                                              │
│  [+ Add Question]                                               │
│                                                                 │
│  ── IMPORT FEEDBACK ─────────────────────────────────────────── │
│                                                                 │
│  [Import DOCX with Track Changes]                               │
│  ├── Shows all changes inline                                   │
│  ├── Accept/reject each change individually                     │
│  ├── Accept/reject all from specific reviewer                   │
│  └── Comments appear as margin notes                            │
│                                                                 │
│  [Import PDF Annotations]                                       │
│  ├── Extracts highlighted passages                              │
│  ├── Extracts margin comments                                   │
│  ├── Maps annotations to your manuscript                        │
│  └── Creates actionable task list from feedback                 │
│                                                                 │
│  [Import NovaSyn Review Package (.nsrev)]                       │
│  ├── Native format, preserves everything                        │
│  ├── Inline comments, margin notes, ratings                     │
│  └── Reviewer's answers to your questions                       │
│                                                                 │
│  ── FEEDBACK DASHBOARD ──────────────────────────────────────── │
│                                                                 │
│  Editor: Sarah M.        Received: Oct 18                       │
│  Beta Reader: James K.   Received: Oct 20                       │
│  Beta Reader: Mika T.    Received: Oct 21                       │
│                                                                 │
│  ┌─ Feedback Summary ─────────────────────────────────────┐    │
│  │                                                         │    │
│  │  Total comments: 47                                     │    │
│  │  ├── Praise / Positive: 18                              │    │
│  │  ├── Suggestions: 21                                    │    │
│  │  ├── Questions: 5                                       │    │
│  │  └── Issues / Errors: 3                                 │    │
│  │                                                         │    │
│  │  Addressed: 31 / 47 (66%)                               │    │
│  │  ████████████████░░░░░░░░ 66%                           │    │
│  │                                                         │    │
│  │  Chapters with most feedback:                           │    │
│  │  ├── Ch3: 12 comments (dream sequence)                  │    │
│  │  ├── Ch7: 9 comments (pacing)                           │    │
│  │  └── Ch8: 8 comments (emotional impact)                 │    │
│  │                                                         │    │
│  │  Consensus issues (multiple reviewers flagged):         │    │
│  │  ⚠️ Ch3 dream sequence feels abrupt (Sarah + Mika)      │    │
│  │  ⚠️ Ch7 middle section drags (Sarah + James)            │    │
│  │  ⚠️ Elias voice inconsistent Ch5-Ch6 (all three)        │    │
│  │                                                         │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  [AI: Summarize All Feedback]                                   │
│  [AI: Prioritize Feedback by Impact]                            │
│  [AI: Generate Revision Plan from Feedback]                     │
│  [AI: Address Specific Comment] → select a comment,             │
│    AI suggests a revision that addresses it                     │
│                                                                 │
│  ── AI REVISION ASSISTANT ───────────────────────────────────── │
│                                                                 │
│  Based on your feedback, here's a suggested revision plan:      │
│                                                                 │
│  Priority 1 (Consensus Issues):                                 │
│  ☐ Expand dream sequence lead-in (Ch3, para 5-7)              │
│    → AI suggestion: Add a beat where she mentions               │
│      the dream BEFORE meeting Elias, so when they               │
│      discover they shared it, it feels earned                   │
│    [Apply AI Fix] [Modify] [Skip]                               │
│                                                                 │
│  ☐ Tighten Ch7 middle section                                  │
│    → AI suggestion: Remove repeated reflection on               │
│      the veil mechanics (already covered in Ch6),               │
│      replace with forward-moving action                         │
│    [Apply AI Fix] [Modify] [Skip]                               │
│                                                                 │
│  ☐ Audit Elias voice Ch5-Ch6                                   │
│    → AI analysis: His dialogue in Ch5 uses contractions         │
│      ("I'm", "don't") but Ch6 reverts to formal                │
│      ("I am", "do not"). Recommend: formal throughout,          │
│      contractions only in moments of high emotion               │
│    [Apply AI Fix] [Modify] [Skip]                               │
│                                                                 │
│  Priority 2 (Individual Suggestions):                           │
│  ☐ 18 more items...                                            │
│  [Show All] [Work Through One by One]                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## PROJECT MANAGEMENT & WRITING GOALS

### The Dashboard

When you first open NovaSyn Writer, you see your writing dashboard:

```
┌─────────────────────────────────────────────────────────────────┐
│ 🏠 NOVASYN WRITER — Dashboard                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Welcome back. You wrote 847 words yesterday. 🔥 3-day streak   │
│                                                                 │
│  ── ACTIVE PROJECTS ─────────────────────────────────────────── │
│                                                                 │
│  ┌─ The Journal (Novel) ──────────────────────────────────┐    │
│  │                                                         │    │
│  │  Progress: ████████████░░░░░░░░░░░░ 26%                │    │
│  │  Words: 6,597 / 25,000                                  │    │
│  │  Chapters: 2 complete, 1 in progress, 7 remaining       │    │
│  │  Last worked: 2 hours ago                               │    │
│  │  Next: Continue Chapter 3 (beat 4 of 8)                 │    │
│  │                                                         │    │
│  │  [Open Project] [Quick Continue — Jump to Ch3]          │    │
│  │                                                         │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  ┌─ Weekly Newsletter (Recurring) ────────────────────────┐    │
│  │                                                         │    │
│  │  This week's edition: Not started                       │    │
│  │  Due: Friday                                            │    │
│  │  Template: Newsletter 2-column                          │    │
│  │  Last edition: 1,200 words, sent Oct 11                 │    │
│  │                                                         │    │
│  │  [Start This Week's Edition] [View Past Editions]       │    │
│  │                                                         │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  ┌─ Lead Magnet: "AI Writing Guide" (PDF) ────────────────┐    │
│  │                                                         │    │
│  │  Progress: ████████████████████░░░░ 80%                 │    │
│  │  Pages: 18 / ~22                                        │    │
│  │  Layout: Complete, needs final review                   │    │
│  │  Status: Waiting for cover image from NS Studio         │    │
│  │                                                         │    │
│  │  [Open Project] [Check NS Studio Status]                │    │
│  │                                                         │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  [+ New Project] [Import Project] [Browse Templates]            │
│                                                                 │
│  ── WRITING GOALS ───────────────────────────────────────────── │
│                                                                 │
│  Daily Goal: 500 words                                          │
│  Today: 312 / 500  ████████████░░░░░░░░ 62%                    │
│                                                                 │
│  Weekly Goal: 3,500 words                                       │
│  This week: 2,847 / 3,500  ████████████████░░░░ 81%            │
│                                                                 │
│  Project Goal: Finish The Journal by Nov 15                     │
│  Remaining: 18,403 words in 31 days = 594 words/day             │
│  At current pace (avg 612/day): On track ✅                     │
│                                                                 │
│  ── STREAK & STATS ──────────────────────────────────────────── │
│                                                                 │
│  Current streak: 🔥 3 days                                      │
│  Longest streak: 🔥 12 days                                     │
│  Total words (all time): 47,832                                 │
│  Total projects: 6 (2 complete, 3 active, 1 archived)          │
│  Writing time today: 42 minutes                                 │
│  Most productive time: 9-11 PM                                  │
│                                                                 │
│  ┌─ This Month ───────────────────────────────────────────┐    │
│  │  Mon Tue Wed Thu Fri Sat Sun                           │    │
│  │  ░░  ██  ██  ░░  ██  ██  ░░   Week 1                  │    │
│  │  ██  ██  ░░  ██  ██  ░░  ██   Week 2                  │    │
│  │  ██  ██  ██  ·   ·   ·   ·    Week 3 (today is Wed)   │    │
│  │                                                         │    │
│  │  ██ = wrote  ░░ = rest day  · = future                 │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  ── RECENT AI COSTS ─────────────────────────────────────────── │
│                                                                 │
│  Today: $0.12                                                   │
│  This week: $0.87                                               │
│  This month: $3.42                                              │
│  Top model: Claude Sonnet (78% of usage)                        │
│  [View Detailed Usage]                                          │
│                                                                 │
│  ── QUICK ACTIONS ───────────────────────────────────────────── │
│                                                                 │
│  [🧠 Brain Dump] [📝 Quick Note to KB] [🎤 Voice Capture]      │
│  [📋 Continue Last Project] [💡 Random Idea from KB]            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Writing Session Tracking

```
┌─────────────────────────────────────────────────────────────────┐
│ ⏱️ SESSION TRACKER                                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Current Session: 42 minutes │ 312 words │ $0.12 API cost       │
│                                                                 │
│  ── SESSION LOG ─────────────────────────────────────────────── │
│                                                                 │
│  00:00 — Opened Chapter 3                                       │
│  00:03 — Reread previous section                                │
│  00:08 — Started writing (beat 3)                               │
│  00:15 — AI: Continue Writing (Claude) → +127 words             │
│  00:18 — Manual editing of AI output                            │
│  00:22 — AI: Expand bridge description → +84 words              │
│  00:25 — Manual writing → +68 words                             │
│  00:31 — AI: Dialogue Polish (Elias voice) → modified 12 words  │
│  00:35 — Manual writing → +33 words                             │
│  00:42 — Now                                                    │
│                                                                 │
│  ── SESSION RHYTHM ──────────────────────────────────────────── │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Writing flow visualization:                            │   │
│  │                                                         │   │
│  │  ████░░████████░░██████░░████████░░██████████████        │   │
│  │  ↑         ↑         ↑         ↑         ↑              │   │
│  │  AI     Manual    AI      Manual     Manual              │   │
│  │                                                         │   │
│  │  Green = human writing                                   │   │
│  │  Blue = AI generation                                    │   │
│  │  Gray = reading / thinking / editing                     │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ── END SESSION REPORT ──────────────────────────────────────── │
│  (Shows when you close the project or end session)              │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  📊 Session Summary                                     │   │
│  │                                                         │   │
│  │  Duration: 42 minutes                                   │   │
│  │  Words added: 312 (net, after edits)                    │   │
│  │  Words generated by AI: 211                             │   │
│  │  Words written by you: 101                              │   │
│  │  Words edited/revised: 47                               │   │
│  │  AI operations: 3                                       │   │
│  │  API cost: $0.12                                        │   │
│  │  Cost per word: $0.0004                                 │   │
│  │                                                         │   │
│  │  Chapter 3 progress: 1,247 → 1,559 words               │   │
│  │  Beats completed: 3 of 8                                │   │
│  │  Estimated remaining for this chapter: 2 sessions       │   │
│  │                                                         │   │
│  │  💡 Your most productive burst: 00:25-00:35             │   │
│  │     (Manual writing, 101 words in 10 min)               │   │
│  │                                                         │   │
│  │  🧠 New ideas captured: 0                               │   │
│  │  📋 Encyclopedia updates needed: 1                      

*3/1/2026, 4:50:11 PM*

---

## User

keep going

## AI (claude-opus-4-6)

# **CONTINUING: SESSION TRACKING & DATABASE**

```
│  │     → Elias said "I don't understand it either"         │   │
│  │       (new character knowledge — update encyclopedia?)   │   │
│  │                                                         │   │
│  │  🌱 New plants placed: 1                                │   │
│  │     → Jess didn't notice Elias is odd (Ch3 beat 6)     │   │
│  │       (pays off in Ch7 — nobody remembers him)          │   │
│  │                                                         │   │
│  │  [Update Encyclopedia Now] [Remind Me Next Session]     │   │
│  │  [Save Session Report] [Share to Writing Log]           │   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## THE SQLITE SCHEMA FOR WRITER

Building on the existing NovaSyn database schema, here are the Writer-specific tables:

```sql
-- ═══════════════════════════════════════════════════════════
-- NOVASYN WRITER — DATABASE SCHEMA
-- All tables prefixed with writer_ to avoid collision
-- Extends the shared novasyn.db
-- ═══════════════════════════════════════════════════════════

-- ── PROJECTS ─────────────────────────────────────────────

CREATE TABLE writer_projects (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    subtitle TEXT,
    author TEXT,
    type TEXT NOT NULL,           -- 'novel', 'novella', 'short_story',
                                 -- 'article', 'blog', 'newsletter',
                                 -- 'screenplay', 'poetry', 'course',
                                 -- 'lead_magnet', 'report', 'custom'
    status TEXT DEFAULT 'active', -- 'active', 'draft', 'revision',
                                 -- 'review', 'complete', 'archived'
    genre TEXT,                   -- 'romance', 'mystery', 'fantasy', etc.
    target_word_count INTEGER,
    current_word_count INTEGER DEFAULT 0,
    target_date TEXT,             -- deadline
    
    -- Template & Layout
    template_id TEXT,             -- references writer_templates
    page_size TEXT,               -- '6x9', '5.5x8.5', 'letter', etc.
    
    -- Voice & Style
    voice_profile TEXT,           -- JSON: extracted voice rules
    comparable_authors TEXT,      -- JSON: ["Alice Hoffman", "Audrey Niffenegger"]
    pov TEXT,                     -- 'first', 'third_limited', 'third_omni', 'second'
    tense TEXT,                   -- 'past', 'present'
    tone_keywords TEXT,           -- JSON: ["literary", "atmospheric", "melancholic"]
    
    -- Source material (if transforming existing content)
    source_type TEXT,             -- 'original', 'expansion', 'adaptation', 'transform'
    source_content TEXT,          -- original content being expanded
    source_word_count INTEGER,
    expansion_ratio REAL,         -- target / source
    
    -- Metadata
    isbn TEXT,
    language TEXT DEFAULT 'en',
    description TEXT,             -- book blurb / project description
    keywords TEXT,                -- JSON array for metadata/SEO
    
    folder_path TEXT,             -- local folder for project assets
    created_at INTEGER NOT NULL,
    modified_at INTEGER NOT NULL
);

-- ── CHAPTERS / SECTIONS ──────────────────────────────────

CREATE TABLE writer_chapters (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    title TEXT,
    subtitle TEXT,
    chapter_number INTEGER,
    part_number INTEGER,          -- for multi-part books (Part I, Part II)
    part_title TEXT,
    
    -- Content
    content TEXT,                 -- the actual chapter text (rich text / markdown)
    content_format TEXT DEFAULT 'markdown',  -- 'markdown', 'html', 'plain'
    
    -- Progress
    status TEXT DEFAULT 'outline', -- 'idea', 'outline', 'draft', 
                                  -- 'revision', 'polished', 'final'
    word_count INTEGER DEFAULT 0,
    target_word_count INTEGER,
    
    -- Outline
    beat_sequence TEXT,           -- JSON: ordered array of beat objects
    emotional_arc TEXT,           -- JSON: {opens, moves_through, closes}
    must_include TEXT,            -- JSON: array of required elements
    must_not_include TEXT,        -- JSON: array of restrictions
    
    -- Timeline & Context
    timeline_start TEXT,          -- when this chapter takes place
    timeline_end TEXT,
    settings TEXT,                -- JSON: array of setting IDs used
    characters TEXT,              -- JSON: array of character IDs appearing
    
    -- Source mapping (if expanding existing content)
    source_episode TEXT,          -- which source section maps to this chapter
    source_text TEXT,             -- the original text being expanded
    
    -- Metadata
    sort_order INTEGER DEFAULT 0,
    master_page TEXT,             -- which master page to use in layout
    start_on TEXT DEFAULT 'recto', -- 'recto', 'verso', 'any'
    
    created_at INTEGER NOT NULL,
    modified_at INTEGER NOT NULL,
    FOREIGN KEY (project_id) REFERENCES writer_projects(id)
);

-- ── ENCYCLOPEDIA ─────────────────────────────────────────

CREATE TABLE writer_encyclopedia (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    type TEXT NOT NULL,           -- 'character', 'setting', 'rules',
                                 -- 'timeline', 'relationship', 'item',
                                 -- 'faction', 'creature', 'custom'
    name TEXT NOT NULL,
    
    -- Structured data (type-specific)
    structured_data TEXT,         -- JSON: full encyclopedia entry
                                 -- Character: {physical, psychological, voice, arc...}
                                 -- Setting: {geography, atmosphere, locations...}
                                 -- Rules: {how_it_works, limitations, who_can_use...}
    
    -- Quick reference fields
    summary TEXT,                 -- 1-2 sentence summary for quick context
    first_appearance TEXT,        -- chapter ID where first mentioned
    
    -- For characters specifically
    role TEXT,                    -- 'protagonist', 'love_interest', 'antagonist', 
                                 -- 'supporting', 'minor'
    voice_notes TEXT,             -- speech patterns, sample dialogue
    
    -- AI context
    token_count INTEGER,          -- how many tokens this entry uses in context
    auto_include_chapters TEXT,   -- JSON: chapters where this should auto-load
    
    -- Tracking
    last_verified_chapter TEXT,   -- last chapter this was checked against
    consistency_issues TEXT,      -- JSON: flagged inconsistencies
    
    -- Images
    reference_image BLOB,         -- optional character/setting image
    reference_image_prompt TEXT,   -- the prompt used to generate it
    
    sort_order INTEGER DEFAULT 0,
    created_at INTEGER NOT NULL,
    modified_at INTEGER NOT NULL,
    FOREIGN KEY (project_id) REFERENCES writer_projects(id)
);

-- ── CONTINUITY TRACKING ──────────────────────────────────

CREATE TABLE writer_continuity_plants (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    
    -- What was planted
    description TEXT NOT NULL,    -- "Ticking in the walls"
    purpose TEXT,                 -- "Something alive about the house"
    
    -- Where it was planted
    planted_chapter_id TEXT,
    planted_paragraph INTEGER,    -- approximate location
    planted_text TEXT,            -- the actual text that plants it
    
    -- Where it pays off
    payoff_chapter_id TEXT,
    payoff_description TEXT,      -- "Ticking stops when Elias disappears"
    payoff_text TEXT,             -- the actual payoff text (filled after written)
    
    -- Status
    status TEXT DEFAULT 'planted', -- 'planned', 'planted', 'paid_off', 'abandoned'
    
    created_at INTEGER NOT NULL,
    modified_at INTEGER NOT NULL,
    FOREIGN KEY (project_id) REFERENCES writer_projects(id),
    FOREIGN KEY (planted_chapter_id) REFERENCES writer_chapters(id),
    FOREIGN KEY (payoff_chapter_id) REFERENCES writer_chapters(id)
);

CREATE TABLE writer_continuity_threads (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    
    description TEXT NOT NULL,    -- "Who maintains the graves?"
    introduced_chapter_id TEXT,
    needs_resolution_by TEXT,     -- chapter ID or "end"
    resolution_chapter_id TEXT,
    resolution_description TEXT,
    
    status TEXT DEFAULT 'open',   -- 'open', 'planned', 'resolved', 'abandoned'
    priority TEXT DEFAULT 'normal', -- 'low', 'normal', 'high', 'critical'
    
    created_at INTEGER NOT NULL,
    modified_at INTEGER NOT NULL,
    FOREIGN KEY (project_id) REFERENCES writer_projects(id)
);

CREATE TABLE writer_continuity_knowledge (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    character_id TEXT NOT NULL,   -- references writer_encyclopedia
    
    -- What they know
    knows TEXT NOT NULL,          -- JSON array of things character knows
    does_not_know TEXT NOT NULL,  -- JSON array of things they don't know
    
    -- As of when
    as_of_chapter_id TEXT,
    
    -- Changes
    learns_in TEXT,               -- JSON: {chapter_id: "what they learn"}
    
    created_at INTEGER NOT NULL,
    modified_at INTEGER NOT NULL,
    FOREIGN KEY (project_id) REFERENCES writer_projects(id),
    FOREIGN KEY (character_id) REFERENCES writer_encyclopedia(id)
);

-- ── KNOWLEDGE BASE (Writer-specific) ────────────────────

CREATE TABLE writer_kb (
    id TEXT PRIMARY KEY,
    project_id TEXT,              -- NULL = global KB, non-null = project-specific
    category TEXT NOT NULL,       -- 'idea', 'story', 'framework', 'voice',
                                 -- 'research', 'reference'
    title TEXT,
    content TEXT NOT NULL,
    
    -- Source
    source TEXT,                  -- 'manual', 'brain_dump', 'voice_capture',
                                 -- 'extracted', 'ai_generated'
    source_session_id TEXT,       -- if from a brain dump or voice capture
    
    -- AI processing
    ai_summary TEXT,              -- AI-generated summary
    ai_connections TEXT,          -- JSON: related KB entries
    ai_used_in TEXT,              -- JSON: chapters/projects where this was used
    
    tags TEXT,                    -- JSON array
    is_active BOOLEAN DEFAULT 1,
    
    created_at INTEGER NOT NULL,
    modified_at INTEGER NOT NULL
);

-- ── VERSION HISTORY ──────────────────────────────────────

CREATE TABLE writer_versions (
    id TEXT PRIMARY KEY,
    chapter_id TEXT NOT NULL,
    version_number INTEGER NOT NULL,
    
    content TEXT NOT NULL,         -- full chapter content at this version
    word_count INTEGER,
    
    -- What changed
    change_description TEXT,       -- human note about what changed
    change_type TEXT,              -- 'manual', 'ai_generation', 'ai_revision',
                                  -- 'feedback_revision', 'merge'
    
    -- Diff info
    words_added INTEGER DEFAULT 0,
    words_removed INTEGER DEFAULT 0,
    words_modified INTEGER DEFAULT 0,
    
    -- Snapshot flag
    is_snapshot BOOLEAN DEFAULT 0,
    snapshot_name TEXT,            -- "Before major revision", "Draft 1 complete"
    
    created_at INTEGER NOT NULL,
    FOREIGN KEY (chapter_id) REFERENCES writer_chapters(id)
);

-- ── AI OPERATION LOG ─────────────────────────────────────

CREATE TABLE writer_ai_operations (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    chapter_id TEXT,
    
    -- What operation
    operation_type TEXT NOT NULL,  -- 'continue', 'expand', 'compress', 'rewrite',
                                  -- 'brainstorm', 'dialogue_polish', 'tone_shift',
                                  -- 'show_dont_tell', 'voice_match', 'generate_scene',
                                  -- 'generate_chapter', 'consistency_check',
                                  -- 'discovery_suggestion', 'custom'
    
    -- What was selected
    input_text TEXT,               -- the text that was selected/provided
    input_word_count INTEGER,
    
    -- What AI produced
    output_text TEXT,              -- what the AI generated
    output_word_count INTEGER,
    
    -- What the human did with it
    final_text TEXT,               -- what actually ended up in the manuscript
    final_word_count INTEGER,
    action_taken TEXT,             -- 'accepted', 'edited', 'rejected', 'partial'
    
    -- Context used
    context_entries TEXT,          -- JSON: which encyclopedia entries were loaded
    context_tokens INTEGER,
    
    -- Model info
    model TEXT NOT NULL,
    prompt_text TEXT,              -- the full prompt sent to the model
    temperature REAL,
    cost REAL,
    response_time_ms INTEGER,
    
    -- Rating (for model preference learning)
    user_rating INTEGER,          -- 1-5 if rated
    
    created_at INTEGER NOT NULL,
    FOREIGN KEY (project_id) REFERENCES writer_projects(id),
    FOREIGN KEY (chapter_id) REFERENCES writer_chapters(id)
);

-- ── WRITING SESSIONS ─────────────────────────────────────

CREATE TABLE writer_sessions (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    
    -- Timing
    started_at INTEGER NOT NULL,
    ended_at INTEGER,
    duration_seconds INTEGER,
    
    -- Productivity
    words_written_human INTEGER DEFAULT 0,
    words_generated_ai INTEGER DEFAULT 0,
    words_edited INTEGER DEFAULT 0,
    words_net INTEGER DEFAULT 0,   -- net change to manuscript
    
    -- AI usage
    ai_operations_count INTEGER DEFAULT 0,
    ai_cost REAL DEFAULT 0,
    primary_model TEXT,
    
    -- What was worked on
    chapters_touched TEXT,         -- JSON: array of chapter IDs
    beats_completed TEXT,          -- JSON: array of beat references
    
    -- Session log
    activity_log TEXT,             -- JSON: timestamped activity entries
    
    -- Discovery mode
    discovery_mode_used BOOLEAN DEFAULT 0,
    discovery_log TEXT,            -- JSON: discovery session data
    discoveries TEXT,              -- JSON: surprises, new ideas that emerged
    
    FOREIGN KEY (project_id) REFERENCES writer_projects(id)
);

-- ── WRITING GOALS ────────────────────────────────────────

CREATE TABLE writer_goals (
    id TEXT PRIMARY KEY,
    
    type TEXT NOT NULL,            -- 'daily', 'weekly', 'monthly', 'project', 'custom'
    target_words INTEGER,
    target_sessions INTEGER,
    target_chapters INTEGER,
    deadline TEXT,
    
    -- Progress
    current_words INTEGER DEFAULT 0,
    current_sessions INTEGER DEFAULT 0,
    current_chapters INTEGER DEFAULT 0,
    
    -- Streak
    streak_current INTEGER DEFAULT 0,
    streak_longest INTEGER DEFAULT 0,
    streak_last_date TEXT,
    
    is_active BOOLEAN DEFAULT 1,
    created_at INTEGER NOT NULL,
    modified_at INTEGER NOT NULL
);

-- ── TEMPLATES ────────────────────────────────────────────

CREATE TABLE writer_templates (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL,       -- 'book', 'document', 'creative', 
                                 -- 'academic', 'marketing'
    
    -- Page setup
    page_width REAL,              -- inches
    page_height REAL,
    margin_top REAL,
    margin_bottom REAL,
    margin_inside REAL,
    margin_outside REAL,

*3/1/2026, 4:51:26 PM*

---

## User

keep going

## AI (claude-opus-4-6)

# **CONTINUING: DATABASE SCHEMA & TEMPLATES**

```sql
    bleed REAL DEFAULT 0,
    
    -- Typography
    body_font TEXT,
    body_size REAL,
    body_leading REAL,
    heading_font TEXT,
    heading_size REAL,
    caption_font TEXT,
    caption_size REAL,
    
    -- Paragraph settings
    first_line_indent REAL,
    paragraph_spacing_before REAL,
    paragraph_spacing_after REAL,
    alignment TEXT DEFAULT 'justify',
    hyphenation BOOLEAN DEFAULT 1,
    widow_orphan_control BOOLEAN DEFAULT 1,
    
    -- Chapter formatting
    chapter_start TEXT DEFAULT 'recto',  -- 'recto', 'verso', 'any'
    chapter_title_style TEXT,     -- JSON: font, size, position, spacing
    drop_cap_style TEXT,          -- JSON: lines, font, color
    scene_break_character TEXT DEFAULT '❦',
    
    -- Headers & Footers
    header_left TEXT,             -- template: "{{author}}"
    header_right TEXT,            -- template: "{{title}}"
    footer_center TEXT,           -- template: "{{page_number}}"
    header_font TEXT,
    header_size REAL,
    
    -- Master pages
    master_pages TEXT,            -- JSON: array of master page definitions
    
    -- Styles
    styles TEXT,                  -- JSON: named paragraph/character styles
    
    -- Cover
    has_cover_template BOOLEAN DEFAULT 0,
    cover_template TEXT,          -- JSON: cover layout definition
    
    -- Metadata
    description TEXT,
    preview_image BLOB,
    is_builtin BOOLEAN DEFAULT 0,
    is_community BOOLEAN DEFAULT 0,
    source TEXT,                  -- 'builtin', 'custom', 'marketplace', 'imported'
    
    created_at INTEGER NOT NULL,
    modified_at INTEGER NOT NULL
);

-- ── LAYOUT ELEMENTS ──────────────────────────────────────

CREATE TABLE writer_layout_elements (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    chapter_id TEXT,              -- NULL = project-level (cover, TOC, etc.)
    page_number INTEGER,
    
    type TEXT NOT NULL,           -- 'image', 'shape', 'text_box', 'table',
                                 -- 'divider', 'ornament', 'qr_code',
                                 -- 'pull_quote', 'sidebar', 'callout',
                                 -- 'footnote', 'page_break'
    
    -- Position & Size
    x REAL,                       -- position from left (inches)
    y REAL,                       -- position from top (inches)
    width REAL,
    height REAL,
    rotation REAL DEFAULT 0,
    z_index INTEGER DEFAULT 0,
    
    -- Content
    content TEXT,                  -- text content, image path, or JSON config
    style TEXT,                   -- JSON: element-specific styling
    
    -- Image-specific
    image_path TEXT,
    image_vault_id TEXT,          -- references vault_assets
    image_fit TEXT,               -- 'fill', 'fit', 'stretch', 'original'
    image_crop TEXT,              -- JSON: {top, right, bottom, left}
    
    -- Linking
    linked_text TEXT,             -- if this element wraps around body text
    text_wrap TEXT,               -- 'none', 'around', 'through', 'top_bottom'
    
    sort_order INTEGER DEFAULT 0,
    created_at INTEGER NOT NULL,
    modified_at INTEGER NOT NULL,
    FOREIGN KEY (project_id) REFERENCES writer_projects(id),
    FOREIGN KEY (chapter_id) REFERENCES writer_chapters(id)
);

-- ── COLLABORATION / FEEDBACK ─────────────────────────────

CREATE TABLE writer_feedback (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    chapter_id TEXT,
    
    -- Reviewer
    reviewer_name TEXT NOT NULL,
    reviewer_role TEXT,           -- 'editor', 'beta_reader', 'proofreader', 'peer'
    
    -- Feedback
    type TEXT NOT NULL,           -- 'comment', 'suggestion', 'question',
                                 -- 'praise', 'issue', 'correction'
    
    -- Location
    paragraph_index INTEGER,      -- which paragraph
    selection_start INTEGER,      -- character offset start
    selection_end INTEGER,        -- character offset end
    selected_text TEXT,           -- the text they're commenting on
    
    -- Content
    comment TEXT NOT NULL,
    suggestion TEXT,              -- suggested replacement text (if applicable)
    
    -- Resolution
    status TEXT DEFAULT 'new',    -- 'new', 'reviewing', 'accepted', 
                                 -- 'rejected', 'addressed', 'deferred'
    resolution_note TEXT,
    resolved_at INTEGER,
    
    -- Import source
    import_source TEXT,           -- 'docx_track_changes', 'pdf_annotation',
                                 -- 'nsrev_package', 'manual'
    
    created_at INTEGER NOT NULL,
    modified_at INTEGER NOT NULL,
    FOREIGN KEY (project_id) REFERENCES writer_projects(id),
    FOREIGN KEY (chapter_id) REFERENCES writer_chapters(id)
);

-- ── AUTHOR QUESTIONS (for reviewers) ─────────────────────

CREATE TABLE writer_review_questions (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    chapter_id TEXT,
    
    question TEXT NOT NULL,
    paragraph_index INTEGER,      -- attached to specific paragraph, or NULL for general
    
    -- Responses (from different reviewers)
    responses TEXT,               -- JSON: [{reviewer, response, date}]
    
    status TEXT DEFAULT 'open',   -- 'open', 'answered', 'resolved'
    
    created_at INTEGER NOT NULL,
    FOREIGN KEY (project_id) REFERENCES writer_projects(id),
    FOREIGN KEY (chapter_id) REFERENCES writer_chapters(id)
);

-- ── PIPELINES ────────────────────────────────────────────

CREATE TABLE writer_pipelines (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    
    -- Pipeline definition
    steps TEXT NOT NULL,          -- JSON: array of step objects
                                 -- each step: {type, action, model, prompt,
                                 -- output_variable, qc_gate, config}
    
    -- Variables
    variables TEXT,               -- JSON: defined variables and defaults
    
    -- Usage
    run_count INTEGER DEFAULT 0,
    last_run_at INTEGER,
    avg_duration_seconds INTEGER,
    avg_cost REAL,
    
    -- Sharing
    is_builtin BOOLEAN DEFAULT 0,
    is_community BOOLEAN DEFAULT 0,
    source TEXT,                  -- 'builtin', 'custom', 'marketplace'
    
    created_at INTEGER NOT NULL,
    modified_at INTEGER NOT NULL
);

CREATE TABLE writer_pipeline_runs (
    id TEXT PRIMARY KEY,
    pipeline_id TEXT NOT NULL,
    project_id TEXT,
    
    status TEXT NOT NULL,         -- 'running', 'paused_qc', 'completed',
                                 -- 'failed', 'cancelled'
    current_step INTEGER,
    
    -- Results
    step_results TEXT,            -- JSON: {step_index: {status, output, cost, time}}
    variables_state TEXT,         -- JSON: current state of all variables
    
    total_cost REAL DEFAULT 0,
    started_at INTEGER NOT NULL,
    completed_at INTEGER,
    
    FOREIGN KEY (pipeline_id) REFERENCES writer_pipelines(id),
    FOREIGN KEY (project_id) REFERENCES writer_projects(id)
);

-- ── BRAIN DUMPS & VOICE CAPTURES ─────────────────────────

CREATE TABLE writer_brain_dumps (
    id TEXT PRIMARY KEY,
    project_id TEXT,              -- NULL = unassigned
    
    content TEXT NOT NULL,
    word_count INTEGER,
    
    -- Source
    source TEXT NOT NULL,         -- 'typed', 'voice_capture', 'imported'
    voice_file_path TEXT,         -- path to audio file if voice capture
    voice_duration_seconds INTEGER,
    
    -- AI Processing
    extracted_ideas TEXT,         -- JSON: ideas pulled out by AI
    extracted_questions TEXT,     -- JSON: questions identified by AI
    extracted_encyclopedia TEXT,  -- JSON: potential encyclopedia entries
    organized_outline TEXT,       -- AI-organized version
    converted_prose TEXT,         -- AI-converted to polished writing
    
    -- Disposition
    status TEXT DEFAULT 'raw',   -- 'raw', 'processed', 'integrated', 'archived'
    integrated_into TEXT,         -- JSON: where pieces ended up
    
    created_at INTEGER NOT NULL,
    modified_at INTEGER NOT NULL
);

-- ── DISCOVERY SESSIONS ───────────────────────────────────

CREATE TABLE writer_discovery_sessions (
    id TEXT PRIMARY KEY,
    project_id TEXT,
    chapter_id TEXT,
    
    -- Content
    writing_content TEXT,         -- what was written during discovery
    word_count INTEGER,
    
    -- Discovery tracking
    seed_text TEXT,               -- what you started with
    suggestions_offered TEXT,     -- JSON: all AI suggestions during session
    suggestions_accepted TEXT,    -- JSON: which suggestions were used
    surprises TEXT,               -- JSON: moments that surprised the writer
    discovery_log TEXT,           -- JSON: timestamped log of the session
    
    -- AI settings
    temperature REAL,
    model TEXT,
    
    -- Conversion
    converted_to TEXT,            -- JSON: {encyclopedia: [], outline: [], chapter: ""}
    conversion_status TEXT,       -- 'raw', 'partially_converted', 'fully_converted'
    
    -- Metadata
    duration_seconds INTEGER,
    ai_cost REAL,
    
    created_at INTEGER NOT NULL,
    FOREIGN KEY (project_id) REFERENCES writer_projects(id),
    FOREIGN KEY (chapter_id) REFERENCES writer_chapters(id)
);

-- ═══════════════════════════════════════════════════════════
-- INDEXES
-- ═══════════════════════════════════════════════════════════

-- Project lookups
CREATE INDEX idx_writer_chapters_project ON writer_chapters(project_id);
CREATE INDEX idx_writer_chapters_sort ON writer_chapters(project_id, sort_order);
CREATE INDEX idx_writer_encyclopedia_project ON writer_encyclopedia(project_id);
CREATE INDEX idx_writer_encyclopedia_type ON writer_encyclopedia(project_id, type);

-- Continuity lookups
CREATE INDEX idx_writer_plants_project ON writer_continuity_plants(project_id);
CREATE INDEX idx_writer_plants_status ON writer_continuity_plants(status);
CREATE INDEX idx_writer_threads_project ON writer_continuity_threads(project_id);
CREATE INDEX idx_writer_threads_status ON writer_continuity_threads(status);
CREATE INDEX idx_writer_knowledge_character ON writer_continuity_knowledge(character_id);

-- Version lookups
CREATE INDEX idx_writer_versions_chapter ON writer_versions(chapter_id);
CREATE INDEX idx_writer_versions_number ON writer_versions(chapter_id, version_number);

-- AI operation lookups
CREATE INDEX idx_writer_ai_ops_project ON writer_ai_operations(project_id);
CREATE INDEX idx_writer_ai_ops_chapter ON writer_ai_operations(chapter_id);
CREATE INDEX idx_writer_ai_ops_type ON writer_ai_operations(operation_type);
CREATE INDEX idx_writer_ai_ops_model ON writer_ai_operations(model);

-- Session lookups
CREATE INDEX idx_writer_sessions_project ON writer_sessions(project_id);
CREATE INDEX idx_writer_sessions_date ON writer_sessions(started_at);

-- Feedback lookups
CREATE INDEX idx_writer_feedback_project ON writer_feedback(project_id);
CREATE INDEX idx_writer_feedback_chapter ON writer_feedback(chapter_id);
CREATE INDEX idx_writer_feedback_status ON writer_feedback(status);
CREATE INDEX idx_writer_feedback_reviewer ON writer_feedback(reviewer_name);

-- KB lookups
CREATE INDEX idx_writer_kb_project ON writer_kb(project_id);
CREATE INDEX idx_writer_kb_category ON writer_kb(category);

-- Full text search
CREATE VIRTUAL TABLE writer_chapters_fts USING fts5(
    title, content,
    content=writer_chapters,
    content_rowid=rowid
);

CREATE VIRTUAL TABLE writer_encyclopedia_fts USING fts5(
    name, summary, structured_data, voice_notes,
    content=writer_encyclopedia,
    content_rowid=rowid
);

CREATE VIRTUAL TABLE writer_kb_fts USING fts5(
    title, content,
    content=writer_kb,
    content_rowid=rowid
);

CREATE VIRTUAL TABLE writer_brain_dumps_fts USING fts5(
    content,
    content=writer_brain_dumps,
    content_rowid=rowid
);
```

---

## THE PDF RENDERING ENGINE

This is the technical core of The Press. You need to generate professional PDFs entirely on the client side in Electron:

### Technology Options

```
OPTION A: pdfkit (Node.js)
├── Pure JavaScript PDF generation
├── No external dependencies
├── Full control over every element
├── Supports: text, images, vectors, fonts
├── Font embedding built in
├── Excellent for programmatic PDF creation
├── Cons: You build all layout logic yourself
└── Best for: Maximum control, book interiors

OPTION B: Puppeteer / Chromium Print
├── Render HTML/CSS → PDF via Chromium
├── Use CSS for layout (familiar, powerful)
├── CSS Paged Media spec for print layouts
│   ├── @page rules for margins, size
│   ├── page-break-before/after
│   ├── widow/orphan control
│   ├── Running headers/footers
│   └── Bleed and crop marks via CSS
├── Cons: Less precise than dedicated layout engine
├── Already available in Electron (it IS Chromium)
└── Best for: Rapid development, good-enough quality

OPTION C: Hybrid Approach (RECOMMENDED)
├── Use Puppeteer/CSS for the WYSIWYG preview
│   (what you see in The Press preview panel)
├── Use pdfkit for final export
│   (maximum precision for print-ready output)
├── CSS handles 90% of layout decisions
├── pdfkit handles the last 10% (exact positioning,
│   CMYK conversion, bleed marks, font subsetting)
├── Best of both worlds
└── Preview matches export closely enough
    with final export being pixel-perfect
```

### The Rendering Pipeline

```
YOUR MANUSCRIPT
     ↓
┌────────────────────────────────────┐
│  LAYOUT ENGINE                      │
│                                     │
│  1. Parse content into blocks       │
│     ├── Paragraphs                  │
│     ├── Headings                    │
│     ├── Dialogue                    │
│     ├── Scene breaks                │
│     ├── Images/elements             │
│     └── Special elements            │
│                                     │
│  2. Apply styles                    │
│     ├── Template styles             │
│     ├── Named paragraph styles      │
│     ├── Character styles            │
│     └── Override styles             │
│                                     │
│  3. Apply master pages              │
│     ├── Which master for this page? │
│     ├── Headers/footers             │
│     ├── Page numbers                │
│     └── Background elements         │
│                                     │
│  4. Flow content into pages         │
│     ├── Text reflow with hyphenation│
│     ├── Widow/orphan control        │
│     ├── Chapter start rules         │
│     ├── Keep-with-next for headings │
│     ├── Image placement             │
│     └── Float elements              │
│                                     │
│  5. Generate page objects           │
│     └── Each page: exact positions  │
│         of every element            │
│                                     │
└───────────────┬────────────────────┘
                │
        ┌───────┴───────┐
        ↓               ↓
  ┌──────────┐   

*3/1/2026, 4:56:57 PM*

---

## User

keep going

## AI (claude-opus-4-6)

# **CONTINUING: PDF RENDERING ENGINE**

```
        ┌───────┴───────┐
        ↓               ↓
  ┌──────────┐   ┌──────────────┐
  │ PREVIEW  │   │ FINAL EXPORT │
  │          │   │              │
  │ Chromium │   │ pdfkit       │
  │ CSS      │   │              │
  │ Render   │   │ Precise      │
  │          │   │ positioning  │
  │ Fast     │   │ CMYK         │
  │ Live     │   │ Font embed   │
  │ WYSIWYG  │   │ Bleed/crop   │
  │          │   │ PDF/X-1a     │
  └──────────┘   └──────────────┘
  Shows in        Generates
  The Press       final files
  panel
```

### Implementation: The Layout Engine

```javascript
// layout-engine.js — The heart of The Press

class LayoutEngine {
  
  constructor(template, content, options = {}) {
    this.template = template
    this.content = content
    this.options = options
    this.pages = []
    this.currentPage = null
    this.currentY = 0
    this.pageNumber = 0
    this.isRecto = true  // right-hand page
  }
  
  // ── MAIN LAYOUT FLOW ────────────────────────────
  
  async layout() {
    // Parse content into layoutable blocks
    const blocks = this.parseContent(this.content)
    
    // Start with front matter
    await this.layoutFrontMatter()
    
    // Flow blocks into pages
    for (const block of blocks) {
      switch (block.type) {
        case 'chapter_start':
          await this.startNewChapter(block)
          break
        case 'paragraph':
          await this.layoutParagraph(block)
          break
        case 'heading':
          await this.layoutHeading(block)
          break
        case 'scene_break':
          await this.layoutSceneBreak(block)
          break
        case 'image':
          await this.layoutImage(block)
          break
        case 'dialogue':
          await this.layoutDialogue(block)
          break
        case 'blockquote':
          await this.layoutBlockquote(block)
          break
        case 'table':
          await this.layoutTable(block)
          break
        case 'element':
          await this.layoutCustomElement(block)
          break
      }
    }
    
    // Add back matter
    await this.layoutBackMatter()
    
    return this.pages
  }
  
  // ── PAGE MANAGEMENT ──────────────────────────────
  
  newPage(masterPage = 'default') {
    this.pageNumber++
    this.isRecto = this.pageNumber % 2 === 1
    
    const master = this.template.master_pages[masterPage] 
                   || this.template.master_pages['default']
    
    // Calculate margins (inside margin flips for verso/recto)
    const margins = {
      top: this.template.margin_top,
      bottom: this.template.margin_bottom,
      left: this.isRecto ? this.template.margin_inside 
                         : this.template.margin_outside,
      right: this.isRecto ? this.template.margin_outside 
                          : this.template.margin_inside
    }
    
    this.currentPage = {
      number: this.pageNumber,
      isRecto: this.isRecto,
      masterPage: masterPage,
      margins: margins,
      elements: [],
      width: this.template.page_width,
      height: this.template.page_height,
      textAreaTop: margins.top + (master.header_height || 0),
      textAreaBottom: this.template.page_height - margins.bottom 
                      - (master.footer_height || 0),
      textAreaLeft: margins.left,
      textAreaRight: this.template.page_width - margins.right
    }
    
    // Add master page elements (headers, footers, page numbers)
    this.applyMasterPage(master)
    
    // Reset Y position to top of text area
    this.currentY = this.currentPage.textAreaTop
    
    this.pages.push(this.currentPage)
    return this.currentPage
  }
  
  applyMasterPage(master) {
    // Running headers
    if (master.has_header && this.pageNumber > 1) {
      const headerText = this.isRecto 
        ? this.resolveTemplate(this.template.header_right)
        : this.resolveTemplate(this.template.header_left)
      
      this.currentPage.elements.push({
        type: 'text',
        content: headerText,
        x: this.isRecto ? this.currentPage.textAreaRight : 
                          this.currentPage.textAreaLeft,
        y: this.currentPage.margins.top * 0.6,
        style: {
          font: this.template.header_font,
          size: this.template.header_size,
          align: this.isRecto ? 'right' : 'left',
          color: '#666666'
        }
      })
    }
    
    // Page numbers
    if (master.has_page_number && this.pageNumber > 1) {
      this.currentPage.elements.push({
        type: 'text',
        content: String(this.pageNumber),
        x: this.currentPage.textAreaRight / 2,
        y: this.template.page_height - 
           (this.currentPage.margins.bottom * 0.5),
        style: {
          font: this.template.body_font,
          size: this.template.body_size - 1,
          align: 'center',
          color: '#666666'
        }
      })
    }
  }
  
  resolveTemplate(templateStr) {
    if (!templateStr) return ''
    return templateStr
      .replace('{{title}}', this.options.title || '')
      .replace('{{author}}', this.options.author || '')
      .replace('{{chapter}}', this.options.currentChapter || '')
      .replace('{{page_number}}', String(this.pageNumber))
  }
  
  // ── CONTENT LAYOUT ───────────────────────────────
  
  async startNewChapter(block) {
    // Chapters start on recto (right) page by default
    if (this.template.chapter_start === 'recto') {
      if (this.currentPage && !this.isRecto) {
        // Current page is verso (left), add blank page
        this.newPage('blank')
      }
      if (this.currentPage && this.isRecto && this.currentY > 
          this.currentPage.textAreaTop) {
        // Current recto page has content, start new spread
        this.newPage('blank') // blank verso
      }
    }
    
    // Start chapter page with chapter opener master
    this.newPage('chapter_opener')
    this.options.currentChapter = block.title
    
    // Chapter number
    if (block.number) {
      const chapterLabel = `Chapter ${this.numberToWord(block.number)}`
      this.currentPage.elements.push({
        type: 'text',
        content: chapterLabel.toUpperCase(),
        x: this.currentPage.textAreaLeft,
        y: this.currentY + 72, // ~1 inch from top of text area
        width: this.currentPage.textAreaRight - 
               this.currentPage.textAreaLeft,
        style: {
          font: this.template.heading_font,
          size: 12,
          align: 'center',
          tracking: 200, // wide letter spacing
          color: '#333333'
        }
      })
      this.currentY += 96
    }
    
    // Chapter title
    this.currentPage.elements.push({
      type: 'text',
      content: block.title,
      x: this.currentPage.textAreaLeft,
      y: this.currentY,
      width: this.currentPage.textAreaRight - 
             this.currentPage.textAreaLeft,
      style: {
        ...this.getStyle('chapter_title'),
        align: 'center'
      }
    })
    this.currentY += this.template.heading_size * 2.5
    
    // Ornamental divider after title
    if (this.template.scene_break_character) {
      this.currentPage.elements.push({
        type: 'text',
        content: this.template.scene_break_character,
        x: this.currentPage.textAreaLeft,
        y: this.currentY,
        width: this.currentPage.textAreaRight - 
               this.currentPage.textAreaLeft,
        style: {
          font: this.template.body_font,
          size: 14,
          align: 'center',
          color: '#999999'
        }
      })
      this.currentY += 36
    }
    
    // Extra space before first paragraph
    this.currentY += 24
    
    // Mark: next paragraph gets drop cap
    this.nextParagraphIsFirst = true
  }
  
  async layoutParagraph(block) {
    const style = this.nextParagraphIsFirst 
      ? this.getStyle('body_first_para')
      : this.getStyle('body')
    
    // Calculate how much vertical space this paragraph needs
    const textWidth = this.currentPage.textAreaRight - 
                      this.currentPage.textAreaLeft
    const measuredHeight = this.measureText(
      block.content, style, textWidth
    )
    
    // Check if it fits on current page
    if (this.currentY + measuredHeight > 
        this.currentPage.textAreaBottom) {
      // Doesn't fit — need to split or start new page
      
      // Check widow/orphan: if only 1-2 lines would fit,
      // move whole paragraph to next page
      const linesRemaining = Math.floor(
        (this.currentPage.textAreaBottom - this.currentY) / 
        style.leading
      )
      
      if (linesRemaining < 3 && this.template.widow_orphan_control) {
        // Too few lines would remain — move to next page
        this.newPage()
      } else {
        // Split paragraph across pages
        // (complex text reflow logic here)
        await this.splitParagraphAcrossPages(block, style, textWidth)
        return
      }
    }
    
    // Add drop cap if this is the first paragraph of a chapter
    if (this.nextParagraphIsFirst && this.template.drop_cap_style) {
      await this.layoutDropCap(block, style)
      this.nextParagraphIsFirst = false
      return
    }
    
    // Normal paragraph
    this.currentPage.elements.push({
      type: 'paragraph',
      content: block.content,
      x: this.currentPage.textAreaLeft,
      y: this.currentY,
      width: textWidth,
      style: style
    })
    
    this.currentY += measuredHeight + style.paragraph_spacing_after
    this.nextParagraphIsFirst = false
  }
  
  async layoutDropCap(block, style) {
    const dropCapConfig = JSON.parse(this.template.drop_cap_style)
    const firstChar = block.content[0]
    const restOfText = block.content.slice(1)
    
    const dropCapLines = dropCapConfig.lines || 3
    const dropCapHeight = style.leading * dropCapLines
    const dropCapWidth = dropCapHeight * 0.7 // approximate
    
    // The large initial letter
    this.currentPage.elements.push({
      type: 'text',
      content: firstChar,
      x: this.currentPage.textAreaLeft,
      y: this.currentY,
      style: {
        font: dropCapConfig.font || style.font,
        size: style.size * dropCapLines * 1.1,
        color: dropCapConfig.color || style.color
      }
    })
    
    // Wrap remaining text around the drop cap
    const textWidth = this.currentPage.textAreaRight - 
                      this.currentPage.textAreaLeft
    
    // First N lines are indented to make room for drop cap
    this.currentPage.elements.push({
      type: 'paragraph',
      content: restOfText,
      x: this.currentPage.textAreaLeft + dropCapWidth + 4,
      y: this.currentY,
      width: textWidth - dropCapWidth - 4,
      wrapAfterLines: dropCapLines,
      wrapResetX: this.currentPage.textAreaLeft,
      wrapResetWidth: textWidth,
      style: { ...style, indent: 0 }
    })
    
    const totalHeight = this.measureText(restOfText, style, textWidth)
    this.currentY += Math.max(totalHeight, dropCapHeight) + 
                     style.paragraph_spacing_after
  }
  
  // ── HYPHENATION ──────────────────────────────────
  
  hyphenate(text, style, maxWidth) {
    // Use Knuth-Liang hyphenation algorithm
    // (hypher or hyphenation npm packages)
    
    if (!this.template.hyphenation) return text
    
    const Hypher = require('hypher')
    const english = require('hyphenation.en-us')
    const h = new Hypher(english)
    
    // Split text into words, hyphenate each
    return text.split(' ').map(word => {
      const syllables = h.hyphenate(word)
      return syllables.join('\u00AD') // soft hyphen
    }).join(' ')
  }
  
  // ── TEXT MEASUREMENT ─────────────────────────────
  
  measureText(text, style, maxWidth) {
    // Use canvas API (available in Electron) to measure text
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    ctx.font = `${style.size}pt ${style.font}`
    
    // Word wrap and measure total height
    const words = text.split(' ')
    let line = ''
    let lineCount = 0
    
    for (const word of words) {
      const testLine = line + (line ? ' ' : '') + word
      const metrics = ctx.measureText(testLine)
      
      if (metrics.width > maxWidth * 72 && line) { // convert inches to points
        lineCount++
        line = word
      } else {
        line = testLine
      }
    }
    lineCount++ // last line
    
    return lineCount * style.leading + 
           (style.paragraph_spacing_before || 0)
  }
  
  // ── STYLE MANAGEMENT ─────────────────────────────
  
  getStyle(name) {
    const styles = JSON.parse(this.template.styles || '{}')
    const style = styles[name] || {}
    
    // Merge with defaults
    return {
      font: style.font || this.template.body_font,
      size: style.size || this.template.body_size,
      leading: style.leading || this.template.body_leading,
      indent: style.indent !== undefined ? style.indent : 
              this.template.first_line_indent * 72,
      align: style.align || this.template.alignment,
      color: style.color || '#000000',
      bold: style.bold || false,
      italic: style.italic || false,
      small_caps: style.small_caps || false,
      tracking: style.tracking || 0,
      paragraph_spacing_before: style.spacing_before || 0,
      paragraph_spacing_after: style.spacing_after || 
                               this.template.paragraph_spacing_after,
      ...style
    }
  }
  
  numberToWord(n) {
    const words = ['Zero','One','Two','Three','Four','Five',
                   'Six

*3/1/2026, 4:58:00 PM*

---

## User

keep going

## AI (claude-opus-4-6)

# **CONTINUING: PDF RENDERING ENGINE**

```javascript
  numberToWord(n) {
    const words = ['Zero','One','Two','Three','Four','Five',
                   'Six','Seven','Eight','Nine','Ten',
                   'Eleven','Twelve','Thirteen','Fourteen',
                   'Fifteen','Sixteen','Seventeen','Eighteen',
                   'Nineteen','Twenty','Twenty-One','Twenty-Two',
                   'Twenty-Three','Twenty-Four','Twenty-Five']
    return words[n] || String(n)
  }
}
```

### The PDF Export Engine

```javascript
// pdf-export.js — Final export using pdfkit

const PDFDocument = require('pdfkit')
const fs = require('fs')

class PDFExporter {
  
  constructor(pages, template, options = {}) {
    this.pages = pages
    this.template = template
    this.options = options
  }
  
  async exportScreenPDF(outputPath) {
    const doc = new PDFDocument({
      size: [
        this.template.page_width * 72,  // inches to points
        this.template.page_height * 72
      ],
      margin: 0, // we handle margins ourselves
      info: {
        Title: this.options.title,
        Author: this.options.author,
        Subject: this.options.description,
        Keywords: this.options.keywords?.join(', '),
        Creator: 'NovaSyn Writer',
        Producer: 'NovaSyn Writer'
      },
      autoFirstPage: false
    })
    
    doc.pipe(fs.createWriteStream(outputPath))
    
    // Register fonts
    await this.registerFonts(doc)
    
    // Add bookmarks for chapters
    const outline = []
    
    for (let i = 0; i < this.pages.length; i++) {
      const page = this.pages[i]
      
      doc.addPage()
      
      for (const element of page.elements) {
        await this.renderElement(doc, element, 'screen')
      }
      
      // Track chapter bookmarks
      const chapterStart = page.elements.find(
        e => e.type === 'text' && e.style?.isChapterTitle
      )
      if (chapterStart) {
        outline.push({
          title: chapterStart.content,
          page: i
        })
      }
    }
    
    // Add outline/bookmarks
    if (outline.length > 0) {
      this.addOutline(doc, outline)
    }
    
    doc.end()
    
    return outputPath
  }
  
  async exportPrintPDF(outputPath) {
    // Print-ready PDF with bleeds, crop marks, CMYK
    
    const bleed = this.template.bleed || 0.125
    const bleedPoints = bleed * 72
    
    const doc = new PDFDocument({
      size: [
        (this.template.page_width + bleed * 2) * 72,
        (this.template.page_height + bleed * 2) * 72
      ],
      margin: 0,
      info: {
        Title: this.options.title,
        Author: this.options.author,
        Creator: 'NovaSyn Writer',
        Producer: 'NovaSyn Writer (Print-Ready)'
      },
      autoFirstPage: false
    })
    
    doc.pipe(fs.createWriteStream(outputPath))
    
    await this.registerFonts(doc)
    
    for (let i = 0; i < this.pages.length; i++) {
      const page = this.pages[i]
      
      doc.addPage()
      
      // Offset all content by bleed amount
      doc.save()
      doc.translate(bleedPoints, bleedPoints)
      
      for (const element of page.elements) {
        await this.renderElement(doc, element, 'print')
      }
      
      doc.restore()
      
      // Add crop marks
      if (this.options.include_crop_marks) {
        this.addCropMarks(doc, bleedPoints)
      }
    }
    
    doc.end()
    
    return outputPath
  }
  
  async renderElement(doc, element, mode) {
    switch (element.type) {
      case 'text':
        this.renderText(doc, element, mode)
        break
      case 'paragraph':
        this.renderParagraph(doc, element, mode)
        break
      case 'image':
        await this.renderImage(doc, element, mode)
        break
      case 'shape':
        this.renderShape(doc, element, mode)
        break
      case 'divider':
        this.renderDivider(doc, element, mode)
        break
      case 'table':
        this.renderTable(doc, element, mode)
        break
    }
  }
  
  renderText(doc, element, mode) {
    const style = element.style || {}
    
    doc.save()
    
    // Set font
    const fontName = this.resolveFontName(
      style.font, style.bold, style.italic
    )
    doc.font(fontName)
    doc.fontSize(style.size || 11)
    
    // Set color (convert to CMYK for print mode)
    if (mode === 'print') {
      const cmyk = this.rgbToCmyk(style.color || '#000000')
      doc.fillColor(cmyk)
    } else {
      doc.fillColor(style.color || '#000000')
    }
    
    // Letter spacing
    if (style.tracking) {
      doc.characterSpacing(style.tracking / 1000 * style.size)
    }
    
    // Small caps
    let content = element.content
    if (style.small_caps) {
      content = content.toUpperCase()
      doc.fontSize(style.size * 0.85)
    }
    
    // Position and render
    const textOptions = {
      width: element.width ? element.width * 72 : undefined,
      align: style.align || 'left',
      lineGap: style.leading ? 
        (style.leading - style.size) : undefined
    }
    
    doc.text(content, element.x * 72, element.y * 72, textOptions)
    
    doc.restore()
  }
  
  renderParagraph(doc, element, mode) {
    const style = element.style || {}
    
    doc.save()
    
    const fontName = this.resolveFontName(
      style.font, style.bold, style.italic
    )
    doc.font(fontName)
    doc.fontSize(style.size || 11)
    
    if (mode === 'print') {
      doc.fillColor(this.rgbToCmyk(style.color || '#000000'))
    } else {
      doc.fillColor(style.color || '#000000')
    }
    
    const textOptions = {
      width: element.width * 72,
      align: style.align || 'justify',
      indent: style.indent || 0,
      lineGap: style.leading ? 
        (style.leading - style.size) : 2,
      paragraphGap: style.paragraph_spacing_after || 0
    }
    
    // Handle hyphenation
    let content = element.content
    if (this.template.hyphenation) {
      content = this.hyphenateForPDF(content, doc, 
        element.width * 72, style)
    }
    
    doc.text(content, element.x * 72, element.y * 72, textOptions)
    
    doc.restore()
  }
  
  async renderImage(doc, element, mode) {
    const imagePath = element.image_path || element.content
    
    if (!imagePath || !fs.existsSync(imagePath)) {
      // Missing image — render placeholder
      doc.save()
      doc.rect(
        element.x * 72, element.y * 72,
        element.width * 72, element.height * 72
      )
      doc.stroke('#cccccc')
      doc.fontSize(8)
      doc.fillColor('#999999')
      doc.text(
        'Image not found',
        element.x * 72 + 4,
        element.y * 72 + element.height * 36 - 4,
        { width: element.width * 72, align: 'center' }
      )
      doc.restore()
      return
    }
    
    const imageOptions = {
      width: element.width * 72,
      height: element.height * 72,
      fit: [element.width * 72, element.height * 72],
      align: 'center',
      valign: 'center'
    }
    
    if (mode === 'print') {
      // For print, ensure image is at least 300 DPI
      // Check image dimensions vs output dimensions
      const imageInfo = doc.openImage(imagePath)
      const outputWidthInches = element.width
      const requiredPixels = outputWidthInches * 300
      
      if (imageInfo.width < requiredPixels) {
        console.warn(
          `Image ${imagePath} may be low resolution for print. ` +
          `Has ${imageInfo.width}px, needs ${requiredPixels}px ` +
          `for 300 DPI at ${outputWidthInches}" wide.`
        )
      }
    }
    
    doc.image(imagePath, element.x * 72, element.y * 72, imageOptions)
  }
  
  addCropMarks(doc, bleedPoints) {
    const markLength = 18 // points (0.25 inches)
    const markOffset = 6  // points offset from trim edge
    const pageW = this.template.page_width * 72
    const pageH = this.template.page_height * 72
    
    doc.save()
    doc.strokeColor('#000000')
    doc.lineWidth(0.25)
    
    // Top-left corner
    doc.moveTo(bleedPoints, bleedPoints - markOffset)
       .lineTo(bleedPoints, bleedPoints - markOffset - markLength)
       .stroke()
    doc.moveTo(bleedPoints - markOffset, bleedPoints)
       .lineTo(bleedPoints - markOffset - markLength, bleedPoints)
       .stroke()
    
    // Top-right corner
    doc.moveTo(bleedPoints + pageW, bleedPoints - markOffset)
       .lineTo(bleedPoints + pageW, bleedPoints - markOffset - markLength)
       .stroke()
    doc.moveTo(bleedPoints + pageW + markOffset, bleedPoints)
       .lineTo(bleedPoints + pageW + markOffset + markLength, bleedPoints)
       .stroke()
    
    // Bottom-left corner
    doc.moveTo(bleedPoints, bleedPoints + pageH + markOffset)
       .lineTo(bleedPoints, bleedPoints + pageH + markOffset + markLength)
       .stroke()
    doc.moveTo(bleedPoints - markOffset, bleedPoints + pageH)
       .lineTo(bleedPoints - markOffset - markLength, bleedPoints + pageH)
       .stroke()
    
    // Bottom-right corner
    doc.moveTo(bleedPoints + pageW, bleedPoints + pageH + markOffset)
       .lineTo(bleedPoints + pageW, bleedPoints + pageH + markOffset + markLength)
       .stroke()
    doc.moveTo(bleedPoints + pageW + markOffset, bleedPoints + pageH)
       .lineTo(bleedPoints + pageW + markOffset + markLength, bleedPoints + pageH)
       .stroke()
    
    doc.restore()
  }
  
  // ── FONT MANAGEMENT ──────────────────────────────
  
  async registerFonts(doc) {
    // NovaSyn Writer ships with a selection of high-quality
    // open source fonts for book typography
    
    const fontDir = path.join(__dirname, 'fonts')
    
    const builtInFonts = {
      // Serif (for body text)
      'EB Garamond': {
        regular: 'EBGaramond-Regular.ttf',
        bold: 'EBGaramond-Bold.ttf',
        italic: 'EBGaramond-Italic.ttf',
        boldItalic: 'EBGaramond-BoldItalic.ttf'
      },
      'Libre Baskerville': {
        regular: 'LibreBaskerville-Regular.ttf',
        bold: 'LibreBaskerville-Bold.ttf',
        italic: 'LibreBaskerville-Italic.ttf'
      },
      'Crimson Pro': {
        regular: 'CrimsonPro-Regular.ttf',
        bold: 'CrimsonPro-Bold.ttf',
        italic: 'CrimsonPro-Italic.ttf',
        boldItalic: 'CrimsonPro-BoldItalic.ttf'
      },
      'Lora': {
        regular: 'Lora-Regular.ttf',
        bold: 'Lora-Bold.ttf',
        italic: 'Lora-Italic.ttf',
        boldItalic: 'Lora-BoldItalic.ttf'
      },
      'Source Serif Pro': {
        regular: 'SourceSerifPro-Regular.ttf',
        bold: 'SourceSerifPro-Bold.ttf',
        italic: 'SourceSerifPro-Italic.ttf',
        boldItalic: 'SourceSerifPro-BoldItalic.ttf'
      },
      
      // Sans-serif (for headings, captions)
      'Inter': {
        regular: 'Inter-Regular.ttf',
        bold: 'Inter-Bold.ttf',
        italic: 'Inter-Italic.ttf',
        boldItalic: 'Inter-BoldItalic.ttf'
      },
      'Source Sans Pro': {
        regular: 'SourceSansPro-Regular.ttf',
        bold: 'SourceSansPro-Bold.ttf',
        italic: 'SourceSansPro-Italic.ttf',
        boldItalic: 'SourceSansPro-BoldItalic.ttf'
      },
      
      // Display (for titles)
      'Playfair Display': {
        regular: 'PlayfairDisplay-Regular.ttf',
        bold: 'PlayfairDisplay-Bold.ttf',
        italic: 'PlayfairDisplay-Italic.ttf',
        boldItalic: 'PlayfairDisplay-BoldItalic.ttf'
      },
      'Cormorant Garamond': {
        regular: 'CormorantGaramond-Regular.ttf',
        bold: 'CormorantGaramond-Bold.ttf',
        italic: 'CormorantGaramond-Italic.ttf',
        boldItalic: 'CormorantGaramond-BoldItalic.ttf'
      },
      
      // Monospace (for code)
      'JetBrains Mono': {
        regular: 'JetBrainsMono-Regular.ttf',
        bold: 'JetBrainsMono-Bold.ttf',
        italic: 'JetBrainsMono-Italic.ttf',
        boldItalic: 'JetBrainsMono-BoldItalic.ttf'
      },
      
      // Handwriting / Script (for special elements)
      'Caveat': {
        regular: 'Caveat-Regular.ttf',
        bold: 'Caveat-Bold.ttf'
      }
    }
    
    for (const [family, variants] of Object.entries(builtInFonts)) {
      for (const [variant, filename] of Object.entries

*3/1/2026, 4:58:55 PM*

---

## User

keep going

## AI (claude-opus-4-6)

# **CONTINUING: FONT MANAGEMENT & EPUB EXPORT**

```javascript
    for (const [family, variants] of Object.entries(builtInFonts)) {
      for (const [variant, filename] of Object.entries(variants)) {
        const fontPath = path.join(fontDir, filename)
        if (fs.existsSync(fontPath)) {
          const registeredName = `${family}-${variant}`
          doc.registerFont(registeredName, fontPath)
        }
      }
    }
    
    // Also register any user-installed fonts
    const userFontDir = path.join(NSCore.getDataPath(), 'fonts')
    if (fs.existsSync(userFontDir)) {
      const userFonts = fs.readdirSync(userFontDir)
        .filter(f => f.endsWith('.ttf') || f.endsWith('.otf'))
      
      for (const fontFile of userFonts) {
        const fontPath = path.join(userFontDir, fontFile)
        const fontName = path.basename(fontFile, path.extname(fontFile))
        doc.registerFont(fontName, fontPath)
      }
    }
  }
  
  resolveFontName(family, bold, italic) {
    if (bold && italic) return `${family}-boldItalic`
    if (bold) return `${family}-bold`
    if (italic) return `${family}-italic`
    return `${family}-regular`
  }
  
  // ── COLOR CONVERSION ─────────────────────────────
  
  rgbToCmyk(hex) {
    // Convert hex RGB to CMYK for print output
    const r = parseInt(hex.slice(1, 3), 16) / 255
    const g = parseInt(hex.slice(3, 5), 16) / 255
    const b = parseInt(hex.slice(5, 7), 16) / 255
    
    const k = 1 - Math.max(r, g, b)
    
    if (k === 1) return [0, 0, 0, 1] // pure black
    
    const c = (1 - r - k) / (1 - k)
    const m = (1 - g - k) / (1 - k)
    const y = (1 - b - k) / (1 - k)
    
    return [
      Math.round(c * 100),
      Math.round(m * 100),
      Math.round(y * 100),
      Math.round(k * 100)
    ]
  }
  
  // ── OUTLINE / BOOKMARKS ──────────────────────────
  
  addOutline(doc, chapters) {
    // PDFKit supports document outline via the outline property
    for (const chapter of chapters) {
      doc.outline.addItem(chapter.title)
    }
  }
}

module.exports = PDFExporter
```

### EPUB Export Engine

For ebook output, a completely separate exporter that generates valid EPUB 3.0:

```javascript
// epub-export.js — EPUB generation

const JSZip = require('jszip')
const fs = require('fs')
const path = require('path')
const { v4: uuid } = require('uuid')

class EPUBExporter {
  
  constructor(project, chapters, options = {}) {
    this.project = project
    this.chapters = chapters
    this.options = options
    this.bookId = options.isbn || `urn:uuid:${uuid()}`
  }
  
  async export(outputPath) {
    const zip = new JSZip()
    
    // ── EPUB STRUCTURE ──────────────────────────
    //
    // book.epub (zip file)
    // ├── mimetype (uncompressed, must be first)
    // ├── META-INF/
    // │   └── container.xml
    // └── OEBPS/
    //     ├── content.opf (package document)
    //     ├── toc.ncx (NCX table of contents)
    //     ├── toc.xhtml (EPUB3 navigation)
    //     ├── styles/
    //     │   └── book.css
    //     ├── text/
    //     │   ├── cover.xhtml
    //     │   ├── title.xhtml
    //     │   ├── toc.xhtml
    //     │   ├── chapter-01.xhtml
    //     │   ├── chapter-02.xhtml
    //     │   └── ...
    //     └── images/
    //         ├── cover.jpg
    //         └── ...
    
    // 1. mimetype (must be first, uncompressed)
    zip.file('mimetype', 'application/epub+zip', {
      compression: 'STORE'  // no compression
    })
    
    // 2. container.xml
    zip.file('META-INF/container.xml', this.generateContainer())
    
    // 3. Stylesheet
    zip.file('OEBPS/styles/book.css', this.generateCSS())
    
    // 4. Cover page
    if (this.options.coverImagePath) {
      const coverImage = fs.readFileSync(this.options.coverImagePath)
      const ext = path.extname(this.options.coverImagePath)
      zip.file(`OEBPS/images/cover${ext}`, coverImage)
      zip.file('OEBPS/text/cover.xhtml', 
        this.generateCoverPage(`../images/cover${ext}`))
    }
    
    // 5. Title page
    zip.file('OEBPS/text/title.xhtml', this.generateTitlePage())
    
    // 6. Copyright page
    if (this.options.includeCopyright) {
      zip.file('OEBPS/text/copyright.xhtml', 
        this.generateCopyrightPage())
    }
    
    // 7. Dedication page
    if (this.options.dedication) {
      zip.file('OEBPS/text/dedication.xhtml',
        this.generateDedicationPage(this.options.dedication))
    }
    
    // 8. Chapter files
    const chapterFiles = []
    for (let i = 0; i < this.chapters.length; i++) {
      const chapter = this.chapters[i]
      const filename = `chapter-${String(i + 1).padStart(2, '0')}.xhtml`
      
      zip.file(`OEBPS/text/${filename}`, 
        this.generateChapterXHTML(chapter, i + 1))
      
      chapterFiles.push({
        filename: filename,
        title: chapter.title || `Chapter ${i + 1}`,
        id: `chapter-${i + 1}`
      })
      
      // Extract and include any inline images
      const images = this.extractImages(chapter.content)
      for (const img of images) {
        if (fs.existsSync(img.localPath)) {
          const imageData = fs.readFileSync(img.localPath)
          zip.file(`OEBPS/images/${img.filename}`, imageData)
        }
      }
    }
    
    // 9. About the author (back matter)
    if (this.options.aboutAuthor) {
      zip.file('OEBPS/text/about.xhtml',
        this.generateAboutPage(this.options.aboutAuthor))
    }
    
    // 10. Navigation documents
    zip.file('OEBPS/toc.xhtml', 
      this.generateNavXHTML(chapterFiles))
    zip.file('OEBPS/toc.ncx', 
      this.generateNCX(chapterFiles))
    
    // 11. Package document (content.opf)
    zip.file('OEBPS/content.opf', 
      this.generateOPF(chapterFiles))
    
    // Write the zip file
    const buffer = await zip.generateAsync({
      type: 'nodebuffer',
      mimeType: 'application/epub+zip',
      compression: 'DEFLATE',
      compressionOptions: { level: 9 }
    })
    
    fs.writeFileSync(outputPath, buffer)
    
    return outputPath
  }
  
  // ── GENERATORS ───────────────────────────────────
  
  generateContainer() {
    return `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" 
              media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`
  }
  
  generateOPF(chapterFiles) {
    const now = new Date().toISOString().split('.')[0] + 'Z'
    
    // Build manifest items
    let manifestItems = `
    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
    <item id="nav" href="toc.xhtml" media-type="application/xhtml+xml" properties="nav"/>
    <item id="css" href="styles/book.css" media-type="text/css"/>
    <item id="title-page" href="text/title.xhtml" media-type="application/xhtml+xml"/>`
    
    if (this.options.coverImagePath) {
      const ext = path.extname(this.options.coverImagePath)
      const mimeType = ext === '.png' ? 'image/png' : 'image/jpeg'
      manifestItems += `
    <item id="cover-image" href="images/cover${ext}" media-type="${mimeType}" properties="cover-image"/>
    <item id="cover-page" href="text/cover.xhtml" media-type="application/xhtml+xml"/>`
    }
    
    if (this.options.includeCopyright) {
      manifestItems += `
    <item id="copyright" href="text/copyright.xhtml" media-type="application/xhtml+xml"/>`
    }
    
    if (this.options.dedication) {
      manifestItems += `
    <item id="dedication" href="text/dedication.xhtml" media-type="application/xhtml+xml"/>`
    }
    
    for (const ch of chapterFiles) {
      manifestItems += `
    <item id="${ch.id}" href="text/${ch.filename}" media-type="application/xhtml+xml"/>`
    }
    
    if (this.options.aboutAuthor) {
      manifestItems += `
    <item id="about" href="text/about.xhtml" media-type="application/xhtml+xml"/>`
    }
    
    // Build spine (reading order)
    let spineItems = ''
    if (this.options.coverImagePath) {
      spineItems += `\n    <itemref idref="cover-page"/>`
    }
    spineItems += `\n    <itemref idref="title-page"/>`
    if (this.options.includeCopyright) {
      spineItems += `\n    <itemref idref="copyright"/>`
    }
    if (this.options.dedication) {
      spineItems += `\n    <itemref idref="dedication"/>`
    }
    for (const ch of chapterFiles) {
      spineItems += `\n    <itemref idref="${ch.id}"/>`
    }
    if (this.options.aboutAuthor) {
      spineItems += `\n    <itemref idref="about"/>`
    }
    
    return `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf"
         unique-identifier="book-id"
         version="3.0">
  
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="book-id">${this.bookId}</dc:identifier>
    <dc:title>${this.escapeXML(this.project.title)}</dc:title>
    <dc:creator>${this.escapeXML(this.project.author || 'Unknown')}</dc:creator>
    <dc:language>${this.project.language || 'en'}</dc:language>
    <dc:description>${this.escapeXML(this.project.description || '')}</dc:description>
    <meta property="dcterms:modified">${now}</meta>
    <meta name="generator" content="NovaSyn Writer"/>
  </metadata>
  
  <manifest>${manifestItems}
  </manifest>
  
  <spine toc="ncx">${spineItems}
  </spine>
  
</package>`
  }
  
  generateCSS() {
    const t = this.project.template || {}
    
    return `
/* NovaSyn Writer — Generated EPUB Stylesheet */

/* Reset */
* {
  margin: 0;
  padding: 0;
}

body {
  font-family: "${t.body_font || 'Georgia'}", serif;
  font-size: ${t.body_size || 11}pt;
  line-height: ${t.body_leading ? (t.body_leading / (t.body_size || 11)) : 1.4};
  color: #1a1a1a;
  text-align: justify;
  -webkit-hyphens: auto;
  hyphens: auto;
}

/* Paragraphs */
p {
  margin: 0;
  text-indent: ${t.first_line_indent || 0.25}in;
}

/* First paragraph after heading — no indent */
h1 + p,
h2 + p,
h3 + p,
hr + p,
.scene-break + p,
.chapter-start + p {
  text-indent: 0;
}

/* Chapter titles */
h1.chapter-title {
  font-family: "${t.heading_font || 'Georgia'}", serif;
  font-size: 1.8em;
  font-weight: normal;
  text-align: center;
  margin-top: 30%;
  margin-bottom: 0.5em;
  letter-spacing: 0.05em;
}

.chapter-number {
  font-family: "${t.heading_font || 'Georgia'}", serif;
  font-size: 0.85em;
  font-weight: normal;
  text-align: center;
  text-transform: uppercase;
  letter-spacing: 0.2em;
  color: #666;
  margin-bottom: 0.3em;
}

/* Scene breaks */
.scene-break {
  text-align: center;
  margin: 1.5em 0;
  font-size: 1.2em;
  color: #999;
}

/* Drop cap */
.drop-cap {
  float: left;
  font-size: 3.2em;
  line-height: 0.8;
  padding-right: 0.08em;
  margin-top: 0.05em;
  font-family: "${t.heading_font || 'Georgia'}", serif;
}

/* Block quotes */
blockquote {
  margin: 1em 1.5em;
  font-style: italic;
  color: #444;
}

/* Journal entries (specific to The Journal) */
.journal-entry {
  font-family: "${t.handwriting_font || 'Caveat'}", cursive;
  font-style: italic;
  margin: 1em 2em;
  padding: 0.5em;
  border-left: 2px solid #ccc;
  color: #333;
}

/* Emphasis */
em { font-style: italic; }
strong { font-weight: bold; }

/* Images */
img {
  max-width: 100%;
  height: auto;
}

.full-page-image {
  width: 100%;
  page-break-before: always;
  page-break-after: always;
}

/* Front matter */
.

*3/1/2026, 5:00:10 PM*

---

## User

keep going

## AI (claude-opus-4-6)

# **CONTINUING: EPUB EXPORT & INTEGRATION**

```javascript
/* Front matter */
.title-page {
  text-align: center;
  margin-top: 30%;
}

.title-page .book-title {
  font-family: "${t.heading_font || 'Georgia'}", serif;
  font-size: 2.5em;
  font-weight: normal;
  letter-spacing: 0.05em;
  margin-bottom: 0.3em;
}

.title-page .book-subtitle {
  font-size: 1.2em;
  font-style: italic;
  color: #666;
  margin-bottom: 1.5em;
}

.title-page .book-author {
  font-size: 1.3em;
  letter-spacing: 0.1em;
}

.title-page .ornament {
  font-size: 1.5em;
  color: #999;
  margin: 1em 0;
}

/* Copyright page */
.copyright-page {
  font-size: 0.85em;
  color: #666;
  margin-top: 60%;
  text-align: center;
  text-indent: 0;
}

.copyright-page p {
  text-indent: 0;
  margin-bottom: 0.5em;
  text-align: center;
}

/* Dedication */
.dedication {
  text-align: center;
  font-style: italic;
  margin-top: 33%;
  font-size: 1.1em;
}

/* About the author */
.about-author {
  margin-top: 2em;
}

.about-author h2 {
  text-align: center;
  font-size: 1.3em;
  margin-bottom: 1em;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.about-author p {
  text-indent: 0;
  margin-bottom: 0.8em;
}

/* Navigation / TOC */
nav ol {
  list-style: none;
  padding: 0;
}

nav ol li {
  margin-bottom: 0.5em;
}

nav ol li a {
  text-decoration: none;
  color: #1a1a1a;
}
`
  }
  
  generateChapterXHTML(chapter, number) {
    // Convert the chapter content (markdown/html) to XHTML
    const contentHTML = this.markdownToXHTML(chapter.content)
    
    // Add drop cap to first paragraph
    const contentWithDropCap = this.addDropCap(contentHTML)
    
    // Handle scene breaks
    const contentWithBreaks = contentWithDropCap.replace(
      /(<p[^>]*>)\s*(\*\*\*|---|\s*❦\s*)\s*(<\/p>)/g,
      `<div class="scene-break">${this.project.scene_break_character || '❦'}</div>`
    )
    
    return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" 
      xmlns:epub="http://www.idpf.org/2007/ops"
      xml:lang="${this.project.language || 'en'}">
<head>
  <meta charset="UTF-8"/>
  <title>${this.escapeXML(chapter.title || `Chapter ${number}`)}</title>
  <link rel="stylesheet" href="../styles/book.css" type="text/css"/>
</head>
<body>
  <section epub:type="chapter" role="doc-chapter" aria-label="${this.escapeXML(chapter.title)}">
    
    <p class="chapter-number">Chapter ${this.numberToWord(number)}</p>
    <h1 class="chapter-title">${this.escapeXML(chapter.title)}</h1>
    
    <div class="chapter-start"></div>
    
    ${contentWithBreaks}
    
  </section>
</body>
</html>`
  }
  
  generateTitlePage() {
    const ornament = this.project.scene_break_character || '❦'
    
    return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml"
      xml:lang="${this.project.language || 'en'}">
<head>
  <meta charset="UTF-8"/>
  <title>${this.escapeXML(this.project.title)}</title>
  <link rel="stylesheet" href="../styles/book.css" type="text/css"/>
</head>
<body>
  <section epub:type="titlepage">
    <div class="title-page">
      <p class="book-title">${this.escapeXML(this.project.title)}</p>
      ${this.project.subtitle ? 
        `<p class="book-subtitle">${this.escapeXML(this.project.subtitle)}</p>` : ''}
      <p class="ornament">${ornament}</p>
      <p class="book-author">${this.escapeXML(this.project.author || '')}</p>
    </div>
  </section>
</body>
</html>`
  }
  
  generateCopyrightPage() {
    const year = new Date().getFullYear()
    
    return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml"
      xml:lang="${this.project.language || 'en'}">
<head>
  <meta charset="UTF-8"/>
  <title>Copyright</title>
  <link rel="stylesheet" href="../styles/book.css" type="text/css"/>
</head>
<body>
  <section epub:type="copyright-page">
    <div class="copyright-page">
      <p>${this.escapeXML(this.project.title)}</p>
      <p>Copyright © ${year} ${this.escapeXML(this.project.author || '')}</p>
      <p>All rights reserved.</p>
      <p>&nbsp;</p>
      <p>No part of this publication may be reproduced, distributed, 
         or transmitted in any form or by any means without the prior 
         written permission of the author.</p>
      <p>&nbsp;</p>
      <p>This is a work of fiction. Names, characters, places, and 
         incidents are either products of the author's imagination 
         or used fictitiously.</p>
      ${this.project.isbn ? `<p>&nbsp;</p><p>ISBN: ${this.project.isbn}</p>` : ''}
      <p>&nbsp;</p>
      <p>Created with NovaSyn Writer</p>
    </div>
  </section>
</body>
</html>`
  }
  
  generateDedicationPage(dedication) {
    return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml"
      xml:lang="${this.project.language || 'en'}">
<head>
  <meta charset="UTF-8"/>
  <title>Dedication</title>
  <link rel="stylesheet" href="../styles/book.css" type="text/css"/>
</head>
<body>
  <section epub:type="dedication">
    <div class="dedication">
      <p>${this.escapeXML(dedication)}</p>
    </div>
  </section>
</body>
</html>`
  }
  
  generateCoverPage(imagePath) {
    return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml"
      xml:lang="${this.project.language || 'en'}">
<head>
  <meta charset="UTF-8"/>
  <title>Cover</title>
  <style>
    body { margin: 0; padding: 0; text-align: center; }
    img { max-width: 100%; max-height: 100vh; }
  </style>
</head>
<body>
  <section epub:type="cover">
    <img src="${imagePath}" alt="Cover"/>
  </section>
</body>
</html>`
  }
  
  generateAboutPage(aboutText) {
    return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml"
      xml:lang="${this.project.language || 'en'}">
<head>
  <meta charset="UTF-8"/>
  <title>About the Author</title>
  <link rel="stylesheet" href="../styles/book.css" type="text/css"/>
</head>
<body>
  <section epub:type="afterword" class="about-author">
    <h2>About the Author</h2>
    ${aboutText.split('\n\n').map(p => 
      `<p>${this.escapeXML(p)}</p>`
    ).join('\n    ')}
  </section>
</body>
</html>`
  }
  
  generateNavXHTML(chapterFiles) {
    let navItems = ''
    for (const ch of chapterFiles) {
      navItems += `
        <li><a href="text/${ch.filename}">${this.escapeXML(ch.title)}</a></li>`
    }
    
    return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml"
      xmlns:epub="http://www.idpf.org/2007/ops"
      xml:lang="${this.project.language || 'en'}">
<head>
  <meta charset="UTF-8"/>
  <title>Table of Contents</title>
  <link rel="stylesheet" href="styles/book.css" type="text/css"/>
</head>
<body>
  <nav epub:type="toc" role="doc-toc">
    <h1>Contents</h1>
    <ol>${navItems}
    </ol>
  </nav>
</body>
</html>`
  }
  
  generateNCX(chapterFiles) {
    let navPoints = ''
    for (let i = 0; i < chapterFiles.length; i++) {
      const ch = chapterFiles[i]
      navPoints += `
    <navPoint id="${ch.id}" playOrder="${i + 1}">
      <navLabel><text>${this.escapeXML(ch.title)}</text></navLabel>
      <content src="text/${ch.filename}"/>
    </navPoint>`
    }
    
    return `<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head>
    <meta name="dtb:uid" content="${this.bookId}"/>
    <meta name="dtb:depth" content="1"/>
    <meta name="dtb:totalPageCount" content="0"/>
    <meta name="dtb:maxPageNumber" content="0"/>
  </head>
  <docTitle><text>${this.escapeXML(this.project.title)}</text></docTitle>
  <navMap>${navPoints}
  </navMap>
</ncx>`
  }
  
  // ── UTILITIES ────────────────────────────────────
  
  markdownToXHTML(markdown) {
    // Use a markdown parser (marked, markdown-it, etc.)
    const MarkdownIt = require('markdown-it')
    const md = new MarkdownIt({
      html: false,
      xhtmlOut: true,  // XHTML compliant output
      typographer: true // smart quotes, dashes, etc.
    })
    
    return md.render(markdown)
  }
  
  addDropCap(html) {
    // Find first <p> tag and add drop cap to first letter
    return html.replace(
      /(<p[^>]*>)([A-Z])/,
      '$1<span class="drop-cap">$2</span>'
    )
  }
  
  extractImages(content) {
    // Find all image references in the content
    const images = []
    const imgRegex = /!\[([^\]]*)\]\(([^)]+)\)/g
    let match
    
    while ((match = imgRegex.exec(content)) !== null) {
      const localPath = match[2]
      const filename = path.basename(localPath)
      images.push({ alt: match[1], localPath, filename })
    }
    
    return images
  }
  
  escapeXML(str) {
    if (!str) return ''
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;')
  }
  
  numberToWord(n) {
    const words = ['Zero','One','Two','Three','Four','Five',
                   'Six','Seven','Eight','Nine','Ten',
                   'Eleven','Twelve','Thirteen','Fourteen',
                   'Fifteen','Sixteen','Seventeen','Eighteen',
                   'Nineteen','Twenty']
    return words[n] || String(n)
  }
}

module.exports = EPUBExporter
```

---

## NOVASYN ECOSYSTEM INTEGRATION

This is what makes Writer more than a standalone app. It connects to everything else:

### Send-To Integrations

```
┌─────────────────────────────────────────────────────────────────┐
│ 🔗 NOVASYN WRITER — ECOSYSTEM CONNECTIONS                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ── SEND FROM WRITER TO OTHER APPS ──────────────────────────── │
│                                                                 │
│  → NovaSyn AI Chat                                              │
│    ├── Send chapter for discussion/brainstorming                │
│    ├── Send character profile for deep exploration              │
│    ├── Send plot problem for problem-solving                    │
│    ├── "Discuss this chapter with me"                           │
│    └── Context carries over: Chat knows your encyclopedia       │
│                                                                 │
│  → NovaSyn Studio                                               │
│    ├── Send image generation prompt from cover designer         │
│    ├── "Generate an image of [character/setting]"               │
│    ├── Send audiobook script for AI narration                   │
│    ├── Generate chapter header illustrations                    │
│    ├── Generate social media cards for book promotion           │
│    └── Images return to Writer vault automatically              │
│                                                                 │
│  → NovaSyn Prompt Lab                                           │
│    ├── Send writing prompts for optimization                    │
│    ├── "Test this system prompt across models for fiction"      │
│    ├── A/B test different voice instructions                    │
│    └── Optimized prompts return to Writer's AI tools            │
│                                                                 │
│  → NovaSyn Research                                             │
│    ├── "Research [topic] for my novel's setting"                │
│    ├── "Fact-check these historical details"                    │
│    ├── "Find real locations matching my fictional setting"      │
│    └── Research findings save to project's KB                   │
│                                                                 │
│  → NovaSyn Code                                                 │
│    ├── Send custom pipeline for development                     │
│    ├── "Build me a custom export format"                        │
│    └── "Help me create a plugin for Writer"                     │
│                                                                 │
│  → NovaSyn Orchestrator                                         │
│

*3/1/2026, 5:01:10 PM*

---

## User

keep going

## AI (claude-opus-4-6)

# **CONTINUING: ECOSYSTEM INTEGRATION**

```
│  → NovaSyn Orchestrator                                         │
│    ├── Send any pipeline as an Orchestrator workflow             │
│    │   "Short Story → Novel" becomes a visual workflow          │
│    ├── Schedule recurring content generation                    │
│    │   Weekly newsletter pipeline on autopilot                  │
│    ├── Batch operations                                         │
│    │   "Run this pipeline on all 20 blog posts in my vault"    │
│    ├── Complex multi-app workflows                              │
│    │   Write chapter → Generate images → Create audiobook       │
│    │   → Export all formats → Upload to KDP                     │
│    └── QC gates on mobile                                       │
│        Approve chapter drafts from your phone                   │
│                                                                 │
│  → NS Vault (Universal)                                         │
│    ├── Save any text, prompt, or document as a vault asset      │
│    ├── Save generated images                                    │
│    ├── Save exported PDFs and EPUBs                             │
│    └── Save voice captures and brain dumps                      │
│                                                                 │
│  ── RECEIVE IN WRITER FROM OTHER APPS ───────────────────────── │
│                                                                 │
│  ← NovaSyn AI Chat                                              │
│    ├── Receive brainstormed ideas → add to KB                   │
│    ├── Receive character discussions → update encyclopedia      │
│    ├── Receive plot solutions → add to outline                  │
│    ├── Receive refined prose → insert into chapter              │
│    └── Receive research conversations → add to project notes   │
│                                                                 │
│  ← NovaSyn Studio                                               │
│    ├── Receive generated images → insert into layout            │
│    ├── Receive cover art → apply to cover designer              │
│    ├── Receive chapter illustrations → place in manuscript      │
│    ├── Receive AI-narrated audio → link to audiobook export     │
│    └── Receive video book trailers → link in project            │
│                                                                 │
│  ← NovaSyn Prompt Lab                                           │
│    ├── Receive optimized writing prompts → use in AI tools      │
│    ├── Receive voice analysis → update voice profile            │
│    └── Receive model recommendations → set preferred models     │
│                                                                 │
│  ← NovaSyn Research                                             │
│    ├── Receive research findings → add to KB                    │
│    ├── Receive source citations → add to bibliography           │
│    ├── Receive fact-check results → flag in manuscript          │
│    └── Receive setting research → update encyclopedia           │
│                                                                 │
│  ← NovaSyn Orchestrator                                         │
│    ├── Receive pipeline results → complete chapters, images     │
│    ├── Receive batch operation output → multiple assets         │
│    └── Trigger Writer actions from workflow steps               │
│                                                                 │
│  ← NS Vault (Universal)                                         │
│    ├── Import any text asset as project content                 │
│    ├── Import images for layout                                 │
│    ├── Import prompt templates for AI tools                     │
│    └── Import KB entries from other projects                    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### The Right-Click Integration Menu

Every piece of content in Writer has ecosystem-aware right-click options:

```
┌──────────────────────────────────────────────┐
│ Right-click on selected text in editor:       │
│                                               │
│  ── EDIT ──────────────────────────────────── │
│  ✂️ Cut                          Ctrl+X       │
│  📋 Copy                         Ctrl+C       │
│  📌 Pin to Context                            │
│                                               │
│  ── AI TOOLS ──────────────────────────────── │
│  🤖 Expand Selection             Ctrl+Shift+E │
│  🤖 Rewrite Selection            Ctrl+Shift+R │
│  🤖 Compress Selection           Ctrl+Shift+C │
│  🤖 Show Don't Tell                           │
│  🤖 Dialogue Polish                           │
│  🤖 Tone Shift...                 ▸           │
│  🤖 Compare Across Models...                  │
│  🤖 Custom Prompt...                          │
│                                               │
│  ── ANALYZE ───────────────────────────────── │
│  🔍 Check Against Encyclopedia                │
│  🔍 Find Similar Passages                     │
│  🔍 Voice Consistency Check                   │
│  📊 Readability Score                         │
│                                               │
│  ── ORGANIZE ──────────────────────────────── │
│  📎 Add to KB as Idea                         │
│  📎 Create Encyclopedia Entry From...         │
│  🌱 Mark as Foreshadowing Plant               │
│  🧵 Mark as Thread Introduction               │
│  📌 Add Author Question Here                  │
│                                               │
│  ── SEND TO ───────────────────────────────── │
│  → NovaSyn AI Chat  "Discuss this passage"    │
│  → NS Studio        "Generate image from      │
│                       this description"        │
│  → NS Research       "Research this topic"     │
│  → NS Prompt Lab     "Optimize this prompt"    │
│  → NS Vault          "Save to vault"           │
│  → Orchestrator      "Build workflow from..."  │
│                                               │
│  ── FORMAT ────────────────────────────────── │
│  Apply Style...                    ▸           │
│  Insert Scene Break                           │
│  Insert Image...                              │
│  Insert Footnote                              │
│  Mark as Journal Entry                        │
│  Mark as Internal Thought                     │
│                                               │
└──────────────────────────────────────────────┘
```

### Practical Ecosystem Workflow Examples

```
┌─────────────────────────────────────────────────────────────────┐
│ WORKFLOW 1: Complete Novel Pipeline                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  NS Chat: Brainstorm novel concept with Claude                  │
│    → Send concept to Writer                                     │
│                                                                 │
│  Writer: Build encyclopedia from concept                        │
│    → Send setting descriptions to NS Studio                     │
│                                                                 │
│  NS Studio: Generate reference images for locations             │
│    → Send images back to Writer                                 │
│                                                                 │
│  Writer: Create chapter outlines                                │
│    → Generate chapters using encyclopedia prompts               │
│    → Send draft to NS Chat for discussion                       │
│                                                                 │
│  NS Chat: Discuss problem chapters, brainstorm solutions        │
│    → Send solutions back to Writer                              │
│                                                                 │
│  Writer: Revise, polish, layout                                 │
│    → Send cover concept to NS Studio                            │
│                                                                 │
│  NS Studio: Generate cover art variations                       │
│    → Send chosen cover back to Writer                           │
│                                                                 │
│  Writer: Apply cover, export all formats                        │
│    → Send audiobook script to NS Studio                         │
│                                                                 │
│  NS Studio: Generate AI narration chapter by chapter            │
│    → Send audio files back to Writer project                    │
│                                                                 │
│  Writer: Export KDP package, IngramSpark package, EPUB           │
│                                                                 │
│  Result: Complete book with print interior, ebook,              │
│          audiobook, and cover — all from one project.           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ WORKFLOW 2: Weekly Content Machine                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Orchestrator: Triggered every Monday at 9 AM                   │
│    ↓                                                            │
│  NS Chat: Pull 3 ideas from your KB                             │
│    → AI selects the most timely idea                            │
│    → Sends selected idea to Writer                              │
│    ↓                                                            │
│  Writer: Auto-generates article outline                         │
│    → Generates full article draft from outline                  │
│    → 👤 QC GATE: You review and edit the draft                  │
│    ↓                                                            │
│  Writer: Applies newsletter template to approved article        │
│    → Sends key quote to NS Studio                               │
│    ↓                                                            │
│  NS Studio: Generates social media card from quote              │
│    → Generates newsletter header image                          │
│    → 👤 QC GATE: You pick best images                           │
│    → Sends images back to Writer                                │
│    ↓                                                            │
│  Writer: Assembles final newsletter with images                 │
│    → Exports:                                                   │
│      ├── PDF version (for lead magnet)                          │
│      ├── HTML version (for email)                               │
│      ├── Twitter thread version (for social)                    │
│      └── Blog post version (for website)                        │
│    → 👤 QC GATE: Final approval                                 │
│    ↓                                                            │
│  Orchestrator: Saves all outputs to Vault                       │
│    → Sends you notification: "This week's content is ready"     │
│                                                                 │
│  Your involvement: ~30 minutes of QC gates                      │
│  Output: Full week's content across 4 platforms                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ WORKFLOW 3: Research Paper to Published Report                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  NS Research: Deep multi-model research on topic                │
│    → Consensus findings from 3 models                           │
│    → Source citations collected                                 │
│    → Send findings to Writer                                    │
│    ↓                                                            │
│  Writer: Research notes auto-populate KB                        │
│    → AI generates report outline from findings                  │
│    → AI generates each section from outline + KB                │
│    → 👤 QC GATE: Review sections, verify claims                 │
│    ↓                                                            │
│  Writer: Apply business report template                         │
│    → Auto-generate executive summary                            │
│    → Auto-generate table of contents                            │
│    → Auto-format citations and bibliography                     │
│    → Send chart descriptions to NS Studio                       │
│    ↓                                                            │
│  NS Studio: Generate data visualization images                  │
│    → Charts, graphs, infographics                               │
│    → Send back to Writer                                        │
│    ↓                                                            │
│  Writer: Place images in layout                                 │
│    → Final layout review                                        │
│    → Export print-ready PDF + interactive PDF                    │
│                                                                 │
│  Total time: 2-3 hours for a professional report                │
│  that would normally take 2-3 days                              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## KEYBOARD SHORTCUTS

A power user's writing tool needs comprehensive keyboard shortcuts:

```
┌─────────────────────────────────────────────────────────────────┐
│ ⌨️ KEYBOARD SHORTCUTS                                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ── WRITING ─────────────────────────────────────────────────── │
│  Ctrl+Shift+Enter     AI: Continue writing from cursor          │
│  Ctrl+Shift+B         AI: Brainstorm (ideas panel)              │
│  Ctrl+Shift+E         AI: Expand selected text                  │
│  Ctrl+Shift+R         AI: Rewrite selected text                 │
│  Ctrl+Shift+C         AI: Compress selected text                │
│  Ctrl+Shift+D         AI: Dialogue polish                       │
│  Ctrl+Shift+P         AI: Custom prompt on selection            │
│  Ctrl+Shift+M         AI: Compare across models                 │
│  Ctrl+Enter           Accept AI suggestion                      │
│  Escape               Reject AI suggestion                      │
│                                                                 │
│  ── NAVIGATION ──────────────────────────────────────────────── │
│  Ctrl+G               Go to chapter...                          │
│  Ctrl+Shift+G         Go to beat...                             │
│  Ctrl+J               Jump to next unwritten beat               │
│  Alt+Up               Previous chapter                          │
│  Alt+Down             Next chapter                              │
│  Ctrl+F               Find in current chapter                   │
│  Ctrl+Shift+F         Find across entire manuscript             │
│  Ctrl+H               Find and replace                          │
│                                                                 │
│  ── WORKSPACE ───────────────────────────────────────────────── │
│  Ctrl+1               Show/hide Library panel                   │
│  Ctrl+2               Focus on Forge (editor)                   │
│  Ctrl+3               Show/hide Press preview                   │
│  Ctrl+Shift+1         Toggle encyclopedia sidebar               │
│  Ctrl+Shift+2         Toggle outline sidebar                    │
│  Ctrl+Shift+3         Toggle continuity tracker                 │
│  F11                  Distraction-free mode (editor only)        │
│  Ctrl+Shift+Enter     Discovery mode toggle                     │
│                                                                 │
│  ── PROJECT ─────────────────────────────────────────────────── │
│  Ctrl+S               Save (auto-save is always on,             │
│                        but this also creates a version point)    │
│  Ctrl+Shift+S         Create named snapshot                     │
│  Ctrl+Z               Undo                                      │
│  Ctrl+Shift+Z         Redo                                      │
│  Ctrl+E               Quick export (last used format)           │
│  Ctrl+Shift+E         Export dialog                             │
│  Ctrl+N               New chapter / new section                 │
│  Ctrl+Shift+N         New project                               │
│                                                                 │
│  ── FORMATTING ──────────────────────────────────────────────── │
│  Ctrl+B               Bold                                      │
│  Ctrl+I               Italic                                    │
│  Ctrl+U               Underline                                 │
│  Ctrl+Shift+H         Apply heading (cycles H1→H2→H3→P)        │
│  Ctrl+Shift+Q         Apply block quote style                   │
│  Ctrl+Shift+J         Apply journal entry style                 │
│  Ctrl+-               Insert scene break                        │
│  Ctrl+Shift+.         Apply style... (opens style picker)       │
│                                                                 │
│  ── AI CONTEXT ──────────────────────────────────────────────── │
│  Ctrl+Shift+K         Open encyclopedia quick-search            │
│  Ctrl+K               Add item to AI context (from search)      │
│  Ctrl+Shift+L

*3/1/2026, 5:02:27 PM*

---

## User

keep going

## AI (claude-opus-4-6)

# **CONTINUING: KEYBOARD SHORTCUTS & FINAL FEATURES**

```
│  Ctrl+Shift+L         View/edit current AI context              │
│  Ctrl+Shift+X         Clear AI context (reset)                  │
│  Ctrl+Shift+A         Auto-suggest context for current chapter  │
│                                                                 │
│  ── ENCYCLOPEDIA ────────────────────────────────────────────── │
│  Ctrl+Shift+;         Quick-add encyclopedia entry              │
│  Ctrl+;               Link selected text to encyclopedia entry  │
│  Alt+Click            Preview encyclopedia entry (hover card)   │
│                                                                 │
│  ── SEND-TO ─────────────────────────────────────────────────── │
│  Ctrl+Shift+1-7       Send selection to specific app            │
│    Ctrl+Shift+1       → NS Chat                                │
│    Ctrl+Shift+2       → NS Studio                               │
│    Ctrl+Shift+3       → NS Research                             │
│    Ctrl+Shift+4       → NS Prompt Lab                           │
│    Ctrl+Shift+5       → NS Vault                                │
│    Ctrl+Shift+6       → NS Code                                 │
│    Ctrl+Shift+7       → Orchestrator                            │
│                                                                 │
│  [Customize Shortcuts...]                                       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## DISTRACTION-FREE MODE

Writers need a clean space. When you press F11:

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                                                                                     │
│                                                                                     │
│                                                                                     │
│                                                                                     │
│                                                                                     │
│              Morning came gray and uncertain — the kind of October                  │
│              morning where the sky can't decide between rain and                    │
│              simply remaining overcast forever. She checked the                     │
│              journal first. Still there. The entry from yesterday                   │
│              hadn't vanished in the night, hadn't turned out to be                  │
│              something she'd imagined while half-asleep. The ink was                │
│              dark, the handwriting steady, and the words still said                 │
│              what they'd said before:                                               │
│                                                                                     │
│              Find him before autumn ends.                                           │
│                                                                                     │
│              She closed the journal and pressed her fingers to the                  │
│              leather cover, half expecting it to be warm — to pulse                 │
│              like a living thing. It didn't. It was just a book.                    │
│              Just paper and ink and old glue. But the words inside it               │
│              knew things they shouldn't, and she was going to the                   │
│              bridge anyway, because somewhere between logic and the                 │
│              ache in her chest, the ache was winning.▊                              │
│                                                                                     │
│                                                                                     │
│                                                                                     │
│                                                                                     │
│                                                                                     │
│                                                                                     │
│                                                                                     │
│                                                                                     │
│  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─  │
│  Ch 3: "The Shared Dream"  │  1,559 words  │  Beat 3 of 8  │  Ctrl+Shift+Enter: AI│
│                                                                                     │
└─────────────────────────────────────────────────────────────────────────────────────┘

Features of distraction-free mode:
├── Everything hidden except the text
├── Customizable background color (dark, sepia, light, custom)
├── Customizable text width (narrow, medium, wide)
├── Customizable font and size (independent of layout settings)
├── Subtle status bar at bottom (can be hidden too)
├── AI tools still accessible via keyboard shortcuts
├── Ctrl+Shift+Enter still triggers AI continue
├── AI suggestions appear inline, not in a panel
├── Mouse to top of screen reveals minimal toolbar
├── Mouse to left reveals chapter list
├── Escape returns to full workspace
└── Optional: ambient sound (rain, fireplace, coffee shop)
    (because why not — it's Electron, you can play audio)
```

### Ambient Sound (Easter Egg Feature)

```
┌─────────────────────────────────────────────────────┐
│ 🎵 Ambient Sounds                    (F11 mode only)│
├─────────────────────────────────────────────────────┤
│                                                     │
│  ○ Silence                                          │
│  ○ Rain on windows           🔊 ████████░░ 80%     │
│  ○ Fireplace crackling       🔊                     │
│  ○ Coffee shop ambience      🔊                     │
│  ○ Thunderstorm              🔊                     │
│  ○ Forest / Birds            🔊                     │
│  ○ Ocean waves               🔊                     │
│  ○ Night / Crickets          🔊                     │
│  ○ Library quiet             🔊                     │
│  ○ Typing sounds             🔊                     │
│                                                     │
│  Mix: [Rain ▾] + [Fireplace ▾]  (combine two)      │
│                                                     │
│  Timer: [Off ▾] [30 min ▾] [60 min ▾] [Pomodoro ▾] │
│                                                     │
└─────────────────────────────────────────────────────┘

This is a small thing but writers LOVE it.
Ambient sounds + distraction-free mode + good typography = 
the writing experience people pay $50/year for with apps 
like iA Writer or Ulysses. You're including it for free.
```

---

## PLUGIN / EXTENSION SYSTEM

Future-proofing Writer with an extension architecture:

```
┌─────────────────────────────────────────────────────────────────┐
│ 🔌 EXTENSIONS                                                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ── INSTALLED ───────────────────────────────────────────────── │
│                                                                 │
│  ✅ Genre Templates Pack — Romance                              │
│     Adds: romance-specific encyclopedia fields, beat sheets,    │
│     heat level tracking, trope database                         │
│                                                                 │
│  ✅ ProWritingAid Integration                                   │
│     Adds: advanced grammar checking, style suggestions,         │
│     readability analysis (requires ProWritingAid API key)       │
│                                                                 │
│  ✅ Scrivener Import                                            │
│     Adds: import .scriv project files, preserve binder          │
│     structure, convert to Writer project format                 │
│                                                                 │
│  ✅ Word Count Tracker Pro                                      │
│     Adds: detailed writing analytics, heat maps, best           │
│     time of day analysis, progress graphs                       │
│                                                                 │
│  ── AVAILABLE ───────────────────────────────────────────────── │
│                                                                 │
│  📦 Genre Templates Pack — Mystery/Thriller                     │
│     Adds: clue tracking, suspect board, red herring             │
│     management, revelation sequence planner                     │
│     [Install]                                                   │
│                                                                 │
│  📦 Genre Templates Pack — Fantasy/Sci-Fi                       │
│     Adds: magic system builder, world-building encyclopedia     │
│     templates, language/naming generators, map integration      │
│     [Install]                                                   │
│                                                                 │
│  📦 Grammarly Integration                                       │
│     Adds: Grammarly checking in-editor                          │
│     (requires Grammarly account)                                │
│     [Install]                                                   │
│                                                                 │
│  📦 Google Docs Sync                                            │
│     Adds: two-way sync with Google Docs for collaboration       │
│     [Install]                                                   │
│                                                                 │
│  📦 Atticus / Vellum Import                                     │
│     Adds: import from other book formatting tools               │
│     [Install]                                                   │
│                                                                 │
│  📦 KDP Direct Upload                                           │
│     Adds: direct upload to Amazon KDP from Writer               │
│     (requires KDP API access)                                   │
│     [Install]                                                   │
│                                                                 │
│  📦 Pomodoro Writing Timer                                      │
│     Adds: Pomodoro technique timer, sprint tracking,            │
│     word count targets per sprint                               │
│     [Install]                                                   │
│                                                                 │
│  📦 AI Narrator Voices                                          │
│     Adds: preview chapter narration with different AI voices    │
│     directly in Writer (uses ElevenLabs / PlayHT API)           │
│     [Install]                                                   │
│                                                                 │
│  📦 Translation Helper                                          │
│     Adds: side-by-side translation view, terminology            │
│     consistency, multi-language export                           │
│     [Install]                                                   │
│                                                                 │
│  [Browse Marketplace] [Create Extension]                        │
│                                                                 │
│  ── EXTENSION API ───────────────────────────────────────────── │
│                                                                 │
│  Extensions can:                                                │
│  ├── Add new AI tools to the toolbar                            │
│  ├── Add new panel sections to the sidebar                      │
│  ├── Add new encyclopedia entry types                           │
│  ├── Add new export formats                                     │
│  ├── Add new templates                                          │
│  ├── Add new pipeline steps                                     │
│  ├── Integrate with external services                           │
│  ├── Add editor plugins (new formatting, markdown extensions)   │
│  └── Add right-click menu items                                 │
│                                                                 │
│  Extensions cannot:                                             │
│  ├── Access API keys (sandboxed)                                │
│  ├── Access other users' data                                   │
│  ├── Make network calls without user permission                 │
│  ├── Modify core app functionality                              │
│  └── Access file system outside project folder                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## THE COMPLETE FEATURE MAP

Here's every feature in one view:

```
NOVASYN WRITER — COMPLETE FEATURE MAP
══════════════════════════════════════════════════════════

📝 THE FORGE (Writing & Generation)
├── Rich text editor with AI integration
├── AI Writing Tools
│   ├── Continue Writing (from cursor)
│   ├── Brainstorm (idea generation)
│   ├── Write Scene from Beat
│   ├── Dialogue Generator
│   ├── Expand Selection
│   ├── Compress Selection
│   ├── Rewrite Selection
│   ├── Dialogue Polish
│   ├── Tone Shift
│   ├── Show Don't Tell
│   ├── Voice Match (from KB)
│   ├── Custom Prompt
│   └── Compare Across Models (side-by-side)
├── Analysis Tools
│   ├── Consistency Check (vs encyclopedia)
│   ├── Pacing Analysis (heat map)
│   ├── Readability Metrics
│   ├── Character Voice Audit
│   └── Content Scoring (articles)
├── Discovery Writing Mode
│   ├── AI suggestions as you write
│   ├── "What if" prompts
│   ├── Adjustable temperature/surprise level
│   ├── Discovery log
│   └── Convert discovery → structure
├── Specialized Modes
│   ├── Screenplay / Script Mode
│   ├── Poetry Mode
│   ├── Article / Blog Mode
│   ├── Brain Dump Mode
│   └── Distraction-Free Mode (F11)
├── Multi-Model Support
│   ├── Switch models per operation
│   ├── Side-by-side generation comparison
│   ├── Model preference learning
│   ├── Auto-routing by task type
│   └── Merge best parts from multiple models
└── Version History
    ├── Automatic versioning
    ├── Named snapshots
    ├── Side-by-side diff comparison
    ├── AI operation log (full transparency)
    ├── Contribution metrics (human vs AI %)
    └── Restore any previous version

📚 THE LIBRARY (Organization & Knowledge)
├── Project Structure
│   ├── Multi-project management
│   ├── Chapter / section organization
│   ├── Drag-to-reorder
│   └── Status tracking per chapter
├── Encyclopedia System
│   ├── Character entries (structured form)
│   ├── World / Setting entries
│   ├── Rules / Mechanics entries
│   ├── Timeline entries
│   ├── Relationship map (visual graph)
│   ├── AI: Generate from notes
│   ├── AI: Extract from manuscript
│   ├── AI: Verify against manuscript
│   └── Auto-tracked continuity notes
├── Chapter Outline System
│   ├── Beat sequences (drag-to-reorder)
│   ├── Emotional arc tracking
│   ├── Must Include / Must Not Include
│   ├── Settings and characters per chapter
│   ├── Timeline mapping
│   ├── AI: Generate chapter from outline
│   ├── AI: Generate scene from beat
│   └── Progress tracking per beat
├── Continuity Tracker
│   ├── Foreshadowing plants & payoffs
│   ├── Unresolved threads
│   ├── Character knowledge states
│   ├── Timeline verification
│   ├── AI: Scan for untracked plants
│   ├── AI: Find missed threads
│   └── AI: Suggest gap fills
├── Knowledge Base
│   ├── Ideas folder
│   ├── Stories folder (personal experiences)
│   ├── Frameworks folder (writing rules)
│   ├── Voice Profile (extracted from writing)
│   ├── Research Notes
│   ├── Global KB + Project-specific KB
│   ├── AI: Analyze voice from KB
│   ├── AI: Generate using KB only
│   ├── AI: Find connections between ideas
│   └── AI: Suggest what's missing
├── Source Material
│   ├── Import original content for transformation
│   ├── Reference images
│   ├── Mood boards
│   └── Research articles
├── Brain Dumps & Voice Captures
│   ├── Free-form text capture
│   ├── Voice-to-text recording
│   ├── AI: Extract ideas
│   ├── AI: Organize into outline
│   ├── AI: Convert to prose
│   └── AI: Extract encyclopedia updates
├── Collaboration / Feedback
│   ├── Export review copies (DOCX, PDF, .nsrev)
│   ├── Author questions for reviewers
│   ├── Import tracked changes from DOCX
│   ├── Import PDF annotations
│   ├── Feedback dashboard
│   ├── Consensus issue detection
│   ├── AI: Summarize all feedback
│   

*3/1/2026, 5:03:51 PM*

---

## User

keep going

## AI (claude-opus-4-6)

# **CONTINUING: COMPLETE FEATURE MAP**

```
│   ├── AI: Prioritize feedback by impact
│   ├── AI: Generate revision plan
│   └── AI: Address specific comments
└── Project Stats & Goals
    ├── Word count tracking (daily/weekly/monthly)
    ├── Writing streak tracker
    ├── Session tracking (duration, output, AI usage)
    ├── Writing rhythm visualization
    ├── Progress toward project goals
    ├── AI cost tracking per project
    ├── Most productive time analysis
    └── End-of-session reports

🎨 THE PRESS (Layout & Publishing)
├── Page Layout Editor
│   ├── WYSIWYG live preview
│   ├── Dual-panel: controls + preview
│   ├── Spread view (two-page)
│   ├── Zoom and navigation
│   └── Direct manipulation (click to edit in preview)
├── Template System
│   ├── Book templates (trade, digest, mass market, children's)
│   ├── Document templates (letter, A4, newsletter, report)
│   ├── Creative templates (zine, chapbook, portfolio, lookbook)
│   ├── Academic templates (thesis, white paper, case study)
│   ├── Marketing templates (lead magnet, media kit, slides, flyer)
│   ├── Custom template builder
│   ├── Import / export templates (.nswt)
│   └── Community templates (NS Marketplace)
├── Typography Controls
│   ├── Professional font selection with pairing suggestions
│   ├── Point-precise leading, tracking, kerning
│   ├── Paragraph styles (indent, spacing, alignment, hyphenation)
│   ├── Character styles (small caps, ligatures, OpenType features)
│   ├── Drop caps (configurable style, lines, font)
│   ├── Named styles (change once, update everywhere)
│   ├── Widow/orphan control
│   ├── AI: Suggest styles for project type
│   ├── AI: Extract styles from professional PDF
│   └── Built-in font library (10+ high-quality families)
├── Master Pages
│   ├── Default spread (verso/recto with headers/footers)
│   ├── Chapter opener (title placement, page start rules)
│   ├── Front matter (no headers/page numbers)
│   ├── Full page image
│   ├── Multi-column (newsletter, academic)
│   ├── Custom master page builder
│   └── AI: Generate masters for project type
├── Page Elements
│   ├── Text: body, heading, caption, pull quote, sidebar,
│   │   callout box, footnote, running header, page number
│   ├── Images: insert, from vault, from NS Studio,
│   │   AI generate, image frame, full bleed, inline
│   ├── Shapes: rectangle, circle, line, divider, arrow,
│   │   bracket, ornament, border frame, custom shape
│   ├── Tables: simple, styled, comparison, AI-generated
│   ├── Special: TOC (auto), index (auto), bibliography,
│   │   title page, half title, copyright, dedication,
│   │   epigraph, about author, chapter title, part divider,
│   │   blank page, QR code
│   └── AI-Powered: cover design, chapter headers,
│       ornamental dividers, layout improvement suggestions
├── Cover Designer
│   ├── Ebook cover (front only)
│   ├── Paperback cover (full wrap: front, spine, back)
│   ├── Hardcover cover
│   ├── Auto-calculated spine width from page count
│   ├── Layer-based editing
│   ├── AI: Generate cover concept from description
│   ├── Multiple variation generation
│   ├── Send to NS Studio for advanced editing
│   └── Platform-specific export (KDP, IngramSpark)
├── Export Engine
│   ├── Screen PDF (72 DPI, RGB, bookmarks)
│   ├── Print-Ready PDF (300 DPI, CMYK, bleed, crop marks,
│   │   PDF/X-1a or PDF/X-4, embedded fonts)
│   ├── Interactive PDF (clickable TOC, hyperlinks,
│   │   navigation buttons, form fields)
│   ├── EPUB 3.0 (reflowable, cover, navigation, metadata,
│   │   CSS styling, font embedding)
│   ├── MOBI / KPF (Kindle-optimized)
│   ├── DOCX (Word-compatible, track changes support,
│   │   manuscript submission format option)
│   ├── Markdown (CommonMark, GFM, YAML front matter)
│   ├── Plain text
│   ├── HTML (inline or external CSS, single or per-chapter)
│   ├── Audiobook script (clean text, pronunciation guides,
│   │   narrator direction notes, send to NS Studio)
│   ├── Batch export (multiple formats simultaneously)
│   └── Publishing presets:
│       ├── Amazon KDP Package (interior + cover + ebook)
│       ├── IngramSpark Package (interior + cover)
│       ├── Draft2Digital Package
│       ├── Smashwords Package
│       ├── Blog / Newsletter Package
│       └── Submission Package (manuscript + synopsis +
│           query letter + author bio)
└── PDF Rendering Engine
    ├── Layout engine (content → pages)
    ├── Text reflow with hyphenation (Knuth-Liang)
    ├── Widow/orphan control
    ├── Drop cap rendering
    ├── Image placement and cropping
    ├── Font management (built-in + user fonts)
    ├── Color management (RGB ↔ CMYK)
    ├── Crop marks and bleed marks
    └── Bookmark and outline generation

🔗 ECOSYSTEM INTEGRATION
├── Send-To Protocol
│   ├── → NS Chat (discuss, brainstorm)
│   ├── → NS Studio (images, audio, video)
│   ├── → NS Research (fact-check, research)
│   ├── → NS Prompt Lab (optimize prompts)
│   ├── → NS Code (custom tools)
│   ├── → Orchestrator (automate workflows)
│   └── → NS Vault (save assets)
├── Receive-From Protocol
│   ├── ← NS Chat (ideas, prose, solutions)
│   ├── ← NS Studio (images, audio, covers)
│   ├── ← NS Research (findings, citations)
│   ├── ← NS Prompt Lab (optimized prompts)
│   └── ← NS Vault (any asset)
├── Context Management
│   ├── Drag-and-drop encyclopedia to AI context
│   ├── Auto-suggested context per chapter
│   ├── Token count visualization
│   ├── 100% visibility into what AI receives
│   └── Context carries across Send-To operations
└── Transformation Pipelines
    ├── Short Story → Novel
    ├── Blog Post → Lead Magnet PDF
    ├── Content → Course Material
    ├── Blog Post → Twitter Thread
    ├── Blog Post → Newsletter
    ├── Research → White Paper
    ├── Transcript → Article
    ├── Outline → Full Article
    ├── Article → Executive Summary
    ├── Articles → Compilation Book
    ├── Podcast → Show Notes + Blog
    ├── YouTube Script → Blog Post
    ├── Brain Dump → Organized Document
    ├── KB → Content Calendar
    ├── Chapter → Audiobook Script
    ├── Technical Doc → User Guide
    ├── Long-Form → Social Carousel
    └── Custom Pipeline Builder

⚙️ SYSTEM
├── SQLite database (shared novasyn.db)
├── Cloud sync (database + smart asset sync)
├── Session locking (single-user write access)
├── Auto-save (continuous)
├── Database migrations (versioned schema)
├── Auto-update via NS Core
├── License management
├── Anonymous analytics (opt-in)
├── Keyboard shortcuts (fully customizable)
├── Extension / plugin system
├── Ambient sounds (distraction-free mode)
└── Portable mode (USB drive)
```

---

## COMPETITIVE POSITIONING

```
┌─────────────────────────────────────────────────────────────────┐
│ HOW NOVASYN WRITER COMPARES                                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Feature          Writer  Scrivener  Atticus  Jasper  Docs     │
│  ──────────────── ─────── ───────── ──────── ─────── ──────   │
│  AI Generation    ✅ Multi  ❌        ❌       ✅ One   ✅ One  │
│  Multi-Model      ✅        ❌        ❌       ❌       ❌      │
│  Encyclopedia     ✅ Built  ⚠️ Manual ❌       ❌       ❌      │
│  Continuity       ✅ Auto   ❌        ❌       ❌       ❌      │
│  Discovery Mode   ✅        ❌        ❌       ❌       ❌      │
│  Page Layout      ✅ Pro    ⚠️ Basic  ✅ Good  ❌       ❌      │
│  PDF Export       ✅ Print  ⚠️ Basic  ✅ Print ❌       ⚠️     │
│  EPUB Export      ✅        ✅        ✅       ❌       ❌      │
│  Book Cover       ✅ AI     ❌        ✅       ❌       ❌      │
│  Print-Ready      ✅        ❌        ✅       ❌       ❌      │
│  Knowledge Base   ✅        ❌        ❌       ❌       ❌      │
│  Voice Training   ✅        ❌        ❌       ⚠️       ❌      │
│  Pipelines        ✅        ❌        ❌       ⚠️       ❌      │
│  Orchestrator     ✅        ❌        ❌       ❌       ❌      │
│  Ecosystem        ✅ Full   ❌        ❌       ❌       ❌      │
│  Local/Desktop    ✅        ✅        ✅ Web   ✅ Web   ✅ Web  │
│  Data Ownership   ✅        ✅        ⚠️       ❌       ❌      │
│  BYOK (API keys)  ✅        N/A      N/A     ❌       N/A     │
│  Offline          ✅        ✅        ❌       ❌       ❌      │
│  Cost/month       $10*     $0**     $15      $49     $0       │
│                                                                 │
│  * $10 = NovaSyn Community membership (all apps included)       │
│  ** Scrivener is $49 one-time, no AI                            │
│                                                                 │
│  THE GAPS NOVASYN WRITER FILLS:                                 │
│                                                                 │
│  Scrivener users want: AI writing assistance, better            │
│    formatting/export, and a modern interface                    │
│                                                                 │
│  Atticus users want: AI writing tools, encyclopedia system,     │
│    multi-model flexibility, and desktop performance             │
│                                                                 │
│  Jasper users want: actual book-length capability,              │
│    layout/publishing tools, and data ownership                  │
│                                                                 │
│  Google Docs users want: everything above                       │
│                                                                 │
│  NOBODY currently offers:                                       │
│  ├── Multi-model AI + encyclopedia system + layout in one app  │
│  ├── Discovery writing mode with AI                             │
│  ├── Continuity tracking that works with AI generation          │
│  ├── Transformation pipelines (short story → novel)             │
│  ├── Full ecosystem of interoperable AI tools                   │
│  └── All of this running locally on a $300 desktop              │
│                                                                 │
│  THAT'S YOUR LANE. Nobody is in it.                             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## BUILD PRIORITY

What to build first, second, and third:

```
PHASE 1: THE CORE (Ship this first)
══════════════════════════════════════
├── Rich text editor (markdown-based)
├── Chapter / section management
├── Basic AI tools (continue, expand, rewrite, brainstorm)
├── Multi-model switching
├── Encyclopedia entries (character, setting, rules)
├── Chapter outline with beats
├── Context management (drag encyclopedia to AI context)
├── Basic export (Markdown, DOCX, plain text)
├── Distraction-free mode
├── NS Core integration (API keys, Send-To)
├── SQLite database (core tables)
└── Auto-save

WHY THIS FIRST:
This is a usable writing tool on day one.
Writers can create projects, build encyclopedias,
generate chapters, and export their work.
Everything else is enhancement.

TIME ESTIMATE: 4-6 weeks


PHASE 2: THE INTELLIGENCE (Ship this second)
══════════════════════════════════════════════
├── Discovery Writing Mode
├── Continuity tracker (plants, threads, knowledge states)
├── Knowledge Base integration
├── Voice profile extraction
├── Dialogue polish tool
├── Show Don't Tell tool
├── Consistency check (encyclopedia vs manuscript)
├── Pacing analysis
├── Character voice audit
├── Version history with diff
├── AI operation log
├── Session tracking and goals
├── Brain dump mode + voice capture
├── Side-by-side model comparison
├── Model preference learning
└── Transformation pipelines (basic: expand, compress, convert)

WHY THIS SECOND:
This is what makes NovaSyn Writer genuinely different.
The encyclopedia + AI + continuity tracking combination
doesn't exist anywhere else. This is the moat.

TIME ESTIMATE: 4-6 weeks


PHASE 3: THE PRESS (Ship this third)
═════════════════════════════════════
├── Template system (5-10 built-in templates)
├── Typography controls (fonts, sizes, styles)
├── Master pages (default, chapter opener, front matter)
├── Live WYSIWYG preview
├── PDF export (screen quality)
├── EPUB export
├── Cover designer (basic)
├── Publishing presets (KDP, IngramSpark)
├── Named paragraph/character styles
├── Drop caps
├── Scene break formatting
├── Headers and footers
├── Page numbers
└── Front/back matter pages

WHY THIS THIRD:
Layout is important but writers can use external tools
temporarily. The AI writing intelligence is the higher
priority differentiator. But once layout ships, Writer
becomes a complete end-to-end solution.

TIME ESTIMATE: 6-8 weeks


PHASE 4: THE POLISH (Ongoing)
═════════════════════════════
├── Print-ready PDF (CMYK, bleeds, crop marks)
├── Advanced cover designer (full wrap, AI generation)
├── Collaboration features (review copies, feedback import)
├── Interactive PDF (forms, clickable TOC)
├── Advanced pipelines (Short Story → Novel, etc.)
├── Screenplay / Poetry / Article modes
├── Audiobook script export + NS Studio integration
├── Extension / plugin system
├── Ambient sounds
├── Content scoring (articles)
├── Community templates (Marketplace integration)
├── Custom pipeline builder
└── Orchestrator integration for automated workflows

TIME ESTIMATE: Ongoing, feature-by-feature


TOTAL TO FIRST USABLE RELEASE: ~4-6 weeks
TOTAL TO FULL VISION: ~6 months
```

---

## FINAL THOUGHT

NovaSyn Writer is the most ambitious single app in the suite, but also potentially the most valuable. Here's why:

```
Writers are:
├── Willing

*3/1/2026, 5:05:22 PM*

---

## User

keep going

## AI (claude-opus-4-6)

# **CONTINUING: FINAL THOUGHT**

```
Writers are:
├── Willing to pay for tools that genuinely help
├── Passionate about their craft (emotional investment)
├── Vocal about tools they love (word of mouth)
├── Active in communities (natural Skool fit)
├── Repeat users (they write every day)
├── Content creators who SHOW their work (free marketing)
├── Underserved by current AI tools (generic chat ≠ writing tool)
└── Hungry for something that "gets" the writing process

What writers have now:
├── Scrivener: Great organization, zero AI, dated UI, 
│   terrible export
├── Atticus: Great formatting, zero AI, web-only, 
│   limited organization
├── Google Docs: Familiar, zero organization, zero AI 
│   writing tools, terrible formatting
├── Jasper/Copy.ai: AI but locked to one model, no 
│   organization, no formatting, no book-length support,
│   no encyclopedia, no continuity tracking
├── ChatGPT/Claude: Raw AI, no structure, no memory
│   across chapters, no layout, copy-paste workflow
└── Nothing: Most writers are still doing everything manually
    because nothing combines what they need

What NovaSyn Writer gives them:
├── Write with AI that knows your characters, world, and rules
├── Never lose track of what a character knows or doesn't know
├── Switch between discovery and structured writing seamlessly
├── Generate from outlines using proven methodology
├── Track every thread, every plant, every payoff
├── Format and publish without leaving the app
├── Export print-ready PDFs, EPUBs, and audiobook scripts
├── Own every word on their own machine
├── Pay a fraction of what other tools charge
└── Access an entire ecosystem of interoperable AI tools

The pitch to writers:

  "NovaSyn Writer is the first writing tool that 
   combines AI generation, story bible management, 
   continuity tracking, and professional publishing 
   in a single desktop app.
   
   It knows your characters. It remembers your rules.
   It catches your contradictions. It formats your book.
   And it runs on your machine for $10/month.
   
   Stop copy-pasting between ChatGPT and Google Docs.
   Start writing the way you were meant to."
```

---

## THE MARKETING CONTENT THAT WRITES ITSELF

Every feature becomes a piece of marketing:

```
YOUTUBE VIDEOS THAT SELL WRITER:
├── "I wrote a 25,000 word novel in 50 minutes — here's how"
│   (Encyclopedia Prompt System demonstration)
│
├── "Why I quit Scrivener for NovaSyn Writer"
│   (Organization + AI + export comparison)
│
├── "My AI knows my characters better than I do"
│   (Encyclopedia + consistency checking demo)
│
├── "Discovery writing with AI — watching the story surprise me"
│   (Discovery mode walkthrough, very compelling to watch)
│
├── "I turned 10 YouTube Shorts into a published novel"
│   (The Journal case study, transformation pipeline)
│
├── "Side-by-side: which AI model writes the best fiction?"
│   (Multi-model comparison, writers love this debate)
│
├── "From first draft to published book without leaving the app"
│   (Full workflow: write → format → cover → export → KDP)
│
├── "The $0.50 novel edit — AI consistency checking"
│   (Continuity tracker catching contradictions)
│
├── "My AI caught a plot hole I missed for 6 chapters"
│   (Continuity tracker real example)
│
└── "The writing app that runs on a $300 desktop"
    (Performance comparison vs web-based tools)

SKOOL COMMUNITY CONTENT:
├── Weekly writing prompts using Writer's tools
├── Community novel project (everyone builds encyclopedias)
├── "Show your setup" — how members configure their workspace
├── Pipeline sharing — members share custom pipelines
├── Template sharing — members share custom templates
├── Encyclopedia template sharing — genre-specific templates
├── Writing sprint events using distraction-free mode
├── Beta reader exchanges using collaboration features
└── Monthly "ship it" challenge — publish something using Writer

TWITTER/X CONTENT:
├── Screen recordings of AI continuing your writing
├── Before/after of Show Don't Tell tool
├── Discovery mode surprises (short clips)
├── "This paragraph was AI-generated. Can you tell which one?"
├── Continuity tracker catching errors (satisfying)
├── Side-by-side model comparisons for fiction
├── Cover generation time-lapses
└── Export pipeline: manuscript → formatted book in seconds
```

---

## THE WRITER-SPECIFIC DATABASE MIGRATION

When Writer is installed alongside existing NovaSyn apps, it adds its tables:

```javascript
// Migration that runs when Writer is first installed

const WRITER_MIGRATION = {
  minVersion: 10,  // Writer needs schema version 10+
  
  description: 'Add NovaSyn Writer tables',
  
  up: async (db) => {
    await db.exec(`
      -- All the writer_ tables from the schema above
      CREATE TABLE IF NOT EXISTS writer_projects (...);
      CREATE TABLE IF NOT EXISTS writer_chapters (...);
      CREATE TABLE IF NOT EXISTS writer_encyclopedia (...);
      CREATE TABLE IF NOT EXISTS writer_continuity_plants (...);
      CREATE TABLE IF NOT EXISTS writer_continuity_threads (...);
      CREATE TABLE IF NOT EXISTS writer_continuity_knowledge (...);
      CREATE TABLE IF NOT EXISTS writer_kb (...);
      CREATE TABLE IF NOT EXISTS writer_versions (...);
      CREATE TABLE IF NOT EXISTS writer_ai_operations (...);
      CREATE TABLE IF NOT EXISTS writer_sessions (...);
      CREATE TABLE IF NOT EXISTS writer_goals (...);
      CREATE TABLE IF NOT EXISTS writer_templates (...);
      CREATE TABLE IF NOT EXISTS writer_layout_elements (...);
      CREATE TABLE IF NOT EXISTS writer_feedback (...);
      CREATE TABLE IF NOT EXISTS writer_review_questions (...);
      CREATE TABLE IF NOT EXISTS writer_pipelines (...);
      CREATE TABLE IF NOT EXISTS writer_pipeline_runs (...);
      CREATE TABLE IF NOT EXISTS writer_brain_dumps (...);
      CREATE TABLE IF NOT EXISTS writer_discovery_sessions (...);
      
      -- All indexes
      CREATE INDEX IF NOT EXISTS idx_writer_chapters_project ...;
      -- (all indexes from schema above)
      
      -- Full text search
      CREATE VIRTUAL TABLE IF NOT EXISTS writer_chapters_fts ...;
      CREATE VIRTUAL TABLE IF NOT EXISTS writer_encyclopedia_fts ...;
      CREATE VIRTUAL TABLE IF NOT EXISTS writer_kb_fts ...;
      CREATE VIRTUAL TABLE IF NOT EXISTS writer_brain_dumps_fts ...;
      
      -- Insert built-in templates
      INSERT INTO writer_templates (id, name, category, ...) VALUES
        ('tpl_novel_6x9', 'Novel (6×9 Trade Paperback)', 'book', ...),
        ('tpl_novel_55x85', 'Novel (5.5×8.5 Digest)', 'book', ...),
        ('tpl_novel_mass', 'Novel (Mass Market)', 'book', ...),
        ('tpl_doc_letter', 'Standard Document (Letter)', 'document', ...),
        ('tpl_doc_a4', 'Standard Document (A4)', 'document', ...),
        ('tpl_newsletter', 'Newsletter (2-Column)', 'document', ...),
        ('tpl_report', 'Business Report', 'document', ...),
        ('tpl_lead_magnet', 'Lead Magnet PDF', 'marketing', ...),
        ('tpl_chapbook', 'Chapbook / Poetry', 'creative', ...),
        ('tpl_workbook', 'Workbook / Course', 'academic', ...);
      
      -- Insert built-in pipelines
      INSERT INTO writer_pipelines (id, name, description, steps, ...) VALUES
        ('pipe_story_to_novel', 'Short Story → Novel', 
         'Transform a short story into a full novel using the Encyclopedia Prompt System',
         '${JSON.stringify(STORY_TO_NOVEL_PIPELINE)}', ...),
        ('pipe_blog_to_lead', 'Blog Post → Lead Magnet',
         'Transform a blog post into a designed PDF lead magnet',
         '${JSON.stringify(BLOG_TO_LEAD_PIPELINE)}', ...),
        ('pipe_content_to_course', 'Content → Course Material',
         'Transform content into structured course/workbook',
         '${JSON.stringify(CONTENT_TO_COURSE_PIPELINE)}', ...);
    `)
  }
}
```

---

## ONE MORE THING: THE WRITER'S COMPANION AI

A special AI persona that lives inside Writer, trained on writing craft:

```
┌─────────────────────────────────────────────────────────────────┐
│ 🪶 THE MUSE — Writer's Companion AI                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  The Muse is a system prompt layer that wraps any AI model      │
│  you're using in Writer. It adds writing-specific knowledge     │
│  and behavior on top of whatever model you choose.              │
│                                                                 │
│  What The Muse knows:                                           │
│  ├── Story structure (3-act, hero's journey, Save the Cat)     │
│  ├── Scene craft (beats, tension, pacing)                       │
│  ├── Character development (arcs, motivation, voice)            │
│  ├── Dialogue technique (subtext, beats, naturalism)            │
│  ├── Prose craft (show don't tell, sensory detail, rhythm)     │
│  ├── Genre conventions (romance beats, mystery clues, etc.)    │
│  ├── Publishing standards (formatting, industry norms)          │
│  └── YOUR voice, style, and preferences (from your KB)         │
│                                                                 │
│  How The Muse behaves:                                          │
│  ├── Never generates purple prose or clichés                    │
│  ├── Respects your established voice profile                    │
│  ├── Always checks encyclopedia before generating               │
│  ├── Flags when something contradicts continuity                │
│  ├── Suggests rather than overwrites                            │
│  ├── Explains WHY a suggestion works (teaches craft)           │
│  ├── Asks clarifying questions before major generation          │
│  └── Adapts to your genre and project type                     │
│                                                                 │
│  The Muse system prompt is:                                     │
│  ├── Automatically prepended to every AI call from Writer       │
│  ├── Combined with your KB voice profile                        │
│  ├── Combined with relevant encyclopedia entries                │
│  ├── Customizable per project                                   │
│  └── Transparent — you can see and edit it anytime              │
│                                                                 │
│  This means even when you use GPT-4o or Gemini or any model,   │
│  it BEHAVES like a writing-savvy assistant because The Muse     │
│  system prompt shapes its behavior.                             │
│                                                                 │
│  Example system prompt (auto-generated for The Journal):        │
│                                                                 │
│  "You are The Muse, an AI writing assistant embedded in         │
│   NovaSyn Writer. You are helping write a paranormal romance    │
│   novel called 'The Journal.'                                   │
│                                                                 │
│   VOICE: Literary but accessible, melancholic not maudlin.      │
│   Mix of long flowing sentences and short sharp ones.           │
│   Heavy on sensory detail, personification of place.            │
│   Avoids: clichés, purple prose, over-explaining emotion.       │
│                                                                 │
│   POV: First person, past tense.                                │
│   TONE: Atmospheric, romantic, liminal.                         │
│                                                                 │
│   RULES:                                                        │
│   - Never contradict the encyclopedia entries provided          │
│   - Follow the beat sequence when generating from outline       │
│   - Respect MUST INCLUDE and MUST NOT INCLUDE flags             │
│   - Match the established character voices                      │
│   - When suggesting, explain why it works narratively           │
│   - If asked to continue, write to the end of the current      │
│     beat, not beyond                                            │
│   - Flag any potential continuity issues you notice             │
│                                                                 │
│   Current context will include relevant encyclopedia            │
│   entries and the chapter outline. Use them."                   │
│                                                                 │
│  [View Full System Prompt] [Edit] [Reset to Default]            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## TRULY FINAL THOUGHT

```
NovaSyn Writer isn't just another writing app with AI bolted on.

It's the first tool built from the ground up around 
the idea that AI and human creativity are COLLABORATIVE.

The Encyclopedia Prompt System isn't a hack — it's a 
methodology. And Writer is the app that makes that 
methodology effortless.

The Discovery Writing Mode isn't a gimmick — it's how 
many of the best writers actually work. And Writer is 
the first tool that lets AI participate in that process 
without taking it over.

The Press isn't an afterthought — it's the final mile 
that turns writing into publishing. And Writer is the 
first tool that connects AI generation to professional 
layout without ever leaving the app.

And behind all of it: your Knowledge Base, your voice, 
your encyclopedia, your rules — making sure the AI 
doesn't just generate words, but generates YOUR words.

This is amplified authorship.

Build it. Ship it to your Skool community.
Watch writers fall in love with it.

🪶⚡🎸
```

*3/1/2026, 5:06:42 PM*

---
