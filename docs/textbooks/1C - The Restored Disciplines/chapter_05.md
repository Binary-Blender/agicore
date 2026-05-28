The Agicore Studio ESTIMATE.md that anchored Chapter 4 ran a COCOMO II semi-detached cross-check against the function-point count and produced a person-month figure that agreed with the FP-derived figure within two percent. The agreement was the point of including the cross-check: two estimation methods, anchored to different artifacts (interfaces versus lines of code), that converge on the same number provide stronger evidence than either method alone. The convergence held in that worked example because the Studio's productivity profile happened to match the productivity assumptions both methods used. The convergence would not have held automatically. It would have failed silently if either method had used inputs calibrated to a different productivity context, and the resulting estimate would have been wrong in ways that would not have been visible from the output alone.

Calibration is what makes COCOMO II actually work. The original COCOMO model that Barry Boehm published in 1981 was calibrated to a sample of sixty-three completed software projects from TRW, the System Development Corporation, the Naval Air Test Center, and a small number of other organizations Boehm's research group had access to. The model's accuracy on its calibration sample was strong; its accuracy on projects outside the sample was variable, because the productivity profile of any given organization differs from the productivity profile of Boehm's 1970s defense-contractor projects in ways that no generic model can predict. COCOMO II, published in *Software Cost Estimation with COCOMO II* (Boehm et al., 2000), formalized this fact and introduced a structural improvement: the model was explicitly designed to be *recalibratable*, with its scale factors, effort multipliers, and productivity coefficients tunable to the local context of the organization using it. The recalibration required local project data — completed projects with measured effort, scope, and the relevant cost-driver ratings — across enough samples to fit the model's parameters with statistical confidence. A typical recommendation was a minimum of ten to fifteen calibrated projects, with more projects yielding tighter parameter estimates.

The empirical record of COCOMO II in calibrated environments is strong. Independent calibrations across organizations — published by Sunita Chulani, Ray Madachy, the University of Southern California Center for Systems and Software Engineering, and others — produced models with prediction accuracy in the within-thirty-percent range on the calibration organization's subsequent projects, comparable to or better than the function-point method's accuracy on the same systems. The model handles project size, scale factors (the five SF parameters that capture precedentedness, development flexibility, architecture/risk resolution, team cohesion, and process maturity), the seventeen effort multipliers (the EM parameters that cover product, platform, personnel, and project factors), and the schedule calculation that derives optimal calendar time from effort. Each parameter is documented in *Software Cost Estimation with COCOMO II* with the methodology for assessing it, the empirical data behind its weighting, and the rationale for its presence in the model. The discipline is, like function-point analysis, fully literate — codified, teachable, defensible.

The discipline died for one specific reason: most organizations never accumulated the project data that the recalibration required. Local calibration was the structural improvement that made COCOMO II better than COCOMO; the improvement was contingent on the organization having the data; the organization typically did not have the data; the model was therefore used in its generic out-of-the-box form; the generic form produced estimates that were directionally correct but unreliable in magnitude; the unreliability discredited the model in the eyes of practitioners who never learned that the generic form was not the intended use. The discipline's death was a *data-availability tax*. The model demanded inputs that organizations did not produce, and organizations did not produce them because the data infrastructure required to capture project effort against measured scope with consistent cost-driver ratings did not exist outside organizations that had invested in software measurement specifically. The Software Engineering Institute under Watts Humphrey advocated such infrastructure (Chapter 14), and the small number of organizations that built it (Hill Air Force Base, a portion of the Indian software-services industry, a handful of defense contractors) did achieve the calibrated accuracy COCOMO II promised. The vast majority of organizations did not.

The data-availability tax is a different *kind* of tax than the ones examined in Chapters 4 and 6 through 9. The function-point tax was clerical: the count itself was tedious, but the data needed for the count (the running system) was available. The COCOMO II tax is structural: the model needs *historical* data the organization may not have produced and cannot produce retroactively without instrumentation that did not exist at the time. AI's contribution to a clerical tax is to do the clerical work; AI's contribution to a data-availability tax is different and worth specifying carefully, because it is precisely the kind of capability that AI introduces that no earlier technology offered.

