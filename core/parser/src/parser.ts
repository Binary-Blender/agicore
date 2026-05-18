// Agicore DSL Parser - Recursive descent parser producing a typed AST

import { Lexer, TokenType, type Token } from './lexer.js';
import type {
  AgiFile, AppDecl, EntityDecl, ActionDecl, ViewDecl,
  TopLevelSeedDecl,
  AiServiceDecl, TestDecl, RuleDecl, WorkflowDecl,
  FactDecl, StateDecl, PatternDecl, ScoreDecl, ModuleDecl,
  PipelineDecl, PipelineRow, PipelineModule, PipelineConnection, PipelineModuleType,
  QCDecl, VaultDecl,
  RouterDecl, RouterTier, RouterModelDef, CircuitBreaker,
  SkillDecl, SkillDocDecl, SkillDocGovernance, SkillDocCompression, AuditLevel,
  ReasonerDecl, ReasonerInput, ReasonerOutput, ReasonerSchedule,
  TriggerDecl, TriggerWhen, TriggerFires, TriggerTargetKind,
  TelemetryMode,
  LifecycleDecl, LifecycleEscalation,
  BreedDecl, BreedFitness,
  PacketDecl, PacketField, PacketValidationRule,
  AuthorityDecl, AuthorityLevel, AuthoritySigning,
  ChannelDecl, ChannelProtocol, ChannelDirection, ChannelOrdering,
  IdentityDecl, IdentityProfileField,
  FeedDecl, FeedSubscribeMode,
  EnrichOp,
  NodeDecl, NodeType, AiTier, SafetyLevel,
  SensorDecl, SensorType,
  ZoneDecl,
  SessionDecl, CompilerDecl,
  EventDecl, EventPayloadField,
  NbveDecl, NbveSpc,
  ContractDecl, ContractParty, ContractTerm, ContractDeliverable, ContractPayment, ContractGovernance,
  PaymentMethod, PaymentRelease,
  ReputationDecl, ReputationMetric, ReputationSpc, ReputationDecay,
  SubscriptionDecl, SubscriptionTerms, SubscriptionPayment,
  DisputeDecl, DisputeResolution,
  StateNode, StateTransition, ScoreThreshold,
  FieldDef, FieldModifier, AgiType, CrudOp, Relationship, EntityOrder, SeedRecord,
  ActionParam, ActionOutput, ActionEmitField, ActionEmit, LayoutType, ThemeOption,
  ModelEntry, TestGiven, TestExpect, AssertionOp,
  RuleCondition, WorkflowStep, OnFailBehavior,
  LiteralValue, SourceLocation, SourceSpan,
  PreferenceDecl,
} from './types.js';

export class ParseError extends Error {
  location: SourceLocation;
  constructor(message: string, location: SourceLocation) {
    super(`Parse error at line ${location.line}, col ${location.column}: ${message}`);
    this.location = location;
  }
}

export class Parser {
  private tokens: Token[] = [];
  private pos: number = 0;

  parse(source: string): AgiFile {
    const lexer = new Lexer(source);
    this.tokens = lexer.tokenize();
    this.pos = 0;

    // APP must come first
    const app = this.parseApp();

    const entities: EntityDecl[] = [];
    const actions: ActionDecl[] = [];
    const views: ViewDecl[] = [];
    let aiService: AiServiceDecl | undefined;
    const tests: TestDecl[] = [];
    const rules: RuleDecl[] = [];
    const workflows: WorkflowDecl[] = [];
    const pipelines: PipelineDecl[] = [];
    const qcs: QCDecl[] = [];
    let vault: VaultDecl | undefined;
    const facts: FactDecl[] = [];
    const states: StateDecl[] = [];
    const patterns: PatternDecl[] = [];
    const scores: ScoreDecl[] = [];
    const modules: ModuleDecl[] = [];
    const routers: RouterDecl[] = [];
    const skills: SkillDecl[] = [];
    const skilldocs: SkillDocDecl[] = [];
    const reasoners: ReasonerDecl[] = [];
    const triggers: TriggerDecl[] = [];
    const lifecycles: LifecycleDecl[] = [];
    const breeds: BreedDecl[] = [];
    const packets: PacketDecl[] = [];
    const authorities: AuthorityDecl[] = [];
    const channels: ChannelDecl[] = [];
    const identities: IdentityDecl[] = [];
    const feeds: FeedDecl[] = [];
    const nodes: NodeDecl[] = [];
    const sensors: SensorDecl[] = [];
    const zones: ZoneDecl[] = [];
    const sessions: SessionDecl[] = [];
    const compilers: CompilerDecl[] = [];
    const events: EventDecl[] = [];
    const nbves: NbveDecl[] = [];
    const contracts: ContractDecl[] = [];
    const reputations: ReputationDecl[] = [];
    const subscriptions: SubscriptionDecl[] = [];
    const disputes: DisputeDecl[] = [];
    const preferences: PreferenceDecl[] = [];
    const topLevelSeeds: TopLevelSeedDecl[] = [];

    while (!this.isAtEnd()) {
      const token = this.current();
      switch (token.type) {
        case TokenType.ENTITY:
          entities.push(this.parseEntity());
          break;
        case TokenType.ACTION:
          actions.push(this.parseAction());
          break;
        case TokenType.VIEW:
          views.push(this.parseView());
          break;
        case TokenType.AI_SERVICE:
          if (aiService) this.error('Only one AI_SERVICE declaration is allowed');
          aiService = this.parseAiService();
          break;
        case TokenType.TEST:
          tests.push(this.parseTest());
          break;
        case TokenType.RULE:
          rules.push(this.parseRule());
          break;
        case TokenType.WORKFLOW:
          workflows.push(this.parseWorkflow());
          break;
        case TokenType.PIPELINE:
          pipelines.push(this.parsePipeline());
          break;
        case TokenType.QC:
          qcs.push(this.parseQC());
          break;
        case TokenType.VAULT:
          if (vault) this.error('Only one VAULT declaration is allowed');
          vault = this.parseVault();
          break;
        case TokenType.FACT:
          facts.push(this.parseFact());
          break;
        case TokenType.STATE:
          states.push(this.parseState());
          break;
        case TokenType.PATTERN:
          patterns.push(this.parsePattern());
          break;
        case TokenType.SCORE:
          scores.push(this.parseScore());
          break;
        case TokenType.MODULE:
          modules.push(this.parseModule());
          break;
        case TokenType.ROUTER:
          routers.push(this.parseRouter());
          break;
        case TokenType.SKILL:
          skills.push(this.parseSkill());
          break;
        case TokenType.SKILLDOC:
          skilldocs.push(this.parseSkillDoc());
          break;
        case TokenType.REASONER:
          reasoners.push(this.parseReasoner());
          break;
        case TokenType.TRIGGER:
          triggers.push(this.parseTrigger());
          break;
        case TokenType.LIFECYCLE:
          lifecycles.push(this.parseLifecycle());
          break;
        case TokenType.BREED:
          breeds.push(this.parseBreed());
          break;
        case TokenType.PACKET:
          packets.push(this.parsePacket());
          break;
        case TokenType.AUTHORITY_KW:
          authorities.push(this.parseAuthority());
          break;
        case TokenType.CHANNEL:
          channels.push(this.parseChannel());
          break;
        case TokenType.IDENTITY:
          identities.push(this.parseIdentity());
          break;
        case TokenType.FEED:
          feeds.push(this.parseFeed());
          break;
        case TokenType.NODE:
          nodes.push(this.parseNode());
          break;
        case TokenType.SENSOR_KW:
          sensors.push(this.parseSensor());
          break;
        case TokenType.ZONE:
          zones.push(this.parseZone());
          break;
        case TokenType.SESSION:
          sessions.push(this.parseSession());
          break;
        case TokenType.COMPILER_KW:
          compilers.push(this.parseCompiler());
          break;
        case TokenType.EVENT_KW:
          events.push(this.parseEvent());
          break;
        case TokenType.NBVE_KW:
          nbves.push(this.parseNbve());
          break;
        case TokenType.CONTRACT_KW:
          contracts.push(this.parseContract());
          break;
        case TokenType.REPUTATION_KW:
          reputations.push(this.parseReputation());
          break;
        case TokenType.SUBSCRIPTION_KW:
          subscriptions.push(this.parseSubscription());
          break;
        case TokenType.DISPUTE_KW:
          disputes.push(this.parseDispute());
          break;
        case TokenType.PREFERENCE_KW:
          preferences.push(this.parsePreference());
          break;
        case TokenType.SEED:
          topLevelSeeds.push(this.parseTopLevelSeed());
          break;
        default:
          this.error(`Unexpected token: ${token.value}. Expected a top-level declaration`);
      }
    }

    return { app, entities, actions, views, aiService, tests, rules, workflows, pipelines, qcs, vault, facts, states, patterns, scores, modules, routers, skills, skilldocs, reasoners, triggers, lifecycles, breeds, packets, authorities, channels, identities, feeds, nodes, sensors, zones, sessions, compilers, events, nbves, contracts, reputations, subscriptions, disputes, preferences, topLevelSeeds };
  }

  // --- APP ---

  private parseApp(): AppDecl {
    const start = this.expectToken(TokenType.APP).location;
    const name = this.expectToken(TokenType.IDENTIFIER).value;
    this.expectToken(TokenType.LBRACE);

    let title = '';
    let window: AppDecl['window'];
    let db = '';
    let port: number | undefined;
    let theme: ThemeOption | undefined;
    let icon: string | undefined;
    let telemetry: TelemetryMode | undefined;
    let current: string[] | undefined;
    let workspaces: boolean | undefined;
    let tray: boolean | undefined;
    let hotkey: string | undefined;

    while (!this.check(TokenType.RBRACE)) {
      const field = this.current();
      switch (field.type) {
        case TokenType.TITLE:
          this.advance();
          title = this.expectToken(TokenType.STRING_LITERAL).value;
          break;
        case TokenType.WINDOW: {
          this.advance();
          const dim = this.expectToken(TokenType.DIMENSION).value;
          const [w, h] = dim.split('x').map(Number);
          let frameless = false;
          if (this.check(TokenType.IDENTIFIER) && this.current().value === 'frameless') {
            frameless = true;
            this.advance();
          }
          window = { width: w!, height: h!, frameless };
          break;
        }
        case TokenType.DB:
          this.advance();
          db = this.expectString();
          break;
        case TokenType.PORT:
          this.advance();
          port = Number(this.expectToken(TokenType.NUMBER_LITERAL).value);
          break;
        case TokenType.THEME:
          this.advance();
          theme = this.expectIdentifier() as ThemeOption;
          break;
        case TokenType.ICON:
          this.advance();
          icon = this.expectString();
          break;
        case TokenType.TELEMETRY:
          this.advance();
          telemetry = this.expectIdentifier() as TelemetryMode;
          break;
        case TokenType.CURRENT: {
          // CURRENT <Ident>(, <Ident>)*
          // Names are entity references — we don't validate they resolve
          // here (parser doesn't track entities); we just collect the names
          // and let later passes / the codegen verify correspondence.
          this.advance();
          const names: string[] = [this.expectIdentifier()];
          while (this.check(TokenType.COMMA)) {
            this.advance();
            names.push(this.expectIdentifier());
          }
          current = names;
          break;
        }
        case TokenType.WORKSPACES:
          this.advance();
          workspaces = true;
          break;
        case TokenType.TRAY:
          this.advance();
          tray = true;
          break;
        case TokenType.HOTKEY:
          this.advance();
          hotkey = this.expectToken(TokenType.STRING_LITERAL).value;
          break;
        default:
          this.error(`Unexpected field in APP: ${field.value}`);
      }
    }

    const end = this.expectToken(TokenType.RBRACE).location;

    if (!title) this.error('APP requires a TITLE field');
    if (!db) this.error('APP requires a DB field');

    return { kind: 'app', name, title, window, db, port, theme, icon, telemetry, current, workspaces, tray, hotkey, span: { start, end } };
  }

  // --- ENTITY ---

  private parseEntity(): EntityDecl {
    const start = this.expectToken(TokenType.ENTITY).location;
    const name = this.expectIdentifier();
    let singleton = false;
    if (this.check(TokenType.SINGLETON_KW)) {
      singleton = true;
      this.advance();
    }
    this.expectToken(TokenType.LBRACE);

    const fields: FieldDef[] = [];
    let timestamps = false;
    let crud: CrudOp[] | 'full' = 'full';
    const relationships: Relationship[] = [];
    let order: EntityOrder | undefined;
    const seeds: SeedRecord[] = [];

    while (!this.check(TokenType.RBRACE)) {
      const token = this.current();

      if (token.type === TokenType.TIMESTAMPS) {
        timestamps = true;
        this.advance();
        continue;
      }

      if (token.type === TokenType.CRUD) {
        this.advance();
        if (this.check(TokenType.FULL)) {
          crud = 'full';
          this.advance();
        } else if (this.check(TokenType.IDENTIFIER)) {
          // named ops: create, read, update, delete, list
          crud = this.parseIdentifierList() as CrudOp[];
        } else {
          // bare CRUD with no arguments defaults to 'full'
          crud = 'full';
        }
        continue;
      }

      if (token.type === TokenType.BELONGS_TO) {
        this.advance();
        const target = this.expectIdentifier();
        relationships.push({ type: 'BELONGS_TO', target, span: this.spanFrom(token.location) });
        continue;
      }

      if (token.type === TokenType.HAS_MANY) {
        this.advance();
        const target = this.expectIdentifier();
        relationships.push({ type: 'HAS_MANY', target, span: this.spanFrom(token.location) });
        continue;
      }

      // ORDER [fieldname] ASC | DESC — drives generated list query default-sort direction.
      // An optional field name may precede ASC/DESC (e.g. ORDER name ASC).
      // For multi-key ORDER (ORDER tier ASC, activity_name ASC) we take the
      // first field's direction and skip the rest.
      // Missing => undefined here; codegen falls back to DESC for back-compat.
      if (token.type === TokenType.ORDER) {
        this.advance();
        // Skip optional field name(s): consume IDENTIFIER tokens until ASC/DESC
        while (this.check(TokenType.IDENTIFIER)) {
          this.advance(); // consume field name
          // consume comma between multiple ORDER fields
          this.consumeIf(TokenType.COMMA);
        }
        const dirTok = this.current();
        if (dirTok.type === TokenType.ASC) {
          order = 'ASC';
          this.advance();
        } else if (dirTok.type === TokenType.DESC) {
          order = 'DESC';
          this.advance();
        } else {
          this.error(`ORDER must be followed by ASC or DESC, got: ${dirTok.value}`);
        }
        // Skip any remaining comma-separated order fields (e.g. ", activity_name ASC")
        while (this.check(TokenType.COMMA)) {
          this.advance(); // consume comma
          // skip optional field name
          if (this.check(TokenType.IDENTIFIER)) this.advance();
          // skip direction
          if (this.check(TokenType.ASC) || this.check(TokenType.DESC)) this.advance();
        }
        continue;
      }

      // SEED { key: value ... } — emits one INSERT OR IGNORE in migration SQL.
      // Multiple SEED blocks per entity are allowed (each yields one row).
      if (token.type === TokenType.SEED) {
        const seedStart = this.advance().location;
        this.expectToken(TokenType.LBRACE);
        const fieldsMap = new Map<string, LiteralValue>();
        while (!this.check(TokenType.RBRACE)) {
          const key = this.expectIdentifier();
          this.expectToken(TokenType.COLON);
          const value = this.parseLiteral();
          fieldsMap.set(key, value);
        }
        const seedEnd = this.expectToken(TokenType.RBRACE).location;
        seeds.push({ fields: fieldsMap, span: { start: seedStart, end: seedEnd } });
        continue;
      }

      // FIELDS { } wrapper block
      if (token.type === TokenType.FIELDS) {
        this.advance(); // consume FIELDS
        this.expectToken(TokenType.LBRACE);
        while (!this.check(TokenType.RBRACE) && !this.isAtEnd()) {
          fields.push(this.parseFieldDefFlex());
        }
        this.expectToken(TokenType.RBRACE);
        continue;
      }

      // Must be a field definition: name: type [= default] [modifiers]
      fields.push(this.parseFieldDef());
    }

    const end = this.expectToken(TokenType.RBRACE).location;
    const decl: EntityDecl = { kind: 'entity', name, fields, timestamps, crud, relationships, span: { start, end } };
    if (order !== undefined) decl.order = order;
    if (seeds.length > 0) decl.seeds = seeds;
    if (singleton) decl.singleton = true;
    return decl;
  }

