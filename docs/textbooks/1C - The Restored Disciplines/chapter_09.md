David Parnas joined the United States Naval Research Laboratory in 1977 as a consultant on the Software Cost Reduction project, which had been initiated by Bill Carlson and others in the Navy's software-engineering organization with a specific operational target: redocument the flight software of the A-7E Corsair II naval attack aircraft to a standard of precision and modifiability that the original software had not achieved. The A-7E was a working aircraft; its software was functional; the redocumentation was not bug-fixing but specification-engineering — producing a documentation set so rigorous that future modifications to the software could be made with confidence by engineers who had not been part of the original development. The project ran for over a decade and produced a body of work — the SCR specifications — that constitutes the most rigorous large-scale specification effort in the published software-engineering literature. Parnas and his collaborators (Constance Heitmeyer, Stuart Faulk, John Shore, Kathryn Britton, and others) produced specifications of the A-7E that ran to thousands of pages of tabular documents, with each table specifying a portion of the system's behavior in a form that was machine-checkable, human-readable, and modifiable under change.

The empirical record of SCR is more modest than the records of Fagan Inspections or Function Point Analysis, in the specific sense that the SCR project was a single large effort whose deployment was confined to the A-7E and a small number of subsequent projects at NRL and elsewhere. The records that exist are nonetheless instructive. The A-7E specifications demonstrated documented completeness reviews — every behavior of the software accounted for in the tables; every table consistent with the others; every interface specified with the precision the framework required. The maintenance experience that followed the initial specification was favorable: changes to the A-7E software could be made by engineers consulting the tables rather than reading the code, with documented improvements in change-error rates and reduction in regression defects. The framework was subsequently applied to safety-critical software in other domains — the Darlington Nuclear Generating Station shutdown system, the U.S. Navy's AEGIS combat system, several Lockheed Martin avionics projects — with consistent reports of specification clarity and maintenance leverage. The framework worked. The framework was practiced by approximately the same population of engineers in 2010 as in 1990.

What kept SCR confined to safety-critical projects was the most direct effort tax in the formal-specification literature: the *specification-writing tax*, in pure form, without significant mitigation. An SCR specification of a nontrivial system takes person-years to produce. The A-7E specifications took, by Parnas's own account, more engineer-time than the original software development had taken — though the specifications were produced after the software existed and therefore had the unusual advantage of being able to reference the running code as a source of ground truth. The framework's demands are exacting: every system input must be identified as a *monitored variable*; every system output as a *controlled variable*; the four-variable model relates the two through *input devices*, *output devices*, and the abstract relations between monitored and controlled variables. The tables — condition tables, event tables, mode-class tables, function tables — specify these relations exhaustively, with every cell of every table filled in or marked explicitly as unspecified. The framework permits no implicit specification; every behavior must be on a page.

The tabular form is not arbitrary; Parnas chose it for specific reasons that the contemporary engineer should understand before evaluating the restoration. A *table* enforces completeness in a way that prose does not: every cell must be considered; every cell either contains an entry or is explicitly empty; the table itself is checkable for consistency in ways that prose specifications are not. A table is also *modifiable* in ways that prose is not: changing a single entry in a table is a localized edit whose impact can be reasoned about precisely, where editing a paragraph of prose often requires reading the entire paragraph to understand the implications. The tabular form is, in Parnas's framework, the *form* that makes the specifications both rigorous and maintainable. It is not incidental.

