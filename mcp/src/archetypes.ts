// The six project archetypes from the README's "What's Worth Building With This"
// section, encoded as queryable data. The MCP tool list_archetypes returns the
// summary set; get_archetype returns the full record for one.
//
// Keep these in sync with README.md when the archetypes section evolves.

export interface Archetype {
  /** Short stable identifier (kebab-case). Used as the get_archetype key. */
  id: string;
  /** Display name as it appears in the README. */
  name: string;
  /** Brand-name comparison ("SAP", "Epic/Cerner", etc.) — what category this replaces. */
  category_leader: string;
  /** Headline cost/time of the existing market (e.g. "$200M / 5-year"). */
  market_anchor: string;
  /** One-paragraph description of what the system does + how the Andon Loop applies. */
  description: string;
  /** Domain-specific terminology that a domain expert would use. */
  domain_terms: string[];
  /** Example tier breakdown with named signers for the multi-signer chains. */
  tier_breakdown: TierExample[];
  /** Why this is reachable now — the architectural insight that unlocks it. */
  why_reachable_now: string;
}

export interface TierExample {
  tier: number;
  label: string;
  scope: string[];
  auto_deploy: boolean;
  approval_authority: string[] | null;
  ordered: boolean;
  note: string;
}

export const ARCHETYPES: Archetype[] = [
  {
    id: 'erp-replacement',
    name: 'Replace your company\'s entire ERP',
    category_leader: 'SAP S/4HANA',
    market_anchor: '$200M / 5-year implementation',
    description:
      'Compile your own SAP. GL, AP/AR, inventory, procurement, MRP, manufacturing routing, HR, period close — everything. Then add the Andon Loop on top so AI watches process drift and proposes new validation rules from observed transaction patterns. Example: "vendor invoices > $25K should require three-way match against the PO and GR" auto-deploys after the regression suite passes against the last 90 days of bookings.',
    domain_terms: [
      'general ledger',
      'three-way match',
      'period close',
      'chart of accounts',
      'MRP',
      'manufacturing routing',
      'AP/AR',
      'procurement',
    ],
    tier_breakdown: [
      {
        tier: 1,
        label: 'rule_tuning',
        scope: ['RULES_modify'],
        auto_deploy: true,
        approval_authority: null,
        ordered: false,
        note: 'Validation threshold adjustments — auto-deploys after regression suite passes.',
      },
      {
        tier: 3,
        label: 'workflow_changes',
        scope: ['WORKFLOW_modify'],
        auto_deploy: false,
        approval_authority: ['CFO'],
        ordered: false,
        note: 'New approval workflows or process changes need CFO signoff.',
      },
      {
        tier: 5,
        label: 'chart_of_accounts',
        scope: ['ENTITY_modify', 'MUTATION_POLICY_modify'],
        auto_deploy: false,
        approval_authority: ['CFO', 'Controller', 'outside_auditor'],
        ordered: true,
        note: 'Anything touching the chart of accounts needs ordered signoff from CFO, Controller, and the outside auditor.',
      },
    ],
    why_reachable_now:
      'SAP S/4HANA implementations ossify the day they go live — the existing software cannot adapt without re-implementation. Accelerando\'s 12-app enterprise core demonstrates the application surface is now compilation-scale work. The Andon Loop adds what SAP has never had: a tier-verified, sandbox-tested, audit-chained way for the rules to keep evolving without re-implementing every two years.',
  },
  {
    id: 'hospital-cds',
    name: 'Hospital network\'s clinical decision support layer',
    category_leader: 'Epic / Cerner',
    market_anchor: '$500M+ per IDN',
    description:
      'Order entry with drug-drug interaction checks, allergy verification, evidence-based pathway adherence, critical-finding tracking across radiology and pathology, sepsis-bundle compliance — running across an entire IDN\'s EMR data. AI watches for emerging patterns in adverse events and proposes new clinical rules; threshold adjustments auto-deploy after backtesting against the historical cohort.',
    domain_terms: [
      'CDS rules',
      'drug-drug interactions',
      'allergy verification',
      'evidence-based pathway',
      'critical-finding tracking',
      'sepsis bundle',
      'scope of practice',
      'medical staff committee',
      'chief quality officer',
      'chief medical officer',
    ],
    tier_breakdown: [
      {
        tier: 1,
        label: 'threshold_tuning',
        scope: ['RULES_modify'],
        auto_deploy: true,
        approval_authority: null,
        ordered: false,
        note: 'Numeric thresholds (e.g. "alert if creatinine trend > X for patients on Y") auto-deploy after backtesting against the historical cohort.',
      },
      {
        tier: 3,
        label: 'new_pathway',
        scope: ['RULES_modify'],
        auto_deploy: false,
        approval_authority: ['medical_staff_committee'],
        ordered: false,
        note: 'New pathway rules need medical staff committee approval.',
      },
      {
        tier: 5,
        label: 'scope_of_practice',
        scope: ['MUTATION_POLICY_modify'],
        auto_deploy: false,
        approval_authority: ['medical_director', 'chief_quality_officer', 'chief_medical_officer'],
        ordered: true,
        note: 'Anything touching scope of practice needs ordered signoff. Sandbox runs bias and disparate-impact tests against demographic slices before any rule deploys.',
      },
    ],
    why_reachable_now:
      'Epic and Cerner sell black boxes that require armies of integration consultants to keep current. The Accelerando 6-app EMR stack already shows the application surface is tractable; what healthcare has always needed — and what no incumbent provides — is a mechanically enforced governance layer for the clinical rules themselves. The Andon Loop is that layer, with bias testing in the sandbox before any rule reaches production.',
  },
  {
    id: 'bank-middle-office',
    name: 'Bank middle office — settlement, reconciliation, AML, regulatory reporting',
    category_leader: 'In-house at Tier-1 banks',
    market_anchor: '$1B+ middle-office modernization budgets',
    description:
      'Multi-billion-dollar trade flow with AI proposing new fraud-detection patterns from observed anomaly clustering. T1 parameter tuning on existing AML rules auto-deploys after backtesting against the last 30 days of resolved alerts (false-positive rate is the regression metric). T3 new pattern-detection rules need compliance officer approval. T5 changes that affect SAR-filing categories or regulatory taxonomies need ordered three-signer signoff, with the hash-chained ledger submitted directly to the regulator as part of the audit response.',
    domain_terms: [
      'AML',
      'SAR filing',
      'settlement risk',
      'trade reconciliation',
      'regulatory reporting taxonomies',
      'three-lines-of-defense',
      'OCC',
      'chief compliance officer',
      'chief risk officer',
    ],
    tier_breakdown: [
      {
        tier: 1,
        label: 'aml_threshold_tuning',
        scope: ['RULES_modify'],
        auto_deploy: true,
        approval_authority: null,
        ordered: false,
        note: 'Existing AML rule parameter tuning — auto-deploys after backtesting against the last 30 days of resolved alerts; false-positive rate is the regression metric.',
      },
      {
        tier: 3,
        label: 'new_pattern_detection',
        scope: ['RULES_modify'],
        auto_deploy: false,
        approval_authority: ['chief_compliance_officer'],
        ordered: false,
        note: 'New pattern-detection rules need CCO approval.',
      },
      {
        tier: 5,
        label: 'regulatory_reporting',
        scope: ['MUTATION_POLICY_modify', 'ENTITY_modify'],
        auto_deploy: false,
        approval_authority: ['chief_compliance_officer', 'general_counsel', 'chief_risk_officer'],
        ordered: true,
        note: 'Changes that affect SAR-filing categories or regulatory taxonomies need ordered three-signer signoff. Hash chain becomes the audit-response submission.',
      },
    ],
    why_reachable_now:
      'Every Tier-1 bank has spent $1B+ on middle-office modernization in the last decade with identical post-mortems: the rules couldn\'t keep up with the business, and the audit trail couldn\'t satisfy the regulator. The Andon Loop\'s mechanical "AI cannot expand its own authorization" property is what every bank CRO has wanted from a rules engine for a decade.',
  },
  {
    id: 'insurance-claims',
    name: 'Insurance claims adjudication engine',
    category_leader: 'UnitedHealthcare / Cigna / Aetna in-house',
    market_anchor: 'Currently a national-headlines reputational risk',
    description:
      'Full lifecycle — eligibility verification, medical necessity review, network adequacy, fraud screening, payment determination — with AI watching adjudication patterns and proposing new screening rules. T1 threshold tweaks auto-deploy after the regression suite passes; new fraud heuristics need claims VP approval; ANY proposed rule that could systematically deny coverage to a protected class is mechanically blocked at the tier verifier (the scope DEMOGRAPHIC_FILTER_modify is not in any non-empty tier) — it cannot reach the sandbox regardless of what the model proposes.',
    domain_terms: [
      'eligibility verification',
      'medical necessity review',
      'network adequacy',
      'fraud screening',
      'denial codes',
      'protected classes',
      'NAIC',
      'bias testing',
      'disparate impact',
    ],
    tier_breakdown: [
      {
        tier: 1,
        label: 'auto_approve_thresholds',
        scope: ['RULES_modify'],
        auto_deploy: true,
        approval_authority: null,
        ordered: false,
        note: 'Auto-approve threshold tweaks (e.g. "auto-approve sub-$2K claims for specialty Y when provider\'s prior-90-day approval rate is > 95%") — auto-deploy after the regression suite passes.',
      },
      {
        tier: 3,
        label: 'new_fraud_heuristics',
        scope: ['RULES_modify'],
        auto_deploy: false,
        approval_authority: ['claims_vp'],
        ordered: false,
        note: 'New fraud heuristics need claims VP approval.',
      },
      {
        tier: 5,
        label: 'demographic_filter_LOCKED',
        scope: [],
        auto_deploy: false,
        approval_authority: null,
        ordered: false,
        note: 'DEMOGRAPHIC_FILTER_modify is not in any non-empty tier. The tier verifier mechanically blocks any proposal whose scope includes this kind — it cannot reach the sandbox regardless of what the model proposes.',
      },
    ],
    why_reachable_now:
      'The UnitedHealthcare denial-algorithm scandal made this a national headline category. The current vendors sell black boxes; the regulatory pressure is moving toward "show me the rule that denied this claim and prove it wasn\'t trained on biased data." The Andon Loop\'s tamper-evident ledger + sandbox-runs-bias-tests-before-deploy + mechanical scope verification is the only architecture that satisfies the emerging requirement.',
  },
  {
    id: 'tax-authority',
    name: 'National tax authority\'s compliance + audit rules engine',
    category_leader: 'IRS BSM (Business Systems Modernization)',
    market_anchor: '$11 billion spent on modernization to date',
    description:
      'Every filing category, every credit, every audit trigger, every taxpayer correspondence rule. AI watches filing patterns and proposes new audit-flagging heuristics. T1 thresholds auto-deploy after backtesting. T3 new audit categories need commissioner-level approval. T5 changes that touch statutory interpretations need ordered three-signer signoff. Every rule change since the system went live is reproducibly on the hash chain — a tax-court subpoena gets a deterministic answer in seconds rather than a multi-year discovery process.',
    domain_terms: [
      'filing categories',
      'audit triggers',
      'tax credits',
      'statutory interpretation',
      'taxpayer correspondence',
      'inspector general',
      'congressional liaison',
      'tax court',
    ],
    tier_breakdown: [
      {
        tier: 1,
        label: 'audit_threshold_tuning',
        scope: ['RULES_modify'],
        auto_deploy: true,
        approval_authority: null,
        ordered: false,
        note: 'Numeric audit-trigger thresholds (e.g. "flag returns claiming home-office deduction > 30% of gross income") — auto-deploy after backtesting against the historical filing cohort.',
      },
      {
        tier: 3,
        label: 'new_audit_categories',
        scope: ['RULES_modify'],
        auto_deploy: false,
        approval_authority: ['commissioner'],
        ordered: false,
        note: 'New audit-trigger categories need commissioner-level approval.',
      },
      {
        tier: 5,
        label: 'statutory_interpretation',
        scope: ['MUTATION_POLICY_modify', 'ENTITY_modify'],
        auto_deploy: false,
        approval_authority: ['congressional_liaison', 'general_counsel', 'commissioner'],
        ordered: true,
        note: 'Changes that touch statutory interpretations need ordered three-signer signoff.',
      },
    ],
    why_reachable_now:
      'The IRS spent $11 billion on modernization to end up with what runs today, and they\'re not done. The actual hard problem isn\'t writing the rules — it\'s the rules needing to evolve while remaining auditable to Congress, the Inspector General, and the courts. The Andon Loop is the first architecture where "AI helped author this rule" and "here\'s the deterministic, hash-chained, signed-by-three-named-humans proof of why" are compatible answers.',
  },
  {
    id: 'power-grid',
    name: 'Power grid operator\'s load-balancing + market-clearing rules',
    category_leader: 'ISO/RTO market software (PJM, ERCOT, MISO, CAISO etc)',
    market_anchor: 'ERCOT February 2021 — fifteen years of unsolved problem',
    description:
      'Real-time dispatch decisions across thousands of generators, demand-response participants, and battery resources, with AI proposing new rules from weather + demand + market-pattern correlations. Routine load-following parameter adjustments auto-deploy after they pass shadow evaluation against the last 7 days of actual market intervals (NBVE shadow window before promotion). New market-clearing rule variants need ISO market committee approval. Anything affecting NERC reliability standards needs ordered three-signer signoff, with the hash chain becoming the FERC submission.',
    domain_terms: [
      'ISO/RTO',
      'market clearing',
      'load following',
      'dispatch decisions',
      'NERC reliability standards',
      'reliability coordinator',
      'market monitor',
      'demand response',
      'FERC',
    ],
    tier_breakdown: [
      {
        tier: 1,
        label: 'load_following_tuning',
        scope: ['RULES_modify'],
        auto_deploy: true,
        approval_authority: null,
        ordered: false,
        note: 'Load-following parameter adjustments — auto-deploy after shadow evaluation against the last 7 days of actual market intervals (NBVE window).',
      },
      {
        tier: 3,
        label: 'new_market_clearing_variant',
        scope: ['RULES_modify'],
        auto_deploy: false,
        approval_authority: ['iso_market_committee'],
        ordered: false,
        note: 'New market-clearing rule variants need ISO market committee approval.',
      },
      {
        tier: 5,
        label: 'reliability_standards',
        scope: ['MUTATION_POLICY_modify'],
        auto_deploy: false,
        approval_authority: ['reliability_coordinator', 'market_monitor', 'ISO_general_counsel'],
        ordered: true,
        note: 'Changes affecting NERC reliability standards need ordered three-signer signoff. Hash chain becomes the FERC submission.',
      },
    ],
    why_reachable_now:
      'ERCOT February 2021. Every incident report concludes the same way: "the rules were too rigid to adapt and the operators didn\'t have time to override safely." Adaptive rules with mechanical reliability-standard guarantees has been an unsolved problem in grid operations for fifteen years. The Andon Loop solves it as a side effect of its general shape.',
  },
];

/** Summary form used by list_archetypes — one line per archetype. */
export interface ArchetypeSummary {
  id: string;
  name: string;
  category_leader: string;
  market_anchor: string;
  one_line: string;
}

export function summarize(a: Archetype): ArchetypeSummary {
  return {
    id: a.id,
    name: a.name,
    category_leader: a.category_leader,
    market_anchor: a.market_anchor,
    one_line: a.description.split('. ')[0] + '.',
  };
}

export function findArchetype(id: string): Archetype | undefined {
  const norm = id.toLowerCase().replace(/_/g, '-');
  return ARCHETYPES.find((a) => a.id === norm);
}
