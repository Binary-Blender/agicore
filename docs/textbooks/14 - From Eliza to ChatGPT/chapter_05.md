# Chapter 5: Cyc, 1984

The story of Cyc is the story of one man making a bet that took thirty years to settle.

The man was Doug Lenat.

Lenat earned his PhD at Stanford in 1976 with a thesis on automated mathematical discovery — a program called AM that searched the space of mathematical concepts and rediscovered, among other things, the natural numbers, prime numbers, and Goldbach's conjecture. The thesis was famous; Lenat became, at twenty-six, one of the rising figures of the symbolic AI tradition. He spent the next eight years at Carnegie Mellon and then at Stanford, working on a successor program called EURISKO that generalized AM's heuristics-discovering heuristics. EURISKO won the Traveller Trillion Credit Squadron championship in 1981 and 1982 — a science-fiction-themed naval-strategy game — by discovering ship designs no human player had previously considered. The rules of the game were changed after 1982 to prevent EURISKO from winning a third time.

By 1984 Lenat had concluded that the symbolic AI tradition's central problem was the one Terry Winograd had run into with SHRDLU twelve years earlier.

The problem was common sense.

Every symbolic AI program of the previous twenty years had been brilliant inside its constrained domain and useless outside it. The reason, in every case, was that the program lacked the common-sense knowledge that humans take for granted: that water flows downhill, that a person cannot be in two places at one time, that a glass dropped on concrete will probably break, that pets need to be fed, that elevators go up and down, that meetings happen at scheduled times, that birthdays happen once a year. Symbolic programs handled the formal logic of their domains beautifully. They failed the moment a piece of common sense was required to bridge two domains.

Lenat made the bet that the common-sense knowledge required for general AI was *finite*.

The bet had a corollary. If the common-sense knowledge was finite, it could be written down. And if it could be written down, the project of writing it down — though large, though tedious, though requiring a small army of knowledge engineers — was tractable on a calendar of a decade or two.

Lenat estimated, on the early-1980s back-of-the-envelope, that the common-sense knowledge a typical American five-year-old has consists of approximately one million distinct facts. He estimated, on the same envelope, that an experienced knowledge engineer could encode approximately one hundred facts per day. The arithmetic produces a project budget of approximately ten thousand person-days, or forty person-years, or two hundred person-years if you wanted to be safe. With a team of twenty knowledge engineers, the project would take ten years to complete.

In 1984 Lenat left Stanford, took a senior research position at the Microelectronics and Computer Technology Corporation in Austin, Texas — a research consortium founded by a group of American technology companies in response to the Japanese fifth-generation computer project — and started the Cyc project.

The project's name was a syllabic contraction of *encyclopedia*.

The project's stated goal was the encoding of common-sense knowledge.

The project's working timeline was ten years.

---

The project ran for forty.

Cycorp, the corporation Lenat founded in 1994 to commercialize Cyc, is still operating at the time of this book's writing in 2026. Cyc's ontology contains approximately twenty-five million rules, organized into approximately two hundred thousand atomic concepts, structured in a typed logic Cycorp calls CycL. The knowledge base covers — in some depth — biology, chemistry, geography, history, economics, law, politics, sports, religion, fiction, mathematics, computer science, kitchen activities, automobile maintenance, basic physics, basic medicine, basic finance, basic etiquette, and approximately three hundred other domains. Cyc, on its operators' working assessment, contains more encoded common-sense knowledge than any other system humans have ever built.

Cyc has not produced general artificial intelligence.

The bet, on the field's quiet honest assessment, did not pay off in the form Lenat had wagered it would.

The reasons are several, and the field continues to argue about them.

The most often cited reason is that the bet's central premise — that common-sense knowledge is finite and writable-down — was, on the deepest reading, wrong. Common-sense knowledge is not a fixed set of facts. Common-sense knowledge is a continuously generated competence that humans produce by reasoning over an effectively infinite pool of experiences against an effectively infinite pool of contexts. Writing down ten million facts about the world is not the same as understanding the world; it is at best a useful approximation, and the gap between the approximation and the genuine article does not close as the count of facts grows.

