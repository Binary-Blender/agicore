// NovaSyn Council — AI Service
// Multi-provider AI communication with streaming support

import Anthropic from '@anthropic-ai/sdk';
import type { Persona, SkillDoc, Memory, Relationship, SuggestedRelationship } from '../../shared/types';
import { AVAILABLE_MODELS } from '../models';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface AIResponse {
  content: string;
  tokensIn: number;
  tokensOut: number;
  cost: number;
  modelUsed: string;
  responseTimeMs: number;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

// ─── Cost Table ──────────────────────────────────────────────────────────────

const COST_PER_MILLION: Record<string, { input: number; output: number }> = {
  'claude-sonnet-4-20250514': { input: 3.00, output: 15.00 },
  'claude-haiku-4-5-20251001': { input: 0.80, output: 4.00 },
  'claude-opus-4-6': { input: 15.00, output: 75.00 },
  'gpt-4o': { input: 2.50, output: 10.00 },
  'gpt-4o-mini': { input: 0.15, output: 0.60 },
  'gpt-4.1': { input: 2.00, output: 8.00 },
  'gemini-2.5-flash': { input: 0.15, output: 0.60 },
  'gemini-2.5-pro': { input: 1.25, output: 10.00 },
  'grok-3': { input: 3.00, output: 15.00 },
  'grok-3-mini': { input: 0.30, output: 0.50 },
  // BabyAI (free — HuggingFace Space)
  'babyai-auto': { input: 0, output: 0 },
  'hf_qwen_coder_7b': { input: 0, output: 0 },
  'hf_llama_8b': { input: 0, output: 0 },
  'hf_qwen3_8b': { input: 0, output: 0 },
  'hf_deepseek_r1_7b': { input: 0, output: 0 },
};

function calculateCost(model: string, tokensIn: number, tokensOut: number): number {
  const pricing = COST_PER_MILLION[model];
  if (!pricing) return 0;
  return (tokensIn / 1_000_000) * pricing.input + (tokensOut / 1_000_000) * pricing.output;
}

// ─── Context Building ────────────────────────────────────────────────────────

function buildSystemPrompt(persona: Persona, skillDocs: SkillDoc[], memories: Memory[]): string {
  const parts: string[] = [persona.systemPrompt];

  // Skill docs
  const loadedDocs = skillDocs.filter(d => d.loadingRule === 'always' || d.loadingRule === 'available');
  if (loadedDocs.length > 0) {
    parts.push('\n\n--- YOUR KNOWLEDGE ---\n');
    for (const doc of loadedDocs) {
      parts.push(`[SKILL DOC: ${doc.title}]\n${doc.content}\n`);
    }
  }

  // Memories
  const activeMemories = memories.filter(m => !m.supersededBy);
  if (activeMemories.length > 0) {
    parts.push('\n\n--- YOUR MEMORIES ---\n');
    for (const mem of activeMemories) {
      parts.push(`[MEMORY: ${mem.memoryType}] ${mem.content}`);
    }
  }

  // Context
  parts.push('\n\n--- CURRENT CONTEXT ---\n');
  parts.push('You are in a solo conversation with the user.');

  return parts.join('\n');
}

// ─── SSE Stream Parser ──────────────────────────────────────────────────────

async function parseSSEStream(
  response: Response,
  extractChunk: (data: any) => string,
  extractUsage: (data: any) => { tokensIn: number; tokensOut: number } | null,
  onChunk?: (text: string) => void,
): Promise<{ content: string; tokensIn: number; tokensOut: number }> {
  const reader = (response.body as any).getReader();
  const decoder = new TextDecoder();
  let content = '';
  let tokensIn = 0;
  let tokensOut = 0;
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('data: ') && trimmed !== 'data: [DONE]') {
        try {
          const data = JSON.parse(trimmed.slice(6));
          const chunk = extractChunk(data);
          if (chunk) {
            content += chunk;
            onChunk?.(chunk);
          }
          const usage = extractUsage(data);
          if (usage) {
            tokensIn = usage.tokensIn;
            tokensOut = usage.tokensOut;
          }
        } catch {}
      }
    }
  }

  return { content, tokensIn, tokensOut };
}

// ─── Provider Handlers ───────────────────────────────────────────────────────

