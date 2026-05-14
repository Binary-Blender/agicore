// React Component Scaffold Generator
// Generates React components, App.tsx routing, and Sidebar from VIEW declarations

import type { AgiFile, ViewDecl, EntityDecl } from '@agicore/parser';
import { toCamelCase, lcFirst, toSnakeCase, humanizeModelId } from '../naming.js';
import { providerMeta } from '../provider-registry.js';

/**
 * If an entity has a `BELONGS_TO X` relationship and `X` is in
 * `ast.app.current ?? []`, return the parent name. The generated list view
 * should then read `currentXId` from the store and call the SQL-pushdown
 * `loadEntityForCurrentX` action instead of the unfiltered `loadEntitys`.
 *
 * When an entity BELONGS_TO multiple CURRENT entities, the first relationship
 * in declaration order wins — deterministic, simple, swap in a smarter
 * heuristic if it ever bites us.
 */
function pickCurrentParent(entity: EntityDecl | undefined, ast: AgiFile): string | undefined {
  if (!entity) return undefined;
  const currents = ast.app.current ?? [];
  for (const rel of entity.relationships) {
    if (rel.type !== 'BELONGS_TO') continue;
    if (currents.includes(rel.target)) return rel.target;
  }
  return undefined;
}

// --- Field rendering helpers ---

function entityFieldType(entity: EntityDecl | undefined, fieldName: string): string {
  if (!entity) return 'string';
  const snakeName = toSnakeCase(fieldName);
  const f = entity.fields.find(fd => fd.name === fieldName || fd.name === snakeName);
  return f?.type ?? 'string';
}

// Returns a TSX snippet (no backticks) for displaying a field value.
// objVar = 'item' | 'selected' — the variable holding the record.
function fieldDisplayJsx(fieldName: string, fieldType: string, objVar: string): string {
  const camel = toCamelCase(fieldName);
  const val = `${objVar}.${camel}`;
  if (camel === 'color' || camel.endsWith('Color')) {
    return `<span className="flex items-center gap-1.5"><span style={{background: String(${val} || '#888')}} className="inline-block w-3 h-3 rounded-full border border-[var(--border)] flex-shrink-0" /><span>{String(${val} ?? '')}</span></span>`;
  }
  if (camel === 'rating') {
    return `<span className="text-yellow-400">{'★'.repeat(Math.min(5, Number(${val}) || 0))}{'☆'.repeat(Math.max(0, 5 - (Number(${val}) || 0)))}</span>`;
  }
  if (fieldType === 'number' || fieldType === 'float') {
    return `<span>{${val} != null ? Number(${val}).toLocaleString() : '—'}</span>`;
  }
  if (fieldType === 'bool') {
    return `<span className={${val} ? 'px-1.5 py-0.5 rounded text-xs font-medium bg-green-900/50 text-green-300' : 'px-1.5 py-0.5 rounded text-xs font-medium bg-slate-700 text-gray-400'}>{${val} ? 'Yes' : 'No'}</span>`;
  }
  if (fieldType === 'datetime') {
    return `<span>{${val} ? new Date(String(${val})).toLocaleString() : '—'}</span>`;
  }
  if (fieldType === 'date') {
    return `<span>{${val} ? new Date(String(${val})).toLocaleDateString() : '—'}</span>`;
  }
  return `<span className="break-words">{String(${val} ?? '')}</span>`;
}

// Returns a JSX input element (no backticks) referencing `form`/`setForm` from component scope.
function fieldFormInputJsx(fieldName: string, fieldType: string): string {
  const camel = toCamelCase(fieldName);
  const base = `bg-[var(--bg-hover)] border border-[var(--border)] rounded px-3 py-1.5 text-sm text-[var(--text-primary)] focus:outline-none focus:border-blue-500`;
  const onChange = `(e) => setForm((p) => ({...p, ${camel}: e.target.value}))`;
  if (camel === 'color' || camel.endsWith('Color')) {
    return `<div className="flex gap-2 items-center"><input type="color" value={form.${camel} || '#3B82F6'} onChange={${onChange}} className="h-8 w-12 rounded border border-[var(--border)] bg-[var(--bg-hover)] cursor-pointer p-0.5 flex-shrink-0" /><input type="text" value={form.${camel} || ''} onChange={${onChange}} placeholder="#3B82F6" className="flex-1 ${base}" /></div>`;
  }
  if (camel === 'rating') {
    return `<input type="number" min="1" max="5" value={form.${camel} || ''} onChange={${onChange}} placeholder="1–5" className="w-full ${base}" />`;
  }
  if (fieldType === 'number' || fieldType === 'float') {
    return `<input type="number" value={form.${camel} || ''} onChange={${onChange}} className="w-full ${base}" />`;
  }
  if (fieldType === 'bool') {
    return `<label className="flex items-center gap-2 cursor-pointer text-sm text-[var(--text-primary)]"><input type="checkbox" checked={form.${camel} === 'true'} onChange={(e) => setForm((p) => ({...p, ${camel}: String(e.target.checked)}))} className="w-4 h-4 rounded" /><span>Enabled</span></label>`;
  }
  return `<input type="text" value={form.${camel} || ''} onChange={${onChange}} className="w-full ${base}" />`;
}

const SKIP_FORM_FIELDS = new Set(['id', 'total_tokens', 'usage_count', 'created_at', 'updated_at', 'parent_id']);

