# Chapter 8: The First Win

Aisha Bell got to her workstation Thursday morning at eight forty-five with her thermos and a yellow legal pad on which she had written, the night before, a single line: *cross-reference Lot 4471 cluster with maintenance + sensor data.*

She had spent the previous week loading documents into her NovaSyn context project. Not just her engineering notes anymore. Theo and Dana had cleared her to add the operational documents she needed. So she had added them. Every QC report from Shop A for the previous eighteen months. Every maintenance log on the aerospace fastener machines. The CSV exports of the shop-floor temperature and humidity sensors that the data-warehouse team had pulled for her on Tuesday. The spec sheets for every active fastener line. The customer-credit memos that Connie's team had filed against the aerospace accounts.

It was a lot of material. She had told NovaSyn what each folder was when she uploaded it.

She had not asked it any real questions yet. She had been building the project all week.

This morning was different.

She had a problem in mind.

---

It was called, in the engineering team's notes, *the M8 cluster.* It was a recurring micro-tolerance variance on the M8 aerospace fastener line that had been on Bellfield's books for fourteen months. It showed up in the QC data as a small but persistent drift on a particular subset of parts. It was not consistent enough to be a machine fault. It was not random enough to be statistical noise. It was something. Engineering had been chasing it for over a year. Patrick Whitmore — VP of Engineering — had personally rotated four engineers through the investigation in that time. None of them had pinned it down.

The cost was not nothing. Scrap rate on the affected runs was running about six percent above baseline. Customer credits had been issued three times. Patrick had a folder of open action items on his desk labeled *M8 Cluster — Pending.*

Aisha had inherited the folder in June. She had been working it intermittently between her other duties. She had a theory about a vibration-coupling issue at the bed of Machine 9 but she had not been able to prove it.

She typed into NovaSyn at nine o'clock Thursday morning:

*In the QC-report folder, find every M8 fastener run with a tolerance variance in the top quartile of the acceptable range or worse, over the last eighteen months. For each of those runs, cross-reference: which machine ran the part, the maintenance log entries for that machine within the seven days before and after the run, and the temperature and humidity sensor readings for the floor location of that machine during the run shift. Look for any pattern that correlates with the variance. Tell me what you find.*

She clicked Send.

NovaSyn took about ninety seconds. The cursor blinked. The status bar said *analyzing context project / 14 documents / 218 MB.*

She waited.

---

The response came back as a structured analysis. She read it once. She read it again. She read it a third time.

It said, in summary:

*The tolerance variance shows a strong correlation with humidity values above 58% on the shop floor at the time of the run. The correlation is not uniform across machines. It is concentrated on Machines 7, 9, and 12 — the three machines closest to the loading dock door (Door 4 on the floor plan referenced in the spec sheets). Humidity readings on the floor near those machines became more volatile after January 2025, which matches the date range provided in your maintenance logs for the HVAC retrofit completed in late 2024. The retrofit changed the airflow pattern in the shop. The machines nearest the loading dock door receive more variable humidity now than they did before the retrofit, particularly during loading-dock-door openings on humid days. Suggested next step: install a localized humidity sensor at Machines 7, 9, and 12 to verify, and review the HVAC retrofit airflow diagram for possible corrective measures.*

Aisha sat back in her chair.

She read it a fourth time.

She got up.

She walked the eighty feet from her workstation to Machine 7.

She looked at Machine 7. She looked at the loading dock door, which was fifteen feet away. She looked at the seal at the bottom of the loading dock door, which had been replaced in December 2024 as part of the HVAC retrofit because the new HVAC airflow design required a tighter seal. She looked at the gap between Machine 7's enclosure and the loading dock wall. The gap was about thirty inches.

She looked at the calendar on her phone.

The HVAC retrofit had been completed in November 2024.

The M8 cluster had started showing up in the QC data in January 2025.

She thought: *the HVAC retrofit. Of course.*

She walked back to her workstation at eleven fifteen.

---

She wrote it up.

