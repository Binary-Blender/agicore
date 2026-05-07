// Shared TypeScript types used across main and renderer processes

export interface User {
  id: string;
  email: string;
  name: string | null;
  createdAt: string;
}

export interface Project {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Chapter {
  id: string;
  projectId: string;
  title: string;
  sortOrder: number;
  content: string; // TipTap JSON string
  wordCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Section {
  id: string;
  chapterId: string;
  title: string;
  sortOrder: number;
  content: string; // TipTap JSON string
  wordCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface EncyclopediaEntry {
  id: string;
  projectId: string;
  name: string;
  category: string;
  content: string;
  tokens: number;
  createdAt: string;
  updatedAt: string;
}

export interface Outline {
  id: string;
  chapterId: string;
  beats: string; // JSON string array
  createdAt: string;
  updatedAt: string;
}

export interface Version {
  id: string;
  chapterId: string;
  content: string;
  wordCount: number;
  snapshotName: string | null;
  source: 'auto' | 'manual' | 'ai-operation';
  createdAt: string;
}

export interface AiOperation {
  id: string;
  projectId: string;
  chapterId: string | null;
  operationType: string;
  model: string;
  prompt: string;
  contextTokens: number;
  response: string | null;
  responseTokens: number;
  accepted: number; // 0 = pending/rejected, 1 = accepted
  rating: number | null; // 1-5 star rating, null = unrated
  createdAt: string;
}

export interface AIModel {
  id: string;
  name: string;
  provider: string;
  contextWindow: number;
  isDefault?: boolean;
  requiresKey: boolean;
}

export interface WriterSettings {
  selectedModel: string;
  tokenBudget: number;
  systemPrompt: string;
  autoSaveInterval: number;
  theme: 'dark' | 'light' | 'sepia';
  ambientSounds?: { id: string; playing: boolean; volume: number }[];
  ambientMasterVolume?: number;
  screenplayMode?: boolean;
  poetryMode?: boolean;
  articleMode?: boolean;
  typewriterMode?: boolean;
  focusMode?: boolean;
  showPreview?: boolean;
  trackChanges?: boolean;
  fontFamily?: string;
  fontSize?: number;
  lineHeight?: number;
  pageSetup?: PageSetupConfig;
  namedStyle?: string; // active named style ID
  dropCapStyle?: 'none' | 'classic' | 'raised' | 'hanging';
  paragraphSpacing?: number; // em units (0–3)
  paragraphIndent?: number; // em units (0–3)
  textAlignment?: 'left' | 'center' | 'right' | 'justify';
  coverImagePath?: string; // path to cover image for EPUB exports
  headingFont?: string; // font family for headings
  codeFont?: string; // font family for code blocks
  smallCaps?: boolean; // enable small caps for body text
  letterSpacing?: number; // letter spacing in em units (-0.05 to 0.2)
  chapterOpener?: ChapterOpenerConfig; // chapter opener styling
  kerning?: number; // font-kerning adjustment (-0.05 to 0.1 em)
  ligatures?: boolean; // enable/disable font ligatures
  frontMatter?: FrontMatterConfig; // front matter pages config
  columns?: 1 | 2 | 3; // multi-column layout
  autoCheckUpdates?: boolean; // auto-check for updates on launch
  bleedMargin?: number; // bleed margin in inches for print export (default 0.125)
}

export interface ChapterOpenerConfig {
  titleSize: 'small' | 'medium' | 'large' | 'xlarge'; // chapter title size
  lowerStart: number; // drop distance in em (0-8)
  ornament: 'none' | 'line' | 'dots' | 'fleuron' | 'diamond' | 'stars'; // decorative divider
  titleAlignment: 'left' | 'center' | 'right';
  titleFont?: string; // override font for chapter titles
  subtitleVisible: boolean; // show chapter number above title
  pageBreak: boolean; // force page break before chapter
}

export interface FrontMatterConfig {
  titlePage: boolean;
  copyrightPage: boolean;
  dedicationPage: boolean;
  dedicationText: string;
  copyrightText: string; // default auto-generated
  epigraphPage: boolean;
  epigraphText: string;
  epigraphAttribution: string;
}

export interface PageLayoutTemplate {
  id: string;
  name: string;
  description: string;
  pageSize: 'letter' | 'a4' | 'a5' | '6x9' | '5.5x8.5' | '5x8' | '4.25x6.87';
  marginTop: number;
  marginBottom: number;
  marginLeft: number;
  marginRight: number;
}

export interface MasterPagePreset {
  id: string;
  name: string;
  description: string;
  pageSize: string;
  marginTop: number;
  marginBottom: number;
  marginLeft: number;
  marginRight: number;
  headerText: string;
  footerText: string;
  showPageNumbers: boolean;
  pageNumberPosition: string;
  columns: number;
  createdAt: string;
}

export interface PageSetupConfig {
  pageSize: 'letter' | 'a4' | 'a5' | '6x9' | '5.5x8.5' | '5x8' | '4.25x6.87';
  marginTop: number; // in inches
  marginBottom: number;
  marginLeft: number;
  marginRight: number;
  headerText: string;
  footerText: string;
  showPageNumbers: boolean;
  pageNumberPosition: 'bottom-center' | 'bottom-right' | 'top-right';
  bleed?: boolean; // enable bleed margins for print
  bleedMargin?: number; // bleed margin in inches (default 0.125)
}

export interface WritingStats {
  totalWords: number;
  totalChapters: number;
  avgWordsPerChapter: number;
  longestChapter: { title: string; words: number };
  shortestChapter: { title: string; words: number };
  totalEncyclopediaEntries: number;
  totalAiOperations: number;
  aiAcceptRate: number;
  totalSessions: number;
  totalWritingMinutes: number;
  avgSessionMinutes: number;
  wordsPerDay: { date: string; words: number }[];
  wordsByChapter: { title: string; words: number }[];
}

export interface WriterSession {
  id: string;
  projectId: string;
  startedAt: string;
  endedAt: string | null;
  durationSeconds: number;
  wordsAdded: number;
  aiWordsAccepted: number;
  aiOpsCount: number;
  startWordCount: number;
  endWordCount: number;
}

export interface WriterGoal {
  id: string;
  projectId: string | null;
  goalType: string;
  targetWords: number;
  currentStreak: number;
  longestStreak: number;
  lastMetDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SessionStats {
  todayWords: number;
  weekWords: number;
  avgSessionMinutes: number;
  totalSessions: number;
  mostProductiveHour: number | null;
}

export interface DiscoverySession {
  id: string;
  projectId: string;
  chapterId: string | null;
  startedAt: string;
  endedAt: string | null;
  suggestionsGenerated: number;
  suggestionsAccepted: number;
  followThread: string | null;
  createdAt: string;
}

export interface DiscoverySuggestion {
  id: string;
  sessionId: string;
  suggestionText: string;
  suggestionType: string;
  accepted: number;
  createdAt: string;
}

export interface ContinuityPlant {
  id: string;
  projectId: string;
  name: string;
  setupChapterId: string | null;
  setupContent: string;
  payoffChapterId: string | null;
  payoffContent: string | null;
  status: 'planned' | 'setup' | 'resolved';
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface ContinuityThread {
  id: string;
  projectId: string;
  question: string;
  raisedChapterId: string | null;
  targetChapterId: string | null;
  status: 'open' | 'resolved';
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface CharacterKnowledge {
  id: string;
  projectId: string;
  characterId: string;
  chapterId: string;
  knows: string;
  doesNotKnow: string;
  createdAt: string;
  updatedAt: string;
}

export interface KnowledgeBaseEntry {
  id: string;
  projectId: string | null;
  title: string;
  category: string;  // 'Ideas' | 'Stories' | 'Frameworks' | 'Voice Profile' | 'Research'
  content: string;
  tokens: number;
  isGlobal: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BrainDump {
  id: string;
  projectId: string;
  content: string;
  extracted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BrainDumpExtraction {
  ideas: string[];
  encyclopediaEntries: { name: string; category: string; content: string }[];
  outlineBeats: string[];
  questions: string[];
}

export interface PipelineStep {
  id: string;
  prompt: string;
  label: string;
}

export interface Pipeline {
  id: string;
  projectId: string | null;
  name: string;
  description: string;
  steps: PipelineStep[];
  isPreset: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PipelineRunResult {
  stepLabel: string;
  content: string;
  tokens: number;
  error?: string;
}

export interface ModelComparisonResult {
  modelId: string;
  modelName: string;
  content: string;
  totalTokens: number;
  error?: string;
  operationId?: string;
}

export interface Analysis {
  id: string;
  projectId: string;
  analysisType: 'pacing' | 'readability' | 'voice_audit' | 'consistency';
  chapterId: string | null;
  results: any;
  createdAt: string;
}

export interface ReadabilityResult {
  fleschKincaid: number;
  avgSentenceLength: number;
  avgWordLength: number;
  paragraphCount: number;
  dialoguePercentage: number;
  overusedWords: { word: string; count: number }[];
  sentenceLengths: number[];
}

export interface CharacterRelationship {
  id: string;
  projectId: string;
  characterAId: string;
  characterBId: string;
  relationshipType: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface SubmissionPackageResult {
  synopsis: string;
  queryLetter: string;
  authorBio: string;
  logline: string;
}

export interface ChapterTemplate {
  id: string;
  name: string;
  description: string;
  content: any; // TipTap JSON doc
}

export interface ChapterNote {
  id: string;
  chapterId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface PublishingPreset {
  id: string;
  name: string;
  platform: string;
  description: string;
  format: 'epub' | 'pdf' | 'docx' | 'html';
  requirements: {
    minWords?: number;
    maxWords?: number;
    requiresCover?: boolean;
    requiresToc?: boolean;
    requiresTitlePage?: boolean;
    maxChapterWords?: number;
    requiresIsbn?: boolean;
  };
}

export interface PresetValidationResult {
  preset: string;
  passed: boolean;
  checks: { label: string; passed: boolean; detail: string }[];
}

export interface InlineComment {
  id: string;
  chapterId: string;
  fromPos: number;
  toPos: number;
  text: string;
  author: string;
  resolved: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TrackedChange {
  id: string;
  chapterId: string;
  changeType: 'insertion' | 'deletion';
  fromPos: number;
  toPos: number;
  oldText: string;
  newText: string;
  author: string;
  createdAt: string;
}

export interface WritingSprint {
  id: string;
  projectId: string;
  durationSeconds: number;
  targetWords: number;
  wordsWritten: number;
  startedAt: string;
  endedAt: string | null;
}

export interface CustomTemplate {
  id: string;
  name: string;
  description: string;
  content: string; // TipTap JSON string
  createdAt: string;
}

export interface RevisionTask {
  id: string;
  category: 'Plot' | 'Character' | 'Pacing' | 'Style' | 'Continuity' | 'Other';
  priority: 'high' | 'medium' | 'low';
  description: string;
  relatedComments: string[]; // comment IDs
  chapterTitle: string;
  completed: boolean;
}

export interface RevisionPlan {
  id: string;
  projectId: string;
  tasks: RevisionTask[];
  summary: string;
  createdAt: string;
}

// Cover Designer Layers
export interface CoverLayer {
  id: string;
  type: 'background' | 'image' | 'text';
  name: string;
  visible: boolean;
  opacity: number; // 0-1
  zIndex: number;
  // Background layer
  color?: string;
  // Image layer
  imageDataUrl?: string;
  imageX?: number;
  imageY?: number;
  imageWidth?: number;
  imageHeight?: number;
  // Text layer
  text?: string;
  textColor?: string;
  textSize?: number;
  textFont?: string;
  textX?: number;
  textY?: number;
  textBold?: boolean;
  textItalic?: boolean;
}

// Plugin System
export interface WriterPlugin {
  id: string;
  name: string;
  description: string;
  version: string;
  enabled: boolean;
  builtIn: boolean;
  entryPoint?: string; // path for custom plugins
}

export interface PluginResult {
  pluginId: string;
  title: string;
  content: string;
  type: 'text' | 'html' | 'json';
}

// NovaSyn Ecosystem Exchange
export interface NovaSynExchangePacket {
  id: string;
  sourceApp: string;
  targetApp: string | null; // null = any app
  contentType: 'chapter' | 'selection' | 'encyclopedia' | 'image' | 'research' | 'prompt';
  title: string;
  content: string;
  metadata: Record<string, any>;
  createdAt: string;
}

// Writing Guide
export interface GuideMessage {
  id: string;
  projectId: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

// Timeline Events
export interface TimelineEvent {
  id: string;
  projectId: string;
  title: string;
  description: string;
  chapterId: string | null;
  characterIds: string[]; // encoded as JSON
  eventDate: string;
  sortOrder: number;
  color: string;
  createdAt: string;
  updatedAt: string;
}

// Chapter Word Count Targets
export interface ChapterTarget {
  id: string;
  chapterId: string;
  targetWords: number;
  createdAt: string;
}

// Global Search Result
export interface GlobalSearchResult {
  type: 'chapter' | 'encyclopedia' | 'kb' | 'note' | 'timeline';
  id: string;
  title: string;
  snippet: string;
  chapterId?: string;
}

export interface ProjectBackup {
  version: number;
  exportedAt: string;
  project: Project;
  chapters: Chapter[];
  encyclopediaEntries: EncyclopediaEntry[];
  outlines: (Outline & { chapterId: string })[];
  notes: ChapterNote[];
  comments: InlineComment[];
}

// Orchestration types
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

// IPC Channel names
export const IPC_CHANNELS = {
  // Projects
  GET_PROJECTS: 'get-projects',
  CREATE_PROJECT: 'create-project',
  UPDATE_PROJECT: 'update-project',
  DELETE_PROJECT: 'delete-project',

  // Chapters
  GET_CHAPTERS: 'get-chapters',
  CREATE_CHAPTER: 'create-chapter',
  UPDATE_CHAPTER: 'update-chapter',
  DELETE_CHAPTER: 'delete-chapter',
  REORDER_CHAPTERS: 'reorder-chapters',

  // Sections
  GET_SECTIONS: 'get-sections',
  CREATE_SECTION: 'create-section',
  UPDATE_SECTION: 'update-section',
  DELETE_SECTION: 'delete-section',
  REORDER_SECTIONS: 'reorder-sections',

  // Encyclopedia
  GET_ENCYCLOPEDIA: 'get-encyclopedia',
  CREATE_ENCYCLOPEDIA_ENTRY: 'create-encyclopedia-entry',
  UPDATE_ENCYCLOPEDIA_ENTRY: 'update-encyclopedia-entry',
  DELETE_ENCYCLOPEDIA_ENTRY: 'delete-encyclopedia-entry',
  SEARCH_ENCYCLOPEDIA: 'search-encyclopedia',

  // Outlines
  GET_OUTLINE: 'get-outline',
  SAVE_OUTLINE: 'save-outline',

  // Versions
  GET_VERSIONS: 'get-versions',
  CREATE_VERSION: 'create-version',
  RESTORE_VERSION: 'restore-version',
  DELETE_VERSION: 'delete-version',

  // AI Operations
  GET_AI_OPERATIONS: 'get-ai-operations',
  UPDATE_AI_OPERATION: 'update-ai-operation',

  // AI
  SEND_PROMPT: 'send-prompt',
  CANCEL_STREAM: 'cancel-stream',

  // Export
  EXPORT_PROJECT: 'export-project',

  // Settings
  GET_SETTINGS: 'get-settings',
  SAVE_SETTINGS: 'save-settings',

  // Models & API Keys
  GET_MODELS: 'get-models',
  GET_API_KEYS: 'get-api-keys',
  SET_API_KEY: 'set-api-key',

  // Sessions
  START_SESSION: 'start-session',
  END_SESSION: 'end-session',
  UPDATE_SESSION: 'update-session',
  GET_SESSIONS: 'get-sessions',
  GET_SESSION_STATS: 'get-session-stats',

  // Goals
  GET_GOALS: 'get-goals',
  SET_GOAL: 'set-goal',
  DELETE_GOAL: 'delete-goal',

  // Discovery
  START_DISCOVERY: 'start-discovery',
  END_DISCOVERY: 'end-discovery',
  GET_DISCOVERY_SESSIONS: 'get-discovery-sessions',
  GENERATE_SUGGESTIONS: 'generate-suggestions',
  ACCEPT_SUGGESTION: 'accept-suggestion',
  SET_FOLLOW_THREAD: 'set-follow-thread',
  CONVERT_DISCOVERY: 'convert-discovery',

  // Continuity — Plants
  GET_PLANTS: 'get-plants',
  CREATE_PLANT: 'create-plant',
  UPDATE_PLANT: 'update-plant',
  DELETE_PLANT: 'delete-plant',

  // Continuity — Threads
  GET_THREADS: 'get-threads',
  CREATE_THREAD: 'create-thread',
  UPDATE_THREAD: 'update-thread',
  DELETE_THREAD: 'delete-thread',

  // Continuity — Character Knowledge
  GET_CHARACTER_KNOWLEDGE: 'get-character-knowledge',
  CREATE_CHARACTER_KNOWLEDGE: 'create-character-knowledge',
  UPDATE_CHARACTER_KNOWLEDGE: 'update-character-knowledge',
  DELETE_CHARACTER_KNOWLEDGE: 'delete-character-knowledge',

  // Continuity — AI Scans
  SCAN_FOR_PLANTS: 'scan-for-plants',
  SCAN_FOR_THREADS: 'scan-for-threads',
  VERIFY_KNOWLEDGE: 'verify-knowledge',

  // Knowledge Base
  GET_KB_ENTRIES: 'get-kb-entries',
  CREATE_KB_ENTRY: 'create-kb-entry',
  UPDATE_KB_ENTRY: 'update-kb-entry',
  DELETE_KB_ENTRY: 'delete-kb-entry',
  SEARCH_KB: 'search-kb',
  KB_ANALYZE_VOICE: 'kb-analyze-voice',
  KB_FIND_CONNECTIONS: 'kb-find-connections',
  KB_SUGGEST_GAPS: 'kb-suggest-gaps',

  // Encyclopedia AI
  ENCYCLOPEDIA_GENERATE_PROFILE: 'encyclopedia-generate-profile',
  ENCYCLOPEDIA_EXTRACT_ENTRIES: 'encyclopedia-extract-entries',
  ENCYCLOPEDIA_CHECK_CONSISTENCY: 'encyclopedia-check-consistency',

  // Brain Dumps
  GET_BRAIN_DUMPS: 'get-brain-dumps',
  CREATE_BRAIN_DUMP: 'create-brain-dump',
  UPDATE_BRAIN_DUMP: 'update-brain-dump',
  DELETE_BRAIN_DUMP: 'delete-brain-dump',
  EXTRACT_BRAIN_DUMP: 'extract-brain-dump',

  // Model Comparison
  COMPARE_MODELS: 'compare-models',

  // Pipelines
  GET_PIPELINES: 'get-pipelines',
  CREATE_PIPELINE: 'create-pipeline',
  UPDATE_PIPELINE: 'update-pipeline',
  DELETE_PIPELINE: 'delete-pipeline',
  RUN_PIPELINE: 'run-pipeline',

  // Analysis
  RUN_ANALYSIS: 'run-analysis',
  GET_ANALYSES: 'get-analyses',
  DELETE_ANALYSIS: 'delete-analysis',
  GET_READABILITY: 'get-readability',
  GET_OVERUSED_WORDS: 'get-overused-words',

  // Character Relationships
  GET_RELATIONSHIPS: 'get-relationships',
  CREATE_RELATIONSHIP: 'create-relationship',
  UPDATE_RELATIONSHIP: 'update-relationship',
  DELETE_RELATIONSHIP: 'delete-relationship',
  SCAN_RELATIONSHIPS: 'scan-relationships',

  // Submission Package
  GENERATE_SUBMISSION_PACKAGE: 'generate-submission-package',

  // Dashboard
  GET_WRITING_STATS: 'get-writing-stats',

  // Import
  IMPORT_FILES: 'import-files',

  // Cover Designer
  EXPORT_COVER: 'export-cover',

  // Chapter Notes
  GET_CHAPTER_NOTES: 'get-chapter-notes',
  SAVE_CHAPTER_NOTE: 'save-chapter-note',

  // Publishing Presets
  VALIDATE_PUBLISHING_PRESET: 'validate-publishing-preset',

  // Inline Comments
  GET_COMMENTS: 'get-comments',
  CREATE_COMMENT: 'create-comment',
  UPDATE_COMMENT: 'update-comment',
  DELETE_COMMENT: 'delete-comment',

  // Tracked Changes
  GET_TRACKED_CHANGES: 'get-tracked-changes',
  CREATE_TRACKED_CHANGE: 'create-tracked-change',
  DELETE_TRACKED_CHANGE: 'delete-tracked-change',
  CLEAR_TRACKED_CHANGES: 'clear-tracked-changes',

  // Writing Sprints
  START_SPRINT: 'start-sprint',
  END_SPRINT: 'end-sprint',
  GET_SPRINTS: 'get-sprints',

  // Custom Templates
  GET_CUSTOM_TEMPLATES: 'get-custom-templates',
  CREATE_CUSTOM_TEMPLATE: 'create-custom-template',
  DELETE_CUSTOM_TEMPLATE: 'delete-custom-template',

  // Feedback Dashboard
  GENERATE_REVISION_PLAN: 'generate-revision-plan',
  GET_REVISION_PLANS: 'get-revision-plans',
  DELETE_REVISION_PLAN: 'delete-revision-plan',

  // AI Font Pairings
  SUGGEST_FONT_PAIRINGS: 'suggest-font-pairings',

  // Cover Image
  SELECT_COVER_IMAGE: 'select-cover-image',

  // Review Copy Export
  EXPORT_REVIEW_COPY: 'export-review-copy',

  // Project Backup
  BACKUP_PROJECT: 'backup-project',
  RESTORE_PROJECT: 'restore-project',

  // Master Page Presets
  GET_MASTER_PAGES: 'get-master-pages',
  CREATE_MASTER_PAGE: 'create-master-page',
  DELETE_MASTER_PAGE: 'delete-master-page',

  // Import DOCX Tracked Changes
  IMPORT_DOCX_CHANGES: 'import-docx-changes',

  // Auto-Updater
  CHECK_FOR_UPDATES: 'check-for-updates',

  // Insert Image (Full Page)
  INSERT_IMAGE: 'insert-image',

  // Import PDF Annotations
  IMPORT_PDF_ANNOTATIONS: 'import-pdf-annotations',

  // Cover Designer: Full Wrap Export
  EXPORT_COVER_FULL_WRAP: 'export-cover-full-wrap',

  // Cover Designer: Upload Layer Image
  UPLOAD_COVER_IMAGE: 'upload-cover-image',

  // Plugin System
  GET_PLUGINS: 'get-plugins',
  TOGGLE_PLUGIN: 'toggle-plugin',
  RUN_PLUGIN: 'run-plugin',

  // NovaSyn Ecosystem Exchange
  SEND_TO_EXCHANGE: 'send-to-exchange',
  RECEIVE_FROM_EXCHANGE: 'receive-from-exchange',
  LIST_EXCHANGE_PACKETS: 'list-exchange-packets',
  DELETE_EXCHANGE_PACKET: 'delete-exchange-packet',

  // Writing Guide
  GET_GUIDE_MESSAGES: 'get-guide-messages',
  SEND_GUIDE_MESSAGE: 'send-guide-message',
  CLEAR_GUIDE_MESSAGES: 'clear-guide-messages',

  // Global Search
  GLOBAL_SEARCH: 'global-search',

  // Timeline
  GET_TIMELINE_EVENTS: 'get-timeline-events',
  CREATE_TIMELINE_EVENT: 'create-timeline-event',
  UPDATE_TIMELINE_EVENT: 'update-timeline-event',
  DELETE_TIMELINE_EVENT: 'delete-timeline-event',

  // Chapter Targets
  GET_CHAPTER_TARGETS: 'get-chapter-targets',
  SET_CHAPTER_TARGET: 'set-chapter-target',
  DELETE_CHAPTER_TARGET: 'delete-chapter-target',

  // Window
  MINIMIZE_WINDOW: 'minimize-window',
  MAXIMIZE_WINDOW: 'maximize-window',
  CLOSE_WINDOW: 'close-window',

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
} as const;

// Electron API exposed to renderer
export interface ElectronAPI {
  // Projects
  getProjects: () => Promise<Project[]>;
  createProject: (name: string, description?: string) => Promise<Project>;
  updateProject: (id: string, updates: { name?: string; description?: string }) => Promise<Project>;
  deleteProject: (id: string) => Promise<void>;

  // Chapters
  getChapters: (projectId: string) => Promise<Chapter[]>;
  createChapter: (projectId: string, title: string) => Promise<Chapter>;
  updateChapter: (id: string, updates: Partial<Pick<Chapter, 'title' | 'content' | 'wordCount'>>) => Promise<Chapter>;
  deleteChapter: (id: string) => Promise<void>;
  reorderChapters: (chapterIds: string[]) => Promise<void>;

  // Sections
  getSections: (chapterId: string) => Promise<Section[]>;
  createSection: (chapterId: string, title: string) => Promise<Section>;
  updateSection: (id: string, updates: Partial<Pick<Section, 'title' | 'content' | 'wordCount'>>) => Promise<Section>;
  deleteSection: (id: string) => Promise<void>;
  reorderSections: (sectionIds: string[]) => Promise<void>;

  // Encyclopedia
  getEncyclopedia: (projectId: string) => Promise<EncyclopediaEntry[]>;
  createEncyclopediaEntry: (projectId: string, entry: { name: string; category: string; content: string }) => Promise<EncyclopediaEntry>;
  updateEncyclopediaEntry: (id: string, updates: Partial<Pick<EncyclopediaEntry, 'name' | 'category' | 'content'>>) => Promise<EncyclopediaEntry>;
  deleteEncyclopediaEntry: (id: string) => Promise<void>;
  searchEncyclopedia: (projectId: string, query: string) => Promise<EncyclopediaEntry[]>;

  // Outlines
  getOutline: (chapterId: string) => Promise<Outline | null>;
  saveOutline: (chapterId: string, beats: string[]) => Promise<Outline>;

  // Versions
  getVersions: (chapterId: string) => Promise<Version[]>;
  createVersion: (chapterId: string, snapshotName?: string, source?: string) => Promise<Version>;
  restoreVersion: (versionId: string) => Promise<Chapter>;
  deleteVersion: (versionId: string) => Promise<void>;

  // AI Operations
  getAiOperations: (projectId: string) => Promise<AiOperation[]>;
  updateAiOperation: (id: string, updates: { accepted?: number; rating?: number }) => Promise<void>;

  // AI
  sendPrompt: (prompt: string, modelId: string, context: {
    chapterContent?: string;
    encyclopediaEntries?: string[];
    systemPrompt?: string;
    projectId?: string;
    chapterId?: string;
    operationType?: string;
  }) => Promise<{ content: string; model: string; totalTokens: number; operationId?: string }>;
  cancelStream: () => Promise<void>;
  onAiDelta: (callback: (text: string) => void) => () => void;
  compareModels: (prompt: string, modelIds: string[], context: {
    chapterContent?: string;
    encyclopediaEntries?: string[];
    systemPrompt?: string;
    projectId?: string;
    chapterId?: string;
    operationType?: string;
  }) => Promise<ModelComparisonResult[]>;

  // Export
  exportProject: (projectId: string, options: {
    format: 'markdown' | 'text' | 'docx' | 'epub' | 'html' | 'audiobook' | 'pdf' | 'kindle';
    scope: 'all' | 'chapter';
    chapterId?: string;
    manuscriptFormat?: boolean;
    includeTitlePage?: boolean;
    includeToc?: boolean;
    authorName?: string;
    pdfQuality?: 'screen' | 'print';
    includeFrontMatter?: boolean;
  }) => Promise<{ success: boolean; filePath?: string }>;

  // Settings
  getSettings: () => Promise<WriterSettings>;
  saveSettings: (updates: Partial<WriterSettings>) => Promise<void>;

  // Models & API Keys
  getModels: () => Promise<AIModel[]>;
  getApiKeys: () => Promise<Record<string, string>>;
  setApiKey: (provider: string, key: string) => Promise<void>;

  // Sessions
  startSession: (projectId: string, startWordCount: number) => Promise<WriterSession>;
  endSession: (sessionId: string, endWordCount: number, wordsAdded: number, aiWordsAccepted: number, aiOpsCount: number) => Promise<WriterSession>;
  updateSession: (sessionId: string, durationSeconds: number, endWordCount: number, wordsAdded: number, aiWordsAccepted: number, aiOpsCount: number) => Promise<void>;
  getSessions: (projectId: string) => Promise<WriterSession[]>;
  getSessionStats: (projectId: string) => Promise<SessionStats>;

  // Goals
  getGoals: (projectId: string) => Promise<WriterGoal[]>;
  setGoal: (projectId: string, goalType: string, targetWords: number) => Promise<WriterGoal>;
  deleteGoal: (goalId: string) => Promise<void>;

  // Discovery
  startDiscovery: (projectId: string, chapterId?: string) => Promise<DiscoverySession>;
  endDiscovery: (sessionId: string) => Promise<DiscoverySession>;
  getDiscoverySessions: (projectId: string) => Promise<DiscoverySession[]>;
  generateSuggestions: (sessionId: string, chapterContent: string, encyclopediaContext: string, followThread?: string, temperature?: number) => Promise<DiscoverySuggestion[]>;
  acceptSuggestion: (suggestionId: string) => Promise<void>;
  setFollowThread: (sessionId: string, followThread: string) => Promise<void>;
  convertDiscovery: (sessionId: string) => Promise<{ suggestions: string[] }>;

  // Continuity — Plants
  getPlants: (projectId: string) => Promise<ContinuityPlant[]>;
  createPlant: (projectId: string, plant: { name: string; setupChapterId?: string; setupContent?: string; payoffChapterId?: string; payoffContent?: string; status?: string; notes?: string }) => Promise<ContinuityPlant>;
  updatePlant: (id: string, updates: Partial<Omit<ContinuityPlant, 'id' | 'projectId' | 'createdAt' | 'updatedAt'>>) => Promise<ContinuityPlant>;
  deletePlant: (id: string) => Promise<void>;

  // Continuity — Threads
  getThreads: (projectId: string) => Promise<ContinuityThread[]>;
  createThread: (projectId: string, thread: { question: string; raisedChapterId?: string; targetChapterId?: string; status?: string; notes?: string }) => Promise<ContinuityThread>;
  updateThread: (id: string, updates: Partial<Omit<ContinuityThread, 'id' | 'projectId' | 'createdAt' | 'updatedAt'>>) => Promise<ContinuityThread>;
  deleteThread: (id: string) => Promise<void>;

  // Continuity — Character Knowledge
  getCharacterKnowledge: (projectId: string) => Promise<CharacterKnowledge[]>;
  createCharacterKnowledge: (projectId: string, entry: { characterId: string; chapterId: string; knows?: string; doesNotKnow?: string }) => Promise<CharacterKnowledge>;
  updateCharacterKnowledge: (id: string, updates: { knows?: string; doesNotKnow?: string }) => Promise<CharacterKnowledge>;
  deleteCharacterKnowledge: (id: string) => Promise<void>;

  // Continuity — AI Scans
  scanForPlants: (projectId: string) => Promise<any[]>;
  scanForThreads: (projectId: string) => Promise<any[]>;
  verifyKnowledge: (projectId: string, characterId: string) => Promise<any[]>;

  // Knowledge Base
  getKbEntries: (projectId: string) => Promise<KnowledgeBaseEntry[]>;
  createKbEntry: (entry: { projectId?: string | null; title: string; category: string; content: string; isGlobal: boolean }) => Promise<KnowledgeBaseEntry>;
  updateKbEntry: (id: string, updates: Partial<Pick<KnowledgeBaseEntry, 'title' | 'category' | 'content' | 'isGlobal'>>) => Promise<KnowledgeBaseEntry>;
  deleteKbEntry: (id: string) => Promise<void>;
  searchKb: (projectId: string, query: string) => Promise<KnowledgeBaseEntry[]>;
  kbAnalyzeVoice: (entryId: string) => Promise<string>;
  kbFindConnections: (projectId: string) => Promise<any[]>;
  kbSuggestGaps: (projectId: string) => Promise<any[]>;

  // Encyclopedia AI
  encyclopediaGenerateProfile: (entryId: string) => Promise<string>;
  encyclopediaExtractEntries: (projectId: string) => Promise<{ name: string; category: string; content: string }[]>;
  encyclopediaCheckConsistency: (projectId: string) => Promise<{ entry: string; issue: string; suggestion: string }[]>;

  // Pipelines
  getPipelines: (projectId: string) => Promise<Pipeline[]>;
  createPipeline: (projectId: string, pipeline: { name: string; description: string; steps: PipelineStep[] }) => Promise<Pipeline>;
  updatePipeline: (id: string, updates: { name?: string; description?: string; steps?: PipelineStep[] }) => Promise<Pipeline>;
  deletePipeline: (id: string) => Promise<void>;
  runPipeline: (pipelineId: string, inputText: string) => Promise<PipelineRunResult[]>;

  // Brain Dumps
  getBrainDumps: (projectId: string) => Promise<BrainDump[]>;
  createBrainDump: (projectId: string, content: string) => Promise<BrainDump>;
  updateBrainDump: (id: string, content: string) => Promise<BrainDump>;
  deleteBrainDump: (id: string) => Promise<void>;
  extractBrainDump: (id: string) => Promise<BrainDumpExtraction>;

  // Analysis
  runAnalysis: (projectId: string, type: string, chapterId?: string) => Promise<Analysis>;
  getAnalyses: (projectId: string) => Promise<Analysis[]>;
  deleteAnalysis: (id: string) => Promise<void>;
  getReadability: (projectId: string, chapterId?: string) => Promise<ReadabilityResult>;
  getOverusedWords: (projectId: string, chapterId?: string) => Promise<{ word: string; count: number }[]>;

  // Character Relationships
  getRelationships: (projectId: string) => Promise<CharacterRelationship[]>;
  createRelationship: (projectId: string, rel: { characterAId: string; characterBId: string; relationshipType: string; description: string }) => Promise<CharacterRelationship>;
  updateRelationship: (id: string, updates: { relationshipType?: string; description?: string }) => Promise<CharacterRelationship>;
  deleteRelationship: (id: string) => Promise<void>;
  scanRelationships: (projectId: string) => Promise<{ characterAName: string; characterBName: string; relationshipType: string; description: string }[]>;

  // Submission Package
  generateSubmissionPackage: (projectId: string) => Promise<SubmissionPackageResult>;

  // Dashboard
  getWritingStats: (projectId: string) => Promise<WritingStats>;

  // Import
  importFiles: (projectId: string) => Promise<{ imported: number; chapters: string[] }>;

  // Cover Designer
  exportCover: (dataUrl: string, projectName: string) => Promise<{ success: boolean; filePath?: string }>;

  // Chapter Notes
  getChapterNotes: (chapterId: string) => Promise<ChapterNote | null>;
  saveChapterNote: (chapterId: string, content: string) => Promise<ChapterNote>;

  // Publishing Presets
  validatePublishingPreset: (projectId: string, presetId: string) => Promise<PresetValidationResult>;

  // Inline Comments
  getComments: (chapterId: string) => Promise<InlineComment[]>;
  createComment: (comment: { chapterId: string; fromPos: number; toPos: number; text: string; author: string }) => Promise<InlineComment>;
  updateComment: (id: string, updates: { text?: string; resolved?: boolean; fromPos?: number; toPos?: number }) => Promise<InlineComment>;
  deleteComment: (id: string) => Promise<void>;

  // Tracked Changes
  getTrackedChanges: (chapterId: string) => Promise<TrackedChange[]>;
  createTrackedChange: (change: { chapterId: string; changeType: string; fromPos: number; toPos: number; oldText: string; newText: string; author: string }) => Promise<TrackedChange>;
  deleteTrackedChange: (id: string) => Promise<void>;
  clearTrackedChanges: (chapterId: string) => Promise<void>;

  // Writing Sprints
  startSprint: (projectId: string, durationSeconds: number, targetWords: number) => Promise<WritingSprint>;
  endSprint: (sprintId: string, wordsWritten: number) => Promise<WritingSprint>;
  getSprints: (projectId: string) => Promise<WritingSprint[]>;

  // Custom Templates
  getCustomTemplates: () => Promise<CustomTemplate[]>;
  createCustomTemplate: (template: { name: string; description: string; content: string }) => Promise<CustomTemplate>;
  deleteCustomTemplate: (id: string) => Promise<void>;

  // Feedback Dashboard
  generateRevisionPlan: (projectId: string) => Promise<RevisionPlan>;
  getRevisionPlans: (projectId: string) => Promise<RevisionPlan[]>;
  deleteRevisionPlan: (id: string) => Promise<void>;

  // AI Font Pairings
  suggestFontPairings: (genre: string, mood: string) => Promise<{ bodyFont: string; headingFont: string; codeFont: string; rationale: string }[]>;

  // Cover Image
  selectCoverImage: () => Promise<{ filePath: string; dataUrl: string } | null>;

  // Review Copy Export
  exportReviewCopy: (projectId: string, options: { authorName?: string; includeComments?: boolean; includeQuestions?: boolean }) => Promise<{ success: boolean; filePath?: string }>;

  // Project Backup
  backupProject: (projectId: string) => Promise<{ success: boolean; filePath?: string }>;
  restoreProject: () => Promise<{ success: boolean; projectId?: string; projectName?: string }>;

  // Master Page Presets
  getMasterPages: () => Promise<MasterPagePreset[]>;
  createMasterPage: (preset: { name: string; description: string; pageSize: string; marginTop: number; marginBottom: number; marginLeft: number; marginRight: number; headerText: string; footerText: string; showPageNumbers: boolean; pageNumberPosition: string; columns: number }) => Promise<MasterPagePreset>;
  deleteMasterPage: (id: string) => Promise<void>;

  // Import DOCX Tracked Changes
  importDocxChanges: (chapterId: string) => Promise<{ imported: number }>;

  // Auto-Updater
  checkForUpdates: () => Promise<{ updateAvailable: boolean; currentVersion: string; latestVersion?: string; downloadUrl?: string; releaseNotes?: string }>;

  // Insert Image (Full Page)
  insertImage: () => Promise<{ dataUrl: string; fileName: string; width: number; height: number } | null>;

  // Import PDF Annotations
  importPdfAnnotations: (chapterId: string) => Promise<{ imported: number }>;

  // Cover Designer: Full Wrap Export
  exportCoverFullWrap: (dataUrl: string, projectName: string) => Promise<{ success: boolean; filePath?: string }>;

  // Cover Designer: Upload Layer Image
  uploadCoverImage: () => Promise<{ dataUrl: string; fileName: string; width: number; height: number } | null>;

  // Plugin System
  getPlugins: () => Promise<WriterPlugin[]>;
  togglePlugin: (pluginId: string, enabled: boolean) => Promise<void>;
  runPlugin: (pluginId: string, context: { text?: string; chapterContent?: string; projectId?: string }) => Promise<PluginResult>;

  // NovaSyn Ecosystem Exchange
  sendToExchange: (packet: Omit<NovaSynExchangePacket, 'id' | 'createdAt'>) => Promise<{ success: boolean; packetId: string }>;
  receiveFromExchange: () => Promise<NovaSynExchangePacket[]>;
  listExchangePackets: () => Promise<NovaSynExchangePacket[]>;
  deleteExchangePacket: (packetId: string) => Promise<void>;

  // Writing Guide
  getGuideMessages: (projectId: string) => Promise<GuideMessage[]>;
  sendGuideMessage: (projectId: string, message: string) => Promise<GuideMessage>;
  clearGuideMessages: (projectId: string) => Promise<void>;

  // Global Search
  globalSearch: (projectId: string, query: string) => Promise<GlobalSearchResult[]>;

  // Timeline
  getTimelineEvents: (projectId: string) => Promise<TimelineEvent[]>;
  createTimelineEvent: (projectId: string, event: { title: string; description?: string; chapterId?: string; characterIds?: string[]; eventDate?: string; color?: string }) => Promise<TimelineEvent>;
  updateTimelineEvent: (id: string, updates: Partial<Pick<TimelineEvent, 'title' | 'description' | 'chapterId' | 'characterIds' | 'eventDate' | 'sortOrder' | 'color'>>) => Promise<TimelineEvent>;
  deleteTimelineEvent: (id: string) => Promise<void>;

  // Chapter Targets
  getChapterTargets: (projectId: string) => Promise<ChapterTarget[]>;
  setChapterTarget: (chapterId: string, targetWords: number) => Promise<ChapterTarget>;
  deleteChapterTarget: (chapterId: string) => Promise<void>;

  // Window methods
  minimizeWindow: () => void;
  maximizeWindow: () => void;
  closeWindow: () => void;

  // NS Vault
  vaultList(options?: { limit?: number; offset?: number }): Promise<any[]>;
  vaultStore(input: {
    itemType: string;
    title: string;
    content?: string | null;
    filePath?: string | null;
    outputTypeHint?: string | null;
    parentId?: string | null;
    metadata?: Record<string, unknown>;
    tags?: string[];
  }): Promise<any>;
  vaultGet(id: string): Promise<any | null>;
  vaultDelete(id: string): Promise<void>;
  vaultSearch(options: {
    itemType?: string;
    sourceApp?: string;
    tags?: string[];
    query?: string;
    parentId?: string;
    limit?: number;
    offset?: number;
  }): Promise<any[]>;
  vaultGetTags(): Promise<any[]>;
  vaultAddTag(itemId: string, tagName: string, color?: string): Promise<void>;
  vaultAnnotate(itemId: string, content: string): Promise<any>;
  vaultGetAnnotations(itemId: string): Promise<any[]>;
  vaultGetProvenance(itemId: string): Promise<any[]>;

  // Macro Registry
  macroGetRegistry(): Promise<Record<string, any>>;
  macroGetAvailable(): Promise<Record<string, any>>;

  // Cross-App Queue
  macroInvoke(targetApp: string, macro: string, input: any, vaultParentId?: string): Promise<any>;
  macroInvokeStatus(requestId: string): Promise<any>;
  macroGetPending(): Promise<any[]>;

  // Orchestrations
  orchList(): Promise<Orchestration[]>;
  orchCreate(data: { name: string; description?: string; steps: OrchestrationStep[] }): Promise<Orchestration>;
  orchUpdate(id: string, updates: Partial<Orchestration>): Promise<Orchestration>;
  orchDelete(id: string): Promise<void>;
  orchGet(id: string): Promise<Orchestration | null>;
  orchRun(orchestrationId: string, manualInput?: string): Promise<OrchestrationRun>;
  orchResume(runId: string, decision: 'approved' | 'rejected'): Promise<OrchestrationRun>;
  orchGetRuns(orchestrationId: string): Promise<OrchestrationRun[]>;
  orchGetRun(runId: string): Promise<OrchestrationRun | null>;

  // Orchestration progress events
  onOrchStepProgress(callback: (data: { runId: string; stepIndex: number; status: string; output?: any }) => void): () => void;
}

// Declare global window interface
declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
