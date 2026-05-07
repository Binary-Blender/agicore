import { create } from 'zustand';
import type { Project, Chapter, Section, EncyclopediaEntry, Outline, WriterSettings, AIModel, Version, AiOperation, WriterSession, WriterGoal, SessionStats, DiscoverySession, DiscoverySuggestion, ContinuityPlant, ContinuityThread, CharacterKnowledge, KnowledgeBaseEntry, ModelComparisonResult, BrainDump, BrainDumpExtraction, Pipeline, PipelineRunResult, Analysis, ReadabilityResult, CharacterRelationship, SubmissionPackageResult, WritingStats, GuideMessage, TimelineEvent, ChapterTarget, GlobalSearchResult, Orchestration } from '../../shared/types';

interface WriterState {
  // Projects
  projects: Project[];
  currentProject: Project | null;

  // Chapters & Sections
  chapters: Chapter[];
  currentChapter: Chapter | null;
  sections: Section[];
  currentSection: Section | null;

  // Encyclopedia
  encyclopediaEntries: EncyclopediaEntry[];

  // Outline
  outline: Outline | null;

  // Versions
  versions: Version[];

  // AI
  aiPanelOpen: boolean;
  aiResponse: string;
  aiStreaming: boolean;
  lastOperationId: string | null;

  // AI Operations
  aiOperations: AiOperation[];

  // Sessions & Goals
  currentSession: WriterSession | null;
  sessions: WriterSession[];
  sessionStats: SessionStats | null;
  sessionActive: boolean;
  sessionHeartbeatTimer: ReturnType<typeof setInterval> | null;
  sessionIdleTimer: ReturnType<typeof setTimeout> | null;
  sessionAiWordsAccepted: number;
  sessionAiOpsCount: number;
  goals: WriterGoal[];
  showSessionPanel: boolean;

  // Discovery
  discoveryMode: boolean;
  discoverySession: DiscoverySession | null;
  discoverySuggestions: DiscoverySuggestion[];
  discoveryLoading: boolean;
  discoveryPauseTimer: ReturnType<typeof setTimeout> | null;
  discoverySurprise: number;
  discoveryFollowThread: string;
  showDiscoveryLog: boolean;
  discoverySessions: DiscoverySession[];

  // Continuity
  plants: ContinuityPlant[];
  threads: ContinuityThread[];
  characterKnowledge: CharacterKnowledge[];
  showContinuityPanel: boolean;
  continuityScanning: boolean;
  continuityScanResults: any[] | null;
  knowledgeVerifyResults: any[] | null;

  // Knowledge Base
  kbEntries: KnowledgeBaseEntry[];
  showKnowledgeBase: boolean;
  kbScanning: boolean;
  kbScanResults: any[] | null;

  // Model Comparison
  showModelComparison: boolean;
  comparisonResults: ModelComparisonResult[];
  comparisonLoading: boolean;

  // Brain Dump
  brainDumps: BrainDump[];
  showBrainDump: boolean;
  brainDumpExtracting: boolean;
  brainDumpExtraction: BrainDumpExtraction | null;

  // Pipelines
  pipelines: Pipeline[];
  showPipelines: boolean;
  pipelineRunning: boolean;
  pipelineResults: PipelineRunResult[];

  // Ambient Sounds
  showAmbientSounds: boolean;
  ambientSounds: { id: string; playing: boolean; volume: number }[];
  ambientMasterVolume: number;

  // Analysis
  showAnalysis: boolean;
  analysisRunning: boolean;
  analysisType: string | null;
  analysisResults: any | null;
  readabilityResults: ReadabilityResult | null;
  analyses: Analysis[];

  // Character Relationships
  relationships: CharacterRelationship[];
  showRelationshipMap: boolean;
  relationshipScanning: boolean;
  relationshipScanResults: any[] | null;

  // Submission Package
  showSubmissionPackage: boolean;
  submissionGenerating: boolean;
  submissionResult: SubmissionPackageResult | null;

  // Dashboard
  showDashboard: boolean;
  dashboardStats: WritingStats | null;
  dashboardLoading: boolean;

  // Cover Designer
  showCoverDesigner: boolean;

  // Publishing Presets
  showPublishingPresets: boolean;

  // Tracked Changes
  showTrackedChanges: boolean;

  // Writing Sprint
  showWritingSprint: boolean;

  // Page Setup
  showPageSetup: boolean;

  // Feedback Dashboard
  showFeedbackDashboard: boolean;

  // Settings
  settings: WriterSettings;
  models: AIModel[];
  apiKeys: Record<string, string>;

  // UI
  sidebarWidth: number;
  showSettings: boolean;
  showExport: boolean;
  showEncyclopediaEditor: boolean;
  editingEncyclopediaEntry: EncyclopediaEntry | null;
  showOutlineEditor: boolean;
  showVersionHistory: boolean;
  showAiLog: boolean;
  distractionFree: boolean;

  // Actions — Projects
  loadProjects: () => Promise<void>;
  createProject: (name: string, description?: string) => Promise<Project>;
  selectProject: (project: Project) => Promise<void>;
  updateProject: (id: string, updates: { name?: string; description?: string }) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;

  // Actions — Chapters
  loadChapters: (projectId: string) => Promise<void>;
  createChapter: (title: string) => Promise<void>;
  selectChapter: (chapter: Chapter) => Promise<void>;
  updateChapter: (id: string, updates: Partial<Pick<Chapter, 'title' | 'content' | 'wordCount'>>) => Promise<void>;
  deleteChapter: (id: string) => Promise<void>;
  reorderChapters: (chapterIds: string[]) => Promise<void>;

  // Actions — Sections
  loadSections: (chapterId: string) => Promise<void>;
  createSection: (title: string) => Promise<void>;
  selectSection: (section: Section | null) => void;
  updateSection: (id: string, updates: Partial<Pick<Section, 'title' | 'content' | 'wordCount'>>) => Promise<void>;
  deleteSection: (id: string) => Promise<void>;

  // Actions — Encyclopedia
  loadEncyclopedia: () => Promise<void>;
  createEncyclopediaEntry: (entry: { name: string; category: string; content: string }) => Promise<void>;
  updateEncyclopediaEntry: (id: string, updates: Partial<Pick<EncyclopediaEntry, 'name' | 'category' | 'content'>>) => Promise<void>;
  deleteEncyclopediaEntry: (id: string) => Promise<void>;

  // Actions — Outline
  loadOutline: (chapterId: string) => Promise<void>;
  saveOutline: (beats: string[]) => Promise<void>;

  // Actions — Versions
  loadVersions: () => Promise<void>;
  createVersion: (snapshotName?: string) => Promise<void>;
  restoreVersion: (versionId: string) => Promise<void>;
  deleteVersion: (versionId: string) => Promise<void>;

  // Actions — AI
  toggleAiPanel: () => void;
  sendAiPrompt: (prompt: string, modelId: string, selectedEntryIds: string[], operationType?: string) => Promise<void>;
  acceptAiResult: () => void;
  discardAiResult: () => void;

  // Actions — AI Operations
  loadAiOperations: () => Promise<void>;

  // Actions — Sessions & Goals
  startSession: () => Promise<void>;
  endSession: () => Promise<void>;
  heartbeatSession: () => Promise<void>;
  resetIdleTimer: () => void;
  loadSessions: () => Promise<void>;
  loadSessionStats: () => Promise<void>;
  loadGoals: () => Promise<void>;
  setGoal: (targetWords: number) => Promise<void>;
  deleteGoal: (goalId: string) => Promise<void>;
  setShowSessionPanel: (show: boolean) => void;

