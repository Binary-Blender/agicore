import { create } from 'zustand';
import type {
  Student, CreateStudentInput,
  SchoolYear, CreateSchoolYearInput,
  Subject, CreateSubjectInput,
  Lesson, CreateLessonInput, GenerateLessonsInput,
  Attendance, AICostSummary,
  Settings, AIModel,
  Skill, CreateSkillInput,
  Assessment, CreateAssessmentInput, GenerateAssessmentInput, AssessmentAnswer,
  ReadingEntry, CreateReadingEntryInput,
  ProgressData,
  TutorSession, CreateTutorSessionInput, SendTutorMessageInput, TutorMessage, TutorStreamChunk,
  Resource, CreateResourceInput, GenerateResourceInput,
  GamificationState, GamificationSettings, XPAwardResult, XPLogEntry, BadgeEarned,
  Goal, CreateGoalInput,
  GenerateMultiChildScheduleInput,
  ComplianceRequirement, ComplianceStatus,
  PortfolioItem, CreatePortfolioItemInput,
  GenerateReportCardInput, GenerateTranscriptInput, ReportCard, Transcript,
  Orchestration, OrchestrationStep,
} from '../../shared/types';

interface AcademyStore {
  // Data
  students: Student[];
  currentStudent: Student | null;
  schoolYears: SchoolYear[];
  currentSchoolYear: SchoolYear | null;
  subjects: Subject[];
  lessons: Lesson[];
  attendance: Attendance[];
  aiCostSummary: AICostSummary | null;
  skills: Skill[];
  assessments: Assessment[];
  readingLog: ReadingEntry[];
  progressData: ProgressData | null;
  tutorSessions: TutorSession[];
  currentTutorSession: TutorSession | null;
  tutorMessages: TutorMessage[];
  tutorStreaming: boolean;
  tutorStreamContent: string;
  resources: Resource[];
  gamificationState: GamificationState | null;
  goals: Goal[];
  complianceRequirements: ComplianceRequirement[];
  complianceStatuses: ComplianceStatus[];
  portfolio: PortfolioItem[];

  // Settings
  settings: Settings;
  apiKeys: Record<string, string>;
  models: AIModel[];

  // UI
  currentView: 'dashboard' | 'schedule' | 'weekly' | 'subjects' | 'planner' | 'skills' | 'assessments' | 'reading' | 'progress' | 'tutor' | 'resources' | 'quest' | 'compliance';
  showStudentProfile: boolean;
  editingStudent: Student | null;
  showSettings: boolean;
  showAssessmentModal: boolean;
  editingAssessment: Assessment | null;
  showReadingModal: boolean;
  editingReadingEntry: ReadingEntry | null;
  loading: boolean;
  aiLoading: boolean;
  selectedDate: string;

  // Init
  loadSettings: () => Promise<void>;
  loadApiKeys: () => Promise<void>;
  loadModels: () => Promise<void>;
  loadStudents: () => Promise<void>;

  // Student
  selectStudent: (student: Student | null) => Promise<void>;
  createStudent: (input: CreateStudentInput) => Promise<Student>;
  updateStudent: (id: string, updates: Partial<Student>) => Promise<Student>;
  deleteStudent: (id: string) => Promise<void>;

  // School Year
  loadSchoolYears: (studentId: string) => Promise<void>;
  createSchoolYear: (input: CreateSchoolYearInput) => Promise<SchoolYear>;
  updateSchoolYear: (id: string, updates: Partial<SchoolYear>) => Promise<SchoolYear>;
  deleteSchoolYear: (id: string) => Promise<void>;

  // Subject
  loadSubjects: (studentId: string) => Promise<void>;
  createSubject: (input: CreateSubjectInput) => Promise<Subject>;
  updateSubject: (id: string, updates: Partial<Subject>) => Promise<Subject>;
  deleteSubject: (id: string) => Promise<void>;

