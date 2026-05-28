# The Restored Disciplines of Software Engineering: Practices the Effort Tax Killed and AI Brings Back

## Book Metadata
- **Title:** The Restored Disciplines of Software Engineering
- **Subtitle:** Practices the Effort Tax Killed and AI Brings Back
- **Author:** Christopher Bender
- **Publisher:** Synmatic
- **Series:** AI Computer Science (Volume 1C, peer to 1A *Cognition Systems Engineering* and 1B *Semantic Systems Engineering*)
- **Format:** Graduate-level textbook
- **Target Word Count:** ~98,000 words (28 chapters × ~3,500 words)
- **Chapter Count:** 28 chapters across 6 Parts
- **Voice:** Rigorous, precise, authoritative. Present tense for principles and definitions. Past tense for historical narrative — each chapter has historical material that demands it. Third person for formal statements, second person ("you") for practitioner-facing passages. Each chapter carries the weight of a peer-reviewed essay — dense with ideas, unafraid of complexity, but never obscure for its own sake. Technical terms introduced with formal definitions on first use. Citations are inline and complete; bibliographic apparatus full.
- **Tone:** Graduate seminar, not TED talk. The reader is assumed to be an intelligent practicing engineer or technical leader who is capable of holding complexity, has read at least a portion of the source material being discussed, and is interested in the operational implications rather than the historical curiosities. Do not condescend. Do not over-explain. Trust the reader.
- **Implementation Framework:** Agicore — the open-source DSL-based platform for orchestrating cognition systems. `.agi` artifacts appear as restoration examples in Parts II–V. References to 1A (CSE) and 1B (SSE) are explicit and cross-cited.
- **Operational Pattern:** Each chapter terminates in a paste-ready Claude Code prompt — the *operational prompt* — that restores the discipline at modern team scale. The prompt is the book's signature artifact. The reader leaves each chapter with both a theoretical understanding of the resurrected practice and a concrete instruction set that operationalizes it.
- **Core Thesis:** A generation of software engineering disciplines — Function Point Analysis, Cleanroom Software Engineering, Fagan Inspections, Design by Contract, Cleanroom verification, Operational Profiles, Literate Programming, the Software IC, Ubiquitous Language, formal specification, and others — were genuinely good ideas that produced documented results when they were applied. They were not abandoned because they failed. They were abandoned because they could not survive the human-effort tax their implementation imposed. AI eliminates that tax. The disciplines are now affordable. This book is the recovery program — for each abandoned practice, an account of what it was, what it produced when applied, why it died, what AI changes, and an operational prompt that restores it.

---

## The Intellectual Frame: Brooks Inverted

Fred Brooks' *No Silver Bullet — Essence and Accident in Software Engineering* (1986) argued that no single technological development of the following decade would produce a tenfold productivity improvement in software, because the hard part of software is *essential complexity* — the irreducible difficulty of the problem domain itself — and silver bullets only attack *accidental complexity*. Brooks was right about complexity. He was wrong about silver bullets.

He was wrong because the silver bullet was never supposed to be a *technology*. It was supposed to be the *restoration of disciplines that already knew how to manage complexity* — disciplines that produced empirically documented results when they were practiced — disciplines that the field abandoned not because they were ineffective but because the human-effort tax on their implementation exceeded the perceived benefit at the time.

The argument of this book: a class of software engineering disciplines exists for which the documented quality improvement was high, the implementation cost was higher, and the trade-off was unfavorable on 1980s and 1990s economics. AI changes the trade-off because AI eliminates the implementation cost. The disciplines themselves are unchanged. What changed is what we can afford. Brooks remains correct that complexity is essential. The book argues that the *management* of complexity is now affordable in ways it was not. The silver bullet is the restoration.

---

## Theoretical Foundations (Referenced Throughout)

| Theorist / Concept | Year | Contribution |
|---|---|---|
| Fred Brooks | 1986 | *No Silver Bullet* — essential vs. accidental complexity; the inverted thesis |
| Allan Albrecht | 1979 | Function Point Analysis; IFPUG counting practices |
| Harlan Mills | 1980s | Cleanroom Software Engineering; statistical usage testing; certified reliability |
| Michael Fagan | 1976 | Software Inspections; 80% defect detection rates documented |
| Philip Crosby | 1979 | *Quality Is Free*; Zero Defects; the cost-of-quality argument |
| Bertrand Meyer | 1988 | Design by Contract; Eiffel; preconditions, postconditions, invariants |
| Donald Knuth | 1984 | Literate Programming; WEB / CWEB; code as prose |
| Leslie Lamport | 1994 | TLA+; Temporal Logic of Actions; specification-driven verification |
| Barry Boehm | 1981 / 2000 | COCOMO; COCOMO II; calibrated effort estimation |
| John D. Musa | 1993 | Operational Profiles; software reliability engineering |
| Eric Evans | 2003 | Domain-Driven Design; Ubiquitous Language; bounded contexts |
| Brad Cox | 1986 | *Object-Oriented Programming: An Evolutionary Approach*; the Software IC |
| Watts Humphrey | 1989 | CMM / CMMI; statistical process control for software; the Personal Software Process |
| David Parnas | 1972 / 1985 | Information hiding; tabular specifications; Software Cost Reduction |
| Michael Nygard | 2011 | Architecture Decision Records; the ADR pattern |
| Kent Beck & Ward Cunningham | 1989 | CRC cards; class-responsibility-collaborator design sessions |
| Gregor Kiczales | 1997 | Aspect-Oriented Programming; AspectJ |
| Olly Gotel & Anthony Finkelstein | 1994 | Requirements traceability; the traceability problem statement |
| J.-R. Abrial | 1996 | B-Method; formal specification at industrial scale |
| Daniel Jackson | 2006 | Alloy; lightweight formal methods |
| J. Michael Spivey | 1989 | Z Notation; the Z Reference Manual |
| Dan North | 2006 | Behavior-Driven Development; the BDD reframing |
| Claude Shannon | 1948 | Information theory (cross-referenced with 1A Ch 4) |
| W. Ross Ashby | 1956 | Law of Requisite Variety (cross-referenced with 1A Ch 2, 5) |

---

## The Chapter Pattern

Every restoration chapter (Chapters 4 through 26) follows a six-element structure. The structure is deliberate and repeated; the rigor lies in the case material, not in the form.

1. **The Original Formulation.** The discipline in its source: the seminal paper, the foundational book, the named theorist, the year, the institutional context. Quoted directly where possible. The reader meets the idea on its original terms.
2. **The Empirical Evidence.** What did it produce when it was actually applied? Fagan inspections produced 80% defect-detection rates at IBM. Cleanroom produced certified reliability at IBM Federal Systems Division. Function Point Analysis produced repeatable effort estimates within 15% accuracy in calibrated environments. The discipline's track record is named with citations and reproduced numbers.
3. **The Effort-Tax Mechanism.** The specific human-cost component that killed the practice. Fagan inspections required four hours of focused reading per 200 LOC and a multi-person inspection meeting. Cleanroom required formal specifications that took months to write. FPA required trained counters and disciplined inventory work. Literate Programming required prose writing at parity with code. The mechanism is named precisely.
4. **What AI Changes.** The specific tax that AI eliminates or reduces by an order of magnitude. The argument is mechanistic and falsifiable: AI eliminates the four-hour inspection read; AI translates natural-language requirements into formal specifications; AI counts function points from a codebase; AI generates and maintains literate prose. The mechanism is named precisely. The book does not claim AI fixes complexity. It claims AI eliminates the effort tax on practices that were already designed to manage complexity.
5. **The Operational Prompt.** A paste-ready Claude Code instruction — typically 200–500 words — that restores the discipline. The prompt is the book's signature artifact. It specifies inputs, methodology, output format, and abort criteria. The reader can copy it directly. The prompt models good prompt discipline as a side effect: scoped asks, verifiable output specs, explicit provenance requirements, no-fabrication clauses.
6. **A Worked Restoration.** A short illustration of the prompt's output applied to a representative artifact — typically an `.agi` file, a short code snippet, or a before/after document. Demonstrates the prompt in action without expanding into case-study length.

Part I (the thesis chapters) and Part VI (the synthesis chapters) do not follow this pattern; they establish or close the argument. Parts II through V — twenty-three chapters total — are the restoration sequence.

---

## Part Structure

### Part I: The Effort Tax Thesis (Chapters 1–3)
Establishes the central argument. Brooks revisited. The taxonomy of effort-killed disciplines. The chapter pattern as methodology. Part I is the book's intellectual foundation and a prerequisite for the rest.

