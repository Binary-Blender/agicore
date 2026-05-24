# Chapter 7: Three Rivers

Ben Kowalczyk got to the office at seven fifteen on a Tuesday morning in May, which was earlier than he needed to and earlier than either of his partners would arrive, because he liked the loft when it was still empty and the morning sun was coming through the eastern windows and lighting up the brick wall by the conference table. He had a small ritual. He made coffee. He turned on the desk lamp at his own workstation. He stood at the big window for two or three minutes and looked down at Hennepin Avenue and watched the city wake up. Then he sat down at his desk and opened his laptop and did not check email for the first half hour.

He was thirty-eight. He had been a senior engineer at Stillwater Software for six years before he left, with two of his colleagues, in February. They had been operational, as Three Rivers Studio, for ten weeks.

The office was a single open loft on the third floor of a converted brick warehouse on Hennepin between Eighth and Ninth. Twelve hundred square feet. One large window facing east. One smaller window facing the alley. Three desks arranged along the long brick wall. One green couch against the short wall, which Eli had bought used from a place in Northeast for two hundred dollars and had cleaned with a steam machine he borrowed from his sister. One small four-person conference table in the corner. One Mr. Coffee machine on a side table that Marcia had brought from home because, she had said when she carried it in on the first day, *we are not buying a coffee machine until we know if this works.*

Ten weeks in, Ben thought, it was working.

---

Eli Choudhry arrived at eight forty.

He was thirty. Indian-American, born in Edison New Jersey, came to Minnesota for the University of Minnesota's CS program and never left. He had been at Stillwater for four years before joining Three Rivers as a co-founder. He was the firm's frontend specialist, which at Three Rivers meant he was the firm's UX designer, visual designer, and customer-demo lead all at once. He carried a laptop in a felt sleeve and a small leather notebook he wrote in with a fountain pen.

"Morning," Eli said.

"Morning."

"Did the food-processing thing come back?"

"Came back. They want one more round on the dashboard. Marcia said she'd handle it."

"Good."

Eli sat down at his desk.

Marcia Reuter came in at nine ten. She was forty-four. She was the firm's integration architect, which meant she did the database design, the data-pipeline work, the third-party-system integrations, and most of the contract review when contracts came in. She had two kids in high school. She had been at Stillwater for nine years before she came over. She wore a fleece vest and carried a thermos.

"Morning."

"Morning, Marcia."

"Coffee?"

"Made it at seven thirty. Should still be hot."

"Bless you."

She poured herself a mug.

She sat down at her desk.

The three of them did not say anything for the next forty minutes. They worked. Ben watched, out of the corner of his eye, the morning unfold the way it had unfolded almost every morning for the last ten weeks — three people, three desks, three problems being worked on quietly, the radiator clicking, the alley window cracked half an inch for air. He thought, the way he had been thinking it more or less every morning, that it was the best work environment he had ever been in.

---

The division of labor had taken them three weeks to settle and another three to refine.

Ben did backend and architecture. He scoped the data models, designed the service architecture, wrote the heavy server-side code, and made the calls on infrastructure. He had been the senior backend engineer at Stillwater. He had been doing the same work for fifteen years. He was good at it. He could do it faster, with AI augmentation, than he could have done it five years ago — by a factor he had stopped calculating because the factor had stopped mattering once it crossed the threshold of *enough.*

Eli did frontend and design. He owned the UI, the customer-facing design language for each project, the client-demo presentations, and the front-end engineering work itself. He had a designer's eye, which Ben did not have, and a frontend engineer's hands, which Marcia did not have. He was the firm's customer-facing aesthetic.

Marcia did integration and data. She did the work that sat between Ben's backend and the client's existing systems — the ETL pipelines, the third-party API integrations, the data-quality and data-governance work that mid-market manufacturers had usually been ignoring for the previous fifteen years and which had become suddenly important once those clients started wanting to use their data for anything more sophisticated than monthly reports.

The operations work was different. Operations they split evenly.

Sales rotated weekly. One week Ben took inbound inquiries, replied to prospects, did the first calls. The next week Eli. The next week Marcia. Cycle of three. Each of them owned the sales pipeline for that week.

Billing rotated the same way. Whoever was on sales that week also sent the week's invoices.

Contracts rotated. New-engagement contracts went to whoever was lowest-loaded that week. Renewals went to whoever had been on the original engagement.

Scheduling and project management was shared on a project-by-project basis — whoever was the lead on the client owned the project plan and the client check-ins.

Accounting — bookkeeping, taxes, expense management — they had decided to outsource to a Twin Cities small-firm accountant Marcia knew, who charged them five hundred dollars a month and was, all three of them agreed, the best deal in the firm's overhead.

