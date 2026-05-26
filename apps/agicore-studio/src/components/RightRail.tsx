// Right rail dispatcher — picks between QcInspector (when a workflow is
// paused awaiting human review) and the default NodeInspector (property
// editing). Keeping the swap in one place means App.tsx doesn't need to
// know about the run-state-vs-authoring-state distinction.

import React from 'react';
import { useRunStore } from '../store/runStore';
import NodeInspector from './NodeInspector';
import QcInspector from './QcInspector';

const RightRail: React.FC = () => {
  const pendingQc = useRunStore((s) => s.pendingQc);
  return pendingQc ? <QcInspector /> : <NodeInspector />;
};

export default RightRail;