She wrote a one-page memo with the NovaSyn analysis attached as an appendix. She wrote her own interpretation in her own words on top of it. She included a recommended next step — install a localized humidity sensor at Machine 9, the worst offender in the cluster, and run a two-week monitoring period to verify the correlation.

She walked the memo down to Theo's office at twelve oh-five.

Theo was eating a sandwich at his desk.

"I have something," she said.

"Okay."

"I think I found the M8 cluster."

Theo set the sandwich down.

"Sit," he said.

She sat. She handed him the memo. He read it. He read it a second time. He read the appendix.

"Aisha," he said.

"Yeah."

"You did this this morning?"

"Started at nine. Done at eleven fifteen."

"Two hours."

"With the cross-reference. The setup took me a week."

"Right."

He looked at her.

"I'm signing off," he said. "Get maintenance to install a sensor at Machine 9 today. I'll call John in maintenance directly. Two-week monitoring. If the correlation holds, we file the corrective-action plan."

"Today."

"Today."

She stood up.

"Aisha."

"Yeah."

"This has been on the books for fourteen months."

"I know."

"Walk me through one more time how you got from a hundred and eighty different QC reports to the humidity hypothesis."

"I didn't get from there. NovaSyn got from there. I asked it to cross-reference the QC reports with the maintenance logs and the sensor data. It came back with the humidity correlation in ninety seconds. I went and looked at the floor and saw the loading dock door. That was the part it couldn't see."

"The part it couldn't see."

"It can't look at the door. I can."

Theo looked at her for a moment.

"Get the sensor installed," he said. "I'm going to call Mark."

---

By Thursday afternoon the humidity sensor was on Machine 9. By Friday morning the sensor had logged enough data — there had been two loading-dock cycles overnight on a humid October night — to confirm the correlation. The Machine 9 humidity readings tracked the loading-dock door openings within a five-minute lag. The next M8 run on Machine 9, Friday at ten AM, came in with a tolerance variance that matched the predicted pattern: in spec, but at the upper boundary, during a period when the localized humidity at Machine 9 was running 61%.

The correlation held.

Theo emailed Mark at one fifteen Friday afternoon. The email had three attachments: Aisha's memo, the NovaSyn analysis, and the Machine 9 sensor log from the previous eighteen hours.

The subject line was: *M8 cluster — I think we have it.*

The body of the email was four sentences.

*Mark — Aisha Bell used NovaSyn Thursday morning to surface a correlation we have been missing for fourteen months. The M8 tolerance variance correlates with humidity changes caused by the 2024 HVAC retrofit, specifically on the machines closest to Loading Dock Door 4. Installed a localized humidity sensor Thursday evening. Confirmed Friday morning. Corrective-action plan in draft.*

Mark read the email at one twenty-two.

He read it a second time.

He called Yusuf at one twenty-five.

---

Yusuf Okafor was at his kitchen table at nine oh-three Saturday morning when his phone rang. He was eating a piece of toast and reading the Wall Street Journal on his iPad. His wife Adaeze was upstairs.

"Yusuf."

"Mark."

"I want you to look at something."

"Okay."

"I'm forwarding you Theo's email from yesterday."

"Hang on."

Yusuf put the toast down. He picked up the iPad. He opened the email. He read it. He looked at the attachments. He read the NovaSyn analysis.

"Mark," he said.

"Yeah."

"This is the M8 cluster?"

"This is the M8 cluster."

Yusuf was quiet for a moment.

"Patrick has been chasing this for over a year," he said.

"I know."

"What do you want from me."

"I want you to run the numbers. I want to know what this cost us. Scrap. Customer credits. Engineering time. The full number. I want it Monday."

"You'll have it sooner than Monday."

"Thank you."

Mark hung up.

Yusuf set the iPad down.

He had been building, quietly, for the past three weeks, a financial-impact dashboard for the TAO rollout. He had not told Mark. He had not told Dana. He had been doing it on the side because he wanted to see, by his own numbers, whether the rollout was producing real value or just producing the kind of activity that looked like value. He had built it in Excel on his home laptop. He had a tab for each department. He had a placeholder for *Shop A — material savings* that was empty because there had not yet been a material saving worth booking.

