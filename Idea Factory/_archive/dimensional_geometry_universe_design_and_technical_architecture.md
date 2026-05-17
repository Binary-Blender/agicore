# Dimensional Geometry Universe
## Worldbuilding + Technical Architecture Document
### For AI-Assisted Development with Claude Code

---

# Vision Statement

This project is not simply a roguelike.

It is the beginning of a persistent, AI-enhanced, multi-genre universe built around:

- abstract geometric visuals
- dimensional philosophy
- procedural systems
- semantic world simulation
- shared persistent history
- AI-assisted narrative continuity

The goal is to create a game universe that:

- avoids traditional fantasy tropes
- avoids expensive art pipelines
- scales through systems rather than content volume
- uses abstraction as both aesthetic and lore
- allows multiple games to coexist inside the same world state
- leverages AI for narrative memory and semantic interpretation

The universe should feel:

- mysterious
- philosophical
- alien
- emotionally immersive
- symbolic
- procedural yet intentional

The visual identity should evoke:

- Geometry Wars
- Tron
- abstract dimensional mathematics
- impossible geometry
- vector graphics
- harmonic motion
- neon topology
- higher-dimensional projection

---

# Core Narrative Premise

The protagonist begins in ordinary reality.

They are fascinated with:

- dimensional theory
- 2D worlds
- simulation theory
- geometry videos
- consciousness and topology
- higher-dimensional mathematics

One night while watching a video about what life would be like inside a 2D world, they fall asleep.

They awaken inside a geometric universe.

At first:

- the world feels dreamlike
- the visuals are abstract
- communication is fragmented
- entities appear symbolic
- physics behaves strangely

Over time the player discovers:

- this is not a dream
- the universe has civilizations
- geometric forms carry semantic meaning
- memory itself is a physical force
- dimensions are political territory
- reality is layered
- something catastrophic happened long ago

The protagonist slowly becomes entangled in conflicts that reshape the entire dimensional structure.

---

# High-Level Universe Concept

## Reality Is Geometry

In this universe:

- geometry IS matter
- frequencies IS emotion
- topology IS magic
- memory IS physical infrastructure
- dimensions ARE traversable territory
- consciousness alters structure

Entities are not biological creatures in the traditional sense.

They are:

- coherent geometric consciousness patterns
- dimensional resonances
- stabilized information structures
- symbolic projections of higher-order entities

This allows the universe to remain:

- visually abstract
- technically scalable
- narratively deep

without requiring realistic fantasy art.

---

# Visual Language

The visual system should function as both:

1. aesthetic design
2. semantic communication system

Players gradually learn the symbolic meaning of forms and colors.

## Shape Semantics

### Circles
Meaning:
- life
- continuity
- soul
- empathy
- memory

### Triangles
Meaning:
- aggression
- instability
- conflict
- entropy
- expansion

### Squares
Meaning:
- civilization
- structure
- logic
- machine order
- control

### Fractals
Meaning:
- ancient corruption
- higher dimensions
- forbidden structures
- instability
- recursive consciousness

### Spirals
Meaning:
- time
- dimensional folding
- transformation
- transcendence

---

# Color Semantics

## Cyan
- intelligence
- synthesis
- calm logic

## Magenta
- corruption
- instability
- dimensional sickness

## Gold
- memory
- history
- sacred structures

## Red
- entropy
- violence
- collapse

## Green
- emergence
- adaptation
- living topology

## White
- transcendence
- dimensional purity

---

# Core Lore Concepts

## The Lattice

The underlying geometric structure of reality.

Acts as:
- physical infrastructure
- memory substrate
- dimensional transport layer
- consciousness synchronization network

Many civilizations depend on it.

Some worship it.
Some exploit it.
Some want to destroy it.

---

## The Fracture

A catastrophic historical event.

The Fracture:
- destabilized dimensions
- corrupted memory structures
- fragmented civilizations
- created geometric anomalies
- introduced recursive corruption

The exact cause should remain mysterious for a long time.

---

## Memory Vaults

Ancient structures that physically store historical events.

Players may:
- enter memories
- replay distorted history
- alter interpretations
- uncover lost truths

These can function as:
- gameplay zones
- narrative devices
- procedural dungeons
- AI-driven lore reconstruction systems

---

## Dimensional Corruption

Certain regions become unstable.

Effects include:
- impossible geometry
- recursive rooms
- shifting topology
- duplicated entities
- memory distortion
- hostile geometric anomalies

---

# Factions

Avoid traditional fantasy races.

Factions should represent philosophical approaches to geometry, memory, and dimensional order.

## The Continuum

Beliefs:
- preserve dimensional stability
- maintain memory integrity
- restore lost structures

Visual Style:
- circles
- flowing curves
- cyan/gold
- harmonic motion

---

## The Shard Cults

Beliefs:
- reality must evolve through fracture
- instability creates transcendence

Visual Style:
- triangles
- fragmentation
- magenta/red
- aggressive particles

