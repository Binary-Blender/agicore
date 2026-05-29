# From Eliza to ChatGPT: A History of Artificial Intelligence

**Author:** Christopher Bender
**Publisher:** AI WIN-WIN Institute
**Volume:** 14 (Textbook Shelf, sister to *The Chocolate Wars*)
**Genre:** Popular history + project book — *101 Things to Do with Your Commodore 64* for the AI age
**Length target:** ~35,000 words, 12 chapters
**Register:** Enthusiastic, hands-on, voice of a curious educator showing you what's possible. Short sentences. Concrete examples. Each chapter delivers a working system the reader can run.

---

## The argument the book makes

Artificial intelligence has, across the sixty years it has been a field, produced a small parade of flagship systems each of which made the world stop and look. Eliza in 1966. SHRDLU in 1972. MYCIN in 1974. Cyc in 1984. Deep Blue in 1997. Watson in 2011. AlexNet in 2012. AlphaGo in 2016. GPT-3 in 2020. ChatGPT in 2022. Claude Code in 2024.

Most books about AI tell you about these systems.

This book tells you how to build one of each.

The build is the lesson. You do not really know what Eliza was until you have written your own forty lines of pattern-matching code and watched a person you love treat the output as a real conversation. You do not really know what MYCIN was until you have encoded twenty rules about a tiny medical domain and watched the system make a recommendation you cannot fault. You do not really know what Claude Code is until you have given it your own messy project and watched it ship a feature while you eat lunch.

The book gives you the history of each era. Then the book hands you a working reference implementation, built in Agicore — the open-source deterministic-systems substrate this book's author has spent the last several years building — and walks you through running it on your own machine. The reference implementations are real systems, not toys. They are bundled in the public agicore-examples repository. Every one compiles. Every one runs.

By the end of the book the reader has run twelve working AI systems spanning every major era of the field. The reader has learned the history by building it.

---

## Lineage

This book is, in spirit, the direct descendant of *101 Things to Do with Your Commodore 64* — Mark Sawusch's 1984 book that taught a generation of kids that the right way to learn what a computer is is to type a small program into it, run it, and see what happens. That book did not lecture. That book did not philosophize. That book said: *here is a small thing you can build, here is how to build it, here is what you will learn by building it.* Six-year-olds built the projects. The country that produced the dot-com generation was the country that produced the kids who had typed in BASIC line numbers from Mark Sawusch's book.

This book is that book, sixty years later, for AI.

The reader of this book may be a working software engineer, a curious adult, a teenager, a teacher, a parent who wants something to do with a smart kid on a weekend afternoon. The reader's prerequisites are: a laptop, the willingness to type, the willingness to be wrong, and a copy of this book. The reader's reward, twelve chapters in, is having built a working tiny version of every important system the field has produced — and having, in the process, learned more about AI than most working AI engineers know.

---

## The Agicore connection

Every chapter's build section uses Agicore — specifically, an `.agi` file that lives in the public agicore-examples repository on GitHub. Agicore is an open-source compiler-first systems-authoring framework the author has been building since the early twenty-twenties. Agicore lets you describe a system in declarative `.agi` source and compile it to a deterministic runtime — Rust, TypeScript, SQLite, Tauri-bundled or web-served. The reference implementations in this book are real Agicore programs, not pseudocode.

Why Agicore? Because writing each era's flagship system from scratch in raw Python (or Lisp, or C, or what have you) would consume eighty percent of the book's word count on plumbing and leave twenty percent for the actual ideas. Agicore inverts the ratio. The `.agi` file for each system is, in most chapters, fewer than two hundred lines of declarative source. The book can show you the whole system on a page. You read the system. You compile it. You run it. The plumbing is the compiler's problem.

The Agicore framework is free. Open-source MIT-licensed. Available at github.com/Binary-Blender/agicore. Installation is fifteen minutes on a fresh laptop and is documented in chapter one. The author makes no money on this book that depends on Agicore adoption; this is a teaching book. But every reader who finishes the book becomes, by virtue of having compiled twelve `.agi` programs, an Agicore user. The field gets twelve new practitioners per reader. That is, on the author's quiet belief, a reasonable trade.

The final two chapters — ChatGPT and Claude Code — also draw on BabyAI, a sister open-source project the author maintains. BabyAI is a cooperative AI routing layer that lets users share inference cost and learning across a private collective. Chapter eleven walks through running BabyAI as the local LLM-routing substrate the reader's own ChatGPT-shaped projects can build on.

---

## Chapter-by-chapter

### Chapter 1: Why You Build Them

The book's frame-setter. The Commodore 64 lineage. The argument that history learned by building is real history; history learned by reading is decoration. The promise: twelve working systems by the end of the book. Installation chapter for the tooling — Agicore install, the agicore-examples repo clone, the BabyAI install instructions reserved for chapter eleven. No system built in this chapter. The reader's only homework is to have the tools ready.

