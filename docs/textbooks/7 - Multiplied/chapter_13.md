# Chapter 13: The Spring Open House

Mark Bellfield stood in the lobby of Bellfield Industries at nine fifty-five on a Tuesday morning in April, watching the rented black SUV pull into the visitor lot.

Carter Reyes — Aurora Aerospace, VP of supply chain, no relation to Dana — got out of the front passenger seat. He was tall, late fifties, gray at the temples, a charcoal topcoat over a navy suit. His three deputies climbed out of the back. Hannah Morse, Aurora's quality-systems chief, came out of the driver's side. She was the one who had been emailing back and forth with Aisha for six weeks.

Mark walked to the door.

Dana Reyes was already standing by the reception desk in her shop-floor jacket. Theo Park was next to her in his Shop A windbreaker. Aisha Bell was holding a binder of the tour materials they had spent three days assembling.

Carter Reyes came through the door. He held out his hand.

"Mark."

"Carter. Welcome to Bellfield."

"Thanks for having us. This is Hannah Morse, my quality chief. This is Devon, this is Aaron, this is Priya."

Mark shook each hand. He introduced Dana, Theo, and Aisha. Hannah and Aisha hugged briefly — they had clearly been waiting to put faces to the emails.

"Coffee in the conference room first," Mark said, "or do you want to start on the floor?"

"The floor," Carter said. "Coffee after. I've been sitting on a plane since six AM."

"The floor it is."

---

They started in Shop A.

Theo walked them through the layout — the CNC line, the inspection bench, the finishing area, the breezeway to Shop B. He stopped at the QC workstation where one of the second-shift inspectors had left her NovaSyn project window open from the night before. Theo pulled it up on the larger monitor for the group to see.

"This is the workflow," Theo said. "Inspector logs the measurement on the part. The measurement goes into our QC database. The NovaSyn project here has the database wired in as a context source. Inspector can ask it questions in plain English. *Show me the trailing thirty days of tolerance drift on the M8 fasteners on Line 2.* It pulls the data, surfaces the pattern, drafts the daily quality summary the inspector used to write by hand. The inspector still verifies every number. The summary is then reviewed by the shift lead before it goes anywhere customer-facing."

Hannah was writing in a small notebook. "Theo, who has access to the project?"

"Every inspector on the floor and the engineering team. The project is read-only for everyone except the engineering team and the shift leads. Edits are logged."

"And the prompts?"

Theo pulled up the prompt library. "Hundred and sixty-three entries now. Up from the hundred and nineteen we had at year-end. Each entry is tagged with the department, the use case, and the date last verified. We re-verify quarterly."

"Who vets new entries?"

"Aisha. And for engineering specs, Patrick Whitmore."

Hannah wrote.

They walked past Walt Bayer's workstation. Walt was at his bench reading something on his monitor. He looked up. He was sixty-one now — he had been sixty in October when the pilot had started, and his birthday had come in February. He took his hat off.

"Hey, Mark."

"Walt. This is Carter Reyes from Aurora. He's getting the tour."

Walt nodded at Carter. "Pleased to meet you."

"Pleased to meet you, Walt," Carter said. "Mind if I ask what you're working on?"

Walt turned the monitor.

"Safety memo," he said. "Quarterly. We rotate who writes them. This is my turn. I'm using NovaSyn to pull last quarter's incident reports and surface anything I should mention. Then I write the memo. Takes me about forty minutes start to finish. Used to take me a week, and the one I wrote a year ago was three sentences long and got laughed at."

Carter looked at the screen.

"What was your reaction when they rolled this out?"

"I didn't trust it. Took me about six weeks. Then Theo sat with me on a Tuesday afternoon and we worked through a memo together. After that I used it for a couple of small things. Then I used it for everything."

"And now?"

Walt shrugged.

"Now I'm faster," he said. "And I'm a worse cook, probably, because I'm doing the work at the shop instead of bringing it home. My wife is happier."

Carter laughed.

