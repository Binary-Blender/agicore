import Anthropic from '@anthropic-ai/sdk';
import { AVAILABLE_MODELS } from '../models';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AICompletionResult {
  content: string;
  model: string;
  promptTokens: number;
  responseTokens: number;
  totalTokens: number;
}

function buildWriterSystemPrompt(
  context?: string,
  userSystemPrompt?: string,
): string {
  let systemPrompt =
    'You are a skilled creative writing assistant. Help the user with their writing by providing thoughtful, well-crafted prose. Match the tone and style of their existing work. Be creative but stay consistent with the established narrative.';

  if (context?.trim()) {
    systemPrompt += `\n\nThe user has provided the following context from their project:\n\n${context}`;
  }
  if (userSystemPrompt?.trim()) {
    systemPrompt += `\n\n---\n${userSystemPrompt.trim()}`;
  }

  return systemPrompt;
}

// ─── Streaming handlers ───────────────────────────────────────────────────────

async function handleAnthropicStream(
  prompt: string,
  modelId: string,
  context: string | undefined,
  apiKey: string,
  userSystemPrompt: string | undefined,
  onDelta: (text: string) => void,
  signal?: AbortSignal,
  temperature?: number,
): Promise<AICompletionResult> {
  const systemPrompt = buildWriterSystemPrompt(context, userSystemPrompt);
  const client = new Anthropic({ apiKey });
  const streamParams: any = {
    model: modelId,
    max_tokens: 4096,
    system: systemPrompt,
    messages: [{ role: 'user', content: prompt }],
  };
  if (temperature !== undefined) streamParams.temperature = temperature;
  const stream = client.messages.stream(streamParams);

  // Handle cancellation
  if (signal) {
    signal.addEventListener('abort', () => stream.abort(), { once: true });
  }

  let fullContent = '';
  stream.on('text', (text) => {
    fullContent += text;
    onDelta(text);
  });

  try {
    const finalMessage = await stream.finalMessage();
    return {
      content: finalMessage.content[0]?.type === 'text' ? finalMessage.content[0].text : fullContent,
      model: finalMessage.model,
      promptTokens: finalMessage.usage.input_tokens,
      responseTokens: finalMessage.usage.output_tokens,
      totalTokens: finalMessage.usage.input_tokens + finalMessage.usage.output_tokens,
    };
  } catch (err: any) {
    if (signal?.aborted) {
      return { content: fullContent, model: modelId, promptTokens: 0, responseTokens: 0, totalTokens: 0 };
    }
    throw err;
  }
}

async function handleOpenAIStream(
  prompt: string,
  modelId: string,
  context: string | undefined,
  apiKey: string,
  userSystemPrompt: string | undefined,
  onDelta: (text: string) => void,
  signal?: AbortSignal,
  temperature?: number,
): Promise<AICompletionResult> {
  const systemPrompt = buildWriterSystemPrompt(context, userSystemPrompt);
  const messages: { role: string; content: string }[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: prompt },
  ];

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: modelId,
      messages,
      temperature: temperature ?? 0.7,
      max_tokens: 4096,
      stream: true,
      stream_options: { include_usage: true },
    }),
    signal,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
  }

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let fullContent = '';
  let promptTokens = 0;
  let responseTokens = 0;
  let finalModel = modelId;
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed === 'data: [DONE]') continue;
      if (trimmed.startsWith('data: ')) {
        try {
          const data = JSON.parse(trimmed.slice(6));
          const delta = data.choices?.[0]?.delta?.content;
          if (delta) {
            fullContent += delta;
            onDelta(delta);
          }
          if (data.model) finalModel = data.model;
          if (data.usage) {
            promptTokens = data.usage.prompt_tokens ?? 0;
            responseTokens = data.usage.completion_tokens ?? 0;
          }
        } catch {
          /* ignore malformed chunks */
        }
      }
    }
  }

  return {
    content: fullContent,
    model: finalModel,
    promptTokens,
    responseTokens,
    totalTokens: promptTokens + responseTokens,
  };
}