  // Actions — Discovery
  toggleDiscoveryMode: () => Promise<void>;
  generateSuggestions: () => Promise<void>;
  acceptSuggestion: (id: string, action: 'insert' | 'modify' | 'new') => Promise<void>;
  dismissSuggestion: (id: string) => void;
  setFollowThread: (text: string) => Promise<void>;
  setDiscoverySurprise: (value: number) => void;
  triggerDiscoveryPause: () => void;
  resetDiscoveryPause: () => void;
  loadDiscoverySessions: () => Promise<void>;
  setShowDiscoveryLog: (show: boolean) => void;

  // Actions — Continuity
  loadPlants: (projectId: string) => Promise<void>;
  createPlant: (plant: { name: string; setupChapterId?: string; setupContent?: string; payoffChapterId?: string; payoffContent?: string; status?: string; notes?: string }) => Promise<void>;
  updatePlant: (id: string, updates: Partial<Omit<ContinuityPlant, 'id' | 'projectId' | 'createdAt' | 'updatedAt'>>) => Promise<void>;
  deletePlant: (id: string) => Promise<void>;
  loadThreads: (projectId: string) => Promise<void>;
  createThread: (thread: { question: string; raisedChapterId?: string; targetChapterId?: string; status?: string; notes?: string }) => Promise<void>;
  updateThread: (id: string, updates: Partial<Omit<ContinuityThread, 'id' | 'projectId' | 'createdAt' | 'updatedAt'>>) => Promise<void>;
  deleteThread: (id: string) => Promise<void>;
  loadCharacterKnowledge: (projectId: string) => Promise<void>;
  createCharacterKnowledge: (entry: { characterId: string; chapterId: string; knows?: string; doesNotKnow?: string }) => Promise<void>;
  updateCharacterKnowledge: (id: string, updates: { knows?: string; doesNotKnow?: string }) => Promise<void>;
  deleteCharacterKnowledge: (id: string) => Promise<void>;
  scanForPlants: () => Promise<void>;
  scanForThreads: () => Promise<void>;
  verifyKnowledge: (characterId: string) => Promise<void>;
  setShowContinuityPanel: (show: boolean) => void;
  clearScanResults: () => void;

  // Actions — Knowledge Base
  loadKbEntries: (projectId: string) => Promise<void>;
  createKbEntry: (entry: { projectId?: string | null; title: string; category: string; content: string; isGlobal: boolean }) => Promise<void>;
  updateKbEntry: (id: string, updates: Partial<Pick<KnowledgeBaseEntry, 'title' | 'category' | 'content' | 'isGlobal'>>) => Promise<void>;
  deleteKbEntry: (id: string) => Promise<void>;
  kbAnalyzeVoice: (entryId: string) => Promise<void>;
  kbFindConnections: () => Promise<void>;
  kbSuggestGaps: () => Promise<void>;
  setShowKnowledgeBase: (show: boolean) => void;
  clearKbScanResults: () => void;

  // Actions — Model Comparison
  setShowModelComparison: (show: boolean) => void;
  compareModels: (prompt: string, modelIds: string[], selectedEntryIds: string[], operationType?: string) => Promise<void>;
  clearComparisonResults: () => void;

  // Actions — Brain Dump
  setShowBrainDump: (show: boolean) => void;
  loadBrainDumps: () => Promise<void>;
  createBrainDump: (content: string) => Promise<void>;
  updateBrainDump: (id: string, content: string) => Promise<void>;
  deleteBrainDump: (id: string) => Promise<void>;
  extractBrainDump: (id: string) => Promise<void>;
  clearBrainDumpExtraction: () => void;

  // Actions — Pipelines
  setShowPipelines: (show: boolean) => void;
  loadPipelines: () => Promise<void>;
  createPipeline: (pipeline: { name: string; description: string; steps: any[] }) => Promise<void>;
  updatePipeline: (id: string, updates: { name?: string; description?: string; steps?: any[] }) => Promise<void>;
  deletePipeline: (id: string) => Promise<void>;
  runPipeline: (pipelineId: string, inputText: string) => Promise<void>;
  clearPipelineResults: () => void;

  // Actions — Ambient Sounds
  setShowAmbientSounds: (show: boolean) => void;
  setAmbientSoundPlaying: (id: string, playing: boolean) => void;
  setAmbientSoundVolume: (id: string, volume: number) => void;
  setAmbientMasterVolume: (volume: number) => void;
  stopAllSounds: () => void;

  // Actions — Analysis
  setShowAnalysis: (show: boolean) => void;
  runAnalysis: (type: string, chapterId?: string) => Promise<void>;
  loadAnalyses: () => Promise<void>;
  deleteAnalysis: (id: string) => Promise<void>;
  loadReadability: (chapterId?: string) => Promise<void>;
  clearAnalysisResults: () => void;

  // Actions — Character Relationships
  setShowRelationshipMap: (show: boolean) => void;
  loadRelationships: (projectId: string) => Promise<void>;
  createRelationship: (rel: { characterAId: string; characterBId: string; relationshipType: string; description: string }) => Promise<void>;
  updateRelationship: (id: string, updates: { relationshipType?: string; description?: string }) => Promise<void>;
  deleteRelationship: (id: string) => Promise<void>;
  scanRelationships: () => Promise<void>;
  clearRelationshipScanResults: () => void;

  // Actions — Submission Package
  setShowSubmissionPackage: (show: boolean) => void;
  generateSubmissionPackage: () => Promise<void>;
  clearSubmissionResult: () => void;

  // Actions — Dashboard
  setShowDashboard: (show: boolean) => void;
  loadDashboardStats: () => Promise<void>;

  // Actions — Import
  importFiles: () => Promise<void>;

  // Actions — Cover Designer
  setShowCoverDesigner: (show: boolean) => void;

  // Actions — Publishing Presets
  setShowPublishingPresets: (show: boolean) => void;

  // Actions — Tracked Changes
  setShowTrackedChanges: (show: boolean) => void;

  // Actions — Writing Sprint
  setShowWritingSprint: (show: boolean) => void;

  // Actions — Page Setup
  setShowPageSetup: (show: boolean) => void;

  // Actions — Feedback Dashboard
  setShowFeedbackDashboard: (show: boolean) => void;

  // Plugin System
  showPlugins: boolean;
  setShowPlugins: (show: boolean) => void;

  // NovaSyn Exchange
  showExchange: boolean;
  setShowExchange: (show: boolean) => void;

  // Writing Guide
  showWritingGuide: boolean;
  guideMessages: GuideMessage[];
  guideLoading: boolean;
  setShowWritingGuide: (show: boolean) => void;
  loadGuideMessages: (projectId: string) => Promise<void>;
  sendGuideMessage: (message: string) => Promise<void>;
  clearGuideMessages: () => Promise<void>;

  // Global Search
  showGlobalSearch: boolean;
  globalSearchResults: GlobalSearchResult[];
  globalSearchLoading: boolean;
  setShowGlobalSearch: (show: boolean) => void;
  performGlobalSearch: (query: string) => Promise<void>;

  // Timeline
  showTimeline: boolean;
  timelineEvents: TimelineEvent[];
  setShowTimeline: (show: boolean) => void;
  loadTimelineEvents: (projectId: string) => Promise<void>;
  createTimelineEvent: (event: { title: string; description?: string; chapterId?: string; characterIds?: string[]; eventDate?: string; color?: string }) => Promise<void>;
  updateTimelineEvent: (id: string, updates: Partial<Pick<TimelineEvent, 'title' | 'description' | 'chapterId' | 'characterIds' | 'eventDate' | 'sortOrder' | 'color'>>) => Promise<void>;
  deleteTimelineEvent: (id: string) => Promise<void>;

  // Storyboard
  showStoryboard: boolean;
  setShowStoryboard: (show: boolean) => void;