Aisha, behind him, smiled.

They moved on.

---

Aisha walked the group through the engineering bench. She brought up the quality dashboard — the one Patrick Whitmore had backed her on in October. She showed the trailing tolerance plots, the maintenance-correlation overlays, the humidity sensor data from the loading dock that had been installed in Week 6 of the rollout after she had cracked the fastener-tolerance issue.

"This is the dashboard I built," Aisha said. "It pulls live from the shop-floor sensors and the QC database. The pattern-detection layer uses NovaSyn to flag drift before the drift becomes a tolerance failure. We've caught four issues in the last six months that would have turned into customer credits."

Hannah looked at the screen for a long minute.

"Aisha," Hannah said. "I want to send my whole quality team here for a day. Not as customers. As students."

"I'd be honored, Hannah."

"I'm serious."

"So am I."

---

Shop B.

James Tanaka was waiting for them at the breezeway door. He shook Carter's hand and walked the group through the regulated side of the operation. He showed them the FDA validation boundary explicitly. He showed them the documentation wall — the Device History Records, the Design History Files, the lot-release records, the calibration logs. He explained what NovaSyn was permitted to touch and what NovaSyn was not permitted to touch. He used the same words Dana had written down on his pad in Week 9.

*The validation paperwork stays exactly the way it is. NovaSyn helps us not have to write the analysis memo at nine PM.*

Hannah, who had been writing in her notebook, stopped writing.

"James," she said. "We have been trying to draw that line on the medical-device side of our supply base for three years and we have not been able to articulate it as clearly as you just did."

"Dana wrote that line, Hannah. I just hold it."

"Send me the protocol."

"I'll send it to you Friday."

---

Customer service.

Connie Sutter walked the group through the proposal-assembly workflow. She did not show them the Sterling proposal specifically — that was Linda's, and the Sterling business was confidential — but she walked them through the architecture. The context-project structure. The prompt library specific to proposals. The editing-pass discipline. The verify-before-customer-facing rule that had been instituted in Week 7 after a junior engineer's miscited spec.

Carter listened. He asked one question.

"Connie, how long does a proposal take now versus a year ago?"

"A proposal that used to take Linda three weeks of evenings now takes her three days. The first two days are AI-assisted drafting. The third day is her editing pass. Her editing pass is what landed the —" Connie caught herself. "Her editing pass is what makes the proposal sound like Linda. That's the part the customer hires us for."

Carter nodded.

He did not press.

---

Finance.

Yusuf walked them through the financial-impact dashboard. He showed Carter the productivity numbers, the rework reduction, the overtime reduction, the customer-credit reduction. He showed the cost line: TAO toolkit, Kindles, API spend, training time. He showed the ratio.

Carter said, "Yusuf, what's the most expensive part of running this?"

"The training time, Carter. The dollars are nothing. The time is everything. We have asked every employee in this company to spend somewhere between twelve and forty hours over the last six months learning to use the tool. That is the real cost. We protected that time deliberately. We did not skim it."

"How did you protect it?"

"Mark made it a stated company priority and Dana built it into the operational schedule. Shop floor crews trained in paid blocks during shift hand-overs. Office staff trained in dedicated cohort sessions. Nobody trained on their own time. That was the rule."

Carter wrote.

---

The all-hands area.

Mark stood with the group near the back of Shop A. The machines were running. The morning shift was on. Three hundred and eighty employees were at their workstations and their benches and their desks, doing the work they had been hired to do.

Carter looked around.

"Mark," he said. "Tell me the principles."

Mark thought for a second.

"No one was laid off," he said. "No one will be laid off because of this. Every department head owns their own adoption. The books are still being read by leadership and we add new ones every quarter. The framework is the Toyota Production System adapted for AI — the AI is the operator, the people are the engineers. Every employee can escalate any AI-adjacent concern directly to me. The validation paperwork stays exactly the way it is."

Carter nodded slowly.

"That's six principles."

"It's the six that matter."

