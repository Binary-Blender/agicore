Olly Gotel and Anthony Finkelstein published *An Analysis of the Requirements Traceability Problem* at the First International Conference on Requirements Engineering in 1994. The paper's contribution was definitional rather than methodological. The authors gave the field a precise vocabulary for the *requirements traceability problem* — distinguishing forward traceability (from requirements through the design to the implementation and tests) from backward traceability (from the implementation back to the requirements it satisfies), and distinguishing pre-requirements-specification traceability (the connections between stakeholder needs and the formal requirements) from post-requirements-specification traceability (the connections from formal requirements through to the artifacts that realize them). The taxonomy gave subsequent discussion a precision it had lacked. The paper itself made no original methodological proposal; the methodological proposals came in subsequent literature from Ramesh, Jarke, Cleland-Huang, and many others across the next two decades. The problem was named; the methodological responses accumulated; the broad-adoption results were uneven.

What the field discovered, across the empirical work that followed Gotel and Finkelstein's paper, is that requirements traceability is sustained primarily in industries where *regulation requires it*. DO-178C (the Federal Aviation Administration's standard for airborne software), IEC 62304 (the international standard for medical-device software), ISO 26262 (automotive functional safety), EN 50128 (railway control), and a small number of related standards mandate traceability matrices as deliverables. The auditors who certify systems under these standards verify the traceability matrices as part of their certification work. Organizations developing software for these regulated environments produce traceability matrices because they must. The result is a documented track record of traceability work in safety-critical software, with documented improvements in change-impact analysis, defect-detection efficiency, and certification compliance. The discipline works where it is practiced. The discipline is not practiced outside the regulated environments because the maintenance tax exceeds the willingness of unregulated organizations to pay.

The technical structure of traceability work involves three artifacts and the relationships among them. The first artifact is the *requirements set* — the structured list of what the system must do, typically expressed as numbered statements with a standardized vocabulary and a defined level of granularity. The second is the *implementation* — the design documents, the code, the configuration, the data structures that collectively realize the requirements. The third is the *verification* — the tests, the formal analyses, the inspections that demonstrate the implementation satisfies the requirements. The traceability work establishes and maintains the relationships among these three: forward, every requirement traces to design elements that implement it, code that realizes the design, and tests that verify the realization; backward, every code element traces to the requirement(s) it serves, and every test traces to the requirement(s) it verifies. The graph is maintained in a *traceability matrix* — typically a large structured document or database in which every relationship is explicitly recorded.

The effort tax on requirements traceability is concentrated in the *maintenance-under-change tax*, in a particularly acute form. The traceability matrix is itself a representation that must track all of its underlying artifacts as they change. A requirement is added; the matrix gains a row; the implementation and verification cells for the new row must be filled in. A requirement is modified; the implementation and verification cells that traced to the old form must be re-examined to determine whether they still trace to the new form. A piece of code is refactored; the implementation cells that pointed to the old code must be updated to point to the new code. A test is added or removed; the verification cells must be updated. The matrix is updated, in disciplined traceability practice, on every change to any of the underlying artifacts. The update work compounds; the matrix grows quadratically as the system grows linearly (because the trace relationships are between elements from different sets, and the cross-product is what the matrix records); the matrix becomes the system's largest documentation artifact by an order of magnitude in mature safety-critical projects.

The size of the traceability matrix is what creates its maintenance burden. A medium-sized safety-critical project may have a few thousand requirements, tens of thousands of design and code elements, and tens of thousands of tests; the traceability matrix records cross-relationships running into hundreds of thousands of entries. Maintaining hundreds of thousands of entries by human discipline alone is approximately impossible; the regulated environments solve the maintenance problem partly through tooling (specialized requirements-management systems like DOORS, Polarion, and Jama) and partly through dedicated personnel whose role is matrix maintenance. The tooling reduces the per-entry cost; the personnel sustain the discipline; the combination is what makes regulated traceability practicable. Organizations without the tooling investment or the dedicated personnel do not sustain the discipline; the matrix decays to uselessness within months of last serious maintenance.

