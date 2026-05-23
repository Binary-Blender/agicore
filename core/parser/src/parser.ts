// Agicore DSL Parser - Recursive descent parser producing a typed AST

import { Lexer, TokenType, type Token } from './lexer.js';
import type {
  AgiFile, AppDecl, EntityDecl, ActionDecl, ViewDecl,
  TopLevelSeedDecl,
  AiServiceDecl, TestDecl, RuleDecl, WorkflowDecl,
  FactDecl, StateDecl, PatternDecl, ScoreDecl, ModuleDecl,
  PipelineDecl, PipelineRow, PipelineModule, PipelineConnection, PipelineModuleType,
  QCDecl, VaultDecl, LogDecl, LogLevel, LogTarget,
  MacroDecl, MacroParam, MacroRegistryDecl, MacroBinding,
  ActuatorDecl, ActuatorType,
  PlatformDecl, ChipType,
  NullclawDecl, NullclawTool, NullclawProvider, // TOOLS + PROVIDERS reuse existing token types
  BrainBodyDecl,
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
  TypeAliasDecl,
  ThemeDecl, ThemePalette, ThemeBackground, ThemeDensity, ThemeMotif, ThemeRadius,
  StagesDecl, StagesTransition, StagesCondition, StagesConditionOp, StagesMatchMode,
  CognitionRoleDecl, PromotionPolicy, FallbackPolicy,
  EscalationChainDecl, EscalationOnConditions, DeescalationOnConditions,
  QcMeshDecl, QcMeshConsensus, QcMeshOnFail, QcMeshSpc, MeshDecl,
  TargetDecl, TargetRuntime, TargetFrontend, TargetDeploy,
  AuthDecl, AuthStrategy,
  TenantDecl, TenantModel, TenantIsolation,
  MutationPolicyDecl, MutationTierDecl,
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
    let log: LogDecl | undefined;
    const macros: MacroDecl[] = [];
    let macroRegistry: MacroRegistryDecl | undefined;
    const actuators: ActuatorDecl[] = [];
    const platforms: PlatformDecl[] = [];
    let nullclaw: NullclawDecl | undefined;
    let brainBody: BrainBodyDecl | undefined;
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
    const typeAliases: TypeAliasDecl[] = [];
    const themes: ThemeDecl[] = [];
    const stages: StagesDecl[] = [];
    const cognitionRoles: CognitionRoleDecl[] = [];
    const escalationChains: EscalationChainDecl[] = [];
    const qcMeshes: QcMeshDecl[] = [];
    const meshes: MeshDecl[] = [];
    let target: TargetDecl | undefined;
    let auth: AuthDecl | undefined;
    let tenant: TenantDecl | undefined;
    const mutationPolicies: MutationPolicyDecl[] = [];

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
        case TokenType.LOG_KW:
          log = this.parseLog();
          break;
        case TokenType.MACRO_KW:
          macros.push(this.parseMacro());
          break;
        case TokenType.MACRO_REGISTRY_KW:
          macroRegistry = this.parseMacroRegistry();
          break;
        case TokenType.ACTUATOR_KW:
          actuators.push(this.parseActuator());
          break;
        case TokenType.PLATFORM_KW:
          platforms.push(this.parsePlatform());
          break;
        case TokenType.NULLCLAW_KW:
          nullclaw = this.parseNullclaw();
          break;
        case TokenType.BRAIN_BODY_KW:
          brainBody = this.parseBrainBody();
          break;
        case TokenType.SEED:
          topLevelSeeds.push(this.parseTopLevelSeed());
          break;
        case TokenType.TYPE_KW:
          typeAliases.push(this.parseTypeAlias());
          break;
        case TokenType.THEME:
          themes.push(this.parseTheme());
          break;
        case TokenType.STAGES_KW:
          stages.push(this.parseStages());
          break;
        case TokenType.COGNITION_ROLE_KW:
          cognitionRoles.push(this.parseCognitionRole());
          break;
        case TokenType.ESCALATION_CHAIN_KW:
          escalationChains.push(this.parseEscalationChain());
          break;
        case TokenType.QC_MESH_KW:
          qcMeshes.push(this.parseQcMesh());
          break;
        case TokenType.MESH_KW:
          meshes.push(this.parseMesh());
          break;
        case TokenType.TARGET_KW:
          target = this.parseTarget();
          break;
        case TokenType.AUTH_KW:
          auth = this.parseAuth();
          break;
        case TokenType.TENANT_KW:
          tenant = this.parseTenant();
          break;
        case TokenType.MUTATION_POLICY:
          mutationPolicies.push(this.parseMutationPolicy());
          break;
        default:
          this.error(`Unexpected token: ${token.value}. Expected a top-level declaration`);
      }
    }

    return { app, entities, actions, views, aiService, tests, rules, workflows, pipelines, qcs, vault, log, macros, macroRegistry, actuators, platforms, nullclaw, brainBody, facts, states, patterns, scores, modules, routers, skills, skilldocs, reasoners, triggers, lifecycles, breeds, packets, authorities, channels, identities, feeds, nodes, sensors, zones, sessions, compilers, events, nbves, contracts, reputations, subscriptions, disputes, preferences, topLevelSeeds, typeAliases, themes, stages, cognitionRoles, escalationChains, qcMeshes, meshes, target, auth, tenant, mutationPolicies };
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
    let version: string | undefined;
    let description: string | undefined;

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
        case TokenType.VERSION:
          this.advance();
          version = this.expectToken(TokenType.STRING_LITERAL).value;
          break;
        case TokenType.DESCRIPTION:
          this.advance();
          description = this.expectToken(TokenType.STRING_LITERAL).value;
          break;
        default:
          this.error(`Unexpected field in APP: ${field.value}`);
      }
    }

    const end = this.expectToken(TokenType.RBRACE).location;

    if (!title) this.error('APP requires a TITLE field');
    if (!db) this.error('APP requires a DB field');

    return { kind: 'app', name, title, window, db, port, theme, icon, telemetry, current, workspaces, tray, hotkey, version, description, span: { start, end } };
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
    let inlineStages: string[] | undefined;

    while (!this.check(TokenType.RBRACE)) {
      const token = this.current();

      if (token.type === TokenType.TIMESTAMPS) {
        timestamps = true;
        this.advance();
        continue;
      }

      // Inline STAGES form: STAGES [state1, state2, state3, ...]
      // Sugar for top-level STAGES Entity.status { state1 -> state2 -> ... }
      // applied to the entity's `status` field with implicit sequential
      // transitions in declaration order.
      if (token.type === TokenType.STAGES_KW && this.peek(1)?.type === TokenType.LBRACKET) {
        this.advance(); // STAGES
        this.advance(); // [
        const states: string[] = [];
        if (!this.check(TokenType.RBRACKET)) {
          states.push(this.expectStateName());
          while (this.check(TokenType.COMMA)) {
            this.advance();
            states.push(this.expectStateName());
          }
        }
        this.expectToken(TokenType.RBRACKET);
        inlineStages = states;
        continue;
      }

      if (token.type === TokenType.CRUD) {
        this.advance();
        if (this.check(TokenType.FULL)) {
          crud = 'full';
          this.advance();
        } else if (this.check(TokenType.LBRACKET)) {
          // Bracket form: CRUD [create, read, list, edit]
          this.advance();
          const ops: string[] = [];
          if (!this.check(TokenType.RBRACKET)) {
            ops.push(this.expectIdentifier());
            while (this.check(TokenType.COMMA)) {
              this.advance();
              ops.push(this.expectIdentifier());
            }
          }
          this.expectToken(TokenType.RBRACKET);
          crud = ops as CrudOp[];
        } else if (this.check(TokenType.IDENTIFIER)) {
          // Named ops: create, read, update, delete, list
          crud = this.parseIdentifierList() as CrudOp[];
        } else {
          // Bare CRUD with no arguments defaults to 'full'
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
    if (inlineStages !== undefined) decl.inlineStages = inlineStages;
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
      // Accept REQUIRED/UNIQUE/INDEX/SENSITIVE modifiers and the
      // DEFAULT-keyword form as an alternative to `= value`.
      const modifiers: FieldModifier[] = [];
      while (
        this.check(TokenType.REQUIRED) ||
        this.check(TokenType.UNIQUE) ||
        this.check(TokenType.INDEX) ||
        this.check(TokenType.SENSITIVE) ||
        this.check(TokenType.DEFAULT)
      ) {
        if (this.check(TokenType.DEFAULT)) {
          if (defaultValue !== undefined) {
            this.error(`Field '${name}' has multiple DEFAULT values`);
          }
          this.advance();
          defaultValue = this.parseLiteral();
        } else {
          modifiers.push(this.advance().value as FieldModifier);
        }
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

    let type: AgiType;
    let customType: string | undefined;

    const tok = this.current();
    const sqlAliases: Record<string, AgiType> = {
      TEXT: 'string', INTEGER: 'number', REAL: 'float',
      DATE: 'date', DATETIME: 'datetime', BOOLEAN: 'bool',
    };

    if (tok.type === TokenType.IDENTIFIER && !sqlAliases[tok.value.toUpperCase()]) {
      // Custom type alias reference
      customType = tok.value;
      type = 'json';
      this.advance();
    } else {
      type = this.parseType();
      customType = undefined;
    }

    let defaultValue: LiteralValue | undefined;
    if (this.check(TokenType.EQUALS)) {
      this.advance();
      defaultValue = this.parseLiteral();
    }

    // Accept REQUIRED / UNIQUE / INDEX / SENSITIVE modifiers and the
    // DEFAULT-keyword form for default values (alternative to `=`) in
    // any order. The DEFAULT keyword consumes a literal; the boolean
    // modifiers are presence-only.
    const modifiers: FieldModifier[] = [];
    while (
      this.check(TokenType.REQUIRED) ||
      this.check(TokenType.UNIQUE) ||
      this.check(TokenType.INDEX) ||
      this.check(TokenType.SENSITIVE) ||
      this.check(TokenType.DEFAULT)
    ) {
      if (this.check(TokenType.DEFAULT)) {
        if (defaultValue !== undefined) {
          this.error(`Field '${name}' has multiple DEFAULT values`);
        }
        this.advance();
        defaultValue = this.parseLiteral();
      } else {
        modifiers.push(this.advance().value as FieldModifier);
      }
    }

    return { name, type, customType, defaultValue, modifiers, span: this.spanFrom(start) };
  }

  private parseTypeAlias(): TypeAliasDecl {
    this.expectToken(TokenType.TYPE_KW);
    const name = this.expectIdentifier();
    this.expectToken(TokenType.EQUALS);

    const parts: string[] = [];

    const typeTokenMap: Partial<Record<TokenType, string>> = {
      [TokenType.TYPE_STRING]:   'string',
      [TokenType.TYPE_NUMBER]:   'number',
      [TokenType.TYPE_FLOAT]:    'number',
      [TokenType.TYPE_BOOL]:     'boolean',
      [TokenType.TYPE_DATE]:     'string',
      [TokenType.TYPE_DATETIME]: 'string',
      [TokenType.TYPE_JSON]:     'unknown',
      [TokenType.TYPE_ID]:       'string',
    };

    while (!this.isAtEnd()) {
      const tok = this.current();
      if (typeTokenMap[tok.type] !== undefined) {
        parts.push(typeTokenMap[tok.type]!);
        this.advance();
      } else if (tok.type === TokenType.IDENTIFIER) {
        parts.push(tok.value);
        this.advance();
      } else if (tok.type === TokenType.STRING_LITERAL) {
        // The lexer tokenizes [] as STRING_LITERAL with value "[]" — treat as array suffix
        if (tok.value === '[]' && parts.length > 0) {
          parts[parts.length - 1] += '[]';
        } else {
          parts.push(`'${tok.value}'`);
        }
        this.advance();
      } else if (tok.type === TokenType.PIPE) {
        parts.push(' | ');
        this.advance();
      } else if (tok.type === TokenType.LBRACKET) {
        this.advance();
        if (this.check(TokenType.RBRACKET)) {
          this.advance();
          if (parts.length > 0) {
            parts[parts.length - 1] += '[]';
          }
        }
      } else {
        break;
      }
    }

    const definition = parts.join('');
    return { kind: 'typeAlias', name, definition };
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
    let model: string | undefined;
    let stream = false;
    let impl: string | undefined;
    let pattern: string | undefined;
    let emit: ActionEmit | undefined;
    let role: string | undefined;

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
          // IMPL appears in three forms:
          //   IMPL                  — bare, use action name
          //   IMPL "name"           — string identifier
          //   IMPL { /* body */ }   — inline implementation body
          //                            (skipped at parser level; the
          //                            codegen reads the source span)
          if (this.check(TokenType.STRING_LITERAL)) {
            impl = this.advance().value;
          } else if (this.check(TokenType.LBRACE)) {
            // Skip the brace-balanced body — we accept it but defer the
            // body extraction to a later codegen pass.
            impl = name;
            let depth = 1;
            this.advance(); // consume {
            while (depth > 0 && !this.isAtEnd()) {
              const t = this.current();
              if (t.type === TokenType.LBRACE) depth++;
              else if (t.type === TokenType.RBRACE) depth--;
              if (depth > 0) this.advance();
            }
            this.advance(); // consume matching }
          } else {
            impl = name;
          }
          break;
        case TokenType.PATTERN:
          this.advance();
          pattern = this.advance().value; // identifier: file_handler, shell_open, etc.
          break;
        case TokenType.MODEL:
          this.advance();
          model = this.expectToken(TokenType.STRING_LITERAL).value;
          break;
        case TokenType.DESCRIPTION:
          // Informational — consume the string and move on
          this.advance();
          this.expectToken(TokenType.STRING_LITERAL);
          break;
        case TokenType.ROLE_KW:
          this.advance();
          role = this.expectIdentifier();
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
    if (model !== undefined) decl.model = model;
    if (impl !== undefined) decl.impl = impl;
    if (pattern !== undefined) decl.pattern = pattern;
    if (emit !== undefined) decl.emit = emit;
    if (role !== undefined) decl.role = role;
    return decl;
  }

  private parseActionParams(): ActionParam[] {
    // Block format: INPUT { fieldname [:] TYPE [REQUIRED] [DEFAULT value] ... }
    // The colon between name and type is optional — `name: type` and
    // `name type` both parse identically. The Accelerando apps use the
    // colon form; the existing inline form omits it.
    if (this.check(TokenType.LBRACE)) {
      this.advance(); // consume {
      const params: ActionParam[] = [];
      while (!this.check(TokenType.RBRACE) && !this.isAtEnd()) {
        if (this.isTopLevelKeyword(this.current().type)) break;
        const name = this.expectIdentifier();
        // Optional colon: accept both `name: type` and `name type` forms.
        if (this.check(TokenType.COLON)) this.advance();
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
    // Block format: OUTPUT { fieldname [:] TYPE [REQUIRED] [DEFAULT value] ... }
    // Colon is optional — both `name: type` and `name type` parse.
    if (this.check(TokenType.LBRACE)) {
      this.advance(); // consume {
      const outputs: ActionOutput[] = [];
      while (!this.check(TokenType.RBRACE) && !this.isAtEnd()) {
        if (this.isTopLevelKeyword(this.current().type)) break;
        const name = this.expectIdentifier();
        if (this.check(TokenType.COLON)) this.advance();
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
    let subtitle: string | undefined;
    let emoji: string | undefined;
    let columns: number | undefined;
    let featured: string[] | undefined;
    let groupBy: string | undefined;

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
        case TokenType.SUBTITLE_KW:
          this.advance();
          subtitle = this.expectToken(TokenType.STRING_LITERAL).value;
          break;
        case TokenType.EMOJI_KW:
          this.advance();
          emoji = this.expectToken(TokenType.STRING_LITERAL).value;
          break;
        case TokenType.COLUMNS_KW:
          this.advance();
          columns = parseInt(this.expectToken(TokenType.NUMBER_LITERAL).value, 10);
          break;
        case TokenType.FEATURED_KW:
          this.advance();
          if (this.check(TokenType.LBRACKET)) {
            featured = this.parseBracketedIdentifierList();
          } else {
            featured = this.parseIdentifierList();
          }
          break;
        case TokenType.GROUP_BY_KW:
          this.advance();
          groupBy = this.expectIdentifier();
          break;
        default:
          this.error(`Unexpected field in VIEW: ${token.value}`);
      }
    }

    const end = this.expectToken(TokenType.RBRACE).location;
    return { kind: 'view', name, entity, layout, actions, sidebar, fields, title, subtitle, emoji, columns, featured, groupBy, span: { start, end } };
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
      [TokenType.LAYOUT_HERO]: 'hero',
      [TokenType.LAYOUT_GALLERY]: 'gallery',
      [TokenType.LAYOUT_LANDING]: 'landing',
      [TokenType.LAYOUT_DASHBOARD]: 'dashboard',
      [TokenType.LAYOUT_KANBAN]: 'kanban',
    };
    const lt = layoutMap[token.type];
    if (lt) { this.advance(); return lt; }
    // Identifier aliases: 'list' -> 'table', 'grid' -> 'gallery'
    if (token.type === TokenType.IDENTIFIER) {
      const identAliases: Record<string, LayoutType> = {
        list: 'table', grid: 'gallery',
      };
      const mapped = identAliases[token.value];
      if (mapped) { this.advance(); return mapped; }
    }
    this.error(`Expected layout type, got: ${token.value}`);
  }

  // --- THEME ---

  private parseTheme(): ThemeDecl {
    const start = this.expectToken(TokenType.THEME).location;
    const name = this.expectIdentifier();
    this.expectToken(TokenType.LBRACE);

    const validPalettes: ThemePalette[] = ['indigo', 'violet', 'rose', 'amber', 'emerald', 'cyan', 'slate'];
    const validBackgrounds: ThemeBackground[] = ['dark', 'light', 'auto'];
    const validDensities: ThemeDensity[] = ['compact', 'comfortable', 'spacious'];
    const validMotifs: ThemeMotif[] = ['minimal', 'retro', 'cyberpunk', 'corporate', 'playful'];
    const validRadii: ThemeRadius[] = ['sharp', 'rounded', 'pill'];

    let palette: ThemePalette = 'slate';
    let accent: string | undefined;
    let background: ThemeBackground = 'dark';
    let font: string = 'Inter';
    let density: ThemeDensity = 'comfortable';
    let motif: ThemeMotif = 'minimal';
    let radius: ThemeRadius = 'rounded';

    while (!this.check(TokenType.RBRACE)) {
      const token = this.current();
      switch (token.type) {
        case TokenType.PALETTE_KW: {
          this.advance();
          const v = this.expectIdentifier();
          if (!validPalettes.includes(v as ThemePalette)) {
            this.error(`Invalid PALETTE value: ${v}. Expected one of: ${validPalettes.join(', ')}`);
          }
          palette = v as ThemePalette;
          break;
        }
        case TokenType.ACCENT_KW:
          this.advance();
          accent = this.expectToken(TokenType.STRING_LITERAL).value;
          break;
        case TokenType.BACKGROUND_KW: {
          this.advance();
          const v = this.expectIdentifier();
          if (!validBackgrounds.includes(v as ThemeBackground)) {
            this.error(`Invalid BACKGROUND value: ${v}. Expected one of: ${validBackgrounds.join(', ')}`);
          }
          background = v as ThemeBackground;
          break;
        }
        case TokenType.FONT_KW:
          this.advance();
          font = this.expectToken(TokenType.STRING_LITERAL).value;
          break;
        case TokenType.DENSITY_KW: {
          this.advance();
          const v = this.expectIdentifier();
          if (!validDensities.includes(v as ThemeDensity)) {
            this.error(`Invalid DENSITY value: ${v}. Expected one of: ${validDensities.join(', ')}`);
          }
          density = v as ThemeDensity;
          break;
        }
        case TokenType.MOTIF_KW: {
          this.advance();
          const v = this.expectIdentifier();
          if (!validMotifs.includes(v as ThemeMotif)) {
            this.error(`Invalid MOTIF value: ${v}. Expected one of: ${validMotifs.join(', ')}`);
          }
          motif = v as ThemeMotif;
          break;
        }
        case TokenType.RADIUS_KW: {
          this.advance();
          const v = this.expectIdentifier();
          if (!validRadii.includes(v as ThemeRadius)) {
            this.error(`Invalid RADIUS value: ${v}. Expected one of: ${validRadii.join(', ')}`);
          }
          radius = v as ThemeRadius;
          break;
        }
        default:
          this.error(`Unexpected field in THEME: ${token.value}`);
      }
    }

    const end = this.expectToken(TokenType.RBRACE).location;
    return { kind: 'theme', name, palette, accent, background, font, density, motif, radius, span: { start, end } };
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
    let keysEntity: string | undefined;
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
        case TokenType.KEYS_ENTITY:
          this.advance();
          keysEntity = this.expectIdentifier();
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
    return { kind: 'ai_service', providers, keysFile, keysEntity, defaultProvider, streaming, models, span: { start, end } };
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
      let contextWindow: number | undefined;

      // LABEL, DEFAULT, and CONTEXT can appear in any order, each at most
      // once on the line. Stop reading modifiers when we see anything
      // that isn't one of them — the next provider identifier or the
      // closing brace.
      while (
        this.check(TokenType.LABEL) ||
        this.check(TokenType.DEFAULT) ||
        this.check(TokenType.CONTEXT)
      ) {
        if (this.check(TokenType.LABEL)) {
          if (label !== undefined) {
            this.error(`Duplicate LABEL for model '${id}'`);
          }
          this.advance();
          label = this.expectToken(TokenType.STRING_LITERAL).value;
        } else if (this.check(TokenType.CONTEXT)) {
          if (contextWindow !== undefined) {
            this.error(`Duplicate CONTEXT marker on model '${id}'`);
          }
          this.advance();
          contextWindow = Number(this.expectToken(TokenType.NUMBER_LITERAL).value);
        } else {
          // DEFAULT modifier
          if (isDefault) {
            this.error(`Duplicate DEFAULT marker on model '${id}'`);
          }
          this.advance();
          isDefault = true;
        }
      }

      models.push({ provider, id, label, isDefault, contextWindow });
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
    let flag: string | undefined;
    let severity: RuleDecl['severity'] | undefined;
    let priority = 0;
    let mutationTier: number | undefined;

    while (!this.check(TokenType.RBRACE)) {
      const token = this.current();

      // WHEN / IF / AND / OR / UNLESS — condition starters
      if (token.type === TokenType.WHEN || token.type === TokenType.IF_KW ||
          token.type === TokenType.AND || token.type === TokenType.OR ||
          token.type === TokenType.UNLESS) {
        const connector = (token.type === TokenType.WHEN || token.type === TokenType.IF_KW)
          ? undefined
          : token.value as RuleCondition['connector'];
        this.advance();
        const field = this.parseQualifiedName();
        const op = this.advance().value;
        const value = this.parseLiteral();
        conditions.push({ field, op, value, connector });
        continue;
      }

      if (token.type === TokenType.THEN) {
        this.advance();
        if (this.check(TokenType.FLAG_KW)) {
          this.advance();
          flag = this.expectToken(TokenType.STRING_LITERAL).value;
          action = `flag:${flag}`;
        } else {
          action = this.expectIdentifier();
        }
        continue;
      }

      if (token.type === TokenType.SEVERITY_KW) {
        this.advance();
        severity = this.expectIdentifier() as RuleDecl['severity'];
        continue;
      }

      if (token.type === TokenType.PRIORITY) {
        this.advance();
        priority = Number(this.expectToken(TokenType.NUMBER_LITERAL).value);
        continue;
      }

      // Phase 11.8 — MUTATION_TIER <n>. Declares which MUTATION_POLICY
      // tier governs AI-authored modifications of this rule. Validator
      // can cross-check this against the bound MUTATION_POLICY's tier scope.
      if (token.type === TokenType.MUTATION_TIER) {
        this.advance();
        mutationTier = Number(this.expectToken(TokenType.NUMBER_LITERAL).value);
        continue;
      }

      this.error(`Unexpected token in RULE: ${token.value}`);
    }

    const end = this.expectToken(TokenType.RBRACE).location;
    return { kind: 'rule', name, conditions, action, flag, severity, priority, mutationTier, span: { start, end } };
  }

  // --- WORKFLOW ---

  private parseWorkflow(): WorkflowDecl {
    const start = this.expectToken(TokenType.WORKFLOW).location;
    const name = this.expectIdentifier();
    this.expectToken(TokenType.LBRACE);

    const steps: WorkflowStep[] = [];
    let parallel: string[] | undefined;
    let idempotent: boolean | undefined;
    let successMetric: string | undefined;

    while (!this.check(TokenType.RBRACE)) {
      const token = this.current();

      if (token.type === TokenType.STEP) {
        steps.push(this.parseWorkflowStep());
        continue;
      }

      // STEPS { STEP ... STEP ... } wrapper block — sugar for bare
      // STEP declarations at the WORKFLOW level. The scheduling app
      // uses this; both forms parse to the same flat step list.
      if (token.type === TokenType.STEPS) {
        this.advance();
        this.expectToken(TokenType.LBRACE);
        while (!this.check(TokenType.RBRACE)) {
          if (this.check(TokenType.STEP)) {
            steps.push(this.parseWorkflowStep());
          } else {
            this.error(`Expected STEP inside STEPS block, got: ${this.current().value}`);
          }
        }
        this.expectToken(TokenType.RBRACE);
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

      // Phase 11.2 — Andon Loop DSL on WORKFLOW
      if (token.type === TokenType.SUCCESS_METRIC) {
        this.advance();
        successMetric = this.expectIdentifier();
        continue;
      }

      this.error(`Expected STEP, PARALLEL, IDEMPOTENT, or SUCCESS_METRIC in WORKFLOW, got: ${token.value}`);
    }

    const end = this.expectToken(TokenType.RBRACE).location;
    return { kind: 'workflow', name, steps, parallel, idempotent, successMetric, span: { start, end } };
  }

  private parseWorkflowStep(): WorkflowStep {
    const start = this.expectToken(TokenType.STEP).location;
    const name = this.expectIdentifier();
    this.expectToken(TokenType.LBRACE);

    let action = '';
    let input: Record<string, string> | undefined;
    let onFail: OnFailBehavior = 'stop';
    let andonOn: ('action_error' | 'timeout' | 'guard_failure' | 'no_rule_match' | 'score_threshold' | 'response_unparseable')[] | undefined;
    let timeout: string | undefined;
    let rollbackBoundary: 'internal' | 'external' | 'irreversible' | undefined;
    let compensatingAction: string | undefined;
    let onAndonEscalate: string | undefined;

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

      // Phase 11.2 — Andon Loop DSL on WORKFLOW STEP
      if (token.type === TokenType.ANDON_ON) {
        this.advance();
        andonOn = this.parseAndonTriggers();
        continue;
      }
      if (token.type === TokenType.TIMEOUT) {
        this.advance();
        // Accept either a string literal ("30s") or an unquoted duration token
        // (30s — lexed as IDENTIFIER or NUMBER+suffix depending on form).
        if (this.check(TokenType.STRING_LITERAL)) {
          timeout = this.advance().value;
        } else {
          timeout = this.advance().value;
        }
        continue;
      }
      if (token.type === TokenType.ROLLBACK_BOUNDARY) {
        this.advance();
        const v = this.expectIdentifier();
        if (v !== 'internal' && v !== 'external' && v !== 'irreversible') {
          this.error(`ROLLBACK_BOUNDARY must be one of: internal, external, irreversible (got '${v}')`);
        }
        rollbackBoundary = v as 'internal' | 'external' | 'irreversible';
        continue;
      }

      // Phase 11.3 — rollback completers
      if (token.type === TokenType.COMPENSATING_ACTION) {
        this.advance();
        compensatingAction = this.expectIdentifier();
        continue;
      }
      if (token.type === TokenType.ON_ANDON_ESCALATE) {
        this.advance();
        onAndonEscalate = this.expectIdentifier();
        continue;
      }

      this.error(`Unexpected token in STEP: ${token.value}`);
    }

    this.expectToken(TokenType.RBRACE);
    return { name, action, input, onFail, andonOn, timeout, rollbackBoundary, compensatingAction, onAndonEscalate, span: this.spanFrom(start) };
  }

  /**
   * Parse ANDON_ON triggers — either bare comma-separated identifiers
   * (ANDON_ON action_error, timeout) or single identifier (ANDON_ON action_error).
   */
  private parseAndonTriggers(): ('action_error' | 'timeout' | 'guard_failure' | 'no_rule_match' | 'score_threshold' | 'response_unparseable')[] {
    const valid = new Set(['action_error', 'timeout', 'guard_failure', 'no_rule_match', 'score_threshold', 'response_unparseable']);
    const out: ('action_error' | 'timeout' | 'guard_failure' | 'no_rule_match' | 'score_threshold' | 'response_unparseable')[] = [];
    // Accept bracketed form too: ANDON_ON [action_error, timeout]
    const hasBracket = this.check(TokenType.LBRACKET);
    if (hasBracket) this.advance();
    do {
      const v = this.expectIdentifier();
      if (!valid.has(v)) {
        this.error(`ANDON_ON trigger must be one of: ${Array.from(valid).join(', ')} (got '${v}')`);
      }
      out.push(v as 'action_error' | 'timeout' | 'guard_failure' | 'no_rule_match' | 'score_threshold' | 'response_unparseable');
    } while (this.consumeIf(TokenType.COMMA));
    if (hasBracket) this.expectToken(TokenType.RBRACKET);
    return out;
  }

  private parseOnFail(): OnFailBehavior {
    const token = this.current();
    const map: Record<string, OnFailBehavior> = {
      [TokenType.FAIL_STOP]: 'stop',
      [TokenType.FAIL_SKIP]: 'skip',
      [TokenType.FAIL_RETRY]: 'retry',
      [TokenType.FAIL_FALLBACK]: 'fallback',
      // `abort` is an alias for `stop` — same semantics (halt the
      // workflow), different word the Accelerando apps reach for.
      [TokenType.FAIL_ABORT]: 'stop',
    };
    const behavior = map[token.type];
    if (!behavior) this.error(`Expected on-fail behavior (stop, skip, retry, fallback, abort), got: ${token.value}`);
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
    let description: string | undefined;

    while (!this.check(TokenType.RBRACE)) {
      const token = this.current();

      if (token.type === TokenType.DESCRIPTION) {
        this.advance();
        description = this.expectToken(TokenType.STRING_LITERAL).value;
        continue;
      }
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
    return { kind: 'qc', name, description, youngThreshold, maturingThreshold, youngPassRate, maturePassRate, maturingSample, matureSample, span: { start, end } };
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

  // --- LOG ---

  private parseLog(): LogDecl {
    const start = this.expectToken(TokenType.LOG_KW).location;
    this.expectToken(TokenType.LBRACE);

    let level: LogLevel = 'info';
    let target: LogTarget = 'file';
    let path = 'logs/app.log';
    let rotate: string | undefined;

    while (!this.check(TokenType.RBRACE)) {
      const token = this.current();

      if (token.type === TokenType.LEVEL_KW) {
        this.advance();
        const val = this.expectToken(TokenType.IDENTIFIER).value.toLowerCase() as LogLevel;
        level = val;
        continue;
      }
      if (token.type === TokenType.TARGET_KW) {
        this.advance();
        const val = this.expectToken(TokenType.IDENTIFIER).value.toLowerCase() as LogTarget;
        target = val;
        continue;
      }
      if (token.type === TokenType.PATH) {
        this.advance();
        path = this.expectToken(TokenType.STRING_LITERAL).value;
        continue;
      }
      if (token.type === TokenType.ROTATE_KW) {
        this.advance();
        rotate = this.expectToken(TokenType.STRING_LITERAL).value;
        continue;
      }

      this.error(`Unexpected token in LOG: ${token.value}`);
    }

    const end = this.expectToken(TokenType.RBRACE).location;
    return { kind: 'log', level, target, path, rotate, span: { start, end } };
  }

  // --- MACRO ---

  private parseMacro(): MacroDecl {
    const start = this.expectToken(TokenType.MACRO_KW).location;
    const name = this.expectIdentifier();
    this.expectToken(TokenType.LBRACE);

    let description = '';
    const params: MacroParam[] = [];
    let action: string | undefined;

    while (!this.check(TokenType.RBRACE)) {
      const token = this.current();

      if (token.type === TokenType.DESCRIPTION) {
        this.advance();
        description = this.expectToken(TokenType.STRING_LITERAL).value;
        continue;
      }
      if (token.value === 'PARAMS') {
        this.advance();
        this.expectToken(TokenType.LBRACE);
        while (!this.check(TokenType.RBRACE)) {
          const paramName = this.expectIdentifier();
          const paramType = this.expectToken(TokenType.IDENTIFIER).value;
          let required = false;
          if (this.check(TokenType.REQUIRED)) {
            this.advance();
            required = true;
          }
          params.push({ name: paramName, type: paramType, required });
        }
        this.expectToken(TokenType.RBRACE);
        continue;
      }
      if (token.type === TokenType.ACTION) {
        this.advance();
        action = this.expectIdentifier();
        continue;
      }

      this.error(`Unexpected token in MACRO: ${token.value}`);
    }

    const end = this.expectToken(TokenType.RBRACE).location;
    return { kind: 'macro', name, description, params, action, span: { start, end } };
  }

  // --- MACRO_REGISTRY ---

  private parseMacroRegistry(): MacroRegistryDecl {
    const start = this.expectToken(TokenType.MACRO_REGISTRY_KW).location;
    this.expectToken(TokenType.LBRACE);

    const exposes: string[] = [];
    const invokes: MacroBinding[] = [];

    while (!this.check(TokenType.RBRACE)) {
      const token = this.current();

      if (token.type === TokenType.EXPOSES_KW) {
        this.advance();
        const list = this.parseBracketedIdentifierList();
        exposes.push(...list);
        continue;
      }
      if (token.type === TokenType.INVOKES_KW) {
        this.advance();
        this.expectToken(TokenType.LBRACE);
        while (!this.check(TokenType.RBRACE)) {
          const macroName = this.expectIdentifier();
          let as: string | undefined;
          if (this.check(TokenType.BINDING_KW)) {
            this.advance();
            as = this.expectIdentifier();
          }
          invokes.push({ macro: macroName, as });
        }
        this.expectToken(TokenType.RBRACE);
        continue;
      }

      this.error(`Unexpected token in MACRO_REGISTRY: ${token.value}`);
    }

    const end = this.expectToken(TokenType.RBRACE).location;
    return { kind: 'macro_registry', exposes, invokes, span: { start, end } };
  }

  // --- ACTUATOR ---

  private parseActuator(): ActuatorDecl {
    const start = this.expectToken(TokenType.ACTUATOR_KW).location;
    const name = this.expectIdentifier();
    this.expectToken(TokenType.LBRACE);

    let description = '';
    let type: ActuatorType = 'custom';
    let model: string | undefined;
    let safeState = 'off';
    let maxCurrent: number | undefined;
    let slewRate: number | undefined;
    let watchdog: number | undefined;

    while (!this.check(TokenType.RBRACE)) {
      const token = this.current();

      if (token.type === TokenType.DESCRIPTION) {
        this.advance(); description = this.expectToken(TokenType.STRING_LITERAL).value; continue;
      }
      if (token.type === TokenType.TYPE_KW) {
        this.advance(); type = this.expectToken(TokenType.IDENTIFIER).value.toLowerCase() as ActuatorType; continue;
      }
      if (token.value === 'MODEL') {
        this.advance(); model = this.expectToken(TokenType.STRING_LITERAL).value; continue;
      }
      if (token.type === TokenType.SAFE_STATE_KW) {
        this.advance(); safeState = this.expectToken(TokenType.IDENTIFIER).value; continue;
      }
      if (token.type === TokenType.MAX_CURRENT_KW) {
        this.advance(); maxCurrent = this.parseNumericLiteral(); continue;
      }
      if (token.type === TokenType.SLEW_RATE_KW) {
        this.advance(); slewRate = this.parseNumericLiteral(); continue;
      }
      if (token.type === TokenType.WATCHDOG_KW) {
        this.advance(); watchdog = this.parseNumericLiteral(); continue;
      }

      this.error(`Unexpected token in ACTUATOR: ${token.value}`);
    }

    const end = this.expectToken(TokenType.RBRACE).location;
    return { kind: 'actuator', name, description, type, model, safeState, maxCurrent, slewRate, watchdog, span: { start, end } };
  }

  // --- PLATFORM ---

  private parsePlatform(): PlatformDecl {
    const start = this.expectToken(TokenType.PLATFORM_KW).location;
    const name = this.expectIdentifier();
    this.expectToken(TokenType.LBRACE);

    let chip: ChipType = 'custom';
    let os: string | undefined;
    let aiRuntime: string | undefined;
    let crossTarget: string | undefined;

    while (!this.check(TokenType.RBRACE)) {
      const token = this.current();

      if (token.type === TokenType.CHIP_KW) {
        this.advance(); chip = this.expectToken(TokenType.IDENTIFIER).value.toLowerCase() as ChipType; continue;
      }
      if (token.type === TokenType.OS_KW) {
        this.advance(); os = this.expectToken(TokenType.STRING_LITERAL).value; continue;
      }
      if (token.type === TokenType.AI_RUNTIME_KW) {
        this.advance(); aiRuntime = this.expectToken(TokenType.STRING_LITERAL).value; continue;
      }
      if (token.type === TokenType.CROSS_TARGET_KW) {
        this.advance(); crossTarget = this.expectToken(TokenType.STRING_LITERAL).value; continue;
      }

      this.error(`Unexpected token in PLATFORM: ${token.value}`);
    }

    const end = this.expectToken(TokenType.RBRACE).location;
    return { kind: 'platform', name, chip, os, aiRuntime, crossTarget, span: { start, end } };
  }

  // --- NULLCLAW ---

  private parseNullclaw(): NullclawDecl {
    const start = this.expectToken(TokenType.NULLCLAW_KW).location;
    this.expectToken(TokenType.LBRACE);

    let configPath = '~/.nullclaw/config.json';
    const providers: NullclawProvider[] = [];
    const tools: NullclawTool[] = [];
    let personality: string | undefined;

    while (!this.check(TokenType.RBRACE)) {
      const token = this.current();

      if (token.type === TokenType.PATH) {
        this.advance(); configPath = this.expectToken(TokenType.STRING_LITERAL).value; continue;
      }
      if (token.type === TokenType.PROVIDERS) {
        this.advance();
        this.expectToken(TokenType.LBRACE);
        while (!this.check(TokenType.RBRACE)) {
          const providerName = this.expectIdentifier();
          const url = this.expectToken(TokenType.STRING_LITERAL).value;
          let priority = providers.length + 1;
          if (this.current().value.match(/^\d/)) {
            priority = this.parseNumericLiteral();
          }
          providers.push({ name: providerName, url, priority });
        }
        this.expectToken(TokenType.RBRACE);
        continue;
      }
      if (token.type === TokenType.TOOLS) {
        this.advance();
        this.expectToken(TokenType.LBRACE);
        while (!this.check(TokenType.RBRACE)) {
          const toolName = this.expectIdentifier();
          const mapsTo = this.expectIdentifier();
          tools.push({ name: toolName, mapsTo });
        }
        this.expectToken(TokenType.RBRACE);
        continue;
      }
      if (token.type === TokenType.PERSONALITY_KW) {
        this.advance(); personality = this.expectToken(TokenType.STRING_LITERAL).value; continue;
      }

      this.error(`Unexpected token in NULLCLAW: ${token.value}`);
    }

    const end = this.expectToken(TokenType.RBRACE).location;
    return { kind: 'nullclaw', configPath, providers, tools, personality, span: { start, end } };
  }

  // --- BRAIN_BODY ---

  private parseBrainBody(): BrainBodyDecl {
    const start = this.expectToken(TokenType.BRAIN_BODY_KW).location;
    this.expectToken(TokenType.LBRACE);

    let baud = 115200;
    let heartbeat = 1000;
    let watchdog = 3000;
    let estopGpio: string | undefined;
    const commands: string[] = [];

    while (!this.check(TokenType.RBRACE)) {
      const token = this.current();

      if (token.type === TokenType.BAUD_KW) {
        this.advance(); baud = this.parseNumericLiteral(); continue;
      }
      if (token.type === TokenType.HEARTBEAT_KW) {
        this.advance(); heartbeat = this.parseNumericLiteral(); continue;
      }
      if (token.type === TokenType.WATCHDOG_KW) {
        this.advance(); watchdog = this.parseNumericLiteral(); continue;
      }
      if (token.type === TokenType.ESTOP_KW) {
        this.advance(); estopGpio = this.expectToken(TokenType.STRING_LITERAL).value; continue;
      }
      if (token.type === TokenType.COMMANDS_KW) {
        this.advance();
        const list = this.parseBracketedIdentifierList();
        commands.push(...list);
        continue;
      }

      this.error(`Unexpected token in BRAIN_BODY: ${token.value}`);
    }

    const end = this.expectToken(TokenType.RBRACE).location;
    return { kind: 'brain_body', baud, heartbeat, watchdog, estopGpio, commands, span: { start, end } };
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
        // Two word-orders supported:
        //   TRANSITION <target> WHEN <condition>          (existing)
        //   TRANSITION WHEN <condition> -> <target>       (Accelerando style)
        let target: string;
        let condition: string;
        if (this.check(TokenType.WHEN)) {
          this.advance();
          condition = this.parseInlineExpression();
          this.expectToken(TokenType.ARROW);
          target = this.expectIdentifier();
        } else {
          target = this.expectIdentifier();
          this.expectToken(TokenType.WHEN);
          condition = this.parseInlineExpression();
        }
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
        // Accept three syntaxes for the delta:
        //   SCORE <name> 5         → delta = +5
        //   SCORE <name> +5        → delta = +5 (explicit positive)
        //   SCORE <name> -5        → delta = -5
        //   SCORE <name> += 5      → delta = +5
        //   SCORE <name> -= 5      → delta = -5
        let sign = 1;
        if (this.check(TokenType.PLUS_EQ)) {
          this.advance();
        } else if (this.check(TokenType.MINUS_EQ)) {
          this.advance();
          sign = -1;
        }
        const delta = sign * Number(this.expectToken(TokenType.NUMBER_LITERAL).value);
        score = { name: scoreName, delta };
        continue;
      }

      if (token.type === TokenType.ASSERT) {
        this.advance();
        const factName = this.expectIdentifier();
        // Two forms:
        //   ASSERT FactName { field: value, ... }   (existing block form)
        //   ASSERT FactName.field = value           (dot-access form,
        //                                            single field set)
        if (this.check(TokenType.DOT)) {
          this.advance();
          const fieldName = this.expectIdentifier();
          this.expectToken(TokenType.EQUALS);
          const value = this.parseLiteral();
          assertFact = { name: factName, fields: { [fieldName]: value } };
        } else {
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
        }
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
    let description: string | undefined;

    while (!this.check(TokenType.RBRACE)) {
      const token = this.current();

      if (token.type === TokenType.DESCRIPTION) {
        this.advance();
        description = this.expectToken(TokenType.STRING_LITERAL).value;
        continue;
      }
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
          // Accept either:
          //   THEN <ident>            → action is the named action
          //   THEN FLAG "name"        → action is `flag:<name>` (sugar)
          if (this.check(TokenType.FLAG_KW)) {
            this.advance();
            const flagName = this.expectToken(TokenType.STRING_LITERAL).value;
            action = `flag:${flagName}`;
          } else {
            action = this.expectIdentifier();
          }
        }
        thresholds.push({ name: threshName, value, action });
        continue;
      }

      this.error(`Unexpected token in SCORE: ${token.value}`);
    }

    const end = this.expectToken(TokenType.RBRACE).location;
    return { kind: 'score', name, description, initial, min, max, decay, thresholds, span: { start, end } };
  }

  // --- MODULE ---

  private parseModule(): ModuleDecl {
    const start = this.expectToken(TokenType.MODULE).location;
    const name = this.expectIdentifier();
    this.expectToken(TokenType.LBRACE);

    let description = '';
    let activateWhen: string | undefined;
    let deactivateWhen: string | undefined;
    let expectsMatch: boolean | undefined;
    let mutationPolicy: string | undefined;
    let ruleRefs: string[] | undefined;
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

      // Phase 11.8 — EXPECTS_MATCH true|false. Declares "this module's
      // rules should match incoming events; surface no-match as an andon
      // pull with trigger_category='no_rule_match'." Runtime wiring lands
      // in a focused follow-up; the parser captures the intent today.
      if (token.type === TokenType.EXPECTS_MATCH) {
        this.advance();
        const t = this.current();
        if (t.type === TokenType.TRUE)        { this.advance(); expectsMatch = true; }
        else if (t.type === TokenType.FALSE)  { this.advance(); expectsMatch = false; }
        else if (t.type === TokenType.IDENTIFIER && (t.value === 'true' || t.value === 'false')) {
          this.advance(); expectsMatch = (t.value === 'true');
        } else {
          this.error(`EXPECTS_MATCH requires true or false; got '${t.value}'`);
        }
        continue;
      }

      // Phase 11.8 — MUTATION_POLICY <name>. Binds this module to a
      // top-level MUTATION_POLICY that governs its mutation authority.
      // Distinct from the top-level MUTATION_POLICY declaration which
      // takes a block; here it's just a name reference.
      if (token.type === TokenType.MUTATION_POLICY) {
        this.advance();
        mutationPolicy = this.expectIdentifier();
        continue;
      }

      // Phase 11.8 — RULES [a, b, c]. Reference top-level RULE
      // declarations by name. Used when the same rule library is shared
      // across modules (vs the inline RULE form which couples a rule to
      // exactly one module). Validator warns on dangling refs.
      if (token.type === TokenType.RULES_KW) {
        this.advance();
        ruleRefs = this.parseBracketedIdentifierList();
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
    return {
      kind: 'module', name, description,
      activateWhen, deactivateWhen,
      expectsMatch, mutationPolicy, ruleRefs,
      patterns, rules, states, scores, facts,
      span: { start, end },
    };
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
    let content: string | undefined;
    let appliesTo: string[] | undefined;
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
      if (token.type === TokenType.CONTENT_KW) {
        this.advance();
        content = this.expectToken(TokenType.STRING_LITERAL).value;
        continue;
      }
      if (token.type === TokenType.APPLIES_TO_KW) {
        this.advance();
        appliesTo = this.parseBracketedIdentifierList();
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
    return { kind: 'skill', name, description, keywords, domain, path, content, appliesTo, priority, span: { start, end } };
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
    let prompt: string | undefined;

    while (!this.check(TokenType.RBRACE)) {
      const token = this.current();

      if (token.type === TokenType.DESCRIPTION) {
        this.advance();
        description = this.expectToken(TokenType.STRING_LITERAL).value;
        continue;
      }
      if (token.type === TokenType.PROMPT) {
        this.advance();
        prompt = this.expectToken(TokenType.STRING_LITERAL).value;
        continue;
      }
      if (token.type === TokenType.INPUT) {
        this.advance();
        // Two INPUT forms:
        //   INPUT { ... }           (block form — full surface)
        //   INPUT Foo, Bar, Baz     (inline — comma-separated entity refs;
        //                            stored as channels for backward compat)
        if (this.check(TokenType.LBRACE)) {
          input = this.parseReasonerInput();
        } else {
          const entities: string[] = [this.expectIdentifier()];
          while (this.check(TokenType.COMMA)) {
            this.advance();
            entities.push(this.expectIdentifier());
          }
          input = { channels: entities };
        }
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
        // Same dual form as INPUT.
        if (this.check(TokenType.LBRACE)) {
          output = this.parseReasonerOutput();
        } else {
          // Inline: OUTPUT FooPacket  (single packet ref)
          output = { packet: this.expectIdentifier() };
        }
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
    return { kind: 'reasoner', name, description, input, uses, tier, output, schedule, idempotent, governance, prompt, span: { start, end } };
  }

  private parseReasonerInput(): ReasonerInput {
    this.expectToken(TokenType.LBRACE);

    let channels: string[] = [];
    let window: string | undefined;
    let filter: string | undefined;
    const fields: { name: string; type: AgiType }[] = [];

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
      // Typed input field form: `name: type`. The Accelerando apps
      // declare their reasoner inputs as struct-style fields rather
      // than as channel references — both forms now work.
      if (token.type === TokenType.IDENTIFIER && this.peek(1)?.type === TokenType.COLON) {
        const fieldName = this.expectIdentifier();
        this.expectToken(TokenType.COLON);
        const fieldType = this.parseType();
        fields.push({ name: fieldName, type: fieldType });
        continue;
      }
      this.error(`Unexpected token in REASONER INPUT: ${token.value}`);
    }

    this.expectToken(TokenType.RBRACE);
    return { channels, window, filter, fields: fields.length > 0 ? fields : undefined };
  }

  private parseReasonerOutput(): ReasonerOutput {
    this.expectToken(TokenType.LBRACE);

    let packet: string | undefined;
    let channel: string | undefined;
    const fields: { name: string; type: AgiType }[] = [];

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
      // Typed output field form: `name: type`. Same shape as INPUT.
      if (token.type === TokenType.IDENTIFIER && this.peek(1)?.type === TokenType.COLON) {
        const fieldName = this.expectIdentifier();
        this.expectToken(TokenType.COLON);
        const fieldType = this.parseType();
        fields.push({ name: fieldName, type: fieldType });
        continue;
      }
      this.error(`Unexpected token in REASONER OUTPUT: ${token.value}`);
    }

    this.expectToken(TokenType.RBRACE);
    return { packet, channel, fields: fields.length > 0 ? fields : undefined };
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
        // Accept either `CHANNEL a, b, c` or `CHANNEL [a, b, c]`.
        if (this.check(TokenType.LBRACKET)) {
          this.advance();
          channels = [this.expectIdentifier()];
          while (this.check(TokenType.COMMA)) {
            this.advance();
            channels.push(this.expectIdentifier());
          }
          this.expectToken(TokenType.RBRACKET);
        } else {
          channels = this.parseIdentifierList();
        }
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
      // EVENT <name> — event-bound trigger condition. Stored alongside
      // channels for downstream codegen (treated as a single-name
      // event source).
      if (token.type === TokenType.EVENT_KW) {
        this.advance();
        packet = this.expectIdentifier();
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

  // --- STAGES ---

  private parseStages(): StagesDecl {
    const start = this.expectToken(TokenType.STAGES_KW).location;
    // Parse "Entity.field" as entity + dot + field
    const entityName = this.expectIdentifier();
    this.expectToken(TokenType.DOT);
    const fieldName = this.expectIdentifier();
    this.expectToken(TokenType.LBRACE);

    const transitions: StagesTransition[] = [];

    // Two body forms:
    //   1. Verbose:   TRANSITION "from" -> "to" { MATCH ... REQUIRE ... }
    //   2. Chain:     state1 -> state2 -> state3 -> state4
    // The chain form is sugar for n-1 unconditional transitions and is
    // the common case for state machines whose progression is purely
    // sequential and lifecycle-shaped (the Accelerando QMS / LMS /
    // PI-CoE apps use this form throughout).
    while (!this.check(TokenType.RBRACE)) {
      if (this.check(TokenType.TRANSITION)) {
        transitions.push(this.parseStagesTransition());
      } else if (this.isStageNameToken(this.current())) {
        // Chain form. Read identifiers separated by ARROW until we hit
        // RBRACE. Each `state -> state` becomes one transition.
        //
        // Branching: a `/` after a state introduces an alternative
        // terminal/next state from the SAME source as the most-recent
        // transition. Multiple slashes chain: `a -> b / c / d` produces
        // a→b, a→c, a→d. This supports the PI-CoE pattern:
        //   scheduled -> complete / missed / escalated
        let prev = this.advance().value;
        while (this.check(TokenType.ARROW) || this.check(TokenType.SLASH)) {
          if (this.check(TokenType.ARROW)) {
            this.advance();
            const next = this.expectStateName();
            transitions.push({ from: prev, to: next, match: 'all', conditions: [] });
            prev = next;
          } else {
            // SLASH branch: same source as the most recent transition,
            // different destination.
            this.advance();
            const branch = this.expectStateName();
            if (transitions.length > 0) {
              const last = transitions[transitions.length - 1]!;
              transitions.push({ from: last.from, to: branch, match: 'all', conditions: [] });
            }
            // `prev` doesn't change — the next `->` or `/` still refers
            // to the original chain's tail.
          }
        }
      } else {
        this.error(`Unexpected token in STAGES: ${this.current().value}`);
      }
    }

    const end = this.expectToken(TokenType.RBRACE).location;
    return { kind: 'stages', entity: entityName, field: fieldName, transitions, span: { start, end } };
  }

  /**
   * State names in a STAGES chain may be any identifier-shaped token,
   * including keywords like `open`, `pending`, `define`, `closed` that
   * the lexer assigns to other token types. The state machine domain
   * doesn't share the reserved namespace.
   */
  private isStageNameToken(token: Token): boolean {
    if (token.type === TokenType.IDENTIFIER) return true;
    // Soft-keyword: anything whose textual value looks like an
    // identifier (alphanumeric + underscore, starting with a letter
    // or underscore) is acceptable as a state name.
    return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(token.value);
  }

  private expectStateName(): string {
    const token = this.current();
    if (!this.isStageNameToken(token)) {
      this.error(`Expected state name, got: ${token.value}`);
    }
    return this.advance().value;
  }

  private parseStagesTransition(): StagesTransition {
    this.expectToken(TokenType.TRANSITION);
    const from = this.expectToken(TokenType.STRING_LITERAL).value;
    this.expectToken(TokenType.ARROW);
    const to = this.expectToken(TokenType.STRING_LITERAL).value;
    this.expectToken(TokenType.LBRACE);

    let match: StagesMatchMode = 'all';
    const conditions: StagesCondition[] = [];

    while (!this.check(TokenType.RBRACE)) {
      const token = this.current();
      if (token.type === TokenType.MATCH) {
        this.advance();
        const mode = this.expectIdentifier();
        match = mode === 'any' ? 'any' : 'all';
      } else if (token.type === TokenType.REQUIRE_KW) {
        this.advance();
        conditions.push(this.parseStagesCondition());
      } else {
        this.error(`Unexpected token in TRANSITION: ${token.value}`);
      }
    }

    this.expectToken(TokenType.RBRACE);
    return { from, to, match, conditions };
  }

  private parseStagesCondition(): StagesCondition {
    const entity = this.expectIdentifier();

    // Check if next is COUNT keyword
    if (this.check(TokenType.COUNT_KW)) {
      this.advance();
      this.expectToken(TokenType.GTE);
      const count = parseInt(this.expectToken(TokenType.NUMBER_LITERAL).value, 10);
      // Optional WHERE field = value
      if (this.check(TokenType.WHERE_KW)) {
        this.advance();
        const whereField = this.expectIdentifier();
        this.expectToken(TokenType.EQUALS);
        const whereValue = this.expectToken(TokenType.STRING_LITERAL).value;
        return { op: 'count_gte_where', entity, count, whereField, whereValue };
      }
      return { op: 'count_gte', entity, count };
    }

    // Otherwise: Entity.field op value
    this.expectToken(TokenType.DOT);
    const field = this.expectIdentifier();

    const token = this.current();
    if (token.type === TokenType.IS) {
      this.advance();
      this.expectToken(TokenType.NOT);
      this.expectToken(TokenType.NULL);
      return { op: 'is_not_null', entity, field };
    }

    const opMap: Partial<Record<string, StagesConditionOp>> = {
      [TokenType.GT]: 'gt',
      [TokenType.LT]: 'lt',
      [TokenType.GTE]: 'gte',
      [TokenType.LTE]: 'lte',
      [TokenType.EQUALS]: 'eq',
    };
    const op = opMap[token.type];
    if (!op) this.error(`Expected comparison operator in STAGES condition, got: ${token.value}`);
    this.advance();

    const valToken = this.current();
    let value: string | number;
    if (valToken.type === TokenType.NUMBER_LITERAL) {
      value = parseFloat(valToken.value);
      this.advance();
    } else if (valToken.type === TokenType.STRING_LITERAL) {
      value = valToken.value;
      this.advance();
    } else {
      this.error(`Expected value in STAGES condition, got: ${valToken.value}`);
    }
    return { op: op!, entity, field, value };
  }

  // --- COGNITION_ROLE ---

  private parseCognitionRole(): CognitionRoleDecl {
    const start = this.expectToken(TokenType.COGNITION_ROLE_KW).location;
    const name = this.expectIdentifier();
    this.expectToken(TokenType.LBRACE);

    let responsibilities: string[] = [];
    let qcProfile: string | undefined;
    let escalateTo: string | undefined;
    let modelHierarchy: string[] = [];
    let promotionPolicy: PromotionPolicy = 'SPC_AUTOMATIC';
    let fallbackPolicy: FallbackPolicy = 'ESCALATE';
    let tier: 1 | 2 | 3 = 2;
    let spcFloor: { defectRate: number; retryRate: number; escalationRate: number } | undefined;

    while (!this.check(TokenType.RBRACE)) {
      const token = this.current();
      switch (token.type) {
        case TokenType.RESPONSIBILITIES_KW:
          this.advance();
          responsibilities = this.parseIdentifierList();
          break;
        case TokenType.QC_PROFILE_KW:
          this.advance();
          qcProfile = this.expectIdentifier();
          break;
        case TokenType.ESCALATE_TO_KW:
          this.advance();
          escalateTo = this.expectIdentifier();
          break;
        case TokenType.MODEL_HIERARCHY_KW:
          this.advance();
          modelHierarchy = this.parseIdentifierList();
          break;
        case TokenType.PROMOTION_POLICY_KW:
          this.advance();
          promotionPolicy = this.expectIdentifier() as PromotionPolicy;
          break;
        case TokenType.FALLBACK_POLICY_KW:
          this.advance();
          fallbackPolicy = this.expectIdentifier() as FallbackPolicy;
          break;
        case TokenType.TIER:
          this.advance();
          tier = Number(this.expectToken(TokenType.NUMBER_LITERAL).value) as 1 | 2 | 3;
          break;
        case TokenType.SPC_FLOOR:
          this.advance(); this.expectToken(TokenType.LBRACE);
          spcFloor = { defectRate: 0.05, retryRate: 0.10, escalationRate: 0.10 };
          while (!this.check(TokenType.RBRACE)) {
            const sf = this.current();
            if (sf.type === TokenType.DEFECT_RATE) { this.advance(); spcFloor.defectRate = Number(this.expectToken(TokenType.NUMBER_LITERAL).value); }
            else if (sf.type === TokenType.RETRY_RATE) { this.advance(); spcFloor.retryRate = Number(this.expectToken(TokenType.NUMBER_LITERAL).value); }
            else if (sf.type === TokenType.ESCALATION_RATE) { this.advance(); spcFloor.escalationRate = Number(this.expectToken(TokenType.NUMBER_LITERAL).value); }
            else this.error(`Unexpected field in SPC_FLOOR: ${sf.value}`);
          }
          this.expectToken(TokenType.RBRACE);
          break;
        default:
          this.error(`Unexpected field in COGNITION_ROLE: ${token.value}`);
      }
    }

    const end = this.expectToken(TokenType.RBRACE).location;
    return { kind: 'cognition_role', name, responsibilities, qcProfile, escalateTo, modelHierarchy, promotionPolicy, fallbackPolicy, tier, spcFloor, span: { start, end } };
  }

  private parseEscalationChain(): EscalationChainDecl {
    const start = this.expectToken(TokenType.ESCALATION_CHAIN_KW).location;
    const name = this.expectIdentifier();
    this.expectToken(TokenType.LBRACE);

    let description = '';
    let roles: string[] = [];
    let escalateOn: EscalationOnConditions = { explicit: true };
    let deescalateOn: DeescalationOnConditions = {};
    let cooldown = '300s';

    while (!this.check(TokenType.RBRACE)) {
      const token = this.current();
      if (token.type === TokenType.DESCRIPTION) {
        this.advance(); description = this.expectToken(TokenType.STRING_LITERAL).value; continue;
      }
      if (token.type === TokenType.ROLES_KW) {
        this.advance(); roles = this.parseIdentifierList(); continue;
      }
      if (token.type === TokenType.ESCALATE_ON_KW) {
        this.advance(); this.expectToken(TokenType.LBRACE);
        const eo: EscalationOnConditions = { explicit: false };
        while (!this.check(TokenType.RBRACE)) {
          const t = this.current();
          if (t.type === TokenType.SPC_VIOLATION_KW) {
            this.advance(); eo.spcViolation = Number(this.expectToken(TokenType.NUMBER_LITERAL).value);
          } else if (t.type === TokenType.ERROR_RATE_KW) {
            this.advance(); eo.errorRate = Number(this.expectToken(TokenType.NUMBER_LITERAL).value);
          } else if (t.type === TokenType.EXPLICIT_KW) {
            this.advance(); eo.explicit = this.parseBoolValue();
          } else {
            this.error(`Unexpected token in ESCALATE_ON: ${t.value}`);
          }
        }
        this.expectToken(TokenType.RBRACE);
        escalateOn = eo;
        continue;
      }
      if (token.type === TokenType.DEESCALATE_ON_KW) {
        this.advance(); this.expectToken(TokenType.LBRACE);
        const deo: DeescalationOnConditions = {};
        while (!this.check(TokenType.RBRACE)) {
          const t = this.current();
          if (t.type === TokenType.STABILITY_WINDOW_KW) {
            this.advance(); deo.stabilityWindow = Number(this.expectToken(TokenType.NUMBER_LITERAL).value);
          } else if (t.type === TokenType.ERROR_RATE_KW) {
            this.advance(); deo.errorRate = Number(this.expectToken(TokenType.NUMBER_LITERAL).value);
          } else {
            this.error(`Unexpected token in DEESCALATE_ON: ${t.value}`);
          }
        }
        this.expectToken(TokenType.RBRACE);
        deescalateOn = deo;
        continue;
      }
      if (token.type === TokenType.COOLDOWN_KW) {
        this.advance(); cooldown = this.expectToken(TokenType.STRING_LITERAL).value; continue;
      }
      this.error(`Unexpected token in ESCALATION_CHAIN: ${token.value}`);
    }

    const end = this.expectToken(TokenType.RBRACE).location;
    return { kind: 'escalation_chain', name, description, roles, escalateOn, deescalateOn, cooldown, span: { start, end } };
  }

  private parseQcMesh(): QcMeshDecl {
    const start = this.expectToken(TokenType.QC_MESH_KW).location;
    const name = this.expectIdentifier();
    this.expectToken(TokenType.LBRACE);

    let description = '';
    let evaluators: string[] = [];
    let criteria = '';
    let consensus: QcMeshConsensus = 'majority';
    let onFail: QcMeshOnFail = 'escalate';
    let spc: QcMeshSpc = { minEvaluators: 3, maxEvaluators: 5, driftRate: 0.05, stabilityWindow: 50 };

    while (!this.check(TokenType.RBRACE)) {
      const token = this.current();
      if (token.type === TokenType.DESCRIPTION) {
        this.advance(); description = this.expectToken(TokenType.STRING_LITERAL).value; continue;
      }
      if (token.type === TokenType.EVALUATORS_KW) {
        this.advance(); evaluators = this.parseBracketedStringList(); continue;
      }
      if (token.type === TokenType.CRITERIA_KW) {
        this.advance(); criteria = this.expectIdentifier(); continue;
      }
      if (token.type === TokenType.CONSENSUS_KW) {
        this.advance();
        const t = this.current();
        if (t.type === TokenType.IDENTIFIER && t.value === 'threshold') {
          this.advance(); consensus = Number(this.expectToken(TokenType.NUMBER_LITERAL).value);
        } else {
          consensus = this.expectIdentifier() as 'majority' | 'all';
        }
        continue;
      }
      if (token.type === TokenType.ON_FAIL) {
        this.advance(); onFail = this.expectIdentifier() as QcMeshOnFail; continue;
      }
      if (token.type === TokenType.SPC) {
        this.advance(); this.expectToken(TokenType.LBRACE);
        const parsed: Partial<QcMeshSpc> = {};
        while (!this.check(TokenType.RBRACE)) {
          const t = this.current();
          if (t.type === TokenType.MIN_EVALUATORS_KW) {
            this.advance(); parsed.minEvaluators = Number(this.expectToken(TokenType.NUMBER_LITERAL).value);
          } else if (t.type === TokenType.MAX_EVALUATORS_KW) {
            this.advance(); parsed.maxEvaluators = Number(this.expectToken(TokenType.NUMBER_LITERAL).value);
          } else if (t.type === TokenType.DRIFT_RATE_KW) {
            this.advance(); parsed.driftRate = Number(this.expectToken(TokenType.NUMBER_LITERAL).value);
          } else if (t.type === TokenType.STABILITY_WINDOW_KW) {
            this.advance(); parsed.stabilityWindow = Number(this.expectToken(TokenType.NUMBER_LITERAL).value);
          } else {
            this.error(`Unexpected token in QC_MESH SPC: ${t.value}`);
          }
        }
        this.expectToken(TokenType.RBRACE);
        spc = { ...spc, ...parsed };
        continue;
      }
      this.error(`Unexpected token in QC_MESH: ${token.value}`);
    }

    const end = this.expectToken(TokenType.RBRACE).location;
    return { kind: 'qc_mesh', name, description, evaluators, criteria, consensus, onFail, spc, span: { start, end } };
  }

  private parseMesh(): MeshDecl {
    const start = this.expectToken(TokenType.MESH_KW).location;
    const name = this.expectIdentifier();
    this.expectToken(TokenType.LBRACE);

    let description = '';
    let nodes: string[] = [];
    let authority: string | undefined;
    let packets: string[] = [];
    let accounting = false;

    while (!this.check(TokenType.RBRACE)) {
      const token = this.current();
      if (token.type === TokenType.DESCRIPTION) {
        this.advance(); description = this.expectToken(TokenType.STRING_LITERAL).value; continue;
      }
      if (token.type === TokenType.NODES) {
        this.advance();
        nodes = this.check(TokenType.LBRACKET) ? this.parseBracketedIdentifierList() : this.parseIdentifierList();
        continue;
      }
      if (token.type === TokenType.AUTHORITY_KW) {
        this.advance(); authority = this.expectIdentifier(); continue;
      }
      if (token.type === TokenType.PACKET) {
        this.advance();
        packets = this.check(TokenType.LBRACKET) ? this.parseBracketedIdentifierList() : this.parseIdentifierList();
        continue;
      }
      if (token.type === TokenType.ACCOUNTING) {
        this.advance(); accounting = this.parseBoolValue(); continue;
      }
      this.error(`Unexpected token in MESH: ${token.value}`);
    }

    const end = this.expectToken(TokenType.RBRACE).location;
    return { kind: 'mesh', name, description, nodes, authority, packets, accounting, span: { start, end } };
  }

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
    let signature: string | undefined;

    while (!this.check(TokenType.RBRACE)) {
      const token = this.current();

      if (token.type === TokenType.DESCRIPTION) {
        this.advance(); description = this.expectToken(TokenType.STRING_LITERAL).value; continue;
      }
      if (token.type === TokenType.SIGNATURE) {
        this.advance();
        signature = this.expectToken(TokenType.STRING_LITERAL).value;
        continue;
      }
      if (token.type === TokenType.SIGNATURES) {
        // Bare `SIGNATURES` (boolean flag form, as used by qms).
        // Forms accepted:
        //   SIGNATURES                  → signatures = true
        //   SIGNATURES required         → signatures = true (qms style)
        //   SIGNATURES "identity-name"  → equivalent to SIGNATURE "..."
        this.advance();
        if (this.check(TokenType.STRING_LITERAL)) {
          signature = this.expectToken(TokenType.STRING_LITERAL).value;
        } else {
          signatures = true;
          // Consume any trailing word that elaborates the boolean
          // intent: `required`, `true`, `false`, or any IDENTIFIER.
          if (
            this.check(TokenType.IDENTIFIER) ||
            this.check(TokenType.REQUIRED) ||
            this.check(TokenType.TRUE) ||
            this.check(TokenType.FALSE)
          ) {
            const t = this.advance();
            if (t.type === TokenType.FALSE) signatures = false;
          }
        }
        continue;
      }
      // Top-level ADMISSIBILITY on PACKET (alternative to METADATA.ADMISSIBILITY).
      // Accepts either a boolean (the existing form) or an identifier/string
      // scope label (e.g. `ADMISSIBILITY legal_only`). The label form sets
      // the admissibility flag and stores the scope on the decl.
      if (token.value === 'ADMISSIBILITY' && token.type === TokenType.IDENTIFIER) {
        this.advance();
        if (this.check(TokenType.IDENTIFIER) || this.check(TokenType.STRING_LITERAL)) {
          // Scope label form — accept and flag.
          this.advance();
          admissibility = true;
        } else {
          admissibility = this.parseBoolValue();
        }
        continue;
      }
      // Top-level TTL field on PACKET (alternative to METADATA.TTL).
      // Forms: `TTL 3600` (seconds) or `TTL 90d` (with unit suffix).
      if (token.type === TokenType.TTL) {
        this.advance();
        const num = Number(this.expectToken(TokenType.NUMBER_LITERAL).value);
        let multiplier = 1;
        if (this.check(TokenType.IDENTIFIER)) {
          const unit = this.advance().value.toLowerCase();
          if (unit === 's' || unit === 'sec') multiplier = 1;
          else if (unit === 'm' || unit === 'min') multiplier = 60;
          else if (unit === 'h' || unit === 'hr') multiplier = 3600;
          else if (unit === 'd' || unit === 'day' || unit === 'days') multiplier = 86400;
          else if (unit === 'w' || unit === 'wk' || unit === 'weeks') multiplier = 604800;
          // Unknown unit silently treated as seconds (don't reject for ergonomic input).
        }
        ttl = num * multiplier;
        continue;
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
      // Bare field declaration form: `name: type [REQUIRED] [= default]`
      // Sugar for putting all fields inside a single PAYLOAD block, which
      // is what most PACKET declarations want. Co-exists with PAYLOAD —
      // bare fields get merged with whatever came from PAYLOAD blocks.
      if (
        (token.type === TokenType.IDENTIFIER) &&
        this.peek(1)?.type === TokenType.COLON
      ) {
        const fieldName = this.expectIdentifier();
        this.expectToken(TokenType.COLON);
        const fieldType = this.parseType();
        let required = false;
        let defaultValue: LiteralValue | undefined;
        // Allow REQUIRED and `= value` / DEFAULT value in any order.
        while (
          this.check(TokenType.REQUIRED) ||
          this.check(TokenType.EQUALS) ||
          this.check(TokenType.DEFAULT)
        ) {
          if (this.check(TokenType.REQUIRED)) {
            this.advance();
            required = true;
          } else if (this.check(TokenType.EQUALS)) {
            this.advance();
            defaultValue = this.parseLiteral();
          } else {
            this.advance();
            defaultValue = this.parseLiteral();
          }
        }
        payload.push({ name: fieldName, type: fieldType, required, defaultValue });
        continue;
      }
      this.error(`Unexpected token in PACKET: ${token.value}`);
    }

    const end = this.expectToken(TokenType.RBRACE).location;
    return { kind: 'packet', name, description, payload, provenance, lineage, signatures, admissibility, ttl, validation, signature, span: { start, end } };
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
    const governs: string[] = [];

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
      if (token.type === TokenType.GOVERNS) {
        this.advance();
        governs.push(...(this.check(TokenType.LBRACKET) ? this.parseBracketedIdentifierList() : [this.expectIdentifier()]));
        continue;
      }
      this.error(`Unexpected token in AUTHORITY: ${token.value}`);
    }

    const end = this.expectToken(TokenType.RBRACE).location;
    return { kind: 'authority', name, description, levels, signing, admissibility: admissibilityRules, governs, span: { start, end } };
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
    let overflowTo: string | undefined;
    let fromNode: string | undefined;
    let toNode: string | undefined;
    let consumers: string[] | undefined;
    let producers: string[] | undefined;
    let delivery: string | undefined;

    while (!this.check(TokenType.RBRACE)) {
      const token = this.current();

      // SOURCE / DEST / TYPE / CAPACITY — alternative CHANNEL fields
      // used by the PI-CoE and QMS apps. These describe a replication
      // channel: SOURCE app name → DEST channel name, with PACKET
      // TYPE and queue CAPACITY.
      if (token.type === TokenType.SOURCE) {
        this.advance();
        if (this.check(TokenType.STRING_LITERAL)) {
          this.advance();  // store-and-discard for now; downstream tooling can read from AST
        } else {
          this.advance();  // identifier form
        }
        continue;
      }
      if (token.type === TokenType.DEST || token.type === TokenType.DESTINATION) {
        this.advance();
        if (this.check(TokenType.STRING_LITERAL)) {
          this.advance();
        } else {
          this.advance();
        }
        continue;
      }
      if (token.type === TokenType.PERSISTENT) {
        // Forms: `PERSISTENT` (bare = true), `PERSISTENT true|false`.
        // Stored on the decl is informational; the routing layer
        // honors it for durable queue semantics in a later sprint.
        this.advance();
        if (this.check(TokenType.TRUE) || this.check(TokenType.FALSE)) {
          this.advance();
        }
        continue;
      }
      if (token.type === TokenType.CAPACITY) {
        this.advance();
        this.expectToken(TokenType.NUMBER_LITERAL);
        continue;
      }
      // TYPE on a CHANNEL refers to the PACKET type ferried over it,
      // equivalent to the existing PACKET field.
      if (token.type === TokenType.TYPE_KW) {
        this.advance();
        packet = this.expectIdentifier();
        continue;
      }
      if (token.type === TokenType.CONSUMERS || token.type === TokenType.PRODUCERS) {
        const which = token.type;
        this.advance();
        this.expectToken(TokenType.LBRACKET);
        const list: string[] = [];
        if (!this.check(TokenType.RBRACKET)) {
          list.push(this.expectToken(TokenType.STRING_LITERAL).value);
          while (this.check(TokenType.COMMA)) {
            this.advance();
            list.push(this.expectToken(TokenType.STRING_LITERAL).value);
          }
        }
        this.expectToken(TokenType.RBRACKET);
        if (which === TokenType.CONSUMERS) consumers = list;
        else producers = list;
        continue;
      }
      if (token.type === TokenType.DELIVERY) {
        this.advance();
        delivery = this.expectIdentifier();
        continue;
      }
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
      if (token.type === TokenType.OVERFLOW_TO) {
        this.advance(); overflowTo = this.expectIdentifier(); continue;
      }
      if (token.type === TokenType.FROM_NODE) {
        this.advance(); fromNode = this.expectIdentifier(); continue;
      }
      if (token.type === TokenType.TO_NODE) {
        this.advance(); toNode = this.expectIdentifier(); continue;
      }
      this.error(`Unexpected token in CHANNEL: ${token.value}`);
    }

    const end = this.expectToken(TokenType.RBRACE).location;
    return { kind: 'channel', name, description, protocol, direction, packet, authority, endpoint, retry, timeout, ordering, deadLetter, overflowTo, fromNode, toNode, consumers, producers, delivery, span: { start, end } };
  }

  // --- SESSION ---

  private parseSession(): SessionDecl {
    const start = this.expectToken(TokenType.SESSION).location;
    const name = this.expectIdentifier();
    this.expectToken(TokenType.LBRACE);

    let description = '', tools: string[] = [], context = 'conversation';
    let memory = 'session', output: string[] = [], persist = false;
    let terminal: string | undefined;
    let profiles: string[] | undefined;

    while (!this.check(TokenType.RBRACE)) {
      const token = this.current();
      if (token.type === TokenType.DESCRIPTION) { this.advance(); description = this.expectToken(TokenType.STRING_LITERAL).value; continue; }
      if (token.type === TokenType.TOOLS) { this.advance(); tools = this.parseIdentifierList(); continue; }
      if (token.type === TokenType.CONTEXT) { this.advance(); context = this.expectIdentifier(); continue; }
      if (token.type === TokenType.MEMORY) {
        this.advance();
        // Two forms:
        //   MEMORY session            (identifier scope name — existing)
        //   MEMORY { name: type ... } (typed memory shape, used by
        //                              retrieval-style sessions)
        if (this.check(TokenType.LBRACE)) {
          // Brace-balanced skip — accept and store as a sentinel
          // 'block' marker. Codegen can rehydrate later from source.
          memory = 'block';
          let depth = 1;
          this.advance();
          while (depth > 0 && !this.isAtEnd()) {
            const t = this.current();
            if (t.type === TokenType.LBRACE) depth++;
            else if (t.type === TokenType.RBRACE) depth--;
            if (depth > 0) this.advance();
          }
          this.advance();
        } else {
          memory = this.expectIdentifier();
        }
        continue;
      }
      if (token.type === TokenType.OUTPUT) { this.advance(); output = this.parseIdentifierList(); continue; }
      if (token.type === TokenType.PERSIST) { this.advance(); persist = this.parseBoolValue(); continue; }
      // Sprint X.2: TERMINAL + PROFILES on SESSION. Codegen pending —
      // the parser stores these so the AST round-trips, but the
      // compiler doesn't emit anything for them yet.
      if (token.type === TokenType.TERMINAL) {
        this.advance(); terminal = this.expectIdentifier(); continue;
      }
      if (token.type === TokenType.PROFILES) {
        this.advance(); profiles = this.parseIdentifierList(); continue;
      }
      this.error(`Unexpected token in SESSION: ${token.value}`);
    }

    const end = this.expectToken(TokenType.RBRACE).location;
    return { kind: 'session', name, description, tools, context, memory, output, persist, terminal, profiles, span: { start, end } };
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
    let schedule: string | undefined;
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
      if (token.type === TokenType.SCHEDULE) {
        this.advance(); schedule = this.expectToken(TokenType.STRING_LITERAL).value; continue;
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
    return { kind: 'event', name, description, payload, subscribers, schedule, idempotent, ttl, span: { start, end } };
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
    let chain: string | undefined;

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
        this.advance();
        // Accept either `METRICS [a, b, c]` (bracketed) or `METRICS a, b, c`
        // (comma-separated, no brackets). Both forms appear in the
        // showcase apps.
        if (this.check(TokenType.LBRACKET)) {
          metrics.push(...this.parseBracketedIdentifierList());
        } else {
          metrics.push(this.expectIdentifier());
          while (this.check(TokenType.COMMA)) {
            this.advance();
            metrics.push(this.expectIdentifier());
          }
        }
        continue;
      }
      if (token.type === TokenType.PROMOTION_KW) {
        this.advance(); promotion = this.expectIdentifier() as 'auto' | 'manual'; continue;
      }
      if (token.type === TokenType.FALLBACK) {
        this.advance(); fallback = this.expectIdentifier() as 'production' | 'shadow'; continue;
      }
      if (token.type === TokenType.CHAIN_KW) {
        this.advance(); chain = this.expectIdentifier(); continue;
      }
      this.error(`Unexpected token in NBVE: ${token.value}`);
    }

    const end = this.expectToken(TokenType.RBRACE).location;
    return { kind: 'nbve', name, description, production, shadow, spc, metrics, promotion, fallback, chain, span: { start, end } };
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
    let endpoint: string | undefined, capabilities: string[] = [], trustLevel = 1.0;
    let contributes: { cpu?: number; gpu?: number; storageGb?: number; bandwidthMbps?: number } | undefined;

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
      if (token.type === TokenType.ENDPOINT) { this.advance(); endpoint = this.expectToken(TokenType.STRING_LITERAL).value; continue; }
      if (token.type === TokenType.CAPABILITY) { this.advance(); capabilities = this.parseIdentifierList(); continue; }
      if (token.type === TokenType.TRUST_LEVEL) { this.advance(); trustLevel = Number(this.expectToken(TokenType.NUMBER_LITERAL).value); continue; }
      if (token.type === TokenType.CONTRIBUTES) {
        this.advance(); this.expectToken(TokenType.LBRACE);
        contributes = {};
        while (!this.check(TokenType.RBRACE)) {
          const key = this.expectIdentifier();
          this.expectToken(TokenType.COLON);
          const val = Number(this.expectToken(TokenType.NUMBER_LITERAL).value);
          if (key === 'cpu') contributes.cpu = val;
          else if (key === 'gpu') contributes.gpu = val;
          else if (key === 'storage_gb') contributes.storageGb = val;
          else if (key === 'bandwidth_mbps') contributes.bandwidthMbps = val;
        }
        this.expectToken(TokenType.RBRACE); continue;
      }
      this.error(`Unexpected token in NODE: ${token.value}`);
    }

    const end = this.expectToken(TokenType.RBRACE).location;
    return { kind: 'node', name, description, type, hardware, aiTier, comms, sensors: sensorRefs, zone, offline, safety, endpoint, capabilities, trustLevel, contributes, span: { start, end } };
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
      !this.check(TokenType.ARROW) &&
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

  /** Look ahead `n` tokens (1 = next, 2 = one after, etc.). Returns null
   *  at EOF rather than throwing — callers branch on the optional. */
  private peek(n: number): Token | null {
    return this.tokens[this.pos + n] ?? null;
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
    let label: string | undefined;
    let description: string | undefined;
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
      } else if (tok.type === TokenType.LABEL) {
        this.advance();
        label = this.expectToken(TokenType.STRING_LITERAL).value;
      } else if (tok.type === TokenType.DESCRIPTION) {
        this.advance();
        description = this.expectToken(TokenType.STRING_LITERAL).value;
      } else {
        this.error(`Unexpected token in PREFERENCE: ${tok.value}`);
      }
    }
    const end = this.expectToken(TokenType.RBRACE).location;
    return { kind: 'preference', name, type, defaultValue, key, label, description, span: { start, end } };
  }

  // --- TARGET ---

  private parseTarget(): TargetDecl {
    const start = this.expectToken(TokenType.TARGET_KW).location;
    // consume optional name identifier (e.g. "web") if present before {
    if (this.check(TokenType.IDENTIFIER)) this.advance();
    this.expectToken(TokenType.LBRACE);

    let runtime: TargetRuntime = 'axum';
    let frontend: TargetFrontend = 'react';
    let deploy: TargetDeploy = 'docker';

    while (!this.check(TokenType.RBRACE)) {
      const token = this.current();
      if (token.type === TokenType.RUNTIME_KW) {
        this.advance(); runtime = this.expectIdentifier() as TargetRuntime; continue;
      }
      if (token.type === TokenType.FRONTEND_KW) {
        this.advance(); frontend = this.expectIdentifier() as TargetFrontend; continue;
      }
      if (token.type === TokenType.DEPLOY_KW) {
        this.advance(); deploy = this.expectIdentifier() as TargetDeploy; continue;
      }
      this.error(`Unexpected token in TARGET: ${token.value}`);
    }

    const end = this.expectToken(TokenType.RBRACE).location;
    return { kind: 'target', runtime, frontend, deploy, span: { start, end } };
  }

  // --- AUTH ---

  private parseAuth(): AuthDecl {
    const start = this.expectToken(TokenType.AUTH_KW).location;
    this.expectToken(TokenType.LBRACE);

    let strategy: AuthStrategy = 'jwt';
    let providers: string[] = [];
    let expiry = '8h';
    let refresh = false;

    while (!this.check(TokenType.RBRACE)) {
      const token = this.current();
      if (token.type === TokenType.STRATEGY_KW) {
        this.advance(); strategy = this.expectIdentifier() as AuthStrategy; continue;
      }
      if (token.type === TokenType.PROVIDERS) {
        this.advance(); providers = this.parseIdentifierList(); continue;
      }
      if (token.type === TokenType.EXPIRY_KW) {
        this.advance(); expiry = this.expectToken(TokenType.STRING_LITERAL).value; continue;
      }
      if (token.type === TokenType.REFRESH_KW) {
        this.advance(); refresh = this.parseBoolValue(); continue;
      }
      this.error(`Unexpected token in AUTH: ${token.value}`);
    }

    const end = this.expectToken(TokenType.RBRACE).location;
    return { kind: 'auth', strategy, providers, expiry, refresh, span: { start, end } };
  }

  // --- TENANT ---

  private parseTenant(): TenantDecl {
    const start = this.expectToken(TokenType.TENANT_KW).location;
    this.expectToken(TokenType.LBRACE);

    let model: TenantModel = 'row_level';
    let key = 'tenant_id';
    let isolate: TenantIsolation = 'strict';

    while (!this.check(TokenType.RBRACE)) {
      const token = this.current();
      if (token.type === TokenType.MODEL) {
        this.advance(); model = this.expectIdentifier() as TenantModel; continue;
      }
      if (token.type === TokenType.KEY_KW) {
        this.advance(); key = this.expectIdentifier(); continue;
      }
      if (token.type === TokenType.ISOLATE_KW) {
        this.advance(); isolate = this.expectIdentifier() as TenantIsolation; continue;
      }
      this.error(`Unexpected token in TENANT: ${token.value}`);
    }

    const end = this.expectToken(TokenType.RBRACE).location;
    return { kind: 'tenant', model, key, isolate, span: { start, end } };
  }

  // --- MUTATION_POLICY (Phase 11.3) ---

  private parseMutationPolicy(): MutationPolicyDecl {
    const start = this.expectToken(TokenType.MUTATION_POLICY).location;
    const name = this.expectIdentifier();
    this.expectToken(TokenType.LBRACE);

    let targets: string[] = [];
    const tiers: MutationTierDecl[] = [];
    let andonResponder: string | undefined;
    let improvementReasoner: string | undefined;
    let ledger: string | undefined;

    while (!this.check(TokenType.RBRACE)) {
      const token = this.current();
      if (token.type === TokenType.TARGETS) {
        this.advance();
        targets = this.parseBracketedIdentifierList();
        continue;
      }
      if (token.type === TokenType.TIER) {
        tiers.push(this.parseMutationTier());
        continue;
      }
      if (token.type === TokenType.ANDON_RESPONDER_KW) {
        this.advance();
        andonResponder = this.expectIdentifier();
        continue;
      }
      if (token.type === TokenType.IMPROVEMENT_REASONER_KW) {
        this.advance();
        improvementReasoner = this.expectIdentifier();
        continue;
      }
      if (token.type === TokenType.LEDGER) {
        this.advance();
        ledger = this.expectIdentifier();
        continue;
      }
      this.error(`Unexpected token in MUTATION_POLICY: ${token.value}`);
    }

    const end = this.expectToken(TokenType.RBRACE).location;
    return {
      kind: 'mutation_policy', name, targets, tiers,
      andonResponder, improvementReasoner, ledger,
      span: { start, end },
    };
  }

  private parseMutationTier(): MutationTierDecl {
    const start = this.expectToken(TokenType.TIER).location;
    const tierToken = this.advance();
    const tier = Number(tierToken.value);
    if (!Number.isInteger(tier) || tier < 1 || tier > 9) {
      this.error(`TIER number must be an integer 1-9 (got '${tierToken.value}')`);
    }
    const tierName = this.expectIdentifier();
    this.expectToken(TokenType.LBRACE);

    let scope: string[] = [];
    let autoDeploy: string | undefined;
    let require: string[] | undefined;
    let regressionSuite: string | undefined;
    let monitoringWindow: string | undefined;
    let nbveWindow: string | undefined;
    let approvalAuthority: string | string[] | undefined;
    let approvalAuthorityOrdered: boolean | undefined;

    while (!this.check(TokenType.RBRACE)) {
      const token = this.current();
      if (token.type === TokenType.SCOPE) {
        this.advance();
        scope = this.parseBracketedIdentifierList();
        continue;
      }
      if (token.type === TokenType.AUTO_DEPLOY) {
        this.advance();
        // Accept identifier (true_after_shadow), bool literal (true/false),
        // or string literal ("true_after_shadow") — all flatten to a string.
        if (this.check(TokenType.STRING_LITERAL) || this.check(TokenType.TRUE) || this.check(TokenType.FALSE)) {
          autoDeploy = this.advance().value;
        } else {
          autoDeploy = this.expectIdentifier();
        }
        continue;
      }
      if (token.type === TokenType.REQUIRE_KW) {
        this.advance();
        // Accept either bracket form or bare comma list; values may include
        // boolean operators (deterministic_test_pass AND governance_approval)
        // which the parser flattens to a list of underscored names.
        require = this.parseGateExpressionList();
        continue;
      }
      if (token.type === TokenType.REGRESSION_SUITE) {
        this.advance();
        // Accept identifier, string literal, or digit-prefixed composite
        // (e.g. "24h_recent_workflows" is lexed as NUMBER then IDENTIFIER).
        // Concatenate adjacent NUMBER + IDENTIFIER tokens into a single value.
        if (this.check(TokenType.STRING_LITERAL)) {
          regressionSuite = this.advance().value;
        } else {
          let v = this.advance().value;
          while (this.check(TokenType.IDENTIFIER)) v += this.advance().value;
          regressionSuite = v;
        }
        continue;
      }
      if (token.type === TokenType.MONITORING_WINDOW) {
        this.advance();
        monitoringWindow = this.consumeDurationLikeValue();
        continue;
      }
      if (token.type === TokenType.NBVE_WINDOW) {
        this.advance();
        nbveWindow = this.consumeDurationLikeValue();
        continue;
      }
      if (token.type === TokenType.APPROVAL_AUTHORITY) {
        this.advance();
        // Phase 11.6b — accept either a single identifier (1-of-1 signoff)
        // or a bracketed list (N-of-N multi-signer consensus).
        // Phase 11.6c — optional ORDERED keyword before the list requires
        // signatures to arrive in the declared order (out-of-order rejected).
        if (this.current().type === TokenType.ORDERED) {
          this.advance();
          approvalAuthorityOrdered = true;
          if (this.current().type !== TokenType.LBRACKET) {
            this.error(`APPROVAL_AUTHORITY ORDERED requires a bracketed list; got '${this.current().value}'`);
          }
          approvalAuthority = this.parseBracketedIdentifierList();
        } else if (this.current().type === TokenType.LBRACKET) {
          approvalAuthority = this.parseBracketedIdentifierList();
        } else {
          approvalAuthority = this.expectIdentifier();
        }
        continue;
      }
      this.error(`Unexpected token in TIER: ${token.value}`);
    }

    const end = this.expectToken(TokenType.RBRACE).location;
    return {
      tier, name: tierName, scope,
      autoDeploy, require, regressionSuite, monitoringWindow, nbveWindow,
      approvalAuthority, approvalAuthorityOrdered,
      span: { start, end },
    };
  }

  /**
   * Consume a duration-like value at the cursor. Accepts:
   *   - string literal: "24h"
   *   - identifier: 24h_recent or session
   *   - digit-prefixed composite: 24h (NUMBER + IDENTIFIER)
   * Concatenates and returns as a single string. Used by MONITORING_WINDOW,
   * NBVE_WINDOW, and other Phase 11 fields that take duration-like values.
   */
  private consumeDurationLikeValue(): string {
    if (this.check(TokenType.STRING_LITERAL)) return this.advance().value;
    let v = this.advance().value;
    while (this.check(TokenType.IDENTIFIER)) v += this.advance().value;
    return v;
  }

  /**
   * Parse a gate-expression list: either bracketed [a, b, c] or a flat
   * comma/AND/OR sequence. AND/OR are flattened to a simple list — the
   * conjunction semantics are conventional (all gates apply unless
   * documented otherwise per gate name). The parser intentionally doesn't
   * impose boolean structure; that's for the verifier in Phase 4.
   */
  private parseGateExpressionList(): string[] {
    const out: string[] = [];
    const hasBracket = this.check(TokenType.LBRACKET);
    if (hasBracket) this.advance();
    do {
      // Skip noise tokens AND/OR/&& between identifiers
      while (this.check(TokenType.AND) || this.check(TokenType.OR)) this.advance();
      out.push(this.expectIdentifier());
      // Continue while next token is comma OR AND/OR connector
      if (this.check(TokenType.COMMA)) { this.advance(); continue; }
      if (this.check(TokenType.AND) || this.check(TokenType.OR)) { this.advance(); continue; }
      break;
    } while (!this.check(TokenType.RBRACKET) && !this.check(TokenType.RBRACE));
    if (hasBracket) this.expectToken(TokenType.RBRACKET);
    return out;
  }

  // --- Top-Level SEED ---

  private parseTopLevelSeed(): TopLevelSeedDecl {
    const start = this.expectToken(TokenType.SEED).location;
    const entity = this.expectIdentifier();

    // Direct-array form: `SEED <Entity> [ { ... }, { ... }, ... ]`.
    // Same semantics as the `RECORDS [...]` inner form but without
    // the wrapping braces. Brace-balanced skip of each record.
    if (this.check(TokenType.LBRACKET)) {
      this.advance();
      while (!this.check(TokenType.RBRACKET) && !this.isAtEnd()) {
        if (this.check(TokenType.LBRACE)) {
          let bd = 1;
          this.advance();
          while (bd > 0 && !this.isAtEnd()) {
            const tt = this.current();
            if (tt.type === TokenType.LBRACE) bd++;
            else if (tt.type === TokenType.RBRACE) bd--;
            if (bd > 0) this.advance();
          }
          this.advance();
        } else if (this.check(TokenType.COMMA)) {
          this.advance();
        } else {
          this.advance();
        }
      }
      const endLoc = this.expectToken(TokenType.RBRACKET).location;
      const fields = new Map<string, LiteralValue>([['__records__', '[]']]);
      return { kind: 'seed', entity, fields, span: { start, end: endLoc } };
    }

    this.expectToken(TokenType.LBRACE);
    const fields = new Map<string, LiteralValue>();
    // Three field-syntax forms accepted:
    //   key value             (existing terse form)
    //   key: value            (Accelerando-style, JSON-shaped)
    //   RECORDS [ {...} ... ] (bulk form — flatten as records[] field)
    // Optional trailing commas between pairs.
    while (!this.check(TokenType.RBRACE) && !this.isAtEnd()) {
      const tok = this.current();
      // Bulk RECORDS form. We accept and currently store as a single
      // 'records' literal-array field — full ingest is downstream.
      // Each object inside the [...] is `{ key: value, ... }`; we
      // brace-balanced-skip them. The outer [...] is bracket-balanced.
      if (tok.type === TokenType.IDENTIFIER && tok.value === 'RECORDS') {
        this.advance();
        this.expectToken(TokenType.LBRACKET);
        while (!this.check(TokenType.RBRACKET) && !this.isAtEnd()) {
          if (this.check(TokenType.LBRACE)) {
            // Skip a brace-balanced record body in one go.
            let bd = 1;
            this.advance(); // consume opening {
            while (bd > 0 && !this.isAtEnd()) {
              const tt = this.current();
              if (tt.type === TokenType.LBRACE) bd++;
              else if (tt.type === TokenType.RBRACE) bd--;
              if (bd > 0) this.advance();
            }
            this.advance(); // consume matching }
          } else if (this.check(TokenType.COMMA)) {
            this.advance();
          } else {
            // Defensive: advance one to avoid infinite loops on
            // unexpected tokens. Real-world records are always
            // brace-objects; anything else is a parse oddity we
            // tolerate at this layer.
            this.advance();
          }
        }
        this.expectToken(TokenType.RBRACKET);
        if (this.check(TokenType.COMMA)) this.advance();
        // Store a sentinel so codegen knows to ingest these later.
        fields.set('__records__', '[]');
        continue;
      }
      const key = this.expectIdentifier();
      if (this.check(TokenType.COLON)) this.advance();
      const value = this.parseLiteral();
      fields.set(key, value);
      if (this.check(TokenType.COMMA)) this.advance();
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
