// NovaSyn Academy — Shared Types

// ─── Data Interfaces ──────────────────────────────────────────────────────────

export interface Settings {
  theme: 'dark' | 'light';
  defaultModel: string;
}

export interface AIModel {
  id: string;
  name: string;
  provider: 'anthropic' | 'openai' | 'google' | 'xai' | 'babyai';
  contextWindow: number;
  requiresKey: boolean;
}

export interface Student {
  id: string;
  name: string;
  birthDate: string | null;
  gradeLevel: string | null;
  state: string | null;
  avatarEmoji: string;
  interests: string[];
  learningStyle: Record<string, number>;
  strengths: string[];
  struggles: string[];
  notes: string;
  teachingPhilosophy: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateStudentInput {
  name: string;
  birthDate?: string;
  gradeLevel?: string;
  state?: string;
  avatarEmoji?: string;
  interests?: string[];
  learningStyle?: Record<string, number>;
  strengths?: string[];
  struggles?: string[];
  notes?: string;
  teachingPhilosophy?: string;
}

export interface SchoolYear {
  id: string;
  studentId: string;
  name: string;
  startDate: string;
  endDate: string;
  targetSchoolDays: number;
  actualSchoolDays: number;
  isCurrent: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSchoolYearInput {
  studentId: string;
  name: string;
  startDate: string;
  endDate: string;
  targetSchoolDays?: number;
}

export interface Subject {
  id: string;
  studentId: string;
  schoolYearId: string;
  name: string;
  color: string;
  targetHoursPerWeek: number;
  actualHours: number;
  philosophy: string | null;
  notes: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSubjectInput {
  studentId: string;
  schoolYearId: string;
  name: string;
  color?: string;
  targetHoursPerWeek?: number;
  philosophy?: string;
}

export interface Lesson {
  id: string;
  studentId: string;
  subjectId: string;
  schoolYearId: string;
  title: string;
  description: string;
  scheduledDate: string | null;
  estimatedMinutes: number;
  actualMinutes: number | null;
  lessonContent: string;
  materialsNeeded: string[];
  objectives: string[];
  status: 'planned' | 'in_progress' | 'completed' | 'skipped';
  completionNotes: string;
  sortOrder: number;
  aiGenerated: boolean;
  modelUsed: string | null;
  generationCost: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLessonInput {
  studentId: string;
  subjectId: string;
  schoolYearId: string;
  title: string;
  description?: string;
  scheduledDate?: string;
  estimatedMinutes?: number;
  lessonContent?: string;
  materialsNeeded?: string[];
  objectives?: string[];
  sortOrder?: number;
}

export interface GenerateLessonsInput {
  studentId: string;
  date: string;
  scope: 'day' | 'week';
  subjectIds?: string[];
  model?: string;
}

export interface Attendance {
  id: string;
  studentId: string;
  schoolYearId: string;
  date: string;
  status: 'present' | 'absent' | 'half_day' | 'field_trip' | 'co_op';
  totalMinutes: number;
  subjectsCompleted: string[];
  notes: string;
  createdAt: string;
}

export interface AICostSummary {
  totalCost: number;
  totalCalls: number;
  totalTokensIn: number;
  totalTokensOut: number;
  byFeature: { feature: string; calls: number; cost: number }[];
  byModel: { model: string; calls: number; cost: number }[];
}

// ─── Sprint 2: Skills, Assessments, Reading ──────────────────────────────────

export interface Skill {
  id: string;
  studentId: string;
  subjectId: string;
  name: string;
  proficiency: number;
  notes: string;
  timesPracticed: number;
  lastPracticed: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSkillInput {
  studentId: string;
  subjectId: string;
  name: string;
  proficiency?: number;
}

export interface AssessmentQuestion {
  question: string;
  type: 'multiple_choice' | 'true_false' | 'short_answer' | 'fill_blank';
  options?: string[];
  correctAnswer: string;
  points: number;
  skillName?: string;
}

export interface AssessmentAnswer {
  questionIndex: number;
  answer: string;
  correct?: boolean;
  points?: number;
}

export interface Assessment {
  id: string;
  studentId: string;
  subjectId: string;
  schoolYearId: string;
  title: string;
  assessmentType: 'quiz' | 'test' | 'oral' | 'project' | 'worksheet';
  questions: AssessmentQuestion[];
  answers: AssessmentAnswer[];
  totalPoints: number;
  earnedPoints: number;
  scorePercent: number | null;
  status: 'pending' | 'in_progress' | 'completed' | 'graded';
  gradedAt: string | null;
  notes: string;
  aiGenerated: boolean;
  modelUsed: string | null;
  generationCost: number;
  lessonIds: string[];
  skillIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateAssessmentInput {
  studentId: string;
  subjectId: string;
  schoolYearId: string;
  title: string;
  assessmentType?: string;
  questions?: AssessmentQuestion[];
  lessonIds?: string[];
}

export interface GenerateAssessmentInput {
  studentId: string;
  subjectId: string;
  lessonIds?: string[];
  questionCount?: number;
  assessmentType?: string;
  model?: string;
}

export interface ReadingEntry {
  id: string;
  studentId: string;
  schoolYearId: string;
  title: string;
  author: string;
  genre: string;
  totalPages: number | null;
  pagesRead: number;
  status: 'reading' | 'completed' | 'abandoned';
  startDate: string | null;
  finishDate: string | null;
  totalMinutes: number;
  rating: number | null;
  review: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateReadingEntryInput {
  studentId: string;
  schoolYearId: string;
  title: string;
  author?: string;
  genre?: string;
  totalPages?: number;
  startDate?: string;
}

export interface ProgressData {
  skillsBySubject: { subjectId: string; subjectName: string; subjectColor: string; skills: Skill[] }[];
  assessmentScores: { subjectName: string; subjectColor: string; scores: { date: string; percent: number }[] }[];
  readingStats: { totalBooks: number; completed: number; totalPages: number; totalMinutes: number };
  weeklyHours: { week: string; hours: number }[];
}

// ─── Sprint 3: AI Tutor, Resources, PDF ──────────────────────────────────────

export interface TutorSession {
  id: string;
  studentId: string;
  subjectId: string | null;
  schoolYearId: string;
  topic: string;
  mode: 'guided' | 'free' | 'review';
  status: 'active' | 'paused' | 'completed';
  totalMessages: number;
  studentMessages: number;
  questionsAsked: number;
  correctAnswers: number;
  safetyAlerts: number;
  contentFlags: number;
  redirections: number;
  durationSeconds: number;
  aiSummary: string;
  modelUsed: string | null;
  totalCost: number;
  startedAt: string;
  endedAt: string | null;
  createdAt: string;
}

export interface TutorMessage {
  id: string;
  sessionId: string;
  role: 'student' | 'tutor' | 'system';
  content: string;
  filtered: boolean;
  filterReason: string | null;
  tokensIn: number;
  tokensOut: number;
  cost: number;
  createdAt: string;
}

export interface CreateTutorSessionInput {
  studentId: string;
  schoolYearId: string;
  topic: string;
  subjectId?: string;
  mode?: 'guided' | 'free' | 'review';
  model?: string;
}

export interface SendTutorMessageInput {
  sessionId: string;
  content: string;
  model?: string;
}

export interface TutorStreamChunk {
  type: 'chunk' | 'done' | 'error' | 'filtered';
  content?: string;
  message?: TutorMessage;
  session?: TutorSession;
  error?: string;
  filterReason?: string;
}

export interface Resource {
  id: string;
  studentId: string;
  subjectId: string | null;
  schoolYearId: string;
  title: string;
  resourceType: 'worksheet' | 'flashcards' | 'quiz' | 'coloring' | 'puzzle';
  topic: string;
  difficulty: string;
  content: string;
  answerKey: string;
  aiGenerated: boolean;
  modelUsed: string | null;
  generationCost: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateResourceInput {
  studentId: string;
  schoolYearId: string;
  title: string;
  resourceType: 'worksheet' | 'flashcards' | 'quiz' | 'coloring' | 'puzzle';
  topic: string;
  subjectId?: string;
  difficulty?: string;
}

export interface GenerateResourceInput {
  studentId: string;
  schoolYearId: string;
  resourceType: 'worksheet' | 'flashcards' | 'quiz' | 'coloring' | 'puzzle';
  topic: string;
  subjectId?: string;
  difficulty?: string;
  model?: string;
}

export interface SafetyFilterResult {
  safe: boolean;
  reason?: string;
  category?: 'personal_info' | 'distress' | 'inappropriate' | 'off_topic';
}

// ─── Sprint 4: Gamification & Multi-Child ─────────────────────────────────────

export interface GamificationSettings {
  id: string;
  studentId: string;
  enabled: boolean;
  theme: string;
  xpCompleteLesson: number;
  xpAssessmentPass: number;
  xpAssessmentPerfect: number;
  xpCompleteDaily: number;
  xpReadingSession: number;
  xpStreakDay: number;
  xpBonusChallenge: number;
  xpHelpSibling: number;
  showXpNumbers: boolean;
  showSkillTree: boolean;
  showStreak: boolean;
  showBadges: boolean;
  badgesMath: boolean;
  badgesReading: boolean;
  badgesStreak: boolean;
  badgesSubject: boolean;
  badgesSpecial: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface XPLogEntry {
  id: string;
  studentId: string;
  amount: number;
  reason: string;
  category: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface BadgeDefinition {
  id: string;
  name: string;
  icon: string;
  description: string;
  category: 'math' | 'reading' | 'streak' | 'subject' | 'special';
}

export interface BadgeEarned {
  id: string;
  studentId: string;
  badgeId: string;
  badgeName: string;
  badgeIcon: string;
  badgeDescription: string;
  badgeCategory: string;
  earnedAt: string;
}

export interface StreakInfo {
  currentStreak: number;
  longestStreak: number;
  lastSchoolDate: string | null;
}

export interface Goal {
  id: string;
  studentId: string;
  title: string;
  goalType: 'weekly' | 'monthly' | 'custom';
  targetXp: number;
  earnedXp: number;
  rewardText: string;
  status: 'active' | 'completed' | 'expired';
  startDate: string;
  endDate: string;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateGoalInput {
  studentId: string;
  title: string;
  goalType?: 'weekly' | 'monthly' | 'custom';
  targetXp: number;
  rewardText?: string;
  startDate: string;
  endDate: string;
}

export interface GamificationState {
  settings: GamificationSettings;
  totalXp: number;
  level: number;
  levelName: string;
  xpToNextLevel: number;
  streak: StreakInfo;
  badges: BadgeEarned[];
  recentXp: XPLogEntry[];
  activeGoals: Goal[];
  todayXp: number;
}

export interface XPAwardResult {
  xpAwarded: number;
  newTotal: number;
  levelUp: { newLevel: number; newLevelName: string } | null;
  newBadges: BadgeEarned[];
  goalCompleted: Goal | null;
  streak: StreakInfo;
}

export interface GenerateMultiChildScheduleInput {
  studentIds: string[];
  date: string;
  scope: 'day' | 'week';
  model?: string;
}

// ─── Sprint 5: Compliance, Portfolio, Reports ────────────────────────────────

export interface ComplianceRequirement {
  id: string;
  state: string;
  requirementType: string;
  description: string;
  isRequired: boolean;
  details: Record<string, unknown>;
  sourceUrl: string;
  lastVerified: string | null;
  createdAt: string;
}

export interface ComplianceStatus {
  id: string;
  studentId: string;
  schoolYearId: string;
  complianceId: string;
  status: 'not_started' | 'in_progress' | 'completed' | 'not_applicable';
  completionDate: string | null;
  notes: string;
  documentationPath: string;
  createdAt: string;
  updatedAt: string;
  // Joined from compliance table
  requirement?: ComplianceRequirement;
}

export interface PortfolioItem {
  id: string;
  studentId: string;
  schoolYearId: string;
  subjectId: string | null;
  lessonId: string | null;
  assessmentId: string | null;
  title: string;
  description: string;
  itemType: 'writing_sample' | 'artwork' | 'project_photo' | 'test_result' | 'certificate' | 'book_report' | 'other';
  filePath: string;
  content: string;
  tags: string[];
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePortfolioItemInput {
  studentId: string;
  schoolYearId: string;
  subjectId?: string;
  lessonId?: string;
  assessmentId?: string;
  title: string;
  description?: string;
  itemType: PortfolioItem['itemType'];
  filePath?: string;
  content?: string;
  tags?: string[];
  notes?: string;
}

export interface GenerateReportCardInput {
  studentId: string;
  schoolYearId: string;
  period: string;
  style: 'traditional' | 'narrative' | 'standards_based' | 'hybrid';
  model?: string;
}

export interface GenerateTranscriptInput {
  studentId: string;
  schoolYearIds?: string[];
  model?: string;
}

export interface ReportCard {
  html: string;
  studentName: string;
  period: string;
  style: string;
  generatedAt: string;
}

export interface Transcript {
  html: string;
  studentName: string;
  schoolYears: string[];
  generatedAt: string;
}

// ─── Orchestration types ──────────────────────────────────────────────────────

export type OrchestrationStepType = 'ai_action' | 'qc_checkpoint' | 'transform' | 'vault_save' | 'vault_load';

export interface OrchestrationStep {
  id: string;
  type: OrchestrationStepType;
  name: string;
  config: {
    model?: string;
    promptTemplate?: string;
    inputSource?: 'previous' | 'manual' | 'vault';
    vaultItemId?: string;
    outputType?: string;
    saveToVault?: boolean;
    tags?: string[];
    manualInput?: string;
    transformType?: 'extract_json' | 'format_text' | 'regex';
    transformPattern?: string;
    qcDescription?: string;
  };
}

export interface Orchestration {
  id: string;
  name: string;
  description: string;
  steps: OrchestrationStep[];
  isTemplate: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StepResult {
  stepId: string;
  stepIndex: number;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped' | 'awaiting_qc';
  output: any;
  vaultItemId?: string;
  error?: string;
  startedAt?: string;
  completedAt?: string;
  latencyMs?: number;
  qcDecision?: 'approved' | 'rejected' | null;
}

export interface OrchestrationRun {
  id: string;
  orchestrationId: string;
  status: 'pending' | 'running' | 'paused_for_qc' | 'completed' | 'failed';
  currentStepIndex: number;
  stepResults: StepResult[];
  error?: string;
  startedAt: string;
  pausedAt?: string;
  completedAt?: string;
}

// ─── IPC Channels ─────────────────────────────────────────────────────────────

export const IPC_CHANNELS = {
  // Settings
  GET_SETTINGS: 'GET_SETTINGS',
  SAVE_SETTINGS: 'SAVE_SETTINGS',
  GET_API_KEYS: 'GET_API_KEYS',
  GET_MODELS: 'GET_MODELS',

  // Students
  GET_STUDENTS: 'GET_STUDENTS',
  CREATE_STUDENT: 'CREATE_STUDENT',
  UPDATE_STUDENT: 'UPDATE_STUDENT',
  DELETE_STUDENT: 'DELETE_STUDENT',

  // School Years
  GET_SCHOOL_YEARS: 'GET_SCHOOL_YEARS',
  CREATE_SCHOOL_YEAR: 'CREATE_SCHOOL_YEAR',
  UPDATE_SCHOOL_YEAR: 'UPDATE_SCHOOL_YEAR',
  DELETE_SCHOOL_YEAR: 'DELETE_SCHOOL_YEAR',

  // Subjects
  GET_SUBJECTS: 'GET_SUBJECTS',
  CREATE_SUBJECT: 'CREATE_SUBJECT',
  UPDATE_SUBJECT: 'UPDATE_SUBJECT',
  DELETE_SUBJECT: 'DELETE_SUBJECT',

  // Lessons
  GET_LESSONS: 'GET_LESSONS',
  CREATE_LESSON: 'CREATE_LESSON',
  UPDATE_LESSON: 'UPDATE_LESSON',
  DELETE_LESSON: 'DELETE_LESSON',
  COMPLETE_LESSON: 'COMPLETE_LESSON',
  GENERATE_LESSONS: 'GENERATE_LESSONS',

  // Attendance
  GET_ATTENDANCE: 'GET_ATTENDANCE',
  UPDATE_ATTENDANCE: 'UPDATE_ATTENDANCE',

  // Skills
  GET_SKILLS: 'GET_SKILLS',
  CREATE_SKILL: 'CREATE_SKILL',
  UPDATE_SKILL: 'UPDATE_SKILL',
  DELETE_SKILL: 'DELETE_SKILL',

  // Assessments
  GET_ASSESSMENTS: 'GET_ASSESSMENTS',
  CREATE_ASSESSMENT: 'CREATE_ASSESSMENT',
  UPDATE_ASSESSMENT: 'UPDATE_ASSESSMENT',
  DELETE_ASSESSMENT: 'DELETE_ASSESSMENT',
  GENERATE_ASSESSMENT: 'GENERATE_ASSESSMENT',
  GRADE_ASSESSMENT: 'GRADE_ASSESSMENT',

  // Reading Log
  GET_READING_LOG: 'GET_READING_LOG',
  CREATE_READING_ENTRY: 'CREATE_READING_ENTRY',
  UPDATE_READING_ENTRY: 'UPDATE_READING_ENTRY',
  DELETE_READING_ENTRY: 'DELETE_READING_ENTRY',

  // Progress
  GET_PROGRESS_DATA: 'GET_PROGRESS_DATA',

  // Tutor
  CREATE_TUTOR_SESSION: 'CREATE_TUTOR_SESSION',
  GET_TUTOR_SESSIONS: 'GET_TUTOR_SESSIONS',
  GET_TUTOR_SESSION: 'GET_TUTOR_SESSION',
  SEND_TUTOR_MESSAGE: 'SEND_TUTOR_MESSAGE',
  END_TUTOR_SESSION: 'END_TUTOR_SESSION',
  DELETE_TUTOR_SESSION: 'DELETE_TUTOR_SESSION',
  GET_TUTOR_MESSAGES: 'GET_TUTOR_MESSAGES',
  TUTOR_STREAM_CHUNK: 'TUTOR_STREAM_CHUNK',

  // Resources
  GET_RESOURCES: 'GET_RESOURCES',
  CREATE_RESOURCE: 'CREATE_RESOURCE',
  GENERATE_RESOURCE: 'GENERATE_RESOURCE',
  DELETE_RESOURCE: 'DELETE_RESOURCE',

  // PDF
  EXPORT_PDF: 'EXPORT_PDF',
  PRINT_RESOURCE: 'PRINT_RESOURCE',

  // Gamification
  GET_GAMIFICATION_STATE: 'GET_GAMIFICATION_STATE',
  GET_GAMIFICATION_SETTINGS: 'GET_GAMIFICATION_SETTINGS',
  SAVE_GAMIFICATION_SETTINGS: 'SAVE_GAMIFICATION_SETTINGS',
  AWARD_XP: 'AWARD_XP',
  GET_XP_LOG: 'GET_XP_LOG',
  GET_BADGES: 'GET_BADGES',
  CHECK_BADGES: 'CHECK_BADGES',
  UPDATE_STREAK: 'UPDATE_STREAK',
  GET_GOALS: 'GET_GOALS',
  CREATE_GOAL: 'CREATE_GOAL',
  UPDATE_GOAL: 'UPDATE_GOAL',
  DELETE_GOAL: 'DELETE_GOAL',

  // Multi-Child Schedule
  GENERATE_MULTI_CHILD_SCHEDULE: 'GENERATE_MULTI_CHILD_SCHEDULE',

  // Compliance
  GET_COMPLIANCE_REQUIREMENTS: 'GET_COMPLIANCE_REQUIREMENTS',
  SET_COMPLIANCE_REQUIREMENTS: 'SET_COMPLIANCE_REQUIREMENTS',
  GET_COMPLIANCE_STATUS: 'GET_COMPLIANCE_STATUS',
  UPDATE_COMPLIANCE_STATUS: 'UPDATE_COMPLIANCE_STATUS',

  // Portfolio
  GET_PORTFOLIO: 'GET_PORTFOLIO',
  CREATE_PORTFOLIO_ITEM: 'CREATE_PORTFOLIO_ITEM',
  UPDATE_PORTFOLIO_ITEM: 'UPDATE_PORTFOLIO_ITEM',
  DELETE_PORTFOLIO_ITEM: 'DELETE_PORTFOLIO_ITEM',

  // Reports
  GENERATE_REPORT_CARD: 'GENERATE_REPORT_CARD',
  GENERATE_TRANSCRIPT: 'GENERATE_TRANSCRIPT',
  GENERATE_YEAR_END_REPORT: 'GENERATE_YEAR_END_REPORT',

  // AI
  GET_AI_COST_SUMMARY: 'GET_AI_COST_SUMMARY',

  // NS Vault
  VAULT_LIST: 'vault-list',
  VAULT_STORE: 'vault-store',
  VAULT_GET: 'vault-get',
  VAULT_DELETE: 'vault-delete',
  VAULT_SEARCH: 'vault-search',
  VAULT_GET_TAGS: 'vault-get-tags',
  VAULT_ADD_TAG: 'vault-add-tag',
  VAULT_ANNOTATE: 'vault-annotate',
  VAULT_GET_ANNOTATIONS: 'vault-get-annotations',
  VAULT_GET_PROVENANCE: 'vault-get-provenance',

  // Macro Registry
  MACRO_GET_REGISTRY: 'macro-get-registry',
  MACRO_GET_AVAILABLE: 'macro-get-available',

  // Cross-App Queue
  MACRO_INVOKE: 'macro-invoke',
  MACRO_INVOKE_STATUS: 'macro-invoke-status',
  MACRO_GET_PENDING: 'macro-get-pending',

  // Orchestrations
  ORCH_LIST: 'orch-list',
  ORCH_CREATE: 'orch-create',
  ORCH_UPDATE: 'orch-update',
  ORCH_DELETE: 'orch-delete',
  ORCH_GET: 'orch-get',
  ORCH_RUN: 'orch-run',
  ORCH_RESUME: 'orch-resume',
  ORCH_GET_RUNS: 'orch-get-runs',
  ORCH_GET_RUN: 'orch-get-run',

  // Window
  MINIMIZE_WINDOW: 'MINIMIZE_WINDOW',
  MAXIMIZE_WINDOW: 'MAXIMIZE_WINDOW',
  CLOSE_WINDOW: 'CLOSE_WINDOW',
} as const;

// ─── Electron API ─────────────────────────────────────────────────────────────

export interface ElectronAPI {
  // Settings
  getSettings(): Promise<Settings>;
  saveSettings(settings: Partial<Settings>): Promise<Settings>;
  getApiKeys(): Promise<Record<string, string>>;
  getModels(): Promise<AIModel[]>;

  // Students
  getStudents(): Promise<Student[]>;
  createStudent(input: CreateStudentInput): Promise<Student>;
  updateStudent(id: string, updates: Partial<Student>): Promise<Student>;
  deleteStudent(id: string): Promise<void>;

  // School Years
  getSchoolYears(studentId: string): Promise<SchoolYear[]>;
  createSchoolYear(input: CreateSchoolYearInput): Promise<SchoolYear>;
  updateSchoolYear(id: string, updates: Partial<SchoolYear>): Promise<SchoolYear>;
  deleteSchoolYear(id: string): Promise<void>;

  // Subjects
  getSubjects(studentId: string): Promise<Subject[]>;
  createSubject(input: CreateSubjectInput): Promise<Subject>;
  updateSubject(id: string, updates: Partial<Subject>): Promise<Subject>;
  deleteSubject(id: string): Promise<void>;

  // Lessons
  getLessons(filters: { studentId: string; date?: string; subjectId?: string }): Promise<Lesson[]>;
  createLesson(input: CreateLessonInput): Promise<Lesson>;
  updateLesson(id: string, updates: Partial<Lesson>): Promise<Lesson>;
  deleteLesson(id: string): Promise<void>;
  completeLesson(id: string, notes?: string, actualMinutes?: number): Promise<Lesson>;
  generateLessons(input: GenerateLessonsInput): Promise<Lesson[]>;

  // Attendance
  getAttendance(filters: { studentId: string; startDate?: string; endDate?: string }): Promise<Attendance[]>;
  updateAttendance(id: string, updates: Partial<Attendance>): Promise<Attendance>;

  // Skills
  getSkills(studentId: string, subjectId?: string): Promise<Skill[]>;
  createSkill(input: CreateSkillInput): Promise<Skill>;
  updateSkill(id: string, updates: Partial<Skill>): Promise<Skill>;
  deleteSkill(id: string): Promise<void>;

  // Assessments
  getAssessments(studentId: string, subjectId?: string): Promise<Assessment[]>;
  createAssessment(input: CreateAssessmentInput): Promise<Assessment>;
  updateAssessment(id: string, updates: Partial<Assessment>): Promise<Assessment>;
  deleteAssessment(id: string): Promise<void>;
  generateAssessment(input: GenerateAssessmentInput): Promise<Assessment>;
  gradeAssessment(id: string, answers: AssessmentAnswer[]): Promise<Assessment>;

  // Reading Log
  getReadingLog(studentId: string): Promise<ReadingEntry[]>;
  createReadingEntry(input: CreateReadingEntryInput): Promise<ReadingEntry>;
  updateReadingEntry(id: string, updates: Partial<ReadingEntry>): Promise<ReadingEntry>;
  deleteReadingEntry(id: string): Promise<void>;

  // Progress
  getProgressData(studentId: string): Promise<ProgressData>;

  // Tutor
  createTutorSession(input: CreateTutorSessionInput): Promise<TutorSession>;
  getTutorSessions(studentId: string): Promise<TutorSession[]>;
  getTutorSession(id: string): Promise<TutorSession>;
  sendTutorMessage(input: SendTutorMessageInput): Promise<void>;
  endTutorSession(id: string): Promise<TutorSession>;
  deleteTutorSession(id: string): Promise<void>;
  getTutorMessages(sessionId: string): Promise<TutorMessage[]>;
  onTutorChunk(callback: (chunk: TutorStreamChunk) => void): void;
  offTutorChunk(): void;

  // Resources
  getResources(studentId: string): Promise<Resource[]>;
  createResource(input: CreateResourceInput): Promise<Resource>;
  generateResource(input: GenerateResourceInput): Promise<Resource>;
  deleteResource(id: string): Promise<void>;

  // PDF
  exportPdf(html: string, title: string): Promise<string | null>;
  printResource(html: string): Promise<void>;

  // Gamification
  getGamificationState(studentId: string): Promise<GamificationState>;
  getGamificationSettings(studentId: string): Promise<GamificationSettings>;
  saveGamificationSettings(studentId: string, updates: Partial<GamificationSettings>): Promise<GamificationSettings>;
  awardXp(studentId: string, amount: number, reason: string, category?: string): Promise<XPAwardResult>;
  getXpLog(studentId: string): Promise<XPLogEntry[]>;
  getBadges(studentId: string): Promise<BadgeEarned[]>;
  checkBadges(studentId: string): Promise<BadgeEarned[]>;
  updateStreak(studentId: string): Promise<StreakInfo>;
  getGoals(studentId: string): Promise<Goal[]>;
  createGoal(input: CreateGoalInput): Promise<Goal>;
  updateGoal(id: string, updates: Partial<Goal>): Promise<Goal>;
  deleteGoal(id: string): Promise<void>;

  // Multi-Child Schedule
  generateMultiChildSchedule(input: GenerateMultiChildScheduleInput): Promise<Lesson[]>;

  // Compliance
  getComplianceRequirements(state: string): Promise<ComplianceRequirement[]>;
  setComplianceRequirements(state: string, requirements: Omit<ComplianceRequirement, 'id' | 'createdAt'>[]): Promise<ComplianceRequirement[]>;
  getComplianceStatus(studentId: string, schoolYearId: string): Promise<ComplianceStatus[]>;
  updateComplianceStatus(id: string, updates: Partial<ComplianceStatus>): Promise<ComplianceStatus>;

  // Portfolio
  getPortfolio(studentId: string, schoolYearId?: string): Promise<PortfolioItem[]>;
  createPortfolioItem(input: CreatePortfolioItemInput): Promise<PortfolioItem>;
  updatePortfolioItem(id: string, updates: Partial<PortfolioItem>): Promise<PortfolioItem>;
  deletePortfolioItem(id: string): Promise<void>;

  // Reports
  generateReportCard(input: GenerateReportCardInput): Promise<ReportCard>;
  generateTranscript(input: GenerateTranscriptInput): Promise<Transcript>;
  generateYearEndReport(studentId: string, schoolYearId: string, model?: string): Promise<string>;

  // AI
  getAiCostSummary(): Promise<AICostSummary>;

  // NS Vault
  vaultList: (options?: { limit?: number; offset?: number }) => Promise<any[]>;
  vaultStore: (input: {
    itemType: string;
    title: string;
    content?: string | null;
    filePath?: string | null;
    outputTypeHint?: string | null;
    parentId?: string | null;
    metadata?: Record<string, unknown>;
    tags?: string[];
  }) => Promise<any>;
  vaultGet: (id: string) => Promise<any | null>;
  vaultDelete: (id: string) => Promise<void>;
  vaultSearch: (options: {
    itemType?: string;
    sourceApp?: string;
    tags?: string[];
    query?: string;
    parentId?: string;
    limit?: number;
    offset?: number;
  }) => Promise<any[]>;
  vaultGetTags: () => Promise<any[]>;
  vaultAddTag: (itemId: string, tagName: string, color?: string) => Promise<void>;
  vaultAnnotate: (itemId: string, content: string) => Promise<any>;
  vaultGetAnnotations: (itemId: string) => Promise<any[]>;
  vaultGetProvenance: (itemId: string) => Promise<any[]>;

  // Macro Registry
  macroGetRegistry: () => Promise<Record<string, any>>;
  macroGetAvailable: () => Promise<Record<string, any>>;

  // Cross-App Queue
  macroInvoke: (targetApp: string, macro: string, input: any, vaultParentId?: string) => Promise<any>;
  macroInvokeStatus: (requestId: string) => Promise<any>;
  macroGetPending: () => Promise<any[]>;

  // Orchestrations
  orchList: () => Promise<Orchestration[]>;
  orchCreate: (data: { name: string; description?: string; steps: OrchestrationStep[] }) => Promise<Orchestration>;
  orchUpdate: (id: string, updates: Partial<Orchestration>) => Promise<Orchestration>;
  orchDelete: (id: string) => Promise<void>;
  orchGet: (id: string) => Promise<Orchestration | null>;
  orchRun: (orchestrationId: string, manualInput?: string) => Promise<OrchestrationRun>;
  orchResume: (runId: string, decision: 'approved' | 'rejected') => Promise<OrchestrationRun>;
  orchGetRuns: (orchestrationId: string) => Promise<OrchestrationRun[]>;
  orchGetRun: (runId: string) => Promise<OrchestrationRun | null>;

  // Orchestration progress events
  onOrchStepProgress: (callback: (data: { runId: string; stepIndex: number; status: string; output?: any }) => void) => () => void;

  // Window
  minimizeWindow(): void;
  maximizeWindow(): void;
  closeWindow(): void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
