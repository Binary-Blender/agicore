# Chapter 8: The First Customer

Reese Okonkwo was at the office at six oh-three AM Monday — the second Monday after the Sallinger meeting — and he walked the seventh floor of the Carrick Cloud building in the pre-dawn dark with a coffee in his hand, his right knuckles rapping on each conference room door as he passed.

It was something he had been doing for eleven years.

He did it on the days he was about to give bad news.

He was about to give bad news.

The bad news was that the platform he had built across the previous four years as an experimental unit inside Carrick Cloud — Carrick Carry, thirty-eight engineers, a thirty-thousand-square-foot fulfillment site in Renton, a half-page write-up in the Year Minus Two annual report — was, as of six fifteen AM Pacific eleven days earlier, the strategic center of a seven-hundred-and-twenty-billion-dollar company that had been a retailer for thirty-one years and was about to stop being one across the next seven.

The bad news, for the thirty-eight people on the engineering team, was that they were the engineering team of the platform layer the entire company was going to depend on.

They were going to triple in size by Q2 and quadruple by Q4.

They were going to ship product on a timeline the team had been planning across thirty months that was now compressed into twelve.

They were going to absorb four hundred and twenty engineers from the Carrick Retail systems organization across the same twelve months.

They were going to sign their first major enterprise customer inside ninety days.

They were going to do it under the spotlight of a board, a press, an activist investor, an antitrust subcommittee, and a hundred competitors who had been quietly waiting for Carrick to make this move and who were, as of eleven days earlier, no longer waiting.

Reese had known the news was coming for at least two years.

He had not known it was coming on a Monday morning in October.

He had been told by Cole, in Cole's office on the Saturday afternoon before the memo, in a conversation Reese had been invited to without being told the agenda. Anjali in the room. Owen in the room. Diana not yet brought in. Cole had walked Reese through the memo. Then asked one question.

*Reese. Are you ready.*

Reese had said: *Cole. I'm as ready as I'm going to be. I'm not going to lie to you. I have not run a business of this size before. I'm running it now.*

Cole had said: *That's the right answer.*

That had been the conversation.

Eleven days later Reese was walking the seventh floor at six AM with the coffee in his hand and the news in his head and the dashboard he was about to open on the wall display in his office at six-ten waiting to tell him what the platform was doing on the morning the team came in to find out what the previous eleven days had done to their lives.

He turned the dashboard on.

The platform-tenant equality metric was 1.00.

Trailing-thirty-day inbound enterprise prospect count: sixty-four.

Sixty-four was, in raw count, more inbound interest than Carry had received in any month before the memo.

The memo had done the work.

---

He held the seventh-floor all-hands at seven AM.

Two hundred and eight engineers in the auditorium at the back of the building. Eighty-six on the live stream from Bellevue. Forty-one from Phoenix. Twelve from London. Three from Tokyo.

Reese stood at the lectern.

No slides. No script.

"Good morning. I'm going to tell you four things. I'm going to tell each of them once. I'll take questions for an hour after. The four things are these."

He looked at the room.

"One. The memo Cole sent ten days ago is the strategy of the company. Carrick Carry *is* the company. We are not a unit inside Cloud. We're the platform layer. The cloud team is going to be reorganized into the platform layer across the next ninety days. I'm the executive vice president of the platform. Anjali Rao is the COO. Owen Friedlander is the CFO. Cole is the CEO through Year Four. I'll be the CEO inside that window. None of that's news. All of it's true."

A pause.

"Two. The platform is shipping seven products under one umbrella across the next twelve months. Carry Fulfillment, Carry Logistics, Carry Customer Service, Carry AI Agents, Carry Identity, Carry Payments, Carry Returns. The team that has built Carry Fulfillment is the team that ships it at thirty times the current volume by Q3 of Year Two. The team that has built Carry Logistics is the team that ships it at sixty times current volume by Q3. The team that has built Carry AI Agents is the team that ships it at a scale this room has not yet seen in any product. The team that has not yet existed — Carry Identity — is being hired starting today. The first hire is Hiroko Tanaka. She's been head of identity at Stripe for the last four years. She signed her offer letter at 2:11 PM Pacific Saturday. She starts Wednesday."

The room moved a little. Someone at the back said *no shit.*

Reese smiled.

He kept going.

