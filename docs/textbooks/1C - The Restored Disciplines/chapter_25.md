The mainstream tooling for software-testing coverage measures code coverage: which lines, which branches, which conditions in the source code are exercised by the test suite. The measurement is well-defined, mechanically computable by widely-available instrumentation, and routinely used as a quality gate in modern development pipelines. The measurement is also, by itself, a poor proxy for what most engineers and most stakeholders actually want to know about a test suite, which is *whether the features users care about are exercised by tests that would catch regressions in them*. A test suite with ninety-five percent line coverage can have substantial gaps in feature coverage, because the lines exercised may be the structural scaffolding while the lines that implement user-facing behavior may be exercised only through paths that the tests do not really verify. Conversely, a test suite with sixty percent line coverage may have full coverage of user-facing features if the uncovered lines are error paths, defensive checks, or legacy code retained for backward compatibility that nobody uses. Line coverage measures one thing; feature coverage measures another; the two correlate weakly enough that line coverage alone provides limited assurance about feature-level confidence.

The discipline of *feature coverage mapping* — explicitly maintaining the mapping between tests and the features they cover — has been intermittently advocated in the software-engineering literature since the 1970s. The requirements-traceability work of Chapter 18 is, in one sense, an upstream version of feature coverage mapping: the matrix that connects requirements to verification elements is the artifact that names which tests verify which requirements. The disciplines diverge in their scale: requirements traceability operates at the requirement granularity (which may be very fine-grained or moderately coarse-grained, depending on the requirements document); feature coverage mapping operates at the *user-perceived feature* granularity, which is typically coarser than line or branch granularity and finer than requirement granularity. The two disciplines are complementary; an organization that practices both has, at the feature level, a clearer picture of test confidence than either practiced alone would provide.

The historical attempts at feature coverage mapping have included requirements-based testing approaches (where tests are explicitly tied to requirement IDs, often through manual matrices), the test-case management systems that have served the formal QA function (Quality Center, TestRail, qTest, and others), and the cross-disciplinary practice of risk-based testing where features are weighted by user-facing importance and coverage is proportioned accordingly. Each approach has produced documented benefits in the organizations that sustained them; each has been limited by the maintenance tax common to documentation disciplines. The feature-to-test mapping requires updating when either features are added or tests are modified; the cross-product structure produces a matrix whose size grows with the system; the matrix decays under change without sustained maintenance. The pattern is familiar from Chapter 18 (traceability) and recurs here in the more specific form.

What AI changes about feature coverage mapping is the same continuous-maintenance capability the other documentation disciplines have benefited from, with a specific extension worth naming. The AI can classify tests by the features they exercise based on test names, assertions, the code paths they execute, and the surrounding test-file context. The classification is approximate but reasonable; the engineer reviews it and refines where the classification is wrong; the mapping is maintained continuously as both tests and features evolve. The extension is that AI can also classify features by their *user-facing operational frequency* using the operational-profile work of Chapter 13, producing not just a feature-to-test mapping but a *weighted* feature-to-test mapping that surfaces under-tested high-frequency features and over-tested low-frequency features. The weighting transforms feature coverage from a binary measurement (covered or not) into a continuous risk measurement (coverage relative to feature importance) that guides test-investment decisions more directly.

The operational prompt for an AI-driven feature coverage mapping workflow operates on a test suite, a feature list, and (where available) an operational profile:

```
You are producing and maintaining a feature coverage map for the
supplied test suite per the feature-level testing discipline. The
output is the mapping and the per-feature coverage analysis,
weighted by operational frequency where available.

Stage 1: Feature inventory.

For the supplied codebase:

1. Identify the user-facing features. Features should be at the
   granularity stakeholders use when discussing the system:
   "user can authenticate," "user can create a workflow," "user
   can run a workflow," etc. The granularity is finer than
   typical product categories and coarser than typical
   implementation modules.

2. The feature inventory can be supplied by the engineer (from a
   product backlog, a documentation set, a user-facing
   documentation hierarchy) or derived by AI from the codebase's
   structure and naming with engineer review.

Stage 2: Test classification.

3. For each test in the supplied test suite, classify by the
   feature(s) it exercises:
   - Read the test's name and structure.
   - Examine the assertions to identify what behavior is being
     verified.
   - Trace the code paths the test executes to determine which
     features the test reaches.
   - Assign one or more feature labels.

4. Tests that do not classify cleanly into features (e.g., pure
   unit tests of utility code, integration tests of infrastructure)
   are tagged as infrastructure tests and excluded from the
   feature-coverage analysis (though their presence is noted).

Stage 3: Coverage analysis.

5. For each feature, compute:
   - The number of tests classified to the feature.
   - The estimated test depth (a heuristic combining test count,
     assertion count per test, and code-path coverage).
   - The operational-frequency weight (from Chapter 13's
     operational profile, if available).

6. Identify coverage gaps:
   - Features with no classified tests (uncovered).
   - Features with thin coverage relative to their operational
     frequency (under-tested for their risk weight).
   - Features with deep coverage and low operational frequency
     (over-tested for their risk weight).

Stage 4: Investment recommendation.

7. Produce a test-investment recommendation:
   - Features warranting additional coverage (high operational
     frequency, low test depth).
   - Features warranting coverage rationalization (high test depth,
     low operational frequency).
   - Specific test proposals for under-covered features, derived
     from BDD scenario generation (Chapter 24) where applicable.

8. Surface the recommendation for engineer review. Test-investment
   decisions are product-level decisions requiring stakeholder
   judgment; AI proposes, engineer-and-team disposes.

Stage 5: Output.

9. Produce FEATURE_COVERAGE.md containing the feature inventory,
   the test classifications, the coverage analysis, and the
   investment recommendations.

10. Produce a per-PR or per-commit coverage-impact report when a
    change adds, removes, or modifies tests or features.

Provenance discipline: every test classification must cite the test
file and the evidence (name, assertions, executed code paths) that
substantiates the classification. Every feature must be defined
clearly enough that a reader can determine whether a given test
exercises it.

Abort criteria: If the codebase's tests are too fine-grained to
classify into user-facing features (e.g., a pure library with no
user-facing concept), defer to conventional code coverage as the
appropriate metric. Feature coverage is meaningful only for
systems that have a feature concept.
```

The worked restoration applies the prompt to the Agicore Studio's test suite, which contains approximately twelve hundred tests spanning unit tests, integration tests, and end-to-end tests. The feature inventory — derived from the Studio's documentation hierarchy and confirmed with the engineer — contains forty-seven user-facing features. The test classification assigns each test to one or more features (or to the infrastructure category); approximately seven hundred and twenty tests classify to features, the remaining four hundred and eighty are infrastructure tests. The coverage analysis identifies six features with no classified tests (most are recently-added features for which test coverage has not yet been written), eleven features with thin coverage relative to their operational frequency (the recently-added multi-model AI service routing features, which are high-frequency in production but were tested mostly at the unit level), and four features with deep coverage and low operational frequency (the legacy SEED-related features that were heavily tested during their original implementation but are rarely exercised in current production).

The investment recommendation proposes adding approximately thirty-five new tests across the under-covered features and consolidating approximately fifteen tests in the over-covered features (rationalizing redundant test cases rather than removing coverage entirely). The recommendation is reviewed and partially accepted by the engineer; the additions are scheduled across the next two sprints; the rationalization is deferred for a separate cleanup cycle. The work takes approximately four hours of AI runtime plus three hours of engineer review.

A note on the discipline's broader implications. Feature coverage mapping, as a discipline, has been advocated for decades and adopted in the QA-tooling tradition for safety-critical and regulated industries. The discipline's broader software-development adoption has been limited by the maintenance tax common to documentation work and by the absence of operational-frequency weighting that makes the coverage measurement meaningful. AI addresses both limitations directly. The mapping is maintained continuously; the operational-frequency weighting is supplied by the same AI extraction that the operational-profiles chapter described. The discipline becomes practicable as a continuous engineering activity rather than as a periodic QA project. The risk-weighted view of test coverage — which features users actually use and which features the tests actually verify — becomes part of the team's ongoing assessment rather than an artifact produced rarely and forgotten quickly.

The chapter that follows turns to a higher-level architectural discipline that has been advocated since Fred Brooks's *Mythical Man-Month* and that the field has struggled to sustain at scale: conceptual integrity in multi-author codebases. Brooks's argument that conceptual integrity is the most important attribute of a software system and that integrity requires either a single mind or an empowered review board has been validated repeatedly in the systems that achieved it and the systems that lost it. AI changes the calculus on the integrity-review tax in ways that make the discipline practicable at scales that have historically been beyond reach.
