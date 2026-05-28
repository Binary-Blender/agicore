The estimate took about four hours to produce. The application was Agicore Studio at the v0.1.0-beta.2 tag — a Tauri-based desktop IDE for the Agicore DSL with a Make.com-shaped visual editor, a text editor with autocomplete, six bundled samples, a CI/CD pipeline, accessibility scaffolding, and the usual surrounding apparatus of a shipped first release. A normal-sized human team would have taken seven to eight months to build it and would have spent around six hundred and sixty-five thousand dollars doing so. That number did not come from a feeling. It came from an IFPUG function-point count of three hundred and eighty-one unadjusted points, weighted by a value-adjustment factor of one-point-one for the cross-platform real-time canvas, converted to four hundred and nineteen adjusted points, divided by the standard eight-function-points-per-person-month productivity rate Capers Jones had documented for experienced teams on modern stacks, cross-checked against a COCOMO II semi-detached run on the actual nine thousand lines of TypeScript and Rust the application contained, and reconciled with the standard wrap-around multiplier of one-point-four-five for design and project management and quality work that wraps the coding effort. The two methods agreed within two percent. The estimate held.

The four-hour cost is the point of this chapter. The discipline that produced it has existed since 1979. The discipline was not abandoned because it stopped working. It was abandoned because the four hours used to be four days, and the four days used to require a counter certified by an organization that charged five thousand dollars to certify them, and the certified counter was rare and expensive and never available when an estimate was actually needed. The discipline lost the resource auction. It did not lose the argument.

**Function Point Analysis** is a method for sizing software by counting the functionality it delivers rather than the lines of code it contains. Allan Albrecht developed it at IBM White Plains in 1977, presented it publicly in 1979, and saw it adopted across IBM's worldwide systems-engineering practice over the following decade. The method's intellectual move was to size software by the *interfaces it exposes to its users and to other systems*, on the argument that interfaces are what software exists to provide and that interfaces are countable in a way that internal implementation choices are not. A program that displays a list, accepts a search, returns a result, and persists the search history exposes four kinds of interfaces — an output, an input, an inquiry, and an internal data store — each of which can be enumerated, each of which can be weighted by complexity, and the sum of which constitutes the software's *size* in a unit that is meaningful across implementation languages, platform choices, and team compositions. A function-point count of a system written in COBOL would yield approximately the same number as a count of the same system rewritten in Java, because the count measures the interfaces the system provides, not the engineering required to provide them. The size, in Albrecht's framing, is a property of the problem; the effort to solve the problem is a different question, addressed separately by productivity calibration.

The standardization arrived through the International Function Point Users Group, founded in 1986, whose Counting Practices Manual evolved across multiple editions to provide a normative description of what counts as an External Input, an External Output, an External Inquiry, an Internal Logical File, and an External Interface File — the five element types of the IFPUG counting practice. The Manual specifies the data-element-type and record-element-type or file-type-referenced criteria that determine each element's complexity rating; the weights to apply at low, average, and high complexity; the procedure for assessing the fourteen General System Characteristics that yield the Value Adjustment Factor; and the formula that produces Adjusted Function Points from Unadjusted Function Points and VAF. The discipline, by 1995, was mature, normative, and broadly applicable. It had become — in the sense Donald Knuth meant by the term — a *literate practice*: codified, teachable, and defensible.

The empirical record is the part of the FPA story that the discipline's later abandonment obscures. Albrecht and Gaffney's 1983 paper established the correlation between function-point counts and effort in IBM data: the correlation coefficient across the sample exceeded 0.85, and the prediction error fell within fifteen percent on calibrated environments. Chris Kemerer's 1987 study at the University of Pittsburgh replicated the result on an independent sample of fifteen large business applications, with similar accuracy. Capers Jones — across multiple editions of *Programming Productivity*, *Applied Software Measurement*, and *Estimating Software Costs* — accumulated function-point data from thousands of projects across decades, producing the industry-segment productivity tables that allow a counter to convert function points to person-months with reasonable confidence: six to eight function points per person-month for typical business software, eight to twelve for greenfield work on modern stacks with experienced teams, four to six for legacy modernization, and two to four for safety-critical embedded systems. The numbers are not precise to a percentage point. They are precise to a *neighborhood*, and neighborhoods are what software-cost estimates need to be. An estimate accurate to thirty percent is useful; an estimate accurate to a percentage point is a fabrication. FPA, calibrated and applied with discipline, produced thirty-percent estimates with regularity. Few other methods in the literature could make the same claim.

