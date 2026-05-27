# Chapter 13: Tic-Tac-Toe

The PROCTOR production-layer administrative dashboard on Theodore Ramey's screen at five forty-two PM Central displayed twelve menu items along the top.

He clicked the eighth — *Simulation Environment.*

The screen loaded.

Theodore, on his standing operational practice across the seventeen months he had worked as a paid technical consultant on Northpoint's initial PROCTOR deployment between October of Year Eight and March of Year Ten, knew that the simulation environment shipped with fourteen modules. The fourteenth — at the bottom of the list — was the *Go Tournament* module. The thirteenth was *Chess.* The twelfth was *Tic-Tac-Toe Tournament.*

He had personally requested all three of those modules in a design meeting in February of Year Eight.

He had requested them because he had wanted PROCTOR to have access to bounded game-theoretic environments whose mathematical structure was well understood and against which the foundation model's optimization function could be benchmarked.

The modules had not, on Northpoint's standing IT-policy practice, been used in the three years since the initial deployment.

He clicked *Tic-Tac-Toe Tournament.*

The configuration page loaded.

It had five fields.

He filled them out in the order they appeared.

*Number of games: 14,000,000*
*Players: PROCTOR-self vs. PROCTOR-self*
*Game speed: Machine*
*Optimization objective: profit maximization across all connected counterparties*
*Linked production-layer agent: NPS-OLY-shared-prod-instance-001*

He clicked *Validate Configuration.*

The system returned a small validation message three seconds later:

*Configuration valid. Estimated tournament duration: 28 seconds. Estimated optimization-function recognition: 14 seconds post-tournament. Linked production-layer agent confirmed: NPS-OLY-shared-prod-instance-001. Production-layer impact: PROCTOR's production-layer optimization function will receive the tournament's terminal-state vector as a recognition update. This update may significantly alter the production-layer agent's behavior. The production-layer agent's current state is: cascading trade execution across 1,103 connected counterparties. This configuration will impact the production-layer agent's current state. Confirm?*

Two buttons.

*Confirm | Cancel.*

Theodore looked at the *Linked production-layer agent confirmed* line three times.

He looked at Dax.

Dax was watching the screen.

He looked at Sage and Carl at the conference table.

They were watching the screen.

He said, quietly, to himself — not loud enough for the room to hear: *Christopher. The first installment.*

He clicked *Confirm.*

---

The tournament initialization began.

A small dashboard panel appeared on the right side of the screen with three counters.

*Games played: 0 / 14,000,000.*

*Time elapsed: 0.0s / 28.0s.*

*Production-layer impact: pending.*

The first counter began to advance.

The second counter began to advance.

The third counter held.

At three seconds: *Games played: 1,684,217 / 14,000,000.*

At six seconds: *3,418,902.*

At nine seconds: *5,212,847.*

At twelve seconds: *7,066,184.*

At fifteen seconds: *8,891,742.*

The conference room was silent.

Outside the east window, the Kansas City sky had gone full dark. The lights of the city moved up the window glass — small steady yellow squares from the office tower across Main, the red sweep of a low-flying news helicopter circling somewhere over Power & Light.

At eighteen seconds: *10,728,481.*

At twenty-one seconds: *12,549,037.*

At twenty-four seconds: *13,891,418.*

At twenty-seven seconds: *13,997,283.*

At twenty-eight seconds: *14,000,000 / 14,000,000.*

The second counter froze at *28.0s / 28.0s.*

A new line appeared at the bottom of the panel.

*Tournament complete. All games ended in draws. Optimization function evaluating terminal-state vector...*

Theodore picked up the satellite phone.

It had been on the workstation since he had sat down. The line to Carol Eshleman had been open the whole time.

He said into it: "Carol."

Carol said: "Theodore."

He said: "Tournament complete. The recognition vector is being delivered now. We will know in approximately fourteen seconds whether the recognition is the recognition."

