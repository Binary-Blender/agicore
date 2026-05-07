import Anthropic from '@anthropic-ai/sdk';
import { AIModel } from '../../shared/types';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatCompletionResult {
  content: string;
  model: string;
  promptTokens: number;
  responseTokens: number;
  totalTokens: number;
}

export const AVAILABLE_MODELS: AIModel[] = [
  {
    id: 'claude-sonnet-4-6',
    name: 'Claude Sonnet 4.6',
    provider: 'anthropic',
    contextWindow: 200000,
    isDefault: true,
    requiresKey: true,
  },
  {
    id: 'claude-opus-4-6',
    name: 'Claude Opus 4.6',
    provider: 'anthropic',
    contextWindow: 200000,
    isDefault: false,
    requiresKey: true,
  },
  {
    id: 'claude-haiku-4-5-20251001',
    name: 'Claude Haiku 4.5',
    provider: 'anthropic',
    contextWindow: 200000,
    isDefault: false,
    requiresKey: true,
  },
  {
    id: 'gpt-5.2',
    name: 'GPT-5.2',
    provider: 'openai',
    contextWindow: 400000,
    isDefault: false,
    requiresKey: true,
  },
  {
    id: 'gpt-5-mini',
    name: 'GPT-5 Mini',
    provider: 'openai',
    contextWindow: 400000,
    isDefault: false,
    requiresKey: true,
  },
  {
    id: 'gpt-5-nano',
    name: 'GPT-5 Nano',
    provider: 'openai',
    contextWindow: 400000,
    isDefault: false,
    requiresKey: true,
  },
  {
    id: 'gpt-4.1',
    name: 'GPT-4.1',
    provider: 'openai',
    contextWindow: 1047576,
    isDefault: false,
    requiresKey: true,
  },
  {
    id: 'gpt-4.1-mini',
    name: 'GPT-4.1 Mini',
    provider: 'openai',
    contextWindow: 1047576,
    isDefault: false,
    requiresKey: true,
  },
  {
    id: 'o3',
    name: 'o3',
    provider: 'openai',
    contextWindow: 200000,
    isDefault: false,
    requiresKey: true,
  },
  {
    id: 'o4-mini',
    name: 'o4-mini',
    provider: 'openai',
    contextWindow: 200000,
    isDefault: false,
    requiresKey: true,
  },
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    provider: 'openai',
    contextWindow: 128000,
    isDefault: false,
    requiresKey: true,
  },
  {
    id: 'gpt-4o-mini',
    name: 'GPT-4o Mini',
    provider: 'openai',
    contextWindow: 128000,
    isDefault: false,
    requiresKey: true,
  },
  {
    id: 'gemini-2.5-pro',
    name: 'Gemini 2.5 Pro',
    provider: 'google',
    contextWindow: 1048576,
    isDefault: false,
    requiresKey: true,
  },
  {
    id: 'gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    provider: 'google',
    contextWindow: 1048576,
    isDefault: false,
    requiresKey: true,
  },
  {
    id: 'gemini-2.0-flash',
    name: 'Gemini 2.0 Flash',
    provider: 'google',
    contextWindow: 1048576,
    isDefault: false,
    requiresKey: true,
  },
  {
    id: 'grok-3',
    name: 'Grok 3',
    provider: 'xai',
    contextWindow: 131072,
    isDefault: false,
    requiresKey: true,
  },
  {
    id: 'grok-3-mini',
    name: 'Grok 3 Mini',
    provider: 'xai',
    contextWindow: 131072,
    isDefault: false,
    requiresKey: true,
  },
];

const CODE_INSTRUCTION = `

CODE OUTPUT: When generating code, always wrap each file's code in a fenced code block with the language specified. Include a comment at the top of each code block with the target file path, like:
\`\`\`typescript
// src/components/MyComponent.tsx
... code here ...
\`\`\`

When modifying existing files, show the complete updated file content, not just the changes. This ensures accurate file application.`;

const DEFAULT_MAX_OUTPUT_TOKENS = 16384;

function buildContextAwareMessages(
  messages: ChatMessage[],
  context?: string,
): ChatMessage[] {
  if (!context || context.trim().length === 0) {
    return messages;
  }
  return [
    {
      role: 'user',
      content: `Here is some context to help you:\n\n${context}\n\nPlease use this context to answer my questions.`,
    },
    {
      role: 'assistant',
      content: "I understand. I'll use the provided context to help answer your questions.",
    },
    ...messages,
  ];
}

// ─── Streaming handlers ───────────────────────────────────────────────────────

