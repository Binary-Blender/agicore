Michael Feathers published *Working Effectively with Legacy Code* in 2004 as the first general practitioner's treatment of an engineering activity that had been performed for decades without a name and without a coherent methodology. The activity is the work of taking a codebase one did not write, understanding what it does and why, and modifying it in ways that preserve its essential function while extending or repairing its specific failures. Feathers called legacy code "code without tests," in a deliberately broad definition that captured most production code in the world; the framing was that legacy code is not a special class of bad software but the default state of software whose authors have moved on or whose original construction predates current quality disciplines. Working with such code requires an investigative discipline distinct from greenfield development: the engineer must reconstruct, from the existing artifacts, the understanding the original authors had implicitly. Feathers's book provided the patterns and the techniques. The discipline existed; the book gave it a name; the name is *process archaeology* in some treatments and *software archaeology* in others.

The empirical case for process archaeology is structural rather than experimental in the sense that Fagan's defect-detection rates were experimental. The case rests on the observation that legacy modernization projects either succeed because they have done adequate archaeological work or fail because they have not, with the success rate of well-archaeologized projects substantially exceeding the success rate of projects that attempted the modernization without first investing in understanding. Demeyer, Ducasse, and Nierstrasz's 2002 *Object-Oriented Reengineering Patterns* documents the structural patterns of archaeological work and the modernization-success correlations. Sneed's case-study work on legacy reengineering at industrial scale documents the same pattern. The pattern across the evidence is consistent: modernization without archaeology fails; archaeology before modernization succeeds; the archaeology is therefore the limiting cost on most modernization budgets.

The technical substance of archaeological work involves several distinct activities. *History reading* — examining the commit log to understand when and why major changes were introduced. *Dead-code identification* — distinguishing code that is no longer reachable from code that is rarely exercised but still serves a purpose. *Branch and tag archaeology* — examining the branches and tags that represent former development paths or shipped versions to understand how the codebase has evolved. *Contemporaneous-document recovery* — locating the design documents, decision records, and discussions that informed the original development. *Living-knowledge interview* — talking to engineers who worked on the original system, where they are available, to capture the rationale that did not survive in written form. *Pattern recognition* — identifying the architectural patterns the original engineers were using, even when those patterns are not named in any current documentation. *Inference from runtime behavior* — observing the system in operation to deduce what the code is intended to do in cases where the code's structure is ambiguous.

The effort tax on process archaeology is concentrated in two components, both of which have historically been substantial. The first is the *senior-judgment tax*. Archaeological work requires the engineer performing it to be senior enough to recognize architectural patterns, distinguish intentional design from accidental accumulation, and judge which aspects of the codebase warrant deep investigation versus surface acknowledgment. Junior engineers can perform parts of the work — reading commit logs, identifying dead code — but the synthesizing judgment that produces an actionable archaeological report requires experience that has been historically scarce. Organizations doing legacy modernization either employed senior consultants for the archaeological phase or accepted that the modernization would produce less successful outcomes for lacking it. The second is the *time tax*. Archaeological work is slow because the artifacts being investigated are voluminous and the investigation is necessarily exploratory. A senior engineer might spend weeks reading the history of a codebase before having a coherent picture of its evolution; the same engineer might spend further weeks correlating the history with the current code to identify where the historical decisions remain load-bearing. The time invested produces no near-term deliverable; organizations under schedule pressure systematically deprioritize archaeology in favor of immediate modernization work, with corresponding harm to the modernization's success rate.

What AI changes about process archaeology is each of the two components, with effects that warrant separate examination because the components have different relationships to AI's capabilities. The time tax is reduced by AI's capacity to read artifacts at scale without fatigue. An AI presented with a codebase's commit history of, say, twenty thousand commits across five years can read every commit in hours, summarize the history at multiple levels of granularity, identify the major architectural eras and the transition points between them, and produce an archaeological narrative that a human engineer would have taken months to produce. The reading is mechanical; the synthesis is structured; the output is a narrative the engineer can consume in a fraction of the time the original investigation would have required. The senior-judgment tax is more nuanced. AI brings to the archaeological work a fluency in architectural patterns that exceeds what most engineers have — the AI has read the broader software-architecture literature, recognizes the patterns named in *Patterns of Enterprise Application Architecture*, *Domain-Driven Design*, *Design Patterns*, and the broader pattern literature, and can identify pattern instances in unfamiliar code at a high rate. The judgment AI lacks is the *organizational* judgment — what the team intends to do with the archaeological findings, which findings warrant action, which can be deferred. The engineer retains this judgment; AI supplies the pattern recognition and the historical synthesis that the engineer's judgment operates against.