What AI offers is the ability to *reconstruct* historical project data from artifacts the organization did produce, even if it never produced the structured data the COCOMO II calibration ostensibly requires. A typical organization with a commit history, an issue tracker, a code-review system, and a calendar of releases contains, in latent form, most of the data COCOMO II's calibration would have asked for. The duration between issue creation and issue closure approximates the effort on that issue, modulated by the size of the changeset that closed it. The complexity ratings of features can be inferred from the cyclomatic complexity of the code that implements them and from the number of files touched. Team capability ratings can be inferred from review patterns — the time between a PR opening and its first substantive review, the rate at which review comments are addressed, the proportion of PRs that ship without rework. Schedule pressure can be inferred from commit-clustering patterns near release dates and from the proportion of merges that happen in evenings or weekends. None of these inferences is perfect; each is an approximation. The sum of the approximations, fitted across enough historical projects, produces a calibration that converges toward the calibration a disciplined measurement program would have produced. AI's contribution is the *extraction layer* — the ability to derive structured project data from unstructured engineering artifacts at a fidelity adequate for the model.

The extraction is not new in principle. Researchers in mining-software-repositories conferences have demonstrated the basic moves for two decades. What AI changes is the *operational accessibility* of the extraction. Mining-software-repositories work has historically required research-grade tooling, careful selection of repositories, hand-cleaning of data, and statistical sophistication that exceeds what most engineering teams can deploy on their own projects. AI does the extraction on a single team's history, against the team's specific tooling, with no research-grade infrastructure, in a time scale measured in hours rather than the months a research project would consume. The data that COCOMO II's calibration always needed becomes accessible without the organizational investment that calibration always required.

The operational prompt for an AI-driven COCOMO II calibration is therefore a two-stage prompt: extract historical project data from the repository's artifacts; then run the COCOMO II model with the extracted calibration against new work that the model is being asked to estimate. The prompt below is the form this book proposes:

```
You are performing a COCOMO II calibration and estimation against the
supplied repository.

Stage 1: Calibration extraction.

For the supplied repository:

1. Identify the project boundaries. Use release tags, milestones, or
   explicit project phases as the boundaries of distinct historical
   projects. If the repository contains a single continuous project,
   treat each major release as a project for calibration purposes.

2. For each historical project, derive the following calibration inputs:

   - Project size in KLOC (lines of code added across the project's
     duration, net of deletions, excluding vendored dependencies).
   - Project duration in calendar months.
   - Effort estimate in person-months. Approximate using: number of
     distinct authors active during the project's duration × duration ×
     a participation factor (calibrate from commit-frequency patterns
     per author; default 0.6 for active contributors).
   - The five Scale Factor ratings (PREC, FLEX, RESL, TEAM, PMAT). Infer
     from repository signals: PREC (precedentedness) from the
     organization's prior work on similar projects; FLEX (development
     flexibility) from issue-tracker patterns of scope change; RESL
     (architecture / risk resolution) from design-document presence and
     refactoring patterns; TEAM (team cohesion) from review-cycle times
     and merge-conflict rates; PMAT (process maturity) from CI/CD
     presence, test-suite coverage trends, and review-coverage rates.

   For each rating, provide a value on the IFPUG-style nominal scale
   (Very Low, Low, Nominal, High, Very High, Extra High) with one
   sentence of justification.

3. Compute the project's COCOMO II semi-detached effort:

       PM = 2.94 × (KLOC ^ E) × ∏ EM
       E  = 0.91 + 0.01 × Σ SF

   where the effort multipliers (EM) are derived from the project's
   complexity, personnel, platform, and process indicators, with the
   inferred values stated and justified.

4. Compare the COCOMO-predicted effort to the empirically derived effort
   from step 2. The ratio is the calibration adjustment for this
   organization. Across the historical project sample, compute the
   geometric mean of the ratios; this is the local calibration multiplier.

Stage 2: Estimation against new work.

For the supplied new project specification:

5. Derive the KLOC estimate. Use a function-point count (Chapter 4's
   prompt) and convert via the language-specific FP-to-LOC ratio
   appropriate to the target stack.

6. Assess the five Scale Factors and seventeen Effort Multipliers for
   the new project explicitly, with one sentence of justification each.

7. Compute the COCOMO II effort estimate. Apply the local calibration
   multiplier from Stage 1.

8. Compute the schedule estimate:

       TDEV = 3.67 × (PM ^ (0.28 + 0.2 × (E - 0.91)))

9. Cross-check against the function-point method per Chapter 4. The two
   methods should agree within ten percent on a project of normal
   complexity. If they do not, walk the discrepancy and identify which
   assumption to revisit.

Output as CALIBRATED_ESTIMATE.md with:

  - Bottom-line table (effort, schedule, recommended staffing,
    dollar cost)
  - Calibration history (each historical project's calibration
    inputs and derived ratio)
  - Local calibration multiplier (geometric mean of ratios with
    confidence interval)
  - New-project Scale Factor and Effort Multiplier assessments
  - COCOMO II computation
  - FP cross-check (showing both methods' outputs and the
    reconciliation)
  - Limitations (with explicit sensitivity to the calibration
    confidence and to the largest Effort Multiplier values)

Provenance discipline: every calibration input must trace to specific
commits, issues, or measurable repository signals. Do not invent
calibration data. If signals are absent or ambiguous, name the gap and
use the nominal default with a note.

Abort criteria: If fewer than five historical projects are available,
the calibration is statistically thin and the output should note this
and bracket estimates with the generic-COCOMO bounds. If the repository
shows substantial discontinuity (large team turnover, major scope
pivot, significant tool changes), partition the history and calibrate
separately on each segment.
```

