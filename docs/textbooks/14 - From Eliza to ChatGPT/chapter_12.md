# Chapter 12: Claude Code, 2024 — AI as Build-Time Tool

In the summer of 2024, the AI research company Anthropic released a command-line tool called Claude Code.

The tool was, on the announcement page that accompanied its release, a small thing. A developer could install the tool, navigate to a project directory on their laptop, type `claude` at the terminal prompt, and find themselves in a conversational interface with the Claude language model. The conversation could be about the code in the project. The conversation could be about a task the developer wanted accomplished. The conversation could be about a bug the developer was struggling to fix.

The novelty was that Claude, given access to the project's files and a shell on the developer's machine, would *do the work*.

The developer would describe the task in plain English: *implement a function that takes a list of order records and returns the per-customer revenue summary, with the summary sorted by total descending.* Claude would, across the next minutes, read the relevant source files in the project, infer the project's conventions, write the function, run the test suite to check that the function worked, fix the function if any tests failed, commit the change to a feature branch, and report back to the developer that the task was complete.

The developer would, during the minutes Claude was working, drink a cup of coffee. Or answer a Slack message. Or read a different file. Or, on the days when the trust in the system was high enough, leave the desk entirely and come back to a completed feature.

The pattern was new.

The pattern was, on the field's collective subsequent reading, the moment AI stopped being a chatbot you asked questions of and started being a colleague you handed work to.

---

The technical underpinnings of Claude Code were familiar.

Claude was a frontier language model — the third generation of Anthropic's Claude family at the time of Claude Code's release, succeeded by subsequent generations across 2024 and 2025. The model had been fine-tuned for conversational behavior and for the structured *tool use* pattern that had emerged across the LLM industry across 2023: the model could, in its response, request that the system execute a specific external operation (read a file, run a shell command, query a database) and incorporate the operation's result into its subsequent reasoning.

The tool-use pattern was what made the work-doing possible.

Without tool use, a language model could only produce text. With tool use, a language model could produce text *and* request that the world be modified. The combination was the technical primitive on which agentic AI was built.

