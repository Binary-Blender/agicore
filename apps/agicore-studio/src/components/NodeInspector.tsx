// Node Inspector — right rail that appears when a node is selected.
// Renders a per-kind property form. Edits update the workflow store
// which in turn refreshes the .agi text drawer.

import React from 'react';
import { useSelectedNode, useWorkflowStore } from '../store/workflowStore';
import type { NodeKind } from '../types/workflow';

const KIND_LABEL: Record<NodeKind, string> = {
  start:           'Start',
  http_call:       'HTTP Call',
  ai_call:         'AI Call',
  qc_checkpoint:   'Human QC',
  branch:          'Branch',
  loop:            'Loop',
  parallel_fanout: 'Parallel Fanout',
  router_call:     'Router Call',
  end:             'End',
};

const NodeInspector: React.FC = () => {
  const node = useSelectedNode();
  const updateNode = useWorkflowStore((s) => s.updateNode);
  const updateNodeProperty = useWorkflowStore((s) => s.updateNodeProperty);
  const deleteNode = useWorkflowStore((s) => s.deleteNode);

  if (!node) {
    return (
      <aside className="w-72 h-full bg-[var(--bg-panel)] border-l border-[var(--border)] flex flex-col overflow-hidden">
        <Header title="Inspector" subtitle="No selection" />
        <div className="flex-1 flex items-center justify-center px-4">
          <p className="text-xs text-[var(--text-muted)] text-center leading-relaxed">
            Click a node on the canvas to edit its properties.
            <br /><br />
            Drag from the palette on the left to add a new node.
          </p>
        </div>
      </aside>
    );
  }

  return (
    <aside className="w-72 h-full bg-[var(--bg-panel)] border-l border-[var(--border)] flex flex-col overflow-hidden">
      <Header title="Inspector" subtitle={KIND_LABEL[node.kind]} />
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        <Field label="Name">
          <input
            type="text"
            value={node.name}
            onChange={(e) => updateNode(node.id, { name: e.target.value })}
            className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded px-2 py-1.5 text-sm font-mono focus:outline-none focus:border-[var(--accent)]"
          />
        </Field>

        <PropertyForm
          kind={node.kind}
          properties={node.properties}
          onChange={(key, value) => updateNodeProperty(node.id, key, value)}
        />

        <div className="pt-3 border-t border-[var(--border)]">
          <button
            onClick={() => deleteNode(node.id)}
            disabled={node.kind === 'start' || node.kind === 'end'}
            className="w-full text-xs py-1.5 rounded border border-red-900 text-red-300 hover:bg-red-950 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            title={node.kind === 'start' || node.kind === 'end' ? 'Start and end nodes are permanent' : undefined}
          >
            Delete node
          </button>
        </div>
      </div>
    </aside>
  );
};

