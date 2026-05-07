import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS } from '../shared/types';

contextBridge.exposeInMainWorld('electronAPI', {
  // Training Modules
  getModules: (options?: any) => ipcRenderer.invoke(IPC_CHANNELS.GET_MODULES, options),
  createModule: (data: any) => ipcRenderer.invoke(IPC_CHANNELS.CREATE_MODULE, data),
  updateModule: (id: string, updates: any) => ipcRenderer.invoke(IPC_CHANNELS.UPDATE_MODULE, id, updates),
  deleteModule: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.DELETE_MODULE, id),

  // Videos
  getVideos: (trainingModuleId?: string) => ipcRenderer.invoke(IPC_CHANNELS.GET_VIDEOS, trainingModuleId),
  addVideo: (data: any) => ipcRenderer.invoke(IPC_CHANNELS.ADD_VIDEO, data),
  updateVideo: (id: string, updates: any) => ipcRenderer.invoke(IPC_CHANNELS.UPDATE_VIDEO, id, updates),
  deleteVideo: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.DELETE_VIDEO, id),

  // Users
  getUsers: (options?: any) => ipcRenderer.invoke(IPC_CHANNELS.GET_USERS, options),
  createUser: (data: any) => ipcRenderer.invoke(IPC_CHANNELS.CREATE_USER, data),
  updateUser: (id: string, updates: any) => ipcRenderer.invoke(IPC_CHANNELS.UPDATE_USER, id, updates),
  deleteUser: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.DELETE_USER, id),

  // Quizzes
  getQuiz: (trainingModuleId: string) => ipcRenderer.invoke(IPC_CHANNELS.GET_QUIZ, trainingModuleId),
  createQuiz: (data: any) => ipcRenderer.invoke(IPC_CHANNELS.CREATE_QUIZ, data),
  updateQuiz: (id: string, updates: any) => ipcRenderer.invoke(IPC_CHANNELS.UPDATE_QUIZ, id, updates),

  // Watch Sessions
  recordWatchSession: (data: any) => ipcRenderer.invoke(IPC_CHANNELS.RECORD_WATCH_SESSION, data),

  // Quiz Attempts
  submitQuizAttempt: (data: any) => ipcRenderer.invoke(IPC_CHANNELS.SUBMIT_QUIZ_ATTEMPT, data),
  getQuizAttempts: (options: any) => ipcRenderer.invoke(IPC_CHANNELS.GET_QUIZ_ATTEMPTS, options),

  // Progress
  getProgress: (options?: any) => ipcRenderer.invoke(IPC_CHANNELS.GET_PROGRESS, options),
  getUserProgress: (userId: string) => ipcRenderer.invoke(IPC_CHANNELS.GET_USER_PROGRESS, userId),
  getModuleProgress: (trainingModuleId: string) => ipcRenderer.invoke(IPC_CHANNELS.GET_MODULE_PROGRESS, trainingModuleId),

  // Playlists
  getPlaylists: () => ipcRenderer.invoke(IPC_CHANNELS.GET_PLAYLISTS),
  createPlaylist: (data: any) => ipcRenderer.invoke(IPC_CHANNELS.CREATE_PLAYLIST, data),
  updatePlaylist: (id: string, updates: any) => ipcRenderer.invoke(IPC_CHANNELS.UPDATE_PLAYLIST, id, updates),
  deletePlaylist: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.DELETE_PLAYLIST, id),
  addPlaylistItem: (data: any) => ipcRenderer.invoke(IPC_CHANNELS.ADD_PLAYLIST_ITEM, data),
  removePlaylistItem: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.REMOVE_PLAYLIST_ITEM, id),
  reorderPlaylist: (playlistId: string, itemIds: string[]) => ipcRenderer.invoke(IPC_CHANNELS.REORDER_PLAYLIST, playlistId, itemIds),

  // AI Assets
  getAiAssets: (trainingModuleId?: string) => ipcRenderer.invoke(IPC_CHANNELS.GET_AI_ASSETS, trainingModuleId),
  createAiAsset: (data: any) => ipcRenderer.invoke(IPC_CHANNELS.CREATE_AI_ASSET, data),
  updateAiAsset: (id: string, updates: any) => ipcRenderer.invoke(IPC_CHANNELS.UPDATE_AI_ASSET, id, updates),
  deleteAiAsset: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.DELETE_AI_ASSET, id),

  // QC Tasks
  getQcTasks: (options?: any) => ipcRenderer.invoke(IPC_CHANNELS.GET_QC_TASKS, options),
  approveQcTask: (id: string, reviewer: string, notes?: string) => ipcRenderer.invoke(IPC_CHANNELS.APPROVE_QC_TASK, id, reviewer, notes),
  rejectQcTask: (id: string, reviewer: string, notes: string) => ipcRenderer.invoke(IPC_CHANNELS.REJECT_QC_TASK, id, reviewer, notes),

  // Settings
  getSettings: () => ipcRenderer.invoke(IPC_CHANNELS.GET_SETTINGS),
  saveSettings: (updates: any) => ipcRenderer.invoke(IPC_CHANNELS.SAVE_SETTINGS, updates),

  // File Operations
  pickVideoFile: () => ipcRenderer.invoke(IPC_CHANNELS.PICK_VIDEO_FILE),
  pickDocumentFile: () => ipcRenderer.invoke(IPC_CHANNELS.PICK_DOCUMENT_FILE),
  pickAudioFile: () => ipcRenderer.invoke(IPC_CHANNELS.PICK_AUDIO_FILE),

  // Window Controls
  minimizeWindow: () => ipcRenderer.send(IPC_CHANNELS.MINIMIZE_WINDOW),
  maximizeWindow: () => ipcRenderer.send(IPC_CHANNELS.MAXIMIZE_WINDOW),
  closeWindow: () => ipcRenderer.send(IPC_CHANNELS.CLOSE_WINDOW),

  // Dashboard
  getDashboardStats: () => ipcRenderer.invoke(IPC_CHANNELS.GET_DASHBOARD_STATS),
});

console.log('Preload script loaded, electronAPI exposed');
