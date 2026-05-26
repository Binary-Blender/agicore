# Chapter 24: What Sam Built in His Spare Time

Sam called me at six-eighteen PM Pacific on a Thursday in my second month at Hyperion.

He said: "Lee."

I said: "Sam."

He said: "I have been building a thing in my spare time for two years. The thing is open-sourceable. I want to show it to Theo and Yumi. I would like you to look at it first and tell me whether it is ready to show them."

I said: "Send it to me."

He sent it to me at six twenty-one PM.

The thing was a public GitHub repository. The repository contained a small tool that, when pointed at a company's internal Slack workspace, computed a set of metrics from the message volume, the cross-channel diversity, the response-time patterns, and the participation distribution, and produced a daily report that, in plain English, characterized the *organizational temperature* of the company.

The report did not look like an executive dashboard.

The report looked like a paragraph that a careful observer would write after spending a week watching the company's internal communications.

Sample paragraphs from the test runs Sam had done:

> *Engineering team is shipping at velocity but the conversational diversity has dropped fourteen percent in the previous thirty days. Three engineers who normally participate across at least four channels are now participating in only one or two. Two engineers who normally initiate conversations are now mostly responding. Recommend a check-in with the team lead within the next week.*

> *Customer-success team has had unusually high cross-team conversations with engineering this week. Most of the conversations are about a specific product area. Customer escalations may be on the way to engineering's queue inside three days.*

> *Executive Slack activity has dropped to a four-month low. The five participants normally most active are now mostly silent. Major decision-making appears to be moving off-platform.*

The reports were paragraphs.

The paragraphs were, by Sam's own analysis across the previous twenty months, *roughly seventy-five percent accurate* at predicting organizational events three to ten days in advance.

The reports were the most accurate predictive tool Sam had ever built.

The reports had been built, across two years of Sam's evenings and weekends, on the substrate of his own observations of Mendacium's slow collapse.

The reports were, by Sam's later description to Theo, *the tool I wish I had built five years earlier and could have used to predict what was going to happen to Mendacium.*

---

I looked at the repository for two hours that Thursday night.

I read the README. I read the test outputs. I read the methodology section. I read the code.

The code was clean. The methodology was conservative. The accuracy claims were backed up by the test data, which was, in itself, anonymized and reproducible. The tool ran locally — there was no SaaS component, no data sent to a third party, no privacy concern that I could identify.

I called Sam back at eight twenty-eight PM Pacific.

I said: "Sam."

He said: "Yes."

I said: "It is ready."

He said: "Are you sure."

I said: "Sam. Yes. The tool is ready. The README is ready. The methodology is ready. The accuracy claims are conservative and defensible. Theo and Yumi are going to want to see this tomorrow."

He said: "I have a slot with Theo on Friday at three."

I said: "Take it."

He said: "Will you be in the room."

I said: "Yes."

He said: "Thank you."

---

The Friday meeting with Theo ran from three PM to four forty-two PM.

Sam walked Theo through the tool.

Theo listened for fifty-eight minutes.

Theo asked four questions.

