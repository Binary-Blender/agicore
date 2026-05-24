# Chapter 19: Approval Chains and the Cryptographic Audit Trail

The mutation has passed the tier verifier. It has executed cleanly in the sandbox against the captured failure case and the regression suite. It may have run for a fortnight in shadow mode against live traffic, agreeing with production on every observation the SPC gate measured. None of that is sufficient for promotion at the higher tiers. The architectural change still needs a human to look at it and sign. And whatever happens — whether the human signs, refuses to sign, signs and then a second human refuses — must be recorded in a way that a regulator can verify a year later without taking anyone's word for anything. This chapter treats the two mechanisms that make those guarantees mechanical rather than procedural: the approval chain and the hash-chained ledger.

The structure of human approval inside Agicore is deliberately narrow. There are three patterns, no more, and each one carries distinct semantics that the runtime enforces positionally. The first pattern is the 1-of-1 single signer. The second is the parallel N-of-N chain in which any required signer may go first and the approval completes when the last required signature arrives. The third is the ORDERED N-of-N chain in which signers must approve in the declared sequence, each one seeing the full notes and signatures of those who came before. These three patterns are not interchangeable presentations of the same idea. They encode three different theories of accountability, and the runtime treats them as three different state machines.

The declaration surface is uniform. A `MUTATION_POLICY` tier names its approval requirement with one of three forms.

```agi
TIER 4 structural_change {
  SCOPE                [WORKFLOW_modify]
  AUTO_DEPLOY          false
  APPROVAL_AUTHORITY   chris
}

TIER 4 cross_team_change {
  SCOPE                [WORKFLOW_modify, MODULE_add]
  AUTO_DEPLOY          false
  APPROVAL_AUTHORITY   [ops_lead, security_lead]
}

TIER 5 governance {
  SCOPE                [MUTATION_POLICY_modify]
  AUTO_DEPLOY          false
  APPROVAL_AUTHORITY   ORDERED [ceo, cto, board_chair]
}
```

The generated `approvals.ts` emits an `AuthoritySet` value object that captures all three patterns in one shape:

```rust
pub struct AuthoritySet {
    pub authorities: Vec<String>,
    pub threshold: usize,
    pub ordered: bool,
}
```

A single signer is `AuthoritySet { authorities: vec!["chris"], threshold: 1, ordered: false }`. A parallel pair is `AuthoritySet { authorities: vec!["ops_lead", "security_lead"], threshold: 2, ordered: false }`. An ordered triple sets `ordered: true` and the runtime enforces the additional constraint that signer N may not record a decision until signer N-1 has recorded one. The aggregator that processes incoming decisions, `record_decision`, dispatches on these three configurations explicitly. There is no fourth branch and no fallback.

The semantic distinction between parallel and ordered chains is the load-bearing detail. Parallel N-of-N is appropriate when the signers' jurisdictions are independent. A change to a workflow that touches both operations and security might reasonably require the ops lead and the security lead to each evaluate it from their own perspective. Neither perspective informs the other; both must be satisfied. Sequencing the signatures buys nothing operationally, and forcing a sequence can introduce coordination delay that has no compensating safety benefit. The runtime treats the two signatures as commutative — they aggregate to approval regardless of arrival order — and surfaces both in the UI so that each signer can see the other's notes once both are recorded.

ORDERED chains exist for a different reason and deserve to be analyzed on their own terms. They are the structural answer to a failure mode that haunts every multi-signer approval scheme in practice: rubber-stamping by the first signer. When all required signers can sign in parallel, the human dynamics tend toward whoever signs first carrying disproportionate weight. The second signer sees that the first has already signed and reasons, correctly or otherwise, that the first must have looked carefully and that a second careful look would be redundant. The third signer makes the same inference about the first two. The chain of careful reviews collapses into a chain of social-proof signatures, and the multi-signer requirement becomes ceremonial. The ORDERED pattern breaks this dynamic mechanically. Each signer sees, at the moment of decision, the full text of every previous signer's notes alongside their cryptographic signature. The third signer in an `ORDERED [ceo, cto, board_chair]` chain reads what the CEO wrote, reads what the CTO wrote, and then signs — or vetoes — with that context in front of them. The signature is positionally validated: the runtime rejects any attempt by `board_chair` to record a decision before `cto` has recorded one, and rejects any attempt by `cto` to sign before `ceo`. The order is not a recommendation. It is an invariant.