"Three. The first major enterprise customer is going to sign inside ninety days. I'm not going to tell you who it is this morning. I'll tell you that the customer's CEO has been in conversation with me for fourteen months. The conversation became a commercial negotiation in March of last year. The negotiation was paused for two weeks after the memo. The conversation resumed last Tuesday. The customer is one of the twelve largest retailers in the United States. The customer is, at the moment, a competitor of Carrick Retail. The customer will, when the contract closes, run on the same platform that Carrick Retail Co. is going to run on after the ESOP transition. The two of them are going to be the first two anchor tenants of a platform that will, by the end of Year Three, have one thousand four hundred tenants on it. The platform is going to charge them both the same fees on the same products on the same SLAs. The platform is going to compete with neither of them. The platform is going to own neither of them. That's what we're building. That's what we're shipping."

A pause.

"Four. The hiring plan. We're adding nine hundred and fifty engineers to this team across the next twelve months. The first hundred are already in pipeline. The next two hundred are people some of you in this room are about to be asked to recruit, and the people you're about to be asked to recruit are colleagues you've worked with at other companies for the last ten years, and I'm going to ask you to call them this week. The third hundred are leaders. The fourth hundred and fifty are junior engineers we are pulling from the new-grad pipeline at the schools we recruit from. We're going to need every one of them. We're also going to need to absorb four hundred and twenty engineers from the Carrick Retail systems organization across the same twelve months. Some of those four hundred and twenty are going to be in the engineering all-hands two weeks from now. Some of them are people some of you in this room have worked with for years. Treat them well. They are not refugees. They are colleagues. The retail systems team has been running the operating systems of this company for fifteen years and they are good at what they do. They are coming to the platform because the platform is where the work is. Make them welcome. Help them be productive on the new stack. We're not going to have time to lose to integration friction."

He stopped.

"That's the four things. I'll take questions for fifty minutes."

He took questions for an hour and twelve.

---

Liam Hwang walked into Reese's office at seven fifty-one AM the following Wednesday with a laptop open in his hands and the expression of a man who had been awake since two.

"Reese."

"Liam."

"I need eleven minutes."

"You have eleven minutes."

Liam set the laptop on Reese's desk and turned the screen.

The screen showed a GitHub repository called *agicore*. Owner: an account named *Binary-Blender*. One thousand and forty-seven stars. Nineteen contributors.

"Walk me through it."

"Open-source DSL-to-Tauri-app compiler. Single `.agi` file compiles to a multi-tenant Axum web service plus React frontend plus Postgres migration plus Rust commands plus typed TypeScript invoke wrappers plus a test suite. Eighteen reference apps in the examples repo cover the full enterprise stack — ERP, billing, legal, LMS, QMS, intelligence layer, governance layer, interchange. Each app is one `.agi` file. Deployment is `docker-compose up`. The runtime is deterministic — no AI at runtime, AI lives only at compile time. There's a section on the README called the Andon Loop that wraps AI-proposed rule mutations in tier verification, sandbox testing, optional shadow-window evaluation, and ordered N-of-M approval chains before they touch production. Every state transition lands on a SHA-256 hash-chained ledger. The compiler's at nine thousand seven hundred lines of generators. Test count says thirty-two hundred passing across parser and codegen. Maintainer is one person in a small town in Missouri who calls himself C.B. Funding model is one Shopify storefront. Sponsorship page accepts none."

"Liam."

"Yes."

"You think this is real."

"I have spent the last eleven hours of my own time on it, including a docker-compose-up of the example ERP on my laptop at three this morning. The system came up clean. I loaded a Carrick Cloud staging dump as a test load. The dashboard rendered. The OIE intelligence layer surfaced a per-customer cohort recommendation I have personally been trying to get our internal BI team to flag for sixteen months. I think this is real. I think Cole needs to see it before noon."

Reese closed the laptop.

He picked up his desk phone.

He called Cole's chief of staff.

"Margot. Reese. I need fifteen minutes with Cole today. Before close of business. Topic is the substrate stack for the Carry build. It is not a one-week conversation."

Margot put him on hold for nine seconds.

She came back.

"Eleven thirty in his office. He will give you twenty."

"Eleven thirty."

He hung up.

He looked at Liam.

He said: "Come with me. Bring the laptop."

---

Cole read the README in his office on his own laptop at eleven thirty-one AM.

