// React Component Scaffold Generator
// Generates React components, App.tsx routing, and Sidebar from VIEW declarations

import type { AgiFile, ViewDecl, EntityDecl } from '@agicore/parser';
import { toCamelCase, lcFirst } from '../naming.js';

function generateTableView(view: ViewDecl, entity?: EntityDecl): string {
  const name = entity?.name ?? 'Item';
  const camel = lcFirst(name);
  const plural = camel + 's';
  const fields = view.fields.length > 0
    ? view.fields
    : entity?.fields.map(f => f.name) ?? [];

  return `import { useEffect } from 'react';
import { useAppStore } from '../store/appStore';

export function ${view.name}() {
  const ${plural} = useAppStore((s) => s.${plural});
  const load = useAppStore((s) => s.load${name}s);

  useEffect(() => { load(); }, []);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">${view.title ?? view.name}</h2>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--border)]">
${fields.map(f => `            <th className="text-left py-2 px-3">${toCamelCase(f)}</th>`).join('\n')}
          </tr>
        </thead>
        <tbody>
          {${plural}.map((item) => (
            <tr key={item.id} className="border-b border-[var(--border)] hover:bg-[var(--bg-hover)]">
${fields.map(f => `              <td className="py-2 px-3">{String(item.${toCamelCase(f)} ?? '')}</td>`).join('\n')}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
`;
}

function generateSplitView(view: ViewDecl, entity?: EntityDecl): string {
  const name = entity?.name ?? 'Item';
  const camel = lcFirst(name);
  const plural = camel + 's';
  const fields = view.fields.length > 0
    ? view.fields
    : entity?.fields.map(f => f.name) ?? [];

  return `import { useEffect } from 'react';
import { useAppStore } from '../store/appStore';

export function ${view.name}() {
  const ${plural} = useAppStore((s) => s.${plural});
  const selectedId = useAppStore((s) => s.selected${name}Id);
  const select = useAppStore((s) => s.select${name});
  const load = useAppStore((s) => s.load${name}s);

  useEffect(() => { load(); }, []);

  const selected = ${plural}.find((i) => i.id === selectedId);

  return (
    <div className="flex h-full">
      {/* List */}
      <div className="w-64 border-r border-[var(--border)] overflow-y-auto">
        {${plural}.map((item) => (
          <div
            key={item.id}
            onClick={() => select(item.id)}
            className={\`p-3 cursor-pointer border-b border-[var(--border)] \${
              item.id === selectedId ? 'bg-[var(--bg-active)]' : 'hover:bg-[var(--bg-hover)]'
            }\`}
          >
            <div className="font-medium">{String(item.${toCamelCase(fields[0] ?? 'id')})}</div>
${fields.slice(1, 3).map(f => `            <div className="text-xs text-[var(--text-secondary)]">{String(item.${toCamelCase(f)} ?? '')}</div>`).join('\n')}
          </div>
        ))}
      </div>

      {/* Detail */}
      <div className="flex-1 p-6">
        {selected ? (
          <div>
            <h2 className="text-xl font-semibold mb-4">{String(selected.${toCamelCase(fields[0] ?? 'id')})}</h2>
${fields.map(f => `            <div className="mb-2"><span className="text-[var(--text-secondary)]">${toCamelCase(f)}:</span> {String(selected.${toCamelCase(f)} ?? '')}</div>`).join('\n')}
          </div>
        ) : (
          <div className="text-[var(--text-secondary)]">Select an item to view details</div>
        )}
      </div>
    </div>
  );
}
`;
}

function generateCardsView(view: ViewDecl, entity?: EntityDecl): string {
  const name = entity?.name ?? 'Item';
  const camel = lcFirst(name);
  const plural = camel + 's';
  const fields = view.fields.length > 0
    ? view.fields
    : entity?.fields.map(f => f.name) ?? [];

  return `import { useEffect } from 'react';
import { useAppStore } from '../store/appStore';

export function ${view.name}() {
  const ${plural} = useAppStore((s) => s.${plural});
  const load = useAppStore((s) => s.load${name}s);

  useEffect(() => { load(); }, []);

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold mb-4">${view.title ?? view.name}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {${plural}.map((item) => (
          <div key={item.id} className="bg-[var(--bg-panel)] border border-[var(--border)] rounded-lg p-4">
${fields.map((f, i) => i === 0
  ? `            <h3 className="font-medium mb-2">{String(item.${toCamelCase(f)})}</h3>`
  : `            <div className="text-sm text-[var(--text-secondary)]">${toCamelCase(f)}: {String(item.${toCamelCase(f)} ?? '')}</div>`
).join('\n')}
          </div>
        ))}
      </div>
    </div>
  );
}
`;
}

