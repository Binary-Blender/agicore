import React, { useEffect } from 'react';
import { useForgeStore } from './store/forgeStore';
import { TitleBar } from './components/TitleBar';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { NewProjectWizard } from './components/NewProjectWizard';
import { SettingsPanel } from './components/SettingsPanel';
import { ProjectDetail } from './components/ProjectDetail';

function App() {
  const {
    currentView,
    isLoading,
    error,
    setProjects,
    setModels,
    setApiKeys,
    setSettings,
    setIsLoading,
    setError,
  } = useForgeStore();

  useEffect(() => {
    loadInitialData();
  }, []);

  async function loadInitialData() {
    try {
      setIsLoading(true);
      setError(null);

      const [projectsData, modelsData, apiKeysData, settingsData] = await Promise.all([
        window.electronAPI.getProjects(),
        window.electronAPI.getModels(),
        window.electronAPI.getApiKeys(),
        window.electronAPI.getSettings(),
      ]);

      setProjects(projectsData);
      setModels(modelsData);
      setApiKeys(apiKeysData);
      setSettings(settingsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load app data');
    } finally {
      setIsLoading(false);
    }
  }

  function renderView() {
    switch (currentView) {
      case 'dashboard': return <Dashboard />;
      case 'new-project': return <NewProjectWizard />;
      case 'settings': return <SettingsPanel />;
      case 'project-detail': return <ProjectDetail />;
      default: return <Dashboard />;
    }
  }

  return (
    <div className="h-screen flex flex-col bg-slate-900">
      <TitleBar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-gray-500 text-sm">Loading...</div>
          </div>
        ) : error ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-red-400 text-sm">{error}</div>
          </div>
        ) : (
          renderView()
        )}
      </div>
    </div>
  );
}

export default App;