The operational prompt for an AI-driven process-archaeology workflow is therefore a workflow prompt that produces an archaeological report from the supplied codebase's artifacts:

```
You are performing a process-archaeology investigation of the
supplied codebase per the methodology Michael Feathers and the
broader software-archaeology literature have developed. The output
is an archaeological report that an engineer joining the project
can read to understand the codebase's history and current state.

Stage 1: History survey.

For the supplied codebase:

1. Read the commit history across its full duration. Identify:
   - The major architectural eras: periods during which the
     codebase had a relatively coherent structure that
     subsequent changes have either preserved or replaced.
   - The transition points between eras: commits, releases, or
     periods during which the architecture changed substantially.
   - The active and inactive contributors across time, with
     particular attention to engineers whose contributions
     reflect substantial architectural authority.

2. For each era, produce:
   - A one-paragraph narrative describing the era's architectural
     approach and the problems it was solving.
   - The transition into and out of the era.
   - The portions of the current codebase that retain era-specific
     idioms or patterns.

Stage 2: Branch and tag examination.

3. Survey the branches and tags. Identify:
   - Released versions and their architectural state.
   - Long-lived branches that represent abandoned directions.
   - Recent branches that represent in-progress work.
   - The relationships between branches and the era taxonomy
     from Stage 1.

Stage 3: Dead-code and rare-path analysis.

4. Identify code regions that appear inactive: dead code that no
   call sites reach, code that exists only for legacy interfaces
   no longer used, code that is reached only in error paths or
   migration scenarios.

5. For each inactive region, propose:
   - The likely former purpose (based on commit history and
     surrounding context).
   - The current status (truly dead, latent functionality,
     migration scaffolding).
   - A recommended disposition (remove, document, retain).

Stage 4: Pattern recognition.

6. Identify the architectural patterns visible in the codebase:
   - Patterns from the named-pattern literature (e.g., Repository,
     Anti-Corruption Layer, Pipes and Filters, MVC).
   - Local patterns the team appears to use that are not in the
     named literature but recur consistently.
   - Anti-patterns or accidental complexity that the codebase has
     accumulated.

7. Note where patterns are partially or inconsistently applied —
   typically indicators of incomplete refactorings or architectural
   transitions in progress.

Stage 5: Document and decision recovery.

8. Identify the supporting documents that contemporary readers can
   consult to understand the codebase: design documents, ADRs,
   blog posts, conference talks, internal wikis (where available).

9. For each major decision visible in the history that lacks a
   contemporaneous document, propose a retrospective ADR
   (cross-reference Chapter 17's backfill mode) that captures the
   decision's rationale as the archaeological investigation has
   reconstructed it.

Stage 6: Synthesis.

10. Produce ARCHAEOLOGY_REPORT.md containing:
    - Executive summary: the codebase's major eras, the current
      architectural state, the key inheritances from prior states
      that current engineers should be aware of.
    - Era-by-era narrative.
    - Dead-code and rare-path inventory with recommended
      dispositions.
    - Pattern inventory with notes on consistency.
    - Documentation map showing what is available and what is
      missing.
    - Retrospective decision recoveries for major undocumented
      decisions.

11. Identify the highest-priority modernization opportunities, if
    the team is contemplating modernization work. The
    archaeological report informs but does not determine the
    modernization strategy; the report provides the substrate
    against which the strategy is formed.

Provenance discipline: every claim in the archaeological report
must trace to a specific artifact in the codebase or its history.
Where the artifacts do not substantiate a claim, mark with
inference notation and a sentence describing the inference's
basis. Do not fabricate history.

Abort criteria: If the codebase is too young or too small to
warrant archaeological investigation (less than a year of history,
fewer than a few hundred commits, fewer than several contributors),
note the limitation and propose a lighter-weight investigation
appropriate to the scale.
```

The worked restoration applies the prompt to the Agicore parser's evolution across the most recent twenty months of development. The parser has accumulated approximately three thousand commits across that period, with contributions from a small number of engineers (including Christopher as the primary author) and a clear evolution from an initial implementation focused on a small subset of declaration types to the current implementation supporting the full set of thirty-four declaration types with the complete IFPUG-equivalent specification coverage. The prompt's output is an archaeological report identifying four distinct architectural eras: the initial single-pass parser era (first three months), the recursive-descent reorganization era (months four through eight), the AI-service multi-provider integration era (months nine through fourteen), and the current era of compiler-integration and codegen maturity (months fifteen through twenty). For each era, the report identifies the problem the era was solving, the architectural approach the parser took to solve it, the transition into the next era, and the portions of the current code that retain era-specific idioms.

