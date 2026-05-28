The intellectual project of representing code as a queryable knowledge graph has a longer history than any other restoration in this book. The project's origins can be traced to the early work on program analysis and software comprehension in the 1970s, was developed substantially through the program-analysis research community of the 1980s and 1990s, found expression in the academic *code clone detection* and *code refactoring* tools of the 2000s, was given institutional form by Tim Berners-Lee's *Linked Data* and *Semantic Web* initiatives in the same decade, and arrived at industrial maturity in the 2010s with deployments at Google (Kythe), Facebook/Meta (Glean), GitHub (Semantic), and a small number of other organizations that built proprietary code-graph infrastructure to support their internal engineering practices. The current state of the art includes the commercial products Sourcegraph and CodeQL, the open-source Tree-sitter parsing framework that supports semantic indexing across dozens of languages, and the Language Server Protocol that brings semantic queries into mainstream development environments at the modest level of go-to-definition and find-references.

The project's central proposition is that a codebase, properly represented, is a *graph of entities and relationships* that can be queried in the same general way that a relational database can be queried. The entities include the obvious — functions, classes, types, modules — and extend to subtler structural elements such as type-parameter applications, control-flow nodes, data-flow paths, and architectural patterns. The relationships include the obvious — call edges, inheritance edges, reference edges — and extend to richer relationships such as data-flow connections, pattern instantiations, and conceptual correspondences. A codebase so represented can be queried for the answers to questions the engineer routinely asks but typically resolves through ad-hoc search: *where is this function called*, *what implements this interface*, *what are all the data paths from this input to that output*, *what code depends on the assumption that this field is non-null*, *which classes implement the Repository pattern*. The queries can be expressed in a structured query language; the answers can be exact rather than the approximate results of text search; the resulting tooling can support engineering work at a level the field has rarely sustained.

The empirical case for code-as-knowledge-graph is strong where the infrastructure has been deployed. Google's engineering productivity studies have documented substantial improvements in engineering velocity for engineers using Kythe-based tooling. Meta's Glean publications describe similar gains. Sourcegraph's customer case studies (in the practitioner literature rather than peer-reviewed publications) report time savings on code-navigation and refactoring tasks in the multiple-hours-per-engineer-per-week range. The pattern across the evidence is consistent: where the graph exists and is queryable, engineering work is measurably more efficient; where the graph does not exist, the work is performed through text search and ad-hoc reasoning, with corresponding inefficiency.

The graph does not exist for most engineering teams. The reason is the *semantic-tagging tax*, in its specific form for code knowledge graphs. The basic graph — call edges, type references, inheritance — can be extracted mechanically from any compileable codebase by tools that understand the host language's syntax and semantics. The Language Server Protocol provides this basic graph adequately for most languages. The *richer* graph — the architectural patterns, the conceptual correspondences across modules, the data-flow paths through complex control flow, the assumption-tracking that lets queries reason about behavior under conditions — requires *semantic tagging* that is not mechanically extractable. A function may implement a Repository pattern in the DDD sense, but the implementation is not labeled as such; the labeling requires human judgment about whether the function's behavior matches the pattern's intent. A module may belong to a particular bounded context, but the boundedness is a design intention that the code structure may not express. A data-flow path may carry sensitive customer information, but the sensitivity is a domain-level fact that the code's types do not encode. The semantic richness that makes the knowledge graph genuinely useful is the richness that humans must add, and humans have historically not added it at scale.

The tagging tax has been the binding constraint on code knowledge graphs even at organizations that have deployed the underlying infrastructure. Kythe, Glean, and Sourcegraph all support semantic tagging as a first-class capability; the capability has been used most heavily for the basic mechanical relationships and only intermittently for the richer human-supplied tags. The richer tags require ongoing curation as the code evolves; the curation has not been sustained even at organizations whose engineering investments in code infrastructure have been substantial.

What AI changes about the semantic-tagging tax is direct and substantial: AI can apply semantic tags consistently at scale, maintain them under refactoring, translate between tag schemes, and answer natural-language queries against the resulting graph. The capabilities that the tagging tax demanded from humans — pattern recognition across the codebase, domain-knowledge application to identifiers and data, judgment about conceptual correspondences across modules — are capabilities AI brings to the tagging task at a fluency that exceeds what most engineering teams have been able to sustain. The richer knowledge graph that has historically required dedicated curation becomes a routine extraction that the team can request and refresh on a cadence. The infrastructure deployments that have produced engineering-velocity gains at Google and Meta become accessible to organizations that have not made the infrastructure investments those organizations made.

The operational prompt for an AI-driven code knowledge-graph workflow operates on a codebase and produces both the structural graph and the semantic-tag layer, with the engineer participating in the tag validation:

```
You are producing and maintaining a code knowledge graph for the
supplied codebase per the intellectual project of code-as-graph
that the program-analysis community has developed since the 1980s.
The output is the structural graph, the semantic-tag layer, and a
query interface.

Stage 1: Structural extraction.

For the supplied codebase:

1. Extract the structural entities: functions, classes, types,
   modules, fields, methods, packages, files.

2. Extract the structural relationships: calls, references,
   inheritance, implementation, composition, type usage,
   import dependencies.

3. The structural layer should be near-complete and largely
   mechanical, derivable from the host language's parser and
   type system.

Stage 2: Semantic tagging.

4. Apply the semantic tag layer:

   - Architectural patterns: identify instances of named patterns
     (Repository, Factory, Adapter, Anti-Corruption Layer,
     Observer, Strategy, etc.) from the architecture literature.

   - Bounded contexts: assign each module or package to a
     bounded context per the team's domain decomposition
     (cross-reference Chapter 16's Ubiquitous Language).

   - Requirement traces: associate code elements with the
     requirements they realize (cross-reference Chapter 18's
     traceability matrix).

   - Decision lineage: associate code elements with the ADRs
     that explain their structure (cross-reference Chapter 17).

   - Domain-concept tags: associate code elements with the
     business concepts they represent (cross-reference the
     Ubiquitous Language glossary).

   - Sensitivity classifications: identify code that handles
     sensitive data (PII, financial, security-critical) per
     the team's classification scheme.

   - Performance criticality: identify code on hot paths or with
     significant performance constraints, based on the
     operational profile (cross-reference Chapter 13).

5. Surface the proposed tags for engineer review. The engineer
   validates the tags; the AI does not finalize tags the engineer
   has not approved. Validation can be batched (review tag
   proposals on a cadence) or per-tag (review each significant
   tag as it is proposed).

Stage 3: Query interface.

6. Produce a query interface supporting:

   - Structural queries (where is X called, what implements Y).
   - Semantic queries (which code implements the Repository
     pattern, what code in the X bounded context depends on
     classes in the Y bounded context).
   - Compound queries (which code handles PII and is also on a
     hot path; which untraced code lives in a regulatory
     bounded context).

7. Queries can be expressed in a structured query language or in
   natural language; the prompt translates natural-language
   queries to the structured form and executes them.

Stage 4: Continuous maintenance.

8. As the codebase changes, regenerate the affected portions of
   the structural graph and propose updates to the semantic-tag
   layer. The maintenance pattern is the pattern Chapter 16
   established for the Ubiquitous Language: continuous
   regeneration with engineer review on a cadence.

9. Produce KNOWLEDGE_GRAPH.md containing the graph schema, the
   tag taxonomy, the per-query results when requested, and the
   per-change update reports.

Provenance discipline: every tag must trace to specific code or
to specific human approval. Untagged elements are surfaced as gaps
rather than asserted as not-tagged. The graph's value depends on
its accuracy, and accuracy depends on provenance.

Abort criteria: If the codebase is too small to warrant a knowledge
graph (a few thousand lines or fewer), the standard navigation
tooling of the development environment is adequate and the prompt
should defer. If the codebase has no semantic tag substrate (no
ADRs, no Ubiquitous Language, no traceability), produce the
structural graph and propose the semantic layer as a subsequent
investment that requires the prerequisite disciplines to be in
place.
```

The worked restoration applies the prompt to the Agicore declaration system — a region of the codebase where the prerequisite disciplines (Ubiquitous Language from Chapter 16, ADRs from Chapter 17, traceability from Chapter 18, conceptual structure from Chapter 21) are now in place from the earlier worked restorations in this book. The structural graph contains approximately twelve thousand nodes and forty thousand edges across the declaration system's source files. The semantic-tag layer adds tags spanning architectural patterns (the Anti-Corruption Layer between the parser and the AI service implementations, the Repository pattern in the declaration store, the Visitor pattern in the type-checker), bounded contexts (the declaration system as a whole, with internal sub-contexts for parsing, validation, and code generation), requirement traces from the published specification files, and ADR associations linking implementation modules to the architectural decisions that shape them. The engineer review of the proposed tags takes approximately four hours; the tag set is approved with refinements; the knowledge graph becomes a queryable artifact the team can use for ongoing engineering work.

A subsequent test of the graph's value: an engineer working on a feature addition queries the graph to identify all the code that depends on the AI service abstraction layer and that would be affected by a planned change to the provider-selection logic. The query produces a precise list of seventeen functions across nine modules, with the dependency rationale explicit for each. The same query, performed through conventional code search before the graph existed, would have taken the engineer approximately two hours of investigation and would likely have missed two or three of the affected functions whose dependencies were not directly visible from text search. The graph-supported query takes approximately three minutes. The engineering-velocity gain that Google's Kythe deployment documented is reproducible on the Agicore team's codebase, at infrastructure cost approximately two orders of magnitude lower than Kythe's institutional investment.

A note on the relationship between the knowledge graph and the other Part IV-V disciplines is appropriate. The graph is *the integrating artifact* across the documentation and architecture disciplines. The Ubiquitous Language provides the vocabulary that the graph's domain-concept tags use. The ADRs provide the decision rationale that the graph's decision-lineage tags reference. The traceability matrix provides the requirements connections. The CRC deck provides the class-level architectural projection. Literate programming provides the prose explanations that the graph's natural-language query results can link to. Each discipline produces an artifact; the knowledge graph composes them into a queryable representation that exceeds what any single discipline produces alone. The restoration of the knowledge graph is, in this sense, the *capstone* of Parts IV and V — the place where the individual disciplines compose into an integrated practice that supports engineering work in a way the field has rarely sustained.

The chapter that follows turns to a discipline that operates at the specification-and-verification boundary: Dan North's Behavior-Driven Development, which has been adopted broadly in language and unevenly sustained in practice because the Gherkin specifications that BDD produces have historically rotted faster than any other artifact in modern repositories. The maintenance tax is direct; the AI restoration is correspondingly direct.
