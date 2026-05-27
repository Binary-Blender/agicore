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
  {
    id: 'parallel_research',
    name: 'Parallel research',
    description: 'Fan out a topic to three concurrent angles (history / current / future), merge into one briefing. The all-of-N counterpart to persona dispatch.',
    build: buildParallelResearchWorkflow,
  },
  {
    id: 'iterate_refine',
    name: 'Iterative refinement',
    description: 'Draft, then loop critique-and-revise N rounds, then polish. The "make it better N times" creator pattern.',
    build: buildIterateRefineWorkflow,
  },
  {
    id: 'validate_with_branch',
    name: 'Validate with branch',
    description: 'Generate, validate against a rubric, branch pass cases to auto-approve and fail cases to a human QC override.',
    build: buildValidateWithBranchWorkflow,
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

function buildParallelResearchWorkflow(): Workflow {
  // Mirrors examples/parallel_research.agi.
  return {
    name: 'research_topic',
    description: 'Take a topic, research three angles concurrently, merge into a briefing.',
    inputs: [{ name: 'topic', type: 'string' }],
    outputs: [{ name: 'briefing', type: 'string' }],
    nodes: [
      { id: 'n1', name: 'start',          kind: 'start',            position: { x: 80,   y: 320 }, properties: {} },
      { id: 'n2', name: 'fanout',         kind: 'parallel_fanout',  position: { x: 280, y: 320 }, properties: {} },
      {
        id: 'n3',
        name: 'history_angle',
        kind: 'ai_call',
        position: { x: 540, y: 120 },
        properties: {
          prompt: 'Write 3-5 sentences on the historical context of {{input.topic}}. Focus on origins and key turning points.',
        },
      },
      {
        id: 'n4',
        name: 'current_angle',
        kind: 'ai_call',
        position: { x: 540, y: 320 },
        properties: {
          prompt: 'Write 3-5 sentences on the current state of {{input.topic}}. What is happening right now, who are the major players.',
        },
      },
      {
        id: 'n5',
        name: 'future_angle',
        kind: 'ai_call',
        position: { x: 540, y: 520 },
        properties: {
          prompt: 'Write 3-5 sentences on the likely future of {{input.topic}}. What trends are forming, what\'s plausible in 3-5 years.',
        },
      },
      {
        id: 'n6',
        name: 'merge',
        kind: 'ai_call',
        position: { x: 840, y: 320 },
        properties: {
          prompt: 'Combine these three perspectives into one cohesive briefing on {{input.topic}}. Use clear headings (## History, ## Present, ## Future).\n\nHistorical: {{history_angle.text}}\nCurrent: {{current_angle.text}}\nFuture: {{future_angle.text}}',
        },
      },
      { id: 'n7', name: 'end', kind: 'end', position: { x: 1100, y: 320 }, properties: {} },
    ],
    edges: [
      { id: 'e1', source: 'n1', target: 'n2' },
      { id: 'e2', source: 'n2', target: 'n3' },
      { id: 'e3', source: 'n2', target: 'n4' },
      { id: 'e4', source: 'n2', target: 'n5' },
      { id: 'e5', source: 'n3', target: 'n6' },
      { id: 'e6', source: 'n4', target: 'n6' },
      { id: 'e7', source: 'n5', target: 'n6' },
      { id: 'e8', source: 'n6', target: 'n7' },
    ],
  };
}

function buildIterateRefineWorkflow(): Workflow {
  // Mirrors examples/iterate_refine.agi.
  return {
    name: 'refine_draft',
    description: 'Generate a draft, refine it across N critique rounds, polish.',
    inputs: [
      { name: 'prompt', type: 'string' },
      { name: 'rounds', type: 'number' },
    ],
    outputs: [{ name: 'final_text', type: 'string' }],
    nodes: [
      { id: 'n1', name: 'start', kind: 'start', position: { x: 80, y: 240 }, properties: {} },
      {
        id: 'n2',
        name: 'initial_draft',
        kind: 'ai_call',
        position: { x: 280, y: 240 },
        properties: {
          prompt: 'Write a first draft on this prompt. Aim for roughly 200 words.\n\nPrompt: {{input.prompt}}',
        },
      },
      {
        id: 'n3',
        name: 'rounds',
        kind: 'loop',
        position: { x: 540, y: 240 },
        properties: { over: '{{range(input.rounds)}}', as: 'round' },
      },
      {
        id: 'n4',
        name: 'critique',
        kind: 'ai_call',
        position: { x: 780, y: 140 },
        properties: {
          prompt: 'Critique this draft. Be specific about what is weak — vague claims, awkward phrasing, missing structure. Round {{round}} of {{input.rounds}}.\n\nDraft: {{initial_draft.draft}}',
        },
      },
      {
        id: 'n5',
        name: 'revise',
        kind: 'ai_call',
        position: { x: 780, y: 340 },
        properties: {
          prompt: 'Revise the draft to address this critique. Keep what works; fix what doesn\'t. Round {{round}}.\n\nDraft: {{initial_draft.draft}}\nCritique: {{critique.critique}}',
        },
      },
      {
        id: 'n6',
        name: 'polish',
        kind: 'ai_call',
        position: { x: 1040, y: 240 },
        properties: {
          prompt: 'Final polish pass. Tighten sentences, fix any artifacts the iteration introduced, return the finished piece.\n\nDraft: {{revise.draft}}',
        },
      },
      { id: 'n7', name: 'end', kind: 'end', position: { x: 1280, y: 240 }, properties: {} },
    ],
    edges: [
      { id: 'e1', source: 'n1', target: 'n2' },
      { id: 'e2', source: 'n2', target: 'n3' },
      { id: 'e3', source: 'n3', target: 'n4' },
      { id: 'e4', source: 'n4', target: 'n5' },
      { id: 'e5', source: 'n5', target: 'n6' },
      { id: 'e6', source: 'n6', target: 'n7' },
    ],
  };
}

function buildValidateWithBranchWorkflow(): Workflow {
  // Mirrors examples/validate_with_branch.agi.
  return {
    name: 'validate_and_route',
    description: 'Generate content, validate it against a rubric, branch pass vs. fail.',
    inputs: [{ name: 'topic', type: 'string' }],
    outputs: [
      { name: 'final',        type: 'string' },
      { name: 'was_approved', type: 'bool'   },
    ],
    nodes: [
      { id: 'n1', name: 'start', kind: 'start', position: { x: 80, y: 280 }, properties: {} },
      {
        id: 'n2',
        name: 'generate',
        kind: 'ai_call',
        position: { x: 260, y: 280 },
        properties: {
          prompt: 'Write a single paragraph on {{input.topic}}. Aim for clarity and one concrete example.',
        },
      },
      {
        id: 'n3',
        name: 'validate',
        kind: 'ai_call',
        position: { x: 500, y: 280 },
        properties: {
          prompt: 'Judge this paragraph against the rubric: (1) has a concrete example, (2) is one paragraph, (3) does not hedge. Respond with exactly "pass" or "fail" on the first line, then a one-sentence reason on the second line.\n\nParagraph: {{generate.text}}',
        },
      },
      {
        id: 'n4',
        name: 'gate',
        kind: 'branch',
        position: { x: 740, y: 280 },
        properties: { condition: 'validate.verdict starts_with "pass"' },
      },
      {
        id: 'n5',
        name: 'auto_approve',
        kind: 'ai_call',
        position: { x: 960, y: 160 },
        properties: {
          prompt: 'Light polish only — fix any typos, return the paragraph.\n\nParagraph: {{generate.text}}',
        },
      },
      {
        id: 'n6',
        name: 'human_override',
        kind: 'qc_checkpoint',
        position: { x: 960, y: 400 },
        properties: {
          prompt:       'The AI validator failed this paragraph. Review the verdict and decide: approve as-is, edit, or reject. Verdict: {{validate.verdict}}',
          upstreamFrom: 'generate.text',
        },
      },
      { id: 'n7', name: 'end', kind: 'end', position: { x: 1200, y: 280 }, properties: {} },
    ],
    edges: [
      { id: 'e1', source: 'n1', target: 'n2' },
      { id: 'e2', source: 'n2', target: 'n3' },
      { id: 'e3', source: 'n3', target: 'n4' },
      { id: 'e4', source: 'n4', target: 'n5', whenExpression: 'gate.matched == true'  },
      { id: 'e5', source: 'n4', target: 'n6', whenExpression: 'gate.matched == false' },
      { id: 'e6', source: 'n5', target: 'n7' },
      { id: 'e7', source: 'n6', target: 'n7' },
    ],
  };
}
