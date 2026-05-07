import { create } from 'zustand';
import type { TrainingModule, Video, LmsUser, Playlist, AiAsset, QcTask, DashboardStats } from '../../shared/types';

interface AppState {
  // Data
  modules: TrainingModule[];
  videos: Video[];
  users: LmsUser[];
  playlists: Playlist[];
  aiAssets: AiAsset[];
  qcTasks: QcTask[];
  dashboardStats: DashboardStats | null;

  // UI
  currentView: 'dashboard' | 'modules' | 'users' | 'playlists' | 'ai-studio' | 'qc-queue' | 'settings';
  selectedModuleId: string | null;
  isLoading: boolean;
  error: string | null;

  // Setters
  setModules: (modules: TrainingModule[]) => void;
  setVideos: (videos: Video[]) => void;
  setUsers: (users: LmsUser[]) => void;
  setPlaylists: (playlists: Playlist[]) => void;
  setAiAssets: (assets: AiAsset[]) => void;
  setQcTasks: (tasks: QcTask[]) => void;
  setDashboardStats: (stats: DashboardStats) => void;
  setCurrentView: (view: AppState['currentView']) => void;
  setSelectedModuleId: (id: string | null) => void;
  setIsLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // Mutations
  addModule: (module: TrainingModule) => void;
  updateModule: (id: string, updates: Partial<TrainingModule>) => void;
  removeModule: (id: string) => void;
  addUser: (user: LmsUser) => void;
  updateUser: (id: string, updates: Partial<LmsUser>) => void;
  removeUser: (id: string) => void;
  addPlaylist: (playlist: Playlist) => void;
  updatePlaylist: (id: string, updates: Partial<Playlist>) => void;
  removePlaylist: (id: string) => void;
  addAiAsset: (asset: AiAsset) => void;
  updateAiAsset: (id: string, updates: Partial<AiAsset>) => void;
}

export const useAppStore = create<AppState>((set) => ({
  // Initial state
  modules: [],
  videos: [],
  users: [],
  playlists: [],
  aiAssets: [],
  qcTasks: [],
  dashboardStats: null,
  currentView: 'dashboard',
  selectedModuleId: null,
  isLoading: false,
  error: null,

  // Setters
  setModules: (modules) => set({ modules }),
  setVideos: (videos) => set({ videos }),
  setUsers: (users) => set({ users }),
  setPlaylists: (playlists) => set({ playlists }),
  setAiAssets: (assets) => set({ aiAssets: assets }),
  setQcTasks: (tasks) => set({ qcTasks: tasks }),
  setDashboardStats: (stats) => set({ dashboardStats: stats }),
  setCurrentView: (view) => set({ currentView: view }),
  setSelectedModuleId: (id) => set({ selectedModuleId: id }),
  setIsLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),

  // Mutations
  addModule: (module) => set((s) => ({ modules: [...s.modules, module] })),
  updateModule: (id, updates) => set((s) => ({
    modules: s.modules.map((m) => m.id === id ? { ...m, ...updates } : m),
  })),
  removeModule: (id) => set((s) => ({ modules: s.modules.filter((m) => m.id !== id) })),
  addUser: (user) => set((s) => ({ users: [...s.users, user] })),
  updateUser: (id, updates) => set((s) => ({
    users: s.users.map((u) => u.id === id ? { ...u, ...updates } : u),
  })),
  removeUser: (id) => set((s) => ({ users: s.users.filter((u) => u.id !== id) })),
  addPlaylist: (playlist) => set((s) => ({ playlists: [...s.playlists, playlist] })),
  updatePlaylist: (id, updates) => set((s) => ({
    playlists: s.playlists.map((p) => p.id === id ? { ...p, ...updates } : p),
  })),
  removePlaylist: (id) => set((s) => ({ playlists: s.playlists.filter((p) => p.id !== id) })),
  addAiAsset: (asset) => set((s) => ({ aiAssets: [...s.aiAssets, asset] })),
  updateAiAsset: (id, updates) => set((s) => ({
    aiAssets: s.aiAssets.map((a) => a.id === id ? { ...a, ...updates } : a),
  })),
}));
