# Chapter 5: The First Round

The first round of layoffs at Mendacium Corp came on a Wednesday in late January of Year Eight, eleven weeks after SOPHIE arrived.

The number was seventeen.

Eleven engineers. Four product managers. Two designers.

I want to give you the actual list. Not the names — I am not going to do that to people who have been through enough — but the roles. Because the roles are the diagnostic.

The seventeen people Greg laid off in the first round were:

1. Two senior engineers from the platform team who had, between them, twenty-three years at Mendacium.

2. One senior engineer from VECTORSCAN who had been the original author of the analytics layer.

3. Three mid-level engineers spread across the five VECTOR products, picked because their Q4 performance review scores had been in the bottom thirty percent. (Their Q4 performance review scores had been in the bottom thirty percent because their managers had been working through a normal distribution. Every quarter, somebody is in the bottom thirty percent. That is what *thirty percent* means.)

4. Five junior engineers who had been at Mendacium for between one and three years. I am told these five were picked by an algorithm Karina's office had built in conjunction with Sophia AI Corp's professional-services team. The algorithm was designed to identify *low-augmentation-potential engineers* — engineers whose work was, by SOPHIE's own internal assessment, *highly automatable.* Of the five, three had been actively mentored by Sam over the previous eighteen months and were, in Sam's professional opinion, among the most promising engineers at the company. The algorithm did not have access to Sam's professional opinion.

5. Four product managers, picked because their job titles contained the word *associate.* I am not sure if that is the full criterion. The HR communication did not specify.

6. Two designers, picked because their team had been merged with the product-marketing organization in a reorg three weeks earlier, and the merger had resulted in role overlap, and two of the four overlap-affected designers were the two who had been less politically active in the reorg conversations. (The two who were *more* politically active had survived. This is a generalizable pattern at the Stupid Company™. It is not generalizable at the Wise Corporation. We will get there.)

7. **Marv Donaldson.**

I have listed Marv separately because Marv's layoff is the one this chapter is about.

I told you in Chapter 1 that Marv was Wally. I told you the equivalence was real. I told you there was a twist that the strip had not had room to show. The twist is in this chapter. The twist is what the rest of the strip's reader-base has been wrong about, gently, for thirty-five years, because the strip is three panels, and the twist takes about nine years of close observation to develop, and the strip moved on too quickly to follow it. The strip's Wally is the lazy engineer who does nothing. The book's Wally is the engineer who calculated the minimum he had to do in order to keep his job, who has been doing exactly the minimum for twelve years, and whose minimum is, by every honest accounting of the company's operational dependencies, *the most load-bearing engineering work happening at Mendacium Corp.*

The strip's Wally was the punchline.

The book's Wally is the proof.

Adams was, gently, half-right about Wally. The half he was right about was the surface. The half he was wrong about — or, more honestly, the half he did not have the panels to show — is what the rest of this chapter is going to walk you through.

I will be referring to him as Marv throughout.

Both names are him.

---

Marv had been at Mendacium for twenty-one years.