He did not ask Reese or Liam to walk him through it.

He read.

Liam stood at the window with his hands behind his back and counted the boats on the Sound.

Reese sat in the chair across from Cole's desk and did not move.

Cole read for twenty-two minutes.

At eleven fifty-three he looked up.

He said: "Reese."

"Yes."

"This is the substrate."

"It is."

"How long has this been on Hacker News."

"Front page Sunday night. Eighth post. The eighth post had eighty-three points at the time my engineer who flagged it for me saw it."

"How many of our people have seen it."

"Liam. Two of his senior architects he pulled in last night. Three engineers on the marketplace-services team who were in the same Slack channel when Liam mentioned it. Approximately nine total. Nobody on the executive staff except us."

"Margot."

Margot stepped into the office.

"Cole."

"Conference room A on the seventh floor. Six PM. I want Reese, Liam, Anjali, Owen, the four senior architects on the Carry build, the head of Carrick Cloud infrastructure, the head of platform security, and Mara. I want Diana on a secure video link from Newark. I want nobody else in the room and nobody on the calendar invite. I want the room swept at five forty-five."

"Six PM."

"Six PM."

Margot left.

Cole looked at Liam.

"You ran the example ERP on a laptop last night."

"At three AM. Docker compose up. The system came up clean."

"What was the compiler-emitted line count for the ERP."

"Approximately twelve thousand four hundred lines of Rust and TypeScript from a four-hundred-and-thirty-line `.agi` source."

"Twenty-eight to one."

"Twenty-eight to one."

Cole looked at the README on his screen one more time.

He said: "The Carry platform is being built on this. Starting tonight. Reese — I want the architecture redrawn around `accelerando_interchange.agi` as the cross-service backbone. Every Carry product talks to every other Carry product through Interchange packets. Carry Fulfillment, Carry Logistics, Carry Customer Service, Carry AI Agents, Carry Identity, Carry Payments, Carry Returns — seven services, one packet format. The interchange spec is the customer-facing contract. The customer-facing contract is the substrate. Liam — pull a printed copy of the DSL grammar specification for me by four PM. I want the section on PACKET declarations bookmarked. I want the section on MUTATION_POLICY bookmarked. I want the section on SKILLDOC bookmarked. The seven-product taste artifacts go in SKILLDOCS signed by the product leads with me co-signing the customer-promise envelope. The tier-verification gates on the Andon Loop give us the audit chain the antitrust subcommittee is going to want to see. Owen, when we walk him through this, is going to recognize that the deterministic-runtime property is going to compress our Q3 software-quality reserve by approximately the cost of the platform-services compute envelope across the first eighteen months of customer onboarding. The math is the math."

Reese said: "Twelve months to first major customer becomes."

Cole said: "Forty-five days if we're disciplined. Sixty if we're not. We are going to be disciplined."

"Forty-five days."

"Forty-five days."

Reese stood up.

He shook Cole's hand.

He walked out at twelve oh-four with Liam behind him.

---

Cole walked into Conference Room A on the seventh floor at five fifty-nine PM.

The room was swept. The board was clean. The seventeen people in the room had been in the room since five forty-five. Anjali had a yellow legal pad. Owen had his MacBook closed in front of him with both hands on top of it. Mara was at the back of the room standing. Diana on the video link from Newark with her own legal pad.

Cole set a printed copy of the agicore README on the conference table.

Two hundred and forty pages, single-sided, bound at Kinko's at four-eleven PM, the bookmarks Liam had inserted visible at the page edges.

Cole did not sit down.

He said: "We are pivoting the Carry build to a new substrate. The substrate is open-source. The substrate is on GitHub. The substrate is called Agicore. The maintainer is one person in a small town in Missouri. He has, on the public commit log, been committing fourteen times a week for eleven months alone. I read the README at eleven thirty-one AM today. I am, on my own honest assessment of twenty-three minutes of close reading and the conversation I had with Liam Hwang and Reese Okonkwo in this office at noon, going to bet the platform on it. The reason I am going to bet the platform on it is that the compiler emits twenty-eight lines of production-quality Rust and TypeScript per line of declarative DSL source, the runtime has no AI in it which means the deterministic-output property is a hard property and not a hope, the mutation-policy architecture gives us a mechanical audit chain across every system change for the antitrust subcommittee to inspect at any time, and the interchange-packet architecture gives us a single cross-service contract that compresses the seven Carry products into one specification the customer signs against. Forty-five days to Walmart. Sixty days to Target. Ninety days to Best Buy. We are going to ship the platform in the window Marguerite Holloway is going to give us, and we are going to ship it on a substrate that did not exist eighteen months ago and that nobody on this side of the executive bench other than Liam Hwang and the nine engineers downstairs had heard of as of seven o'clock this morning."

