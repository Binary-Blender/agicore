import React, { useEffect, useRef } from 'react';
import { useWriterStore } from '../store/writerStore';

interface ContextMenuProps {
  x: number;
  y: number;
  selectedText: string;
  onClose: () => void;
}

const CONTEXT_TOOLS = [
  { id: 'rewrite', label: 'Rewrite', prompt: 'Rewrite the following text to improve clarity, flow, and engagement while preserving the original meaning and voice.' },
  { id: 'expand', label: 'Expand', prompt: 'Expand on the following text with more detail, description, and depth. Keep the same style and voice.' },
  { id: 'compress', label: 'Compress', prompt: 'Tighten this passage by removing unnecessary words, redundancies, and filler while preserving the meaning, voice, and important details. Make every word count.' },
  { id: 'show', label: 'Show Don\'t Tell', prompt: 'Rewrite this passage using "show don\'t tell" technique. Replace abstract statements with concrete sensory details, actions, and dialogue that let the reader experience the scene rather than being told about it.' },
  { id: 'dialogue', label: 'Dialogue Polish', prompt: 'Rewrite this dialogue to sound more natural and distinctive. Each character should have a unique voice. Preserve the information exchanged but make it feel like real people talking.' },
  { id: 'summarize', label: 'Summarize', prompt: 'Provide a concise summary of the following text, capturing the key events, character developments, and important details in 2-3 paragraphs.' },
];

export default function EditorContextMenu({ x, y, selectedText, onClose }: ContextMenuProps) {
  const { sendAiPrompt, settings, toggleAiPanel, aiPanelOpen } = useWriterStore();
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on outside click or Escape
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [onClose]);

  // Adjust position to keep menu on screen
  const adjustedX = Math.min(x, window.innerWidth - 200);
  const adjustedY = Math.min(y, window.innerHeight - (CONTEXT_TOOLS.length * 32 + 16));

  const handleToolClick = async (tool: typeof CONTEXT_TOOLS[0]) => {
    onClose();

    // Open AI panel if closed so user can see the response
    if (!aiPanelOpen) {
      toggleAiPanel();
    }

    const fullPrompt = `${tool.prompt}\n\nSelected text:\n${selectedText}`;
    await sendAiPrompt(fullPrompt, settings.selectedModel, []);
  };

  return (
    <div
      ref={menuRef}
      className="fixed z-50 bg-[#1e2746] border border-[#3a3a5a] rounded-lg shadow-xl py-1 min-w-[180px]"
      style={{ left: adjustedX, top: adjustedY }}
    >
      <div className="px-3 py-1.5 text-xs text-surface-500 border-b border-[var(--border)]">
        AI Tools
      </div>
      {CONTEXT_TOOLS.map((tool) => (
        <button
          key={tool.id}
          onClick={() => handleToolClick(tool)}
          className="w-full text-left px-3 py-1.5 text-xs text-surface-300 hover:bg-primary-600/20 hover:text-primary-300 transition-colors"
        >
          {tool.label}
        </button>
      ))}
    </div>
  );
}