function generateTableView(view: ViewDecl, entity: EntityDecl | undefined, ast: AgiFile): string {
  const name = entity?.name ?? 'Item';
  const camel = lcFirst(name);
  const plural = camel + 's';
  const entitySnake = toSnakeCase(name);

  const viewFields = view.fields.length > 0 ? view.fields : (entity?.fields.map(f => f.name) ?? []);
  const primaryField = viewFields[0] ?? 'id';
  const primaryCamel = toCamelCase(primaryField);

  const hasCreate = view.actions.includes('create');
  const hasEdit = view.actions.includes('edit');
  const hasDelete = view.actions.includes('delete');
  const hasCrud = hasCreate || hasEdit || hasDelete;
  const hasModal = hasCreate || hasEdit;

  const parent = pickCurrentParent(entity, ast);
  const loaderBlock = parent
    ? `  const current${parent}Id = useAppStore((s) => s.current${parent}Id);\n  const load = useAppStore((s) => s.load${name}sForCurrent${parent});`
    : `  const load = useAppStore((s) => s.load${name}s);`;
  const effectDeps = parent ? `[current${parent}Id, load]` : `[]`;

  const editableFields = (entity?.fields ?? []).filter(f => !SKIP_FORM_FIELDS.has(f.name));

  const currents = new Set(ast.app.current ?? []);
  const fkParts = (entity?.relationships ?? [])
    .filter(r => r.type === 'BELONGS_TO')
    .map(r => {
      if (parent && r.target === parent) return `${lcFirst(r.target)}Id: current${r.target}Id ?? ''`;
      return `${lcFirst(r.target)}Id: 'default-user'`;
    });

  function buildCreateInput(): string {
    const parts = editableFields.map(f => {
      const c = toCamelCase(f.name);
      if (f.type === 'number' || f.type === 'float') return `${c}: Number(form.${c}) || 0`;
      if (f.type === 'bool') return `${c}: form.${c} === 'true'`;
      return `${c}: form.${c} ?? ''`;
    });
    return [...parts, ...fkParts].join(', ');
  }

  function buildUpdateInput(): string {
    return editableFields.map(f => {
      const c = toCamelCase(f.name);
      if (f.type === 'number' || f.type === 'float') return `${c}: Number(form.${c}) || 0`;
      if (f.type === 'bool') return `${c}: form.${c} === 'true'`;
      return `${c}: form.${c} ?? ''`;
    }).join(', ');
  }

  const formSeedFromItem = '{' + editableFields.map(f => `${toCamelCase(f.name)}: String(item.${toCamelCase(f.name)} ?? '')`).join(', ') + '}';

  const imports = [
    `import { useEffect, useState } from 'react';`,
    hasCrud ? `import { invoke } from '@tauri-apps/api/core';` : null,
    `import { useAppStore } from '../store/appStore';`,
  ].filter(Boolean).join('\n');

  const stateLines: string[] = [
    `  const [search, setSearch] = useState('');`,
  ];
  if (hasModal) stateLines.push(`  const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null);`);
  if (hasCrud) stateLines.push(`  const [form, setForm] = useState<Record<string, string>>({});`);
  if (hasEdit) stateLines.push(`  const [editingId, setEditingId] = useState<string | null>(null);`);
  if (hasDelete) stateLines.push(`  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);`);

  const handlerLines: string[] = [];
  if (hasCreate) {
    handlerLines.push(`
  async function handleCreate() {
    try {
      await invoke('create_${entitySnake}', { input: { ${buildCreateInput()} } });
      await load();
      setModalMode(null);
      setForm({});
    } catch (err) { console.error('Create failed:', err); }
  }`);
  }
  if (hasEdit) {
    handlerLines.push(`
  async function handleUpdate() {
    if (!editingId) return;
    try {
      await invoke('update_${entitySnake}', { id: editingId, input: { ${buildUpdateInput()} } });
      await load();
      setModalMode(null);
      setEditingId(null);
    } catch (err) { console.error('Update failed:', err); }
  }`);
  }
  if (hasDelete) {
    handlerLines.push(`
  async function handleDelete(id: string) {
    try {
      await invoke('delete_${entitySnake}', { id });
      await load();
      setConfirmDeleteId(null);
    } catch (err) { console.error('Delete failed:', err); }
  }`);
  }

  const modalSubmitOnClick = hasCreate && hasEdit
    ? `async () => { if (modalMode === 'create') { await handleCreate(); } else { await handleUpdate(); } }`
    : hasCreate ? `handleCreate` : `handleUpdate`;

  const formFieldsJsx = editableFields.map(f => `            <div className="mb-3">
              <label className="block text-xs text-[var(--text-secondary)] mb-1">${toCamelCase(f.name)}</label>
              ${fieldFormInputJsx(f.name, f.type)}
            </div>`).join('\n');

  const tableHeaderCells = viewFields.map(f =>
    `            <th className="text-left py-2 px-3 text-xs font-medium text-[var(--text-secondary)]">${toCamelCase(f)}</th>`
  ).join('\n');

  const tableDataCells = viewFields.map(f => {
    const type = entityFieldType(entity, f);
    return `              <td className="py-2.5 px-3 text-sm">${fieldDisplayJsx(f, type, 'item')}</td>`;
  }).join('\n');

  const rowActionsHeader = (hasEdit || hasDelete) ? `\n            <th className="w-24"></th>` : '';
  const rowActionsJsx = (hasEdit || hasDelete) ? `
              <td className="py-2.5 px-3">
                <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition">
                  ${hasEdit ? `<button onClick={(e) => { e.stopPropagation(); setEditingId(item.id); setModalMode('edit'); setForm(${formSeedFromItem}); }} className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-[var(--bg-hover)] px-2 py-0.5 rounded transition">Edit</button>` : ''}
                  ${hasDelete ? `<button onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(item.id); }} className="text-xs text-red-400 hover:text-red-300 hover:bg-red-900/20 px-2 py-0.5 rounded transition">Delete</button>` : ''}
                </div>
              </td>` : '';

  const colSpan = viewFields.length + (hasEdit || hasDelete ? 1 : 0);
  const emptyMsg = hasCreate ? `No items yet. Click + New to create one.` : `No items yet.`;

  return `${imports}

export function ${view.name}() {
  const ${plural} = useAppStore((s) => s.${plural});
${loaderBlock}
${stateLines.join('\n')}

  useEffect(() => { load(); }, ${effectDeps});

  const filtered = search
    ? ${plural}.filter((i) => String(i.${primaryCamel} ?? '').toLowerCase().includes(search.toLowerCase()))
    : ${plural};
${handlerLines.join('')}
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 p-4 border-b border-[var(--border)] flex-shrink-0">
        <h2 className="text-lg font-semibold flex-shrink-0">${view.title ?? view.name}</h2>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search..."
          className="flex-1 bg-[var(--bg-hover)] border border-[var(--border)] rounded px-3 py-1.5 text-sm text-[var(--text-primary)] focus:outline-none focus:border-blue-500"
        />
        ${hasCreate ? `<button
          onClick={() => { setModalMode('create'); setForm({}); }}
          className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded transition flex-shrink-0"
        >+ New</button>` : ''}
      </div>
      <div className="flex-1 overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-[var(--bg-page)] z-10">
            <tr className="border-b border-[var(--border)]">
${tableHeaderCells}${rowActionsHeader}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={${colSpan}} className="text-center py-8 text-[var(--text-secondary)] text-sm">
                  {search ? 'No results.' : '${emptyMsg}'}
                </td>
              </tr>
            )}
            {filtered.map((item) => (
              <tr key={item.id} className="group border-b border-[var(--border)] hover:bg-[var(--bg-hover)] transition">
${tableDataCells}${rowActionsJsx}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      ${hasModal ? `{modalMode !== null && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={() => setModalMode(null)}>
          <div className="bg-[var(--bg-panel)] border border-[var(--border)] rounded-xl shadow-2xl w-96 p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-semibold mb-4">{modalMode === 'create' ? 'New ${name}' : 'Edit ${name}'}</h3>
${formFieldsJsx}
            <div className="flex justify-end gap-2 mt-4">
              <button onClick={() => setModalMode(null)} className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-[var(--bg-hover)] px-4 py-1.5 rounded transition">Cancel</button>
              <button onClick={${modalSubmitOnClick}} className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded transition">{modalMode === 'create' ? 'Create' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}` : ''}

      ${hasDelete ? `{confirmDeleteId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={() => setConfirmDeleteId(null)}>
          <div className="bg-[var(--bg-panel)] border border-[var(--border)] rounded-xl shadow-2xl w-72 p-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-semibold mb-2">Delete this ${name.toLowerCase()}?</h3>
            <p className="text-xs text-[var(--text-secondary)] mb-4">This action cannot be undone.</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setConfirmDeleteId(null)} className="text-xs text-[var(--text-secondary)] bg-[var(--bg-hover)] hover:text-[var(--text-primary)] px-3 py-1.5 rounded transition">Cancel</button>
              <button onClick={() => handleDelete(confirmDeleteId)} className="text-xs text-white bg-red-600 hover:bg-red-500 px-3 py-1.5 rounded transition">Delete</button>
            </div>
          </div>
        </div>
      )}` : ''}
    </div>
  );
}
`;
}

function generateSplitView(view: ViewDecl, entity: EntityDecl | undefined, ast: AgiFile): string {
  const name = entity?.name ?? 'Item';
  const camel = lcFirst(name);
  const plural = camel + 's';
  const entitySnake = toSnakeCase(name);

  const viewFields = view.fields.length > 0 ? view.fields : (entity?.fields.map(f => f.name) ?? []);
  const primaryField = viewFields[0] ?? 'id';
  const primaryCamel = toCamelCase(primaryField);
  const primaryType = entityFieldType(entity, primaryField);

  const hasCreate = view.actions.includes('create');
  const hasEdit = view.actions.includes('edit');
  const hasDelete = view.actions.includes('delete');
  const hasCrud = hasCreate || hasEdit || hasDelete;

  const parent = pickCurrentParent(entity, ast);
  const loaderBlock = parent
    ? `  const current${parent}Id = useAppStore((s) => s.current${parent}Id);\n  const load = useAppStore((s) => s.load${name}sForCurrent${parent});`
    : `  const load = useAppStore((s) => s.load${name}s);`;
  const effectDeps = parent ? `[current${parent}Id, load]` : `[]`;

  const editableFields = (entity?.fields ?? []).filter(f => !SKIP_FORM_FIELDS.has(f.name));

  const currents = new Set(ast.app.current ?? []);
  const fkParts = (entity?.relationships ?? [])
    .filter(r => r.type === 'BELONGS_TO')
    .map(r => {
      if (parent && r.target === parent) return `${lcFirst(r.target)}Id: current${r.target}Id ?? ''`;
      return `${lcFirst(r.target)}Id: 'default-user'`;
    });

  function buildInputObj(prefix: string): string {
    const parts = editableFields.map(f => {
      const c = toCamelCase(f.name);
      if (f.type === 'number' || f.type === 'float') return `${c}: Number(${prefix}${c}) || 0`;
      if (f.type === 'bool') return `${c}: ${prefix}${c} === 'true'`;
      return `${c}: ${prefix}${c} ?? ''`;
    });
    return [...parts, ...fkParts].join(', ');
  }

  const formSeedFromSelected = '{' + editableFields.map(f =>
    `${toCamelCase(f.name)}: String(selected.${toCamelCase(f.name)} ?? '')`
  ).join(', ') + '}';

  const imports = [
    `import { useEffect, useState } from 'react';`,
    hasCrud ? `import { invoke } from '@tauri-apps/api/core';` : null,
    `import { useAppStore } from '../store/appStore';`,
  ].filter(Boolean).join('\n');

  const stateLines: string[] = [
    `  const [search, setSearch] = useState('');`,
  ];
  if (hasCrud) stateLines.push(`  const [form, setForm] = useState<Record<string, string>>({});`);
  if (hasCreate) stateLines.push(`  const [creating, setCreating] = useState(false);`);
  if (hasEdit) stateLines.push(`  const [editingId, setEditingId] = useState<string | null>(null);`);
  if (hasDelete) stateLines.push(`  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);`);

  const handlerLines: string[] = [];
  if (hasCreate) {
    handlerLines.push(`
  async function handleCreate() {
    try {
      await invoke('create_${entitySnake}', { input: { ${buildInputObj('form.')} } });
      await load();
      setCreating(false);
      setForm({});
    } catch (err) { console.error('Create failed:', err); }
  }`);
  }
  if (hasEdit) {
    handlerLines.push(`
  async function handleUpdate(id: string) {
    try {
      await invoke('update_${entitySnake}', { id, input: { ${buildInputObj('form.')} } });
      await load();
      setEditingId(null);
    } catch (err) { console.error('Update failed:', err); }
  }`);
  }
  if (hasDelete) {
    handlerLines.push(`
  async function handleDelete(id: string) {
    try {
      await invoke('delete_${entitySnake}', { id });
      if (selectedId === id) select(null);
      await load();
      setConfirmDeleteId(null);
    } catch (err) { console.error('Delete failed:', err); }
  }`);
  }

  const createFormFieldsJsx = editableFields.map(f => `            <div className="mb-2">
              <label className="block text-xs text-[var(--text-secondary)] mb-1">${toCamelCase(f.name)}</label>
              ${fieldFormInputJsx(f.name, f.type)}
            </div>`).join('\n');

  const editFormFieldsJsx = editableFields.map(f => `              <div className="mb-3">
                <label className="block text-xs text-[var(--text-secondary)] mb-1">${toCamelCase(f.name)}</label>
                ${fieldFormInputJsx(f.name, f.type)}
              </div>`).join('\n');

  const detailFieldsJsx = viewFields.map(f => {
    const type = entityFieldType(entity, f);
    return `              <div className="flex items-start gap-3 py-2.5 border-b border-[var(--border)]/40 last:border-0">
                <span className="text-[var(--text-secondary)] text-xs w-32 flex-shrink-0 pt-0.5">${toCamelCase(f)}</span>
                <div className="text-sm flex-1 min-w-0">${fieldDisplayJsx(f, type, 'selected')}</div>
              </div>`;
  }).join('\n');

  const listSecondaryJsx = viewFields.slice(1, 3).map(f => {
    const type = entityFieldType(entity, f);
    return `                <div className="flex items-center gap-1">${fieldDisplayJsx(f, type, 'item')}</div>`;
  }).join('\n');

  const detailActionBtns: string[] = [];
  if (hasEdit) detailActionBtns.push(`{editingId !== selected.id && <button onClick={() => { setEditingId(selected.id); setForm(${formSeedFromSelected}); }} className="text-xs bg-[var(--bg-hover)] hover:bg-[var(--bg-active)] text-[var(--text-primary)] px-3 py-1.5 rounded transition">Edit</button>}`);
  if (hasDelete) {
    const deleteBtn = `<button onClick={() => setConfirmDeleteId(selected.id)} className="text-xs text-red-400 hover:text-red-300 hover:bg-red-900/20 px-3 py-1.5 rounded transition">Delete</button>`;
    detailActionBtns.push(hasEdit ? `{editingId !== selected.id && ${deleteBtn}}` : deleteBtn);
  }

  const detailActionsJsx = detailActionBtns.length > 0
    ? `\n            <div className="flex gap-2 mb-4">\n              ${detailActionBtns.join('\n              ')}\n            </div>`
    : '';

  const detailBodyJsx = hasEdit ? `
            {editingId === selected.id ? (
              <div>
${editFormFieldsJsx}
                <div className="flex gap-2 mt-4">
                  <button onClick={() => handleUpdate(selected.id)} className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded transition">Save</button>
                  <button onClick={() => setEditingId(null)} className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-[var(--bg-hover)] px-3 py-1.5 rounded transition">Cancel</button>
                </div>
              </div>
            ) : (
              <div>
${detailFieldsJsx}
              </div>
            )}` : `
            <div>
