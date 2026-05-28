In November of 2011 Michael Nygard published a blog post titled *Documenting Architecture Decisions* on his personal site. The post was approximately a thousand words long, was illustrated with a single example, and proposed a simple format: a short document, one per significant architectural decision, with four sections — Title, Status, Context, Decision, Consequences — written at the time the decision was made and retained for the duration of the system's life. Nygard called the documents *Architecture Decision Records* (ADRs). The post was not the first proposal of decision-recording in software architecture; the broader software-architecture community had been advocating something like it for at least two decades through the work of Philippe Kruchten and others on architectural-knowledge management. The post was, however, the document that found the practitioner audience. ADRs became, across the following decade, a broadly recognized practice in software engineering, with widespread adoption in language and unevenly sustained adoption in implementation. Almost every contemporary engineer recognizes the concept; a much smaller proportion has practiced it consistently across the lifetime of a real system.

The empirical case for ADRs is straightforward and rests on the basic observation that software systems accumulate architectural decisions across their lifetimes and that the rationale for those decisions tends to evaporate as the personnel who made them transition off the project. Engineers joining a new codebase routinely encounter architectural choices whose motivation is opaque and whose re-litigation is correspondingly tempting: the current architecture is suboptimal in some specific way the new engineer perceives clearly; the engineer proposes a change; the team rejects the change because of considerations the new engineer did not know about; the engineer perceives the rejection as arbitrary; the cycle repeats. ADRs solve this problem by *preserving* the considerations that informed the original decision in a form that subsequent engineers can read. The case studies that have measured ADR-disciplined teams report meaningful reductions in re-litigation cycles, faster onboarding for new engineers, and reductions in architectural drift caused by uninformed local optimizations. Spotify, ThoughtWorks, and the broader ADR-adopting community have published case studies in the practitioner literature; the pattern across them is consistent.

What kept ADRs from being more consistently practiced across the industry is the *synthesis tax*. The synthesis tax has a specific structure that warrants careful examination because the structure is what makes the AI restoration of ADRs among the most directly mechanistic in this book. Writing an ADR after a decision has been made requires the engineer to *synthesize*, from the discussion that led to the decision, a one-page document covering the Context, the Decision, and the Consequences. The synthesis requires the engineer to remember the discussion, recall the considerations that were raised and rejected, articulate the rationale for the choice that was made, and project forward to the consequences the choice will have on future development. The synthesis is real intellectual work. The synthesis is also performed at the *worst possible moment* in the engineering workflow — after the decision is made, when the team has already moved on to implementation, when the engineer's attention has shifted to the next problem, when the activation energy to write the document feels disproportionate to the marginal value of recording a decision that the team already understands. The decision is fresh; the writing feels stale; the engineer skips it.

The systematic failure to write ADRs at the moment of decision compounds in a specific way: subsequent decisions that depend on the unrecorded original become harder to record because their context references decisions whose own context was never recorded. The ADR repository, where it exists, becomes a thin layer of recorded decisions over a thick substrate of unrecorded ones. New engineers reading the repository encounter ADRs whose Context sections refer to "the architecture established in our prior discussions" or "the trade-offs we decided to accept" — references to decisions whose own ADRs were never written. The recorded layer becomes meaningfully less useful than it should be because the substrate it depends on is missing. The discipline's value, like the Ubiquitous Language's value, depends on completeness; incomplete ADR practice produces an unreliable knowledge base that the team eventually stops consulting.

What AI changes about ADRs is the synthesis component, with consequent effects on the discipline's adoption. The synthesis is *exactly the kind of work AI performs faithfully when the source material exists*. The source material — the PR discussion that led to the decision, the design document that informed it, the comments in the issue tracker, the related ADRs that preceded it, the commit messages that implemented it — is typically present in the team's tooling, even when the ADR itself is not written. AI can read the source material, identify the decision, synthesize the Context-Decision-Consequences structure, and produce a draft ADR that the engineer reviews and merges. The synthesis work that historically required the engineer's activation energy at the wrong moment in the workflow becomes a draft that the engineer evaluates rather than originates. The activation energy collapses to the threshold of review rather than the threshold of creation. The discipline becomes sustainable because its sustainment no longer requires the engineer to perform the synthesis at the moment the synthesis feels least rewarding.

The operational prompt for an AI-driven ADR synthesis is therefore a synthesis prompt that operates on existing engineering artifacts:

