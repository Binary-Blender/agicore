// MVP layout:
//
//   +--------+----------------------------+----------+
//   |        |  Toolbar                   |          |
//   | Pal-   +----------------------------+ Inspec-  |
//   | ette   |                            | tor      |
//   |        |          Canvas            |          |
//   |        |                            |          |
//   |        +----------------------------+          |
//   |        |  Source drawer (collapse)  |          |
//   +--------+----------------------------+----------+
//
// AD-1 made visible: the source drawer shows the live-generated .agi
// text in the bottom strip. Every canvas edit re-emits it.

import React from 'react';
import TitleBar from './TitleBar';
import NodePalette from './NodePalette';
import NodeInspector from './NodeInspector';
import Canvas from './Canvas';
import WorkflowToolbar from './WorkflowToolbar';
import AgiSourceDrawer from './AgiSourceDrawer';

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
        <AgiSourceDrawer />
      </div>
      <NodeInspector />
    </div>
  </div>
);

export default App;