  // Lesson
  loadLessons: (studentId: string, date?: string) => Promise<void>;
  createLesson: (input: CreateLessonInput) => Promise<Lesson>;
  updateLesson: (id: string, updates: Partial<Lesson>) => Promise<Lesson>;
  deleteLesson: (id: string) => Promise<void>;
  completeLesson: (id: string, notes?: string, actualMinutes?: number) => Promise<Lesson>;
  generateLessons: (input: GenerateLessonsInput) => Promise<Lesson[]>;

  // Attendance
  loadAttendance: (studentId: string, startDate?: string, endDate?: string) => Promise<void>;
  updateAttendance: (id: string, updates: Partial<Attendance>) => Promise<void>;

  // Skills
  loadSkills: (studentId: string, subjectId?: string) => Promise<void>;
  createSkill: (input: CreateSkillInput) => Promise<Skill>;
  updateSkill: (id: string, updates: Partial<Skill>) => Promise<Skill>;
  deleteSkill: (id: string) => Promise<void>;

  // Assessments
  loadAssessments: (studentId: string, subjectId?: string) => Promise<void>;
  createAssessment: (input: CreateAssessmentInput) => Promise<Assessment>;
  updateAssessment: (id: string, updates: Partial<Assessment>) => Promise<Assessment>;
  deleteAssessment: (id: string) => Promise<void>;
  generateAssessment: (input: GenerateAssessmentInput) => Promise<Assessment>;
  gradeAssessment: (id: string, answers: AssessmentAnswer[]) => Promise<Assessment>;

  // Reading Log
  loadReadingLog: (studentId: string) => Promise<void>;
  createReadingEntry: (input: CreateReadingEntryInput) => Promise<ReadingEntry>;
  updateReadingEntry: (id: string, updates: Partial<ReadingEntry>) => Promise<ReadingEntry>;
  deleteReadingEntry: (id: string) => Promise<void>;

  // Progress
  loadProgressData: (studentId: string) => Promise<void>;

  // Tutor
  loadTutorSessions: (studentId: string) => Promise<void>;
  createTutorSession: (input: CreateTutorSessionInput) => Promise<TutorSession>;
  selectTutorSession: (session: TutorSession | null) => Promise<void>;
  sendTutorMessage: (input: SendTutorMessageInput) => Promise<void>;
  endTutorSession: (id: string) => Promise<TutorSession>;
  deleteTutorSession: (id: string) => Promise<void>;
  setTutorStreaming: (streaming: boolean) => void;
  appendTutorStreamContent: (content: string) => void;
  resetTutorStreamContent: () => void;
  handleTutorChunk: (chunk: TutorStreamChunk) => void;

  // Resources
  loadResources: (studentId: string) => Promise<void>;
  generateResource: (input: GenerateResourceInput) => Promise<Resource>;
  deleteResource: (id: string) => Promise<void>;
  exportPdf: (html: string, title: string) => Promise<string | null>;
  printResource: (html: string) => Promise<void>;

  // Gamification
  loadGamificationState: (studentId: string) => Promise<void>;
  loadGamificationSettings: (studentId: string) => Promise<GamificationSettings>;
  saveGamificationSettings: (studentId: string, updates: Partial<GamificationSettings>) => Promise<GamificationSettings>;
  awardXp: (studentId: string, amount: number, reason: string, category?: string) => Promise<XPAwardResult>;
  loadGoals: (studentId: string) => Promise<void>;
  createGoal: (input: CreateGoalInput) => Promise<Goal>;
  updateGoal: (id: string, updates: Partial<Goal>) => Promise<Goal>;
  deleteGoal: (id: string) => Promise<void>;

  // Multi-Child Schedule
  generateMultiChildSchedule: (input: GenerateMultiChildScheduleInput) => Promise<any>;