  /**
   * Flexible field parser: handles both colon syntax (name: type) and
   * SQL block syntax (name TYPE [REQUIRED] [DEFAULT value]).
   * Detects by whether the token after the name is COLON or not.
   */
  private parseFieldDefFlex(): FieldDef {
    const start = this.current().location;
    const name = this.expectIdentifier();
    // If next token is COLON, use existing syntax
    if (this.check(TokenType.COLON)) {
      this.advance(); // consume colon
      const type = this.parseType();
      let defaultValue: LiteralValue | undefined;
      if (this.check(TokenType.EQUALS)) {
        this.advance();
        defaultValue = this.parseLiteral();
      }
      const modifiers: FieldModifier[] = [];
      while (this.check(TokenType.REQUIRED) || this.check(TokenType.UNIQUE) || this.check(TokenType.INDEX)) {
        modifiers.push(this.advance().value as FieldModifier);
      }
      return { name, type, defaultValue, modifiers, span: this.spanFrom(start) };
    }
    // SQL block syntax: name TYPE [REQUIRED] [DEFAULT value]
    const type = this.parseType();
    const modifiers: FieldModifier[] = [];
    let defaultValue: LiteralValue | undefined;
    // optional REQUIRED
    if (this.check(TokenType.REQUIRED)) {
      modifiers.push('REQUIRED');
      this.advance();
    }
    // optional DEFAULT value
    if (this.check(TokenType.DEFAULT)) {
      this.advance();
      defaultValue = this.parseLiteral();
    }
    return { name, type, defaultValue, modifiers, span: this.spanFrom(start) };
  }

  private parseFieldDef(): FieldDef {
    const start = this.current().location;
    const name = this.expectIdentifier();
    this.expectToken(TokenType.COLON);
    const type = this.parseType();

    let defaultValue: LiteralValue | undefined;
    if (this.check(TokenType.EQUALS)) {
      this.advance();
      defaultValue = this.parseLiteral();
    }

    const modifiers: FieldModifier[] = [];
    while (
      this.check(TokenType.REQUIRED) ||
      this.check(TokenType.UNIQUE) ||
      this.check(TokenType.INDEX)
    ) {
      modifiers.push(this.advance().value as FieldModifier);
    }

    return { name, type, defaultValue, modifiers, span: this.spanFrom(start) };
  }

  private parseType(): AgiType {
    const token = this.current();
    const typeMap: Record<string, AgiType> = {
      [TokenType.TYPE_STRING]: 'string',
      [TokenType.TYPE_NUMBER]: 'number',
      [TokenType.TYPE_FLOAT]: 'float',
      [TokenType.TYPE_BOOL]: 'bool',
      [TokenType.TYPE_DATE]: 'date',
      [TokenType.TYPE_DATETIME]: 'datetime',
      [TokenType.TYPE_JSON]: 'json',
      [TokenType.TYPE_ID]: 'id',
    };
    const agiType = typeMap[token.type];
    if (agiType) { this.advance(); return agiType; }
    // SQL-style type aliases — these are identifiers in the lexer
    if (token.type === TokenType.IDENTIFIER) {
      const sqlAliases: Record<string, AgiType> = {
        TEXT: 'string', INTEGER: 'number', REAL: 'float',
        DATE: 'date', DATETIME: 'datetime', BOOLEAN: 'bool',
      };
      const mapped = sqlAliases[token.value.toUpperCase()];
      if (mapped) { this.advance(); return mapped; }
    }
    this.error(`Expected type, got: ${token.value}`);
  }

  // --- ACTION ---

  private parseAction(): ActionDecl {
    const start = this.expectToken(TokenType.ACTION).location;
    const name = this.expectIdentifier();
    this.expectToken(TokenType.LBRACE);

    let input: ActionParam[] = [];
    let output: ActionOutput[] = [];
    let ai: string | undefined;
    let stream = false;
    let impl: string | undefined;
    let pattern: string | undefined;
    let emit: ActionEmit | undefined;

    while (!this.check(TokenType.RBRACE)) {
      const token = this.current();
      switch (token.type) {
        case TokenType.INPUT:
          this.advance();
          input = this.parseActionParams();
          break;
        case TokenType.OUTPUT:
          this.advance();
          // Accumulate multiple OUTPUT lines rather than replacing
          output = output.concat(this.parseActionOutputs());
          break;
        case TokenType.AI:
          this.advance();
          // AI may appear bare (string provided later via PROMPT) or with a string
          if (this.check(TokenType.STRING_LITERAL)) {
            ai = this.advance().value;
          } else {
            ai = ''; // will be set by PROMPT block if present
          }
          break;
        case TokenType.PROMPT:
          this.advance();
          ai = this.expectToken(TokenType.STRING_LITERAL).value;
          break;
        case TokenType.STREAM:
          this.advance();
          stream = this.parseBoolValue();
          break;
        case TokenType.IMPL_KW:
          this.advance();
          // IMPL may appear bare (use action name as impl id) or with a string
          if (this.check(TokenType.STRING_LITERAL)) {
            impl = this.advance().value;
          } else {
            impl = name; // default to action name
          }
          break;
        case TokenType.PATTERN:
          this.advance();
          pattern = this.advance().value; // identifier: file_handler, shell_open, etc.
          break;
        case TokenType.EMIT_KW: {
          this.advance();
          const eventName = this.expectIdentifier();
          this.expectToken(TokenType.LBRACE);
          const emitFields: ActionEmitField[] = [];
          while (!this.check(TokenType.RBRACE)) {
            const fn2 = this.expectIdentifier();
            this.expectToken(TokenType.COLON);
            const ft = this.current().value;
            this.advance();
            emitFields.push({ name: fn2, type: ft });
            this.consumeIf(TokenType.COMMA);
          }
          this.expectToken(TokenType.RBRACE);
          emit = { eventName, fields: emitFields };
          break;
        }
        default:
          this.error(`Unexpected field in ACTION: ${token.value}`);
      }
    }

    const end = this.expectToken(TokenType.RBRACE).location;
    const decl: ActionDecl = { kind: 'action', name, input, output, ai, stream, span: { start, end } };
    if (impl !== undefined) decl.impl = impl;
    if (pattern !== undefined) decl.pattern = pattern;
    if (emit !== undefined) decl.emit = emit;
    return decl;
  }

  private parseActionParams(): ActionParam[] {
    // Block format: INPUT { fieldname TYPE [REQUIRED] [DEFAULT value] ... }
    if (this.check(TokenType.LBRACE)) {
      this.advance(); // consume {
      const params: ActionParam[] = [];
      while (!this.check(TokenType.RBRACE) && !this.isAtEnd()) {
        if (this.isTopLevelKeyword(this.current().type)) break;
        const name = this.expectIdentifier();
        const type = this.parseType();
        let defaultValue: LiteralValue | undefined;
        // optional REQUIRED modifier
        if (this.check(TokenType.REQUIRED)) this.advance();
        // optional DEFAULT value
        if (this.check(TokenType.DEFAULT)) {
          this.advance();
          defaultValue = this.parseLiteral();
        }
        params.push({ name, type, defaultValue });
      }
      this.expectToken(TokenType.RBRACE);
      return params;
    }
    // Inline comma-separated format: name: type [= default], ...
    const params: ActionParam[] = [];
    do {
      if (this.check(TokenType.RBRACE)) break;
      // Peek ahead - if next meaningful tokens aren't name:type pattern, break
      if (this.isTopLevelKeyword(this.current().type)) break;

      const name = this.expectIdentifier();
      this.expectToken(TokenType.COLON);
      const type = this.parseType();
      let defaultValue: LiteralValue | undefined;
      if (this.check(TokenType.EQUALS)) {
        this.advance();
        defaultValue = this.parseLiteral();
      }
      params.push({ name, type, defaultValue });
    } while (this.consumeIf(TokenType.COMMA));
    return params;
  }

  private parseActionOutputs(): ActionOutput[] {
    // Block format: OUTPUT { fieldname TYPE [REQUIRED] [DEFAULT value] ... }
    if (this.check(TokenType.LBRACE)) {
      this.advance(); // consume {
      const outputs: ActionOutput[] = [];
      while (!this.check(TokenType.RBRACE) && !this.isAtEnd()) {
        if (this.isTopLevelKeyword(this.current().type)) break;
        const name = this.expectIdentifier();
        // Output type: accept AgiType or SQL alias
        const type = this.parseOutputType();
        // absorb optional REQUIRED / DEFAULT modifiers silently
        if (this.check(TokenType.REQUIRED)) this.advance();
        if (this.check(TokenType.DEFAULT)) {
          this.advance();
          this.parseLiteral(); // consume but discard
        }
        outputs.push({ name, type });
      }
      this.expectToken(TokenType.RBRACE);
      return outputs;
    }
    // Inline comma-separated format
    const outputs: ActionOutput[] = [];
    do {
      if (this.check(TokenType.RBRACE)) break;
      if (this.isTopLevelKeyword(this.current().type)) break;
      const name = this.expectIdentifier();
      this.expectToken(TokenType.COLON);
      // Output type can be a primitive type keyword OR an entity name
      const token = this.current();
      let type: string;
      if (token.type === TokenType.IDENTIFIER) {
        type = this.advance().value;
      } else if (token.type >= TokenType.TYPE_STRING && token.type <= TokenType.TYPE_ID) {
        type = this.advance().value;
      } else {
        type = this.advance().value; // Accept any token value as type name
      }
      // Handle union suffixes: | null, | undefined, | string, etc.
      while (this.check(TokenType.PIPE)) {
        this.advance(); // consume |
        type += ' | ' + this.advance().value;
      }
      outputs.push({ name, type });
    } while (this.consumeIf(TokenType.COMMA));
    return outputs;
  }

  /** Parse an output type — accepts AgiType tokens, SQL aliases, or bare identifiers. */
  private parseOutputType(): string {
    const token = this.current();
    // SQL-style identifier aliases
    if (token.type === TokenType.IDENTIFIER) {
      const sqlAliases: Record<string, string> = {
        TEXT: 'string', INTEGER: 'number', REAL: 'float',
        DATE: 'date', DATETIME: 'datetime', BOOLEAN: 'bool',
      };
      const mapped = sqlAliases[token.value.toUpperCase()];
      if (mapped) { this.advance(); return mapped; }
      return this.advance().value; // bare entity name or other identifier
    }
    // Standard type tokens
    return this.advance().value;
  }

  // --- VIEW ---

  private parseView(): ViewDecl {
    const start = this.expectToken(TokenType.VIEW).location;
    const name = this.expectIdentifier();
    this.expectToken(TokenType.LBRACE);

    let entity: string | undefined;
    let layout: LayoutType = 'custom';
    let actions: string[] = [];
    let sidebar: ViewDecl['sidebar'];
    let fields: string[] = [];
    let title: string | undefined;

    while (!this.check(TokenType.RBRACE)) {
      const token = this.current();
      switch (token.type) {
        case TokenType.ENTITY:
          this.advance();
          entity = this.expectIdentifier();
          break;
        case TokenType.LAYOUT:
          this.advance();
          layout = this.parseLayoutType();
          break;
        case TokenType.ACTIONS:
          this.advance();
          if (this.check(TokenType.LBRACKET)) {
            actions = this.parseBracketedIdentifierList();
          } else if (this.check(TokenType.STRING_LITERAL) && this.current().value === '[]') {
            this.advance(); // consume '[]' token — empty action list
            actions = [];
          } else {
            actions = this.parseIdentifierList();
          }
          break;
        case TokenType.SIDEBAR:
          this.advance();
          sidebar = this.parseSidebar();
          break;
        case TokenType.FIELDS:
          this.advance();
          fields = this.parseIdentifierList();
          break;
        case TokenType.TITLE:
          this.advance();
          title = this.expectToken(TokenType.STRING_LITERAL).value;
          break;
        default:
          this.error(`Unexpected field in VIEW: ${token.value}`);
      }
    }

    const end = this.expectToken(TokenType.RBRACE).location;
    return { kind: 'view', name, entity, layout, actions, sidebar, fields, title, span: { start, end } };
  }

  private parseLayoutType(): LayoutType {
    const token = this.current();
    const layoutMap: Record<string, LayoutType> = {
      [TokenType.LAYOUT_TABLE]: 'table',
      [TokenType.LAYOUT_FORM]: 'form',
      [TokenType.LAYOUT_DETAIL]: 'detail',
      [TokenType.LAYOUT_CARDS]: 'cards',
      [TokenType.LAYOUT_SPLIT]: 'split',
      [TokenType.LAYOUT_CUSTOM]: 'custom',
      [TokenType.LAYOUT_DOCUMENT_EDITOR]: 'document_editor',
      [TokenType.LAYOUT_SETTINGS]: 'settings',
    };
    const lt = layoutMap[token.type];
    if (lt) { this.advance(); return lt; }
    // Identifier aliases: 'list' -> 'table', 'kanban' -> 'cards'
    if (token.type === TokenType.IDENTIFIER) {
      const identAliases: Record<string, LayoutType> = {
        list: 'table', kanban: 'cards', grid: 'cards',
      };
      const mapped = identAliases[token.value];
      if (mapped) { this.advance(); return mapped; }
    }
    this.error(`Expected layout type, got: ${token.value}`);
  }

  private parseSidebar(): { icon: string } {
    // SIDEBAR icon: IconName
    const iconKeyword = this.expectIdentifier();
    if (iconKeyword !== 'icon') this.error(`Expected 'icon' after SIDEBAR, got: ${iconKeyword}`);
    this.expectToken(TokenType.COLON);
    const icon = this.expectIdentifier();
    return { icon };
  }

  // --- AI_SERVICE ---

  private parseAiService(): AiServiceDecl {
    const start = this.expectToken(TokenType.AI_SERVICE).location;
    this.expectToken(TokenType.LBRACE);

    let providers: string[] = [];
    let keysFile = '';
    let defaultProvider: string | undefined;
    let streaming = true;
    let models: ModelEntry[] = [];

    while (!this.check(TokenType.RBRACE)) {
      const token = this.current();
      switch (token.type) {
        case TokenType.PROVIDERS:
          this.advance();
          providers = this.parseIdentifierList();
          break;
        case TokenType.KEYS_FILE:
          this.advance();
          keysFile = this.expectToken(TokenType.STRING_LITERAL).value;
          break;
        case TokenType.DEFAULT:
          this.advance();
          defaultProvider = this.expectIdentifier();
          break;
        case TokenType.STREAMING:
          this.advance();
          streaming = this.parseBoolValue();
          break;
        case TokenType.MODELS:
          this.advance();
          models = this.parseModels();
          break;
        default:
          this.error(`Unexpected field in AI_SERVICE: ${token.value}`);
      }
    }

    const end = this.expectToken(TokenType.RBRACE).location;
    return { kind: 'ai_service', providers, keysFile, defaultProvider, streaming, models, span: { start, end } };
  }

  /**
   * Parse the MODELS block of AI_SERVICE. Each line is:
   *
   *   <provider-ident> <"model-id-string"> [LABEL "..."]? [DEFAULT]?
   *
   * LABEL and DEFAULT modifiers may appear in either order and either may be
   * omitted. Multiple entries per provider are allowed. At most ONE entry per
   * provider may carry the DEFAULT marker — if none is marked, the first
   * entry for that provider becomes the implicit default.
   */
  private parseModels(): ModelEntry[] {
    this.expectToken(TokenType.LBRACE);
    const models: ModelEntry[] = [];
    while (!this.check(TokenType.RBRACE)) {
      const lineLocation = this.current().location;
      const provider = this.expectIdentifier();
      const id = this.expectToken(TokenType.STRING_LITERAL).value;

      let label: string | undefined;
      let isDefault = false;

      // LABEL and DEFAULT can appear in any order, each at most once on the
      // line. Stop reading modifiers when we see anything that isn't one of
      // them — the next provider identifier or the closing brace.
      while (this.check(TokenType.LABEL) || this.check(TokenType.DEFAULT)) {
        if (this.check(TokenType.LABEL)) {
          if (label !== undefined) {
            this.error(`Duplicate LABEL for model '${id}'`);
          }
          this.advance();
          label = this.expectToken(TokenType.STRING_LITERAL).value;
        } else {
          // DEFAULT modifier
          if (isDefault) {
            this.error(`Duplicate DEFAULT marker on model '${id}'`);
          }
          this.advance();
          isDefault = true;
        }
      }

      models.push({ provider, id, label, isDefault });
      // Validate: at most one DEFAULT per provider
      if (isDefault) {
        const existingDefault = models.find(
          m => m.provider === provider && m.isDefault && m.id !== id
        );
        if (existingDefault) {
          throw new ParseError(
            `Provider '${provider}' has multiple DEFAULT models ('${existingDefault.id}' and '${id}') — only one is allowed`,
            lineLocation
          );
        }
      }
    }
    this.expectToken(TokenType.RBRACE);

    // Promote first-declared-per-provider to default when no explicit DEFAULT
    // was given. Iterate in source order so the first occurrence wins.
    const seenProviders = new Set<string>();
    const providersWithExplicitDefault = new Set(
      models.filter(m => m.isDefault).map(m => m.provider)
    );
    for (const m of models) {
      if (providersWithExplicitDefault.has(m.provider)) continue;
      if (!seenProviders.has(m.provider)) {
        m.isDefault = true;
        seenProviders.add(m.provider);
      }
    }

    return models;
  }

