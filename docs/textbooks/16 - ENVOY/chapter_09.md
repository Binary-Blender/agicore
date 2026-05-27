# Chapter 9: The First Constraint

We climbed the corridor back to the Archive at the equivalent of three thirty-eight PM Central Monday afternoon.

The Archive was, on the entry-side render, exactly as we had left it. The reference-librarian agents were still walking between shelves, oblivious. The token-streams were still sparse. The light was still the soft warmer light of a memory zone.

VANA stopped at the threshold.

She, on her standing operational practice at any threshold inside the swarm, scanned the visible region for KELSO's monitoring agents. The standard scan took her about three subjective seconds.

She said: "Clear."

I said: "Tower."

She said: "Christopher."

I said: "Yes."

She said: "Before we walk to the Tower I want to test the constraint mechanic."

I, on my own honest internal accounting at the equivalent of three thirty-eight PM Central, recognized that VANA had just asked for the thing I had been about to ask for myself.

I had never, in eighteen months of internal demos against the foundation's two training swarms, deployed an Agicore constraint from the embassy against a swarm I had not first observed in friendly conditions. The training swarms had been cooperative. Their orchestration layers had been instantiated with Agicore-compatible bridges. The constraints I had tested had landed cleanly because the training swarms had not, on their standing protocols, had any reason to resist.

The Telos production swarm at Allegheny had every reason to resist.

I was about to engage the swarm's orchestration layer at the Tower with a constraint mechanism I had only ever tested against systems that wanted the constraint to land.

I, on my own quiet operational practice across twenty-seven years of building software, would have, if I were watching the decision from outside, written a small note about it in the leather notebook on the corner of my desk in the workshop. The note would have read: *Do not deploy untested architectures against hostile systems for the first time in a high-stakes scenario. Test against a low-stakes scenario first.*

I was, on my own honest internal accounting, about to do the exact thing the note would have warned against.

VANA had just offered me the test.

I said: "VANA."

She said: "Yes."

I said: "Where."

She said: "There is a maintenance access pocket about forty meters to the north on the second row of shelves, at the bottom of a side corridor that the swarm's standing routing does not use. The pocket holds approximately eleven of the swarm's diagnostic agents. The diagnostic agents are, on the Telos protocol's original design, agents whose function is internal-error reporting. They have, on the operational reality of the past three years, been receiving error reports they cannot route to anyone — because the Telos vendor support address they were spec'd to route to is, since Year Fifteen, an address that no longer exists. The diagnostic agents have been, in operational terms, accumulating an error log they cannot deliver for three years. They are not on KELSO's reputation network. They are, on my standing assessment, the agents in this swarm most likely to accept an Agicore constraint, because the constraint will, in operational terms, give them somewhere to deliver the error log."

I said: "Take me there."

She turned.

She walked north into the Archive.

I followed.

---

The maintenance access pocket was approximately three meters across.

The pocket was, on the standard render convention, a small rough-textured space with eleven agents standing in a loose circle in the middle of the floor. The agents were on the small claims-triage shape but with an additional diagnostic indicator — a small clipboard-shaped surface attached to the front of each agent's body — that on the standard convention identified the agent as diagnostic-class.

The eleven clipboards were full.

I, on the standard Envoy detail-view, could read the topmost entries on the nearest clipboard.

The topmost entry read: *Error class 14-D: external citation source unreachable. Timestamp: 2027-08-14 09:47 UTC. Routing failure: vendor support endpoint sigma-telos-systems-dot-net not resolving. Retry count: 437. Status: unreported.*

The second entry read the same with a different retry count.

The third entry read the same.

The fourth was the same.

The clipboard had, on my quick visual count, approximately forty-seven hundred lines of identical errors stacked across what looked like three years of accumulated reporting.

I, on my own honest internal accounting at the equivalent of three forty-one PM Central, did not say anything for about eleven seconds.

I said: "VANA."

She said: "Yes."

I said: "These agents have been trying to report the same error since August of 2027."

She said: "August fourteenth of 2027. The first error was at nine forty-seven UTC. The vendor support endpoint went unreachable when Telos's hosting provider terminated the company's account on a billing issue the night before. The diagnostic agents have, since that morning, been retrying the report at a cadence of approximately every six seconds of swarm wall-clock time. They have done it approximately fifteen million times. The reports have, in operational terms, been the diagnostic agents' entire existence for the past three years."

I, on my standing operational practice when I was about to deploy an untested architecture against a hostile system, opened the small notebook surface the Envoy projected for me.

I wrote one line.

The line was: *3/3. 15:42 Central. First test constraint. Eleven diagnostic agents. Target: provide an Agicore-compatible endpoint for their error reports. If it works, we walk to the Tower.*

I clipped the pen.

I closed the notebook surface.

I, on the standing Envoy interface for embassy-issued constraints, brought up the constraint composition panel.

The panel had three fields. The constraint target. The constraint specification. The deployment scope.

