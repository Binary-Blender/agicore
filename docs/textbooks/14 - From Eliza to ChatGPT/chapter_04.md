# Chapter 4: MYCIN, 1974

Two years after Terry Winograd's PhD defense at MIT, a PhD student at Stanford University named Edward Shortliffe began work on his own thesis project.

Shortliffe was a physician as well as a computer scientist. He was simultaneously enrolled in the Stanford Medical School and the Stanford computer science department, on a joint program that produced an MD and a PhD across approximately seven years of combined coursework. His clinical specialty was internal medicine; his computer-science research advisor was Bruce Buchanan, a philosopher-turned-AI-researcher who had been working since the mid-1960s on a chemistry-deduction program called DENDRAL.

Shortliffe wanted to build, for the domain of bacterial infection diagnosis, what Buchanan had built for the domain of mass-spectrometry interpretation.

The program he built was called MYCIN.

The name was a contraction of the word *antimicrobial*, the class of drugs MYCIN was designed to help physicians select. The system worked by interviewing the physician about the patient: what cultures had been drawn, what organisms had been identified, what the patient's age was, what their underlying conditions were, what other drugs they were already on. The system applied a rule-base of approximately five hundred encoded inference rules — each rule of the form *if [these conditions], then [this conclusion, with this confidence]* — and produced a recommendation: this antibiotic, at this dose, for this many days, with this confidence interval.

The rules had been encoded by hand.

The encoding was the project.

Shortliffe spent approximately three years, between 1972 and 1975, interviewing Stanford infectious-disease specialists, asking them to talk through how they reasoned about cases, transcribing the reasoning, distilling it into if-then form, and entering the result into MYCIN's rule database. Each rule took, on average, two to three hours of expert time to elicit, plus an additional several hours of Shortliffe's own time to encode. Five hundred rules. The arithmetic gives a project budget of approximately three thousand expert-hours and approximately fifteen hundred Shortliffe-hours. The actual project consumed more time than that, because many of the rules went through multiple revisions as Shortliffe discovered that the experts disagreed with each other about basic clinical reasoning, and that the disagreements had to be resolved before MYCIN could be told what to believe.

The project was a fascinating exercise in collective epistemology disguised as a software-engineering effort.

The result, in 1976, was a system that worked.

In a series of blind evaluations conducted between 1976 and 1979, MYCIN's antibiotic recommendations were compared against the recommendations of Stanford's faculty infectious-disease physicians, with the comparisons judged by a separate panel of physicians who did not know which recommendations were from MYCIN and which were from the faculty. MYCIN's recommendations were judged acceptable in roughly sixty-five percent of cases. The faculty physicians' recommendations were judged acceptable in roughly fifty-five percent of cases.

The expert system was, on the blinded measure, better than the experts.

---

MYCIN was never deployed in clinical practice.

The reasons for the non-deployment, on the field's collective subsequent reflection, were three.

The first reason was liability. In 1979 there was no precedent for the medical liability of a software system that produced diagnostic recommendations. If MYCIN's recommendation killed a patient, who was at fault? The physician who accepted the recommendation? The hospital that installed the system? Stanford? Shortliffe personally? The American legal profession had no answer, the American insurance industry had no answer, and the American medical profession was not interested in finding out by being the first to use it.

The second reason was integration. MYCIN ran on a DEC mainframe and required the physician to sit at a terminal and answer questions for approximately twenty to thirty minutes per case. In 1979 there were no terminals at the bedside. Physicians did not type. The workflow of admitting a patient, drawing cultures, sending them to the lab, receiving the results, and making a treatment decision did not, anywhere in its actual operational reality, contain a thirty-minute pause for typing answers to a mainframe. Adding such a pause would have required rebuilding hospital workflow from scratch.

The third reason was the political one, and on the field's quiet honest assessment, the deepest. MYCIN was not just better than the physicians on the blinded comparison. MYCIN was *visibly* better — its rule-base could be audited, its reasoning could be displayed, its confidence intervals were explicit. A physician whose recommendation differed from MYCIN's could be asked to explain the difference, and could not, on average, produce as compelling an explanation as MYCIN could. This put physicians in the position of being audited by a program. The medical profession of 1979 was not, on any honest assessment, prepared to be audited by a program. The profession is not prepared in 2026 either.