async function handleAnthropic(
  systemPrompt: string,
  messages: ChatMessage[],
  modelId: string,
  temperature: number,
  apiKey: string,
  onChunk?: (text: string) => void,
): Promise<AIResponse> {
  const startTime = Date.now();
  const client = new Anthropic({ apiKey });

  if (onChunk) {
    // Streaming mode
    const stream = client.messages.stream({
      model: modelId,
      max_tokens: 4096,
      system: systemPrompt,
      temperature,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
    });

    stream.on('text', (text) => onChunk(text));
    const finalMessage = await stream.finalMessage();

    const content = finalMessage.content[0]?.type === 'text' ? finalMessage.content[0].text : '';
    const tokensIn = finalMessage.usage.input_tokens;
    const tokensOut = finalMessage.usage.output_tokens;

    return {
      content,
      tokensIn,
      tokensOut,
      cost: calculateCost(modelId, tokensIn, tokensOut),
      modelUsed: modelId,
      responseTimeMs: Date.now() - startTime,
    };
  }

  // Non-streaming
  const response = await client.messages.create({
    model: modelId,
    max_tokens: 4096,
    system: systemPrompt,
    temperature,
    messages: messages.map(m => ({ role: m.role, content: m.content })),
  });

  const content = response.content[0]?.type === 'text' ? response.content[0].text : '';
  const tokensIn = response.usage.input_tokens;
  const tokensOut = response.usage.output_tokens;

  return {
    content,
    tokensIn,
    tokensOut,
    cost: calculateCost(modelId, tokensIn, tokensOut),
    modelUsed: modelId,
    responseTimeMs: Date.now() - startTime,
  };
}

async function handleOpenAI(
  systemPrompt: string,
  messages: ChatMessage[],
  modelId: string,
  temperature: number,
  apiKey: string,
  onChunk?: (text: string) => void,
): Promise<AIResponse> {
  const startTime = Date.now();

  const finalMessages = [
    { role: 'system', content: systemPrompt },
    ...messages.map(m => ({ role: m.role, content: m.content })),
  ];

  const body: Record<string, unknown> = {
    model: modelId,
    messages: finalMessages,
    stream: !!onChunk,
  };

  const isReasoningModel = /^o\d/.test(modelId);
  if (isReasoningModel) {
    body.max_completion_tokens = 16384;
  } else {
    body.temperature = temperature;
    body.max_tokens = 4096;
  }

  if (onChunk) {
    body.stream_options = { include_usage: true };
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
  }

  if (onChunk) {
    const { content, tokensIn, tokensOut } = await parseSSEStream(
      response,
      (data) => data.choices?.[0]?.delta?.content || '',
      (data) => data.usage ? { tokensIn: data.usage.prompt_tokens || 0, tokensOut: data.usage.completion_tokens || 0 } : null,
      onChunk,
    );

    return {
      content,
      tokensIn,
      tokensOut,
      cost: calculateCost(modelId, tokensIn, tokensOut),
      modelUsed: modelId,
      responseTimeMs: Date.now() - startTime,
    };
  }

  const data: any = await response.json();
  const content = data.choices?.[0]?.message?.content || '';
  const tokensIn = data.usage?.prompt_tokens || 0;
  const tokensOut = data.usage?.completion_tokens || 0;

  return {
    content,
    tokensIn,
    tokensOut,
    cost: calculateCost(modelId, tokensIn, tokensOut),
    modelUsed: modelId,
    responseTimeMs: Date.now() - startTime,
  };
}

