# Chapter 10: Beast Games

The empire.app deployment ran Monday morning at nine eleven AM Eastern, on the dedicated Tauri-host server Karim had stood up across the previous weekend on the studio's own infrastructure, in a small data closet on the second floor of the Greenville facility that had been, before that morning, the room the studio's IT team called *the Closet Where We Keep the Thing Nobody Has Asked About Yet.*

The deployment took one minute and forty-one seconds.

The empire.app — fourteen hundred and seventeen lines of .agi, compiled to a 47.3-megabyte Tauri application with a deterministic hash that matched the one Christopher had read off the terminal in his workshop on Sunday evening at six oh-four PM Central — came up on the host at nine twelve AM Eastern, listened on its assigned port, and began the work of being the operating system of the empire.

Karim watched from his laptop in the doorway of the closet.

Jimmy watched from his desk in his office on a small browser window showing the dashboard the runtime exposed by default.

The deployment finished.

The dashboard showed sixty-three active constraint boundaries, four hundred and eleven scheduled operational checks, eleven distinct sub-system pipelines, and one banner across the top of the screen the runtime had auto-generated from the metadata in the .agi specification:

*Empire — operational specification version 1.0.0 — deterministic hash a4f2c81d — operator: J. Donaldson — cord-holder schedule: see system/cord-holders.*

Jimmy looked at the banner.

Karim, on the phone from the closet: "Jimmy."

"Karim."

"It's up."

"It's up."

"What do we do first."

"Beast Games."

"Beast Games."

"Beast Games has, in the past eighteen months, produced four operational failures that cost between two and seven million dollars each. The failures were, on Christopher's framing at four eleven PM Saturday in the workshop, the operational signature of a production line without a clear cord-holder. The empire.app — on the spec we wrote — identifies the Beast Games line, identifies the seventeen constraint boundaries it operates under, and assigns the cord to a single human to be named within four months. Until that hire, the cord is mine. For the next twelve to sixteen weeks. But the runtime is going to surface every constraint violation to my dashboard in real time and halt the line on any unresolved violation until I clear it. The runtime is going to do, on every constraint, every time, exactly what I've been doing in my head for eighteen months without me having to remember to do it. The runtime is more reliable than my own attention. So I'm going to be, in operational reality, *less* the cord than I've been, because the cord is now in the runtime. Karim. Beast Games starts production on the new season's casting cycle Friday. We run the Friday cycle through the empire.app. We find out Friday whether the architecture is the architecture."

"Friday."

"Friday."

"I'll brief the Beast Games ops team this afternoon."

"Good."

Karim hung up.

Jimmy looked at the dashboard.

He clicked into the *Beast Games* sub-system.

The view loaded.

Seventeen constraint boundaries. Contestant medical clearance. Contestant background verification. Contestant insurance. Talent agency contract compliance. Set construction safety. On-site medical staff ratio. On-site security staff ratio. Broadcast clearance for filming locations. Sponsor compliance for product placement. Prize disbursement legal compliance. Child-labor compliance for any contestant under eighteen. Food service compliance for on-set catering. Transportation insurance for contestant transport. Set construction permits. Broadcast standards compliance for filmed content. Post-production legal review for filmed content. And a seventeenth boundary the spec had emitted under the label *operational integrity — show is the show.*

The seventeenth boundary was, on Christopher's quiet articulation at three forty PM Sunday afternoon, the boundary that distinguished Beast Games from a generic large-scale entertainment-production line. It required the runtime to verify, on every operational decision, that the decision was consistent with the operational identity of the show as Jimmy had defined it in the .agi file. The boundary was a generative-AI-mediated check that ran every decision through a build-time-compiled adversarial prompt Christopher had designed specifically for the empire.app.

It was the boundary Jimmy had spent the longest of the three days in Ava arguing with Christopher about.

The argument had not been about whether it should exist. It had been about whether it was, in operational terms, a cord Jimmy could hand off.

Christopher had said no. *Because the show is your show. The cord on the show's identity is not a cord any other human can pull on your behalf until the show has, in its operational evolution, become a show that is not, in any operationally meaningful sense, your show.*

Jimmy had said: I want the cord to be transferable.

Christopher had said: it can be transferable. The transfer is going to be the operational milestone that signals the end of the founder phase of the empire. The transfer is not going to be in this version of the specification.

Jimmy had said: when.

Christopher had said: I don't know when. The when is on you. The spec will have a hook for the transfer when you tell me you're ready. Until then, the hook is empty.

Jimmy had said: the hook is empty.

Christopher had typed the empty hook into the specification.

The empty hook was, Monday morning at nine fourteen AM, the only TODO marker in the runtime.

Jimmy looked at it.

Clicked away from *Beast Games.*

Clicked into the *Beast Philanthropy* sub-system.

The Beast Philanthropy sub-system showed nine constraint boundaries, all of them currently assigned to a single cord-holder. The dashboard's cord-holder field, on every Beast Philanthropy boundary, read: *T. Khoza.*

Jimmy looked at the field.

Read it nine times.

He recognized, at nine sixteen AM Monday morning, that the field reading *T. Khoza* on every Beast Philanthropy constraint was, in operational reality, the formal naming of what Thandi had been doing on her own initiative since the photograph from the third classroom.

He picked up his phone.

He called Thandi.

It was nine seventeen AM in Greenville.

Three seventeen PM in Underberg.

She answered on the second ring.

"Jimmy."

"Thandi."

"Is it up."

"It's up."

"What does it look like."

