Kent Beck and Ward Cunningham presented *A Laboratory for Teaching Object-Oriented Thinking* at the OOPSLA conference in 1989. The paper described a teaching methodology Beck had been developing at the Tektronix Computer Research Laboratory: a deck of index cards, one card per class, each card divided into three sections — the class's *name*, the *responsibilities* the class held, and the *collaborators* the class depended on to fulfill those responsibilities. The methodology had a name: *CRC Cards*, for Class-Responsibility-Collaborator. The teaching application was specific: design sessions where students learned object-oriented design by physically passing cards around a table, enacting the program's behavior by holding the cards that represented the participating classes and walking through scenarios verbally. The methodology was deceptively simple. Beck and Cunningham's paper made the argument that the simplicity was the point: by stripping object design down to the three most essential properties of any class and forcing the designers to articulate each before any code was written, CRC cards produced object designs that were measurably cleaner — better-factored, with appropriate responsibility distributions and minimal coupling — than designs produced by groups using other methodologies.

The empirical experience of practitioners with CRC cards in the years following Beck and Cunningham's paper is one of the more striking patterns in the design-methodology literature. The practice was overwhelmingly liked by the engineers who tried it. The session experience — physical cards, embodied movement, dialogue around a table — produced engagement that pure-prose design methods did not. The designs produced were perceived to be better than designs produced without the methodology, and were often substantiated as better in subsequent implementation. The methodology was adopted in design sessions at organizations from large enterprises to small startups; books were written about it (Rebecca Wirfs-Brock and Alan McKean's 2003 *Object Design* extended the methodology substantially); the practitioner literature accumulated case studies. And yet, despite the broad positive reception, CRC cards have remained almost exclusively a *design-session* practice — useful during the initial design of a system but rarely sustained as a *living artifact* that the team consulted and maintained as the system evolved. The cards were produced during the session, photographed for the project archive, and never updated again. The discipline's value was concentrated in its first use; its long-term value was never realized; the practice retreated to a tool for occasional design workshops.

The reason for the retreat is the *card-rot tax*. CRC cards as a living artifact would require the team to update the deck every time a class's responsibilities or collaborators changed. The updates would have to be physical or digital, would have to be maintained by someone, would have to be reviewed and made authoritative. Nobody owned the cards after the session. The session was a one-time event; the cards were artifacts of the event; the artifacts decayed because no maintenance discipline accompanied them. The decay was not a failure of the methodology in design terms but a failure of the methodology's *organizational continuation* — the discipline produced excellent first-pass designs and then evaporated, in the same pattern that the Ubiquitous Language evaporates and that ADRs evaporate when no one maintains them. The pattern is consistent across the documentation disciplines: artifacts produced and not maintained decay to uselessness; artifacts maintained continuously retain their value; the maintenance is the binding constraint.

The structural properties of CRC cards make them an unusually good fit for AI-assisted continuous maintenance, in a way that warrants careful examination. The three card fields — class name, responsibilities, collaborators — are *directly derivable* from the code, at a fidelity that approaches what a senior engineer would produce manually. The class name is the class's identifier. The collaborators are the classes the class references — the imports, the type references in field declarations, the call sites in methods, the inheritance relationships. The responsibilities are the methods' purposes, expressed in plain language at a granularity appropriate for design discussion. Each field is mechanically extractable; the extraction is faithful when the code is well-named (which CRC-card-disciplined code typically is); the extraction is auditable against the code. A CRC deck of a codebase is, structurally, an alternative *projection* of the codebase's structure — the same information organized for design discussion rather than for execution.

The AI-restored CRC discipline operates this projection continuously. The codebase changes; the CRC deck changes correspondingly; the engineer reviews the changes on a cadence (typically as part of the periodic architectural review the team conducts) rather than on every commit. The deck remains current; the design-discussion artifact remains available; the discipline's value extends from the initial session to the system's entire lifetime. The continuous projection also enables a use case the original CRC discipline did not support directly: the *what-if* design session, where the team explores a proposed change by examining how the CRC deck would change under the proposal, identifies responsibility tangles or excessive collaboration tangles that the proposal would introduce, and refines the proposal before any code is written. The deck becomes a design-thinking surface rather than a one-time artifact, used both for retrospective understanding and for prospective design.

The operational prompt for an AI-driven CRC-deck workflow operates on a codebase and produces both the initial deck and the continuous-maintenance reports that keep it current:

