/**
 * Refrain Coding API Service
 * Alternative text generation provider using self-hosted LLM
 */

const REFRAIN_API_URL = process.env.REFRAIN_API_URL || 'https://refrain-coding-api.fly.dev';
const REFRAIN_API_KEY = process.env.REFRAIN_API_KEY || '';

interface RefrainResponse {
  id: string;
  created: number;
  model: string;
  choices: Array<{
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

const callRefrainAPI = async (
  systemPrompt: string,
  userPrompt: string,
  temperature: number = 0.7,
  maxTokens: number = 2048
): Promise<{ content: string; usage: any }> => {
  if (!REFRAIN_API_KEY) {
    throw new Error('Refrain API key is not configured. Please set REFRAIN_API_KEY.');
  }

  const response = await fetch(`${REFRAIN_API_URL}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': REFRAIN_API_KEY,
    },
    body: JSON.stringify({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      model: 'auto',
      temperature,
      max_tokens: maxTokens,
      project_context: {
        project_id: 'melody-lms',
        role: 'creative',
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Refrain API error (${response.status}): ${errorText}`);
  }

  const data = (await response.json()) as RefrainResponse;
  const content = data.choices[0]?.message?.content || '';

  return {
    content,
    usage: {
      prompt_tokens: data.usage.prompt_tokens,
      completion_tokens: data.usage.completion_tokens,
      total_tokens: data.usage.total_tokens,
    },
  };
};

const normalizeText = (text: string, maxLength = 12000) => {
  if (!text) return '';
  const compact = text.replace(/\s+/g, ' ').trim();
  return compact.length > maxLength ? compact.slice(0, maxLength) : compact;
};

const clampReminderPhrase = (input: string) => {
  const cleaned = (input || '')
    .replace(/'/g, '')
    .replace(/[^A-Za-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned) return '';
  const words = cleaned.split(' ').filter(Boolean);
  if (!words.length) return '';
  if (words.length > 5) return words.slice(0, 5).join(' ');
  if (words.length < 3) {
    const filler = words[words.length - 1] || words[0];
    while (words.length < 3) words.push(filler);
  }
  return words.join(' ');
};

export interface LyricsResult {
  lyrics: string;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
}

export interface ReminderResult {
  reinforcement: string[];
  policyHighlights: string[];
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
}

export interface RawQuizQuestion {
  question: string;
  correct_answer: string;
  incorrect_answers: string[];
  reference_phrase?: string;
  explanation?: string;
}

export interface QuizQuestionGenerationResult {
  lyric_reinforcement: RawQuizQuestion[];
  policy_addons: RawQuizQuestion[];
  policy_only: RawQuizQuestion[];
  expert: RawQuizQuestion[];
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
}

export interface VisualPromptResult {
  prompt: string;
  negativePrompt: string;
  policySnippet: string;
  lyricsSnippet: string;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
}

export const generateSongLyrics = async (
  policyText: string,
  emphasisPrompt: string
): Promise<LyricsResult> => {
  const inputPolicy = normalizeText(policyText, 3500); // Smaller for 4K context
  const emphasis = emphasisPrompt.trim();

  const systemPrompt =
    'You are MelodyLMS, a playful corporate songwriter. Craft concise, catchy lyrics (three verses and a chorus) that teach compliance topics in under 2 minutes. Keep lines easy to sing, with internal rhymes and memorable hooks.';

  const userPrompt = `Policy details to base the song on:\n${inputPolicy}\n\nKey ideas to emphasize in the song:\n${emphasis}\n\nWrite song lyrics with a title line, three short verses, a chorus, and an optional bridge. Use bullet-free plain text.`;

  const result = await callRefrainAPI(systemPrompt, userPrompt, 0.8, 1500);

  return {
    lyrics: result.content.trim(),
    usage: result.usage,
  };
};

export const generateReminderPhrases = async (
  policyText: string,
  lyricsText: string
): Promise<ReminderResult> => {
  const policy = normalizeText(policyText, 2500);
  const lyrics = normalizeText(lyricsText, 1500);

  const systemPrompt =
    'You create ultra-short on-screen reminder phrases (3-5 words) for compliance music videos. Use rhyme, alliteration, or rhythm so the phrases stick instantly. Respond ONLY with valid JSON.';

  const userPrompt = `Song lyrics:\n${lyrics}\n\nPolicy document excerpt:\n${policy}\n\nGenerate JSON with exactly two arrays: "reinforcement" (15 phrases that restate lessons from the lyrics) and "policy_highlights" (15 phrases drawn from the policy document that add context beyond the lyrics). Each phrase must be 3-5 words, no punctuation beyond hyphens, and crafted to feel rhythmic. Respond ONLY with minified JSON.`;

  const result = await callRefrainAPI(systemPrompt, userPrompt, 0.7, 1500);

  const sanitizedPayload = result.content.replace(/```json|```/gi, '').trim();

  let parsed: { reinforcement?: string[]; policy_highlights?: string[] } = {};
  try {
    parsed = JSON.parse(sanitizedPayload);
  } catch (error) {
    console.error('Refrain reminder text raw output:', result.content);
    throw new Error('Failed to parse Refrain AI response for reminder phrases.');
  }

  const formatPhrases = (phrases?: unknown[]) =>
    (Array.isArray(phrases) ? phrases : [])
      .map((phrase) => (typeof phrase === 'string' ? clampReminderPhrase(phrase) : ''))
      .filter((phrase) => !!phrase)
      .slice(0, 15);

  return {
    reinforcement: formatPhrases(parsed.reinforcement),
    policyHighlights: formatPhrases(parsed.policy_highlights),
    usage: result.usage,
  };
};

const buildListText = (label: string, values: string[]) => {
  if (!values.length) return `${label}: (none provided)`;
  return `${label}:\n- ${values.join('\n- ')}`;
};

export const generateQuizQuestions = async (
  policyText: string,
  reinforcementPhrases: string[],
  policyHighlights: string[],
  lyricsText?: string
): Promise<QuizQuestionGenerationResult> => {
  const policy = normalizeText(policyText, 3000);
  const reinforcement = reinforcementPhrases.filter(Boolean).map((phrase) => phrase.trim());
  const highlights = policyHighlights.filter(Boolean).map((phrase) => phrase.trim());
  const lyrics = lyricsText ? normalizeText(lyricsText, 1000) : '';

  const systemPrompt =
    'You are MelodyLMS, a compliance training quiz writer. Produce JSON only. All questions must be single-answer multiple choice with 4 options.';

  const userPrompt = `Policy summary:\n${policy}\n\nSong lyrics context (optional):\n${lyrics || '(none)'}\n\n${buildListText(
    'Lyric reinforcement phrases',
    reinforcement
  )}\n\n${buildListText('Policy add-on phrases', highlights)}\n\nCreate JSON in the following shape:\n{\n  "lyric_reinforcement": [\n    {\n      "question": "",\n      "correct_answer": "",\n      "incorrect_answers": ["", "", ""],\n      "reference_phrase": "",\n      "explanation": ""\n    }\n  ],\n  "policy_addons": [ ... ],\n  "policy_only": [ ... ],\n  "expert": [ ... ]\n}\n\nRules:\n- Provide exactly 3 questions for lyric_reinforcement, 3 for policy_addons, 3 for policy_only, and 2 expert questions (11 total).\n- Each incorrect_answers array must have exactly three distinct distractors.\n- Reference phrase should cite which reminder or policy concept inspired the question (or "policy body" / "expert inference").\n- Explanations should give a short reinforcement (1 sentence).\n- Expert questions must require deductive reasoning based on the policy rather than direct quotes.`;

  const result = await callRefrainAPI(systemPrompt, userPrompt, 0.5, 3000);

  const sanitized = result.content.replace(/```json|```/gi, '').trim();

  let parsed: any = {};
  try {
    parsed = JSON.parse(sanitized);
  } catch (error) {
    console.error('Refrain quiz question raw output:', result.content);
    throw new Error('Failed to parse Refrain AI response for quiz questions.');
  }

  const normalizeCategory = (value: any) =>
    Array.isArray(value)
      ? (value as any[]).map((item) => ({
          question: item?.question || '',
          correct_answer: item?.correct_answer || '',
          incorrect_answers: Array.isArray(item?.incorrect_answers)
            ? item.incorrect_answers.slice(0, 3)
            : [],
          reference_phrase: item?.reference_phrase || '',
          explanation: item?.explanation || '',
        }))
      : [];

  return {
    lyric_reinforcement: normalizeCategory(parsed.lyric_reinforcement),
    policy_addons: normalizeCategory(parsed.policy_addons),
    policy_only: normalizeCategory(parsed.policy_only),
    expert: normalizeCategory(parsed.expert),
    usage: result.usage,
  };
};

export const generateVisualPrompt = async (options: {
  reminderPhrase: string;
  policySnippet: string;
  lyricsSnippet: string;
}): Promise<VisualPromptResult> => {
  const reminder = options.reminderPhrase.trim();
  if (!reminder) {
    throw new Error('Reminder phrase is required to generate a prompt.');
  }

  const systemPrompt =
    'You are MelodyLMS visual director. Produce cinematic but professional prompts for illustration generation. Respond only with valid minified JSON: {"prompt":"","negative_prompt":"}.';

  const userPrompt = `Reminder phrase: ${reminder}\n\nPolicy context:\n${options.policySnippet}\n\nLyrics context:\n${options.lyricsSnippet}\n\nInstructions:\n- "prompt" should be <=120 words and describe the full scene, camera angle, lighting, mood, and style.\n- "negative_prompt" should be <=40 words listing elements to avoid (e.g., "no text, no logos, no photorealistic faces").\n- Focus on literal depictions of the compliance action.`;

  const result = await callRefrainAPI(systemPrompt, userPrompt, 0.5, 800);

  const sanitized = result.content.replace(/```json|```/gi, '').trim();
  let parsed: { prompt?: string; negative_prompt?: string } = {};
  try {
    parsed = JSON.parse(sanitized);
  } catch (error) {
    console.error('Refrain visual prompt raw output:', result.content);
    throw new Error('Failed to parse Refrain AI response for visual prompt.');
  }

  const prompt = (parsed.prompt || '').trim();
  const negativePrompt = (parsed.negative_prompt || '').trim();
  if (!prompt) {
    throw new Error('Refrain AI response did not include a prompt.');
  }

  return {
    prompt,
    negativePrompt,
    policySnippet: options.policySnippet,
    lyricsSnippet: options.lyricsSnippet,
    usage: result.usage,
  };
};
