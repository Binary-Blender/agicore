// Right rail dispatcher — picks between QcInspector (paused at a human
// QC checkpoint), DebugInspector (paused at a breakpoint or after a
// Step), or the default NodeInspector (property editing). Keeping the
// swap in one place means App.tsx doesn't need to know about the
// run-state-vs-authoring-state distinction.

import React from 'react';
import { useRunStore } from '../store/runStore';
import NodeInspector from './NodeInspector';
import QcInspector from './QcInspector';
import DebugInspector from './DebugInspector';

const RightRail: React.FC = () => {
  const pendingQc = useRunStore((s) => s.pendingQc);
  const pendingBreakpoint = useRunStore((s) => s.pendingBreakpoint);
  if (pendingQc)         return <QcInspector />;
  if (pendingBreakpoint) return <DebugInspector />;
  return <NodeInspector />;
};

export default RightRail;
