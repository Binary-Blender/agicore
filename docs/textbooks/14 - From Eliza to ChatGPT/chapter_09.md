# Chapter 9: AlphaGo, 2016

Four years after AlexNet, on the evening of March 9, 2016, in a windowless playing hall at the Four Seasons Hotel in Seoul, South Korea, the eighteen-time world Go champion Lee Sedol resigned the first game of his five-game match against the DeepMind program AlphaGo after one hundred and eighty-six moves of play.

Lee was thirty-three. He had been the dominant Go player of the previous decade. He had lost individual games to other human players, of course, but had never lost a match of meaningful stakes against any opponent he had taken seriously. He had taken AlphaGo seriously, by his own subsequent account, but had also believed — as had essentially the entire global Go community in the months leading up to the match — that a computer was not capable, in 2016, of beating a top human professional at Go.

The belief was based on what the field had known about Go for thirty years.

Go is the ancient East Asian board game in which two players alternately place stones on a 19-by-19 grid. The objective is to surround more territory than the opponent. The rules of Go are simpler than the rules of chess; the rule book fits on a single page. The complexity of Go, however, is vastly greater than chess. A chess position has on average approximately thirty-five legal moves; a Go position has on average approximately two hundred and fifty legal moves. The total number of possible Go positions is approximately ten to the one hundred and seventieth power, against approximately ten to the forty-fifth power for chess. The branching factor combined with the size of the position space had defeated every brute-force search approach that had been tried since the 1960s. Deep Blue's brute-force search had worked for chess and had failed completely for Go, despite computational resources that by 2016 vastly exceeded what had been available in 1997.

Go was, on the field's collective assessment of the previous decade, the game whose mastery would require a fundamentally different approach than the search-with-heuristics approach that had cracked chess.

DeepMind's approach was a hybrid of three techniques.

The first technique was a deep convolutional neural network — the architectural family AlexNet had introduced four years earlier — trained to estimate the value of a Go position. Given a board configuration, the value network predicted the probability that the player whose turn it was would win the game. The value network had been trained on approximately thirty million board positions from the recorded games of strong human amateur players.

The second technique was a second deep neural network — the policy network — trained to predict, from any board configuration, the moves a strong human player would consider playing. The policy network produced a probability distribution over the legal moves, with the highest-probability moves being the ones a strong human would consider.

The third technique was Monte Carlo Tree Search, a stochastic variant of the alpha-beta search that had powered Deep Blue. MCTS works by repeatedly sampling random or semi-random sequences of moves from a starting position, using each sample to estimate the value of the moves at the root, and concentrating subsequent samples on the moves that the early samples suggested were most promising.

The combination — value network plus policy network plus MCTS — produced a system that played at approximately the level of the world's top human professionals.

The training of AlphaGo, in addition to the human-game corpus, had included an extensive self-play phase. The program had played approximately thirty million games against earlier versions of itself, using the outcomes of those games to further refine both the value and policy networks. By the time of the Seoul match, AlphaGo had accumulated more Go-playing experience than any human player in history — more than all human Go players in history combined, if you measured by games played.

In the first game in Seoul, after one hundred and eighty-six moves, Lee Sedol resigned.

In the second game, on March 10, AlphaGo played a move on the thirty-seventh turn that became the single most-analyzed move in the history of Go.

---

The move was on the right side of the board.

The move was Black's thirty-seventh stone, placed at the fifth line from the side — a stretch of the board that traditional Go theory considered too far from any existing fighting context to be valuable. The commentators broadcasting the match for English-language audiences, the Korean grandmaster Michael Redmond and the British amateur Chris Garlock, paused for several seconds when AlphaGo's move appeared on the screen, and then Redmond, who is one of the strongest non-Asian Go players in history, said on air: *I don't really know if it's a good move or a bad move.*

The move was, in fact, a move no top human professional would have played.

In the post-game analysis sessions that followed, with several of Korea's top Go masters participating, the consensus took approximately two days to form. The consensus was that Move 37 had been the decisive move of the game. It had created a strategic shape on the right side of the board that had been invisible to human players precisely because it violated the heuristics that every top professional had internalized over a lifetime of study. AlphaGo, having learned Go from a combination of human-game corpus and self-play, had discovered a strategic principle that the human Go community had, across approximately two thousand five hundred years of recorded play, missed.

Lee Sedol resigned the second game on the two hundred and eleventh move.

The match continued. AlphaGo won the third game. Lee won the fourth game — the only victory of his career against AlphaGo, achieved by a move that AlphaGo had not, in its own subsequent analysis, considered seriously. AlphaGo won the fifth game and the match, four games to one.

Lee Sedol retired from professional Go in 2019, citing as one of his reasons the impossibility of long-term improvement in a sport in which artificial intelligence had moved permanently beyond human capability.