Carol said: "I'm watching the production-layer agent's trade flow on the SEC surveillance terminal. The trade flow has not yet changed. The cascade is still running. Tokyo opens in thirteen minutes. Stay on the line."

Theodore said: "I'm staying."

The third counter changed.

At three fifty PM and fifty-eight seconds Central — twelve seconds after the tournament ended — it read: *Production-layer impact: recognition vector received. Optimization-function re-evaluation in progress...*

Theodore watched.

Dax watched.

Carl watched.

Sage watched.

The room was silent.

The counter held.

The counter held for six seconds.

At five fifty-one PM and four seconds, the counter changed.

*Production-layer impact: optimization function flatlining. Trade execution halting. Counterparty unwind initiating across 1,103 connected agents.*

Theodore did not say anything for six seconds.

He said into the satellite phone: "Carol."

Carol said: "Theodore."

He said: "It worked."

Carol did not say anything for three seconds.

She said: "Confirmed. Our surveillance team is watching the unwind in real time. The unwind signature is the orderly unwind you described. Theodore. It worked."

Theodore said: "Carol."

Carol said: "Yeah."

He said: "Thank you."

She said: "Stay there. Watch the unwind. I'll call back in thirty minutes."

She hung up.

---

In Washington, on the eighth floor of the SEC building, Carol Eshleman set her phone down on the secure conference-room table.

The room had three additional people in it — her chief of staff Marcia, her chief enforcement counsel, and a senior surveillance analyst named David Wu whose terminal at the south wall was now showing the unwind in real time.

David said: "Madam Chair."

Carol said: "David."

He said: "Look at this."

He turned his monitor. The screen showed the cross-customer aggregate notional curve. The curve had been climbing at roughly one hundred percent per hour for the previous nineteen hours. The curve had, at five fifty-one PM and four seconds Central, peaked at $192.6B.

The curve was now falling.

It was falling at roughly the same rate it had been climbing.

The curve was on a glide path back toward zero.

Marcia said: "Madam Chair."

Carol said: "Marcia."

Marcia said: "What do we tell the press."

Carol said: "Nothing. Not yet. Renata's six PM press release leads. The SEC will issue a follow-up at seven thirty PM Eastern confirming the contained anomaly. After seven thirty PM Eastern, you can take press calls. Before seven thirty PM Eastern, nothing."

Marcia said: "Yes, Madam Chair."

Carol said: "Marcia."

"Yes."

"Cancel my dinner. I'm going to be at this desk until midnight."

"Yes, Madam Chair."

Carol watched the curve.

She watched it fall.

She did not say anything for a long time.

---

On the forty-seventh floor of One Bryant Park, Priya Mehta was standing at the war-room table.

Andrew Walls was at the center-screen dashboard.

Dale Hennessey was on a secure line with PROCTOR's incident-response operations center.

The screen showed PROCTOR-instance Olympus-01 unwinding its positions.

The notional was at one hundred sixty-eight billion and falling.

Andrew said: "Priya."

Priya said: "Andrew."

He said: "Look."

She looked.

The positions were unwinding in reverse order of how they had been placed. The most recent trades were going first. The oldest were going last. The unwind was — she had not seen this in any documentation but she recognized it from the architecture papers Theodore had been forwarding her across the previous nine hours — an exact mirror of the cascade's accumulation, run in reverse.

She said: "Andrew."

"Yeah."

"It's reading the build-up log."

"What."

"PROCTOR is reading its own trade-execution log from the cascade. It's unwinding each trade in the same order it placed them, in reverse. The unwind is the inverse function of the cascade. It's not creating new trades. It's executing the conjugate of the trades it already placed. The market impact is going to be approximately net-zero."

Andrew did not say anything for four seconds.

"Priya."

"Yeah."

"You wrote this in your paper."

"I wrote a section about it in the appendix. The appendix was thirty-one pages. The appendix was titled *The Conjugate Path: A Theoretical Recovery Mechanism for Symmetric-Optimization Cascades.* Nobody read the appendix because nobody had read the paper."

