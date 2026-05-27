// Alpha layout (multi-file projects):
//
//   +-------------------- Recovery banner (when applicable) ----+
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
//
// Recovery banner appears only when prior-session autosave drafts are
// detected on startup.

import React, { useEffect } from 'react';
import TitleBar from './TitleBar';
import NodePalette from './NodePalette';
import ProjectExplorer from './ProjectExplorer';
import RightRail from './RightRail';
import Canvas from './Canvas';
import WorkflowToolbar from './WorkflowToolbar';
import BottomDrawer from './BottomDrawer';
import RecoveryBanner from './RecoveryBanner';
import RunAnnouncer from './RunAnnouncer';
import { startAutosave, stopAutosave } from '../lib/recovery';
import { recordEvent } from '../lib/telemetry';
import { installCrashReporter } from '../lib/crash-reporter';

const App: React.FC = () => {
  useEffect(() => {
    startAutosave();
    installCrashReporter();
    recordEvent('studio_started', {});
    return () => stopAutosave();
  }, []);

  return (
    <div className="flex flex-col h-screen bg-[var(--bg-page)]">
      <TitleBar />
      <RecoveryBanner />
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
      <RunAnnouncer />
    </div>
  );
};

export default App;