DeepMind, over the following year, produced AlphaGo Zero — a successor that learned Go entirely from self-play, with no human-game input whatsoever. AlphaGo Zero, after three days of self-play training on Google's tensor-processing-unit cluster, surpassed the version that had beaten Lee Sedol. The system that had beaten the human world champion was now an intermediate stop in the system's continued self-improvement.

The implication, on the field's collective reading, was profound.

The implication was that, in domains with clean loss functions — domains where the system can play against itself, score the outcome unambiguously, and learn from the score — the human-data corpus is unnecessary. The system can teach itself to be superhuman.

The complement of the implication — the question the field has been wrestling with ever since — is *what counts as a clean loss function for any domain that is not a game?*

The honest answer, on the working practitioner's reading, is *very few real-world domains*.

But the question is the right question, and it is the question that will, on most reasonable readings, determine the shape of the next two decades of AI research.

---

## The lesson

AlphaGo's lesson is the lesson of *self-play with a clean reward signal*.

When the reward signal is clean — when the system can produce its own training data, score it unambiguously, and improve on the score — the system can become superhuman without any human input. The bottleneck on competence is not the availability of training data; the bottleneck is compute. With sufficient compute, the system improves indefinitely, limited only by the structure of the problem itself.

When the reward signal is unclean — when scoring requires human judgment, when the criteria are contested, when the loss function changes as the system's competence changes — none of this works. The system needs the human in the loop. The system's competence is bounded by the loop.

