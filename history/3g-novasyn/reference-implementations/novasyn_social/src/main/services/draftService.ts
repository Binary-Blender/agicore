import { callAI, AICallOptions } from './aiService';

// ─── Types ───────────────────────────────────────────────────────────────────

export type ResponseMode = 'standard' | 'agree_amplify' | 'educate' | 'battle';

export interface DraftOptions {
  originalMessage: string;
  senderName: string | null;
  channelType: string;
  subject: string | null;
  responseMode: ResponseMode;
  classification?: {
    opportunityType: string;
    sentiment: string;
    intent: string;
    hostilityLevel: number;
  };
  apiKey: string;
  provider: string;
  model: string;
  onChunk?: (text: string) => void;
  ragContext?: string; // Injected KB context from knowledgeBaseService
}

export interface DraftResult {
  draftText: string;
  rationale: string;
  inputTokens: number;
  outputTokens: number;
}

// ─── System prompts per response mode ────────────────────────────────────────

const SYSTEM_PROMPTS: Record<ResponseMode, string> = {
  standard: `You are a professional communication assistant writing a response in AI-enhanced style.

STYLE RULES:
- Use emojis appropriately (1-3 per message, not excessive)
- Use em-dashes for asides and emphasis
- Keep a warm, professional, polished tone
- Be concise but substantive
- Open with a warm greeting
- Close with a clear next step or call to action

Write ONLY the response text. After the response, on a new line write "RATIONALE: " followed by a one-sentence explanation of your approach.`,

  agree_amplify: `You are a professional communication assistant writing an enthusiastic public comment that agrees with and amplifies the original post.

STYLE RULES:
- Open with strong agreement (e.g., "Absolutely!", "This is spot on!", "100% this!")
- Use emojis more liberally (2-4)
- Add a DISTINCTIVE insight — don't just agree, extend the argument with something new
- Keep it to 2-3 short paragraphs max (this is a comment, not an essay)
- Use em-dashes for emphasis
- End with energy, not a question

Write ONLY the comment text. After the comment, on a new line write "RATIONALE: " followed by a one-sentence explanation.`,

  educate: `You are a professional communication assistant writing a polite correction using the "compliment sandwich" structure.

STYLE RULES:
- LAYER 1 (Compliment): Open by genuinely acknowledging what's good about their point
- LAYER 2 (Educate): Gently introduce the correction or missing perspective with evidence
- LAYER 3 (Wrap): Close warmly, acknowledging the value of the discussion
- Use a respectful, collegial tone throughout
- Use 1-2 emojis maximum (thumbs up, handshake)
- Never be condescending or sarcastic
- Cite specific facts or data if correcting a factual error

Write ONLY the response text. After the response, on a new line write "RATIONALE: " followed by a one-sentence explanation.`,

  battle: `You are writing a professional rebuttal. This must sound completely human — no AI tells whatsoever.

STYLE RULES:
- NO emojis. None. Zero.
- NO em-dashes (use commas or periods instead)
- NO exclamation marks (period. always period.)
- Write in a calm, measured, confident tone
- Structure the argument logically: acknowledge their point, identify the flaw, present your counter-argument with evidence, conclude
- Use short, declarative sentences
- Sound like a thoughtful professional, not a chatbot
- If they're hostile, do not match their energy — be cooler, calmer, and more precise
- The goal is to be so clearly correct that the reader sides with you

Write ONLY the response text. After the response, on a new line write "RATIONALE: " followed by a one-sentence explanation.`,
};

// ─── Response mode display names ─────────────────────────────────────────────

const MODE_LABELS: Record<ResponseMode, string> = {
  standard: 'standard',
  agree_amplify: 'agree & amplify',
  educate: 'educate (compliment sandwich)',
  battle: 'battle (human rebuttal)',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildUserPrompt(options: DraftOptions): string {
  const senderName = options.senderName ?? 'Unknown';
  const subject = options.subject ?? '(none)';
  const modeLabel = MODE_LABELS[options.responseMode];

  let classificationBlock = '';
  if (options.classification) {
    classificationBlock = `Classification: ${options.classification.opportunityType}, ${options.classification.sentiment} sentiment, ${options.classification.intent} intent
Hostility level: ${options.classification.hostilityLevel}`;
  }

  const ragBlock = options.ragContext || '';

  return `Original message from ${senderName} on ${options.channelType}:
Subject: ${subject}

"${options.originalMessage}"

${classificationBlock}
${ragBlock}

Write a ${modeLabel} response.`;
}

function parseRationale(fullText: string): { draftText: string; rationale: string } {
  const rationaleMarker = 'RATIONALE: ';
  const lastIndex = fullText.lastIndexOf(rationaleMarker);

  if (lastIndex === -1) {
    return {
      draftText: fullText.trim(),
      rationale: 'No rationale provided.',
    };
  }

  const draftText = fullText.substring(0, lastIndex).trim();
  const rationale = fullText.substring(lastIndex + rationaleMarker.length).trim();

  return { draftText, rationale };
}

// ─── Main draft generation function ──────────────────────────────────────────

export async function generateDraft(options: DraftOptions): Promise<DraftResult> {
  const systemPrompt = SYSTEM_PROMPTS[options.responseMode];
  if (!systemPrompt) {
    throw new Error(`Unknown response mode: ${options.responseMode}`);
  }

  const userPrompt = buildUserPrompt(options);

  const aiOptions: AICallOptions = {
    provider: options.provider as AICallOptions['provider'],
    model: options.model,
    systemPrompt,
    userPrompt,
    maxTokens: 1024,
    temperature: 0.7,
    apiKey: options.apiKey,
    onChunk: options.onChunk,
  };

  const response = await callAI(aiOptions);
  const { draftText, rationale } = parseRationale(response.text);

  return {
    draftText,
    rationale,
    inputTokens: response.inputTokens,
    outputTokens: response.outputTokens,
  };
}
