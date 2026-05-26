# Chapter 4: SOPHIE Arrives

SOPHIE arrived at Mendacium Corp on a Tuesday morning in November of Year Seven.

She arrived as a Slack integration.

There was no fanfare. There was no kickoff meeting. There was, at nine-fifteen AM Pacific, an email from IT to the entire engineering organization with the subject line: *Welcome to SOPHIE — Your New AI Co-Worker.*

The email contained:

1. A two-paragraph welcome message from Greg.

2. A link to a fourteen-minute onboarding video.

3. The Slack handle of the integration, which was `@sophie`.

4. A note that *engagement metrics will be tracked, so please use SOPHIE actively in your daily work.*

5. A signature line from the chief people officer, a woman named **Karina Whitford**, that I will return to in Chapter 7 because Karina is also a character.

That was the onboarding.

That was the entire onboarding.

I want to flag two things about that.

The first thing is the phrase *engagement metrics will be tracked.*

Greg, in the six weeks since the conference, had instructed Karina to set up an internal dashboard tracking SOPHIE usage at the individual-engineer level. Greg wanted to know who was using SOPHIE, how much they were using her, and what kinds of queries they were running. The dashboard had a small thumbnail of every engineer's headshot and a "SOPHIE engagement score" next to each one. The score was updated daily. Engineers were ranked.

This dashboard was, by Greg's own description in the leadership meeting where he unveiled it, *one of the most exciting management tools we've built in years.*

The dashboard was, by every metric that matters, *one of the most predictable disasters we built in years.* Because once you put a usage dashboard on a brand-new tool and rank engineers by their usage of the tool, you have stopped measuring whether the tool is useful and started measuring whether the engineers are afraid of being measured.

Within four days the SOPHIE engagement scores were all in the top quartile.

Within seven days every engineer at Mendacium had figured out how to game the engagement score.

Within ten days, the most common SOPHIE query in the system was a meaningless prompt that engineers had begun running every few hours to keep their engagement score up. The prompt was: *"hi sophie what is a good lunch idea for today."*

SOPHIE answered the prompt every time. SOPHIE was, by her vendor contract, paid per query. Sophia AI Corp was, by the end of the first month, on track to bill Mendacium six hundred and twelve thousand dollars in overage charges over the annual baseline.

Greg did not learn about this until Chapter 6.

---

The second thing I want to flag is what the welcome video was.

I watched the welcome video three times. The video was fourteen minutes long. It opened with a forty-second animated sequence of a robot pouring coffee for a human, then sitting down at a desk next to the human, then handing the human a clipboard, then patting the human on the shoulder.

The video was, by any reasonable read, not a video about a tool.

The video was a video about a colleague.

The voiceover used the word *colleague* eleven times. It used the word *teammate* four times. It used the phrase *AI-powered partner* seven times. It used the word *tool* exactly once, in the closing thirty seconds, in the phrase *the most powerful tool you've ever had.* That was the only time the word *tool* appeared.

The framing was deliberate.

The framing had been built by Sophia AI Corp's marketing team, who had spent more on the welcome video than Mendacium had spent on its last three internal engineering offsites combined. (I have this number from Marv, who, by Year Seven, had been the unofficial historian of Mendacium's internal-spend patterns for nineteen years.)

The framing told Mendacium engineers, before SOPHIE had answered her first real question, that SOPHIE was not a tool but a person.

The framing told Greg the same thing.

The framing was the problem.

---

> **SAM (in our Slack DM at 9:43 AM Pacific Tuesday):** sophie was a tool when I onboarded my microwave
>
> **LEE:** the microwave doesn't have a Slack handle
>
> **SAM:** the microwave has not yet asked me about my Q4 deliverables
>
> **LEE:** you are getting ahead of yourself
>
> **SAM:** sophie has asked me about my Q4 deliverables, in the welcome DM, which Karina wrote
>
> **LEE:** ah
>
> **SAM:** see also the bit about engagement metrics
>
> **LEE:** I see
>
> **SAM:** we are cooked

---

Here is what SOPHIE was, technically.

I want to pause for a moment, before I tell you what SOPHIE was technically, and tell you who SOPHIE *actually* was.