### Chapter 2: Eliza, 1966

Joseph Weizenbaum at MIT writing a 200-line program in MAD-SLIP that simulates a Rogerian psychotherapist by reflecting the user's input back as questions. The first chatbot. The story of Weizenbaum's own secretary asking him to leave the room so she could talk to Eliza privately, and Weizenbaum spending the next fifteen years arguing that the field had taken the wrong lesson from his program. The lesson the field took: machines can converse. The lesson Weizenbaum thought the field should have taken: humans will project sentience onto pattern-matched output and that the burden of restraint is on the builder, not the user.

**Build:** `accelerando_eliza.agi` — Super Eliza Operator Interface from the Accelerando suite. A Tauri desktop app that does pattern-matched conversation against a configurable rule-base, with the operator able to add new patterns at runtime. Two hundred and forty lines of `.agi`. Runs on Windows, macOS, and Linux. The reader watches the canvas paint as the rule engine fires. The reader edits one rule, recompiles, watches the program's personality change.

### Chapter 3: SHRDLU, 1972

Terry Winograd's PhD thesis at MIT. A natural-language program that conversed about a small simulated world containing colored blocks, a box, and a pyramid. *Pick up a big red block. Put it in the box. What color is the block on the green pyramid?* SHRDLU answered. SHRDLU also pretended to have feelings ("I AM SORRY, I DON'T KNOW HOW TO STACK A PYRAMID ON A PYRAMID") and pretended to have memory of the conversation. SHRDLU did all of this in seven thousand lines of Micro-Planner. The system was the high-water mark of symbolic AI's ambition for ten years. The system also could not, on any examined measure, be extended to a second domain. The blocks world was the only world SHRDLU could think about.

**Build:** `accelerando_config.agi` — Self-configuration advisor from the Accelerando suite. A rule-based system that walks the user through a constrained domain (configuring a new install of one of the Accelerando enterprise apps) by asking questions and applying its rule-base to the answers. The structural analogy to SHRDLU is the constrained-domain ambition: the system is brilliant inside its domain and useless outside it. The lesson SHRDLU was teaching, available again here.

### Chapter 4: MYCIN, 1974

Edward Shortliffe's PhD thesis at Stanford. An expert system for diagnosing bacterial infections and recommending antibiotic regimens. Five hundred rules, encoded by hand from interviews with Stanford infectious-disease specialists, applied via backward-chaining inference. MYCIN was, on blind tests against expert physicians, better than the experts. MYCIN was never deployed in clinical practice. The reasons it was not deployed — liability, integration with existing workflow, the medical profession's refusal to be audited by a program — are the lessons every subsequent expert system has had to relearn. The technical lesson is that knowledge engineering, the work of getting the rules out of a domain expert's head and into a machine, is itself the bottleneck. The political lesson is that being right is not enough.

**Build:** `accelerando_clinical.agi` — Clinical documentation and decision support from the Accelerando suite, the direct lineal descendant of MYCIN. The reader compiles it, loads a small slice of synthetic patient data, watches the system make a recommendation, and reads the audit trail explaining the reasoning. Three hundred and ten lines of `.agi`.

### Chapter 5: Cyc, 1984

Doug Lenat's twenty-million-rule project at MCC and Cycorp. The ambition was to encode every piece of common-sense knowledge a five-year-old child has — *water flows downhill, a person cannot be in two places at once, a glass dropped on concrete will probably break* — and use it as the substrate for general AI reasoning. Cyc consumed thirty years of effort, two thousand person-years of knowledge engineering, and is still, at the time of this book's writing, being maintained. Cyc never produced the general AI Lenat believed it would. Cyc also, on the field's quiet honest assessment, produced an enormous quantity of practical value in constrained applications: defense intelligence analysis, medical reasoning, schema integration. Cyc is the field's most underrated success. It is also the field's most cautionary tale about the cost of betting on a single approach for thirty years.

**Build:** `accelerando_es.agi` — the Accelerando suite's governance layer. A rule-based expert system that watches every action proposed by the empire's other apps and applies a clearance-and-policy rule-base to decide whether the action gets auto-deployed, queued for human review, or blocked. The structural analogy to Cyc is the governance-by-encoded-judgment model: human expertise encoded once, applied uniformly forever. Two hundred and ninety lines of `.agi`.

### Chapter 6: Deep Blue, 1997

