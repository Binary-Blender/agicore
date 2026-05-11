// TypeScript Code Generator
// Generates types, invoke wrappers, and Zustand store from ENTITY/ACTION declarations

import type { AgiFile, EntityDecl, ActionDecl, FieldDef, AgiType } from '@agicore/parser';
import { toSnakeCase, toTableName, toCamelCase, toForeignKey, lcFirst } from '../naming.js';

function tsType(agiType: AgiType): string {
  switch (agiType) {
    case 'string':   return 'string';
    case 'number':   return 'number';
    case 'float':    return 'number';
    case 'bool':     return 'boolean';
    case 'date':     return 'string';
    case 'datetime': return 'string';
    case 'json':     return 'unknown';
    case 'id':       return 'string';
  }
}

const AGI_PRIMITIVES: ReadonlySet<string> = new Set([
  'string', 'number', 'float', 'bool', 'date', 'datetime', 'json', 'id',
]);

// Action input/output types may be either an AGI primitive OR an Entity name.
// Map primitives through tsType; pass entity names through unchanged.
function tsTypeOrEntity(t: string): string {
  return AGI_PRIMITIVES.has(t) ? tsType(t as AgiType) : t;
}

function isRequired(field: FieldDef): boolean {
  return field.modifiers.includes('REQUIRED') || field.defaultValue !== undefined;
}

// --- Type Generation ---

function generateInterface(entity: EntityDecl): string {
  const lines: string[] = [];
  lines.push(`export interface ${entity.name} {`);
  lines.push('  id: string;');

  for (const field of entity.fields) {
    const name = toCamelCase(field.name);
    const type = tsType(field.type);
    const optional = isRequired(field) ? '' : ' | null';
    lines.push(`  ${name}: ${type}${optional};`);
  }

  for (const rel of entity.relationships) {
    if (rel.type === 'BELONGS_TO') {
      lines.push(`  ${toCamelCase(toForeignKey(rel.target))}: string;`);
    }
  }

  if (entity.timestamps) {
    lines.push('  createdAt: string;');
    lines.push('  updatedAt: string;');
  }

  lines.push('}');
  return lines.join('\n');
}

function generateCreateInput(entity: EntityDecl): string {
  const lines: string[] = [];
  lines.push(`export interface Create${entity.name}Input {`);

  for (const field of entity.fields) {
    const name = toCamelCase(field.name);
    const type = tsType(field.type);
    const optional = field.modifiers.includes('REQUIRED') ? '' : '?';
    lines.push(`  ${name}${optional}: ${type};`);
  }

  for (const rel of entity.relationships) {
    if (rel.type === 'BELONGS_TO') {
      lines.push(`  ${toCamelCase(toForeignKey(rel.target))}: string;`);
    }
  }

  lines.push('}');
  return lines.join('\n');
}

function generateUpdateInput(entity: EntityDecl): string {
  const lines: string[] = [];
  lines.push(`export interface Update${entity.name}Input {`);

  for (const field of entity.fields) {
    const name = toCamelCase(field.name);
    const type = tsType(field.type);
    lines.push(`  ${name}?: ${type};`);
  }

  lines.push('}');
  return lines.join('\n');
}

export function generateTypes(ast: AgiFile): string {
  const sections: string[] = [
    '// Agicore Generated TypeScript Types',
    `// App: ${ast.app.name}`,
    '',
  ];

  for (const entity of ast.entities) {
    sections.push(generateInterface(entity));
    sections.push('');
    sections.push(generateCreateInput(entity));
    sections.push('');
    sections.push(generateUpdateInput(entity));
    sections.push('');
  }

  return sections.join('\n');
}

// --- Invoke Wrapper Generation ---

function generateEntityInvokes(entity: EntityDecl, ast: AgiFile): string {
  const snake = toSnakeCase(entity.name);
  const table = toTableName(entity.name);
  const name = entity.name;
  const lines: string[] = [];

  const ops = entity.crud === 'full'
    ? ['list', 'create', 'read', 'update', 'delete']
    : entity.crud;

  const currentEntities = ast.app.current ?? [];

  if (ops.includes('list')) {
    lines.push(`export const list${name}s = () =>`);
    lines.push(`  invoke<${name}[]>('list_${table}');`);
    lines.push('');

    // Filtered list per BELONGS_TO target that's in APP CURRENT — calls the
    // SQL-pushdown variant emitted by the Rust generator.
    for (const rel of entity.relationships) {
      if (rel.type !== 'BELONGS_TO') continue;
      if (!currentEntities.includes(rel.target)) continue;
      const parentSnake = toSnakeCase(rel.target);
      const parentCamel = toCamelCase(parentSnake);
      const parentName = rel.target;
      lines.push(`export const list${name}sBy${parentName} = (${parentCamel}Id: string) =>`);
      lines.push(`  invoke<${name}[]>('list_${table}_by_${parentSnake}', { ${parentCamel}Id });`);
      lines.push('');
    }
  }
  if (ops.includes('create')) {
    lines.push(`export const create${name} = (input: Create${name}Input) =>`);
    lines.push(`  invoke<${name}>('create_${snake}', { input });`);
    lines.push('');
  }
  if (ops.includes('read')) {
    lines.push(`export const get${name} = (id: string) =>`);
    lines.push(`  invoke<${name}>('get_${snake}', { id });`);
    lines.push('');
  }
  if (ops.includes('update')) {
    lines.push(`export const update${name} = (id: string, input: Update${name}Input) =>`);
    lines.push(`  invoke<${name}>('update_${snake}', { id, input });`);
    lines.push('');
  }
  if (ops.includes('delete')) {
    lines.push(`export const delete${name} = (id: string) =>`);
    lines.push(`  invoke<void>('delete_${snake}', { id });`);
    lines.push('');
  }

  return lines.join('\n');
}