"Your name is on every Beast Philanthropy constraint. Nine constraints. Nine instances of *T. Khoza.* The runtime is going to send you operational notifications when constraints fire. It will only escalate to me if you can't, within the configured response window, clear the notification. The window is, on the default Christopher and I set on Sunday, seventy-two hours. I'm the escalation. I am not the operator. You are the operator."

She was quiet for a beat.

"Jimmy."

"Yeah."

"Thank you."

"Thandi."

"Yeah."

"I should have done this two years ago."

"Jimmy."

"Yeah."

"You did it on the right day. Don't relitigate the date."

He laughed.

"Thandi."

"Yeah."

"Build the schools."

"I'm building the schools."

She hung up.

Jimmy set the phone down.

Looked at the dashboard.

Worked through the day.

---

The Beast Games Friday casting cycle ran on the empire.app starting at eleven AM Eastern Friday.

The cycle was, on the standard model of Beast Games' new-season casting, a single-day operational push that processed about fourteen hundred applicants through six review stages — initial-screen video review, application-form verification, background-check submission, medical-clearance submission, agent-contract negotiation triage, and final scheduling. The cycle had, across the past four seasons, produced about two operational failures per cycle on average, primarily in the agent-contract triage and background-check stages, where applicants who appeared qualified at the initial-screen stage turned out, forty-eight to ninety-six hours later, to have constraints that should have screened them out earlier.

The two-failures-per-cycle had, on Karim's accounting, cost the production approximately three hundred thousand dollars per failure across the past four seasons.

The Friday cycle on the empire.app ran the same fourteen hundred applicants through the same six stages.

The empire.app halted the line eleven times during the cycle.

On Karim's review of the runtime logs at four PM Friday, the eleven halts were eleven applicants who, at the initial-screen stage, the runtime's seventeen-boundary check had identified as having one or more downstream constraint violations that would, in the pattern of the past four seasons, have surfaced as failures forty-eight to ninety-six hours later.

The runtime did not reject the applicants.

The runtime, on the configured behavior of the check, halted the line, surfaced the specific constraint, and routed each applicant to a manual-review queue the casting team could process across the next four hours with full visibility into what had triggered the halt.

The casting team processed the eleven across the next three hours and forty minutes.

Eight cleared on additional documentation.

Three declined on the surfaced constraints.

The three declines were, on the cost-per-failure history of the past four seasons, about nine hundred thousand dollars of avoided downstream cost.

The eight clears were, on the standing operational reality of how previous manual-review queues had disrupted casting cycles, about a hundred and forty hours of avoided casting-team labor.

The Friday cycle finished at six twelve PM Eastern.

Fourteen hundred and three applicants. One thousand three hundred and eighty-eight cleared to the on-site interview stage. Three declined. Zero escalated to Jimmy's dashboard.

In the seven hours and twelve minutes of the cycle, Jimmy had received zero notifications.

In the same seven hours and twelve minutes he had filmed two cold-opens for the personal channel, recorded the audio for a podcast appearance scheduled for the following week, taken Thea on a forty-five-minute lunch in downtown Greenville, and read about sixty pages of a book on the history of the Erlanger Toyota plant Karim had handed him Wednesday morning with the note *read this on the plane to Missouri but don't tell Christopher I gave it to you.*

He had not, in the same seven hours and twelve minutes, been the cord on Beast Games.

The cord had been the runtime.

At six fourteen PM Karim walked into the office.

Sat down at the Type 4 table.

"Jimmy."

"Karim."

"The Friday cycle finished two minutes ago. Cleared thirteen-eighty-eight. Declined three on surfaced constraints. Zero escalations to you. The cycle's operational performance, on every measure I can apply, is the best Beast Games casting cycle in four seasons. About nine hundred thousand of avoided downstream cost on the declines. About a hundred and forty hours of avoided casting-team labor on the transparency. The performance is, on my honest accounting at six fourteen PM Friday, the operational signature of an empire that has, for the first time in nine years, found its architecture."

"Karim."

"Yeah."

"Send Christopher a screenshot of the dashboard."

"What do I caption it."

"Don't caption it. Send the screenshot. He'll recognize what he's looking at."

Karim pulled out his phone, took the screenshot, sent it to Christopher's GitHub-public email at six fifteen PM Eastern.

The reply came at eleven forty-one PM Central Friday night — about twenty-three minutes after Christopher had come back into the workshop after Sarah's Friday-night supper.

Three lines:

*Good.*

*The cord is the runtime.*

*— C.B.*

Karim showed Jimmy.

Jimmy read it three times.

"Karim."

"Yeah."

"The cord is the runtime."

"The cord is the runtime."

"Eighty-four days into the ninety. Closing the window six days early."

"Jimmy."

"Yeah."

"Go home."

"Going home."

He grabbed his jacket and the bound notebook Karim had bought him in 2022 that he had, across the previous week, written about forty pages in.

Out of the office.

Drove home.

At the house at six forty-eight PM Eastern Friday evening.

Thea was on the back porch.

She had two glasses of wine.

She handed him one.

"Day seventy-six."

"Day seventy-six. The model works. The cord is the runtime. We're closing the ninety-day window six days early."

"Jimmy."

"Yeah."

"I'm closing it tonight."

He looked at her.

"Close it."

"Closed."

She drank the wine.

He drank the wine.

The empire, for the first time in nine years, was running without Jimmy at the bottom of every constraint.

The Hershey Company was, at six forty-nine PM Eastern that same evening, in a conference room in the Trust building in Hummelstown, where Eleanor Whitcomb was in the eleventh minute of an eleven-minute speech she had been preparing across the previous three weeks.

That speech is the next chapter.

It is, on Eleanor Whitcomb's honest accounting, the speech that ends her thirty-eight-year career at the Hershey Trust Company.

Chapter 11 starts now.