The positional validation is implemented in the `approve_proposal` and `reject_proposal` commands. When a signature arrives for an ordered chain, the aggregator computes the index of the signer in the declared `authorities` list, retrieves the count of decisions already recorded, and checks that they match. If `cto` attempts to sign when only zero decisions are recorded, the command returns an error; the UI surfaces the message that the previous signer has not yet acted. This is the same kind of constraint that the tier verifier applies before the sandbox runs. It is not a hint to the user interface. It is a precondition enforced at the command boundary, below the UI, below any client-side coordination logic, in the layer where the decision becomes part of the system's state.

The accountability theory underneath ORDERED chains can be stated explicitly. A change consequential enough to require multiple human approvals is, by hypothesis, consequential enough that each approver should bring an irreducible perspective. The architectural change that requires CEO, CTO, and board-chair signoff in a small startup is one whose business, technical, and fiduciary dimensions are jointly nontrivial. The CEO's signature reflects business judgment. The CTO's reflects engineering judgment. The board chair's reflects fiduciary judgment. If the three were collapsed into a parallel chain, the human dynamics would compress them into a single judgment dominated by whoever signs first. The ordered chain preserves the three perspectives by sequencing them and by ensuring that the later signers operate on the strictly larger information set that includes the earlier signers' reasoning.

When an approval is recorded — by any of the three patterns — the runtime persists the decision into the proposal's `approval_chain` field. This is a JSON array, one element per signer, with the same shape regardless of pattern.

```typescript
type ApprovalEntry = {
  authority: string;       // 'chris' | 'ops_lead' | 'ceo' | ...
  decision: 'approve' | 'reject';
  signed_at: string;       // ISO 8601 timestamp
  signature: string;       // cryptographic signature of the decision payload
  notes: string;           // free-text rationale
};
```

The `approval_chain` is a property of the proposal, not of the ledger. The ledger records, separately, the event of each decision being recorded. The two are intentionally redundant: the proposal carries the chain so that the UI can render it in one query; the ledger records the chain's growth so that the audit trail is complete even if the proposal row is later updated.

This redundancy points at the deeper mechanism that gives the Agicore audit story its weight. The `mutation_ledger` is not a log in the conventional sense. A log is a sequence of records appended by the application, intended to be inspected after the fact. If a row in a conventional log is altered or deleted, the log's reliability degrades silently — the auditor sees what is there, not what should have been there. The mutation ledger is a hash chain. Each entry's `self_hash` is computed deterministically from a canonical string that incorporates the previous entry's hash. Tampering with any entry breaks the chain at that entry and at every entry that follows. The end of the chain is the seal: as long as the most recent `self_hash` matches what was computed at the time of the most recent append, every prior entry is mechanically certified to be unmodified.

The canonical hashing algorithm has nine fields, in a fixed order, separated by the ASCII unit separator (`\u{1F}`, byte 0x1F). The choice of separator matters: the unit separator does not appear in any of the field values, which means concatenation is unambiguously reversible and the canonical string has exactly one representation for each entry.

```
prev_hash || ledger_name || sequence_num || proposal_id || policy_name
          || event_type || actor || payload_json || recorded_at
```

The nine fields are joined with `\u{1F}` and the SHA-256 digest of the resulting UTF-8 byte sequence is the `self_hash`. The first entry in any ledger uses an all-zeroes `prev_hash` to seed the chain. Every subsequent entry's `prev_hash` is the literal hex string of the previous entry's `self_hash`, retrieved by the same row's `sequence_num - 1`. The `sequence_num` is monotonic and gap-free within a `ledger_name`; the database enforces this with a unique constraint and the insert path computes it from the current row count rather than accepting it as input.