  // --- TEST ---

  private parseTest(): TestDecl {
    const start = this.expectToken(TokenType.TEST).location;
    const name = this.expectIdentifier();
    this.expectToken(TokenType.LBRACE);

    const givens: TestGiven[] = [];
    const expects: TestExpect[] = [];

    while (!this.check(TokenType.RBRACE)) {
      const token = this.current();
      if (token.type === TokenType.GIVEN) {
        givens.push(this.parseTestGiven());
      } else if (token.type === TokenType.EXPECT) {
        expects.push(this.parseTestExpect());
      } else {
        this.error(`Expected GIVEN or EXPECT in TEST, got: ${token.value}`);
      }
    }

    const end = this.expectToken(TokenType.RBRACE).location;
    return { kind: 'test', name, givens, expects, span: { start, end } };
  }

  private parseTestGiven(): TestGiven {
    const start = this.expectToken(TokenType.GIVEN).location;
    const entity = this.expectIdentifier();
    this.expectToken(TokenType.LBRACE);

    const fields: Record<string, LiteralValue> = {};
    const belongsTo: Record<string, string> = {};

    while (!this.check(TokenType.RBRACE)) {
      if (this.check(TokenType.BELONGS_TO)) {
        this.advance();
        const target = this.expectIdentifier();
        belongsTo[target] = target;
        if (this.check(TokenType.COMMA)) this.advance();
        continue;
      }
      const fieldName = this.expectIdentifier();
      this.expectToken(TokenType.COLON);
      fields[fieldName] = this.parseLiteral();
      if (this.check(TokenType.COMMA)) this.advance();
    }

    this.expectToken(TokenType.RBRACE);
    return {
      entity,
      fields,
      belongsTo: Object.keys(belongsTo).length > 0 ? belongsTo : undefined,
      span: this.spanFrom(start),
    };
  }

  private parseTestExpect(): TestExpect {
    const start = this.expectToken(TokenType.EXPECT).location;
    const operation = this.expectIdentifier();

    let updateFields: Record<string, LiteralValue> | undefined;
    if (this.check(TokenType.LBRACE)) {
      this.advance();
      updateFields = {};
      while (!this.check(TokenType.RBRACE)) {
        const field = this.expectIdentifier();
        this.expectToken(TokenType.COLON);
        updateFields[field] = this.parseLiteral();
        if (this.check(TokenType.COMMA)) this.advance();
      }
      this.expectToken(TokenType.RBRACE);
    }

    this.expectToken(TokenType.ARROW);

    // Parse assertion: [field] op [value]
    let field: string | undefined;
    let op: AssertionOp;
    let value: LiteralValue | undefined;

    // Check for HAS_LENGTH first (no field prefix)
    if (this.check(TokenType.HAS_LENGTH)) {
      this.advance();
      op = 'HAS_LENGTH';
      const cmpOp = this.current();
      if (cmpOp.type === TokenType.GT || cmpOp.type === TokenType.LT ||
          cmpOp.type === TokenType.GTE || cmpOp.type === TokenType.LTE ||
          cmpOp.type === TokenType.EQ_EQ) {
        this.advance();
        value = this.parseNumericLiteral();
      }
    } else {
      // Could be: field op value, or just op value
      const nextToken = this.current();

      // Accept identifiers and type keywords (like 'id') as field names
      if (nextToken.type === TokenType.IDENTIFIER ||
          nextToken.type === TokenType.TYPE_ID ||
          nextToken.type === TokenType.TYPE_STRING ||
          nextToken.type === TokenType.TYPE_NUMBER ||
          nextToken.type === TokenType.TYPE_BOOL) {
        // Only treat as field name if the NEXT token after it is an operator
        const lookahead = this.tokens[this.pos + 1];
        if (lookahead && this.isAssertionOp(lookahead.type)) {
          field = this.advance().value;
        }
      }

      op = this.parseAssertionOp();

      if (op === 'HAS_LENGTH') {
        // HAS_LENGTH is followed by an optional comparison: > 0, == 5, etc.
        const cmpOp = this.current();
        if (cmpOp.type === TokenType.GT || cmpOp.type === TokenType.LT ||
            cmpOp.type === TokenType.GTE || cmpOp.type === TokenType.LTE ||
            cmpOp.type === TokenType.EQ_EQ) {
          this.advance();
          value = this.parseNumericLiteral();
        }
      } else if (op !== 'IS NOT NULL' && op !== 'IS NULL') {
        value = this.parseLiteral();
      }
    }

    return {
      operation,
      updateFields,
      assertion: { field, op: op!, value },
      span: this.spanFrom(start),
    };
  }

  private parseAssertionOp(): AssertionOp {
    const token = this.current();

    if (token.type === TokenType.EQ_EQ) { this.advance(); return '=='; }
    if (token.type === TokenType.NEQ) { this.advance(); return '!='; }
    if (token.type === TokenType.GT) { this.advance(); return '>'; }
    if (token.type === TokenType.LT) { this.advance(); return '<'; }
    if (token.type === TokenType.GTE) { this.advance(); return '>='; }
    if (token.type === TokenType.LTE) { this.advance(); return '<='; }
    if (token.type === TokenType.CONTAINS) { this.advance(); return 'CONTAINS'; }
    if (token.type === TokenType.MATCHES) { this.advance(); return 'MATCHES'; }
    if (token.type === TokenType.HAS_LENGTH) { this.advance(); return 'HAS_LENGTH'; }

    if (token.type === TokenType.IS) {
      this.advance();
      if (this.check(TokenType.NOT)) {
        this.advance();
        this.expectToken(TokenType.NULL);
        return 'IS NOT NULL';
      }
      this.expectToken(TokenType.NULL);
      return 'IS NULL';
    }

    this.error(`Expected assertion operator, got: ${token.value}`);
  }

  // --- RULE ---

  private isAssertionOp(type: TokenType): boolean {
    return type === TokenType.EQ_EQ || type === TokenType.NEQ ||
           type === TokenType.GT || type === TokenType.LT ||
           type === TokenType.GTE || type === TokenType.LTE ||
           type === TokenType.CONTAINS || type === TokenType.MATCHES ||
           type === TokenType.HAS_LENGTH || type === TokenType.IS;
  }

  private parseRule(): RuleDecl {
    const start = this.expectToken(TokenType.RULE).location;
    const name = this.expectIdentifier();
    this.expectToken(TokenType.LBRACE);

    const conditions: RuleCondition[] = [];
    let action = '';
    let priority = 0;

    while (!this.check(TokenType.RBRACE)) {
      const token = this.current();

      if (token.type === TokenType.WHEN || token.type === TokenType.AND ||
          token.type === TokenType.OR || token.type === TokenType.UNLESS) {
        const connector = token.type === TokenType.WHEN ? undefined : token.value as RuleCondition['connector'];
        this.advance();
        const field = this.parseQualifiedName();
        const op = this.advance().value;
        const value = this.parseLiteral();
        conditions.push({ field, op, value, connector });
        continue;
      }

      if (token.type === TokenType.THEN) {
        this.advance();
        action = this.expectIdentifier();
        continue;
      }

      if (token.type === TokenType.PRIORITY) {
        this.advance();
        priority = Number(this.expectToken(TokenType.NUMBER_LITERAL).value);
        continue;
      }

      this.error(`Unexpected token in RULE: ${token.value}`);
    }

    const end = this.expectToken(TokenType.RBRACE).location;
    return { kind: 'rule', name, conditions, action, priority, span: { start, end } };
  }

  // --- WORKFLOW ---

  private parseWorkflow(): WorkflowDecl {
    const start = this.expectToken(TokenType.WORKFLOW).location;
    const name = this.expectIdentifier();
    this.expectToken(TokenType.LBRACE);

    const steps: WorkflowStep[] = [];
    let parallel: string[] | undefined;
    let idempotent: boolean | undefined;

    while (!this.check(TokenType.RBRACE)) {
      const token = this.current();

      if (token.type === TokenType.STEP) {
        steps.push(this.parseWorkflowStep());
        continue;
      }

      if (token.type === TokenType.PARALLEL) {
        this.advance();
        parallel = this.parseIdentifierList();
        continue;
      }

      if (token.type === TokenType.IDEMPOTENT) {
        this.advance();
        idempotent = this.parseBoolValue();
        continue;
      }

      this.error(`Expected STEP, PARALLEL, or IDEMPOTENT in WORKFLOW, got: ${token.value}`);
    }

    const end = this.expectToken(TokenType.RBRACE).location;
    return { kind: 'workflow', name, steps, parallel, idempotent, span: { start, end } };
  }

  private parseWorkflowStep(): WorkflowStep {
    const start = this.expectToken(TokenType.STEP).location;
    const name = this.expectIdentifier();
    this.expectToken(TokenType.LBRACE);

    let action = '';
    let input: Record<string, string> | undefined;
    let onFail: OnFailBehavior = 'stop';

    while (!this.check(TokenType.RBRACE)) {
      const token = this.current();

      if (token.type === TokenType.ACTION) {
        this.advance();
        action = this.expectIdentifier();
        continue;
      }

      if (token.type === TokenType.INPUT) {
        this.advance();
        input = this.parseKeyValuePairs();
        continue;
      }

      if (token.type === TokenType.ON_FAIL) {
        this.advance();
        onFail = this.parseOnFail();
        continue;
      }

      this.error(`Unexpected token in STEP: ${token.value}`);
    }

    this.expectToken(TokenType.RBRACE);
    return { name, action, input, onFail, span: this.spanFrom(start) };
  }

  private parseOnFail(): OnFailBehavior {
    const token = this.current();
    const map: Record<string, OnFailBehavior> = {
      [TokenType.FAIL_STOP]: 'stop',
      [TokenType.FAIL_SKIP]: 'skip',
      [TokenType.FAIL_RETRY]: 'retry',
      [TokenType.FAIL_FALLBACK]: 'fallback',
    };
    const behavior = map[token.type];
    if (!behavior) this.error(`Expected on-fail behavior (stop, skip, retry, fallback), got: ${token.value}`);
    this.advance();
    return behavior;
  }

  private parseKeyValuePairs(): Record<string, string> {
    const pairs: Record<string, string> = {};
    do {
      if (this.check(TokenType.RBRACE)) break;
      if (this.isTopLevelKeyword(this.current().type) || this.current().type === TokenType.ON_FAIL) break;
      const key = this.expectIdentifier();
      this.expectToken(TokenType.COLON);
      // Value can be dotted path or string
      let value: string;
      if (this.check(TokenType.STRING_LITERAL)) {
        value = this.advance().value;
      } else {
        value = this.parseQualifiedName();
      }
      pairs[key] = value;
    } while (this.consumeIf(TokenType.COMMA));
    return pairs;
  }

  // --- PIPELINE ---

  private parsePipeline(): PipelineDecl {
    const start = this.expectToken(TokenType.PIPELINE).location;
    const name = this.expectIdentifier();
    this.expectToken(TokenType.LBRACE);

    let description = '';
    const rows: PipelineRow[] = [];
    const connections: PipelineConnection[] = [];
    let idempotent: boolean | undefined;

    while (!this.check(TokenType.RBRACE)) {
      const token = this.current();

      if (token.type === TokenType.DESCRIPTION) {
        this.advance();
        description = this.expectToken(TokenType.STRING_LITERAL).value;
        continue;
      }

      if (token.type === TokenType.ROW) {
        rows.push(this.parsePipelineRow());
        continue;
      }

      if (token.type === TokenType.CONNECTION) {
        connections.push(this.parsePipelineConnection());
        continue;
      }

      if (token.type === TokenType.IDEMPOTENT) {
        this.advance();
        idempotent = this.parseBoolValue();
        continue;
      }

      this.error(`Unexpected token in PIPELINE: ${token.value}`);
    }

    const end = this.expectToken(TokenType.RBRACE).location;
    return { kind: 'pipeline', name, description, rows, connections, idempotent, span: { start, end } };
  }

  private parsePipelineRow(): PipelineRow {
    const start = this.expectToken(TokenType.ROW).location;
    const name = this.expectIdentifier();
    this.expectToken(TokenType.LBRACE);

    const modules: PipelineModule[] = [];

    while (!this.check(TokenType.RBRACE)) {
      modules.push(this.parsePipelineModule());
    }

    this.expectToken(TokenType.RBRACE);
    return { name, modules, span: this.spanFrom(start) };
  }

  private parsePipelineModule(): PipelineModule {
    const start = this.current().location;
    const name = this.expectIdentifier();
    this.expectToken(TokenType.COLON);

    // Module type
    const typeToken = this.advance();
    const type = typeToken.value as PipelineModuleType;

    this.expectToken(TokenType.LBRACE);

    const config: Record<string, LiteralValue | string> = {};

    while (!this.check(TokenType.RBRACE)) {
      const key = this.advance().value;
      const value = this.check(TokenType.STRING_LITERAL)
        ? this.advance().value
        : this.check(TokenType.NUMBER_LITERAL)
          ? Number(this.advance().value)
          : this.check(TokenType.TRUE)
            ? (this.advance(), true)
            : this.check(TokenType.FALSE)
              ? (this.advance(), false)
              : this.parseInlineExpressionForConfig();
      config[key] = value;
    }

    this.expectToken(TokenType.RBRACE);
    return { name, type, config, span: this.spanFrom(start) };
  }

  private parseInlineExpressionForConfig(): string {
    // Read tokens until we hit a line-ending keyword or closing brace
    const parts: string[] = [];
    while (
      !this.check(TokenType.RBRACE) &&
      !this.check(TokenType.MODEL) &&
      !this.check(TokenType.PROMPT) &&
      !this.check(TokenType.TAGS) &&
      !this.check(TokenType.OUTPUT_TYPE) &&
      !this.check(TokenType.SPC) &&
      !this.check(TokenType.DESCRIPTION) &&
      !this.check(TokenType.EOF)
    ) {
      // If we see a string literal, that's likely the value for the CURRENT key
      if (this.check(TokenType.STRING_LITERAL)) {
        parts.push(this.advance().value);
        break;
      }
      parts.push(this.advance().value);
    }
    return parts.join(' ');
  }

  private parsePipelineConnection(): PipelineConnection {
    const start = this.expectToken(TokenType.CONNECTION).location;
    // Parse: from_module.output -> to_module.input
    const fromModule = this.expectIdentifier();
    this.expectToken(TokenType.DOT);
    const fromOutput = this.expectIdentifier();
    this.expectToken(TokenType.ARROW);
    const toModule = this.expectIdentifier();
    this.expectToken(TokenType.DOT);
    const toInput = this.expectIdentifier();
    return { fromModule, fromOutput, toModule, toInput, span: this.spanFrom(start) };
  }

  // --- QC ---

