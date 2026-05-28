In 1993 John D. Musa, a reliability engineer at AT&T Bell Laboratories, published *Operational Profiles in Software-Reliability Engineering* in *IEEE Software*. The paper formalized an approach Musa had been developing across the preceding decade at Bell Labs: software reliability is meaningful only in relation to a *stated operational profile*, which is to say a probability distribution over how users actually exercise the system. A program that performs reliably on the operations its users most frequently invoke is, for engineering purposes, more reliable than a program that performs reliably on operations its users almost never invoke. Reliability claims that do not state their operational profile are, in Musa's framing, incoherent — the same program can be highly reliable under one profile and unreliable under another, depending on which operations are exercised most. The argument was structural and largely unobjectionable; the consequence was a reframing of how reliability engineering should be done.

The reframing's first consequence was that *testing should be proportioned to the operational profile*. If eighty percent of user invocations exercise a particular path through the system, eighty percent of the testing budget should exercise that path. The traditional alternative — testing every path with approximately equal effort, or testing the paths the developers found most interesting — was, on Musa's argument, a misallocation of testing investment that left the most-used paths under-tested and the least-used paths over-tested. The empirical basis for the reframing was AT&T's own switching software, where Musa's group had demonstrated, across a series of large-scale deployments of the 5ESS digital switch, that reliability-engineered testing (proportioned to operational profiles measured from production traffic) achieved higher field reliability per dollar of testing investment than conventional testing approaches. The improvement ratios were documented at approximately two-to-four-times the conventional testing efficiency. The improvement was not subtle.

The 5ESS data was followed by a body of subsequent work that confirmed the basic finding in other contexts. Musa's 1998 book *Software Reliability Engineering* compiled additional case studies from a range of Bell Labs deployments and external organizations that had adopted the approach. Whittaker and Voas's 2000 work extended the framework to more general software-testing contexts. Lyu's 1996 *Handbook of Software Reliability Engineering* assembled the field's accumulated literature. The empirical case for operational-profile-driven testing was, by approximately 2000, well-established within the reliability-engineering community. The discipline's broader adoption did not follow.

What kept the discipline confined to the reliability-engineering community was a specific effort tax: the *instrumentation-and-analysis tax*. Producing an operational profile required, at minimum, that the production system be instrumented to record what operations users actually performed, in what frequencies, with what input characteristics, across enough usage to make the profile statistically reliable. In 1993, when Musa published the framework, most production software systems had nothing resembling adequate instrumentation. The systems that did — Bell Labs's switching software, certain mainframe environments with built-in usage logging, a small number of high-end commercial software products — were unrepresentative of the broader software-development context. Most engineering organizations could not have produced an operational profile if they had wanted to, because the data was not collected and the infrastructure to collect it did not exist.

The analytical component of the tax compounded the instrumentation problem. Even when usage data was available, deriving an operational profile from it required statistical work the typical development team did not have the expertise to perform: aggregating raw usage logs into operation categories, computing the frequency distributions, identifying the distinct usage modes (a user-facing application typically has multiple usage modes corresponding to different user populations or different functional contexts), and producing the structured profile artifact that testing investment could be directed against. The analytical work required a quantitative-engineering specialist whose presence in the development team was rare; the work could not be performed by the typical developer or the typical project manager. The combined instrumentation-and-analysis tax was, in 1993 conditions, severe enough that the discipline remained niche outside the small number of organizations that had both the instrumentation and the analytical capability.

The 2026 context is different in ways that warrant careful statement, because the difference is what makes the AI restoration of operational profiles among the cleanest restorations in this book. Modern production software systems are instrumented as a matter of course. The observability stack — OpenTelemetry, Datadog, Honeycomb, New Relic, Grafana, and the broader ecosystem of distributed-tracing, metrics-collection, and log-aggregation tools — produces, for any production system that has adopted any portion of the stack, the raw usage data that operational profiles require. The data is typically not consumed by anyone for operational-profile purposes; it is consumed by operations teams for incident response and by SREs for capacity planning. The same data, structured differently, is exactly what Musa's framework requires. The instrumentation tax has effectively been paid by the observability industry, for reasons unrelated to reliability engineering, and the data is sitting in observability platforms across the industry waiting for someone to extract an operational profile from it.