The second often cited reason is that the encoding labor turned out to be harder than Lenat estimated. The hundred-facts-per-day figure was, in practice, closer to twenty facts per day, because every fact required negotiation with the rest of the ontology, every fact had to be cross-checked against the existing knowledge base, and every fact had to be specified with enough precision that the inference engine would not produce nonsense when reasoning over it. Lenat had estimated the project at two hundred person-years; the project consumed, by 2026, approximately two thousand person-years.

The third often cited reason — and the one that, on the working practitioner's reading, contains the most important lesson — is that the field's bet shifted in 2012.

The shift was AlexNet. You will meet AlexNet in chapter eight. AlexNet demonstrated that the writing-down problem could be sidestepped entirely by *learning* the encoding from data rather than encoding it by hand. The field reallocated, across approximately five years following 2012, essentially all of its research effort and essentially all of its funding from the writing-down approach to the learning-from-data approach. Cyc, the largest and most disciplined exemplar of the writing-down approach, became overnight a historical artifact rather than a research frontier.

And yet — and this is the lesson the field, on its honest reading, still has not absorbed — Cyc kept producing practical value.

Throughout the 2000s and 2010s, Cycorp shipped Cyc-derived systems to a small number of customers in domains where the writing-down approach is still the right approach: intelligence analysis, where the cost of a wrong answer is high and the audit trail of the reasoning matters; medical knowledge integration, where the schemas of different hospital systems need to be reconciled against a stable ontology; legal-reasoning support, where the rules are explicit and the inference must be explainable. The Cyc-derived systems work. The Cyc-derived systems are deployed. The Cyc-derived systems do not produce general AI, but they produce specialized AI that the modern deep-learning stack cannot match for explainability or auditability.

Lenat died in 2023, at seventy-three, having spent his entire adult life on a single bet, watching the field abandon the bet while he was still working on it, and producing across the four decades of his work a body of practical engineering that the field is, on its honest reading, only now beginning to appreciate.

---

## The lesson

Cyc's lesson is the lesson of *the underrated success*.

Every AI history book — and this is, on the genre's quiet admission, almost a defining feature — frames Cyc as a failure. The framing rests on the gap between Lenat's stated ambition (general AI) and Lenat's delivered result (a large and useful but specialized expert system). The framing is, on the technical measure of *did Lenat deliver general AI*, accurate.

The framing is also, on the working practitioner's reading, beside the point.

Cyc shipped. Cyc shipped systems that worked, that earned revenue, that solved real problems in real customer organizations, and that produced — and continue to produce — clear, auditable, explainable inferences in domains where clarity, auditability, and explainability matter more than the raw output quality the modern deep-learning stack offers. Cyc lost the bet on general AI. Cyc won, quietly, the bet on specialized AI for high-stakes domains.

The field's habit of telling Cyc's story as a failure is, on the deepest reading, an artifact of the field's commitment to the general-AI ambition. The field still cannot, on average, hear stories of work that delivered useful specialized value as anything other than detours from the real prize. This is a category error. The real prize, on the working practitioner's reading, was always specialized value. The general AI ambition was always a recruiting device.

Cyc is the field's most underrated success and its most cautionary tale about the cost of betting on a single approach. Both readings are true. Both readings are important. The reader who can hold both at once has learned something about how to assess an AI system on its own terms.

---

## The build: Super ES

The reference implementation for this chapter is the Accelerando suite's governance layer:

```
agicore-examples/accelerando/es/accelerando_es.agi
```

The application is a desktop tool — a Tauri-bundled rule-based expert system that watches every action proposed by any of the other Accelerando apps and applies a clearance-and-policy rule-base to decide whether the action gets auto-deployed, queued for human review, or blocked. The structural analogy to Cyc is direct: this is a system whose entire value comes from the encoded judgment of the humans who wrote the rules, and whose central engineering challenge is keeping that encoded judgment maintainable as the rule-base grows.

The `.agi` source is approximately two hundred and ninety lines.

The entities:

```
ENTITY ProposedAction {
  source_app:    string
  action_type:   string
  subject:       json
  rationale:     string
  proposed_at:   timestamp
  proposed_by:   id
}

ENTITY GovernanceRule {
  name:          string
  scope:         string
  trigger:       string
  conditions:    list<string>
  verdict:       string
  rationale:     string
  signed_by:     id
  signed_at:     timestamp
  governance_locked: bool
}

ENTITY Verdict {
  action_id:     id
  rule_id:       id
  outcome:       string
  rendered_at:   timestamp
  human_override: id?
}
```