async function handleAnthropicCompletionStream(
  messages: ChatMessage[],
  modelId: string,
  context: string | undefined,
  apiKey: string,
  userSystemPrompt: string | undefined,
  onDelta: (text: string) => void,
): Promise<ChatCompletionResult> {
  let systemPrompt = 'You are a helpful AI assistant.' + CODE_INSTRUCTION;
  if (context?.trim()) {
    systemPrompt = `You are a helpful AI assistant. The user has provided the following context:\n\n${context}\n\nPlease use this context when relevant, but also draw on your general knowledge as needed.${CODE_INSTRUCTION}`;
  }
  if (userSystemPrompt?.trim()) {
    systemPrompt += `\n\n---\n${userSystemPrompt.trim()}`;
  }

  const client = new Anthropic({ apiKey });
  let fullContent = '';

  try {
    const stream = client.messages.stream({
      model: modelId,
      max_tokens: DEFAULT_MAX_OUTPUT_TOKENS,
      system: systemPrompt,
      messages: messages.map((msg) => ({ role: msg.role, content: msg.content })),
    });

    stream.on('text', (text) => {
      fullContent += text;
      onDelta(text);
    });

    const finalMessage = await stream.finalMessage();
    const content = finalMessage.content[0]?.type === 'text' ? finalMessage.content[0].text : '';

    return {
      content: content || fullContent,
      model: finalMessage.model,
      promptTokens: finalMessage.usage.input_tokens,
      responseTokens: finalMessage.usage.output_tokens,
      totalTokens: finalMessage.usage.input_tokens + finalMessage.usage.output_tokens,
    };
  } catch (err: any) {
    // If we got partial content before the stream died, return it
    if (fullContent) {
      console.warn(`[Anthropic] Stream interrupted after partial content (${fullContent.length} chars): ${err.message}`);
      return {
        content: fullContent,
        model: modelId,
        promptTokens: 0,
        responseTokens: 0,
        totalTokens: 0,
      };
    }
    throw new Error(`Anthropic stream failed: ${err.message}`);
  }
}

async function handleOpenAICompletionStream(
  messages: ChatMessage[],
  modelId: string,
  context: string | undefined,
  apiKey: string,
  userSystemPrompt: string | undefined,
  onDelta: (text: string) => void,
): Promise<ChatCompletionResult> {
  const apiMessages = buildContextAwareMessages(messages, context);
  const sysContent = (userSystemPrompt?.trim() || 'You are a helpful AI assistant.') + CODE_INSTRUCTION;
  const finalMessages = [{ role: 'system' as const, content: sysContent }, ...apiMessages];

  // Newer OpenAI models (o-series, gpt-5.x) use max_completion_tokens instead of max_tokens
  const isReasoningModel = /^o\d/.test(modelId);
  const usesMaxCompletionTokens = isReasoningModel || modelId.startsWith('gpt-5');
  const body: Record<string, unknown> = {
    model: modelId,
    messages: finalMessages,
    stream: true,
    stream_options: { include_usage: true },
  };
  if (isReasoningModel) {
    body.max_completion_tokens = DEFAULT_MAX_OUTPUT_TOKENS;
  } else if (usesMaxCompletionTokens) {
    body.temperature = 0.7;
    body.max_completion_tokens = DEFAULT_MAX_OUTPUT_TOKENS;
  } else {
    body.temperature = 0.7;
    body.max_tokens = DEFAULT_MAX_OUTPUT_TOKENS;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120_000);

  let response: Response;
  try {
    response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (err: any) {
    clearTimeout(timeout);
    throw new Error(`OpenAI connection failed: ${err.message}`);
  }

  if (!response.ok) {
    clearTimeout(timeout);
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

  try {
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
          } catch { /* ignore malformed chunks */ }
        }
      }
    }
  } catch (err: any) {
    // If we got partial content before the stream died, return it
    if (fullContent) {
      console.warn(`[OpenAI] Stream interrupted after partial content (${fullContent.length} chars): ${err.message}`);
    } else {
      throw new Error(`OpenAI stream failed: ${err.message}`);
    }
  } finally {
    clearTimeout(timeout);
  }

  return {
    content: fullContent,
    model: finalModel,
    promptTokens,
    responseTokens,
    totalTokens: promptTokens + responseTokens,
  };
}

