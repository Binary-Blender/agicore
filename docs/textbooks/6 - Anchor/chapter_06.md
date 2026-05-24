# Chapter 6: What the AI Is Good At

The eighth floor had a sound again.

Marisol noticed it on a Tuesday in the second week of November, walking out of the elevator with her coffee in one hand and the green binder she had begun carrying everywhere in the other. The sound was not loud. It was the sound of a floor with people on it — the low hum of a half-dozen overlapping conversations conducted at the volume two engineers used when they were debugging in the same row, the occasional scrape of a chair, the click of a keyboard that had not been replaced since the migration and whose space bar had a particular hollow tap she had come to recognize as Tarun's. The sound was not the sound the eighth floor had made when she had started at Anchor in 2001, when the room had held sixty adjusters and the volume had been the volume of sixty people on phones. It was a different sound. But it was a sound, and the floor had not had a sound, of any kind, for the better part of two years.

She walked to her cubicle and set the binder down and shrugged out of her coat and looked, for a moment, around the room.

Three engineers sat at desks within fifteen feet of her workstation. Tarun, who was the closest, was twenty-six and from Hyderabad by way of Atlanta and had been with Anchor for four months and was currently running a diff against the policy-binding language extractor on his screen. Beyond Tarun, at what used to be Will Henderson's desk, a woman named Priya — not the Priya from customer service, a different Priya, an engineer who had joined three weeks earlier — was on a video call with her camera off, taking notes in a notebook with a fountain pen. Beyond Priya was a man named Rob who was sixty-two and had come out of retirement after thirty-one years at an actuarial consultancy in Hartford, and who had said in his first week that he had taken the job because the problem statement on the recruiting deck had been the first interesting problem statement he had read in fifteen years. Rob did not say much. He listened. When he asked a question it was always the question that had needed to be asked twenty minutes earlier and that no one in the room had quite formulated.

This was the texture, now. Engineers near her cubicle. A green binder she carried. A title — *Adjudication Quality Lead* — that had appeared in the directory three weeks ago without anyone making an announcement, because Karen had decided, and Aiden had agreed, that announcements would have required either celebrating Marisol or apologizing to her, and either gesture would have been wrong. Marisol had agreed too. She did not want an announcement. She wanted a green binder and three engineers in earshot and a problem worth being tired by.

She sat down. She opened the binder. The page she had left open from the night before was the one labeled, in her handwriting at the top, *Phrases that mean a real claim*.

---

Tarun came over at nine-forty.

He came over the way he had come over now nine or ten times since the beginning of the work — with a coffee for her and a coffee for himself and a laptop tucked under his arm, the kind of approach that meant he had something to ask but did not want to make her come to him to ask it. She had registered the pattern in the first week and had decided to allow it. There was a generation of engineers, she had come to understand, who had been trained somewhere along the way to bring coffee to senior people they were learning from. The coffee was not the point. The coffee was a structure for arriving at the conversation.

*I want to walk through the language signals again,* he said. He pulled up a chair, which had been parked next to her desk for the last three weeks and was no longer a guest chair but a working chair. *I have the model surfacing eleven phrases now. I think we have a calibration problem on two of them.*

*Which two.*

*"I just want this resolved" and "I just want to make this right."*

*Those are different,* she said.

*I know they're different. The model isn't sure they're different. The embeddings on the verb phrases are close enough that the surface treats them as variants.*

She nodded slowly. She picked up her coffee. She thought about how to say what she wanted to say.

*"Resolved" is a word people use when they want it to stop,* she said. *"Right" is a word people use when they want it to be right. The first one is fatigue. The second one is hope.*

Tarun wrote that down. He wrote it down in a notebook, with a pen, which was a thing the engineers did now that she had not expected. The Priya engineer wrote in fountain pen. Tarun wrote in a fine-tip ballpoint. Rob wrote in pencil, in a notebook that looked like it had come from a hardware store. They had begun, all three of them, to carry notebooks within a week of the first session she had run, and she had not asked them to do it, and she had not pointed out that they were doing it, but she had noticed and the notice had warmed something in her she had not realized had gone cold.

*Say more,* Tarun said.

