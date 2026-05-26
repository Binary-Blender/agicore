// Bundled workflow templates.
//
// In-memory Workflow constants the user can load with one click from the
// welcome panel. The canonical example here mirrors
// examples/canonical_workflow.agi — same logical shape, in the in-renderer
// representation. They stay in sync by convention; future work: a Rust
// command that loads the .agi from the app bundle and parses it through
// the agi-parser, removing the duplication.

import type { Workflow } from '../types/workflow';

export interface Template {
  id: string;
  name: string;
  description: string;
  build: () => Workflow;
}

export const TEMPLATES: Template[] = [
  {
    id: 'canonical',
    name: 'Canonical example',
    description: 'Fetch → summarize → human QC → post. Exercises every node type and the QC pause.',
    build: buildCanonicalWorkflow,
  },
  {
    id: 'hello',
    name: 'Hello world',
    description: 'Two nodes: HTTP call and end. The smallest useful workflow.',
    build: buildHelloWorkflow,
  },
];

export function getTemplate(id: string): Template | undefined {
  return TEMPLATES.find((t) => t.id === id);
}

function buildCanonicalWorkflow(): Workflow {
  return {
    name: 'summarize_and_post',
    description: 'Fetch an article, summarize with AI, get human approval, post the summary.',
    inputs: [
      { name: 'article_url',     type: 'string' },
      { name: 'destination_url', type: 'string' },
    ],
    outputs: [
      { name: 'posted_summary', type: 'string' },
      { name: 'was_approved',   type: 'bool'   },
    ],
    nodes: [
      {
        id: 'n1',
        name: 'start',
        kind: 'start',
        position: { x: 80, y: 240 },
        properties: {},
      },
      {
        id: 'n2',
        name: 'fetch_article',
        kind: 'http_call',
        position: { x: 280, y: 240 },
        properties: {
          method: 'GET',
          url:    '{{input.article_url}}',
          body:   '',
        },
      },
      {
        id: 'n3',
        name: 'summarize',
        kind: 'ai_call',
        position: { x: 560, y: 240 },
        properties: {
          prompt: 'Summarize the following article in three sentences. Be concise and factual.\n\n{{fetch_article.body}}',
        },
      },
      {
        id: 'n4',
        name: 'human_review',
        kind: 'qc_checkpoint',
        position: { x: 840, y: 240 },
        properties: {
          prompt:       'Review the AI summary. Approve, edit, or reject.',
          upstreamFrom: 'summarize.summary',
        },
      },
      {
        id: 'n5',
        name: 'post_summary',
        kind: 'http_call',
        position: { x: 1120, y: 240 },
        properties: {
          method: 'POST',
          url:    '{{input.destination_url}}',
          body:   '{ "summary": "{{human_review.final_summary}}" }',
        },
      },
      {
        id: 'n6',
        name: 'end',
        kind: 'end',
        position: { x: 1380, y: 240 },
        properties: {},
      },
    ],
    edges: [
      { id: 'e1', source: 'n1', target: 'n2' },
      { id: 'e2', source: 'n2', target: 'n3' },
      { id: 'e3', source: 'n3', target: 'n4' },
      { id: 'e4', source: 'n4', target: 'n5', whenExpression: 'human_review.decision == "approved" OR human_review.decision == "edited"' },
      { id: 'e5', source: 'n5', target: 'n6' },
    ],
  };
}

function buildHelloWorkflow(): Workflow {
  return {
    name: 'hello_world',
    description: 'The smallest useful workflow.',
    inputs: [],
    outputs: [],
    nodes: [
      {
        id: 'n1',
        name: 'fetch_quote',
        kind: 'http_call',
        position: { x: 200, y: 220 },
        properties: {
          method: 'GET',
          url:    'https://api.quotable.io/random',
          body:   '',
        },
      },
      {
        id: 'n2',
        name: 'end',
        kind: 'end',
        position: { x: 520, y: 220 },
        properties: {},
      },
    ],
    edges: [{ id: 'e1', source: 'n1', target: 'n2' }],
  };
}
