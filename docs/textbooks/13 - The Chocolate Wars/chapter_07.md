# Chapter 7: The Andon Cord

Day eighty-three.

Two AM Tuesday in the third week of May.

The studio was empty.

Karim had walked out at one twenty AM after the last handoff on the Friday rollout video. The cleaning crew had finished at twelve fifty. The production interns had gone home at ten. Ana was at her house. The studio's HVAC made the small ticking noise the HVAC made when nobody was in the building.

Jimmy was at his desk.

He had not slept more than four hours in any of the previous nine nights.

The wall calendar in the studio's main office four rooms away — the wall calendar he had not been able to walk past at any hour of any day for the past eleven weeks without looking at — read, on the small square for today: *83 / 90.*

Seven days left.

He had not, in eighty-three days, found the model.

He had, in eighty-three days, won every external fight he had been in.

The Hershey cease-and-desist withdrawn at four eighteen PM on the Friday eleven weeks ago.

The Walmart shelf expanded by one SKU on the Thursday eight weeks ago.

The chocolate-aisle video at two hundred and forty-one million views.

Marcus Whittaker still searching, on every internal-comms intercept Lin's research team had been picking up across the past three weeks, for a leak inside Hershey's that did not exist.

Carla Hernandez promoted, the previous Monday, from senior vice president to executive vice president of food and consumables — David Yi's old job — on the strength of a recommendation from the chief merchant that David himself had written.

Thandi's eighth school in Underberg ribbon-cut on the Saturday morning of the week before, with Thandi in the front row and the regional officer from the provincial education department on the small stage and the head teacher Nomsa receiving the first thirty-two children of the first term at seven AM local time.

The Beast Philanthropy ledger was sitting on three hundred and eleven thousand U.S. dollars of additional disbursement capacity above what it had held at the start of March, almost entirely on the back of the Walmart-aisle-video sell-through spike.

He had, on every external metric the empire tracked, run the best eleven weeks of his nine years.

He had not, on the small note in his phone that he had opened at four sixteen AM eleven weeks ago and added two-line entries to seven times since, written one usable sentence about what the model actually was.

He was, at two oh-six AM Tuesday on day eighty-three, on Hacker News on his phone.

He had been on Hacker News on his phone for forty-one minutes.

The top of the front page was the usual mix — three AI-model release announcements, a writeup of a quantum-computing milestone, a postmortem of an outage at a major payments provider, a long-form essay on the history of typography on the iPhone.

The eighth post on the page was something else.

The eighth post was a link to a GitHub repository.

The title of the post was: *Show HN: Agicore — deterministic systems-authoring platform for AI-native organizations.*

The post had eighty-three points and forty-one comments.

Jimmy noticed the post had eighty-three points.

He noticed because the wall calendar four rooms away read eighty-three.

He clicked the link.

---

The GitHub repository loaded at two oh-seven AM.

The repository was owned by an account called *Binary-Blender.*

The repository had, on the small bar at the top of the about page, one thousand and forty-seven stars and nineteen contributors and three hundred and forty-one open issues.

The README began with one bold sentence at the top of the page:

*Agicore — A deterministic systems-authoring platform for AI-native organizations.*

Jimmy read the sentence.

He read the second paragraph.

The second paragraph said:

> *Agicore separates AI intelligence from runtime execution. AI handles interpretation, planning, and generation. Deterministic runtimes handle execution, validation, and reliability. The boundary between them is a DSL.*

He read the third paragraph.

The third paragraph said:

> *This is not an agent framework. It is not a chatbot. It is not no-code. It is infrastructure for building AI-generated systems you can actually trust.*

He sat back in his chair.

He read the next eleven thousand words in one hundred and eleven minutes.

He read them without taking a single drink of water.

He read them without checking his phone.

He read them without standing up.

The README walked through, in the order it walked them, the sixty-second pitch, the core principle — *AI is never trusted at runtime* — the DSL layer, the build-time AI integration model, the runtime determinism guarantees, and the architecture of the system the project's author had named *the Andon Loop.*

The Andon Loop section was titled, in plain text:

*The Andon Loop — Continual Harness, Inverted.*

