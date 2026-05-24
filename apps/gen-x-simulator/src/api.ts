import { invoke } from '@tauri-apps/api/core';
import type { Platform, Profile, Lesson, RunOutput, SkillSnapshot } from './types';

export const listPlatforms = () => invoke<Platform[]>('list_platforms');

export const bootPlatform = (name: string) =>
  invoke<string>('boot_platform', { name });

export const getLessons = (platform: string) =>
  invoke<Lesson[]>('get_lessons', { platform });

export const ensureProfile = (handle: string) =>
  invoke<Profile>('ensure_profile', { handle });

export const choosePlatform = (profileId: string, platform: string) =>
  invoke<void>('choose_platform', { profileId, platform });

export const runProgram = (
  platform: string,
  source: string,
  lessonId: string | null,
) => invoke<RunOutput>('run_program', { platform, source, lessonId });

export const resumeProgram = (
  platform: string,
  source: string,
  interpreterState: unknown,
  varName: string,
  input: string,
  lessonId: string | null,
) =>
  invoke<RunOutput>('resume_program', {
    platform,
    source,
    interpreterState,
    varName,
    input,
    lessonId,
  });

export const recordAttempt = (
  profileId: string,
  lessonId: string,
  typedProgram: string,
  outcome: string,
  output: string,
  errorMessage: string | null,
  durationSeconds: number,
) =>
  invoke<void>('record_attempt', {
    profileId,
    lessonId,
    typedProgram,
    outcome,
    output,
    errorMessage,
    durationSeconds,
  });

export const getSkillSnapshot = (profileId: string) =>
  invoke<SkillSnapshot[]>('get_skill_snapshot', { profileId });
