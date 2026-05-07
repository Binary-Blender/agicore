// Expert System Runtime Generator
// Generates a complete TypeScript expert system runtime from
// FACT, SCORE, STATE, PATTERN, RULE, MODULE declarations.
//
// The generated runtime is a self-contained engine:
// - FactStore: working memory (assert/retract/query)
// - ScoreEngine: certainty tracking with thresholds
// - StateMachine: state transitions with enter/exit hooks
// - PatternMatcher: regex matching with response templates
// - RuleEngine: forward-chaining rule evaluation
// - ModuleManager: composable engine activation
// - ExpertEngine: orchestrator that wires it all together

import type {
  AgiFile, FactDecl, ScoreDecl, StateDecl, PatternDecl,
  RuleDecl, ModuleDecl, ScoreThreshold,
} from '@agicore/parser';
import { toCamelCase, lcFirst } from '../naming.js';

// ---------------------------------------------------------------------------
// Fact Store
// ---------------------------------------------------------------------------

function generateFactInterfaces(facts: FactDecl[]): string {
  if (facts.length === 0) return '';

  const lines: string[] = ['// --- Fact Types ---', ''];

  for (const fact of facts) {
    lines.push(`export interface ${fact.name} {`);
    lines.push('  _id: string;');
    lines.push(`  _type: '${fact.name}';`);
    lines.push('  _timestamp: number;');
    for (const field of fact.fields) {
      const optional = field.defaultValue !== undefined ? '' : ' | undefined';
      lines.push(`  ${toCamelCase(field.name)}: ${tsTypeFor(field.type)}${optional};`);
    }
    lines.push('}');
    lines.push('');
  }

  return lines.join('\n');
}

