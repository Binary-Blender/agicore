Brad Cox published *Object-Oriented Programming: An Evolutionary Approach* in 1986 as the second of a small number of foundational texts on object-oriented programming and the first to make an explicit *industrial* argument for the paradigm. Cox's argument was not primarily technical — the technical arguments for object orientation had been made elsewhere — but economic and strategic. The argument was that the software industry was operating in a manner analogous to the manufacturing industries that had preceded the integrated-circuit revolution, where each manufactured object was substantially designed and constructed from scratch by the producer, with limited reuse of components across products. The semiconductor industry's transition from discrete components to integrated circuits had transformed manufacturing by introducing a *components market* — a class of pre-designed, pre-fabricated, individually-marketed building blocks that could be assembled into products by manufacturers who had not designed them. Cox argued that software was approaching the same inflection point and that object orientation, properly practiced, would produce the *Software IC* — the pre-designed, individually-marketed component that the software industry's productivity revolution would build on. The Objective-C language Cox had developed at Productivity Products International was the implementation vehicle Cox proposed for the vision.

The vision was not unfounded. Cox's argument was directly continuous with Doug McIlroy's 1968 NATO conference proposal of "mass-produced software components," which had named the same target and proposed the same end state more than a decade earlier without finding the mechanism to achieve it. The economic logic was strong: if a useful software component could be produced once and reused thousands of times, the marginal cost of building applications from such components would drop by orders of magnitude, with corresponding productivity gains across the industry. The components market that had transformed semiconductor manufacturing would transform software manufacturing through the same mechanism. The transformation did not arrive on Cox's timeline. The reasons it did not arrive are worth examining because they illuminate exactly what AI now changes about the calculation.

The transformation did partially arrive, in a form Cox did not entirely predict. The package ecosystems of the contemporary software industry — npm, PyPI, Maven, RubyGems, crates.io, NuGet, and their language-and-platform-specific equivalents — represent the most extensive Software IC market in operation. The package ecosystems contain, in aggregate, millions of components, available for free or under license, ranging from small utility libraries to substantial application frameworks. The marginal cost of using a package is approximately zero from a software-engineering standpoint; the installation is a single command; the integration is a series of import statements. The Software IC market exists; it operates at extraordinary scale; the productivity contribution of the package ecosystems to contemporary software development is substantial. Cox's vision is, to a meaningful extent, realized.

The vision is not, however, fully realized. Three problems that Cox identified in 1986 remain partially or wholly unsolved in the contemporary package ecosystems. The first is the *discovery problem*. With millions of packages available, finding the one that fits a specific need is itself a substantial engineering activity. A developer who needs to perform a particular task — parse a configuration file, generate a chart, authenticate against an OAuth provider, render a markdown document — typically has dozens or hundreds of candidate packages to choose from, with varying quality, varying maintenance status, varying API design, varying license terms. The discovery work has historically been performed by individual developers searching package registries, reading documentation, examining download counts and GitHub stars, asking colleagues, and reaching tentative conclusions that may or may not survive use. The discovery is real engineering work; the work is duplicated across the industry; the duplication is the discovery problem's signature.

The second is the *adaptation problem*. Even when the right package is identified, the package's interface rarely fits the consumer's needs exactly. Adaptation work is required: writing wrapper code that adapts the package's API to the consumer's idioms, handling the package's edge cases that the consumer does not need, configuring the package's options to the consumer's environment. The adaptation work compounds across the consumer's codebase as more packages are integrated. The cost of using a package is, in practice, the cost of adapting it to the consumer's context plus the marginal cost of integration. The adaptation cost is often substantial enough that the build-versus-buy calculation tips toward build for components that a working Software IC market would have made buy-decisions trivial.

The third is the *trust problem*. A package's actual behavior — including its security properties, its performance characteristics, its corner-case handling, its supply-chain integrity — is unknown until the package is examined or used. The package may contain bugs, security vulnerabilities, unmaintained dependencies, or — increasingly in the current threat landscape — deliberately malicious code introduced through supply-chain attacks. The trust problem has produced a substantial industry of security-scanning tools, dependency-auditing services, and corporate-governance processes around package usage. The trust work is real engineering work; the work is partially duplicated across consumers of the same package; the duplication is the trust problem's signature. Cox saw all three problems. Cox did not have the tools to solve them.

What AI changes about the Software IC vision is that it provides, for the first time, *operational solutions to all three problems* in a form individual developers can deploy without industry-level infrastructure investment. The discovery problem is reducible by AI's ability to survey the candidate packages, read their documentation, evaluate their fit to the developer's specific need, and produce a comparison matrix that distills the choice. The adaptation problem is reducible by AI's ability to write the wrapper code that adapts a chosen package to the consumer's idioms, with the integration tested against the consumer's actual usage patterns. The trust problem is reducible by AI's ability to inspect the package's source, audit its dependencies, evaluate its security posture, and surface concerns at a level individual developers could not previously perform. The Software IC market gains the *consumer-side intelligence* that has historically been the binding constraint on its productivity contribution. Cox's vision becomes substantially more functional than the package ecosystems alone have made it.

