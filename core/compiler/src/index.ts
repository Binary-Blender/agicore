// Agicore Compiler - Orchestrates all code generators

import { parse } from '@agicore/parser';
import type { AgiFile } from '@agicore/parser';
import { generateSql } from './generators/sql.js';
import { generateRust } from './generators/rust.js';
import { generateTypeScript } from './generators/typescript.js';
import { generateComponents } from './generators/components.js';
import { generateTauriConfig, generateProjectFiles } from './generators/tauri-config.js';
import { generateExpertSystem } from './generators/expert-system.js';
import { generateOrchestration } from './generators/orchestration.js';
import { generateAiService } from './generators/ai-service.js';

export interface CompileResult {
  files: Map<string, string>;
  ast: AgiFile;
}

/**
 * Compile an Agicore DSL source string into a complete Tauri project.
 * Returns a map of relative file paths to file contents.
 */
export function compile(source: string): CompileResult {
  const ast = parse(source);
  const files = new Map<string, string>();

  // Collect all generated files
  const generators = [
    generateSql(ast),
    generateRust(ast),
    generateTypeScript(ast),
    generateComponents(ast),
    generateTauriConfig(ast),
    generateProjectFiles(ast),
    generateExpertSystem(ast),
    generateOrchestration(ast),
    generateAiService(ast),
  ];

  for (const gen of generators) {
    for (const [path, content] of gen) {
      files.set(path, content);
    }
  }

  return { files, ast };
}

export { parse } from '@agicore/parser';
export { generateSql } from './generators/sql.js';
export { generateRust } from './generators/rust.js';
export { generateTypeScript } from './generators/typescript.js';
export { generateComponents } from './generators/components.js';
export { generateTauriConfig, generateProjectFiles } from './generators/tauri-config.js';
export { generateExpertSystem } from './generators/expert-system.js';
export { generateOrchestration } from './generators/orchestration.js';
export { generateAiService } from './generators/ai-service.js';