  private parseQC(): QCDecl {
    const start = this.expectToken(TokenType.QC).location;
    const name = this.expectIdentifier();
    this.expectToken(TokenType.LBRACE);

    let youngThreshold = 50;
    let maturingThreshold = 100;
    let youngPassRate = 0.80;
    let maturePassRate = 0.95;
    let maturingSample = 0.50;
    let matureSample = 0.05;

    while (!this.check(TokenType.RBRACE)) {
      const token = this.current();

      if (token.type === TokenType.YOUNG_THRESHOLD) {
        this.advance();
        youngThreshold = Number(this.expectToken(TokenType.NUMBER_LITERAL).value);
        continue;
      }
      if (token.type === TokenType.MATURING_THRESHOLD) {
        this.advance();
        maturingThreshold = Number(this.expectToken(TokenType.NUMBER_LITERAL).value);
        continue;
      }
      if (token.type === TokenType.YOUNG_PASS_RATE) {
        this.advance();
        youngPassRate = Number(this.expectToken(TokenType.NUMBER_LITERAL).value);
        continue;
      }
      if (token.type === TokenType.MATURE_PASS_RATE) {
        this.advance();
        maturePassRate = Number(this.expectToken(TokenType.NUMBER_LITERAL).value);
        continue;
      }
      if (token.type === TokenType.MATURING_SAMPLE) {
        this.advance();
        maturingSample = Number(this.expectToken(TokenType.NUMBER_LITERAL).value);
        continue;
      }
      if (token.type === TokenType.MATURE_SAMPLE) {
        this.advance();
        matureSample = Number(this.expectToken(TokenType.NUMBER_LITERAL).value);
        continue;
      }

      this.error(`Unexpected token in QC: ${token.value}`);
    }

    const end = this.expectToken(TokenType.RBRACE).location;
    return { kind: 'qc', name, youngThreshold, maturingThreshold, youngPassRate, maturePassRate, maturingSample, matureSample, span: { start, end } };
  }

  // --- VAULT ---

  private parseVault(): VaultDecl {
    const start = this.expectToken(TokenType.VAULT).location;
    this.expectToken(TokenType.LBRACE);

    let path = '%APPDATA%/Agicore/vault.db';
    let assetTypes = ['text', 'image', 'json', 'code', 'audio'];
    let provenance = true;
    let tags = true;

    while (!this.check(TokenType.RBRACE)) {
      const token = this.current();

      if (token.type === TokenType.PATH) {
        this.advance();
        path = this.expectToken(TokenType.STRING_LITERAL).value;
        continue;
      }
      if (token.type === TokenType.ASSET_TYPES) {
        this.advance();
        assetTypes = this.parseIdentifierList();
        continue;
      }
      if (token.value === 'PROVENANCE') {
        this.advance();
        provenance = this.parseBoolValue();
        continue;
      }
      if (token.type === TokenType.TAGS) {
        this.advance();
        tags = this.parseBoolValue();
        continue;
      }

      this.error(`Unexpected token in VAULT: ${token.value}`);
    }

    const end = this.expectToken(TokenType.RBRACE).location;
    return { kind: 'vault', path, assetTypes, provenance, tags, span: { start, end } };
  }

  // --- FACT ---

  private parseFact(): FactDecl {
    const start = this.expectToken(TokenType.FACT).location;
    const name = this.expectIdentifier();
    this.expectToken(TokenType.LBRACE);

    const fields: FieldDef[] = [];
    let persistent = false;

    while (!this.check(TokenType.RBRACE)) {
      if (this.check(TokenType.PERSISTENT)) {
        persistent = true;
        this.advance();
        continue;
      }
      fields.push(this.parseFieldDef());
    }

    const end = this.expectToken(TokenType.RBRACE).location;
    return { kind: 'fact', name, fields, persistent, span: { start, end } };
  }

  // --- STATE ---

  private parseState(): StateDecl {
    const start = this.expectToken(TokenType.STATE).location;
    const name = this.expectIdentifier();
    this.expectToken(TokenType.LBRACE);

    let initial = '';
    const states: StateNode[] = [];

    // Parse INITIAL first
    if (this.check(TokenType.INITIAL)) {
      this.advance();
      initial = this.expectIdentifier();
    }

    // Parse state nodes
    while (!this.check(TokenType.RBRACE)) {
      states.push(this.parseStateNode());
    }

    const end = this.expectToken(TokenType.RBRACE).location;
    if (!initial && states.length > 0) initial = states[0]!.name;
    return { kind: 'state', name, initial, states, span: { start, end } };
  }

  private parseStateNode(): StateNode {
    const start = this.current().location;
    const name = this.expectIdentifier();
    this.expectToken(TokenType.LBRACE);

    let onEnter: string | undefined;
    let onExit: string | undefined;
    const transitions: StateTransition[] = [];

    while (!this.check(TokenType.RBRACE)) {
      const token = this.current();

      if (token.type === TokenType.ON_ENTER) {
        this.advance();
        onEnter = this.expectIdentifier();
        continue;
      }

      if (token.type === TokenType.ON_EXIT) {
        this.advance();
        onExit = this.expectIdentifier();
        continue;
      }

      if (token.type === TokenType.TRANSITION) {
        this.advance();
        const target = this.expectIdentifier();
        this.expectToken(TokenType.WHEN);
        const condition = this.parseInlineExpression();
        transitions.push({ target, condition, span: this.spanFrom(token.location) });
        continue;
      }

      this.error(`Unexpected token in state node: ${token.value}`);
    }

    this.expectToken(TokenType.RBRACE);
    return { name, onEnter, onExit, transitions, span: this.spanFrom(start) };
  }

  // --- PATTERN ---

  private parsePattern(): PatternDecl {
    const start = this.expectToken(TokenType.PATTERN).location;
    const name = this.expectIdentifier();
    this.expectToken(TokenType.LBRACE);

    let match: string[] = [];
    let when: string | undefined;
    let responses: string[] = [];
    let score: PatternDecl['score'];
    let assertFact: PatternDecl['assertFact'];
    let priority = 0;
    let category: string | undefined;

    while (!this.check(TokenType.RBRACE)) {
      const token = this.current();

      if (token.type === TokenType.MATCH) {
        this.advance();
        match = this.parseStringList();
        continue;
      }

      if (token.type === TokenType.WHEN) {
        this.advance();
        when = this.parseInlineExpression();
        continue;
      }

      if (token.type === TokenType.RESPOND) {
        this.advance();
        responses = this.parseStringList();
        continue;
      }

      if (token.type === TokenType.SCORE) {
        this.advance();
        const scoreName = this.expectIdentifier();
        const delta = Number(this.expectToken(TokenType.NUMBER_LITERAL).value);
        score = { name: scoreName, delta };
        continue;
      }

      if (token.type === TokenType.ASSERT) {
        this.advance();
        const factName = this.expectIdentifier();
        this.expectToken(TokenType.LBRACE);
        const fields: Record<string, LiteralValue> = {};
        while (!this.check(TokenType.RBRACE)) {
          const fieldName = this.expectIdentifier();
          this.expectToken(TokenType.COLON);
          fields[fieldName] = this.parseLiteral();
          if (this.check(TokenType.COMMA)) this.advance();
        }
        this.expectToken(TokenType.RBRACE);
        assertFact = { name: factName, fields };
        continue;
      }

      if (token.type === TokenType.PRIORITY) {
        this.advance();
        priority = Number(this.expectToken(TokenType.NUMBER_LITERAL).value);
        continue;
      }

      if (token.type === TokenType.CATEGORY) {
        this.advance();
        category = this.expectToken(TokenType.STRING_LITERAL).value;
        continue;
      }

      this.error(`Unexpected token in PATTERN: ${token.value}`);
    }

    const end = this.expectToken(TokenType.RBRACE).location;
    return { kind: 'pattern', name, match, when, responses, score, assertFact, priority, category, span: { start, end } };
  }

  // --- SCORE ---

  private parseScore(): ScoreDecl {
    const start = this.expectToken(TokenType.SCORE).location;
    const name = this.expectIdentifier();
    this.expectToken(TokenType.LBRACE);

    let initial = 0;
    let min: number | undefined;
    let max: number | undefined;
    let decay: ScoreDecl['decay'];
    const thresholds: ScoreThreshold[] = [];

    while (!this.check(TokenType.RBRACE)) {
      const token = this.current();

      if (token.type === TokenType.INITIAL) {
        this.advance();
        initial = Number(this.expectToken(TokenType.NUMBER_LITERAL).value);
        continue;
      }

      if (token.type === TokenType.MIN) {
        this.advance();
        min = Number(this.expectToken(TokenType.NUMBER_LITERAL).value);
        continue;
      }

      if (token.type === TokenType.MAX) {
        this.advance();
        max = Number(this.expectToken(TokenType.NUMBER_LITERAL).value);
        continue;
      }

      if (token.type === TokenType.DECAY) {
        this.advance();
        const amount = Number(this.expectToken(TokenType.NUMBER_LITERAL).value);
        this.expectToken(TokenType.PER);
        const per = this.expectIdentifier();
        decay = { amount, per };
        continue;
      }

      if (token.type === TokenType.THRESHOLD) {
        this.advance();
        const threshName = this.expectIdentifier();
        this.expectToken(TokenType.AT);
        const value = Number(this.expectToken(TokenType.NUMBER_LITERAL).value);
        let action: string | undefined;
        if (this.check(TokenType.THEN)) {
          this.advance();
          action = this.expectIdentifier();
        }
        thresholds.push({ name: threshName, value, action });
        continue;
      }

      this.error(`Unexpected token in SCORE: ${token.value}`);
    }

    const end = this.expectToken(TokenType.RBRACE).location;
    return { kind: 'score', name, initial, min, max, decay, thresholds, span: { start, end } };
  }

  // --- MODULE ---

  private parseModule(): ModuleDecl {
    const start = this.expectToken(TokenType.MODULE).location;
    const name = this.expectIdentifier();
    this.expectToken(TokenType.LBRACE);

    let description = '';
    let activateWhen: string | undefined;
    let deactivateWhen: string | undefined;
    const patterns: PatternDecl[] = [];
    const rules: RuleDecl[] = [];
    const states: StateDecl[] = [];
    const scores: ScoreDecl[] = [];
    const facts: FactDecl[] = [];

    while (!this.check(TokenType.RBRACE)) {
      const token = this.current();

      if (token.type === TokenType.DESCRIPTION) {
        this.advance();
        description = this.expectToken(TokenType.STRING_LITERAL).value;
        continue;
      }

      if (token.type === TokenType.ACTIVATE_WHEN) {
        this.advance();
        activateWhen = this.parseInlineExpression();
        continue;
      }

      if (token.type === TokenType.DEACTIVATE_WHEN) {
        this.advance();
        deactivateWhen = this.parseInlineExpression();
        continue;
      }

      if (token.type === TokenType.PATTERN) {
        patterns.push(this.parsePattern());
        continue;
      }

      if (token.type === TokenType.RULE) {
        rules.push(this.parseRule());
        continue;
      }

      if (token.type === TokenType.STATE) {
        states.push(this.parseState());
        continue;
      }

      if (token.type === TokenType.SCORE) {
        scores.push(this.parseScore());
        continue;
      }

      if (token.type === TokenType.FACT) {
        facts.push(this.parseFact());
        continue;
      }

      this.error(`Unexpected token in MODULE: ${token.value}`);
    }

    const end = this.expectToken(TokenType.RBRACE).location;
    return { kind: 'module', name, description, activateWhen, deactivateWhen, patterns, rules, states, scores, facts, span: { start, end } };
  }

  // --- ROUTER ---

  private parseRouter(): RouterDecl {
    const start = this.expectToken(TokenType.ROUTER).location;
    const name = this.expectIdentifier();
    this.expectToken(TokenType.LBRACE);

    let description = '';
    const tiers: RouterTier[] = [];
    let taskTypes: string[] = [];
    let moshPitSize = 3;
    let calibration = true;

    while (!this.check(TokenType.RBRACE)) {
      const token = this.current();

      if (token.type === TokenType.DESCRIPTION) {
        this.advance();
        description = this.expectToken(TokenType.STRING_LITERAL).value;
        continue;
      }
      if (token.type === TokenType.TIER) {
        tiers.push(this.parseRouterTier());
        continue;
      }
      if (token.type === TokenType.TASK_TYPES) {
        this.advance();
        taskTypes = this.parseIdentifierList();
        continue;
      }
      if (token.type === TokenType.MOSH_PIT) {
        this.advance();
        moshPitSize = Number(this.expectToken(TokenType.NUMBER_LITERAL).value);
        continue;
      }
      if (token.value === 'CALIBRATION') {
        this.advance();
        calibration = this.parseBoolValue();
        continue;
      }
      this.error(`Unexpected token in ROUTER: ${token.value}`);
    }

    const end = this.expectToken(TokenType.RBRACE).location;
    return { kind: 'router', name, description, tiers, taskTypes, moshPitSize, calibration, span: { start, end } };
  }

  private parseRouterTier(): RouterTier {
    this.expectToken(TokenType.TIER);
    const tier = Number(this.expectToken(TokenType.NUMBER_LITERAL).value);
    const name = this.expectIdentifier();
    this.expectToken(TokenType.LBRACE);

    const models: RouterModelDef[] = [];
    let circuitBreaker: CircuitBreaker | undefined;

    while (!this.check(TokenType.RBRACE)) {
      if (this.check(TokenType.CIRCUIT_BREAKER)) {
        this.advance();
        circuitBreaker = this.parseCircuitBreaker();
        continue;
      }
      const key = this.expectIdentifier();
      this.expectToken(TokenType.COLON);
      const provider = this.expectIdentifier();
      const modelId = this.expectToken(TokenType.STRING_LITERAL).value;
      this.expectToken(TokenType.LBRACE);

      let strengths: string[] = [];
      let cost = 0;
      let context = 32768;
      let isDefault = false;

      while (!this.check(TokenType.RBRACE)) {
        const field = this.current();
        if (field.type === TokenType.STRENGTHS) {
          this.advance();
          strengths = this.parseIdentifierList();
        } else if (field.type === TokenType.COST) {
          this.advance();
          cost = Number(this.expectToken(TokenType.NUMBER_LITERAL).value);
        } else if (field.type === TokenType.CONTEXT) {
          this.advance();
          context = Number(this.expectToken(TokenType.NUMBER_LITERAL).value);
        } else if (field.type === TokenType.DEFAULT) {
          this.advance();
          isDefault = true;
        } else {
          this.error(`Unexpected token in TIER model: ${field.value}`);
        }
      }

      this.expectToken(TokenType.RBRACE);
      models.push({ key, provider, modelId, strengths, cost, context, isDefault });
    }

    this.expectToken(TokenType.RBRACE);
    return { tier, name, models, circuitBreaker };
  }

  private parseCircuitBreaker(): CircuitBreaker {
    this.expectToken(TokenType.LBRACE);

    let threshold = 0.5;
    let window = '60s';
    let fallback: number | undefined;

    while (!this.check(TokenType.RBRACE)) {
      const token = this.current();
      if (token.type === TokenType.THRESHOLD) {
        this.advance();
        threshold = Number(this.expectToken(TokenType.NUMBER_LITERAL).value);
        continue;
      }
      if (token.type === TokenType.WINDOW) {
        this.advance();
        window = this.expectToken(TokenType.STRING_LITERAL).value;
        continue;
      }
      if (token.type === TokenType.FALLBACK) {
        this.advance();
        fallback = Number(this.expectToken(TokenType.NUMBER_LITERAL).value);
        continue;
      }
      this.error(`Unexpected token in CIRCUIT_BREAKER: ${token.value}`);
    }

    this.expectToken(TokenType.RBRACE);
    return { threshold, window, fallback };
  }

  // --- SKILL ---

  private parseSkill(): SkillDecl {
    const start = this.expectToken(TokenType.SKILL).location;
    const name = this.expectIdentifier();
    this.expectToken(TokenType.LBRACE);

    let description = '';
    let keywords: string[] = [];
    let domain: string | undefined;
    let path: string | undefined;
    let priority = 0;

    while (!this.check(TokenType.RBRACE)) {
      const token = this.current();

      if (token.type === TokenType.DESCRIPTION) {
        this.advance();
        description = this.expectToken(TokenType.STRING_LITERAL).value;
        continue;
      }
      if (token.type === TokenType.KEYWORDS) {
        this.advance();
        keywords = this.parseIdentifierList();
        continue;
      }
      if (token.type === TokenType.DOMAIN) {
        this.advance();
        domain = this.expectToken(TokenType.STRING_LITERAL).value;
        continue;
      }
      if (token.type === TokenType.PATH) {
        this.advance();
        path = this.expectToken(TokenType.STRING_LITERAL).value;
        continue;
      }
      if (token.type === TokenType.PRIORITY) {
        this.advance();
        priority = Number(this.expectToken(TokenType.NUMBER_LITERAL).value);
        continue;
      }
      this.error(`Unexpected token in SKILL: ${token.value}`);
    }

    const end = this.expectToken(TokenType.RBRACE).location;
    return { kind: 'skill', name, description, keywords, domain, path, priority, span: { start, end } };
  }

