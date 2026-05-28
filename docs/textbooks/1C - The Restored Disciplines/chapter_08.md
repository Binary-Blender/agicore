Bertrand Meyer's *Object-Oriented Software Construction* was published in two editions, in 1988 and 1997, and remained for two decades the most thorough treatment in the literature of how the object-oriented paradigm ought to be practiced. The book ran to twelve hundred pages in its second edition, was assigned in computer-science curricula across Europe and North America, and became, in its specific way, the canonical text against which subsequent object-oriented practice was measured. Its central technical contribution was not the object orientation itself, which had been described elsewhere, but the framework Meyer called *Design by Contract*: a discipline of specifying, at the level of every individual method in every class, what the method requires of its caller, what it guarantees to provide in return, and what invariant the surrounding class maintains across all of its operations. The Eiffel language Meyer designed gave these specifications first-class syntactic support — preconditions in `require` clauses, postconditions in `ensure` clauses, class invariants in `invariant` clauses — and made them enforceable at runtime through assertion-checking that could be enabled in development and disabled in production. The framework was complete. The implementation was working. The discipline was teachable.

The empirical record of Design by Contract is real but narrower than the records of Fagan Inspections or Function Point Analysis, for a specific reason: the discipline's adoption was largely confined to the Eiffel community and to a small number of research projects that imported its ideas into other languages. The Eiffel community itself produced defect-rate data for contract-disciplined projects that compared favorably with non-contract-disciplined projects in similar domains, with reported reductions in field defects in the thirty-to-fifty-percent range. The Spec# project at Microsoft Research (Barnett, Leino, and Schulte, mid-2000s) extended contract verification to C# with compile-time checking, demonstrated that contracts could find significant classes of bugs at compile time, and produced research-grade evidence that the verified-contracts approach was technically viable. The Java Modeling Language (JML) and its associated tooling (ESC/Java, ESC/Java2, OpenJML) provided contracts for Java, with academic case studies that showed the technique finding bugs in production code. The pattern of evidence is consistent: contracts work where they are applied; the application has been geographically and culturally limited; the broader software industry never adopted the discipline.

The intellectual case for contracts is straightforward and worth stating before the effort-tax analysis. Every method in a program has, implicitly, a contract — a set of conditions under which it can be called and a set of conditions it guarantees to satisfy when it returns. The contract is *in* the program; the question is whether the contract is *written down*. When contracts are unwritten, three failure modes recur. First, the caller relies on assumptions the callee does not actually guarantee, and the program fails in conditions the callee considers out of scope. Second, the callee relies on assumptions the caller does not actually guarantee, and the program fails when the caller passes inputs the callee was not designed to handle. Third, the class invariant is implicitly maintained by some methods and implicitly violated by others, and the program fails when the implicit violation propagates through a method that requires the invariant. Each failure mode is a *specification gap*: the contract exists, the contract is not written down, the gap between the implicit and the explicit contract is where the bug lives. Meyer's framework closes the gap by requiring the contract to be written.

The discipline's empirical effect on defect rates follows from the closure. A contract written in `require` form prevents the caller-side failure: the precondition fires before the method body executes; the caller sees the violation immediately; the bug is attributed to its source. A contract written in `ensure` form prevents the callee-side failure: the postcondition fires after the method body executes; if the body has failed to satisfy its guarantee, the failure is detected at the point of guarantee rather than at the point of consumption downstream; the bug is again attributed to its source. A class invariant written in `invariant` form prevents the propagation failure: every method execution checks the invariant on entry and exit; any method that leaves the class in an invalid state is caught immediately. The defects that contracts catch are *specification bugs*, and specification bugs are the bulk of nontrivial bugs in well-tested production code. Test suites typically exercise the cases the engineer thought to test; specification bugs are the cases the engineer did not think to test, and they are precisely the cases that contracts surface.

The effort-tax components on Design by Contract are subtler than the components on Fagan Inspections or Function Point Analysis, and they bear examination because the subtleties are where the discipline's adoption barriers really lived. The first component is the *contract-writing tax*. Writing a contract requires the engineer to articulate, in formal terms, what the method requires and guarantees — which requires the engineer to *know* what the method requires and guarantees, which is harder than writing the method body in many cases. The discipline forces a kind of intellectual rigor that engineers commonly avoid by leaving requirements implicit. The avoidance is rational at the level of individual cost — writing the contract is real work that the engineer could skip in favor of writing the body and shipping — but irrational at the level of program quality, because the contracts catch bugs whose later cost exceeds the writing cost. The cost-benefit calculation favors writing the contract; the daily-decision calculation favors skipping it. The discipline died of a thousand small skips.

