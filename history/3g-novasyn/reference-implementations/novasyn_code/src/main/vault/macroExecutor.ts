// ─── Macro Executor ──────────────────────────────────────────────────────────
// Maps macro names to actual function calls within NovaSyn Code.

import { readFileContent, writeFileContent } from '../services/FileTreeService';
import { chatService, AVAILABLE_MODELS } from '../services/ChatService';
import { loadApiKeys } from '../config/apiKeyStore';
import { loadSettings } from '../config/settingsStore';
import { getMainWindow } from '../window';

const macroHandlers: Record<string, (input: any) => Promise<any>> = {
  'code.apply_file': async (input) => {
    try {
      writeFileContent(input.filePath, input.content);
      const win = getMainWindow();
      if (win) {
        win.webContents.send('macro-file-applied', { filePath: input.filePath });
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },
  'code.read_file': async (input) => {
    try {
      const content = readFileContent(input.filePath);
      return { content };
    } catch (err: any) {
      return { content: '', error: err.message };
    }
  },
  'code.send_prompt': async (input) => {
    try {
      const apiKeys = loadApiKeys();
      const settings = loadSettings();
      const modelId = input.model || 'claude-sonnet-4-6';
      const model = AVAILABLE_MODELS.find((m) => m.id === modelId);
      const provider = model?.provider;
      const apiKey = provider ? apiKeys[provider] : undefined;

      if (!apiKey) {
        return { response: '', model: modelId, tokens: 0, error: `No API key for provider: ${provider || 'unknown'}` };
      }

      const messages = [{ role: 'user' as const, content: input.prompt }];
      const result = await chatService.completeStream(
        messages,
        modelId,
        undefined,
        apiKey,
        settings.systemPrompt || undefined,
        () => {}, // no streaming delta needed for macro calls
        provider,
      );

      return {
        response: result.content,
        model: result.model,
        tokens: result.totalTokens,
      };
    } catch (err: any) {
      return { response: '', model: input.model || 'claude-sonnet-4-6', tokens: 0, error: err.message };
    }
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
