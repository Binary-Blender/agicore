In June of 1998, Paris Métro line 14 — the first new Métro line built in Paris in over fifty years — opened to the public as a fully automated subway, with no driver in any of its trains. The line ran from Madeleine to Bibliothèque François-Mitterrand, carried initial ridership of approximately seventy thousand passengers per day, and had a software-controlled signaling system whose safety case had been built using a method that almost no other industrial software project of the period had employed: the B-method, a formal-specification and refinement framework developed by Jean-Raymond Abrial. The signaling software was specified in B as a sequence of abstract machines that refined progressively from a high-level model of train movement and safe separation down to executable code, with proof obligations discharged at each refinement step demonstrating that the lower level preserved the safety properties of the higher level. The line entered service. It has operated continuously for twenty-eight years. The software has experienced zero safety-related defects in operation across that span. The empirical case for industrial formal methods at the safety-critical end of the spectrum is approximately settled, and the line 14 signaling is one of its strongest data points.

The B-method's track record extends. The Roissy Charles de Gaulle Airport's automatic light-rail system (CDGVAL) was developed in B and has operated since 2007. The New York City Canarsie Line signaling — the L train — was modernized to communication-based train control in 2006 with B as the formal-methods substrate. The European Railway Traffic Management System (ERTMS) at the operating-rules level has portions of its specification in B. The pattern across these deployments is consistent: B specifies the safety-critical software, the refinement proofs discharge the safety obligations, and the resulting systems have remarkably clean operational records. The discipline works. The discipline is also approximately invisible in mainstream software development, for the same reasons Chapter 6 named with respect to TLA+: the effort tax on B-method work — learning the language, discharging the proofs, maintaining the tooling — exceeded the willingness of organizations whose safety cases did not require it.

The B-method is one of three formal-methods traditions this chapter restores, in addition to the temporal-logic tradition that Chapter 6 covered. The other two are *Z notation*, developed at Oxford in the 1980s and codified by Michael Spivey in *The Z Notation: A Reference Manual* (1989), and *Alloy*, developed by Daniel Jackson and his students at MIT starting in the late 1990s and presented in book form as *Software Abstractions: Logic, Language, and Analysis* (2006). The three traditions have distinct technical approaches and distinct empirical records, but they share an underlying argument: software systems can be specified precisely in a mathematical language; the specifications can be checked for internal consistency and for the satisfaction of stated properties; and the checking finds errors that informal specification does not. The discipline of writing formal specifications is the discipline; the choice of language is a matter of fit between the system and the formalism.

Z's tradition centers on the *schema calculus* — a way of building larger specifications from smaller pieces using operations on schemas, where each schema describes a portion of the system's state and operations. A Z specification of a system reads as a sequence of schemas defining the state, operations that transform the state, and predicates that constrain valid states. The technical depth is real; the empirical record at IBM Hursley with the CICS transaction-processing system is documented (Houston and King, 1991, reported defect-density reductions from Z-disciplined CICS development); the broader adoption never matured. The IBM Hursley work was, like the B-method work at the Paris Métro, an organizational commitment that could be justified by CICS's centrality and could not be generalized to less consequential software.

Alloy's tradition is different in temperament. Jackson's *small-scope hypothesis* — the empirical observation that most counterexamples to system properties can be found in small models, typically with three to seven objects of each kind, and that exhaustive search within small models is therefore a high-yield bug-finding strategy — animates Alloy's design. Alloy's analyzer performs bounded model finding rather than full proof; the bound is on the size of the universe; the analyzer either finds a counterexample within the bound or reports that no counterexample exists within the bound. The Alloy approach is, in a sense, the *empirically minded* formal method: it does not promise proofs of arbitrary depth but it does promise to find bugs that exist at the scale where bugs typically live, and it does so in time scales that are tractable on contemporary hardware. The empirical record of Alloy includes the analysis of file-system protocols at Microsoft Research, network-protocol verification at MIT and elsewhere, and a long tail of academic and industrial deployments where the system being analyzed was complex enough to warrant formal analysis but not safety-critical enough to justify the heavier weight of B or Z.

