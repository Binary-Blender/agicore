import React, { useEffect } from 'react';
import { useAppStore } from './store/appStore';
import ModulesView from './components/ModulesView';
import UsersView from './components/UsersView';
import PlaylistsView from './components/PlaylistsView';
import AiStudioView from './components/AiStudioView';
import QcQueueView from './components/QcQueueView';
import { SettingsView } from './components/SettingsView';
import type { TrainingModule, LmsUser, Playlist, DashboardStats } from '../shared/types';

export function App() {
  const {
    currentView,
    setCurrentView,
    dashboardStats,
    setDashboardStats,
    setModules,
    setUsers,
    setPlaylists,
    isLoading,
    setIsLoading,
  } = useAppStore();

  useEffect(() => {
    loadInitialData();
  }, []);

  async function loadInitialData() {
    setIsLoading(true);
    try {
      const [modules, users, playlists, stats] = await Promise.all([
        window.electronAPI.getModules(),
        window.electronAPI.getUsers(),
        window.electronAPI.getPlaylists(),
        window.electronAPI.getDashboardStats(),
      ]);
      setModules(modules as TrainingModule[]);
      setUsers(users as LmsUser[]);
      setPlaylists(playlists as Playlist[]);
      setDashboardStats(stats as DashboardStats);
    } catch (err) {
      console.error('Failed to load initial data:', err);
    }
    setIsLoading(false);
  }

  const navItems = [
    { id: 'dashboard' as const, label: 'Dashboard', icon: '\u{1F4CA}' },
    { id: 'modules' as const, label: 'Training', icon: '\u{1F3B5}' },
    { id: 'users' as const, label: 'Users', icon: '\u{1F465}' },
    { id: 'playlists' as const, label: 'Playlists', icon: '\u{1F4CB}' },
    { id: 'ai-studio' as const, label: 'AI Studio', icon: '\u{1F916}' },
    { id: 'qc-queue' as const, label: 'QC Queue', icon: '\u{2705}' },
    { id: 'settings' as const, label: 'Settings', icon: '\u{2699}\u{FE0F}' },
  ];

  return (
    <div className="h-screen flex flex-col bg-slate-900 text-white">
      {/* Title Bar */}
      <div className="h-9 bg-slate-800 flex items-center justify-between px-4 select-none" style={{ WebkitAppRegion: 'drag' } as any}>
        <span className="text-sm font-semibold text-gray-300">NovaSyn LMS</span>
        <div className="flex items-center gap-1" style={{ WebkitAppRegion: 'no-drag' } as any}>
          <button
            onClick={() => window.electronAPI.minimizeWindow()}
            className="w-8 h-6 flex items-center justify-center text-gray-400 hover:text-white hover:bg-slate-700 rounded text-xs"
          >{'\u2014'}</button>
          <button
            onClick={() => window.electronAPI.maximizeWindow()}
            className="w-8 h-6 flex items-center justify-center text-gray-400 hover:text-white hover:bg-slate-700 rounded text-xs"
          >{'\u25A1'}</button>
          <button
            onClick={() => window.electronAPI.closeWindow()}
            className="w-8 h-6 flex items-center justify-center text-gray-400 hover:text-white hover:bg-red-600 rounded text-xs"
          >{'\u2715'}</button>
        </div>
      </div>

      {/* Main Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <div className="w-48 bg-slate-800/50 border-r border-slate-700 flex flex-col py-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setCurrentView(item.id)}
              className={`flex items-center gap-3 px-4 py-2.5 text-sm transition ${
                currentView === item.id
                  ? 'bg-blue-500/20 text-blue-300 border-r-2 border-blue-400'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-slate-700/50'
              }`}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-gray-500 animate-pulse">Loading...</p>
            </div>
          ) : (
            <>
              {currentView === 'dashboard' && <DashboardView />}
              {currentView === 'modules' && <ModulesView />}
              {currentView === 'users' && <UsersView />}
              {currentView === 'playlists' && <PlaylistsView />}
              {currentView === 'ai-studio' && <AiStudioView />}
              {currentView === 'qc-queue' && <QcQueueView />}
              {currentView === 'settings' && <SettingsView />}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function DashboardView() {
  const { dashboardStats } = useAppStore();

  if (!dashboardStats) return <p className="text-gray-500">No data yet.</p>;

  const stats = [
    { label: 'Training Modules', value: dashboardStats.totalModules, icon: '\u{1F3B5}' },
    { label: 'Employees', value: dashboardStats.totalUsers, icon: '\u{1F465}' },
    { label: 'Videos', value: dashboardStats.totalVideos, icon: '\u{1F3AC}' },
    { label: 'Playlists', value: dashboardStats.totalPlaylists, icon: '\u{1F4CB}' },
    { label: 'Completion Rate', value: `${dashboardStats.completionRate}%`, icon: '\u{2705}' },
    { label: 'Avg Score', value: `${dashboardStats.averageScore}%`, icon: '\u{1F4C8}' },
    { label: 'Pending QC', value: dashboardStats.pendingQcTasks, icon: '\u{23F3}' },
    { label: 'AI Assets', value: dashboardStats.totalAiAssets, icon: '\u{1F916}' },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      <div className="grid grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-slate-800 rounded-xl p-4 border border-slate-700">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">{stat.icon}</span>
              <span className="text-xs text-gray-400 uppercase tracking-wide">{stat.label}</span>
            </div>
            <p className="text-2xl font-bold">{stat.value}</p>
          </div>
        ))}
      </div>

      {dashboardStats.recentActivity && dashboardStats.recentActivity.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3">Recent Activity</h2>
          <div className="bg-slate-800 rounded-xl border border-slate-700 divide-y divide-slate-700">
            {dashboardStats.recentActivity.map((activity: any, i: number) => (
              <div key={i} className="px-4 py-3 flex items-center justify-between">
                <div>
                  <span className="text-sm text-gray-300">{activity.userName || 'Unknown'}</span>
                  <span className="text-gray-500 mx-2">{'\u00B7'}</span>
                  <span className="text-sm text-gray-400">{activity.moduleName || 'Unknown module'}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    activity.status === 'completed' ? 'bg-green-500/20 text-green-300' :
                    activity.status === 'failed' ? 'bg-red-500/20 text-red-300' :
                    'bg-blue-500/20 text-blue-300'
                  }`}>{activity.status}</span>
                  <span className="text-xs text-gray-500">{activity.bestScore > 0 ? `${activity.bestScore}%` : ''}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PlaceholderView({ title, description }: { title: string; description: string }) {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">{title}</h1>
      <p className="text-gray-400 mb-6">{description}</p>
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-8 flex items-center justify-center">
        <p className="text-gray-500 text-sm">Component coming soon</p>
      </div>
    </div>
  );
}