  // --- SKILLDOC (Governed Cognition Infrastructure) ---

  private parseSkillDoc(): SkillDocDecl {
    const start = this.expectToken(TokenType.SKILLDOC).location;
    const name = this.expectIdentifier();
    this.expectToken(TokenType.LBRACE);

    let description = '';
    let version: string | undefined;
    let domain: string | undefined;
    let content: string | undefined;
    let keywords: string[] = [];
    let priority = 0;
    let governance: SkillDocGovernance | undefined;
    let compression: SkillDocCompression | undefined;

    while (!this.check(TokenType.RBRACE)) {
      const token = this.current();

      if (token.type === TokenType.DESCRIPTION) {
        this.advance();
        description = this.expectToken(TokenType.STRING_LITERAL).value;
        continue;
      }
      if (token.type === TokenType.VERSION) {
        this.advance();
        version = this.expectToken(TokenType.STRING_LITERAL).value;
        continue;
      }
      if (token.type === TokenType.DOMAIN) {
        this.advance();
        domain = this.expectToken(TokenType.STRING_LITERAL).value;
        continue;
      }
      if (token.type === TokenType.CONTENT_KW) {
        this.advance();
        content = this.expectToken(TokenType.STRING_LITERAL).value;
        continue;
      }
      if (token.type === TokenType.KEYWORDS) {
        this.advance();
        keywords = this.parseIdentifierList();
        continue;
      }
      if (token.type === TokenType.PRIORITY) {
        this.advance();
        priority = Number(this.expectToken(TokenType.NUMBER_LITERAL).value);
        continue;
      }
      if (token.type === TokenType.GOVERNANCE) {
        this.advance();
        governance = this.parseSkillDocGovernance();
        continue;
      }
      if (token.type === TokenType.COMPRESSION) {
        this.advance();
        compression = this.parseSkillDocCompression();
        continue;
      }
      this.error(`Unexpected token in SKILLDOC: ${token.value}`);
    }

    const end = this.expectToken(TokenType.RBRACE).location;
    return { kind: 'skilldoc', name, description, version, domain, content, keywords, priority, governance, compression, span: { start, end } };
  }

  private parseSkillDocGovernance(): SkillDocGovernance {
    this.expectToken(TokenType.LBRACE);

    let signedBy: string | undefined;
    let require: string[] = [];
    let executeOnly: string[] = [];
    let disallow: string[] = [];
    let audit: AuditLevel = 'none';

    while (!this.check(TokenType.RBRACE)) {
      const token = this.current();
      if (token.type === TokenType.SIGNED_BY) {
        this.advance();
        signedBy = this.expectIdentifier();
        continue;
      }
      if (token.type === TokenType.REQUIRE_KW) {
        this.advance();
        require = this.parseIdentifierList();
        continue;
      }
      if (token.type === TokenType.EXECUTE_ONLY) {
        this.advance();
        executeOnly = this.parseIdentifierList();
        continue;
      }
      if (token.type === TokenType.DISALLOW) {
        this.advance();
        disallow = this.parseIdentifierList();
        continue;
      }
      if (token.type === TokenType.AUDIT) {
        this.advance();
        audit = this.expectIdentifier() as AuditLevel;
        continue;
      }
      this.error(`Unexpected token in GOVERNANCE: ${token.value}`);
    }

    this.expectToken(TokenType.RBRACE);
    return { signedBy, require, executeOnly, disallow, audit };
  }

  private parseSkillDocCompression(): SkillDocCompression {
    this.expectToken(TokenType.LBRACE);

    let semanticDensity: number | undefined;
    let intentPreservation: number | undefined;
    let tokenEfficiency: number | undefined;

    while (!this.check(TokenType.RBRACE)) {
      const token = this.current();
      if (token.type === TokenType.SEMANTIC_DENSITY) {
        this.advance();
        semanticDensity = Number(this.expectToken(TokenType.NUMBER_LITERAL).value);
        continue;
      }
      if (token.type === TokenType.INTENT_PRESERVATION) {
        this.advance();
        intentPreservation = Number(this.expectToken(TokenType.NUMBER_LITERAL).value);
        continue;
      }
      if (token.type === TokenType.TOKEN_EFFICIENCY) {
        this.advance();
        tokenEfficiency = Number(this.expectToken(TokenType.NUMBER_LITERAL).value);
        continue;
      }
      this.error(`Unexpected token in COMPRESSION: ${token.value}`);
    }

    this.expectToken(TokenType.RBRACE);
    return { semanticDensity, intentPreservation, tokenEfficiency };
  }

  // --- REASONER ---

  private parseReasoner(): ReasonerDecl {
    const start = this.expectToken(TokenType.REASONER).location;
    const name = this.expectIdentifier();
    this.expectToken(TokenType.LBRACE);

    let description = '';
    let input: ReasonerInput = { channels: [] };
    let uses: string | undefined;
    let tier: number | undefined;
    let output: ReasonerOutput = {};
    let schedule: ReasonerSchedule = 'on_demand';
    let idempotent: boolean | undefined;
    let governance: SkillDocGovernance | undefined;

    while (!this.check(TokenType.RBRACE)) {
      const token = this.current();

      if (token.type === TokenType.DESCRIPTION) {
        this.advance();
        description = this.expectToken(TokenType.STRING_LITERAL).value;
        continue;
      }
      if (token.type === TokenType.INPUT) {
        this.advance();
        input = this.parseReasonerInput();
        continue;
      }
      if (token.type === TokenType.USES) {
        this.advance();
        uses = this.expectIdentifier();
        continue;
      }
      if (token.type === TokenType.TIER) {
        this.advance();
        tier = Number(this.expectToken(TokenType.NUMBER_LITERAL).value);
        continue;
      }
      if (token.type === TokenType.OUTPUT) {
        this.advance();
        output = this.parseReasonerOutput();
        continue;
      }
      if (token.type === TokenType.SCHEDULE) {
        this.advance();
        // Accept either an identifier (daily, hourly, etc.) or a string literal (cron)
        if (this.check(TokenType.STRING_LITERAL)) {
          schedule = this.expectToken(TokenType.STRING_LITERAL).value;
        } else {
          schedule = this.expectIdentifier() as ReasonerSchedule;
        }
        continue;
      }
      if (token.type === TokenType.IDEMPOTENT) {
        this.advance();
        idempotent = this.parseBoolValue();
        continue;
      }
      if (token.type === TokenType.GOVERNANCE) {
        this.advance();
        governance = this.parseSkillDocGovernance();
        continue;
      }
      this.error(`Unexpected token in REASONER: ${token.value}`);
    }

    const end = this.expectToken(TokenType.RBRACE).location;
    return { kind: 'reasoner', name, description, input, uses, tier, output, schedule, idempotent, governance, span: { start, end } };
  }

  private parseReasonerInput(): ReasonerInput {
    this.expectToken(TokenType.LBRACE);

    let channels: string[] = [];
    let window: string | undefined;
    let filter: string | undefined;

    while (!this.check(TokenType.RBRACE)) {
      const token = this.current();
      if (token.type === TokenType.CHANNEL) {
        this.advance();
        channels = this.parseIdentifierList();
        continue;
      }
      if (token.type === TokenType.WINDOW) {
        this.advance();
        window = this.expectToken(TokenType.STRING_LITERAL).value;
        continue;
      }
      if (token.type === TokenType.FILTER) {
        this.advance();
        filter = this.expectToken(TokenType.STRING_LITERAL).value;
        continue;
      }
      this.error(`Unexpected token in REASONER INPUT: ${token.value}`);
    }

    this.expectToken(TokenType.RBRACE);
    return { channels, window, filter };
  }

  private parseReasonerOutput(): ReasonerOutput {
    this.expectToken(TokenType.LBRACE);

    let packet: string | undefined;
    let channel: string | undefined;

    while (!this.check(TokenType.RBRACE)) {
      const token = this.current();
      if (token.type === TokenType.PACKET) {
        this.advance();
        packet = this.expectIdentifier();
        continue;
      }
      if (token.type === TokenType.CHANNEL) {
        this.advance();
        channel = this.expectIdentifier();
        continue;
      }
      this.error(`Unexpected token in REASONER OUTPUT: ${token.value}`);
    }

    this.expectToken(TokenType.RBRACE);
    return { packet, channel };
  }

  // --- TRIGGER ---

  private parseTrigger(): TriggerDecl {
    const start = this.expectToken(TokenType.TRIGGER).location;
    const name = this.expectIdentifier();
    this.expectToken(TokenType.LBRACE);

    let description = '';
    let when: TriggerWhen = { channels: [] };
    let fires: TriggerFires = { kind: 'workflow', target: '' };
    let debounce: string | undefined;
    let rateLimit: string | undefined;
    let idempotent: boolean | undefined;
    let governance: SkillDocGovernance | undefined;

    while (!this.check(TokenType.RBRACE)) {
      const token = this.current();

      if (token.type === TokenType.DESCRIPTION) {
        this.advance();
        description = this.expectToken(TokenType.STRING_LITERAL).value;
        continue;
      }
      if (token.type === TokenType.WHEN) {
        this.advance();
        when = this.parseTriggerWhen();
        continue;
      }
      if (token.type === TokenType.FIRES) {
        this.advance();
        fires = this.parseTriggerFires();
        continue;
      }
      if (token.type === TokenType.DEBOUNCE) {
        this.advance();
        debounce = this.expectToken(TokenType.STRING_LITERAL).value;
        continue;
      }
      if (token.type === TokenType.RATE_LIMIT) {
        this.advance();
        rateLimit = this.expectToken(TokenType.STRING_LITERAL).value;
        continue;
      }
      if (token.type === TokenType.IDEMPOTENT) {
        this.advance();
        idempotent = this.parseBoolValue();
        continue;
      }
      if (token.type === TokenType.GOVERNANCE) {
        this.advance();
        governance = this.parseSkillDocGovernance();
        continue;
      }
      this.error(`Unexpected token in TRIGGER: ${token.value}`);
    }

    if (!fires.target) this.error(`TRIGGER ${name} requires a FIRES target`);
    const end = this.expectToken(TokenType.RBRACE).location;
    return { kind: 'trigger', name, description, when, fires, debounce, rateLimit, idempotent, governance, span: { start, end } };
  }

  private parseTriggerWhen(): TriggerWhen {
    this.expectToken(TokenType.LBRACE);

    let channels: string[] = [];
    let packet: string | undefined;
    let filter: string | undefined;

    while (!this.check(TokenType.RBRACE)) {
      const token = this.current();
      if (token.type === TokenType.CHANNEL) {
        this.advance();
        channels = this.parseIdentifierList();
        continue;
      }
      if (token.type === TokenType.PACKET) {
        this.advance();
        packet = this.expectIdentifier();
        continue;
      }
      if (token.type === TokenType.FILTER) {
        this.advance();
        filter = this.expectToken(TokenType.STRING_LITERAL).value;
        continue;
      }
      this.error(`Unexpected token in TRIGGER WHEN: ${token.value}`);
    }

    this.expectToken(TokenType.RBRACE);
    return { channels, packet, filter };
  }

  private parseTriggerFires(): TriggerFires {
    // FIRES <kind-keyword> <identifier>
    // e.g. FIRES WORKFLOW invoice_review
    const token = this.current();
    let kind: TriggerTargetKind;
    if (token.type === TokenType.WORKFLOW) {
      kind = 'workflow';
    } else if (token.type === TokenType.REASONER) {
      kind = 'reasoner';
    } else if (token.type === TokenType.SESSION) {
      kind = 'session';
    } else if (token.type === TokenType.COMPILER_KW) {
      kind = 'compiler';
    } else if (token.type === TokenType.PIPELINE) {
      kind = 'pipeline';
    } else {
      this.error(`FIRES expects WORKFLOW | REASONER | SESSION | COMPILER | PIPELINE, got: ${token.value}`);
      kind = 'workflow';
    }
    this.advance();
    const target = this.expectIdentifier();
    return { kind, target };
  }

  // --- LIFECYCLE ---

  private parseLifecycle(): LifecycleDecl {
    const start = this.expectToken(TokenType.LIFECYCLE).location;
    const name = this.expectIdentifier();
    this.expectToken(TokenType.LBRACE);

    let description = '';
    let stalenessWindow = 7;
    let stalenessDrop = 0.15;
    let minLifetime = 14;
    let maxInstances = 10;
    const escalation: LifecycleEscalation[] = [];

    while (!this.check(TokenType.RBRACE)) {
      const token = this.current();

      if (token.type === TokenType.DESCRIPTION) {
        this.advance();
        description = this.expectToken(TokenType.STRING_LITERAL).value;
        continue;
      }
      if (token.type === TokenType.STALENESS_WINDOW) {
        this.advance();
        stalenessWindow = Number(this.expectToken(TokenType.NUMBER_LITERAL).value);
        continue;
      }
      if (token.type === TokenType.STALENESS_DROP) {
        this.advance();
        stalenessDrop = Number(this.expectToken(TokenType.NUMBER_LITERAL).value);
        continue;
      }
      if (token.type === TokenType.MIN_LIFETIME) {
        this.advance();
        minLifetime = Number(this.expectToken(TokenType.NUMBER_LITERAL).value);
        continue;
      }
      if (token.type === TokenType.MAX_INSTANCES) {
        this.advance();
        maxInstances = Number(this.expectToken(TokenType.NUMBER_LITERAL).value);
        continue;
      }
      if (token.value === 'ESCALATION') {
        this.advance();
        this.expectToken(TokenType.LBRACE);
        while (!this.check(TokenType.RBRACE)) {
          const level = this.expectIdentifier();
          this.expectToken(TokenType.COLON);
          const desc = this.expectToken(TokenType.STRING_LITERAL).value;
          escalation.push({ level, description: desc });
        }
        this.expectToken(TokenType.RBRACE);
        continue;
      }
      this.error(`Unexpected token in LIFECYCLE: ${token.value}`);
    }

    const end = this.expectToken(TokenType.RBRACE).location;
    return { kind: 'lifecycle', name, description, stalenessWindow, stalenessDrop, minLifetime, maxInstances, escalation, span: { start, end } };
  }

  // --- BREED ---

  private parseBreed(): BreedDecl {
    const start = this.expectToken(TokenType.BREED).location;
    const name = this.expectIdentifier();
    this.expectToken(TokenType.LBRACE);

    let description = '';
    let inheritanceA = 15, inheritanceB = 15, inheritanceFresh = 70;
    let minFitness = 0.5;
    let cooldown = 30;
    let fitness: BreedFitness = { predictionAccuracy: 0.4, domainDepth: 0.3, costEfficiency: 0.2, judgeQuality: 0.1 };
    let pairingPreferences: string[] = [];
    let diversityMin = 0.4;
    let traitPersistAfter = 3;
    let traitExtinctAfter = 1;

    while (!this.check(TokenType.RBRACE)) {
      const token = this.current();

      if (token.type === TokenType.DESCRIPTION) {
        this.advance();
        description = this.expectToken(TokenType.STRING_LITERAL).value;
        continue;
      }
      if (token.type === TokenType.INHERITANCE) {
        this.advance();
        inheritanceA = Number(this.expectToken(TokenType.NUMBER_LITERAL).value);
        this.expectToken(TokenType.SLASH);
        inheritanceB = Number(this.expectToken(TokenType.NUMBER_LITERAL).value);
        this.expectToken(TokenType.SLASH);
        inheritanceFresh = Number(this.expectToken(TokenType.NUMBER_LITERAL).value);
        continue;
      }
      if (token.type === TokenType.MIN_FITNESS) {
        this.advance();
        minFitness = Number(this.expectToken(TokenType.NUMBER_LITERAL).value);
        continue;
      }
      if (token.type === TokenType.COOLDOWN_KW) {
        this.advance();
        cooldown = Number(this.expectToken(TokenType.NUMBER_LITERAL).value);
        continue;
      }
      if (token.type === TokenType.FITNESS) {
        this.advance();
        this.expectToken(TokenType.LBRACE);
        while (!this.check(TokenType.RBRACE)) {
          const field = this.expectIdentifier();
          this.expectToken(TokenType.COLON);
          const val = Number(this.expectToken(TokenType.NUMBER_LITERAL).value);
          if (field === 'prediction_accuracy') fitness.predictionAccuracy = val;
          else if (field === 'domain_depth') fitness.domainDepth = val;
          else if (field === 'cost_efficiency') fitness.costEfficiency = val;
          else if (field === 'judge_quality') fitness.judgeQuality = val;
        }
        this.expectToken(TokenType.RBRACE);
        continue;
      }
      if (token.value === 'PAIRING') {
        this.advance();
        this.expectToken(TokenType.LBRACE);
        while (!this.check(TokenType.RBRACE)) {
          const field = this.current();
          if (field.type === TokenType.PREFER) {
            this.advance();
            pairingPreferences = this.parseIdentifierList();
          } else if (field.type === TokenType.DIVERSITY_MIN) {
            this.advance();
            diversityMin = Number(this.expectToken(TokenType.NUMBER_LITERAL).value);
          } else {
            this.error(`Unexpected in PAIRING: ${field.value}`);
          }
        }
        this.expectToken(TokenType.RBRACE);
        continue;
      }
      if (token.value === 'TRAITS') {
        this.advance();
        this.expectToken(TokenType.LBRACE);
        while (!this.check(TokenType.RBRACE)) {
          const field = this.current();
          if (field.type === TokenType.PERSIST_AFTER) {
            this.advance();
            traitPersistAfter = Number(this.expectToken(TokenType.NUMBER_LITERAL).value);
          } else if (field.type === TokenType.EXTINCT_AFTER) {
            this.advance();
            traitExtinctAfter = Number(this.expectToken(TokenType.NUMBER_LITERAL).value);
          } else {
            this.error(`Unexpected in TRAITS: ${field.value}`);
          }
        }
        this.expectToken(TokenType.RBRACE);
        continue;
      }
      this.error(`Unexpected token in BREED: ${token.value}`);
    }

    const end = this.expectToken(TokenType.RBRACE).location;
    return { kind: 'breed', name, description, inheritanceA, inheritanceB, inheritanceFresh, minFitness, cooldown, fitness, pairingPreferences, diversityMin, traitPersistAfter, traitExtinctAfter, span: { start, end } };
  }