```
You are producing and maintaining a CRC deck for the supplied
codebase per the methodology Kent Beck and Ward Cunningham described
in 1989. The output is the deck and the change reports that flow
from codebase evolution.

Stage 1: Class identification.

For the supplied codebase:

1. Identify the classes that warrant CRC representation. Not every
   class warrants a card; the methodology operates at the
   *architectural* class level, not the implementation-detail level.
   Helper classes, trivial data structures, and other
   implementation artifacts may be grouped with the architectural
   class they serve rather than receiving their own cards.

2. Surface the proposed class list for engineer review. The
   engineer accepts, refines, or restructures the granularity.

Stage 2: Card generation.

3. For each class on the approved list, produce a CRC card:
   - Class name: the canonical identifier.
   - Responsibilities: three to seven high-level descriptions
     of what the class is responsible for. Each responsibility
     is expressed in plain English at the level of design
     discussion, not as a method enumeration.
   - Collaborators: the other classes this class depends on to
     fulfill its responsibilities. Each collaborator is named
     and the nature of the collaboration is described in a
     short phrase.

4. The card's content derives from the code. Responsibilities
   trace to method clusters; collaborators trace to imports and
   type references. The derivation is auditable.

Stage 3: Deck-level analysis.

5. With the full deck in hand, surface architectural patterns:
   - Classes with excessive responsibilities (more than seven
     distinct responsibilities, suggesting candidate decomposition).
   - Classes with excessive collaborators (more than approximately
     seven collaborators, suggesting coupling that warrants
     attention).
   - Bidirectional collaborations that suggest unclear
     responsibility allocation.
   - Cyclic collaboration patterns that suggest design tangles.

6. Produce a deck-level architectural summary identifying any
   patterns the deck reveals.

Stage 4: What-if mode (optional).

7. For a proposed code change (a PR, a design proposal), produce a
   what-if analysis:
   - The changes to the deck the proposal would introduce
     (new cards, modified responsibilities, modified
     collaborator lists).
   - The architectural-pattern implications (new tangles,
     resolved tangles, complexity changes).
   - The design-quality assessment the deck supports.

Stage 5: Continuous maintenance.

8. As the codebase changes, regenerate affected cards and surface
   the changes for engineer review. The maintenance is per-commit
   for accurate cards and on-cadence for the deck-level analysis.

9. Produce CRC_DECK.md containing the full deck and the
   architectural summary. Per-PR what-if reports are produced
   in separate documents as requested.

Provenance discipline: every responsibility and every collaborator
must trace to specific code. Where a responsibility is implicit
(implied by the class's role but not directly expressed in any
single method), surface the implicit nature in the card's notation.

Abort criteria: If the codebase's class structure is too granular
or too coarse-grained for CRC-deck representation (e.g., highly
functional code with minimal class structure, or monolithic
classes that defy decomposition into CRC representation), note the
limitation and propose either an alternative projection or a
refactoring step before deck production.
```

The worked restoration applies the prompt to the Agicore compiler module — a region of the codebase whose architectural structure is moderately complex and whose class organization has evolved across several development eras. The compiler module contains approximately twenty-five architectural classes; the prompt produces twenty-five CRC cards plus three grouped-helper-class cards. The deck-level analysis identifies several patterns. Two classes have responsibility counts above the seven-item threshold, suggesting candidate decompositions (one is the central CompilationContext class which has accumulated responsibilities across multiple feature additions; one is the CodeGenerator class which handles both AST traversal and output emission). Three pairs of classes exhibit bidirectional collaboration that suggests unclear responsibility allocation (specifically, the TypeChecker and the SymbolTable maintain references to each other in a way that makes their independent responsibilities ambiguous). One cyclic collaboration pattern is identified among three classes in the error-recovery subsystem.

The engineer reviews the deck and the analysis across approximately three hours. Of the responsibility-overflow flags, the engineer accepts both as legitimate refactoring candidates (the CompilationContext decomposition has been on the team's mental todo list for months; the CodeGenerator decomposition is a recognized improvement that the team has deferred). Of the bidirectional-collaboration flags, the engineer accepts two and rejects one (the rejected one is a deliberate design choice where the collaboration is symmetric by intent). The cyclic-collaboration flag is accepted; the cycle is recognized as a tangle that emerged across multiple commits without anyone noticing. The deck becomes the substrate for a subsequent architectural-review session in which the team examines the proposed decompositions and tangle resolutions, with the deck providing the shared visualization that the original CRC methodology was designed to produce.

A subtle implication of the AI-restored CRC discipline is worth surfacing. The original Beck-Cunningham methodology assumed the deck was produced *before* implementation, in design sessions that preceded coding. The AI restoration produces the deck *after* implementation, from existing code. The temporal inversion is the same inversion that Chapter 15 noted for literate programming and Chapter 17 noted for ADRs. The inversion makes the discipline accessible to teams whose codebases already exist (which is most teams, on most codebases) without requiring them to retroactively perform design sessions for code already written. The trade-off is that the design judgment the original methodology exercised at design time is exercised, in the restored form, at review time — the engineer examines the AI-produced deck against the team's design preferences and the deck-level analysis against the team's architectural priorities. The judgment is preserved; the mechanics are inverted; the discipline becomes practicable for ongoing architectural maintenance rather than restricted to new-system design.

The chapter that follows turns to a more demanding discipline at the cross-cutting end of the design spectrum: Gregor Kiczales's Aspect-Oriented Programming, which addressed concerns that classical object-orientation handled poorly and that the broader engineering community has continued to handle poorly because the reasoning cost of aspect-augmented code was substantial. AI changes the reasoning calculus, and the AOP restoration that follows is correspondingly substantive.
