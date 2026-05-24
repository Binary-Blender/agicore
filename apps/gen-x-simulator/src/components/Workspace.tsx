import React, { useState } from 'react';
import { useAppStore } from '../store/appStore';
import BasicEditor from './BasicEditor';
import C64Shell from './C64Shell';
import MagazineReader from './MagazineReader';
import VerdictBanner from './VerdictBanner';

const Workspace: React.FC = () => {
  const {
    magazineOpen, openMagazine, closeMagazine, activeLesson,
    runProgram, running, needsInput, inputPrompt, submitInput,
    lessons, loadLessonIntoEditor, resetWorkspace,
  } = useAppStore();

  const [inputBuf, setInputBuf] = useState('');

  return (
    <div className="h-full grid grid-cols-2 gap-2 p-2">
      <div className="flex flex-col gap-2 min-h-0">
        <div className="flex items-center gap-2 px-1">
          <button
            onClick={openMagazine}
            className="text-xs px-3 py-1.5 rounded border border-[var(--border)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors"
          >
            📰  Magazines ({lessons.length})
          </button>
          {activeLesson && (
            <span className="text-xs text-[var(--text-muted)] truncate">
              {activeLesson.magazineTitle} · {activeLesson.magazineIssue} · p.{activeLesson.page}
            </span>
          )}
        </div>
        <div className="flex-1 min-h-0">
          <C64Shell />
        </div>
        {needsInput && (
          <div className="flex items-center gap-2 px-1">
            <span className="font-mono text-sm text-[var(--c64-fg)]">{inputPrompt}</span>
            <input
              type="text"
              autoFocus
              value={inputBuf}
              onChange={(e) => setInputBuf(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  submitInput(inputBuf);
                  setInputBuf('');
                }
              }}
              className="flex-1 bg-[var(--bg-input)] border border-[var(--border)] rounded px-2 py-1 font-mono text-sm focus:outline-none focus:border-[var(--accent)]"
              placeholder="type your input and press Enter"
            />
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2 min-h-0">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs uppercase tracking-widest text-[var(--text-muted)]">
            BASIC editor
          </span>
          <div className="flex gap-2">
            <button
              onClick={resetWorkspace}
              className="text-xs px-3 py-1.5 rounded border border-[var(--border)] hover:border-[var(--text-secondary)] transition-colors"
            >
              NEW
            </button>
            <button
              onClick={runProgram}
              disabled={running}
              className="text-xs px-3 py-1.5 rounded bg-[var(--accent)] text-black font-semibold hover:opacity-90 disabled:opacity-40"
            >
              {running ? 'RUNNING…' : 'RUN'}
            </button>
          </div>
        </div>
        <div className="flex-1 min-h-0">
          <BasicEditor />
        </div>
        <VerdictBanner />
      </div>

      {magazineOpen && (
        <MagazineReader
          lessons={lessons}
          onClose={closeMagazine}
          onTypeIn={loadLessonIntoEditor}
        />
      )}
    </div>
  );
};

export default Workspace;