What killed the discipline was not the math and not the methodology. What killed the discipline was a stack of effort-tax components that, taken together, exceeded the perceived value at 1990s economics. The first component was *counter training and certification*: the IFPUG certification process required formal training, a written examination, and recurring continuing-education credits, at a total cost of several thousand dollars per certified counter, and certified counters were rare in any given organization. The second was *count duration*: counting a non-trivial system, even by a fluent counter, took days of careful inventory work — walking the user-facing transactions, identifying the data stores, judging the complexity ratings, assessing the General System Characteristics. The third was *subjective judgment in element identification*: deciding whether two displays of substantially similar data constituted one External Output or two; deciding whether a data store with multiple record types counted as one Internal Logical File or several; deciding whether an inquiry that performed a small derivation crossed the threshold to External Output. The Manual provided guidance; the guidance did not eliminate judgment; the judgment varied across counters in ways that compromised inter-rater reliability. The fourth was the *General System Characteristics interlocutor*: assessing the fourteen GSCs required a knowledgeable interlocutor — typically the system architect or lead engineer — who would sit with the counter and answer questions about transaction rates, performance constraints, data-communication intensity, and the like. The interlocutor was always busy; the assessment was often deferred; deferral compounded the count's calendar cost.

The fifth and most consequential component was a *fashion shift* that arrived with the agile movement in the early 2000s. The Agile Manifesto of 2001 did not name FPA directly, but the practices it advocated — short iterations, working software over comprehensive documentation, velocity-based projection over upfront estimation — implicitly displaced the discipline. Story points emerged as the agile-native sizing unit, with the explicit property that they were *non-comparable across teams*: a team's story points were calibrated only to the team's own velocity, and the calibration was discovered iteratively rather than estimated in advance. The deliberate non-comparability was framed as a feature, on the argument that estimation was a low-value activity and that the right behavior was to ship and observe rather than estimate and predict. The argument was not unreasonable in the conditions that produced it — the failure modes of 1990s waterfall estimation were real, and the agile reaction was a course correction. But the course correction overshot. The displacement of FPA was not an evaluation of FPA's accuracy. It was a rejection of the *category of activity* that FPA inhabited. The discipline did not lose a comparison; it lost a culture.

The displacement compounded the effort-tax components. Once story points became the cultural default, the demand for certified counters collapsed; the supply of certified counters did not return; the residual users of FPA were concentrated in regulated industries and government contracting, where the discipline became associated with bureaucratic compliance rather than engineering insight. By 2010, asking an experienced software engineer to produce a function-point count of a system would have produced confusion in most contexts and irritation in many. The discipline was, in operational terms, dead. The empirical record was not refuted; it was forgotten.

The effort-tax mechanism that AI eliminates is a specific one, and naming it precisely is necessary if the restoration is to be defensible. The mechanism is not the count itself; the count is mechanical once the rules are mastered. The mechanism is the *combination of rule mastery, attention discipline, and inventory completeness* that a human counter must sustain across days of work to produce a reliable count. A certified counter can recite the IFPUG rules; an attentive engineer can identify the transactions in a system they have built; a disciplined practitioner can sustain the inventory work without skipping elements. Few practitioners are all three at once. The rare certified-and-attentive-and-disciplined counter is what the discipline required, and that combination was the resource the auction priced out of existence.

AI changes the calculus on each of the three components simultaneously. AI has the IFPUG rules — every published edition, every counter's manual, every clarification issued by the IFPUG board — encoded in its training corpus with no possibility of forgetfulness or drift. AI sustains attention across the full inventory of a codebase without fatigue, without the Monday-versus-Friday inconsistency that erodes human counter reliability, without the temptation to elide elements that are tedious to enumerate. AI produces an audit trail — a list of every element identified, every weighting applied, every judgment made — that a human reviewer can inspect, challenge, and refine in a fraction of the time the original count would have taken. The count, by AI, is not faster than a human count by some marginal percentage. It is faster by an order of magnitude, and the marginal labor cost of an additional count — for a different system, for a re-baselining of the same system after major changes, for a sensitivity analysis at different GSC ratings — collapses to near zero. The economics of the discipline invert. Where FPA was once worth the effort only on the largest and most consequential systems, FPA becomes worth the effort on every system whose author wants to know what it would have cost to build at industry productivity rates.

The operational prompt for an AI function-point counter is, accordingly, the artifact this chapter exists to produce. The prompt below is the version this book proposes for Claude Code; it has been refined against actual restorations including the Agicore Studio estimate that opened the chapter. The reader can paste it directly:

```
You are performing a Function Point Analysis on this codebase per IFPUG
counting practices (Counting Practices Manual 4.3.1 or later).

Methodology:

1. Inventory the user-facing transactions. Identify External Inputs (EI),
   External Outputs (EO), and External Inquiries (EQ). For each, name the
   transaction, the screens or endpoints it covers, and the data elements
   it accepts or produces.

2. Inventory the data stores. Identify Internal Logical Files (ILF) — data
   maintained by the application — and External Interface Files (EIF) —
   data referenced from sources outside the application boundary. For
   each, name the file and its record element types.

3. Apply IFPUG complexity weighting (low / average / high) per element
   based on the data element type and record-element-type or
   file-type-referenced counts the Manual specifies. Where the count is
   borderline, prefer the lower weighting and note the borderline case.

4. Compute Unadjusted Function Points. Sum the weighted counts across the
   five element categories.

5. Assess the fourteen General System Characteristics. Rate each on the
   IFPUG 0–5 scale with one sentence of justification per rating. Sum the
   ratings to a Total Degree of Influence (TDI). Derive the Value
   Adjustment Factor: VAF = 0.65 + 0.01 × TDI.

6. Apply: Adjusted Function Points = UFP × VAF.

7. Cross-check with COCOMO II semi-detached against the actual line count
   of the codebase (TypeScript / Python / Java / Rust / etc.). Apply the
   standard 1.40–1.50× wrap-around multiplier for non-coding effort
   (design, project management, QA, documentation). The FP-derived and
   COCOMO-derived person-month estimates should agree within ten percent;
   if they do not, walk the discrepancy and identify which assumption to
   adjust.

8. Convert to dollars at a stated blended loaded-cost rate (default: US
   median 2026 rates at 1.30× loading, blended across a representative
   team composition). Report the estimate as a range, not a point.

Output as ESTIMATE.md with the following sections, in order:
  - Bottom line table (function points, person-months, person-hours,
    calendar time, dollar cost)
  - Methodology (which IFPUG edition, which COCOMO mode, which
    productivity rate, which loading multiplier)
  - Team composition assumption (with the salary and loading tables)
  - Function point count (one subsection per element category, with the
    enumerated transactions and their weightings)
  - Effort conversion (the FP-to-person-months math)
  - Calendar time (with Brooks's-Law adjustment)
  - Dollar estimate (with the two-method reconciliation)
  - COCOMO II cross-check (with the discrepancy walk if any)
  - What this estimate includes
  - What this estimate does NOT include
  - Limitations (with explicit sensitivity to the productivity assumption
    — show the dollar range at the 6 / 8 / 12 FP-per-person-month
    productivity brackets)

Provenance discipline: every transaction, every file, every weighting,
every GSC rating must trace to a specific file, module, or feature in
the codebase. Do not invent transactions. Do not invent files. If an
element is ambiguous, name the ambiguity and pick the conservative
reading.

Abort criteria: If the codebase exceeds 50 KLOC, partition by module and
produce per-module estimates with a roll-up. If the codebase contains
substantial vendored dependencies, exclude them from the count and note
the exclusion. If the application is a library rather than an end-user
system, note that the FP count will be incomplete (libraries have no
user-facing transactions) and supplement with a complexity-based estimate
under a stated assumption about the consuming application.
```

The prompt is long because the discipline is exacting. It is not longer than the IFPUG Counting Practices Manual; it is shorter than the Manual by a factor of fifty. What the prompt does, that the Manual could not, is *carry the discipline into the counting act* — every clause in the prompt is a constraint that the counter must observe, and the counter, being AI, observes the constraints without drift. The prompt is the discipline made operational.

The Agicore Studio ESTIMATE.md that opens this chapter is the worked restoration. It exists in the repository at `apps/agicore-studio/ESTIMATE.md`, and a reader interested in the prompt's output can examine it directly. Three observations about that document are worth surfacing here. First, the function-point count is itemized at the transaction level — twenty-one External Inputs, fifteen External Outputs, ten External Inquiries, fourteen Internal Logical Files, six External Interface Files — and each item is named in a table the reader can audit against the running application. This is the audit trail the discipline always promised and rarely delivered. Second, the two-method reconciliation — function points yielding fifty-two person-months, COCOMO II semi-detached yielding thirty-five-point-four pre-wrap and fifty-one-point-three with the standard wrap-around multiplier — agrees within two percent. The agreement is not a coincidence. It is what the discipline produces when applied carefully. The number is credible because two independent methods, anchored to different inputs (interfaces versus lines of code), converge. Third, the limitations section names the productivity assumption explicitly and exposes its sensitivity: at six function points per person-month the estimate climbs to eight hundred and eighty thousand dollars; at twelve it drops to four hundred and forty thousand. This is the honest version of the discipline. An estimate without a stated sensitivity is a number pretending to be a fact.

The restoration is not a recovery of Albrecht's 1979 method in isolation; it is a recovery of the *practice* the method was supposed to enable. The practice is: a software engineer or technical leader, presented with a system or a specification, can produce in hours a defensible estimate of what the system would cost at industry productivity rates, with a clear sensitivity analysis, in a form a non-technical stakeholder can read and a technical stakeholder can audit. The practice was always valuable. The practice was always achievable. The practice was prohibitively expensive at 1990s economics and is approximately free at 2026 economics. The discipline now does what it was always supposed to do.

The chapters that follow develop further restorations in the specification-and-estimation cluster: COCOMO II as a deeper cross-check, Lamport's TLA+ as the formal-specification companion, Meyer's Design by Contract as the contract-level companion, Parnas's tabular specifications as the requirements-level companion. Each follows the chapter pattern established in Chapter 3 and exemplified here: the original formulation, the empirical evidence, the effort-tax mechanism, the AI change, the operational prompt, the worked restoration. The cumulative effect, by the end of Part II, is a restored capability in software estimation and specification that no contemporary team practices in full and that every team is now equipped to practice. The discipline was waiting for its infrastructure.
