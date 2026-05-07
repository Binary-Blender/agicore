// --- Macro Executor ----------------------------------------------------------
// Maps macro names to actual function calls within NovaSyn Orchestrator.
// Stubs for now — will be wired to real services in a later phase.

const macroHandlers: Record<string, (input: any) => Promise<any>> = {
  'orchestrator.run_workflow': async (input) => {
    // TODO: Wire to workflow execution engine
    return { runId: 'stub', status: 'pending', results: [] };
  },
  'orchestrator.list_workflows': async (input) => {
    // TODO: Wire to workflow list query
    return { workflows: [] };
  },
};

/**
 * Execute a macro by name with the given input.
 * Throws if the macro name is not registered.
 */
export async function executeMacro(macroName: string, input: any): Promise<any> {
  const handler = macroHandlers[macroName];
  if (!handler) {
    throw new Error(`Unknown macro: ${macroName}`);
  }
  return handler(input);
}

/** Get list of registered macro names */
export function getRegisteredMacroNames(): string[] {
  return Object.keys(macroHandlers);
}
