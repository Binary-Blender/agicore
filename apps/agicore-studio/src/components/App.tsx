// Sprint 0 layout — Canvas on the left, AgiEditor on the right.
//
// The split is deliberate: this is the bench test for AD-1 (text is the
// source of truth, canvas is a projection). At Sprint 0 the two views
// are independent (both load the canonical workflow from the same source);
// MVP wires the canvas as a projection of the parsed text.

import React from 'react';
import TitleBar from './TitleBar';
import Canvas from './Canvas';
import AgiEditor from './AgiEditor';
import { CANONICAL_AGI_SOURCE } from '../lib/canonical-source';

const App: React.FC = () => (
  <div className="flex flex-col h-screen bg-[var(--bg-page)]">
    <TitleBar />
    <div className="flex-1 grid grid-cols-2 gap-px bg-[var(--border)] overflow-hidden">
      <PaneHeader title="Canvas" subtitle="React Flow · 5 nodes · canonical workflow">
        <Canvas />
      </PaneHeader>
      <PaneHeader title="Source" subtitle="CodeMirror 6 · .agi language pack">
        <AgiEditor initialDoc={CANONICAL_AGI_SOURCE} readOnly />
      </PaneHeader>
    </div>
  </div>
);

const PaneHeader: React.FC<{ title: string; subtitle: string; children: React.ReactNode }> = ({
  title, subtitle, children,
}) => (
  <div className="flex flex-col bg-[var(--bg-page)] overflow-hidden">
    <div className="flex items-baseline justify-between px-3 py-2 bg-[var(--bg-panel)] border-b border-[var(--border)]">
      <span className="text-xs uppercase tracking-widest text-[var(--text-secondary)]">{title}</span>
      <span className="text-[10px] text-[var(--text-muted)]">{subtitle}</span>
    </div>
    <div className="flex-1 min-h-0 overflow-hidden">
      {children}
    </div>
  </div>
);

export default App;