function generateCustomView(view: ViewDecl): string {
  return `export function ${view.name}() {
  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold mb-4">${view.title ?? view.name}</h2>
      <div className="text-[var(--text-secondary)]">
        Custom view — implement your layout here.
      </div>
    </div>
  );
}
`;
}

function generateViewComponent(view: ViewDecl, entity?: EntityDecl): string {
  switch (view.layout) {
    case 'table':  return generateTableView(view, entity);
    case 'split':  return generateSplitView(view, entity);
    case 'cards':  return generateCardsView(view, entity);
    case 'form':
    case 'detail':
    case 'custom':
    default:       return generateCustomView(view);
  }
}

function generateAppTsx(ast: AgiFile): string {
  const imports = ast.views.map(v =>
    `import { ${v.name} } from './${v.name}';`
  ).join('\n');

  const cases = ast.views.map(v =>
    `      case '${v.name}': return <${v.name} />;`
  ).join('\n');

  return `import { useAppStore } from '../store/appStore';
import { Sidebar } from './Sidebar';
import { TitleBar } from './TitleBar';
${imports}

export function App() {
  const currentView = useAppStore((s) => s.currentView);

  const renderView = () => {
    switch (currentView) {
${cases}
      default: return <div className="p-6">Unknown view</div>;
    }
  };

  return (
    <div className="h-screen flex flex-col bg-[var(--bg-page)] text-[var(--text-primary)]">
      <TitleBar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
          {renderView()}
        </main>
      </div>
    </div>
  );
}
`;
}

function generateSidebar(ast: AgiFile): string {
  const items = ast.views
    .filter(v => v.sidebar)
    .map(v => ({
      name: v.name,
      icon: v.sidebar!.icon,
      title: v.title ?? v.name,
    }));

  const iconImports = [...new Set(items.map(i => i.icon))].join(', ');

  return `import { ${iconImports} } from 'lucide-react';
import { useAppStore } from '../store/appStore';

const NAV_ITEMS = [
${items.map(i => `  { view: '${i.name}', icon: ${i.icon}, title: '${i.title}' },`).join('\n')}
];

export function Sidebar() {
  const currentView = useAppStore((s) => s.currentView);
  const setCurrentView = useAppStore((s) => s.setCurrentView);

  return (
    <nav className="w-14 bg-[var(--bg-sidebar)] border-r border-[var(--border)] flex flex-col items-center py-2 gap-1">
      {NAV_ITEMS.map(({ view, icon: Icon, title }) => (
        <button
          key={view}
          onClick={() => setCurrentView(view)}
          title={title}
          className={\`w-10 h-10 flex items-center justify-center rounded-lg transition-colors \${
            currentView === view
              ? 'bg-[var(--bg-active)] text-[var(--text-primary)]'
              : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
          }\`}
        >
          <Icon size={20} />
        </button>
      ))}
    </nav>
  );
}
`;
}

/**
 * Derive a human-friendly display label from a raw model id when the user
 * didn't supply an explicit LABEL. The strategy is intentionally simple:
 *
 *   1. strip a trailing `-YYYY-MM-DD` or `-YYYYMMDD` date stamp,
 *   2. strip a `latest` suffix,
 *   3. split on `-` and `_`, drop empty tokens,
 *   4. title-case each remaining token (preserve digits + dots verbatim),
 *   5. rejoin with spaces.
 *
 * Examples:
 *   claude-sonnet-4-20250514       -> "Claude Sonnet 4"
 *   claude-haiku-4-5-20251001      -> "Claude Haiku 4 5"
 *   gpt-4o                          -> "Gpt 4o"
 *   gemini-2.5-flash-preview-05-20 -> "Gemini 2.5 Flash Preview"
 *   grok-3-latest                   -> "Grok 3"
 */