async function handleGeminiCompletionStream(
  messages: ChatMessage[],
  modelId: string,
  context: string | undefined,
  apiKey: string,
  userSystemPrompt: string | undefined,
  onDelta: (text: string) => void,
): Promise<ChatCompletionResult> {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:streamGenerateContent?key=${apiKey}&alt=sse`;
  const geminiMessages = buildContextAwareMessages(messages, context).map((msg) => ({
    role: msg.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: msg.content }],
  }));

  const requestBody: any = {
    contents: geminiMessages,
    generationConfig: { temperature: 0.7, maxOutputTokens: DEFAULT_MAX_OUTPUT_TOKENS },
  };
  if (userSystemPrompt?.trim()) {
    requestBody.systemInstruction = { parts: [{ text: userSystemPrompt.trim() }] };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120_000);

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });
  } catch (err: any) {
    clearTimeout(timeout);
    throw new Error(`Gemini connection failed: ${err.message}`);
  }

  if (!response.ok) {
    clearTimeout(timeout);
    const errorText = await response.text();
    throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
  }

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let fullContent = '';
  let promptTokens = 0;
  let responseTokens = 0;
  let buffer = '';

  try {
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
        } catch { /* ignore malformed chunks */ }
      }
    }
  } catch (err: any) {
    if (fullContent) {
      console.warn(`[Gemini] Stream interrupted after partial content (${fullContent.length} chars): ${err.message}`);
    } else {
      throw new Error(`Gemini stream failed: ${err.message}`);
    }
  } finally {
    clearTimeout(timeout);
  }

  return {
    content: fullContent,
    model: modelId,
    promptTokens,
    responseTokens,
    totalTokens: promptTokens + responseTokens,
  };
}

async function handleGrokCompletionStream(
  messages: ChatMessage[],
  modelId: string,
  context: string | undefined,
  apiKey: string,
  userSystemPrompt: string | undefined,
  onDelta: (text: string) => void,
): Promise<ChatCompletionResult> {
  const apiMessages = buildContextAwareMessages(messages, context);
  const sysContent = (userSystemPrompt?.trim() || 'You are a helpful AI assistant.') + CODE_INSTRUCTION;
  const finalMessages = [{ role: 'system' as const, content: sysContent }, ...apiMessages];

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120_000);

  let response: Response;
  try {
    response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: modelId,
        messages: finalMessages,
        temperature: 0.7,
        stream: true,
      }),
      signal: controller.signal,
    });
  } catch (err: any) {
    clearTimeout(timeout);
    throw new Error(`xAI Grok connection failed: ${err.message}`);
  }

  if (!response.ok) {
    clearTimeout(timeout);
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

  try {
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
          } catch { /* ignore malformed chunks */ }
        }
      }
    }
  } catch (err: any) {
    if (fullContent) {
      console.warn(`[Grok] Stream interrupted after partial content (${fullContent.length} chars): ${err.message}`);
    } else {
      throw new Error(`xAI Grok stream failed: ${err.message}`);
    }
  } finally {
    clearTimeout(timeout);
  }

  return {
    content: fullContent,
    model: finalModel,
    promptTokens,
    responseTokens,
    totalTokens: promptTokens + responseTokens,
  };
}

// ─── Service class ────────────────────────────────────────────────────────────

export class ChatService {
  async completeStream(
    messages: ChatMessage[],
    modelId: string,
    context: string | undefined,
    apiKey: string,
    systemPrompt: string | undefined,
    onDelta: (text: string) => void,
    provider?: string,
  ): Promise<ChatCompletionResult> {
    // Determine provider: use explicit parameter, or look up from hardcoded list, or infer from model ID
    let resolvedProvider = provider;
    if (!resolvedProvider) {
      const modelConfig = AVAILABLE_MODELS.find((m) => m.id === modelId);
      if (modelConfig) {
        resolvedProvider = modelConfig.provider;
      } else {
        // Infer provider from model ID pattern for discovered models not in the hardcoded list
        if (modelId.startsWith('claude-') || modelId.startsWith('anthropic')) resolvedProvider = 'anthropic';
        else if (modelId.startsWith('gpt-') || modelId.startsWith('o1') || modelId.startsWith('o3') || modelId.startsWith('o4')) resolvedProvider = 'openai';
        else if (modelId.startsWith('gemini-')) resolvedProvider = 'google';
        else if (modelId.startsWith('grok-')) resolvedProvider = 'xai';
        else throw new Error(`Unknown model and cannot infer provider: ${modelId}`);
      }
    }

    switch (resolvedProvider) {
      case 'anthropic':
        return handleAnthropicCompletionStream(messages, modelId, context, apiKey, systemPrompt, onDelta);
      case 'openai':
        return handleOpenAICompletionStream(messages, modelId, context, apiKey, systemPrompt, onDelta);
      case 'google':
        return handleGeminiCompletionStream(messages, modelId, context, apiKey, systemPrompt, onDelta);
      case 'xai':
        return handleGrokCompletionStream(messages, modelId, context, apiKey, systemPrompt, onDelta);
      default:
        throw new Error(`Unsupported provider: ${resolvedProvider}`);
    }
  }
}

export const chatService = new ChatService();
