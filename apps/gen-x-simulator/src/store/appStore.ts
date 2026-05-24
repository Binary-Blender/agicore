import { create } from 'zustand';
import * as api from '../api';
import type { Lesson, Platform, Profile, RunOutput } from '../types';

type Stage = 'chooser' | 'booting' | 'workspace';

interface AppState {
  profile: Profile | null;
  platforms: Platform[];
  activePlatform: Platform | null;
  stage: Stage;
  bootScreen: string;
  bootProgress: number;       // 0..1 — what fraction of bootScreen has typed in
  shellOutput: string;
  programSource: string;
  lessons: Lesson[];
  activeLesson: Lesson | null;
  magazineOpen: boolean;
  running: boolean;
  needsInput: boolean;
  inputPrompt: string;
  pendingInputVar: string;
  pendingInterpreterState: unknown | null;
  lastError: string | null;
  lastVerdict: 'success' | 'wrong_output' | 'runtime_error' | null;

  initialize: () => Promise<void>;
  chooseProfileHandle: (handle: string) => Promise<void>;
  selectPlatform: (platform: Platform) => Promise<void>;
  finishBoot: () => void;
  openMagazine: () => void;
  closeMagazine: () => void;
  setProgramSource: (s: string) => void;
  loadLessonIntoEditor: (lesson: Lesson) => void;
  runProgram: () => Promise<void>;
  submitInput: (input: string) => Promise<void>;
  resetWorkspace: () => void;
  backToChooser: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  profile: null,
  platforms: [],
  activePlatform: null,
  stage: 'chooser',
  bootScreen: '',
  bootProgress: 0,
  shellOutput: '',
  programSource: '',
  lessons: [],
  activeLesson: null,
  magazineOpen: false,
  running: false,
  needsInput: false,
  inputPrompt: '',
  pendingInputVar: '',
  pendingInterpreterState: null,
  lastError: null,
  lastVerdict: null,

  initialize: async () => {
    const platforms = await api.listPlatforms();
    set({ platforms });
  },

  chooseProfileHandle: async (handle: string) => {
    const profile = await api.ensureProfile(handle);
    set({ profile });
  },

  selectPlatform: async (platform: Platform) => {
    const { profile } = get();
    if (profile) {
      await api.choosePlatform(profile.id, platform.name);
    }
    const [bootScreen, lessons] = await Promise.all([
      api.bootPlatform(platform.name),
      api.getLessons(platform.name),
    ]);
    set({
      activePlatform: platform,
      stage: 'booting',
      bootScreen,
      bootProgress: 0,
      lessons,
      activeLesson: lessons[0] ?? null,
      shellOutput: '',
      programSource: '',
      lastError: null,
      lastVerdict: null,
    });
  },

  finishBoot: () => {
    const { bootScreen } = get();
    set({ stage: 'workspace', shellOutput: bootScreen });
  },

  openMagazine: () => set({ magazineOpen: true }),
  closeMagazine: () => set({ magazineOpen: false }),

  setProgramSource: (s) => set({ programSource: s }),

  loadLessonIntoEditor: (lesson) => {
    set({
      activeLesson: lesson,
      programSource: lesson.printedListing,
      magazineOpen: false,
      lastVerdict: null,
      lastError: null,
    });
  },

  runProgram: async () => {
    const { activePlatform, programSource, activeLesson, shellOutput } = get();
    if (!activePlatform) return;
    set({ running: true, lastError: null, lastVerdict: null });
    try {
      const result = await api.runProgram(
        activePlatform.name,
        programSource,
        activeLesson?.id ?? null,
      );
      applyRunResult(result, shellOutput, set, get);
    } catch (e: any) {
      set({
        running: false,
        lastError: typeof e === 'string' ? e : String(e),
        shellOutput: shellOutput + '\n' + (typeof e === 'string' ? e : String(e)) + '\nREADY.\n',
      });
    }
  },

  submitInput: async (input: string) => {
    const {
      activePlatform, programSource, activeLesson,
      pendingInputVar, pendingInterpreterState, shellOutput,
    } = get();
    if (!activePlatform || !pendingInterpreterState) return;
    set({ running: true });
    try {
      const result = await api.resumeProgram(
        activePlatform.name,
        programSource,
        pendingInterpreterState,
        pendingInputVar,
        input,
        activeLesson?.id ?? null,
      );
      // append user-typed input + newline to the visible shell, then apply result
      const echoed = shellOutput + input + '\n';
      set({ shellOutput: echoed });
      applyRunResult(result, echoed, set, get);
    } catch (e: any) {
      set({ running: false, lastError: String(e) });
    }
  },

  resetWorkspace: () => {
    const { bootScreen } = get();
    set({
      shellOutput: bootScreen,
      programSource: '',
      lastError: null,
      lastVerdict: null,
      needsInput: false,
      pendingInputVar: '',
      pendingInterpreterState: null,
    });
  },

  backToChooser: () => set({ stage: 'chooser', activePlatform: null }),
}));

function applyRunResult(
  result: RunOutput,
  baseShell: string,
  set: any,
  get: any,
) {
  if (result.outcome === 'needs_input') {
    const shellNext = (result.clearScreen ? '' : baseShell) +
      result.output +
      (result.prompt ?? '? ');
    set({
      running: false,
      needsInput: true,
      inputPrompt: result.prompt ?? '? ',
      pendingInputVar: result.varName ?? '',
      pendingInterpreterState: result.interpreterState,
      shellOutput: shellNext,
    });
    return;
  }

  // Halted, success, wrong_output, or runtime_error
  const epilogue = result.errorMessage
    ? `\n${result.errorMessage}\nREADY.\n`
    : `\nREADY.\n`;
  const shellNext = (result.clearScreen ? '' : baseShell) + result.output + epilogue;

  let verdict: 'success' | 'wrong_output' | 'runtime_error' | null = null;
  if (result.outcome === 'success') verdict = 'success';
  else if (result.outcome === 'wrong_output') verdict = 'wrong_output';
  else if (result.outcome === 'runtime_error') verdict = 'runtime_error';

  set({
    running: false,
    needsInput: false,
    pendingInputVar: '',
    pendingInterpreterState: null,
    inputPrompt: '',
    shellOutput: shellNext,
    lastError: result.errorMessage,
    lastVerdict: verdict,
  });

  // Record the attempt asynchronously — fire-and-forget.
  const { profile, activeLesson, programSource } = get();
  if (profile && activeLesson) {
    api
      .recordAttempt(
        profile.id,
        activeLesson.id,
        programSource,
        result.outcome === 'success'
          ? 'success'
          : result.outcome === 'runtime_error'
          ? 'runtime_error'
          : 'wrong_output',
        result.output,
        result.errorMessage,
        0,
      )
      .catch(() => {});
  }
}