The operational prompt for an AI-assisted Software IC workflow is therefore a prompt that operates on a stated requirement and produces a substantiated package selection with the adaptation work scoped:

```
You are assessing candidate components for a stated requirement per
the Software IC framework Brad Cox proposed in 1986. The output is
a comparison matrix and a selection recommendation with the
adaptation cost estimated.

Stage 1: Requirement analysis.

For the supplied requirement:

1. Identify the requirement's functional core: what must the
   component do.

2. Identify the requirement's non-functional constraints:
   performance requirements, license constraints, platform
   constraints, security requirements, maintenance-status
   requirements.

3. Identify the consumer's codebase context: the host language,
   the existing patterns and idioms, the integration surfaces
   the component will connect to.

Stage 2: Candidate survey.

4. Identify candidate components across the relevant package
   ecosystems. Survey at least the top five candidates by
   relevance, with attention to:
   - Functional fit to the requirement.
   - Maintenance status (recent activity, issue-resolution rate,
     contributor base).
   - Adoption signals (downloads, dependents, citations).
   - License compatibility.
   - Documentation quality.

Stage 3: Trust evaluation.

5. For each candidate, evaluate trust:
   - Source-code inspection summary (architecture, code quality,
     test coverage).
   - Dependency-tree analysis (transitive dependencies, their
     trust status).
   - Security-vulnerability history (CVEs, advisories).
   - Supply-chain integrity (publisher identity, signing,
     reproducibility).
   - Known issues or concerns in the broader community.

Stage 4: Adaptation cost estimation.

6. For each candidate, estimate the adaptation cost:
   - Lines of wrapper code required to bridge the package's API
     to the consumer's idioms.
   - Configuration work required to fit the package to the
     consumer's environment.
   - Test coverage required to validate the integration.
   - Maintenance burden the package introduces (e.g., dependency
     updates, breaking-change accommodation).

7. Express the adaptation cost in engineer-hours with explicit
   assumptions.

Stage 5: Selection and synthesis.

8. Produce the comparison matrix with columns for functional fit,
   trust evaluation, adaptation cost, and overall recommendation.

9. Produce a selection recommendation: the chosen component with
   the rationale, the alternative recommendation if the primary is
   blocked, and the build-versus-buy threshold (the adaptation cost
   at which building from scratch becomes preferable).

10. Produce SELECTION_REPORT.md containing the requirement analysis,
    the comparison matrix, the trust evaluations, the adaptation
    cost estimates, and the recommendation.

Provenance discipline: every claim about a candidate must trace to
specific evidence — the package's repository, its documentation,
its security advisories, its dependency tree. Do not assert
qualities the evidence does not support.

Abort criteria: If no candidate package satisfies the requirement's
core functional and trust criteria, recommend the build-from-scratch
option with an effort estimate. If multiple candidates are roughly
equivalent and the selection requires team-level preferences
(e.g., aesthetic API choice, framework alignment), surface the
choice for engineer review rather than asserting a recommendation.
```

The worked restoration applies the prompt to a representative Agicore requirement: the team needs a TOML parser for the Agicore CLI's configuration handling. The current implementation uses a particular TOML library that has been functional but that has accumulated technical debt and that the team is considering replacing. The prompt surveys candidate TOML parsers across the Rust ecosystem (the CLI is implemented in Rust), evaluates seven candidates, produces the comparison matrix with detailed adaptation-cost estimates, and recommends a specific alternative based on functional fit, trust evaluation, and adaptation cost. The recommendation is accompanied by an explicit estimate of the migration effort (approximately twelve hours of engineer work plus four hours of test updates) and a build-versus-buy threshold (above eighty hours of adaptation cost, building a custom TOML parser becomes economically preferable). The engineer reviews the recommendation in approximately ninety minutes, validates the trust evaluations against direct source inspection of the recommended package, and approves the migration. The migration is performed across approximately fourteen hours of engineer work in the following sprint, falling within the estimated bracket.

A note on the scope of the AI-restored Software IC vision is appropriate before closing. The restoration solves the three problems Cox named — discovery, adaptation, trust — at the consumer side, by making individual developers substantially more effective at evaluating and integrating components than they have historically been. The restoration does not solve the *producer-side* problems of the components market: the difficulty of designing components that are reusable across enough consumers to justify the design effort; the difficulty of monetizing components in a market that has converged on free-tier distribution as the standard; the difficulty of sustaining component maintenance across the personnel changes that affect every long-lived project. The producer-side problems are real and remain. The consumer-side restoration nonetheless changes the calculus substantially. Components whose discovery and adaptation costs were previously high enough to discourage use become tractable. The market's effective inventory expands without any new components being produced.

The chapter that follows turns to a discipline that operates at the design rather than the integration scale: Kent Beck and Ward Cunningham's CRC Cards, the index-card-based object-design methodology that has been beloved by practitioners who tried it and almost completely abandoned because the cards were never kept current. The card-rot tax is exactly the kind of maintenance-under-change tax that AI now addresses directly. The discipline returns as a continuous representation rather than a working-session artifact.
