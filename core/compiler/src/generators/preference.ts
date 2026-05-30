// PREFERENCE Code Generator
// Generates typed localStorage accessor functions from PREFERENCE declarations.

import type { AgiFile, PreferenceDecl } from '@agicore/parser';
import { toPascalCase } from '../naming.js';

function tsDefaultLiteral(val: unknown): string {
  if (typeof val === 'string') return `'${val.replace(/'/g, "\\'")}'`;
  if (typeof val === 'boolean') return val ? 'true' : 'false';
  return String(val);
}

function tsPreferenceType(agiType: string): string {
  switch (agiType) {
    case 'number':  return 'number';
    case 'float':   return 'number';
    case 'bool':    return 'boolean';
    case 'boolean': return 'boolean';
    default:        return 'string';
  }
}

export function generatePreference(ast: AgiFile): Map<string, string> {
  const files = new Map<string, string>();

  if (!ast.preferences || ast.preferences.length === 0) return files;

  const lines: string[] = [
    '// PREFERENCES — typed localStorage hooks',
    '// @agicore-generated — DO NOT EDIT (regenerate via: agicore compile)',
    '',
    "import { useState } from 'react';",
    '',
    'export function usePreference<T>(key: string, defaultValue: T): [T, (value: T) => void] {',
    '  const stored = localStorage.getItem(key);',
    '  const value: T = stored !== null ? JSON.parse(stored) as T : defaultValue;',
    '  const setValue = (newValue: T) => {',
    '    localStorage.setItem(key, JSON.stringify(newValue));',
    '  };',
    '  return [value, setValue];',
    '}',
    '',
    'export function usePreferenceState<T>(key: string, defaultValue: T): [T, (v: T) => void] {',
    '  const [value, setValue] = useState<T>(() => {',
    '    const stored = localStorage.getItem(key);',
    '    return stored !== null ? (JSON.parse(stored) as T) : defaultValue;',
    '  });',
    '  const set = (v: T) => { localStorage.setItem(key, JSON.stringify(v)); setValue(v); };',
    '  return [value, set] as const;',
    '}',
    '',
  ];

  for (const pref of ast.preferences) {
    const pascalName = toPascalCase(pref.name);
    const tsType = tsPreferenceType(pref.type);
    const defaultLit = tsDefaultLiteral(pref.defaultValue);
    const key = pref.key;

    lines.push(`export function get${pascalName}(): ${tsType} {`);
    lines.push(`  const stored = localStorage.getItem('${key}');`);
    lines.push(`  return stored !== null ? JSON.parse(stored) as ${tsType} : ${defaultLit};`);
    lines.push(`}`);
    lines.push('');
    lines.push(`export function set${pascalName}(value: ${tsType}): void {`);
    lines.push(`  localStorage.setItem('${key}', JSON.stringify(value));`);
    lines.push(`}`);
    lines.push('');
    // Typed React hook for each preference
    lines.push(`export const use${pascalName} = () => usePreferenceState('${key}', ${defaultLit});`);
    lines.push('');
  }

  files.set('src/lib/preferences.ts', lines.join('\n'));
  return files;
}
