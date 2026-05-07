import { loadApiKeys } from '../config/apiKeyStore';
import { listMessages, sendMessage } from './messageService';
import type { Message } from '../../shared/types';

// ---------------------------------------------------------------------------
// BabyAI / Provider integration for channel AI features
// ---------------------------------------------------------------------------

const BABYAI_URL = 'https://novasynchris-babyai.hf.space';

interface AIResponse {
  text: string;
}

/**
 * Call BabyAI (preferred) or fall back to direct Anthropic API.
 * Uses BYOK keys from the shared NovaSyn key store.
 */
async function callAI(systemPrompt: string, userPrompt: string): Promise<AIResponse> {
  const keys = loadApiKeys();

  // Try BabyAI first if we have a babyai key or HF token
  const babyaiKey = keys.babyai;
  if (babyaiKey) {
    try {
      const response = await fetch(`${BABYAI_URL}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${babyaiKey}`,
        },
        body: JSON.stringify({
          model: 'auto',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          max_tokens: 2048,
          temperature: 0.4,
        }),
      });

      if (response.ok) {
        const data = (await response.json()) as any;
        return { text: data.choices?.[0]?.message?.content ?? '' };
      }
      console.warn('BabyAI call failed, falling back to direct provider');
    } catch (err) {
      console.warn('BabyAI unreachable, falling back to direct provider:', err);
    }
  }

  // Fallback: direct Anthropic API
  const anthropicKey = keys.anthropic;
  if (anthropicKey) {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2048,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Anthropic API error: ${response.status} - ${errorText}`);
    }

    const data = (await response.json()) as any;
    const text = data.content?.[0]?.type === 'text' ? data.content[0].text : '';
    return { text };
  }

  throw new Error('No AI provider available. Configure a BabyAI or Anthropic API key in settings.');
}

// ---------------------------------------------------------------------------
// Channel AI Features
// ---------------------------------------------------------------------------

/**
 * Summarize the last N messages in a channel.
 */
export async function summarizeChannel(
  channelId: string,
  messageCount?: number,
): Promise<string> {
  const count = messageCount || 50;
  const messages = listMessages(channelId, count, 0);

  if (messages.length === 0) {
    return 'No messages to summarize.';
  }

  // Messages come back DESC, reverse for chronological order
  const chronological = [...messages].reverse();
  const transcript = chronological
    .map((m) => `[${m.createdAt}] ${m.senderId}: ${m.content}`)
    .join('\n');

  const result = await callAI(
    'You are a helpful assistant that summarizes team conversations. Be concise but capture all key decisions, action items, and important topics discussed.',
    `Summarize the following team conversation (${messages.length} messages):\n\n${transcript}`,
  );

  return result.text;
}

/**
 * Draft a response based on channel context.
 */
export async function draftResponse(
  channelId: string,
  context?: string,
): Promise<string> {
  const messages = listMessages(channelId, 20, 0);

  const chronological = [...messages].reverse();
  const transcript = chronological
    .map((m) => `${m.senderId}: ${m.content}`)
    .join('\n');

  const additionalContext = context ? `\n\nAdditional context: ${context}` : '';

  const result = await callAI(
    'You are a helpful team member drafting a response to an ongoing conversation. Write a natural, professional reply that addresses the latest messages. Keep it concise.',
    `Here is the recent conversation:\n\n${transcript}${additionalContext}\n\nDraft a response:`,
  );

  return result.text;
}

/**
 * When BabyAI is @mentioned in a channel, generate a response and insert it.
 */
export async function respondToMention(
  channelId: string,
  senderId: string,
  content: string,
): Promise<Message> {
  // Get recent context
  const messages = listMessages(channelId, 10, 0);
  const chronological = [...messages].reverse();
  const transcript = chronological
    .map((m) => `${m.senderId}: ${m.content}`)
    .join('\n');

  const result = await callAI(
    'You are BabyAI, a helpful AI assistant participating in a team channel. You are friendly, concise, and helpful. When asked questions, provide clear answers. When asked to do tasks, explain what you can help with.',
    `Recent conversation:\n\n${transcript}\n\nA team member just said: "${content}"\n\nRespond helpfully:`,
  );

  // Insert the AI response as a message in the channel
  // Use a special "babyai" sender ID — the BabyAI member should be added to channels with is_ai_enabled
  const aiMessage = sendMessage(
    channelId,
    'babyai', // Convention: BabyAI's member ID in AI-enabled channels
    result.text,
    'ai_response',
  );

  return aiMessage;
}
