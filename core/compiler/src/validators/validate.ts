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

  // 13. AI_SERVICE model entries — each model's provider must be in PROVIDERS
  if (ast.aiService) {
    const providerSet = new Set(ast.aiService.providers);
    for (const model of ast.aiService.models) {
      if (!providerSet.has(model.provider)) {
        results.push({
          severity: 'error',
          message: `AI_SERVICE: model '${model.id}' declares provider '${model.provider}' which is not listed in PROVIDERS`,
          node: 'ai_service',
          span: ast.aiService.span,
        });
      }
    }
  }

  // 14. WORKFLOW step.action must reference a declared ACTION.
  //
  // Severity: warning by default, error when AGICORE_STRICT_ACTIONS=1.
  // The Accelerando suite uses cross-app workflow references heavily
  // (e.g. accelerando_eliza calls into ERPAssignSalesRep which lives
  // in accelerando_erp). A single-file validator can't resolve those;
  // a stricter mesh-aware validator runs at deploy time. For
  // single-file compile, warn so the file still generates while
  // surfacing the unresolved reference.
  const actionNames = new Set(ast.actions.map((a) => a.name));
  const strictActions = process.env.AGICORE_STRICT_ACTIONS === '1';
  for (const workflow of ast.workflows) {
    for (const step of workflow.steps) {
      if (step.action && !actionNames.has(step.action)) {
        results.push({
          severity: strictActions ? 'error' : 'warning',
          message: `Workflow '${workflow.name}': step '${step.name}' references undeclared action '${step.action}'${strictActions ? '' : ' (may be a cross-app reference; set AGICORE_STRICT_ACTIONS=1 to make this an error)'}`,
          node: `workflow:${workflow.name}`,
          span: step.span,
        });
      }
    }
  }

  // 15. TRIGGER fires.target must reference a declared declaration of the right kind
  const workflowNames = new Set(ast.workflows.map((w) => w.name));
  const reasonerNames = new Set(ast.reasoners.map((r) => r.name));
  const pipelineNames = new Set(ast.pipelines.map((p) => p.name));
  const compilerNames = new Set(ast.compilers.map((c) => c.name));
  const sessionNames  = new Set(ast.sessions.map((s) => s.name));

  const triggerTargetSets: Record<string, Set<string>> = {
    workflow: workflowNames,
    reasoner: reasonerNames,
    pipeline: pipelineNames,
    compiler: compilerNames,
    session:  sessionNames,
  };

  for (const trigger of ast.triggers) {
    const targetSet = triggerTargetSets[trigger.fires.kind];
    if (targetSet && !targetSet.has(trigger.fires.target)) {
      results.push({
        severity: 'error',
        message: `Trigger '${trigger.name}': fires ${trigger.fires.kind} '${trigger.fires.target}' which is not declared`,
        node: `trigger:${trigger.name}`,
        span: trigger.span,
      });
    }
  }

  // Phase 11.8b — MODULE.expectsMatch=true requires the workflow runtime
  // (telemetry on + at least one WORKFLOW declared) so the andon_events
  // table exists for pull_module_andon to write to. Warn at compile time
  // rather than failing silently at runtime.
  const hasWorkflowRuntime =
    !!ast.app.telemetry && ast.app.telemetry !== 'off' && ast.workflows.length > 0;
  if (!hasWorkflowRuntime) {
    for (const m of ast.modules) {
      if (m.expectsMatch === true) {
        results.push({
          severity: 'warning',
          message: `Module '${m.name}': EXPECTS_MATCH=true requires the workflow runtime (telemetry + at least one WORKFLOW) so pull_module_andon has somewhere to write; current source has none — runtime no-match emission will be unavailable`,
          node: `module:${m.name}`,
          span: m.span,
        });
      }
    }
  }

  // Phase 11.8 — MODULE.mutationPolicy must reference a declared policy
  // and MODULE.ruleRefs must each reference a declared rule. Warn (not
  // error) because cross-app references may resolve at link time.
  const mutationPolicyNames = new Set((ast.mutationPolicies ?? []).map((p) => p.name));
  const ruleNames = new Set(ast.rules.map((r) => r.name));
  for (const module of ast.modules) {
    if (module.mutationPolicy && !mutationPolicyNames.has(module.mutationPolicy)) {
      results.push({
        severity: 'warning',
        message: `Module '${module.name}': MUTATION_POLICY '${module.mutationPolicy}' is not declared`,
        node: `module:${module.name}`,
        span: module.span,
      });
    }
    if (module.expectsMatch === true && !module.mutationPolicy) {
      // EXPECTS_MATCH true without a policy ref means andon pulls will fire
      // but nothing is authorised to respond — the andon will just escalate.
      results.push({
        severity: 'warning',
        message: `Module '${module.name}': EXPECTS_MATCH true without MUTATION_POLICY — andon pulls will escalate without an automated responder`,
        node: `module:${module.name}`,
        span: module.span,
      });
    }
    if (module.ruleRefs) {
      for (const ref of module.ruleRefs) {
        if (!ruleNames.has(ref)) {
          results.push({
            severity: 'warning',
            message: `Module '${module.name}': RULES list references undeclared rule '${ref}'`,
            node: `module:${module.name}`,
            span: module.span,
          });
        }
      }
    }
  }

  // Phase 11.8 — RULE.mutationTier must be a tier in the bound policy's
  // scope. We can only check this when the rule is bound through a module's
  // mutationPolicy declaration. Pass: rule → module → policy → tier list.
  for (const module of ast.modules) {
    if (!module.mutationPolicy) continue;
    const policy = (ast.mutationPolicies ?? []).find((p) => p.name === module.mutationPolicy);
    if (!policy) continue;  // already warned above
    const tierNumbers = new Set(policy.tiers.map((t) => t.tier));
    const allRefs = [...(module.ruleRefs ?? []), ...module.rules.map((r) => r.name)];
    for (const ruleName of allRefs) {
      const rule = ast.rules.find((r) => r.name === ruleName) ?? module.rules.find((r) => r.name === ruleName);
      if (!rule || rule.mutationTier === undefined) continue;
      if (!tierNumbers.has(rule.mutationTier)) {
        results.push({
          severity: 'warning',
          message: `Rule '${rule.name}' (in module '${module.name}'): MUTATION_TIER ${rule.mutationTier} is not declared in policy '${policy.name}'`,
          node: `rule:${rule.name}`,
          span: rule.span,
        });
      }
    }
  }

  // 16. HAS_MANY ↔ BELONGS_TO symmetry (warning)
  // If A HAS_MANY B, B should declare BELONGS_TO A
  for (const entity of ast.entities) {
    for (const rel of entity.relationships) {
      if (rel.type !== 'HAS_MANY') continue;
      const target = ast.entities.find((e) => e.name === rel.target);
      if (!target) continue; // already reported in check 5/6
      const hasReciprocal = target.relationships.some(
        (r) => r.type === 'BELONGS_TO' && r.target === entity.name,
      );
      if (!hasReciprocal) {
        results.push({
          severity: 'warning',
          message: `Entity '${entity.name}' HAS_MANY '${rel.target}', but '${rel.target}' does not declare BELONGS_TO '${entity.name}'`,
          node: `entity:${entity.name}`,
          span: rel.span,
        });
      }
    }
  }

  // 17. COMPILER FROM/TO must reference a declared session or entity
  const validCompilerTargets = new Set([...entityNames, ...sessionNames]);
  for (const compiler of ast.compilers) {
    for (const side of ['from', 'to'] as const) {
      const target = compiler[side];
      if (target && !validCompilerTargets.has(target)) {
        results.push({
          severity: 'error',
          message: `Compiler '${compiler.name}': ${side.toUpperCase()} '${target}' is not a declared session or entity`,
          node: `compiler:${compiler.name}`,
          span: compiler.span,
        });
      }
    }
  }

  // 18. COMPILER EXTRACT fields must exist on the FROM entity (warning, only when FROM is an entity)
  for (const compiler of ast.compilers) {
    if (!compiler.from || !entityNames.has(compiler.from)) continue;
    const fromEntity = ast.entities.find((e) => e.name === compiler.from);
    if (!fromEntity) continue;
    const entityFieldNames = new Set(fromEntity.fields.map((f) => f.name));
    for (const field of compiler.extract) {
      if (!entityFieldNames.has(field)) {
        results.push({
          severity: 'warning',
          message: `Compiler '${compiler.name}': EXTRACT field '${field}' is not declared on entity '${compiler.from}'`,
          node: `compiler:${compiler.name}`,
          span: compiler.span,
        });
      }
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