The `payload_json` field is the serialized event payload after canonical-JSON normalization: keys sorted lexicographically, no extraneous whitespace, no Unicode escape variations. This matters because JSON has multiple syntactic representations of the same semantic value, and a non-canonical serialization would permit tampering that leaves the payload's meaning unchanged but breaks the hash. The codegen wires the canonicalization into the ledger writer so that no caller can accidentally emit non-canonical JSON into the chain.

Verification is a walk. The `verify_ledger_integrity` command, generated by `ledger.ts`, opens the ledger by name, reads all entries in `sequence_num` order, and for each entry recomputes the `self_hash` from the canonical string assembled from the entry's own fields and the previous entry's `self_hash`. The recomputed value is compared to the stored `self_hash`. On the first mismatch, the walk halts and returns an integrity report.

```rust
pub struct IntegrityReport {
    pub total_entries: i64,
    pub chains_verified: i64,
    pub broken_chain_at_sequence: Option<i64>,
    pub broken_chain_reason: Option<String>,
    pub all_good: bool,
}
```

A clean ledger returns `IntegrityReport { total_entries: 12_847, chains_verified: 12_847, broken_chain_at_sequence: None, broken_chain_reason: None, all_good: true }`. A tampered ledger returns the sequence number where the chain broke and a human-readable reason — `"recomputed self_hash differs from stored"`, `"prev_hash does not match prior entry's self_hash"`, `"sequence_num gap detected"`. The verification is offline: it requires no network calls, no key servers, no external trust roots. The chain proves itself.

The integrity report's structure deserves brief attention. The four fields — `total_entries`, `chains_verified`, `broken_chain_at_sequence`, `broken_chain_reason` — plus the boolean `all_good` summary, are the minimal set required to satisfy two different consumers. A human auditor reading the report wants the boolean and the optional reason: did the chain verify, and if not, where did it break and why. A monitoring system wants the counts: how many entries were checked, how many verified, what is the ratio. The struct serves both with a single shape. The `chains_verified` count is strictly less than or equal to `total_entries`: the walk halts at the first break, so a ledger with 12,847 total entries and a break at sequence 5,200 reports `chains_verified: 5_199`, `broken_chain_at_sequence: Some(5_200)`. The first 5,199 entries are certified intact; everything from 5,200 onward is suspect, because once the chain is broken any subsequent verification compares stored values against a `prev_hash` that the walker now knows is unreliable.

The asymmetry between single-row signatures and hash chains is worth stating explicitly because the intuition runs the wrong way. If each ledger row carried only its own SHA-256 hash of its own contents, an attacker who modified row 5,000 would need only to recompute row 5,000's hash and update that single column. The forgery would be local. With the hash chain, modifying row 5,000 invalidates the recomputed hash at row 5,000, which invalidates the `prev_hash` reference at row 5,001, which invalidates the recomputed hash at row 5,001, and so on to the end of the ledger. To produce a coherent forgery, the attacker must recompute and rewrite every row from the modification point to the end. The end of the chain — the most recently recorded `self_hash` — is the seal: if the seal is published or otherwise pinned externally, any forgery is detectable by recomputing from any pinned point.

This is the discipline Ralph Merkle introduced in the 1979 paper that named hash chains and demonstrated their use as the backbone of efficient digital signatures over large data structures. The Merkle tree generalizes the chain into a balanced binary structure with logarithmic verification cost, but the linear chain that Agicore uses is sufficient for the access pattern: ledgers are appended sequentially, read in order, and verified end-to-end during audit. The chain's storage cost is linear in the number of entries, and the verification cost is also linear, but both costs are dominated by the database's own read throughput rather than by the hashing. The author of a verification report can run `verify_ledger_integrity` on a million-row ledger in seconds.