async function handleGemini(
  systemPrompt: string,
  messages: ChatMessage[],
  modelId: string,
  temperature: number,
  apiKey: string,
  onChunk?: (text: string) => void,
): Promise<AIResponse> {
  const startTime = Date.now();

  const requestBody: Record<string, unknown> = {
    contents: messages.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    })),
    generationConfig: {
      temperature,
      maxOutputTokens: 4096,
    },
  };

  if (systemPrompt.trim()) {
    requestBody.systemInstruction = {
      parts: [{ text: systemPrompt.trim() }],
    };
  }

  const action = onChunk ? 'streamGenerateContent?alt=sse' : 'generateContent';
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:${action}&key=${apiKey}`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
  }

  if (onChunk) {
    let finalTokensIn = 0;
    let finalTokensOut = 0;

    const { content } = await parseSSEStream(
      response,
      (data) => data.candidates?.[0]?.content?.parts?.[0]?.text || '',
      (data) => {
        if (data.usageMetadata) {
          finalTokensIn = data.usageMetadata.promptTokenCount || 0;
          finalTokensOut = data.usageMetadata.candidatesTokenCount || 0;
        }
        return null;
      },
      onChunk,
    );

    return {
      content,
      tokensIn: finalTokensIn,
      tokensOut: finalTokensOut,
      cost: calculateCost(modelId, finalTokensIn, finalTokensOut),
      modelUsed: modelId,
      responseTimeMs: Date.now() - startTime,
    };
  }

  const data: any = await response.json();
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  const tokensIn = data.usageMetadata?.promptTokenCount || 0;
  const tokensOut = data.usageMetadata?.candidatesTokenCount || 0;

  return {
    content,
    tokensIn,
    tokensOut,
    cost: calculateCost(modelId, tokensIn, tokensOut),
    modelUsed: modelId,
    responseTimeMs: Date.now() - startTime,
  };
}

async function handleXAI(
  systemPrompt: string,
  messages: ChatMessage[],
  modelId: string,
  temperature: number,
  apiKey: string,
  onChunk?: (text: string) => void,
): Promise<AIResponse> {
  const startTime = Date.now();

  const finalMessages = [
    { role: 'system', content: systemPrompt },
    ...messages.map(m => ({ role: m.role, content: m.content })),
  ];

  const body: Record<string, unknown> = {
    model: modelId,
    messages: finalMessages,
    temperature,
    stream: !!onChunk,
  };

  if (onChunk) {
    body.stream_options = { include_usage: true };
  }

  const response = await fetch('https://api.x.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`xAI API error: ${response.status} - ${errorText}`);
  }

  if (onChunk) {
    const { content, tokensIn, tokensOut } = await parseSSEStream(
      response,
      (data) => data.choices?.[0]?.delta?.content || '',
      (data) => data.usage ? { tokensIn: data.usage.prompt_tokens || 0, tokensOut: data.usage.completion_tokens || 0 } : null,
      onChunk,
    );

    return {
      content,
      tokensIn,
      tokensOut,
      cost: calculateCost(modelId, tokensIn, tokensOut),
      modelUsed: modelId,
      responseTimeMs: Date.now() - startTime,
    };
  }

  const data: any = await response.json();
  const content = data.choices?.[0]?.message?.content || '';
  const tokensIn = data.usage?.prompt_tokens || 0;
  const tokensOut = data.usage?.completion_tokens || 0;

  return {
    content,
    tokensIn,
    tokensOut,
    cost: calculateCost(modelId, tokensIn, tokensOut),
    modelUsed: modelId,
    responseTimeMs: Date.now() - startTime,
  };
}

async function handleBabyAI(
  systemPrompt: string,
  messages: ChatMessage[],
  modelId: string,
  temperature: number,
  apiKey: string,
  onChunk?: (text: string) => void,
): Promise<AIResponse> {
  const startTime = Date.now();

  // Map model IDs: babyai-auto sends "auto", others send their ID directly
  const apiModel = modelId === 'babyai-auto' ? 'auto' : modelId;

  const finalMessages = [
    { role: 'system', content: systemPrompt },
    ...messages.map(m => ({ role: m.role, content: m.content })),
  ];

  const body: Record<string, unknown> = {
    model: apiModel,
    messages: finalMessages,
    temperature,
    max_tokens: 4096,
    stream: false, // BabyAI does not support streaming
  };

  const response = await fetch('https://novasynchris-babyai.hf.space/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`BabyAI API error: ${response.status} - ${errorText}`);
  }

  const data: any = await response.json();
  const content = data.choices?.[0]?.message?.content || '';
  const tokensIn = data.usage?.prompt_tokens || 0;
  const tokensOut = data.usage?.completion_tokens || 0;

  // Deliver the full response as a single chunk for streaming UI compatibility
  if (onChunk) {
    onChunk(content);
  }

  return {
    content,
    tokensIn,
    tokensOut,
    cost: calculateCost(modelId, tokensIn, tokensOut),
    modelUsed: modelId,
    responseTimeMs: Date.now() - startTime,
  };
}

// ─── Memory Extraction ───────────────────────────────────────────────────────

export interface ExtractedMemory {
  type: string;
  content: string;
  importance: number;
  relevanceTags: string[];
}

const EXTRACTION_PROMPT = `Analyze this conversation and extract key memories worth remembering for future interactions. For each memory, provide:
- type: one of 'decision', 'lesson', 'fact', 'preference', 'insight', 'correction'
- content: the memory text (1-2 clear sentences)
- importance: 0.0-1.0 (how critical is this to remember)
- relevanceTags: array of topic tags for matching later

