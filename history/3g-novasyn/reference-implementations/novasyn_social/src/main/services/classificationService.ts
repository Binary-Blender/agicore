import { callAI, extractJSON, AICallOptions } from './aiService';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ClassificationResult {
  opportunityType: string;
  sentiment: string;
  intent: string;
  topicAlignment: number;
  hostilityLevel: number;
  confidence: number;
  explanation: string;
}

// ─── System prompt ───────────────────────────────────────────────────────────

const CLASSIFICATION_SYSTEM_PROMPT = `You are a message classifier for a communication management system. Analyze the following message and classify it.

Respond with ONLY a JSON object — no other text:

{
  "opportunity_type": "job" | "partnership" | "sales_lead" | "social" | "logistics" | "spam" | "unknown",
  "sentiment": "positive" | "neutral" | "negative" | "hostile",
  "intent": "informational" | "promotional" | "confrontational" | "inquiry",
  "topic_alignment": <0.0-1.0, how relevant to the user's professional interests>,
  "hostility_level": <0.0-1.0, level of hostility or aggression>,
  "confidence": <0.0-1.0, your confidence in this classification>,
  "explanation": "<brief one-sentence explanation of why you classified it this way>"
}

Classification rules:
- JOB_OPPORTUNITY: direct job offers, recruiter outreach, contract opportunities
- PARTNERSHIP: collaboration requests, co-creation proposals, strategic alliances
- SALES_LEAD: potential customer inquiries, service requests, buying signals
- SOCIAL: networking, community engagement, personal messages
- LOGISTICS: scheduling, invoicing, administrative, follow-ups
- SPAM: unsolicited marketing, irrelevant mass messages
- UNKNOWN: cannot determine with confidence

Sentiment rules:
- HOSTILE: personal attacks, threats, aggressive confrontation
- NEGATIVE: complaints, criticism, disagreement (but not aggressive)
- NEUTRAL: factual, informational, no strong emotion
- POSITIVE: praise, enthusiasm, agreement, gratitude

Intent rules:
- CONFRONTATIONAL: challenging, debating, attacking a position
- PROMOTIONAL: selling, marketing, self-promotion
- INQUIRY: asking questions, seeking information
- INFORMATIONAL: sharing information, updates, announcements`;

// ─── Valid values for validation ─────────────────────────────────────────────

const VALID_OPPORTUNITY_TYPES = [
  'job',
  'partnership',
  'sales_lead',
  'social',
  'logistics',
  'spam',
  'unknown',
];
const VALID_SENTIMENTS = ['positive', 'neutral', 'negative', 'hostile'];
const VALID_INTENTS = [
  'informational',
  'promotional',
  'confrontational',
  'inquiry',
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function validateClassification(raw: any): ClassificationResult {
  const opportunityType = VALID_OPPORTUNITY_TYPES.includes(
    raw.opportunity_type,
  )
    ? raw.opportunity_type
    : 'unknown';

  const sentiment = VALID_SENTIMENTS.includes(raw.sentiment)
    ? raw.sentiment
    : 'neutral';

  const intent = VALID_INTENTS.includes(raw.intent)
    ? raw.intent
    : 'informational';

  const topicAlignment = clamp(
    typeof raw.topic_alignment === 'number' ? raw.topic_alignment : 0.5,
    0,
    1,
  );

  const hostilityLevel = clamp(
    typeof raw.hostility_level === 'number' ? raw.hostility_level : 0,
    0,
    1,
  );

  const confidence = clamp(
    typeof raw.confidence === 'number' ? raw.confidence : 0.5,
    0,
    1,
  );

  const explanation =
    typeof raw.explanation === 'string' && raw.explanation.length > 0
      ? raw.explanation
      : 'Classification completed without explanation.';

  return {
    opportunityType,
    sentiment,
    intent,
    topicAlignment,
    hostilityLevel,
    confidence,
    explanation,
  };
}

// ─── Main classification function ────────────────────────────────────────────

export async function classifyMessage(
  body: string,
  senderName: string | null,
  senderHandle: string | null,
  channelType: string,
  subject: string | null,
  apiKey: string,
  provider: string,
  model: string,
): Promise<ClassificationResult> {
  const userPrompt = `Channel: ${channelType}
From: ${senderName ?? 'Unknown'} (${senderHandle ?? 'unknown'})
Subject: ${subject ?? '(none)'}

Message:
${body}`;

  const aiOptions: AICallOptions = {
    provider: provider as AICallOptions['provider'],
    model,
    systemPrompt: CLASSIFICATION_SYSTEM_PROMPT,
    userPrompt,
    maxTokens: 512,
    temperature: 0.1,
    apiKey,
  };

  const response = await callAI(aiOptions);

  const raw = extractJSON<any>(response.text);
  return validateClassification(raw);
}