What AI changes about operational profiles is precisely the *extraction*. The data is voluminous; the analysis required to convert it into an operational profile is the kind of statistical aggregation work that AI performs faithfully at scale; the engineering team that wants an operational profile no longer needs a quantitative-engineering specialist or a multi-month analytical effort to produce one. An AI presented with a system's observability data — distributed traces, metrics time series, structured logs — can produce an operational profile in the form Musa's framework specifies: enumerated operations, frequency distributions, modal segmentation, with the supporting statistical work documented. The work that historically required specialist time becomes a routine extraction that the team can request on a cadence (monthly, quarterly, per release) and act on directly.

The operational prompt for an AI-driven operational-profile extraction is therefore more straightforward than the prompts of some earlier chapters, because the underlying work is a structured data analysis rather than a partnership in judgment:

```
You are extracting an operational profile from the supplied production
observability data per Musa's software-reliability engineering
framework. The output is the profile artifact that testing investment
and reliability analysis can be directed against.

Stage 1: Operation enumeration.

For the supplied observability data (traces, logs, metrics covering a
specified time window):

1. Identify the distinct operations the system performs. Operations
   should be at a granularity meaningful for testing: a "create user"
   operation is meaningful; a "database INSERT statement" is too
   low-level; a "user-facing request" is too high-level. The right
   granularity is the granularity at which the system's tests are
   organized or could naturally be organized.

2. For each operation, identify:
   - The operation's identifier (function name, endpoint path,
     event type, or other system-meaningful designator).
   - The distinct input characteristics that warrant separate
     testing (e.g., input size buckets, parameter category
     distributions).
   - The downstream operations the operation typically invokes
     (for tracing-based context).

3. Surface the operation list for engineer review before producing
   the profile. The engineer accepts, refines, or removes
   operations to ensure the granularity matches the testing
   strategy.

Stage 2: Frequency analysis.

4. For each operation, compute its frequency in the time window:
   - Absolute count over the window.
   - Frequency per unit time.
   - Frequency relative to total operations (the per-operation
     probability that will populate the profile).
   - Variance of frequency across sub-windows (to identify
     operations whose usage is bursty or cyclical).

5. For each operation's input characteristics, compute the
   distribution: the histogram of input sizes, the categorical
   distribution of parameter values, the joint distribution of
   key parameter combinations.

Stage 3: Modal segmentation.

6. Identify whether the operational profile naturally segments
   into distinct modes (e.g., business-hours versus off-hours
   usage, batch processing versus interactive usage, distinct
   customer-segment usage patterns). For each identified mode,
   produce a separate sub-profile with its own operation
   frequencies.

7. Where modal segmentation is present, present both the
   composite profile (operations weighted by mode frequency)
   and the per-mode profiles, so testing investment can be
   directed at the modes the team prioritizes.

Stage 4: Profile output.

8. Produce the OPERATIONAL_PROFILE.md document containing:
   - Executive summary: top ten operations by frequency, top
     ten by criticality (where criticality is supplied by the
     engineer or inferred from operation type), the modal
     structure.
   - Operation table: every operation with its frequency,
     input characteristics, and supporting trace identifiers.
   - Per-mode profiles where applicable.
   - Recommended testing-investment proportioning per Musa's
     framework.
   - Reliability-claim template: a stated reliability claim
     should explicitly reference this profile by version and
     date.
   - Limitations: the time window's representativeness, the
     observability stack's coverage of operations, the
     statistical confidence intervals on the frequency
     estimates.

9. Produce an additional artifact, TEST_ALLOCATION.md, that takes
   the operational profile and the team's existing test suite as
   inputs and recommends test-allocation adjustments: which
   operations are under-tested relative to their profile
   frequency, which are over-tested, which lack tests at all.

Provenance discipline: every operation, every frequency, every
distribution must trace to specific observability data. Do not
infer operations the data does not surface. Where data quality is
uncertain (e.g., sampling-based traces, lossy logs), state the
uncertainty and bound the frequency estimates accordingly.

Abort criteria: If the observability data is too sparse to support
profile extraction (less than fourteen days of data, fewer than ten
thousand operations across the window, or significant operation
categories with no observability coverage), name the limitations
and propose either an extended collection period or a
partial-profile output with explicit coverage gaps.
```

