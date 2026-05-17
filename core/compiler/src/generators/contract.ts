// CONTRACT codegen stub — emits a TypeScript interface for the contract schema

import type { ContractDecl } from '@agicore/parser';

export function generateContract(decl: ContractDecl): string {
  const partyFields = decl.parties
    .map(p => `  ${p.role}: ${p.type};`)
    .join('\n');

  const termFields = decl.terms
    .map(t => `  ${t.key}: string;`)
    .join('\n');

  const deliverableFields = decl.deliverables
    .map(d => `  ${d.name}: ${d.required ? 'string' : 'string | undefined'};`)
    .join('\n');

  const timestampsFields = decl.timestamps
    ? `  createdAt: string;\n  updatedAt: string;`
    : '';

  return `// @agicore-generated — DO NOT EDIT

// ${decl.description}

export interface ${decl.name}Parties {
${partyFields}
}

export interface ${decl.name}Terms {
${termFields}
}

export interface ${decl.name}Deliverables {
${deliverableFields}
}

export interface ${decl.name}Payment {
  method: '${decl.payment.method}';
  amount: number;
  currency: string;
  release: '${decl.payment.release}';
  recurring: boolean;
}

export interface ${decl.name}Governance {
  signedBy: '${decl.governance.signedBy}';
  dispute: '${decl.governance.dispute}';
}

export interface ${decl.name}Contract {
  parties: ${decl.name}Parties;
  terms: ${decl.name}Terms;
  deliverables: ${decl.name}Deliverables;
  payment: ${decl.name}Payment;
  governance: ${decl.name}Governance;
${timestampsFields}
}
`;
}