The second component is the *contract-maintenance tax*. As methods evolve, their contracts must evolve with them. A precondition that was correct when the method was first written may no longer be correct after the method's body has been refactored to handle additional cases. A postcondition that was once accurate may have become out of date as the method's guarantees expanded or contracted. The maintenance burden grows with the contract-to-code ratio, and in Eiffel projects that ratio can approach one-to-one — that is, the contracts are as much code as the code they specify. Maintaining the contracts requires sustained attention that compounds across the project's lifetime, and the attention is exactly the kind of attention the contract-writing tax was already failing to capture. The contracts that survive the writing tax die of the maintenance tax.

The third component is the *invariant-discipline tax*. Class invariants are the most powerful element of the contract framework — they are the assertions that the class maintains across all of its operations, and they catch the propagation failures that preconditions and postconditions cannot — but they are also the most demanding to write and maintain. A nontrivial class may have several invariants, each of which constrains the legal states the class can occupy. Identifying the invariants requires understanding the class at a level that exceeds writing its individual methods; maintaining the invariants requires the engineer to be aware, every time the class is modified, of which invariants could be affected. The cognitive load of invariant discipline is real, and it is the load that most discourages the working engineer from writing invariants at all. Methods are easier to reason about locally; invariants require global reasoning over the class.

What AI changes about Design by Contract is each of the three components simultaneously and substantially, with the qualification that contracts are a *partnership* between AI and the engineer in a way that some of the other restored disciplines are not. The partnership structure deserves explanation. A contract is, in part, an articulation of what the engineer intends the method to do — and the intent is the engineer's, not AI's. AI cannot read the engineer's mind. What AI can do is *propose* contracts based on the method's existing code and the surrounding test suite, surface the proposed contracts for review, and update them as the code evolves. The engineer reads the proposals, accepts the ones that match intent, refines the ones that approximate intent, and rejects the ones that miss. The discipline of writing contracts becomes the discipline of *reviewing* contracts, which is a lower-effort activity than writing them from scratch.

The contract-writing tax is reduced by AI's ability to derive plausible contracts from existing code and tests. An AI presented with a method body, the calling sites of the method, and the tests that exercise it can produce a draft contract — preconditions inferred from the input domains the tests exercise and the assumptions the method body makes; postconditions inferred from the return values and side effects the tests verify; invariants inferred from the class's field constraints and the relationships between fields that the constructor establishes. The draft is not always correct, and the engineer must review it, but the draft saves the engineer the activation energy of starting from a blank page. The activation energy is, in many cases, what determined whether the contract was written at all.

The contract-maintenance tax is reduced by AI's ability to detect contract-code drift continuously. An AI integrated into the development workflow can compare the current contracts against the current code, flag contracts that the code no longer satisfies, suggest contract updates that reflect the code's evolved behavior, and surface contract-violation patterns in the test suite. The maintenance work that previously required the engineer to remember to update the contracts when the method changed becomes a continuous comparison that the engineer reviews on a cadence rather than initiates. The cadence-review model is the model that most engineering teams can sustain; the every-time-you-touch-the-method model is the model they have not historically sustained.

The invariant-discipline tax is reduced by AI's ability to reason about classes globally rather than locally. An AI presented with a class definition, the constructors that establish initial states, and the methods that modify state can propose invariants that the class appears to maintain, surface methods that potentially violate the proposed invariants, and ask the engineer whether each proposed invariant captures intended behavior. The global reasoning that historically required the engineer to hold the whole class in mind simultaneously becomes a conversation with AI in which the engineer evaluates proposed invariants one at a time. The cognitive load is shifted from synthesis (writing the invariant from a blank page) to evaluation (assenting to or refining a proposed invariant), and evaluation is more tractable than synthesis for most engineers on most classes.

The operational prompt for an AI-assisted Design by Contract workflow is therefore a multi-stage prompt that operates on an existing module and produces a contract-augmented version of it, with the engineer's review at each stage:

```
You are augmenting the supplied module with Design by Contract
specifications per Meyer's discipline. The module exists in its
host language (Python, TypeScript, Java, Rust, C#, etc.); use the
language's native contract idiom where available (assertions,
decorators, type guards, comments with structured annotations).

Stage 1: Class invariant derivation.

For each class in the module:

1. Read the constructor(s) to identify the initial state the class
   guarantees. Identify field relationships, multiplicity
   constraints, and value ranges established at construction.

2. Read each public method to identify state modifications. Note
   which methods could plausibly violate the constructor-established
   invariants.

3. Propose a candidate invariant set for the class, expressed in
   the host language's invariant idiom. Each invariant has:
     - A formal expression.
     - A one-sentence plain-English explanation.
     - A justification citing the methods or constructor logic
       from which it is derived.

4. Surface the invariants for engineer review before proceeding.
   The engineer accepts, refines, or rejects each. Do not write
   invariants to the module until the engineer has approved them.

Stage 2: Method contract derivation.

For each public method in the (now invariant-approved) class:

5. Read the method body and the tests that exercise the method.
   Identify:
     - The input domain the method is designed to handle (from
       the body's branches and the tests' input distributions).
     - The output guarantees the method makes (from the body's
       return statements and the tests' assertions).
     - The exceptional cases the method explicitly handles versus
       the cases it implicitly assumes away.

6. Propose:
     - A precondition expressing the input-domain constraints.
     - A normal-return postcondition expressing the output
       guarantees for the standard path.
     - An exceptional-return postcondition for each documented
       exception or error return.

7. Where a contract cannot be derived with high confidence from
   existing code and tests, mark with TODO and a one-sentence
   explanation of what is uncertain. Do not fabricate contracts
   that the code does not actually satisfy.

Stage 3: Contract-code consistency check.

8. Run the test suite with the proposed contracts in place. Any
   contract that the test suite violates is either:
     - A contract that is too strong (the code does not actually
       satisfy it) — propose weakening.
     - A test that is exercising behavior outside the contract
       (the test relies on behavior the contract excludes) —
       propose either widening the contract or fixing the test.

9. Output a contracts.md summary table listing every method, its
   pre/post/invariant, and any TODO contracts requiring further
   specification or any contract-test consistency issues requiring
   resolution.

Output: the contract-augmented module plus contracts.md.

Provenance discipline: every contract must be derivable from the
existing code and tests. The reader is auditing the contract
derivation, not the code. Stay disciplined about provenance —
derive, do not invent.

Abort criteria: If the class's behavior is heavily dynamic in ways
that resist static contract specification (e.g., a callback-heavy
API where the contracts depend on the callback's behavior), name
the limitation and propose narrower contracts for the parts of the
class that admit them. Do not attempt to specify contracts for
methods whose behavior is irreducibly dynamic.
```

The worked restoration applies the prompt to the Agicore parser module — specifically, the portion of the parser that handles the declaration of `AI_SERVICE` entities, which has a moderately complex state machine across the parsing process and several invariants that the existing code maintains implicitly. The prompt's output is a contract-augmented parser with thirty-one preconditions, forty-two postconditions, and seven class invariants spanning the four classes that constitute the AI_SERVICE parsing logic. Of the proposed contracts, the engineer accepts thirty-eight on first review, refines fourteen, and rejects six as either too strong or as artifacts of test-specific behavior the engineer does not wish to specify formally. Two TODO contracts remain at the conclusion of the workflow — both for methods whose behavior is conditional on AI provider configuration that the parser cannot statically know — and the engineer leaves them as TODOs rather than fabricating contracts that would not be defensible.

The contract-augmented parser is committed. The next test-suite run identifies three latent bugs that the contracts surface: two cases where the parser's behavior when invoked on malformed input had been masking a real failure (the postconditions were not satisfied; the tests had been asserting on the masked behavior rather than the proper failure); one case where a class invariant was being temporarily violated during a multi-step parse and not restored if a specific kind of error occurred mid-step. Each bug is fixed; each fix is accompanied by an updated contract that more accurately describes the (now-correct) behavior. The work from initial contract derivation to final commit took approximately five hours; the bugs found would have surfaced eventually in production, against malformed input that the test suite did not cover; the contracts now both document the parser's behavior and prevent regression of the fixes.

The discipline of Design by Contract is not, in the end, about catching bugs at runtime — although it catches them. The discipline is about *forcing the articulation of what every method is supposed to do*, in a form that survives the method's evolution and that subsequent readers can rely on. The articulation is what most engineering organizations have systematically failed to perform across the past four decades, despite knowing they should, because the activation energy of writing the contract from a blank page exceeded their willingness to pay. AI lowers the activation energy by providing the draft. The engineer's contribution is the review and the judgment about whether the draft matches intent. The discipline returns not as the Eiffel community practiced it — every contract written by hand, every invariant authored from synthesis — but as a partnership between human judgment and AI proposal that produces a comparable result with a manageable effort budget. The return is what restoration looks like for partnership disciplines. Meyer's framework is restored; the practice is altered; the outputs match the original within reasonable tolerances; the engineering value follows.

Chapter 9, the final chapter of Part II, turns to David Parnas's tabular specifications — the framework that produced specifications of the A-7E flight software at the U.S. Naval Research Laboratory and that exemplifies the most rigorous end of pre-AI specification practice. Parnas's tables are the discipline's most demanding form. They are also, with AI assistance, restorable.