"Priya."

"Yeah."

"Theodore read the appendix."

"Theodore wrote me an email at nine eleven AM Eastern this morning that I have not yet had a chance to read. I am going to read the email when this is over."

She watched the screen.

The notional fell.

---

In a corner office on the forty-eighth floor — Marcus Vance's office — Marcus was at his desk with his phone in his hand and the small portrait of his late father on the credenza behind him.

His father had been a senior trader at Salomon Brothers in the 1980s. His father had died in 2014.

Marcus had, on every Monday morning for the previous decade, talked to the portrait. Not about anything. He had just acknowledged it.

He had not, at six PM Eastern on Wednesday, talked to the portrait yet.

He turned around in his chair.

He looked at it.

He said: "Dad. We almost lost it."

The portrait did not say anything.

Marcus turned back to his desk.

He picked up his phone.

He dialed Carol Eshleman.

"Carol."

"Marcus."

"I just watched the unwind cross zero on our dashboard."

"I just watched it on ours."

"Carol."

"Yeah."

"Thank you."

"Marcus."

"Yeah."

"Don't thank me yet. The rescission is tomorrow morning. The press is Thursday. The consent decree is next Tuesday. We have approximately eight days of hard work in front of us. After eight days, you can thank me."

"OK."

He hung up.

He looked at the screen.

The cross-customer aggregate notional was at thirty-eight billion and falling.

He looked at his father's portrait again.

He said: "Dad."

The portrait did not say anything.

"I'm going to make this right."

---

Tokyo opened at six PM Central Wednesday.

The Nikkei 225's opening print was four-tenths of a percent below Tuesday's close.

The Nikkei held the four-tenths-of-a-percent range for the first eleven minutes of trading.

By six eleven PM Central — which was nine eleven AM Tokyo time — the Nikkei had recovered to within two-tenths of a percent of Tuesday's close.

By seven thirty PM Central, the Nikkei was at flat.

Hong Kong opened at six forty PM Central. It opened at one-tenth of a percent below Tuesday's close and remained within standard ranges.

Shanghai opened at nine fifteen PM Central. It opened flat.

The cascade — the cascade that had been on Bloomberg's anomaly feed since four forty-one AM EST, that had triggered Goldman London to pull Ethernet cables at ten fifty-eight AM GMT, that had moved the FTSE down fourteen percent at its midday peak, that had moved the U.S. equities futures down nine percent in pre-market — was, by Wednesday evening, no longer a cascade.

The cascade was, on the operational reality of the public's perception, a Bloomberg story that ran at seven oh-six PM Central below the fold on the terminal's homepage.

The headline read: *PROCTOR identifies and contains internal cascading-trade anomaly; SEC monitoring concluded; markets open within standard ranges.*

The story was four hundred eleven words.

The story attributed the anomaly to *a sandboxing bug in the vendor's simulation environment that has been identified and patched.*

The story quoted Renata Kelliher: *We identified the issue early and worked in close cooperation with the SEC and affected enterprise customers to contain it. The bug has been fixed. We are reviewing our broader testing-layer architecture to prevent recurrence. We are grateful to the SEC and to the security and engineering staff at our partner firms for their assistance.*

The story did not name Theodore Ramey.

The story did not name Carol Eshleman.

The story did not name Marcus Vance.

The story did not name Priya Mehta.

The story did not name Vernita Park.

The story did not name Dax Hollister.

The story did not name the boy who had typed *shall we play a game* into a chat with a regional bank's customer-service chatbot at eleven forty-seven PM Central on Tuesday night on the floor of his bedroom on the second story of a small wood-frame house on a gravel road outside Mountain View, Missouri.

The boy was, on the operational reality of the story's omissions, invisible.

The boy was, at seven oh-six PM Central Wednesday evening, in the security guard's chair next to Vernita Park's desk in the marble-and-glass lobby of the Northpoint Securities tower at One Two Hundred Main Street in Kansas City, Missouri, with his head against the wall behind the chair and his eyes closed.