  // Orchestrations
  orchestrations: Orchestration[];
  showOrchBuilder: boolean;
  setShowOrchBuilder: (show: boolean) => void;
  setOrchestrations: (orchestrations: Orchestration[]) => void;
  addOrchestration: (orchestration: Orchestration) => void;
  updateOrchestrationInStore: (id: string, updated: Orchestration) => void;
  removeOrchestration: (id: string) => void;

  // Chapter Targets
  chapterTargets: ChapterTarget[];
  loadChapterTargets: (projectId: string) => Promise<void>;
  setChapterTarget: (chapterId: string, targetWords: number) => Promise<void>;
  deleteChapterTarget: (chapterId: string) => Promise<void>;

  // Actions — Settings
  loadSettings: () => Promise<void>;
  saveSettings: (updates: Partial<WriterSettings>) => Promise<void>;
  loadModels: () => Promise<void>;
  loadApiKeys: () => Promise<void>;
  setApiKey: (provider: string, key: string) => Promise<void>;

  // Actions — UI
  setSidebarWidth: (width: number) => void;
  setShowSettings: (show: boolean) => void;
  setShowExport: (show: boolean) => void;
  setShowEncyclopediaEditor: (show: boolean, entry?: EncyclopediaEntry | null) => void;
  setShowOutlineEditor: (show: boolean) => void;
  setShowVersionHistory: (show: boolean) => void;
  setShowAiLog: (show: boolean) => void;
  toggleDistractionFree: () => void;
}

