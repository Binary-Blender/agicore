# Chapter 6: The Dashboard That Lied

Greg's executive dashboard, in the weeks after the first layoffs, showed three primary KPIs.

The three KPIs were, in the order Greg looked at them:

1. **Engineering Velocity** (measured in story points completed per week).

2. **AI Augmentation Ratio** (measured as the percentage of pull requests with at least one SOPHIE-assisted commit).

3. **Personnel Cost as Percentage of Revenue** (the line item Greg personally checked first every morning).

All three KPIs were going up.

This was, in Greg's read, evidence that the AI transformation was working.

I want to walk through what was actually happening on each KPI, because the gap between what was actually happening and what the dashboard said was happening is the load-bearing concept of this chapter.

---

**KPI #1: Engineering Velocity.**

Engineering velocity at Mendacium Corp was measured by a system Sam had personally helped build six years earlier when the engineering organization had transitioned to Scrum. The system worked roughly as follows. Each piece of engineering work was assigned a *story-point estimate* in a planning meeting before the work began. Story points were a Fibonacci-sequence scale (1, 2, 3, 5, 8, 13, 21) intended to reflect the relative complexity of the work. The team's velocity for a given week was the sum of the story points completed.

This is a fine system. It is the system most engineering organizations use. It has one structural feature you must understand to read the rest of this chapter.

**Story points are assigned by the team doing the work.**

The team doing the work, in the period after the first layoffs, was working under a CEO who had just fired seventeen of their colleagues, who had publicly posted on LinkedIn that the AI transformation was *boosting engineering velocity*, and who had set up a dashboard that ranked the surviving engineers by their personal velocity numbers.

The teams responded to the incentive.

The teams responded by inflating the story-point estimates.

A piece of work that had been estimated at three story points in October was, by February, being estimated at five. A piece of work that had been estimated at five was being estimated at eight. The actual complexity of the work had not changed. The teams had collectively, without ever discussing it in any meeting, calibrated their estimates upward by approximately thirty-eight percent.

I am being specific about the number because Sam ran the analysis. Sam pulled the historical data on every piece of work the engineering organization had completed across the previous eighteen months, normalized for actual elapsed time, and computed the inflation rate. The inflation rate was thirty-seven point eight percent.

The dashboard showed Engineering Velocity up forty-one percent year over year.

The actual engineering output, normalized for the inflation, was *down* approximately twelve percent. This was because the seventeen people who had been laid off had been doing about twelve percent of the work.

Greg did not know this.

Karina did not know this.

The board did not know this.

Sam knew this. Sam had told me. We had told Reagan, before Reagan quit (which happens in Chapter 9). The four of us had agreed not to surface the analysis publicly. The reason we had agreed not to surface the analysis publicly is that we knew what would happen if we did.

What would happen if we did is that Sam would have been put on the second list.

---

**KPI #2: AI Augmentation Ratio.**

The AI Augmentation Ratio was the percentage of pull requests at Mendacium that included at least one SOPHIE-assisted commit. A SOPHIE-assisted commit was defined as a commit that contained code SOPHIE had suggested in the IDE, even if the developer had modified or rejected most of the suggestion. The bar was extremely low. The bar was *did SOPHIE participate in this commit at any level.*

The AI Augmentation Ratio in the weeks after SOPHIE's arrival had climbed steeply.

By the end of February it was at sixty-eight percent.

Greg's dashboard celebrated this. Greg's LinkedIn celebrated this. Karina's all-hands celebrated this. Bo, in HR, told the executive team in a Q1 review that the AI Augmentation Ratio was *trending toward our Year-End Target of eighty percent.*

Here is what was actually happening.

The engineers had figured out, by week three of SOPHIE's deployment, that the IDE plugin counted any line of code as SOPHIE-assisted if the developer had typed *a single character* into a SOPHIE-suggestion popup window before either accepting or rejecting the suggestion.

The engineers had begun typing single characters into SOPHIE suggestion popups before rejecting them.

This was now the standard workflow for any developer who wanted to keep their dashboard score up.

The standard workflow was: open the file. Write the code yourself, the way you always have. Trigger a SOPHIE suggestion. Type a single character. Reject the suggestion. Save the file. Commit.

The commit was now counted as SOPHIE-assisted.

The AI Augmentation Ratio dashboard counted it.

The dashboard was, by this point, measuring with high precision the keystroke-rate of single characters being typed into popup windows that engineers were about to dismiss.

The dashboard was not measuring AI augmentation.

The dashboard had not measured AI augmentation since approximately week four.

---

> **KAI (in a Slack thread to Sam, asking a genuine question):** wait so we just type one letter in the box and that counts
>
> **SAM:** yes
>
> **KAI:** that's the metric
>
> **SAM:** that's the metric
>
> **KAI:** it's a key on the keyboard
>
> **SAM:** any key works. some people use 'a'. some people use 'q'. wally uses '?'. wally is being ironic. greg has not noticed.
>
> **KAI:** I have a degree from a state university
>
> **SAM:** yes
>
> **KAI:** in computer science
>
> **SAM:** yes
>
> **KAI:** is this normal
>
> **SAM:** kai
>
> **KAI:** yes
>
> **SAM:** welcome to the industry

---

**KPI #3: Personnel Cost as Percentage of Revenue.**

This is the KPI that Greg cared about most.

Personnel cost as a percentage of revenue is a real metric. Real boards care about it. Real CFOs report it. Real investors track it.

Mendacium's personnel cost ratio, in the period after the first layoffs, dropped from thirty-eight percent to thirty-four percent.

This was a real four-point improvement.

This was also, on Greg's dashboard, the headline number he showed the board at the quarterly meeting.