The hash chain lives, by default, in the same SQLite database that holds the proposals, the shadow observations, the test evidence, and every other piece of state the runtime depends on. For most installations that is sufficient. For installations that must submit ledger excerpts to regulators or that must guarantee off-database archival, Agicore exposes the file-system sink. Setting the environment variable `AGICORE_LEDGER_SINK_PATH` to a directory path activates the sink. From that point forward, every ledger append produces two writes: one into the SQLite `mutation_ledger` table and one into a JSON-Lines file at `<path>/<ledger_name>.jsonl`. Each line is one entry, canonically serialized, with all nine canonical fields plus the computed `self_hash`. The file is opened with `O_APPEND`, the line is written, and `fsync` is called before the writer returns. The cost of the fsync is real — a few milliseconds per write — and the runtime accepts it because the entire point of the sink is durability against the database failing or being tampered with.

The file-system mirror is the artifact that regulators expect. A `.jsonl` file is text, line-oriented, and amenable to any tool that processes streaming data. A compliance team can `rsync` the file nightly to cold storage, hand it to an auditor on a thumb drive, or pipe it through `jq` to extract every event of type `APPROVED` in a given quarter. The same verification walk runs against the file: read the file in order, recompute each `self_hash`, compare. The mirror is mechanically equivalent to the database ledger. Either one alone is sufficient to verify the chain. Both together are belt and suspenders.

The sink's design respects the operational reality that the most demanding compliance frameworks — SOX for financial controls, HIPAA for protected health information, SOC 2 Type II for service-organization controls, ISO 9001 for quality management systems — all require evidence that is verifiable independently of the system that produced it. A ledger that lives only inside the application database is, from the compliance auditor's perspective, vulnerable to the same operational privileges that govern the rest of the database. The file-system mirror, written to a path that the application user can append to but cannot rewrite (the typical deployment uses `chattr +a` on Linux or its equivalent), produces an artifact whose integrity rests on file-system semantics that the application itself cannot subvert. The per-write fsync ensures that a process crash or power loss does not leave the mirror behind the database; the canonical serialization ensures that the mirror's entries can be re-hashed independently and matched against the database without any synchronization layer above the file system.

What gets recorded into the chain is not only the start and end of a proposal's lifecycle. Every state transition appends an entry. The full transition graph spans roughly a dozen distinct event types, and the chain captures all of them in their order of occurrence.

```
PROPOSED
   ├─► TIER_VERIFIED ──────────┐
   │                           │
   └─► TIER_REJECTED           ▼
                            TESTED
                               ├─► SANDBOX_PASSED ──────────┐
                               │                            │
                               └─► REJECTED_BY_SANDBOX      ▼
                                                  ┌─────────┴─────────┐
                                                  ▼                   ▼
                                       SHADOW_EVALUATING        DEPLOYED
                                          │                     (no shadow needed)
                                          ├─► SHADOW_PROMOTED ──► DEPLOYED
                                          ├─► SHADOW_ROLLED_BACK ─► REJECTED
                                          └─► SHADOW_INCONCLUSIVE ► ESCALATED
                                                                       │
                                                                       ▼
                                                                PARTIAL_APPROVAL
                                                                       │
                                                            ┌──────────┴──────────┐
                                                            ▼                     ▼
                                                       APPROVED           REJECTED_BY_AUTHORITY
                                                            │
                                                            ▼
                                                        DEPLOYED
```

Every arrow in that graph is an entry in the ledger. The `event_type` field names the transition; the `actor` field names who or what caused it (`responder:andon_handler` for an AI-generated proposal, `verifier:tier_check` for the verifier's rejection, `chris@hoc.local` for a human approval, `scheduler:shadow_finalizer` for the SPC gate's promotion decision); the `payload_json` carries the diff, the test results, the SPC report, the approval notes, whatever the transition produced. A proposal that ran the full course — proposed, verified, tested, shadow-evaluated, partially approved, fully approved, deployed — produces seven to nine ledger entries, each chained to the previous, each canonically hashed, each independently verifiable.