Claude Code was, in essence, a particularly well-engineered shell around Claude's tool-use capability. The shell exposed a small but powerful set of tools — file read, file write, file edit, shell command execution, web fetch, web search, task management — and the language model used those tools to operate on the developer's project. The shell handled the tedious work of safety (asking the developer for permission before destructive operations), context management (deciding which files to put in the model's working context), and error recovery (retrying failed operations, backing off when the model got stuck).

The combination — frontier model plus carefully designed tool shell — produced a system that could handle developer tasks of substantial complexity. The system was not, on any honest assessment, fully autonomous. The system needed the developer to specify the task, to review the work, to catch the occasional misstep. But the system could, on the substantial fraction of well-specified tasks, complete the task without further human intervention between the prompt and the result.

The fraction grew, across the eighteen months following Claude Code's release, as Anthropic's subsequent model versions improved and as the patterns of using Claude Code became better understood by the developer community. By early 2026 — the time of this book's writing — Claude Code had become, on the working consensus of the software-engineering industry, the dominant tool of the working developer. Developers using Claude Code were, on multiple published productivity studies, shipping working software at approximately three to five times the rate of developers not using Claude Code.

The same general pattern — *the model gets the tools, the model does the work, the human reviews and approves* — had, by 2026, been replicated across most knowledge-economy domains. There were Claude-Code-equivalent tools for legal research, for medical literature review, for financial analysis, for marketing copy production, for data analysis, for graphic design. Each tool was, in its working architecture, the same pattern: a frontier language model, a carefully designed tool shell appropriate to the domain, a human in the loop at the task-specification and review steps.

The pattern was the new pattern of work.

---

The transition from the GPT-3 era (chapter ten) to the Claude Code era was, on the field's working consensus, the most consequential shift in the practical application of AI since AlexNet.

GPT-3 had moved the work from build time to use time — the user wrote the prompt at use time, the model interpreted the prompt at use time, the work was the prompt-engineering work. Claude Code moved the work *from the user to the model*. The user, at use time, specified the task; the model, at use time, *did* the task. The user's work shrank to specification and review. The work the model did expanded to the actual production of the artifact.

This is the practical inversion that defines the modern era.

In the Eliza-through-AlphaGo eras, the AI was a tool. The human used the tool to produce work. The work-production was the human's job.

In the GPT-3 era, the AI was a programmable interpreter. The human wrote the program (the prompt). The AI executed the program. The work-production was a collaboration between the human's prompt and the AI's execution.

In the Claude Code era, the AI is a colleague. The human specifies the task. The AI does the task. The work-production is the AI's job, with the human providing oversight.

The transition is not yet complete. Many domains have not yet been wrapped in tools the way software engineering has. Many tasks within wrapped domains are still beyond the current models' capability. Many regulated domains — medicine, law, finance, public administration — face the same deployment bottlenecks (liability, integration, political acceptance) that have constrained AI deployment since MYCIN in 1979. The transition will not, on any honest projection of the trajectory, be complete in the lifetime of this book.

But the direction is established.

The reader who finishes this book has been working in the same paradigm Claude Code embodies. Every chapter has used the same pattern: the reader specifies an `.agi` declaration, the Agicore compiler does the production work, the reader reviews and runs. The book has been training the reader, chapter by chapter, in the discipline of high-level specification and trust-but-verify oversight that the Claude Code era demands.

The final chapter of this book is the chapter in which the reader uses Claude Code, *directly*, to produce a new `.agi` system of the reader's own choosing.

---

## The build: Agicore Studio + Claude Code

The Agicore Studio is the author's visual integrated development environment for the Agicore DSL. The Studio is available at:

```
https://github.com/Binary-Blender/agicore/releases
```

The Studio ships as a platform-native installer (`.dmg` for macOS, `.msi` and `.exe` for Windows, `.deb` and `.AppImage` for Linux). Installation is the usual click-and-accept process for desktop applications. The Studio opens to a welcome screen offering six bundled sample workflows — `hello, canonical, persona_dispatch, parallel_research, iterate_refine, validate_with_branch` — and four authoring paths: blank canvas, open existing project, open existing file, or open one of the samples.

The Studio's central feature, for this chapter's purpose, is its tight integration with Claude Code.

The reader opens a terminal in the directory of an Agicore project. The reader types:

```
claude
```

Claude greets the reader. The reader describes the workflow they want to build, in plain English:

> *I want to build a small workflow that ingests a list of book titles, fetches each book's bibliographic data from the Open Library API, summarizes each book in three sentences using an AI call, and produces a single markdown document with all the summaries in alphabetical order by author. The workflow should pause for a human review of the assembled document before writing it to disk.*

Claude reads the project's existing `.agi` files to learn the conventions. Claude reads the Agicore documentation. Claude drafts a new `.agi` file. Claude opens the file in the Studio so the reader can see the workflow on the canvas. Claude runs the workflow against a small sample of book titles to verify that the canvas representation matches the working program. Claude reports the result.

The reader, watching the Studio's canvas, sees the workflow appear: a `start` node, an `http_call` to Open Library, a `parallel_fanout` over the book list, an `ai_call` per book, a `qc_checkpoint` for the human review, an `http_call` (or a local file write) to save the result, an `end`. The reader sees the wired edges. The reader sees the inspector populate when each node is clicked.

The reader can:

- Accept the workflow as Claude drafted it.
- Modify the workflow on the canvas, with Claude reading the modifications and updating its own understanding of the project's `.agi`.
- Ask Claude to make changes in plain English: *add a step that emails me the final document instead of saving it to disk.*

The workflow that emerges, after twenty or thirty minutes of conversation, is a real working program. The program is described in approximately one hundred and fifty lines of `.agi` source. The program would have taken, in 2018, a senior developer approximately a full working day. The program took the reader, in 2026, twenty minutes of conversation with Claude.

The point of the field, sixty years after Eliza, is this.

The gap between *I want a thing* and *the thing exists* has compressed.

The compression is not complete. The thing the reader wants must still be specified clearly. The thing Claude produces must still be reviewed. The thing must still be tested. The thing must still be deployed, with the deployment bottlenecks (liability, integration, political acceptance) that have been with us since 1979 and are unlikely to leave anytime soon.

But the compression has happened.

The reader who has done the homework in chapters two through eleven has built twelve working AI systems by hand-editing `.agi` files. The reader of chapter twelve has, in the last twenty minutes, built a thirteenth by talking to Claude.

The thirteenth is the reader's own.

The thirteenth is the system that answers, in the form of a working program, the question of what *the reader specifically* wants from the field.

The book has, on its own honest accounting of its purpose, brought the reader to the moment of the thirteenth system. The eleven historical systems were the preparation. The eleven historical systems were the writing-the-knowledge into the reader's hands. The thirteenth system is the moment the reader uses the knowledge to build something only the reader could have wanted.

That is the point of building.

That is the point of this book.

---

## What's next

You have, by reading this far, built twelve working AI systems spanning the entire history of the field.

You know more about artificial intelligence at this point than the majority of people who currently work in AI know. The majority have, on most days, expertise in some narrow subset of the modern stack — usually transformer-era language models — and have not, in their actual working lives, hand-built systems from the symbolic era, the expert-systems era, the search-and-evaluation era, the neural-network era. You have done all of it. You have done it small, but you have done it.

The thirteenth system is the system you build now.

The thirteenth system is not in this book.

The thirteenth system is the system that addresses the problem in *your* life that has been waiting, for however many months or years, for a tool that did not previously exist. The problem is yours. The tool you now know how to build. The Agicore framework is the substrate. Claude Code is the colleague. BabyAI is the cost-managed inference layer. The patterns you learned across the previous chapters are the design vocabulary.

The Commodore 64 generation of kids who typed in BASIC programs from Mark Sawusch's book grew up to build, among other things, the AI systems this book covers.

The author's quiet hope, in writing this book, is that some of the readers grow up — or, in many cases, simply grow further — to build the systems that come *after* the ones in this book.

The systems that come after will not, on any reasonable projection, be predictable from where the field stands in 2026. The systems that come after will be the response of the next generation of practitioners — including the readers of this book — to whatever problems and opportunities the years between 2026 and the future present.

The author cannot, sitting in a small house in southern Missouri in May of 2026, predict what those problems and opportunities will be.

The author can predict that the practitioners who are best prepared to address them will be the ones who have, by then, internalized the discipline of *building the small version*. The discipline of *running it on your own machine*. The discipline of *reading the source*. The discipline of *paying attention to what the system is and is not doing*. The discipline of *knowing the history of the field well enough not to repeat the field's mistakes*.

This book has tried to put all of those disciplines in the reader's hands.

The reader has, by this final page, the disciplines.

The reader has the framework.

The reader has the colleague.

The reader has the time.

Go build something.

The world has, on its honest assessment of 2026, more problems waiting to be solved than people capable of solving them. The bottleneck is not, on the writing-from-scratch reading, the technology. The bottleneck is, and has always been, the supply of people who know how to use the technology well.

You are now in that supply.

Use the supply.

Make something that matters.

That is the work.

That is the work.

That is the work.
