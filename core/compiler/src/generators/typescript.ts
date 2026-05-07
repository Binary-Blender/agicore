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

function generateEntityInvokes(entity: EntityDecl): string {
  const snake = toSnakeCase(entity.name);
  const table = toTableName(entity.name);
  const name = entity.name;
  const lines: string[] = [];

  const ops = entity.crud === 'full'
    ? ['list', 'create', 'read', 'update', 'delete']
    : entity.crud;

  if (ops.includes('list')) {
    lines.push(`export const list${name}s = () =>`);
    lines.push(`  invoke<${name}[]>('list_${table}');`);
    lines.push('');
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
    return `${toCamelCase(p.name)}${optional}: ${tsType(p.type)}`;
  }).join(', ');

  const returnType = action.output.length > 0
    ? action.output.map(o => o.type).join(' & ')
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
    lines.push(generateEntityInvokes(entity));
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
      if (ops.includes('list')) fns.push(`list${e.name}s`);
      if (ops.includes('create')) fns.push(`create${e.name}`);
      if (ops.includes('update')) fns.push(`update${e.name}`);
      if (ops.includes('delete')) fns.push(`delete${e.name}`);
      return [`  ${fns.join(', ')},`];
    }),
    "} from '../lib/api';",
    '',
  ];

  // Build the state interface
  lines.push('interface AppState {');
  lines.push("  currentView: string;");
  lines.push("  setCurrentView: (view: string) => void;");
  lines.push('');

  for (const entity of ast.entities) {
    const name = entity.name;
    const camel = lcFirst(name);
    const plural = camel + 's';
    lines.push(`  ${plural}: ${name}[];`);
    lines.push(`  selected${name}Id: string | null;`);
    lines.push(`  load${name}s: () => Promise<void>;`);
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