He turned to the senior architect at the head of the engineering side of the table.

"Eze."

Eze Adekunle, 39, senior platform architect, fourteen years at Carrick Cloud. He had been brought to the room from his desk at five-forty without being told the topic.

"Yes, Cole."

"Page eighty-three of the README. The MUTATION_POLICY example."

Eze flipped to page eighty-three.

"The TIER 1 block. The AUTO_DEPLOY flag set to true. The NBVE_WINDOW set to 24h. The REGRESSION_SUITE pointing at a named suite of 24h-recent-workflows. This is the shape of the rule that lets the AI tier-verify and shadow-window-test a proposed parameter tweak on, for instance, the Carry Fulfillment customer-priority routing algorithm. The tweak runs through the regression suite first. Passes regression. Goes into a twenty-four-hour shadow window against live traffic without serving the shadow output. The shadow window's pass-rate is computed against the prod output. If the pass-rate holds above the configured threshold, the tweak auto-deploys at the end of the window. If it does not, the tweak is rolled back and an issue lands on the operator's queue. The TIER 5 block at the bottom of the same example is the governance gate — APPROVAL_AUTHORITY ORDERED with three named signers in declared order, used for anything that touches MUTATION_POLICY itself. CFO, CTO, board chair. The ordering is mechanical. The substrate enforces it at the verifier. The CFO cannot, in operational fact, sign after the board chair. The order is the order. I want the seven Carry-product MUTATION_POLICY files drafted by tomorrow noon. I want the SKILLDOC files for each product's customer-promise envelope drafted by Friday. I want `accelerando_interchange.agi` forked into our internal repo by ten PM tonight with the seven-service PACKET schemas declared. Reese will walk you through the schemas. Take the README. Take the printed grammar specification Margot is going to hand each of you on the way out of this room. Read both tonight. I will be in your conference room on the seventh floor at six AM tomorrow."

Eze said: "Six AM."

"Six AM."

Cole turned to Owen.

"Owen. The platform-services compute envelope across the first eighteen months. The deterministic-runtime property compresses our Q3 software-quality reserve. Run the model tonight. Send it to me by six AM."

"Tonight."

"Tonight."

Cole turned to Mara.

"Threat-posture brief on the maintainer in Missouri. Quiet. No outreach. I am not going to contact him. I am going to use the open-source substrate the way the open-source substrate is licensed to be used, which is freely. I want to know who has been reading his commits. I want to know who else in the consequential-actor set might have noticed what we noticed this week. I want it by Monday."

Mara wrote one line on her notepad.

"Monday."

Cole turned to Diana on the screen.

"Diana."

"Cole."

"The Newark retail systems team that is in the ESOP transition. The systems they are running today are the systems Reese's team is going to be replacing on the parent side of the wall. The substrate makes it possible for the ESOP-side employees to take their own operating systems with them as `.agi` files when the trust closes the final tranche. The systems become theirs. The systems become license-free. The systems become evolvable by their own engineering team without a Carrick parent-side vendor relationship. That is a material benefit to the ESOP. Walk it through your team this week. I want to discuss it with you on the next regular call."

Diana said: "I will."

Cole stood with his hands flat on the printed README.

He said: "Reese. Anything I missed."

Reese said: "Cole. One thing. The maintainer."

"Yes."

"I do not know who he is."

"I do not either. I read the README and the about page. He goes by initials. He lives in a town of three thousand seven hundred people. He has, in the past eleven months, written approximately ten thousand lines of compiler code and shipped it on a residential internet connection from his kitchen table. The Sponsorship page is closed. The Patreon is closed. He has not, on Liam's check, accepted equity offers from any of the four venture funds that have reached out to him on the public issue tracker in the past nine months. He is not, on my honest read of the public artifact, building the project to be acquired. The project is the artifact. The artifact is the project. We are going to use the artifact the way the artifact is licensed to be used. We are not going to call him. We are not going to email him. We are not going to put his name in any of our public communications about the platform. We are going to ship credit upstream in every commit message the way the open-source convention requires. If he ever reaches out to us, the answer will be: come to Bainbridge for a weekend. Until he reaches out, the answer is: we are using the work, and we are doing it the way the open-source convention says to do it. He shipped the substrate. He gets the substrate's credit. We ship the platform. We get the platform's credit. The credits do not overlap. The work does not overlap."

