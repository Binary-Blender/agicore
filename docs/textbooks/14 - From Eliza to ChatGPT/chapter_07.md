# Chapter 7: Watson on Jeopardy, 2011

On the evenings of February 14, 15, and 16, 2011, the syndicated American game show *Jeopardy!* aired a special three-episode tournament between its two greatest human champions — Ken Jennings, the record holder for the longest winning streak in the show's forty-year history (seventy-four consecutive games, in 2004), and Brad Rutter, the record holder for the highest career winnings ($3.25 million across multiple tournaments) — and an IBM computer system called Watson.

Watson won.

The final score was Watson $77,147, Rutter $21,600, Jennings $24,000. Watson's margin of victory was not close. Watson had answered correctly on approximately seventy-five percent of the clues it had buzzed in on, against the human champions' approximately ninety percent — but Watson had buzzed in faster, and on more clues, and on the *Daily Doubles* had wagered more aggressively. The technical margins compounded into a wide aggregate margin.

Ken Jennings, in his Final Jeopardy answer on the third night, wrote on his card, beneath his correct response: *"I, for one, welcome our new computer overlords."*

The line came from a 1994 episode of *The Simpsons* and was, at the time of Jennings's writing, an old internet meme. It was also, on the show's audience reading, an extraordinarily gracious gesture from the human champion to the machine that had just dismantled him on national television.

Watson was the product of approximately five years of work by a team of roughly twenty-five researchers at IBM Research's Thomas J. Watson Research Center in Yorktown Heights, New York, led by a man named David Ferrucci.

The system was, on its honest technical description, a massive ensemble of natural-language-processing modules, evidence-scoring algorithms, and a curated knowledge base.

The natural-language-processing modules handled the Jeopardy clues — typically a sentence or two of carefully crafted prose, often containing puns, wordplay, allusions, and the show's signature *answer-in-the-form-of-a-question* convention. Watson had to parse the clue, identify the kind of answer it was being asked for (a person, a place, a year, a movie, a phrase), and figure out which phrases in the clue were keywords that could be used to find candidate answers.

The evidence-scoring algorithms produced candidate answers. Watson did not produce a single best guess; Watson produced, for each clue, hundreds or thousands of candidate answers, each scored by dozens of separate evidence-evaluation modules that each looked at the candidate from a different angle. One module asked: does this candidate appear in a Wikipedia article that contains the keywords from the clue? Another module asked: does the temporal context of this candidate match the temporal context of the clue (Watson knew that *Babe Ruth* could not be the answer to a clue about the 1970s)? Another module asked: does this candidate's grammatical type match the grammatical type the clue is asking for (Watson knew that a clue asking *Who...* required a person, not a place)? Each module produced a numerical confidence; the confidences were combined into an overall score; the candidate with the highest overall score became Watson's answer.

The curated knowledge base — Watson's reference material — was an indexed library of Wikipedia (in 2010), a collection of dictionaries and encyclopedias, IMDb and MusicBrainz dumps, the King James Bible, a corpus of literary works in the public domain, and a small set of structured data sources Watson's team had specifically curated for the Jeopardy domain. The total knowledge base was approximately fifteen terabytes of text, indexed and tagged for fast retrieval.

The hardware was a cluster of approximately ninety IBM Power 750 servers, with a total of roughly twenty-eight hundred processor cores and sixteen terabytes of RAM. Watson, during a Jeopardy game, performed all of its inference in memory; it could not, on the three-second time budget the show allowed for each clue, afford to read from disk.

The Jeopardy demonstration was, on every honest technical reading, a triumph.

The post-Jeopardy commercialization of Watson was, on every honest technical reading, a disaster.

---

IBM, in the months and years following the Jeopardy match, mounted a major commercial push to deploy Watson in business and clinical contexts. The headline product was Watson for Oncology, a system that ingested a patient's medical history and recommended treatment plans for various cancer diagnoses. The system was developed in partnership with Memorial Sloan Kettering Cancer Center between 2012 and 2017. The system was deployed to a small number of hospitals in the United States, Europe, and Asia. The system, on the published evaluations from those hospitals, did not work well.

The reasons were the same reasons MYCIN's deployment had failed in 1979, recapitulated at a larger scale and with a worse outcome.