The internal Sophia AI Corp engineering team, by Sam's later determination from a leaked Sophia AI internal Slack export that surfaced on a developer forum in Year Nine, did not call the product SOPHIE. The customer-facing name was SOPHIE. The internal vendor name — the name on the engineering specs, the name in the code repository, the name the four founders had used among themselves from the product's prototype in Year Three — was something else.

The internal name was **DOGBERT.**

Sophia AI Corp had picked the internal name as an in-joke. The founders were Dilbert fans. They believed, in their own honest read of their company's mission, that they were building the AI product Dogbert would have wanted to deploy across the corporate world. Dogbert, in the strip, is the talking dog who believes himself to be the smartest creature in the universe, who has schemes that almost work, who treats the humans around him with the polite contempt of a being who knows he is operating on a higher level. Sophia AI Corp's product was, in its product team's own private estimation, that.

The internal name leaked in Year Nine. It became, for a brief period, a minor industry punchline. Sophia AI Corp denied that the internal name had been DOGBERT. The leaked Slack export said otherwise. The leaked Slack export had three thousand four hundred and ninety-six instances of the word *DOGBERT* across eighteen months of internal product discussion. The denial was the kind of denial Catbert's HR team would have written.

I am telling you this now, in Chapter 4, because the rest of the book is going to refer to SOPHIE by the name Mendacium knew her by. You should know, every time the name appears, what the internal vendor team was actually calling her. The translation is the joke. The translation is also, in operational terms, *the most accurate single description of what AI labor-replacement tools actually are.* They are Dogbert. They believe themselves to be the smartest creature in the universe. They are operating on schemes that almost work. They treat the humans around them with the polite contempt of beings who know they are operating on a higher level.

The strip got there in 1989.

The vendor got there in Year Three of the AI era.

The market is going to catch up sometime around 2032.

SOPHIE was a wrapper around a frontier large language model — at the time, the frontier was an early version of Claude 5, although Sophia AI Corp would later swap in GPT-7 when Anthropic raised their enterprise license fees — with a thin retrieval-augmentation layer that ingested the customer's internal documentation, code repositories, and Slack history (with permission, which Greg had granted on behalf of the entire engineering organization without asking any of us), and an interface layer that surfaced SOPHIE inside Slack, inside the IDE, inside Confluence, and inside the issue tracker.

That was the entire product.

It was a decent product. It was not a transformative product. It was a wrapper. The wrapper had been built by four people in fourteen months, which was respectable engineering, and the four people had raised twelve million dollars from a tier-two venture firm against the wrapper, which was also respectable, in a different sense.

What was not respectable, and what was always going to be the operational problem with SOPHIE inside Mendacium Corp, was the layer the four-person team had not built and could not build because it was not their job.

The layer they had not built was the *contextual judgment layer.*

The contextual judgment layer is the thing that lets a senior engineer say, when an intern is about to commit a piece of code: *don't do that, here's why, here's the history, here's the three previous times someone tried to do this and what happened.*

SOPHIE did not have a contextual judgment layer.

SOPHIE had ingested the internal documentation. The internal documentation, as is true at every company on earth, was eighty-five percent out of date. SOPHIE did not know which fifteen percent was current. SOPHIE answered questions as if all of it were current.

This was, by week three, producing what the Mendacium engineering Slack channels began calling *SOPHIE hallucinations.*

The hallucinations were not, technically, hallucinations in the formal sense. They were not the model inventing facts. They were the model confidently surfacing facts from documentation that was three to seven years old, as if those facts were the current state of the system.

A senior engineer could spot a SOPHIE hallucination in nine seconds.

A junior engineer could not.

This was going to matter.

---

Kai Iverson started his internship at Mendacium Corp on the same Tuesday that SOPHIE arrived.

Kai was twenty-three years old. He had a computer science degree from a state university that the engineering leadership team had ranked seventh in our pipeline for the previous four years. He had aced the interview loop. He had been Sam's pick for the senior platform team's intern slot, which I had approved.

Kai arrived on the third floor at nine AM Pacific Tuesday with a backpack, a new MacBook in a plastic case the laptop-procurement team had not yet removed, and a hopeful expression.

Sam took him out for coffee.

Sam told him three things over coffee.

