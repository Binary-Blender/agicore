export interface Platform {
  id: string;
  name: string;
  displayName: string;
  releaseYear: number;
  culturalLineage: string;
  isImplemented: boolean;
}

export interface Profile {
  id: string;
  handle: string;
  currentPlatform: string | null;
  totalPlayTimeSeconds: number;
  createdAt: string;
  updatedAt: string;
}

export interface Lesson {
  id: string;
  platform: string;
  magazineTitle: string;
  magazineIssue: string;
  page: number;
  title: string;
  articleMarkdown: string;
  printedListing: string;
  errataText: string | null;
  difficulty: number;
}

export interface RunOutput {
  outcome: 'halted' | 'success' | 'wrong_output' | 'runtime_error' | 'needs_input';
  output: string;
  clearScreen: boolean;
  errorMessage: string | null;
  prompt: string | null;
  varName: string | null;
  interpreterState: unknown | null;
  graded: boolean | null;
}

export interface SkillSnapshot {
  platform: string;
  lessonsCompleted: number;
  totalAttempts: number;
  totalSyntaxErrors: number;
  defectsFound: number;
  currentStreak: number;
}
