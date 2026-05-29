# Chapter 6: Deep Blue, 1997

On a Sunday afternoon in May of 1997, in a windowless ballroom on the thirty-fifth floor of the Equitable Center on Seventh Avenue in midtown Manhattan, Garry Kasparov — at thirty-four, the reigning world chess champion, undefeated in match play against any human opponent for twelve years — resigned the sixth and final game of his rematch against IBM's chess-playing computer Deep Blue.

The resignation took seventeen moves.

Kasparov had been ahead in the match three games to two going into the sixth game. A win in the sixth game would have given him the match four to two; a draw would have given him a tie at three apiece, which under the match rules would have been a moral victory for him as the human champion against a machine. Kasparov needed a draw at minimum. The game opened, on Kasparov's choice of opening for the white pieces, into a Caro-Kann Defense — a solid, slightly passive opening that under normal circumstances Kasparov would not have played against any opponent. He played it on this Sunday because he believed the Caro-Kann was the opening least likely to produce the wild tactical positions in which Deep Blue had been outplaying him across the previous five games.

Deep Blue, playing the black pieces, sacrificed a knight on the seventh move.

The sacrifice was a known book line. Kasparov had prepared against it. Kasparov played the textbook refutation.

The textbook refutation, on Deep Blue's evaluation, was not the refutation Kasparov thought it was.

By the seventeenth move Kasparov was facing a position from which no defensive resource could save him from a forced checkmate within the next ten moves. He stopped the clock. He shook the IBM team's hand. He left the playing hall without speaking to the press. He would, in the days that followed, accuse IBM of cheating — of having had a human grandmaster influence Deep Blue's moves during the critical positions — and would refuse, for the rest of his playing career, to engage in any further serious matches against computers.

IBM never released Deep Blue's source code, never released its position-evaluation function, and dismantled the machine within months of the match. The team published, in 1998 and 1999, a small number of technical papers describing the system's general architecture but did not, on the field's quiet honest reading, fully document what they had built.

Deep Blue, on what is known about it, was a brute-force search engine with a domain-specific evaluation function.

The machine consisted of an IBM RS/6000 SP — a then-state-of-the-art high-performance computing platform — running thirty processors. Each of the thirty processors was paired with sixteen custom VLSI chess chips, each of which had been designed and fabricated by Joe Hoane and Murray Campbell on the IBM team across approximately three years of work. The chess chips were not general-purpose computers; they were specialized hardware that could, in a single hardware operation, perform the legal-move generation for a single chess position and apply a hand-tuned numerical evaluation to the resulting positions. The chips ran at approximately two million chess positions per chip per second. The full machine, with four hundred and eighty chips running in parallel, evaluated approximately two hundred million positions per second.

Two hundred million positions per second is, on the standard alpha-beta search algorithm of the late 1990s, sufficient to search every legal sequence of chess moves to a depth of approximately twelve plies (six full moves) in real time, and to extend the search to fifteen or more plies along promising lines via selective deepening.

Twelve plies, against a human player whose own search depth is somewhere between two and six plies depending on the complexity of the position, is decisive.

Deep Blue beat Kasparov, on the honest technical reading, by brute force.

---

The lesson the AI field took from Deep Blue's victory was the wrong one for approximately fifteen years.

The lesson the field took was that chess was a solvable problem.

The lesson the field should have taken was that chess was the *wrong* problem.

Chess is — on the operational definition of *closed-form game with perfect information* — a problem class for which exhaustive search is theoretically optimal. The only obstacle to perfect chess play is computational resource. As the resource scales, search depth scales, and play quality approaches the theoretical optimum. Deep Blue had not, on any honest reading, exhibited intelligence. Deep Blue had exhibited *expensive computation*, applied to a problem class where expensive computation is what works.

The transferable lesson was about computation, not about cognition.

The field, in 1997, did not absorb this lesson cleanly. Project after project across the subsequent decade attempted to apply Deep Blue's lessons to problems that were not chess: machine translation, image recognition, autonomous driving, financial trading, weather prediction. The lessons did not transfer in the form the field expected. The problems were not closed-form games with perfect information. The problems did not yield to brute-force search.