function generateFactStore(facts: FactDecl[]): string {
  const lines: string[] = [
    '// --- Fact Store (Working Memory) ---',
    '',
    'export type AnyFact = ' + (facts.length > 0 ? facts.map(f => f.name).join(' | ') : 'Record<string, unknown>') + ';',
    '',
    'export class FactStore {',
    '  private facts: Map<string, AnyFact[]> = new Map();',
    '  private listeners: Array<(event: "assert" | "retract", fact: AnyFact) => void> = [];',
    '',
    '  assert(fact: AnyFact): void {',
    '    const type = fact._type;',
    '    if (!this.facts.has(type)) this.facts.set(type, []);',
    '    this.facts.get(type)!.push(fact);',
    '    this.listeners.forEach(fn => fn("assert", fact));',
    '  }',
    '',
    '  retract(factId: string): AnyFact | undefined {',
    '    for (const [type, list] of this.facts) {',
    '      const idx = list.findIndex(f => f._id === factId);',
    '      if (idx !== -1) {',
    '        const removed = list.splice(idx, 1)[0]!;',
    '        this.listeners.forEach(fn => fn("retract", removed));',
    '        return removed;',
    '      }',
    '    }',
    '    return undefined;',
    '  }',
    '',
    '  query<T extends AnyFact>(type: string, filter?: Partial<T>): T[] {',
    '    const list = (this.facts.get(type) || []) as T[];',
    '    if (!filter) return list;',
    '    return list.filter(f => {',
    '      for (const [key, val] of Object.entries(filter)) {',
    '        if ((f as Record<string, unknown>)[key] !== val) return false;',
    '      }',
    '      return true;',
    '    });',
    '  }',
    '',
    '  latest<T extends AnyFact>(type: string): T | undefined {',
    '    const list = this.facts.get(type) || [];',
    '    return list[list.length - 1] as T | undefined;',
    '  }',
    '',
    '  onFactChange(fn: (event: "assert" | "retract", fact: AnyFact) => void): void {',
    '    this.listeners.push(fn);',
    '  }',
    '',
    '  clear(type?: string): void {',
    '    if (type) this.facts.delete(type);',
    '    else this.facts.clear();',
    '  }',
    '',
    '  all(): AnyFact[] {',
    '    return Array.from(this.facts.values()).flat();',
    '  }',
    '}',
    '',
  ];

  // Add factory functions for each fact type
  for (const fact of facts) {
    const name = fact.name;
    const params = fact.fields.map(f => {
      const opt = f.defaultValue !== undefined ? '?' : '';
      return `${toCamelCase(f.name)}${opt}: ${tsTypeFor(f.type)}`;
    }).join(', ');

    const fieldAssignments = fact.fields.map(f => {
      const camel = toCamelCase(f.name);
      if (f.defaultValue !== undefined) {
        const def = typeof f.defaultValue === 'string' ? `'${f.defaultValue}'` : String(f.defaultValue);
        return `    ${camel}: ${camel} ?? ${def},`;
      }
      return `    ${camel},`;
    }).join('\n');

    lines.push(`export function create${name}(${params}): ${name} {`);
    lines.push('  return {');
    lines.push(`    _id: crypto.randomUUID(),`);
    lines.push(`    _type: '${name}',`);
    lines.push(`    _timestamp: Date.now(),`);
    lines.push(fieldAssignments);
    lines.push('  };');
    lines.push('}');
    lines.push('');
  }

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Score Engine
// ---------------------------------------------------------------------------

function generateScoreEngine(scores: ScoreDecl[]): string {
  if (scores.length === 0) return '';

  const lines: string[] = [
    '// --- Score Engine ---',
    '',
    'export interface ScoreState {',
    '  value: number;',
    '  min: number;',
    '  max: number;',
    '  history: Array<{ value: number; delta: number; source: string; timestamp: number }>;',
    '}',
    '',
    'export interface ScoreThresholdDef {',
    '  name: string;',
    '  value: number;',
    '  action?: string;',
    '  fired: boolean;',
    '}',
    '',
    'export class ScoreEngine {',
    '  private scores: Map<string, ScoreState> = new Map();',
    '  private thresholds: Map<string, ScoreThresholdDef[]> = new Map();',
    '  private actionQueue: string[] = [];',
    '',
    '  constructor() {',
    '    this.init();',
    '  }',
    '',
    '  private init(): void {',
  ];

  for (const score of scores) {
    lines.push(`    this.scores.set('${score.name}', { value: ${score.initial}, min: ${score.min ?? 0}, max: ${score.max ?? 999999}, history: [] });`);
    const thresholdDefs = score.thresholds.map(t =>
      `{ name: '${t.name}', value: ${t.value}, action: ${t.action ? `'${t.action}'` : 'undefined'}, fired: false }`
    ).join(', ');
    lines.push(`    this.thresholds.set('${score.name}', [${thresholdDefs}]);`);
  }

  lines.push('  }');
  lines.push('');
  lines.push('  get(name: string): number {');
  lines.push("    return this.scores.get(name)?.value ?? 0;");
  lines.push('  }');
  lines.push('');
  lines.push('  increment(name: string, delta: number, source: string = "unknown"): string[] {');
  lines.push('    const state = this.scores.get(name);');
  lines.push('    if (!state) return [];');
  lines.push('    state.value = Math.max(state.min, Math.min(state.max, state.value + delta));');
  lines.push('    state.history.push({ value: state.value, delta, source, timestamp: Date.now() });');
  lines.push('    return this.checkThresholds(name);');
  lines.push('  }');
  lines.push('');
  lines.push('  set(name: string, value: number): string[] {');
  lines.push('    const state = this.scores.get(name);');
  lines.push('    if (!state) return [];');
  lines.push('    const delta = value - state.value;');
  lines.push('    state.value = Math.max(state.min, Math.min(state.max, value));');
  lines.push('    state.history.push({ value: state.value, delta, source: "set", timestamp: Date.now() });');
  lines.push('    return this.checkThresholds(name);');
  lines.push('  }');
  lines.push('');
  lines.push('  private checkThresholds(name: string): string[] {');
  lines.push('    const value = this.get(name);');
  lines.push('    const thresholds = this.thresholds.get(name) || [];');
  lines.push('    const triggered: string[] = [];');
  lines.push('    for (const t of thresholds) {');
  lines.push('      if (!t.fired && value >= t.value && t.action) {');
  lines.push('        t.fired = true;');
  lines.push('        triggered.push(t.action);');
  lines.push('        this.actionQueue.push(t.action);');
  lines.push('      }');
  lines.push('    }');
  lines.push('    return triggered;');
  lines.push('  }');
  lines.push('');
  lines.push('  decay(name: string, amount: number): void {');
  lines.push('    const state = this.scores.get(name);');
  lines.push('    if (state) state.value = Math.max(state.min, state.value - amount);');
  lines.push('  }');
  lines.push('');
  lines.push('  drainActions(): string[] {');
  lines.push('    const actions = [...this.actionQueue];');
  lines.push('    this.actionQueue = [];');
  lines.push('    return actions;');
  lines.push('  }');
  lines.push('');
  lines.push('  snapshot(): Record<string, number> {');
  lines.push('    const result: Record<string, number> = {};');
  lines.push('    for (const [name, state] of this.scores) result[name] = state.value;');
  lines.push('    return result;');
  lines.push('  }');
  lines.push('}');
  lines.push('');

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// State Machine
// ---------------------------------------------------------------------------

function generateStateMachine(states: StateDecl[]): string {
  if (states.length === 0) return '';

  const lines: string[] = [
    '// --- State Machine ---',
    '',
    'export interface StateTransitionDef {',
    '  target: string;',
    '  condition: string;',
    '}',
    '',
    'export interface StateNodeDef {',
    '  name: string;',
    '  onEnter?: string;',
    '  onExit?: string;',
    '  transitions: StateTransitionDef[];',
    '}',
    '',
    'export interface StateMachineDef {',
    '  name: string;',
    '  initial: string;',
    '  states: Map<string, StateNodeDef>;',
    '}',
    '',
    'export class StateMachineEngine {',
    '  private machines: Map<string, StateMachineDef> = new Map();',
    '  private currentStates: Map<string, string> = new Map();',
    '  private history: Array<{ machine: string; from: string; to: string; timestamp: number }> = [];',
    '  private actionQueue: string[] = [];',
    '',
    '  constructor() {',
    '    this.init();',
    '  }',
    '',
    '  private init(): void {',
  ];

  for (const sm of states) {
    lines.push(`    // State machine: ${sm.name}`);
    lines.push(`    const ${lcFirst(sm.name)}States = new Map<string, StateNodeDef>();`);
    for (const node of sm.states) {
      const transitions = node.transitions.map(t =>
        `{ target: '${t.target}', condition: '${t.condition.replace(/'/g, "\\'")}' }`
      ).join(', ');
      lines.push(`    ${lcFirst(sm.name)}States.set('${node.name}', { name: '${node.name}', onEnter: ${node.onEnter ? `'${node.onEnter}'` : 'undefined'}, onExit: ${node.onExit ? `'${node.onExit}'` : 'undefined'}, transitions: [${transitions}] });`);
    }
    lines.push(`    this.machines.set('${sm.name}', { name: '${sm.name}', initial: '${sm.initial}', states: ${lcFirst(sm.name)}States });`);
    lines.push(`    this.currentStates.set('${sm.name}', '${sm.initial}');`);
  }

  lines.push('  }');
  lines.push('');
  lines.push('  getCurrent(machineName: string): string {');
  lines.push("    return this.currentStates.get(machineName) ?? 'unknown';");
  lines.push('  }');
  lines.push('');
  lines.push('  transition(machineName: string, targetState: string): boolean {');
  lines.push('    const machine = this.machines.get(machineName);');
  lines.push('    if (!machine) return false;');
  lines.push('    const current = this.currentStates.get(machineName)!;');
  lines.push('    const currentNode = machine.states.get(current);');
  lines.push('    if (currentNode?.onExit) this.actionQueue.push(currentNode.onExit);');
  lines.push('    this.history.push({ machine: machineName, from: current, to: targetState, timestamp: Date.now() });');
  lines.push('    this.currentStates.set(machineName, targetState);');
  lines.push('    const newNode = machine.states.get(targetState);');
  lines.push('    if (newNode?.onEnter) this.actionQueue.push(newNode.onEnter);');
  lines.push('    return true;');
  lines.push('  }');
  lines.push('');
  lines.push('  getTransitions(machineName: string): StateTransitionDef[] {');
  lines.push('    const machine = this.machines.get(machineName);');
  lines.push('    if (!machine) return [];');
  lines.push('    const current = this.currentStates.get(machineName)!;');
  lines.push('    return machine.states.get(current)?.transitions ?? [];');
  lines.push('  }');
  lines.push('');
  lines.push('  drainActions(): string[] {');
  lines.push('    const actions = [...this.actionQueue];');
  lines.push('    this.actionQueue = [];');
  lines.push('    return actions;');
  lines.push('  }');
  lines.push('');
  lines.push('  getHistory(): Array<{ machine: string; from: string; to: string; timestamp: number }> {');
  lines.push('    return [...this.history];');
  lines.push('  }');
  lines.push('}');
  lines.push('');

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Pattern Matcher
// ---------------------------------------------------------------------------

function generatePatternMatcher(patterns: PatternDecl[]): string {
  if (patterns.length === 0) return '';

  const lines: string[] = [
    '// --- Pattern Matcher ---',
    '',
    'export interface PatternDef {',
    '  name: string;',
    '  patterns: RegExp[];',
    '  guard?: string;',
    '  responses: string[];',
    '  score?: { name: string; delta: number };',
    '  assertFact?: { type: string; fields: Record<string, unknown> };',
    '  priority: number;',
    '  category?: string;',
    '}',
    '',
    'export interface MatchResult {',
    '  pattern: PatternDef;',
    '  response: string;',
    '  match: RegExpMatchArray | null;',
    '}',
    '',
    'export class PatternMatcher {',
    '  private patterns: PatternDef[] = [];',
    '',
    '  constructor() {',
    '    this.init();',
    '  }',
    '',
    '  private init(): void {',
  ];

  // Sort patterns by priority (descending) at generation time
  const sorted = [...patterns].sort((a, b) => b.priority - a.priority);

  for (const pattern of sorted) {
    const regexes = pattern.match.map(m => {
      // If it looks like a regex string (starts with /), compile it
      if (m.startsWith('/')) {
        const lastSlash = m.lastIndexOf('/');
        const body = m.slice(1, lastSlash).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
        const flags = m.slice(lastSlash + 1);
        return `new RegExp('${body}', '${flags}')`;
      }
      // Otherwise treat as keyword (case-insensitive word match)
      const escaped = m.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return `new RegExp('\\\\b${escaped}\\\\b', 'i')`;
    });

    const responses = pattern.responses.map(r => `'${r.replace(/'/g, "\\'").replace(/\n/g, '\\n')}'`);
    const scorePart = pattern.score ? `{ name: '${pattern.score.name}', delta: ${pattern.score.delta} }` : 'undefined';
    const assertPart = pattern.assertFact
      ? `{ type: '${pattern.assertFact.name}', fields: ${JSON.stringify(pattern.assertFact.fields)} }`
      : 'undefined';

    lines.push(`    this.patterns.push({`);
    lines.push(`      name: '${pattern.name}',`);
    lines.push(`      patterns: [${regexes.join(', ')}],`);
    lines.push(`      guard: ${pattern.when ? `'${pattern.when.replace(/'/g, "\\'")}'` : 'undefined'},`);
    lines.push(`      responses: [${responses.join(', ')}],`);
    lines.push(`      score: ${scorePart},`);
    lines.push(`      assertFact: ${assertPart},`);
    lines.push(`      priority: ${pattern.priority},`);
    lines.push(`      category: ${pattern.category ? `'${pattern.category}'` : 'undefined'},`);
    lines.push(`    });`);
  }

  lines.push('  }');
  lines.push('');
  lines.push('  addPatterns(newPatterns: PatternDef[]): void {');
  lines.push('    this.patterns.push(...newPatterns);');
  lines.push('    this.patterns.sort((a, b) => b.priority - a.priority);');
  lines.push('  }');
  lines.push('');
  lines.push('  removePatterns(names: string[]): void {');
  lines.push('    this.patterns = this.patterns.filter(p => !names.includes(p.name));');
  lines.push('  }');
  lines.push('');
  lines.push('  match(input: string, context?: Record<string, unknown>): MatchResult | null {');
  lines.push('    for (const pattern of this.patterns) {');
  lines.push('      // Check guard condition if present');
  lines.push('      if (pattern.guard && context) {');
  lines.push('        // Simple expression evaluation: "key == value" or "key >= value"');
  lines.push('        if (!evaluateCondition(pattern.guard, context)) continue;');
  lines.push('      }');
  lines.push('');
  lines.push('      for (const regex of pattern.patterns) {');
  lines.push('        const m = input.match(regex);');
  lines.push('        if (m) {');
  lines.push('          const response = renderTemplate(');
  lines.push('            pattern.responses[Math.floor(Math.random() * pattern.responses.length)]!,');
  lines.push('            { input, ...Object.fromEntries((m.groups ? Object.entries(m.groups) : [])), ...(context || {}) }');
  lines.push('          );');
  lines.push('          return { pattern, response, match: m };');
  lines.push('        }');
  lines.push('      }');
  lines.push('    }');
  lines.push('    return null;');
  lines.push('  }');
  lines.push('}');
  lines.push('');

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Rule Engine (forward chaining)
// ---------------------------------------------------------------------------

function generateRuleEngine(rules: RuleDecl[]): string {
  if (rules.length === 0) return '';

  const lines: string[] = [
    '// --- Rule Engine (Forward Chaining) ---',
    '',
    'export interface RuleDef {',
    '  name: string;',
    '  conditions: Array<{ field: string; op: string; value: unknown; connector?: string }>;',
    '  action: string;',
    '  priority: number;',
    '}',
    '',
    'export interface RuleResult {',
    '  rule: RuleDef;',
    '  fired: boolean;',
    '  action: string;',
    '  timestamp: number;',
    '}',
    '',
    'export class RuleEngine {',
    '  private rules: RuleDef[] = [];',
    '  private auditLog: RuleResult[] = [];',
    '',
    '  constructor() {',
    '    this.init();',
    '  }',
    '',
    '  private init(): void {',
  ];

  const sorted = [...rules].sort((a, b) => b.priority - a.priority);

  for (const rule of sorted) {
    const conditions = rule.conditions.map(c =>
      `{ field: '${c.field}', op: '${c.op}', value: ${JSON.stringify(c.value)}, connector: ${c.connector ? `'${c.connector}'` : 'undefined'} }`
    ).join(', ');
    lines.push(`    this.rules.push({ name: '${rule.name}', conditions: [${conditions}], action: '${rule.action}', priority: ${rule.priority} });`);
  }

  lines.push('  }');
  lines.push('');
  lines.push('  addRules(newRules: RuleDef[]): void {');
  lines.push('    this.rules.push(...newRules);');
  lines.push('    this.rules.sort((a, b) => b.priority - a.priority);');
  lines.push('  }');
  lines.push('');
  lines.push('  evaluate(context: Record<string, unknown>): string[] {');
  lines.push('    const actions: string[] = [];');
  lines.push('    for (const rule of this.rules) {');
  lines.push('      let pass = true;');
  lines.push('      for (const cond of rule.conditions) {');
  lines.push('        const fieldValue = resolveField(cond.field, context);');
  lines.push('        const condResult = compareValues(fieldValue, cond.op, cond.value);');
  lines.push('        if (cond.connector === "UNLESS") {');
  lines.push('          if (condResult) { pass = false; break; }');
  lines.push('        } else {');
  lines.push('          if (!condResult) { pass = false; break; }');
  lines.push('        }');
  lines.push('      }');
  lines.push('      if (pass) {');
  lines.push('        actions.push(rule.action);');
  lines.push('        this.auditLog.push({ rule, fired: true, action: rule.action, timestamp: Date.now() });');
  lines.push('      }');
  lines.push('    }');
  lines.push('    return actions;');
  lines.push('  }');
  lines.push('');
  lines.push('  getAuditLog(): RuleResult[] {');
  lines.push('    return [...this.auditLog];');
  lines.push('  }');
  lines.push('}');
  lines.push('');

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Module Manager
// ---------------------------------------------------------------------------

function generateModuleManager(modules: ModuleDecl[]): string {
  if (modules.length === 0) return '';

  const lines: string[] = [
    '// --- Module Manager ---',
    '',
    'export interface ModuleDef {',
    '  name: string;',
    '  description: string;',
    '  activateWhen?: string;',
    '  deactivateWhen?: string;',
    '  patterns: PatternDef[];',
    '  rules: RuleDef[];',
    '}',
    '',
    'export class ModuleManager {',
    '  private modules: Map<string, ModuleDef> = new Map();',
    '  private activeModules: Set<string> = new Set();',
    '',
    '  constructor(private patternMatcher: PatternMatcher, private ruleEngine: RuleEngine) {',
    '    this.init();',
    '  }',
    '',
    '  private init(): void {',
  ];

  for (const mod of modules) {
    // We register module metadata but don't activate patterns/rules until activation
    lines.push(`    this.modules.set('${mod.name}', {`);
    lines.push(`      name: '${mod.name}',`);
    lines.push(`      description: '${mod.description.replace(/'/g, "\\'")}',`);
    lines.push(`      activateWhen: ${mod.activateWhen ? `'${mod.activateWhen.replace(/'/g, "\\'")}'` : 'undefined'},`);
    lines.push(`      deactivateWhen: ${mod.deactivateWhen ? `'${mod.deactivateWhen.replace(/'/g, "\\'")}'` : 'undefined'},`);
    lines.push(`      patterns: [], // Populated at activation`);
    lines.push(`      rules: [],`);
    lines.push(`    });`);
  }

  lines.push('  }');
  lines.push('');
  lines.push('  checkActivations(context: Record<string, unknown>): string[] {');
  lines.push('    const changes: string[] = [];');
  lines.push('    for (const [name, mod] of this.modules) {');
  lines.push('      const isActive = this.activeModules.has(name);');
  lines.push('      if (!isActive && mod.activateWhen && evaluateCondition(mod.activateWhen, context)) {');
  lines.push('        this.activate(name);');
  lines.push('        changes.push(`activated:${name}`);');
  lines.push('      }');
  lines.push('      if (isActive && mod.deactivateWhen && evaluateCondition(mod.deactivateWhen, context)) {');
  lines.push('        this.deactivate(name);');
  lines.push('        changes.push(`deactivated:${name}`);');
  lines.push('      }');
  lines.push('    }');
  lines.push('    return changes;');
  lines.push('  }');
  lines.push('');
  lines.push('  activate(name: string): void {');
  lines.push('    const mod = this.modules.get(name);');
  lines.push('    if (!mod || this.activeModules.has(name)) return;');
  lines.push('    this.activeModules.add(name);');
  lines.push('    if (mod.patterns.length > 0) this.patternMatcher.addPatterns(mod.patterns);');
  lines.push('    if (mod.rules.length > 0) this.ruleEngine.addRules(mod.rules);');
  lines.push('  }');
  lines.push('');
  lines.push('  deactivate(name: string): void {');
  lines.push('    const mod = this.modules.get(name);');
  lines.push('    if (!mod || !this.activeModules.has(name)) return;');
  lines.push('    this.activeModules.delete(name);');
  lines.push('    this.patternMatcher.removePatterns(mod.patterns.map(p => p.name));');
  lines.push('  }');
  lines.push('');
  lines.push('  isActive(name: string): boolean {');
  lines.push('    return this.activeModules.has(name);');
  lines.push('  }');
  lines.push('');
  lines.push('  getActiveModules(): string[] {');
  lines.push('    return [...this.activeModules];');
  lines.push('  }');
  lines.push('}');
  lines.push('');

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Helper Functions
// ---------------------------------------------------------------------------

function generateHelpers(): string {
  return `// --- Helper Functions ---

function renderTemplate(template: string, vars: Record<string, unknown>): string {
  return template.replace(/\\{\\{(\\w+)\\}\\}/g, (_, key) => String(vars[key] ?? ''));
}

function resolveField(path: string, context: Record<string, unknown>): unknown {
  const parts = path.split('.');
  let current: unknown = context;
  for (const part of parts) {
    if (current == null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

function compareValues(a: unknown, op: string, b: unknown): boolean {
  switch (op) {
    case '==': return a == b;
    case '!=': return a != b;
    case '>': return Number(a) > Number(b);
    case '<': return Number(a) < Number(b);
    case '>=': return Number(a) >= Number(b);
    case '<=': return Number(a) <= Number(b);
    case 'CONTAINS': return String(a).toLowerCase().includes(String(b).toLowerCase());
    default: return false;
  }
}

function evaluateCondition(expr: string, context: Record<string, unknown>): boolean {
  // Simple expression parser: "field op value"
  const match = expr.match(/^(\\S+)\\s*(==|!=|>=|<=|>|<|CONTAINS)\\s*(.+)$/);
  if (!match) return false;
  const [, field, op, rawValue] = match;
  const fieldValue = resolveField(field!, context);
  let value: unknown = rawValue!.trim();
  // Parse value type
  if (value === 'true') value = true;
  else if (value === 'false') value = false;
  else if (!isNaN(Number(value))) value = Number(value);
  else if (typeof value === 'string' && value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
  return compareValues(fieldValue, op!, value);
}

`;
}

// ---------------------------------------------------------------------------
// Expert Engine (Orchestrator)
// ---------------------------------------------------------------------------

function generateOrchestrator(ast: AgiFile): string {
  const hasPatterns = ast.patterns.length > 0 || ast.modules.some(m => m.patterns.length > 0);
  const hasRules = ast.rules.length > 0 || ast.modules.some(m => m.rules.length > 0);
  const hasStates = ast.states.length > 0;
  const hasScores = ast.scores.length > 0;
  const hasModules = ast.modules.length > 0;

  const lines: string[] = [
    '// --- Expert Engine (Orchestrator) ---',
    '',
    'export interface ProcessResult {',
    '  response: string | null;',
    '  matchedPattern: string | null;',
    '  firedRules: string[];',
    '  scoreChanges: Record<string, number>;',
    '  stateTransitions: Array<{ machine: string; from: string; to: string }>;',
    '  moduleChanges: string[];',
    '  actions: string[];',
    '}',
    '',
    'export class ExpertEngine {',
    '  readonly facts = new FactStore();',
  ];

  if (hasScores) lines.push('  readonly scores = new ScoreEngine();');
  if (hasStates) lines.push('  readonly states = new StateMachineEngine();');
  if (hasPatterns) lines.push('  readonly patterns = new PatternMatcher();');
  if (hasRules) lines.push('  readonly rules = new RuleEngine();');
  if (hasModules) lines.push('  readonly modules: ModuleManager;');

  lines.push('  private turnCount = 0;');
  lines.push('  private auditLog: ProcessResult[] = [];');
  lines.push('');

  if (hasModules) {
    lines.push('  constructor() {');
    lines.push('    this.modules = new ModuleManager(this.patterns, this.rules);');
    lines.push('  }');
  }

  lines.push('');
  lines.push('  process(input: string): ProcessResult {');
  lines.push('    this.turnCount++;');
  lines.push('    const result: ProcessResult = {');
  lines.push('      response: null,');
  lines.push('      matchedPattern: null,');
  lines.push('      firedRules: [],');
  lines.push('      scoreChanges: {},');
  lines.push('      stateTransitions: [],');
  lines.push('      moduleChanges: [],');
  lines.push('      actions: [],');
  lines.push('    };');
  lines.push('');
  lines.push('    // Build context for condition evaluation');
  lines.push('    const context: Record<string, unknown> = {');
  lines.push('      input,');
  lines.push('      turn_count: this.turnCount,');

  if (hasScores) lines.push('      ...this.scores.snapshot(),');
  if (hasStates) {
    for (const sm of ast.states) {
      lines.push(`      ${lcFirst(sm.name)}: this.states.getCurrent('${sm.name}'),`);
    }
  }
  if (hasModules) {
    lines.push('      active_module_count: this.modules.getActiveModules().length,');
    for (const mod of ast.modules) {
      lines.push(`      ${lcFirst(mod.name)}_active: this.modules.isActive('${mod.name}'),`);
    }
  }

  lines.push('    };');
  lines.push('');

  if (hasModules) {
    lines.push('    // Check module activations');
    lines.push('    result.moduleChanges = this.modules.checkActivations(context);');
    lines.push('');
  }

  if (hasPatterns) {
    lines.push('    // Pattern matching');
    lines.push('    const match = this.patterns.match(input, context);');
    lines.push('    if (match) {');
    lines.push('      result.response = match.response;');
    lines.push('      result.matchedPattern = match.pattern.name;');
    lines.push('');
    lines.push('      // Apply score changes');
    lines.push('      if (match.pattern.score) {');
    lines.push('        const { name, delta } = match.pattern.score;');
    if (hasScores) {
      lines.push('        const triggered = this.scores.increment(name, delta, match.pattern.name);');
      lines.push('        result.scoreChanges[name] = delta;');
      lines.push('        result.actions.push(...triggered);');
    }
    lines.push('      }');
    lines.push('');
    lines.push('      // Assert facts');
    lines.push('      if (match.pattern.assertFact) {');
    lines.push('        const { type, fields } = match.pattern.assertFact;');
    lines.push('        this.facts.assert({ _id: crypto.randomUUID(), _type: type, _timestamp: Date.now(), ...fields } as AnyFact);');
    lines.push('      }');
    lines.push('    }');
    lines.push('');
  }

  if (hasRules) {
    lines.push('    // Rule evaluation');
    lines.push('    result.firedRules = this.rules.evaluate(context);');
    lines.push('    result.actions.push(...result.firedRules);');
    lines.push('');
  }

  if (hasScores) {
    lines.push('    // Drain score-triggered actions');
    lines.push('    result.actions.push(...this.scores.drainActions());');
    lines.push('');
  }

  if (hasStates) {
    lines.push('    // Drain state machine actions');
    lines.push('    result.actions.push(...this.states.drainActions());');
    lines.push('');
  }

  lines.push('    this.auditLog.push(result);');
  lines.push('    return result;');
  lines.push('  }');
  lines.push('');
  lines.push('  getTurnCount(): number { return this.turnCount; }');
  lines.push('');
  lines.push('  getAuditLog(): ProcessResult[] { return [...this.auditLog]; }');
  lines.push('}');
  lines.push('');

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Type helper
// ---------------------------------------------------------------------------

function tsTypeFor(agiType: string): string {
  switch (agiType) {
    case 'string':   return 'string';
    case 'number':   return 'number';
    case 'float':    return 'number';
    case 'bool':     return 'boolean';
    case 'date':     return 'string';
    case 'datetime': return 'string';
    case 'json':     return 'unknown';
    default:         return 'unknown';
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function generateExpertSystem(ast: AgiFile): Map<string, string> {
  const files = new Map<string, string>();

  // Collect all facts, scores, states, patterns, rules, modules (top-level + inside modules)
  const allFacts = [...ast.facts, ...ast.modules.flatMap(m => m.facts)];
  const allScores = [...ast.scores, ...ast.modules.flatMap(m => m.scores)];
  const allStates = [...ast.states, ...ast.modules.flatMap(m => m.states)];
  const allPatterns = [...ast.patterns]; // module patterns added at activation, not here
  const allRules = [...ast.rules]; // module rules added at activation

  const hasExpertSystem = allFacts.length > 0 || allScores.length > 0 ||
    allStates.length > 0 || allPatterns.length > 0 || allRules.length > 0 ||
    ast.modules.length > 0;

  if (!hasExpertSystem) return files;

  const sections: string[] = [
    '// Agicore Generated Expert System Runtime',
    `// App: ${ast.app.name}`,
    '// This file is auto-generated. Do not edit manually.',
    '',
  ];

  sections.push(generateHelpers());
  sections.push(generateFactInterfaces(allFacts));
  sections.push(generateFactStore(allFacts));
  sections.push(generateScoreEngine(allScores));
  sections.push(generateStateMachine(allStates));
  sections.push(generatePatternMatcher(allPatterns));
  sections.push(generateRuleEngine(allRules));
  sections.push(generateModuleManager(ast.modules));
  sections.push(generateOrchestrator(ast));

  files.set('src/engine/expert-engine.ts', sections.filter(s => s).join('\n'));

  return files;
}
