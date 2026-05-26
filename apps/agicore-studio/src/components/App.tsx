// MVP layout:
//
//   +--------+----------------------------+----------+
//   |        |  Toolbar (name · Run ▶)    |          |
//   | Pal-   +----------------------------+ Inspec-  |
//   | ette   |                            | tor      |
//   |        |          Canvas            |          |
//   |        |  (paints node statuses     |          |
//   |        |   during a run)            |          |
//   |        +----------------------------+          |
//   |        |  Bottom drawer: Source │ Run |        |
//   +--------+----------------------------+----------+
//
// AD-1 visible in the Source tab. AD-5 visible in the Run tab + canvas
// status painting. Auto-switch to Run when a workflow starts executing.

import React from 'react';
import TitleBar from './TitleBar';
import NodePalette from './NodePalette';
import RightRail from './RightRail';
import Canvas from './Canvas';
import WorkflowToolbar from './WorkflowToolbar';
import BottomDrawer from './BottomDrawer';

const App: React.FC = () => (
  <div className="flex flex-col h-screen bg-[var(--bg-page)]">
    <TitleBar />
    <div className="flex-1 flex overflow-hidden min-h-0">
      <NodePalette />
      <div className="flex-1 flex flex-col overflow-hidden min-h-0">
        <WorkflowToolbar />
        <div className="flex-1 min-h-0 overflow-hidden">
          <Canvas />
        </div>
        <BottomDrawer />
      </div>
      <RightRail />
    </div>
  </div>
);

export default App;
