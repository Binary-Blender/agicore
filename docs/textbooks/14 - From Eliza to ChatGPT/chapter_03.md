# Chapter 3: SHRDLU, 1972

Six years after Eliza, at the same Massachusetts Institute of Technology, a young PhD student named Terry Winograd defended his doctoral thesis on a program called SHRDLU.

SHRDLU was ambitious in a way Eliza was not.

Eliza had simulated a domain — psychotherapy — that the program understood nothing about. SHRDLU was designed to simulate a domain the program *did* understand. The domain was small enough that the simulation could be exhaustive: a virtual three-dimensional space, ten or so feet on a side, containing a small number of colored geometric solids — red blocks, green blocks, a blue pyramid, a small red box, sometimes a green ball. SHRDLU could see the blocks. SHRDLU could move the blocks. SHRDLU could be asked questions about the blocks. SHRDLU answered.

The conversation transcripts that survive in Winograd's thesis read, to a modern eye, like science fiction.

```
Person:   PICK UP A BIG RED BLOCK.
Computer: OK. (does it)
Person:   GRASP THE PYRAMID.
Computer: I DON'T UNDERSTAND WHICH PYRAMID YOU MEAN.
Person:   FIND A BLOCK WHICH IS TALLER THAN THE ONE YOU ARE
          HOLDING AND PUT IT INTO THE BOX.
Computer: BY "IT," I ASSUME YOU MEAN THE BLOCK WHICH IS
          TALLER THAN THE ONE I AM HOLDING.
Computer: OK. (does it)
Person:   WHAT DOES THE BOX CONTAIN?
Computer: THE BLUE PYRAMID AND THE BLUE BLOCK.
Person:   WHAT IS THE PYRAMID SUPPORTED BY?
Computer: THE BOX.
Person:   HOW MANY BLOCKS ARE NOT IN THE BOX?
Computer: FOUR OF THEM.
Person:   IS AT LEAST ONE OF THEM NARROWER THAN THE ONE WHICH
          I TOLD YOU TO PICK UP?
Computer: YES, THE RED CUBE.
Person:   IS IT SUPPORTED?
Computer: YES, BY THE TABLE.
Person:   CAN THE TABLE PICK UP BLOCKS?
Computer: NO.
Person:   CAN A PYRAMID BE SUPPORTED BY A BLOCK?
Computer: YES.
Person:   CAN A PYRAMID SUPPORT A PYRAMID?
Computer: I DON'T KNOW.
Person:   STACK UP TWO PYRAMIDS.
Computer: I CAN'T.
```

In 1972, watching the transcript scroll across a teletype, this looked like the imminent arrival of artificial general intelligence.

The system answered questions about its world. The system understood that "it" referred to the most recently mentioned block of the relevant size. The system understood that a table cannot pick things up because tables are not actors in its world model. The system was able to admit uncertainty ("I DON'T KNOW") and was able to admit impossibility ("I CAN'T"). The system, when asked to do something it could not do, did not pretend to do it. The system, when asked a question whose answer it did not know, did not invent an answer.

The system was approximately seven thousand lines of code, written in a Lisp dialect called Micro-Planner, and the whole of it ran in the small memory available on the MIT-AI lab's DEC PDP-10 mainframe.

The system was Terry Winograd's PhD thesis.

The system was also, on the field's quiet honest assessment of the years that followed, the high-water mark of what the symbolic-AI approach could achieve.

---

The world SHRDLU lived in was tiny.

This was not a bug in Winograd's design. This was the design. Winograd had set out to demonstrate that, given a sufficiently constrained domain, a computer program could be taught to do natural-language understanding, common-sense reasoning, planning, and dialogue management — all the cognitive functions the symbolic AI tradition had been promising since John McCarthy coined the phrase *artificial intelligence* in 1956. Winograd succeeded at the demonstration. SHRDLU did all of those things. The catch — the catch the field would spend the next ten years trying and failing to escape — was that the demonstration only worked inside the blocks world.

SHRDLU could not be extended to a second domain.

The encoding of SHRDLU's knowledge — the rules for what blocks were, what tables were, what supporting meant, what stacking meant, what *it* could plausibly refer to — was specific to the blocks world. Adding a new domain meant rewriting the encoding from scratch. There was no general layer of common-sense reasoning underneath; the common sense *was* the encoding. The encoding was specific. The encoding could not be reused.

This problem — the problem of encoding common-sense knowledge in a way that generalizes across domains — is the problem the field has been working on, in various forms, for the fifty-four years since.

Winograd himself, on his subsequent honest assessment, left the symbolic AI field by the late 1970s. He spent the next several decades as a professor at Stanford working on human-computer interaction and ethics in technology, on his own quiet belief that the symbolic-AI approach as he had practiced it was a dead end. His most famous PhD student was a man named Larry Page, who in 1996 used some of Winograd's ideas about how meaning lives in patterns of citation rather than in declarative encodings to build a search engine he named Google.

SHRDLU still runs.

A handful of computer-science departments maintain modern Lisp ports of Winograd's original code. The transcripts can be reproduced today on a laptop. Watching them scroll past in 2026, with the field's modern understanding of what is hard and what is easy in natural language processing, is a humbling experience. SHRDLU was doing things in 1972 that the field then forgot how to do for forty years and only recently re-learned how to do, via entirely different means, with the modern transformer-based language models.

The blocks world was tiny.

The intelligence inside it was real.

---

## The lesson

SHRDLU's lesson was the dual one of *brilliance within constraint* and *the bottleneck of encoding*.

The brilliance-within-constraint lesson is this: when a domain is small enough to model completely, a program can exhibit behavior that resembles understanding. SHRDLU did resemble understanding. SHRDLU, on the testimony of the people who interacted with it in 1972, *was* understanding, in the only operational sense of the word that matters: SHRDLU produced responses indistinguishable from the responses a human with the same task and the same constraints would produce.