Jimmy stopped at the section.

He read it four times.

The section opened:

> *"Continual harness" is the current frame for AI systems that adapt themselves — agents whose prompts, policies, sub-agents, and workflows evolve over time instead of being engineered manually. Every implementation in the wild today keeps AI in the runtime loop and tries to govern the chaos: observability layers, policy engines, evaluator stacks, retry budgets, retreat-to-known-good logic. Each layer adds operational burden while preserving the underlying nondeterminism. The AI is in the path; you're managing its blast radius.*

> *Agicore inverts this. AI lives at the edit boundary — proposing, never executing. A deterministic expert system runs at runtime. When something fails, the expert system pulls an andon cord; AI is invoked to propose a fix; the fix flows through tier verification, sandbox testing, optional shadow evaluation against live traffic, and optional N-of-M human approval before it touches production. Every transition lands on a SHA-256 hash-chained tamper-evident ledger with an optional off-DB file-system mirror.*

> *The result: continual self-improvement without runtime nondeterminism. The system can have AI write its own rules — but AI cannot bypass the deterministic gates between proposal and production.*

He read the three paragraphs again.

He read them out loud.

He read them out loud a fourth time at two thirty-one AM.

He looked at the ceiling.

He looked at the empty water bottle on the corner of the desk.

He looked at the laptop screen.

Underneath the three paragraphs was a comparison table. Two columns. Standard continual harness on the left. Agicore Andon Loop on the right. Five rows.

The fifth row asked the question *Can AI expand its own authorization?*

The standard-continual-harness column answered: *Hard to prevent; depends on policy correctness.*

The Agicore-Andon-Loop column answered: ***Mechanically blocked** — the tier verifier rejects any proposal whose scope exceeds its claimed tier, before the sandbox runs.*

Under the table, in plain text, the README said the last row was the load-bearing one. The README said the property was *not a hope, a guardrail, or a policy that could be misconfigured.* The README said the property was *mechanical.*

He read the row a third time.

He sat back.

He stared at the screen for ninety seconds.

In the ninety seconds, four recognitions landed.

One. Ana Vasquez had sent him a five-to-seven-thousand-word Monday operating brief every Monday morning for the past two years. The briefs had been the only legible picture of the empire he had received in those two years. Each brief took Ana approximately fourteen hours to write across Saturday and Sunday. The reason the briefs took fourteen hours was that nothing in the empire reported up consistently. Ana was the legibility layer. There was, on every honest read of the past two years, no other.

Two. The empire ran, on Ana's running spreadsheet she had walked him through in his office last September, on seven separate customer-relationship-management tools across the thirteen LLCs, four separate enterprise-resource-planning instances, three project-management platforms nobody trusted, a legal-hold system the general counsel's office had bought in 2022 and never deployed, a learning-management system the head of HR had licensed for fifty thousand dollars a year that nobody completed, a quality-management spreadsheet Karim had maintained by hand since 2019, and a customer-service inbox that escalated every other ticket directly to Karim's personal phone. The total annual spend on the SaaS stack was approximately forty-three million dollars. None of the tools talked to each other. The constraints that should have lived in the tools lived in Jimmy, in Ana, and in Karim. The forty-three million dollars was decoration around three humans remembering everything.

Three. The Andon Loop in the README was the constraint boundary the empire had not had for nine years. Sign the constraints once. Enforce them mechanically. Forever. The forty-three million dollars went away. The three humans got their evenings back. The empire became readable to a system instead of to a chief of staff working her seventh consecutive eighty-hour week.

Four. The Hershey Company was, on every operational read of three years of earnings transcripts, the largest publicly-traded example in North America of an organization whose operating constraints lived in a hundred and twenty-eight years of cultural memory, twelve commercial SAP modules, and forty thousand undocumented handoffs across eighteen thousand employees. The README said, in plain English, the architecture for moving every one of those constraints into signed declarative code that compiles on a laptop. The architecture existed. It was open source. Hershey's was not, on the current trajectory, going to find it. Jimmy was.

He looked at the Andon Loop section a fifth time.

He picked up his phone.

He called Ana.

---

Ana answered on the second ring.

