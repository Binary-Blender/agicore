# @agicore/parser

[![Tests](https://img.shields.io/badge/tests-843%20passing-brightgreen)](../../README.md)
[![Declarations](https://img.shields.io/badge/declarations-58-blue)](../../dsl/grammar.md)
[![License](https://img.shields.io/badge/license-MIT-green)](../../LICENSE)

The Agicore DSL parser — turns `.agi` source files into a typed AST.

This package is the front half of the Agicore compiler toolchain. The back half ([`@agicore/compiler`](../compiler/)) walks the AST and emits a complete Tauri application.

## Install

```bash
npm install @agicore/parser
```

## Use

```ts
import { parseAgi } from '@agicore/parser';

const source = `
APP demo {
  TITLE "Demo App"
  DB demo.db
}

ENTITY Note {
  title: string REQUIRED
  body:  text
  TIMESTAMPS
}
`;

const ast = parseAgi(source);
// ast is { app: AppDecl, decls: Decl[], diagnostics: Diagnostic[] }

for (const d of ast.decls) {
  console.log(d.kind, d.name);
}
```

## Coverage

The parser supports **58 declaration types across 10 layers**:

- Application (7): APP, ENTITY, ACTION, VIEW, AI_SERVICE, TEST, PREFERENCE
- Orchestration (5): WORKFLOW, PIPELINE, QC, VAULT, STAGES
- Expert System (6): RULE, FACT, STATE, PATTERN, SCORE, MODULE
- Cooperative Intelligence (10): ROUTER, SKILL, SKILLDOC, REASONER, TRIGGER, LIFECYCLE, BREED, COGNITION_ROLE, ESCALATION_CHAIN, QC_MESH
- Semantic Infrastructure (5): PACKET, AUTHORITY, CHANNEL, IDENTITY, FEED
- Adaptive Intelligence (6): EVENT, NBVE, CONTRACT, REPUTATION, SUBSCRIPTION, DISPUTE
- Semantic Operating Environment (2): SESSION, COMPILER
- Ambient + Embedded (8): NODE, SENSOR, ZONE, MESH, ACTUATOR, PLATFORM, NULLCLAW, BRAIN_BODY
- Deployment (3): TARGET, AUTH, TENANT
- Primitives (6): MACRO, MACRO_REGISTRY, LOG, THEME, SEED, TYPE

See [`dsl/grammar.md`](../../dsl/grammar.md) for the formal grammar and [`docs/dsl-reference.md`](../../docs/dsl-reference.md) for the practitioner's reference.

## API

| Export | Description |
|---|---|
| `parseAgi(source: string): AgiFile` | Parses a `.agi` source string into a full AST. Diagnostics are returned on the file. |
| `tokenize(source: string): Token[]` | Low-level lexer access — emits the token stream the parser consumes. |
| `Decl`, `AppDecl`, `EntityDecl`, … | TypeScript types for every AST node. See [`src/types.ts`](src/types.ts). |

## Testing

```bash
npm test    # 843 tests, 0 failures
```

## License

MIT. See [`LICENSE`](../../LICENSE).