async function handleGeminiStream(
  prompt: string,
  modelId: string,
  context: string | undefined,
  apiKey: string,
  userSystemPrompt: string | undefined,
  onDelta: (text: string) => void,
  signal?: AbortSignal,
  temperature?: number,
): Promise<AICompletionResult> {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:streamGenerateContent?key=${apiKey}&alt=sse`;
  const systemPrompt = buildWriterSystemPrompt(context, userSystemPrompt);

  const requestBody: any = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { temperature: temperature ?? 0.7, maxOutputTokens: 4096 },
    systemInstruction: { parts: [{ text: systemPrompt }] },
  };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
    signal,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
  }

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let fullContent = '';
  let promptTokens = 0;
  let responseTokens = 0;
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith('data: ')) continue;
      try {
        const data = JSON.parse(trimmed.slice(6));
        const parts = data.candidates?.[0]?.content?.parts;
        if (parts) {
          for (const part of parts) {
            if (part.text) {
              fullContent += part.text;
              onDelta(part.text);
            }
          }
        }
        if (data.usageMetadata) {
          promptTokens = data.usageMetadata.promptTokenCount ?? 0;
          responseTokens = data.usageMetadata.candidatesTokenCount ?? 0;
        }
      } catch {
        /* ignore malformed chunks */
      }
    }
  }

  return {
    content: fullContent,
    model: modelId,
    promptTokens,
    responseTokens,
    totalTokens: promptTokens + responseTokens,
  };
}

async function handleGrokStream(
  prompt: string,
  modelId: string,
  context: string | undefined,
  apiKey: string,
  userSystemPrompt: string | undefined,
  onDelta: (text: string) => void,
  signal?: AbortSignal,
  temperature?: number,
): Promise<AICompletionResult> {
  const systemPrompt = buildWriterSystemPrompt(context, userSystemPrompt);
  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: prompt },
  ];

  const response = await fetch('https://api.x.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: modelId,
      messages,
      temperature: temperature ?? 0.7,
      stream: true,
    }),
    signal,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`xAI Grok API error: ${response.status} - ${errorText}`);
  }

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let fullContent = '';
  let promptTokens = 0;
  let responseTokens = 0;
  let finalModel = modelId;
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed === 'data: [DONE]') continue;
      if (trimmed.startsWith('data: ')) {
        try {
          const data = JSON.parse(trimmed.slice(6));
          const delta = data.choices?.[0]?.delta?.content;
          if (delta) {
            fullContent += delta;
            onDelta(delta);
          }
          if (data.model) finalModel = data.model;
          if (data.usage) {
            promptTokens = data.usage.prompt_tokens ?? 0;
            responseTokens = data.usage.completion_tokens ?? 0;
          }
        } catch {
          /* ignore malformed chunks */
        }
      }
    }
  }

  return {
    content: fullContent,
    model: finalModel,
    promptTokens,
    responseTokens,
    totalTokens: promptTokens + responseTokens,
  };
}

async function handleBabyAI(
  prompt: string,
  modelId: string,
  context: string | undefined,
  apiKey: string,
  userSystemPrompt: string | undefined,
  onDelta: (text: string) => void,
  signal?: AbortSignal,
  temperature?: number,
): Promise<AICompletionResult> {
  const systemPrompt = buildWriterSystemPrompt(context, userSystemPrompt);
  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: prompt },
  ];

  const response = await fetch('https://novasynchris-babyai.hf.space/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: modelId,
      messages,
      temperature: temperature ?? 0.7,
      max_tokens: 4096,
    }),
    signal,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`BabyAI API error: ${response.status} - ${errorText}`);
  }

  const data: any = await response.json();
  const content = data.choices?.[0]?.message?.content || '';
  const promptTokens = data.usage?.prompt_tokens ?? 0;
  const responseTokens = data.usage?.completion_tokens ?? 0;

  // Deliver full response at once (BabyAI does not support streaming)
  if (content) {
    onDelta(content);
  }

  return {
    content,
    model: data.model || modelId,
    promptTokens,
    responseTokens,
    totalTokens: promptTokens + responseTokens,
  };
}

// ─── Non-streaming chat with history ─────────────────────────────────────────

async function chatAnthropicWithHistory(
  modelId: string,
  apiKey: string,
  systemPrompt: string,
  messages: ChatMessage[],
): Promise<string> {
  const client = new Anthropic({ apiKey });
  const resp = await client.messages.create({
    model: modelId,
    max_tokens: 4096,
    system: systemPrompt,
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
  });
  return resp.content[0]?.type === 'text' ? resp.content[0].text : '';
}

async function chatOpenAICompatibleWithHistory(
  endpoint: string,
  modelId: string,
  apiKey: string,
  systemPrompt: string,
  messages: ChatMessage[],
): Promise<string> {
  const body = {
    model: modelId,
    messages: [
      { role: 'system', content: systemPrompt },
      ...messages.map((m) => ({ role: m.role, content: m.content })),
    ],
    temperature: 0.7,
    max_tokens: 4096,
  };
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API error: ${response.status} - ${errorText}`);
  }
  const data: any = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