  // --- PACKET ---

  private parsePacket(): PacketDecl {
    const start = this.expectToken(TokenType.PACKET).location;
    const name = this.expectIdentifier();
    this.expectToken(TokenType.LBRACE);

    let description = '';
    const payload: PacketField[] = [];
    let provenance = false, lineage = false, signatures = false, admissibility = false;
    let ttl = 0;
    const validation: PacketValidationRule[] = [];

    while (!this.check(TokenType.RBRACE)) {
      const token = this.current();

      if (token.type === TokenType.DESCRIPTION) {
        this.advance(); description = this.expectToken(TokenType.STRING_LITERAL).value; continue;
      }
      if (token.type === TokenType.PAYLOAD) {
        this.advance(); this.expectToken(TokenType.LBRACE);
        while (!this.check(TokenType.RBRACE)) {
          const fieldName = this.expectIdentifier();
          this.expectToken(TokenType.COLON);
          const fieldType = this.parseType();
          let required = false;
          if (this.check(TokenType.REQUIRED)) { this.advance(); required = true; }
          payload.push({ name: fieldName, type: fieldType, required });
        }
        this.expectToken(TokenType.RBRACE); continue;
      }
      if (token.value === 'METADATA') {
        this.advance(); this.expectToken(TokenType.LBRACE);
        while (!this.check(TokenType.RBRACE)) {
          const field = this.current();
          if (field.value === 'PROVENANCE') { this.advance(); provenance = this.parseBoolValue(); }
          else if (field.value === 'LINEAGE') { this.advance(); lineage = this.parseBoolValue(); }
          else if (field.value === 'SIGNATURES') { this.advance(); signatures = this.parseBoolValue(); }
          else if (field.value === 'ADMISSIBILITY') { this.advance(); admissibility = this.parseBoolValue(); }
          else if (field.type === TokenType.TTL) { this.advance(); ttl = Number(this.expectToken(TokenType.NUMBER_LITERAL).value); }
          else this.error(`Unexpected in METADATA: ${field.value}`);
        }
        this.expectToken(TokenType.RBRACE); continue;
      }
      if (token.type === TokenType.VALIDATION) {
        this.advance(); this.expectToken(TokenType.LBRACE);
        while (!this.check(TokenType.RBRACE)) {
          const ruleName = this.expectIdentifier();
          this.expectToken(TokenType.COLON);
          const condition = this.parseInlineExpression();
          validation.push({ name: ruleName, condition });
        }
        this.expectToken(TokenType.RBRACE); continue;
      }
      this.error(`Unexpected token in PACKET: ${token.value}`);
    }

    const end = this.expectToken(TokenType.RBRACE).location;
    return { kind: 'packet', name, description, payload, provenance, lineage, signatures, admissibility, ttl, validation, span: { start, end } };
  }

  // --- AUTHORITY ---

  private parseAuthority(): AuthorityDecl {
    const start = this.expectToken(TokenType.AUTHORITY_KW).location;
    const name = this.expectIdentifier();
    this.expectToken(TokenType.LBRACE);

    let description = '';
    const levels: AuthorityLevel[] = [];
    let signing: AuthoritySigning = { required: false, algorithm: 'sha256', verifyChain: false };
    const admissibilityRules: PacketValidationRule[] = [];

    while (!this.check(TokenType.RBRACE)) {
      const token = this.current();

      if (token.type === TokenType.DESCRIPTION) {
        this.advance(); description = this.expectToken(TokenType.STRING_LITERAL).value; continue;
      }
      if (token.value === 'LEVELS') {
        this.advance(); this.expectToken(TokenType.LBRACE);
        while (!this.check(TokenType.RBRACE)) {
          const level = this.expectIdentifier();
          this.expectToken(TokenType.COLON);
          const desc = this.expectToken(TokenType.STRING_LITERAL).value;
          levels.push({ name: level, description: desc });
        }
        this.expectToken(TokenType.RBRACE); continue;
      }
      if (token.type === TokenType.SIGNING) {
        this.advance(); this.expectToken(TokenType.LBRACE);
        while (!this.check(TokenType.RBRACE)) {
          const field = this.current();
          if (field.type === TokenType.REQUIRED) { this.advance(); signing.required = this.parseBoolValue(); }
          else if (field.type === TokenType.ALGORITHM) { this.advance(); signing.algorithm = this.expectToken(TokenType.STRING_LITERAL).value; }
          else if (field.type === TokenType.VERIFY_CHAIN) { this.advance(); signing.verifyChain = this.parseBoolValue(); }
          else this.error(`Unexpected in SIGNING: ${field.value}`);
        }
        this.expectToken(TokenType.RBRACE); continue;
      }
      if (token.value === 'ADMISSIBILITY') {
        this.advance(); this.expectToken(TokenType.LBRACE);
        while (!this.check(TokenType.RBRACE)) {
          const ruleName = this.expectIdentifier();
          this.expectToken(TokenType.COLON);
          const condition = this.parseInlineExpression();
          admissibilityRules.push({ name: ruleName, condition });
        }
        this.expectToken(TokenType.RBRACE); continue;
      }
      this.error(`Unexpected token in AUTHORITY: ${token.value}`);
    }

    const end = this.expectToken(TokenType.RBRACE).location;
    return { kind: 'authority', name, description, levels, signing, admissibility: admissibilityRules, span: { start, end } };
  }

  // --- CHANNEL ---

  private parseChannel(): ChannelDecl {
    const start = this.expectToken(TokenType.CHANNEL).location;
    const name = this.expectIdentifier();
    this.expectToken(TokenType.LBRACE);

    let description = '';
    let protocol: ChannelProtocol = 'local';
    let direction: ChannelDirection = 'bidirectional';
    let packet = '';
    let authority: string | undefined;
    let endpoint: string | undefined;
    let retry = 0;
    let timeout = 30000;
    let ordering: ChannelOrdering | undefined;
    let deadLetter: string | undefined;

    while (!this.check(TokenType.RBRACE)) {
      const token = this.current();

      if (token.type === TokenType.DESCRIPTION) {
        this.advance(); description = this.expectToken(TokenType.STRING_LITERAL).value; continue;
      }
      if (token.type === TokenType.PROTOCOL) {
        this.advance(); protocol = this.expectIdentifier() as ChannelProtocol; continue;
      }
      if (token.type === TokenType.DIRECTION) {
        this.advance(); direction = this.expectIdentifier() as ChannelDirection; continue;
      }
      if (token.type === TokenType.PACKET) {
        this.advance(); packet = this.expectIdentifier(); continue;
      }
      if (token.type === TokenType.AUTHORITY_KW) {
        this.advance(); authority = this.expectIdentifier(); continue;
      }
      if (token.type === TokenType.ENDPOINT) {
        this.advance(); endpoint = this.expectToken(TokenType.STRING_LITERAL).value; continue;
      }
      if (token.type === TokenType.RETRY) {
        this.advance(); retry = Number(this.expectToken(TokenType.NUMBER_LITERAL).value); continue;
      }
      if (token.type === TokenType.TIMEOUT) {
        this.advance(); timeout = Number(this.expectToken(TokenType.NUMBER_LITERAL).value); continue;
      }
      if (token.type === TokenType.ORDERING) {
        this.advance(); ordering = this.expectIdentifier() as ChannelOrdering; continue;
      }
      if (token.type === TokenType.DEAD_LETTER) {
        this.advance(); deadLetter = this.expectIdentifier(); continue;
      }
      this.error(`Unexpected token in CHANNEL: ${token.value}`);
    }

    const end = this.expectToken(TokenType.RBRACE).location;
    return { kind: 'channel', name, description, protocol, direction, packet, authority, endpoint, retry, timeout, ordering, deadLetter, span: { start, end } };
  }

  // --- SESSION ---

  private parseSession(): SessionDecl {
    const start = this.expectToken(TokenType.SESSION).location;
    const name = this.expectIdentifier();
    this.expectToken(TokenType.LBRACE);

    let description = '', tools: string[] = [], context = 'conversation';
    let memory = 'session', output: string[] = [], persist = false;

    while (!this.check(TokenType.RBRACE)) {
      const token = this.current();
      if (token.type === TokenType.DESCRIPTION) { this.advance(); description = this.expectToken(TokenType.STRING_LITERAL).value; continue; }
      if (token.type === TokenType.TOOLS) { this.advance(); tools = this.parseIdentifierList(); continue; }
      if (token.type === TokenType.CONTEXT) { this.advance(); context = this.expectIdentifier(); continue; }
      if (token.type === TokenType.MEMORY) { this.advance(); memory = this.expectIdentifier(); continue; }
      if (token.type === TokenType.OUTPUT) { this.advance(); output = this.parseIdentifierList(); continue; }
      if (token.type === TokenType.PERSIST) { this.advance(); persist = this.parseBoolValue(); continue; }
      this.error(`Unexpected token in SESSION: ${token.value}`);
    }

    const end = this.expectToken(TokenType.RBRACE).location;
    return { kind: 'session', name, description, tools, context, memory, output, persist, span: { start, end } };
  }

  // --- COMPILER ---

  private parseCompiler(): CompilerDecl {
    const start = this.expectToken(TokenType.COMPILER_KW).location;
    const name = this.expectIdentifier();
    this.expectToken(TokenType.LBRACE);

    let description = '', from = '', to = '', extract: string[] = [];
    const enrich: EnrichOp[] = [];
    let ai: string | undefined, validate = true;

    while (!this.check(TokenType.RBRACE)) {
      const token = this.current();
      if (token.type === TokenType.DESCRIPTION) { this.advance(); description = this.expectToken(TokenType.STRING_LITERAL).value; continue; }
      if (token.type === TokenType.FROM) { this.advance(); from = this.expectIdentifier(); continue; }
      if (token.type === TokenType.TO) { this.advance(); to = this.expectIdentifier(); continue; }
      if (token.type === TokenType.EXTRACT) { this.advance(); extract = this.parseIdentifierList(); continue; }
      if (token.type === TokenType.ENRICH) {
        this.advance();
        this.expectToken(TokenType.LBRACE);
        while (!this.check(TokenType.RBRACE)) {
          const opToken = this.current();
          const operation = opToken.value;
          this.advance();
          const target = this.expectIdentifier();
          enrich.push({ operation, target });
        }
        this.expectToken(TokenType.RBRACE);
        continue;
      }
      if (token.type === TokenType.AI) { this.advance(); ai = this.expectToken(TokenType.STRING_LITERAL).value; continue; }
      if (token.type === TokenType.VALIDATE) { this.advance(); validate = this.parseBoolValue(); continue; }
      this.error(`Unexpected token in COMPILER: ${token.value}`);
    }

    const end = this.expectToken(TokenType.RBRACE).location;
    return { kind: 'compiler', name, description, from, to, extract, enrich, ai, validate, span: { start, end } };
  }

  // --- EVENT ---

  private parseEvent(): EventDecl {
    const start = this.expectToken(TokenType.EVENT_KW).location;
    const name = this.expectIdentifier();
    this.expectToken(TokenType.LBRACE);

    let description = '';
    const payload: EventPayloadField[] = [];
    const subscribers: string[] = [];
    let idempotent = false;
    let ttl = 0;

    while (!this.check(TokenType.RBRACE)) {
      const token = this.current();
      if (token.type === TokenType.DESCRIPTION) {
        this.advance(); description = this.expectToken(TokenType.STRING_LITERAL).value; continue;
      }
      if (token.type === TokenType.PAYLOAD) {
        this.advance(); this.expectToken(TokenType.LBRACE);
        while (!this.check(TokenType.RBRACE)) {
          const fieldName = this.expectIdentifier();
          this.expectToken(TokenType.COLON);
          const fieldType = this.expectIdentifier();
          payload.push({ name: fieldName, type: fieldType });
        }
        this.expectToken(TokenType.RBRACE); continue;
      }
      if (token.type === TokenType.SUBSCRIBERS) {
        this.advance(); subscribers.push(...this.parseBracketedIdentifierList()); continue;
      }
      if (token.type === TokenType.IDEMPOTENT) {
        this.advance(); idempotent = this.parseBoolValue(); continue;
      }
      if (token.type === TokenType.TTL) {
        this.advance(); ttl = Number(this.expectToken(TokenType.NUMBER_LITERAL).value); continue;
      }
      this.error(`Unexpected token in EVENT: ${token.value}`);
    }

    const end = this.expectToken(TokenType.RBRACE).location;
    return { kind: 'event', name, description, payload, subscribers, idempotent, ttl, span: { start, end } };
  }

  // --- NBVE ---

  private parseNbve(): NbveDecl {
    const start = this.expectToken(TokenType.NBVE_KW).location;
    const name = this.expectIdentifier();
    this.expectToken(TokenType.LBRACE);

    let description = '';
    let production = '';
    let shadow = '';
    let spc: NbveSpc = { window: 50, confidence: 0.95, accuracyThreshold: 0.90, stabilityThreshold: 0.92, defectRateMax: 0.05 };
    const metrics: string[] = [];
    let promotion: 'auto' | 'manual' = 'manual';
    let fallback: 'production' | 'shadow' = 'production';

    while (!this.check(TokenType.RBRACE)) {
      const token = this.current();
      if (token.type === TokenType.DESCRIPTION) {
        this.advance(); description = this.expectToken(TokenType.STRING_LITERAL).value; continue;
      }
      if (token.type === TokenType.PRODUCTION_KW) {
        this.advance(); production = this.expectToken(TokenType.STRING_LITERAL).value; continue;
      }
      if (token.type === TokenType.SHADOW) {
        this.advance(); shadow = this.expectToken(TokenType.STRING_LITERAL).value; continue;
      }
      if (token.type === TokenType.SPC) {
        this.advance(); this.expectToken(TokenType.LBRACE);
        const parsed: Partial<NbveSpc> = {};
        while (!this.check(TokenType.RBRACE)) {
          const spcToken = this.current();
          if (spcToken.type === TokenType.WINDOW) {
            this.advance(); parsed.window = Number(this.expectToken(TokenType.NUMBER_LITERAL).value);
          } else if (spcToken.type === TokenType.CONFIDENCE) {
            this.advance(); parsed.confidence = Number(this.expectToken(TokenType.NUMBER_LITERAL).value);
          } else if (spcToken.type === TokenType.IDENTIFIER && spcToken.value === 'ACCURACY_THRESHOLD') {
            this.advance(); parsed.accuracyThreshold = Number(this.expectToken(TokenType.NUMBER_LITERAL).value);
          } else if (spcToken.type === TokenType.IDENTIFIER && spcToken.value === 'STABILITY_THRESHOLD') {
            this.advance(); parsed.stabilityThreshold = Number(this.expectToken(TokenType.NUMBER_LITERAL).value);
          } else if (spcToken.type === TokenType.IDENTIFIER && spcToken.value === 'DEFECT_RATE_MAX') {
            this.advance(); parsed.defectRateMax = Number(this.expectToken(TokenType.NUMBER_LITERAL).value);
          } else {
            this.error(`Unexpected token in NBVE SPC block: ${spcToken.value}`);
          }
        }
        this.expectToken(TokenType.RBRACE);
        spc = { ...spc, ...parsed };
        continue;
      }
      if (token.type === TokenType.METRICS) {
        this.advance(); metrics.push(...this.parseBracketedIdentifierList()); continue;
      }
      if (token.type === TokenType.PROMOTION_KW) {
        this.advance(); promotion = this.expectIdentifier() as 'auto' | 'manual'; continue;
      }
      if (token.type === TokenType.FALLBACK) {
        this.advance(); fallback = this.expectIdentifier() as 'production' | 'shadow'; continue;
      }
      this.error(`Unexpected token in NBVE: ${token.value}`);
    }

    const end = this.expectToken(TokenType.RBRACE).location;
    return { kind: 'nbve', name, description, production, shadow, spc, metrics, promotion, fallback, span: { start, end } };
  }

