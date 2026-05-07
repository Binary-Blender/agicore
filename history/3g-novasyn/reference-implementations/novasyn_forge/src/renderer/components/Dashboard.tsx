import React, { useState } from 'react';
import { useForgeStore } from '../store/forgeStore';
import type { ForgeProject } from '../../shared/types';

export function Dashboard() {
  const { projects, setCurrentView, setCurrentProjectId, removeProject } = useForgeStore();
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  async function handleDelete(id: string) {
    await window.electronAPI.deleteProject(id);
    removeProject(id);
    setConfirmDelete(null);
  }

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white">Projects</h1>
          <p className="text-sm text-gray-400 mt-1">
            {projects.length === 0
              ? 'No projects yet. Create one to get started.'
              : `${projects.length} project${projects.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <button
          onClick={() => setCurrentView('new-project')}
          className="text-sm bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg transition"
        >
          + New Project
        </button>
      </div>

      {projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-gray-500">
          <div className="text-5xl mb-4 opacity-30">&#9776;</div>
          <p className="text-sm">Create your first NovaSyn app</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              isConfirmingDelete={confirmDelete === project.id}
              onConfirmDelete={() => setConfirmDelete(project.id)}
              onCancelDelete={() => setConfirmDelete(null)}
              onDelete={() => handleDelete(project.id)}
              onOpen={() => {
                setCurrentProjectId(project.id);
                setCurrentView('project-detail');
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ProjectCard({
  project,
  isConfirmingDelete,
  onConfirmDelete,
  onCancelDelete,
  onDelete,
  onOpen,
}: {
  project: ForgeProject;
  isConfirmingDelete: boolean;
  onConfirmDelete: () => void;
  onCancelDelete: () => void;
  onDelete: () => void;
  onOpen: () => void;
}) {
  return (
    <div
      onClick={onOpen}
      className="bg-slate-800 border border-slate-700 rounded-xl p-4 hover:border-amber-500/40 transition group cursor-pointer">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-white">{project.displayName}</h3>
          {project.status === 'scaffolded' ? (
            <span className="inline-flex items-center gap-1 text-[10px] text-green-400 bg-green-500/10 px-1.5 py-0.5 rounded" title="Scaffolded">
              <span className="w-1.5 h-1.5 bg-green-400 rounded-full inline-block" />
              Scaffolded
            </span>
          ) : (
            <span className="text-[10px] text-gray-500" title="Not scaffolded">
              <span className="w-1.5 h-1.5 bg-gray-500 rounded-full inline-block" />
            </span>
          )}
        </div>
        <span className="text-xs text-amber-400 font-mono">:{project.port}</span>
      </div>
      {project.description && (
        <p className="text-xs text-gray-400 mb-3 line-clamp-2">{project.description}</p>
      )}
      <div className="text-xs text-gray-500 mb-3 font-mono truncate" title={project.path}>
        {project.path}
      </div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-600">
          {new Date(project.updatedAt).toLocaleDateString()}
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); window.electronAPI.openProjectDir(project.path); }}
            className="text-gray-400 hover:text-white transition"
            title="Open in Explorer"
          >
            &#128194;
          </button>
          {isConfirmingDelete ? (
            <div className="flex items-center gap-1">
              <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="text-red-400 hover:text-red-300 transition">Yes</button>
              <button onClick={(e) => { e.stopPropagation(); onCancelDelete(); }} className="text-gray-400 hover:text-white transition">No</button>
            </div>
          ) : (
            <button
              onClick={(e) => { e.stopPropagation(); onConfirmDelete(); }}
              className="text-gray-600 hover:text-red-400 transition opacity-0 group-hover:opacity-100"
              title="Delete"
            >
              &#128465;
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
