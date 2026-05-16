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
import { generateActions } from './generators/actions.js';
import { generateRouter } from './generators/router.js';
import { generateCompiler } from './generators/compiler.js';
import { generateVault } from './generators/vault.js';
import { generateSkills } from './generators/skills.js';
import { generateTests } from './generators/tests.js';
import { generateQc } from './generators/qc.js';
import { generateReasoner } from './generators/reasoner.js';
import { validate } from './validators/validate.js';
import type { ValidationResult } from './validators/validate.js';

export type { ValidationResult, Severity } from './validators/validate.js';

export interface CompileResult {
  files: Map<string, string>;
  ast: AgiFile;
  diagnostics: ValidationResult[];
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
    generateActions(ast),
    generateRouter(ast),
    generateCompiler(ast),
    generateVault(ast),
    generateSkills(ast),
    generateTests(ast),
    generateQc(ast),
    generateReasoner(ast),
  ];

  for (const gen of generators) {
    for (const [path, content] of gen) {
      files.set(path, content);
    }
  }

  const diagnostics = validate(ast);

  return { files, ast, diagnostics };
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
export { generateActions } from './generators/actions.js';
export { generateRouter } from './generators/router.js';
export { generateCompiler } from './generators/compiler.js';
export { generateVault } from './generators/vault.js';
export { generateSkills } from './generators/skills.js';
export { generateTests } from './generators/tests.js';
export { generateQc } from './generators/qc.js';
export { validate } from './validators/validate.js';