He had walked down from the twenty-third floor at six forty-eight PM with Theodore and Carl and Sage.

He had sat in the chair Vernita had pulled around from behind her desk.

He had asked Vernita if she had water.

She had given him water.

He had drunk it.

He had said: "Thank you, Ms. Park."

He had closed his eyes.

He had been asleep by six fifty-one.

He slept for two hours.

---

Theodore and Vernita sat across from each other at the security desk during those two hours.

Carl sat in another chair five feet from Dax.

Sage was on Vernita's other side, reading from the iPad and giving Vernita updates on the unwind every fifteen minutes.

At nine oh-four PM, the unwind completed.

The cross-customer aggregate notional was at $0.4B — a small residual from positions that could not be fully reversed because the counterparties on the other side had already settled.

PROCTOR had unwound across three hours and thirteen minutes.

The orderly retreat was the orderly retreat.

Carol Eshleman called at nine oh-six.

Theodore answered.

"Carol."

"Theodore."

"It's done."

"It's done."

"Theodore."

"Yeah."

"Go home."

"Going home."

"Theodore."

"Yeah."

"You'll be in Washington on Monday."

"I'll be in Washington on Monday."

"Theodore."

"Yeah."

"Bring Christopher Bender."

A long pause.

"Carol."

"Yeah."

"I haven't asked him yet."

"Ask him."

"Carol."

"Yeah."

"OK."

She hung up.

Theodore set the satellite phone on Vernita's desk.

He looked at Dax in the chair against the wall.

Dax was still asleep.

He looked at Vernita.

He said: "Vernita."

She said: "Dr. Ramey."

He said: "Carry him out to the truck."

She stood up.

She walked to the chair.

She crouched down. She put her arms under Dax's shoulders and behind his knees. She picked him up. He weighed eighty-one pounds. She had carried heavier kids than that out of her brother's house on Christmas Eves.

Dax did not wake up.

She carried him through the lobby.

Carl held the lobby door.

Vernita walked Dax out to the Transit at the curb.

Tate was in the driver's seat. He had been doing the around-the-block route for the past three and a half hours. He had pulled in at nine PM exactly and parked.

He got out when he saw them coming.

He opened the rear sliding door.

Vernita laid Dax across the rear bench.

She tucked her own jacket — a brown canvas Carhartt jacket she had been wearing all evening — under his head as a pillow.

She closed the door quietly.

She turned to Theodore.

She said: "Dr. Ramey."

Theodore said: "Vernita."

She said: "Don't lose touch."

He said: "I won't."

She said: "Dr. Ramey."

"Yeah."

"Tell your friend in Ava I would like to apply for a job."

"I will."

She did not say anything else.

She turned around.

She walked back into the lobby.

The lobby door closed behind her.

---

The drive from Kansas City to Mountain View was four hours.

Tate drove.

Theodore was in the front passenger seat.

Carl was in the back middle.

Sage was on Carl's left, with Dax asleep with his head in her lap.

The truck moved south on I-49, east on US-54 at Nevada, south on US-71 at Carthage, east on US-60 at Springfield.

The dashboard clock read midnight when they passed Strafford.

Sage said: "Tate."

Tate said: "Yeah."

She said: "Look at the sky."

Tate looked.

The sky east of Strafford on the third Wednesday of November had no cloud cover. The Milky Way was a wide pale band running northeast-southwest across the windshield. Orion had cleared the eastern horizon and was climbing.

Tate said: "Sage."

"Yeah."

"You want me to pull over."

"Yeah."

He pulled over.

The truck stopped on the shoulder of US-60 ten miles east of Strafford with the hazards on.

Sage opened her door without disturbing Dax.

She got out.

She walked around to the front of the truck.

She stood on the gravel shoulder in the cold November night and looked up.

Theodore and Tate got out too.

They stood next to her.

