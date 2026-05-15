import { WebviewWindow } from '@tauri-apps/api/webviewWindow';

export function getPopoutView(): string | null {
  const hash = window.location.hash;
  if (hash.startsWith('#popout=')) return hash.slice('#popout='.length);
  return null;
}

export async function openViewWindow(viewName: string, title: string): Promise<void> {
  const label = `popout-${viewName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;

  const existing = await WebviewWindow.getByLabel(label);
  if (existing) {
    await existing.setFocus();
    return;
  }

  const base = window.location.href.split('#')[0];
  const url = `${base}#popout=${viewName}`;

  new WebviewWindow(label, {
    url,
    title,
    width: 1024,
    height: 768,
    minWidth: 600,
    minHeight: 400,
    resizable: true,
    decorations: true,
    center: true,
  });
}
