import https from 'https';
import http from 'http';
import { URL } from 'url';
import { BrowserWindow } from 'electron';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatOptions {
  model: string;
  messages: ChatMessage[];
  apiKeys: Record<string, string>;
  babyaiUrl: string;
  hfToken: string;
  onDelta?: (text: string) => void;
}

function getProvider(model: string): string {
  if (model.startsWith('babyai-')) return 'babyai';
  if (model.startsWith('claude-')) return 'anthropic';
  if (model.startsWith('gpt-')) return 'openai';
  if (model.startsWith('gemini-')) return 'google';
  if (model.startsWith('grok-')) return 'xai';
  throw new Error(`Unknown model provider for model: ${model}`);
}

function makeRequest(
  url: string,
  options: {
    method: string;
    headers: Record<string, string>;
    body: string;
  },
): Promise<{ statusCode: number; stream: NodeJS.ReadableStream }> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const isHttps = parsed.protocol === 'https:';
    const transport = isHttps ? https : http;

    const req = transport.request(
      {
        hostname: parsed.hostname,
        port: parsed.port || (isHttps ? 443 : 80),
        path: parsed.pathname + parsed.search,
        method: options.method,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      },
      (res) => {
        resolve({ statusCode: res.statusCode || 0, stream: res });
      },
    );

    req.on('error', reject);
    req.write(options.body);
    req.end();
  });
}

function emitDelta(text: string, onDelta?: (text: string) => void): void {
  if (text) {
    onDelta?.(text);
    const win = BrowserWindow.getAllWindows()[0];
    if (win) {
      win.webContents.send('chat-delta', text);
    }
  }
}

async function readSSEStream(
  stream: NodeJS.ReadableStream,
  extractContent: (data: any) => string | null,
  onDelta?: (text: string) => void,
): Promise<string> {
  return new Promise((resolve, reject) => {
    let accumulated = '';
    let buffer = '';

    stream.on('data', (chunk: Buffer) => {
      buffer += chunk.toString();
      const lines = buffer.split('\n');
      // Keep the last (potentially incomplete) line in the buffer
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data: ')) continue;
        const payload = trimmed.slice(6);
        if (payload === '[DONE]') continue;

        try {
          const parsed = JSON.parse(payload);
          const content = extractContent(parsed);
          if (content) {
            accumulated += content;
            emitDelta(content, onDelta);
          }
        } catch {
          // Skip malformed JSON lines
        }
      }
    });

    stream.on('end', () => {
      // Process any remaining buffer
      if (buffer.trim().startsWith('data: ')) {
        const payload = buffer.trim().slice(6);
        if (payload !== '[DONE]') {
          try {
            const parsed = JSON.parse(payload);
            const content = extractContent(parsed);
            if (content) {
              accumulated += content;
              emitDelta(content, onDelta);
            }
          } catch {
            // Skip
          }
        }
      }
      resolve(accumulated);
    });

    stream.on('error', reject);
  });
}

async function readErrorBody(stream: NodeJS.ReadableStream): Promise<string> {
  return new Promise((resolve) => {
    let body = '';
    stream.on('data', (chunk: Buffer) => { body += chunk.toString(); });
    stream.on('end', () => resolve(body));
    stream.on('error', () => resolve(body || 'Unknown error'));
  });
}