### Part II: Specification & Estimation (Chapters 4–9)
The disciplines that govern *what software is supposed to do* and *how much it will cost*. FPA, COCOMO II, formal specification (TLA+, Z, Alloy, B), Design by Contract, and tabular specification (Parnas / SCR). The disciplines that died because the front-end of the lifecycle was the most expensive place to put humans.

### Part III: Quality & Verification (Chapters 10–14)
The disciplines that govern *whether software does what it is supposed to do*. Cleanroom, Fagan Inspections, Zero Defect, Operational Profiles, Statistical Process Control for software. The disciplines that died because attention was scarce and review was expensive.

### Part IV: Knowledge & Documentation (Chapters 15–19)
The disciplines that govern *what we know about the software we have*. Literate Programming, the Ubiquitous Language, Architecture Decision Records, Requirements Traceability, Process Archaeology. The disciplines that died because writing was a perpetual debt nobody paid.

### Part V: Architecture & Reuse (Chapters 20–24)
The disciplines that govern *how software is composed and assembled*. The Software IC, CRC Cards, Aspect-Oriented Programming, semantic code graphs, Behavior-Driven Development with maintained Gherkin. The disciplines that died because composition required maintenance the field could not sustain.

### Part VI: The Restored Practitioner (Chapters 25–28)
The synthesis. How an actual team reassembles these disciplines into a coherent restored practice. The relationship to Agicore, CSE, and SSE. The trajectory: which disciplines are next.

---

## Chapter Outlines

### Chapter 1: The Effort Tax

- **Word target:** 3,500
- **Part:** I

**Summary:** Defines the central thesis. Names the *effort tax* — the cost in human attention, calendar time, and disciplined practice required to maintain a software engineering practice in working order. Argues that a large class of documented, empirically validated software engineering disciplines were abandoned not for ineffectiveness but for effort-tax reasons. Establishes the recovery thesis. Distinguishes the thesis from adjacent arguments (AI as productivity multiplier, AI as automation, AI as replacement) — none of which capture the precise claim of this book.

**Key sections:**
- The graveyard of effort-killed disciplines: a quick survey naming twenty practices that produced documented results and were abandoned for effort reasons. The reader sees the scale of the loss before the book argues for individual restorations.
- Defining the effort tax precisely: the tax is not the same as cost-of-quality (Crosby) or technical debt (Cunningham). It is specifically the *recurring human-attention cost* required to maintain the discipline once it is established. One-time setup is not the tax. Ongoing discipline is.
- The economic argument: when the marginal cost of a unit of disciplined attention is high (a trained inspector, a senior architect, a specialist counter), the organization rationally chooses lower-yield-per-attention activities. The discipline dies not because it was wrong but because it lost the resource auction.
- What AI changes: AI reduces the marginal cost of disciplined attention by an order of magnitude. Practices that lost the resource auction at 2000s economics now win it.
- The bounds of the thesis: AI does not restore disciplines whose effort tax was inherent to the human judgment they required (architectural taste, organizational politics, executive trade-offs). The book is about the disciplines whose effort tax was *clerical* — tedious, repeatable, structured work that AI can do faithfully.
- A first taxonomy: clerical effort, attention effort, specification effort, maintenance effort, coordination effort. Each category names a tax mechanism that AI affects differently.

**Key beats:**
- Formal definition of the effort tax
- Quick survey of the disciplinary graveyard (twenty practices)
- Distinction from cost-of-quality and technical debt
- The economic argument for why disciplines died
- The bounded thesis: AI restores effort taxes that were clerical in nature

**Academic anchors:** Brooks (1986), Crosby (1979), Cunningham (1992), DeMarco & Lister (1987)

---

### Chapter 2: No Silver Bullet, Inverted

- **Word target:** 3,500
- **Part:** I

**Summary:** A direct engagement with Brooks' 1986 essay. Reproduces the original argument — essential complexity is irreducible; accidental complexity can be attacked; no single technology will produce an order-of-magnitude productivity gain in the next decade — and accepts it on its own terms. Then makes the inversion: the silver bullet was never supposed to be a technology; it was supposed to be the restoration of disciplines that already knew how to manage essential complexity. AI is not a silver bullet for complexity. AI is a silver bullet for the *implementation cost of complexity-managing disciplines*.

**Key sections:**
- Brooks' essay re-read: essence vs. accident, the four irreducible properties of software (complexity, conformity, changeability, invisibility), the survey of candidate silver bullets (Ada, OOP, automatic programming, graphical programming, formal verification, AI as imagined in 1986). The accuracy of Brooks' predictions after four decades.
- The accidental complexity attacks that actually worked: IDEs, garbage collection, package managers, version control, type inference. Brooks predicted modest gains from each. He was correct.
- The essential complexity argument: domain difficulty cannot be wished away. AI does not change this. A complex domain remains complex. AI does not understand a domain that has never been articulated; it cannot. Christopher's framing throughout 1A and 1B is consistent: AI is a high-variance information factory, not a domain mind.
- The inversion: Brooks surveyed candidate silver bullets and found none. He did not survey the *resumption of disciplines we had once practiced*. The framing did not exist. The book argues that the resumption was the silver bullet all along; the field simply did not have the affordability to take it.
- Falsifiability: the book's thesis is falsifiable. If AI cannot reduce the effort tax of, say, Fagan Inspections to a point that makes the discipline economically viable in 2026 conditions, the chapter fails. The book commits to specifying, for each restoration, the falsifiable claim about effort-tax reduction.
- The relation to 1A: CSE is the discipline that emerges *because* AI is here. The Restored Disciplines is the disciplines that resume *because* AI is here. They are complementary; the book cross-references CSE throughout.

**Key beats:**
- Full re-engagement with Brooks (1986), on its own terms
- The accidental-complexity attacks that worked between 1986 and 2026
- The essential-complexity argument as a permanent bound on AI's contribution
- The inversion: the silver bullet was the restoration
- Falsifiability commitment
- Cross-reference to CSE as a complementary discipline

**Academic anchors:** Brooks (1975, 1986, 1995), Parnas (1985), Boehm (1981), 1A *Cognition Systems Engineering* Ch 1, 4

---

### Chapter 3: The Discipline Recovery Pattern

- **Word target:** 3,500
- **Part:** I

**Summary:** Introduces the six-element chapter pattern as the book's methodological apparatus. Argues the pattern is itself a contribution — a structured way of assessing whether any abandoned software engineering discipline is a candidate for AI-assisted restoration. The reader leaves Chapter 3 able to apply the pattern to disciplines not covered in the book.

**Key sections:**
- The six elements in detail: original formulation, empirical evidence, effort-tax mechanism, AI's specific change, the operational prompt, the worked restoration. Each element's purpose and the failure modes when it is omitted.
- Why empirical evidence is the gate: the book restores disciplines that *worked*. It does not restore disciplines that were proposed but never demonstrated. The empirical evidence requirement filters out fashionable failures.
- The effort-tax taxonomy expanded: each chapter names a specific tax mechanism. The taxonomy from Chapter 1 (clerical, attention, specification, maintenance, coordination) is refined; subtypes are introduced.
- What makes an operational prompt good: scoped ask, verifiable output, explicit methodology, provenance requirements, no-fabrication clauses, abort criteria. These properties are derived from CSE's quality-mesh principles (1A Ch 13–14) and SSE's contract theory (1B).
- The dual contribution: by the end of the book, the reader has both (a) a restored library of disciplines and (b) the methodological apparatus to restore others. The pattern is the meta-discipline.
- A worked example: applying the pattern to a discipline *not* covered in the book (Earned Value Management for software). The reader watches the assessment unfold. EVM is judged a partial restoration candidate — clerical tax recoverable, organizational tax not — and the chapter discusses why.

**Key beats:**
- The six-element pattern stated and defended
- The empirical-evidence gate
- The effort-tax taxonomy expanded
- The operational-prompt quality criteria, with CSE/SSE cross-references
- The dual contribution framing
- One worked-example application (EVM)

**Academic anchors:** 1A *Cognition Systems Engineering* Ch 13–14, 1B *Semantic Systems Engineering* (contracts), Lakatos (1976, on methodology of research programs)

---

### Chapter 4: Function Point Analysis

- **Word target:** 3,500
- **Part:** II