async function chatGeminiWithHistory(
  modelId: string,
  apiKey: string,
  systemPrompt: string,
  messages: ChatMessage[],
): Promise<string> {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`;
  const contents = messages.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents,
      systemInstruction: { parts: [{ text: systemPrompt }] },
      generationConfig: { temperature: 0.7, maxOutputTokens: 4096 },
    }),
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
  }
  const data: any = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

// ─── Service class ────────────────────────────────────────────────────────────

export class AIService {
  private abortController: AbortController | null = null;

  async streamCompletion(
    prompt: string,
    modelId: string,
    context: string | undefined,
    apiKey: string,
    systemPrompt: string | undefined,
    onDelta: (text: string) => void,
    temperature?: number,
  ): Promise<AICompletionResult> {
    const modelConfig = AVAILABLE_MODELS.find((m) => m.id === modelId);
    if (!modelConfig) throw new Error(`Unknown model: ${modelId}`);

    this.abortController = new AbortController();
    const signal = this.abortController.signal;

    try {
      switch (modelConfig.provider) {
        case 'anthropic':
          return await handleAnthropicStream(prompt, modelId, context, apiKey, systemPrompt, onDelta, signal, temperature);
        case 'openai':
          return await handleOpenAIStream(prompt, modelId, context, apiKey, systemPrompt, onDelta, signal, temperature);
        case 'google':
          return await handleGeminiStream(prompt, modelId, context, apiKey, systemPrompt, onDelta, signal, temperature);
        case 'xai':
          return await handleGrokStream(prompt, modelId, context, apiKey, systemPrompt, onDelta, signal, temperature);
        case 'babyai':
          return await handleBabyAI(prompt, modelId, context, apiKey, systemPrompt, onDelta, signal, temperature);
        default:
          throw new Error(`Unsupported provider: ${modelConfig.provider}`);
      }
    } finally {
      this.abortController = null;
    }
  }

  cancelStream(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }

  async sendChatWithHistory(
    model: { id: string; provider: string },
    keys: Record<string, string>,
    systemPrompt: string,
    messages: ChatMessage[],
  ): Promise<string> {
    switch (model.provider) {
      case 'anthropic':
        return chatAnthropicWithHistory(model.id, keys.anthropic, systemPrompt, messages);
      case 'openai':
        return chatOpenAICompatibleWithHistory('https://api.openai.com/v1/chat/completions', model.id, keys.openai, systemPrompt, messages);
      case 'google':
        return chatGeminiWithHistory(model.id, keys.google, systemPrompt, messages);
      case 'xai':
        return chatOpenAICompatibleWithHistory('https://api.x.ai/v1/chat/completions', model.id, keys.xai, systemPrompt, messages);
      case 'babyai':
        return chatOpenAICompatibleWithHistory('https://novasynchris-babyai.hf.space/v1/chat/completions', model.id, keys.babyai, systemPrompt, messages);
      default:
        throw new Error(`Unsupported provider: ${model.provider}`);
    }
  }
}

export const aiService = new AIService();