It worked because none of them resented the operations work. They had all done enough operations work, in their previous lives at Stillwater, to know that the alternative — letting one person own all of it — was the same trap that ended every other small partnership Ben had ever seen end. So they divided it. Marcia, who was the most organized of the three, had built a shared rotating schedule that pinged each of them on their phones at six AM Monday with that week's responsibilities. They had not yet missed a handoff.

---

At nine forty Ben opened the firm's shared prompt library.

The library lived in their NovaSyn Chat Lite workspace. They had started building it the first week. It had grown, by week ten, to seventy-three entries.

The entries were structured by use case. Proposal drafting. Statement-of-work generation. Client-update emails. Discovery-call follow-up notes. Project-status summaries. Bug-report templates. Architectural-decision-record templates. Hand-off documentation. Onboarding checklists for new clients. Renewal-pitch drafts. Past-due-invoice follow-up scripts of three escalation levels (gentle, firm, formal).

Each entry had been tuned. Eli had been the firm's unofficial prompt-engineer-in-residence — he had the patience for it. He had pushed each prompt through ten or twenty real examples before he committed it to the library. The library was good. The library was, Ben thought, perhaps the most valuable single asset Three Rivers Studio owned. It was the difference between a three-person firm and the equivalent of a six-person firm.

Ben opened the *proposal draft — manufacturing client — small-scope* template and began work on a response to an inquiry from a Saint Paul packaging company that had reached out the previous Friday. The template did eighty percent of the proposal in twelve minutes. Ben spent the next thirty-five minutes editing for voice, tightening the scope, and adjusting the price. The proposal would be ready to send by noon.

He saved it. He sent it to Eli for the design pass. Eli would lay it out in the firm's template and have it back to him by three.

He checked the clock. Ten fifteen.

---

The clients.

Three Rivers had four active clients in week ten.

The first was a precision-machined-parts manufacturer in Eau Claire, Wisconsin. Ninety employees. Family-owned. They had needed an integration between their ERP system, which was thirteen years old and lightly customized, and a new quality-management platform they were rolling out to comply with an automotive-supply-chain certification. The work was six weeks. Three Rivers had bid forty-seven thousand dollars. Marcia was the lead.

The second was a regional bakery group with seven locations across Iowa and Minnesota. Sixty employees. They had wanted a small customer-facing app for catering orders, with backend integration into the existing point-of-sale system. Eight weeks, fifty-two thousand dollars. Eli was the lead.

The third was a Wisconsin food-processing company, a hundred-and-twenty-person business that did private-label condiments for grocery chains. They needed a custom dashboard for production scheduling and ingredient forecasting that pulled from three internal systems. Twelve weeks, eighty-three thousand dollars. Ben was the lead. The food-processing project was wrapping that Friday.

The fourth was a small specialty agricultural-equipment maker in central Minnesota that had hired Three Rivers on a six-month retainer to be their *fractional engineering team* — Ben's phrase — at twelve thousand a month. The work was steady. The relationship was good.

Two of the four clients had come from old Stillwater referrals. They were clients Stillwater had told politely that the work was too small for Stillwater to do well, and that there was a new firm in town that Stillwater trusted, and that Three Rivers would do them right. Both had signed within a month of the introduction.

The other two had come from Ben's and Marcia's personal networks. The agricultural-equipment maker was a former neighbor of Marcia's. The bakery group's CEO was someone Ben had gone to high school with in St. Cloud.

Three Rivers was, by week ten, turning down work.

They had said no to a midsize Minnesota healthcare network that wanted a six-month engagement with a four-person team. The work was good. The money was real. But the engagement would have required the firm to either hire a fourth person they did not want to hire, or to over-commit their existing three. They had passed. They had referred the healthcare network to Stillwater. Maya had taken the call from the healthcare network's CIO two weeks later and the work had landed at Stillwater.

They had said no to a tech-startup project in Denver because none of them wanted to fly to Denver.

They had said no to a Twin Cities private-equity firm that wanted to put them on retainer for portfolio-company work, because the engagement felt — Ben had said it in plain words in the partner meeting — like the kind of engagement that would eat the firm.

The three of them had agreed, in week six, that they wanted to be three to five people. Maximum. For as long as they could sustain it.

---

Ben thought about Maya regularly.

He thought about her, that Tuesday morning in May, the way he had thought about her on most Tuesday mornings since they had opened the loft.

He had braced, in February and March, for Maya to make their life difficult.

He had assumed she would compete for the same client work — that she would price down to take engagements out from under them, that she would, in some measured and professional Stillwater way, signal to the Twin Cities mid-market that the *real* firm to work with was Stillwater and that the three former employees who had spun out were a sideshow.

She had done none of that.

She had, instead, sent them two clients in the first three months. The two referrals had been clean, with no strings, no fee, no expectation. Maya had called Ben the first time and said, in the voice she used when she was making a decision she had already thought through: *Ben. I have a client. They are too small for us to do right by. They are exactly right for you. Can I introduce them.* Ben had said yes. The client had become Three Rivers's second-largest engagement.