IBM's chess-playing system. Kasparov vs. Deep Blue in Philadelphia in February 1996 (Kasparov won 4-2) and in New York in May 1997 (Deep Blue won 3½-2½). Deep Blue was, in its working parts, mostly hardware: thirty IBM RS/6000 processors with four hundred and eighty custom chess chips, evaluating two hundred million positions per second via alpha-beta search with carefully tuned heuristics. Deep Blue was not "intelligent" in any sense the field cared about. Deep Blue was a brute-force search engine with a domain-specific evaluation function. What it taught the field was that brute force, applied at scale, beat all the clever symbolic-reasoning techniques that had been the field's bet for twenty years. Cleverness gave way to compute. The pattern would repeat.

**Build:** `accelerando_scheduling.agi` — the Accelerando suite's patient-scheduling engine. A constraint-satisfaction system that searches the space of feasible schedules under a large set of constraints (provider availability, patient preferences, room capacity, equipment booking) and returns an optimum. The structural analogy is the search-with-heuristics shape: a vast space, a tractable evaluation function, brute force applied smartly. Three hundred and forty lines of `.agi`.

### Chapter 7: Watson on Jeopardy, 2011

IBM's question-answering system. Two-day tournament against Ken Jennings and Brad Rutter; Watson won by a wide margin. Watson was not the chatbot the public assumed; it was a massive ensemble of natural-language-processing modules, evidence-scoring algorithms, and a curated knowledge base spanning hundreds of structured and unstructured sources. The system ran on ninety IBM Power 750 servers. The Jeopardy demo was an extraordinary engineering accomplishment. The post-Jeopardy commercialization of Watson — Watson Health, Watson for Oncology — was an extraordinary cautionary tale. The technical brilliance did not transfer to the messy commercial domains IBM tried to deploy it in. The lesson: a brilliant demo on a constrained, well-defined task tells you very little about the system's behavior on an unconstrained, ill-defined task.

**Build:** `accelerando_oie.agi` — the Accelerando suite's Operational Intelligence Engine. A cross-source query system that ingests the empire's structured data and surfaces non-obvious patterns: *the Hazelnut Cup buyer base is forty-three percent more likely to donate to the school-funding campaign than the milk-chocolate buyer base.* The structural analogy to Watson is the multi-source evidence-fusion shape; the lesson Watson taught — that brilliance in the constrained demo does not transfer to the unconstrained deployment — is recapitulated here as a design principle, not a warning. Two hundred and seventy lines of `.agi`.

### Chapter 8: AlexNet, 2012

Alex Krizhevsky, Ilya Sutskever, and Geoff Hinton's eight-layer convolutional neural network. The ImageNet Large Scale Visual Recognition Challenge of September 2012. AlexNet won by a margin no previous entry had ever come close to — top-five error rate of 15.3 percent against the second-place entry's 26.2 percent. The trick that made AlexNet work was not the network architecture; the network was a modest update on Yann LeCun's late-1990s designs. The trick was using two consumer GPUs to do the training. The neural-net field had been frozen for fifteen years not because the math was wrong but because nobody had the compute to train a network deep enough to matter. AlexNet unfroze the field. Every modern AI system from this point on stands on the shoulders of that one paper.

**Build:** `accelerando_radiology.agi` — the Accelerando suite's radiology information system, with a built-in image-classification module for triaging chest X-rays. The reader walks through how the `.agi` declaration wires a pretrained vision model as a service, ingests sample DICOM images, and emits triage recommendations. The build is the moment the book pivots from symbolic-reasoning systems to neural systems. Three hundred and ninety lines of `.agi`.

### Chapter 9: AlphaGo, 2016

DeepMind's Go-playing system. Match against Lee Sedol in Seoul in March 2016; AlphaGo won 4-1. Game 2 contained Move 37 — a stone played at a position no human professional would have played, which on later analysis turned out to be the move that won the game. Move 37 is the moment the world realized that reinforcement learning could produce genuinely novel strategy, not just imitate human play. AlphaGo combined a value network (estimating which side wins from a position) with a policy network (proposing strong moves) and Monte Carlo tree search. AlphaGo Zero, the 2017 follow-up, learned the game from nothing but the rules and self-play; it surpassed the human-trained version in three days. The lesson: when the loss function is clean, AI can teach itself to be superhuman without any human input. The harder question is what "clean loss function" means in any domain that is not a game.

**Build:** `accelerando_pi_coe.agi` — the Accelerando suite's Process Improvement Center of Excellence. A continuous-improvement engine that runs proposed process changes through a sandboxed simulation, learns from the outcomes, and proposes its own further refinements. The structural analogy to AlphaGo is self-play in a constrained environment: the system improves itself by simulating its own decisions. Two hundred and twenty lines of `.agi`.

### Chapter 10: GPT-3, 2020

