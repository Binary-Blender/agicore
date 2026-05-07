import React, { useState, useRef, useEffect } from 'react';
import { useOrchestratorStore } from '../store/orchestratorStore';
import type { Workflow } from '../../shared/types';

interface Props {
  onNewWorkflow: () => void;
  onSelectWorkflow: (id: string) => void;
  onRunWorkflow: (id: string) => void;
  onSettings: () => void;
}

// ---------- Context Menu ----------

interface ContextMenuState {
  workflowId: string;
  x: number;
  y: number;
}

function ContextMenu({
  state,
  onClose,
  onEdit,
  onRun,
  onDuplicate,
  onDelete,
}: {
  state: ContextMenuState;
  onClose: () => void;
  onEdit: () => void;
  onRun: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const menuItems = [
    { label: 'Edit', icon: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z', action: onEdit },
    { label: 'Run', icon: 'M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z', action: onRun },
    { label: 'Duplicate', icon: 'M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z', action: onDuplicate },
    { label: 'Delete', icon: 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16', action: onDelete, danger: true },
  ];

  return (
    <div
      ref={menuRef}
      className="fixed bg-slate-700 border border-slate-600 rounded-lg shadow-xl py-1 z-50 min-w-[140px]"
      style={{ left: state.x, top: state.y }}
    >
      {menuItems.map((item) => (
        <button
          key={item.label}
          onClick={() => { item.action(); onClose(); }}
          className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm text-left transition-colors ${
            (item as any).danger
              ? 'text-red-400 hover:bg-red-500/20'
              : 'text-gray-200 hover:bg-slate-600'
          }`}
        >
          <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d={item.icon} />
          </svg>
          {item.label}
        </button>
      ))}
    </div>
  );
}

// ---------- Workflow List Item ----------

function WorkflowItem({
  workflow,
  isSelected,
  onClick,
  onContextMenu,
}: {
  workflow: Workflow;
  isSelected: boolean;
  onClick: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
}) {
  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  const moduleCount = workflow.rows.reduce((sum, row) => sum + row.modules.length, 0);

  return (
    <div
      onClick={onClick}
      onContextMenu={onContextMenu}
      className={`px-3 py-2.5 cursor-pointer transition-colors border-l-2 ${
        isSelected
          ? 'bg-slate-700/80 border-purple-500'
          : 'border-transparent hover:bg-slate-800/60'
      }`}
    >
      <div className="flex items-center justify-between mb-0.5">
        <span className={`text-sm font-medium truncate ${isSelected ? 'text-white' : 'text-gray-200'}`}>
          {workflow.name}
        </span>
        {workflow.isTemplate && (
          <span className="text-[10px] bg-purple-500/20 text-purple-400 px-1.5 py-0.5 rounded flex-shrink-0 ml-1">
            TPL
          </span>
        )}
      </div>
      <div className="flex items-center gap-2 text-[11px] text-gray-500">
        <span>{workflow.rows.length} level{workflow.rows.length !== 1 ? 's' : ''}</span>
        <span className="text-gray-600">|</span>
        <span>{moduleCount} module{moduleCount !== 1 ? 's' : ''}</span>
        <span className="ml-auto">{formatDate(workflow.updatedAt)}</span>
      </div>
    </div>
  );
}

// ---------- Sidebar ----------

export function Sidebar({ onNewWorkflow, onSelectWorkflow, onRunWorkflow, onSettings }: Props) {
  const workflows = useOrchestratorStore((s) => s.workflows);
  const currentWorkflowId = useOrchestratorStore((s) => s.currentWorkflowId);
  const deleteWorkflow = useOrchestratorStore((s) => s.deleteWorkflow);
  const duplicateWorkflow = useOrchestratorStore((s) => s.duplicateWorkflow);
  const selectWorkflow = useOrchestratorStore((s) => s.selectWorkflow);

  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [filterText, setFilterText] = useState('');

  // Separate templates from regular workflows
  const templates = workflows.filter((w) => w.isTemplate);
  const regularWorkflows = workflows.filter((w) => !w.isTemplate);

  // Filter
  const filtered = filterText.trim()
    ? regularWorkflows.filter((w) =>
        w.name.toLowerCase().includes(filterText.toLowerCase()) ||
        w.description.toLowerCase().includes(filterText.toLowerCase())
      )
    : regularWorkflows;

  const filteredTemplates = filterText.trim()
    ? templates.filter((w) =>
        w.name.toLowerCase().includes(filterText.toLowerCase()) ||
        w.description.toLowerCase().includes(filterText.toLowerCase())
      )
    : templates;

  function handleContextMenu(e: React.MouseEvent, workflowId: string) {
    e.preventDefault();
    setContextMenu({ workflowId, x: e.clientX, y: e.clientY });
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this workflow? This cannot be undone.')) return;
    await deleteWorkflow(id);
  }

  async function handleDuplicate(id: string) {
    const dup = await duplicateWorkflow(id);
    if (dup) {
      selectWorkflow(dup.id);
      onSelectWorkflow(dup.id);
    }
  }

  return (
    <div className="w-[220px] flex flex-col bg-slate-900 border-r border-slate-700 overflow-hidden">
      {/* New Workflow Button */}
      <div className="p-3">
        <button
          onClick={onNewWorkflow}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
            <path d="M12 4v16m8-8H4" />
          </svg>
          New Workflow
        </button>
      </div>

      {/* Search */}
      <div className="px-3 pb-2">
        <input
          type="text"
          value={filterText}
          onChange={(e) => setFilterText(e.target.value)}
          placeholder="Filter workflows..."
          className="w-full bg-slate-800 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
        />
      </div>

      {/* Workflow List */}
      <div className="flex-1 overflow-y-auto">
        {/* Regular workflows */}
        <div className="mb-1">
          <div className="px-3 py-1.5">
            <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
              Workflows ({filtered.length})
            </span>
          </div>
          {filtered.length === 0 ? (
            <div className="px-3 py-4 text-xs text-gray-600 text-center">
              {filterText ? 'No matching workflows' : 'No workflows yet'}
            </div>
          ) : (
            filtered.map((w) => (
              <WorkflowItem
                key={w.id}
                workflow={w}
                isSelected={w.id === currentWorkflowId}
                onClick={() => {
                  selectWorkflow(w.id);
                  onSelectWorkflow(w.id);
                }}
                onContextMenu={(e) => handleContextMenu(e, w.id)}
              />
            ))
          )}
        </div>

        {/* Templates section */}
        {(filteredTemplates.length > 0 || !filterText) && (
          <div className="mt-2 border-t border-slate-800">
            <div className="px-3 py-1.5 mt-1">
              <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                Templates ({filteredTemplates.length})
              </span>
            </div>
            {filteredTemplates.length === 0 ? (
              <div className="px-3 py-3 text-xs text-gray-600 text-center">
                No templates
              </div>
            ) : (
              filteredTemplates.map((w) => (
                <WorkflowItem
                  key={w.id}
                  workflow={w}
                  isSelected={w.id === currentWorkflowId}
                  onClick={() => {
                    selectWorkflow(w.id);
                    onSelectWorkflow(w.id);
                  }}
                  onContextMenu={(e) => handleContextMenu(e, w.id)}
                />
              ))
            )}
          </div>
        )}
      </div>

      {/* Bottom: Settings */}
      <div className="border-t border-slate-800 p-2">
        <button
          onClick={onSettings}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
          </svg>
          Settings
        </button>
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <ContextMenu
          state={contextMenu}
          onClose={() => setContextMenu(null)}
          onEdit={() => {
            selectWorkflow(contextMenu.workflowId);
            onSelectWorkflow(contextMenu.workflowId);
          }}
          onRun={() => onRunWorkflow(contextMenu.workflowId)}
          onDuplicate={() => handleDuplicate(contextMenu.workflowId)}
          onDelete={() => handleDelete(contextMenu.workflowId)}
        />
      )}
    </div>
  );
}