```
You are synthesizing an Architecture Decision Record from the supplied
engineering artifacts per Michael Nygard's 2011 format. The output is
a one-page ADR ready for engineer review and merge into the team's ADR
repository.

Stage 1: Decision identification.

For the supplied artifacts (a PR, a design document, a related issue,
a meeting transcript, or any combination):

1. Identify the decision being made. A decision in the Nygard sense
   is an architecturally significant choice — a choice that affects
   the system's structure, technology stack, integration patterns,
   or other properties that subsequent engineers will need to
   understand. Not every PR contains a decision worth recording;
   only those that introduce or modify architectural commitments.

2. Identify the alternatives that were considered. The Context
   section of the ADR will describe the problem and the alternative
   approaches; if no alternatives are visible in the source
   artifacts, surface this and prompt the engineer for the
   alternatives that were discussed.

3. Identify the rationale for the chosen alternative. The rationale
   is typically present in the PR discussion, the design document's
   trade-off analysis, or the comments in the issue tracker.

4. Identify the consequences — both intended and incidental — that
   the choice produces. The intended consequences are usually
   articulated in the decision rationale; the incidental
   consequences (technical-debt accumulation, future-flexibility
   reduction, downstream-dependency changes) often require
   inference from the choice's structure.

Stage 2: Draft synthesis.

5. Produce the draft ADR with the four standard sections:

   - Title: a short noun phrase naming the decision.
   - Status: Proposed, Accepted, Deprecated, or Superseded.
   - Context: the problem being solved, the constraints in play,
     the alternatives considered. The Context should be readable
     by an engineer joining the project a year later who is trying
     to understand why this decision was made.
   - Decision: the choice that was made, expressed concisely.
   - Consequences: the implications of the decision, both
     intended and incidental.

6. The total ADR should be one page (approximately five hundred
   words). Brevity is part of the format's value; ADRs longer than
   one page are less likely to be read by subsequent engineers.

7. Cite the source artifacts in a Sources section appended to the
   ADR. The reader who wants to understand the discussion behind
   the decision can follow the citations.

Stage 3: Review.

8. Surface the draft for engineer review. The engineer:
   - Verifies the decision is correctly identified.
   - Refines the Context if the alternatives are incomplete.
   - Confirms the Consequences accurately project the decision's
     implications.
   - Sets the Status (typically Accepted for a decision being
     recorded after the fact).
   - Assigns the ADR's number per the team's numbering convention.

9. The final ADR is committed to the team's ADR repository in the
   standard location (typically docs/adr/ or similar).

Stage 4: Backfill mode (optional).

10. For projects with existing architectural decisions that were
    never recorded, the prompt can operate in backfill mode: scan
    the commit history for architecturally significant changes,
    propose ADRs for each, and produce the backfilled records.
    Backfilled ADRs include explicit notation that they are
    retrospective syntheses produced after the fact rather than at
    the moment of decision.

Provenance discipline: every claim in the ADR must trace to a
specific source artifact. Where the source artifacts do not
substantiate a claim (e.g., a rationale that was discussed in a
meeting that produced no written record), mark with TODO and prompt
the engineer for the missing information.

Abort criteria: If the supplied artifacts do not contain enough
material to substantiate an ADR (e.g., a PR that simply implements
a previously-decided design with no architectural choice exposed),
note that the artifacts do not warrant an ADR and decline to
fabricate one. Not every PR is architecturally significant; the
discipline's value depends on the records being meaningful.
```

The worked restoration applies the prompt to the six architectural decisions that the Agicore Studio team has explicitly numbered AD-1 through AD-6 in its project plan but for which no formal ADRs have yet been written. The six decisions span the Studio's foundational architectural choices: the Tauri-versus-Electron framework choice; the React-Flow-versus-custom-canvas choice for the workflow editor; the CodeMirror-versus-Monaco choice for the text editor; the two-way text↔canvas binding architecture; the local-first storage model; and the AI-provider abstraction layer. For each decision, the prompt is given the relevant source artifacts: the design discussions in the PROJECT_PLAN.md, the PR threads in which the decisions were first implemented, the commit messages that documented the implementations, and the architectural context the surrounding documentation provides. The prompt produces six draft ADRs, each one page, each citing its source artifacts.

The engineer review takes approximately three hours across the six ADRs. Of the proposed Context sections, the engineer accepts four and refines two (adding context about specific constraints that the source artifacts did not surface explicitly). Of the proposed Decisions, the engineer accepts all six (the decisions themselves are clearly identified in the source artifacts). Of the proposed Consequences sections, the engineer accepts three, refines two (adding incidental consequences that have become apparent in the time since the decision was made), and substantially rewrites one (the AI-provider abstraction layer's consequences are richer than the original PR discussion captured, because the team has learned more about the abstraction's implications across the subsequent implementation). The six finalized ADRs are committed to docs/adr/ as the foundational ADR set for the Studio project. The work, including the engineer review and refinement, takes approximately four hours total — substantially less than the same six ADRs would have taken if written from scratch at the moments of original decision, and producing records that are more accurate than the original-moment records would have been because they include the subsequent-experience context that the original-moment records could not have anticipated.

A subtle implication of the AI-restored ADR practice is worth surfacing. The traditional ADR discipline asked engineers to write the records *at the moment of decision*, on the argument that the rationale is freshest then. The AI restoration changes this calculus: writing ADRs at the moment of decision becomes less important when the synthesis can be performed equally well at any point in the project's lifetime where the source artifacts remain available. The team can adopt a *backfill cadence* — synthesizing ADRs from PR streams on a weekly or sprint cadence — without losing the discipline's value. The cadence is more sustainable than the at-moment-of-decision discipline because it batches the engineer review work into a predictable cadence rather than scattering it across the workflow. Some teams may choose the at-moment-of-decision discipline; others may choose the backfill cadence; both produce the same records; the choice can be made on workflow grounds rather than on the assumption that only the at-moment discipline produces accurate records.

A note on the relationship between ADRs and the Ubiquitous Language of Chapter 16. ADRs are decisions; the Ubiquitous Language is the vocabulary. An ADR is most useful when its language participates in the Ubiquitous Language — when the Context section uses the team's canonical terms for the concepts it references, when the Decision section names the architectural elements by their canonical identifiers, when the Consequences section refers to other ADRs and other architectural elements in the team's shared vocabulary. The two disciplines reinforce each other: a well-maintained Ubiquitous Language makes ADRs more readable; a well-maintained ADR repository makes the Ubiquitous Language more grounded in concrete decisions. Both are restored in this part of the book; both benefit from each other; both become operational as a coordinated practice.

The chapter that follows turns to a discipline that operates at a different scale: Requirements Traceability, the practice of maintaining a graph from each requirement through the design that implements it to the code that realizes it and the tests that verify it. The discipline has been sustained in safety-critical industries because regulation requires it; AI makes the discipline practicable in the broader engineering context where regulation does not require it but the engineering value remains.
