# NovaSyn AI Service Patterns

## Overview

Every NovaSyn app that uses AI has a `src/main/services/aiService.ts` file. This file handles multi-provider AI calls with a consistent interface.

## Supported Providers

| Provider | SDK/Method | Streaming | Models |
|----------|-----------|-----------|--------|
| Anthropic | `@anthropic-ai/sdk` native | ✅ Native streaming | Claude 3.5 Sonnet, Claude 3 Opus, Claude 3 Haiku |
| OpenAI | Raw `fetch()` with SSE | ✅ SSE streaming | GPT-4o, GPT-4o-mini, o1, o1-mini |
| xAI | Raw `fetch()` with SSE | ✅ SSE streaming | Grok-2, Grok-2-mini |
| Google | Raw `fetch()` | ❌ Non-streaming | Gemini 2.0 Flash, Gemini 1.5 Pro |

## Model List Pattern

Every app has a `src/main/models.ts` that defines available models:

```typescript
export interface AIModel {
  id: string;
  name: string;
  provider: 'anthropic' | 'openai' | 'google' | 'xai';
  contextWindow: number;
  maxOutput: number;
  costPer1kInput: number;
  costPer1kOutput: number;
}

export const AI_MODELS: AIModel[] = [
  {
    id: 'claude-sonnet-4-20250514',
    name: 'Claude Sonnet 4',
    provider: 'anthropic',
    contextWindow: 200000,
    maxOutput: 8192,
    costPer1kInput: 0.003,
    costPer1kOutput: 0.015,
  },
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    provider: 'openai',
    contextWindow: 128000,
    maxOutput: 4096,
    costPer1kInput: 0.005,
    costPer1kOutput: 0.015,
  },
  // ... more models
];
```

## Non-Streaming AI Call Pattern

For one-shot generation (lesson plans, reports, assessments):

```typescript
async function callAI(
  apiKeys: Record<string, string>,
  model: AIModel,
  systemPrompt: string,
  userPrompt: string,
): Promise<string> {
  const provider = model.provider;

  if (provider === 'anthropic') {
    const client = new Anthropic({ apiKey: apiKeys.anthropic });
    const response = await client.messages.create({
      model: model.id,
      max_tokens: model.maxOutput,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });
    return (response.content[0] as { text: string }).text;
  }

  if (provider === 'openai' || provider === 'xai') {
    const baseUrl = provider === 'xai'
      ? 'https://api.x.ai/v1'
      : 'https://api.openai.com/v1';
    const apiKey = provider === 'xai' ? apiKeys.xai : apiKeys.openai;

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model.id,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: model.maxOutput,
      }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(`${provider} API error: ${data.error?.message || response.statusText}`);
    return data.choices[0].message.content;
  }

  if (provider === 'google') {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model.id}:generateContent?key=${apiKeys.google}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents: [{ parts: [{ text: userPrompt }] }],
          generationConfig: { maxOutputTokens: model.maxOutput },
        }),
      }
    );

    const data = await response.json();
    if (!response.ok) throw new Error(`Google API error: ${data.error?.message || response.statusText}`);
    return data.candidates[0].content.parts[0].text;
  }

  throw new Error(`Unknown provider: ${provider}`);
}
```

## Streaming AI Call Pattern

For real-time streaming (chat, tutoring):

### Anthropic (Native SDK Streaming)

```typescript
async function streamAnthropicResponse(
  apiKey: string,
  model: string,
  messages: Array<{ role: string; content: string }>,
  systemPrompt: string,
  onChunk: (text: string) => void,
): Promise<{ fullText: string; inputTokens: number; outputTokens: number }> {
  const client = new Anthropic({ apiKey });

  const stream = client.messages.stream({
    model,
    max_tokens: 8192,
    system: systemPrompt,
    messages: messages as Anthropic.MessageParam[],
  });

  let fullText = '';
  let inputTokens = 0;
  let outputTokens = 0;

  stream.on('text', (text) => {
    fullText += text;
    onChunk(text);
  });

  const finalMessage = await stream.finalMessage();
  inputTokens = finalMessage.usage.input_tokens;
  outputTokens = finalMessage.usage.output_tokens;

  return { fullText, inputTokens, outputTokens };
}
```

### OpenAI/xAI (SSE Streaming)