  // Compliance
  loadComplianceRequirements: (state: string) => Promise<void>;
  setComplianceRequirements: (state: string, requirements: Omit<ComplianceRequirement, 'id' | 'createdAt'>[]) => Promise<ComplianceRequirement[]>;
  loadComplianceStatus: (studentId: string, schoolYearId: string) => Promise<void>;
  updateComplianceStatus: (id: string, updates: Partial<ComplianceStatus>) => Promise<ComplianceStatus>;

  // Portfolio
  loadPortfolio: (studentId: string, schoolYearId?: string) => Promise<void>;
  createPortfolioItem: (input: CreatePortfolioItemInput) => Promise<PortfolioItem>;
  updatePortfolioItem: (id: string, updates: Partial<PortfolioItem>) => Promise<PortfolioItem>;
  deletePortfolioItem: (id: string) => Promise<void>;

  // Reports
  generateReportCard: (input: GenerateReportCardInput) => Promise<ReportCard>;
  generateTranscript: (input: GenerateTranscriptInput) => Promise<Transcript>;
  generateYearEndReport: (studentId: string, schoolYearId: string, model?: string) => Promise<string>;

  // AI
  loadAiCostSummary: () => Promise<void>;

  // Orchestrations
  orchestrations: Orchestration[];
  loadOrchestrations: () => Promise<void>;
  createOrchestration: (data: { name: string; description?: string; steps: OrchestrationStep[] }) => Promise<Orchestration>;
  updateOrchestration: (id: string, updates: Partial<Orchestration>) => Promise<Orchestration>;
  deleteOrchestration: (id: string) => Promise<void>;

  // UI
  setCurrentView: (view: AcademyStore['currentView']) => void;
  setShowStudentProfile: (show: boolean) => void;
  setEditingStudent: (student: Student | null) => void;
  setShowSettings: (show: boolean) => void;
  setShowAssessmentModal: (show: boolean) => void;
  setEditingAssessment: (assessment: Assessment | null) => void;
  setShowReadingModal: (show: boolean) => void;
  setEditingReadingEntry: (entry: ReadingEntry | null) => void;
  setSelectedDate: (date: string) => void;
  saveSettings: (updates: Partial<Settings>) => Promise<void>;
}

function getTodayStr(): string {
  return new Date().toISOString().split('T')[0];
}