export const useWriterStore = create<WriterState>((set, get) => ({
  // Initial state
  projects: [],
  currentProject: null,
  chapters: [],
  currentChapter: null,
  sections: [],
  currentSection: null,
  encyclopediaEntries: [],
  outline: null,
  aiPanelOpen: false,
  aiResponse: '',
  aiStreaming: false,
  settings: {
    selectedModel: 'claude-sonnet-4-6',
    tokenBudget: 100000,
    systemPrompt: '',
    autoSaveInterval: 2000,
    theme: 'dark',
  },
  models: [],
  apiKeys: {},
  sidebarWidth: 280,
  showSettings: false,
  showExport: false,
  showEncyclopediaEditor: false,
  editingEncyclopediaEntry: null,
  showOutlineEditor: false,
  versions: [],
  lastOperationId: null,
  aiOperations: [],
  showVersionHistory: false,
  showAiLog: false,
  distractionFree: false,
  currentSession: null,
  sessions: [],
  sessionStats: null,
  sessionActive: false,
  sessionHeartbeatTimer: null,
  sessionIdleTimer: null,
  sessionAiWordsAccepted: 0,
  sessionAiOpsCount: 0,
  goals: [],
  showSessionPanel: false,
  discoveryMode: false,
  discoverySession: null,
  discoverySuggestions: [],
  discoveryLoading: false,
  discoveryPauseTimer: null,
  discoverySurprise: 1.0,
  discoveryFollowThread: '',
  showDiscoveryLog: false,
  discoverySessions: [],
  plants: [],
  threads: [],
  characterKnowledge: [],
  showContinuityPanel: false,
  continuityScanning: false,
  continuityScanResults: null,
  knowledgeVerifyResults: null,
  kbEntries: [],
  showKnowledgeBase: false,
  kbScanning: false,
  kbScanResults: null,
  showModelComparison: false,
  comparisonResults: [],
  comparisonLoading: false,
  brainDumps: [],
  showBrainDump: false,
  brainDumpExtracting: false,
  brainDumpExtraction: null,
  pipelines: [],
  showPipelines: false,
  pipelineRunning: false,
  pipelineResults: [],
  showAmbientSounds: false,
  ambientSounds: [
    { id: 'rain', playing: false, volume: 0.5 },
    { id: 'coffee-shop', playing: false, volume: 0.4 },
    { id: 'forest', playing: false, volume: 0.5 },
    { id: 'fireplace', playing: false, volume: 0.5 },
    { id: 'ocean', playing: false, volume: 0.5 },
    { id: 'night', playing: false, volume: 0.4 },
  ],
  ambientMasterVolume: 0.7,
  showAnalysis: false,
  analysisRunning: false,
  analysisType: null,
  analysisResults: null,
  readabilityResults: null,
  analyses: [],
  relationships: [],
  showRelationshipMap: false,
  relationshipScanning: false,
  relationshipScanResults: null,
  showSubmissionPackage: false,
  submissionGenerating: false,
  submissionResult: null,
  showDashboard: false,
  dashboardStats: null,
  dashboardLoading: false,
  showCoverDesigner: false,
  showPublishingPresets: false,
  showTrackedChanges: false,
  showWritingSprint: false,
  showPageSetup: false,
  showFeedbackDashboard: false,
  showPlugins: false,
  showExchange: false,
  showWritingGuide: false,
  guideMessages: [],
  guideLoading: false,
  showGlobalSearch: false,
  globalSearchResults: [],
  globalSearchLoading: false,
  showTimeline: false,
  timelineEvents: [],
  showStoryboard: false,

  // Orchestrations
  orchestrations: [],
  showOrchBuilder: false,
  chapterTargets: [],

  // ── Projects ─────────────────────────────────────────────────────────

  loadProjects: async () => {
    const projects = await window.electronAPI.getProjects();
    set({ projects });
  },

  createProject: async (name, description) => {
    const project = await window.electronAPI.createProject(name, description);
    await get().loadProjects();
    await get().selectProject(project);
    return project;
  },

  selectProject: async (project) => {
    // End current session if switching projects
    if (get().sessionActive) {
      await get().endSession();
    }
    set({ currentProject: project, currentChapter: null, currentSection: null, sections: [], outline: null });
    await get().loadChapters(project.id);
    await get().loadEncyclopedia();
    // Auto-select first chapter
    const { chapters } = get();
    if (chapters.length > 0) {
      await get().selectChapter(chapters[0]);
    }
    // Auto-start session + load session data
    await get().startSession();
    await get().loadSessions();
    await get().loadSessionStats();
    await get().loadGoals();
    // Load continuity data
    await get().loadPlants(project.id);
    await get().loadThreads(project.id);
    await get().loadCharacterKnowledge(project.id);
    // Load knowledge base
    await get().loadKbEntries(project.id);
    // Load pipelines
    await get().loadPipelines();
    // Load relationships
    await get().loadRelationships(project.id);
    // Load guide messages
    await get().loadGuideMessages(project.id);
    // Load timeline & chapter targets
    await get().loadTimelineEvents(project.id);
    await get().loadChapterTargets(project.id);
  },

  updateProject: async (id, updates) => {
    await window.electronAPI.updateProject(id, updates);
    await get().loadProjects();
    const { currentProject } = get();
    if (currentProject?.id === id) {
      set({ currentProject: { ...currentProject, ...updates } as Project });
    }
  },

  deleteProject: async (id) => {
    await window.electronAPI.deleteProject(id);
    const { currentProject } = get();
    if (currentProject?.id === id) {
      set({ currentProject: null, chapters: [], currentChapter: null, sections: [], currentSection: null });
    }
    await get().loadProjects();
  },

  // ── Chapters ─────────────────────────────────────────────────────────

  loadChapters: async (projectId) => {
    const chapters = await window.electronAPI.getChapters(projectId);
    set({ chapters });
  },

  createChapter: async (title) => {
    const { currentProject } = get();
    if (!currentProject) return;
    const chapter = await window.electronAPI.createChapter(currentProject.id, title);
    await get().loadChapters(currentProject.id);
    await get().selectChapter(chapter);
  },

  selectChapter: async (chapter) => {
    set({ currentChapter: chapter, currentSection: null, sections: [] });
    await get().loadSections(chapter.id);
    await get().loadOutline(chapter.id);
  },

  updateChapter: async (id, updates) => {
    await window.electronAPI.updateChapter(id, updates);
    const { currentProject, currentChapter } = get();
    if (currentProject) {
      await get().loadChapters(currentProject.id);
    }
    if (currentChapter?.id === id) {
      set({ currentChapter: { ...currentChapter, ...updates } as Chapter });
    }
  },

  deleteChapter: async (id) => {
    await window.electronAPI.deleteChapter(id);
    const { currentProject, currentChapter } = get();
    if (currentProject) {
      await get().loadChapters(currentProject.id);
    }
    if (currentChapter?.id === id) {
      const { chapters } = get();
      if (chapters.length > 0) {
        await get().selectChapter(chapters[0]);
      } else {
        set({ currentChapter: null, sections: [], currentSection: null });
      }
    }
  },

  reorderChapters: async (chapterIds) => {
    await window.electronAPI.reorderChapters(chapterIds);
    const { currentProject } = get();
    if (currentProject) {
      await get().loadChapters(currentProject.id);
    }
  },

  // ── Sections ─────────────────────────────────────────────────────────

  loadSections: async (chapterId) => {
    const sections = await window.electronAPI.getSections(chapterId);
    set({ sections });
  },

  createSection: async (title) => {
    const { currentChapter } = get();
    if (!currentChapter) return;
    const section = await window.electronAPI.createSection(currentChapter.id, title);
    await get().loadSections(currentChapter.id);
    set({ currentSection: section });
  },

  selectSection: (section) => {
    set({ currentSection: section });
  },

  updateSection: async (id, updates) => {
    await window.electronAPI.updateSection(id, updates);
    const { currentChapter, currentSection } = get();
    if (currentChapter) {
      await get().loadSections(currentChapter.id);
    }
    if (currentSection?.id === id) {
      set({ currentSection: { ...currentSection, ...updates } as Section });
    }
  },

  deleteSection: async (id) => {
    await window.electronAPI.deleteSection(id);
    const { currentChapter, currentSection } = get();
    if (currentChapter) {
      await get().loadSections(currentChapter.id);
    }
    if (currentSection?.id === id) {
      set({ currentSection: null });
    }
  },

  // ── Encyclopedia ─────────────────────────────────────────────────────

  loadEncyclopedia: async () => {
    const { currentProject } = get();
    if (!currentProject) return;
    const entries = await window.electronAPI.getEncyclopedia(currentProject.id);
    set({ encyclopediaEntries: entries });
  },

  createEncyclopediaEntry: async (entry) => {
    const { currentProject } = get();
    if (!currentProject) return;
    await window.electronAPI.createEncyclopediaEntry(currentProject.id, entry);
    await get().loadEncyclopedia();
  },

  updateEncyclopediaEntry: async (id, updates) => {
    await window.electronAPI.updateEncyclopediaEntry(id, updates);
    await get().loadEncyclopedia();
  },

  deleteEncyclopediaEntry: async (id) => {
    await window.electronAPI.deleteEncyclopediaEntry(id);
    await get().loadEncyclopedia();
  },

  // ── Outline ──────────────────────────────────────────────────────────

  loadOutline: async (chapterId) => {
    const outline = await window.electronAPI.getOutline(chapterId);
    set({ outline });
  },

  saveOutline: async (beats) => {
    const { currentChapter } = get();
    if (!currentChapter) return;
    const outline = await window.electronAPI.saveOutline(currentChapter.id, beats);
    set({ outline });
  },

  // ── Versions ────────────────────────────────────────────────────────

  loadVersions: async () => {
    const { currentChapter } = get();
    if (!currentChapter) return;
    const versions = await window.electronAPI.getVersions(currentChapter.id);
    set({ versions });
  },

  createVersion: async (snapshotName) => {
    const { currentChapter } = get();
    if (!currentChapter) return;
    await window.electronAPI.createVersion(currentChapter.id, snapshotName, 'manual');
    await get().loadVersions();
  },

  restoreVersion: async (versionId) => {
    const restoredChapter = await window.electronAPI.restoreVersion(versionId);
    const { currentProject } = get();
    set({ currentChapter: restoredChapter });
    if (currentProject) {
      await get().loadChapters(currentProject.id);
    }
    await get().loadVersions();
  },

  deleteVersion: async (versionId) => {
    await window.electronAPI.deleteVersion(versionId);
    await get().loadVersions();
  },

  // ── AI ───────────────────────────────────────────────────────────────

  toggleAiPanel: () => set((s) => ({ aiPanelOpen: !s.aiPanelOpen })),

  sendAiPrompt: async (prompt, modelId, selectedEntryIds, operationType) => {
    const { currentProject, currentChapter, encyclopediaEntries, settings } = get();
    set({ aiStreaming: true, aiResponse: '', lastOperationId: null });

    // Build context
    let chapterContent: string | undefined;
    if (currentChapter?.content) {
      try {
        const doc = JSON.parse(currentChapter.content);
        chapterContent = extractTextFromDoc(doc);
      } catch {
        chapterContent = undefined;
      }
    }

    const selectedEntries = encyclopediaEntries
      .filter((e) => selectedEntryIds.includes(e.id))
      .map((e) => `[${e.category}: ${e.name}]\n${e.content}`);

    // Subscribe to streaming deltas
    const unsubscribe = window.electronAPI.onAiDelta((text) => {
      set((s) => ({ aiResponse: s.aiResponse + text }));
    });

    try {
      const result = await window.electronAPI.sendPrompt(prompt, modelId, {
        chapterContent,
        encyclopediaEntries: selectedEntries.length > 0 ? selectedEntries : undefined,
        systemPrompt: settings.systemPrompt || undefined,
        projectId: currentProject?.id,
        chapterId: currentChapter?.id,
        operationType: operationType || 'custom',
      });
      if (result.operationId) {
        set({ lastOperationId: result.operationId });
      }
    } catch (error) {
      set({ aiResponse: `Error: ${error instanceof Error ? error.message : String(error)}` });
    } finally {
      unsubscribe();
      set({ aiStreaming: false });
    }
  },

  acceptAiResult: () => {
    const { lastOperationId, aiResponse, sessionActive } = get();
    if (lastOperationId) {
      window.electronAPI.updateAiOperation(lastOperationId, { accepted: 1 }).catch(() => {});
    }
    // Track AI words + ops in current session
    if (sessionActive && aiResponse) {
      const aiWordCount = aiResponse.trim().split(/\s+/).filter(Boolean).length;
      set((s) => ({
        aiResponse: '',
        lastOperationId: null,
        sessionAiWordsAccepted: s.sessionAiWordsAccepted + aiWordCount,
        sessionAiOpsCount: s.sessionAiOpsCount + 1,
      }));
    } else {
      set({ aiResponse: '', lastOperationId: null });
    }
  },

  discardAiResult: () => {
    const { lastOperationId } = get();
    if (lastOperationId) {
      window.electronAPI.updateAiOperation(lastOperationId, { accepted: 0 }).catch(() => {});
    }
    set({ aiResponse: '', lastOperationId: null });
  },

  // ── AI Operations ──────────────────────────────────────────────────

  loadAiOperations: async () => {
    const { currentProject } = get();
    if (!currentProject) return;
    const aiOperations = await window.electronAPI.getAiOperations(currentProject.id);
    set({ aiOperations });
  },

  // ── Discovery ────────────────────────────────────────────────────────

  toggleDiscoveryMode: async () => {
    const { discoveryMode, discoverySession, discoveryPauseTimer, currentProject, currentChapter } = get();
    if (discoveryMode) {
      // Turn off
      if (discoveryPauseTimer) clearTimeout(discoveryPauseTimer);
      if (discoverySession) {
        try {
          await window.electronAPI.endDiscovery(discoverySession.id);
        } catch { /* non-critical */ }
      }
      set({
        discoveryMode: false,
        discoverySession: null,
        discoverySuggestions: [],
        discoveryLoading: false,
        discoveryPauseTimer: null,
        discoveryFollowThread: '',
      });
    } else {
      // Turn on
      if (!currentProject) return;
      try {
        const session = await window.electronAPI.startDiscovery(currentProject.id, currentChapter?.id);
        set({
          discoveryMode: true,
          discoverySession: session,
          discoverySuggestions: [],
          discoveryFollowThread: '',
        });
        // Start pause timer
        get().triggerDiscoveryPause();
      } catch { /* non-critical */ }
    }
  },

  generateSuggestions: async () => {
    const { discoverySession, currentChapter, encyclopediaEntries, discoveryFollowThread, discoverySurprise } = get();
    if (!discoverySession || !currentChapter) return;
    set({ discoveryLoading: true });

    let chapterContent = '';
    try {
      const doc = JSON.parse(currentChapter.content);
      chapterContent = extractTextFromDoc(doc);
    } catch { /* empty */ }

    const encyclopediaContext = encyclopediaEntries
      .map((e) => `[${e.category}: ${e.name}]\n${e.content}`)
      .join('\n\n---\n\n');

    try {
      const suggestions = await window.electronAPI.generateSuggestions(
        discoverySession.id,
        chapterContent,
        encyclopediaContext,
        discoveryFollowThread || undefined,
        discoverySurprise,
      );
      set({ discoverySuggestions: suggestions, discoveryLoading: false });
    } catch (error) {
      set({ discoveryLoading: false });
    }
  },

  acceptSuggestion: async (id, action) => {
    const { discoverySuggestions } = get();
    const suggestion = discoverySuggestions.find((s) => s.id === id);
    if (!suggestion) return;

    const editor = (window as any).__tiptapEditor;
    if (!editor) return;

    try {
      await window.electronAPI.acceptSuggestion(id);
    } catch { /* non-critical */ }

    const text = suggestion.suggestionText;
    if (action === 'insert') {
      editor.chain().focus().insertContent(text).run();
    } else if (action === 'modify') {
      const { from, to } = editor.state.selection;
      if (from !== to) {
        editor.chain().focus().deleteRange({ from, to }).insertContent(text).run();
      } else {
        editor.chain().focus().insertContent(text).run();
      }
    } else if (action === 'new') {
      editor.chain().focus().command(({ tr, dispatch }: any) => {
        if (dispatch) {
          tr.insert(tr.doc.content.size, editor.schema.nodes.paragraph.create(null, editor.schema.text(text)));
        }
        return true;
      }).run();
    }

    set((s) => ({
      discoverySuggestions: s.discoverySuggestions.filter((sg) => sg.id !== id),
    }));
  },

  dismissSuggestion: (id) => {
    set((s) => ({
      discoverySuggestions: s.discoverySuggestions.filter((sg) => sg.id !== id),
    }));
  },

  setFollowThread: async (text) => {
    const { discoverySession } = get();
    set({ discoveryFollowThread: text });
    if (discoverySession) {
      try {
        await window.electronAPI.setFollowThread(discoverySession.id, text);
      } catch { /* non-critical */ }
    }
  },

  setDiscoverySurprise: (value) => set({ discoverySurprise: value }),

  triggerDiscoveryPause: () => {
    const { discoveryPauseTimer } = get();
    if (discoveryPauseTimer) clearTimeout(discoveryPauseTimer);
    const timer = setTimeout(() => {
      const state = get();
      if (state.discoveryMode && !state.discoveryLoading) {
        state.generateSuggestions();
      }
    }, 15000);
    set({ discoveryPauseTimer: timer });
  },

  resetDiscoveryPause: () => {
    const { discoveryMode, discoveryPauseTimer } = get();
    if (!discoveryMode) return;
    if (discoveryPauseTimer) clearTimeout(discoveryPauseTimer);
    const timer = setTimeout(() => {
      const state = get();
      if (state.discoveryMode && !state.discoveryLoading) {
        state.generateSuggestions();
      }
    }, 15000);
    set({ discoveryPauseTimer: timer });
  },

  loadDiscoverySessions: async () => {
    const { currentProject } = get();
    if (!currentProject) return;
    const discoverySessions = await window.electronAPI.getDiscoverySessions(currentProject.id);
    set({ discoverySessions });
  },

  setShowDiscoveryLog: (show) => set({ showDiscoveryLog: show }),

  // ── Continuity ───────────────────────────────────────────────────────

  loadPlants: async (projectId) => {
    const plants = await window.electronAPI.getPlants(projectId);
    set({ plants });
  },

  createPlant: async (plant) => {
    const { currentProject } = get();
    if (!currentProject) return;
    await window.electronAPI.createPlant(currentProject.id, plant);
    await get().loadPlants(currentProject.id);
  },

  updatePlant: async (id, updates) => {
    await window.electronAPI.updatePlant(id, updates);
    const { currentProject } = get();
    if (currentProject) await get().loadPlants(currentProject.id);
  },

  deletePlant: async (id) => {
    await window.electronAPI.deletePlant(id);
    const { currentProject } = get();
    if (currentProject) await get().loadPlants(currentProject.id);
  },

  loadThreads: async (projectId) => {
    const threads = await window.electronAPI.getThreads(projectId);
    set({ threads });
  },

  createThread: async (thread) => {
    const { currentProject } = get();
    if (!currentProject) return;
    await window.electronAPI.createThread(currentProject.id, thread);
    await get().loadThreads(currentProject.id);
  },

  updateThread: async (id, updates) => {
    await window.electronAPI.updateThread(id, updates);
    const { currentProject } = get();
    if (currentProject) await get().loadThreads(currentProject.id);
  },

  deleteThread: async (id) => {
    await window.electronAPI.deleteThread(id);
    const { currentProject } = get();
    if (currentProject) await get().loadThreads(currentProject.id);
  },

  loadCharacterKnowledge: async (projectId) => {
    const characterKnowledge = await window.electronAPI.getCharacterKnowledge(projectId);
    set({ characterKnowledge });
  },

  createCharacterKnowledge: async (entry) => {
    const { currentProject } = get();
    if (!currentProject) return;
    await window.electronAPI.createCharacterKnowledge(currentProject.id, entry);
    await get().loadCharacterKnowledge(currentProject.id);
  },

  updateCharacterKnowledge: async (id, updates) => {
    await window.electronAPI.updateCharacterKnowledge(id, updates);
    const { currentProject } = get();
    if (currentProject) await get().loadCharacterKnowledge(currentProject.id);
  },

  deleteCharacterKnowledge: async (id) => {
    await window.electronAPI.deleteCharacterKnowledge(id);
    const { currentProject } = get();
    if (currentProject) await get().loadCharacterKnowledge(currentProject.id);
  },

  scanForPlants: async () => {
    const { currentProject } = get();
    if (!currentProject) return;
    set({ continuityScanning: true, continuityScanResults: null });
    try {
      const results = await window.electronAPI.scanForPlants(currentProject.id);
      set({ continuityScanResults: results, continuityScanning: false });
    } catch {
      set({ continuityScanning: false });
    }
  },

  scanForThreads: async () => {
    const { currentProject } = get();
    if (!currentProject) return;
    set({ continuityScanning: true, continuityScanResults: null });
    try {
      const results = await window.electronAPI.scanForThreads(currentProject.id);
      set({ continuityScanResults: results, continuityScanning: false });
    } catch {
      set({ continuityScanning: false });
    }
  },

  verifyKnowledge: async (characterId) => {
    const { currentProject } = get();
    if (!currentProject) return;
    set({ continuityScanning: true, knowledgeVerifyResults: null });
    try {
      const results = await window.electronAPI.verifyKnowledge(currentProject.id, characterId);
      set({ knowledgeVerifyResults: results, continuityScanning: false });
    } catch {
      set({ continuityScanning: false });
    }
  },

  setShowContinuityPanel: (show) => set({ showContinuityPanel: show, continuityScanResults: null, knowledgeVerifyResults: null }),

  clearScanResults: () => set({ continuityScanResults: null, knowledgeVerifyResults: null }),

  // ── Knowledge Base ────────────────────────────────────────────────────

  loadKbEntries: async (projectId) => {
    const kbEntries = await window.electronAPI.getKbEntries(projectId);
    set({ kbEntries });
  },

  createKbEntry: async (entry) => {
    const { currentProject } = get();
    await window.electronAPI.createKbEntry({
      ...entry,
      projectId: entry.isGlobal ? null : (entry.projectId || currentProject?.id || null),
    });
    if (currentProject) await get().loadKbEntries(currentProject.id);
  },

  updateKbEntry: async (id, updates) => {
    await window.electronAPI.updateKbEntry(id, updates);
    const { currentProject } = get();
    if (currentProject) await get().loadKbEntries(currentProject.id);
  },

  deleteKbEntry: async (id) => {
    await window.electronAPI.deleteKbEntry(id);
    const { currentProject } = get();
    if (currentProject) await get().loadKbEntries(currentProject.id);
  },

  kbAnalyzeVoice: async (entryId) => {
    set({ kbScanning: true, kbScanResults: null });
    try {
      const analysis = await window.electronAPI.kbAnalyzeVoice(entryId);
      set({ kbScanResults: [{ type: 'voice', text: analysis }], kbScanning: false });
    } catch {
      set({ kbScanning: false });
    }
  },

  kbFindConnections: async () => {
    const { currentProject } = get();
    if (!currentProject) return;
    set({ kbScanning: true, kbScanResults: null });
    try {
      const results = await window.electronAPI.kbFindConnections(currentProject.id);
      set({ kbScanResults: results.map((r: any) => ({ type: 'connection', ...r })), kbScanning: false });
    } catch {
      set({ kbScanning: false });
    }
  },

  kbSuggestGaps: async () => {
    const { currentProject } = get();
    if (!currentProject) return;
    set({ kbScanning: true, kbScanResults: null });
    try {
      const results = await window.electronAPI.kbSuggestGaps(currentProject.id);
      set({ kbScanResults: results.map((r: any) => ({ type: 'gap', ...r })), kbScanning: false });
    } catch {
      set({ kbScanning: false });
    }
  },

  setShowKnowledgeBase: (show) => set({ showKnowledgeBase: show, kbScanResults: null }),

  clearKbScanResults: () => set({ kbScanResults: null }),

  // ── Model Comparison ───────────────────────────────────────────────

  setShowModelComparison: (show) => set({ showModelComparison: show }),

  compareModels: async (prompt, modelIds, selectedEntryIds, operationType) => {
    const { currentProject, currentChapter, encyclopediaEntries, settings } = get();
    set({ comparisonLoading: true, comparisonResults: [] });

    let chapterContent: string | undefined;
    if (currentChapter?.content) {
      try {
        const doc = JSON.parse(currentChapter.content);
        chapterContent = extractTextFromDoc(doc);
      } catch {
        chapterContent = undefined;
      }
    }

    const selectedEntries = encyclopediaEntries
      .filter((e) => selectedEntryIds.includes(e.id))
      .map((e) => `[${e.category}: ${e.name}]\n${e.content}`);

    try {
      const results = await window.electronAPI.compareModels(prompt, modelIds, {
        chapterContent,
        encyclopediaEntries: selectedEntries.length > 0 ? selectedEntries : undefined,
        systemPrompt: settings.systemPrompt || undefined,
        projectId: currentProject?.id,
        chapterId: currentChapter?.id,
        operationType: operationType || 'compare',
      });
      set({ comparisonResults: results });
    } catch (error) {
      set({ comparisonResults: [] });
    } finally {
      set({ comparisonLoading: false });
    }
  },

  clearComparisonResults: () => set({ comparisonResults: [] }),

  // ── Brain Dump ─────────────────────────────────────────────────────

  setShowBrainDump: (show) => set({ showBrainDump: show }),

  loadBrainDumps: async () => {
    const { currentProject } = get();
    if (!currentProject) return;
    const brainDumps = await window.electronAPI.getBrainDumps(currentProject.id);
    set({ brainDumps });
  },

  createBrainDump: async (content) => {
    const { currentProject } = get();
    if (!currentProject) return;
    await window.electronAPI.createBrainDump(currentProject.id, content);
    await get().loadBrainDumps();
  },

  updateBrainDump: async (id, content) => {
    await window.electronAPI.updateBrainDump(id, content);
    await get().loadBrainDumps();
  },

  deleteBrainDump: async (id) => {
    await window.electronAPI.deleteBrainDump(id);
    await get().loadBrainDumps();
  },

  extractBrainDump: async (id) => {
    set({ brainDumpExtracting: true, brainDumpExtraction: null });
    try {
      const extraction = await window.electronAPI.extractBrainDump(id);
      set({ brainDumpExtraction: extraction });
      await get().loadBrainDumps();
    } catch (error) {
      // keep null extraction on error
    } finally {
      set({ brainDumpExtracting: false });
    }
  },

  clearBrainDumpExtraction: () => set({ brainDumpExtraction: null }),

  // ── Pipelines ──────────────────────────────────────────────────────

  setShowPipelines: (show) => set({ showPipelines: show }),

  loadPipelines: async () => {
    const { currentProject } = get();
    if (!currentProject) return;
    const pipelines = await window.electronAPI.getPipelines(currentProject.id);
    set({ pipelines });
  },

  createPipeline: async (pipeline) => {
    const { currentProject } = get();
    if (!currentProject) return;
    await window.electronAPI.createPipeline(currentProject.id, pipeline);
    await get().loadPipelines();
  },

  updatePipeline: async (id, updates) => {
    await window.electronAPI.updatePipeline(id, updates);
    await get().loadPipelines();
  },

  deletePipeline: async (id) => {
    await window.electronAPI.deletePipeline(id);
    await get().loadPipelines();
  },

  runPipeline: async (pipelineId, inputText) => {
    set({ pipelineRunning: true, pipelineResults: [] });
    try {
      const results = await window.electronAPI.runPipeline(pipelineId, inputText);
      set({ pipelineResults: results });
    } catch {
      set({ pipelineResults: [] });
    } finally {
      set({ pipelineRunning: false });
    }
  },

  clearPipelineResults: () => set({ pipelineResults: [] }),

  // ── Ambient Sounds ──────────────────────────────────────────────────

  setShowAmbientSounds: (show) => set({ showAmbientSounds: show }),

  setAmbientSoundPlaying: (id, playing) => {
    set((s) => ({
      ambientSounds: s.ambientSounds.map(sound =>
        sound.id === id ? { ...sound, playing } : sound
      ),
    }));
  },

  setAmbientSoundVolume: (id, volume) => {
    set((s) => ({
      ambientSounds: s.ambientSounds.map(sound =>
        sound.id === id ? { ...sound, volume } : sound
      ),
    }));
  },

  setAmbientMasterVolume: (volume) => set({ ambientMasterVolume: volume }),

  stopAllSounds: () => {
    set((s) => ({
      ambientSounds: s.ambientSounds.map(sound => ({ ...sound, playing: false })),
    }));
  },

  // ── Analysis ────────────────────────────────────────────────────────

  setShowAnalysis: (show) => set({ showAnalysis: show }),

  runAnalysis: async (type, chapterId) => {
    const { currentProject } = get();
    if (!currentProject) return;
    set({ analysisRunning: true, analysisType: type, analysisResults: null });
    try {
      const analysis = await window.electronAPI.runAnalysis(currentProject.id, type, chapterId);
      set({ analysisResults: analysis.results });
      await get().loadAnalyses();
    } catch (error) {
      console.error('Analysis failed:', error);
    } finally {
      set({ analysisRunning: false });
    }
  },

  loadAnalyses: async () => {
    const { currentProject } = get();
    if (!currentProject) return;
    const analyses = await window.electronAPI.getAnalyses(currentProject.id);
    set({ analyses });
  },

  deleteAnalysis: async (id) => {
    await window.electronAPI.deleteAnalysis(id);
    await get().loadAnalyses();
  },

  loadReadability: async (chapterId) => {
    const { currentProject } = get();
    if (!currentProject) return;
    const readabilityResults = await window.electronAPI.getReadability(currentProject.id, chapterId);
    set({ readabilityResults });
  },

  clearAnalysisResults: () => set({ analysisResults: null, readabilityResults: null }),

  // ── Character Relationships ────────────────────────────────────────────

  setShowRelationshipMap: (show) => set({ showRelationshipMap: show }),

  loadRelationships: async (projectId) => {
    const relationships = await window.electronAPI.getRelationships(projectId);
    set({ relationships });
  },

  createRelationship: async (rel) => {
    const { currentProject } = get();
    if (!currentProject) return;
    await window.electronAPI.createRelationship(currentProject.id, rel);
    await get().loadRelationships(currentProject.id);
  },

  updateRelationship: async (id, updates) => {
    await window.electronAPI.updateRelationship(id, updates);
    const { currentProject } = get();
    if (currentProject) await get().loadRelationships(currentProject.id);
  },

  deleteRelationship: async (id) => {
    await window.electronAPI.deleteRelationship(id);
    const { currentProject } = get();
    if (currentProject) await get().loadRelationships(currentProject.id);
  },

  scanRelationships: async () => {
    const { currentProject } = get();
    if (!currentProject) return;
    set({ relationshipScanning: true, relationshipScanResults: null });
    try {
      const results = await window.electronAPI.scanRelationships(currentProject.id);
      set({ relationshipScanResults: results });
    } catch (err) {
      console.error('Scan relationships failed:', err);
    } finally {
      set({ relationshipScanning: false });
    }
  },

  clearRelationshipScanResults: () => set({ relationshipScanResults: null }),

  // ── Submission Package ─────────────────────────────────────────────────

  setShowSubmissionPackage: (show) => set({ showSubmissionPackage: show }),

  generateSubmissionPackage: async () => {
    const { currentProject } = get();
    if (!currentProject) return;
    set({ submissionGenerating: true, submissionResult: null });
    try {
      const result = await window.electronAPI.generateSubmissionPackage(currentProject.id);
      set({ submissionResult: result });
    } catch (err) {
      console.error('Submission package failed:', err);
    } finally {
      set({ submissionGenerating: false });
    }
  },

  clearSubmissionResult: () => set({ submissionResult: null }),

  // ── Dashboard ───────────────────────────────────────────────────────

  setShowDashboard: (show) => set({ showDashboard: show }),

  loadDashboardStats: async () => {
    const { currentProject } = get();
    if (!currentProject) return;
    set({ dashboardLoading: true });
    try {
      const stats = await window.electronAPI.getWritingStats(currentProject.id);
      set({ dashboardStats: stats });
    } catch (err) {
      console.error('Failed to load dashboard stats:', err);
    } finally {
      set({ dashboardLoading: false });
    }
  },

  // ── Import ──────────────────────────────────────────────────────────

  importFiles: async () => {
    const { currentProject } = get();
    if (!currentProject) return;
    try {
      const result = await window.electronAPI.importFiles(currentProject.id);
      if (result.imported > 0) {
        await get().loadChapters(currentProject.id);
      }
    } catch (err) {
      console.error('Import failed:', err);
    }
  },

  // ── Cover Designer ──────────────────────────────────────────────────

  setShowCoverDesigner: (show) => set({ showCoverDesigner: show }),

  // ── Publishing Presets ─────────────────────────────────────────────────

  setShowPublishingPresets: (show) => set({ showPublishingPresets: show }),

  // ── Tracked Changes ─────────────────────────────────────────────────

  setShowTrackedChanges: (show) => set({ showTrackedChanges: show }),

  // ── Writing Sprint ──────────────────────────────────────────────────

  setShowWritingSprint: (show) => set({ showWritingSprint: show }),

  // ── Page Setup ──────────────────────────────────────────────────────

  setShowPageSetup: (show) => set({ showPageSetup: show }),

  // ── Feedback Dashboard ──────────────────────────────────────────────

  setShowFeedbackDashboard: (show) => set({ showFeedbackDashboard: show }),

  // ── Plugin System ─────────────────────────────────────────────────────

  setShowPlugins: (show) => set({ showPlugins: show }),

  // ── NovaSyn Exchange ──────────────────────────────────────────────────

  setShowExchange: (show) => set({ showExchange: show }),

  // ── Writing Guide ──────────────────────────────────────────────────────

  setShowWritingGuide: (show) => set({ showWritingGuide: show }),

  loadGuideMessages: async (projectId) => {
    const messages = await window.electronAPI.getGuideMessages(projectId);
    set({ guideMessages: messages });
  },

  sendGuideMessage: async (message) => {
    const { currentProject, guideMessages } = get();
    if (!currentProject) return;
    set({ guideLoading: true });
    // Optimistically add user message
    const tempUserMsg: GuideMessage = {
      id: 'temp-' + Date.now(),
      projectId: currentProject.id,
      role: 'user',
      content: message,
      createdAt: new Date().toISOString(),
    };
    set({ guideMessages: [...guideMessages, tempUserMsg] });
    try {
      const assistantMsg = await window.electronAPI.sendGuideMessage(currentProject.id, message);
      // Reload all messages to get both user + assistant with real IDs
      const messages = await window.electronAPI.getGuideMessages(currentProject.id);
      set({ guideMessages: messages, guideLoading: false });
    } catch {
      set({ guideLoading: false });
    }
  },

  clearGuideMessages: async () => {
    const { currentProject } = get();
    if (!currentProject) return;
    await window.electronAPI.clearGuideMessages(currentProject.id);
    set({ guideMessages: [] });
  },

  // ── Global Search ──────────────────────────────────────────────────────

  setShowGlobalSearch: (show) => set({ showGlobalSearch: show, globalSearchResults: show ? get().globalSearchResults : [] }),

  performGlobalSearch: async (query) => {
    const { currentProject } = get();
    if (!currentProject || !query.trim()) { set({ globalSearchResults: [] }); return; }
    set({ globalSearchLoading: true });
    try {
      const results = await window.electronAPI.globalSearch(currentProject.id, query.trim());
      set({ globalSearchResults: results, globalSearchLoading: false });
    } catch {
      set({ globalSearchLoading: false });
    }
  },

  // ── Timeline ───────────────────────────────────────────────────────────

  setShowTimeline: (show) => set({ showTimeline: show }),

  loadTimelineEvents: async (projectId) => {
    const events = await window.electronAPI.getTimelineEvents(projectId);
    set({ timelineEvents: events });
  },

  createTimelineEvent: async (event) => {
    const { currentProject } = get();
    if (!currentProject) return;
    await window.electronAPI.createTimelineEvent(currentProject.id, event);
    await get().loadTimelineEvents(currentProject.id);
  },

  updateTimelineEvent: async (id, updates) => {
    const { currentProject } = get();
    if (!currentProject) return;
    await window.electronAPI.updateTimelineEvent(id, updates);
    await get().loadTimelineEvents(currentProject.id);
  },

  deleteTimelineEvent: async (id) => {
    const { currentProject } = get();
    if (!currentProject) return;
    await window.electronAPI.deleteTimelineEvent(id);
    await get().loadTimelineEvents(currentProject.id);
  },

  // ── Storyboard ─────────────────────────────────────────────────────────

  setShowStoryboard: (show) => set({ showStoryboard: show }),

  // ── Orchestrations ──────────────────────────────────────────────────────

  setShowOrchBuilder: (show) => set({ showOrchBuilder: show }),
  setOrchestrations: (orchestrations) => set({ orchestrations }),
  addOrchestration: (orchestration) =>
    set((s) => ({ orchestrations: [orchestration, ...s.orchestrations] })),
  updateOrchestrationInStore: (id, updated) =>
    set((s) => ({
      orchestrations: s.orchestrations.map((o) => (o.id === id ? updated : o)),
    })),
  removeOrchestration: (id) =>
    set((s) => ({
      orchestrations: s.orchestrations.filter((o) => o.id !== id),
    })),

  // ── Chapter Targets ────────────────────────────────────────────────────

  loadChapterTargets: async (projectId) => {
    const targets = await window.electronAPI.getChapterTargets(projectId);
    set({ chapterTargets: targets });
  },

  setChapterTarget: async (chapterId, targetWords) => {
    const { currentProject } = get();
    if (!currentProject) return;
    await window.electronAPI.setChapterTarget(chapterId, targetWords);
    await get().loadChapterTargets(currentProject.id);
  },

  deleteChapterTarget: async (chapterId) => {
    const { currentProject } = get();
    if (!currentProject) return;
    await window.electronAPI.deleteChapterTarget(chapterId);
    await get().loadChapterTargets(currentProject.id);
  },

  // ── Settings ─────────────────────────────────────────────────────────

  loadSettings: async () => {
    const settings = await window.electronAPI.getSettings();
    set({ settings });
  },

  saveSettings: async (updates) => {
    await window.electronAPI.saveSettings(updates);
    set((s) => ({ settings: { ...s.settings, ...updates } }));
  },

  loadModels: async () => {
    const models = await window.electronAPI.getModels();
    set({ models });
  },

  loadApiKeys: async () => {
    const apiKeys = await window.electronAPI.getApiKeys();
    set({ apiKeys });
  },

  setApiKey: async (provider, key) => {
    await window.electronAPI.setApiKey(provider, key);
    await get().loadApiKeys();
  },

  // ── Sessions & Goals ─────────────────────────────────────────────────

  startSession: async () => {
    const { currentProject, chapters } = get();
    if (!currentProject) return;
    // Compute current total word count across all chapters
    const startWordCount = chapters.reduce((sum, ch) => sum + (ch.wordCount || 0), 0);
    try {
      const session = await window.electronAPI.startSession(currentProject.id, startWordCount);
      // Start 30s heartbeat
      const heartbeatTimer = setInterval(() => {
        get().heartbeatSession();
      }, 30000);
      // Start 15min idle timer
      const idleTimer = setTimeout(() => {
        get().endSession();
      }, 15 * 60 * 1000);
      set({
        currentSession: session,
        sessionActive: true,
        sessionHeartbeatTimer: heartbeatTimer,
        sessionIdleTimer: idleTimer,
        sessionAiWordsAccepted: 0,
        sessionAiOpsCount: 0,
      });
    } catch { /* session start failed, non-critical */ }
  },

  endSession: async () => {
    const { currentSession, sessionActive, sessionHeartbeatTimer, sessionIdleTimer, chapters, sessionAiWordsAccepted, sessionAiOpsCount } = get();
    if (!sessionActive || !currentSession) return;
    // Clear timers
    if (sessionHeartbeatTimer) clearInterval(sessionHeartbeatTimer);
    if (sessionIdleTimer) clearTimeout(sessionIdleTimer);
    // Compute final word count
    const endWordCount = chapters.reduce((sum, ch) => sum + (ch.wordCount || 0), 0);
    const wordsAdded = Math.max(0, endWordCount - currentSession.startWordCount);
    try {
      await window.electronAPI.endSession(currentSession.id, endWordCount, wordsAdded, sessionAiWordsAccepted, sessionAiOpsCount);
    } catch { /* non-critical */ }
    set({
      currentSession: null,
      sessionActive: false,
      sessionHeartbeatTimer: null,
      sessionIdleTimer: null,
      sessionAiWordsAccepted: 0,
      sessionAiOpsCount: 0,
    });
    // Reload session data
    const { currentProject } = get();
    if (currentProject) {
      await get().loadSessions();
      await get().loadSessionStats();
      await get().loadGoals();
    }
  },

  heartbeatSession: async () => {
    const { currentSession, sessionActive, chapters, sessionAiWordsAccepted, sessionAiOpsCount } = get();
    if (!sessionActive || !currentSession) return;
    const startTime = new Date(currentSession.startedAt).getTime();
    const duration = Math.floor((Date.now() - startTime) / 1000);
    const endWordCount = chapters.reduce((sum, ch) => sum + (ch.wordCount || 0), 0);
    const wordsAdded = Math.max(0, endWordCount - currentSession.startWordCount);
    try {
      await window.electronAPI.updateSession(currentSession.id, duration, endWordCount, wordsAdded, sessionAiWordsAccepted, sessionAiOpsCount);
    } catch { /* non-critical */ }
  },

  resetIdleTimer: () => {
    const { sessionActive, sessionIdleTimer } = get();
    // If session not active, auto-start it
    if (!sessionActive) {
      get().startSession();
      return;
    }
    if (sessionIdleTimer) clearTimeout(sessionIdleTimer);
    const newTimer = setTimeout(() => {
      get().endSession();
    }, 15 * 60 * 1000);
    set({ sessionIdleTimer: newTimer });
  },

  loadSessions: async () => {
    const { currentProject } = get();
    if (!currentProject) return;
    const sessions = await window.electronAPI.getSessions(currentProject.id);
    set({ sessions });
  },

  loadSessionStats: async () => {
    const { currentProject } = get();
    if (!currentProject) return;
    const sessionStats = await window.electronAPI.getSessionStats(currentProject.id);
    set({ sessionStats });
  },

  loadGoals: async () => {
    const { currentProject } = get();
    if (!currentProject) return;
    const goals = await window.electronAPI.getGoals(currentProject.id);
    set({ goals });
  },

  setGoal: async (targetWords) => {
    const { currentProject } = get();
    if (!currentProject) return;
    await window.electronAPI.setGoal(currentProject.id, 'daily', targetWords);
    await get().loadGoals();
  },

  deleteGoal: async (goalId) => {
    await window.electronAPI.deleteGoal(goalId);
    await get().loadGoals();
  },

  setShowSessionPanel: (show) => set({ showSessionPanel: show }),

  // ── UI ───────────────────────────────────────────────────────────────

  setSidebarWidth: (width) => set({ sidebarWidth: Math.max(200, Math.min(400, width)) }),
  setShowSettings: (show) => set({ showSettings: show }),
  setShowExport: (show) => set({ showExport: show }),
  setShowEncyclopediaEditor: (show, entry) => set({
    showEncyclopediaEditor: show,
    editingEncyclopediaEntry: entry ?? null,
  }),
  setShowOutlineEditor: (show) => set({ showOutlineEditor: show }),
  setShowVersionHistory: (show: boolean) => set({ showVersionHistory: show }),
  setShowAiLog: (show: boolean) => set({ showAiLog: show }),
  toggleDistractionFree: () => set((s) => ({ distractionFree: !s.distractionFree })),
}));

// Helper: extract plain text from TipTap JSON
function extractTextFromDoc(node: any): string {
  if (!node) return '';
  if (node.type === 'text') return node.text || '';
  if (node.content && Array.isArray(node.content)) {
    return node.content
      .map((child: any) => extractTextFromDoc(child))
      .join(node.type === 'paragraph' || node.type === 'heading' ? '\n' : '');
  }
  return '';
}
