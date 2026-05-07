import { app, Menu, Tray, globalShortcut, BrowserWindow, nativeImage } from 'electron';

let tray: Tray | null = null;
export let isQuitting = false;

export function setIsQuitting(val: boolean) {
  isQuitting = val;
}

function createTrayIcon() {
  // 16x16 BGRA bitmap (Electron/Chromium native format) — indigo #6366f1
  const size = 16;
  const buffer = Buffer.alloc(size * size * 4);
  for (let i = 0; i < size * size; i++) {
    buffer[i * 4]     = 241; // B  \
    buffer[i * 4 + 1] = 102; // G   > #6366f1 (indigo-500) in BGRA order
    buffer[i * 4 + 2] = 99;  // R  /
    buffer[i * 4 + 3] = 255; // A
  }
  return nativeImage.createFromBitmap(buffer, { width: size, height: size });
}

export function setupTray(mainWindow: BrowserWindow) {
  const icon = createTrayIcon();
  tray = new Tray(icon);
  tray.setToolTip('NovaSyn Orchestrator');

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show NovaSyn Orchestrator',
      click: () => {
        mainWindow.show();
        mainWindow.focus();
      },
    },
    {
      label: 'New Workflow',
      click: () => {
        mainWindow.show();
        mainWindow.focus();
        mainWindow.webContents.send('tray-new-workflow');
      },
    },
    { type: 'separator' },
    {
      label: 'Quit NovaSyn Orchestrator',
      click: () => {
        isQuitting = true;
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);

  // Single click: toggle window visibility
  tray.on('click', () => {
    if (mainWindow.isVisible() && mainWindow.isFocused()) {
      mainWindow.hide();
    } else {
      mainWindow.show();
      mainWindow.focus();
    }
  });

  // Ctrl+Shift+O (Cmd+Shift+O on macOS) — global show/hide toggle
  globalShortcut.register('CommandOrControl+Shift+O', () => {
    if (mainWindow.isVisible() && mainWindow.isFocused()) {
      mainWindow.hide();
    } else {
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

export function destroyTray() {
  globalShortcut.unregisterAll();
  if (tray) {
    tray.destroy();
    tray = null;
  }
}