The first question was: *what does the tool produce for Hyperion if we point it at our own Slack.* Sam had not run the tool on Hyperion's Slack. Sam had not had access. Sam asked if he could run the tool on Hyperion's Slack now. Theo said yes. Sam ran the tool for fourteen minutes. The tool produced a paragraph. The paragraph said, among other things, that Hyperion's conversational diversity was unusually high, that the cross-team participation was unusually balanced, and that the company's exploratory cognition density (Sam had built the phrase into the tool's vocabulary, having picked it up from a field note he had read in the previous summer that I had not yet given him the byline on) was, by the tool's measure, in the top decile of all companies the tool had ever been pointed at.

Theo read the paragraph.

Theo said: "Sam."

Sam said: "Yes."

Theo said: "Run it again next week."

Sam said: "All right."

The second question was: *what is the tool's monetization model.* Sam said he did not have a monetization model. Sam said he had built the tool because he had needed it, and he wanted to give it away. Theo said: *Sam, the tool is worth somewhere between fifty and two hundred million dollars across the next decade.* Sam said: *I am aware that it might be.* Theo said: *what do you want to do with it.* Sam said: *I want to open-source the tool and let the community build on it. I would like to spend the next two years, at Hyperion, building the proprietary layer that does what the open-source tool does not do.* Theo said: *what is the proprietary layer.* Sam described the proprietary layer across the next nineteen minutes.

The proprietary layer, by Sam's description, was the part of the tool that *connected* the organizational-temperature signal to specific actionable interventions. The open-source tool told you what was happening. The proprietary layer would, given what was happening, suggest what to do about it.

The proprietary layer was, in Theo's read by the end of the description, *the product Hyperion has not been able to articulate that we needed to build, that you have been articulating in your spare time for two years.*

The third question was: *Sam, when can you start.* Sam said: *I am at Mendacium until the eighteenth.* Theo said: *can you start the nineteenth.* Sam said: *I have already given my notice. The nineteenth is the first day I am available.*

The fourth question was: *Sam, what would you like to be called.* Sam said: *I do not have a strong preference.* Theo said: *we are going to call you a Distinguished Engineer. The title comes with a comma. The comma means you are the kind of person we are going to write down our hires after, the way Don Pillai wrote down his.* Sam said: *I am honored.* Theo said: *the offer letter will be in your inbox by tomorrow morning.*

The offer letter was in Sam's inbox by Saturday at six AM.

Sam accepted on Saturday at noon.

Sam started at Hyperion on the nineteenth.

The open-source tool launched on the twenty-third.

The launch was a Hacker News front-page post for thirty-four hours.

The launch produced, in its first month, eleven thousand stars on GitHub, four hundred and ninety-three forks, and seventeen inbound enterprise inquiries.

Theo signed the first enterprise contract for the proprietary layer in October of Year Eight.

The proprietary layer became, by the close of Year Nine, the second-largest product line at Hyperion Studio.

The proprietary layer is, at the time of this writing, the product that has, by my estimation, contributed somewhere between thirty and forty percent of Hyperion's total revenue across the previous three years.

The proprietary layer was originally built, in evenings and weekends across two years, by an engineer whose previous employer had called the work *goofing off* and shut down the conference room where the conversations that produced it had been happening.

---

I want to draw the lesson plain.

The exploratory cognition density of a Wise Corporation is, in operational terms, *the willingness to acquire the tools your engineers built in their spare time at other companies.*

The Stupid Company™ does not acquire those tools because the Stupid Company™ does not believe the tools exist. The Stupid Company™ does not believe the tools exist because the Stupid Company™'s own engineers have stopped building them, because the Stupid Company™ has, through its own behavior, told them not to.

The tools exist anyway.

The tools are being built by engineers in their spare time, on weekends, in evenings, in the seventeen percent of the day the Stupid Company™ has not yet figured out how to capture.

The tools are then taken to the Wise Corporation.

The Wise Corporation acquires the tools.

The Wise Corporation acquires the tools by acquiring the engineers.

The Wise Corporation does not pay separately for the tools. The Wise Corporation pays for the engineer. The tool comes with the engineer.

The acquisition is, in operational terms, a free transfer of intellectual property from the Stupid Company™ to the Wise Corporation, brokered by the engineer's choice of employer.

The Stupid Company™ does not notice the transfer because the Stupid Company™ never knew the IP existed.

The Wise Corporation notices.

The Wise Corporation, across the next decade, is going to receive an enormous transfer of unbuilt-IP from the Stupid Companies™ that have spent the previous decade telling their engineers to stop exploring.

This is the structural advantage.

This is the compounding.

This is, in the language of the field note that started this book, *the cognitive amplification asymmetry.*

---

The next chapter is the operating manual for the Wise Corporation.

If you have made it this far, you may want to build one.

The chapter is the manual.

The manual is, by my honest estimation, the part of this book that, on a good week, justifies the price of the book on its own.

I will see you there.