*A policyholder who calls and says "I just want this resolved" has usually been somewhere in the system for at least six weeks. They have been transferred. They have re-explained their case more than three times. They no longer believe the outcome is going to be just. They want the file closed because the file being open is itself the source of the harm. If they get a denial, they will probably accept it, because the energy required to fight it has been exhausted out of them. They will also never buy another policy from us. They will tell their cousins. We will lose a generation of business in their family and we will not see the connection in any of our reports.*

She paused. She was warming up.

*A policyholder who calls and says "I just want to make this right" is somewhere different. They are usually in the first three weeks of the claim. They still believe the system is operating in good faith. They have an outcome in mind that they think is fair and they are trying to communicate it to you. They are also, almost always, telling the truth about the underlying loss. People who are running a fraud do not use the phrase "make this right." They use the phrase "what I'm owed." Or "what's coming to me." Or "what I have a right to." Right is a word policyholders use about the situation. Owed is a word policyholders use about themselves.*

Tarun was writing fast. She let him catch up.

*The model needs to learn to flag the second one for warm contact,* she said. *Not because the claim is necessarily complex, but because the policyholder is still recoverable. A human call at week three of a claim where someone has said "I just want to make this right" saves us money in the long term. The model should not decide that. The model should surface it. A human should make the call.*

*And the first one?* Tarun said.

*The first one,* she said, *is the one we have to call about whether or not the model surfaces it. The first one is the one where we have already failed. The call is to apologize. The model surfaces it for triage. We staff it for repair.*

Tarun stopped writing. He looked at the page.

*This is in your head?* he said.

*This is in my head,* she said.

*All of it.*

*All of it. Twenty-five years of it. Some of it from before I was at Anchor. Some of it from my mother, who was a hospital social worker in San Antonio and who taught me to listen for the second sentence.*

He looked at her for a moment.

*Thank you,* he said.

She nodded. She did not say *you're welcome,* because *you're welcome* would have made the moment performative, and the moment was not performative, and she had spent a long career learning to recognize when not to fill a silence with a courtesy that would change the shape of what had just happened.

He took his coffee and his laptop and his notebook and went back to his desk.

---

The work was not all conversations like that. The work was, mostly, the unglamorous compilation of what she knew. She sat with the binder at the round table in the small conference room down the hall most afternoons. She wrote down, in her own handwriting first and then typed afterward by an engineer who had been assigned to digitize her output, the patterns she had been holding in her head for two and a half decades.

The patterns were not the kind of thing that fit easily into a flowchart. She had tried, in the first week, to put them into flowcharts, and the flowcharts had read as either too simple to be useful or too complex to be usable. Tarun had been the one who had suggested, gently, that flowcharts might not be the right form. He had asked if she would try, instead, just writing them down as paragraphs. Just describing what she did when she looked at a claim. Describing what she noticed, in the order she noticed it, with the kind of grain a junior adjuster might be able to learn from over time.

She had not done anything like that since college.

She found, to her surprise, that she liked it. She found that the writing — the act of putting the patterns into sentences, the slow drafting of the thing she had been doing in her sleep for half her working life — clarified the patterns themselves. Some of the things she did, she discovered, were habits she had picked up from people who had trained her. Some of the things she did were the result of mistakes she had made early in her career and never made again. Some of the things she did, she could not, until she sat down to write them, articulate why she did them, and the articulation, in several cases, surprised her.

She wrote, for instance: *When a claim involves a small business owner of more than fifteen years' tenure, the policyholder almost always knows the original terms of the binding better than the carrier does. They will often, in their first call, reference language from the policy as it was written when they first signed it. The adjuster's job is to listen for this and check it against the policy as it currently exists. There is often a discrepancy. The discrepancy is usually in the carrier's favor. The policyholder is usually not lying. The policyholder is usually remembering accurately.*

She read this back to herself after she had written it and she sat for a long moment with the recognition that no one, in the three years of the automation, had built any signal at all for *the policyholder is remembering accurately and we should check our own paper.*

She added it to the binder. Page forty-one.

---

Aiden was in her cubicle three times a day.

He came at nine, usually, to ask about whatever Tarun had brought to him the night before. He came at one, after the engineers' standup, to walk through what the team was building that week and to ask whether the building matched what she had described. He came at four-thirty, most days, just to sit. He did not, the first few times, have a specific question. He came to the cubicle and sat in the working chair and asked her how it was going, and she had assumed, the first week, that this was a performance — a CTO making a visible point of listening — and she had answered him crisply and minimally and waited for him to leave.