Only extract genuinely important information — decisions made, lessons learned, user preferences stated, key facts revealed, useful insights, or corrections to prior assumptions. Do NOT extract trivial conversation filler.

Return ONLY a JSON array with no markdown formatting. Example:
[{"type":"decision","content":"Decided to use PostgreSQL over MongoDB","importance":0.8,"relevanceTags":["database","architecture"]}]

If there are no memories worth extracting, return an empty array: []`;

export async function extractMemories(
  transcript: string,
  modelId: string,
  apiKeys: Record<string, string>,
): Promise<ExtractedMemory[]> {
  const modelConfig = AVAILABLE_MODELS.find(m => m.id === modelId);
  if (!modelConfig) throw new Error(`Unknown model: ${modelId}`);

  const apiKey = apiKeys[modelConfig.provider];
  if (!apiKey) throw new Error(`No API key for ${modelConfig.provider}`);

  const messages: ChatMessage[] = [
    { role: 'user', content: `Here is the conversation transcript:\n\n${transcript}` },
  ];

  let response: AIResponse;
  switch (modelConfig.provider) {
    case 'anthropic':
      response = await handleAnthropic(EXTRACTION_PROMPT, messages, modelId, 0.3, apiKey);
      break;
    case 'openai':
      response = await handleOpenAI(EXTRACTION_PROMPT, messages, modelId, 0.3, apiKey);
      break;
    case 'google':
      response = await handleGemini(EXTRACTION_PROMPT, messages, modelId, 0.3, apiKey);
      break;
    case 'xai':
      response = await handleXAI(EXTRACTION_PROMPT, messages, modelId, 0.3, apiKey);
      break;
    case 'babyai':
      response = await handleBabyAI(EXTRACTION_PROMPT, messages, modelId, 0.3, apiKey);
      break;
    default:
      throw new Error(`Unsupported provider: ${modelConfig.provider}`);
  }

  // Parse the JSON response
  try {
    const text = response.content.trim();
    // Handle potential markdown code block wrapping
    const jsonStr = text.startsWith('[') ? text : text.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
    const parsed = JSON.parse(jsonStr);
    if (!Array.isArray(parsed)) return [];

    return parsed.map((m: any) => ({
      type: m.type || 'fact',
      content: m.content || '',
      importance: Math.min(1, Math.max(0, Number(m.importance) || 0.5)),
      relevanceTags: Array.isArray(m.relevanceTags) ? m.relevanceTags : [],
    })).filter((m: ExtractedMemory) => m.content.length > 0);
  } catch {
    console.error('Failed to parse memory extraction response:', response.content);
    return [];
  }
}

// ─── Meeting Intelligence ───────────────────────────────────────────────────

export interface MeetingAnalysis {
  consensus: { point: string; support: string }[];
  disagreements: { topic: string; sides: string }[];
  insights: string[];
  missingPerspectives: string[];
  actionItems: { assignee: string; task: string; priority: 'high' | 'medium' | 'low' }[];
  summary: string;
}

const MEETING_ANALYSIS_PROMPT = `You are a meeting intelligence analyst. Analyze this meeting transcript and produce a structured analysis.

Return ONLY a JSON object (no markdown formatting) with these fields:

{
  "consensus": [{"point": "what they agree on", "support": "who supports it and why"}],
  "disagreements": [{"topic": "the disagreement topic", "sides": "who disagrees and their positions"}],
  "insights": ["connections, patterns, or observations that might be missed"],
  "missingPerspectives": ["blind spots, unaddressed concerns, or missing viewpoints"],
  "actionItems": [{"assignee": "persona name or 'User'", "task": "what they should do", "priority": "high|medium|low"}],
  "summary": "2-3 sentence executive summary of the meeting"
}