**Summary:** Albrecht's 1979 invention. The first quantitative software-sizing methodology that operated on functionality rather than lines of code. IFPUG's standardization. Documented accuracy in calibrated environments. The death from counter scarcity, training cost, subjective judgment in element identification, and the rise of fashionable alternatives (story points, T-shirt sizes) that abandoned the quantitative claim. The AI restoration: counting from spec or codebase, applied IFPUG weighting, automatic GSC assessment, full ESTIMATE.md output. Christopher's own ESTIMATE.md for Agicore Studio is the worked restoration.

**Key sections:**
- Albrecht at IBM White Plains, 1979: the original problem (estimating IBM systems work consistently across product lines), the original method (count external inputs, outputs, inquiries, internal logical files, external interface files; weight by complexity), the original validation (correlation with effort across IBM projects).
- IFPUG standardization: the 1986 founding, the Counting Practices Manual evolution, the international certification of counters. The discipline mature by 1990, broadly applicable by 1995.
- Empirical evidence: published correlation coefficients between FP and effort in calibrated environments (Albrecht & Gaffney 1983, Kemerer 1987, Jones 1996), the order-of-magnitude improvement over LOC estimation, the established 8-10 FP per person-month productivity rates by industry segment.
- The effort tax: trained counters were rare and expensive ($2,000–5,000 per certification, recurring); the count itself took days for medium systems; subjective judgments on element identification required experience the field never democratized; the GSC assessment required a knowledgeable interlocutor.
- The fashion shift: agile's rejection of pre-coding estimates in favor of velocity-based projection; story points as a deliberately non-comparable unit; the loss of the quantitative claim was framed as a feature.
- What AI changes: an AI counter applies IFPUG rules consistently; counts from artifacts that already exist (a spec, a codebase, a design document); never tires; never drifts in judgment between Monday and Friday; produces a defensible audit trail of the count.
- The operational prompt: full IFPUG counting from a supplied codebase, with weighting, GSC assessment, VAF derivation, COCOMO II cross-check, and an explicit limitations section.
- Worked restoration: Christopher's ESTIMATE.md for Agicore Studio (the example that motivated this book). Walks the reader through the actual document, calling out where the prompt produced each section.

**Key beats:**
- Full history of Albrecht's methodology and IFPUG standardization
- The empirical case for FPA's accuracy in calibrated environments
- The five effort-tax components (counter scarcity, count duration, subjective judgments, GSC interlocutor, training cost)
- The fashion-shift mechanism that compounded the effort-tax effect
- The AI restoration with the ESTIMATE.md worked example
- The operational prompt as a Claude Code instruction

**Academic anchors:** Albrecht (1979), Albrecht & Gaffney (1983), Kemerer (1987), Jones (1996, 2007), IFPUG Counting Practices Manual

---

### Chapter 5: COCOMO II

- **Word target:** 3,500
- **Part:** II

**Summary:** Barry Boehm's 1981 *Software Engineering Economics* and its 2000 sequel *Software Cost Estimation with COCOMO II*. A calibrated parametric model with cost drivers, scale factors, and effort/schedule equations derived from empirical project data. The death from calibration scarcity — no organization had the project history to tune COCOMO II to its own context. The AI restoration: extract calibration data from commit history, issue trackers, and codebase metrics; re-run COCOMO II as a continuous cross-check against ongoing estimates.

**Key sections:**
- COCOMO's three modes (organic, semi-detached, embedded) and the 1981 cost drivers.
- COCOMO II's elaboration: scale factors (PREC, FLEX, RESL, TEAM, PMAT), seventeen effort multipliers, the post-architecture model, the application composition model.
- Empirical evidence: Boehm's own calibration sample (161 projects), subsequent independent calibrations (Chulani, Madachy), the established within-30% accuracy of well-calibrated COCOMO II models.
- The calibration tax: COCOMO II out of the box assumes a generic industry calibration that fits no organization. To produce useful estimates an organization must collect historical project data — effort hours, scope, cost driver ratings, completion data — across enough projects to local-calibrate. Most organizations never accumulate this data; those that do, lose it during reorganizations.
- What AI changes: calibration data is latent in commit history, issue tracker velocity, code-review cycle times, and review-to-merge intervals. AI can extract these signals and produce a calibrated COCOMO II model for an organization that never knew it had the data.
- The operational prompt: a Claude Code instruction that ingests a repository's history, extracts cost driver indicators (product complexity from cyclomatic measures, team capability from review patterns, schedule pressure from commit clustering), computes a local calibration, and produces an estimate envelope for new work.
- Worked restoration: a calibration walkthrough on the Agicore monorepo, comparing AI-extracted cost driver ratings against ground-truth ratings Christopher provides.

**Key beats:**
- Full history of COCOMO and COCOMO II
- The calibration-scarcity tax mechanism
- The empirical case for within-30% accuracy when calibrated
- AI's ability to extract latent calibration data from commit history
- The operational prompt and a worked monorepo example

**Academic anchors:** Boehm (1981, 2000), Chulani (1999), Madachy (1995, 2008), McConnell (2006)

---

### Chapter 6: Formal Methods I — TLA+

- **Word target:** 3,500
- **Part:** II

**Summary:** Leslie Lamport's Temporal Logic of Actions and its specification language TLA+. The successful industrial deployments (Amazon, Microsoft Azure, MongoDB) that proved formal specification can find bugs no testing would catch. The effort tax: a TLA+ specification takes weeks to write; the model checker (TLC) requires careful state-space engineering; the specifier must understand temporal logic and Lamport's TLA. The AI restoration: AI translates natural-language system descriptions into TLA+ specifications, runs TLC against them, and reports invariant violations.

**Key sections:**
- Lamport's path from sequential consistency (1979) to TLA (1994) to TLA+ as a specification language.
- The Amazon Web Services experience (Newcombe et al. 2015): TLA+ catching subtle distributed-system bugs in DynamoDB and S3 that survived extensive testing.
- The intellectual core: temporal logic for system invariants, weak/strong fairness, state actions, the distinction between specifying a system and proving things about it.
- The effort tax: TLA+ is unfamiliar to most engineers; the specification of even a simple protocol requires careful temporal reasoning; the TLC model checker needs state-space pruning to be tractable.
- What AI changes: AI is fluent in TLA+ (it has read every published TLA+ specification); AI can translate a natural-language protocol description into a TLA+ specification with high accuracy; AI can suggest invariants to check and state-space restrictions to make TLC tractable.
- The operational prompt: produce a TLA+ specification of a supplied distributed protocol; identify the system invariants and the liveness properties; produce a TLC configuration; report violations.
- Worked restoration: a TLA+ specification of an Agicore workflow's QC mesh handshake protocol, with discovered invariant violations that motivated a protocol change.

**Key beats:**
- The Lamport intellectual path
- The Amazon empirical case for formal specification at scale
- The temporal-logic effort tax and the TLC state-space tax
- AI's TLA+ fluency
- The operational prompt and a worked Agicore example

**Academic anchors:** Lamport (1979, 1994, 2002), Newcombe et al. (2015), Pnueli (1977)

---

### Chapter 7: Formal Methods II — Z, Alloy, B

- **Word target:** 3,500
- **Part:** II

**Summary:** The broader formal-methods landscape. Z notation (Spivey, Oxford). Alloy (Jackson, MIT) and its declarative model finding. The B-method (Abrial) and its industrial use in the Paris Métro line 14, the Roissy CDG VAL, and the New York City Canarsie Line signaling. The shared effort tax: writing a formal specification is harder than writing the code. The AI restoration: AI as a formal-specification translator and validator.

**Key sections:**
- Z notation: schema calculus, refinement, the Oxford school. Used at IBM Hursley for CICS specifications; documented defect reductions.
- Alloy: relational logic, the small-scope hypothesis (most counterexamples are found in small models), bounded model finding.
- B-method: the only formal method with multiple industrial deployments in safety-critical systems. The Métro line 14 signaling was developed entirely in B and went into service in 1998 with zero significant software defects in operation.
- The shared effort tax across all three: specification mastery, refinement discipline, proof obligations, tool chains that demand patience.
- What AI changes: AI as a translator between system descriptions and Z/Alloy/B specifications; AI as a refinement assistant; AI as a proof-obligation analyzer.
- The operational prompt: produce an Alloy model of a supplied data structure; check the small-scope properties; produce a Z specification of an interface; produce a B abstract machine for a state-machine component.
- Worked restoration: an Alloy model of an Agicore entity-relationship subsystem with discovered scope violations.

**Key beats:**
- The three formal methods placed in historical context
- The B-method industrial track record (most underrated empirical case in the field)
- The shared effort tax
- AI's multi-formalism fluency
- A worked Alloy example on Agicore