function generateActionInvoke(action: ActionDecl): string {
  const lines: string[] = [];
  const fnName = toCamelCase(action.name);
  const params = action.input.map(p => {
    const optional = p.defaultValue !== undefined ? '?' : '';
    return `${toCamelCase(p.name)}${optional}: ${tsTypeOrEntity(p.type)}`;
  }).join(', ');

  const returnType = action.output.length > 0
    ? action.output.map(o => tsTypeOrEntity(o.type)).join(' & ')
    : 'void';

  const argObj = action.input.map(p => toCamelCase(p.name)).join(', ');

  lines.push(`export const ${fnName} = (${params}) =>`);
  lines.push(`  invoke<${returnType}>('${action.name}', { ${argObj} });`);
  lines.push('');
  return lines.join('\n');
}

export function generateInvokes(ast: AgiFile): string {
  const lines: string[] = [
    '// Agicore Generated Invoke Wrappers',
    `// App: ${ast.app.name}`,
    '',
    "import { invoke } from '@tauri-apps/api/core';",
    "import type {",
    ...ast.entities.flatMap(e => [
      `  ${e.name}, Create${e.name}Input, Update${e.name}Input,`,
    ]),
    "} from './types';",
    '',
  ];

  for (const entity of ast.entities) {
    lines.push(`// --- ${entity.name} ---`);
    lines.push(generateEntityInvokes(entity, ast));
  }

  for (const action of ast.actions) {
    lines.push(`// --- ${action.name} ---`);
    lines.push(generateActionInvoke(action));
  }

  return lines.join('\n');
}

// --- Zustand Store Generation ---