He looked around the room.

He said: "We are pivoting the Carry build to Agicore. Starting now. Questions."

The room had no questions.

Cole walked out at six twenty-three PM.

The seventeen people in the room walked out at six twenty-four with printed copies of the README in their hands and Margot's printed-grammar-specification copies in their other hands and instructions to be on the seventh floor at six AM the following morning.

By midnight, `accelerando_interchange.agi` was forked into Carrick's internal repo with seven-service PACKET schemas declared in the first commit, signed by Eze Adekunle and three of his senior architects.

By Friday noon, the seven-product MUTATION_POLICY files were drafted.

By Friday at five, the seven SKILLDOC files for each product's customer-promise envelope were on Cole's desk.

By the following Monday, the Carry platform's internal architecture diagram on the seventh-floor whiteboard had been redrawn three times, and the third version had been signed by Reese, Cole, and Eze in the lower-right corner with the date.

By the Tuesday after that, when Marguerite Holloway picked up the phone in Cincinnati to call Reese, the platform Reese was preparing to deliver to Midcontinent was being built on a substrate Marguerite had never heard of, by an engineering team that had not, eleven days earlier, known the substrate existed.

The substrate was the substrate.

The platform was the platform.

Cole had read the README at eleven thirty-one AM on a Wednesday in October of Year One, twenty-three minutes later he had said *this is the substrate,* and the entire engineering organization of the seven-hundred-and-twenty-billion-dollar company had pivoted around him inside seventy-two hours without anyone in the room raising a hand to dispute the pivot, because every person in the room understood that Cole had read the README the way Cole read everything that mattered — once, fast, all the way through — and had been correct on every previous occasion on which he had read something that way and said *this is it.*

The pivot was the pivot.

---

The first major enterprise customer was Midcontinent Stores Inc.

Reese had been talking to Midcontinent's CEO, Marguerite Holloway, for fourteen months. Marguerite was sixty-one. She had taken Midcontinent over in Year Minus Three and had been turning the 200-store regional department-store chain around against the grain of the industry. The conversation had started in August of the previous year — an exploratory call about whether Carry's fulfillment service could handle a multi-category catalog. Active commercial negotiation in March. Two-week pause after the memo had landed in Marguerite's inbox at 6:15:02 AM Pacific.

Marguerite had called Reese on the morning of the Tuesday after the Sallinger meeting.

"Reese. I want to be the first major one. I want to sign before any of my competitors do. I want the option to be in front of them, not behind them. I'm ready to move."

"Marguerite. I'm ready to move."

"Get on a plane."

He got on a plane.

Tuesday morning. Seattle to Cincinnati. Reese in business class, his deputy Liam Hwang beside him, Carry's chief contracts counsel in business class behind them. Four hours and thirty-one minutes. Reese reread the term sheet on the laptop in his lap.

Twenty-one pages. Five-year platform contract. Two hundred and forty million dollars of committed annual revenue across five years. All seven Carry products. Full integration. Midcontinent's three regional distribution centers through Carry Logistics. Midcontinent's customer-service operation migrating to Carry Customer Service over twelve months. Midcontinent's online identity layer consolidating onto Carry Identity. Midcontinent's e-commerce checkout on Carry Payments by the end of Year 1. Midcontinent's reverse logistics on Carry Returns by Q2 of Year 2.

The largest enterprise contract in Carrick Carry's history.

The largest single contract, on a multiple of revenue, Carrick Cloud had ever closed.

The proof.

The team in Cincinnati spent two days in conference rooms negotiating the final ten percent. The legal teams traded redlines across thirty-six hours. The platform-services pricing was the longest single line item. The carve-out language for Carry's never-compete-with-the-customer commitment was the most carefully drafted section of the contract.

At 11:14 PM Eastern Tuesday — eighteen hours before the scheduled signing — Marguerite Holloway called Reese on his cell. He was in the elevator at the Westin Cincinnati. He punched the door-open button and walked back into the lobby.

