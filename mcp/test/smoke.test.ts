// Smoke test for the Agicore MCP server. Spawns the server as a subprocess
// over stdio, connects via the SDK client, and exercises each tool +
// resource at least once. Verifies the protocol surface works end-to-end.

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);
const SERVER_BIN = resolve(__dirname, '..', 'dist', 'index.js');

let passed = 0;
let failed = 0;

function check(condition: unknown, message: string): void {
  if (condition) { passed++; console.log(`  OK  ${message}`); }
  else           { failed++; console.error(`  FAIL ${message}`); }
}

async function main(): Promise<void> {
  const transport = new StdioClientTransport({
    command: 'node',
    args:    [SERVER_BIN],
  });
  const client = new Client(
    { name: 'agicore-mcp-smoketest', version: '0.1.0' },
    { capabilities: {} },
  );
  await client.connect(transport);

  // ── Tools list ────────────────────────────────────────────────────────
  console.log('\n--- tools/list ---');
  const tools = await client.listTools();
  check(tools.tools.length >= 6, `tools/list returned >=6 tools (got ${tools.tools.length})`);
  const toolNames = new Set(tools.tools.map((t) => t.name));
  for (const n of [
    'compile_agicore_source',
    'validate_agicore_source',
    'list_archetypes',
    'get_archetype',
    'list_dsl_declarations',
    'get_declaration_help',
  ]) {
    check(toolNames.has(n), `tools/list includes ${n}`);
  }

  // ── Resources list ────────────────────────────────────────────────────
  console.log('\n--- resources/list ---');
  const resources = await client.listResources();
  check(resources.resources.length >= 4, `resources/list returned >=4 resources (got ${resources.resources.length})`);
  const resourceUris = new Set(resources.resources.map((r) => r.uri));
  for (const u of [
    'agicore://readme',
    'agicore://andon-loop',
    'agicore://example/hoc-source',
    'agicore://example/hoc-readme',
  ]) {
    check(resourceUris.has(u), `resources/list includes ${u}`);
  }

  // ── Read README resource ──────────────────────────────────────────────
  console.log('\n--- resources/read agicore://readme ---');
  const readme = await client.readResource({ uri: 'agicore://readme' });
  check(readme.contents.length === 1, 'README returned one content block');
  const readmeText = readme.contents[0]!.text as string;
  check(typeof readmeText === 'string' && readmeText.length > 1000, `README content is non-trivial (got ${readmeText?.length ?? 0} chars)`);
  check(readmeText.includes('Agicore'), 'README mentions Agicore');
  check(readmeText.includes('Andon Loop'), 'README mentions Andon Loop');

  // ── list_archetypes tool ──────────────────────────────────────────────
  console.log('\n--- tools/call list_archetypes ---');
  const archResp = await client.callTool({ name: 'list_archetypes', arguments: {} });
  check(Array.isArray(archResp.content), 'list_archetypes returned content array');
  const archText = (archResp.content as { text: string }[])[0]!.text;
  const archJson = JSON.parse(archText);
  check(Array.isArray(archJson.archetypes), 'archetypes array present');
  check(archJson.archetypes.length === 6, `6 archetypes (got ${archJson.archetypes.length})`);

  // ── get_archetype tool ────────────────────────────────────────────────
  console.log('\n--- tools/call get_archetype erp-replacement ---');
  const erpResp = await client.callTool({ name: 'get_archetype', arguments: { id: 'erp-replacement' } });
  const erpJson = JSON.parse((erpResp.content as { text: string }[])[0]!.text);
  check(erpJson.id === 'erp-replacement', 'erp-replacement id matches');
  check(erpJson.category_leader.includes('SAP'), 'erp-replacement category_leader mentions SAP');
  check(Array.isArray(erpJson.tier_breakdown), 'erp-replacement has tier_breakdown');

  // ── get_archetype with bad id ─────────────────────────────────────────
  const badResp = await client.callTool({ name: 'get_archetype', arguments: { id: 'no-such-thing' } });
  check(badResp.isError === true, 'unknown archetype id returns isError=true');

  // ── list_dsl_declarations ─────────────────────────────────────────────
  console.log('\n--- tools/call list_dsl_declarations ---');
  const dslResp = await client.callTool({ name: 'list_dsl_declarations', arguments: {} });
  const dslJson = JSON.parse((dslResp.content as { text: string }[])[0]!.text);
  check(Array.isArray(dslJson.layers), 'layers array present');
  check(dslJson.total_declarations >= 50, `>=50 declarations (got ${dslJson.total_declarations})`);

  // ── get_declaration_help ──────────────────────────────────────────────
  const helpResp = await client.callTool({ name: 'get_declaration_help', arguments: { name: 'MUTATION_POLICY' } });
  const helpJson = JSON.parse((helpResp.content as { text: string }[])[0]!.text);
  check(helpJson.name === 'MUTATION_POLICY', 'MUTATION_POLICY help fetched');
  check(helpJson.short.includes('Andon Loop'), 'MUTATION_POLICY description mentions Andon Loop');

  // ── compile_agicore_source happy path ─────────────────────────────────
  console.log('\n--- tools/call compile_agicore_source (HOC-like source) ---');
  const sampleSource = `
APP demo { TITLE "Demo" DB demo.db TELEMETRY auto }
ENTITY Thing { name: string  TIMESTAMPS }
ACTION foo { INPUT id: id OUTPUT result: string }
WORKFLOW w { STEP s { ACTION foo } }
MUTATION_POLICY mp {
  TARGETS [w]
  TIER 1 base { SCOPE [RULES_modify] AUTO_DEPLOY true REGRESSION_SUITE 24h_recent_workflows }
}
`;
  const compileResp = await client.callTool({ name: 'compile_agicore_source', arguments: { source: sampleSource } });
  const compileJson = JSON.parse((compileResp.content as { text: string }[])[0]!.text);
  check(compileJson.ok === true, 'compile succeeded');
  check(compileJson.files_emitted >= 30, `>=30 files emitted (got ${compileJson.files_emitted})`);
  check(Array.isArray(compileJson.file_paths), 'file_paths is array');
  const paths: string[] = compileJson.file_paths;
  check(paths.some((p) => p.endsWith('001_initial.sql')), 'migration SQL present');
  check(paths.some((p) => p.includes('mutations.rs')), 'Andon Loop generator fired (mutations.rs present)');
  check(paths.some((p) => p.includes('MutationConsole.tsx')), 'MutationConsole.tsx present');
  check(compileJson.summary.errors === 0, 'zero errors');

  // ── compile with include_file ─────────────────────────────────────────
  const compileResp2 = await client.callTool({
    name: 'compile_agicore_source',
    arguments: { source: sampleSource, include_file: 'src-tauri/migrations/001_initial.sql' },
  });
  const compileJson2 = JSON.parse((compileResp2.content as { text: string }[])[0]!.text);
  check(compileJson2.requested_file?.path === 'src-tauri/migrations/001_initial.sql', 'requested_file returned');
  check(
    typeof compileJson2.requested_file?.content === 'string' &&
      compileJson2.requested_file.content.includes('mutation_policies'),
    'requested_file content has mutation_policies table',
  );

  // ── compile with parse error ──────────────────────────────────────────
  const badCompileResp = await client.callTool({
    name: 'compile_agicore_source',
    arguments: { source: 'this is not agicore syntax at all !!!' },
  });
  const badCompileJson = JSON.parse((badCompileResp.content as { text: string }[])[0]!.text);
  check(badCompileJson.ok === false, 'invalid source reports ok=false');
  check(typeof badCompileJson.parse_error === 'string', 'parse_error present');

  // ── validate_agicore_source ───────────────────────────────────────────
  console.log('\n--- tools/call validate_agicore_source ---');
  const validResp = await client.callTool({ name: 'validate_agicore_source', arguments: { source: sampleSource } });
  const validJson = JSON.parse((validResp.content as { text: string }[])[0]!.text);
  check(validJson.ok === true, 'validate succeeded');
  check(Array.isArray(validJson.diagnostics), 'diagnostics array present');

  await client.close();

  console.log(`\n=== ${passed} passed, ${failed} failed ===`);
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});
