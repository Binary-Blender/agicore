import React, { useEffect, useState } from 'react';
import { useAcademyStore } from './store/academyStore';
import TitleBar from './components/TitleBar';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import DailySchedule from './components/DailySchedule';
import WeeklyView from './components/WeeklyView';
import SubjectManager from './components/SubjectManager';
import LessonPlanner from './components/LessonPlanner';
import SkillTracker from './components/SkillTracker';
import AssessmentManager from './components/AssessmentManager';
import ReadingLog from './components/ReadingLog';
import ProgressCharts from './components/ProgressCharts';
import AITutor from './components/AITutor';
import ResourceGenerator from './components/ResourceGenerator';
import LearningQuest from './components/LearningQuest';
import CompliancePortfolio from './components/CompliancePortfolio';
import StudentProfile from './components/StudentProfile';
import SettingsPanel from './components/SettingsPanel';
import { VaultBrowser } from './components/VaultBrowser';
import { OrchestrationBuilder } from './components/OrchestrationBuilder';
import { OrchestrationRunner } from './components/OrchestrationRunner';
import type { Orchestration } from '../shared/types';

export default function App() {
  const {
    currentView,
    showStudentProfile,
    showSettings,
    settings,
    loadSettings,
    loadApiKeys,
    loadModels,
    loadStudents,
  } = useAcademyStore();

  const [showVault, setShowVault] = useState(false);
  const [showOrchBuilder, setShowOrchBuilder] = useState(false);
  const [editingOrch, setEditingOrch] = useState<Orchestration | undefined>(undefined);
  const [orchestrations, setOrchestrations] = useState<Orchestration[]>([]);
  const [runningOrchId, setRunningOrchId] = useState<string | null>(null);
  const [runningOrchName, setRunningOrchName] = useState('');

  useEffect(() => {
    loadSettings();
    loadApiKeys();
    loadModels();
    loadStudents();
    window.electronAPI.orchList().then(setOrchestrations).catch(console.error);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', settings.theme || 'dark');
  }, [settings.theme]);

  return (
    <div className="h-screen flex flex-col bg-[var(--bg-page)]">
      <TitleBar onOpenVault={() => setShowVault(true)} onOpenOrchestrations={() => setShowOrchBuilder(true)} />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar />

        <div className="flex-1 overflow-hidden">
          {currentView === 'dashboard' && <Dashboard />}
          {currentView === 'schedule' && <DailySchedule />}
          {currentView === 'weekly' && <WeeklyView />}
          {currentView === 'subjects' && <SubjectManager />}
          {currentView === 'planner' && <LessonPlanner />}
          {currentView === 'skills' && <SkillTracker />}
          {currentView === 'assessments' && <AssessmentManager />}
          {currentView === 'reading' && <ReadingLog />}
          {currentView === 'progress' && <ProgressCharts />}
          {currentView === 'tutor' && <AITutor />}
          {currentView === 'resources' && <ResourceGenerator />}
          {currentView === 'quest' && <LearningQuest />}
          {currentView === 'compliance' && <CompliancePortfolio />}
        </div>
      </div>

      {showStudentProfile && <StudentProfile />}
      {showSettings && <SettingsPanel />}
      <VaultBrowser isOpen={showVault} onClose={() => setShowVault(false)} />
      {showOrchBuilder && (
        <OrchestrationBuilder
          orchestration={editingOrch}
          onClose={() => { setShowOrchBuilder(false); setEditingOrch(undefined); }}
          onSaved={(orch) => {
            setOrchestrations((prev) => {
              const idx = prev.findIndex((o) => o.id === orch.id);
              if (idx >= 0) { const updated = [...prev]; updated[idx] = orch; return updated; }
              return [orch, ...prev];
            });
          }}
          onRun={async (orchId) => {
            setShowOrchBuilder(false);
            setEditingOrch(undefined);
            const orch = orchestrations.find((o) => o.id === orchId);
            const run = await window.electronAPI.orchRun(orchId);
            setRunningOrchId(run.id);
            setRunningOrchName(orch?.name || 'Orchestration');
          }}
        />
      )}
      {runningOrchId && (
        <OrchestrationRunner
          runId={runningOrchId}
          orchestrationName={runningOrchName}
          onClose={() => setRunningOrchId(null)}
        />
      )}
    </div>
  );
}