The dead-code analysis identifies seven regions of inactive code, totaling approximately four hundred lines. Three regions are confirmed dead (artifacts of an early validation approach that was replaced by the current contract-based validation in era three); three are migration scaffolding (still reachable but used only during the rare upgrade-path execution that exists for backward compatibility); one is latent functionality (a feature that was implemented but never exposed in the public API and might warrant either exposure or removal). The pattern inventory identifies the parser's overall pattern as a recursive-descent with extensions, identifies the AI-service multi-provider abstraction as an Anti-Corruption Layer in Evans's terms, and identifies a partial Visitor pattern in the type-checking pass that is consistently applied in some areas and inconsistently in others (a likely indicator of an incomplete refactoring from era three). The documentation map shows that the era-one and era-two work has reasonably complete contemporaneous documentation; the era-three work has partial documentation (the AI-service integration was discussed in design documents but no ADRs were written); the era-four work is well-documented because the team has been applying the disciplines this book restores.

The retrospective ADR recoveries — produced by chaining Chapter 17's backfill mode through this chapter's archaeological output — generate seven proposed ADRs for the undocumented era-three decisions: the choice of multi-provider abstraction architecture, the decision to support specific providers in specific orders, the model-picker UI integration approach, and several smaller decisions. The engineer reviews and finalizes the retrospective ADRs across approximately two hours, producing a documentation set that approximates what would have existed if the team had been practicing ADR discipline during era three. The retrospective documentation has lower fidelity than at-the-moment documentation would have had, but it is substantially more useful than the absence that previously characterized that period.

The work, from initial history survey through the synthesized archaeological report and retrospective ADRs, takes approximately eight hours of AI runtime plus five hours of engineer review. The same archaeological investigation performed by a senior consultant in the conventional way would have taken several engineer-weeks of dedicated work, with the consultant's output of comparable depth to the AI's output. The cost reduction is approximately an order of magnitude; the engineer review component is what remains, and the engineer review is what produces the operational judgments that the archaeological work informs.

A note on the broader implications of the archaeological restoration is appropriate. The discipline has historically been practiced primarily on inherited legacy systems by external consultants; the AI restoration makes the discipline practicable on *current* codebases by the *teams that own them*, as a periodic activity rather than a crisis-driven one. A team that performs an archaeological investigation of its own codebase every twelve months produces, as a byproduct, the documentation that would otherwise have to be reconstructed from scratch when the team transitions or when modernization becomes necessary. The discipline becomes preventive rather than remedial. The codebase accumulates a documentation layer that is current at the time of each investigation and that captures the architectural state in terms a future engineer can use. The restoration is therefore not only of the discipline as a consulting activity but of the discipline as a continuous ownership practice.

Part IV closes with this chapter. The five knowledge-and-documentation disciplines — Literate Programming (Chapter 15), the Ubiquitous Language (Chapter 16), Architecture Decision Records (Chapter 17), Requirements Traceability (Chapter 18), and Process Archaeology (Chapter 19) — constitute a coordinated knowledge architecture for software. The cluster's internal logic is that each discipline addresses a different scale and a different temporal dimension of what an engineering organization knows about its software: literate programming at the module scale (what does this code do); the Ubiquitous Language at the vocabulary scale (what do we call things); ADRs at the decision scale (why did we choose this); traceability at the structural scale (what implements what); archaeology at the historical scale (how did we get here). A team that practices the full cluster has, in aggregate, a documentation discipline that the field has rarely sustained for any system across its lifetime. The combined cost of practicing the full cluster, at the AI-restored level of effort, is approximately ten to fifteen percent of overall engineering effort — within range of what most organizations can sustain, where the historical cost was many times that and could not be sustained outside organizations with dedicated documentation programs.

Part V turns to a different aspect of the engineering practice: how software is composed, assembled, and reused. Brad Cox's Software IC, Beck and Cunningham's CRC Cards, Kiczales's Aspect-Oriented Programming, the knowledge-graph traditions of code representation, and Dan North's Behavior-Driven Development each address a different dimension of the composition problem. Each was hampered by an effort tax that AI is now in a position to substantially reduce. The disciplines accumulate. The restoration program continues.