  // --- CONTRACT ---

  private parseContract(): ContractDecl {
    const start = this.expectToken(TokenType.CONTRACT_KW).location;
    const name = this.expectIdentifier();
    this.expectToken(TokenType.LBRACE);

    let description = '';
    const parties: ContractParty[] = [];
    const terms: ContractTerm[] = [];
    const deliverables: ContractDeliverable[] = [];
    let payment: ContractPayment = { method: 'external', amount: 0, currency: 'USD', release: 'manual', recurring: false };
    let governance: ContractGovernance = { signedBy: 'both', dispute: 'optional' };
    let timestamps = false;

    while (!this.check(TokenType.RBRACE)) {
      const token = this.current();

      if (token.type === TokenType.DESCRIPTION) {
        this.advance(); description = this.expectToken(TokenType.STRING_LITERAL).value; continue;
      }
      if (token.type === TokenType.PARTIES) {
        this.advance(); this.expectToken(TokenType.LBRACE);
        while (!this.check(TokenType.RBRACE)) {
          const role = this.expectIdentifier();
          this.expectToken(TokenType.COLON);
          const type = this.expectIdentifier();
          parties.push({ role, type });
        }
        this.expectToken(TokenType.RBRACE); continue;
      }
      if (token.type === TokenType.TERMS) {
        this.advance(); this.expectToken(TokenType.LBRACE);
        while (!this.check(TokenType.RBRACE)) {
          const key = this.expectIdentifier();
          this.expectToken(TokenType.COLON);
          const val = this.parseLiteral();
          terms.push({ key, value: String(val) });
        }
        this.expectToken(TokenType.RBRACE); continue;
      }
      if (token.type === TokenType.DELIVERABLES) {
        this.advance(); this.expectToken(TokenType.LBRACE);
        while (!this.check(TokenType.RBRACE)) {
          const dName = this.expectIdentifier();
          this.expectToken(TokenType.COLON);
          const reqToken = this.current();
          const required = reqToken.type === TokenType.REQUIRED || reqToken.value === 'REQUIRED';
          this.advance();
          deliverables.push({ name: dName, required });
        }
        this.expectToken(TokenType.RBRACE); continue;
      }
      if (token.type === TokenType.PAYMENT_KW) {
        this.advance(); this.expectToken(TokenType.LBRACE);
        const parsed: Partial<ContractPayment> = {};
        while (!this.check(TokenType.RBRACE)) {
          const pt = this.current();
          if (pt.type === TokenType.IDENTIFIER && pt.value === 'METHOD') {
            this.advance(); parsed.method = this.expectIdentifier() as PaymentMethod;
          } else if (pt.type === TokenType.AMOUNT) {
            this.advance(); parsed.amount = Number(this.expectToken(TokenType.NUMBER_LITERAL).value);
          } else if (pt.type === TokenType.CURRENCY) {
            this.advance(); parsed.currency = this.expectToken(TokenType.STRING_LITERAL).value;
          } else if (pt.type === TokenType.RELEASE) {
            this.advance(); parsed.release = this.expectIdentifier() as PaymentRelease;
          } else if (pt.type === TokenType.RECURRING) {
            this.advance(); parsed.recurring = this.parseBoolValue();
          } else {
            this.error(`Unexpected token in PAYMENT block: ${pt.value}`);
          }
        }
        this.expectToken(TokenType.RBRACE);
        payment = { ...payment, ...parsed };
        continue;
      }
      if (token.type === TokenType.GOVERNANCE) {
        this.advance(); this.expectToken(TokenType.LBRACE);
        const parsed: Partial<ContractGovernance> = {};
        while (!this.check(TokenType.RBRACE)) {
          const gt = this.current();
          if (gt.type === TokenType.SIGNED_BY) {
            this.advance(); parsed.signedBy = this.expectIdentifier() as ContractGovernance['signedBy'];
          } else if (gt.type === TokenType.DISPUTE_KW) {
            this.advance(); parsed.dispute = this.expectIdentifier() as ContractGovernance['dispute'];
          } else {
            this.error(`Unexpected token in CONTRACT GOVERNANCE block: ${gt.value}`);
          }
        }
        this.expectToken(TokenType.RBRACE);
        governance = { ...governance, ...parsed };
        continue;
      }
      if (token.type === TokenType.TIMESTAMPS) {
        this.advance(); timestamps = true; continue;
      }
      this.error(`Unexpected token in CONTRACT: ${token.value}`);
    }

    const end = this.expectToken(TokenType.RBRACE).location;
    return { kind: 'contract', name, description, parties, terms, deliverables, payment, governance, timestamps, span: { start, end } };
  }

  // --- REPUTATION ---

  private parseReputation(): ReputationDecl {
    const start = this.expectToken(TokenType.REPUTATION_KW).location;
    const name = this.expectIdentifier();
    this.expectToken(TokenType.LBRACE);

    let description = '';
    const metrics: ReputationMetric[] = [];
    let spc: ReputationSpc = { maturingThreshold: 50, matureThreshold: 100, requiredConfidence: 0.95 };
    let decay: ReputationDecay = { enabled: false, halfLife: '180d' };

    while (!this.check(TokenType.RBRACE)) {
      const token = this.current();
      if (token.type === TokenType.DESCRIPTION) { this.advance(); description = this.expectToken(TokenType.STRING_LITERAL).value; continue; }
      if (token.type === TokenType.METRICS) {
        this.advance(); this.expectToken(TokenType.LBRACE);
        while (!this.check(TokenType.RBRACE)) {
          const mName = this.expectIdentifier();
          this.expectToken(TokenType.COLON);
          const mType = this.expectIdentifier() as 'float' | 'int';
          metrics.push({ name: mName, type: mType });
        }
        this.expectToken(TokenType.RBRACE); continue;
      }
      if (token.type === TokenType.SPC) {
        this.advance(); this.expectToken(TokenType.LBRACE);
        const parsed: Partial<ReputationSpc> = {};
        while (!this.check(TokenType.RBRACE)) {
          const st = this.current();
          if (st.type === TokenType.MATURING_THRESHOLD) { this.advance(); parsed.maturingThreshold = Number(this.expectToken(TokenType.NUMBER_LITERAL).value); }
          else if (st.type === TokenType.MATURE_THRESHOLD) { this.advance(); parsed.matureThreshold = Number(this.expectToken(TokenType.NUMBER_LITERAL).value); }
          else if (st.type === TokenType.CONFIDENCE) { this.advance(); parsed.requiredConfidence = Number(this.expectToken(TokenType.NUMBER_LITERAL).value); }
          else { this.error(`Unexpected token in REPUTATION SPC: ${st.value}`); }
        }
        this.expectToken(TokenType.RBRACE);
        spc = { ...spc, ...parsed }; continue;
      }
      if (token.type === TokenType.DECAY) {
        this.advance(); this.expectToken(TokenType.LBRACE);
        const parsed: Partial<ReputationDecay> = {};
        while (!this.check(TokenType.RBRACE)) {
          const dt = this.current();
          if (dt.value === 'enabled') { this.advance(); parsed.enabled = this.parseBoolValue(); }
          else if (dt.type === TokenType.HALF_LIFE) { this.advance(); parsed.halfLife = this.expectToken(TokenType.STRING_LITERAL).value; }
          else { this.error(`Unexpected token in REPUTATION DECAY: ${dt.value}`); }
        }
        this.expectToken(TokenType.RBRACE);
        decay = { ...decay, ...parsed }; continue;
      }
      this.error(`Unexpected token in REPUTATION: ${token.value}`);
    }

    const end = this.expectToken(TokenType.RBRACE).location;
    return { kind: 'reputation', name, description, metrics, spc, decay, span: { start, end } };
  }

  // --- SUBSCRIPTION ---

  private parseSubscription(): SubscriptionDecl {
    const start = this.expectToken(TokenType.SUBSCRIPTION_KW).location;
    const name = this.expectIdentifier();
    this.expectToken(TokenType.LBRACE);

    let description = '', provider = '', subscriber = '';
    let terms: SubscriptionTerms = { amount: 0, interval: 'monthly', perks: [] };
    let payment: SubscriptionPayment = { method: 'stripe', autoRenew: true };

    while (!this.check(TokenType.RBRACE)) {
      const token = this.current();
      if (token.type === TokenType.DESCRIPTION) { this.advance(); description = this.expectToken(TokenType.STRING_LITERAL).value; continue; }
      if (token.type === TokenType.PROVIDER_KW) { this.advance(); provider = this.expectIdentifier(); continue; }
      if (token.type === TokenType.SUBSCRIBER_KW) { this.advance(); subscriber = this.expectIdentifier(); continue; }
      if (token.type === TokenType.TERMS) {
        this.advance(); this.expectToken(TokenType.LBRACE);
        const parsed: Partial<SubscriptionTerms> = {};
        while (!this.check(TokenType.RBRACE)) {
          const tt = this.current();
          if (tt.type === TokenType.AMOUNT) { this.advance(); parsed.amount = Number(this.expectToken(TokenType.NUMBER_LITERAL).value); }
          else if (tt.type === TokenType.INTERVAL) { this.advance(); parsed.interval = this.expectIdentifier() as SubscriptionTerms['interval']; }
          else if (tt.type === TokenType.PERKS) { this.advance(); parsed.perks = this.parseBracketedStringList(); }
          else { this.error(`Unexpected token in SUBSCRIPTION TERMS: ${tt.value}`); }
        }
        this.expectToken(TokenType.RBRACE);
        terms = { ...terms, ...parsed }; continue;
      }
      if (token.type === TokenType.PAYMENT_KW) {
        this.advance(); this.expectToken(TokenType.LBRACE);
        const parsed: Partial<SubscriptionPayment> = {};
        while (!this.check(TokenType.RBRACE)) {
          const pt = this.current();
          if (pt.value === 'METHOD') { this.advance(); parsed.method = this.expectIdentifier() as PaymentMethod; }
          else if (pt.type === TokenType.AUTO_RENEW) { this.advance(); parsed.autoRenew = this.parseBoolValue(); }
          else { this.error(`Unexpected token in SUBSCRIPTION PAYMENT: ${pt.value}`); }
        }
        this.expectToken(TokenType.RBRACE);
        payment = { ...payment, ...parsed }; continue;
      }
      this.error(`Unexpected token in SUBSCRIPTION: ${token.value}`);
    }

    const end = this.expectToken(TokenType.RBRACE).location;
    return { kind: 'subscription', name, description, provider, subscriber, terms, payment, span: { start, end } };
  }

  // --- DISPUTE ---

  private parseDispute(): DisputeDecl {
    const start = this.expectToken(TokenType.DISPUTE_KW).location;
    const name = this.expectIdentifier();
    this.expectToken(TokenType.LBRACE);

    let description = '', contract = '';
    const states: string[] = [];
    const resolutions: DisputeResolution[] = [];

    while (!this.check(TokenType.RBRACE)) {
      const token = this.current();
      if (token.type === TokenType.DESCRIPTION) { this.advance(); description = this.expectToken(TokenType.STRING_LITERAL).value; continue; }
      if (token.type === TokenType.CONTRACT_KW) { this.advance(); contract = this.expectIdentifier(); continue; }
      if (token.type === TokenType.STATES_KW) {
        this.advance(); this.expectToken(TokenType.LBRACE);
        while (!this.check(TokenType.RBRACE)) { states.push(this.expectIdentifier()); }
        this.expectToken(TokenType.RBRACE); continue;
      }
      if (token.type === TokenType.RESOLUTION_KW) {
        this.advance(); this.expectToken(TokenType.LBRACE);
        while (!this.check(TokenType.RBRACE)) { resolutions.push(this.expectIdentifier() as DisputeResolution); }
        this.expectToken(TokenType.RBRACE); continue;
      }
      this.error(`Unexpected token in DISPUTE: ${token.value}`);
    }

    const end = this.expectToken(TokenType.RBRACE).location;
    return { kind: 'dispute', name, description, contract, states, resolutions, span: { start, end } };
  }

  // --- NODE ---

  private parseNode(): NodeDecl {
    const start = this.expectToken(TokenType.NODE).location;
    const name = this.expectIdentifier();
    this.expectToken(TokenType.LBRACE);

    let description = '', type: NodeType = 'environment', hardware = '', aiTier: AiTier = 'edge';
    let comms: string[] = [], sensorRefs: string[] = [], zone: string | undefined;
    let offline = true, safety: SafetyLevel = 'low';

    while (!this.check(TokenType.RBRACE)) {
      const token = this.current();
      if (token.type === TokenType.DESCRIPTION) { this.advance(); description = this.expectToken(TokenType.STRING_LITERAL).value; continue; }
      if (token.type === TokenType.TYPE_STRING && token.value === 'TYPE' || token.value === 'TYPE') { this.advance(); type = this.expectIdentifier() as NodeType; continue; }
      if (token.type === TokenType.HARDWARE) { this.advance(); hardware = this.expectToken(TokenType.STRING_LITERAL).value; continue; }
      if (token.type === TokenType.AI_TIER) { this.advance(); aiTier = this.expectIdentifier() as AiTier; continue; }
      if (token.type === TokenType.COMMS) { this.advance(); comms = this.parseIdentifierList(); continue; }
      if (token.type === TokenType.SENSORS) { this.advance(); sensorRefs = this.parseIdentifierList(); continue; }
      if (token.type === TokenType.ZONE) { this.advance(); zone = this.expectIdentifier(); continue; }
      if (token.type === TokenType.OFFLINE) { this.advance(); offline = this.parseBoolValue(); continue; }
      if (token.type === TokenType.SAFETY) { this.advance(); safety = this.expectIdentifier() as SafetyLevel; continue; }
      this.error(`Unexpected token in NODE: ${token.value}`);
    }

    const end = this.expectToken(TokenType.RBRACE).location;
    return { kind: 'node', name, description, type, hardware, aiTier, comms, sensors: sensorRefs, zone, offline, safety, span: { start, end } };
  }

  // --- SENSOR ---

  private parseSensor(): SensorDecl {
    const start = this.expectToken(TokenType.SENSOR_KW).location;
    const name = this.expectIdentifier();
    this.expectToken(TokenType.LBRACE);

    let description = '', type: SensorType = 'custom', model: string | undefined;
    let capabilities: string[] = [], latency = 0, accuracy = 0.95, failure: string | undefined;

    while (!this.check(TokenType.RBRACE)) {
      const token = this.current();
      if (token.type === TokenType.DESCRIPTION) { this.advance(); description = this.expectToken(TokenType.STRING_LITERAL).value; continue; }
      if (token.value === 'TYPE') { this.advance(); type = this.expectIdentifier() as SensorType; continue; }
      if (token.type === TokenType.MODEL) { this.advance(); model = this.expectToken(TokenType.STRING_LITERAL).value; continue; }
      if (token.type === TokenType.CAPABILITY) { this.advance(); capabilities = this.parseIdentifierList(); continue; }
      if (token.type === TokenType.LATENCY) { this.advance(); latency = Number(this.expectToken(TokenType.NUMBER_LITERAL).value); continue; }
      if (token.type === TokenType.ACCURACY) { this.advance(); accuracy = Number(this.expectToken(TokenType.NUMBER_LITERAL).value); continue; }
      if (token.type === TokenType.FAILURE) { this.advance(); failure = this.expectToken(TokenType.STRING_LITERAL).value; continue; }
      this.error(`Unexpected token in SENSOR: ${token.value}`);
    }

    const end = this.expectToken(TokenType.RBRACE).location;
    return { kind: 'sensor', name, description, type, model, capabilities, latency, accuracy, failure, span: { start, end } };
  }

