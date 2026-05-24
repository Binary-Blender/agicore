# Agicore MCP Server

**Agicore as a tool/resource set for any [Model Context Protocol](https://modelcontextprotocol.io/)-aware AI assistant.**

Compile `.agi` files, validate sources, look up project archetypes (ERP replacement, hospital CDS, bank middle office, insurance claims, tax authority, power grid), and read the canonical Agicore docs — all from within an assistant's session, with zero shell-out.

Install once, configure your assistant once, and from that point forward every Claude Desktop / Cursor / [any MCP host] conversation has first-class access to the framework.

---

## What it exposes

### Tools

| Tool | What it does |
|---|---|
| `compile_agicore_source` | Compile a `.agi` source string. Returns file count + paths + diagnostics. Optional `include_file` returns one specific generated file. |
| `validate_agicore_source` | Run static validation without the full compile. Returns errors + warnings. |
| `list_archetypes` | List the 6 large-scale project archetypes the Andon Loop architecture supports. Each has a market-leader comparison. |
| `get_archetype` | Get the full record for one archetype: description, domain terms, tier breakdown with named approval-authority roles, justification. |
| `list_dsl_declarations` | List every Agicore DSL declaration (59+ across 11 layers). |
| `get_declaration_help` | Get the short description for one declaration by name. |

### Resources

URI-addressable documents the assistant can fetch on demand:

| URI | Document |
|---|---|
| `agicore://readme` | Main project README |
| `agicore://andon-loop` | Full Andon Loop architecture document (`ANDON_LOOP.md`) |
| `agicore://example/hoc-source` | The HOC `.agi` source — 436-line reference for what an Andon Loop application looks like |
| `agicore://example/hoc-readme` | HOC project documentation |
| `agicore://example/hoc-ha-integration` | HOC's Home Assistant MQTT integration playbook |
| `agicore://philosophy` | Architectural philosophy doc |
| `agicore://build-with-ai` | Builder's guide |
| `agicore://coding-standards` | Naming conventions and anti-patterns |

---

## Install

Clone the agicore repo (the MCP server is part of the monorepo):

```bash
git clone https://github.com/Binary-Blender/agicore.git
cd agicore/mcp
npm install
npm run build
```

The compiled server is at `dist/index.js` and is executable as `node dist/index.js`.

> The MCP server depends on the in-process `@agicore/compiler` and `@agicore/parser` packages from the same repo. Don't move the `mcp/` directory out of the monorepo unless you also set `AGICORE_REPO_PATH` to a clone (so the resource URIs can still read the canonical docs).

---

## Configure your assistant

### Claude Desktop

Edit `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows). Add the server entry:

```json
{
  "mcpServers": {
    "agicore": {
      "command": "node",
      "args": ["/absolute/path/to/agicore/mcp/dist/index.js"]
    }
  }
}
```

Restart Claude Desktop. The Agicore tools and resources should appear in the tool list (look for the slider icon in the chat input).

### Cursor

Edit `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "agicore": {
      "command": "node",
      "args": ["/absolute/path/to/agicore/mcp/dist/index.js"]
    }
  }
}
```

Restart Cursor.

### Any other MCP-aware host

The server speaks stdio MCP. Spawn it as a subprocess of the host, with whatever command/args the host expects. The binary is `node /absolute/path/to/agicore/mcp/dist/index.js`.

---

## Try it

Once configured, in a fresh conversation with your assistant, try:

> *"What can the agicore tools do?"*

The assistant should list the six tools and offer to demonstrate.

> *"Use list_archetypes to show me what Agicore can build."*

The assistant fetches the 6 archetypes and walks through which one matches your situation.

> *"Read agicore://andon-loop and explain the inversion vs standard continual-harness implementations."*

The assistant reads the doc and summarises. (This is where the MCP server stops being a curiosity and starts being the "every assistant just understands Agicore" multiplier.)

> *"Draft a `.agi` for [your domain], compile it with compile_agicore_source, fix any diagnostics, and show me the migration SQL."*

Iterate fully inside the assistant. The MCP server returns parse/validation errors directly so the assistant can self-correct without copy-pasting into a shell.

---

## Environment

| Variable | Purpose | Default |
|---|---|---|
| `AGICORE_REPO_PATH` | Override the repo root used for resource lookups (`agicore://readme`, etc.) | Auto-detected from the package location (`mcp/dist/../../README.md`) |

---

## Run the smoke test

```bash
cd mcp
npm test
```

Spawns the server as a subprocess, connects via the official MCP SDK client, exercises every tool + resource, asserts shapes + content. Should print `40 passed, 0 failed`.

---

## Architecture

The MCP server is intentionally thin. Total Rust + TypeScript LOC under `mcp/src/`: ~600. It does four things:

1. **Imports the in-process compiler.** `@agicore/compiler` is a workspace dep; compile + validate calls don't shell out. ~5ms per call for non-trivial sources.
2. **Wraps the archetype catalog as structured data.** The 6 archetypes from the README are mirrored in `src/archetypes.ts` so the assistant can query individual records (full description + tier breakdown + domain terms) rather than parsing the README every time.
3. **Wraps the DSL catalog.** All 59+ declarations across 11 layers, with one-line descriptions, in `src/dsl-catalog.ts`. Lets the assistant enumerate primitives before drafting.
4. **Exposes canonical docs as MCP resources.** README, ANDON_LOOP, HOC source + readme + HA integration, philosophy, builder's guide, coding standards — all readable by URI.

Future versions will add prompt templates (`propose_andon_loop_for_domain`, `audit_my_mutation_policy`, `convert_my_existing_app`) and possibly a `generate_starter_skeleton` tool that emits a tailored `.agi` template per archetype.

---

## License

MIT (matches the parent Agicore repo).