Guidelines:
- Only include genuine consensus (2+ participants agreeing), not just one person's opinion
- Disagreements should be substantive, not trivial
- Insights should surface non-obvious connections between different participants' contributions
- Missing perspectives should identify blind spots in the discussion
- Action items should be concrete and assigned to specific participants when possible
- Be concise but specific — use participant names
- If any category has no entries, use an empty array`;

export async function analyzeMeeting(
  transcript: string,
  modelId: string,
  apiKeys: Record<string, string>,
): Promise<MeetingAnalysis> {
  const modelConfig = AVAILABLE_MODELS.find(m => m.id === modelId);
  if (!modelConfig) throw new Error(`Unknown model: ${modelId}`);

  const apiKey = apiKeys[modelConfig.provider];
  if (!apiKey) throw new Error(`No API key for ${modelConfig.provider}`);

  const messages: ChatMessage[] = [
    { role: 'user', content: `Here is the meeting transcript:\n\n${transcript}` },
  ];

  let response: AIResponse;
  switch (modelConfig.provider) {
    case 'anthropic':
      response = await handleAnthropic(MEETING_ANALYSIS_PROMPT, messages, modelId, 0.3, apiKey);
      break;
    case 'openai':
      response = await handleOpenAI(MEETING_ANALYSIS_PROMPT, messages, modelId, 0.3, apiKey);
      break;
    case 'google':
      response = await handleGemini(MEETING_ANALYSIS_PROMPT, messages, modelId, 0.3, apiKey);
      break;
    case 'xai':
      response = await handleXAI(MEETING_ANALYSIS_PROMPT, messages, modelId, 0.3, apiKey);
      break;
    case 'babyai':
      response = await handleBabyAI(MEETING_ANALYSIS_PROMPT, messages, modelId, 0.3, apiKey);
      break;
    default:
      throw new Error(`Unsupported provider: ${modelConfig.provider}`);
  }

  try {
    const text = response.content.trim();
    const jsonStr = text.startsWith('{') ? text : text.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
    const parsed = JSON.parse(jsonStr);

    return {
      consensus: Array.isArray(parsed.consensus) ? parsed.consensus : [],
      disagreements: Array.isArray(parsed.disagreements) ? parsed.disagreements : [],
      insights: Array.isArray(parsed.insights) ? parsed.insights : [],
      missingPerspectives: Array.isArray(parsed.missingPerspectives) ? parsed.missingPerspectives : [],
      actionItems: Array.isArray(parsed.actionItems) ? parsed.actionItems.map((a: any) => ({
        assignee: a.assignee || 'Unassigned',
        task: a.task || '',
        priority: ['high', 'medium', 'low'].includes(a.priority) ? a.priority : 'medium',
      })).filter((a: any) => a.task) : [],
      summary: parsed.summary || '',
    };
  } catch {
    console.error('Failed to parse meeting analysis response:', response.content);
    return {
      consensus: [],
      disagreements: [],
      insights: [],
      missingPerspectives: [],
      actionItems: [],
      summary: 'Failed to analyze meeting transcript.',
    };
  }
}

// ─── Relationship Suggestion ─────────────────────────────────────────────────

const RELATIONSHIP_PROMPT = `You are analyzing a meeting transcript to understand the interpersonal dynamics between AI personas. Based on their interactions, suggest relationship definitions.

Relationship types:
- ally: Strong agreement, mutual support, complementary skills
- rival: Frequent disagreement, competing approaches, tension
- mentor: One guides/teaches the other
- mentee: One learns from/defers to the other
- collaborator: Work well together on shared goals
- challenger: Constructively pushes back, plays devil's advocate
- neutral: No strong dynamic yet

For each relationship, provide:
- personaId: ID of the first persona
- relatedPersonaId: ID of the second persona
- relationshipType: one of the types above
- description: 1-2 sentence description of the relationship dynamic (e.g. "Alex respects Morgan's technical depth but pushes back on aggressive timelines")
- dynamic: brief note on how they interact (e.g. "constructive tension", "mutual respect", "complementary perspectives")
- strength: 0.0-1.0 (how strong/evident is this relationship)
- reason: why you're suggesting this based on the transcript

Only suggest relationships where there's clear evidence in the transcript. Don't force relationships between personas who barely interacted.

