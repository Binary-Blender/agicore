import Anthropic from '@anthropic-ai/sdk';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface AICallOptions {
  provider: 'anthropic' | 'openai' | 'google' | 'xai';
  model: string;
  systemPrompt: string;
  userPrompt: string;
  maxTokens?: number;
  temperature?: number;
  apiKey: string;
  onChunk?: (text: string) => void;
}

export interface AIResponse {
  text: string;
  inputTokens: number;
  outputTokens: number;
}

// ─── Provider handlers ───────────────────────────────────────────────────────

async function callAnthropic(options: AICallOptions): Promise<AIResponse> {
  const client = new Anthropic({ apiKey: options.apiKey });
  const maxTokens = options.maxTokens ?? 2048;
  const temperature = options.temperature ?? 0.3;

  if (options.onChunk) {
    // Streaming
    const stream = client.messages.stream({
      model: options.model,
      max_tokens: maxTokens,
      temperature,
      system: options.systemPrompt,
      messages: [{ role: 'user', content: options.userPrompt }],
    });

    stream.on('text', (text) => options.onChunk!(text));

    const finalMessage = await stream.finalMessage();
    const text =
      finalMessage.content[0]?.type === 'text'
        ? finalMessage.content[0].text
        : '';

    return {
      text,
      inputTokens: finalMessage.usage.input_tokens,
      outputTokens: finalMessage.usage.output_tokens,
    };
  } else {
    // Non-streaming
    const response = await client.messages.create({
      model: options.model,
      max_tokens: maxTokens,
      temperature,
      system: options.systemPrompt,
      messages: [{ role: 'user', content: options.userPrompt }],
    });

    const text =
      response.content[0]?.type === 'text' ? response.content[0].text : '';

    return {
      text,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    };
  }
}

async function callOpenAI(options: AICallOptions): Promise<AIResponse> {
  const maxTokens = options.maxTokens ?? 2048;
  const temperature = options.temperature ?? 0.3;
  const streaming = !!options.onChunk;

  const body: Record<string, unknown> = {
    model: options.model,
    messages: [
      { role: 'system', content: options.systemPrompt },
      { role: 'user', content: options.userPrompt },
    ],
    temperature,
    max_tokens: maxTokens,
    stream: streaming,
  };
  if (streaming) {
    body.stream_options = { include_usage: true };
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${options.apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
  }

  if (streaming) {
    return parseSSEStream(response, options.onChunk!);
  } else {
    const data = (await response.json()) as any;
    return {
      text: data.choices?.[0]?.message?.content ?? '',
      inputTokens: data.usage?.prompt_tokens ?? 0,
      outputTokens: data.usage?.completion_tokens ?? 0,
    };
  }
}

async function callGemini(options: AICallOptions): Promise<AIResponse> {
  const maxTokens = options.maxTokens ?? 2048;
  const temperature = options.temperature ?? 0.3;

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${options.model}:generateContent?key=${options.apiKey}`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: options.userPrompt }] }],
      systemInstruction: { parts: [{ text: options.systemPrompt }] },
      generationConfig: {
        maxOutputTokens: maxTokens,
        temperature,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
  }

  const data = (await response.json()) as any;
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  const inputTokens = data.usageMetadata?.promptTokenCount ?? 0;
  const outputTokens = data.usageMetadata?.candidatesTokenCount ?? 0;

  // Gemini doesn't stream in this pattern — deliver full text as single chunk
  if (options.onChunk) {
    options.onChunk(text);
  }

  return { text, inputTokens, outputTokens };
}

async function callXAI(options: AICallOptions): Promise<AIResponse> {
  const maxTokens = options.maxTokens ?? 2048;
  const temperature = options.temperature ?? 0.3;
  const streaming = !!options.onChunk;

  const body: Record<string, unknown> = {
    model: options.model,
    messages: [
      { role: 'system', content: options.systemPrompt },
      { role: 'user', content: options.userPrompt },
    ],
    temperature,
    max_tokens: maxTokens,
    stream: streaming,
  };

  const response = await fetch('https://api.x.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${options.apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`xAI API error: ${response.status} - ${errorText}`);
  }

  if (streaming) {
    return parseSSEStream(response, options.onChunk!);
  } else {
    const data = (await response.json()) as any;
    return {
      text: data.choices?.[0]?.message?.content ?? '',
      inputTokens: data.usage?.prompt_tokens ?? 0,
      outputTokens: data.usage?.completion_tokens ?? 0,
    };
  }
}

// ─── SSE stream parser (shared by OpenAI and xAI) ───────────────────────────

async function parseSSEStream(
  response: Response,
  onChunk: (text: string) => void,
): Promise<AIResponse> {
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let fullText = '';
  let inputTokens = 0;
  let outputTokens = 0;
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
            fullText += delta;
            onChunk(delta);
          }
          if (data.usage) {
            inputTokens = data.usage.prompt_tokens ?? 0;
            outputTokens = data.usage.completion_tokens ?? 0;
          }
        } catch {
          /* ignore malformed chunks */
        }
      }
    }
  }

  // If usage wasn't reported (some streaming endpoints), estimate from text
  if (inputTokens === 0 && outputTokens === 0) {
    outputTokens = Math.ceil(fullText.length / 4);
  }

  return { text: fullText, inputTokens, outputTokens };
}

// ─── Main entry point ────────────────────────────────────────────────────────

export async function callAI(options: AICallOptions): Promise<AIResponse> {
  switch (options.provider) {
    case 'anthropic':
      return callAnthropic(options);
    case 'openai':
      return callOpenAI(options);
    case 'google':
      return callGemini(options);
    case 'xai':
      return callXAI(options);
    default:
      throw new Error(`Unsupported AI provider: ${options.provider}`);
  }
}

// ─── JSON extraction helper ─────────────────────────────────────────────────

export function extractJSON<T>(text: string): T {
  // Try to find JSON in markdown code fences first
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) return JSON.parse(fenceMatch[1].trim());
  // Try to find raw JSON object
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) return JSON.parse(jsonMatch[0]);
  return JSON.parse(text);
}
