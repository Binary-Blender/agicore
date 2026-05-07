// --- Macro Executor ----------------------------------------------------------
// Maps macro names to actual function calls within NovaSyn Teams.
// Stubs for now — will be wired to real services in Phase 2.

const macroHandlers: Record<string, (input: any) => Promise<any>> = {
  'teams.send_message': async (input) => {
    // TODO: Wire to messageService.sendMessage
    return { messageId: 'stub', status: 'pending' };
  },
  'teams.create_channel': async (input) => {
    // TODO: Wire to teamService.createChannel
    return { channelId: 'stub', status: 'pending' };
  },
  'teams.summarize_channel': async (input) => {
    // TODO: Wire to aiService.summarizeChannel
    return { summary: '', messageCount: 0 };
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