What did, eventually, transfer was the underlying belief that *brute compute beats clever cognition*. This belief — which Deep Blue had demonstrated in the constrained case of chess — would, twenty years later, be the belief that motivated the deep-learning revolution. Geoff Hinton, Yann LeCun, and the small community of researchers who kept the neural-net candle burning through the AI winter of the 1990s and 2000s were betting, in essence, that the symbolic AI tradition had been wrong to invest in cleverness and right to invest in compute. Deep Blue, in the field's collective subconscious, was the proof that the bet would pay.

The bet did pay. AlexNet, in chapter eight, was the moment it became visible.

But the proximate lesson of Deep Blue, on the honest reading, was about chess specifically.

The field needed fifteen years to recognize that, and another five years to act on the recognition.

---

## The lesson

Deep Blue's lesson is the lesson of *the right tool for the right problem class*.

Chess is a problem class. The class is defined: finite state space, perfect information, alternating turns, well-defined win/loss/draw evaluation at terminal states. The tool for the class is search with heuristics. The tool, applied at sufficient scale, is decisive.

Most real-world problems are not in this class.

Most real-world problems are open-ended, partial-information, multi-agent, ill-defined-evaluation. Search with heuristics, applied to these problems, does not produce decisive results. Search with heuristics, applied to these problems, produces *something* — often something useful — but the something is not the same kind of something Deep Blue produced for chess.

The practitioner who has internalized Deep Blue's lesson asks, before reaching for the search-with-heuristics tool: *is this problem in the class for which this tool is decisive?* If yes, the tool will work. If no, the practitioner needs a different tool, or a way to reformulate the problem into the class.

This is the deepest practical lesson the AI field has produced about itself.

It is also, on the honest reading, the lesson the field most consistently forgets.

---

## The build: Super Scheduling

The reference implementation for this chapter is the Accelerando suite's patient-scheduling engine:

```
agicore-examples/accelerando/scheduling/accelerando_scheduling.agi
```

The application is a web service exposed on port 3008, with a React frontend, an Axum API, and a PostgreSQL backing store. The service ingests the constraints of a healthcare clinic — provider availability schedules, room capacity, equipment booking, patient preferences, transportation constraints, regulatory requirements like fasting periods before certain procedures — and produces a feasible schedule that optimizes a configurable objective function (minimize patient wait time, maximize provider utilization, balance the two, or any weighted combination thereof).

The structural analogy to Deep Blue is the search-with-heuristics shape. The schedule space is enormous — even a small clinic with ten providers and five hundred patients has more candidate schedules than there are atoms in the observable universe. The system explores this space via a constraint-propagation algorithm that prunes infeasible branches aggressively, evaluates the remaining branches via a numerical objective function, and returns the best schedule found within a configurable time budget. Two minutes of compute, on a modern laptop, produces a schedule competitive with what a human scheduler would produce in a full day.

The `.agi` source is approximately three hundred and forty lines.

The entities:

```
ENTITY Provider {
  name:        string
  specialty:   string
  available:   list<json>     // weekly availability slots
  max_per_day: number
}

ENTITY Patient {
  mrn:           string
  preferred_provider_id: id?
  needed_procedures: list<string>
  constraints:   json
}

ENTITY Room {
  name:        string
  equipment:   list<string>
  cleaning_minutes: number
}

ENTITY Appointment {
  patient_id:  id
  provider_id: id
  room_id:     id
  starts_at:   timestamp
  duration:    number
  procedure:   string
}

ENTITY Schedule {
  generated_at: timestamp
  horizon:     string
  appointments: list<Appointment>
  objective_value: number
  search_stats: json
}
```

The scheduling workflow:

```
WORKFLOW generate_schedule {
  INPUT  horizon_start: timestamp
         horizon_end:   timestamp
         objective:     string
  OUTPUT schedule: Schedule

  NODE start { TYPE start }

  NODE load_constraints {
    TYPE      ai_call
    PROMPT    "Load providers, patients, rooms, and equipment
               available across the horizon."
    OUTPUT    constraints: json
  }

  NODE search {
    TYPE      router_call
    ROUTER    constraint_search
    TASK_TYPE schedule_optimization
  }

  NODE evaluate {
    TYPE      ai_call
    PROMPT    "Evaluate the produced schedule against the
               objective function. Emit the objective value,
               the per-constraint slack, and a small report
               of conflicts the search could not resolve."
    OUTPUT    evaluation: json
  }

  NODE end { TYPE end }

  EDGE start            -> load_constraints
  EDGE load_constraints -> search
  EDGE search           -> evaluate
  EDGE evaluate         -> end
}
```

The `router_call` node — `constraint_search` — is the system's search engine. It implements a classic constraint-satisfaction algorithm with backtracking, arc consistency, and configurable heuristics (most-constrained-variable first, least-constraining-value next). The implementation is approximately two thousand lines of Rust generated by the Agicore compiler from the `.agi` declarations; the reader does not see this code, because the reader does not need to. The reader sees the declarations and the workflow.

To compile and run:

```
cd agicore-examples/accelerando/scheduling
agicore compile accelerando_scheduling.agi
docker-compose up
agicore seed --synthetic    # loads ~30 providers, 1000 patients, 12 rooms
curl -X POST http://localhost:3008/schedule \
     -H "Content-Type: application/json" \
     -d '{"horizon_start": "2026-06-01T08:00:00Z",
          "horizon_end":   "2026-06-30T18:00:00Z",
          "objective":     "minimize_wait_then_maximize_utilization"}'
```

The service runs for approximately ninety seconds. The response is a complete one-month schedule for the synthetic clinic — approximately three thousand appointments, allocated across the providers, rooms, and time slots, with the objective value reported and the unsolvable conflicts (typically a handful, in the synthetic data) explained in plain language.

You have just run a Deep Blue.

The Deep Blue you have run is, on every relevant technical measure, structurally identical to the chess engine of 1997. Both systems frame the problem as state-space search. Both use heuristics to prune the search. Both evaluate candidate states via a domain-specific objective function. Both produce, in the time budget allowed, the best state found.

The application domain is the difference. Chess in 1997 was Deep Blue's test bed because chess was the available high-prestige search problem. Scheduling in 2026 is your test bed because scheduling is the available high-stakes search problem that your synthetic clinic actually needs solved.

Practitioners who understand this generalize across the two test beds. Practitioners who do not understand this generalize across neither.

---

## The homework

Open `accelerando_scheduling.agi`.

Find the `SEED` block.

Modify the synthetic data to model a clinic *you* know about — a clinic where you work, where you have been a patient, or where a member of your family is treated. The names of the providers do not need to be the real names. The rough shape of the constraints — how many providers, what their specialties are, how their availability patterns work, what kinds of procedures they perform, what equipment they share — should match the real shape.

The exercise is one or two hours of work. The output is a synthetic representation of the actual scheduling problem your clinic faces.

Recompile. Re-seed.

Run the scheduler.

Read the output schedule.

Compare it to what the clinic actually produces by hand.

The comparison will surface, on the honest reading, three things. First, the scheduler will produce a defensibly better schedule than the clinic produces by hand. Second, the scheduler's schedule will violate some constraint the clinic considers important but that you did not encode. Third, you will know, after looking at the violation, exactly what to add to the rule-base to fix it.

Add the constraint.

Recompile. Re-run.

The second schedule will be visibly better than the first.

You have just learned, in the small case of your local clinic, what Deep Blue's IBM team learned in the large case of chess: a good search-with-heuristics system improves *iteratively*, by repeated refinement of the constraint set and the evaluation function. The system is not, on any honest reading, intelligent. The system is, on the engineer's honest reading, *expensive computation applied to a problem class where expensive computation is what works.*

Chess was the test bed in 1997 because chess was prestigious.

Scheduling is your test bed in 2026 because scheduling is your problem.

The problem is the work. The work is the work.
