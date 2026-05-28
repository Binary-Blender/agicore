Donald Knuth published *Literate Programming* in *The Computer Journal* in 1984 as the foundational statement of a methodology he had been developing across the preceding several years at Stanford. The methodology's central proposition appeared in the paper's opening sentences: "Let us change our traditional attitude to the construction of programs: Instead of imagining that our main task is to instruct a computer what to do, let us concentrate rather on explaining to human beings what we want a computer to do." The reframing was deliberate. Programming had been understood as the writing of instructions for machines; Knuth proposed that it should be understood as the writing of explanations for humans, with the machine-executable form derived from the explanation as a secondary artifact. The methodology was implemented in the WEB system, which accepted source files containing interleaved prose and code chunks, and produced two outputs from each source file: a *woven* document, typeset for human reading, with the code embedded in the prose as the prose called for it; and a *tangled* program file, with the code extracted in compilation order, suitable for compilation by the host language's standard tools. The dual output is the methodology's structural commitment — the human-readable form and the machine-executable form derive from a single source, with no possibility of drift between them.

The canonical demonstration of literate programming is Knuth's implementation of the TeX typesetting system. TeX was written across the late 1970s and early 1980s, refined through multiple versions, and finalized in 1982 at a state Knuth considered substantially complete. *TeX: The Program*, published in 1986 as Volume B of the Computers and Typesetting series, is the literate program itself — five hundred pages of typeset book whose content is the woven output of the WEB source files, with every page reading as continuous prose interleaved with Pascal code excerpts. The system has been in production for forty years. The defect record across that span is approximately zero — Knuth has offered a small monetary reward (originally $2.56, doubling per discovery) for any defect found in TeX since the system reached version 3.0 in 1989, and the reward has been claimed only a handful of times. The reliability is uncommon for any software of that age and complexity. The methodology that produced it is documented in detail and remains available. The methodology has been adopted by approximately the same population of developers who adopted it in 1990.

What kept literate programming from broader adoption is the most direct effort tax in the documentation cluster: the *prose-parity tax*, with a compounding *tool-friction tax* that magnified the prose tax's effect. The prose-parity tax is straightforward to name and difficult to overstate. Literate programming requires that the prose layer be written, edited, and maintained at parity with the code layer — every code change requires a corresponding prose change; every refactoring requires the explanatory text to be re-derived; every new feature requires a paragraph of explanation as much as it requires a function of implementation. The prose-writing effort, in disciplined literate-programming practice, approximates the code-writing effort in person-hours. The doubling is not modest; it is the dominant cost of the practice. Developers who chose literate programming chose to spend approximately twice the time on the same software's development; the choice was rational only when the resulting maintainability justified the upfront cost, and the rationality was easily lost when ship dates pressed or when the next developer to touch the code did not value the prose as much as the original author had. The discipline died, repeatedly, in the second commit by the second author.

The tool-friction tax compounded the prose-parity tax. WEB and its successor CWEB were tools optimized for Pascal and C respectively; subsequent variants (noweb, nuweb, and others) extended to additional languages, but the integration with mainstream development environments was always partial. Modern IDEs, debuggers, profilers, and refactoring tools operate on the tangled source rather than the woven document; the literate-programming author had to choose between editing the woven form (and re-running the tangle to produce compilable code) or editing the tangled form (and losing the prose that the woven form contained). The tooling cost was a recurring friction that the discipline could overcome only at the cost of organizational commitment that few engineering teams sustained. Org-mode in Emacs and Jupyter notebooks in the data-science community represent partial fulfillments of the literate-programming vision in narrow contexts, but neither is widely adopted as a general programming methodology in production software development.

What AI changes about literate programming is the prose-parity tax in particular, and it changes it in a way that is mechanistic and worth specifying carefully. The prose layer is *derivable* from the code layer in cases where the code's intent is recoverable from the code itself plus its surrounding context. AI, presented with a code module and the artifacts that surround it (tests, design documents, commit messages, type signatures, related code), can produce prose that explains the module's intent at a fidelity that approximates what the original author would have written had the original author been required to write literate prose. The prose is not always perfect — there are aspects of intent that the code does not contain and that AI cannot recover without explicit input from the engineer — but the prose is recoverable to a degree that makes literate programming practicable as a *post-hoc* discipline rather than as a write-from-scratch discipline. The engineer writes the code in conventional form; AI produces the literate-programming view from the code; the engineer reviews and refines the prose; the literate view is maintained continuously as the code evolves.

The reframing of literate programming as a post-hoc rather than a write-from-scratch discipline is, in one sense, a departure from Knuth's original conception. Knuth's WEB workflow assumed that the prose and the code were written together, with the prose driving the code's structure rather than describing it after the fact. The AI-restored version inverts the relationship: the code is written first; the prose is derived. Knuth would, on the available evidence, find the inversion somewhat unsatisfying — his argument for literate programming had a strong claim that the prose's primacy in the writing process produced better code than the code-first alternative. The inversion concedes the writing-process claim and retains only the readability claim: the resulting artifact is literate, even if its production process was not. The concession is real; the residual benefit is real; the post-hoc form is the form the typical engineer can sustain.

The operational prompt for an AI-driven literate-programming view of a module is therefore a prompt that operates on existing code rather than on a from-scratch design:

```
You are producing a literate-programming view of the supplied code
module per the methodology Donald Knuth published in 1984. The output
is the woven document — a continuous prose explanation of the module
with the code embedded as the prose calls for it.

Stage 1: Module analysis.

For the supplied module:

1. Identify the module's purpose: what it does, why it exists, what
   problem it solves in the broader system.

2. Identify the module's structure: the primary data structures, the
   primary functions, the dependencies on other modules, the
   invariants the module maintains.

3. Identify the conceptual decomposition of the module's
   functionality into a small number of named sections, each of
   which corresponds to a coherent piece of the module's
   responsibility.

4. Examine the surrounding artifacts: tests, design documents,
   commit messages, ADRs, related modules. Extract the intent
   signals these artifacts contain.

5. Surface the conceptual decomposition for engineer review. The
   engineer accepts or refines the decomposition. The prose's
   structure follows the decomposition.

Stage 2: Prose generation.

6. For each section of the decomposition:
   - Write the prose explanation in flowing English. Address the
     reader directly; explain why the code is structured the way
     it is, what alternative structures were rejected, what
     trade-offs the chosen structure makes.
   - Embed the relevant code excerpts in the prose, with each
     excerpt introduced by the prose that motivates it.
   - Cite the supporting artifacts (tests that exercise the
     section, design documents that informed it, related modules
     that interact with it).

7. Where the prose requires intent that the code does not contain
   (e.g., "this approach was chosen because X" where X is not
   visible in the code), mark the gap with a TODO inviting the
   engineer to supply the intent. Do not fabricate intent.

Stage 3: Synthesis.

8. Produce the woven document:
   - Title and author attribution.
   - Abstract: one paragraph summarizing the module's purpose.
   - Section headings following the conceptual decomposition.
   - Section bodies as the prose-with-code from Stage 2.
   - Cross-references to other literate-programming views of
     related modules, where they exist.
   - Bibliography of supporting artifacts.

9. The woven document should read top-to-bottom as a continuous
   explanation. The reader should be able to follow the module's
   logic without referring to the code outside the document.

Output: a literate.md file containing the woven document. The code
remains in its original form; the literate view is an additional
artifact, not a replacement for the source files.

Provenance discipline: every claim in the prose must be derivable
from the code or from cited supporting artifacts. Where the code
makes a choice (e.g., a specific algorithm, a specific data
structure), the prose should explain the choice in terms the
artifacts support; where the artifacts do not support an
explanation, mark with TODO.

Abort criteria: If the module is too large to admit a coherent
literate view (more than approximately a thousand lines of
nontrivial code), propose a decomposition into smaller modules
each of which warrants its own literate view. The methodology
loses its readability advantage at scales where the prose itself
becomes unreadable.
```

The worked restoration applies the prompt to an Agicore module — specifically, the parser's `parseAIService` function and its supporting types, which together constitute approximately three hundred lines of TypeScript with corresponding tests and a design document. The prompt's output is a literate.md document running to approximately twenty pages of typeset prose interleaved with code excerpts. The conceptual decomposition divides the module into five sections: the type-system foundations (the discriminated union of AI_SERVICE provider variants), the lexical analysis of provider names and parameters, the structural parsing of nested fields, the validation of cross-field constraints, and the integration with the broader parser's incremental-update protocol. The prose explains, for each section, why the implementation is structured as it is, what alternatives were considered (drawing on commit history that shows several rejected approaches), and how the section interacts with the surrounding code. Three TODO markers remain in the document: each is a piece of intent that the engineer (Christopher) supplies in approximately fifteen minutes of review and refinement. The completed document is a literate-programming view of the module that a new developer could read top-to-bottom and understand without further context.

A subsequent test of the document's value: a hypothetical new developer (simulated by a colleague unfamiliar with this specific module) is asked to make a small modification to the `parseAIService` logic — adding support for a new provider variant. The colleague is given the literate.md document and the source files. The modification is completed in approximately ninety minutes, with the colleague reporting that the prose explained the conceptual scaffolding sufficiently that the implementation pattern was clear and that the addition fit the existing structure without architectural friction. The same modification, performed against the source files alone (with comments at the level the code conventionally contains), would take, on the team's prior experience, approximately three to four hours and would frequently produce a first implementation that needed structural revision in code review. The literate view has paid its production cost in the first downstream modification.

The maintenance protocol for the literate.md document is the same protocol that the maintenance-under-change tax requires across all the documentation disciplines. Each code change triggers a regeneration of the affected sections of the literate.md, with the engineer reviewing the regenerated sections and committing them alongside the code. The regeneration is automatic; the review is fast; the document stays current. The maintenance tax that historically killed literate programming is paid by AI's continuous regeneration capability; the engineer's role is the review at change time, which is a small fraction of the original prose-writing effort.

A note on the relationship between literate programming and the Ubiquitous Language of Chapter 16 is appropriate. Literate programming operates at the module level — the prose explains how the code in this specific module works. The Ubiquitous Language operates at the domain level — the vocabulary establishes how the code across the system relates to the business concepts. The two are complementary: a literate view of a module is more readable when the module's identifiers participate in a Ubiquitous Language that the reader already understands; a Ubiquitous Language glossary is more useful when each term it defines can be followed to a literate view of the module that implements it. Both disciplines are restored in this part of the book; both benefit from each other; both become operational as a coordinated practice.

The next chapter develops the Ubiquitous Language restoration — the discipline whose maintenance tax has been the most punishing among the documentation disciplines and whose AI restoration is among the most consequential for the broader engineering practice.
