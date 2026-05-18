import type { SubscriptionDecl } from '../../../parser/src/types.js';

export function generateSubscription(decl: SubscriptionDecl): string {
  const lines: string[] = [];

  lines.push(`// SUBSCRIPTION: ${decl.name}`);
  if (decl.description) lines.push(`// ${decl.description}`);
  lines.push('');

  // TypeScript schema
  lines.push(`export interface ${decl.name}Record {`);
  lines.push(`  id: string;`);
  lines.push(`  provider: string;`);
  lines.push(`  subscriber: string;`);
  lines.push(`  status: 'active' | 'paused' | 'cancelled' | 'expired';`);
  lines.push(`  amount: number;`);
  lines.push(`  currency: string;`);
  lines.push(`  interval: '${decl.terms.interval}';`);
  if (decl.terms.perks.length > 0) {
    lines.push(`  perks: Array<${decl.terms.perks.map(p => `'${p}'`).join(' | ')}>;`);
  }
  lines.push(`  autoRenew: boolean;`);
  lines.push(`  startedAt: string;`);
  lines.push(`  renewsAt: string | null;`);
  lines.push(`  cancelledAt: string | null;`);
  lines.push('}');
  lines.push('');

  // Configuration constant
  lines.push(`export const ${decl.name}Config = {`);
  lines.push(`  provider: '${decl.provider}',`);
  lines.push(`  subscriber: '${decl.subscriber}',`);
  lines.push(`  terms: {`);
  lines.push(`    amount: ${decl.terms.amount},`);
  lines.push(`    interval: '${decl.terms.interval}',`);
  lines.push(`    perks: [${decl.terms.perks.map(p => `'${p}'`).join(', ')}],`);
  lines.push(`  },`);
  lines.push(`  payment: {`);
  lines.push(`    method: '${decl.payment.method}',`);
  lines.push(`    autoRenew: ${decl.payment.autoRenew},`);
  lines.push(`  },`);
  lines.push(`} as const;`);

  return lines.join('\n');
}