The second referral had come six weeks later. Same shape. Same call.

Ben had asked Maya, on the second call, why she was doing it.

Maya had said: *because in two years, when I have a client that needs something you do better than we do, I am going to want you to refer them to me. The way you treat people is the way they treat you. I would rather start that habit now than start it later.*

Ben had thought about that sentence for a week.

He had thought, in his own internal monologue, the thing he was thinking again that Tuesday morning in May: *She is treating us like partners. We are not at Stillwater anymore but she is still acting like we are colleagues. That is unusual. That is also exactly the kind of thing that will keep me sending work her way too.*

He had, the week before, referred Stillwater to a longtime contact in a Saint Paul logistics company that needed an embedded-team engagement Three Rivers could not staff. The contact had signed with Stillwater the following Monday. Maya had texted Ben a single line. *Thank you. They're a good client. We'll do right by them.* Ben had not replied. He had not needed to.

He thought, about Maya: *she is building something that I am part of, even though I do not work for her. I am not sure she planned it that way. I am not sure she did not.*

---

Friday afternoon. May. Three weeks after that Tuesday morning.

Three Rivers wrapped the Wisconsin food-processing project at two fifteen.

Ben sent the deliverables. The client's IT director, a man named Greg Pelkey, replied within ten minutes. *Looks great. Final invoice when you have it. Pleasure working with you all.* Ben sent the final invoice at two thirty. Forty-seven thousand dollars, the last twenty-three of it billed against project completion. The previous twenty-four had been paid against project milestones.

At three Marcia came over from her desk with the bottle of wine she had brought in that morning.

"I told myself I would not open this until we had the invoice out."

"You told yourself correctly."

"Eli. Put on something."

Eli walked to the small Bluetooth speaker on the windowsill and put on something instrumental. Piano. Something Ben did not recognize and did not need to.

They sat on the green couch.

Marcia poured three glasses.

She handed them around.

They sat for a moment without talking.

The afternoon light through the eastern window had moved to the west wall and was now lighting up the bricks behind them.

Eli was the first to speak.

"We should toast Maya."

Ben looked at him.

"Yeah."

Marcia held up her glass.

"We should send her flowers tomorrow."

"Yes," Ben said.

"Tomorrow is Saturday."

"Monday morning then."

"Monday morning."

They drank.

They sat on the couch for another half hour. They talked about nothing in particular. They talked about Marcia's son's college tour next week. They talked about Eli's brother in New Jersey. They talked about a restaurant Ben had been wanting to try. They did not talk about the work. They did not need to.

At four thirty Marcia got up.

"I have to pick up Audrey at five."

"Go."

She left.

Eli washed the glasses. Ben rinsed the bottle. They turned off the speaker. They locked the office at five fifteen.

On the sidewalk on Hennepin Eli turned to Ben.

"Same time Monday."

"Same time Monday."

They walked in opposite directions.

---

On Monday morning at eight ten, Ben placed an order at a florist in Northeast Minneapolis for a large arrangement of mixed spring stems to be delivered to Stillwater Software, attention Maya Holm-Russo, with a card that read: *with thanks from your three friends across town. — Ben, Eli, Marcia.*

The florist confirmed delivery at eleven seventeen.

Maya's text came in at eleven twenty-three.

*Welcome to the industry, partners.*

Ben showed it to Eli. Eli showed it to Marcia. Marcia smiled. None of them said anything for a moment.

Marcia poured a fresh round of coffee from the Mr. Coffee.

They went back to work.

---

*Three Rivers Studio would, over the next eighteen months, settle into a steady state of four people: Ben, Eli, Marcia, and one occasional fourth they brought in on retainer for design work — a young woman named Petra Olafsson who lived in Saint Paul and worked twenty hours a week and did not want a full-time job. They would turn down repeated offers to grow beyond five. They would refer clients to Stillwater when those clients outgrew them. Stillwater would refer clients to Three Rivers when those clients were too small for Stillwater to serve well. The relationship would become, in time, something the three partners of Three Rivers stopped consciously noticing because they had begun to live inside it the way one lives inside weather.*

*The relationship, in industry observers' retrospect, would later be called "the Minneapolis Model" by people who wrote business articles about that kind of thing. Maya Holm-Russo would never use the term. She thought it sounded like the title of a panel she would not want to attend. Ben Kowalczyk would use the term once, at a panel he had agreed to sit on, in the spring of 2027, and would regret it immediately. The room had nodded along. The phrase had spread. He had not used it again.*

*The model had a name, in the end, that the people who lived inside it had not chosen and did not use.*

*That is, in the experience of the people who later studied such things, how most working arrangements that actually work end up getting named.*
