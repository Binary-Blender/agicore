import { contextBridge, ipcRenderer } from 'electron';
import type { ElectronAPI } from '../shared/types';
import { IPC_CHANNELS } from '../shared/types';

const electronAPI: ElectronAPI = {
  // Settings
  getSettings: () =>
    ipcRenderer.invoke(IPC_CHANNELS.GET_SETTINGS),
  saveSettings: (settings) =>
    ipcRenderer.invoke(IPC_CHANNELS.SAVE_SETTINGS, settings),
  getApiKeys: () =>
    ipcRenderer.invoke(IPC_CHANNELS.GET_API_KEYS),
  getModels: () =>
    ipcRenderer.invoke(IPC_CHANNELS.GET_MODELS),

  // Students
  getStudents: () =>
    ipcRenderer.invoke(IPC_CHANNELS.GET_STUDENTS),
  createStudent: (input) =>
    ipcRenderer.invoke(IPC_CHANNELS.CREATE_STUDENT, input),
  updateStudent: (id, updates) =>
    ipcRenderer.invoke(IPC_CHANNELS.UPDATE_STUDENT, id, updates),
  deleteStudent: (id) =>
    ipcRenderer.invoke(IPC_CHANNELS.DELETE_STUDENT, id),

  // School Years
  getSchoolYears: (studentId) =>
    ipcRenderer.invoke(IPC_CHANNELS.GET_SCHOOL_YEARS, studentId),
  createSchoolYear: (input) =>
    ipcRenderer.invoke(IPC_CHANNELS.CREATE_SCHOOL_YEAR, input),
  updateSchoolYear: (id, updates) =>
    ipcRenderer.invoke(IPC_CHANNELS.UPDATE_SCHOOL_YEAR, id, updates),
  deleteSchoolYear: (id) =>
    ipcRenderer.invoke(IPC_CHANNELS.DELETE_SCHOOL_YEAR, id),

  // Subjects
  getSubjects: (studentId) =>
    ipcRenderer.invoke(IPC_CHANNELS.GET_SUBJECTS, studentId),
  createSubject: (input) =>
    ipcRenderer.invoke(IPC_CHANNELS.CREATE_SUBJECT, input),
  updateSubject: (id, updates) =>
    ipcRenderer.invoke(IPC_CHANNELS.UPDATE_SUBJECT, id, updates),
  deleteSubject: (id) =>
    ipcRenderer.invoke(IPC_CHANNELS.DELETE_SUBJECT, id),

  // Lessons
  getLessons: (filters) =>
    ipcRenderer.invoke(IPC_CHANNELS.GET_LESSONS, filters),
  createLesson: (input) =>
    ipcRenderer.invoke(IPC_CHANNELS.CREATE_LESSON, input),
  updateLesson: (id, updates) =>
    ipcRenderer.invoke(IPC_CHANNELS.UPDATE_LESSON, id, updates),
  deleteLesson: (id) =>
    ipcRenderer.invoke(IPC_CHANNELS.DELETE_LESSON, id),
  completeLesson: (id, notes, actualMinutes) =>
    ipcRenderer.invoke(IPC_CHANNELS.COMPLETE_LESSON, id, notes, actualMinutes),
  generateLessons: (input) =>
    ipcRenderer.invoke(IPC_CHANNELS.GENERATE_LESSONS, input),

  // Attendance
  getAttendance: (filters) =>
    ipcRenderer.invoke(IPC_CHANNELS.GET_ATTENDANCE, filters),
  updateAttendance: (id, updates) =>
    ipcRenderer.invoke(IPC_CHANNELS.UPDATE_ATTENDANCE, id, updates),

  // Skills
  getSkills: (studentId, subjectId) =>
    ipcRenderer.invoke(IPC_CHANNELS.GET_SKILLS, studentId, subjectId),
  createSkill: (input) =>
    ipcRenderer.invoke(IPC_CHANNELS.CREATE_SKILL, input),
  updateSkill: (id, updates) =>
    ipcRenderer.invoke(IPC_CHANNELS.UPDATE_SKILL, id, updates),
  deleteSkill: (id) =>
    ipcRenderer.invoke(IPC_CHANNELS.DELETE_SKILL, id),

  // Assessments
  getAssessments: (studentId, subjectId) =>
    ipcRenderer.invoke(IPC_CHANNELS.GET_ASSESSMENTS, studentId, subjectId),
  createAssessment: (input) =>
    ipcRenderer.invoke(IPC_CHANNELS.CREATE_ASSESSMENT, input),
  updateAssessment: (id, updates) =>
    ipcRenderer.invoke(IPC_CHANNELS.UPDATE_ASSESSMENT, id, updates),
  deleteAssessment: (id) =>
    ipcRenderer.invoke(IPC_CHANNELS.DELETE_ASSESSMENT, id),
  generateAssessment: (input) =>
    ipcRenderer.invoke(IPC_CHANNELS.GENERATE_ASSESSMENT, input),
  gradeAssessment: (id, answers) =>
    ipcRenderer.invoke(IPC_CHANNELS.GRADE_ASSESSMENT, id, answers),

  // Reading Log
  getReadingLog: (studentId) =>
    ipcRenderer.invoke(IPC_CHANNELS.GET_READING_LOG, studentId),
  createReadingEntry: (input) =>
    ipcRenderer.invoke(IPC_CHANNELS.CREATE_READING_ENTRY, input),
  updateReadingEntry: (id, updates) =>
    ipcRenderer.invoke(IPC_CHANNELS.UPDATE_READING_ENTRY, id, updates),
  deleteReadingEntry: (id) =>
    ipcRenderer.invoke(IPC_CHANNELS.DELETE_READING_ENTRY, id),

  // Progress
  getProgressData: (studentId) =>
    ipcRenderer.invoke(IPC_CHANNELS.GET_PROGRESS_DATA, studentId),

  // Tutor
  createTutorSession: (input) =>
    ipcRenderer.invoke(IPC_CHANNELS.CREATE_TUTOR_SESSION, input),
  getTutorSessions: (studentId) =>
    ipcRenderer.invoke(IPC_CHANNELS.GET_TUTOR_SESSIONS, studentId),
  getTutorSession: (id) =>
    ipcRenderer.invoke(IPC_CHANNELS.GET_TUTOR_SESSION, id),
  sendTutorMessage: (input) =>
    ipcRenderer.invoke(IPC_CHANNELS.SEND_TUTOR_MESSAGE, input),
  endTutorSession: (id) =>
    ipcRenderer.invoke(IPC_CHANNELS.END_TUTOR_SESSION, id),
  deleteTutorSession: (id) =>
    ipcRenderer.invoke(IPC_CHANNELS.DELETE_TUTOR_SESSION, id),
  getTutorMessages: (sessionId) =>
    ipcRenderer.invoke(IPC_CHANNELS.GET_TUTOR_MESSAGES, sessionId),
  onTutorChunk: (callback) => {
    ipcRenderer.on(IPC_CHANNELS.TUTOR_STREAM_CHUNK, (_event, chunk) => callback(chunk));
  },
  offTutorChunk: () => {
    ipcRenderer.removeAllListeners(IPC_CHANNELS.TUTOR_STREAM_CHUNK);
  },

  // Resources
  getResources: (studentId) =>
    ipcRenderer.invoke(IPC_CHANNELS.GET_RESOURCES, studentId),
  createResource: (input) =>
    ipcRenderer.invoke(IPC_CHANNELS.CREATE_RESOURCE, input),
  generateResource: (input) =>
    ipcRenderer.invoke(IPC_CHANNELS.GENERATE_RESOURCE, input),
  deleteResource: (id) =>
    ipcRenderer.invoke(IPC_CHANNELS.DELETE_RESOURCE, id),

  // PDF
  exportPdf: (html, title) =>
    ipcRenderer.invoke(IPC_CHANNELS.EXPORT_PDF, html, title),
  printResource: (html) =>
    ipcRenderer.invoke(IPC_CHANNELS.PRINT_RESOURCE, html),

  // Gamification
  getGamificationState: (studentId) =>
    ipcRenderer.invoke(IPC_CHANNELS.GET_GAMIFICATION_STATE, studentId),
  getGamificationSettings: (studentId) =>
    ipcRenderer.invoke(IPC_CHANNELS.GET_GAMIFICATION_SETTINGS, studentId),
  saveGamificationSettings: (studentId, updates) =>
    ipcRenderer.invoke(IPC_CHANNELS.SAVE_GAMIFICATION_SETTINGS, studentId, updates),
  awardXp: (studentId, amount, reason, category) =>
    ipcRenderer.invoke(IPC_CHANNELS.AWARD_XP, studentId, amount, reason, category),
  getXpLog: (studentId) =>
    ipcRenderer.invoke(IPC_CHANNELS.GET_XP_LOG, studentId),
  getBadges: (studentId) =>
    ipcRenderer.invoke(IPC_CHANNELS.GET_BADGES, studentId),
  checkBadges: (studentId) =>
    ipcRenderer.invoke(IPC_CHANNELS.CHECK_BADGES, studentId),
  updateStreak: (studentId) =>
    ipcRenderer.invoke(IPC_CHANNELS.UPDATE_STREAK, studentId),
  getGoals: (studentId) =>
    ipcRenderer.invoke(IPC_CHANNELS.GET_GOALS, studentId),
  createGoal: (input) =>
    ipcRenderer.invoke(IPC_CHANNELS.CREATE_GOAL, input),
  updateGoal: (id, updates) =>
    ipcRenderer.invoke(IPC_CHANNELS.UPDATE_GOAL, id, updates),
  deleteGoal: (id) =>
    ipcRenderer.invoke(IPC_CHANNELS.DELETE_GOAL, id),

  // Multi-Child Schedule
  generateMultiChildSchedule: (input) =>
    ipcRenderer.invoke(IPC_CHANNELS.GENERATE_MULTI_CHILD_SCHEDULE, input),

  // Compliance
  getComplianceRequirements: (state) =>
    ipcRenderer.invoke(IPC_CHANNELS.GET_COMPLIANCE_REQUIREMENTS, state),
  setComplianceRequirements: (state, requirements) =>
    ipcRenderer.invoke(IPC_CHANNELS.SET_COMPLIANCE_REQUIREMENTS, state, requirements),
  getComplianceStatus: (studentId, schoolYearId) =>
    ipcRenderer.invoke(IPC_CHANNELS.GET_COMPLIANCE_STATUS, studentId, schoolYearId),
  updateComplianceStatus: (id, updates) =>
    ipcRenderer.invoke(IPC_CHANNELS.UPDATE_COMPLIANCE_STATUS, id, updates),

  // Portfolio
  getPortfolio: (studentId, schoolYearId) =>
    ipcRenderer.invoke(IPC_CHANNELS.GET_PORTFOLIO, studentId, schoolYearId),
  createPortfolioItem: (input) =>
    ipcRenderer.invoke(IPC_CHANNELS.CREATE_PORTFOLIO_ITEM, input),
  updatePortfolioItem: (id, updates) =>
    ipcRenderer.invoke(IPC_CHANNELS.UPDATE_PORTFOLIO_ITEM, id, updates),
  deletePortfolioItem: (id) =>
    ipcRenderer.invoke(IPC_CHANNELS.DELETE_PORTFOLIO_ITEM, id),

  // Reports
  generateReportCard: (input) =>
    ipcRenderer.invoke(IPC_CHANNELS.GENERATE_REPORT_CARD, input),
  generateTranscript: (input) =>
    ipcRenderer.invoke(IPC_CHANNELS.GENERATE_TRANSCRIPT, input),
  generateYearEndReport: (studentId, schoolYearId, model) =>
    ipcRenderer.invoke(IPC_CHANNELS.GENERATE_YEAR_END_REPORT, studentId, schoolYearId, model),

  // AI
  getAiCostSummary: () =>
    ipcRenderer.invoke(IPC_CHANNELS.GET_AI_COST_SUMMARY),

  // NS Vault
  vaultList: (options) =>
    ipcRenderer.invoke(IPC_CHANNELS.VAULT_LIST, options),
  vaultStore: (input) =>
    ipcRenderer.invoke(IPC_CHANNELS.VAULT_STORE, input),
  vaultGet: (id: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.VAULT_GET, id),
  vaultDelete: (id: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.VAULT_DELETE, id),
  vaultSearch: (options) =>
    ipcRenderer.invoke(IPC_CHANNELS.VAULT_SEARCH, options),
  vaultGetTags: () =>
    ipcRenderer.invoke(IPC_CHANNELS.VAULT_GET_TAGS),
  vaultAddTag: (itemId: string, tagName: string, color?: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.VAULT_ADD_TAG, itemId, tagName, color),
  vaultAnnotate: (itemId: string, content: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.VAULT_ANNOTATE, itemId, content),
  vaultGetAnnotations: (itemId: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.VAULT_GET_ANNOTATIONS, itemId),
  vaultGetProvenance: (itemId: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.VAULT_GET_PROVENANCE, itemId),

  // Macro Registry
  macroGetRegistry: () =>
    ipcRenderer.invoke(IPC_CHANNELS.MACRO_GET_REGISTRY),
  macroGetAvailable: () =>
    ipcRenderer.invoke(IPC_CHANNELS.MACRO_GET_AVAILABLE),

  // Cross-App Queue
  macroInvoke: (targetApp: string, macro: string, input: any, vaultParentId?: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.MACRO_INVOKE, targetApp, macro, input, vaultParentId),
  macroInvokeStatus: (requestId: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.MACRO_INVOKE_STATUS, requestId),
  macroGetPending: () =>
    ipcRenderer.invoke(IPC_CHANNELS.MACRO_GET_PENDING),

  // Orchestrations
  orchList: () => ipcRenderer.invoke(IPC_CHANNELS.ORCH_LIST),
  orchCreate: (data) => ipcRenderer.invoke(IPC_CHANNELS.ORCH_CREATE, data),
  orchUpdate: (id: string, updates) => ipcRenderer.invoke(IPC_CHANNELS.ORCH_UPDATE, id, updates),
  orchDelete: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.ORCH_DELETE, id),
  orchGet: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.ORCH_GET, id),
  orchRun: (orchestrationId: string, manualInput?: string) => ipcRenderer.invoke(IPC_CHANNELS.ORCH_RUN, orchestrationId, manualInput),
  orchResume: (runId: string, decision: string) => ipcRenderer.invoke(IPC_CHANNELS.ORCH_RESUME, runId, decision),
  orchGetRuns: (orchestrationId: string) => ipcRenderer.invoke(IPC_CHANNELS.ORCH_GET_RUNS, orchestrationId),
  orchGetRun: (runId: string) => ipcRenderer.invoke(IPC_CHANNELS.ORCH_GET_RUN, runId),
  onOrchStepProgress: (callback) => {
    const handler = (_event: any, data: any) => callback(data);
    ipcRenderer.on('orch-step-progress', handler);
    return () => { ipcRenderer.removeListener('orch-step-progress', handler); };
  },

  // Window
  minimizeWindow: () =>
    ipcRenderer.send(IPC_CHANNELS.MINIMIZE_WINDOW),
  maximizeWindow: () =>
    ipcRenderer.send(IPC_CHANNELS.MAXIMIZE_WINDOW),
  closeWindow: () =>
    ipcRenderer.send(IPC_CHANNELS.CLOSE_WINDOW),
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);
