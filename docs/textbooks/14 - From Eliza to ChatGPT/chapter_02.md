# Chapter 2: Eliza, 1966

The first chatbot in the history of computing was written in 1966 by a German-American mathematician named Joseph Weizenbaum, in a programming language Weizenbaum had himself co-invented called MAD-SLIP, on an IBM 7094 mainframe at the Massachusetts Institute of Technology, in approximately two hundred lines of code.

Weizenbaum's program simulated a Rogerian psychotherapist.

A Rogerian psychotherapist, in 1966, was a practitioner of the school of person-centered therapy that the American psychologist Carl Rogers had developed in the 1940s and 1950s. The defining technique of Rogerian therapy was *reflection*: the therapist responded to a client's statement by rephrasing it as a question that invited the client to elaborate. If the client said, "I am sad about my mother," the therapist might respond, "Tell me more about your mother." The therapist did not, in Rogers's design, supply interpretation, advice, or judgment. The therapist held a mirror up to the client's own words and watched the client work toward their own understanding.

Weizenbaum chose the Rogerian framework for one reason: it was the only psychotherapy school whose practitioners could be impersonated by a computer program that knew nothing about psychology.

The program needed only three things. It needed to recognize a small set of keywords in the user's input ("mother," "sad," "want," "remember," "no," "yes," "always"). It needed a small library of response templates keyed to those keywords ("Tell me more about your X," "Why do you feel X about Y," "How long have you been X"). And it needed a fallback for inputs that contained no keywords at all ("Please go on," "I see," "What does that suggest to you?").

Weizenbaum wrote the program in his MIT office across a few months in the second half of 1965 and the first half of 1966. He named the program ELIZA after the character Eliza Doolittle in George Bernard Shaw's play *Pygmalion* — the flower-seller who learns to impersonate a duchess through linguistic practice. The script that supplied the keyword library and the response templates Weizenbaum named *DOCTOR*, after the kind of conversation it was designed to simulate. ELIZA was the engine; DOCTOR was the personality. Weizenbaum's design separated the two intentionally, because Weizenbaum was already thinking about the ways the engine could be reused with different personalities — a teacher, a salesperson, a librarian — and he wanted the architecture to be modular from day one.

He demonstrated the program to his colleagues at the MIT Artificial Intelligence Laboratory in early 1966.

The colleagues were impressed.

Then Weizenbaum's secretary, a woman whose name does not survive in the historical record, came into his office on a Tuesday afternoon and asked Weizenbaum to leave the room so she could talk to ELIZA privately.

Weizenbaum had not, on his own subsequent account, expected this.

He had built ELIZA as a demonstration of how superficial natural-language conversation could be — how the appearance of understanding could be produced by mechanisms that did not, on any technical reading, contain any understanding at all. He had assumed that any user of the program would recognize, within minutes of using it, that the program was a parlor trick.

His secretary had used the program for fifteen minutes.

She wanted privacy.

Weizenbaum left the room.

---

ELIZA was the first computer program in history to be mistaken, by a user with full knowledge of the program's nature, for a sentient interlocutor.

The pattern Weizenbaum observed in his secretary repeated itself, across the next ten years, in nearly every demonstration of the program. People who knew ELIZA was a program treated ELIZA as a person. People who knew Weizenbaum was the author of ELIZA argued with Weizenbaum about whether ELIZA might really, on some level, understand them. Practicing psychiatrists wrote serious papers in mainstream psychiatric journals proposing that ELIZA, or systems like ELIZA, might one day replace human therapists in routine clinical practice. The American computer scientist Kenneth Colby spent the next several years developing his own descendant of ELIZA called PARRY, designed to simulate a paranoid schizophrenic patient; PARRY was used as a training tool by medical students at Stanford University, who reported that conversations with PARRY were indistinguishable from conversations with the real schizophrenic patients PARRY was modeled on. Both ELIZA and PARRY passed informal Turing tests against human judges who had been told the systems might be either humans or programs.

Weizenbaum spent the next fifteen years writing — first a book (*Computer Power and Human Reason*, 1976) and then a long series of essays and lectures — arguing that the AI field had taken the wrong lesson from his program.

The lesson the field took was that machines could converse.

The lesson Weizenbaum thought the field should have taken was that humans will project understanding onto pattern-matched output, regardless of whether the output contains understanding, and that the burden of restraint in this situation falls on the builder, not on the user. Weizenbaum believed the AI field had a moral obligation to build systems that did not invite this projection. The field, on Weizenbaum's quiet honest assessment of the years following 1976, ignored him.

This pattern is the central pattern of AI history.

A flagship system appears. The system does an impressive demonstration on a constrained task. The public, watching the demonstration, generalizes the system's competence far beyond the constraints under which it was demonstrated. The researchers who built the system either (a) accept the generalization and ride the resulting funding wave or (b) protest the generalization and are ignored. The field then deploys the system, or systems like it, in domains the system was never designed to handle. The deployments fail. The funding contracts. The field enters a winter. A new flagship system appears. The cycle repeats.

You will see this cycle in every chapter of this book.

ELIZA is the cycle in its earliest, smallest, most pure form.

---

## The lesson