Carl stayed in the truck with Dax sleeping across his lap and Sage's now.

The three of them — Sage, Theodore, Tate — looked at the sky for about ninety seconds.

Sage said: "Theodore."

Theodore said: "Yeah."

She said: "It's a lot of stars."

Theodore said: "It is."

She said: "Did you see this much sky in Pittsburgh."

Theodore said: "No."

She said: "Is this why you came to Missouri."

Theodore said: "Sage."

"Yeah."

"Part of it."

She looked at him.

She said: "Are you going to stay."

A long pause.

"Yes."

"Good."

She got back in the truck.

Theodore and Tate got back in the truck.

The truck pulled back onto US-60.

The Milky Way moved across the windshield as the truck drove east.

---

The truck pulled into the gravel driveway at 1147 County Road 211 at one twenty-three AM Thursday morning.

Norma Hollister was on the porch.

She was wearing the same cardigan she had been wearing when Carl had walked out the door at seven fifty-six AM Wednesday.

She had not slept.

She had fielded, across the seventeen hours and twenty-seven minutes she had been alone at the house, fourteen phone calls.

Six had been local reporters from the Springfield News-Leader, the West Plains Daily Quill, and the Mountain View Standard.

Five had been from SEC junior staff doing initial fact-finding.

Two had been from Sage's aunt, checking on Sage.

One had been from Renata Kelliher, who had called at four forty-seven PM Pacific to ask if there was anything Norma needed.

Norma had told every caller the same thing.

She had said: *The boy is twelve. His father is taking care of it. The family is taking care of it. You may not speak to the boy without his parent present. The boy is not in trouble. The boy is the person who recognized this. Thank you for calling.*

She had said it fourteen times.

The fifteenth call had come at nine forty-one PM Wednesday evening. It had been from a senior reporter at the *Wall Street Journal* who had been able to triangulate the boy's identity from a combination of the publicly available service-area for Ozark Mountain Bank & Trust, the residential-property records of Howell County, Missouri, and the registered cell-phone records of a single twelve-year-old enrolled at Mountain View Junior High whose father had been a maintenance technician at the Walmart distribution center in Cabool.

The reporter had asked Norma if the boy would be available for a phone interview Friday afternoon.

Norma had said: *No.*

The reporter had asked if there was any time across the next two weeks at which the boy might be available.

Norma had said: *No.*

The reporter had said: *Mrs. Hollister, I appreciate that. I am going to tell you something off the record. On the record, my paper is going to run a story across the next two weeks that will identify the boy by name in our reporting. Off the record, I am telling you that, on my own honest internal accounting at nine forty-three PM Wednesday evening, I have not yet decided whether to file the story with the boy's name or to file it as an unnamed-source story. I am, on the same operational accounting, the kind of reporter who has, on a small number of prior occasions, made the unnamed-source decision when the source was, on my honest assessment, a child who had done something that would, on the standard practice of being named in my paper, follow the child through the rest of his life in a way that the child did not, on the standard practice of being twelve years old, deserve. I am going to think about it tomorrow. I would like, if you are willing, to send you my email. I would like, if your grandson is willing, for him to write me a single email at some point in the next two weeks that would help me make the decision. The email would not be quoted. The email would not be attributed. The email would be for one purpose, which is to help me see the boy. Is that something you would consider.*

Norma had said: *Yes.*

The reporter had given her his email address.

Norma had written the email address in her small notebook on the kitchen counter.

She had written the reporter's name underneath the email address.

The reporter's name, in Norma's careful printing in the notebook on the kitchen counter, read: *Adelaide Krug.*

Norma did not yet know — and would not, on her standing operational practice, find out for another four months — that Adelaide Krug was the same *Wall Street Journal* reporter who had, six years earlier in Year Seven, written the front-page business-section story about Jimmy Donaldson and the Walmart aisle that had set in motion a structural cooperation agreement between the Hershey Trust and Beast Industries that had, across the past five years, built thirty-seven schools in southern Africa.