**Academic anchors:** Spivey (1989), Jackson (2006), Abrial (1996, 2010), Hayes (1993)

---

### Chapter 8: Design by Contract

- **Word target:** 3,500
- **Part:** II

**Summary:** Bertrand Meyer's contribution. Eiffel's first-class support for preconditions, postconditions, and class invariants. The empirical case for contracts in the Eiffel community and in Spec# (Microsoft Research). The effort tax: writing contracts for every method is tedious; maintaining them as code evolves is harder. The AI restoration: AI infers contracts from existing code and test suites; AI maintains contracts as code changes; AI flags contract drift.

**Key sections:**
- Meyer's *Object-Oriented Software Construction* (1988, 1997) and the Eiffel language's contract-first approach.
- The intellectual core: a method is a contract between caller and callee. Preconditions are what the caller guarantees. Postconditions are what the callee guarantees. Invariants are what the class guarantees across method boundaries.
- The Spec# research at Microsoft (Barnett, Leino, Schulte) and contract verification at compile time.
- Empirical evidence: Eiffel community defect rates in contract-disciplined projects; Spec# verification successes.
- The effort tax: writing contracts requires more thought than writing code; the contract-to-code ratio in disciplined Eiffel projects often approaches 1:1; the maintenance burden grows superlinearly with code size.
- What AI changes: AI infers reasonable preconditions from method bodies and test cases; AI infers postconditions from observable behavior; AI maintains contracts as code evolves; AI flags contract drift when methods change without contract updates.
- The operational prompt: augment a supplied module with Design by Contract specifications derived from existing code and tests, with explicit TODO markers where derivation is uncertain.
- Worked restoration: a contracts-augmented Agicore parser module, with the contracts.md summary table.

**Key beats:**
- Meyer's framework
- The contract-as-specification thesis
- The Eiffel and Spec# empirical record
- The contract-writing tax and the maintenance tax
- AI's contract inference and maintenance capabilities
- The operational prompt and an Agicore worked example