MYCIN's lessons, on the field's collective subsequent reflection, were therefore in three distinct categories.

The technical lessons were positive. Rule-based reasoning worked. Confidence intervals worked. Audit trails worked. The encoding bottleneck was real but tractable at the scale of five hundred rules — Shortliffe had proven it could be done. The medical-AI literature of the 1980s and 1990s would be dominated by descendants of MYCIN — INTERNIST, CADUCEUS, ONCOCIN, IRIS — that applied the same architecture to different specialties.

The deployment lessons were negative. Liability, workflow integration, and political acceptance were all bottlenecks more severe than the encoding had been. Building the system was hard. Getting the system used was harder. The field, in the 1980s and 1990s, would learn this lesson over and over again as expert systems built by serious people in serious domains sat unused on the shelves of serious institutions.

The philosophical lesson, on the field's longest view, was that being right is not enough.

MYCIN was right.

MYCIN was not used.

The history of every subsequent technically-correct AI system whose deployment failed for non-technical reasons can be read as a footnote to MYCIN's story.

---

## The lesson

MYCIN's lesson is, on the working practitioner's reading, the lesson that *the program is the easy part*.

Shortliffe spent three years building the encoded knowledge that made MYCIN work. The encoded knowledge was the bottleneck of the build. But the encoded knowledge was, in retrospect, the *easy* bottleneck. The hard bottlenecks were the ones MYCIN never made it past: getting the program into the workflow, getting the workflow's professionals to accept being audited by the program, getting the legal system to allocate liability for the program's mistakes.

In the field today, this lesson is most often forgotten by founders building AI products for regulated industries. The technical demo works. The technical demo always works. The deployment fails. The deployment always fails. The reasons are the same reasons MYCIN's deployment failed.

The practitioner who has internalized MYCIN's lesson asks, before building, the second question.

Building MYCIN took three years.

Building the political conditions for MYCIN to be used would have taken a generation.

We are not, on the honest reading of 2026, finished with that generation.

---

## The build: Clinical Decision Support

The reference implementation for this chapter is the Accelerando suite's clinical documentation and decision support system:

```
agicore-examples/accelerando/clinical/accelerando_clinical.agi
```

The application is the modern lineal descendant of MYCIN. It runs as a web service exposed on port 3009, with a React frontend, an Axum API, and a PostgreSQL backing store. The system ingests synthetic patient encounter data, applies a rule-base of approximately three hundred encoded clinical-decision-support rules — covering antibiotic selection, drug-drug interactions, pediatric dosing, pregnancy contraindications, and a small set of common chronic-disease management protocols — and emits both a recommendation and a full audit trail of the rules that fired to produce it.

The `.agi` source is approximately three hundred and ten lines.

The entity declarations:

```
ENTITY Patient {
  mrn:        string
  birth_date: date
  sex:        string
  allergies:  list<string>
  current_medications: list<string>
}

ENTITY Encounter {
  patient_id: id
  chief_complaint: string
  vitals:     json
  cultures:   list<json>
  diagnoses:  list<string>
  encountered_at: timestamp
}

ENTITY CDSRule {
  name:           string
  trigger:        string
  conditions:    list<string>
  recommendation: string
  rationale:     string
  confidence:    number
  evidence_citation: string
}

ENTITY Recommendation {
  encounter_id: id
  rule_id:      id
  generated_at: timestamp
  accepted_by:  id?
  outcome:      string?
}
```

The encounter is the patient visit. The rule is one encoded if-then. The recommendation is the system's output for one specific encounter. The recommendation has an `accepted_by` field — the clinician who reviewed it — and an `outcome` field that gets filled in later, after the patient's clinical course is known. The system *learns* from outcomes, in the operational sense that low-acceptance-rate or poor-outcome rules can be flagged for human review by a separate workflow.

The decision-support workflow:

```
WORKFLOW evaluate_encounter {
  INPUT  encounter_id: id
  OUTPUT recommendations: list<Recommendation>

  NODE start { TYPE start }

  NODE load_encounter {
    TYPE      ai_call
    PROMPT    "Load encounter {{input.encounter_id}} including
               the patient's allergies, current meds, and the
               full vital signs panel."
    OUTPUT    encounter: json
  }

  NODE rule_engine {
    TYPE      router_call
    ROUTER    forward_chain
    TASK_TYPE clinical_rule_match
  }

  NODE format_recs {
    TYPE      ai_call
    PROMPT    "For each rule that fired, format a clinician-facing
               recommendation with the rule's rationale and the
               evidence citation. Order by confidence, highest first."
    OUTPUT    recommendations: list
  }

  NODE end { TYPE end }

  EDGE start          -> load_encounter
  EDGE load_encounter -> rule_engine
  EDGE rule_engine    -> format_recs
  EDGE format_recs    -> end
}
```

The `router_call` node — `forward_chain` — is the modern implementation of MYCIN's inference engine. The original MYCIN used backward chaining; this implementation uses forward chaining for the simpler reason that modern hardware makes the choice irrelevant. The semantics are the same: a rule fires when its conditions are met, the rule's conclusion becomes a fact, and downstream rules can fire on the new fact. The chain continues until no more rules fire.

To compile and run:

```
cd agicore-examples/accelerando/clinical
agicore compile accelerando_clinical.agi
docker-compose up           # starts Postgres + the compiled service
agicore seed --synthetic    # loads ~50 synthetic encounters
```

The compiled service starts on port 3009. The reader opens a browser to `http://localhost:3009`, sees the patient list, clicks one patient, sees the encounter, clicks *Evaluate*, and reads the recommendations the system produces.

You have just run a MYCIN.

The MYCIN you have just run is, on every technical measure, better than the MYCIN of 1976. It runs on commodity hardware. Its rule-base is smaller (three hundred rules vs. five hundred). Its rules are clearer because they were written by a modern practitioner with the benefit of fifty years of subsequent clinical-decision-support literature. Its recommendations are routed through a workflow that produces machine-readable JSON, suitable for ingestion into a hospital electronic-health-record system.

It is also, on every deployment measure, the same MYCIN.

If you tried to deploy this system in an actual American hospital tomorrow, you would discover, in approximately three months of fruitless meetings with the hospital's compliance office, that the deployment bottlenecks are exactly what they were for Shortliffe in 1979. The liability question is still open. The workflow-integration question is still open. The political question — whether physicians are prepared to be audited by a program — is still open.

You can build the program in a weekend.

You cannot deploy the program at all.

Welcome to clinical AI.

---

## The homework

Open `accelerando_clinical.agi`.

Find the `SEED` block near the bottom of the file, where the initial rule-base is declared. The format is a small DSL inside `.agi`'s SEED format; each rule has a name, a list of conditions, a recommendation string, a rationale, and a confidence weight.

Add a new rule that you, on your own honest read of the published medical literature, believe should be in the rule-base.

The rule must contain:
- a precise trigger (the clinical situation in which the rule fires)
- one or more conditions (additional clauses required for the rule to fire)
- a recommendation (the action the rule recommends)
- a rationale (one sentence explaining the reasoning)
- an evidence citation (a citation to a published paper or guideline)
- a confidence weight (a number between zero and one)

The example domain is up to you. Antibiotic stewardship is a natural choice if you are clinically trained. Pediatric dosing adjustments are a natural choice if you are familiar with weight-based pharmacology. Drug-drug interactions are a natural choice if you have time to consult a reference.

Recompile.

Re-seed.

Run an encounter that triggers your rule.

Watch your recommendation come out the other side, with your rationale, with your citation, with your confidence weight.

You have just done in twenty minutes what Edward Shortliffe spent three hours of an infectious-disease specialist's time doing in 1973.

The encoding bottleneck — the bottleneck that was MYCIN's central technical challenge — is, on the modern stack, an order of magnitude faster.

The deployment bottlenecks remain exactly where Shortliffe left them.

Reflect on which of the two bottlenecks is currently the binding constraint on AI in medicine.

The answer, on the field's quiet honest read of 2026, has not changed in fifty years.