He opened the dashboard.

He went to work.

---

He called Theo at nine forty.

"Theo."

"Yusuf."

"I'm running the numbers on the M8 cluster."

"Okay."

"Scrap rate on the affected runs?"

"Six percent above baseline for the M8 line for the last fourteen months."

"How many runs."

"Seventy-three."

"Average run size in pieces."

"Forty-eight hundred."

"Material and labor cost per scrapped piece."

"On the M8 specifically. About one dollar twenty in material. About sixty cents in attributed labor. Call it a dollar eighty per piece."

"And the six percent above baseline."

"Baseline scrap is about one and a half percent. So the M8 cluster runs at seven and a half percent. The marginal scrap is the six percent. Six percent of forty-eight hundred is two eighty-eight pieces per run. Seventy-three runs. Multiplied out."

"Twenty-one thousand pieces."

"Yeah."

"At a dollar eighty."

"Roughly thirty-eight thousand a year."

Yusuf wrote it down.

"That's the scrap," he said. "What about the rework."

"Some of those went to rework rather than scrap. We had to pull machines off scheduled work for repolish and recut. I'd add another — call it — sixty thousand in displaced production time over fourteen months. That's a conservative number."

Yusuf wrote it down.

"Customer credits," he said. "How many."

"Three. Two on the original runs. One on a replacement order we couldn't get to spec on time and had to credit the rush charge."

"Total credit value."

"I don't have it in front of me. Connie has it."

"I'll call Connie."

"She's at her kid's soccer game until noon. She'll answer her phone but you might hear soccer."

Yusuf called Connie at nine fifty-five.

He could hear soccer.

"Connie."

"Yusuf. Hold on. Sweetheart, the orange one. Yusuf, go ahead."

"M8 fastener line. Customer credits over the last fourteen months."

"All three of them?"

"All three."

"Hang on. Let me — okay. Customer credit, July last year, forty-one thousand. Customer credit, January this year, fifty-eight thousand. Customer credit, August this year, the rush charge, thirteen thousand. One hundred twelve thousand total. Hang on — sweetheart, that's offside. Sorry, Yusuf. One hundred twelve thousand."

"Anything I'm missing?"

"There's a relationship cost I cannot quantify but you should know about. The aerospace account that ate two of those credits put us on a quarterly performance-review cadence in March that they didn't have us on before. That's not a dollar figure. That's a thing I think about every Sunday night."

"Noted."

"Anything else?"

"Not right now. Thank you, Connie."

"Yusuf — did Aisha really solve this?"

"Aisha really solved this."

"Tell her I owe her a drink."

"I will."

He hung up.

He wrote *112,000* on the customer-credit line.

He called Patrick Whitmore at ten fifteen.

---

Patrick Whitmore was VP of Engineering. Yusuf had known him for eight years. Patrick had been one of the four engineers who had personally rotated through the M8 cluster investigation.

"Patrick."

"Yusuf. Theo told me. He texted me this morning."

"How are you taking it."

"Honestly? I'm relieved. I am also embarrassed. Both at the same time."

"You shouldn't be embarrassed."

"I had four engineers on it. I had myself on it. I had a graduate intern from Cincinnati last summer on it. We couldn't see it."

"Could you have seen it if you had cross-referenced the QC data with the humidity sensor data?"

"Maybe. Probably. We didn't have a quick way to do that. The sensor data was in a different system. Nobody was looking for an environmental factor. We were looking at the machines and the bar stock."

"That's what I figured. Patrick — I'm running the financial impact. I need a number for engineering time."

"On the M8 cluster specifically?"

"On the M8 cluster specifically."

"Four engineers, intermittent, fourteen months. I'd estimate — I have a folder of chargeable hours, hang on."

He came back two minutes later.

"Twenty-four hundred hours of chargeable engineering time across the four engineers, summed."

"At your fully loaded rate."

"Call it eighty an hour. That's one ninety-two."