function humanizeModelId(id: string): string {
  let s = id;
  // Strip trailing -YYYYMMDD
  s = s.replace(/-\d{8}$/, '');
  // Strip trailing -YYYY-MM-DD
  s = s.replace(/-\d{4}-\d{2}-\d{2}$/, '');
  // Strip trailing -MM-DD (e.g. preview-05-20)
  s = s.replace(/-\d{2}-\d{2}$/, '');
  // Strip trailing -latest
  s = s.replace(/-latest$/i, '');
  // Tokenize on - or _
  const tokens = s.split(/[-_]+/).filter(Boolean);
  return tokens
    .map(t => {
      // Preserve tokens that already contain digits/dots verbatim except for
      // capitalizing the leading letter.
      if (/^[a-zA-Z][a-zA-Z]*$/.test(t)) {
        return t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();
      }
      // Mixed alphanumeric: just capitalize the first char if it's a letter.
      if (/^[a-zA-Z]/.test(t)) {
        return t.charAt(0).toUpperCase() + t.slice(1);
      }
      return t;
    })
    .join(' ');
}

/**
 * Emit `src/components/ModelPicker.tsx` — a small dropdown bound to
 * `selectedModel` / `setSelectedModel` in the generated Zustand store.
 *
 * The MODELS array literal mirrors the AI_SERVICE.MODELS block one-for-one
 * (same order as declared in the .agi source). Each entry resolves its label
 * either from the explicit LABEL or via `humanizeModelId()`.
 *
 * The className strings here match what NovaSyn Chat's hand-written picker
 * was using so swapping in `<ModelPicker />` is a visual no-op.
 */
function generateModelPicker(ast: AgiFile): string {
  const ai = ast.aiService;
  // generateModelPicker is only invoked when ai is set — but be defensive.
  if (!ai) return '';

  const entries = ai.models.map(m => {
    const label = m.label ?? humanizeModelId(m.id);
    // JSON.stringify gives us correct JS string escaping for ids that might
    // contain quotes, backslashes, etc.
    return `  { id: ${JSON.stringify(m.id)}, label: ${JSON.stringify(label)}, provider: ${JSON.stringify(m.provider)} },`;
  });

  return `import { useAppStore } from '../store/appStore';

const MODELS = [
${entries.join('\n')}
];

export function ModelPicker() {
  const selectedModel = useAppStore((s) => s.selectedModel);
  const setSelectedModel = useAppStore((s) => s.setSelectedModel);

  return (
    <div className="px-3 py-2 border-b border-slate-700">
      <label className="text-xs text-gray-500 block mb-1">Model</label>
      <select
        value={selectedModel}
        onChange={(e) => setSelectedModel(e.target.value)}
        className="w-full bg-slate-700 border border-slate-600 text-white text-xs px-2 py-1.5 rounded focus:outline-none focus:border-blue-500"
      >
        {MODELS.map((m) => (
          <option key={m.id} value={m.id}>{m.label}</option>
        ))}
      </select>
    </div>
  );
}
`;
}

function generateTitleBar(ast: AgiFile): string {
  return `export function TitleBar() {
  return (
    <div
      className="h-9 bg-[var(--bg-titlebar)] flex items-center px-3 select-none"
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      <span className="text-sm font-medium">${ast.app.title}</span>
    </div>
  );
}
`;
}

export function generateComponents(ast: AgiFile): Map<string, string> {
  const files = new Map<string, string>();

  for (const view of ast.views) {
    const entity = view.entity
      ? ast.entities.find(e => e.name === view.entity)
      : undefined;
    files.set(`src/components/${view.name}.tsx`, generateViewComponent(view, entity));
  }

  files.set('src/components/App.tsx', generateAppTsx(ast));
  files.set('src/components/Sidebar.tsx', generateSidebar(ast));
  files.set('src/components/TitleBar.tsx', generateTitleBar(ast));

  // Emit ModelPicker.tsx only when AI_SERVICE is declared — apps without an
  // AI service have no `selectedModel` slot in the store for the picker to
  // bind to, so emitting the file would be a type error in the user's app.
  if (ast.aiService) {
    files.set('src/components/ModelPicker.tsx', generateModelPicker(ast));
  }

  return files;
}
