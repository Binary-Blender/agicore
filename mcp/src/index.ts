#!/usr/bin/env node
// Agicore MCP Server
//
// Exposes Agicore as a tool/resource set for any MCP-aware AI assistant.
// Compile + validate .agi sources, look up project archetypes, read the
// canonical docs — all from within the assistant's session, no shell-out.
//
// Designed to be run as a stdio subprocess by Claude Desktop, Cursor, or
// any other MCP host. See README.md for configuration.

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { TOOL_DEFINITIONS, dispatchTool } from './tools.js';
import { RESOURCES, readResource } from './resources.js';

const SERVER_NAME = 'agicore';
const SERVER_VERSION = '0.1.0';

async function main(): Promise<void> {
  const server = new Server(
    { name: SERVER_NAME, version: SERVER_VERSION },
    { capabilities: { tools: {}, resources: {} } },
  );

  // ── Tools ────────────────────────────────────────────────────────────────

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: TOOL_DEFINITIONS,
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    const result = await dispatchTool(name, (args ?? {}) as Record<string, unknown>);
    return result as unknown as { content: { type: 'text'; text: string }[]; isError?: boolean };
  });

  // ── Resources ────────────────────────────────────────────────────────────

  server.setRequestHandler(ListResourcesRequestSchema, async () => ({
    resources: RESOURCES.map((r) => ({
      uri:         r.uri,
      name:        r.name,
      description: r.description,
      mimeType:    r.mimeType,
    })),
  }));

  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const { uri } = request.params;
    const result = readResource(uri);
    if (!result) {
      throw new Error(`Unknown resource: ${uri}`);
    }
    return {
      contents: [{ uri, mimeType: result.mimeType, text: result.text }],
    };
  });

  // ── Transport ────────────────────────────────────────────────────────────

  const transport = new StdioServerTransport();
  await server.connect(transport);
  // The server stays alive on stdio until the host closes it. No log to
  // stdout: that's reserved for protocol messages; diagnostics go to stderr.
  process.stderr.write(`[${SERVER_NAME}] MCP server v${SERVER_VERSION} ready on stdio\n`);
}

main().catch((err) => {
  process.stderr.write(`[${SERVER_NAME}] fatal: ${err instanceof Error ? err.stack : String(err)}\n`);
  process.exit(1);
});