"Reese."

"Marguerite."

"Walmart's CEO is on my private line. He has been on it for twenty-two minutes. He is offering me an exclusive five-year platform-services contract on Walmart's own infrastructure at three-quarters of Carry's pricing, with a one-billion-dollar make-good if the platform ever competes with Midcontinent. He has the term sheet on a Walmart letterhead. He is going to email it to me at midnight."

"He cannot ship the platform."

"He cannot ship the platform on the timeline he is naming. I know he cannot. My board's nervous half does not know he cannot. The nervous half is going to read the term sheet at midnight. They are going to ask me at seven AM why I am signing with the smaller balance sheet at a quarter-higher price when the bigger balance sheet has just offered me the make-good."

"Marguerite."

"Yes."

"Send me the term sheet. I will be in your office at six AM. Cole will be on the satphone. We will walk your board through the platform-shipping math at seven. Walmart cannot ship in the window they are quoting. The make-good is not real money. The exclusivity language locks you to a competitor's roadmap."

"Get Cole on the line tonight."

"Tonight."

He killed the call.

He called Cole at 11:19 PM Eastern, 8:19 PM Pacific. Cole was in the home gym at Bainbridge. Bear had three-eighty on the trap bar.

"Cole."

"Reese."

"Walmart is making a spoiler bid. Their CEO is on Marguerite's line with a counter-offer. Three-quarters pricing. One-billion make-good. Exclusivity. He is going to email her the term sheet at midnight Eastern."

"He cannot ship the platform."

"I told her."

"Walmart's platform-services initiative is eleven months in. They have hired three hundred engineers. They have shipped two services. They cannot ship the seven Marguerite needs on the timeline they are quoting. The make-good is the only real thing in the term sheet and the make-good is structured to pay out in 2032 dollars on a 2026 commitment with a force-majeure carve-out that swallows the whole obligation."

"Cole."

"Yes."

"You read the Walmart term sheet."

"I read every term sheet Walmart has filed in any forum since the platform initiative went public eleven months ago. I have the structure of their make-good language in my head from a 10-Q footnote in March. The footnote was small. Walmart did not want anyone to read it. I read it."

"What do I tell Marguerite's board at seven."

"You tell them three things. One. Walmart cannot ship the seven products on the timeline they are quoting. Two. The make-good is a phantom liability priced to expire before it pays. Three. The exclusivity language gives Walmart a veto on every operational decision Midcontinent makes for the next five years, because every operational decision Midcontinent will make on a platform contract is a decision that can be argued to constitute material breach of the exclusivity. The first two are the math. The third is the cage. The cage is what they should not sign into."

"Cole."

"Yes."

"Will you be on the satphone at seven AM Eastern."

"I will be on the satphone at seven AM Eastern. Mara will have the line open. I will be at the gym. I will be on the bar. I will be on the satphone."

"Thank you."

"Reese."

"Yes."

"Marguerite is going to sign. She is going to sign at four-forty Wednesday. You are going to sign at four-forty-one. Walmart is going to sign with Carry inside forty-five days as the second tenant on the platform. The Walmart spoiler is the Walmart concession in two acts. Marguerite is the first act."

He hung up.

Reese went up to his room. He read the Walmart term sheet when it landed at 12:02 AM. The footnote on the make-good was where Cole had said it was. The exclusivity language was the cage Cole had said it was.

He was in Marguerite's office at 6:00 AM. Cole was on the satphone at 7:00. The Midcontinent board absorbed the three points across forty-eight minutes. Marguerite ended the call at 7:51.

"Reese."

"Marguerite."

"The board is with me. The signing is at four-forty."

"Four-forty."

She killed the satphone.

She walked Reese to the elevator.

Marguerite Holloway signed at four-forty PM Eastern on the Wednesday in late November.

Reese signed at four-forty-one.

The signing was in Marguerite's office in the Midcontinent headquarters building in downtown Cincinnati, the window looking out over the Ohio River, the West End, the Findlay Market neighborhood Reese could just see from the corner.

After the signing Marguerite poured Reese a glass of bourbon.

"Reese."

"Marguerite."

"I'm sixty-one years old. I've been in retail for thirty-eight years. I've never signed a contract that I knew, at the moment I signed it, was going to be on the front page of the *Wall Street Journal* the following morning."