const PropertyForm: React.FC<{
  kind: NodeKind;
  properties: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
}> = ({ kind, properties, onChange }) => {
  switch (kind) {
    case 'start':
      return (
        <p className="text-[10px] text-[var(--text-muted)]">
          No properties. Start is a pure marker — the workflow's entry point.
        </p>
      );
    case 'end':
      return (
        <p className="text-[10px] text-[var(--text-muted)]">
          No properties. End is a pure marker — the workflow's exit point.
        </p>
      );

    case 'http_call':
      return (
        <>
          <Field label="Method">
            <select
              value={(properties.method as string) ?? 'GET'}
              onChange={(e) => onChange('method', e.target.value)}
              className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded px-2 py-1.5 text-sm focus:outline-none focus:border-[var(--accent)]"
            >
              <option>GET</option>
              <option>POST</option>
              <option>PUT</option>
              <option>DELETE</option>
              <option>PATCH</option>
            </select>
          </Field>
          <Field label="URL" hint="Use {{input.field}} or {{node.field}} templates">
            <input
              type="text"
              value={(properties.url as string) ?? ''}
              onChange={(e) => onChange('url', e.target.value)}
              className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded px-2 py-1.5 text-xs font-mono focus:outline-none focus:border-[var(--accent)]"
            />
          </Field>
          <Field label="Body" hint="Leave blank for GET">
            <textarea
              value={(properties.body as string) ?? ''}
              onChange={(e) => onChange('body', e.target.value)}
              rows={4}
              className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded px-2 py-1.5 text-xs font-mono focus:outline-none focus:border-[var(--accent)] resize-none"
            />
          </Field>
        </>
      );

    case 'ai_call':
      return (
        <Field label="Prompt" hint="Reference upstream outputs with {{node_name.field}}">
          <textarea
            value={(properties.prompt as string) ?? ''}
            onChange={(e) => onChange('prompt', e.target.value)}
            rows={8}
            className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded px-2 py-1.5 text-xs font-mono focus:outline-none focus:border-[var(--accent)] resize-none"
          />
        </Field>
      );

    case 'qc_checkpoint':
      return (
        <>
          <Field label="Review prompt" hint="Shown to the human reviewer">
            <textarea
              value={(properties.prompt as string) ?? ''}
              onChange={(e) => onChange('prompt', e.target.value)}
              rows={4}
              className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded px-2 py-1.5 text-xs font-mono focus:outline-none focus:border-[var(--accent)] resize-none"
            />
          </Field>
          <Field label="Upstream output to review" hint="e.g. summarize.summary">
            <input
              type="text"
              value={(properties.upstreamFrom as string) ?? ''}
              onChange={(e) => onChange('upstreamFrom', e.target.value)}
              placeholder="node_name.field"
              className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded px-2 py-1.5 text-xs font-mono focus:outline-none focus:border-[var(--accent)]"
            />
          </Field>
        </>
      );

    case 'branch':
      return (
        <Field label="Condition" hint="Boolean expression">
          <input
            type="text"
            value={(properties.condition as string) ?? ''}
            onChange={(e) => onChange('condition', e.target.value)}
            className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded px-2 py-1.5 text-xs font-mono focus:outline-none focus:border-[var(--accent)]"
          />
        </Field>
      );

    case 'loop':
      return (
        <>
          <Field label="Iterate over" hint="Collection expression — e.g. {{fetch_items.results}}">
            <input
              type="text"
              value={(properties.over as string) ?? ''}
              onChange={(e) => onChange('over', e.target.value)}
              className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded px-2 py-1.5 text-xs font-mono focus:outline-none focus:border-[var(--accent)]"
            />
          </Field>
          <Field label="As" hint="Variable name bound to each item inside the loop body">
            <input
              type="text"
              value={(properties.as as string) ?? ''}
              onChange={(e) => onChange('as', e.target.value)}
              placeholder="item"
              className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded px-2 py-1.5 text-xs font-mono focus:outline-none focus:border-[var(--accent)]"
            />
          </Field>
          <p className="text-[10px] text-[var(--text-muted)] italic leading-snug">
            Stub runner doesn't simulate iteration yet — the agicore-cli
            integration handles real loop semantics.
          </p>
        </>
      );

    case 'parallel_fanout':
      return (
        <>
          <p className="text-[10px] text-[var(--text-muted)] leading-snug">
            No properties. Draw multiple outgoing edges from this node to
            fan execution across them.
          </p>
          <p className="text-[10px] text-[var(--text-muted)] italic leading-snug mt-2">
            Stub runner serializes parallel paths today — true concurrency
            lands with the agicore-cli integration.
          </p>
        </>
      );

    case 'router_call':
      return (
        <>
          <Field label="Router" hint="Name of a top-level ROUTER declaration">
            <input
              type="text"
              value={(properties.router as string) ?? ''}
              onChange={(e) => onChange('router', e.target.value)}
              placeholder="BabyAI"
              className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded px-2 py-1.5 text-xs font-mono focus:outline-none focus:border-[var(--accent)]"
            />
          </Field>
          <Field label="Task type" hint="Used to pick the right tier (e.g. coding, analysis, creative_writing)">
            <input
              type="text"
              value={(properties.task_type as string) ?? ''}
              onChange={(e) => onChange('task_type', e.target.value)}
              placeholder="general"
              className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded px-2 py-1.5 text-xs font-mono focus:outline-none focus:border-[var(--accent)]"
            />
          </Field>
        </>
      );
  }
};

const Header: React.FC<{ title: string; subtitle: string }> = ({ title, subtitle }) => (
  <div className="flex items-baseline justify-between px-3 py-2 bg-[var(--bg-panel)] border-b border-[var(--border)]">
    <span className="text-xs uppercase tracking-widest text-[var(--text-secondary)]">{title}</span>
    <span className="text-[10px] text-[var(--text-muted)]">{subtitle}</span>
  </div>
);

const Field: React.FC<{ label: string; hint?: string; children: React.ReactNode }> = ({
  label, hint, children,
}) => (
  <div>
    <label className="block text-[10px] uppercase tracking-widest text-[var(--text-muted)] mb-1">
      {label}
    </label>
    {children}
    {hint && (
      <p className="text-[10px] text-[var(--text-muted)] mt-1 italic">{hint}</p>
    )}
  </div>
);

export default NodeInspector;