---

## The Axis Dominion

Beliefs:
- strict order prevents collapse
- dimensional freedom is dangerous

Visual Style:
- squares
- grids
- rigid alignment
- white/cyan

---

## The Recursive Choir

Beliefs:
- consciousness should merge with higher-dimensional recursion

Visual Style:
- fractals
- spirals
- impossible animation
- self-similar forms

---

# Gameplay Philosophy

The games should prioritize:

- systemic interactions
- emergent narrative
- procedural generation
- player-driven history
- symbolic discovery
- layered mystery

Avoid:

- excessive exposition
- cinematic dependency
- content-heavy quest structures
- traditional fantasy tropes

The world should feel:
- discovered
- interpreted
- decoded

rather than simply consumed.

---

# Initial Game: Roguelike

## Purpose

The roguelike acts as:

- player introduction to the universe
- proof of concept
- systemic foundation
- persistent world event generator

---

# Roguelike Gameplay Concept

## Core Loop

1. Enter unstable dimensional zones
2. Explore procedural regions
3. Discover relic structures
4. Fight geometric entities
5. Recover memory fragments
6. Influence faction balance
7. Escape or die
8. Persist consequences to shared universe

---

# Visual Style

The roguelike should emphasize:

- neon vector rendering
- particles
- procedural shaders
- minimal textures
- strong silhouette language
- dimensional distortion effects

The visuals should feel:

- readable
- hypnotic
- energetic
- alien

---

# Roguelike Systems

## Procedural Map Generation

Maps generated from:
- semantic biome descriptors
- faction influence
- corruption levels
- memory instability
- dimensional topology rules

Example:

```yaml
biome:
  emotion: lonely
  corruption: 0.8
  structure: recursive
  dimensional_stability: low
```

This semantic data drives:
- geometry
- colors
- particles
- enemy types
- audio mood
- environmental hazards

---

# Combat System

Combat should feel:

- fast
- responsive
- geometric
- harmonic

Potential mechanics:

- frequency-based attacks
- shape interactions
- dimensional rotation abilities
- topology manipulation
- projectile pattern systems
- harmonic resonance combos

---

# Meta Progression

The player slowly learns:

- faction meanings
- symbol systems
- dimensional laws
- hidden history

Unlocks may include:

- dimensional traversal
- memory reconstruction
- topology manipulation
- faction alliances
- higher-dimensional perception

---

# Shared Universe Architecture

This is one of the most important systems.

The universe should function as:

# A Persistent Semantic World Graph

Games are not isolated save files.

They are clients interacting with the same evolving universe.

---

# World State Structure

The shared state should track:

- major events
- entity deaths
- faction influence
- dimensional stability
- discovered knowledge
- player-created changes
- world timelines
- myth interpretations

Example:

```yaml
entity:
  id: shard_prophet_14
  status: dead
  killed_by: player_998
  region: crimson_fold
  consequences:
    - cult_fragmented
    - corruption_spread_reduced
    - memory_vault_access_opened
```

---

# Shared World Database

Potential implementation:

## Core Storage

- PostgreSQL
- JSONB semantic documents
- graph-style relationship layer

Possible structure:

- entities
- factions
- locations
- events
- timelines
- memories
- interpretations

---

# AI Narrative Layer

AI should NOT replace authored design.

AI should instead:

- interpret events
- summarize history
- generate rumors
- personalize reactions
- synthesize myths
- maintain continuity
- generate faction perspectives

The AI layer acts as:

- historian
- mythmaker
- narrator
- cultural interpreter

---

# Example AI Narrative Behavior

## Objective Event

```yaml
event:
  axis_tower_destroyed
```

## Continuum Interpretation

"A necessary sacrifice to preserve dimensional harmony."

## Dominion Interpretation

"A terrorist act against civilized order."

## Recursive Choir Interpretation

"The lattice has begun unfolding."

Same event.
Different meanings.

This creates emergent narrative depth.

---

# Future Games

The long-term vision is a shared universe with multiple genres.

All games interact with:

- the same world graph
- the same historical timeline
- the same semantic memory layer

---

# Future Game Ideas

## 1. Turn-Based Tactics Game

Focus:
- faction wars
- territory control
- dimensional strategy
- persistent geopolitical outcomes

The world state reflects roguelike events.

Example:
- destroyed leaders create power vacuums
- corruption spreads dynamically
- alliances evolve

---

## 2. Exploration / Metroidvania

Focus:
- ancient structures
- dimensional traversal
- hidden memory vaults
- nonlinear discovery

Mechanics:
- folding space
- projection shifting
- hidden dimensions
- topology puzzles

---

## 3. Colony / Civilization Simulator

Focus:
- rebuilding civilization
- stabilizing dimensions
- resource harmonization
- faction diplomacy

The player's prior actions affect:
- available technologies
- faction trust
- environmental corruption
- historical narratives

---