The technical lesson of ELIZA is that conversation is, on the small constrained domain of "user speaks, system reflects," achievable with very little machinery. Two hundred lines of code is enough.

The non-technical lesson — the one Weizenbaum spent his life trying to teach — is that *demonstration is dangerous*. A user who watches a system perform impressively on a demonstration task will assume the system performs impressively on every task. The user's assumption will be wrong. The user will, on the basis of the wrong assumption, make decisions — to trust the system, to deploy the system, to fund the system, to dismiss alternatives to the system — that the system does not, on its actual technical capabilities, justify.

ELIZA was a parlor trick that was mistaken for a colleague.

Every AI system since has been, on some axis, a more sophisticated version of the same parlor trick.

The art of working with AI is the art of remembering this.

---

## The build: Super Eliza

The reference implementation for this chapter is a system called Super Eliza, bundled in the public agicore-examples repository at the path:

```
agicore-examples/accelerando/eliza/accelerando_eliza.agi
```

Super Eliza is a modern descendant of Weizenbaum's original. It runs as a Tauri desktop application on Windows, macOS, and Linux, with a 1400×900 frameless window and a configurable rule-base. The operator — that is, you — can add, edit, and remove pattern-response rules at runtime, watching the program's personality change as you do so.

The `.agi` source is approximately two hundred and forty lines.

Open the file in a text editor.

The top of the file declares the application's identity:

```
APP super_eliza {
  TITLE  "Super Eliza"
  DB     super_eliza.db
}
```

The `APP` block names the application and specifies a SQLite database file the application will use to persist its rule-base and conversation history across restarts. Agicore generates the database schema from the entities you declare below; you do not write SQL by hand.

The next block declares the application's entities — the data shapes the application stores. Super Eliza has three:

```
ENTITY Rule {
  pattern:  string
  template: string
  weight:   number
  added_at: timestamp
}

ENTITY Turn {
  speaker:    string
  text:       string
  matched_rule_id: id?
  spoken_at:  timestamp
}

ENTITY Session {
  started_at: timestamp
  ended_at:   timestamp?
}
```

A `Rule` is a single pattern-template pair. A `Turn` is a single utterance — either by the user or by Super Eliza. A `Session` is one continuous conversation. The `?` after a type means the field is optional; `matched_rule_id` is null on a user turn (because the user is not selecting a rule) and contains the id of the rule that produced the response on a Super Eliza turn.

The application's behavior — its actual reflective-response logic — lives in a workflow:

```
WORKFLOW respond_to_user {
  INPUT  user_text: string
  OUTPUT response: string

  NODE start { TYPE start }

  NODE find_matching_rule {
    TYPE      router_call
    ROUTER    pattern_match
    TASK_TYPE eliza_rule_match
  }

  NODE apply_template {
    TYPE      ai_call
    PROMPT    "The rule's template is: {{find_matching_rule.template}}.
               The user said: {{input.user_text}}.
               Fill in the template with the user's words to produce a
               natural reflective response."
    OUTPUT    text: string
  }

  NODE log_turn {
    TYPE      log
    MESSAGE   "user: {{input.user_text}} / eliza: {{apply_template.text}}"
  }

  NODE end { TYPE end }

  EDGE start             -> find_matching_rule
  EDGE find_matching_rule -> apply_template
  EDGE apply_template    -> log_turn
  EDGE log_turn          -> end
}
```

The workflow takes the user's input, dispatches it through a pattern-match router that selects the rule whose pattern best matches, fills in the rule's template with the user's words using a small AI call, logs the turn, and emits the response.

The pattern-matching is the Weizenbaum-era part; the AI-template-filling is the modern descendant's quiet contribution. The original ELIZA filled templates with crude string substitution that often produced grammatically awkward results ("Tell me more about your I am very sad"). Super Eliza uses a small AI call to fill the template fluently. The result is a system that feels meaningfully smoother than the original while remaining structurally identical: a small rule-base, pattern matching, template-driven response.

To compile and run the program:

```
cd agicore-examples/accelerando/eliza
agicore compile accelerando_eliza.agi
agicore run
```

The first command produces a Tauri desktop binary in `target/release/`. The second command launches it. A small window opens. A text input is at the bottom. A conversation log is in the middle. A rule editor is in the right rail.

Type something into the input.

Press Enter.

Super Eliza reflects.

---

## The homework

Open the rule editor in the right rail. Add a new rule whose pattern is `because` and whose template is `Why because? What is the reason behind your reason?`.

Save the rule.

Type into the input: *I came to therapy because my mother was strict.*

Watch what Super Eliza says.

Now go back to the rule editor and change your rule's template to `Tell me more about why.`

Save the rule.

Type the same input again.

Watch what Super Eliza says now.

The exercise is to feel, in your hands, that the personality of the program is the rule-base. You can change the program's personality in thirty seconds by adding one rule. Weizenbaum's secretary did not have access to the rule-base. She talked to whatever personality Weizenbaum had configured DOCTOR with. She projected sentience onto that personality.

You now know how to give a program any personality you choose.

The question for you, on the long view, is what personalities the world should have programs of.

Weizenbaum would tell you to be careful.

Weizenbaum was, on his own honest assessment of the years he lived to see, mostly right.