A `ProposedAction` is one action one of the empire's apps wants to take. A `GovernanceRule` is one if-then encoding of the empire's policy. A `Verdict` is the governance layer's decision on one specific action, with a pointer to the rule that produced it and a slot for human override.

The crucial fields on `GovernanceRule` are `signed_by` and `signed_at` and `governance_locked`. These are the audit-trail fields. Every rule in Super ES carries the cryptographic signature of the person who authorized it; every rule has a timestamp of when it was authorized; rules marked governance-locked require a multi-signature ceremony to modify. This is the architecture Doug Lenat would have wanted Cyc to ship with in 1984 if the field had then been mature enough to insist on it.

The verdict-rendering workflow:

```
WORKFLOW render_verdict {
  INPUT  action_id: id
  OUTPUT verdict: Verdict

  NODE start { TYPE start }

  NODE load_action {
    TYPE      ai_call
    PROMPT    "Load proposed action {{input.action_id}} with full
               subject, rationale, and origin app."
    OUTPUT    action: json
  }

  NODE applicable_rules {
    TYPE      router_call
    ROUTER    rule_match
    TASK_TYPE governance_scope_filter
  }

  NODE deliberate {
    TYPE      ai_call
    PROMPT    "Apply the matched rules in priority order. The first
               rule that produces a definitive verdict (allow / deny
               / escalate) wins. Lower-priority rules contribute to
               the rationale even when they do not produce the
               verdict."
    OUTPUT    verdict_record: json
  }

  NODE audit_log {
    TYPE      log
    MESSAGE   "verdict={{deliberate.verdict_record.outcome}}
               action={{input.action_id}}
               rule={{deliberate.verdict_record.rule_id}}"
  }

  NODE end { TYPE end }

  EDGE start            -> load_action
  EDGE load_action      -> applicable_rules
  EDGE applicable_rules -> deliberate
  EDGE deliberate       -> audit_log
  EDGE audit_log        -> end
}
```

To compile and run:

```
cd agicore-examples/accelerando/es
agicore compile accelerando_es.agi
agicore run
```

A small window opens. The left rail shows the queue of proposed actions waiting for verdict. The center pane shows the rule-base, filterable by scope, sortable by signature date. The right rail shows the audit log of verdicts the system has rendered in the current session. The reader can click on any proposed action, hit *Render Verdict*, and watch the system apply its rules in real time.

You have just run a Cyc.

The Cyc you have just run is, on every relevant technical measure, smaller than Cyc itself: Super ES ships with approximately one hundred and fifty rules in its seed data, against Cyc's twenty-five million. But the architecture is the same. The encoded-judgment-with-signatures pattern is the same. The audit-trail discipline is the same. The reader who walks through this `.agi` file with care learns the design patterns that Lenat had, by 2010, hammered into a working specialty-AI shop, and that the field still has not fully absorbed because the field's attention is on the deep-learning stack.

---

## The homework

Open `accelerando_es.agi`.

Find the `SEED` block near the bottom.

Add a rule.

The rule must be, on your honest assessment, a piece of governance policy that your own organization — your job, your team, your household, your hobby club — actually applies. Examples: *no expense over five hundred dollars without a second approver*; *no software deployment after Thursday at three PM without an on-call sign-off*; *no group purchase of supplies without three quotes*; *no public statement on behalf of the team without the team lead's review*.

Write the rule.

Sign the rule (Super ES will fill in your local user identity).

Mark the rule governance-locked if it is a policy you would not want changed without a ceremony.

Recompile. Re-seed.

Submit a proposed action that would have, in your real organization, triggered the rule.

Watch Super ES render the verdict.

Watch the audit log fill in.

You have just done in fifteen minutes what Cyc's knowledge engineers do every day: you have transferred a piece of your judgment into a system that will apply that judgment, in your absence, in your name, indefinitely.

The transfer is the work.

The transfer is the work.

The transfer is the work.

If you can do the transfer, you can build, in your own life or your own organization, a small Cyc.

A small Cyc is, on the working practitioner's reading, exactly the right scale of Cyc to build.

Lenat's mistake was to try to build one big Cyc.

Lenat's lesson is to build small Cycs everywhere you have judgment worth encoding.
