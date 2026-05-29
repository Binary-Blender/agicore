# Chapter 1: Why You Build Them

In 1984 a man named Mark Sawusch published a book called *101 Things to Do with Your Commodore 64.*

The book was three hundred and twenty pages of small projects you could type into a Commodore 64 personal computer. Each project was a short BASIC program — sometimes ten lines, sometimes a hundred — printed on the page next to a paragraph or two explaining what the program did, why it was interesting, and how the reader could modify it to do something else. The projects covered a startling range: a budgeting calculator, a maze generator, a music synthesizer, a sprite animator, a Mad Libs game, a flight simulator that was honestly closer to a flight implication, a small database for the reader's record collection, a craps simulator, a horoscope generator, a metric converter, and ninety-one others.

The book did not lecture.

The book did not philosophize.

The book did not, at any point, explain what a computer *was* before it explained what a computer *did.* The book assumed the reader already had access to a Commodore 64 — most readers did, because the C64 sold seventeen million units between 1982 and 1994 and was, for one improbable decade, the best-selling computer model in the world — and proceeded directly to the projects.

The argument the book made by its existence, and the argument this book is making by its existence, was this:

**The right way to understand a system is to build a small version of it.**

A child who has typed in a maze-generation program, run the program, watched a maze appear on the screen, modified the program to make the maze larger, and watched a larger maze appear, knows something about computers a child who has only read about computers does not know. The first child knows that computers do what you tell them, that telling them is a learnable skill, that getting the telling slightly wrong produces a slightly wrong result, and that the right response to a slightly wrong result is to fix the telling and try again. The second child knows none of this. The second child knows that computers are a thing other people talk about.

Mark Sawusch's book turned roughly a hundred thousand kids into the first kind of child.

This book is trying to do the same thing for artificial intelligence.

---

## What this book is

Artificial intelligence is, at the time of this book's writing in 2026, the dominant subject in public technical discourse. It is also a subject the public technical discourse mostly handles by lecturing.

The lectures fall into a small number of recognizable patterns. There is the *AI is going to change everything* lecture, delivered with optimism by founders selling AI products. There is the *AI is going to destroy everything* lecture, delivered with concern by professors who studied with founders who sold AI products. There is the *AI is going to do nothing it has not already done* lecture, delivered with weariness by working engineers who have watched the field overpromise for thirty years. There is the *AI is a religion* lecture, delivered by sociologists. There is the *AI is a labor relations question* lecture, delivered by economists. There is the *AI is what I happen to be working on* lecture, delivered by AI researchers.

All of these lectures are, on most days, partially right.

None of them, on any day, are a substitute for having built a system.

This book is twelve chapters. Each chapter covers one flagship AI system from the field's history — the system everyone has heard of, the system that made the field stop and look. Eliza in 1966. SHRDLU in 1972. MYCIN in 1974. Cyc in 1984. Deep Blue in 1997. Watson on Jeopardy in 2011. AlexNet on the ImageNet benchmark in 2012. AlphaGo against Lee Sedol in 2016. GPT-3 in 2020. ChatGPT in 2022. Claude Code in 2024.

Each chapter opens with the history of the system. Who built it. When. Where. What it was trying to do. What it actually did. What the field learned from it. What the field, on its own honest assessment of the years that followed, *should* have learned from it but did not.

Each chapter ends with a working reference implementation of the system. The reference implementation is in a small declarative source format called `.agi` — the Agicore Domain-Specific Language — and the implementation file is one of several already in the public agicore-examples repository on GitHub. The reader clones the repository, opens the relevant file in a text editor, reads it as the chapter walks through it line by line, compiles it with a single command, and runs it.

By the end of the book the reader has compiled and run twelve working AI systems.

The reader knows more about artificial intelligence at that point than most people who *work* in AI.

This is not a boast. It is a fact about the difference between knowing how a thing was built and knowing about a thing that was built.

---

## What you will need

The book assumes the reader has a laptop or desktop computer running macOS, Windows, or Linux. The book assumes the reader is comfortable opening a terminal, typing commands, and pressing Enter. The book does not assume the reader has programmed before in any other language, though the projects will be faster and richer for a reader who has.

The book assumes the reader is willing to be wrong.

This is the most important prerequisite. The reader will run a command, and the command will produce an error message, and the reader will read the error message, and the reader will fix the problem, and the reader will run the command again. This happens every chapter. It is part of the experience. The error messages are the field's actual onboarding interview. The reader passes the interview by reading the messages.

The book also assumes the reader has — or is willing to obtain — at least one API key for a commercial large language model service. The cheapest option at the time of this book's writing is Anthropic's API (anthropic.com) or OpenAI's API (openai.com); five dollars of credit is enough to run every project in the book from chapter ten onward. The early chapters do not require an API key; the systems they implement predate the era of cloud LLM services entirely.