What AI changes about requirements traceability is the maintenance component in particular, in a way that is more directly mechanistic than perhaps any other restoration in this book. The traceability relationships are *inferrable*, in most cases, from the existing engineering artifacts without the team needing to maintain them explicitly. A requirement contains text that names concepts; code contains identifiers that may or may not correspond to those concepts; tests contain names and assertions that may or may not reference those concepts; design documents contain descriptions that connect the concepts to the implementation. AI can read all of these artifacts and propose the trace relationships — which code implements which requirement, which test verifies which requirement, which design element corresponds to which code module. The proposed relationships are reviewable by the engineer, refinable where the inference is wrong, and maintainable continuously as the underlying artifacts evolve. The maintenance work that historically required specialized tooling and dedicated personnel becomes a continuous AI-mediated comparison that surfaces drift on each change and proposes updates for review.

The operational prompt for an AI-driven requirements-traceability workflow is therefore a prompt that operates on the team's existing artifacts and produces both the initial trace graph and the maintenance reports that keep it current:

```
You are producing and maintaining a requirements-traceability matrix
for the supplied project per the Gotel-Finkelstein framework. The
output is the trace graph and the drift reports that flow from change
detection.

Stage 1: Artifact identification.

For the supplied project:

1. Identify the requirements set: the structured list of requirements,
   wherever it lives (a requirements document, an issue tracker's
   labeled subset, a spec file, a regulatory submission). If the
   requirements are not in a single canonical location, propose a
   consolidated requirements set assembled from the available
   sources.

2. Identify the design artifacts: design documents, architectural
   decision records, interface specifications, schema definitions.

3. Identify the implementation artifacts: code files, configuration,
   data structures.

4. Identify the verification artifacts: test files, formal-analysis
   outputs, inspection records.

Stage 2: Trace inference.

5. For each requirement, propose the trace relationships:
   - Design elements that elaborate or interpret the requirement.
   - Implementation elements (code modules, functions, configuration)
     that realize the requirement.
   - Verification elements (tests, analyses, inspections) that verify
     the requirement.

6. The inference draws on text similarity (requirement vocabulary
   appearing in identifier names and comments), structural
   correspondence (requirement structure mirrored in module
   structure), explicit references (commit messages or comments that
   cite requirement IDs), and surrounding context.

7. For each proposed trace:
   - Provide a confidence rating (High, Medium, Low) based on how
     strongly the artifacts substantiate the trace.
   - Cite the specific text or structural evidence for the trace.
   - Flag traces where the artifacts conflict or where evidence is
     weak.

Stage 3: Backward-trace and coverage analysis.

8. From the inferred forward traces, compute the backward traces:
   for each implementation and verification element, which
   requirement(s) does it serve?

9. Compute coverage:
   - Requirements without traces to implementation (unimplemented
     requirements).
   - Requirements without traces to verification (unverified
     requirements).
   - Implementation elements without traces to requirements
     (untraced code — either unrequired code or requirements
     drift).
   - Verification elements without traces to requirements
     (untraced tests — either over-testing or requirements drift).

10. Surface the coverage gaps for engineer review. Some gaps are
    real defects (unimplemented requirements, missing tests); some
    are artifacts of inference limitations (the trace exists but
    the prompt could not infer it).

Stage 4: Drift detection (continuous mode).

11. When the project changes (a new commit, a modified requirement,
    a new test), the prompt detects:
    - Trace relationships that the change has potentially broken.
    - Trace relationships the change has potentially created.
    - Coverage shifts (new gaps, closed gaps).

12. Produce a change-impact summary that the engineer can review on
    the change's PR before merge.

Stage 5: Output.

13. Produce TRACEABILITY_MATRIX.md containing:
    - Forward trace table (requirement -> design -> implementation
      -> verification).
    - Backward trace table (implementation -> requirements;
      verification -> requirements).
    - Coverage report.
    - Confidence-rated trace list.
    - Per-change impact summaries (in continuous-mode operation).

Provenance discipline: every trace must cite the evidence that
substantiates it. Inference must be explicit rather than implicit.
Where the evidence is weak, the trace must be flagged for
engineer confirmation rather than asserted as certain.

Abort criteria: If the project's requirements set is fundamentally
unstructured (no numbered requirements, no organized requirements
document), propose a requirements-organization step before
traceability inference. Traceability requires a stable target set;
producing the target set is a precondition for the work this prompt
performs.
```

