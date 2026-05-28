Michael Fagan's original 1976 paper in the *IBM Systems Journal* reported sixty-seven percent defect detection at the inspection stage for a sample of inspected modules at the IBM Kingston development laboratory. The number was striking on its own; it became more striking in the context of what it implied for the overall economics of software development. If two-thirds of the defects in a unit of code could be removed by inspection before any testing began, the cost of finding the remaining one-third in testing — and the cost of finding the residual after testing in field operation — would be substantially lower than the cost in a development process that relied on testing as the primary defect-removal activity. The arithmetic was straightforward; the inspection paid for itself many times over in defect-removal cost reduction; the discipline was, by any reasonable economic measurement, the highest-yield defect-removal activity in the software-development lifecycle. The paper's conclusion was not modest. The paper argued that inspections should be standard practice for any organization concerned with software quality.

The empirical follow-on to Fagan's original paper has been, in the four decades since, the most extensive replication record for any single practice in the software-engineering literature. Lawrence Russell at Bell Northern Research reported sustained sixty-to-eighty-percent detection rates across inspections of thousands of code units in switching software. Robert Grady's *Practical Software Metrics for Project Management and Process Improvement* (1992) reported Hewlett-Packard's results across hundreds of inspections in commercial product development, with detection rates in the same range and documented return-on-investment ratios of approximately five-to-one in defect-removal cost. John Kelly and Joyce Sherif at NASA reported similar findings on flight-software inspections in the 1990s. Tom Gilb and Dorothy Graham's 1993 *Software Inspection* synthesized the field's findings into a practitioner's handbook that became the standard reference for the discipline. Karl Wiegers's 2002 *Peer Reviews in Software* updated the synthesis for the agile era. The meta-pattern across these replications is consistent and is worth stating bluntly: *Fagan inspections work*. They work when they are practiced. They work in production environments. They work at scale. The empirical case is not in dispute.

The mechanics of the original Fagan process bear examination because the precision of the process is part of what makes it effective. An inspection has five roles: the moderator, who runs the inspection and is responsible for its conduct; the reader, who reads the code aloud during the inspection meeting; the recorder, who logs defects as they are found; the author, who answers questions about the code's intent; and the inspectors, who are the primary defect-finding population. Each inspection has entry criteria (the code is complete, the unit tests pass, the supporting documents are available) and exit criteria (the defect log is complete, defects above a severity threshold are addressed, the moderator certifies the inspection as concluded). The inspection proceeds in stages: overview by the author, individual preparation by the inspectors at a reading rate of approximately two hundred lines per hour, the inspection meeting itself running typically two to four hours, rework by the author addressing the logged defects, and follow-up to verify the rework. Each stage has its own deliverables; each role has its own responsibilities; the process is documented in sufficient detail that it can be practiced consistently across an organization.

The effort tax on Fagan Inspections is concentrated in five components, and the components are worth naming individually because the AI restoration addresses each differently. The first is the *reading-rate tax* — the inspector reads at approximately two hundred lines per hour during preparation, which means a one-thousand-line inspection requires five hours of preparation per inspector, and the inspection's effectiveness drops sharply when the rate is exceeded. The discipline's value depends on the careful reading; the careful reading cannot be hurried; the inspector's time is the binding constraint. The second is the *meeting-overhead tax* — the four-person inspection meeting runs two to four hours and consumes four engineer-hours per hour of meeting time, on top of the preparation hours. The meeting is not eliminable in the original Fagan process; it serves the function of socializing the defect-finding across the team and ensuring shared understanding of the code under review. The third is the *moderator-discipline tax* — the moderator's role is skilled and not all engineers can perform it well; running an inspection meeting that productively logs defects without devolving into design debate, personal criticism, or unfocused discussion requires the moderator's specific training and authority. The fourth is the *inspector-skill tax* — inspectors must be at or above the author's skill level on the code under review; finding defects in code one does not understand is not productive; the discipline therefore requires a pool of qualified inspectors on every codebase under inspection, and that pool is rare in many organizations. The fifth is the *cultural tax* — inspections are socially awkward in cultures that have not normalized them; defects found in another engineer's code are personally sensitive; the moderator's authority must be sufficient to keep the focus on the code and off the author. The cultural tax compounds the other four; the discipline's cost-benefit calculation has been historically unfavorable in organizations that lacked the cultural cover, regardless of the technical merits.