The book also assumes the reader has fifteen minutes to set up the Agicore framework. The setup is a one-time installation that all twelve chapters depend on. The instructions follow.

---

## Setting up Agicore

Agicore is an open-source compiler-first systems-authoring framework available at:

```
https://github.com/Binary-Blender/agicore
```

The repository is MIT-licensed. The repository contains a compiler, a runtime, a small command-line tool, and a bundled set of reference implementations including all the ones this book uses. The Agicore Studio — a visual IDE for authoring `.agi` files — is a separate download discussed in chapter twelve; for the first eleven chapters, a plain text editor is sufficient.

The fastest setup, on any of the three supported platforms, is this:

```
git clone https://github.com/Binary-Blender/agicore
cd agicore
./install.sh        # on macOS or Linux
.\install.ps1       # on Windows
```

The install script downloads the toolchain (Rust, Node, a small Python helper), builds the Agicore compiler from source, and runs a smoke test compiling and running the simplest possible `.agi` program — the `hello.agi` file in the repository root that compiles to a four-line program that prints `Hello, Agicore.` and exits.

If the smoke test succeeds, the setup is complete and the reader is ready for chapter two.

If the smoke test fails, the reader's terminal will contain an error message, and the project's `TROUBLESHOOTING.md` file contains a section on every error message that has been reported by a reader in the project's two-year public history. The most common failure on Windows is that the Visual Studio Build Tools are not installed; the most common failure on macOS is that Xcode Command Line Tools are not installed; the most common failure on Linux is that the system's `libssl-dev` package is out of date. All three failures are resolvable in two terminal commands documented in the troubleshooting file.

The reader who has not used a terminal before is encouraged to read the project's `GETTING_STARTED.md` file before running the install script. The file is approximately fifteen pages and covers terminal basics, the meaning of error messages, and the standard cycle of read-fix-retry that every project in this book follows.

The reader who has used a terminal before is encouraged to skip directly to chapter two.

---

## How the chapters work

Each chapter has the same four-part shape.

**Part one — the history.** Roughly fifteen hundred words. The story of the system this chapter covers: who, when, where, what. The story is written for a reader who has not, by assumption, read other AI history books — but who, by assumption, can follow a clear narrative and is willing to absorb proper names of researchers and dates of papers. The history sections cite their sources in plain text, not footnotes, because this is a project book and footnotes break the flow.

**Part two — the lesson.** Roughly three hundred words. What the field took away from the system, what the field missed about the system, and what we, on the honest hindsight of intervening years, now recognize. The lessons are opinionated. The lessons are also, on the author's working knowledge of the field, defensible.

**Part three — the build.** Roughly a thousand words. The reference implementation. The `.agi` file path, the command to compile it, the command to run it, and a guided walkthrough of the source as it appears on the page. The reader follows along on their own machine. The reader sees the program work.

**Part four — the homework.** Roughly two hundred words. One small modification the reader is invited to make. The modification is always achievable in under thirty minutes by a reader who has been following along. The modification is also always genuinely interesting: the reader who completes the homework understands something about the system the reader who skips the homework does not.

The chapters are independent of one another in the sense that the reader can skip any chapter and the next chapter will still work. The chapters are *not* independent in the sense that the lessons compound: the reader who has built Eliza, SHRDLU, and MYCIN reads chapter five (Cyc) differently from the reader who has skipped to chapter five directly.

The recommendation is to read the chapters in order, with one chapter per evening or one chapter per weekend morning. Each chapter is a one-to-two-hour exercise depending on the reader's pace.

---

## A note on the author

Christopher Bender has spent the last several years building Agicore. Christopher is also the author of *The Chocolate Wars* (Volume 13 on the AI WIN-WIN Institute textbook shelf, a sister volume to this one) and a number of other books in the AI WIN-WIN series. Christopher's writing about AI is the work of someone who has shipped working systems, has been bitten by the field's overpromises across two decades, and has reached the cautious conclusion that the technology is, in the end, neither the salvation nor the destruction of anything — that it is, in the end, a set of tools that humans use to do the things humans were already trying to do, somewhat better or somewhat worse depending on the human doing the using.

This book is the author's attempt to put working tools in the hands of as many readers as possible.

The Commodore 64 generation of kids who typed in BASIC programs from Mark Sawusch's book grew up to build, among other things, the AI systems this book covers. The author's quiet hope is that the readers of this book grow up — or, in many cases, simply grow further, since this book's readers include adults already in the workforce — to build the systems that come next.

The way to build the systems that come next is to know how the systems that came before were built.

Turn the page.

Eliza is on the other side.