It was two forty-seven AM.

*"Jimmy."*

*"Ana."*

*"It's quarter to three. The Monday brief is on your desk. The Friday rollout video clears post at six AM. Why are you calling me."*

*"Ana."*

*"Yeah."*

*"I think I found it."*

Ana was quiet for a beat.

*"Jimmy."*

*"Yeah."*

*"Are you all right."*

*"I'm all right."*

*"What do you mean, you found it."*

*"The model. The thing Thea gave me ninety days to find. I am sending you a link. Open it on the laptop. I am going to stay on the line while you read."*

Jimmy texted the GitHub URL.

Ana, on the line, set the phone on her kitchen counter. Jimmy heard the sound of a chair, then a laptop fan, then the small click of a trackpad.

*"Ana."*

*"Reading."*

Forty-three seconds of silence.

*"Ana."*

*"Reading."*

A minute and forty seconds.

*"Ana."*

*"Jimmy. I'm reading. Stop asking. I'll talk when I have something."*

Eleven minutes.

Jimmy heard, through the line, the sound of Ana scrolling, the small intermittent ticking of her trackpad, the occasional intake of breath when she landed on a paragraph that did to her what the same paragraph had done to Jimmy four hours earlier.

At fourteen minutes Ana spoke.

*"Jimmy. Stay there. I'm going to walk through this with you. Are you at the section called The Andon Loop — Continual Harness, Inverted."*

*"I'm at it. I've read it eight times."*

*"Scroll down past it. Find the section about the Accelerando Stack. There's a code block. Eighteen file names."*

Jimmy scrolled. The block was on the screen.

*"I'm there. Eighteen files. Twelve enterprise. Six healthcare."*

*"Read me the first six names."*

*"Accelerando ERP. Accelerando Billing. Accelerando Legal. Accelerando LMS. Accelerando PI CoE. Accelerando QMS."*

Ana was quiet for a beat.

*"Jimmy. I am going to map those onto what we are running right now. You are going to listen."*

*"Listening."*

*"Accelerando ERP replaces NetSuite at MrBeast LLC, the QuickBooks instance Feastables runs separately, the Sage installation Beast Industries inherited in the 2022 acquisition, and the in-house line-item tracker Beast Games has been duct-taping together since season three. Four contracts. Approximately nine point two million dollars a year. Zero of them talk to each other. I reconcile them by hand in the Monday brief."*

*"Yeah."*

*"Accelerando Billing replaces the medical-billing engine the Beast Industries employee-clinic operation has been licensing from a vendor in Atlanta. One point one million a year. We use approximately eighteen percent of what we pay for."*

*"Yeah."*

*"Accelerando Legal replaces the legal-hold tool your GC bought in 2022 that nobody has logged into since the third week of deployment. Six hundred and forty thousand a year. We are, on my honest read, exposed on three separate matters because we are not actually running legal hold the way we tell counsel we are."*

*"Ana."*

*"Yeah."*

*"You have been telling me about the legal-hold tool for two years."*

*"For two and a half. I'm going to keep going. Accelerando LMS replaces the learning-management system Renata licensed for fifty thousand a year for compliance training nobody completes. Accelerando PI CoE replaces the Six Sigma consultancy your COO wanted to retain in Q4 of last year and you, correctly, said no to. Accelerando QMS replaces the spreadsheet Karim has been maintaining by hand since 2019. Are you with me."*

*"I'm with you."*

*"Keep reading me the names."*

*"Accelerando OIE. Accelerando ES. Accelerando Chatbot. Accelerando Eliza. Accelerando Config. Accelerando Interchange."*

*"OIE is an intelligence layer. It replaces the Monday brief. Every Monday brief. The one I write across Saturday and Sunday. The one that takes me fourteen hours. It replaces that brief and the four hundred and ten coordination dependencies I hold in my head to write it. Eliza is the operator interface. Eliza replaces me. Not in two years. Not in eighteen months. Now. In the configuration the README describes, Eliza replaces my office on the day we deploy. Interchange replaces every Zapier zap, every n8n workflow, every middleware contract I have personally signed in two years. Total annual SaaS spend across the thirteen LLCs, by the number I gave you in February, was forty-three point one million dollars. Eighteen text files."*