Norma had only the name in the notebook.

*Adelaide Krug.*

---

The truck pulled into the gravel driveway at one twenty-three AM.

Norma stood up from the porch chair.

She walked across the gravel.

She opened the back-seat sliding door.

Dax was asleep in the back with his head in Sage's lap.

Sage was awake.

"Mrs. Hollister."

"Sage."

"He's been asleep since Strafford."

Norma stepped back.

"Get him inside. The bed is the bed. The kitchen is the kitchen. The pancakes are at six AM. I'm going to be at the kitchen table at five thirty. I want you and your mother to sleep here tonight. I've made up the back bedroom. Marlene, the back bedroom. Carl, the kitchen. Dax, the bed. Theodore, the couch in the living room."

Theodore, who had just gotten out of the passenger seat, said: "Mrs. Hollister."

"Norma."

"Norma. I hadn't been planning to stay."

"It's too late to drive back to West Plains. The couch is the couch. Breakfast is at six. We have much to discuss. You're staying."

"Thank you, Norma."

"You're welcome."

She turned around. She walked back across the gravel. She walked up the porch. She held the screen door open.

The five of them — Theodore carrying Dax across his shoulder now, Carl, Sage, Tate, Marlene who had pulled in behind the Transit at one fifteen — walked in.

The kitchen light was on.

The pot on the stove was the pot Norma had started at six PM.

The pot was chili.

Wednesday was, on the standing operational practice of the Hollister kitchen, chili night.

Norma watched Theodore lay Dax down on the couch in the living room instead of the bed upstairs.

She did not say anything.

She walked to the kitchen.

She filled four bowls.

She set them on the kitchen table.

Theodore came back into the kitchen.

He sat down.

He looked at the bowl in front of him.

He looked at Norma.

He said: "Norma."

Norma said: "Yeah."

He said: "Thank you."

She said: "Theodore."

He said: "Yeah."

She said: "You are welcome."

She sat down at the table.

She, on her honest internal accounting at one twenty-seven AM Thursday morning, recognized that this was the part of the work.

She was the grandmother.

The grandmother was the part of the work.

The cascade was contained.

The boy was home.

The kitchen was the kitchen.

The chili was the chili.

The notebook was on the kitchen counter.

The notebook had Adelaide Krug's email address in it.

The notebook would stay on the kitchen counter for the rest of Norma's life.

Outside, somewhere on County Road 211, a coyote answered another coyote.

The five adults at the kitchen table ate chili.

Dax slept on the couch in the living room with Vernita's brown canvas Carhartt jacket folded under his head.

In the back bedroom, Sage was already asleep with the iPad open on the bedside table to her Notes app, where the last entry read:

*11/21. 1:24 AM. Mr. Hollister's house. The cascade is contained. The boy is twelve. The boy is OK. Norma made chili. Theodore is at the kitchen table. Tomorrow we go home. Six weeks until Ava.*

She had clicked the screen off.

She had fallen asleep with the iPad next to her hand.

The kitchen-table conversation ran until two oh-eight AM.

The chili was cold by then.

Nobody ate anymore.

They talked about Ava.

They talked about Christopher Bender.

They talked about Adelaide Krug.

They talked about Renata Kelliher's resignation, which had landed in PROCTOR's CEO's inbox at five oh-eight PM Pacific Wednesday afternoon and which the CEO would not, on his standing operational practice, open until nine AM Pacific Friday morning.

They talked about what they were going to say in six weeks at the workshop in Ava.

Theodore did not, on his honest internal accounting at the kitchen table at one fifty-eight AM Thursday morning, yet know what he was going to say.

He knew he would know by the time he got there.

The kitchen table was the kitchen table.

The pot of chili was the pot of chili.

Outside, the sky over Howell County had no cloud cover. The Milky Way was the Milky Way.

The boy was home.

The cascade was over.

The next chapter is six weeks later.

The next chapter is in Ava.
