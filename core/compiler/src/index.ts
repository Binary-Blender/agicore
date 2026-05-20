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
import { generateChannel } from './generators/channel.js';
import { generateTrigger } from './generators/trigger.js';
import { generatePacket } from './generators/packet.js';
import { generateIdentity } from './generators/identity.js';
import { generateFeed } from './generators/feed.js';
import { generateSession } from './generators/session.js';
import { generateModule } from './generators/module.js';
import { generateAuthority } from './generators/authority.js';
import { generateSemanticMemory } from './generators/semantic-memory.js';
import { generateEvent } from './generators/event.js';
import { generateNbve } from './generators/nbve.js';
import { generateContract } from './generators/contract.js';
import { generateReputation } from './generators/reputation.js';
import { generateSubscription } from './generators/subscription.js';
import { generateDispute } from './generators/dispute.js';
import { generatePreference } from './generators/preference.js';
import { generateLog } from './generators/logging.js';
import { generateMacroRegistry } from './generators/macro-registry.js';
import { generateNode } from './generators/node.js';
import { generateActuator } from './generators/actuator.js';
import { generatePlatform } from './generators/platform.js';
import { generateNullclaw } from './generators/nullclaw.js';
import { generateBrainBody } from './generators/brain-body.js';
import { generateSkillDoc } from './generators/skilldoc.js';
import { generateTheme } from './generators/theme.js';
import { generateStages } from './generators/stages.js';
import { generateCognitionRole } from './generators/cognition-role.js';
import { generateEscalationChain } from './generators/escalation-chain.js';
import { generateQcMesh } from './generators/qc-mesh.js';
import { generateAxum } from './generators/axum.js';
import { generateDocker } from './generators/docker.js';
import { generateWebClient } from './generators/web-client.js';
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
    generateChannel(ast),
    generateTrigger(ast),
    generatePacket(ast),
    generateIdentity(ast),
    generateFeed(ast),
    generateSession(ast),
    generateModule(ast),
    generateAuthority(ast),
    generateSemanticMemory(ast),
    generateEvent(ast),
    generateNbve(ast),
    generateContract(ast),
    generateReputation(ast),
    generateSubscription(ast),
    generateDispute(ast),
    generatePreference(ast),
    generateLog(ast),
    generateMacroRegistry(ast),
    generateNode(ast),
    generateActuator(ast),
    generatePlatform(ast),
    generateNullclaw(ast),
    generateBrainBody(ast),
    generateSkillDoc(ast),
    generateTheme(ast),
    generateStages(ast),
    generateCognitionRole(ast),
    generateEscalationChain(ast),
    generateQcMesh(ast),
    generateAxum(ast),
    generateDocker(ast),
    generateWebClient(ast),
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
export { generateChannel } from './generators/channel.js';
export { generateTrigger } from './generators/trigger.js';
export { generatePacket } from './generators/packet.js';
export { generateIdentity } from './generators/identity.js';
export { generateFeed } from './generators/feed.js';
export { generateSession } from './generators/session.js';
export { generateModule } from './generators/module.js';
export { generateAuthority } from './generators/authority.js';
export { generateSemanticMemory } from './generators/semantic-memory.js';
export { generateEvent } from './generators/event.js';
export { generateNbve } from './generators/nbve.js';
export { generateContract } from './generators/contract.js';
export { generateReputation } from './generators/reputation.js';
export { generateSubscription } from './generators/subscription.js';
export { generateDispute } from './generators/dispute.js';
export { generateLog } from './generators/logging.js';
export { generateMacroRegistry } from './generators/macro-registry.js';
export { generateNode } from './generators/node.js';
export { generateActuator } from './generators/actuator.js';
export { generatePlatform } from './generators/platform.js';
export { generateNullclaw } from './generators/nullclaw.js';
export { generateBrainBody } from './generators/brain-body.js';
export { generateSkillDoc } from './generators/skilldoc.js';
export { generateTheme } from './generators/theme.js';
export { generateStages } from './generators/stages.js';
export { generateCognitionRole } from './generators/cognition-role.js';
export { generateEscalationChain } from './generators/escalation-chain.js';
export { generateQcMesh } from './generators/qc-mesh.js';
export { generateAxum } from './generators/axum.js';
export { generateDocker } from './generators/docker.js';
export { generateWebClient } from './generators/web-client.js';