Jimmy did not respond.

*"Jimmy."*

*"I'm here."*

*"One more thing on the money. The forty-three million is rent. Every contract on the list is a perpetual subscription on someone else's compiled binary, with seat-count escalators, an annual renewal cycle, a roadmap we do not control, and a procurement office in Pleasanton or Walldorf or Redmond deciding what we get next. The README is not rent. The README is a compiler. We write the eighteen files. We own the eighteen files. The license is MIT. The compiler runs on a laptop. The AI cost lives at compile time — the README is explicit, it says the runtime has zero AI in it, the model was paid for once when the file compiled and never runs again per user request — which means the marginal license cost of a Feastables transaction, after the rebuild, is approximately zero. Forty-three million in rent goes to zero. The eighteen files cost what one chief of staff and one head of production and one founder and the build team we already have on payroll cost, for the six weeks the rebuild takes. After that, the cost of running the empire's software is the electricity bill on the Tauri binaries on the laptops we already bought. The math is not, on any honest read, a cost-reduction. The math is the elimination of a category."*

Jimmy did not respond.

*"Jimmy."*

*"I'm here."*

*"Scroll up to the section about skill documents. SKILLDOCS. Read the first paragraph."*

Jimmy scrolled.

He read.

The paragraph described SKILLDOCS as signed declarative artifacts — taste, judgment, and operating preference captured once, governance-locked, propagated mechanically into every downstream proposal the AI surfaces. Signed by named humans. Audited on every action. Clearance-required where the signer dictates clearance.

He read the paragraph again.

*"Ana."*

*"Yeah."*

*"This is Tyler."*

Ana waited.

*"Ana. This is what I do with Tyler Conklin. I have been doing this with Tyler since the spring of 2021. Sunday afternoons. Four hours. We go through thumbnails. He is, on every honest read of four years of shipped work, an effective proxy for my taste. Every thumbnail the studio ships wears my taste because Tyler shipped it. Tyler does not miss. Tyler is the mark. The reason every thumbnail wears my taste and every Feastables wrapper does not is that there is one Tyler, and there are not, on any honest accounting of my own time across the past nine years, enough Sunday afternoons in a calendar year to compile one Tyler per design surface. Tyler is one person. Tyler is also, on his own honest ambition in the conversations we have had since the summer of Year Seven, a person who should have been doing higher-leverage work for two years already. He should be running the studio's design language. He should be signing off on whole campaigns. He should be mentoring his own people. The Sunday afternoons have, on this read, cost Tyler three years of his own career — because the only way I had to scale my taste was to put it in his hands one hour at a time, and the only way Tyler had to make himself useful at the scale of my output was to be the hands."*

*"Yeah."*

*"The README says I do this on a Saturday. I dictate the wrapper-aesthetic SKILLDOC into a recording app for an hour. You edit it into seventeen hundred words of declarative prose on Sunday. I sign it Monday. The wrapper pipeline wears my taste by Monday afternoon. Tyler took four years. The SKILLDOC takes a Saturday. Tyler is one person who became my taste at the cost of three of his own years. The SKILLDOC is the entire studio at the cost of one Saturday afternoon. And Tyler — Tyler gets his career back."*

*"Yes."*

*"Ana."*

*"Yeah."*

*"I have been mentoring one person at a time for nine years because I have not had any other way to transfer my taste. This is the other way."*

*"This is the other way."*

A beat.

*"Ana. There's a third thing. The README keeps using a phrase I want to walk through. *Statistical process control.* SPC. The Andon Loop runs every AI proposal through tier verification, sandbox testing, optional shadow window, and an approval chain. The system accumulates evidence of its own reliability over time. The approval thresholds loosen as the evidence accumulates. Tier one — small parameter tweaks, minor copy revisions — starts at human-required. After thirty consecutive days at the sandbox-pass threshold, tier one auto-deploys. Six months in, tier two. Year one, tier three governance items might still be human-required, but the daily volume of small decisions that no longer needs me is, on the math in this section, going to be ninety-eight percent of the things I currently look at."*