${detailFieldsJsx}
            </div>`;

  const listItemDeleteBtn = hasDelete ? `
              <button
                onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(item.id); }}
                className="opacity-0 group-hover:opacity-100 text-[var(--text-secondary)] hover:text-red-400 p-0.5 rounded hover:bg-[var(--bg-hover)] transition flex-shrink-0 text-xs ml-1"
                title="Delete"
              >✕</button>` : '';

  const noItemsMsg = hasCreate ? `No items. Click + to create.` : `No items yet.`;

  return `${imports}

export function ${view.name}() {
  const ${plural} = useAppStore((s) => s.${plural});
  const selectedId = useAppStore((s) => s.selected${name}Id);
  const select = useAppStore((s) => s.select${name});
${loaderBlock}
${stateLines.join('\n')}

  useEffect(() => { load(); }, ${effectDeps});

  const selected = ${plural}.find((i) => i.id === selectedId) ?? null;
  const filtered = search
    ? ${plural}.filter((i) => String(i.${primaryCamel} ?? '').toLowerCase().includes(search.toLowerCase()))
    : ${plural};
${handlerLines.join('')}
  return (
    <div className="flex h-full relative">
      {/* List pane */}
      <div className="w-64 border-r border-[var(--border)] flex flex-col flex-shrink-0">
        <div className="flex items-center gap-1 p-2 border-b border-[var(--border)]">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search..."
            className="flex-1 bg-[var(--bg-hover)] border border-[var(--border)] rounded px-2 py-1 text-xs text-[var(--text-primary)] focus:outline-none focus:border-blue-500"
          />
          ${hasCreate ? `<button
            onClick={() => { setCreating(true); setForm({}); }}
            className="w-6 h-6 flex items-center justify-center rounded hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-lg leading-none flex-shrink-0"
            title="New"
          >+</button>` : ''}
        </div>
        ${hasCreate ? `{creating && (
          <div className="border-b border-[var(--border)] p-3 bg-[var(--bg-panel)]/50">
${createFormFieldsJsx}
            <div className="flex gap-2 mt-2">
              <button onClick={handleCreate} className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded transition">Create</button>
              <button onClick={() => { setCreating(false); setForm({}); }} className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] px-2 py-1 rounded transition">Cancel</button>
            </div>
          </div>
        )}` : ''}
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 && (
            <p className="text-xs text-[var(--text-secondary)] px-3 py-4 text-center">
              {search ? 'No results.' : '${noItemsMsg}'}
            </p>
          )}
          {filtered.map((item) => (
            <div
              key={item.id}
              onClick={() => select(item.id)}
              className={\`group flex items-center gap-1 px-3 py-2 cursor-pointer border-b border-[var(--border)] \${item.id === selectedId ? 'bg-[var(--bg-active)]' : 'hover:bg-[var(--bg-hover)]'}\`}
            >
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">${fieldDisplayJsx(primaryField, primaryType, 'item')}</div>
${listSecondaryJsx}
              </div>
${listItemDeleteBtn}
            </div>
          ))}
        </div>
      </div>

      {/* Detail pane */}
      <div className="flex-1 p-6 overflow-y-auto">
        {selected ? (
          <div>${detailActionsJsx}${detailBodyJsx}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-[var(--text-secondary)] text-sm">Select an item to view details</p>
          </div>
        )}
      </div>

      ${hasDelete ? `{confirmDeleteId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={() => setConfirmDeleteId(null)}>
          <div className="bg-[var(--bg-panel)] border border-[var(--border)] rounded-xl shadow-2xl w-72 p-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-semibold mb-2">Delete this item?</h3>
            <p className="text-xs text-[var(--text-secondary)] mb-4">This action cannot be undone.</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setConfirmDeleteId(null)} className="text-xs text-[var(--text-secondary)] bg-[var(--bg-hover)] hover:text-[var(--text-primary)] px-3 py-1.5 rounded transition">Cancel</button>
              <button onClick={() => handleDelete(confirmDeleteId)} className="text-xs text-white bg-red-600 hover:bg-red-500 px-3 py-1.5 rounded transition">Delete</button>
            </div>
          </div>
        </div>
      )}` : ''}
    </div>
  );
}
`;
}

function generateCardsView(view: ViewDecl, entity: EntityDecl | undefined, ast: AgiFile): string {
  const name = entity?.name ?? 'Item';
  const camel = lcFirst(name);
  const plural = camel + 's';
  const fields = view.fields.length > 0
    ? view.fields
    : entity?.fields.map(f => f.name) ?? [];

  const parent = pickCurrentParent(entity, ast);
  const loaderReads = parent
    ? `  const current${parent}Id = useAppStore((s) => s.current${parent}Id);
  const load = useAppStore((s) => s.load${name}sForCurrent${parent});`
    : `  const load = useAppStore((s) => s.load${name}s);`;
  const effectDeps = parent ? `[current${parent}Id, load]` : `[]`;

  return `import { useEffect } from 'react';
import { useAppStore } from '../store/appStore';

export function ${view.name}() {
  const ${plural} = useAppStore((s) => s.${plural});
${loaderReads}

  useEffect(() => { load(); }, ${effectDeps});

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

/**
 * Find the entity that is likely the "chat message" entity — it has
 * BELONGS_TO toward a CURRENT entity. Used to wire ChatView generation.
 */
function findChatMessageEntity(ast: AgiFile): EntityDecl | undefined {
  const currentNames = new Set(ast.app.current ?? []);
  return ast.entities.find(e =>
    e.relationships.some(r => r.type === 'BELONGS_TO' && currentNames.has(r.target)) &&
    e.fields.some(f => f.name === 'user_message' || f.name === 'userMessage' || f.name === 'ai_message')
  );
}

function generateViewComponent(view: ViewDecl, entity: EntityDecl | undefined, ast: AgiFile): string {
  // Detect AI chat view: no entity, AI_SERVICE declared, and a chat-message entity
  // exists that BELONGS_TO a CURRENT entity. Convention: view name ends with "Chat".
  const hasAiService = ast.aiService !== null && ast.aiService !== undefined;
  if (view.layout === 'custom' && !view.entity && hasAiService && view.name.toLowerCase().includes('chat')) {
    const msgEntity = findChatMessageEntity(ast);
    if (msgEntity) return generateAiChatView(view, msgEntity, ast);
  }

  switch (view.layout) {
    case 'table':           return generateTableView(view, entity, ast);
    case 'split':           return generateSplitView(view, entity, ast);
    case 'cards':           return generateCardsView(view, entity, ast);
    case 'document_editor': return generateDocumentEditorView(view, entity, ast);
    case 'settings':        return generateSettingsView(view, ast);
    case 'form':
    case 'detail':
    case 'custom':
    default:                return generateCustomView(view);
  }
}

function generateDocumentEditorView(view: ViewDecl, entity: EntityDecl | undefined, ast: AgiFile): string {
  const entityName = entity?.name ?? 'Document';
  const entityCamel = entityName.charAt(0).toLowerCase() + entityName.slice(1);
  const entitySnake = toSnakeCase(entityName);
  const entityPlural = entityCamel + 's';
  const loadAction = `load${entityName}s`;
  const titleField = entity?.fields.find(f => f.name === 'title' || f.name === 'name')?.name ?? 'title';
  const titleCamel = toCamelCase(titleField);

  return `import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { FileText, Plus, Trash2 } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { MarkdownRenderer } from './MarkdownRenderer';
import type { ${entityName} } from '../lib/types';

export function ${view.name}() {
  const ${entityPlural} = useAppStore((s) => s.${entityPlural});
  const ${loadAction} = useAppStore((s) => s.${loadAction});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [draft${entityName}Title, setDraft${entityName}Title] = useState('');

  useEffect(() => { ${loadAction}(); }, []);

  const selected = ${entityPlural}.find((d) => d.id === selectedId) ?? null;

  useEffect(() => {
    if (selected) setDraft${entityName}Title(selected.${titleCamel});
  }, [selected]);

  async function handleNew() {
    const name = \`Untitled \${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}\`;
    try {
      await invoke('create_${entitySnake}', { input: { ${titleCamel}: name, filePath: name, language: 'markdown' } });
      await ${loadAction}();
    } catch (err) { console.error('Create failed:', err); }
  }

  async function handleDelete(id: string) {
    try {
      await invoke('delete_${entitySnake}', { id });
      await ${loadAction}();
      if (selectedId === id) setSelectedId(null);
    } catch (err) { console.error('Delete failed:', err); }
  }

  async function handleSave() {
    if (!selected) return;
    try {
      await invoke('update_${entitySnake}', { id: selected.id, input: { ${titleCamel}: draft${entityName}Title } });
      await ${loadAction}();
      setEditing(false);
    } catch (err) { console.error('Save failed:', err); }
  }

  return (
    <div className="flex flex-1 overflow-hidden">
      <aside className="w-64 border-r border-slate-700 bg-slate-900/40 flex flex-col flex-shrink-0">
        <div className="px-3 py-3 border-b border-slate-700 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">${view.title ?? view.name}</h2>
          <button onClick={handleNew} className="text-gray-400 hover:text-white p-1 rounded hover:bg-slate-700 transition" title="New">
            <Plus size={14} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto py-2">
          {${entityPlural}.length === 0 && (
            <p className="text-xs text-gray-600 px-3 py-4 text-center">No items yet.<br />Click + to create one.</p>
          )}
          {${entityPlural}.map((item) => (
            <${entityName}ListItem
              key={item.id}
              item={item}
              isActive={selectedId === item.id}
              onSelect={() => setSelectedId(item.id)}
              onDelete={() => handleDelete(item.id)}
            />
          ))}
        </div>
      </aside>
      <main className="flex-1 flex flex-col overflow-hidden">
        {selected ? (
          <>
            <div className="px-6 py-4 border-b border-slate-700 flex items-center justify-between">
              {editing ? (
                <input
                  type="text"
                  value={draft${entityName}Title}
                  onChange={(e) => setDraft${entityName}Title(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setEditing(false); }}
                  className="flex-1 bg-slate-700 border border-blue-500 rounded px-3 py-1.5 text-sm text-white focus:outline-none mr-3"
                  autoFocus
                />
              ) : (
                <h2 className="text-lg font-semibold text-white cursor-pointer" onClick={() => setEditing(true)}>{selected.${titleCamel}}</h2>
              )}
              <div className="flex items-center gap-2">
                {editing ? (
                  <>
                    <button onClick={handleSave} className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded transition">Save</button>
                    <button onClick={() => setEditing(false)} className="text-xs text-gray-400 hover:text-white px-2 py-1 rounded transition">Cancel</button>
                  </>
                ) : (
                  <button onClick={() => setEditing(true)} className="text-xs text-gray-400 hover:text-white px-2 py-1 rounded transition">Edit Title</button>
                )}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6 max-w-4xl">
              <MarkdownRenderer content={\`# \${selected.${titleCamel}}\`} />
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <FileText size={32} className="text-gray-600 mx-auto mb-3" />
              <p className="text-sm text-gray-500">Select a document to view</p>
              <p className="text-xs text-gray-700 mt-1">or click + to create a new one</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function ${entityName}ListItem({ item, isActive, onSelect, onDelete }: {
  item: ${entityName}; isActive: boolean; onSelect: () => void; onDelete: () => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  if (confirmDelete) {
    return (
      <div className="px-2 py-1.5 bg-red-900/20 border border-red-800/30 rounded mx-1 mb-0.5">
        <p className="text-xs text-red-300 mb-1.5 truncate">Delete "{item.${titleCamel}}"?</p>
        <div className="flex gap-1">
          <button onClick={onDelete} className="text-xs text-white bg-red-600 hover:bg-red-700 px-2 py-0.5 rounded transition">Delete</button>
          <button onClick={() => setConfirmDelete(false)} className="text-xs text-gray-400 bg-slate-700 hover:bg-slate-600 px-2 py-0.5 rounded transition">Cancel</button>
        </div>
      </div>
    );
  }
  return (
    <div
      onClick={onSelect}
      className={\`group flex items-center gap-2 px-2 py-1.5 rounded mx-1 mb-0.5 cursor-pointer transition \${
        isActive ? 'bg-blue-600/20 text-blue-200' : 'text-gray-300 hover:bg-slate-700/50 hover:text-white'
      }\`}
    >
      <FileText size={14} className="flex-shrink-0 opacity-60" />
      <span className="text-sm flex-1 truncate">{item.${titleCamel}}</span>
      <button
        onClick={(e) => { e.stopPropagation(); setConfirmDelete(true); }}
        className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400 p-0.5 rounded hover:bg-slate-600 transition"
        title="Delete"
      >
        <Trash2 size={11} />
      </button>
    </div>
  );
}
`;
}

function generateSettingsView(view: ViewDecl, ast: AgiFile): string {
  const hasAiService = ast.aiService !== null && ast.aiService !== undefined;
  const appTitle = ast.app.title;

  // Build provider list from AI_SERVICE declaration
  const providers = hasAiService
    ? (ast.aiService!.providers ?? []).filter((p: any) => typeof p === 'string' ? true : p)
    : [];

  const providerEntries = providers.map((p: string) => {
    const meta = providerMeta(p);
    return `  { id: '${p}', label: '${meta.label}', placeholder: '${meta.placeholder}', url: '${meta.url}' }`;
  });

  const providersBlock = providerEntries.length > 0
    ? `const PROVIDERS = [\n${providerEntries.join(',\n')},\n];`
    : `const PROVIDERS: Array<{ id: string; label: string; placeholder: string; url: string }> = [];`;

  const keysFileHint = hasAiService ? (ast.aiService as any).keysFile ?? '%APPDATA%/app/api-keys.json' : '';
  const dbName = toSnakeCase(ast.app.name);

  return `import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Key, Database, Info } from 'lucide-react';

${providersBlock}

export function ${view.name}() {
  const [keys, setKeys] = useState<Record<string, string>>({});
  const [maskedKeys, setMaskedKeys] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  useEffect(() => { loadKeys(); }, []);

  async function loadKeys() {
    try {
      const masked = await invoke<Record<string, string>>('get_api_keys');
      setMaskedKeys(masked);
    } catch (err) { console.error('Load keys failed:', err); }
  }

  async function handleSave(provider: string) {
    const key = keys[provider]?.trim() ?? '';
    try {
      await invoke('set_api_key', { provider, key });
      setEditing(null);
      setKeys((prev) => ({ ...prev, [provider]: '' }));
      setSaved(provider);
      setTimeout(() => setSaved(null), 2000);
      await loadKeys();
    } catch (err) { console.error('Save key failed:', err); }
  }

  async function handleRemove(provider: string) {
    try {
      await invoke('set_api_key', { provider, key: '' });
      await loadKeys();
    } catch (err) { console.error('Remove key failed:', err); }
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 max-w-3xl mx-auto w-full">
      <h2 className="text-xl font-semibold text-white mb-6">Settings</h2>
      {PROVIDERS.length > 0 && (
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <Key size={16} className="text-blue-400" />
            <h3 className="text-sm font-medium text-white">API Keys</h3>
          </div>
          <p className="text-xs text-gray-500 mb-4">
            Stored locally in <code className="bg-slate-800 px-1.5 py-0.5 rounded">${keysFileHint}</code>.
            Never sent anywhere except the provider you're calling.
          </p>
          <div className="space-y-3">
            {PROVIDERS.map((p) => {
              const isEditing = editing === p.id;
              const hasKey = Boolean(maskedKeys[p.id]);
              return (
                <div key={p.id} className="bg-slate-800/60 border border-slate-700 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm text-gray-200 font-medium">{p.label}</label>
                    <a href={p.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:text-blue-300 transition">Get key →</a>
                  </div>
                  {isEditing ? (
                    <div className="flex gap-2">
                      <input
                        type="password"
                        value={keys[p.id] || ''}
                        onChange={(e) => setKeys((prev) => ({ ...prev, [p.id]: e.target.value }))}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleSave(p.id); if (e.key === 'Escape') setEditing(null); }}
                        placeholder={p.placeholder}
                        className="flex-1 bg-slate-700 border border-slate-600 rounded px-3 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                        autoFocus
                      />
                      <button onClick={() => handleSave(p.id)} className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded transition">Save</button>
                      <button onClick={() => setEditing(null)} className="text-sm text-gray-400 hover:text-white px-3 py-1.5 rounded transition">Cancel</button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <code className="flex-1 text-xs text-gray-400 bg-slate-900/50 px-3 py-1.5 rounded">
                        {hasKey ? maskedKeys[p.id] : 'Not configured'}
                      </code>
                      <button onClick={() => setEditing(p.id)} className="text-xs bg-slate-700 hover:bg-slate-600 text-gray-300 hover:text-white px-3 py-1.5 rounded transition">
                        {hasKey ? 'Update' : 'Add Key'}
                      </button>
                      {hasKey && (
                        <button onClick={() => handleRemove(p.id)} className="text-xs text-red-400 hover:text-red-300 px-2 py-1.5 rounded transition" title="Remove">Remove</button>
                      )}
                      {saved === p.id && <span className="text-xs text-green-400">✓ Saved</span>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}
      <section className="mb-8">
        <div className="flex items-center gap-2 mb-3">
          <Database size={16} className="text-purple-400" />
          <h3 className="text-sm font-medium text-white">Database</h3>
        </div>
        <div className="bg-slate-800/60 border border-slate-700 rounded-lg p-4 space-y-2 text-sm text-gray-300">
          <p><span className="text-gray-500">File:</span> <code className="bg-slate-900/50 px-1.5 py-0.5 rounded text-xs">${dbName}.db</code></p>
        </div>
      </section>
      <section>
        <div className="flex items-center gap-2 mb-3">
          <Info size={16} className="text-amber-400" />
          <h3 className="text-sm font-medium text-white">About</h3>
        </div>
        <div className="bg-slate-800/60 border border-slate-700 rounded-lg p-4 text-sm text-gray-300 space-y-1">
          <p><span className="text-gray-500">App:</span> ${appTitle}</p>
          <p><span className="text-gray-500">Framework:</span> Agicore</p>
          <p className="text-xs text-gray-500 pt-2 border-t border-slate-700/50 mt-2">
            Generated by Agicore DSL. <a href="https://github.com/Binary-Blender/agicore" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300">GitHub</a>
          </p>
        </div>
      </section>
    </div>
  );
}
`;
}

function generateAiChatView(view: ViewDecl, msgEntity: EntityDecl, ast: AgiFile): string {
  const appTitle = ast.app.title;
  const msgType = msgEntity.name;
  const msgCamel = msgType.charAt(0).toLowerCase() + msgType.slice(1);
  const msgSnake = toSnakeCase(msgType);
  const msgPlural = msgCamel + 's';

  // Find the parent CURRENT entity name (Session or equivalent)
  const currentNames = new Set(ast.app.current ?? []);
  const parentEntityName = msgEntity.relationships
    .find(r => r.type === 'BELONGS_TO' && currentNames.has(r.target))?.target ?? 'Session';
  const currentIdField = `current${parentEntityName}Id`;
  const loadAction = `load${msgType}sForCurrent${parentEntityName}`;

  return `import { useEffect, useRef, useState, useCallback } from 'react';
import { useAppStore } from '../store/appStore';
import { MarkdownRenderer } from './MarkdownRenderer';
import { ContextBar } from './ContextBar';
import { MessageInput } from './MessageInput';
import { SearchBar } from './SearchBar';
import { TagPicker } from './TagPicker';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import type { ${msgType} } from '../lib/types';

interface StreamDelta { requestId: string; delta: string; done: boolean; }

export function ${view.name}() {
  const ${msgPlural} = useAppStore((s) => s.${msgPlural});
  const ${loadAction} = useAppStore((s) => s.${loadAction});
  const folders = useAppStore((s) => s.folders);
  const tags = useAppStore((s) => s.tags);
  const sessions = useAppStore((s) => s.sessions);
  const ${currentIdField} = useAppStore((s) => s.${currentIdField});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [streamingContent, setStreamingContent] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<${msgType}[] | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [selectedFolderItems] = useState<string[]>([]);
  const [folderItemsMap] = useState<Record<string, any>>({});
  const selectedModel = useAppStore((s) => s.selectedModel);

  useEffect(() => { ${loadAction}(); }, [${currentIdField}, ${loadAction}]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [${msgPlural}, streamingContent, ${currentIdField}]);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.ctrlKey && e.key === 'f') { e.preventDefault(); setShowSearch((v) => !v); } };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const displayMessages = searchResults ?? ${msgPlural};

  const handleSend = useCallback(async (text: string) => {
    const requestId = crypto.randomUUID();
    setStreamingContent('');
    const unlisten = await listen<StreamDelta>('chat-stream', (event) => {
      const { requestId: rid, delta, done } = event.payload;
      if (rid !== requestId || done) return;
      setStreamingContent((prev) => (prev ?? '') + delta);
    });
    try {
      const history = [...${msgPlural}]
        .filter((m) => !m.isExcluded && !m.isArchived)
        .flatMap((m) => [
          { role: 'user', content: m.userMessage },
          { role: 'assistant', content: m.aiMessage },
        ]);
      const response = await invoke<{
        content: string; model: string; provider: string;
        inputTokens: number; outputTokens: number;
      }>('send_chat', { request: { messages: [...history, { role: 'user', content: text }], model: selectedModel }, requestId });
      await invoke('create_${msgSnake}', {
        input: {
          userMessage: text,
          aiMessage: response.content,
          userTokens: response.inputTokens || Math.ceil(text.length / 4),
          aiTokens: response.outputTokens || Math.ceil(response.content.length / 4),
          totalTokens: (response.inputTokens || 0) + (response.outputTokens || 0),
          model: response.model,
          provider: response.provider,
          userId: 'default-user',
          sessionId: ${currentIdField},
        },
      });
      setStreamingContent(null);
      await ${loadAction}();
    } catch (err) {
      console.error('Send failed:', err);
      setStreamingContent(\`Error: \${err}\`);
      setTimeout(() => setStreamingContent(null), 5000);
    } finally { unlisten(); }
  }, [${loadAction}, ${msgPlural}, selectedModel, ${currentIdField}]);

  return (
    <div className="flex flex-col h-full">
      {showSearch && (
        <SearchBar
          onResults={(results) => setSearchResults(results)}
          onClear={() => setSearchResults(null)}
        />
      )}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {displayMessages.length === 0 && !streamingContent && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <h2 className="text-xl font-semibold text-gray-400 mb-2">${appTitle}</h2>
              <p className="text-sm text-gray-600">Built on Agicore. Start a conversation.</p>
              <p className="text-xs text-gray-700 mt-2">Ctrl+F to search</p>
            </div>
          </div>
        )}
        {displayMessages.map((msg) => (
          <${msgType}Item key={msg.id} message={msg} folders={folders} tags={tags} sessions={sessions} onRefresh={${loadAction}} />
        ))}
        {streamingContent && (
          <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-4">
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-full bg-purple-600 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">AI</div>
              <div className="flex-1 min-w-0">
                <MarkdownRenderer content={streamingContent} />
                <span className="inline-block w-2 h-4 bg-purple-400 animate-pulse ml-0.5" />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <ContextBar selectedFolderItems={selectedFolderItems} folderItemsMap={folderItemsMap} onRemove={() => {}} />
      <MessageInput onSend={handleSend} />
    </div>
  );
}

function ${msgType}Item({ message, folders, tags: _tags, sessions, onRefresh }: {
  message: ${msgType}; folders: any[]; tags: any[]; sessions: any[];
  onRefresh: () => Promise<void>;
}) {
  const [copied, setCopied] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showFolderPicker, setShowFolderPicker] = useState(false);
  const [showTagPicker, setShowTagPicker] = useState(false);
  const [showMovePicker, setShowMovePicker] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [savedFolderId, setSavedFolderId] = useState<string | null>(null);

  const ts = new Date(message.createdAt);
  const timeStr = ts.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const contextTokens = Math.ceil(message.userMessage.length / 4) + message.aiTokens;

  async function handleCopy() {
    await navigator.clipboard.writeText(message.aiMessage);
    setCopied(true); setTimeout(() => setCopied(false), 1500);
  }
  async function handleToggleExclude() {
    await invoke('update_${msgSnake}', { id: message.id, input: { isExcluded: !message.isExcluded } });
    await onRefresh(); setMenuOpen(false);
  }
  async function handleToggleArchive() {
    await invoke('update_${msgSnake}', { id: message.id, input: { isArchived: !message.isArchived } });
    await onRefresh(); setMenuOpen(false);
  }
  async function handleDelete() {
    await invoke('delete_${msgSnake}', { id: message.id }); await onRefresh();
  }
  async function handleSaveToFolder(folderId: string) {
    try {
      await invoke('create_folder_item', { input: { content: message.aiMessage, tokens: message.aiTokens, itemType: 'ai-response', folderId } });
      setSavedFolderId(folderId); setShowFolderPicker(false); setMenuOpen(false);
      setTimeout(() => setSavedFolderId(null), 2000);
    } catch (err) { console.error('Save to folder failed:', err); }
  }
  async function handleMoveToSession(targetSessionId: string) {
    await invoke('update_${msgSnake}', { id: message.id, input: { sessionId: targetSessionId } });
    await onRefresh(); setShowMovePicker(false); setMenuOpen(false);
  }

  return (
    <>
      {showTagPicker && <TagPicker messageId={message.id} onClose={() => setShowTagPicker(false)} onTagged={onRefresh} />}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={() => setConfirmDelete(false)}>
          <div className="bg-slate-800 rounded-xl border border-slate-700 shadow-2xl w-[22rem] p-5" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-sm font-semibold text-white mb-2">Delete Message?</h2>
            <p className="text-xs text-gray-400 mb-4">This message will be permanently deleted.</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setConfirmDelete(false)} className="text-xs text-gray-400 hover:text-white bg-slate-700 hover:bg-slate-600 px-3 py-1.5 rounded transition">Cancel</button>
              <button onClick={handleDelete} className="text-xs text-white bg-red-600 hover:bg-red-500 px-3 py-1.5 rounded transition">Delete</button>
            </div>
          </div>
        </div>
      )}
      <div className={\`group relative rounded-xl border transition-all \${
        message.isArchived ? 'opacity-40 border-slate-700 bg-slate-800/30'
          : message.isExcluded ? 'opacity-60 border-slate-700 bg-slate-800/40 border-dashed'
          : message.isPruned ? 'opacity-45 border-orange-700/40 bg-slate-800/30 border-dashed'
          : 'border-slate-700 bg-slate-800/60'
      }\`}>
        <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
          <button onClick={handleCopy} className="text-xs text-gray-500 hover:text-white bg-slate-700 px-2 py-0.5 rounded transition">
            {copied ? '✓' : 'Copy'}
          </button>
          <div className="relative">
            <button onClick={() => { setMenuOpen(!menuOpen); setShowFolderPicker(false); setShowMovePicker(false); }} className="text-gray-500 hover:text-white text-lg leading-none px-1 bg-slate-700 rounded transition">⋮</button>
            {menuOpen && (
              <div className="absolute right-0 top-full mt-1 bg-slate-700 border border-slate-600 rounded-lg shadow-xl z-10 w-48 py-1">
                <button onClick={handleToggleExclude} className="w-full text-left px-3 py-1.5 text-sm hover:bg-slate-600 transition">
                  {message.isExcluded ? '✓ Include in session' : '× Exclude from session'}
                </button>
                <button onClick={handleToggleArchive} className="w-full text-left px-3 py-1.5 text-sm hover:bg-slate-600 transition">
                  {message.isArchived ? '📤 Unarchive' : '📥 Archive'}
                </button>
                <hr className="border-slate-600 my-1" />
                <button onClick={() => { setShowTagPicker(true); setMenuOpen(false); }} className="w-full text-left px-3 py-1.5 text-sm hover:bg-slate-600 transition">Tag message</button>
                {folders.length > 0 && (
                  <>
                    <hr className="border-slate-600 my-1" />
                    <button onClick={() => setShowFolderPicker(!showFolderPicker)} className="w-full text-left px-3 py-1.5 text-sm hover:bg-slate-600 transition flex items-center justify-between">
                      <span>📁 Save to folder</span><span className="text-gray-400 text-xs">{showFolderPicker ? '▲' : '▶'}</span>
                    </button>
                    {showFolderPicker && (
                      <div className="bg-slate-800 border-t border-slate-600">
                        {folders.map((folder) => (
                          <button key={folder.id} onClick={() => handleSaveToFolder(folder.id)} className="w-full text-left px-4 py-1.5 text-sm text-blue-300 hover:bg-slate-600 transition">{folder.name}</button>
                        ))}
                      </div>
                    )}
                  </>
                )}
                {sessions.length > 1 && (
                  <>
                    <hr className="border-slate-600 my-1" />
                    <button onClick={() => setShowMovePicker(!showMovePicker)} className="w-full text-left px-3 py-1.5 text-sm hover:bg-slate-600 transition flex items-center justify-between">
                      <span>Move to...</span><span className="text-gray-400 text-xs">{showMovePicker ? '▲' : '▶'}</span>
                    </button>
                    {showMovePicker && (
                      <div className="bg-slate-800 border-t border-slate-600 max-h-40 overflow-y-auto">
                        {sessions.map((s) => (
                          <button key={s.id} onClick={() => handleMoveToSession(s.id)} className="w-full text-left px-4 py-1.5 text-sm text-blue-300 hover:bg-slate-600 transition truncate">{s.name}</button>
                        ))}
                      </div>
                    )}
                  </>
                )}
                <hr className="border-slate-600 my-1" />
                <button onClick={() => { setConfirmDelete(true); setMenuOpen(false); }} className="w-full text-left px-3 py-1.5 text-sm text-red-400 hover:bg-slate-600 transition">Delete</button>
              </div>
            )}
          </div>
        </div>
        {menuOpen && <div className="fixed inset-0 z-0" onClick={() => { setMenuOpen(false); setShowFolderPicker(false); setShowMovePicker(false); }} />}
        <div className="p-4">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">U</div>
            <div className="flex-1 min-w-0"><p className="text-sm text-white leading-relaxed whitespace-pre-wrap break-words">{message.userMessage}</p></div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-full bg-purple-600 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">AI</div>
            <div className="flex-1 min-w-0"><MarkdownRenderer content={message.aiMessage} /></div>
          </div>
          <div className="flex items-center gap-3 mt-3 pt-3 border-t border-slate-700/50">
            <span className="text-xs text-gray-600">{timeStr}</span>
            <span className="text-xs text-gray-600 bg-slate-700/50 px-1.5 py-0.5 rounded">{message.model}</span>
            <span className="text-xs text-gray-600">~{contextTokens.toLocaleString()} tokens</span>
            {message.isPruned && <span className="text-xs text-orange-400 bg-orange-900/30 px-1.5 py-0.5 rounded">pruned</span>}
            {message.isExcluded && <span className="text-xs text-red-400 bg-red-900/30 px-1.5 py-0.5 rounded">excluded</span>}
            {message.isArchived && <span className="text-xs text-gray-500 bg-slate-700/50 px-1.5 py-0.5 rounded">archived</span>}
            {savedFolderId && <span className="text-xs text-green-400 bg-green-900/30 px-1.5 py-0.5 rounded">✓ saved</span>}
          </div>
        </div>
      </div>
    </>
  );
}
`;
}

function generateAppTsx(ast: AgiFile): string {
  const frameless = ast.app.window?.frameless ?? false;
  const imports = ast.views.map(v =>
    `import { ${v.name} } from './${v.name}';`
  ).join('\n');

  const cases = ast.views.map(v =>
    `      case '${v.name}': return <${v.name} />;`
  ).join('\n');

  const titleBarImport = frameless ? `import { TitleBar } from './TitleBar';\n` : '';
  const titleBarJsx = frameless ? `      <TitleBar />\n` : '';

  return `import { useAppStore } from '../store/appStore';
import { Sidebar } from './Sidebar';
${titleBarImport}${imports}

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
${titleBarJsx}      <div className="flex flex-1 overflow-hidden">
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
  const hasAiService = ast.aiService !== null && ast.aiService !== undefined;
  const currentEntities = ast.app.current ?? [];
  const sessionEntityName = currentEntities.find(name =>
    ast.entities.some(e => e.name === name)
  );

  // When AI_SERVICE + a CURRENT session entity are declared, emit the full
  // session-management sidebar (create / rename / delete sessions + model picker).
  // Otherwise fall back to a generic icon nav rail.
  if (hasAiService && sessionEntityName) {
    return generateSessionSidebar(ast, sessionEntityName);
  }
  return generateNavRailSidebar(ast);
}

function generateSessionSidebar(ast: AgiFile, sessionEntity: string): string {
  const appTitle = ast.app.title;
  const camel = sessionEntity.charAt(0).toLowerCase() + sessionEntity.slice(1);
  const plural = camel + 's';
  const load = `load${sessionEntity}s`;
  const setCurrent = `setCurrent${sessionEntity}Id`;
  const currentId = `current${sessionEntity}Id`;

  return `import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Key, MessageSquare } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { useAppStore } from '../store/appStore';
import { ModelPicker } from './ModelPicker';
import { ApiKeyModal } from './ApiKeyModal';
import type { ${sessionEntity} } from '../lib/types';

interface ${sessionEntity}ItemProps {
  session: ${sessionEntity};
  isActive: boolean;
  onSelect: () => void;
  onRename: (name: string) => void;
  onDelete: () => void;
}

function ${sessionEntity}Item({ session, isActive, onSelect, onRename, onDelete }: ${sessionEntity}ItemProps) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(session.name);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (editing) {
    return (
      <div className="px-2 py-1">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { onRename(name); setEditing(false); }
            if (e.key === 'Escape') { setName(session.name); setEditing(false); }
          }}
          onBlur={() => { onRename(name); setEditing(false); }}
          className="w-full bg-slate-700 border border-blue-500 rounded px-2 py-1 text-sm text-white focus:outline-none"
          autoFocus
        />
      </div>
    );
  }

  if (confirmDelete) {
    return (
      <div className="px-2 py-1.5 bg-red-900/20 border border-red-800/30 rounded mx-1 mb-0.5">
        <p className="text-xs text-red-300 mb-1.5">Delete "{session.name}"?</p>
        <div className="flex gap-1">
          <button onClick={onDelete} className="text-xs text-white bg-red-600 hover:bg-red-700 px-2 py-0.5 rounded transition">Delete</button>
          <button onClick={() => setConfirmDelete(false)} className="text-xs text-gray-400 bg-slate-700 hover:bg-slate-600 px-2 py-0.5 rounded transition">Cancel</button>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={onSelect}
      className={\`group flex items-center gap-2 px-2 py-1.5 rounded mx-1 mb-0.5 cursor-pointer transition \${
        isActive ? 'bg-blue-600/20 text-blue-200' : 'text-gray-300 hover:bg-slate-700/50 hover:text-white'
      }\`}
    >
      <MessageSquare size={14} className="flex-shrink-0 opacity-60" />
      <span className="text-sm flex-1 truncate">{session.name}</span>
      <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition">
        <button
          onClick={(e) => { e.stopPropagation(); setEditing(true); }}
          className="text-gray-500 hover:text-white p-0.5 rounded hover:bg-slate-600 transition"
          title="Rename"
        >
          <Pencil size={11} />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); setConfirmDelete(true); }}
          className="text-gray-500 hover:text-red-400 p-0.5 rounded hover:bg-slate-600 transition"
          title="Delete"
        >
          <Trash2 size={11} />
        </button>
      </div>
    </div>
  );
}

export function Sidebar() {
  const ${plural} = useAppStore((s) => s.${plural});
  const ${load} = useAppStore((s) => s.${load});
  const ${currentId} = useAppStore((s) => s.${currentId});
  const ${setCurrent} = useAppStore((s) => s.${setCurrent});
  const [showApiKeys, setShowApiKeys] = useState(false);

  useEffect(() => { ${load}(); }, []);

  useEffect(() => {
    if (!${currentId} && ${plural}.length > 0) {
      ${setCurrent}(${plural}[0].id);
    }
  }, [${plural}, ${currentId}]);

  async function handleNew${sessionEntity}() {
    const name = \`New Session \${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}\`;
    try {
      await invoke('create_${camel}', { input: { name, userId: 'default-user' } });
      await ${load}();
    } catch (err) { console.error('Create ${camel} failed:', err); }
  }

  async function handleRename${sessionEntity}(id: string, name: string) {
    if (!name.trim()) return;
    try {
      await invoke('update_${camel}', { id, input: { name: name.trim() } });
      await ${load}();
    } catch (err) { console.error('Rename failed:', err); }
  }

  async function handleDelete${sessionEntity}(id: string) {
    try {
      await invoke('delete_${camel}', { id });
      await ${load}();
      if (${currentId} === id) ${setCurrent}(null);
    } catch (err) { console.error('Delete failed:', err); }
  }

  return (
    <>
      {showApiKeys && <ApiKeyModal onClose={() => setShowApiKeys(false)} />}
      <aside className="w-64 bg-slate-900/50 border-r border-slate-700 flex flex-col flex-shrink-0">
        <div className="px-3 py-3 border-b border-slate-700 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">${appTitle}</h2>
          <button
            onClick={() => setShowApiKeys(true)}
            className="text-gray-400 hover:text-white p-1 rounded hover:bg-slate-700 transition"
            title="API Keys"
          >
            <Key size={14} />
          </button>
        </div>
        <ModelPicker />
        <div className="flex-1 overflow-y-auto py-2">
          <div className="px-3 mb-1 flex items-center justify-between">
            <span className="text-xs text-gray-500 uppercase tracking-wide">Conversations</span>
            <button
              onClick={handleNew${sessionEntity}}
              className="text-gray-400 hover:text-white p-0.5 rounded hover:bg-slate-700 transition"
              title="New ${sessionEntity}"
            >
              <Plus size={14} />
            </button>
          </div>
          {${plural}.length === 0 && (
            <p className="text-xs text-gray-600 px-3 py-4 text-center">
              No conversations yet.<br />Click + to start one.
            </p>
          )}
          {${plural}.map((session) => (
            <${sessionEntity}Item
              key={session.id}
              session={session}
              isActive={${currentId} === session.id}
              onSelect={() => ${setCurrent}(session.id)}
              onRename={(name) => handleRename${sessionEntity}(session.id, name)}
              onDelete={() => handleDelete${sessionEntity}(session.id)}
            />
          ))}
        </div>
        <div className="px-3 py-2 border-t border-slate-700 text-xs text-gray-600">
          <span>Built on Agicore</span>
        </div>
      </aside>
    </>
  );
}
`;
}

function generateNavRailSidebar(ast: AgiFile): string {
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


/**
 * Emit `src/components/ApiKeyModal.tsx` — a small modal that lists every
 * provider declared in AI_SERVICE.providers, loads existing (masked) keys on
 * mount via `get_api_keys`, and saves changed entries via `set_api_key` on
 * click. Styling matches NovaSyn Chat's hand-written modal so the swap is a
 * visual no-op.
 */
function generateApiKeyModal(ast: AgiFile): string {
  const ai = ast.aiService;
  if (!ai) return '';

  const entries = ai.providers.map(p => {
    const meta = providerMeta(p);
    return `  { id: ${JSON.stringify(p)}, label: ${JSON.stringify(meta.label)}, placeholder: ${JSON.stringify(meta.placeholder)} },`;
  });

  return `import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';

const PROVIDERS = [
${entries.join('\n')}
];

export function ApiKeyModal({ onClose }: { onClose: () => void }) {
  const [keys, setKeys] = useState<Record<string, string>>({});

  useEffect(() => {
    // Existing keys come back masked from the Rust side (round-1 AI_SERVICE
    // codegen). We surface the masked form as the placeholder hint rather
    // than the input value so the user can tell which providers are already
    // configured without ever rendering the raw key.
    invoke<Record<string, string>>('get_api_keys')
      .then((existing) => setKeys((prev) => {
        const next = { ...prev };
        for (const [k, v] of Object.entries(existing)) {
          if (!(k in next)) next[k] = '';
          (next as Record<string, string>)['__existing_' + k] = v;
        }
        return next;
      }))
      .catch(() => { /* command may not exist yet — silent fail */ });
  }, []);

  async function handleSave() {
    for (const p of PROVIDERS) {
      const value = keys[p.id];
      if (value && value.trim()) {
        try {
          await invoke('set_api_key', { provider: p.id, key: value.trim() });
        } catch {
          // silent fail — keep the modal open if individual saves fail? for
          // now match the hand-written behavior and continue.
        }
      }
    }
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-slate-800 border border-slate-600 rounded-xl p-6 w-[480px] shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold mb-4">API Keys</h2>
        <p className="text-xs text-gray-400 mb-4">Stored locally via the AI_SERVICE keys file.</p>
        <div className="space-y-3">
          {PROVIDERS.map((p) => {
            const existing = (keys as Record<string, string>)['__existing_' + p.id];
            return (
              <div key={p.id}>
                <label className="text-sm text-gray-300 mb-1 block">
                  {p.label}
                  {existing ? <span className="text-xs text-gray-500 ml-2">(current: {existing})</span> : null}
                </label>
                <input
                  type="password"
                  className="w-full bg-slate-700 border border-slate-500 rounded px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                  placeholder={p.placeholder}
                  value={keys[p.id] ?? ''}
                  onChange={(e) => setKeys((prev) => ({ ...prev, [p.id]: e.target.value }))}
                />
              </div>
            );
          })}
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-300 hover:text-white transition">Cancel</button>
          <button onClick={handleSave} className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition">Save Keys</button>
        </div>
      </div>
    </div>
  );
}
`;
}

function generateTitleBar(ast: AgiFile): string {
  return `import { getCurrentWindow } from '@tauri-apps/api/window';

export function TitleBar() {
  const win = getCurrentWindow();

  return (
    <div
      data-tauri-drag-region
      className="h-9 bg-[var(--bg-titlebar)] flex items-center justify-between px-3 select-none shrink-0"
    >
      <span className="text-sm font-medium text-[var(--text-secondary)] pointer-events-none">
        ${ast.app.title}
      </span>
      <div className="flex items-center gap-1" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        <button
          onClick={() => win.minimize()}
          className="w-7 h-7 flex items-center justify-center rounded hover:bg-white/10 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          aria-label="Minimize"
        >
          <svg width="12" height="2" viewBox="0 0 12 2" fill="currentColor">
            <rect width="12" height="2" rx="1" />
          </svg>
        </button>
        <button
          onClick={() => win.toggleMaximize()}
          className="w-7 h-7 flex items-center justify-center rounded hover:bg-white/10 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          aria-label="Maximize"
        >
          <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="0.75" y="0.75" width="9.5" height="9.5" rx="1.25" />
          </svg>
        </button>
        <button
          onClick={() => win.close()}
          className="w-7 h-7 flex items-center justify-center rounded hover:bg-red-500/80 text-[var(--text-secondary)] hover:text-white transition-colors"
          aria-label="Close"
        >
          <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <line x1="1" y1="1" x2="10" y2="10" />
            <line x1="10" y1="1" x2="1" y2="10" />
          </svg>
        </button>
      </div>
    </div>
  );
}
`;
}

function generateWorkspaceSwitcher(ast: AgiFile): string {
  const dbName = ast.app.db;
  return `import { useEffect, useState, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { open, save } from '@tauri-apps/plugin-dialog';
import { FolderOpen, Plus, Database, ChevronDown } from 'lucide-react';

// WorkspaceSwitcher — switch the active SQLite database at runtime.
// Lists .db files in the same directory as the current DB via get_db_path,
// then calls switch_db with the chosen path.

export function WorkspaceSwitcher() {
  const [currentPath, setCurrentPath] = useState<string>('');
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const load = async () => {
    try {
      const path = await invoke<string>('get_db_path');
      setCurrentPath(path);
    } catch { /* command unavailable */ }
  };

  useEffect(() => { load(); }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const switchTo = async (path: string) => {
    try {
      await invoke<void>('switch_db', { newPath: path });
      setCurrentPath(path);
      setIsOpen(false);
      // Reload to re-initialize all stores with the new DB
      window.location.reload();
    } catch (e) {
      console.error('Failed to switch workspace:', e);
    }
  };

  const openExisting = async () => {
    const selected = await open({ multiple: false, filters: [{ name: 'Database', extensions: ['db'] }] });
    if (typeof selected === 'string') await switchTo(selected);
    setIsOpen(false);
  };

  const createNew = async () => {
    const dir = currentPath ? currentPath.split('/').slice(0, -1).join('/') : undefined;
    const path = await save({
      defaultPath: dir ? dir + '/workspace.db' : '${dbName.replace('.db', '')}_workspace.db',
      filters: [{ name: 'Database', extensions: ['db'] }],
    });
    if (path) await switchTo(path);
    setIsOpen(false);
  };

  const label = currentPath ? currentPath.split('/').pop() ?? currentPath : 'No workspace';

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setIsOpen(prev => !prev)}
        className="flex items-center gap-1.5 px-2 py-1 rounded text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/5 transition-colors"
        title={currentPath}
      >
        <Database size={13} className="shrink-0" />
        <span className="max-w-[120px] truncate">{label}</span>
        <ChevronDown size={11} className="shrink-0" />
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full mt-1 w-56 bg-[var(--bg-sidebar)] border border-[var(--border)] rounded-lg shadow-lg z-50 py-1 text-sm">
          {currentPath && (
            <div className="px-3 py-1.5 text-xs text-[var(--text-muted)] truncate border-b border-[var(--border)] mb-1">
              {currentPath}
            </div>
          )}
          <button
            onClick={openExisting}
            className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-white/5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            <FolderOpen size={13} />
            Open workspace…
          </button>
          <button
            onClick={createNew}
            className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-white/5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            <Plus size={13} />
            New workspace…
          </button>
        </div>
      )}
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
    files.set(`src/components/${view.name}.tsx`, generateViewComponent(view, entity, ast));
  }

  files.set('src/components/App.tsx', generateAppTsx(ast));
  files.set('src/components/Sidebar.tsx', generateSidebar(ast));
  if (ast.app.window?.frameless) {
    files.set('src/components/TitleBar.tsx', generateTitleBar(ast));
  }

  // Emit ModelPicker.tsx only when AI_SERVICE is declared — apps without an
  // AI service have no `selectedModel` slot in the store for the picker to
  // bind to, so emitting the file would be a type error in the user's app.
  // ApiKeyModal.tsx is also AI_SERVICE-gated: the Rust commands it invokes
  // (get_api_keys, set_api_key) only exist when ai_service.rs is generated.
  if (ast.aiService) {
    files.set('src/components/ModelPicker.tsx', generateModelPicker(ast));
    files.set('src/components/ApiKeyModal.tsx', generateApiKeyModal(ast));
  }

  // Emit WorkspaceSwitcher.tsx when WORKSPACES declared — UI for get_db_path / switch_db.
  if (ast.app.workspaces) {
    files.set('src/components/WorkspaceSwitcher.tsx', generateWorkspaceSwitcher(ast));
  }

  return files;
}