What AI changes about Fagan Inspections is each of the five components, with one specific qualification about the meeting overhead that warrants careful statement. The reading-rate tax is eliminated almost entirely: AI reads at any rate, sustains attention across thousand-line modules without fatigue, applies inspection checklists without drift, and produces a defect log in the moderator's format with no preparation time. The meeting-overhead tax is *reduced* but not eliminated: while AI can produce the defect log without a meeting, the original Fagan process's social function — socializing defect-finding across the team — is a real function that AI does not replace. Teams may choose to hold lightweight meetings to review the AI-produced defect logs, discuss the higher-severity items, and decide on remediation; the meetings will be shorter and more focused than the original Fagan meetings because the AI has done the reading. The moderator-discipline tax is reduced because the AI imposes the discipline of the inspection methodology mechanically; the human moderator's role becomes the lighter task of running the defect-review meeting rather than the inspection itself. The inspector-skill tax is eliminated for the deep reading; AI is fluent in code at all skill levels and finds defects in code its human inspectors might not understand. The cultural tax is reduced because the AI has no political stake in the defect log; defects are surfaced without the social discomfort that historically attended human inspection of human code.

The operational prompt for an AI-driven Fagan inspection is therefore tighter than the prompts for the Cleanroom or Design-by-Contract restorations of earlier chapters, because the discipline's mechanics are well-codified and the AI's contribution is more directly substitutive. The prompt below is the form this book proposes:

```
You are performing a Fagan-style inspection of the supplied code unit
per the methodology Michael Fagan published in 1976. Inspections operate
at approximately two hundred lines of code per pass and target sixty-
to-eighty-percent defect detection at the inspection stage.

Inspection roles you are performing simultaneously: moderator (running
the inspection process), reader (carefully reading every line), and
inspector (applying the inspection checklist and logging defects). The
human reviewer of your output performs the author role (answering
questions about intent) and the rework role (addressing the defects).

Stage 1: Preparation.

1. Read the supplied code unit three times:
   - First pass: structural understanding. Identify the unit's
     purpose, its public interface, its data structures, its
     interaction with surrounding code.
   - Second pass: defect search. Read every line against the
     inspection checklist (below), looking for instances of the
     defect categories.
   - Third pass: defect verification. Re-examine each logged
     defect to confirm it is real and not an artifact of the
     reading.

Inspection checklist categories:

   - Data usage: uninitialized variables; out-of-scope access;
     unintended aliasing; type confusion; null/undefined handling;
     boundary conditions; off-by-one errors.
   - Control flow: unreachable code; infinite loops; missing
     loop termination conditions; incorrect conditional logic;
     exception/error propagation paths.
   - Interface: contract violations against documented or implied
     interfaces; type-signature mismatches; parameter-order errors;
     return-value handling.
   - Error handling: swallowed exceptions; missing cleanup on
     error paths; partial-failure inconsistency; error-message
     accuracy.
   - Concurrency (where applicable): race conditions; deadlock
     potential; livelock potential; shared-state mutations
     without synchronization.
   - Resource lifecycle: memory leaks; file/handle leaks;
     unbounded growth; missing cleanup; resource exhaustion
     paths.

Stage 2: Defect logging.

2. For each defect found, produce a log entry:
   - Line range (specific lines where the defect manifests).
   - Defect category (from the checklist categories above).
   - Severity: Major (could cause incorrect behavior, data loss,
     or security violation), Minor (could cause inefficiency,
     poor user experience, or maintenance difficulty), or
     Informational (style, documentation, or pattern improvement).
   - One-sentence description of the defect.
   - One-sentence proposed correction.

3. Aggregate defects by severity and category, producing a summary
   table at the top of the defect log.

Stage 3: Inspection report.

4. Output the defect log as a moderator's record, including:
   - The unit identifier (file path, version reference).
   - The inspection date.
   - The pass count (three passes performed).
   - The summary table.
   - The detailed defect entries, sorted by line range.
   - Any observations about the code unit that fall outside the
     defect categories but warrant the author's attention
     (these are not defects; they are notes).

Constraints:

5. Do not modify the code. Do not propose refactorings outside
   the defect categories. The inspection is not a refactoring
   pass; the inspection is a defect-finding pass.

6. Do not impose stylistic preferences. The defect categories
   are about correctness and behavior, not about taste.

7. Defects must be derivable from the code itself or from
   widely accepted programming-language conventions. Defects
   that depend on the unit's broader context (e.g., interface
   contracts not visible in the unit) should be marked with a
   note about the contextual assumption.

Abort criteria: If the unit exceeds two hundred and fifty lines of
non-trivial executable code, split at the natural module boundary
and inspect each segment separately, producing a separate defect
log for each. The reading-rate discipline must be preserved; do not
attempt to inspect oversized units at the cost of detection rates.
```