The worked restoration applies the prompt to a portion of Agicore whose requirements set is comparatively well-defined: the DSL parser's coverage of the published Agicore specification documents. The Agicore specification is organized as a set of declaration-type specs (14 spec files at the time of writing), each of which specifies the syntax and semantics of one declaration type. Each spec file contains numbered requirements (typically thirty to eighty per declaration type) that the parser must satisfy. The implementation is the parser code; the verification is the parser's test suite, which contains approximately twelve hundred test cases. The prompt's output is a traceability matrix containing approximately twenty-eight hundred trace entries across the requirements-to-design, requirements-to-implementation, and requirements-to-verification dimensions.

The coverage analysis identifies several findings. Approximately ninety-four percent of the published requirements have High-confidence traces to implementation elements. Approximately eighty-seven percent have High-confidence traces to verification elements. The remaining percentages comprise: requirements with Medium-confidence traces (typically because the implementation is spread across multiple modules and the prompt could not identify the canonical owning module); requirements with weak or no inferred traces (a small number, mostly requirements that the parser does not yet fully implement); and some requirements that the analysis identifies as having drifted between the spec and the implementation (the implementation handles cases the spec does not name; the spec names cases the implementation does not handle). The drift cases — approximately two dozen instances — are surfaced for the engineer's review and become a punch list for either implementation updates or spec updates, depending on which side the team determines is correct.

The work, from initial artifact identification through the full traceability matrix and coverage analysis, takes approximately seven hours of AI runtime plus four hours of engineer review. The same work performed by a DO-178C-style traceability program with the historical tooling and personnel would have required several engineer-weeks of dedicated work, with the matrix maintenance ongoing thereafter at perhaps ten to fifteen percent of overall development effort. The cost reduction is, again, approximately two orders of magnitude. The discipline that has been practiced almost exclusively in regulated environments because the unregulated environments could not afford it becomes practicable in any project whose engineering team values the traceability for non-regulatory reasons: change-impact analysis, onboarding documentation, defect-investigation support, refactoring-confidence improvement.

A note on the relationship between traceability and the other Part IV disciplines is appropriate. Traceability connects requirements to implementation; the Ubiquitous Language (Chapter 16) provides the vocabulary that makes the connection legible; ADRs (Chapter 17) record the decisions that shape the implementation against the requirements; literate programming (Chapter 15) explains the implementation in prose that subsequent engineers can read. The four disciplines compose into a coherent knowledge architecture: requirements traceability is the structural backbone, the Ubiquitous Language is the connective vocabulary, ADRs are the decision history, literate programming is the prose layer. A team that practices all four has a knowledge architecture for its software that the broader software-engineering field has rarely sustained for any system over its lifetime. The restoration is the restoration of *coordinated* knowledge architecture, not just of any single discipline within it.

The chapter that follows turns to the discipline of working with software whose knowledge architecture has *not* been maintained: process archaeology, the practice of reconstructing the history and rationale of a codebase from its artifacts. Process archaeology is the discipline that turns legacy code from an opaque substrate into an inheritable asset, and it has been historically expensive because the reconstruction work was slow and required senior judgment. AI changes the reconstruction calculus substantially.