The four-variable model deserves its own brief treatment. The framework distinguishes four categories of variable: *monitored variables* are the environmental quantities the system observes (the aircraft's altitude, airspeed, attitude); *controlled variables* are the environmental quantities the system affects (the cockpit displays, the weapon-release signals, the autopilot commands); *input devices* are the hardware that translates monitored variables into the values the software can read; *output devices* are the hardware that translates the values the software produces into the controlled variables. The four-variable model separates the *abstract* behavior of the system (the mathematical relation between monitored and controlled variables) from the *device-specific* behavior (the conversion through input and output devices), with the consequence that the abstract specification can be reasoned about independently of the device choices and can be refined under different device configurations without re-deriving the abstract behavior. The separation is the framework's central architectural commitment, and it pays off in long-lived systems where the device choices change over time but the system's behavioral specification does not.

The effort-tax components on SCR are, accordingly, three. The first is the *four-variable identification* tax: enumerating the monitored variables, controlled variables, and the input and output devices, with the precision the framework requires, takes weeks for a nontrivial system and demands close engagement with the domain experts who know the system's environmental context. The second is the *table-construction* tax: filling out the condition, event, mode-class, and function tables takes person-months for a nontrivial system, with the table cells specifying behavior at a precision that the engineers must derive from running code, design documents, expert interviews, or — most expensively — original requirements work. The third is the *consistency-maintenance* tax: as the system evolves, the tables must be updated, with the framework's consistency conditions checked after every modification. The maintenance tax compounds across the system's lifetime, and the framework's value depends on the maintenance being kept current.

AI changes each of the three components in ways that are mechanistic and that the chapter will name explicitly. The four-variable identification tax is reduced by AI's ability to read system documentation, code, and interface specifications and propose a four-variable decomposition. The engineer reviews the proposal against the system as the engineer understands it; the review and refinement is substantially less effort than the synthesis from scratch. The table-construction tax is reduced by AI's ability to generate table entries from existing code, observed behavior, or natural-language requirements. The framework's discipline — every cell considered, every cell filled or marked unspecified — is exactly the kind of clerical discipline AI sustains better than humans. The consistency-maintenance tax is reduced by AI's ability to compare tables against each other and against the system they specify, detecting drift and proposing updates. The maintenance becomes a continuous comparison rather than a recurring re-specification effort.

The operational prompt for an AI-assisted SCR-style specification is more elaborate than the prompts of the earlier chapters in Part II, because the framework itself is more elaborate. The prompt below is the form this book proposes:

```
You are producing an SCR-style tabular specification of the supplied
system per Parnas's four-variable model. The user is an engineer who
needs a rigorous, maintainable specification of the system's behavior;
the output is the specification, not the code.

Stage 1: Four-variable identification.

1. Read the supplied system description and source materials. Identify:
   - Monitored variables: the environmental quantities the system
     observes. For each: name, type, units, range, and the input
     device(s) that produce its value.
   - Controlled variables: the environmental quantities the system
     affects. For each: name, type, units, range, and the output
     device(s) that consume its value.
   - Input devices: the hardware or interface layer that converts
     environmental values to monitored variables.
   - Output devices: the hardware or interface layer that converts
     controlled variables to environmental effects.

2. Surface the four-variable inventory as a one-page document for
   engineer review. Each variable has its name, its type, and a
   one-sentence rationale for inclusion. The engineer accepts,
   refines, or rejects each entry. Do not proceed to tables until
   the inventory is approved.

Stage 2: Mode class identification.

3. Identify the mode classes that partition the system's behavior.
   A mode class is a set of mutually exclusive states the system can
   occupy, where each state has distinct behavior. For each mode
   class:
     - Name.
     - The exhaustive set of modes (the partitioning).
     - The events that transition between modes.
     - A one-sentence rationale.

4. Surface the mode classes for engineer review. Approve before
   proceeding.

Stage 3: Table generation.

5. For each controlled variable, generate the table that specifies
   how the variable's value depends on the monitored variables and
   the current mode:
     - Condition tables for variables whose values depend on
       conjunctions of monitored variable values.
     - Event tables for variables that change on the occurrence
       of specific events.
     - Mode-class tables linking modes to the values they imply
       for the controlled variable.
     - Function tables for arithmetic or computational
       relationships between monitored and controlled variables.

6. Each table:
     - Has rows labeled by monitored-variable conditions or events.
     - Has columns labeled by modes (for mode-dependent
       specifications) or by output values directly.
     - Has every cell filled in with the specified value or
       explicitly marked NOT_DEFINED.

7. Run the consistency checks the framework requires:
     - Completeness: every reachable combination of conditions
       has a specified value.
     - Determinism: no combination of conditions has more than
       one specified value.
     - Type correctness: every specified value is in the
       controlled variable's range.

8. Report consistency violations with the specific cells where
   they occur. Wait for engineer resolution before producing the
   final specification.

Stage 4: Specification synthesis.

9. Produce the SCR specification document containing:
     - The four-variable inventory.
     - The mode-class definitions.
     - All tables with their consistency checks passing.
     - A traceability appendix linking each table to the source
       materials (code, requirements, interviews) from which it
       was derived.

Output: the specification.md document, plus an appendix file
traceability.md mapping every table to its sources.

Provenance discipline: every variable, every mode, every table cell
must be traceable to source material. Where a value is derived from
inference rather than direct source, mark with an explicit inference
tag and a one-sentence rationale. Do not fabricate specification
content that the source materials do not support.

Abort criteria: If the system is not amenable to the four-variable
model (e.g., a pure data-processing pipeline with no environmental
input or output in Parnas's sense), name the mismatch and propose an
alternative formalism (typically a Z specification or a state-machine
specification). The four-variable model is fitted to embedded and
control systems; do not force-fit it.
```

The worked restoration applies the prompt to a portion of Agicore that fits the four-variable model adequately: the *router* declaration's variable-routing logic, which observes incoming packets (the monitored variables) and produces routing decisions (the controlled variables) via a clear input-output device structure. The router is not a flight-control system, and the worked restoration is correspondingly less elaborate than the A-7E specification — the Agicore router has on the order of twelve monitored variables, eight controlled variables, and three mode classes, where the A-7E had thousands of each. The scale is different; the framework applies. The resulting specification is approximately forty pages of tables and supporting documentation, generated by the prompt in approximately three hours, with engineer review and approval at each stage adding approximately two hours of engineer time. The specification surfaces, during its consistency checks, two cases where the router's existing code is ambiguous: under specific combinations of mode and monitored variable, the router's behavior is implicit rather than explicit, and the engineer must resolve the ambiguity by either specifying the intended behavior (which the engineer then implements in code) or by acknowledging the ambiguity and marking the cells NOT_DEFINED. The ambiguities are not bugs in the strict sense — the router functions in the cases that arise in practice — but they are *unspecified corners* of the router's behavior, and the framework's completeness check has surfaced them. The act of resolving them produces both a more rigorous specification and a more rigorous router.

A note on the broader applicability of the SCR framework is worth surfacing. The framework is fitted to embedded and control systems where the four-variable model is natural — flight software, nuclear reactor controls, automotive controls, medical-device firmware. The framework can be force-fitted to other classes of software, but the fit is poor; a typical web application has no monitored variables in Parnas's sense (the environmental inputs are user interactions, which are episodic rather than continuous), and the four-variable model does not illuminate the system's behavior in the way it illuminates a control system. The restoration this chapter performs is therefore narrower in scope than the restorations of earlier chapters in Part II: SCR is restored to its native habitat (embedded and control systems) rather than expanded to all software development. The narrower restoration is honest about the framework's fit and avoids the overreach that has, historically, damaged the credibility of formal specification approaches when their advocates have claimed broader applicability than the methods actually support.

Part II closes with this chapter. The six restorations — function-point analysis (Chapter 4), COCOMO II (Chapter 5), TLA+ (Chapter 6), the Z/Alloy/B family (Chapter 7), Design by Contract (Chapter 8), and SCR (this chapter) — constitute the specification-and-estimation cluster of the book's restoration program. The cluster has a structural logic: the early chapters establish what the system is supposed to do (function-point analysis sizes the problem, COCOMO II sizes the implementation, the formal-methods chapters specify the behavior at varying levels of rigor) and the later chapters establish the discipline at the method level (Design by Contract) and the requirements level (SCR). A team that practices the full cluster — each restoration applied at the level appropriate to its system — has a specification practice at every scale, from the requirements through the design through the methods through the verification.

Part III turns from specification to verification: the disciplines that ask not what the software is supposed to do but whether it does what it is supposed to do. Cleanroom Software Engineering opens the part, with its rigorous combination of formal specification (which Part II has now restored to affordability) and statistical usage testing for reliability certification. The disciplines compound. Each restoration's value increases in the presence of the others. The portfolio that Chapter 2 named begins to operate as a coherent practice.
