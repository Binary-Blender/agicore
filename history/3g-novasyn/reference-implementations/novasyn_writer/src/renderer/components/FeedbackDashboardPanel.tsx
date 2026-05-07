import React, { useState, useEffect, useCallback } from 'react';
import { useWriterStore } from '../store/writerStore';
import type { RevisionPlan, RevisionTask } from '../../shared/types';

const CATEGORY_COLORS: Record<string, string> = {
  Plot: 'bg-blue-600/30 text-blue-300',
  Character: 'bg-purple-600/30 text-purple-300',
  Pacing: 'bg-orange-600/30 text-orange-300',
  Style: 'bg-green-600/30 text-green-300',
  Continuity: 'bg-cyan-600/30 text-cyan-300',
  Other: 'bg-gray-600/30 text-gray-300',
};

const PRIORITY_COLORS: Record<string, string> = {
  high: 'text-red-400',
  medium: 'text-yellow-400',
  low: 'text-surface-500',
};

export default function FeedbackDashboardPanel() {
  const { currentProject, setShowFeedbackDashboard, aiStreaming } = useWriterStore();
  const [plans, setPlans] = useState<RevisionPlan[]>([]);
  const [generating, setGenerating] = useState(false);
  const [completedTasks, setCompletedTasks] = useState<Set<string>>(new Set());

  const loadPlans = useCallback(async () => {
    if (!currentProject) return;
    const result = await window.electronAPI.getRevisionPlans(currentProject.id);
    setPlans(result);
  }, [currentProject]);

  useEffect(() => { loadPlans(); }, [loadPlans]);

  const handleGenerate = async () => {
    if (!currentProject || generating) return;
    setGenerating(true);
    try {
      await window.electronAPI.generateRevisionPlan(currentProject.id);
      await loadPlans();
    } catch (err: any) {
      alert(err.message || 'Failed to generate revision plan');
    }
    setGenerating(false);
  };

  const handleDelete = async (id: string) => {
    await window.electronAPI.deleteRevisionPlan(id);
    loadPlans();
  };

  const toggleTask = (planId: string, taskId: string) => {
    const key = `${planId}:${taskId}`;
    setCompletedTasks(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const currentPlan = plans[0];
  const olderPlans = plans.slice(1);

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-[#16213e] rounded-lg border border-[var(--border)] w-[640px] max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-[var(--border)] flex items-center justify-between shrink-0">
          <h2 className="text-sm font-semibold text-surface-200">Feedback Dashboard</h2>
          <button onClick={() => setShowFeedbackDashboard(false)} className="text-surface-500 hover:text-surface-300">x</button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Generate button */}
          <div className="flex items-center justify-between">
            <p className="text-xs text-surface-500">
              Analyzes open comments across all chapters and generates a prioritized revision plan.
            </p>
            <button
              onClick={handleGenerate}
              disabled={generating || aiStreaming}
              className={`shrink-0 ml-4 px-4 py-1.5 text-xs rounded transition-colors ${
                generating ? 'bg-primary-600/20 text-primary-400 cursor-wait' : 'bg-primary-600 text-white hover:bg-primary-500'
              }`}
            >
              {generating ? 'Generating...' : 'Generate Plan'}
            </button>
          </div>

          {/* Current plan */}
          {currentPlan ? (
            <div className="space-y-3">
              {/* Summary */}
              <div className="bg-[#1a1a2e]/80 border border-primary-500/30 rounded p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-primary-300">Revision Plan</span>
                  <span className="text-[10px] text-surface-600">{new Date(currentPlan.createdAt).toLocaleString()}</span>
                </div>
                <p className="text-xs text-surface-300">{currentPlan.summary}</p>
              </div>

              {/* Tasks by priority */}
              {(['high', 'medium', 'low'] as const).map(priority => {
                const tasks = currentPlan.tasks.filter(t => t.priority === priority);
                if (tasks.length === 0) return null;
                return (
                  <div key={priority}>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className={`text-xs font-semibold capitalize ${PRIORITY_COLORS[priority]}`}>
                        {priority} Priority
                      </span>
                      <span className="text-[10px] text-surface-600">({tasks.length})</span>
                    </div>
                    <div className="space-y-1">
                      {tasks.map((task: RevisionTask) => {
                        const isCompleted = completedTasks.has(`${currentPlan.id}:${task.id}`);
                        return (
                          <div
                            key={task.id}
                            className={`flex items-start gap-2 p-2 rounded border transition-colors ${
                              isCompleted ? 'border-surface-700 bg-white/2 opacity-50' : 'border-[var(--border)] bg-white/5'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isCompleted}
                              onChange={() => toggleTask(currentPlan.id, task.id)}
                              className="accent-primary-500 mt-0.5 shrink-0"
                            />
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-0.5">
                                <span className={`px-1.5 py-0.5 rounded text-[10px] ${CATEGORY_COLORS[task.category] || CATEGORY_COLORS.Other}`}>
                                  {task.category}
                                </span>
                                {task.chapterTitle && (
                                  <span className="text-[10px] text-surface-600">{task.chapterTitle}</span>
                                )}
                              </div>
                              <p className={`text-xs ${isCompleted ? 'line-through text-surface-600' : 'text-surface-300'}`}>
                                {task.description}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-xs text-surface-600">
              No revision plan yet. Add comments to your chapters, then click "Generate Plan" to create an AI-powered revision checklist.
            </div>
          )}

          {/* Older plans */}
          {olderPlans.length > 0 && (
            <div>
              <h3 className="text-xs text-surface-500 font-semibold mb-2">Previous Plans</h3>
              <div className="space-y-1">
                {olderPlans.map(plan => (
                  <div key={plan.id} className="flex items-center justify-between px-2 py-1.5 bg-[#1a1a2e]/60 rounded text-xs">
                    <div>
                      <span className="text-surface-400">{new Date(plan.createdAt).toLocaleDateString()}</span>
                      <span className="text-surface-600 ml-2">{plan.tasks.length} tasks</span>
                    </div>
                    <button
                      onClick={() => handleDelete(plan.id)}
                      className="text-red-400/60 hover:text-red-400 text-[10px]"
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="p-3 border-t border-[var(--border)] flex justify-end shrink-0">
          <button onClick={() => setShowFeedbackDashboard(false)} className="px-3 py-1.5 text-xs text-surface-400 hover:text-surface-200 rounded transition-colors">Close</button>
        </div>
      </div>
    </div>
  );
}
