// MCP tools — operations the assistant can perform on behalf of the user.
//
// Most tools wrap the in-process @agicore/compiler. compile_agicore_source is
// the headline: an assistant can iteratively draft + compile + diagnose a .agi
// without leaving the conversation, then hand the validated source to the user.

import { compile, validate, parse } from '@agicore/compiler';
import { ARCHETYPES, summarize, findArchetype } from './archetypes.js';
import { DSL_CATALOG, findDeclaration } from './dsl-catalog.js';

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: object;
}

/** Tool definitions exposed via tools/list. */
export const TOOL_DEFINITIONS: ToolDefinition[] = [
  {
    name: 'compile_agicore_source',
    description:
      'Compile a .agi source string into a complete Tauri project. Returns the count of emitted files, the list of file paths (so you can request specific ones), and any diagnostics (errors + warnings) from the static validator. Use this to verify a .agi compiles cleanly BEFORE recommending it to the user. Set include_file to fetch the contents of one specific generated file (e.g. "src-tauri/migrations/001_initial.sql") — but avoid dumping all files into context unless asked, since a typical compile emits 60-80 files.',
    inputSchema: {
      type: 'object',
      properties: {
        source: {
          type: 'string',
          description: 'The .agi source code to compile.',
        },
        include_file: {
          type: 'string',
          description: 'Optional relative path of one specific generated file to include in the response.',
        },
      },
      required: ['source'],
    },
  },
  {
    name: 'validate_agicore_source',
    description:
      'Run static validation on a .agi source without doing the full compile. Returns errors and warnings from 12 semantic checks. Faster than compile when you just need to know "is this valid?".',
    inputSchema: {
      type: 'object',
      properties: {
        source: { type: 'string', description: 'The .agi source code to validate.' },
      },
      required: ['source'],
    },
  },
  {
    name: 'list_archetypes',
    description:
      'List the 6 large-scale project archetypes the Andon Loop architecture supports: ERP replacement, hospital clinical decision support, bank middle office, insurance claims adjudication, national tax authority rules engine, and power grid operator. Each has a market-leader comparison ($200M SAP implementations, $500M+ Epic/Cerner installs, etc) and a one-line description. Use this when the user describes a project to suggest a fit. Call get_archetype for the full record once you identify the match.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'get_archetype',
    description:
      'Get the full record for one archetype: description, domain-specific terminology, tier breakdown with named approval-authority roles, and the "why this is reachable now" justification. Use when the user has chosen which archetype to pursue, or when you need the domain terms to draft a .agi.',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description:
            'Archetype id from list_archetypes (one of: erp-replacement, hospital-cds, bank-middle-office, insurance-claims, tax-authority, power-grid).',
        },
      },
      required: ['id'],
    },
  },
  {
    name: 'list_dsl_declarations',
    description:
      'List every Agicore DSL declaration type — 58+ across 11 layers (Application, Orchestration, Expert System, Cooperative Intelligence, Semantic Infrastructure, Adaptive Intelligence, Semantic Operating Environment, Ambient + Embedded, Deployment, Primitives, Andon Loop). Each declaration has a one-line description. Use this to discover what primitives are available before drafting a .agi for a new domain.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'get_declaration_help',
    description:
      'Get the short description for one DSL declaration by name (case-insensitive). Use as a quick lookup while drafting a .agi.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Declaration name, e.g. "MUTATION_POLICY" or "WORKFLOW".' },
      },
      required: ['name'],
    },
  },
];

// ─── Handler dispatch ──────────────────────────────────────────────────────

export interface ToolResult {
  content: { type: 'text'; text: string }[];
  isError?: boolean;
}

function textResult(payload: unknown): ToolResult {
  return {
    content: [{ type: 'text', text: typeof payload === 'string' ? payload : JSON.stringify(payload, null, 2) }],
  };
}

function errorResult(message: string): ToolResult {
  return {
    content: [{ type: 'text', text: message }],
    isError: true,
  };
}

export async function dispatchTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
  switch (name) {
    case 'compile_agicore_source': {
      const source = String(args.source ?? '');
      const includeFile = args.include_file ? String(args.include_file) : undefined;
      if (!source) return errorResult('source is required');
      try {
        const result = compile(source);
        const filePaths = Array.from(result.files.keys()).sort();
        const response: Record<string, unknown> = {
          ok: true,
          files_emitted: result.files.size,
          file_paths: filePaths,
          diagnostics: result.diagnostics.map((d) => ({
            severity: d.severity,
            message:  d.message,
            node:     d.node,
          })),
          // Counts by severity for quick triage.
          summary: {
            errors:   result.diagnostics.filter((d) => d.severity === 'error').length,
            warnings: result.diagnostics.filter((d) => d.severity === 'warning').length,
          },
        };
        if (includeFile) {
          if (result.files.has(includeFile)) {
            response.requested_file = {
              path:    includeFile,
              content: result.files.get(includeFile),
            };
          } else {
            response.requested_file_error = `No generated file at "${includeFile}". See file_paths.`;
          }
        }
        return textResult(response);
      } catch (e) {
        return textResult({
          ok: false,
          parse_error: String(e),
          hint: 'A parse error means the source did not even reach the validator. Fix the syntax issue and try again.',
        });
      }
    }

    case 'validate_agicore_source': {
      const source = String(args.source ?? '');
      if (!source) return errorResult('source is required');
      try {
        const ast = parse(source);
        const diagnostics = validate(ast);
        return textResult({
          ok: true,
          diagnostics: diagnostics.map((d) => ({
            severity: d.severity,
            message:  d.message,
            node:     d.node,
          })),
          summary: {
            errors:   diagnostics.filter((d) => d.severity === 'error').length,
            warnings: diagnostics.filter((d) => d.severity === 'warning').length,
          },
        });
      } catch (e) {
        return textResult({
          ok: false,
          parse_error: String(e),
        });
      }
    }

    case 'list_archetypes': {
      return textResult({
        archetypes: ARCHETYPES.map(summarize),
        note: 'Use get_archetype with one of the ids to fetch the full record (description, domain terms, tier breakdown, justification).',
      });
    }

    case 'get_archetype': {
      const id = String(args.id ?? '');
      const found = findArchetype(id);
      if (!found) {
        return errorResult(
          `No archetype with id "${id}". Valid ids: ${ARCHETYPES.map((a) => a.id).join(', ')}.`,
        );
      }
      return textResult(found);
    }

    case 'list_dsl_declarations': {
      return textResult({
        layers: DSL_CATALOG,
        total_declarations: DSL_CATALOG.reduce((sum, l) => sum + l.declarations.length, 0),
        note: 'Use get_declaration_help with a name (case-insensitive) for the short description of any one.',
      });
    }

    case 'get_declaration_help': {
      const name = String(args.name ?? '');
      const found = findDeclaration(name);
      if (!found) {
        return errorResult(
          `No declaration named "${name}". Use list_dsl_declarations to enumerate.`,
        );
      }
      return textResult(found);
    }

    default:
      return errorResult(`Unknown tool: ${name}`);
  }
}
