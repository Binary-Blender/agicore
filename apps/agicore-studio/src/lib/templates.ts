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
    name: 'Hello, workflow',
    description: 'One AI call. The smallest useful workflow — five seconds to "yes it works".',
    build: buildHelloWorkflow,
  },
  {
    id: 'persona_dispatch',
    name: 'Persona dispatch',
    description: 'Router picks one of three personas, each answers in voice, composer attributes. The Reality.AI pattern, workflow-shaped.',
    build: buildPersonaDispatchWorkflow,
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
  // Mirrors examples/hello_workflow.agi.
  return {
    name: 'say_hello',
    description: 'Ask an AI to greet whoever you name, then stop.',
    inputs: [{ name: 'whom', type: 'string' }],
    outputs: [{ name: 'greeting', type: 'string' }],
    nodes: [
      { id: 'n1', name: 'start', kind: 'start', position: { x: 120, y: 220 }, properties: {} },
      {
        id: 'n2',
        name: 'greet',
        kind: 'ai_call',
        position: { x: 360, y: 220 },
        properties: {
          prompt: 'Write a one-sentence friendly greeting for {{input.whom}}. No preamble — just the greeting itself.',
        },
      },
      { id: 'n3', name: 'end', kind: 'end', position: { x: 640, y: 220 }, properties: {} },
    ],
    edges: [
      { id: 'e1', source: 'n1', target: 'n2' },
      { id: 'e2', source: 'n2', target: 'n3' },
    ],
  };
}

function buildPersonaDispatchWorkflow(): Workflow {
  // Mirrors examples/persona_dispatch.agi.
  const personaPrompt = (style: string, voice: string): string =>
    `Answer this question as a ${style}. ${voice}\n\nQuestion: {{input.question}}`;

  return {
    name: 'answer_with_persona',
    description: 'Route a question to the right persona, answer it, attribute the answer.',
    inputs: [{ name: 'question', type: 'string' }],
    outputs: [{ name: 'final', type: 'string' }],
    nodes: [
      { id: 'n1', name: 'start',             kind: 'start',       position: { x: 80,   y: 320 }, properties: {} },
      {
        id: 'n2',
        name: 'pick_persona',
        kind: 'router_call',
        position: { x: 280, y: 320 },
        properties: {
          prompt: 'Pick the best persona for this question: technical, creative, or supportive. Respond with exactly one of those three words.',
        },
      },
      {
        id: 'n3',
        name: 'technical_answer',
        kind: 'ai_call',
        position: { x: 560, y: 120 },
        properties: { prompt: personaPrompt('senior engineer', 'Be precise and concrete.') },
      },
      {
        id: 'n4',
        name: 'creative_answer',
        kind: 'ai_call',
        position: { x: 560, y: 320 },
        properties: { prompt: personaPrompt('working artist', 'Use vivid imagery and a confident voice.') },
      },
      {
        id: 'n5',
        name: 'supportive_answer',
        kind: 'ai_call',
        position: { x: 560, y: 520 },
        properties: { prompt: personaPrompt('kind, patient teacher', 'Acknowledge the asker first, then give the answer plainly.') },
      },
      {
        id: 'n6',
        name: 'compose',
        kind: 'ai_call',
        position: { x: 880, y: 320 },
        properties: {
          prompt: 'Prepend one short line attributing this answer to the {{pick_persona.persona}} persona, then include the answer verbatim.\n\nAnswer: {{technical_answer.text}}{{creative_answer.text}}{{supportive_answer.text}}',
        },
      },
      { id: 'n7', name: 'end', kind: 'end', position: { x: 1140, y: 320 }, properties: {} },
    ],
    edges: [
      { id: 'e1', source: 'n1', target: 'n2' },
      { id: 'e2', source: 'n2', target: 'n3', whenExpression: 'pick_persona.persona == "technical"'  },
      { id: 'e3', source: 'n2', target: 'n4', whenExpression: 'pick_persona.persona == "creative"'   },
      { id: 'e4', source: 'n2', target: 'n5', whenExpression: 'pick_persona.persona == "supportive"' },
      { id: 'e5', source: 'n3', target: 'n6' },
      { id: 'e6', source: 'n4', target: 'n6' },
      { id: 'e7', source: 'n5', target: 'n6' },
      { id: 'e8', source: 'n6', target: 'n7' },
    ],
  };
}