The shared effort-tax structure across the three traditions is the structure Chapter 6 named for TLA+, with some variations specific to each tradition. The language-unfamiliarity tax applies to all three: Z's schema calculus is unfamiliar to working engineers; Alloy's relational logic is unfamiliar in a different way; B's refinement framework is the most unfamiliar of the three because it requires the engineer to think simultaneously at multiple levels of abstraction and to discharge proof obligations linking them. The tool-friction tax varies: Alloy's analyzer is the most accessible of the three, with a graphical interface and short feedback cycles; Z's tooling has historically been limited and largely text-based; B's tooling is professional-grade (the Atelier B platform is mature) but commercial and not casually available. The proof-discharge tax is most acute for B because the refinement-proof obligations must be discharged for the framework's safety guarantees to hold; Z and Alloy do not require proof in the same sense and therefore do not impose this tax in the same form.

What AI changes about this picture is the same change Chapter 6 identified for TLA+, with one significant extension that warrants its own treatment. The translation capability — the ability of AI to produce specifications in any of the three languages from natural-language system descriptions — applies to all three. AI is fluent in Z's schema calculus; AI is fluent in Alloy's relational logic; AI is fluent in B's abstract machines and the refinement framework. The translation reduces the language-unfamiliarity tax to near zero for the engineer who needs an occasional specification. The model-checking and analysis capability — running Alloy's analyzer, running TLC against the corresponding TLA+ translation of a Z specification, running ProB against B specifications — is AI-orchestrable: AI can configure the tools, set the bounds, run the analyses, and interpret the outputs in a workflow that requires the engineer to read the results but not to operate the tools directly. The proof-discharge capability is the extension that warrants its own discussion.

B-method's safety guarantees depend on proofs that the refinement steps preserve the abstract specifications. The proof obligations are generated by the framework; the proofs themselves are typically discharged by a combination of automated provers (B's proof obligations are often dischargeable by SMT solvers and tactic-based provers) and human-guided proof assistants where automated discharge fails. The historical effort tax on B was concentrated in the cases where automated discharge failed and a human had to guide the prover — sometimes for hours per obligation, across hundreds of obligations in a large specification. AI changes this calculus substantially. AI is fluent in the proof languages of the major proof assistants (Coq, Isabelle/HOL, Lean, the dedicated provers for B and Z), can suggest tactic sequences for discharging obligations, can identify obligations that warrant strengthening the specification rather than attempting to prove the weaker form, and can carry the proof-engineering work across the body of obligations a B specification generates. The work that historically required a specialist with months of training becomes accessible to an engineer with weeks of training, accompanied by AI as the proof-engineering companion.

The three formal-methods traditions are distinct enough in their idioms that a single operational prompt for all three would be unwieldy. The operational prompt below is for *Alloy*, on the argument that Alloy's small-scope hypothesis makes it the formal method most useful for everyday engineering work — the engineer who needs to find a bug in a data structure or a protocol can get value from Alloy in an afternoon's work, where Z and B are appropriate for more deliberate engagements:

```
You are producing an Alloy specification of the supplied data structure
or system and running the Alloy Analyzer against it. The user is an
engineer who needs to find bugs in the supplied system through bounded
model finding.

Stage 1: Domain analysis.

1. Read the supplied system description. Identify:
   - The signatures (types of entities) that the system contains.
   - The fields (relations between signatures) that describe how
     entities relate.
   - The facts (axioms) that constrain valid configurations.
   - The predicates that describe operations or scenarios of interest.
   - The assertions (properties to be checked) that the system
     should satisfy.

2. Confirm the model by producing a one-paragraph summary in plain
   English. The user must agree the summary captures the system before
   you produce Alloy.

Stage 2: Alloy specification.

3. Produce the Alloy specification:
   - module declaration.
   - One sig per identified entity, with multiplicity annotations
     and parent relationships.
   - One field per identified relation, with appropriate multiplicity
     (one, lone, some, set).
   - Facts grouping the universal constraints.
   - Predicates for the operations.
   - Functions for derived relations.
   - Assertions for the properties to be checked.

4. Each assertion includes a one-line comment explaining what it
   asserts.

Stage 3: Analysis configuration.

5. Produce one check command per assertion, with a default scope
   appropriate to the system (typically 3-7 instances of each sig).
   For systems where the scope is naturally larger, propose the scope
   and walk the trade-off.

6. Produce one run command per predicate, to allow the user to
   visualize example configurations.

Stage 4: Result interpretation.

7. When the Analyzer finds a counterexample, produce:
   - A textual description of the configuration that violates the
     assertion.
   - A plain-English explanation of why the configuration violates
     the asserted property.
   - The likely root cause in the underlying system.
   - A proposed fix expressed first in plain English and then, once
     the user confirms the fix is desired, in Alloy.

8. When no counterexample is found within the scope:
   - State the scope explicitly: "No counterexample found at
     scope 7 / 7 / 7."
   - Note the small-scope hypothesis: counterexamples beyond this
     scope are possible but Jackson's empirical data suggests they
     are unusual.
   - Propose, where appropriate, a larger scope to run as a
     confirmatory check.

Output: a directory containing model.als (the specification),
README.md (the plain-English summary and the rationale for each
modeling choice), and findings.md (the counterexamples and their
analyses).

Provenance discipline: every signature, every field, every fact must
be traceable to a feature of the supplied system description. Do not
introduce entities or relations that the system does not have.

Abort criteria: If the system requires unbounded structures or
infinite scope to express (e.g., a protocol over an unbounded number
of nodes), name the limitation and propose a finite abstraction that
preserves the property of interest. If the property is not expressible
in Alloy's first-order relational logic, propose a transformation or
recommend a different formalism (typically TLA+ for temporal
properties).
```