The worked restoration applies the prompt to Agicore's runtime telemetry, which is collected through an OpenTelemetry instrumentation that the framework provides for workflow execution. The telemetry covers approximately six weeks of execution across a sample of Agicore deployments (the team's internal usage plus a small number of external deployments that have opted into telemetry sharing for reliability-engineering purposes). The data set comprises approximately two million distinct workflow executions across approximately forty distinct workflow types. The prompt identifies seventy-three distinct operations at the right level of granularity, computes the frequency distribution showing that nine operations account for approximately seventy percent of total executions, identifies two distinct modal patterns (an interactive-debug mode used during workflow development and a batch-execution mode used in production deployments), and produces the operational profile with the per-mode sub-profiles.

The subsequent test-allocation analysis identifies a meaningful mismatch between the existing Agicore test suite and the operational profile. The test suite was developed without operational-profile input; the test allocation was approximately uniform across the workflow types; the operational profile shows that approximately eighty percent of production execution time is spent in twelve workflow patterns that account for thirty percent of the test suite's test count. The under-tested workflows include several that are critical in production (the multi-model AI_SERVICE routing patterns the team had added in the most recent release cycle); the over-tested workflows include several that are rare in production (the SEED declaration patterns that were heavily tested during their original development but are infrequently exercised in deployment). The recommended reallocation moves approximately fifteen percent of the test budget from the over-tested to the under-tested categories; the projected reliability improvement, computed against the framework's published yield curves, is approximately a thirty-percent reduction in expected production-defect rate per release. The work, from initial profile extraction to recommended test reallocation, takes approximately five hours of AI runtime plus two hours of engineer review.

A note on the broader applicability of the operational-profiles restoration is worth surfacing. The restoration is among the cleanest in this book because the underlying tax (instrumentation and analysis) has been substantially paid by the observability industry for reasons unrelated to reliability engineering. Organizations with mature observability stacks are essentially ready for operational-profile work without further infrastructure investment; the only thing that has been missing is the practice of using the observability data for the reliability-engineering purpose Musa's framework intended. AI changes this by making the extraction a routine activity rather than a specialist project. The restoration is therefore not bounded by the observability-stack maturity of the organization in the same way that some other restorations are bounded by their specific cost components; any organization with a working observability stack can practice the discipline immediately.

The relationship between Chapter 13 and the verification disciplines of Chapters 10-12 is worth naming. Cleanroom certification (Chapter 10) requires an operational profile to run its statistical-testing component; the profile is the input to Cleanroom's certification stage; the AI extraction restored in this chapter makes Cleanroom's certification practicable in 2026 conditions in a way it was not practicable when Mills wrote the framework. Fagan inspections (Chapter 11) benefit from operational-profile context because the inspector's attention can be prioritized to the units that are most heavily exercised in production. The Zero Defects portfolio (Chapter 12) uses the operational profile to weight the cost-of-quality calculation, because a defect in a frequently-executed operation is more consequential than a defect in a rare operation, and the prevention investment should be proportioned accordingly. The disciplines compound. Each restoration's value increases when it operates against an environment in which the other restorations are also in place.

The chapter that follows extends the verification cluster to the highest organizational scale: Watts Humphrey's Statistical Process Control for software, embodied in the Capability Maturity Model's Level 5 practices and the Personal and Team Software Processes. The discipline operates at the level of the engineering organization itself rather than at the level of individual units or increments, and the restoration brings the discipline within reach of organizations that could not previously sustain the measurement infrastructure it required.
