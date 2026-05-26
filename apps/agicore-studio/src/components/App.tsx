// Alpha layout (multi-file projects):
//
//   +-------+--------+----------------------------+----------+
//   |       |        |  Toolbar (name · Run ▶)    |          |
//   | Pro-  | Pal-   +----------------------------+ Inspec-  |
//   | ject  | ette   |                            | tor      |
//   | Expl- |        |          Canvas            | / QC     |
//   | orer  |        |                            |          |
//   |       |        +----------------------------+          |
//   |       |        |  Bottom drawer: Source │ Run |        |
//   +-------+--------+----------------------------+----------+
//
// Project Explorer is mounted only when a project is open. Without a
// project the layout collapses back to the MVP shape (palette + canvas
// + bottom drawer + right rail), and the Welcome panel offers the
// "Open project folder" action.

import React from 'react';
import TitleBar from './TitleBar';
import NodePalette from './NodePalette';
import ProjectExplorer from './ProjectExplorer';
import RightRail from './RightRail';
import Canvas from './Canvas';
import WorkflowToolbar from './WorkflowToolbar';
import BottomDrawer from './BottomDrawer';

const App: React.FC = () => (
  <div className="flex flex-col h-screen bg-[var(--bg-page)]">
    <TitleBar />
    <div className="flex-1 flex overflow-hidden min-h-0">
      <ProjectExplorer />
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
