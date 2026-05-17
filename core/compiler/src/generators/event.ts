// EVENT codegen stub — emits a TypeScript interface + event bus registry comment

import type { EventDecl } from '@agicore/parser';

export function generateEvent(decl: EventDecl): string {
  const payloadFields = decl.payload
    .map(f => `  ${f.name}: ${f.type};`)
    .join('\n');

  const subscriberList = decl.subscribers.map(s => `'${s}'`).join(', ');

  return `// @agicore-generated — DO NOT EDIT

/** Payload for the ${decl.name} event. */
// ${decl.description}
export interface ${decl.name}Payload {
${payloadFields}
}

export interface ${decl.name}Event {
  kind: '${decl.name}';
  payload: ${decl.name}Payload;
  idempotent: ${decl.idempotent};
  ttl: ${decl.ttl};
}

// Event bus registry entry
// Subscribers: [${subscriberList}]
// Register with: eventBus.register('${decl.name}', [${subscriberList}]);
`;
}
