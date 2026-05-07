import React, { useState, useCallback } from 'react';
import { useCodeStore } from '../store/codeStore';

interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileNode[];
}

function FileTreeNode({ node, depth }: { node: FileNode; depth: number }) {
  const [expanded, setExpanded] = useState(depth < 1);
  const { selectedFilePath, setSelectedFilePath, setCurrentView } = useCodeStore();

  const handleClick = useCallback(() => {
    if (node.type === 'directory') {
      setExpanded(!expanded);
    } else {
      setSelectedFilePath(node.path);
      setCurrentView('editor');
    }
  }, [node, expanded, setSelectedFilePath, setCurrentView]);

  const isSelected = selectedFilePath === node.path;
  const icon = node.type === 'directory' ? (expanded ? '▾' : '▸') : getFileIcon(node.name);

  return (
    <div>
      <button
        onClick={handleClick}
        className={`w-full text-left px-1 py-0.5 text-xs flex items-center gap-1 hover:bg-slate-800 rounded ${
          isSelected ? 'bg-blue-600/20 text-blue-300' : 'text-slate-400'
        }`}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
      >
        <span className="w-4 text-center text-[10px] opacity-70">{icon}</span>
        <span className="truncate">{node.name}</span>
      </button>
      {node.type === 'directory' && expanded && node.children?.map((child) => (
        <FileTreeNode key={child.path} node={child} depth={depth + 1} />
      ))}
    </div>
  );
}

function getFileIcon(name: string): string {
  const ext = name.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'ts': case 'tsx': return 'TS';
    case 'js': case 'jsx': return 'JS';
    case 'json': return '{}';
    case 'css': return '#';
    case 'html': return '<>';
    case 'md': return 'M';
    case 'sql': return 'Q';
    case 'py': return 'Py';
    case 'rs': return 'Rs';
    case 'go': return 'Go';
    default: return '·';
  }
}

export default function FileTree() {
  const { fileTree } = useCodeStore();

  if (!fileTree) {
    return (
      <div className="p-4 text-center">
        <p className="text-xs text-slate-600">Open a project to browse files</p>
      </div>
    );
  }

  return (
    <div className="py-1">
      {fileTree.children?.map((child) => (
        <FileTreeNode key={child.path} node={child} depth={0} />
      ))}
    </div>
  );
}
