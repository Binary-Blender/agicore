/**
 * Text Generation Provider Abstraction
 *
 * Switches between OpenAI and Refrain API based on TEXT_GENERATION_PROVIDER env var.
 * This allows easy switching between providers without code changes.
 *
 * Environment variables:
 * - TEXT_GENERATION_PROVIDER: 'openai' | 'refrain' (default: 'openai')
 * - For OpenAI: OPENAI_API_KEY
 * - For Refrain: REFRAIN_API_URL, REFRAIN_API_KEY
 */

import * as openaiService from './openaiService';
import * as refrainService from './refrainService';

export type TextGenerationProvider = 'openai' | 'refrain';

const getProvider = (): TextGenerationProvider => {
  const provider = (process.env.TEXT_GENERATION_PROVIDER || 'openai').toLowerCase();
  if (provider === 'refrain') {
    return 'refrain';
  }
  return 'openai';
};

export const getCurrentProvider = (): TextGenerationProvider => getProvider();

export const generateSongLyrics = async (
  policyText: string,
  emphasisPrompt: string
) => {
  const provider = getProvider();
  console.log(`[TextGen] Using ${provider} for lyrics generation`);

  if (provider === 'refrain') {
    return refrainService.generateSongLyrics(policyText, emphasisPrompt);
  }
  return openaiService.generateSongLyrics(policyText, emphasisPrompt);
};

export const generateReminderPhrases = async (
  policyText: string,
  lyricsText: string
) => {
  const provider = getProvider();
  console.log(`[TextGen] Using ${provider} for reminder phrases`);

  if (provider === 'refrain') {
    return refrainService.generateReminderPhrases(policyText, lyricsText);
  }
  return openaiService.generateReminderPhrases(policyText, lyricsText);
};

export const generateQuizQuestions = async (
  policyText: string,
  reinforcementPhrases: string[],
  policyHighlights: string[],
  lyricsText?: string
) => {
  const provider = getProvider();
  console.log(`[TextGen] Using ${provider} for quiz questions`);

  if (provider === 'refrain') {
    return refrainService.generateQuizQuestions(
      policyText,
      reinforcementPhrases,
      policyHighlights,
      lyricsText
    );
  }
  return openaiService.generateQuizQuestions(
    policyText,
    reinforcementPhrases,
    policyHighlights,
    lyricsText
  );
};

export const generateVisualPrompt = async (options: {
  reminderPhrase: string;
  policySnippet: string;
  lyricsSnippet: string;
}) => {
  const provider = getProvider();
  console.log(`[TextGen] Using ${provider} for visual prompt`);

  if (provider === 'refrain') {
    return refrainService.generateVisualPrompt(options);
  }
  return openaiService.generateVisualPrompt(options);
};

// Re-export types for convenience
export type {
  LyricsResult,
  ReminderResult,
  QuizQuestionGenerationResult,
  VisualPromptResult,
} from './openaiService';
