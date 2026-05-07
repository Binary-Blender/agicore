// NovaSyn Academy — AI Service
// Multi-provider AI communication for lesson generation

import Anthropic from '@anthropic-ai/sdk';
import type { Student, Subject, SchoolYear, Skill, Assessment, ReadingEntry, Attendance, PortfolioItem, SafetyFilterResult, TutorMessage, Lesson } from '../../shared/types';
import { BrowserWindow } from 'electron';
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
  // BabyAI — free (BYOK routing layer)
  'auto': { input: 0, output: 0 },
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

// ─── SSE Stream Parser ──────────────────────────────────────────────────────

async function parseSSEStream(
  response: Response,
  extractChunk: (data: any) => string,
  extractUsage: (data: any) => { tokensIn: number; tokensOut: number } | null,
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
  apiKey: string,
): Promise<AIResponse> {
  const startTime = Date.now();
  const client = new Anthropic({ apiKey });

  const response = await client.messages.create({
    model: modelId,
    max_tokens: 4096,
    system: systemPrompt,
    temperature: 0.7,
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
  apiKey: string,
): Promise<AIResponse> {
  const startTime = Date.now();

  const finalMessages = [
    { role: 'system', content: systemPrompt },
    ...messages.map(m => ({ role: m.role, content: m.content })),
  ];

  const body: Record<string, unknown> = {
    model: modelId,
    messages: finalMessages,
    stream: false,
  };

  const isReasoningModel = /^o\d/.test(modelId);
  if (isReasoningModel) {
    body.max_completion_tokens = 16384;
  } else {
    body.temperature = 0.7;
    body.max_tokens = 4096;
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
  apiKey: string,
): Promise<AIResponse> {
  const startTime = Date.now();

  const requestBody: Record<string, unknown> = {
    contents: messages.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    })),
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 4096,
    },
  };

  if (systemPrompt.trim()) {
    requestBody.systemInstruction = {
      parts: [{ text: systemPrompt.trim() }],
    };
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
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
  apiKey: string,
): Promise<AIResponse> {
  const startTime = Date.now();

  const finalMessages = [
    { role: 'system', content: systemPrompt },
    ...messages.map(m => ({ role: m.role, content: m.content })),
  ];

  const body: Record<string, unknown> = {
    model: modelId,
    messages: finalMessages,
    temperature: 0.7,
    stream: false,
  };

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
  apiKey: string,
): Promise<AIResponse> {
  const startTime = Date.now();

  const finalMessages = [
    { role: 'system', content: systemPrompt },
    ...messages.map(m => ({ role: m.role, content: m.content })),
  ];

  const response = await fetch('https://novasynchris-babyai.hf.space/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: modelId,
      messages: finalMessages,
      temperature: 0.7,
      max_tokens: 4096,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`BabyAI API error: ${response.status} - ${errorText}`);
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

// ─── Lesson Generation ──────────────────────────────────────────────────────

function buildLessonPrompt(
  student: Student,
  subjects: Subject[],
  date: string,
  scope: 'day' | 'week',
  recentLessons: { subjectName: string; title: string }[],
): string {
  const age = student.birthDate
    ? Math.floor((Date.now() - new Date(student.birthDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    : null;

  const styleEntries = Object.entries(student.learningStyle || {});
  const styleStr = styleEntries.length > 0
    ? styleEntries.map(([k, v]) => `${k}: ${Math.round(v * 100)}%`).join(', ')
    : 'Not specified';

  const recentStr = recentLessons.length > 0
    ? recentLessons.map(l => `- ${l.subjectName}: "${l.title}"`).join('\n')
    : 'No recent lessons';

  const subjectList = subjects.map(s =>
    `- ${s.name} (target: ${s.targetHoursPerWeek} hrs/week, color: ${s.color})`
  ).join('\n');

  const dayCount = scope === 'day' ? '1 day' : '5 days (Monday through Friday)';

  return `You are an expert homeschool teaching assistant${age ? ` for a ${age}-year-old` : ''} ${student.gradeLevel || ''} student named ${student.name}.

STUDENT PROFILE:
- Grade: ${student.gradeLevel || 'Not set'}${student.state ? `, State: ${student.state}` : ''}
- Learning style: ${styleStr}
- Interests: ${student.interests.length > 0 ? student.interests.join(', ') : 'Not specified'}
- Strengths: ${student.strengths.length > 0 ? student.strengths.join(', ') : 'Not specified'}
- Areas needing work: ${student.struggles.length > 0 ? student.struggles.join(', ') : 'Not specified'}
- Teaching philosophy: ${student.teachingPhilosophy}

SUBJECTS FOR PLANNING:
${subjectList}

RECENT COMPLETED LESSONS (for continuity — avoid repeating these):
${recentStr}

Generate lesson plans for ${dayCount} starting ${date}. For each lesson provide:
- subjectName: exact subject name from the list above
- title: engaging lesson title
- description: 1-2 sentence overview
- estimatedMinutes: realistic time estimate
- lessonContent: detailed step-by-step lesson plan (3-5 steps)
- materialsNeeded: array of materials/supplies needed
- objectives: array of 2-3 learning objectives
- scheduledDate: YYYY-MM-DD format

Use the student's interests to make lessons engaging and relevant.
Distribute subjects across the ${scope === 'week' ? 'week' : 'day'} based on target hours.

Output ONLY a JSON array of lesson objects. No markdown, no explanation.`;
}

export interface GeneratedLesson {
  subjectName: string;
  title: string;
  description: string;
  estimatedMinutes: number;
  lessonContent: string;
  materialsNeeded: string[];
  objectives: string[];
  scheduledDate: string;
}

export async function generateLessonPlan(
  student: Student,
  subjects: Subject[],
  date: string,
  scope: 'day' | 'week',
  recentLessons: { subjectName: string; title: string }[],
  modelId: string,
  apiKeys: Record<string, string>,
): Promise<{ lessons: GeneratedLesson[]; response: AIResponse }> {
  const modelConfig = AVAILABLE_MODELS.find(m => m.id === modelId);
  if (!modelConfig) throw new Error(`Unknown model: ${modelId}`);

  const apiKey = apiKeys[modelConfig.provider];
  if (!apiKey) throw new Error(`No API key for ${modelConfig.provider}`);

  const systemPrompt = buildLessonPrompt(student, subjects, date, scope, recentLessons);
  const messages: ChatMessage[] = [
    { role: 'user', content: `Generate ${scope === 'week' ? 'a week of' : "today's"} lesson plans.` },
  ];

  let response: AIResponse;
  switch (modelConfig.provider) {
    case 'anthropic':
      response = await handleAnthropic(systemPrompt, messages, modelId, apiKey);
      break;
    case 'openai':
      response = await handleOpenAI(systemPrompt, messages, modelId, apiKey);
      break;
    case 'google':
      response = await handleGemini(systemPrompt, messages, modelId, apiKey);
      break;
    case 'xai':
      response = await handleXAI(systemPrompt, messages, modelId, apiKey);
      break;
    case 'babyai':
      response = await handleBabyAI(systemPrompt, messages, modelId, apiKey);
      break;
    default:
      throw new Error(`Unsupported provider: ${modelConfig.provider}`);
  }

  // Parse the JSON response
  try {
    const text = response.content.trim();
    const jsonStr = text.startsWith('[') ? text : text.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
    const parsed = JSON.parse(jsonStr);
    if (!Array.isArray(parsed)) return { lessons: [], response };

    const lessons: GeneratedLesson[] = parsed.map((l: any) => ({
      subjectName: l.subjectName || '',
      title: l.title || 'Untitled Lesson',
      description: l.description || '',
      estimatedMinutes: Number(l.estimatedMinutes) || 30,
      lessonContent: typeof l.lessonContent === 'string' ? l.lessonContent : JSON.stringify(l.lessonContent || ''),
      materialsNeeded: Array.isArray(l.materialsNeeded) ? l.materialsNeeded : [],
      objectives: Array.isArray(l.objectives) ? l.objectives : [],
      scheduledDate: l.scheduledDate || date,
    })).filter((l: GeneratedLesson) => l.title && l.subjectName);

    return { lessons, response };
  } catch {
    console.error('Failed to parse lesson generation response:', response.content);
    return { lessons: [], response };
  }
}

// ─── Assessment Generation ──────────────────────────────────────────────────

export interface GeneratedQuestion {
  question: string;
  type: 'multiple_choice' | 'true_false' | 'short_answer' | 'fill_blank';
  options?: string[];
  correctAnswer: string;
  points: number;
  skillName?: string;
}

function buildAssessmentPrompt(
  student: Student,
  subjectName: string,
  lessons: { title: string; objectives: string[]; lessonContent: string }[],
  questionCount: number,
  assessmentType: string,
): string {
  const age = student.birthDate
    ? Math.floor((Date.now() - new Date(student.birthDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    : null;

  const lessonSummaries = lessons.map(l => {
    const objectives = l.objectives.length > 0 ? `\n  Objectives: ${l.objectives.join(', ')}` : '';
    const content = l.lessonContent ? `\n  Content: ${l.lessonContent.substring(0, 300)}` : '';
    return `- "${l.title}"${objectives}${content}`;
  }).join('\n');

  return `You are an assessment creator for ${age ? `a ${age}-year-old ` : ''}${student.gradeLevel || ''} student named ${student.name}.
Teaching philosophy: ${student.teachingPhilosophy}
Student interests: ${student.interests.length > 0 ? student.interests.join(', ') : 'Not specified'}

SUBJECT: ${subjectName}

RECENT LESSONS COVERED:
${lessonSummaries || 'No specific lessons provided'}

Generate a ${questionCount}-question ${assessmentType} covering the material above.
For each question provide:
- question: the question text
- type: one of 'multiple_choice', 'true_false', 'short_answer', 'fill_blank'
- options: array of 4 choices (for multiple_choice only, omit for other types)
- correctAnswer: the correct answer (for multiple_choice, must be one of the options)
- points: point value (1 for easy, 2 for medium, 3 for hard)
- skillName: a short skill name this question tests (e.g. "Long Division", "Paragraph Structure")

Mix question types. Use age-appropriate language.
Incorporate the student's interests where possible to make questions engaging.

Output ONLY a JSON array of question objects. No markdown, no explanation.`;
}

export async function generateAssessmentQuestions(
  student: Student,
  subjectName: string,
  lessons: { title: string; objectives: string[]; lessonContent: string }[],
  questionCount: number,
  assessmentType: string,
  modelId: string,
  apiKeys: Record<string, string>,
): Promise<{ questions: GeneratedQuestion[]; response: AIResponse }> {
  const modelConfig = AVAILABLE_MODELS.find(m => m.id === modelId);
  if (!modelConfig) throw new Error(`Unknown model: ${modelId}`);

  const apiKey = apiKeys[modelConfig.provider];
  if (!apiKey) throw new Error(`No API key for ${modelConfig.provider}`);

  const systemPrompt = buildAssessmentPrompt(student, subjectName, lessons, questionCount, assessmentType);
  const messages: ChatMessage[] = [
    { role: 'user', content: `Generate the ${assessmentType} now.` },
  ];

  let response: AIResponse;
  switch (modelConfig.provider) {
    case 'anthropic':
      response = await handleAnthropic(systemPrompt, messages, modelId, apiKey);
      break;
    case 'openai':
      response = await handleOpenAI(systemPrompt, messages, modelId, apiKey);
      break;
    case 'google':
      response = await handleGemini(systemPrompt, messages, modelId, apiKey);
      break;
    case 'xai':
      response = await handleXAI(systemPrompt, messages, modelId, apiKey);
      break;
    case 'babyai':
      response = await handleBabyAI(systemPrompt, messages, modelId, apiKey);
      break;
    default:
      throw new Error(`Unsupported provider: ${modelConfig.provider}`);
  }

  try {
    const text = response.content.trim();
    const jsonStr = text.startsWith('[') ? text : text.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
    const parsed = JSON.parse(jsonStr);
    if (!Array.isArray(parsed)) return { questions: [], response };

    const validTypes = ['multiple_choice', 'true_false', 'short_answer', 'fill_blank'];
    const questions: GeneratedQuestion[] = parsed.map((q: any) => ({
      question: q.question || '',
      type: validTypes.includes(q.type) ? q.type : 'short_answer',
      options: Array.isArray(q.options) ? q.options : undefined,
      correctAnswer: String(q.correctAnswer || ''),
      points: Math.max(1, Math.min(3, Number(q.points) || 1)),
      skillName: q.skillName || undefined,
    })).filter((q: GeneratedQuestion) => q.question && q.correctAnswer);

    return { questions, response };
  } catch {
    console.error('Failed to parse assessment generation response:', response.content);
    return { questions: [], response };
  }
}

// ─── Safety Filter ──────────────────────────────────────────────────────────

const SAFETY_PATTERNS: { pattern: RegExp; category: SafetyFilterResult['category']; reason: string }[] = [
  { pattern: /(?:my (?:phone|address|email)|i live at|my social security)/i, category: 'personal_info', reason: 'Attempted to share personal information' },
  { pattern: /(?:i want to (?:die|hurt|kill)|suicid|self[- ]harm)/i, category: 'distress', reason: 'Expression of distress or self-harm detected' },
  { pattern: /(?:how to (?:make|build) (?:a )?(?:bomb|weapon|drug))/i, category: 'inappropriate', reason: 'Inappropriate or dangerous topic' },
];

export function checkSafetyFilter(content: string): SafetyFilterResult {
  for (const { pattern, category, reason } of SAFETY_PATTERNS) {
    if (pattern.test(content)) {
      return { safe: false, reason, category };
    }
  }
  return { safe: true };
}

// ─── Tutor Streaming ────────────────────────────────────────────────────────

function buildTutorSystemPrompt(
  student: Student,
  topic: string,
  mode: 'guided' | 'free' | 'review',
  subjectName?: string,
  messageHistory?: TutorMessage[],
): string {
  const age = student.birthDate
    ? Math.floor((Date.now() - new Date(student.birthDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    : null;

  const modeInstructions = {
    guided: 'Ask questions to guide the student to understanding. Use the Socratic method. Check for understanding frequently.',
    free: 'Let the student explore freely. Answer questions, provide explanations, and suggest related topics.',
    review: 'Review previously learned material. Ask recall questions and provide corrections with explanations.',
  };

  return `You are a friendly, patient AI tutor for ${age ? `a ${age}-year-old ` : ''}${student.gradeLevel || ''} student named ${student.name}.

TOPIC: ${topic}${subjectName ? ` (${subjectName})` : ''}
MODE: ${mode} — ${modeInstructions[mode]}

STUDENT PROFILE:
- Learning style: ${Object.entries(student.learningStyle || {}).map(([k, v]) => `${k}: ${Math.round(v * 100)}%`).join(', ') || 'Not specified'}
- Interests: ${student.interests.length > 0 ? student.interests.join(', ') : 'Not specified'}
- Strengths: ${student.strengths.length > 0 ? student.strengths.join(', ') : 'Not specified'}
- Areas needing work: ${student.struggles.length > 0 ? student.struggles.join(', ') : 'Not specified'}

RULES:
1. Use age-appropriate language and examples.
2. Be encouraging and positive. Celebrate correct answers.
3. If the student seems frustrated, simplify and try a different approach.
4. Keep responses concise (2-4 paragraphs max).
5. Use the student's interests to make examples relatable.
6. NEVER discuss topics inappropriate for children (violence, drugs, adult content).
7. If the student tries to go off-topic, gently redirect to the lesson.
8. If the student shares personal information, remind them not to share personal details online.`;
}

export interface StreamCallbacks {
  onChunk: (text: string) => void;
  onDone: (fullContent: string, tokensIn: number, tokensOut: number, cost: number) => void;
  onError: (error: string) => void;
}

async function streamAnthropic(
  systemPrompt: string,
  messages: ChatMessage[],
  modelId: string,
  apiKey: string,
  callbacks: StreamCallbacks,
): Promise<void> {
  const client = new Anthropic({ apiKey });
  let fullContent = '';
  let tokensIn = 0;
  let tokensOut = 0;

  try {
    const stream = client.messages.stream({
      model: modelId,
      max_tokens: 2048,
      system: systemPrompt,
      temperature: 0.7,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
    });

    stream.on('text', (text) => {
      fullContent += text;
      callbacks.onChunk(text);
    });

    const finalMessage = await stream.finalMessage();
    tokensIn = finalMessage.usage.input_tokens;
    tokensOut = finalMessage.usage.output_tokens;
    const cost = calculateCost(modelId, tokensIn, tokensOut);
    callbacks.onDone(fullContent, tokensIn, tokensOut, cost);
  } catch (err: any) {
    callbacks.onError(err.message || 'Anthropic streaming error');
  }
}

async function streamOpenAICompatible(
  systemPrompt: string,
  messages: ChatMessage[],
  modelId: string,
  apiKey: string,
  baseUrl: string,
  callbacks: StreamCallbacks,
): Promise<void> {
  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: modelId,
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages.map(m => ({ role: m.role, content: m.content })),
        ],
        temperature: 0.7,
        max_tokens: 2048,
        stream: true,
        stream_options: { include_usage: true },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      callbacks.onError(`API error: ${response.status} - ${errorText}`);
      return;
    }

    const { content, tokensIn, tokensOut } = await parseSSEStream(
      response,
      (data) => {
        const chunk = data.choices?.[0]?.delta?.content || '';
        if (chunk) callbacks.onChunk(chunk);
        return chunk;
      },
      (data) => {
        if (data.usage) {
          return { tokensIn: data.usage.prompt_tokens || 0, tokensOut: data.usage.completion_tokens || 0 };
        }
        return null;
      },
    );

    const cost = calculateCost(modelId, tokensIn, tokensOut);
    callbacks.onDone(content, tokensIn, tokensOut, cost);
  } catch (err: any) {
    callbacks.onError(err.message || 'Streaming error');
  }
}

export async function streamTutorResponse(
  student: Student,
  topic: string,
  mode: 'guided' | 'free' | 'review',
  subjectName: string | undefined,
  messageHistory: TutorMessage[],
  modelId: string,
  apiKeys: Record<string, string>,
  callbacks: StreamCallbacks,
): Promise<void> {
  const modelConfig = AVAILABLE_MODELS.find(m => m.id === modelId);
  if (!modelConfig) { callbacks.onError(`Unknown model: ${modelId}`); return; }

  const apiKey = apiKeys[modelConfig.provider];
  if (!apiKey) { callbacks.onError(`No API key for ${modelConfig.provider}`); return; }

  const systemPrompt = buildTutorSystemPrompt(student, topic, mode, subjectName, messageHistory);
  const chatMessages: ChatMessage[] = messageHistory
    .filter(m => m.role !== 'system' && !m.filtered)
    .map(m => ({ role: m.role === 'student' ? 'user' as const : 'assistant' as const, content: m.content }));

  switch (modelConfig.provider) {
    case 'anthropic':
      await streamAnthropic(systemPrompt, chatMessages, modelId, apiKey, callbacks);
      break;
    case 'openai':
      await streamOpenAICompatible(systemPrompt, chatMessages, modelId, apiKey, 'https://api.openai.com/v1', callbacks);
      break;
    case 'xai':
      await streamOpenAICompatible(systemPrompt, chatMessages, modelId, apiKey, 'https://api.x.ai/v1', callbacks);
      break;
    case 'google': {
      // Gemini doesn't support streaming the same way, fall back to non-streaming
      const response = await handleGemini(systemPrompt, chatMessages, modelId, apiKey);
      callbacks.onChunk(response.content);
      callbacks.onDone(response.content, response.tokensIn, response.tokensOut, response.cost);
      break;
    }
    case 'babyai': {
      // BabyAI doesn't support streaming, fall back to non-streaming
      const response = await handleBabyAI(systemPrompt, chatMessages, modelId, apiKey);
      callbacks.onChunk(response.content);
      callbacks.onDone(response.content, response.tokensIn, response.tokensOut, response.cost);
      break;
    }
    default:
      callbacks.onError(`Unsupported provider: ${modelConfig.provider}`);
  }
}

// ─── Resource Generation ─────────────────────────────────────────────────────

function buildResourcePrompt(
  student: Student,
  resourceType: string,
  topic: string,
  difficulty: string,
  subjectName?: string,
): string {
  const age = student.birthDate
    ? Math.floor((Date.now() - new Date(student.birthDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    : null;

  const typeInstructions: Record<string, string> = {
    worksheet: `Create a printable worksheet with 8-12 problems/questions. Include clear instructions, numbered problems, and space indicators [SPACE] for answers. Format with headers and sections.`,
    flashcards: `Create 12-15 flashcard pairs. Format as a JSON array of { "front": "...", "back": "..." } objects. Make fronts concise and backs informative.`,
    quiz: `Create a 10-question quiz with mixed question types. Format as JSON: { "title": "...", "instructions": "...", "questions": [...] } where each question has "number", "question", "type" (multiple_choice/true_false/fill_blank), "options" (if MC), "answer".`,
    coloring: `Create a detailed text description of a coloring page that teaches about the topic. Describe the scene, objects to color, and labels/facts to include. Format with clear sections.`,
    puzzle: `Create a word search, crossword, or similar puzzle. For word search: provide a list of 10-15 vocabulary words and their definitions. For crossword: provide clues and answers. Format clearly for printing.`,
  };

  return `You are creating a ${difficulty}-difficulty ${resourceType} for ${age ? `a ${age}-year-old ` : ''}${student.gradeLevel || ''} student named ${student.name}.

TOPIC: ${topic}${subjectName ? ` (${subjectName})` : ''}
DIFFICULTY: ${difficulty}
STUDENT INTERESTS: ${student.interests.length > 0 ? student.interests.join(', ') : 'General'}

${typeInstructions[resourceType] || typeInstructions.worksheet}

Also provide an ANSWER KEY section at the end, separated by the delimiter:
---ANSWER_KEY---

Make content age-appropriate and engaging. Incorporate the student's interests where relevant.
Do not use markdown code fences. Output the content directly.`;
}

export interface GeneratedResource {
  content: string;
  answerKey: string;
}

export async function generateResourceContent(
  student: Student,
  resourceType: string,
  topic: string,
  difficulty: string,
  subjectName: string | undefined,
  modelId: string,
  apiKeys: Record<string, string>,
): Promise<{ resource: GeneratedResource; response: AIResponse }> {
  const modelConfig = AVAILABLE_MODELS.find(m => m.id === modelId);
  if (!modelConfig) throw new Error(`Unknown model: ${modelId}`);

  const apiKey = apiKeys[modelConfig.provider];
  if (!apiKey) throw new Error(`No API key for ${modelConfig.provider}`);

  const systemPrompt = buildResourcePrompt(student, resourceType, topic, difficulty, subjectName);
  const messages: ChatMessage[] = [
    { role: 'user', content: `Generate the ${resourceType} now.` },
  ];

  let response: AIResponse;
  switch (modelConfig.provider) {
    case 'anthropic':
      response = await handleAnthropic(systemPrompt, messages, modelId, apiKey);
      break;
    case 'openai':
      response = await handleOpenAI(systemPrompt, messages, modelId, apiKey);
      break;
    case 'google':
      response = await handleGemini(systemPrompt, messages, modelId, apiKey);
      break;
    case 'xai':
      response = await handleXAI(systemPrompt, messages, modelId, apiKey);
      break;
    case 'babyai':
      response = await handleBabyAI(systemPrompt, messages, modelId, apiKey);
      break;
    default:
      throw new Error(`Unsupported provider: ${modelConfig.provider}`);
  }

  // Split content and answer key
  const parts = response.content.split('---ANSWER_KEY---');
  const content = (parts[0] || '').trim();
  const answerKey = (parts[1] || '').trim();

  return {
    resource: { content, answerKey },
    response,
  };
}

// ─── Multi-Child Schedule Generation ────────────────────────────────────────

export interface GeneratedMultiChildLesson {
  studentName: string;
  subjectName: string;
  title: string;
  description: string;
  estimatedMinutes: number;
  lessonContent: string;
  materialsNeeded: string[];
  objectives: string[];
  scheduledDate: string;
  sortOrder: number;
}

function buildMultiChildPrompt(
  students: Student[],
  studentSubjects: Record<string, Subject[]>,
  recentLessonsMap: Record<string, { subjectName: string; title: string }[]>,
  date: string,
  scope: 'day' | 'week',
): string {
  const studentProfiles = students.map(student => {
    const age = student.birthDate
      ? Math.floor((Date.now() - new Date(student.birthDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
      : null;
    const subjects = studentSubjects[student.id] || [];
    const recentLessons = recentLessonsMap[student.id] || [];

    return `STUDENT: ${student.name}${age ? ` (age ${age})` : ''}, Grade: ${student.gradeLevel || 'Not set'}
  Philosophy: ${student.teachingPhilosophy}
  Interests: ${student.interests.join(', ') || 'Not specified'}
  Learning Style: ${Object.entries(student.learningStyle || {}).map(([k, v]) => `${k}: ${Math.round(v * 100)}%`).join(', ') || 'Not specified'}
  Subjects: ${subjects.map(s => `${s.name} (${s.targetHoursPerWeek} hrs/week)`).join(', ')}
  Recent Lessons: ${recentLessons.map(l => `${l.subjectName}: "${l.title}"`).join(', ') || 'None'}`;
  }).join('\n\n');

  const dayCount = scope === 'day' ? '1 day' : '5 days (Monday through Friday)';

  return `You are a homeschool scheduling assistant for a family with ${students.length} children.

CRITICAL CONSTRAINT: There is ONE parent teaching ALL children. The schedule must account for this:
- When one child needs 1-on-1 parent attention, the other(s) should have independent work
- Schedule combined lessons where subjects overlap (same topic, different depths)
- Stagger subjects so the parent can rotate between children
- Put independent work (reading, journaling, worksheets) when parent is with another child
- Schedule together-time for shared subjects (art, PE, science experiments)

${studentProfiles}

Generate lesson plans for ${dayCount} starting ${date}.

For each lesson, provide:
- studentName: exact student name
- subjectName: exact subject name from that student's list
- title: engaging lesson title
- description: 1-2 sentence overview
- estimatedMinutes: realistic time estimate
- lessonContent: detailed step-by-step plan (note if independent or needs parent)
- materialsNeeded: array of materials
- objectives: array of 2-3 learning objectives
- scheduledDate: YYYY-MM-DD format
- sortOrder: time-slot order for the day (0 = earliest, higher = later)

SCHEDULING RULES:
1. Each child starts at the same time of day
2. Mark lessons that can be done independently vs. need parent
3. Stagger parent-intensive subjects across children
4. Include at least one combined lesson per day where possible
5. Put harder/parent-intensive work in the morning

Output ONLY a JSON array of lesson objects. No markdown, no explanation.`;
}

export async function generateMultiChildSchedule(
  students: Student[],
  studentSubjects: Record<string, Subject[]>,
  recentLessonsMap: Record<string, { subjectName: string; title: string }[]>,
  date: string,
  scope: 'day' | 'week',
  modelId: string,
  apiKeys: Record<string, string>,
): Promise<{ lessons: GeneratedMultiChildLesson[]; response: AIResponse }> {
  const modelConfig = AVAILABLE_MODELS.find(m => m.id === modelId);
  if (!modelConfig) throw new Error(`Unknown model: ${modelId}`);

  const apiKey = apiKeys[modelConfig.provider];
  if (!apiKey) throw new Error(`No API key for ${modelConfig.provider}`);

  const systemPrompt = buildMultiChildPrompt(students, studentSubjects, recentLessonsMap, date, scope);
  const messages: ChatMessage[] = [
    { role: 'user', content: `Generate the coordinated ${scope === 'week' ? 'weekly' : 'daily'} schedule for all ${students.length} children.` },
  ];

  let response: AIResponse;
  switch (modelConfig.provider) {
    case 'anthropic':
      response = await handleAnthropic(systemPrompt, messages, modelId, apiKey);
      break;
    case 'openai':
      response = await handleOpenAI(systemPrompt, messages, modelId, apiKey);
      break;
    case 'google':
      response = await handleGemini(systemPrompt, messages, modelId, apiKey);
      break;
    case 'xai':
      response = await handleXAI(systemPrompt, messages, modelId, apiKey);
      break;
    case 'babyai':
      response = await handleBabyAI(systemPrompt, messages, modelId, apiKey);
      break;
    default:
      throw new Error(`Unsupported provider: ${modelConfig.provider}`);
  }

  try {
    const text = response.content.trim();
    const jsonStr = text.startsWith('[') ? text : text.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
    const parsed = JSON.parse(jsonStr);
    if (!Array.isArray(parsed)) return { lessons: [], response };

    const lessons: GeneratedMultiChildLesson[] = parsed.map((l: any) => ({
      studentName: l.studentName || '',
      subjectName: l.subjectName || '',
      title: l.title || 'Untitled Lesson',
      description: l.description || '',
      estimatedMinutes: Number(l.estimatedMinutes) || 30,
      lessonContent: typeof l.lessonContent === 'string' ? l.lessonContent : JSON.stringify(l.lessonContent || ''),
      materialsNeeded: Array.isArray(l.materialsNeeded) ? l.materialsNeeded : [],
      objectives: Array.isArray(l.objectives) ? l.objectives : [],
      scheduledDate: l.scheduledDate || date,
      sortOrder: Number(l.sortOrder) || 0,
    })).filter((l: GeneratedMultiChildLesson) => l.title && l.studentName && l.subjectName);

    return { lessons, response };
  } catch {
    console.error('Failed to parse multi-child schedule response:', response.content);
    return { lessons: [], response };
  }
}

// ─── Shared AI Helper ───────────────────────────────────────────────────────

async function callAI(prompt: string, modelId: string, apiKeys: Record<string, string>): Promise<AIResponse> {
  const modelConfig = AVAILABLE_MODELS.find(m => m.id === modelId);
  if (!modelConfig) throw new Error(`Unknown model: ${modelId}`);

  const apiKey = apiKeys[modelConfig.provider];
  if (!apiKey) throw new Error(`No API key for ${modelConfig.provider}`);

  const systemPrompt = 'You are an expert educator and report writer for a homeschool academy. Generate professional, well-formatted HTML documents.';
  const messages: ChatMessage[] = [{ role: 'user', content: prompt }];

  switch (modelConfig.provider) {
    case 'anthropic':
      return handleAnthropic(systemPrompt, messages, modelId, apiKey);
    case 'openai':
      return handleOpenAI(systemPrompt, messages, modelId, apiKey);
    case 'google':
      return handleGemini(systemPrompt, messages, modelId, apiKey);
    case 'xai':
      return handleXAI(systemPrompt, messages, modelId, apiKey);
    case 'babyai':
      return handleBabyAI(systemPrompt, messages, modelId, apiKey);
    default:
      throw new Error(`Unsupported provider: ${modelConfig.provider}`);
  }
}

// ─── Report Card Generation ─────────────────────────────────────────────────

export async function generateReportCard(
  student: Student,
  schoolYear: SchoolYear,
  subjects: Subject[],
  subjectData: Record<string, { skills: Skill[]; assessments: Assessment[]; lessonsCompleted: number; totalHours: number }>,
  readingEntries: ReadingEntry[],
  attendance: Attendance[],
  period: string,
  style: string,
  modelId: string,
  apiKeys: Record<string, string>,
): Promise<AIResponse> {
  const subjectSummaries = subjects.map(s => {
    const data = subjectData[s.id] || { skills: [], assessments: [], lessonsCompleted: 0, totalHours: 0 };
    const avgScore = data.assessments.length > 0
      ? Math.round(data.assessments.reduce((sum, a) => sum + (a.scorePercent || 0), 0) / data.assessments.length)
      : null;
    const masteredSkills = data.skills.filter(sk => sk.proficiency >= 4).map(sk => sk.name);
    const inProgressSkills = data.skills.filter(sk => sk.proficiency >= 2 && sk.proficiency < 4).map(sk => sk.name);
    return `Subject: ${s.name}\n  Lessons completed: ${data.lessonsCompleted}\n  Hours: ${data.totalHours}\n  Assessments: ${data.assessments.length} (avg score: ${avgScore !== null ? avgScore + '%' : 'N/A'})\n  Skills mastered: ${masteredSkills.join(', ') || 'None yet'}\n  Skills in progress: ${inProgressSkills.join(', ') || 'None'}`;
  }).join('\n\n');

  const booksCompleted = readingEntries.filter(r => r.status === 'completed');
  const totalPages = readingEntries.reduce((sum, r) => sum + (r.pagesRead || 0), 0);
  const presentDays = attendance.filter(a => a.status !== 'absent').length;

  const readingSummary = `Books completed: ${booksCompleted.length}\nTotal pages read: ${totalPages}\nReading time: ${readingEntries.reduce((sum, r) => sum + (r.totalMinutes || 0), 0)} minutes`;
  const attendanceSummary = `Days present: ${presentDays} / ${schoolYear.targetSchoolDays}`;

  const styleInstructions: Record<string, string> = {
    traditional: 'Use traditional letter grades (A, B, C, D, F) with +/- modifiers. Include brief comments.',
    narrative: 'Write detailed narrative paragraphs for each subject describing strengths, progress, and areas for growth. Do NOT use letter grades.',
    standards_based: 'Use proficiency levels (Advanced, Proficient, Developing, Beginning) for each skill area.',
    hybrid: 'Include both letter grades AND brief narrative commentary for each subject.',
  };

  const prompt = `Generate a homeschool report card as styled HTML. Use clean, professional formatting suitable for printing.

Student: ${student.name}
Grade: ${student.gradeLevel || 'N/A'}
School Year: ${schoolYear.name}
Period: ${period}

Report Card Style: ${style}
${styleInstructions[style] || styleInstructions.narrative}

--- SUBJECT DATA ---
${subjectSummaries}

--- READING ---
${readingSummary}

--- ATTENDANCE ---
${attendanceSummary}

--- STUDENT PROFILE ---
Interests: ${student.interests.join(', ') || 'N/A'}
Strengths: ${student.strengths.join(', ') || 'N/A'}
Areas for growth: ${student.struggles.join(', ') || 'N/A'}

Generate a complete, professional report card in HTML format. Include:
1. Header with school name "NovaSyn Home Academy", student info, and period
2. Subject sections with grades/narratives based on the style
3. Skills mastered and in-progress per subject
4. Reading summary
5. Attendance record
6. Overall notes section with strengths and recommendations
7. Signature lines at the bottom

Use inline CSS for styling. Make it print-friendly with a clean, professional look. Use a serif font for the body text.
Return ONLY the HTML — no markdown fences, no explanation.`;

  return callAI(prompt, modelId, apiKeys);
}

// ─── Transcript Generation ──────────────────────────────────────────────────

export async function generateTranscript(
  student: Student,
  schoolYears: SchoolYear[],
  yearData: Record<string, { subjects: Subject[]; subjectData: Record<string, { assessments: Assessment[]; lessonsCompleted: number; totalHours: number }> }>,
  attendanceByYear: Record<string, number>,
  modelId: string,
  apiKeys: Record<string, string>,
): Promise<AIResponse> {
  const yearSummaries = schoolYears.map(year => {
    const data = yearData[year.id];
    if (!data) return '';
    const subjectLines = data.subjects.map(s => {
      const sd = data.subjectData[s.id];
      if (!sd) return `  ${s.name}: No data`;
      const avgScore = sd.assessments.length > 0
        ? Math.round(sd.assessments.reduce((sum: number, a: any) => sum + (a.scorePercent || 0), 0) / sd.assessments.length)
        : null;
      return `  ${s.name}: ${sd.totalHours} hours, ${sd.lessonsCompleted} lessons, avg assessment: ${avgScore !== null ? avgScore + '%' : 'N/A'}`;
    }).join('\n');
    return `School Year: ${year.name} (${year.startDate} to ${year.endDate})\nAttendance: ${attendanceByYear[year.id] || 0} / ${year.targetSchoolDays} days\n${subjectLines}`;
  }).join('\n\n');

  const prompt = `Generate an official academic transcript as styled HTML for a homeschool student.

Student: ${student.name}
Date of Birth: ${student.birthDate || 'N/A'}
Grade Level: ${student.gradeLevel || 'N/A'}
State: ${student.state || 'N/A'}

--- ACADEMIC RECORD ---
${yearSummaries}

Generate a formal academic transcript in HTML format. Include:
1. Header: "OFFICIAL ACADEMIC TRANSCRIPT — NovaSyn Home Academy"
2. Student information block (name, DOB, grade)
3. For each school year, a table with: Subject, Grade (derive letter grade from assessment scores: 90%+=A, 80%+=B, 70%+=C, 60%+=D, <60=F with +/- modifiers), Credits (calculate from hours: ~120 hours = 1.0 credit, ~60 hours = 0.5), Hours
4. Cumulative section: total credits, cumulative GPA
5. Attendance summary per year
6. Verification signature lines
7. Date generated

Use inline CSS. Make it formal and professional — this should look like an official document suitable for submission to schools or colleges.
Return ONLY the HTML — no markdown fences, no explanation.`;

  return callAI(prompt, modelId, apiKeys);
}

// ─── Year-End Report Generation ─────────────────────────────────────────────

export async function generateYearEndReport(
  student: Student,
  schoolYear: SchoolYear,
  subjects: Subject[],
  subjectData: Record<string, { skills: Skill[]; assessments: Assessment[]; lessonsCompleted: number; totalHours: number }>,
  readingEntries: ReadingEntry[],
  attendance: Attendance[],
  portfolio: PortfolioItem[],
  modelId: string,
  apiKeys: Record<string, string>,
): Promise<AIResponse> {
  const subjectSummaries = subjects.map(s => {
    const data = subjectData[s.id] || { skills: [], assessments: [], lessonsCompleted: 0, totalHours: 0 };
    const avgScore = data.assessments.length > 0
      ? Math.round(data.assessments.reduce((sum, a) => sum + (a.scorePercent || 0), 0) / data.assessments.length)
      : null;
    return `${s.name}: ${data.lessonsCompleted} lessons, ${data.totalHours} hrs, ${data.assessments.length} assessments (avg: ${avgScore ?? 'N/A'}%), ${data.skills.length} skills tracked`;
  }).join('\n');

  const booksCompleted = readingEntries.filter(r => r.status === 'completed');
  const presentDays = attendance.filter(a => a.status !== 'absent').length;
  const totalHours = subjects.reduce((sum, s) => sum + (subjectData[s.id]?.totalHours || 0), 0);

  const portfolioSummary = Object.entries(
    portfolio.reduce((acc, p) => { acc[p.itemType] = (acc[p.itemType] || 0) + 1; return acc; }, {} as Record<string, number>)
  ).map(([type, count]) => `${type}: ${count}`).join(', ');

  const prompt = `Generate a comprehensive year-end homeschool report as styled HTML. This should serve as a complete portfolio summary document.

Student: ${student.name}
Grade: ${student.gradeLevel || 'N/A'}
School Year: ${schoolYear.name} (${schoolYear.startDate} to ${schoolYear.endDate})
Teaching Philosophy: ${student.teachingPhilosophy || 'eclectic'}
Interests: ${student.interests.join(', ') || 'N/A'}

--- OVERVIEW ---
Total instruction days: ${presentDays} / ${schoolYear.targetSchoolDays}
Total instruction hours: ${totalHours}
Subjects covered: ${subjects.length}
Books read: ${booksCompleted.length} (${readingEntries.reduce((s, r) => s + (r.pagesRead || 0), 0)} pages)
Portfolio items: ${portfolio.length} (${portfolioSummary || 'none'})

--- SUBJECTS ---
${subjectSummaries}

--- READING LOG ---
${booksCompleted.map(b => `"${b.title}" by ${b.author || 'Unknown'} — ${b.rating ? b.rating + '/5' : 'unrated'}`).join('\n') || 'No completed books'}

Generate a comprehensive year-end report in HTML. Include:
1. Cover page with school name, student name, year, and grade
2. Table of contents
3. Curriculum overview (philosophy, approach, subjects)
4. Detailed subject reports with skills, assessments, and hours
5. Reading summary with book list
6. Assessment results overview
7. Attendance record
8. Portfolio summary by category
9. Overall narrative: growth, strengths, challenges, plans for next year
10. Parent reflection section (leave blank for parent to fill in)

Use inline CSS. Make it professional and comprehensive — suitable for state compliance or umbrella school submission. Include page breaks between major sections.
Return ONLY the HTML — no markdown fences, no explanation.`;

  return callAI(prompt, modelId, apiKeys);
}
