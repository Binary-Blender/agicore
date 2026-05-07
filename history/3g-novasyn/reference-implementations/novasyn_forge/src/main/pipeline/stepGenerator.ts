import { sendChatRequest } from '../ai/chatClient';
import { SYSTEM_PROMPTS } from '../ai/systemPrompts';
import { loadApiKeys } from '../config/apiKeyStore';
import { loadSettings } from '../config/settingsStore';
import { BrowserWindow } from 'electron';
import type { Feature, FeatureStep, ForgeProject } from '../../shared/types';
import { PIPELINE_STEPS } from '../../shared/types';

interface StepContext {
  project: ForgeProject;
  feature: Feature;
  previousSteps: FeatureStep[];  // completed steps so far
  stepNumber: number;
}

// Build a detailed prompt for the Builder AI to generate code for a specific step
function buildStepPrompt(ctx: StepContext): string {
  const stepDef = PIPELINE_STEPS.find(s => s.number === ctx.stepNumber);
  if (!stepDef) throw new Error(`Invalid step number: ${ctx.stepNumber}`);

  let prompt = `Generate code for Step ${ctx.stepNumber}: ${stepDef.label}\n\n`;
  prompt += `Project: ${ctx.project.displayName} (${ctx.project.packageName})\n`;
  prompt += `Feature: ${ctx.feature.name}\n`;
  prompt += `Entity: ${ctx.feature.entityName}\n`;
  prompt += `Table: ${ctx.feature.tableName}\n\n`;

  // Include previous steps' generated code as context
  if (ctx.previousSteps.length > 0) {
    prompt += `=== Previously Generated Code ===\n\n`;
    for (const prev of ctx.previousSteps) {
      prompt += `--- Step ${prev.stepNumber}: ${prev.stepName} ---\n`;
      prompt += prev.generatedCode + '\n\n';
    }
    prompt += `=== End Previous Code ===\n\n`;
  }

  // Step-specific instructions
  switch (ctx.stepNumber) {
    case 1: // SQL Migration
      prompt += `Generate a CREATE TABLE SQL migration for the "${ctx.feature.tableName}" table.\n`;
      prompt += `Include: id TEXT PRIMARY KEY, relevant columns based on the feature description, created_at, updated_at.\n`;
      prompt += `Include indexes and an updated_at trigger.\n`;
      prompt += `Feature description: ${ctx.feature.description}\n`;
      break;
    case 2: // TS Interfaces
      prompt += `Generate TypeScript interfaces for the ${ctx.feature.entityName} entity.\n`;
      prompt += `Include: ${ctx.feature.entityName} interface (matching SQL columns in camelCase), Create${ctx.feature.entityName}Input, Update${ctx.feature.entityName}Input.\n`;
      prompt += `Use the SQL migration from Step 1 to derive the fields.\n`;
      break;
    case 3: // IPC Channels
      prompt += `Generate IPC channel constants for ${ctx.feature.entityName} CRUD operations.\n`;
      prompt += `Follow the pattern: GET_${ctx.feature.tableName.toUpperCase()}S, GET_${ctx.feature.tableName.toUpperCase()}, CREATE_${ctx.feature.tableName.toUpperCase()}, UPDATE_${ctx.feature.tableName.toUpperCase()}, DELETE_${ctx.feature.tableName.toUpperCase()}\n`;
      prompt += `Use the format: 'get-${ctx.feature.tableName.replace(/_/g, '-')}s' etc.\n`;
      break;
    case 4: // ElectronAPI
      prompt += `Generate ElectronAPI interface methods for ${ctx.feature.entityName} CRUD.\n`;
      prompt += `Methods: get${ctx.feature.entityName}s, get${ctx.feature.entityName}, create${ctx.feature.entityName}, update${ctx.feature.entityName}, delete${ctx.feature.entityName}.\n`;
      prompt += `Use the TypeScript interfaces from Step 2 for parameters and return types.\n`;
      break;
    case 5: // Preload Bridge
      prompt += `Generate preload/contextBridge bindings for ${ctx.feature.entityName}.\n`;
      prompt += `Map each ElectronAPI method to ipcRenderer.invoke with the correct IPC channel.\n`;
      break;
    case 6: // Row Mappers
      prompt += `Generate a row mapper function that converts a SQLite row (snake_case) to the ${ctx.feature.entityName} TypeScript interface (camelCase).\n`;
      prompt += `Include the ${ctx.feature.entityName}Row type and map${ctx.feature.entityName}Row function.\n`;
      break;
    case 7: // IPC Handlers
      prompt += `Generate ipcMain.handle() implementations for all ${ctx.feature.entityName} CRUD operations.\n`;
      prompt += `Use better-sqlite3 prepared statements, the row mapper from Step 6, and uuid for IDs.\n`;
      break;
    case 8: // Zustand Store
      prompt += `Generate Zustand store state and actions for ${ctx.feature.entityName}.\n`;
      prompt += `Include: ${ctx.feature.entityName.toLowerCase()}s array, set/add/update/remove actions.\n`;
      prompt += `Follow the pattern: set${ctx.feature.entityName}s, add${ctx.feature.entityName}, update${ctx.feature.entityName}, remove${ctx.feature.entityName}.\n`;
      break;
    case 9: // React Components
      prompt += `Generate a React component for ${ctx.feature.entityName} CRUD UI.\n`;
      prompt += `Include: list view, create form, edit capability, delete with confirmation.\n`;
      prompt += `Use Tailwind CSS with the NovaSyn dark theme (slate-900 bg, amber accents).\n`;
      break;
    case 10: // App.tsx Routing
      prompt += `Generate the App.tsx routing integration for ${ctx.feature.entityName}.\n`;
      prompt += `Show what to add to the view switch/router and any sidebar navigation.\n`;
      break;
  }

  prompt += `\nIMPORTANT: Output ONLY the code. Include a file path comment at the top (e.g., // src/main/database/migrations/...). No explanations.`;

  return prompt;
}

export async function generateStepCode(ctx: StepContext): Promise<string> {
  const apiKeys = loadApiKeys();
  const settings = loadSettings();

  const stepPrompt = buildStepPrompt(ctx);

  const messages = [
    { role: 'system' as const, content: SYSTEM_PROMPTS.builder },
    { role: 'user' as const, content: stepPrompt },
  ];

  const response = await sendChatRequest({
    model: settings.defaultModel || 'babyai-auto',
    messages,
    apiKeys,
    babyaiUrl: settings.babyaiUrl,
    hfToken: settings.hfToken,
    onDelta: (text) => {
      BrowserWindow.getAllWindows()[0]?.webContents.send('chat-delta', text);
    },
  });

  return response;
}