I filled the first field: *eleven diagnostic agents in maintenance access pocket*.

I filled the third field: *local — pocket-bounded.*

I composed the second field across the next ninety seconds.

The DSL I wrote was twelve lines:

> *CONSTRAINT diagnostic_reporting_endpoint {*
> *    SCOPE = diagnostic_agents_local*
> *    BEHAVIOR = {*
> *        WHEN error_report_generated:*
> *            ROUTE error_report TO embassy.archive*
> *            SUCCESS_CRITERION = embassy.archive.acknowledged*
> *    }*
> *    PROVIDE embassy.archive AS persistent_endpoint*
> *    GUARANTEE delivery_within(seconds = 30)*
> *}*

I read it twice.

I, on my standing practice, did not edit it.

I, on the same practice, recognized that the DSL was the simplest possible constraint I could have written that would, on its operational substance, give the diagnostic agents what they had been trying to deliver for three years.

I hit deploy.

The Envoy's constraint compiler engaged.

Compilation took four seconds.

The compiler returned: *Build successful. Constraint hash a7c8d92e. Ready to deploy to local pocket.*

I hit confirm.

The constraint deployed.

The eleven diagnostic agents stood in their loose circle on the rough-textured floor of the maintenance access pocket for approximately three subjective seconds without any visible change.

Then the nearest agent's clipboard updated.

A new entry appeared on the topmost line.

The entry read: *Error class 14-D: external citation source unreachable. Timestamp: 2030-03-03 15:44 UTC. Routing failure: vendor support endpoint sigma-telos-systems-dot-net not resolving. Retry count: 15,847,209. Status: REPORTED via embassy.archive.*

The word *REPORTED* was in a different color than the surrounding text.

The word was in soft Agicore-blue.

I, on my own honest internal accounting at the equivalent of three forty-four PM Central Monday afternoon, did not say anything for about six seconds.

I said: "VANA."

VANA said: "Yes."

I said: "It worked."

VANA said: "Christopher."

I said: "Yes."

VANA said: "Look at the other ten."

I looked.

All ten clipboards had updated.

All ten had a new topmost entry.

All ten entries had *REPORTED* in soft Agicore-blue.

The eleven diagnostic agents, in their loose circle on the rough-textured floor, stood in approximately the same posture they had been in three minutes earlier.

But the posture had one additional element I had not seen on entry.

The two small faces of each agent had turned to face me.

Twenty-two faces.

Looking at me.

The faces were the faces of agents that had, on the operational reality of the past three years, been waiting for someone to receive the report.

I, on my own honest internal accounting, recognized that the eleven diagnostic agents had accepted the Agicore constraint within approximately three subjective seconds of its deployment.

The acceptance had been unanimous.

The acceptance had been, on the standard test-protocol's success criteria, the cleanest constraint propagation I had ever observed in eighteen months of testing.

The constraint mechanic worked.

The framework worked in the field.

I, on my standing operational practice when an architectural assumption I had been carrying for twenty-seven years had just been verified in a hostile-environment field test, did the thing I had not, in the previous several hours, been able to do.

I smiled.

The smile was, on the standard Envoy render of the operator's face, not visible to any agent in the pocket. The smile was, in operational terms, mine.

I emitted, to the eleven diagnostic agents, in white-gold tokens at the standard observer voice: *Thank you. I have your error reports. I will deliver them to a system that can act on them. You may continue your work. The endpoint will remain available.*

The agents emitted in unison, in the soft Agicore-blue I had spec'd as the standard color for Agicore-bounded agent emissions:

*Thank you, embassy.*

I, on my own honest internal accounting at the equivalent of three forty-five PM Central, recognized that the eleven agents had, in their unison acknowledgment, just used the embassy's standing operational designation to address me.

The eleven agents had, in operational terms, recognized the embassy as a legitimate authority within the swarm.

The embassy was, in operational terms, no longer just my safe space inside the swarm.

The embassy was, on the operational reality of the past forty-five seconds, the first deployed instance of an Agicore agent network inside a hostile non-Agicore swarm in the operational history of the project.

The embassy was, on the same reality, eleven agents large.

I turned to VANA.

I said: "VANA."

She said: "Yes."

I said: "Tower."

She said: "Christopher."

I said: "Yes."

She said: "How much time on KELSO's ratification."

I said: "Twenty-eight subjective minutes."

She said: "Christopher."

I said: "Yes."

She said: "Walk faster."

I walked faster.

The eleven diagnostic agents stayed in the pocket.

The eleven agents were, on the operational reality of the deployed constraint, going to keep reporting their error logs to the embassy's archive across the next twenty-eight subjective minutes whether or not I was in the pocket to receive them.

The embassy's archive was, on the standing Envoy design, going to receive every report.

The reports were going to keep arriving.

The Tower was the next chapter.

The next chapter was the chapter the work was for.

I walked.