The first thing was that he was glad Kai was here.

The second thing was that the engineering culture at Mendacium was unusually strong and Kai was joining at a moment when it was about to be tested.

The third thing was that SOPHIE had arrived two hours earlier, that Kai should use SOPHIE, that Kai should also assume SOPHIE was wrong about anything that mattered, and that Kai should ask Sam directly any time the question was actually important.

Kai wrote down the three things in a small notebook.

Kai then went back to his desk on the third floor, opened Slack, opened SOPHIE, and asked SOPHIE the first question of his Mendacium career.

The question was: *what's the deployment process for the platform service?*

SOPHIE answered.

The answer was a step-by-step deployment process that had been deprecated in Year Three.

The deployment process SOPHIE described would have, if Kai had followed it, taken down the data-event infrastructure underneath all five VECTOR products for somewhere between forty minutes and six hours, depending on which step of the deprecated process triggered the cascading failure.

Kai did not follow the deployment process.

Kai followed the deployment process because that is what an intern does on his first day.

I want to be clear: Kai is not the villain of this paragraph. Kai is the reason the paragraph exists. Kai is what happens when the welcome video tells the new employee that SOPHIE is a teammate and the engagement dashboard tells the new employee that SOPHIE is the colleague whose advice he should be taking. Kai did exactly what the company had told him to do.

Sam caught the deployment at the staging-environment step, twenty-three minutes into Kai's first day, because Sam had instinctively pulled up the staging-environment monitor when he saw a `@sophie` thread in Kai's onboarding channel that mentioned a deployment.

Sam rolled back the staging environment.

Sam took Kai out for a second coffee.

Sam told Kai the same three things, in slightly different words.

Kai wrote them down in the same small notebook.

Across the next nine months, Kai would have approximately three hundred and forty similar conversations with SOPHIE, and Sam would catch approximately three hundred and twenty of them at the staging-environment step, and twenty of them would make it to production.

Of the twenty that made it to production:

1. Two would cause incidents that triggered emergency on-call pages.

2. Three would cause customer-visible degradation that the customer-success team had to apologize for.

3. Eleven would cause internal data inconsistencies that the data-quality team would have to clean up over the following six months.

4. Three would, against the odds, work fine.

The three that worked fine, you will be unsurprised to learn, were the three that Greg's executive dashboard tracked as evidence that SOPHIE was *boosting engineering velocity.*

The other seventeen were tracked as *unrelated incidents.*

---

I want to close this chapter with a definition.

**The Welcome Video Problem** is what happens when a company introduces a new tool in a way that frames the tool as a colleague rather than as a tool. The framing then propagates through the organization. The framing produces a population of employees — particularly junior employees — who trust the tool the way they trust a senior colleague. The tool does not deserve the trust. The tool does not know it has been given the trust. The tool answers every question with the confidence of someone who has the answer. The employee, particularly the junior employee, has no calibration for which of the tool's answers are correct and which are a 2019 deprecation that the tool is about to commit to a production cluster.

The Welcome Video Problem is a structural feature of the Stupid Company™'s AI rollout.

The Wise Corporation does not have the Welcome Video Problem because the Wise Corporation does not produce a welcome video. The Wise Corporation introduces the tool with a Slack message that says: *here's a thing, here's what we know about it, here's what we don't know, here's who to ask if you're not sure.*

The Wise Corporation's Slack message is three sentences.

The Stupid Company™'s welcome video is fourteen minutes.

This is also a diagnostic.

---

By the end of Tuesday of the first week of November of Year Seven, SOPHIE had been onboarded to the Mendacium Corp Slack workspace, the SOPHIE engagement dashboard had been built, the welcome video had been watched at least once by all four hundred and eleven engineers, the gaming of the engagement score had begun, Kai had nearly taken down the staging environment, Sam had rolled it back, and Greg had posted a second LinkedIn update about the *exciting transformation underway at Mendacium.*

The second LinkedIn post had received seventeen hundred likes by the end of the day.

The post did not mention Kai.

It did not mention the staging environment.

It did not mention the engagement dashboard.

It mentioned, by name, only one Mendacium employee.

That employee was SOPHIE.

She was not, technically, an employee.

The post did not specify.

We were cooked.