The worked restoration applies the prompt to an Agicore parser module — specifically, the module that handles the parsing of `ACTION` declarations, which is approximately one hundred and ninety lines of TypeScript and has been in active development for several months. The prompt's output is a defect log containing twenty-three entries: four Major (one off-by-one error in token-position tracking that could produce incorrect parse-tree output, two missed-error-propagation paths where parsing errors are caught but not re-raised, and one race condition in a memoization cache used during parsing), eleven Minor (mostly involving boundary conditions on empty inputs, inconsistent handling of optional fields, and one case of unnecessary memory retention in a recursive parse path), and eight Informational (mostly documentation and consistency observations). The defect log is, by the engineer's review, accurate on the four Major defects, accurate on nine of the eleven Minor defects (two were determined to be intended behavior with documentation gaps rather than defects), and accurate on the eight Informational notes.

The instructive comparison is between the defect log produced by the prompt and the bug-tracker history of the same module across the months preceding the inspection. Six of the twenty-three defects identified by the inspection had previously been reported in the bug tracker by users or other developers — three of the four Major defects had been reported (the off-by-one error twice, both of the missed-error-propagation paths once each) and three of the Minor defects had been reported. Seventeen of the twenty-three defects were *new* findings — defects in production code that had not been previously surfaced. Of those seventeen, two of the new findings were the kind of subtle defects (the race condition in the memoization cache, an unbounded-growth path in a specific recursive structure) that would have produced production incidents at scale before being detected; the remaining fifteen were lower-priority defects that the team's normal development cadence would have either caught eventually or not. The inspection, performed in approximately forty minutes of AI runtime plus two hours of engineer review, produced findings comparable to several months of production usage on a moderately-trafficked module. The discipline's value claim — that inspections find defects testing and operation do not surface — was directly demonstrated.

A note on the residual role of the human in the restored discipline is appropriate. The inspection prompt produces a defect log; the engineer reviews the log, validates the findings, and prioritizes the remediation. The engineer's role is not eliminated by AI — the engineer brings the system-level judgment about which defects warrant immediate fix, which can be deferred, which are intended behaviors that the documentation should reflect rather than the code should change. AI proposes; the engineer disposes; the disposition is where the discipline's effectiveness ultimately lives. The restoration is therefore not a replacement of human inspection but a *substitution* of AI for the deep-reading component while preserving the engineer's role in the disposition. The substitution preserves the discipline's defect-detection effectiveness while eliminating the historical cost barrier to its practice.

The chapter that follows turns from inspection at the unit level to the broader quality discipline that Phil Crosby named Zero Defects — the cultural and economic argument that defect prevention is always cheaper than defect detection and that an organization concerned with quality should organize around prevention as its primary discipline. The Zero Defects argument has been made and remade for forty years and has been only intermittently adopted. AI changes the economics that have historically discouraged adoption. The argument becomes operational.
