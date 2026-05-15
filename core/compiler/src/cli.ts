#!/usr/bin/env node

// Agicore CLI - Generate Tauri applications from .agi files

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { resolve, dirname, basename } from 'path';
import { compile } from './index.js';

const args = process.argv.slice(2);

function usage(): never {
  console.log(`
Agicore CLI - Deterministic systems from DSL

Usage:
  agicore generate <file.agi> [--output <dir>]
  agicore parse    <file.agi>

Commands:
  generate    Compile .agi file into a complete Tauri project
  parse       Parse .agi file and print the AST as JSON

Options:
  --output    Output directory (default: ./<app_name>)
`);
  process.exit(1);
}

function cmdGenerate(inputFile: string, outputDir?: string): void {
  const source = readFileSync(inputFile, 'utf-8');
  const { files, ast, diagnostics } = compile(source);

  // Print diagnostics
  const errors = diagnostics.filter((d) => d.severity === 'error');
  const warnings = diagnostics.filter((d) => d.severity === 'warning');
  for (const d of warnings) {
    const loc = d.span ? ` (${d.span.start.line}:${d.span.start.column})` : '';
    console.warn(`  warning: ${d.message}${loc}`);
  }
  for (const d of errors) {
    const loc = d.span ? ` (${d.span.start.line}:${d.span.start.column})` : '';
    console.error(`  error: ${d.message}${loc}`);
  }
  if (errors.length > 0) {
    console.error(`\nAgicore: ${errors.length} error(s) found. Generation aborted.`);
    process.exit(1);
  }

  const outDir = outputDir ?? resolve(process.cwd(), ast.app.name);

  let count = 0;
  let skipped = 0;
  for (const [relPath, content] of files) {
    const fullPath = resolve(outDir, relPath);
    if (existsSync(fullPath)) {
      const firstLine = readFileSync(fullPath, 'utf-8').split('\n')[0] ?? '';
      if (firstLine.includes('@agicore-protected')) {
        skipped++;
        continue;
      }
    }
    mkdirSync(dirname(fullPath), { recursive: true });
    writeFileSync(fullPath, content, 'utf-8');
    count++;
  }

  console.log(`Agicore: Generated ${count} files in ${outDir}`);
  if (skipped > 0) console.log(`  Skipped:    ${skipped} protected files (remove // @agicore-protected to force regen)`);
  console.log(`  App:        ${ast.app.title}`);
  console.log(`  Entities:   ${ast.entities.length}`);
  console.log(`  Actions:    ${ast.actions.length}`);
  console.log(`  Views:      ${ast.views.length}`);
  console.log(`  Rules:      ${ast.rules.length}`);
  console.log(`  Workflows:  ${ast.workflows.length}`);
  console.log(`  Tests:      ${ast.tests.length}`);
  console.log('');
  console.log('Next steps:');
  console.log(`  cd ${basename(outDir)}`);
  console.log('  npm install');
  console.log('  cargo tauri dev');
}

function cmdParse(inputFile: string): void {
  const source = readFileSync(inputFile, 'utf-8');
  const { ast } = compile(source);
  console.log(JSON.stringify(ast, null, 2));
}

// --- Main ---

const command = args[0];

if (!command) usage();

if (command === 'generate') {
  const inputFile = args[1];
  if (!inputFile) { console.error('Error: No input file specified'); usage(); }

  let outputDir: string | undefined;
  const outIdx = args.indexOf('--output');
  if (outIdx !== -1) outputDir = args[outIdx + 1];

  cmdGenerate(resolve(process.cwd(), inputFile), outputDir ? resolve(process.cwd(), outputDir) : undefined);

} else if (command === 'parse') {
  const inputFile = args[1];
  if (!inputFile) { console.error('Error: No input file specified'); usage(); }
  cmdParse(resolve(process.cwd(), inputFile));

} else {
  console.error(`Unknown command: ${command}`);
  usage();
}