OpenAI's hundred-and-seventy-five-billion-parameter language model. Released in June 2020 via a limited API. GPT-3 was not the first large language model — Google's BERT (2018) and T5 (2019) preceded it; OpenAI's own GPT-2 (2019) was the immediate ancestor — but GPT-3 was the model that, for the first time, made *prompting* the primary interface to AI. The user wrote a few sentences in natural language describing what they wanted; the model produced output that resembled what the user wanted. The pattern was called *few-shot learning*; the practice it created was called *prompt engineering*. GPT-3 was the first AI system whose primary skill was conversation about the task, not the task itself. Everything since has been a scale-up or a refinement.

**Build:** `accelerando_chatbot.agi` — Super Eliza Customer Service Chatbot from the Accelerando suite, configured to use a GPT-class API as its inference backend. The reader compiles the `.agi`, plugs in an API key, watches the customer-service flow run end-to-end with the LLM handling the language part and the rule-base handling the policy part. The chapter ends with the reader writing their first three prompts as `.agi` PROMPT declarations and watching the program's behavior change. Three hundred and seventy lines of `.agi`.

### Chapter 11: ChatGPT and BabyAI, 2022

OpenAI's November 30, 2022 release of a conversational interface to a fine-tuned GPT-3.5. The product hit a million users in five days, a hundred million users in two months. ChatGPT was the moment AI stopped being a developer tool and started being a consumer product. Every business in the world rewrote its strategy presentation in the next ninety days. The history Chapter telling: the model was not technically new; the interface was new. The lesson: distribution and packaging produce step-function impact on adoption, even when the underlying technology has been incrementally available for years.

**Build:** **BabyAI** — the author's open-source cooperative AI routing layer. BabyAI sits between the user and the AI models and routes each request to the cheapest model that can serve it, learns from user feedback which model to route to next time, and shares the learning across the cooperative. The reader installs BabyAI locally, configures it with their own API keys, and watches their LLM costs drop to near zero while their output quality stays at or above ChatGPT's. Three hundred and fifty lines of `.agi` plus a Python harness. The chapter ends with the reader having a private, cost-efficient ChatGPT-class assistant running on their own machine, never sending their data to anyone they did not choose to send it to.

### Chapter 12: Claude Code, 2024 — AI as Build-Time Tool

Anthropic's release of Claude Code in 2024. A CLI tool that lets a developer hand Claude a project directory and a task — *fix this bug, ship this feature, refactor this module* — and watch Claude do the work over minutes to hours. Claude Code was the moment AI stopped being a chatbot you asked questions of and started being a colleague you handed work to. The lesson: when AI can operate on the artifact (code, document, system) instead of merely talking about the artifact, the productivity ceiling rises by an order of magnitude. The implications, on the author's honest belief, are still being absorbed by the field — and by the economy.

**Build:** **Agicore Studio** — the author's visual IDE for the Agicore DSL, which the reader has been compiling `.agi` files against for the previous eleven chapters. The reader installs Agicore Studio (one of the bundled installers from the Studio's release page) and walks through using Claude Code to author a new `.agi` from scratch: a small workflow of the reader's choosing, described in plain English to Claude, scaffolded into `.agi` by Claude, refined on the Studio's canvas, compiled, run. The chapter — and the book — ends with the reader holding in their hands the working version of a system they sketched in English forty minutes earlier. The point of the field, sixty years after Eliza, is that the gap between *I want a thing* and *the thing exists* has been compressed to the time it takes the AI to write it and the reader to approve it.

The book closes with one paragraph of plain-prose recap: *you have, by reading this far, built twelve working AI systems spanning every era of the field. You know more about AI than most people who work in AI. Go build something.*

---

## Cross-references

- The Accelerando suite that supplies most reference implementations is documented at length in *The Chocolate Wars* (Volume 13) as the deployment Jimmy Donaldson runs across his empire. Readers of both books recognize the systems.
- The Agicore framework is documented in the public `agicore-main` repo (github.com/Binary-Blender/agicore) and the author's whitepaper, both linked in the foreword.
- BabyAI is documented at the BabyAI public repo and is the subject of a planned standalone volume in this series.

---

## Register guide for the writing

- Voice: enthusiastic-but-tight, educator-shaped, *Things to Do* spiritual descendant.
- Sentences: short. Concrete. Mid-length variation for rhythm.
- History sections: roughly 1,500 words. Tell the story of each system with primary detail — who built it, when, where, with what — and the lesson the field took.
- Build sections: roughly 1,000-1,500 words. Walk the reader through the `.agi` reference implementation. Show snippets. Name what each declaration does. Land with the reader running the system.
- Chapter length target: 2,500-3,000 words.
- Total book target: ~35,000 words across 12 chapters.
- Cross-reference both *The Chocolate Wars* and the underlying Agicore documentation naturally, never salesy.

---

## Imprint

AI WIN-WIN Institute — KDP Select (Kindle Unlimited).

## Title

*From Eliza to ChatGPT: A History of Artificial Intelligence*

Subtitle: *Build a Working Version of Every Era's Flagship AI*