  // --- ZONE ---

  private parseZone(): ZoneDecl {
    const start = this.expectToken(TokenType.ZONE).location;
    const name = this.expectIdentifier();
    this.expectToken(TokenType.LBRACE);

    let description = '', bounds: string | undefined, nodeRefs: string[] = [];
    let ambient = true, capacity: number | undefined, hours: string | undefined;

    while (!this.check(TokenType.RBRACE)) {
      const token = this.current();
      if (token.type === TokenType.DESCRIPTION) { this.advance(); description = this.expectToken(TokenType.STRING_LITERAL).value; continue; }
      if (token.type === TokenType.BOUNDS) { this.advance(); bounds = this.expectToken(TokenType.STRING_LITERAL).value; continue; }
      if (token.type === TokenType.NODES) { this.advance(); nodeRefs = this.parseIdentifierList(); continue; }
      if (token.type === TokenType.AMBIENT) { this.advance(); ambient = this.parseBoolValue(); continue; }
      if (token.type === TokenType.CAPACITY) { this.advance(); capacity = Number(this.expectToken(TokenType.NUMBER_LITERAL).value); continue; }
      if (token.type === TokenType.HOURS) { this.advance(); hours = this.expectToken(TokenType.STRING_LITERAL).value; continue; }
      this.error(`Unexpected token in ZONE: ${token.value}`);
    }

    const end = this.expectToken(TokenType.RBRACE).location;
    return { kind: 'zone', name, description, bounds, nodes: nodeRefs, ambient, capacity, hours, span: { start, end } };
  }

  // --- IDENTITY ---

  private parseIdentity(): IdentityDecl {
    const start = this.expectToken(TokenType.IDENTITY).location;
    const name = this.expectIdentifier();
    this.expectToken(TokenType.LBRACE);

    let description = '';
    let signingKey = 'ed25519';
    let domains: string[] = ['general'];
    let discoverable = true;
    let portable = true;
    const profile: IdentityProfileField[] = [];

    while (!this.check(TokenType.RBRACE)) {
      const token = this.current();

      if (token.type === TokenType.DESCRIPTION) {
        this.advance(); description = this.expectToken(TokenType.STRING_LITERAL).value; continue;
      }
      if (token.type === TokenType.SIGNING_KEY) {
        this.advance(); signingKey = this.expectIdentifier(); continue;
      }
      if (token.value === 'DOMAINS') {
        this.advance(); domains = this.parseIdentifierList(); continue;
      }
      if (token.type === TokenType.DISCOVERABLE) {
        this.advance(); discoverable = this.parseBoolValue(); continue;
      }
      if (token.type === TokenType.PORTABLE) {
        this.advance(); portable = this.parseBoolValue(); continue;
      }
      if (token.type === TokenType.PROFILE) {
        this.advance(); this.expectToken(TokenType.LBRACE);
        while (!this.check(TokenType.RBRACE)) {
          const fieldName = this.expectIdentifier();
          this.expectToken(TokenType.COLON);
          const fieldType = this.parseType();
          let required = false;
          if (this.check(TokenType.REQUIRED)) { this.advance(); required = true; }
          profile.push({ name: fieldName, type: fieldType, required });
        }
        this.expectToken(TokenType.RBRACE); continue;
      }
      this.error(`Unexpected token in IDENTITY: ${token.value}`);
    }

    const end = this.expectToken(TokenType.RBRACE).location;
    return { kind: 'identity', name, description, signingKey, domains, discoverable, portable, profile, span: { start, end } };
  }

  // --- FEED ---

  private parseFeed(): FeedDecl {
    const start = this.expectToken(TokenType.FEED).location;
    const name = this.expectIdentifier();
    this.expectToken(TokenType.LBRACE);

    let description = '';
    let identity = '';
    let packet = '';
    let channel: string | undefined;
    let subscribe: FeedSubscribeMode = 'open';
    let syndicate = true;
    let maxItems = 1000;
    let discovery = true;

    while (!this.check(TokenType.RBRACE)) {
      const token = this.current();

      if (token.type === TokenType.DESCRIPTION) {
        this.advance(); description = this.expectToken(TokenType.STRING_LITERAL).value; continue;
      }
      if (token.type === TokenType.IDENTITY) {
        this.advance(); identity = this.expectIdentifier(); continue;
      }
      if (token.type === TokenType.PACKET) {
        this.advance(); packet = this.expectIdentifier(); continue;
      }
      if (token.type === TokenType.CHANNEL) {
        this.advance(); channel = this.expectIdentifier(); continue;
      }
      if (token.type === TokenType.SUBSCRIBE) {
        this.advance(); subscribe = this.expectIdentifier() as FeedSubscribeMode; continue;
      }
      if (token.type === TokenType.SYNDICATE) {
        this.advance(); syndicate = this.parseBoolValue(); continue;
      }
      if (token.type === TokenType.MAX_ITEMS) {
        this.advance(); maxItems = Number(this.expectToken(TokenType.NUMBER_LITERAL).value); continue;
      }
      if (token.type === TokenType.DISCOVERY) {
        this.advance(); discovery = this.parseBoolValue(); continue;
      }
      this.error(`Unexpected token in FEED: ${token.value}`);
    }

    const end = this.expectToken(TokenType.RBRACE).location;
    return { kind: 'feed', name, description, identity, packet, channel, subscribe, syndicate, maxItems, discovery, span: { start, end } };
  }

  // --- Inline Expression Parser ---
  // Reads tokens until a line-ending context is reached (next keyword or closing brace)
  // Returns the raw expression string for evaluation at runtime

  private parseInlineExpression(): string {
    const parts: string[] = [];
    while (
      !this.check(TokenType.RBRACE) &&
      !this.check(TokenType.TRANSITION) &&
      !this.check(TokenType.ON_ENTER) &&
      !this.check(TokenType.ON_EXIT) &&
      !this.check(TokenType.PATTERN) &&
      !this.check(TokenType.RULE) &&
      !this.check(TokenType.STATE) &&
      !this.check(TokenType.SCORE) &&
      !this.check(TokenType.FACT) &&
      !this.check(TokenType.MATCH) &&
      !this.check(TokenType.RESPOND) &&
      !this.check(TokenType.ASSERT) &&
      !this.check(TokenType.CATEGORY) &&
      !this.check(TokenType.PRIORITY) &&
      !this.check(TokenType.THRESHOLD) &&
      !this.check(TokenType.DESCRIPTION) &&
      !this.check(TokenType.ACTIVATE_WHEN) &&
      !this.check(TokenType.DEACTIVATE_WHEN) &&
      !this.check(TokenType.MODULE) &&
      !this.check(TokenType.STEP) &&
      !this.check(TokenType.WHEN) &&
      !this.check(TokenType.AND) &&
      !this.check(TokenType.UNLESS) &&
      !this.check(TokenType.THEN) &&
      !this.check(TokenType.EOF)
    ) {
      // Lookahead: if current is identifier-like and next is COLON, we're at a new key:value pair — stop
      const next = this.tokens[this.pos + 1];
      if (next && next.type === TokenType.COLON) break;

      parts.push(this.advance().value);
    }
    return parts.join(' ');
  }

  // --- String List Parser ---
  // Parses comma-separated strings (for MATCH and RESPOND)

  private parseStringList(): string[] {
    const list: string[] = [];
    do {
      if (this.check(TokenType.RBRACE)) break;
      if (this.check(TokenType.STRING_LITERAL)) {
        list.push(this.advance().value);
      } else {
        // Accept bare identifiers as keywords
        list.push(this.advance().value);
      }
    } while (this.consumeIf(TokenType.COMMA));
    return list;
  }

  // --- Utility Methods ---

  private current(): Token {
    return this.tokens[this.pos]!;
  }

  private advance(): Token {
    const token = this.tokens[this.pos]!;
    this.pos++;
    return token;
  }

  private check(type: TokenType): boolean {
    return this.current().type === type;
  }

  private consumeIf(type: TokenType): boolean {
    if (this.check(type)) {
      this.advance();
      return true;
    }
    return false;
  }

  private isAtEnd(): boolean {
    return this.current().type === TokenType.EOF;
  }

  private expectToken(type: TokenType): Token {
    const token = this.current();
    if (token.type !== type) {
      this.error(`Expected ${type}, got: ${token.type} ('${token.value}')`);
    }
    return this.advance();
  }

  private expectIdentifier(): string {
    const token = this.current();
    // Accept IDENTIFIER and also some keywords that can be used as identifiers in context
    if (token.type === TokenType.IDENTIFIER ||
        token.type === TokenType.ACTION ||
        token.type === TokenType.ENTITY ||
        token.type === TokenType.TYPE_STRING ||
        token.type === TokenType.TYPE_NUMBER ||
        token.type === TokenType.TYPE_JSON ||
        token.type === TokenType.TYPE_BOOL ||
        token.type === TokenType.TYPE_ID ||
        token.type === TokenType.TYPE_FLOAT ||
        token.type === TokenType.TYPE_DATE ||
        token.type === TokenType.TYPE_DATETIME ||
        token.type === TokenType.STATE ||
        token.type === TokenType.SCORE ||
        token.type === TokenType.PATTERN ||
        token.type === TokenType.MODULE ||
        token.type === TokenType.LAYOUT_TABLE ||
        token.type === TokenType.LAYOUT_FORM ||
        token.type === TokenType.LAYOUT_DETAIL ||
        token.type === TokenType.LAYOUT_CARDS ||
        token.type === TokenType.LAYOUT_SPLIT ||
        token.type === TokenType.LAYOUT_CUSTOM ||
        token.type === TokenType.LAYOUT_DOCUMENT_EDITOR ||
        token.type === TokenType.LAYOUT_SETTINGS ||
        token.type === TokenType.FAIL_STOP ||
        token.type === TokenType.FAIL_SKIP ||
        token.type === TokenType.FAIL_RETRY ||
        token.type === TokenType.FAIL_FALLBACK ||
        token.type === TokenType.FULL ||
        token.type === TokenType.NODE ||
        token.type === TokenType.SENSOR_KW ||
        token.type === TokenType.ZONE ||
        token.type === TokenType.CHANNEL ||
        token.type === TokenType.FEED ||
        token.type === TokenType.IDENTITY) {
      return this.advance().value;
    }
    this.error(`Expected identifier, got: ${token.type} ('${token.value}')`);
  }

  private expectString(): string {
    const token = this.current();
    if (token.type === TokenType.STRING_LITERAL) return this.advance().value;
    // Accept any non-structural token as a bare string (for filenames like full.db, test.db)
    if (token.type !== TokenType.LBRACE && token.type !== TokenType.RBRACE &&
        token.type !== TokenType.EOF) {
      let value = this.advance().value;
      // Consume dotted segments (for filenames like academy.db)
      while (this.check(TokenType.DOT)) {
        this.advance();
        value += '.' + this.advance().value;
      }
      return value;
    }
    this.error(`Expected string, got: ${token.type} ('${token.value}')`);
  }

  private parseLiteral(): LiteralValue {
    const token = this.current();
    if (token.type === TokenType.STRING_LITERAL) { this.advance(); return token.value; }
    if (token.type === TokenType.NUMBER_LITERAL) { this.advance(); return Number(token.value); }
    if (token.type === TokenType.TRUE) { this.advance(); return true; }
    if (token.type === TokenType.FALSE) { this.advance(); return false; }
    // json defaults: [] and {}
    if (token.type === TokenType.LBRACKET) {
      this.advance();
      this.expectToken(TokenType.RBRACKET);
      return '[]';
    }
    if (token.type === TokenType.LBRACE) {
      this.advance();
      this.expectToken(TokenType.RBRACE);
      return '{}';
    }
    this.error(`Expected literal value, got: ${token.value}`);
  }

  private parseNumericLiteral(): number {
    const token = this.expectToken(TokenType.NUMBER_LITERAL);
    return Number(token.value);
  }

  private parseBoolValue(): boolean {
    if (this.check(TokenType.TRUE)) { this.advance(); return true; }
    if (this.check(TokenType.FALSE)) { this.advance(); return false; }
    this.error(`Expected true or false, got: ${this.current().value}`);
  }

  private parseIdentifierList(): string[] {
    const list: string[] = [];
    do {
      if (this.check(TokenType.RBRACE)) break;
      if (this.isTopLevelKeyword(this.current().type)) break;
      list.push(this.expectIdentifier());
    } while (this.consumeIf(TokenType.COMMA));
    return list;
  }

  private parseBracketedIdentifierList(): string[] {
    this.expectToken(TokenType.LBRACKET);
    const list: string[] = [];
    while (!this.check(TokenType.RBRACKET) && !this.isAtEnd()) {
      list.push(this.expectIdentifier());
      this.consumeIf(TokenType.COMMA);
    }
    this.expectToken(TokenType.RBRACKET);
    return list;
  }

  private parseBracketedStringList(): string[] {
    this.expectToken(TokenType.LBRACKET);
    const list: string[] = [];
    while (!this.check(TokenType.RBRACKET) && !this.isAtEnd()) {
      if (this.check(TokenType.STRING_LITERAL)) {
        list.push(this.advance().value);
      } else {
        list.push(this.expectIdentifier());
      }
      this.consumeIf(TokenType.COMMA);
    }
    this.expectToken(TokenType.RBRACKET);
    return list;
  }

  private parseQualifiedName(): string {
    let name = this.expectIdentifier();
    while (this.check(TokenType.DOT)) {
      this.advance();
      name += '.' + this.expectIdentifier();
    }
    return name;
  }

  // --- PREFERENCE ---

  private parsePreference(): PreferenceDecl {
    const start = this.expectToken(TokenType.PREFERENCE_KW).location;
    const name = this.expectIdentifier();
    this.expectToken(TokenType.LBRACE);
    let type = 'string';
    let defaultValue: LiteralValue = '';
    let key = '';
    while (!this.check(TokenType.RBRACE)) {
      const tok = this.current();
      if (tok.type === TokenType.TYPE_KW) {
        this.advance();
        type = this.current().value; // e.g. "string"
        this.advance();
      } else if (tok.type === TokenType.DEFAULT) {
        this.advance();
        defaultValue = this.parseLiteral();
      } else if (tok.type === TokenType.KEY_KW) {
        this.advance();
        key = this.expectToken(TokenType.STRING_LITERAL).value;
      } else {
        this.error(`Unexpected token in PREFERENCE: ${tok.value}`);
      }
    }
    const end = this.expectToken(TokenType.RBRACE).location;
    return { kind: 'preference', name, type, defaultValue, key, span: { start, end } };
  }

  // --- Top-Level SEED ---

  private parseTopLevelSeed(): TopLevelSeedDecl {
    const start = this.expectToken(TokenType.SEED).location;
    const entity = this.expectIdentifier();
    this.expectToken(TokenType.LBRACE);
    const fields = new Map<string, LiteralValue>();
    while (!this.check(TokenType.RBRACE) && !this.isAtEnd()) {
      const key = this.expectIdentifier();
      const value = this.parseLiteral();
      fields.set(key, value);
    }
    const end = this.expectToken(TokenType.RBRACE).location;
    return { kind: 'seed', entity, fields, span: { start, end } };
  }

  private isTopLevelKeyword(type: TokenType): boolean {
    return type === TokenType.ENTITY || type === TokenType.ACTION ||
           type === TokenType.VIEW || type === TokenType.AI_SERVICE ||
           type === TokenType.TEST || type === TokenType.RULE ||
           type === TokenType.WORKFLOW || type === TokenType.INPUT ||
           type === TokenType.OUTPUT || type === TokenType.AI ||
           type === TokenType.STREAM || type === TokenType.LAYOUT ||
           type === TokenType.ACTIONS || type === TokenType.SIDEBAR ||
           type === TokenType.FIELDS || type === TokenType.TITLE ||
           type === TokenType.GIVEN || type === TokenType.EXPECT ||
           type === TokenType.STEP || type === TokenType.PARALLEL;
  }

  private spanFrom(start: SourceLocation): SourceSpan {
    return { start, end: this.current().location };
  }

  private error(message: string): never {
    throw new ParseError(message, this.current().location);
  }
}