A note on Z and B before the worked restoration. The same six-element pattern applies to each, with operational prompts that mirror the Alloy prompt's structure but specialized to the formalism. Z's prompt produces schema definitions and operation schemas with the appropriate type checking via Z/Eves or Z/EVES; B's prompt produces abstract machines, refinements, and the proof obligations they generate, with AI as proof-engineering companion through the discharge cycle. The book includes the Z and B prompts in its accompanying repository for readers who need them; the Alloy prompt is reproduced here because Alloy is the formal method most likely to find immediate use in the typical engineer's work.

The worked restoration applies the Alloy prompt to an Agicore subsystem: the entity-relationship layer that connects declarations to their referenced types. Agicore's declarations (ACTION, AI_SERVICE, ENTITY, CURRENT, ORDER, SEED, ROUTER, and others) reference one another through typed relationships — an ACTION may consume an ENTITY, an AI_SERVICE may produce a structured output that flows into a CURRENT, an ORDER may invoke an ACTION. The relationships are constrained: certain combinations are valid and certain combinations are not. The Alloy specification of this layer represents each declaration type as a signature, each relationship as a field, and each validity constraint as a fact. Running the Analyzer against the resulting model at scope seven (seven instances of each declaration type, which is small enough to be tractable and large enough to find any plausible counterexample under the small-scope hypothesis) identifies one configuration the system should rule out but does not in its current implementation: a circular reference among ENTITY declarations where each ENTITY references the next via a CURRENT, forming a cycle that would cause infinite recursion at runtime. The Analyzer produced the counterexample in approximately twelve seconds. The fix is a single fact in the Alloy specification (asserting acyclicity of the ENTITY-CURRENT graph) and a corresponding validation check in the Agicore compiler. The work, from initial description to confirmed fix, took approximately four hours, distributed across reading the system, conferring with the Analyzer over the model, and implementing the validation in the compiler. The bug would have been found eventually, in production, by a user who happened to construct the circular configuration. The Alloy work prevented the discovery from happening in production.

A note on the relationship between the three formal methods, and between them and the TLA+ tradition of Chapter 6, is appropriate. The methods are not competitive in practice; they are complementary, with each fitted to a class of problems. TLA+ is the method of choice for temporal-logic problems — concurrent systems, distributed protocols, properties about ordering and progress over time. Alloy is the method of choice for structural problems — data structures, configurations, constraints whose satisfaction is checkable at a moment in time. Z is the method of choice for state-machine specifications where the schema calculus's modularity is valuable, particularly in the specification of larger systems with many operations and complex state. B is the method of choice for safety-critical systems where the refinement framework's progressive proof of correctness is required by the safety case. An engineer fluent in the use of all four — at the level of fluency AI now makes accessible to occasional users — has a complete formal-methods toolkit for the range of problems formal methods can address. The toolkit is not exhaustive of all problems; not every problem is a formal-methods problem. The toolkit is sufficient for the range of problems that warrant formal treatment, and the range is broader than any single method alone can address.

The chapter that follows turns from system-level specification to method-level specification: Bertrand Meyer's Design by Contract, the framework that brings preconditions, postconditions, and class invariants into the working engineer's daily practice. The disciplines of Part II accumulate. The methodologies grow into a complete approach to specification at every scale, from the individual method through the data structure through the protocol through the system as a whole. Each scale has its formalism. Each formalism is now affordable. The discipline of specifying software before writing it — the discipline that the field claimed to value and rarely practiced — returns as a working possibility.