"It's going to be on the front page."

"I know. The press release goes out at eight AM Eastern. I've been on the phone with my board for nine days. They voted unanimously last Friday. I've been on the phone with my management team. They're split. The ones who came up under me are with me. The ones who came up under my predecessor think I'm betting the company on Carrick. I told them at the all-hands Monday that I wasn't betting the company on Carrick. I was betting the company on the customer. I told them about your seven products. I told them we're going to use the products to compete with Walmart on the customer the same way Walmart has been competing with us on the customer for thirty years. I told them the customer is going to win. Walmart has been on the line for an hour. I'm going to take that call after you leave. I'm going to tell Walmart they have a choice. Either they're the second major one on the Carry platform inside ninety days or they're the seventh, and the difference between the second and the seventh is two years of margin compression that they're going to absorb in real time."

"Marguerite."

"Yes."

"Walmart is going to sign inside forty-five days."

"I know they are."

"Target is going to sign inside ninety."

"I know they are."

"Best Buy is going to sign inside one-twenty."

"I know they are. Cole told me on the call last Tuesday. He read me the order. I told him I had the same order in my head. We're going to be the first by twelve weeks. The platform is going to be inside two-thirds of the top twenty by the end of Year Two. That is the proof."

"That is the proof."

"Drink the bourbon."

He drank the bourbon.

He flew home that night.

---

The press release went out at eight AM Eastern Thursday.

The contract was the second-largest single platform deal in U.S. enterprise-software history.

The largest had been Microsoft Office 365 to the U.S. Department of Defense in 2018.

The Carrick Carry / Midcontinent contract was the largest in the private sector.

The stock moved up five and a half percent at the bell.

By the close it was up seven and a half on the day.

The *Wall Street Journal* ran the story on the front page of the Friday-morning paper. Adelaide Krug's byline. The headline was *Westerlund Lands the Proof.* Eighteen hundred words. The first three hundred about the Midcontinent contract. The next four hundred about Sallinger having closed his short position the previous Monday. The next six hundred about the AI-piranha thesis and the math behind the pivot. The last five hundred were a profile of Reese Okonkwo.

The profile was the first time Reese's name had been on the front page of the *Journal.*

He read it at five-thirty AM Friday in his kitchen in Magnolia. Imani read three paragraphs over his shoulder, refilled his coffee, and went upstairs to get the kids ready.

He drove them to school.

He went to the office.

---

Cole called him Monday morning at 6:27 AM Pacific.

Sixty seconds.

"Reese."

"Cole."

"Walmart's chief platform officer files a 13G on Carrick Cloud at the open. They are buying optics on the deal. Run the Walmart contract close inside forty-five days."

"Inside forty-five days."

"Target inside ninety. Best Buy inside one-twenty. Kroger and Home Depot are sequencing behind them. The same play on the same compressed timeline. The play does not change."

"The play does not change."

"Reese."

"Yes."

"The Brunner profile."

"I read it last night."

"Mara is going to want a thirty-minute brief with you Thursday on the threat posture for the platform-services side. Brunner is not the only fund that is going to look at Carry as a target. Walmart is not the only competitor that is going to make a spoiler bid on a closing customer. The next six months are going to be the most aggressive six months of the pivot. The platform is going to be tested on the close-customer side. Hold the customers. Sign the contracts. Run the play."

"Run the play."

They hung up.

---

Walmart signed inside thirty-eight days.

Target signed inside seventy-one.

Best Buy signed inside eighty-four.

Kroger signed inside one-twenty.

Home Depot signed inside one-fifty-eight.

By Q2 of Year Two, six of the top twenty American retailers were on Carrick Carry.

By Q4 of Year Two, eleven of them were.

By Q1 of Year Three the platform had three hundred and eighty thousand small and mid-market businesses on it.

By Q2 of Year Three, when the *New York Times Magazine* ran the Cole Westerlund cover profile, the platform-tenant equality metric on Reese's dashboard had been at 1.00 for nineteen consecutive months.

The architecture was the architecture.

The platform was the platform.

The proof had been the proof since Marguerite Holloway had signed the contract at four-forty PM Eastern on a Wednesday in late November of Year One, and Reese Okonkwo had signed it at four-forty-one, and the two of them had drunk a bourbon and looked out at the Ohio River.

End of Act 2.