*"Yeah."*

*"I do not have to hand the reins over on day one. I hand them over on a curve the regression data justifies. The system earns the loosened threshold by holding its sandbox-pass rate above the bar for thirty straight days. Then it auto-deploys at that tier. Not before. Then six months in, the next tier earns its bar. Then year one, the next. I am not, in three months, on my phone in the studio at two AM. I am not, in nine months, signing every site Thandi sends me over five hundred thousand. I am not, in eighteen months, the bottleneck. The system, by then, has earned the trust. The trust is on the ledger. The ledger does not lie."*

Ana was quiet for a long beat.

*"Jimmy."*

*"Yeah."*

*"I have been waiting for this README for two years. I did not know what it was called. I knew it had to exist. I have told you every Monday for thirteen months that the coordination overhead was going to break me before it broke the empire. The README ends the coordination overhead. The README starts your life. I'm in. Whatever the next twelve months look like — I'm in. I will be at the studio at six fifty AM."*

*"Ana."*

*"Yeah."*

*"The fourth thing. Scroll to a section called What's Worth Building With This. Read me the first archetype."*

Ana scrolled.

She read.

The archetype was titled *Replace your company's entire ERP.* The archetype said, in the second paragraph, that SAP S/4HANA implementations were routinely two-hundred-million-dollar projects on five-year timelines, and that they ossified the day they went live. The archetype said the Andon Loop added what SAP had never had — a tier-verified, sandbox-tested, audit-chained way for the rules to keep evolving without re-implementing every two years.

Ana read it again.

*"Jimmy."*

*"Yeah."*

*"The Hershey Company runs SAP. The Hershey Company has been running SAP since 2008. The deployment cost approximately one point one billion dollars across six years. The last material rule change anybody on the inside of that building can describe was a chart-of-accounts revision in 2019. Eight months. Six million dollars in consulting. We are competing against an organization that physically cannot adapt at the speed we already operate at without this README. With this README we are not, on any honest read, competing against them at all. We are running past them on a different substrate."*

*"Ana."*

*"Yeah."*

*"This is the kill shot."*

*"This is the kill shot."*

*"This is also the way I get to be at the kitchen table on a Friday at six PM."*

*"Yes it is."*

A long beat.

*"Ana."*

*"Yeah."*

*"There's one more thing. Scroll to the repository structure section. There's a directory called *apps/agicore-studio.*"*

*"I'm there."*

*"Click into it."*

Ana clicked.

The directory's README came up. Agicore Studio. A visual IDE for the `.agi` DSL. Make.com-shaped node canvas paired with a CodeMirror text editor, two-way text↔canvas binding, per-node debugger with breakpoints and step semantics, context-aware autocomplete on the DSL, integrated test runner, git status in the explorer rail, project-wide search, multi-window, crash recovery with autosave drafts, opt-in telemetry, opt-in crash reporting, auto-update via GitHub Releases, a five-provider AI key vault, six bundled sample workflows, accessibility pass, internationalization scaffold. Sprint 0 through RC. v0.1.0-beta.2 shipped.

Ana scrolled the directory listing.

She saw a file called *ESTIMATE.md* in the root.

She clicked it.

The first heading on the file read: *What this would have cost in the old world.*

She read for ninety seconds.

She read it a second time.

*"Jimmy."*

*"Yeah."*

*"This file is a back-of-the-envelope traditional-engineering estimate for what the IDE we are looking at would have taken if it had been built by a normal team of humans at 2026 market rates. The methodology is IFPUG function-point counting cross-checked against COCOMO II. The two methods are independent. The two methods agree within two percent. The estimate is four hundred and nineteen adjusted function points. Fifty-two person-months. Eight thousand three hundred and twenty person-hours. An eight-FTE team — product manager, business analyst, UX designer, tech lead, two software engineers, QA, half a DevOps engineer, half a technical writer. Seven to eight calendar months at realistic team velocity accounting for Brooks's-Law overhead. Six hundred and sixty-five thousand dollars in loaded cost. Range of six-fifty to six-eighty."*

*"Yeah."*

*"Now look at the commit history on this directory."*