```typescript
async function streamOpenAIResponse(
  apiKey: string,
  baseUrl: string,
  model: string,
  messages: Array<{ role: string; content: string }>,
  onChunk: (text: string) => void,
): Promise<{ fullText: string }> {
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      stream: true,
    }),
  });

  if (!response.ok) throw new Error(`API error: ${response.statusText}`);

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let fullText = '';
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6);
        if (data === '[DONE]') continue;
        try {
          const parsed = JSON.parse(data);
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) {
            fullText += content;
            onChunk(content);
          }
        } catch { /* skip malformed SSE lines */ }
      }
    }
  }

  return { fullText };
}
```

### Sending Chunks to Renderer

Use `webContents.send()` for streaming to the renderer:

```typescript
// In the IPC handler (main process)
ipcMain.handle(IPC_CHANNELS.SEND_CHAT, async (_event, message, model) => {
  const mainWindow = getMainWindow();

  const onChunk = (text: string) => {
    mainWindow?.webContents.send('chat-stream-chunk', text);
  };

  // ... call streaming function with onChunk
});

// In preload
ipcRenderer.on('chat-stream-chunk', (_event, text) => {
  // Forward to renderer via callback
});
```

## Cost Tracking Pattern

Track AI usage costs in an `ai_log` table:

```sql
CREATE TABLE IF NOT EXISTS ai_log (
  id TEXT PRIMARY KEY,
  model_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  operation TEXT NOT NULL,
  input_tokens INTEGER DEFAULT 0,
  output_tokens INTEGER DEFAULT 0,
  cost REAL DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

### Calculating Cost

```typescript
function calculateCost(model: AIModel, inputTokens: number, outputTokens: number): number {
  return (inputTokens / 1000) * model.costPer1kInput + (outputTokens / 1000) * model.costPer1kOutput;
}

function logAIUsage(
  db: Database.Database,
  modelId: string,
  provider: string,
  operation: string,
  inputTokens: number,
  outputTokens: number,
  cost: number,
): void {
  db.prepare(`INSERT INTO ai_log (id, model_id, provider, operation, input_tokens, output_tokens, cost, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(
    uuid(), modelId, provider, operation, inputTokens, outputTokens, cost, new Date().toISOString()
  );
}
```

## AI Prompt Patterns

### System Prompt Structure

```typescript
const systemPrompt = `You are an AI assistant for a homeschool education app.

CONTEXT:
- Student: ${student.name}, Grade ${student.gradeLevel}
- Learning style: ${student.learningStyle}
- Subject: ${subject.name}

REQUIREMENTS:
- Age-appropriate content for grade ${student.gradeLevel}
- Align with ${student.learningStyle} learning style
- Include hands-on activities where possible

OUTPUT FORMAT:
Return a JSON object with this exact structure:
{
  "title": "Lesson title",
  "description": "Brief description",
  "activities": [
    { "name": "Activity name", "duration": 15, "instructions": "..." }
  ],
  "estimatedMinutes": 45
}`;
```

### JSON Response Extraction

AI responses often include markdown code fences. Extract the JSON:

```typescript
function extractJSON(text: string): string {
  // Try to find JSON in code fences
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) return fenceMatch[1].trim();

  // Try to find raw JSON object
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) return jsonMatch[0];

  return text;
}

function parseAIResponse<T>(text: string): T {
  const json = extractJSON(text);
  return JSON.parse(json) as T;
}
```

## PDF Export Pattern

For generating PDFs from AI-generated HTML:

```typescript
ipcMain.handle(IPC_CHANNELS.EXPORT_PDF, async (_event, html: string, filename: string) => {
  const printWindow = new BrowserWindow({
    show: false,
    webPreferences: { contextIsolation: true },
  });

  await printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);

  const pdfData = await printWindow.webContents.printToPDF({
    printBackground: true,
    landscape: false,
    margins: { top: 0.5, bottom: 0.5, left: 0.5, right: 0.5 },
  });

  const { dialog } = require('electron');
  const { filePath } = await dialog.showSaveDialog({
    defaultPath: filename,
    filters: [{ name: 'PDF', extensions: ['pdf'] }],
  });

  if (filePath) {
    fs.writeFileSync(filePath, pdfData);
  }

  printWindow.close();
  return !!filePath;
});
```
