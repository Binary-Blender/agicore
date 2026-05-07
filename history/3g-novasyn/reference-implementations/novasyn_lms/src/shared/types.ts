// Shared TypeScript types used across main and renderer processes

// ---------------------------------------------------------------------------
// Entity Interfaces
// ---------------------------------------------------------------------------

export interface TrainingModule {
  id: string;
  title: string;
  description: string;
  category: string;
  difficultyLevel: string;
  estimatedDurationMinutes: number;
  isActive: boolean;
  policyDocumentPath: string | null;
  policyDocumentFilename: string | null;
  policySummaryText: string | null;
  emphasisPrompt: string | null;
  aiSongLyrics: string | null;
  aiOverlayTexts: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Video {
  id: string;
  trainingModuleId: string;
  title: string;
  description: string;
  filePath: string | null;
  youtubeUrl: string | null;
  durationSeconds: number;
  genre: string;
  isPrimary: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Named LmsUser to avoid collision with the DOM User interface. */
export interface LmsUser {
  id: string;
  name: string;
  email: string;
  department: string;
  role: string;
  preferredGenre: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface QuizQuestion {
  id: string;
  text: string;
  type: 'multiple_choice' | 'true_false' | 'fill_blank' | 'sequence_ordering';
  options: string[];
  correctAnswer: string | string[];
  points: number;
  difficulty: string;
  hint?: string;
}

export interface Quiz {
  id: string;
  trainingModuleId: string;
  passingScore: number;
  questions: QuizQuestion[];
  createdAt: string;
  updatedAt: string;
}

export interface WatchSession {
  id: string;
  userId: string;
  videoId: string;
  watchPercentage: number;
  startedAt: string;
  completedAt?: string;
}

export interface QuizAttempt {
  id: string;
  userId: string;
  quizId: string;
  score: number;
  passed: boolean;
  attemptNumber: number;
  answers: Record<string, string>;
  completedAt: string;
}

export interface Progress {
  id: string;
  userId: string;
  trainingModuleId: string;
  status: 'not_started' | 'watching' | 'quiz_pending' | 'failed' | 'completed';
  watchCount: number;
  quizAttemptCount: number;
  bestScore: number;
  completedAt?: string;
  lastActivity: string;
}

export interface Playlist {
  id: string;
  title: string;
  description: string;
  isRequired: boolean;
  autoPlay: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PlaylistItem {
  id: string;
  playlistId: string;
  trainingModuleId: string;
  position: number;
  requireCompletion: boolean;
  createdAt: string;
}

export interface AiAsset {
  id: string;
  trainingModuleId: string;
  assetType: string;
  title: string;
  description: string;
  status: string;
  filePath: string | null;
  metadata: Record<string, unknown>;
  durationSeconds?: number;
  style?: string;
  source?: string;
  createdAt: string;
  updatedAt: string;
  approvedAt?: string;
  deletedAt?: string;
}

export interface QcTask {
  id: string;
  assetId: string;
  assetType: string;
  status: string;
  reviewer?: string;
  notes?: string;
  createdAt: string;
  completedAt?: string;
}

// ---------------------------------------------------------------------------
// Dashboard Stats
// ---------------------------------------------------------------------------

export interface DashboardStats {
  totalModules: number;
  activeModules: number;
  totalUsers: number;
  totalVideos: number;
  completionRate: number;
  averageQuizScore: number;
  pendingQcTasks: number;
  recentActivity: {
    userId: string;
    userName: string;
    action: string;
    moduleTitle: string;
    timestamp: string;
  }[];
}

// ---------------------------------------------------------------------------
// IPC Channel Constants
// ---------------------------------------------------------------------------

export const IPC_CHANNELS = {
  // Training Modules
  GET_MODULES: 'get-modules',
  CREATE_MODULE: 'create-module',
  UPDATE_MODULE: 'update-module',
  DELETE_MODULE: 'delete-module',

  // Videos
  GET_VIDEOS: 'get-videos',
  ADD_VIDEO: 'add-video',
  UPDATE_VIDEO: 'update-video',
  DELETE_VIDEO: 'delete-video',

  // Users
  GET_USERS: 'get-users',
  CREATE_USER: 'create-user',
  UPDATE_USER: 'update-user',
  DELETE_USER: 'delete-user',

  // Quizzes
  GET_QUIZ: 'get-quiz',
  CREATE_QUIZ: 'create-quiz',
  UPDATE_QUIZ: 'update-quiz',

  // Watch Sessions
  RECORD_WATCH_SESSION: 'record-watch-session',

  // Quiz Attempts
  SUBMIT_QUIZ_ATTEMPT: 'submit-quiz-attempt',
  GET_QUIZ_ATTEMPTS: 'get-quiz-attempts',

  // Progress
  GET_PROGRESS: 'get-progress',
  GET_USER_PROGRESS: 'get-user-progress',
  GET_MODULE_PROGRESS: 'get-module-progress',

  // Playlists
  GET_PLAYLISTS: 'get-playlists',
  CREATE_PLAYLIST: 'create-playlist',
  UPDATE_PLAYLIST: 'update-playlist',
  DELETE_PLAYLIST: 'delete-playlist',
  ADD_PLAYLIST_ITEM: 'add-playlist-item',
  REMOVE_PLAYLIST_ITEM: 'remove-playlist-item',
  REORDER_PLAYLIST: 'reorder-playlist',

  // AI Assets
  GET_AI_ASSETS: 'get-ai-assets',
  CREATE_AI_ASSET: 'create-ai-asset',
  UPDATE_AI_ASSET: 'update-ai-asset',
  DELETE_AI_ASSET: 'delete-ai-asset',

  // QC Tasks
  GET_QC_TASKS: 'get-qc-tasks',
  APPROVE_QC_TASK: 'approve-qc-task',
  REJECT_QC_TASK: 'reject-qc-task',

  // Settings
  GET_SETTINGS: 'get-settings',
  SAVE_SETTINGS: 'save-settings',

  // File Operations
  PICK_VIDEO_FILE: 'pick-video-file',
  PICK_DOCUMENT_FILE: 'pick-document-file',
  PICK_AUDIO_FILE: 'pick-audio-file',

  // Window
  MINIMIZE_WINDOW: 'minimize-window',
  MAXIMIZE_WINDOW: 'maximize-window',
  CLOSE_WINDOW: 'close-window',

  // Dashboard
  GET_DASHBOARD_STATS: 'get-dashboard-stats',
} as const;

// ---------------------------------------------------------------------------
// Electron API exposed to renderer
// ---------------------------------------------------------------------------

export interface ElectronAPI {
  // Training Modules
  getModules: (options?: { category?: string; activeOnly?: boolean }) => Promise<TrainingModule[]>;
  createModule: (module: Omit<TrainingModule, 'id' | 'createdAt' | 'updatedAt'>) => Promise<TrainingModule>;
  updateModule: (id: string, updates: Partial<TrainingModule>) => Promise<TrainingModule>;
  deleteModule: (id: string) => Promise<void>;

  // Videos
  getVideos: (trainingModuleId?: string) => Promise<Video[]>;
  addVideo: (video: Omit<Video, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Video>;
  updateVideo: (id: string, updates: Partial<Video>) => Promise<Video>;
  deleteVideo: (id: string) => Promise<void>;

  // Users
  getUsers: (options?: { department?: string; role?: string }) => Promise<LmsUser[]>;
  createUser: (user: Omit<LmsUser, 'id' | 'createdAt' | 'updatedAt'>) => Promise<LmsUser>;
  updateUser: (id: string, updates: Partial<LmsUser>) => Promise<LmsUser>;
  deleteUser: (id: string) => Promise<void>;

  // Quizzes
  getQuiz: (trainingModuleId: string) => Promise<Quiz | null>;
  createQuiz: (quiz: Omit<Quiz, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Quiz>;
  updateQuiz: (id: string, updates: Partial<Quiz>) => Promise<Quiz>;

  // Watch Sessions
  recordWatchSession: (session: Omit<WatchSession, 'id'>) => Promise<WatchSession>;

  // Quiz Attempts
  submitQuizAttempt: (attempt: Omit<QuizAttempt, 'id'>) => Promise<QuizAttempt>;
  getQuizAttempts: (options: { userId?: string; quizId?: string }) => Promise<QuizAttempt[]>;

  // Progress
  getProgress: (options?: { status?: Progress['status'] }) => Promise<Progress[]>;
  getUserProgress: (userId: string) => Promise<Progress[]>;
  getModuleProgress: (trainingModuleId: string) => Promise<Progress[]>;

  // Playlists
  getPlaylists: () => Promise<Playlist[]>;
  createPlaylist: (playlist: Omit<Playlist, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Playlist>;
  updatePlaylist: (id: string, updates: Partial<Playlist>) => Promise<Playlist>;
  deletePlaylist: (id: string) => Promise<void>;
  addPlaylistItem: (item: Omit<PlaylistItem, 'id' | 'createdAt'>) => Promise<PlaylistItem>;
  removePlaylistItem: (id: string) => Promise<void>;
  reorderPlaylist: (playlistId: string, itemIds: string[]) => Promise<PlaylistItem[]>;

  // AI Assets
  getAiAssets: (trainingModuleId?: string) => Promise<AiAsset[]>;
  createAiAsset: (asset: Omit<AiAsset, 'id' | 'createdAt' | 'updatedAt'>) => Promise<AiAsset>;
  updateAiAsset: (id: string, updates: Partial<AiAsset>) => Promise<AiAsset>;
  deleteAiAsset: (id: string) => Promise<void>;

  // QC Tasks
  getQcTasks: (options?: { status?: string; assetType?: string }) => Promise<QcTask[]>;
  approveQcTask: (id: string, reviewer: string, notes?: string) => Promise<QcTask>;
  rejectQcTask: (id: string, reviewer: string, notes: string) => Promise<QcTask>;

  // Settings
  getSettings: () => Promise<Record<string, unknown>>;
  saveSettings: (updates: Record<string, unknown>) => Promise<void>;

  // File Operations
  pickVideoFile: () => Promise<{ filePath: string; filename: string } | null>;
  pickDocumentFile: () => Promise<{ filePath: string; filename: string } | null>;
  pickAudioFile: () => Promise<{ filePath: string; filename: string } | null>;

  // Window
  minimizeWindow: () => void;
  maximizeWindow: () => void;
  closeWindow: () => void;

  // Dashboard
  getDashboardStats: () => Promise<DashboardStats>;
}

// ---------------------------------------------------------------------------
// Global Window augmentation
// ---------------------------------------------------------------------------

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