"One ninety-two thousand."

"Yes."

"Anything else?"

"I'm putting a junior engineer on Aisha's process for the next month. I want her to teach my team what she did. With your permission."

"With my permission?"

"With Mark's permission. I'll talk to him."

"Patrick."

"Yeah."

"Welcome aboard."

"Yusuf, I have been aboard. I have been waiting for the other engineers to be aboard."

Yusuf hung up.

He wrote *192,000* on the engineering-time line.

---

By Saturday evening Yusuf had the dashboard.

Scrap and rework: $387,000.
Customer credits: $112,000.
Chargeable engineering time: $192,000.

Total cost of the M8 cluster over fourteen months: $691,000. He rounded down to $689,000 because two of the engineering-hour estimates were soft.

Cost to solve: NovaSyn subscription at roughly $20 per seat per month, six pilot seats running, total subscription cost over the relevant period roughly $360. Aisha's time across two and a half days, roughly three hours of focused query work. One Hobo humidity sensor from the maintenance store, $340 with installation.

Total cost to solve: under one thousand dollars.

Yusuf looked at the dashboard for a long time.

He went and stood in front of the kitchen window. Adaeze was in the living room watching the news. The dishwasher was running.

He thought: *I have been a CFO for twenty years. I have seen a lot of consulting engagements that promised this kind of return. I have not seen one that delivered.*

He thought: *this delivered.*

---

He called Mark at eight thirty Sunday night.

"Mark."

"Yusuf."

"I have the numbers."

"Tell me."

"Cost of the M8 cluster over fourteen months — six hundred and eighty-nine thousand dollars. Scrap, customer credits, chargeable engineering time. Conservative on the engineering line; could be higher."

Mark was quiet.

"Cost to solve — under a thousand dollars. Twenty bucks of subscription, three hours of Aisha's time, and a humidity sensor."

"Yeah."

"Mark."

"Yeah."

"I want to accelerate the rollout. I want NovaSyn deployed in finance next month, not Q2. And I want to call Patrick Monday morning and accelerate engineering's onboarding."

Mark was quiet again.

"Let's not skip the operational milestones we set in the Blueprint Audit," he said. "We agreed to finish the Shop A pilot before we expand. That was a methodology choice. I don't want to drop it because we got an early win."

"Fair."

"But yes. Talk to Patrick. If engineering wants in earlier, that's not a skip — that's an existing department that volunteered to come into the pilot. We have room for one more department in the pilot if Patrick is ready."

"He's ready."

"Then talk to him."

"Mark."

"Yeah."

"I have been a CFO for twenty years. I have seen a lot of consulting engagements that promised this kind of return. I have not seen one that delivered. This one delivered."

"Yeah."

"I wanted you to hear me say it."

"Yusuf."

"Yeah."

"I hear you."

Yusuf hung up.

---

He sat at the kitchen table with the dashboard open.

The light over the kitchen sink was the only light on in the downstairs of the house. The dishwasher was on its final cycle. Adaeze had gone to bed an hour ago.

He looked at the dashboard.

He scrolled to the top.

He had a cell at the top of the dashboard labeled *Total program investment to date.* He had entered fifty thousand dollars three weeks ago — toolkit cost, Kindle hardware, the first quarter of subscription costs, the leadership working-session time, his own time on financial planning. Conservative number. He had thought of it as a soft sunk cost when he had entered it.

He typed into the *Realized savings* cell the figure $689,000.

He looked at it.

He thought: *we just paid back the fifty thousand we put in. From a problem nobody could solve for fourteen months. In three days.*

He closed the laptop.

He went upstairs.

His wife was already asleep.

He stood in the doorway of the bedroom for a moment in the dark. He thought about the Stevens engagement in 2018. He thought about the two-point-one million dollars that had disappeared into a custom-built analytics platform that had been decommissioned four years later. He thought about the look on Bryce Templeton's face in the boardroom in October when Mark had said *I want to take a couple of weeks.*

He thought: *Mark was right.*

He got into bed.

He did not sleep for a long time.