The audit-trail completeness claim follows from this. Consider the question a regulator might ask after a customer complains about a misclassification: *Who signed the mutation that caused Customer X to be classified as high-risk on March 14?* In a conventional system, answering this question requires correlating timestamps across application logs, deployment systems, version-control commits, and approval-workflow ticketing — and at the end of that correlation the answer is at best a high-confidence inference, not a proof. In an Agicore system the question maps to a query. Locate the rule that produced the classification (the rule name is in the activity log for the classification event). Locate the most recent `DEPLOYED` ledger entry for any proposal whose payload modified that rule. Walk backward through the proposal's ledger entries to find the `APPROVED` event. Read the `actor` field. The actor is the signer. If the proposal used an ordered chain, all the signers and their notes are in the `approval_chain` field of the proposal row, and each one corresponds to a separate `PARTIAL_APPROVAL` or `APPROVED` ledger entry with that signer as `actor`. The answer is deterministic, reproducible, and obtained in seconds rather than days.

The recast that this enables is the load-bearing rhetorical claim of the whole audit story. *Audit* in conventional enterprise software is best-effort logging: the team that built the system was responsible enough to write things down, the team that operates it is responsible enough to retain the logs, and the auditor takes the surviving record on the operators' good faith. Agicore replaces best-effort logging with mechanical proof. The chain either verifies or it does not. The signers either match the policy's `APPROVAL_AUTHORITY` declaration or they do not. The proposal either passed the tier verifier or it was rejected before it ever reached the sandbox. Each of these is a query that returns a deterministic answer, and the answer is backed by a cryptographic structure that no operator, no developer, and no AI can quietly modify after the fact. The system does not ask the auditor to trust that the team did the right thing. It produces evidence that the team did, or that it did not, and lets the evidence speak for itself.

A worked traversal illustrates the answer in concrete form. Suppose the misclassification of Customer X resulted from rule `classify_high_risk_account` firing on a feature vector that, in retrospect, should have routed to manual review. The activity log records the rule fire with a deterministic rule version identifier. A query against `mutation_ledger` filtered to `event_type = 'DEPLOYED'` and `payload_json` referencing that rule version returns one row: proposal #4,217, deployed on March 11 at 14:22 UTC. Walking the ledger backward through #4,217's prior entries reveals the full history: PROPOSED at 09:14 by `responder:andon_handler` in response to andon event #18,902 (a `RULE no_match` on a similar account three days earlier); TIER_VERIFIED at 09:14 with `resolved_tier: 2`; TESTED at 09:15 with 1 case resolved and 8,431 regression cases unchanged; SHADOW_EVALUATING from 09:15 to March 11 09:15 (7-day window); SHADOW_PROMOTED at 09:16 with defect_rate 0.4 percent across 11,200 observations; PARTIAL_APPROVAL at 12:30 by `ops_lead@hoc.local` with notes "Verified against last quarter's audit findings — accepts new classifier"; APPROVED at 14:21 by `security_lead@hoc.local` with notes "Cross-checked SPC sample; concur"; DEPLOYED at 14:22 by `scheduler:deploy_worker`. Nine entries, nine `self_hash` values, each chained to the previous, each independently verifiable. The full forensic narrative of the change that misclassified Customer X — including the andon that originated it, the test evidence that justified it, the shadow data that supported promotion, and the two human signatures that authorized deployment — is reconstructible from the ledger alone.

The approval chain and the hash-chained ledger are not separate features. They are the same mechanism viewed from two angles. The approval chain encodes who has authority to permit a change; the ledger encodes the fact that the authority was exercised. Neither alone is sufficient. An approval workflow without a tamper-evident record degrades into ceremony — the signatures exist somewhere, the record can be edited, the audit relies on procedure. A tamper-evident record without an approval workflow knows what happened but cannot say whether it should have. The two together produce the property the architecture is built to deliver: every consequential change in the system carries with it a mechanically-verifiable record of who authorized it, when, on what evidence, against what alternatives, and through what chain of prior gates. The next chapter turns to the two AI components that originate the changes those gates govern.