Marv was forty-seven years old at the time of the layoff. He had a wife who taught fifth grade at a public school in West Seattle, and two daughters in high school, and a house in Burien that he and his wife had bought in Year minus four (which is Year minus four from the start of this book, not Year minus four from Marv's start at Mendacium — Marv had bought the house seventeen years into his Mendacium tenure, by his own description because it had taken his salary that long to make a Burien mortgage feel survivable).

Marv had been a senior engineer at Mendacium for nine of his twenty-one years. He had been a principal engineer for six of those. He had been at the highest individual-contributor level in the company — a level the company called *Distinguished Engineer*, which Marv himself privately called *the title you give to the senior people you don't trust to manage anyone* — for the previous six years.

He was, by any honest accounting of the engineering organization's actual technical depth, among the four people in the entire company who knew how the VECTORLINE legacy codebase actually worked.

He was the most senior of the four.

He was also, by his own design, the lowest-output of the four.

This is the part I want to spend time on.

---

Marv did the minimum.

Marv had done the minimum for the previous twelve years.

The minimum, in Marv's calibration, was: thirty hours a week of actual work, performed at a level of competence that nobody could complain about; one core technical contribution per quarter, which was always the highest-leverage piece of work happening in the organization that quarter; presence at the meetings he had to be at; absence from the meetings he did not have to be at; and an unwavering commitment to leaving the office by four-thirty PM every day, regardless of what was on fire.

Marv had calculated the minimum.

The minimum had not changed in twelve years.

The minimum, by the time Greg fired him, had produced approximately forty-eight pieces of high-leverage technical work. The forty-eight pieces of work were the load-bearing pillars of the entire VECTORLINE platform. Without them the platform would not have functioned. With them the platform produced four hundred and forty million dollars a year of recurring revenue.

That was Marv's output.

The output was, by every dollar-per-engineer metric the company tracked, the highest output of any individual contributor in the engineering organization across his entire tenure.

The output was also, by every *engagement* metric the company tracked, in the bottom five percent.

Marv did not engage.

Marv did not post in the engineering Slack channels.

Marv did not attend the optional Thursday-afternoon learning sessions.

Marv did not participate in the engineering organization's quarterly hackathons.

Marv did not have an opinion about Haikus or pop choruses or Dr. Seuss.

Marv did not, in the eleven weeks SOPHIE had been at Mendacium, run a single SOPHIE query other than the one query he was required to run during the onboarding video. His SOPHIE engagement score was, at the time of his firing, the lowest in the engineering organization.

That was the criterion that put Marv in the first round.

Marv was, by Greg's algorithm's own description, a *low-augmentation-potential engineer.*

---

Here is what an algorithm cannot tell you about Marv.

1. Marv knew where seventeen specific pieces of dead code lived in the VECTORLINE codebase that, if anyone touched them, would cause production incidents. Marv had documented this in a private Notion page he had been keeping for six years. The Notion page was titled *DO NOT TOUCH.* The page had four read accesses from people who were not Marv. All four were Sam, who Marv had given access to in Year Eighteen of his tenure.

2. Marv knew the seven external customer integrations that were operating in undocumented ways with the VECTORLINE platform — integrations that the original integration partners had built six to ten years ago using endpoints that the platform team did not know existed. Marv had personally been keeping these integrations alive for the previous four years by responding to internal support tickets that, in any other engineer's hands, would have been closed as *unable to reproduce.*

3. Marv knew, by name, the seventeen Mendacium customers whose contracts depended on the seven integrations. Two of the seventeen customers were among the top five Mendacium accounts by ARR. The integrations were, in Marv's own private estimation, worth approximately ninety-six million dollars of annual recurring revenue.

4. Marv knew none of this had been written down outside of his *DO NOT TOUCH* page, because Marv had, twelve years earlier, decided that documenting institutional knowledge in a way that was widely accessible would lead to him being fired.

5. Marv had been right.

---

The decision to fire Marv was made by a man named Bo, in HR, who had been at Mendacium for three years, who had never met Marv, and who had been given by Karina an algorithm-generated list of *layoff candidates from the bottom decile of the SOPHIE engagement dashboard.* Bo had reviewed the list. The list contained Marv's name. Bo had no way of knowing that Marv was load-bearing. The algorithm did not have a column for *load-bearing.*

Marv was on the list because Marv did not run SOPHIE queries.

Marv did not run SOPHIE queries because Marv did not need to.

Marv had been doing his job for twenty-one years.

---

> **REAGAN (in our private Slack the morning of the layoff, 9:12 AM):** they're firing Marv
>
> **LEE:** they cannot be firing Marv
>
> **REAGAN:** they are firing Marv
>
> **LEE:** does Greg know what Marv does
>
> **REAGAN:** Greg does not know what most people do
>
> **LEE:** Karina
>
> **REAGAN:** Karina knows what people are *titled.* Karina does not know what people *do.* Different department.
>
> **LEE:** sam
>
> **REAGAN:** Sam is at the dentist. He's about to walk into the office and find out.
>
> **LEE:** I'm walking up to the fifth floor
>
> **REAGAN:** Lee
>
> **LEE:** what
>
> **REAGAN:** Don't go up to the fifth floor.
>
> **LEE:** why not
>
> **REAGAN:** Because the fifth floor decided this a week ago and you walking up there will just put your name on the second list.
>
> **LEE:** the second list
>
> **REAGAN:** Lee.
>
> **LEE:** there's a second list
>
> **REAGAN:** of course there's a second list.
>
> **LEE:** ...
>
> **REAGAN:** Don't go up.

---

I did not go up.

I went down.

I went down to the third floor where Marv's desk was. Marv had not yet been notified. The layoff calls were scheduled for ten-thirty AM. It was nine-eighteen. I had seventy-two minutes.

I walked to Marv's desk.

I sat down on the empty chair next to it.

I said: "Marv."

Marv said: "Lee."

I said: "Marv, give me your *DO NOT TOUCH* page."

Marv looked at me for one second.

Marv said: "How bad."

I said: "Ten-thirty."

Marv said: "All right."

He turned to his laptop. He pulled up Notion. He shared the *DO NOT TOUCH* page with me. He shared it with Sam. He shared it with two other people on the platform team whose judgment he trusted. He added a single new line at the top of the page. The line was: *If you are reading this and Marv is no longer here, please call Marv first. His number is below.* He typed his cell phone number.

He saved the page.

He looked at me.

He said: "Lee, the seven integrations are real."

I said: "I know they are."

He said: "The ninety-six million is real."

I said: "I know it is."

He said: "The page is going to keep them alive for about six months without me. After six months somebody is going to touch one of the seventeen pieces of dead code, and the company is going to lose somewhere between two and four of the seven integrations within ninety days of that. After that the customers are going to start churning."

I said: "I know they are."

He said: "Greg is not going to know any of this until the churn shows up on the dashboard."

I said: "I know."

He said: "The churn is going to show up on the dashboard in approximately twelve months."

I said: "I know."

He said: "Lee."

I said: "Yes."

He said: "Save the page. Save it to your personal drive. Get a copy out of the Mendacium tenancy. The Mendacium tenancy is going to be hostile to the page within a year."

I said: "Marv."

He said: "Yes."

I said: "I will save the page."

He said: "Thank you."

I said: "Marv."

He said: "Yes."

I said: "What are you going to do."

He looked at me for a long moment.

He said: "Lee, I am going to take six months. My wife and I have been saving since Year Two. The mortgage is half-paid. The kids are doing fine. After six months I am going to go take a position somewhere that will hire me for what I actually do. I have been quietly talking to three companies since the conference. Two of them have offers on the table. I have not accepted because I was going to wait until something here forced my hand. The thing has forced my hand. I am going to call the better of the two offers this afternoon."

I said: "Marv."

He said: "Yes."

I said: "Which company."

He looked at me. He smiled, very slightly.

He said: "Hyperion Studio. You won't have heard of them. They are twenty-three people."

I said: "Marv."

He said: "Yes."

I said: "I am going to remember that name."

He said: "Good."

I went back to my desk.

I copied the *DO NOT TOUCH* page to my personal Notion. I copied it to a USB drive I had bought for unrelated reasons three years earlier. I copied it to my personal email. I copied it to a printout I stapled and put in my filing cabinet at home that weekend.

The page is, at this writing, in four places.

Marv was right about the ninety-six million.

Marv was right about the twelve months.

Marv was right about the company that would hire him for what he actually did.

I will get to Hyperion in Chapter 21.

For now, here is the lesson of this chapter.

---

**Marv's Law:**

*The single most valuable employee in any company at the moment of an AI-driven layoff is, with probability approaching one, the employee whose SOPHIE engagement score is in the bottom decile.*

This is true because the employees in the bottom decile of any new-tool engagement metric are, in roughly nine cases out of ten, the employees whose work product was good enough before the new tool that they did not need the new tool.

The algorithm that scores them does not have a column for *was already good at the job.*

The algorithm that fires them does not have a column for *load-bearing.*

The dashboards do not catch this for between nine and twenty-four months, depending on the company.

By the time the dashboards catch it, the load-bearing employee is at a different company.

By the time the company realizes they need the employee back, the employee is on a Slack channel at the new company that is the most active Slack channel they have been on in twelve years.

We are going to spend a lot of the next chapter on the dashboards.

The dashboards are the next chapter.

The dashboards are why we are cooked.