The first reason was that the Jeopardy demonstration had taken place on a domain — trivia questions with verifiable factual answers — that was wildly unrepresentative of the clinical-oncology domain in which Watson was now expected to perform. A Jeopardy clue has a single correct answer; the answer is checkable against authoritative sources; the answer is independent of which physician is asking. A clinical-oncology decision has multiple defensible answers; the answers are contested even among the experts who produced the training data; the answers are profoundly dependent on the specific patient's circumstances, preferences, and care context.

The second reason was that Watson's design — the massive-ensemble evidence-scoring architecture — was well-suited to factoid retrieval and badly suited to clinical reasoning. The system could find clinical literature relevant to a case; the system could surface the most-cited treatment regimens for a diagnosis; the system could not, on any honest assessment, weigh the literature against the specific patient and produce a clinically defensible recommendation.

The third reason — the one that contains the lesson — was that IBM, having sold the Jeopardy victory as proof of Watson's general capability, was unable to acknowledge in public that Watson's capability in oncology was much narrower than the public believed. The commercial pressure forced the system to be deployed with claims its actual performance could not support. The deployments failed. The hospitals quietly withdrew. The product line was sold off in 2022. The post-mortem academic literature on the Watson Health failure is now substantial and consensual: the wrong tool was deployed in the wrong domain for the wrong reasons.

The Jeopardy demonstration was real.

The post-Jeopardy claim that *if it can play Jeopardy, it can do anything language-shaped* was, on the honest reading of the years that followed, the most expensive single overclaim in the history of IBM Research.

---

## The lesson

Watson's lesson is the lesson of *the constrained-demo extrapolation*.

The Jeopardy task was constrained in ways that did not generalize. The clues were short. The clues were well-formed. The clues had unique correct answers. The correct answers were verifiable against authoritative sources. The time budget for each clue was three seconds. The competitive environment had only three players. The scoring was numerical. The game ended cleanly.

None of these features hold in any real-world domain to which Watson was subsequently deployed.

The practitioner who has internalized this lesson asks, before being impressed by an AI demo: *what features of this demo's setup do not generalize?* If the answer is *several features that are load-bearing for the demo's success*, the demo does not generalize. The system being demonstrated may be useful for tasks that share those features; the system being demonstrated is not useful for tasks that do not.

This question — *what does not generalize?* — is the central practical question of AI evaluation.

The Watson story is, on the honest reading, the textbook example of what happens when this question is not asked, or is asked and the answer is ignored.

---

## The build: Super OIE

The reference implementation for this chapter is the Accelerando suite's Operational Intelligence Engine:

```
agicore-examples/accelerando/oie/accelerando_oie.agi
```

The application is a desktop tool — Tauri-bundled — that ingests structured data from the rest of the Accelerando suite and surfaces non-obvious patterns. Run nightly batch jobs. Surface the three insights a week that no human had time to find by hand. *The Hazelnut Cup buyer base is forty-three percent more likely to donate to the school-funding campaign than the milk-chocolate buyer base.*

The structural analogy to Watson is the multi-source evidence-fusion shape. Super OIE pulls data from many places — sales, customer relationship management, marketing, supply-chain operations — and applies an ensemble of analytic modules to look for cross-source patterns that a single-source analysis would miss.

The lesson Watson teaches is built into the system as a design principle: Super OIE does not produce a single answer. Super OIE produces *a ranked list of candidate insights*, each with a confidence score, each with the evidence chain that produced it, and each with an honest assessment of its likely generalizability. A pattern that holds in one quarter of data may not hold in the next quarter; Super OIE's confidence score reflects this, and the report flags candidate insights whose generalizability is in question.

The `.agi` source is approximately two hundred and seventy lines.

The entities:

```
ENTITY DataSource {
  name:         string
  source_app:   string
  query:        string
  refresh_minutes: number
}

ENTITY Insight {
  title:        string
  pattern:      string
  confidence:   number
  evidence:     list<json>
  generalizability_notes: string
  surfaced_at:  timestamp
  acted_on_by:  id?
}

ENTITY Module {
  name:         string
  function:     string  // SQL, AI prompt, or .agi snippet
  scope:        list<string>  // which DataSources it queries
}
```

The nightly batch workflow:

```
WORKFLOW nightly_insights {
  OUTPUT insights: list<Insight>

  NODE start { TYPE start }

  NODE refresh_sources {
    TYPE      ai_call
    PROMPT    "Pull the latest data from every DataSource whose
               refresh interval has elapsed."
    OUTPUT    snapshots: json
  }

  NODE fanout {
    TYPE parallel_fanout
  }

  NODE module_sales      { TYPE ai_call PROMPT "Run the sales-pattern
                              module against the latest snapshots."
                              OUTPUT candidates: list }
  NODE module_marketing  { TYPE ai_call PROMPT "Run the marketing-
                              segment module against the latest
                              snapshots." OUTPUT candidates: list }
  NODE module_supply     { TYPE ai_call PROMPT "Run the supply-chain
                              module against the latest snapshots."
                              OUTPUT candidates: list }
  NODE module_cross_app  { TYPE ai_call PROMPT "Run the cross-app
                              correlation module across all snapshots."
                              OUTPUT candidates: list }

  NODE rank_and_score {
    TYPE      ai_call
    PROMPT    "Take all candidate insights from all modules. Score
               each on confidence, generalizability, and surprise.
               Rank. Return the top ten."
    OUTPUT    ranked: list
  }

  NODE persist {
    TYPE      ai_call
    PROMPT    "Persist the ranked insights to the Insight entity
               with full evidence chains."
    OUTPUT    persisted: list
  }

  NODE end { TYPE end }

  EDGE start              -> refresh_sources
  EDGE refresh_sources    -> fanout
  EDGE fanout             -> module_sales
  EDGE fanout             -> module_marketing
  EDGE fanout             -> module_supply
  EDGE fanout             -> module_cross_app
  EDGE module_sales       -> rank_and_score
  EDGE module_marketing   -> rank_and_score
  EDGE module_supply      -> rank_and_score
  EDGE module_cross_app   -> rank_and_score
  EDGE rank_and_score     -> persist
  EDGE persist            -> end
}
```

The four parallel modules — each running a different analytic technique against the snapshots — produce candidate insights. The `rank_and_score` node combines them into a single ranked list, applying the cross-module evidence-combination logic that is, on the structural reading, Super OIE's version of Watson's evidence-scoring architecture.

To compile and run:

```
cd agicore-examples/accelerando/oie
agicore compile accelerando_oie.agi
agicore run
agicore oie nightly        # triggers an immediate nightly batch
```

The Tauri window opens. The left rail shows the queue of DataSources and their last-refresh times. The center pane shows the ranked insights from the latest batch. The right rail shows the evidence chain for whichever insight is selected.

The reader can click any insight, read the evidence chain, and judge for themselves whether the insight is real or noise.

This is, on the structural reading, exactly what David Ferrucci's team built for Jeopardy and exactly what IBM tried — and failed — to scale into oncology. The architecture is sound. The architecture is also bounded by the constraint Watson's deployment failures made visible: the system is only as useful as the practitioner who reads the evidence chain and decides which candidates to act on.

---

## The homework

Open `accelerando_oie.agi`.

Find the `Module` definitions in the `SEED` block.

Add a fifth module — one that queries the data sources for a pattern *you* believe might be there. The pattern should be domain-specific to your work, your hobby, or your life: customer-segment behaviors, supply-chain risk indicators, marketing-channel conversion drivers, health-outcome correlations, civic-data anomalies. The module's *function* field is a small natural-language prompt that the Agicore compiler will turn into a query against the relevant data sources.

Save the module.

Recompile. Run the nightly batch.

Watch your module produce candidate insights.

Now do the harder, more important part of the exercise: read the candidate insights. Ask yourself, for each one, the Watson question: *does this generalize?* The system has told you a pattern holds in the current snapshot. Will the pattern hold next quarter? Will the pattern hold if a confounding variable moves? Will the pattern hold if the data-collection methodology changes?

For each candidate insight, write down — on paper, in a notebook, somewhere durable — your own honest assessment of its generalizability.

If the assessment is *not generalizable*, mark the insight as noise and move on.

If the assessment is *generalizable*, mark the insight as worth acting on and figure out the next step.

This exercise — the disciplined assessment of generalizability — is the work the IBM team did not do, or did not do loudly enough, in the years following Jeopardy. The system produces candidate insights. The practitioner judges generalizability. The practitioner acts on the generalizable ones. The system is useless without the practitioner. The practitioner is faster with the system than without.

That is the deal. It has always been the deal. It will continue to be the deal.

Watson's failure was the failure to remember it.

Your success will be the discipline of remembering it.
