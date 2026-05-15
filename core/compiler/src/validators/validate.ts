import type { AgiFile, SourceSpan } from '@agicore/parser';

export type Severity = 'error' | 'warning';

export interface ValidationResult {
  severity: Severity;
  message: string;
  node?: string;
  span?: SourceSpan;
}

const DATA_LAYOUTS = new Set(['table', 'form', 'detail', 'cards', 'split']);

export function validate(ast: AgiFile): ValidationResult[] {
  const results: ValidationResult[] = [];
  const entityNames = new Set(ast.entities.map((e) => e.name));

  // 1. Duplicate entity names
  checkDuplicates(ast.entities, 'entity', results);

  // 2. Duplicate view names
  checkDuplicates(ast.views, 'view', results);

  // 3. Duplicate action names
  checkDuplicates(ast.actions, 'action', results);

  // 4. Duplicate compiler names
  checkDuplicates(ast.compilers, 'compiler', results);

  // 5 & 6. BELONGS_TO / HAS_MANY targets must be declared entities
  for (const entity of ast.entities) {
    for (const rel of entity.relationships) {
      if (!entityNames.has(rel.target)) {
        results.push({
          severity: 'error',
          message: `Entity '${entity.name}': ${rel.type} references undefined entity '${rel.target}'`,
          node: `entity:${entity.name}`,
          span: rel.span,
        });
      }
    }
  }

  // 7. VIEW ENTITY must be a declared entity
  for (const view of ast.views) {
    if (view.entity && !entityNames.has(view.entity)) {
      results.push({
        severity: 'error',
        message: `View '${view.name}': ENTITY '${view.entity}' is not declared`,
        node: `view:${view.name}`,
        span: view.span,
      });
    }
  }

  // 8. APP CURRENT entities must be declared
  if (ast.app.current) {
    for (const name of ast.app.current) {
      if (!entityNames.has(name)) {
        results.push({
          severity: 'error',
          message: `APP CURRENT '${name}' references undefined entity`,
          node: 'app',
          span: ast.app.span,
        });
      }
    }
  }

  // 9. Data layouts require ENTITY
  for (const view of ast.views) {
    if (DATA_LAYOUTS.has(view.layout) && !view.entity) {
      results.push({
        severity: 'error',
        message: `View '${view.name}': layout '${view.layout}' requires an ENTITY declaration`,
        node: `view:${view.name}`,
        span: view.span,
      });
    }
  }

  // 10. VIEW FIELDS must exist on the referenced entity (warning)
  for (const view of ast.views) {
    if (!view.entity || view.fields.length === 0) continue;
    const entity = ast.entities.find((e) => e.name === view.entity);
    if (!entity) continue; // already reported in check 7
    const entityFieldNames = new Set(entity.fields.map((f) => f.name));
    for (const field of view.fields) {
      if (!entityFieldNames.has(field)) {
        results.push({
          severity: 'warning',
          message: `View '${view.name}': FIELD '${field}' is not declared on entity '${view.entity}'`,
          node: `view:${view.name}`,
          span: view.span,
        });
      }
    }
  }

  // 11. SEED fields must exist on the entity (warning)
  for (const entity of ast.entities) {
    if (!entity.seeds || entity.seeds.length === 0) continue;
    const entityFieldNames = new Set(entity.fields.map((f) => f.name));
    // 'id', 'created_at', 'updated_at' are always valid in seeds
    const builtins = new Set(['id', 'created_at', 'updated_at']);
    for (const seed of entity.seeds) {
      for (const key of seed.fields.keys()) {
        if (!builtins.has(key) && !entityFieldNames.has(key)) {
          results.push({
            severity: 'warning',
            message: `Entity '${entity.name}': SEED field '${key}' is not declared on this entity`,
            node: `entity:${entity.name}`,
            span: seed.span,
          });
        }
      }
    }
  }

  // 12. AI_SERVICE DEFAULT provider must be in PROVIDERS
  if (ast.aiService?.defaultProvider) {
    if (!ast.aiService.providers.includes(ast.aiService.defaultProvider)) {
      results.push({
        severity: 'error',
        message: `AI_SERVICE: DEFAULT provider '${ast.aiService.defaultProvider}' is not listed in PROVIDERS`,
        node: 'ai_service',
        span: ast.aiService.span,
      });
    }
  }

  return results;
}

function checkDuplicates(
  decls: Array<{ name: string; span: SourceSpan }>,
  kind: string,
  results: ValidationResult[],
): void {
  const seen = new Map<string, SourceSpan>();
  for (const decl of decls) {
    if (seen.has(decl.name)) {
      results.push({
        severity: 'error',
        message: `Duplicate ${kind} name '${decl.name}'`,
        node: `${kind}:${decl.name}`,
        span: decl.span,
      });
    } else {
      seen.set(decl.name, decl.span);
    }
  }
}
