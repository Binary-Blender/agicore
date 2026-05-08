// Agicore DSL Parser - Public API

export { Parser, ParseError } from './parser.js';
export { Lexer, LexerError, TokenType } from './lexer.js';
export type {
  AgiFile, AppDecl, EntityDecl, ActionDecl, ViewDecl,
  AiServiceDecl, TestDecl, RuleDecl, WorkflowDecl,
  FactDecl, StateDecl, PatternDecl, ScoreDecl, ModuleDecl,
  PipelineDecl, PipelineRow, PipelineModule, PipelineConnection, PipelineModuleType,
  QCDecl, VaultDecl,
  RouterDecl, RouterTier, RouterModelDef,
  SkillDecl, LifecycleDecl, LifecycleEscalation,
  BreedDecl, BreedFitness,
  PacketDecl, PacketField, PacketValidationRule,
  AuthorityDecl, AuthorityLevel, AuthoritySigning,
  ChannelDecl, ChannelProtocol, ChannelDirection,
  IdentityDecl, IdentityProfileField,
  FeedDecl, FeedSubscribeMode,
  NodeDecl, NodeType, AiTier, SafetyLevel,
  SensorDecl, SensorType,
  ZoneDecl,
  SessionDecl, CompilerDecl, EnrichOp,
  StateNode, StateTransition, ScoreThreshold,
  Declaration, FieldDef, AgiType, FieldModifier, CrudOp,
  Relationship, ActionParam, ActionOutput, LayoutType,
  ThemeOption, ModelMapping, TestGiven, TestExpect,
  AssertionOp, RuleCondition, WorkflowStep, OnFailBehavior,
  LiteralValue, SourceLocation, SourceSpan, ParseError as ParseErrorType,
} from './types.js';

import { Parser } from './parser.js';
import type { AgiFile } from './types.js';

/**
 * Parse an Agicore DSL source string into a typed AST.
 *
 * @param source - The .agi file contents
 * @returns The parsed AST
 * @throws ParseError if the source is invalid
 */
export function parse(source: string): AgiFile {
  const parser = new Parser();
  return parser.parse(source);
}