By the third week she had stopped assuming.

He was, she had come to understand, doing something that she did not have a name for and that he did not seem entirely to have a name for either. He was apologizing without using the word. He was repairing something that he had broken, in a register that did not require either of them to acknowledge the breakage. She had decided, after the first month, that she would accept this. It was the kind of repair that her mother had recognized as the only kind worth taking seriously — repair conducted in the form of changed behavior over time, rather than declared in the form of a speech.

On the Thursday of the second week of November he came to her cubicle at four-thirty and sat down with a printout in his hand.

*I want to show you the first one,* he said.

The first one was a claim that had come through the new architecture the previous afternoon. A small commercial fire loss, two-hundred-twelve-thousand-dollar exposure, a deli on King Street, a kitchen fire that had spread to the dining room. The policy was clean. The cause of loss was clean. The model had handled the routine elements — coverage verification, deductible application, contractor estimate triangulation — without surfacing anything. The model had surfaced one thing, and only one thing, to a human adjuster's queue: a single line item in the contractor's estimate that referenced equipment the policy did not specifically schedule and that the model had flagged with the note *coverage ambiguous, judgment recommended*.

The human adjuster had picked up the case at ten-fifteen that morning, called the policyholder, learned that the equipment in question was a piece of refrigeration the deli owner had purchased six weeks earlier and not yet reported, asked the questions the model had surfaced for him to ask, made a determination — covered, under the policy's automatic-coverage rider for newly acquired equipment within sixty days — and closed the file by noon.

Marisol read the printout. She read it again.

She looked at Aiden.

*This is the shape,* she said.

*This is the shape,* he said.

She handed him back the printout. He folded it and put it in his pocket and stood up.

*I'm going to keep coming by,* he said.

*I know,* she said.

He smiled, briefly, the first time she had seen him smile in the building. He left.

---

At dinner that night she told her husband about the deli on King Street.

Eduardo was at the stove with the recaudo de pollo he made on Thursdays, because Thursday was the day his sister had made it when they were children and Thursday had become, by long marriage habit, the day he made it for the two of them. The kitchen smelled like achiote and tomato and the particular onion-smoke that her grandmother had called *el aroma de pensar*, the smell of thinking, because the kitchen had been her grandmother's place to think.

*The model did what it was supposed to do,* she said.

*Which is.*

*Which is notice the thing it didn't know and stop. Which is hand it to a person.*

Eduardo stirred. He had been a high school history teacher for thirty-four years and was retired now and made dinner on the nights she came home tired, which had become, in the last six weeks, most nights.

*And the person did what the person is supposed to do.*

*The person picked up the phone,* she said. *The person called the deli owner. The person asked when the refrigerator had come in. The person decided. The whole thing took two hours.*

*The person is the same person as before?*

*One of David's colleagues. A young woman from Hilton Head. She has been at Anchor four years.*

Eduardo nodded. He turned the heat down. He did not say anything for a long moment.

*You are tired,* he said.

*Yes.*

*Tired how.*

She thought about how to say it.

*I am being asked to think again,* she said. *I had forgotten what that felt like.*

He looked at her over the stove.

*Mari,* he said.

*I know,* she said.

He did not say anything else. He served the plates. They ate at the kitchen table by the window that looked west toward the spire of St. Philip's, the spire just visible against a sky that was the color of the inside of an oyster shell. The light had been going since five. She watched it go. She watched her husband eat. She thought about the dog her grandfather had kept when she was small, the merle border collie that had worked the small flock of sheep on her uncle's farm outside of San Antonio, and the way that dog had moved when her grandfather had whistled — the way the dog had not made the decisions about where the sheep went, had only made the decisions about how to move them where her grandfather had wanted them moved, had been the most precise instrument she had ever watched a man use without touching it.

She had not thought about that dog in twenty years.

She watched the last of the light go from the spire of St. Philip's, and she did not say anything to Eduardo about the dog, because there was no need to say it out loud. She held her coffee. She listened to the kitchen. The aroma of thinking was still on the air.
