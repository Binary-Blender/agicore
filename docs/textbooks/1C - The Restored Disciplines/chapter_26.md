Fred Brooks's *The Mythical Man-Month*, published in 1975 and revised in 1995, contains a chapter — *Aristocracy, Democracy, and System Design* — that develops what Brooks considered the single most important attribute of a successful software system: *conceptual integrity*. Brooks's argument was direct. A system has conceptual integrity when its design, in all its parts, seems to flow from a single mind — when its abstractions are consistent across all of its modules, when its naming conventions are coherent across all of its interfaces, when its error-handling patterns are applied uniformly, when its idiomatic patterns are recognizable as the same idiom regardless of which part of the system one is reading. Systems with conceptual integrity, Brooks argued, are easier to learn, easier to use, easier to extend, and longer-lived than systems without it. The historical record bears him out: Unix, TeX, the original Lisp Machine operating system, Smalltalk, Plan 9, and a small number of other systems that achieved conceptual integrity have shown decade-scale longevity and continued architectural relevance, while systems that lacked it have accumulated complexity and required eventual replacement.

Brooks's argument for *how* to achieve conceptual integrity was contentious in its time and remains so. He argued that conceptual integrity requires either a single mind (a chief architect who designs the entire system and whose authority over the design is unchallenged within the implementing team) or a brutal architectural review discipline in which an empowered review board enforces consistency across all contributions from all engineers. The first option — the chief architect — is what Brooks called the *aristocratic* approach and was the approach he advocated. The second option — the empowered review board — is what he called the *democratic* approach and was the approach he considered substantially less effective but acknowledged as sometimes necessary in organizations that could not produce a chief architect of the required authority and ability. The third option — letting individual engineers contribute without central architectural control — Brooks considered the *anarchic* approach and predicted would produce systems without conceptual integrity. The prediction has been empirically validated repeatedly.

The empirical case for conceptual integrity is structural rather than experimental. The case rests on the observation that systems that achieve it are recognized as such by the engineers who work on them and by the engineers who study them; systems that lack it are recognized as such by their accumulating maintenance debt and the difficulty of onboarding new engineers. The recognition is not always immediate or universal, but the pattern is consistent enough across decades of software development to be reasonably treated as established. Eric Raymond's *The Art of Unix Programming* (2003) documents the Unix tradition's commitment to conceptual integrity through a series of design principles (the "Rule of X" enumerations) that the Unix culture sustained across multiple generations. Knuth's *TeX: The Program* (1986) is the literate-programming demonstration of a system with conceptual integrity authored by a single mind across a multi-year effort. The Lisp Machine operating system's history, documented in retrospective practitioner literature, shows the consequences of integrity loss as the system aged and the originating team dispersed.

The effort tax on conceptual integrity is *the architectural review tax*, and it has been the binding constraint on multi-author conceptual-integrity programs throughout the field's history. Brooks's aristocratic approach — a chief architect with unchallenged authority — produces conceptual integrity by concentrating the design judgment in a single mind, with the cost that the chief architect becomes a scaling bottleneck and a single point of failure for the project's architectural direction. The democratic approach — an empowered review board — produces conceptual integrity by enforcing consistency through review, with the cost that the review board itself must perform the design judgment that the chief architect would have performed, but distributed across multiple reviewers who must coordinate. Both approaches have substantial human costs; both approaches are expensive in senior engineering time; both approaches have been sustained only in organizations whose project's value justified the architectural investment. Most software projects, most of the time, default to the anarchic approach not by choice but because they cannot afford either of the alternatives. The conceptual integrity is lost; the maintenance debt accumulates; the project's longevity is shortened.

What AI changes about conceptual integrity is the architectural review tax in particular, with effects that warrant careful articulation because the change is partial rather than total. The architectural-review work has two components: the *consistency-checking* component, in which a contribution is examined against the existing system's conventions to identify deviations; and the *consistency-judgment* component, in which a senior engineer decides whether a deviation is a genuine inconsistency that should be corrected or an intentional improvement that should be propagated. The consistency-checking component is mechanical: identify the system's conventions; identify the contribution's choices; compare. The consistency-judgment component is human: the team's architectural priorities, the trade-offs being made, the trajectory of the system's design. AI eliminates the consistency-checking tax almost entirely; AI does not eliminate the consistency-judgment tax. The combined effect is that the human review work shifts from doing both components to doing only the second, with the first delivered by AI as a continuous comparison artifact.

The shift is consequential because the consistency-checking work has been the dominant time cost on architectural review. A reviewer presented with a pull request who must determine whether the contribution is consistent with the existing system's conventions must hold the conventions in mind, examine the contribution against them, and identify deviations. The work is tedious; the work is error-prone (reviewers miss deviations they would have caught with fresh attention); the work scales poorly as the system grows. AI performs the consistency check exhaustively in seconds, surfaces the deviations, and presents them to the reviewer for judgment. The reviewer's time is concentrated on the judgment work that requires human input — does this deviation warrant correction or propagation? — and is no longer consumed by the mechanical comparison work that AI handles. The review tax drops by approximately an order of magnitude in terms of senior-reviewer time per contribution. The democratic approach becomes affordable at scales it was not affordable at before.

The operational prompt for an AI-driven conceptual-integrity workflow operates on a codebase and a proposed contribution, producing a consistency report that focuses senior reviewer attention on the judgment calls:

```
You are surveying the supplied codebase for conceptual integrity and
evaluating the supplied contribution against the codebase's
established conventions. The output is a consistency report that
distinguishes mechanical conformance issues from judgment-level
architectural choices.

Stage 1: Convention extraction.

For the supplied codebase:

1. Identify the codebase's established conventions across multiple
   dimensions:
   - Naming conventions: identifier styles, naming patterns for
     specific role classes (e.g., service classes named
     "FooService", repositories named "FooRepository").
   - Error-handling patterns: how errors are propagated, how
     they are logged, how user-facing errors are constructed.
   - Abstraction-level conventions: when interfaces are
     introduced, when implementation classes are exposed, when
     factories are used.
   - Idiomatic patterns: the team's preferred ways of expressing
     common constructs (iteration patterns, async patterns,
     state-management patterns).
   - Module-organization conventions: directory structure, file
     organization, dependency-direction conventions.
   - Documentation conventions: comment styles, docstring
     formats, README structures.

2. The conventions are *observed* rather than *prescribed* — they
   are the patterns that the existing code exhibits, regardless of
   whether the team has written them down. Surfacing the
   conventions is itself often valuable, because teams frequently
   have unwritten conventions they have not consciously
   articulated.

Stage 2: Contribution evaluation.

3. For the supplied contribution (a PR, a proposed change, a new
   module):

4. Compare against each established convention:
   - Conforming choices: where the contribution follows the
     established convention.
   - Deviations: where the contribution diverges from the
     established convention.

5. For each deviation, classify:
   - Mechanical inconsistency: the deviation appears to be an
     oversight or unfamiliarity with the convention; correction
     is recommended.
   - Architectural choice: the deviation appears intentional and
     may represent a proposed improvement to the convention; the
     reviewer must judge whether to accept the deviation as a new
     pattern or to require conformance to the existing pattern.
   - Necessary divergence: the deviation is required by the
     contribution's specific context (e.g., a different language,
     a different platform, a different integration constraint);
     the deviation should be accepted but documented.

Stage 3: System-level integrity assessment.

6. For the codebase as a whole, identify integrity hazards:
   - Conventions that are inconsistently applied across the
     existing codebase (suggesting the convention is contested
     or the team has not aligned).
   - Recent contributions that have established patterns the
     existing codebase had not exhibited (suggesting drift in
     the conventions).
   - Modules whose internal conventions differ from the broader
     codebase (potentially warranted if the modules represent
     bounded contexts; potentially problematic if the modules
     are not architecturally separated).

Stage 4: Output.

7. Produce CONCEPTUAL_INTEGRITY_REPORT.md containing:
   - The conventions extracted from the codebase.
   - The contribution evaluation with conformance/deviation
     classifications.
   - The system-level integrity hazards.
   - Recommendations for the contribution (accept as-is, accept
     with corrections, request architectural review).

8. For per-PR analysis, the report is produced as part of the PR
   review process; for system-level integrity surveys, the report
   is produced on a cadence (typically monthly or quarterly).

Provenance discipline: every convention claim must cite the code
locations from which the convention was extracted. Every deviation
claim must cite both the convention and the divergent code. Every
classification must explain the reasoning.

Abort criteria: If the codebase is too small or too inconsistent to
have meaningful conventions, note this and propose a
convention-establishment phase before integrity review becomes
useful. If the contribution is a foundational change that
deliberately revises conventions, recognize that the integrity
analysis applies to the post-change system rather than to the
pre-change system, and frame the report accordingly.
```

The worked restoration applies the prompt to the Agicore parser as a system-level integrity survey, with a particular focus on contributions added across the most recent six months. The convention extraction identifies twenty-eight established conventions across the dimensions the prompt names. The contribution evaluation across the six-month window identifies approximately forty deviations across eighty contributions, of which the prompt classifies thirty as mechanical inconsistencies, eight as architectural choices warranting review, and two as necessary divergences. The system-level integrity assessment identifies three integrity hazards: an inconsistency in the error-handling pattern between the older modules and the modules added during the recent multi-model AI service work; a documentation-style drift in which the newest modules use a different docstring format from the established codebase; and a module that has begun establishing its own internal conventions that differ from the broader codebase, raising the question of whether the module is becoming a bounded context warranting the separation or whether the divergence is unintended drift.

The engineer review takes approximately five hours across the contribution evaluations and the system-level assessment. Twenty-six of the thirty mechanical inconsistencies are corrected through small follow-up PRs. The eight architectural choices are discussed in an architectural-review meeting; five are accepted as proposed improvements (with the conventions updated to match); three are reverted to the established convention. The error-handling inconsistency is identified as a real concern; a small project is scheduled to bring the older modules into consistency with the newer pattern. The documentation-style drift is recognized as an oversight in the newer modules; the format is brought back to the established convention. The bounded-context question is discussed and resolved in favor of treating the divergent module as a legitimate sub-context, with appropriate documentation.

A note on the discipline's broader implications. Brooks's argument for conceptual integrity has been recognized as correct for decades and has been only intermittently practiced because the cost of either of his recommended approaches has been substantial. The AI-restored version makes the *democratic* approach affordable at scales it was not affordable at before, by eliminating the mechanical-comparison component of architectural review and concentrating human judgment on the architectural questions that require it. The aristocratic approach — a chief architect — remains valuable where the organization can produce one, and AI does not replace the chief architect's design judgment. What AI does is bring the democratic approach within reach of organizations that cannot sustain a chief architect, allowing those organizations to achieve conceptual integrity at the cost of distributed-review effort that is now substantially smaller than it has historically been.

The chapter that follows closes the restoration program by synthesizing the restored disciplines into a coherent practice. The disciplines, taken individually, are each restorations of historical practices. The disciplines, taken collectively, produce a way of working that the field has rarely sustained for any system over its lifetime. The synthesis is what makes the portfolio operational.