Jimmy clicked the *commits* link on the agicore-studio subdirectory.

The commit log loaded.

Sixty-three commits.

First commit at eight seventeen oh-four AM Central on May twenty-sixth. *feat(agicore-studio): source-of-truth .agi files + canonical workflow fixture.*

Last commit at two fifty-seven eleven PM Central on May twenty-seventh. *docs(agicore-studio): traditional-engineering cost/effort estimate.*

Wall clock between the two: approximately thirty hours and forty minutes.

Jimmy scrolled the timestamps.

A clean cluster from eight seventeen to eighteen thirty-four on the first day. A clean overnight gap. A second clean cluster from six fifty-one to fourteen fifty-seven on the second day. The two clusters totaled approximately twelve hours of actual focused work, with the rest of the wall clock being sleep, meals, and whatever a single open-source maintainer does in the kitchen of a small house in Missouri in the evening hours between his afternoon session and his morning session.

One contributor.

Twelve hours.

Jimmy did not respond.

Ana did not respond either.

Sixteen seconds.

*"Jimmy."*

*"Yeah."*

*"The estimate document on this directory is honest. The methodology is rigorous. The numbers are defensible. I have seen this estimate before. Disney's content-tooling group submitted an estimate of this shape to me in late 2024 for a vendor IDE — different domain, similar scale. The vendor's bid was eight hundred and twenty thousand dollars and seven months. We took the bid. The tool shipped on time. The tool works. The numbers in this estimate are not, on any honest read, padded."*

*"Yeah."*

*"The commit history on this directory says one person shipped the same scope in twelve hours."*

*"Yeah."*

*"This is not the 'AI helps you code faster' study. I have read every 'AI helps you code faster' study published in the past three years. The honest numbers are real and they top out at about thirty to forty percent productivity gains on coding tasks. This is not thirty percent. This is not three hundred percent. The arithmetic on what we are looking at is approximately five hundred to seven hundred times what an eight-person team produces at 2026 market velocity, depending on how you bracket the focused-coding hours against the wall-clock. Three orders of magnitude is not a productivity gain. Three orders of magnitude is a paradigm shift. Whoever this person in Missouri is, he has not just shipped a new piece of software. He has, on every honest read of this directory, demonstrated that the architecture the README describes makes the platform's own tooling cost approximately the electricity bill on his laptop to produce. The IDE on the screen is not a tool the project built around itself. The IDE is the proof of the operating model. The operating model is: one person, with the right substrate, ships what an eight-person team in seven months ships, in twelve hours, at the same quality bar, signed off the same morning, shipped on the same release tag."*

*"Ana."*

*"Yeah."*

*"You said paradigm shift."*

*"I did."*

*"You do not say paradigm shift."*

*"No I do not. I have used the phrase once before in my career. I used it on Bob Iger in 2024 about generative video. I was wrong by about two years on the timeline. I am not, on this read, wrong about this one. This is the second time I will have used the phrase. This is the right time."*

A long beat.

*"Ana."*

*"Yeah."*

*"We are not, in any scenario, walking into that kitchen with a check."*

*"We are not."*

*"We are walking in with the work."*

*"We are."*

A long beat.

*"Ana."*

*"Yeah."*

*"Wednesday at seven AM. You, me, Karim. I'm going to spend tomorrow reading this README again and looking at the example apps. We'll talk Wednesday morning."*

*"Jimmy."*

*"Yeah."*

*"Before you hang up. Who wrote the README."*

*"I haven't checked the about page. Let me check now."*

*"Check now."*

Jimmy clicked the about page.

The page was three sentences.

He read them twice.

*"Ana."*

*"Yeah."*

*"The repo is owned by an account called Binary-Blender. The README author signs the footer as *C.* By the commit history he's been committing at about fourteen commits a week for the past eleven months. By the contributors list, no other consequential contributors. On the project's website — linked from the README — there's a small page that says the project is being built by one person in a small town in Missouri because the operating model it encodes is, in his own words, the operating model AI-native organizations are going to be built around in the next decade. Single person. Lives in Missouri. Says he is *doing what he can with what he has.*"*

Ana was quiet.

*"Ana."*