Return ONLY a JSON array with no markdown formatting. Return empty array [] if no clear relationships emerged.`;

export async function suggestRelationships(
  transcript: string,
  participants: { id: string; name: string; role: string }[],
  existingRelationships: Relationship[],
  modelId: string,
  apiKeys: Record<string, string>,
): Promise<SuggestedRelationship[]> {
  const modelConfig = AVAILABLE_MODELS.find(m => m.id === modelId);
  if (!modelConfig) throw new Error(`Unknown model: ${modelId}`);

  const apiKey = apiKeys[modelConfig.provider];
  if (!apiKey) throw new Error(`No API key for ${modelConfig.provider}`);

  const participantInfo = participants.map(p => `- ${p.name} (${p.role}): ID=${p.id}`).join('\n');
  const existingInfo = existingRelationships.length > 0
    ? '\n\nExisting relationships (update or confirm these if relevant):\n' +
      existingRelationships.map(r => {
        const p1 = participants.find(p => p.id === r.personaId);
        const p2 = participants.find(p => p.id === r.relatedPersonaId);
        return `- ${p1?.name || r.personaId} → ${p2?.name || r.relatedPersonaId}: ${r.relationshipType} (${r.description})`;
      }).join('\n')
    : '';

  const userContent = `Participants:\n${participantInfo}${existingInfo}\n\nMeeting transcript:\n\n${transcript}`;

  const messages: ChatMessage[] = [{ role: 'user', content: userContent }];

  let response: AIResponse;
  switch (modelConfig.provider) {
    case 'anthropic':
      response = await handleAnthropic(RELATIONSHIP_PROMPT, messages, modelId, 0.3, apiKey);
      break;
    case 'openai':
      response = await handleOpenAI(RELATIONSHIP_PROMPT, messages, modelId, 0.3, apiKey);
      break;
    case 'google':
      response = await handleGemini(RELATIONSHIP_PROMPT, messages, modelId, 0.3, apiKey);
      break;
    case 'xai':
      response = await handleXAI(RELATIONSHIP_PROMPT, messages, modelId, 0.3, apiKey);
      break;
    case 'babyai':
      response = await handleBabyAI(RELATIONSHIP_PROMPT, messages, modelId, 0.3, apiKey);
      break;
    default:
      throw new Error(`Unsupported provider: ${modelConfig.provider}`);
  }

  try {
    const text = response.content.trim();
    const jsonStr = text.startsWith('[') ? text : text.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
    const parsed = JSON.parse(jsonStr);
    if (!Array.isArray(parsed)) return [];

    const validTypes = ['ally', 'rival', 'mentor', 'mentee', 'collaborator', 'challenger', 'neutral'];
    const validIds = new Set(participants.map(p => p.id));

    return parsed
      .filter((s: any) => s.personaId && s.relatedPersonaId && validIds.has(s.personaId) && validIds.has(s.relatedPersonaId) && s.personaId !== s.relatedPersonaId)
      .map((s: any) => ({
        personaId: s.personaId,
        relatedPersonaId: s.relatedPersonaId,
        relationshipType: validTypes.includes(s.relationshipType) ? s.relationshipType : 'neutral',
        description: s.description || '',
        dynamic: s.dynamic || '',
        strength: Math.min(1, Math.max(0, Number(s.strength) || 0.5)),
        reason: s.reason || '',
      }));
  } catch {
    console.error('Failed to parse relationship suggestions:', response.content);
    return [];
  }
}

// ─── Main Entry Point ────────────────────────────────────────────────────────

export async function sendPersonaMessage(
  persona: Persona,
  messages: ChatMessage[],
  skillDocs: SkillDoc[],
  memories: Memory[],
  apiKeys: Record<string, string>,
  onChunk?: (text: string) => void,
): Promise<AIResponse> {
  const modelConfig = AVAILABLE_MODELS.find(m => m.id === persona.model);
  if (!modelConfig) {
    throw new Error(`Unknown model: ${persona.model}`);
  }

  const apiKey = apiKeys[modelConfig.provider];
  if (!apiKey) {
    throw new Error(`No API key configured for ${modelConfig.provider}. Add your ${modelConfig.provider} key in Settings.`);
  }

  const systemPrompt = buildSystemPrompt(persona, skillDocs, memories);

  switch (modelConfig.provider) {
    case 'anthropic':
      return handleAnthropic(systemPrompt, messages, persona.model, persona.temperature, apiKey, onChunk);
    case 'openai':
      return handleOpenAI(systemPrompt, messages, persona.model, persona.temperature, apiKey, onChunk);
    case 'google':
      return handleGemini(systemPrompt, messages, persona.model, persona.temperature, apiKey, onChunk);
    case 'xai':
      return handleXAI(systemPrompt, messages, persona.model, persona.temperature, apiKey, onChunk);
    case 'babyai':
      return handleBabyAI(systemPrompt, messages, persona.model, persona.temperature, apiKey, onChunk);
    default:
      throw new Error(`Unsupported provider: ${modelConfig.provider}`);
  }
}
