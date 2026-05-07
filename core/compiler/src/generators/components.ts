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

  return files;
}