export function generateStore(ast: AgiFile): string {
  const lines: string[] = [
    '// Agicore Generated Zustand Store',
    `// App: ${ast.app.name}`,
    '',
    "import { create } from 'zustand';",
    "import type {",
    ...ast.entities.flatMap(e => [
      `  ${e.name}, Create${e.name}Input, Update${e.name}Input,`,
    ]),
    "} from '../lib/types';",
    "import {",
    ...ast.entities.flatMap(e => {
      const ops = e.crud === 'full' ? ['list', 'create', 'read', 'update', 'delete'] : e.crud;
      const fns: string[] = [];
      if (ops.includes('list')) {
        fns.push(`list${e.name}s`);
        // Pull in the by-<X> variant for any BELONGS_TO whose target is CURRENT.
        for (const rel of e.relationships) {
          if (rel.type !== 'BELONGS_TO') continue;
          if (!(ast.app.current ?? []).includes(rel.target)) continue;
          fns.push(`list${e.name}sBy${rel.target}`);
        }
      }
      if (ops.includes('create')) fns.push(`create${e.name}`);
      if (ops.includes('update')) fns.push(`update${e.name}`);
      if (ops.includes('delete')) fns.push(`delete${e.name}`);
      return [`  ${fns.join(', ')},`];
    }),
    "} from '../lib/api';",
    '',
  ];

  // Cross-component state slices that aren't tied to a single entity:
  //
  //  • selectedModel   — emitted when AI_SERVICE is declared. Seeds from the
  //                      model declared for the AI_SERVICE's DEFAULT provider.
  //                      Lives in the store (not local component state) so a
  //                      model picker in a sidebar and a chat composer in the
  //                      main pane stay in sync.
  //  • current<X>Id    — emitted for each entity listed in `APP { CURRENT … }`.
  //                      This is "active navigation context", distinct from
  //                      `selected<X>Id` (which is for list-picker UI).
  const ai = ast.aiService;
  let aiDefaultModel: string | undefined;
  if (ai && ai.defaultProvider) {
    // With multi-model MODELS blocks, each provider has its own DEFAULT entry
    // (either explicit or the first declared). Seed the store from the entry
    // matching the AI_SERVICE-level DEFAULT provider.
    const m = ai.models.find(
      mm => mm.provider === ai.defaultProvider && mm.isDefault
    );
    if (m) aiDefaultModel = m.id;
  }
  // Fall back to the first declared model if no DEFAULT was set, so the store
  // still has a sensible seed value rather than an empty string.
  if (ai && !aiDefaultModel && ai.models.length > 0) {
    aiDefaultModel = ai.models[0]!.id;
  }

  const currentEntities = ast.app.current ?? [];

  // Build the state interface
  lines.push('interface AppState {');
  lines.push("  currentView: string;");
  lines.push("  setCurrentView: (view: string) => void;");
  lines.push('');

  if (ai) {
    lines.push('  selectedModel: string;');
    lines.push('  setSelectedModel: (model: string) => void;');
    lines.push('');
  }

  for (const entityName of currentEntities) {
    // The store key is `current<PascalEntity>Id` — no camelCase conversion is
    // needed since entity names are already PascalCase by convention. The
    // `id` parameter in the setter accepts the underlying string id.
    lines.push(`  current${entityName}Id: string | null;`);
    lines.push(`  setCurrent${entityName}Id: (id: string | null) => void;`);
    lines.push('');
  }

  for (const entity of ast.entities) {
    const name = entity.name;
    const camel = lcFirst(name);
    const plural = camel + 's';
    lines.push(`  ${plural}: ${name}[];`);
    lines.push(`  selected${name}Id: string | null;`);
    lines.push(`  load${name}s: () => Promise<void>;`);
    // Filtered loader per CURRENT parent — reads currentXId from store state and
    // calls the SQL-pushdown variant when set, else falls back to clearing the list.
    for (const rel of entity.relationships) {
      if (rel.type !== 'BELONGS_TO') continue;
      if (!currentEntities.includes(rel.target)) continue;
      lines.push(`  load${name}sForCurrent${rel.target}: () => Promise<void>;`);
    }
    lines.push(`  add${name}: (input: Create${name}Input) => Promise<void>;`);
    lines.push(`  edit${name}: (id: string, input: Update${name}Input) => Promise<void>;`);
    lines.push(`  remove${name}: (id: string) => Promise<void>;`);
    lines.push(`  select${name}: (id: string | null) => void;`);
    lines.push('');
  }

  lines.push('}');
  lines.push('');

  // Build the store
  lines.push('export const useAppStore = create<AppState>((set, get) => ({');
  lines.push("  currentView: 'Dashboard',");
  lines.push("  setCurrentView: (view) => set({ currentView: view }),");
  lines.push('');

  if (ai) {
    const seed = aiDefaultModel ?? '';
    lines.push(`  selectedModel: '${seed}',`);
    lines.push('  setSelectedModel: (model) => set({ selectedModel: model }),');
    lines.push('');
  }

  for (const entityName of currentEntities) {
    lines.push(`  current${entityName}Id: null,`);
    lines.push(`  setCurrent${entityName}Id: (id) => set({ current${entityName}Id: id }),`);
    lines.push('');
  }

  for (const entity of ast.entities) {
    const name = entity.name;
    const camel = lcFirst(name);
    const plural = camel + 's';

    lines.push(`  ${plural}: [],`);
    lines.push(`  selected${name}Id: null,`);
    lines.push(`  load${name}s: async () => {`);
    lines.push(`    const ${plural} = await list${name}s();`);
    lines.push(`    set({ ${plural} });`);
    lines.push(`  },`);
    // Filtered loader: read currentXId from state via get(), call the by-X
    // variant when present, else clear the list (no parent → nothing to show).
    for (const rel of entity.relationships) {
      if (rel.type !== 'BELONGS_TO') continue;
      if (!currentEntities.includes(rel.target)) continue;
      const parentName = rel.target;
      lines.push(`  load${name}sForCurrent${parentName}: async () => {`);
      lines.push(`    const ${parentName.charAt(0).toLowerCase() + parentName.slice(1)}Id = get().current${parentName}Id;`);
      lines.push(`    if (${parentName.charAt(0).toLowerCase() + parentName.slice(1)}Id) {`);
      lines.push(`      const ${plural} = await list${name}sBy${parentName}(${parentName.charAt(0).toLowerCase() + parentName.slice(1)}Id);`);
      lines.push(`      set({ ${plural} });`);
      lines.push(`    } else {`);
      lines.push(`      set({ ${plural}: [] });`);
      lines.push(`    }`);
      lines.push(`  },`);
    }
    lines.push(`  add${name}: async (input) => {`);
    lines.push(`    await create${name}(input);`);
    lines.push(`    await get().load${name}s();`);
    lines.push(`  },`);
    lines.push(`  edit${name}: async (id, input) => {`);
    lines.push(`    await update${name}(id, input);`);
    lines.push(`    await get().load${name}s();`);
    lines.push(`  },`);
    lines.push(`  remove${name}: async (id) => {`);
    lines.push(`    await delete${name}(id);`);
    lines.push(`    await get().load${name}s();`);
    lines.push(`  },`);
    lines.push(`  select${name}: (id) => set({ selected${name}Id: id }),`);
    lines.push('');
  }

  lines.push('}));');
  lines.push('');

  return lines.join('\n');
}

// --- Combined TypeScript Output ---

export function generateTypeScript(ast: AgiFile): Map<string, string> {
  const files = new Map<string, string>();
  files.set('src/lib/types.ts', generateTypes(ast));
  files.set('src/lib/api.ts', generateInvokes(ast));
  files.set('src/store/appStore.ts', generateStore(ast));
  return files;
}
