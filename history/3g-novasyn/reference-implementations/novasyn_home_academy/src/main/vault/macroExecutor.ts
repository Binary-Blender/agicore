// ─── Macro Executor ──────────────────────────────────────────────────────────
// Maps macro names to actual function calls within NovaSyn Academy.
// Stubs for now — will be wired to real services in a later phase.

const macroHandlers: Record<string, (input: any) => Promise<any>> = {
  'academy.generate_lesson': async (input) => {
    // TODO: Wire to aiService for lesson plan generation
    return { lessonId: '', title: '', objectives: [], model: 'stub' };
  },
  'academy.create_quiz': async (input) => {
    // TODO: Wire to aiService for quiz/assessment generation
    return { assessmentId: '', questions: [], totalPoints: 0, model: 'stub' };
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