**Academic anchors:** Meyer (1988, 1997, 2003), Barnett et al. (2005, Spec#), Findler & Felleisen (2002, higher-order contracts)

---

### Chapter 9: Software Cost Reduction (Parnas)

- **Word target:** 3,500
- **Part:** II

**Summary:** David Parnas' Software Cost Reduction project at the U.S. Naval Research Laboratory. Tabular specifications for the A-7E aircraft flight software. The four-variable model. The discipline produced specifications that were rigorous, auditable, and modifiable — and that took years to write. The AI restoration: AI generates SCR-style tabular specifications from natural-language requirements and maintains them under change.

**Key sections:**
- Parnas at NRL, 1977 onward: the A-7E project, the four-variable model (monitored variables, controlled variables, input devices, output devices), tabular specifications as a form humans can read and machines can check.
- The intellectual core: a complete specification can be expressed as a set of mathematical functions between monitored and controlled variables; tabular representations of those functions are both human-readable and machine-processable.
- Empirical evidence: the A-7E specification's completeness reviews; the documented modifiability under requirements change; the maintenance characteristics of SCR-disciplined systems.
- The effort tax: producing an SCR specification for a non-trivial system takes person-years; the discipline requires uncommon mathematical maturity; the tools are limited.
- What AI changes: AI produces SCR-style tabular specifications from natural-language requirements; AI maintains the tables under requirements change; AI checks consistency across the tables.
- The operational prompt: produce an SCR-style four-variable model of a supplied subsystem; identify the monitored and controlled variables; produce the condition and event tables; produce a consistency report.
- Worked restoration: an SCR specification of the Agicore router's variable-routing logic.

**Key beats:**
- Parnas' tabular specification methodology
- The A-7E empirical record
- The effort tax of person-years specifications
- AI's table-generation and consistency-checking capabilities
- The operational prompt and an Agicore worked example

**Academic anchors:** Parnas (1972, 1985), Heitmeyer (1996, SCR tools), Parnas & Madey (1995)

---

### Chapter 10: Cleanroom Software Engineering

- **Word target:** 3,500
- **Part:** III

**Summary:** Harlan Mills and IBM's Federal Systems Division, 1980s. A discipline of formal specification, structured design via box structures, code reading instead of debugging, and statistical usage testing for reliability certification. Empirical record at IBM, NASA Goddard, and elsewhere documented defect rates an order of magnitude below industry baseline. The effort tax: the formal specification was punishing; the box-structure design was unfamiliar; the no-debugging discipline required engineers to *prove* code correct before compiling. The AI restoration: AI as the formal specifier; AI as the box-structure designer; AI as the code-reader companion.

**Key sections:**
- Mills' intellectual project at IBM: software as engineered artifact, defect prevention through specification rather than debugging, statistical reliability certification.
- The Cleanroom process: incremental development, formal specification, box-structure design (black box, state box, clear box), verification via mathematical argument before compilation, statistical testing against an operational profile.
- The empirical record: NASA Goddard's COBE Attitude Ground Support System (0.1 defects per KLOC), IBM's deployment data across multiple Federal Systems projects, the IBM Cleanroom Software Technology Center's documented results.
- The effort tax components: specification writing, box-structure mastery, code-reading discipline, statistical-testing apparatus. Each was expensive in 1990s economics; collectively they were prohibitive outside organizations like IBM and NASA that could capitalize the training.
- What AI changes: the formal-specification tax is the largest and AI eliminates the worst of it (Chapters 6–9); the box-structure design can be AI-assisted; code-reading can be AI-paired; statistical testing requires the operational profile (Chapter 13) which is also restored.
- The operational prompt: produce a Cleanroom-style increment specification from a supplied requirement; produce the box-structure decomposition; produce code-reading proof obligations for a clear-box implementation.
- Worked restoration: a Cleanroom-style increment specification for an Agicore validation node.

**Key beats:**
- Mills' Cleanroom methodology
- The empirical record (NASA Goddard, IBM FSD)
- The effort-tax components
- AI's restoration of each component
- A worked Agicore validation-node example

**Academic anchors:** Mills (1986, 1988), Mills & Linger (1986), Selby et al. (1987), Cobb & Mills (1990), Linger (1994)

---

### Chapter 11: Fagan Inspections

- **Word target:** 3,500
- **Part:** III

**Summary:** Michael Fagan's 1976 IBM paper on software inspections. The most empirically validated software-engineering practice in the literature: across dozens of replications, Fagan inspections consistently produced 60–80% defect-detection rates at the inspection stage, removing defects before testing at one-tenth the cost of finding them later. The effort tax: four hours of careful reading per 200 LOC by a trained inspector, plus a multi-person inspection meeting. The AI restoration: AI as the deep-reading inspector with no attention budget constraint.

**Key sections:**
- Fagan at IBM Kingston, 1976: the original paper, the inspection roles (moderator, reader, recorder, author, inspectors), the entry/exit criteria, the inspection meeting protocol.
- The empirical record: Fagan's original 67% defect-detection rate; later replications at Hewlett-Packard (Grady), Bell Labs (Russell), and NASA (Kelly & Sherif); meta-analyses by Boehm and others; the consistent finding that inspections find more defects per dollar than any other defect-removal activity.
- The effort tax components: the 200-LOC-per-hour reading rate that an inspector can sustain; the four-person meeting overhead; the moderator's discipline; the requirement that inspectors be at or above the author's skill level.
- The compounding cultural tax: inspection meetings are socially awkward; defects in another engineer's code are politically sensitive; the discipline requires institutional cover the field rarely provided.
- What AI changes: AI reads at any rate; AI has no political sensitivities; AI sustains attention across thousand-line modules without fatigue; AI follows checklists without drift.
- The operational prompt: perform a Fagan-style inspection of the supplied code unit at the 200-LOC-per-pass rate, applying the supplied checklist categories, classifying findings by severity, output as a moderator's log.
- Worked restoration: a Fagan inspection of an Agicore parser module, with the resulting defect log and a comparison against the actual bug-tracker history of that module.

**Key beats:**
- Fagan's original methodology
- The empirical record (the most-replicated practice in the field)
- The five effort-tax components (reading rate, meeting overhead, moderator discipline, inspector skill requirement, cultural tax)
- AI's deep-read capability and the elimination of the cultural tax
- A worked Agicore inspection with bug-tracker comparison

**Academic anchors:** Fagan (1976, 1986), Russell (1991), Grady (1992), Kelly & Sherif (1990), Gilb & Graham (1993), Wiegers (2002)

---

### Chapter 12: Zero Defects Software

- **Word target:** 3,500
- **Part:** III

**Summary:** Philip Crosby's *Quality Is Free* (1979) applied to software. The Zero Defects movement of the 1980s. The cost-of-quality argument: defects cost more to fix later than to prevent earlier, by orders of magnitude; therefore a Zero Defects target is economically rational. The empirical record (IBM, Motorola, NASA Goddard via Cleanroom). The effort tax: Zero Defects required a quality culture that resisted the move-fast-and-break-things era. The AI restoration: not a cultural restoration, but a *cost-curve* restoration — AI changes the economics of preventive quality work and re-enables the Zero Defects target.

**Key sections:**
- Crosby's *Quality Is Free* thesis: the cost of conformance vs. the cost of nonconformance; the four absolutes of quality management; the Zero Defects target as economic optimum, not aspirational slogan.
- The software adaptation: IBM's Quality Excellence program; the Motorola Six Sigma application to software (defect rates measured in defects per million opportunities); NASA Goddard's Cleanroom certified-reliability targets.
- The empirical evidence: documented quality programs that achieved sub-0.1-defect-per-KLOC rates in production code; the cost-curve data showing 10x–100x cost differentials between defects caught at design vs. defects caught in production.
- The effort tax: Zero Defects required organizational discipline at every level of the lifecycle; it required tools and training the field could not justify outside high-assurance domains.
- The cultural failure mode: the agile movement (2001 onward) reasonably rejected waterfall's gatekeeping but inadvertently abandoned the cost-curve argument. "Move fast and break things" was an economic claim, not an engineering claim. AI changes the economic claim.
- What AI changes: the cost of preventive quality work — inspection (Ch 11), formal specification (Ch 6–9), contracts (Ch 8), operational profiles (Ch 13) — drops by an order of magnitude when AI carries the clerical load. The Zero Defects target becomes economically defensible again at modern team scale.
- The operational prompt: a Zero Defects audit of a supplied module, applying the full preventive-quality stack from prior chapters, with cost-curve estimates for each defect class.
- Worked restoration: a Zero Defects audit of an Agicore subsystem with cost-curve projections.

**Key beats:**
- Crosby's cost-of-quality argument
- The software adaptation and its empirical record
- The cultural failure mode of "move fast and break things" as an economic claim
- AI's restoration of the cost curve
- A worked Agicore audit

**Academic anchors:** Crosby (1979), Juran (1988), Deming (1986), Mills (1986), Humphrey (1989)

---

### Chapter 13: Operational Profiles for Reliability

- **Word target:** 3,500
- **Part:** III

**Summary:** John D. Musa's software reliability engineering work at AT&T. The operational profile — a quantified probability distribution of how users actually exercise the system — as the basis for focused testing. The empirical record: AT&T's documented reliability improvements from operational-profile-directed testing; the cost reductions from not testing what users don't use. The effort tax: building an operational profile required instrumentation few systems had and ethnographic analysis few teams could afford. The AI restoration: AI extracts operational profiles from existing production telemetry, log files, and observability data.

**Key sections:**
- Musa at Bell Labs and AT&T: the foundational 1980s work, the 1993 *Operational Profiles in Software-Reliability Engineering* paper, the 1998 textbook.
- The intellectual core: not all paths through a system have equal probability; testing should be proportioned to the probability distribution of actual use; reliability is meaningful only relative to a stated operational profile.
- The empirical record: AT&T 5ESS switch reliability data; published case studies on reliability-engineered systems; the documented 2–4x test efficiency improvements.
- The effort tax: instrumentation was rare; user-behavior data was hard to collect; the analytical work to derive a profile from raw data was specialized.
- What AI changes: modern systems have observability stacks (OpenTelemetry, Datadog, Honeycomb) that produce torrents of behavioral data; AI can extract operational profiles from this data with no manual analytical work; AI maintains profiles as production behavior shifts.
- The operational prompt: extract an operational profile from supplied telemetry data; identify the high-probability paths; recommend test-coverage proportioning; identify low-probability-but-high-stakes paths that warrant manual review.
- Worked restoration: an operational profile extraction from Agicore's runtime telemetry, with recommended test-coverage reallocation.

**Key beats:**
- Musa's reliability-engineering methodology
- The AT&T empirical record
- The instrumentation tax and the analytical tax
- AI's telemetry-extraction capability
- A worked Agicore profile

**Academic anchors:** Musa (1993, 1998, 2004), Whittaker & Voas (2000), Lyu (1996)

---

### Chapter 14: Statistical Process Control for Software

- **Word target:** 3,500
- **Part:** III

**Summary:** Watts Humphrey and the SEI. The Capability Maturity Model. Level 5 ("Optimizing") practices: statistical process control applied to software development. The Personal Software Process and the Team Software Process. The empirical record at Hill Air Force Base, NASA, and other rigorous CMM L5 deployments. The effort tax: collecting the data, maintaining the discipline, sustaining the measurement infrastructure. The AI restoration: AI as the continuous-measurement infrastructure.

**Key sections:**
- Humphrey at the SEI: the 1989 *Managing the Software Process* book, the CMM, the PSP/TSP, the L5 practices.
- The intellectual core: software development as a process amenable to statistical analysis; defect injection rates as random variables with measurable distributions; assignable causes vs. chance causes; control charts for software.
- The empirical record at organizations that achieved sustained L5: Hill Air Force Base's software engineering organization; certain Indian software firms that built their global reputations on CMM L5 certification; documented productivity and quality improvements.
- The effort tax: the measurement infrastructure required to support statistical process control was prohibitive; the discipline required organizational commitment most companies could not sustain; the PSP/TSP required engineers to track their own time and defects in punishing detail.
- What AI changes: modern repositories carry enough latent process data (commit times, review cycles, defect-fix patterns, test-run histories) that AI can construct SPC charts continuously without engineer effort; the PSP/TSP effort-tracking burden vanishes because the data is already there.
- The operational prompt: produce SPC control charts for a supplied repository's defect-injection rate, defect-removal rate, and effort-per-feature distributions; identify assignable causes; propose process adjustments.
- Worked restoration: SPC analysis of the Agicore repo across the last twelve months.

**Key beats:**
- Humphrey's CMM and PSP/TSP
- The empirical record at L5 organizations
- The measurement and discipline tax
- AI's continuous-measurement capability
- A worked Agicore SPC analysis

**Academic anchors:** Humphrey (1989, 1995, 2000), Paulk et al. (1995), Chrissis et al. (CMMI), Florac & Carleton (1999)

---

### Chapter 15: Literate Programming

- **Word target:** 3,500
- **Part:** IV

**Summary:** Donald Knuth's 1984 paper and the WEB/CWEB system. Code as prose. The TeX implementation as the canonical demonstration. The discipline produced uncommonly readable and maintainable code; almost nobody adopted it. The effort tax: writing the prose at parity with the code; maintaining both as the system evolved; tool friction with mainstream language ecosystems. The AI restoration: AI writes the prose, maintains it under code change, and adapts the literate-programming convention to any host language.

**Key sections:**
- Knuth at Stanford, early 1980s: the WEB system, the dual outputs (weaved documentation, tangled source), the philosophy ("Let us change our traditional attitude to the construction of programs: Instead of imagining that our main task is to instruct a computer what to do, let us concentrate rather on explaining to human beings what we want a computer to do").
- The TeX implementation as the canonical literate program: every page a piece of typeset prose interleaving Pascal code; the resulting *TeX: The Program* book is genuinely readable software.
- The empirical record: very few large literate-programming projects, but those that exist (TeX, METAFONT, certain numerical libraries) show uncommon maintainability and uncommon adoption barriers.
- The effort tax: prose-writing parallel to code-writing; tool friction with mainstream toolchains; the cultural mismatch with code-centric engineering culture.
- What AI changes: AI writes the prose layer on demand; AI maintains the prose as code changes; AI generates literate-programming-style output for any codebase in any language.
- The operational prompt: produce literate-programming-style documentation for a supplied module, interleaving prose explanation with code excerpts, in a form suitable for reading top-to-bottom.
- Worked restoration: a literate-programming view of an Agicore module that was previously documented only by inline comments.

**Key beats:**
- Knuth's WEB and the prose-as-primary philosophy
- The TeX implementation as canonical demonstration
- The prose-parity effort tax and the tool-friction tax
- AI's prose generation and maintenance
- A worked Agicore module rewritten in literate form

**Academic anchors:** Knuth (1984, 1992), Knuth (1986, *TeX: The Program*), Ramsey (1994, noweb), Schulte et al. (2012, Org-mode)

---

### Chapter 16: The Ubiquitous Language

- **Word target:** 3,500
- **Part:** IV

**Summary:** Eric Evans' *Domain-Driven Design* (2003) and the Ubiquitous Language concept: a single, shared, rigorous vocabulary used by domain experts, designers, and the code itself. The discipline produced systems whose code read like the domain it modeled; the discipline died because the language always rotted — the code's vocabulary drifted from the business vocabulary as soon as both started evolving independently. The AI restoration: AI as the perpetual lexicographer.

**Key sections:**
- Evans' framework: bounded contexts, ubiquitous language, aggregates, the deep model. The language as the connective tissue between business and code.
- The intellectual core: when domain experts, designers, and code use the same terms with the same precise meanings, mistranslation defects collapse. The vocabulary itself is the artifact.
- The empirical record: DDD-disciplined projects show uncommon coherence; the literature is rich with case studies, including in Vaughn Vernon's *Implementing Domain-Driven Design*.
- The effort tax: the language must be authored, maintained, distributed, and enforced. Glossaries decay. Domain experts move on. Refactorings drift from the named concepts. The maintenance burden is constant.
- What AI changes: AI maintains the glossary continuously as code changes; AI detects drift between code identifiers and the canonical glossary; AI proposes refactorings to realign code with language; AI translates between the same concept's representations across bounded contexts.
- The operational prompt: extract a ubiquitous language glossary from a supplied codebase; detect drift between code and prior glossary; produce a current canonical glossary with definitions and code references.
- Worked restoration: a ubiquitous language glossary for Agicore's declaration system, with detected drift between code and CSE/SSE published terminology.

**Key beats:**
- Evans' DDD and the ubiquitous language concept
- The empirical record of DDD-disciplined projects
- The language-decay effort tax
- AI as continuous lexicographer
- A worked Agicore glossary

**Academic anchors:** Evans (2003), Vernon (2013), Brandolini (2009, EventStorming), 1B *Semantic Systems Engineering* cross-references

---

### Chapter 17: Architecture Decision Records

- **Word target:** 3,500
- **Part:** IV

**Summary:** Michael Nygard's 2011 blog post that named the practice; subsequent adoption across the industry. The discipline: record every architecturally significant decision in a short, dated document — context, decision, status, consequences. The empirical record: teams with maintained ADRs onboard new engineers faster and re-litigate fewer settled decisions. The effort tax: writing an ADR requires synthesizing the discussion that led to the decision, which most teams never get around to. The AI restoration: AI as the ADR scribe.

**Key sections:**
- Nygard's original post and the ADR format (one page, sections: Context, Decision, Status, Consequences).
- The intellectual core: an organization's architecture is the cumulative effect of decisions; without a record, the rationale evaporates as personnel turn over; without rationale, every prior decision is potentially re-litigated.
- The empirical record: teams with maintained ADR repositories show measurable onboarding-time reductions and reduced re-litigation; case studies in Spotify, Thoughtworks, and elsewhere.
- The effort tax: writing the ADR after the decision is the hardest moment in the workflow; the discussion is already over; nobody wants to look backward to write down what was concluded. The act of writing is a transition cost that teams systematically avoid.
- What AI changes: AI synthesizes the decision from the PR discussion, the design-doc comments, the meeting notes (if recorded), the commit messages; AI drafts the ADR; the human reviews and merges. The synthesis tax is eliminated.
- The operational prompt: from a supplied PR or design document, produce an ADR in the Nygard format, with explicit traceback to the source artifacts.
- Worked restoration: ADRs for the six Agicore Studio architectural decisions (AD-1..AD-6 referenced in MEMORY), each one synthesized from the prior design documents.

**Key beats:**
- Nygard's ADR format and adoption history
- The empirical record
- The synthesis tax as the dominant effort component
- AI's PR-and-design-doc synthesis capability
- A worked Agicore Studio ADR set

**Academic anchors:** Nygard (2011), Keeling (2017), Kruchten et al. (2009, architectural knowledge management)

---

### Chapter 18: Requirements Traceability

- **Word target:** 3,500
- **Part:** IV

**Summary:** Olly Gotel and Anthony Finkelstein's 1994 paper that formally stated the problem. The discipline: maintain a graph linking requirements to design elements to code to tests; never lose the chain. The empirical record in safety-critical industries (aerospace, medical devices) where traceability is regulatory. The effort tax: maintaining the trace by hand is impossible at any nontrivial scale; tool support was always inadequate. The AI restoration: AI as the continuous trace-graph maintainer.

**Key sections:**
- Gotel & Finkelstein's problem statement and the four-element trace (forward/backward, pre-RS/post-RS).
- The intellectual core: every requirement should be implementable, traceable, testable, and validatable; the trace makes change impact analysis possible and audits feasible.
- The empirical record: DO-178C (aviation software) and IEC 62304 (medical software) require traceability; the practice is sustained in those regulatory environments because the auditor's job depends on it.
- The effort tax: the trace must be maintained as requirements, designs, code, and tests all evolve; the matrix-style traceability table grows quadratically; trace-rotting under change is universal.
- What AI changes: AI infers traces from artifacts continuously (requirement IDs in commit messages, test names that match requirement names, design-doc references); AI maintains the trace graph as artifacts evolve; AI flags broken or stale traces.
- The operational prompt: from a supplied requirements set and codebase, produce a forward-and-backward trace graph; identify broken links; identify untraced requirements; identify untraceable code.
- Worked restoration: a traceability graph from Agicore's spec files (the 14 reference specs) through the parser and compiler to the test suites.

**Key beats:**
- Gotel & Finkelstein's framework
- The regulatory-industry empirical record
- The maintenance tax under change
- AI's continuous trace-inference capability
- A worked Agicore trace graph

**Academic anchors:** Gotel & Finkelstein (1994), Ramesh & Jarke (2001), Cleland-Huang et al. (2014)

---

### Chapter 19: Process Archaeology

- **Word target:** 3,500
- **Part:** IV

**Summary:** The practice of reconstructing the history and rationale of a codebase from its artifacts — commits, comments, dead code, deprecated branches, archived issues. Once a specialty practiced by a small number of consultants; now restorable for every team. The empirical record: legacy modernization projects have always succeeded or failed on the quality of their archaeological work. The AI restoration: AI as the always-available archaeologist.

**Key sections:**
- The discipline's origins in the legacy-modernization consulting world (Brad Cox, Michael Feathers, others). Feathers' *Working Effectively with Legacy Code* as the practitioner-facing canon.
- The intellectual core: a codebase is a sedimentary record; every layer reflects a decision and a context; reading the layers in order recovers the rationale; the rationale governs the modernization options.
- The empirical record: post-mortem case studies of successful and unsuccessful legacy modernizations; the consistent finding that successful modernizations did the archaeological work first.
- The effort tax: archaeological work is slow, requires senior judgment, and produces no obvious near-term deliverable. Most modernization projects skip it and pay later.
- What AI changes: AI reads commit history at any depth; AI summarizes deprecated branches; AI surfaces dead code and identifies its likely former purpose; AI produces a narrative archaeology of any codebase on demand.
- The operational prompt: produce an archaeological report on a supplied codebase, walking the major architectural eras visible in the history, with named decision points and their context.
- Worked restoration: an archaeological report on the Agicore parser's evolution across the last twenty months.

**Key beats:**
- The archaeology discipline and its origins
- The legacy-modernization empirical record
- The senior-judgment tax
- AI's depth-reading and summarization capability
- A worked Agicore parser archaeology

**Academic anchors:** Feathers (2004), Demeyer et al. (2002), Sneed (2001), Hunt & Thomas (2000)

---

### Chapter 20: The Software IC

- **Word target:** 3,500
- **Part:** V

**Summary:** Brad Cox's 1986 *Object-Oriented Programming: An Evolutionary Approach* and the Software IC vision: software components as interchangeable integrated circuits, assembled rather than written. The intellectual project failed because finding-and-adapting components was always more expensive than rewriting. The AI restoration: AI does both sides of the find-and-adapt math — it knows the library of components in the world, and it adapts them faithfully to the host context.

**Key sections:**
- Cox at Schlumberger / Productivity Products: Objective-C, the Software IC, the dream of a software components industry.
- The intellectual core: the integrated-circuit analogy, the open-shop manufacturing comparison, the economics of reusable components.
- Why it failed: the discovery problem (you didn't know what existed); the adaptation problem (interfaces never matched perfectly); the trust problem (a component's actual behavior was unknown until you used it). Cox saw all three; the answers were not available to him.
- The empirical record: the package ecosystem (npm, PyPI, crates.io) is a partial fulfillment of the Software IC dream, but the adaptation and trust problems remain.
- What AI changes: AI knows what exists across all major package ecosystems and adjacent open-source repositories; AI adapts interfaces by writing the bridge code; AI inspects component behavior by reading the implementation; AI can survey a half-dozen candidate components and produce a substantiated comparison.
- The operational prompt: for a supplied requirement, survey the candidate components across major ecosystems, produce a comparison matrix (license, maintenance status, API fit, internal behavior, integration cost), and recommend one with explicit trade-off rationale.
- Worked restoration: a Software IC survey for a hypothetical Agicore requirement (e.g., a TOML parser swap), demonstrating the full comparison.

**Key beats:**
- Cox's Software IC vision
- Why it failed historically
- The partial fulfillment in modern package ecosystems
- AI as discovery, adaptation, and trust assistant
- A worked Agicore survey

**Academic anchors:** Cox (1986, 1990), McIlroy (1968, mass-produced software components), Szyperski (2002, *Component Software*)

---

### Chapter 21: CRC Cards

- **Word target:** 3,500
- **Part:** V

**Summary:** Kent Beck and Ward Cunningham's 1989 OOPSLA paper. Class-Responsibility-Collaborator cards: index cards passed around a room to design object-oriented systems through enactment. A beloved practice that produced uncommon design coherence and was abandoned because the cards were never kept current. The AI restoration: AI as the continuously updated CRC deck — never out of date.

**Key sections:**
- Beck and Cunningham at OOPSLA 1989: the original paper, the card format (Class name, Responsibilities, Collaborators), the design session as enactment.
- The intellectual core: object-oriented design is fundamentally about role assignment and collaboration; humans assign roles best by physically representing them and walking through scenarios.
- The empirical record: the practice was widely loved among practitioners who tried it; the design sessions consistently produced cleaner abstractions and fewer god-classes; the cards themselves rotted within weeks of the design session.
- The effort tax: nobody updated the cards as the design evolved; the cards lived in a folder that became archaeological the moment the session ended.
- What AI changes: AI maintains a CRC representation of a codebase continuously, derived from the code; AI can simulate a CRC session by walking through a proposed change against the current deck; AI flags responsibility drift and collaboration tangles.
- The operational prompt: from a supplied codebase, produce a current CRC card deck for the key classes/modules; identify responsibility violations; identify excessive collaboration tangles.
- Worked restoration: a CRC deck for Agicore's compiler module with discovered tangles.

**Key beats:**
- Beck & Cunningham's CRC methodology
- The empirical record of design coherence
- The card-rot tax
- AI as continuous CRC deck maintainer
- A worked Agicore compiler example

**Academic anchors:** Beck & Cunningham (1989), Wirfs-Brock & McKean (2003, *Object Design*)

---

### Chapter 22: Aspect-Oriented Programming

- **Word target:** 3,500
- **Part:** V

**Summary:** Gregor Kiczales and Xerox PARC, late 1990s. AspectJ. The recognition that cross-cutting concerns (logging, security, persistence, transactions) violate modularity and need first-class support. The discipline produced clean separations and was abandoned because reasoning about aspect-augmented code was harder than the modularity gain justified. The AI restoration: AI as the cross-cutting reasoner — it traces aspect effects and explains them at every call site.

**Key sections:**
- Kiczales at Xerox PARC: the AspectJ work, the OOPSLA papers, the early-2000s enthusiasm.
- The intellectual core: classical modularity decomposes systems along one dimension; real systems have multiple dimensions of decomposition, and the failure to factor each is the source of much code duplication.
- The empirical record: AOP-disciplined Java projects showed cleaner separations of concerns; the reasoning tax was real and documented; the field largely retreated to lighter forms (decorators, middleware, hooks) that preserved some benefit at lower cost.
- The effort tax: an aspect-augmented program's behavior at a given call site is the composition of the call site's direct logic and any aspect that targets it; reasoning about this requires holding both in mind simultaneously, which humans found taxing.
- What AI changes: AI traces aspect application across the codebase mechanically; AI explains, at any call site, the full composed behavior; AI maintains a register of which aspects affect which join points and surfaces it on demand.
- The operational prompt: for a supplied aspect-augmented codebase (or a codebase with lighter cross-cutting concerns, modeled as aspects), produce a per-call-site composed-behavior trace; identify call sites where aspect interactions are surprising.
- Worked restoration: an AOP-style analysis of Agicore's cross-cutting validation hooks, with surprises surfaced.

**Key beats:**
- Kiczales' AOP framework
- The empirical record and the reasoning tax
- AI's cross-cutting analysis capability
- A worked Agicore validation-hook analysis

**Academic anchors:** Kiczales et al. (1997), Kiczales et al. (2001, AspectJ), Filman et al. (2004)

---

### Chapter 23: Knowledge Graphs and Semantic Tagging

- **Word target:** 3,500
- **Part:** V

**Summary:** The decades-long ambition to represent a codebase as a knowledge graph — entities, relationships, semantic tags — for query and navigation. CodeQL, Sourcegraph, Roslyn analyzers, and a long tail of academic projects. The discipline died at scale because populating the graph required tagging effort the field would not pay. The AI restoration: AI populates and maintains the graph continuously.

**Key sections:**
- The intellectual lineage: Linked Data (Berners-Lee, 2006), the Semantic Web, ontologies, the long history of code-as-knowledge-graph attempts.
- The modern instantiations: CodeQL's database schema and query language, Sourcegraph's graph-syntax intelligence, the Language Server Protocol's typed semantic queries.
- The empirical record: large-scale knowledge-graph deployments at Google (Kythe), GitHub (Semantic), Facebook/Meta (Glean); the productivity gains for engineers who can query the graph; the catch that the graph requires curation.
- The effort tax: the semantic tagging that goes beyond mechanical extraction (this function implements this requirement; this class is part of this bounded context; this pattern is an instance of that pattern) requires human judgment that the field could not scale.
- What AI changes: AI applies semantic tags consistently at scale; AI maintains the tags under refactoring; AI translates between tag schemes; AI answers natural-language queries against the graph.
- The operational prompt: from a supplied codebase, produce a knowledge graph with semantic tags spanning requirements, bounded contexts, design patterns, and ownership; provide a query interface specification.
- Worked restoration: a knowledge-graph view of the Agicore declarations, with semantic tags relating each declaration to the appropriate CSE/SSE concept.

**Key beats:**
- The knowledge-graph and Semantic Web lineage
- The modern code-graph deployments
- The semantic-tagging tax
- AI's tagging and query capability
- A worked Agicore declaration graph

**Academic anchors:** Berners-Lee et al. (2001, the Semantic Web), Kythe / Glean architectural papers, 1B *Semantic Systems Engineering* (full cross-reference)

---

### Chapter 24: Behavior-Driven Development with Maintained Gherkin

- **Word target:** 3,500
- **Part:** V

**Summary:** Dan North's 2006 BDD reframing of TDD. Gherkin (Given/When/Then) as the executable specification format. The discipline produced specifications that domain experts could read and test runners could execute; in practice, the .feature files rotted faster than any other artifact in modern repositories. The AI restoration: AI as the Gherkin maintainer — keeps the feature files current as code changes, generates new scenarios from observed production behavior, and detects scenario drift.

**Key sections:**
- North's BDD framing: TDD with attention to language; the focus on behavior rather than test mechanics; the Given/When/Then structure.
- Cucumber, SpecFlow, and the Gherkin ecosystem.
- The empirical record: BDD-disciplined teams report uncommon alignment between business and engineering; the documented improvements in specification clarity.
- The effort tax: Gherkin maintenance under code change; the gulf between aspirational scenarios and actual production behavior; the scenario-glue-code burden.
- What AI changes: AI maintains scenarios as code changes; AI generates scenarios from production telemetry (cross-referenced with Ch 13's operational profiles); AI flags drift between scenarios and code behavior.
- The operational prompt: for a supplied codebase with existing Gherkin scenarios, audit each scenario against current code behavior; propose updated scenarios; generate new scenarios from supplied telemetry.
- Worked restoration: a BDD scenario audit of an Agicore subsystem.

**Key beats:**
- North's BDD reframing
- The Gherkin ecosystem
- The maintenance tax
- AI's scenario maintenance and generation
- A worked Agicore audit

**Academic anchors:** North (2006), Wynne & Hellesoy (2012, *The Cucumber Book*), Adzic (2011, *Specification by Example*)

---

### Chapter 25: Test Coverage Mapping at the Feature Level

- **Word target:** 3,500
- **Part:** VI

**Summary:** A discipline GPT named in the original brainstorm. Mainstream coverage tools report line/branch coverage; the discipline of mapping tests to *features* — what user-visible capability each test exercises — was never automated and was always done in heroic project sprints that nobody maintained. The AI restoration: AI maintains feature-coverage maps continuously.

**Key sections:**
- The distinction between line coverage and feature coverage. Why line coverage is a poor proxy for confidence.
- The historical attempts: requirements-based testing (cross-ref Ch 18), test-case management tools (Quality Center, TestRail), spreadsheets maintained by QA teams.
- The empirical record: the feature-coverage maps that were maintained well produced uncommonly confident release decisions; the maps that were maintained poorly produced false confidence.
- The effort tax: every test must be classified by feature; classifications must be maintained as both tests and features evolve; the cross-product matrix is fragile.
- What AI changes: AI classifies tests by feature based on test names, assertions, and the code paths they exercise; AI maintains the classification under change; AI surfaces feature-coverage gaps and feature-coverage redundancies.
- The operational prompt: from a supplied test suite and feature list, produce a feature-coverage map; identify uncovered features; identify redundantly covered features.
- Worked restoration: a feature-coverage map of Agicore's parser test suite.

**Key beats:**
- Line vs. feature coverage
- The historical attempts
- The classification tax
- AI's feature-classification capability
- A worked Agicore parser example

**Academic anchors:** Myers et al. (2011, *The Art of Software Testing*), Whittaker (2009, *Exploratory Software Testing*)

---

### Chapter 26: Conceptual Integrity in Multi-Author Codebases

- **Word target:** 3,500
- **Part:** VI

**Summary:** Fred Brooks' *Mythical Man-Month* concept: a system has conceptual integrity when its design seems to flow from one mind. Brooks argued integrity was the most important attribute and that it required either a single mind or a brutal architectural review discipline. The empirical record: systems with conceptual integrity outlive systems without it. The discipline died because the review effort was prohibitive. The AI restoration: AI as the surrogate single mind — surfacing integrity violations and proposing alignments.

**Key sections:**
- Brooks' argument in *The Mythical Man-Month* (1975) and the elaborated version in *No Silver Bullet* and *The Design of Design*.
- The intellectual core: a system's conceptual integrity is the consistency of its abstractions, naming, error handling, and idiomatic patterns across all of its modules.
- The empirical record: systems with documented conceptual integrity (Unix, TeX, the original Lisp Machine OS) have shown decade-scale longevity; systems without it (most enterprise software) accumulate maintenance debt faster.
- The effort tax: enforcing conceptual integrity required a single mind or an empowered architectural review board; both were rare; both were expensive.
- What AI changes: AI surveys an entire codebase for consistency violations against a stated integrity standard; AI proposes alignments; AI does not replace the architectural mind but extends it across more surface area.
- The operational prompt: for a supplied codebase and a stated integrity standard (naming conventions, error-handling patterns, abstraction levels, idiomatic patterns), survey for violations and propose alignments with rationale.
- Worked restoration: a conceptual-integrity survey of Agicore against a stated integrity standard.

**Key beats:**
- Brooks' conceptual-integrity framework
- The empirical record of long-lived systems
- The single-mind effort tax
- AI as integrity surveyor
- A worked Agicore survey

**Academic anchors:** Brooks (1975, 1986, 2010), Raymond (2003, *The Art of Unix Programming*), Knuth (1986, on TeX as a unified system)

---

### Chapter 27: The Restored Practitioner's Workflow

- **Word target:** 3,500
- **Part:** VI

**Summary:** Synthesis. A working software engineer in 2026 who restores the disciplines this book has covered: what their week looks like, what their tools look like, what their reasoning looks like. Not a hypothetical futurist sketch — a concrete, present-tense description of practice. References each chapter's operational prompt; shows how the prompts compose into a daily workflow. The Agicore implementation as a reference instantiation.

**Key sections:**
- A week in the practice: estimation (Ch 4–5), specification (Ch 6–9), quality discipline (Ch 10–14), knowledge maintenance (Ch 15–19), reuse and design (Ch 20–24), coverage and integrity (Ch 25–26). The week is full of restored disciplines; no single one is itself a full-time job; together they constitute the engineer's craft.
- Tool composition: the restored disciplines are not separate tools but a composed practice; the operational prompts can be chained; the outputs of one are the inputs to another.
- The Agicore implementation: how a Cognition Systems Engineer (1A) using Semantic Systems Engineering (1B) practices the Restored Disciplines (this volume) in a single coherent workflow.
- The training of the next practitioner: how an engineer comes to this practice; what the entry-level version looks like; how the disciplines compound over years.
- The team practice: not all of these disciplines are individual; some require team coordination. The chapter names which.
- A note on culture: the disciplines exist in a culture that values them or does not. Cultural restoration is not the subject of this book, but the chapter names the cultural conditions under which restoration takes hold.

**Key beats:**
- A worked week-in-the-practice
- The composability of operational prompts
- The Agicore reference implementation
- The training path
- The team-vs-individual distinction
- The cultural envelope

**Academic anchors:** Cross-references throughout 1A and 1B; Hunt & Thomas (2019, *The Pragmatic Programmer 20th Anniversary Edition*)

---

### Chapter 28: The Trajectory — What Gets Restored Next

- **Word target:** 3,500
- **Part:** VI

**Summary:** The book's closing argument. The discipline-recovery pattern (Ch 3) applied to disciplines not covered in the present volume. A survey of candidate next restorations: model-based systems engineering at the Parnas/SCR level; formal proof in mainstream development (not just safety-critical); the IEEE/EIA standards bodies' specification practices; SEI's Personal Software Process at scale; the long tail of named methods (JSP, JSD, OOSE) that the field forgot. An invitation to the reader to apply the pattern themselves.

**Key sections:**
- The next-tier restoration candidates: the disciplines that warrant their own treatment but didn't fit this volume.
- The bound of the thesis: which disciplines AI cannot restore. Architectural judgment, organizational politics, executive trade-off discipline — these have effort taxes too, but the taxes are not clerical and AI's contribution is bounded.
- The meta-restoration: the discipline of *recognizing* disciplines that should be restored. The pattern of Chapter 3 as a practitioner's diagnostic tool.
- The cultural argument: the restored disciplines need cultural conditions to flourish. The book closes by naming those conditions and by noting that the conditions are themselves more affordable than they were.
- An open invitation: this book is a recovery program for the disciplines it names; the field has many more that warrant the same treatment. The reader is invited to take the pattern and apply it.
- The relation to 1A and 1B: CSE and SSE are the new disciplines that emerge because AI is here; the Restored Disciplines are the old disciplines that resume because AI is here. Together they constitute the practitioner's full repertoire in the AI era.

**Key beats:**
- The survey of next-tier candidates
- The bound of the thesis on non-clerical effort taxes
- The diagnostic-tool framing of Chapter 3's pattern
- The cultural envelope as the final variable
- The open invitation to the reader

**Academic anchors:** Brooks (1986) — closing return to the inverted thesis; the full bibliography of named-but-not-treated disciplines

---

## Cross-references

- *Cognition Systems Engineering* (1A) — referenced in Chapters 2 (CSE as complementary discipline), 3 (quality-mesh principles inform operational-prompt criteria), 6–14 (CSE's QC and validation framework parallels the restored quality disciplines), 27 (the synthesis).
- *Semantic Systems Engineering* (1B) — referenced in Chapters 3 (contract theory), 16 (Ubiquitous Language is an SSE concept in the codebase), 23 (knowledge graphs and semantic tagging are SSE artifacts), 27 (the synthesis).
- *Agicore* (2 — the foundational technical volume) — referenced throughout as the implementation framework; `.agi` artifacts appear in worked restorations in Chapters 4, 9, 10, 11, 13, 14, 16, 17, 18, 19, 21, 22, 23, 24, 25, 26.

## Imprint

Published under **Synmatic**. Volume 1C in the AI Computer Science series. Peer to 1A (*Cognition Systems Engineering*) and 1B (*Semantic Systems Engineering*).

## Title and Subtitle

*The Restored Disciplines of Software Engineering* — main title.
*Practices the Effort Tax Killed and AI Brings Back* — subtitle.

The title names the recovery program. The subtitle names the mechanism and the agency.