*"Yeah."*

*"A single person in Missouri."*

*"A single person in Missouri."*

*"The model I have been looking for for eighty-three days is being maintained by one guy in Missouri."*

*"On what the README says, yeah."*

Ana was quiet again.

*"Jimmy. Whatever the interaction with that person looks like, it is going to be the most important interaction of the next phase of the empire. We are not going to walk in with a check. We are going to walk in with the work. We are going to walk in asking permission to sit at his kitchen table. Think about it tonight. We will figure it out Wednesday."*

*"Ana."*

*"Yeah."*

*"I'll think about it tonight."*

*"Good."*

Ana hung up.

---

Jimmy set the phone on the desk.

He looked at the screen.

He looked at the *issues* tab at the top of the repo.

Three hundred and forty-one open issues.

He looked at the *new issue* button.

He did not click it.

He opened a separate text document on his laptop.

He drafted the issue.

The draft ran eleven sentences.

The title was: *I think we have been doing the same thing.*

The body opened: *Jimmy Donaldson. I have been running a manufacturing operation on YouTube and on the chocolate aisle for nine years. I have been doing it without knowing I was doing it. I read your README tonight. I recognize the Andon Loop. I have been doing the Andon Loop without knowing it had a name.*

The body closed: *I would like to talk. I would like to learn what your project does that my organization can use. I would also like to talk about what my organization does that your project can use. We have, in operational terms, been doing the same work in different rooms. Let us see if we should be in the same room. — Jimmy.*

He read the draft three times.

He did not change a word.

He saved the draft.

He did not post it.

He closed the laptop.

---

He stood up.

He walked to the corner of the office.

He turned off the small lamp Karim had bought him for his thirty-first birthday.

He walked to the studio kitchen.

He filled a glass from the filtered tap.

He drank the water.

He set the glass in the sink.

He walked out of the studio.

He drove home in the dark.

The Greenville streets were empty.

He arrived at the house at three twenty-two AM.

He walked into the bedroom.

Thea was asleep.

He undressed quietly.

He lay down next to her.

He closed his eyes.

He did not, in the next twenty-eight minutes, fall asleep.

He thought, in the twenty-eight minutes, about Ana at her kitchen counter at three AM reading the README in eleven minutes and naming, on the line, every contract she had been signing for two years; about Tyler on the Sunday afternoons going back four years; about SPC and the loosened threshold on a thirty-day window; about forty-three million dollars going to zero; about the guy in Missouri; about Thandi in the third classroom; about Eleanor Whitcomb in the boardroom in Hershey; about the seven days left on the runway; about the eleven thousand words in the README; about the small note on his phone that had, between the last time he had touched it and now, become legible to him for the first time.

He thought, at the end of the twenty-eight minutes, one sentence.

The sentence was:

*Thea. I found it.*

He did not say it out loud.

He fell asleep at three fifty-one AM.

He slept until six oh-eight.

He woke up next to Thea, still asleep.

His first conscious thought of the morning was the same sentence:

*Thea. I found it.*

He did not say it out loud.

He got out of bed.

He showered.

He drove to the studio.

He was in the office at six forty-seven AM.

The seven AM Wednesday meeting with Ana and Karim was twenty-four hours and thirteen minutes away.

He was ready for it.

The GitHub issue was in a saved draft on his laptop.

The issue was going to post Wednesday at ten oh-six AM Eastern, the moment Ana and Karim walked out of the office at the end of their meeting.

The runway had seven days left.

Seven was the number.

The model was in the README.

The README was in Missouri.

Missouri was the next stop.

The cord was, on Jimmy's first honest read of his own life in the nine years of the empire, about to leave his hand for the first time in nine years.

The cord was the cord.

The cord was going on a USB drive.

He sat down at his desk.

He poured himself a cup of coffee from the office coffeemaker Karim had set to brew at six forty-five every weekday morning of the past four years.

He drank the coffee.

He waited for Ana.

Day eighty-four started at midnight.

Six days after that, the runway would be the runway.

Six days after that, the model would be on Thea's kitchen table.

He had it.

He just had not built it yet.

He drank the coffee.

The studio woke up around him.