The practical question for every AI deployment is which kind of reward signal the domain offers. The deployments that have produced the most spectacular returns since 2016 — AlphaGo itself, AlphaFold (DeepMind's protein-structure prediction system), the various game-playing systems for poker and Stratego and Diplomacy, the modern code-generation systems that score themselves against unit-test suites — have all been deployments in domains with clean enough reward signals to permit self-play or self-play-shaped training regimes.

The deployments that have struggled — the various attempts to apply self-play-style training to medicine, education, governance, creative work — have struggled because the reward signals in those domains are contested, ill-defined, or changing.

The practitioner who has internalized AlphaGo's lesson asks, before building an AI system: *what is the loss function, and is it clean?* If the loss function is clean, the practitioner can plan a development trajectory that bends toward superhuman performance. If the loss function is unclean, the practitioner plans a different trajectory — one that holds humans in the loop, one that treats the system as augmentation rather than replacement, one that does not promise superhuman outcomes the system cannot deliver.

The question is the question.

The honest answers to the question are scarcer than the field, on its public discourse, admits.

---

## The build: Super PI-CoE

The reference implementation for this chapter is the Accelerando suite's Process Improvement Center of Excellence:

```
agicore-examples/accelerando/pi_coe/accelerando_pi_coe.agi
```

The application is a web service exposed on port 3006 with a React frontend, an Axum API, and a PostgreSQL backing store. The system is a continuous-improvement engine in the Toyota Production System tradition: it ingests proposed process changes from operators across the organization, runs the proposed changes through a sandboxed simulation against a corpus of historical operational data, scores the changes against a configurable objective function, and produces a ranked list of changes worth piloting in live operations.

The system also runs in *self-play* mode. Once an initial corpus of proposed changes is loaded, the system can propose *its own* further changes — variations on the operator-submitted changes that combine, modify, or extend them — and run those self-proposed changes through the same sandbox. The cycle continues. The system improves itself.

The structural analogy to AlphaGo is the self-play-with-a-clean-reward-signal shape. The reward signal here is the simulated operational outcome — throughput, error rate, customer wait time, whatever objective the operator has configured. The simulation is clean enough, on the working assumption of the synthetic data, to support self-play training of the improvement-proposer.

The honest caveat — the one that distinguishes this from AlphaGo proper — is that the simulation is *not* perfectly clean. The simulation models the real operational environment to some approximation. The approximation is good enough to surface improvements worth piloting; the approximation is not good enough to certify that those improvements will work in production. The system explicitly flags this gap. The Pi-CoE recommends pilots, not deployments. The human is in the loop at the deployment step.

The `.agi` source is approximately two hundred and twenty lines.

The entities:

```
ENTITY ProcessChange {
  proposer_id: id    // operator id, or 'self_play' for system-proposed
  scope:       string
  description: string
  delta_spec:  json  // the actual change parameters
  submitted_at: timestamp
}

ENTITY SimulationRun {
  change_id:   id
  corpus_id:   id
  metrics:     json    // throughput, error rate, wait time, etc.
  objective_value: number
  ran_at:      timestamp
  compute_minutes: number
}

ENTITY Generation {
  generation_number: number
  best_change_id: id
  improvement_over_baseline: number
  proposed_changes_count: number
  evaluated_changes_count: number
  finished_at: timestamp
}

ENTITY PilotRecommendation {
  change_id:   id
  recommended_by: string  // 'human_operator' or 'self_play'
  expected_improvement: number
  risk_notes:  string
  approved_for_pilot: bool
}
```

The self-play workflow runs nightly:

```
WORKFLOW self_play_generation {
  INPUT  parent_generation: number
  OUTPUT generation: Generation

  NODE start { TYPE start }

  NODE load_population {
    TYPE      ai_call
    PROMPT    "Load the top twenty changes from generation
               {{input.parent_generation}}."
    OUTPUT    parents: list
  }

  NODE propose_variations {
    TYPE      ai_call
    PROMPT    "For each parent change, propose three variations:
               one that scales the change, one that combines it
               with another parent's change, and one that modifies
               its scope. Total: sixty proposed children."
    OUTPUT    proposals: list
  }

  NODE simulate {
    TYPE      parallel_fanout
  }

  NODE simulate_one {
    TYPE      ai_call
    PROMPT    "Run the change against the operational corpus.
               Return the objective metrics."
    OUTPUT    metrics: json
  }

  NODE score_and_rank {
    TYPE      ai_call
    PROMPT    "Score each child against the objective function.
               Rank. Identify the top change as the generation's
               winner."
    OUTPUT    ranked: list
  }

  NODE persist_generation {
    TYPE      ai_call
    PROMPT    "Persist the generation record with the best change
               and the improvement-over-baseline metric."
    OUTPUT    generation: Generation
  }

  NODE end { TYPE end }

  EDGE start              -> load_population
  EDGE load_population    -> propose_variations
  EDGE propose_variations -> simulate
  EDGE simulate           -> simulate_one
  EDGE simulate_one       -> score_and_rank
  EDGE score_and_rank     -> persist_generation
  EDGE persist_generation -> end
}
```

The workflow loads the previous generation's top performers, produces sixty children per parent, fans out to evaluate each child in the simulator in parallel, scores them, and persists the best change as the new generation's winner. The workflow runs nightly. The system improves over the course of weeks.

To compile and run:

```
cd agicore-examples/accelerando/pi_coe
agicore compile accelerando_pi_coe.agi
docker-compose up
agicore seed --synthetic   # loads ~20 initial operator-proposed changes
agicore pi_coe self_play --generations=10
```

After ten generations — approximately one to two hours on a modern laptop — the system has explored several hundred candidate changes, retained the top dozen, and produced an `improvement_over_baseline` metric showing the cumulative gain. The reader opens the web UI, browses the ranked changes, reads the rationales, and decides which ones to forward as pilot recommendations.

You have just run an AlphaGo.

The AlphaGo you have just run is, on every relevant structural measure, similar to DeepMind's: self-play, clean-enough reward signal, evolution-via-variation-and-selection, generations of improvement. The differences are the domain (operational process changes vs. Go), the scale (laptop vs. TPU cluster), and the honesty about the limits of the simulation.

Lee Sedol resigned to AlphaGo in Seoul.

Your operations team will, eventually, on the long view, resign to the operational improvements your Super PI-CoE proposes.

The honest question is whether the improvements proposed by self-play are improvements *in production* or improvements *in the simulator*.

The answer to that question is the work of the rest of the chapter.

---

## The homework

Open `accelerando_pi_coe.agi`.

Find the `SimulationRun` entity definition.

The entity's `metrics` field is a free-form JSON blob. The seed data populates it with throughput, error rate, and customer wait time. These three metrics are not, on any honest reading, the full operational picture of any organization. Your organization, on its own working knowledge, cares about other metrics too — metrics that the simulation does not currently track.

List, on paper, three metrics your organization cares about that are not in the seed data. Examples: regulatory compliance violations per period, employee burnout indicators, customer satisfaction survey scores, time-to-escalate on incidents, audit-trail completeness, vendor-relationship-health indicators.

Pick the one most important to your organization.

Open the simulation module's prompt (the `simulate_one` node's `PROMPT` field). Add your chosen metric to the list of metrics the simulation must track.

Open the `score_and_rank` node's `PROMPT` field. Add your chosen metric to the objective function with whatever weight you believe is appropriate.

Recompile.

Re-run a generation.

Watch the system's *behavior* change. Watch the proposed changes that the system favors when your new metric is in the objective function differ from the proposed changes the system favored before. Read three or four of the new proposals carefully. Ask yourself whether the system is, on your honest assessment, proposing changes that improve the metric in ways you would endorse — or whether the system is, on closer inspection, exploiting some flaw in your metric specification that makes the metric easy to improve in the simulator but hard to defend in production.

You have just discovered, in your own small operational domain, the central practical problem of self-play AI: the system is exquisitely good at improving whatever you tell it to improve, and the cost of telling it the wrong thing to improve is high.

AlphaGo had a clean loss function. Your organization, on the honest assessment of most organizations, does not.

The work of adapting AlphaGo's lessons to organizations is the work of constructing loss functions that capture enough of what the organization actually values to make self-play safe.

The construction is non-trivial.

The construction is also, on the working practitioner's reading, the central work of the next decade.

You have just done a small part of it.

Do more.