The worked restoration that demonstrates the prompt operates on the Agicore monorepo. Agicore's commit history spans approximately twenty-four months at the time of writing, with discrete release tags marking major capability additions: the original parser (v0.1.0 series), the compiler additions (v0.2.0 series), the multi-model AI_SERVICE codegen (v0.3.0 series), and the Studio integration (v0.4.0 series and the Studio's own v0.1.0-beta series). Each release is a candidate calibration project. The repository contains, in addition to the commit history, an issue tracker, a pull-request stream with review threads, a CI/CD pipeline with test-coverage trends, and a documentation set that includes design notes and architectural decision records. The data the prompt extracts is the same data the prompt's Stage 1 specifies; the extraction takes minutes; the calibration multiplier emerges with a documented confidence interval.

When the calibrated COCOMO II is then applied to the Agicore Studio's ESTIMATE.md scope (the new project of Chapter 4), the result is a COCOMO II estimate adjusted for Agicore's actual productivity profile rather than the generic semi-detached defaults Chapter 4 used. The adjusted estimate is approximately eight percent lower than the generic semi-detached output and approximately three percent lower than the function-point estimate, which is within the agreement window the prompt's Stage 2 expects. The eight-percent calibration adjustment is exactly the kind of refinement that COCOMO II promised in its original 2000 publication and that almost no organization ever achieved because the calibration data was never collected. The calibration is now achievable in an afternoon's work against a single repository, performed by the engineer who is doing the estimate, with no measurement-program investment, no data-cleaning specialist, no statistical-modeling consultant. The data-availability tax is paid by AI's extraction capability.

A note on the relationship between COCOMO II and function-point analysis is appropriate before closing the chapter, because the two methods are complementary in practice and the practitioner using them together gets more reliable estimates than either method alone provides. Function-point analysis sizes the *problem* the software will solve; COCOMO II sizes the *implementation* the team will produce. The two are not the same. A team using a fluent stack and an experienced engineering staff produces a different implementation for the same problem than a team using an unfamiliar stack and a junior engineering staff. Function-point analysis abstracts over implementation choices; COCOMO II is sensitive to them. The practitioner who runs both methods and reconciles them is doing the equivalent of triangulation in surveying — two independent measurements from different vantage points that converge on a single ground truth more reliably than either measurement could alone. The discipline's restoration through AI is the restoration of *the triangulation*, not of either method in isolation.

The chapter that follows turns from estimation to specification proper. Leslie Lamport's TLA+ is the most consequential formal-specification methodology to have been deployed at industrial scale in the past quarter century, and the restoration of TLA+ to mainstream engineering practice — beyond the small number of organizations like Amazon that have invested heavily in formal methods — is what AI's translation capability enables. The pattern continues. The disciplines accumulate.