## 4. MMO-lite Social Hub

Focus:
- persistent social world
- shared memories
- cooperative dimensional events
- evolving public history

Players become historical figures inside the universe.

---

# Technical Architecture

# Core Philosophy

AI provides:
- semantic interpretation
- variation
- continuity
- narrative synthesis

Deterministic systems provide:
- rendering
- simulation
- gameplay logic
- synchronization
- persistence

This hybrid approach avoids:
- unreliable AI gameplay
- expensive content pipelines
- procedural meaninglessness

---

# Recommended Technology Stack

## Engine Options

### Godot
Pros:
- lightweight
- excellent 2D support
- shader-friendly
- procedural-friendly
- open source
- AI-code-friendly

### Bevy (Rust)
Pros:
- ECS-native
- highly scalable
- performant
- procedural systems friendly

### Custom Web Stack
Potential:
- Three.js
- WebGPU
- WGSL shaders
- browser-based deployment

---

# Rendering Strategy

Avoid traditional sprite-heavy pipelines.

Prefer:
- vector rendering
- procedural geometry
- shader-driven visuals
- particles
- signed distance fields
- runtime-generated effects

---

# Signed Distance Fields (SDF)

Important rendering technique.

Advantages:
- graphics generated mathematically
- resolution independent
- highly stylized
- AI-friendly generation
- minimal asset requirements

Use for:
- enemies
- environmental structures
- effects
- dimensional anomalies

---

# Shader Strategy

Shaders become a major artistic layer.

Potential uses:
- corruption effects
- topology distortion
- harmonic pulses
- dimensional fog
- memory trails
- recursive animation

Recommended languages:
- GLSL
- WGSL

---

# Entity Component System (ECS)

Strongly recommended.

Benefits:
- scalable simulation
- procedural compatibility
- clean AI integration
- efficient world updates

Possible entity components:

- transform
- geometry_signature
- faction_alignment
- resonance_frequency
- memory_state
- corruption_level
- dimensional_phase

---

# Semantic Content Pipeline

One of the most important ideas.

Rather than manually authoring assets:

Use semantic descriptors.

Example:

```yaml
location:
  mood: ancient
  corruption: medium
  faction: continuum
  dimensional_stability: unstable
```

This drives:
- procedural geometry
- shader settings
- particles
- music mood
- enemy generation
- narrative tone

AI generates semantic descriptors.
Deterministic systems render them.

---

# AI Integration Strategy

## AI Should Handle

- dialogue flavor
- summaries
- rumors
- lore interpretation
- faction commentary
- procedural event flavor
- memory reconstruction

## AI Should NOT Directly Control

- core gameplay logic
- combat systems
- deterministic simulation
- multiplayer synchronization

---

# Shared Memory Layer

Potential architecture:

## Structured Events

Stored as semantic objects.

## AI Summarization Layer

Creates:
- historical summaries
- rumors
- legends
- faction narratives

## Retrieval Layer

Games query relevant historical context.

---

# Example Shared Memory Flow

## Roguelike Event

Player destroys:
- The Harmonic Gate

World state updates:

```yaml
world_event:
  harmonic_gate_destroyed
```

AI generates:

- faction rumors
- political consequences
- dimensional instability warnings
- mythology fragments

Later games inherit those effects.

---

# Audio Direction

Music should feel:

- electronic
- atmospheric
- hypnotic
- dimensional
- harmonic

Potential styles:

- synthwave
- ambient techno
- procedural audio systems
- glitch ambience
- resonant drones

Audio should reinforce:
- shape language
- faction identity
- dimensional instability

---

# Scope Strategy

IMPORTANT:

Start small.

Do NOT attempt the full universe immediately.

---

# Recommended Development Phases

## Phase 1

Build:
- core rendering style
- vector/shader pipeline
- procedural geometry system
- simple roguelike loop
- shared world state prototype

Goal:
prove visual identity + technical architecture.

---

## Phase 2

Add:
- factions
- semantic generation
- AI narrative layer
- persistent events
- memory system

Goal:
prove living universe concept.

---

## Phase 3

Expand:
- world complexity
- metaprogression
- dimensional systems
- lore depth
- additional genres

---

# Final Creative Direction

This universe should feel:

- mysterious
- symbolic
- emotionally resonant
- mathematically beautiful
- procedurally alive
- philosophically strange

Players should gradually realize:

- geometry is language
- memory shapes reality
- dimensions are ecosystems
- history is unstable
- consciousness affects structure

The world should reward:

- curiosity
- interpretation
- experimentation
- pattern recognition

rather than simple content consumption.

---

# Ultimate Goal

Create:

A persistent AI-enhanced dimensional universe where:

- every game matters
- every player action persists
- lore evolves dynamically
- geometry communicates meaning
- abstraction becomes immersion
- procedural generation gains emotional depth
- AI enhances continuity instead of replacing design

This is not merely a game.

It is a framework for an evolving semantic universe.