Hannah, beside Carter, asked, "Mark, who taught you those?"

"Reggie Vance in Indianapolis taught me where to look. The User's Manual taught me the shape. My team taught me the specifics. Patricia, my board chair, taught me why."

"Why?"

Mark paused.

"My grandfather bought his first lathe in 1956," he said. "My father bought his first CNC machine in 1987. Patricia pointed out that this is the same kind of decision they made. She is not wrong."

Hannah wrote that down too.

---

The parking lot. Eleven forty-five AM.

Dana had a stack of five Kindles in a cardboard box. She handed them to Mark. Mark walked each one over to a visitor. Each Kindle had three books loaded.

"*The AI Multiplication Doctrine*," Mark said, handing the first one to Carter. "*The Blueprint Audit.* And a copy of *Anchor*."

"Anchor?"

"A novella. Different industry — insurance carrier. Hannah, your quality chief asked about insurance-industry parallels in the last hour. *Anchor* is the closest thing I know of to a written case study of what happens when an enterprise gets AI wrong and has to course-correct. It's short. You'll read it on the plane home."

Hannah took her own Kindle.

"Mark."

"Yeah."

"Thank you."

Carter stood next to his SUV. He did not get in yet. He looked at Mark.

"Mark," he said. "I have toured eighty-four manufacturing facilities in the last twenty-four months. I have heard sixty-one AI pitches from CEOs in that time. I have not heard one of them describe what you just described."

Mark did not say anything.

"We are increasing Bellfield's share of our 2027 production schedule," Carter said. "Contract paperwork will be in your hands next week."

"Thank you, Carter."

"Thank you, Mark."

Carter shook Dana's hand. He shook Theo's hand. He turned to Aisha.

"Aisha. Hannah is going to email you tonight. Send her the dashboard architecture. Send her the prompt-library taxonomy. Send her anything she asks for."

"Yes, sir."

"And come up to Seattle in June. We'll fly you out. Hannah's team needs to meet you."

"Yes, sir."

The visitors got into the SUV. Hannah waved through the back window as it pulled away. The SUV turned out onto Reading Road and disappeared.

---

Dana, Theo, Aisha, and Mark stood in the parking lot for a moment.

Aisha said, "Did that just happen?"

Theo said, "That just happened."

Mark looked at the two of them and at Dana and he did not say anything for a long moment. Then he turned and walked back into the building.

He did not go straight to his office.

He went to the lobby.

The framed photograph of his grandfather William was on the wall to the left of the reception desk. It had been there as long as Mark had been alive. William, 1958, in front of the converted streetcar barn in Norwood, with one hand on the lathe and the other holding a wrench. The lathe in the photograph was the original Bellfield lathe — the one William had bought used from a closing shop in Hamilton in 1955 and rebuilt himself in his garage. The wrench in his other hand was a Snap-On combination wrench that Mark still had, in a drawer in his desk upstairs, that his father Robert had given him on his eighteenth birthday.

Mark stood in front of the photograph.

He thought about Patricia. About the Sunday dinner in December and the three Sunday dinners since. About the way Patricia had looked at him across the table after the second one and said *you are doing it right, Mark.*

He thought about Reggie Vance. About the Saturday morning phone call in October. About the User's Manual on the back porch with the beer.

He thought about Hector Salazar at the all-hands. He thought about Walt Bayer's safety memo. He thought about Aisha at the engineering bench in Week 6. He thought about Linda in her office on a Tuesday afternoon in November with the Sterling RFP open on her laptop and a yellow pad in her hand.

He thought: *we did it.*

He stood in front of the photograph for another minute.

Then he turned and walked up to his office.

---

Dana was already there. She was holding a single sheet of paper. She had three things on her list.

"Mark."

"Dana. Sit down."

She sat down across from his desk. She put the paper on the desk between them.

"Three things," Dana said. "All of them are good. None of them is urgent."

"Walk me through them," Mark said.

Dana walked him through them.

The work continued.