The bottleneck-of-encoding lesson is this: building SHRDLU required Winograd, by hand, to write down everything the system knew about blocks, tables, support, gravity, color, size, and reference. The writing-down was the work. The system's competence was bounded by the writing-down. Scaling the system to a new domain required redoing the writing-down. There was no way to make a system that could learn the next domain on its own.

The field's collective response to the second lesson was to bet, throughout the 1970s and 1980s, that the writing-down was a tractable problem that just needed more people and more time. The Cyc project, which you will meet in chapter five, was the most extreme expression of that bet. The bet was wrong. The writing-down was not tractable. Common-sense knowledge does not yield to enumeration. The field would, eventually, in the 2010s, find a way around the bottleneck — by learning the encoding from data instead of writing it down by hand — but the workaround would take forty years to arrive and would not look anything like SHRDLU.

The reader who builds the SHRDLU-spirit system this chapter walks through will understand both lessons in a way no amount of reading produces.

---

## The build: Super Config

The reference implementation for this chapter is the Accelerando suite's self-configuration advisor:

```
agicore-examples/accelerando/config/accelerando_config.agi
```

The application is a desktop tool that walks a user through configuring a fresh installation of one of the Accelerando enterprise applications (ERP, billing, legal, LMS, QMS, and so on). It asks the user a sequence of questions about their organization, applies a rule-base to the answers, and produces a configuration file that bootstraps the chosen application.

The structural analogy to SHRDLU is direct: this is a system that is brilliant within its constrained domain (configuring an Accelerando app) and useless outside it. Ask it to recommend a restaurant for dinner; the system has nothing to say. Ask it to choose a chart of accounts for your healthcare clinic; the system produces a defensible recommendation in under two minutes, with the audit trail of the rules it applied to produce it.

The `.agi` source is approximately three hundred and twenty lines. The top of the file declares the application:

```
APP super_config {
  TITLE "Super Config — The Self-Configuration Advisor"
  DB    super_config.db
}
```

The next block is the entity that holds the questions and the rules:

```
ENTITY Question {
  prompt:       string
  answer_type:  string
  depends_on:   id?
  weight:       number
}

ENTITY Rule {
  condition:    string
  conclusion:   string
  rationale:    string
}

ENTITY Session {
  app_target:   string
  answers:      json
  config_out:   json?
  started_at:   timestamp
  finished_at:  timestamp?
}
```

A `Question` is one question Super Config asks. A `Rule` is one if-then encoding. A `Session` is one configuration interview from start to finish.

The interview itself runs as a loop:

```
WORKFLOW configure_app {
  INPUT  app_target: string
  OUTPUT config_out: json

  NODE start          { TYPE start }
  NODE load_questions { TYPE ai_call PROMPT "Load the question
                          set for target {{input.app_target}}."
                          OUTPUT questions: list }
  NODE ask_loop       { TYPE loop OVER load_questions.questions
                          AS current_question }
  NODE prompt_user    { TYPE qc_checkpoint PROMPT
                          "{{current_question.prompt}}"
                          INPUT  answer FROM current_question }
  NODE apply_rules    { TYPE ai_call PROMPT
                          "Apply the rule-base to the answers
                           collected so far and produce the
                           current best-guess configuration."
                          OUTPUT partial_config: json }
  NODE emit_config    { TYPE ai_call PROMPT
                          "Produce the final configuration JSON
                           with full rationale from the rule
                           applications."
                          OUTPUT final: json }
  NODE end            { TYPE end }

  EDGE start          -> load_questions
  EDGE load_questions -> ask_loop
  EDGE ask_loop       -> prompt_user
  EDGE prompt_user    -> apply_rules
  EDGE apply_rules    -> emit_config
  EDGE emit_config    -> end
}
```

The loop iterates over the questions, presenting each one to the user via a `qc_checkpoint` node — Agicore's first-class human-in-the-loop construct — collecting the answer, and updating the rule-base's working set. The `emit_config` node, at the end of the loop, applies all the accumulated rules and emits the final JSON.

To compile and run:

```
cd agicore-examples/accelerando/config
agicore compile accelerando_config.agi
agicore run -- --target=clinical
```

The `--target=clinical` argument tells Super Config which Accelerando app you are configuring (the clinical-documentation app from chapter four's MYCIN material is a natural pairing). A small window opens. The first question appears. You answer. The next question appears. After approximately twenty questions, Super Config emits a configuration JSON file, prints the path it was written to, and prints the rationale for each non-trivial decision it made.

You have just had a conversation with a system that is brilliant in its small world and would be useless in any other.

You have just talked to a SHRDLU.

---

## The homework

Open the `accelerando_config.agi` file in your text editor.

Find the `ENTITY Rule` block.

Add a rule by hand to the seed data — the `SEED` declarations near the bottom of the file. Make the rule cover a domain you care about: a question for choosing a chart-of-accounts structure for a small business you actually run, a question for choosing a billing-cycle frequency for a clinic you actually work in, a question for choosing a default LMS course-completion threshold for a training program you actually administer.

Recompile.

Run the program again with the same target.

Watch your rule appear in the interview.

Answer the question.

Watch the final configuration JSON reflect your rule.

You have just done, in five minutes, what Terry Winograd spent six months of his PhD doing for the blocks world.

You have written down a piece of common-sense knowledge — a piece of your *own* common sense — and made a computer act on it.

The bottleneck of encoding, on this small scale, is tractable.

The challenge of the field is what happens when you try to do this five hundred times. Or fifty thousand times. Or five million.

You will see that challenge in the next two chapters.