async function sendBabyAI(options: ChatOptions): Promise<string> {
  const url = `${options.babyaiUrl}/v1/chat/completions`;
  const body = JSON.stringify({
    model: options.model,
    messages: options.messages,
    stream: true,
  });

  const { statusCode, stream } = await makeRequest(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${options.hfToken}`,
    },
    body,
  });

  if (statusCode !== 200) {
    const errBody = await readErrorBody(stream);
    throw new Error(`BabyAI API error (${statusCode}): ${errBody}`);
  }

  return readSSEStream(
    stream,
    (data) => data.choices?.[0]?.delta?.content || null,
    options.onDelta,
  );
}

async function sendAnthropic(options: ChatOptions): Promise<string> {
  // Anthropic Messages API expects system as a top-level param, not in messages
  const systemMessage = options.messages.find((m) => m.role === 'system');
  const nonSystemMessages = options.messages.filter((m) => m.role !== 'system');

  const bodyObj: any = {
    model: options.model,
    max_tokens: 4096,
    messages: nonSystemMessages.map((m) => ({ role: m.role, content: m.content })),
    stream: true,
  };

  if (systemMessage) {
    bodyObj.system = systemMessage.content;
  }

  const body = JSON.stringify(bodyObj);

  const { statusCode, stream } = await makeRequest('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': options.apiKeys.anthropic || '',
      'anthropic-version': '2023-06-01',
    },
    body,
  });

  if (statusCode !== 200) {
    const errBody = await readErrorBody(stream);
    throw new Error(`Anthropic API error (${statusCode}): ${errBody}`);
  }

  return readSSEStream(
    stream,
    (data) => {
      if (data.type === 'content_block_delta') {
        return data.delta?.text || null;
      }
      return null;
    },
    options.onDelta,
  );
}

async function sendOpenAI(options: ChatOptions): Promise<string> {
  const body = JSON.stringify({
    model: options.model,
    messages: options.messages.map((m) => ({ role: m.role, content: m.content })),
    stream: true,
  });

  const { statusCode, stream } = await makeRequest('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${options.apiKeys.openai || ''}`,
    },
    body,
  });

  if (statusCode !== 200) {
    const errBody = await readErrorBody(stream);
    throw new Error(`OpenAI API error (${statusCode}): ${errBody}`);
  }

  return readSSEStream(
    stream,
    (data) => data.choices?.[0]?.delta?.content || null,
    options.onDelta,
  );
}

async function sendGoogle(options: ChatOptions): Promise<string> {
  const apiKey = options.apiKeys.google || '';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${options.model}:streamGenerateContent?key=${apiKey}&alt=sse`;

  // Convert messages to Gemini format
  // System message becomes a system_instruction, others become contents
  const systemMessage = options.messages.find((m) => m.role === 'system');
  const nonSystemMessages = options.messages.filter((m) => m.role !== 'system');

  const contents = nonSystemMessages.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  const bodyObj: any = { contents };
  if (systemMessage) {
    bodyObj.system_instruction = { parts: [{ text: systemMessage.content }] };
  }

  const body = JSON.stringify(bodyObj);

  const { statusCode, stream } = await makeRequest(url, {
    method: 'POST',
    headers: {},
    body,
  });

  if (statusCode !== 200) {
    const errBody = await readErrorBody(stream);
    throw new Error(`Google Gemini API error (${statusCode}): ${errBody}`);
  }

  return readSSEStream(
    stream,
    (data) => data.candidates?.[0]?.content?.parts?.[0]?.text || null,
    options.onDelta,
  );
}

async function sendXAI(options: ChatOptions): Promise<string> {
  const body = JSON.stringify({
    model: options.model,
    messages: options.messages.map((m) => ({ role: m.role, content: m.content })),
    stream: true,
  });

  const { statusCode, stream } = await makeRequest('https://api.x.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${options.apiKeys.xai || ''}`,
    },
    body,
  });

  if (statusCode !== 200) {
    const errBody = await readErrorBody(stream);
    throw new Error(`xAI API error (${statusCode}): ${errBody}`);
  }

  return readSSEStream(
    stream,
    (data) => data.choices?.[0]?.delta?.content || null,
    options.onDelta,
  );
}

export async function sendChatRequest(options: ChatOptions): Promise<string> {
  const provider = getProvider(options.model);

  switch (provider) {
    case 'babyai':
      return sendBabyAI(options);
    case 'anthropic':
      return sendAnthropic(options);
    case 'openai':
      return sendOpenAI(options);
    case 'google':
      return sendGoogle(options);
    case 'xai':
      return sendXAI(options);
    default:
      throw new Error(`Unsupported provider: ${provider}`);
  }
}