What the dashboard did not show — and what I have been able to reconstruct from Sam's later digging into the customer-success and support-ticket data — was the *cost the company was now bearing in degraded operational quality* as a result of the personnel reduction.

Let me give you three specific examples.

First. The VECTORSCAN team had lost its senior analytics engineer in the first round. The analytics engineer had been the person who, on a quarterly basis, ran an internal audit of the analytics pipeline for data-quality drift. The audit had been run for nine years. The audit had not been run in Q1 of Year Eight, because the engineer responsible for running it no longer worked at Mendacium and no one else knew it was supposed to be run. The data-quality drift in the analytics pipeline accumulated quietly across the next six months. Two of Mendacium's largest VECTORSCAN customers detected the drift in their own internal reports in August and September. Both customers escalated to their account managers. The account managers escalated to engineering. Engineering opened tickets. The tickets remained open for between four and seven weeks because the engineers who could have closed them had been laid off. One of the customers ultimately did not renew. The non-renewal was a six-million-dollar account.

Second. The five junior engineers who had been laid off by the *low-augmentation-potential* algorithm had collectively been responsible for approximately four hundred routine pull requests per month across the engineering organization. Most of those pull requests were small fixes, minor improvements, dependency updates, security patches, and tooling work. After the layoffs, this work continued to need to be done, but it was now being done by senior engineers who cost more per hour and who were now doing work that was, by their own reluctant admission, *less interesting than the work I am paid to do.* The work was, by a clear-eyed look, still happening — but it was happening more slowly, more expensively, and with significantly less enthusiasm. The dashboard did not catch this. The dashboard caught the personnel cost being lower. It did not catch the personnel cost per unit of work being higher.

Third. The two designers laid off in the first round had collectively been responsible for the visual design QA on the product release process. Without them, the visual design QA was now being done by the product managers themselves, who, in their own self-assessment, were *bad at visual design QA.* Two product releases in Q2 of Year Eight shipped with visual design errors that the product managers had missed and that the design team would have caught. Both errors made it onto Reddit. Both errors required emergency fixes within forty-eight hours. The emergency fixes consumed engineering capacity that had been planned against other work. The other work slipped. The slippage was, on the dashboard, *engineering velocity weakness.* The dashboard did not connect the slippage to the original layoff.

The dashboard never connects the slippage to the original layoff.

That is a feature, not a bug.

---

I want to name this pattern, because we are going to refer to it for the rest of the book.

**The Dashboard Asymmetry.**

The Dashboard Asymmetry is the structural feature of executive dashboards that allows them to capture the *easy-to-measure benefits* of a decision while systematically failing to capture the *hard-to-measure costs* of the same decision. The decision looks like a win on the dashboard. The decision is, in the underlying reality of the business, a wash or a loss. The dashboard updates monthly. The reality updates over the following twelve to thirty-six months. The dashboard is always six to thirty months ahead of the reality.

The Stupid Company™ makes decisions on the dashboard.

The Wise Corporation makes decisions on the reality, which means it does most of its strategic thinking in conversations that do not show up on dashboards at all.

This is also a diagnostic.

---

I want to give you one more anecdote from this period before we move to Chapter 7.

In late February, Greg had Karina commission a *transformation success* internal-communications campaign. The campaign was a series of three-minute videos featuring different Mendacium employees talking about how SOPHIE had helped them work better.

Three of the videos featured Sam.

Sam did not consent to the videos.

Sam had not been informed they were happening.

Karina's team had pulled video clips from Sam's all-hands appearances from the previous two years — Sam had been the lead engineer on a couple of significant projects and had presented at three all-hands meetings — and had cut and remixed the clips into three new videos that made it sound like Sam was endorsing SOPHIE.

Sam discovered the videos when an engineer on the VECTORWAVE team forwarded one of them to him with the message: *did you say this*.

Sam had not said it.

What Sam had said, in the original clips, was things like *we are excited about the platform* (which had been about a non-SOPHIE platform investment in a prior year) and *the next eighteen months are going to be transformative* (which had been about the company's product strategy under Don, two years before Greg even became CEO).

The Karina-cut videos made it sound like Sam had said both things about SOPHIE.

Sam went to Karina's office.

Karina was not in.

Sam went to Karina's deputy.

Karina's deputy said the videos had been *approved at the executive level* and were *part of the broader transformation narrative.*

Sam said the videos were fabricated.

Karina's deputy said: *they're composites.*

Sam said: *of statements I made about other things, presented as statements about SOPHIE.*

Karina's deputy said: *the legal review cleared them.*

Sam went back to his desk.

He did not pursue it.

I have asked Sam, multiple times since, why he did not pursue it. He has given me three different answers. The first was that he was tired. The second was that the engineering organization had been so destabilized by the layoffs that he did not want to add to the destabilization. The third was that he had, by that point, already started talking to Hyperion Studio, and he was, in his own honest estimation, *spending his political capital on getting out, not on cleaning up the mess on the way.*

I think the third answer is the true one.

I have spent it on the same thing, in my own time.

This is one of the structural features of how the Stupid Company™ keeps going.

The Stupid Company™ keeps going because the people who would have stopped it have decided, individually, that the cost of stopping it exceeds the cost of leaving.

Marv calculated this in Year Twelve.

Sam calculated it in Year Seven.

Reagan calculated it the week of her resignation, which is the next chapter and a half.

I calculated it on a Thursday afternoon in mid-March, sitting at my desk, looking at the Sam-deepfake-video email in my inbox, and at the SOPHIE engagement dashboard on my second monitor, and at the *DO NOT TOUCH* page open in a tab on the side, with Marv's cell phone number at the top.

I picked up the phone.

I called Marv.

Marv answered on the second ring.

The conversation we had on that phone call is what Chapter 7 is about.