export const useAcademyStore = create<AcademyStore>((set, get) => ({
  // Initial state
  students: [],
  currentStudent: null,
  schoolYears: [],
  currentSchoolYear: null,
  subjects: [],
  lessons: [],
  attendance: [],
  aiCostSummary: null,
  skills: [],
  assessments: [],
  readingLog: [],
  progressData: null,
  tutorSessions: [],
  currentTutorSession: null,
  tutorMessages: [],
  tutorStreaming: false,
  tutorStreamContent: '',
  resources: [],
  gamificationState: null,
  goals: [],
  complianceRequirements: [],
  complianceStatuses: [],
  portfolio: [],

  settings: { theme: 'dark', defaultModel: 'claude-sonnet-4-20250514' },
  apiKeys: {},
  models: [],

  currentView: 'dashboard',
  showStudentProfile: false,
  editingStudent: null,
  showSettings: false,
  showAssessmentModal: false,
  editingAssessment: null,
  showReadingModal: false,
  editingReadingEntry: null,
  loading: false,
  aiLoading: false,
  selectedDate: getTodayStr(),

  // ─── Init ─────────────────────────────────────────────────────────────────

  loadSettings: async () => {
    const settings = await window.electronAPI.getSettings();
    set({ settings });
  },

  loadApiKeys: async () => {
    const apiKeys = await window.electronAPI.getApiKeys();
    set({ apiKeys });
  },

  loadModels: async () => {
    const models = await window.electronAPI.getModels();
    set({ models });
  },

  loadStudents: async () => {
    const students = await window.electronAPI.getStudents();
    set({ students });

    // Auto-select first student if none selected
    const { currentStudent } = get();
    if (!currentStudent && students.length > 0) {
      get().selectStudent(students[0]);
    }
  },

  // ─── Student ──────────────────────────────────────────────────────────────

  selectStudent: async (student) => {
    set({ currentStudent: student, loading: true });
    if (student) {
      await get().loadSchoolYears(student.id);
      await get().loadSubjects(student.id);
      await get().loadLessons(student.id, get().selectedDate);
      await get().loadAttendance(student.id);
      await get().loadSkills(student.id);
      await get().loadAssessments(student.id);
      await get().loadReadingLog(student.id);
      await get().loadTutorSessions(student.id);
      await get().loadResources(student.id);
      await get().loadGamificationState(student.id);
      await get().loadGoals(student.id);
      await get().loadPortfolio(student.id);
    } else {
      set({ schoolYears: [], currentSchoolYear: null, subjects: [], lessons: [], attendance: [], skills: [], assessments: [], readingLog: [], progressData: null, tutorSessions: [], currentTutorSession: null, tutorMessages: [], resources: [], gamificationState: null, goals: [], complianceRequirements: [], complianceStatuses: [], portfolio: [] });
    }
    set({ loading: false });
  },

  createStudent: async (input) => {
    const student = await window.electronAPI.createStudent(input);
    await get().loadStudents();
    set({ showStudentProfile: false, editingStudent: null });
    return student;
  },

  updateStudent: async (id, updates) => {
    const student = await window.electronAPI.updateStudent(id, updates);
    await get().loadStudents();
    const { currentStudent } = get();
    if (currentStudent?.id === id) {
      set({ currentStudent: student });
    }
    set({ showStudentProfile: false, editingStudent: null });
    return student;
  },

  deleteStudent: async (id) => {
    await window.electronAPI.deleteStudent(id);
    const { currentStudent } = get();
    if (currentStudent?.id === id) {
      set({ currentStudent: null, schoolYears: [], subjects: [], lessons: [], attendance: [], skills: [], assessments: [], readingLog: [], progressData: null, tutorSessions: [], currentTutorSession: null, tutorMessages: [], resources: [], gamificationState: null, goals: [], complianceRequirements: [], complianceStatuses: [], portfolio: [] });
    }
    await get().loadStudents();
  },

  // ─── School Year ──────────────────────────────────────────────────────────

  loadSchoolYears: async (studentId) => {
    const schoolYears = await window.electronAPI.getSchoolYears(studentId);
    const currentSchoolYear = schoolYears.find(sy => sy.isCurrent) || null;
    set({ schoolYears, currentSchoolYear });
  },

  createSchoolYear: async (input) => {
    const year = await window.electronAPI.createSchoolYear(input);
    await get().loadSchoolYears(input.studentId);
    return year;
  },

  updateSchoolYear: async (id, updates) => {
    const year = await window.electronAPI.updateSchoolYear(id, updates);
    const { currentStudent } = get();
    if (currentStudent) await get().loadSchoolYears(currentStudent.id);
    return year;
  },

  deleteSchoolYear: async (id) => {
    await window.electronAPI.deleteSchoolYear(id);
    const { currentStudent } = get();
    if (currentStudent) await get().loadSchoolYears(currentStudent.id);
  },

  // ─── Subject ──────────────────────────────────────────────────────────────

  loadSubjects: async (studentId) => {
    const subjects = await window.electronAPI.getSubjects(studentId);
    set({ subjects });
  },

  createSubject: async (input) => {
    const subject = await window.electronAPI.createSubject(input);
    await get().loadSubjects(input.studentId);
    return subject;
  },

  updateSubject: async (id, updates) => {
    const subject = await window.electronAPI.updateSubject(id, updates);
    const { currentStudent } = get();
    if (currentStudent) await get().loadSubjects(currentStudent.id);
    return subject;
  },

  deleteSubject: async (id) => {
    await window.electronAPI.deleteSubject(id);
    const { currentStudent } = get();
    if (currentStudent) await get().loadSubjects(currentStudent.id);
  },

  // ─── Lesson ───────────────────────────────────────────────────────────────

  loadLessons: async (studentId, date) => {
    const lessons = await window.electronAPI.getLessons({ studentId, date });
    set({ lessons });
  },

  createLesson: async (input) => {
    const lesson = await window.electronAPI.createLesson(input);
    const { currentStudent, selectedDate } = get();
    if (currentStudent) await get().loadLessons(currentStudent.id, selectedDate);
    return lesson;
  },

  updateLesson: async (id, updates) => {
    const lesson = await window.electronAPI.updateLesson(id, updates);
    const { currentStudent, selectedDate } = get();
    if (currentStudent) await get().loadLessons(currentStudent.id, selectedDate);
    return lesson;
  },

  deleteLesson: async (id) => {
    await window.electronAPI.deleteLesson(id);
    const { currentStudent, selectedDate } = get();
    if (currentStudent) await get().loadLessons(currentStudent.id, selectedDate);
  },

  completeLesson: async (id, notes, actualMinutes) => {
    const lesson = await window.electronAPI.completeLesson(id, notes, actualMinutes);
    const { currentStudent, selectedDate } = get();
    if (currentStudent) {
      await get().loadLessons(currentStudent.id, selectedDate);
      await get().loadAttendance(currentStudent.id);
      await get().loadSubjects(currentStudent.id);
      await get().loadSchoolYears(currentStudent.id);
    }
    return lesson;
  },

  generateLessons: async (input) => {
    set({ aiLoading: true });
    try {
      const lessons = await window.electronAPI.generateLessons(input);
      const { currentStudent, selectedDate } = get();
      if (currentStudent) await get().loadLessons(currentStudent.id, selectedDate);
      return lessons;
    } finally {
      set({ aiLoading: false });
    }
  },

  // ─── Attendance ───────────────────────────────────────────────────────────

  loadAttendance: async (studentId, startDate, endDate) => {
    const attendance = await window.electronAPI.getAttendance({ studentId, startDate, endDate });
    set({ attendance });
  },

  updateAttendance: async (id, updates) => {
    await window.electronAPI.updateAttendance(id, updates);
    const { currentStudent } = get();
    if (currentStudent) await get().loadAttendance(currentStudent.id);
  },

  // ─── Skills ────────────────────────────────────────────────────────────────

  loadSkills: async (studentId, subjectId) => {
    const skills = await window.electronAPI.getSkills(studentId, subjectId);
    set({ skills });
  },

  createSkill: async (input) => {
    const skill = await window.electronAPI.createSkill(input);
    const { currentStudent } = get();
    if (currentStudent) await get().loadSkills(currentStudent.id);
    return skill;
  },

  updateSkill: async (id, updates) => {
    const skill = await window.electronAPI.updateSkill(id, updates);
    const { currentStudent } = get();
    if (currentStudent) await get().loadSkills(currentStudent.id);
    return skill;
  },

  deleteSkill: async (id) => {
    await window.electronAPI.deleteSkill(id);
    const { currentStudent } = get();
    if (currentStudent) await get().loadSkills(currentStudent.id);
  },

  // ─── Assessments ──────────────────────────────────────────────────────────

  loadAssessments: async (studentId, subjectId) => {
    const assessments = await window.electronAPI.getAssessments(studentId, subjectId);
    set({ assessments });
  },

  createAssessment: async (input) => {
    const assessment = await window.electronAPI.createAssessment(input);
    const { currentStudent } = get();
    if (currentStudent) await get().loadAssessments(currentStudent.id);
    return assessment;
  },

  updateAssessment: async (id, updates) => {
    const assessment = await window.electronAPI.updateAssessment(id, updates);
    const { currentStudent } = get();
    if (currentStudent) await get().loadAssessments(currentStudent.id);
    return assessment;
  },

  deleteAssessment: async (id) => {
    await window.electronAPI.deleteAssessment(id);
    const { currentStudent } = get();
    if (currentStudent) await get().loadAssessments(currentStudent.id);
  },

  generateAssessment: async (input) => {
    set({ aiLoading: true });
    try {
      const assessment = await window.electronAPI.generateAssessment(input);
      const { currentStudent } = get();
      if (currentStudent) {
        await get().loadAssessments(currentStudent.id);
        await get().loadSkills(currentStudent.id);
      }
      return assessment;
    } finally {
      set({ aiLoading: false });
    }
  },

  gradeAssessment: async (id, answers) => {
    const assessment = await window.electronAPI.gradeAssessment(id, answers);
    const { currentStudent } = get();
    if (currentStudent) {
      await get().loadAssessments(currentStudent.id);
      await get().loadSkills(currentStudent.id);
    }
    return assessment;
  },

  // ─── Reading Log ──────────────────────────────────────────────────────────

  loadReadingLog: async (studentId) => {
    const readingLog = await window.electronAPI.getReadingLog(studentId);
    set({ readingLog });
  },

  createReadingEntry: async (input) => {
    const entry = await window.electronAPI.createReadingEntry(input);
    const { currentStudent } = get();
    if (currentStudent) await get().loadReadingLog(currentStudent.id);
    set({ showReadingModal: false, editingReadingEntry: null });
    return entry;
  },

  updateReadingEntry: async (id, updates) => {
    const entry = await window.electronAPI.updateReadingEntry(id, updates);
    const { currentStudent } = get();
    if (currentStudent) await get().loadReadingLog(currentStudent.id);
    return entry;
  },

  deleteReadingEntry: async (id) => {
    await window.electronAPI.deleteReadingEntry(id);
    const { currentStudent } = get();
    if (currentStudent) await get().loadReadingLog(currentStudent.id);
  },

  // ─── Progress ──────────────────────────────────────────────────────────────

  loadProgressData: async (studentId) => {
    const progressData = await window.electronAPI.getProgressData(studentId);
    set({ progressData });
  },

  // ─── Tutor ──────────────────────────────────────────────────────────────

  loadTutorSessions: async (studentId) => {
    const tutorSessions = await window.electronAPI.getTutorSessions(studentId);
    set({ tutorSessions });
  },

  createTutorSession: async (input) => {
    const session = await window.electronAPI.createTutorSession(input);
    const { currentStudent } = get();
    if (currentStudent) await get().loadTutorSessions(currentStudent.id);
    await get().selectTutorSession(session);
    return session;
  },

  selectTutorSession: async (session) => {
    set({ currentTutorSession: session, tutorMessages: [], tutorStreamContent: '' });
    if (session) {
      const tutorMessages = await window.electronAPI.getTutorMessages(session.id);
      set({ tutorMessages });
    }
  },

  sendTutorMessage: async (input) => {
    set({ tutorStreaming: true, tutorStreamContent: '' });
    await window.electronAPI.sendTutorMessage(input);
  },

  endTutorSession: async (id) => {
    const session = await window.electronAPI.endTutorSession(id);
    set({ currentTutorSession: session });
    const { currentStudent } = get();
    if (currentStudent) await get().loadTutorSessions(currentStudent.id);
    return session;
  },

  deleteTutorSession: async (id) => {
    await window.electronAPI.deleteTutorSession(id);
    const { currentTutorSession, currentStudent } = get();
    if (currentTutorSession?.id === id) {
      set({ currentTutorSession: null, tutorMessages: [] });
    }
    if (currentStudent) await get().loadTutorSessions(currentStudent.id);
  },

  setTutorStreaming: (streaming) => set({ tutorStreaming: streaming }),
  appendTutorStreamContent: (content) => set((s) => ({ tutorStreamContent: s.tutorStreamContent + content })),
  resetTutorStreamContent: () => set({ tutorStreamContent: '' }),

  handleTutorChunk: (chunk) => {
    switch (chunk.type) {
      case 'chunk':
        get().appendTutorStreamContent(chunk.content || '');
        break;
      case 'done':
        set({ tutorStreaming: false, tutorStreamContent: '' });
        if (chunk.message) {
          set((s) => ({ tutorMessages: [...s.tutorMessages, chunk.message!] }));
        }
        if (chunk.session) {
          set({ currentTutorSession: chunk.session });
        }
        break;
      case 'error':
        set({ tutorStreaming: false, tutorStreamContent: '' });
        console.error('Tutor error:', chunk.error);
        break;
      case 'filtered':
        set({ tutorStreaming: false, tutorStreamContent: '' });
        break;
    }
  },

  // ─── Resources ──────────────────────────────────────────────────────────

  loadResources: async (studentId) => {
    const resources = await window.electronAPI.getResources(studentId);
    set({ resources });
  },

  generateResource: async (input) => {
    set({ aiLoading: true });
    try {
      const resource = await window.electronAPI.generateResource(input);
      const { currentStudent } = get();
      if (currentStudent) await get().loadResources(currentStudent.id);
      return resource;
    } finally {
      set({ aiLoading: false });
    }
  },

  deleteResource: async (id) => {
    await window.electronAPI.deleteResource(id);
    const { currentStudent } = get();
    if (currentStudent) await get().loadResources(currentStudent.id);
  },

  exportPdf: async (html, title) => {
    return await window.electronAPI.exportPdf(html, title);
  },

  printResource: async (html) => {
    await window.electronAPI.printResource(html);
  },

  // ─── Gamification ──────────────────────────────────────────────────────

  loadGamificationState: async (studentId) => {
    const gamificationState = await window.electronAPI.getGamificationState(studentId);
    set({ gamificationState });
  },

  loadGamificationSettings: async (studentId) => {
    return await window.electronAPI.getGamificationSettings(studentId);
  },

  saveGamificationSettings: async (studentId, updates) => {
    const settings = await window.electronAPI.saveGamificationSettings(studentId, updates);
    // Refresh gamification state since settings changed
    await get().loadGamificationState(studentId);
    return settings;
  },

  awardXp: async (studentId, amount, reason, category) => {
    const result = await window.electronAPI.awardXp(studentId, amount, reason, category || 'general');
    await get().loadGamificationState(studentId);
    return result;
  },

  loadGoals: async (studentId) => {
    const goals = await window.electronAPI.getGoals(studentId);
    set({ goals });
  },

  createGoal: async (input) => {
    const goal = await window.electronAPI.createGoal(input);
    const { currentStudent } = get();
    if (currentStudent) await get().loadGoals(currentStudent.id);
    return goal;
  },

  updateGoal: async (id, updates) => {
    const goal = await window.electronAPI.updateGoal(id, updates);
    const { currentStudent } = get();
    if (currentStudent) await get().loadGoals(currentStudent.id);
    return goal;
  },

  deleteGoal: async (id) => {
    await window.electronAPI.deleteGoal(id);
    const { currentStudent } = get();
    if (currentStudent) await get().loadGoals(currentStudent.id);
  },

  // ─── Multi-Child Schedule ──────────────────────────────────────────────

  generateMultiChildSchedule: async (input) => {
    set({ aiLoading: true });
    try {
      return await window.electronAPI.generateMultiChildSchedule(input);
    } finally {
      set({ aiLoading: false });
    }
  },

  // ─── Compliance ────────────────────────────────────────────────────────

  loadComplianceRequirements: async (state) => {
    const complianceRequirements = await window.electronAPI.getComplianceRequirements(state);
    set({ complianceRequirements });
  },

  setComplianceRequirements: async (state, requirements) => {
    const result = await window.electronAPI.setComplianceRequirements(state, requirements);
    set({ complianceRequirements: result });
    return result;
  },

  loadComplianceStatus: async (studentId, schoolYearId) => {
    const complianceStatuses = await window.electronAPI.getComplianceStatus(studentId, schoolYearId);
    set({ complianceStatuses });
  },

  updateComplianceStatus: async (id, updates) => {
    const status = await window.electronAPI.updateComplianceStatus(id, updates);
    const { currentStudent, currentSchoolYear } = get();
    if (currentStudent && currentSchoolYear) {
      await get().loadComplianceStatus(currentStudent.id, currentSchoolYear.id);
    }
    return status;
  },

  // ─── Portfolio ─────────────────────────────────────────────────────────

  loadPortfolio: async (studentId, schoolYearId) => {
    const portfolio = await window.electronAPI.getPortfolio(studentId, schoolYearId);
    set({ portfolio });
  },

  createPortfolioItem: async (input) => {
    const item = await window.electronAPI.createPortfolioItem(input);
    const { currentStudent } = get();
    if (currentStudent) await get().loadPortfolio(currentStudent.id);
    return item;
  },

  updatePortfolioItem: async (id, updates) => {
    const item = await window.electronAPI.updatePortfolioItem(id, updates);
    const { currentStudent } = get();
    if (currentStudent) await get().loadPortfolio(currentStudent.id);
    return item;
  },

  deletePortfolioItem: async (id) => {
    await window.electronAPI.deletePortfolioItem(id);
    const { currentStudent } = get();
    if (currentStudent) await get().loadPortfolio(currentStudent.id);
  },

  // ─── Reports ───────────────────────────────────────────────────────────

  generateReportCard: async (input) => {
    set({ aiLoading: true });
    try {
      return await window.electronAPI.generateReportCard(input);
    } finally {
      set({ aiLoading: false });
    }
  },

  generateTranscript: async (input) => {
    set({ aiLoading: true });
    try {
      return await window.electronAPI.generateTranscript(input);
    } finally {
      set({ aiLoading: false });
    }
  },

  generateYearEndReport: async (studentId, schoolYearId, model) => {
    set({ aiLoading: true });
    try {
      return await window.electronAPI.generateYearEndReport(studentId, schoolYearId, model);
    } finally {
      set({ aiLoading: false });
    }
  },

  // ─── AI ───────────────────────────────────────────────────────────────────

  loadAiCostSummary: async () => {
    const aiCostSummary = await window.electronAPI.getAiCostSummary();
    set({ aiCostSummary });
  },

  // ─── UI ───────────────────────────────────────────────────────────────────

  setCurrentView: (view) => set({ currentView: view }),
  setShowStudentProfile: (show) => set({ showStudentProfile: show }),
  setEditingStudent: (student) => set({ editingStudent: student, showStudentProfile: !!student }),
  setShowSettings: (show) => set({ showSettings: show }),
  setShowAssessmentModal: (show) => set({ showAssessmentModal: show }),
  setEditingAssessment: (assessment) => set({ editingAssessment: assessment, showAssessmentModal: !!assessment }),
  setShowReadingModal: (show) => set({ showReadingModal: show }),
  setEditingReadingEntry: (entry) => set({ editingReadingEntry: entry, showReadingModal: !!entry }),
  setSelectedDate: (date) => {
    set({ selectedDate: date });
    const { currentStudent } = get();
    if (currentStudent) get().loadLessons(currentStudent.id, date);
  },

  saveSettings: async (updates) => {
    const settings = await window.electronAPI.saveSettings(updates);
    set({ settings });
  },

  // Orchestrations
  orchestrations: [],
  loadOrchestrations: async () => {
    const orchestrations = await window.electronAPI.orchList();
    set({ orchestrations });
  },
  createOrchestration: async (data) => {
    const orch = await window.electronAPI.orchCreate(data);
    set({ orchestrations: [orch, ...get().orchestrations] });
    return orch;
  },
  updateOrchestration: async (id, updates) => {
    const orch = await window.electronAPI.orchUpdate(id, updates);
    set({ orchestrations: get().orchestrations.map((o) => (o.id === id ? orch : o)) });
    return orch;
  },
  deleteOrchestration: async (id) => {
    await window.electronAPI.orchDelete(id);
    set({ orchestrations: get().orchestrations.filter((o) => o.id !== id) });
  },
}));
