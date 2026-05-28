Dan North published *Introducing BDD* in *Better Software* magazine in 2006, naming and codifying a methodology he had been developing across the preceding years through his consulting work and his collaborations within the agile-testing community. The methodology — Behavior-Driven Development — was framed as a refinement of Test-Driven Development that addressed a specific gap North had identified in TDD practice: TDD told engineers to write tests before code but provided no guidance on *what to test* or *how to express what was being tested*. North's proposal was that tests should describe *behavior* — what the system does — in a vocabulary the system's users would recognize, with the express commitment that the resulting test cases would be readable by both technical and non-technical stakeholders. The vocabulary North proposed was the *Given-When-Then* structure: given some context, when an action occurs, then a stated outcome follows. The structure was simple, easy to teach, and produced test cases that read as scenarios rather than as engineering artifacts.

The Gherkin language and the Cucumber tooling — developed by Aslak Hellesøy and others in the years following North's article — operationalized the Given-When-Then structure as a syntax that test runners could execute. A `.feature` file in Gherkin contains scenarios written in the Given-When-Then form, with each step backed by a glue-code function in the host programming language. The test runner reads the feature file, matches each step against the glue code, and executes the test by invoking the glue code in sequence. The result is a test suite that *reads as documentation*, can be reviewed by non-technical stakeholders, and produces executable verification of the behaviors it describes. The Cucumber tool family expanded across multiple host languages (Ruby, Java, JavaScript, Python, C#, and others); SpecFlow brought equivalent capabilities to the .NET ecosystem; the broader BDD community produced books (Adzic's 2011 *Specification by Example* is the most thorough), conferences, and a substantial body of practitioner literature.

The empirical experience with BDD across the seventeen years since North's article is among the most striking patterns in this book. The methodology has been adopted in *language* almost universally — engineers across the industry recognize the Given-When-Then structure, the term "feature file," the concept of executable specifications, and the broader BDD vocabulary. The methodology has been sustained in *practice* in a much smaller fraction of organizations. Surveys of BDD-claiming teams have repeatedly found that the actual practice has often degenerated to one of three patterns: feature files that are written at the beginning of a project and never updated; feature files that are maintained but that have drifted from the actual code behavior over time; or feature files that exist as a thin layer over what are actually conventional unit tests, with the Given-When-Then form imposed on tests whose substance has nothing to do with user-facing behavior. The methodology's adoption has been broad; the methodology's sustained practice has been narrow.

The cause of the degradation is the *Gherkin maintenance tax*, which has a structure worth examining specifically. A Gherkin scenario describes a behavior at the user-facing level. The behavior is implemented by code that may evolve substantially over the system's life. Each evolution of the code potentially changes the behavior the scenario describes; each change therefore requires the scenario to be re-examined, potentially rewritten, and re-verified against the new code. The re-examination is real work. The work is typically performed by the engineer who modified the code, who may not be the original author of the scenarios and may not understand the user-facing context that motivated the scenarios. The result is a recurring pattern: the engineer modifies the code, runs the test suite, finds that scenarios fail, modifies the scenarios to make them pass (with limited attention to whether the modified scenarios still describe the intended behavior), and merges the change. The scenarios drift from genuine behavioral specifications to passing-test artifacts; the discipline's central commitment — that scenarios are readable specifications — degrades; the methodology becomes a thin layer over conventional testing.

A second component of the maintenance tax is the *scenario-generation tax*. Producing scenarios that cover the system's behavior comprehensively requires sustained product-and-engineering collaboration: identifying the user-facing behaviors that warrant scenarios, framing them in the Given-When-Then form, ensuring the coverage is adequate without being redundant. The collaboration is time-intensive and historically has competed with feature-development priorities. Most BDD-claiming teams have written scenarios for the most prominent behaviors at the project's outset and have generated scenarios for new features inconsistently afterward. The coverage gap accumulates; the methodology's documentation claim degrades; the tests that exist do not describe the behaviors that have been added since the scenario-generation effort lapsed.

What AI changes about both components of the maintenance tax is direct, and the change warrants careful articulation because BDD's restoration depends on it. The maintenance component is reduced by AI's capacity to continuously compare scenarios against code behavior and to surface drift in either direction. An AI integrated into the development workflow can detect when a scenario describes behavior the code no longer exhibits (the scenario has drifted or the code has changed), propose either a scenario update or a code revision, and surface the choice for engineer review. The maintenance work that historically required engineers to re-examine scenarios at the moment of code change becomes a continuous drift-detection mechanism with engineer review on a cadence. The generation component is reduced by AI's capacity to generate scenarios from observed behavior — from production telemetry (cross-referencing Chapter 13's operational profiles), from the existing test suite, from the user-facing documentation, from the code itself. The scenarios AI generates are not always exactly what a human-led BDD effort would produce; the scenarios are reviewable, refinable, and good enough as starting points to make BDD coverage practically sustainable rather than aspirationally invoked.

The operational prompt for an AI-driven BDD workflow operates on a codebase with existing or aspirational BDD practice and produces both the scenario maintenance and the scenario generation:

```
You are maintaining and extending the BDD scenario coverage for the
supplied codebase per the methodology Dan North described in 2006
and the Cucumber/SpecFlow tooling that operationalizes it. The
output is the current scenario suite, the drift report, and the
proposed scenario additions.

Stage 1: Scenario inventory.

For the supplied codebase:

1. Identify the existing .feature files and the scenarios they
   contain.

2. Identify the glue code that implements the scenario steps.

3. Surface the inventory with a coverage summary: which features
   have scenarios, which lack scenarios, which scenarios appear
   to be passing-test artifacts rather than genuine behavioral
   specifications.

Stage 2: Drift detection.

4. For each existing scenario, compare the scenario's described
   behavior against the current code:
   - Does the code still exhibit the described behavior under the
     described conditions?
   - Does the scenario's Given setup correspond to a real
     achievable initial state?
   - Does the When action correspond to a real user-facing
     action?
   - Does the Then outcome correspond to what the code actually
     produces?

5. Classify drift cases:
   - Scenario obsolete: the described behavior is no longer
     present; the scenario should be removed.
   - Scenario stale: the behavior has evolved; the scenario
     should be updated to reflect the new behavior.
   - Implementation regression: the scenario describes intended
     behavior the code no longer satisfies; this is a bug.
   - False positive: the scenario passes but tests something
     other than what its Given-When-Then states.

Stage 3: Scenario generation.

6. For uncovered behaviors, propose new scenarios:
   - Derive candidate scenarios from production telemetry per
     Chapter 13's operational profile (the user-facing actions
     that occur in production deserve scenarios in proportion
     to their frequency).
   - Derive candidate scenarios from existing tests that lack
     BDD form but exercise real user-facing behaviors.
   - Derive candidate scenarios from the user-facing
     documentation (the documented behaviors warrant scenarios).

7. Each proposed scenario:
   - Names the behavior in plain English.
   - Expresses Given-When-Then in language a non-technical
     stakeholder could read.
   - Cites the source from which the scenario was derived.
   - Notes the glue code that would need to be written to
     execute the scenario (or the existing glue code that
     can be reused).

Stage 4: Review and synthesis.

8. Surface the drift report and the scenario proposals for
   engineer review. The drift report's findings are typically
   actionable directly; the scenario proposals warrant a
   product-and-engineering conversation about coverage priorities.

9. Produce BDD_REPORT.md containing the inventory, the drift
   report, the scenario proposals, and the recommended actions.

Provenance discipline: every drift claim must cite the specific
scenario and the specific code that establishes the mismatch.
Every proposed scenario must cite the source it derives from.
Scenarios cannot be invented without evidentiary basis.

Abort criteria: If the codebase has no existing BDD practice and
the team has not committed to adopting BDD, do not produce
scenarios that would create unmaintained debt. Propose a
foundational BDD coverage of the most prominent user-facing
behaviors as a starting commitment, with explicit notation that
the practice requires sustained engagement to be valuable.
```

The worked restoration applies the prompt to the Agicore Studio's user-facing features, which have an existing partial BDD suite covering approximately forty percent of the user-facing behaviors. The inventory surfaces twenty-six existing scenarios across eight feature files. The drift detection identifies four scenarios that are passing-test artifacts (the Given-When-Then form has been imposed on tests whose substance is implementation-level rather than behavior-level); three scenarios that are stale (the described behavior has evolved since the scenarios were written); one scenario that surfaces an implementation regression (the described behavior is correct but the code no longer satisfies it — a bug that has been latent in the production build); and eighteen scenarios that are accurate behavioral specifications still aligned with current code.

The scenario-generation analysis proposes twenty-three new scenarios spanning the user-facing behaviors not currently covered. The proposals are derived from a combination of the Studio's existing test suite (whose unit tests cover behaviors the BDD suite does not), the user-facing documentation in `docs/`, and a sample of production telemetry from the Studio's beta deployment. The proposed scenarios are organized by feature area and ranked by behavior frequency in the telemetry data, so the engineer review can prioritize the highest-yield coverage additions.

The engineer review takes approximately four hours across the drift findings and the scenario proposals. The implementation regression is fixed in a separate PR. The stale scenarios are updated to reflect current behavior. The passing-test-artifact scenarios are restructured to reflect their actual substance (either rewriting them as genuine behavioral specifications or moving them from the BDD suite to the conventional test suite where they belong). Fourteen of the twenty-three proposed new scenarios are accepted and implemented in the following sprint; nine are deferred for product-level review of whether they describe behaviors the team wants to commit to maintaining. The Studio's BDD coverage rises from approximately forty percent of user-facing behaviors to approximately seventy percent within the sprint; the maintenance protocol is established for continuous AI-mediated drift detection on subsequent code changes.

A note on BDD's relationship to operational profiles (Chapter 13) is worth surfacing. The operational profile provides the *empirical weighting* that BDD has historically lacked: scenarios should be written and maintained for behaviors users actually exercise; coverage of behaviors users rarely exercise is lower-yield investment. The combination of BDD's user-facing-behavior frame with the operational profile's frequency weighting produces a coverage strategy that allocates scenario investment to the behaviors that most affect users. The two disciplines together produce a test-and-specification practice that is both *expressive of user-facing intent* (BDD) and *proportioned to user-facing reality* (operational profiles). Each discipline strengthens the other.

Part V closes with this chapter. The five disciplines — the Software IC (Chapter 20), CRC Cards (Chapter 21), Aspect-Oriented Programming (Chapter 22), Knowledge Graphs and Semantic Tagging (Chapter 23), and Behavior-Driven Development (Chapter 24) — constitute the architecture-and-reuse cluster of the book's restoration program. The cluster's internal logic spans the design spectrum from component composition (the Software IC) through class design (CRC Cards) through cross-cutting modularization (AOP) through code representation (knowledge graphs) through behavior specification (BDD). A team that practices the full cluster has a design-and-reuse practice that operates at every level of the system's composition, with the disciplines composing rather than competing.

Part VI turns to the synthesis: how a working engineering team in 2026 assembles the restored disciplines into a coherent practice, what their week looks like, how the operational prompts compose into a daily workflow, and what trajectory the restoration program implies for the disciplines beyond those covered in the present volume.
