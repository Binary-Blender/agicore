# Chapter 9: The Floor

Mara Quinn knocked on the study door at the Bainbridge house at 10:47 PM Pacific on a Saturday in February of Year Two.

Cole opened the door in shirtsleeves.

"Mara."

"Cole. We have a problem at Goodyear. I need the room."

He stepped back. She closed the door behind her and walked to the desk and set a closed laptop on the leather blotter and did not open it.

"Tell me the headline."

"The first-wave conversion at Goodyear goes live Monday at oh-six-hundred. Somebody has been paying a sysadmin in the Goodyear IT cell to push a malicious patch into the warehouse-management cutover at the moment the Carry platform comes up. The patch is staged. The sysadmin is on the Sunday-night shift. The shift starts in twenty-seven hours."

Cole looked at the closed laptop.

"How long have we had this."

"Ninety minutes. The signals desk caught a fragment off an encrypted relay we have been mapping since November. We pulled the thread for forty minutes. The thread held. I called the FBI cyber duty agent in Phoenix at ten-twelve. I called you at ten-forty-seven."

"Who is paying."

"A short-only fund out of Greenwich. Thane Bridgeport. Marcus Thane is the managing partner. Three-point-one billion under management, all short, all the time. He has a one-point-eight-billion-dollar short position open against Carrick as of Friday's close. He has been adding to it across the past nine sessions on roughly the schedule of the first-wave conversion announcements."

"The intermediary."

"A former Carrick corp-dev manager named Eliot Brennan. We let him go in November. Eight years at the company. He has been on the Thane payroll since the third week of December as an outside consultant on, quote, platform-strategy intelligence. He recruited the sysadmin at the end of January. The sysadmin is a thirty-four-year-old named Trent Halverson. Six years at Goodyear. Carries forty-six thousand dollars of credit-card debt across four cards. Wife just left him in October. He has been paid one hundred twelve thousand dollars to push the patch."

"What does the patch do."

Mara opened the laptop. She turned it so Cole could read.

"The patch corrupts the tenant-coordination layer at the moment the Carry platform handshakes with the floor for the first time. From the outside it looks like the Carry platform itself failed to come up. The retail WMS would stay live. The tenant onboarding would fail every API call for the first ninety minutes. Press reads it as the pivot stalling at launch. Stock opens down fifteen at the bell."

Cole read the screen.

"And Thane's position."

"Goes from one-point-eight billion to roughly four-point-three before the close on Monday. The fund would clear about two billion on a successful patch."

Cole closed the laptop.

"Where is Halverson right now."

"At home. Glendale. The detail has him."

"The patch."

"Staged in his locker at the facility. We have eyes on the locker. He pulls it at the start of his Sunday-night shift."

"FBI."

"Cyber duty agent is in the Phoenix field office now. Special Agent Reyes. She has been briefed to the level she needs to be briefed to. She is waiting on a phone call from me."

Cole stood at the desk for four seconds.

"Mara."

"Yes."

"If we arrest Halverson tonight, Thane sees the position go quiet and pulls. We catch a sysadmin and a former corp-dev guy and lose the fund."

"Yes."

"If we let the patch run."

"It runs into whatever environment we let it run into."

He looked at her.

"Get me Anjali. Get me Reese. Get the Gulfstream up at Boeing Field for an oh-one-hundred wheels-up. I want Phoenix-Goodyear Airport, not Sky Harbor. I want the small hangar at the south end that the Reese flew the Citation out of last March. I want the FBI in the hangar when I land. I want Halverson's badge access cloned by the time the Sunday-night shift starts. And I want a parallel WMS cutover branch standing in a clean partition by sunrise."

"On it."

"Mara."

"Yes."

"Annika is in Vancouver until Tuesday."

"I know she is."

"Good."

She walked out.

Cole picked up the encrypted satphone off the desk and dialed Anjali Rao.

She picked up on the first ring.

---

The Gulfstream G700 broke ground at Boeing Field at 1:04 AM Pacific. Cole in the back-cabin conference seat with the laptop open and Anjali across from him in jeans and the fourteen-year-old vest she had pulled out of the closet at midnight. Mara up front with the operator. Bear behind, two seats back, awake, silent.

Anjali had been reading the threat brief for thirty-one minutes. She closed the laptop.

"Cole."

"Yes."

"We let the patch run."

"We let the patch run."

"Into a partition."

"Into a partition Halverson cannot tell from production by looking at his console. The handshake telemetry has to look real. The API endpoints have to respond the way production responds. The patch has to think it landed."

"Reese."

"Reese is in the air out of Boeing. Different plane. He'll be on the hangar floor by oh-four-thirty Phoenix."

"The conversion still goes live at oh-six-hundred."

"The conversion goes live at oh-six-hundred. On the real branch. On the actual production WMS. The floor sees nothing. Roberto Cordero does not know any of this is happening. Roberto runs the conversion the way he was going to run it on Friday. The four hundred and seventy lay-off letters go out on the schedule HR finalized. The eight hundred get the new wage. The roster shifts at five fifty-eight. The platform comes up. The platform stays up."

"And in the partition."

"In the partition, Halverson's patch executes against a mirror that is wired to a packet capture and a court-admissible keystroke log. We watch the patch take down the tenant-coordination layer in a sandbox that nobody in the world except the six of us in this plane and Reyes in Phoenix knows exists."

Anjali looked at the closed laptop for a moment.

"Cole."

"Yes."

"You can't fly into Phoenix on the corporate jet manifest. Press tracks the tail. Halverson's people see it land."

"The manifest is filed under the *Vector* program. Phoenix-Goodyear is a general-aviation field. The hangar at the south end is leased through the Mojave LLC. The tail rolls in dark. Press tracks Carrick aircraft on Carrick airfields. Carrick does not own Phoenix-Goodyear."

"And me."

"You drive out of the hangar in a rental at oh-four-fifty. You walk through the south employee entrance of the FC at oh-five-eighteen the way you walk through the south employee entrance of every conversion FC every Sunday night you have been doing this for eight weeks. Roberto sees you. The floor sees you. Nothing about your morning is different from any other conversion-week Monday morning."

She nodded once.

"Cole."

"Yes."

"If the partition fails."

"If the partition fails, the patch lands in production and the pivot is on fire by oh-six-oh-three. Reese has built the partition. Reese does not build partitions that fail."

"Reese."

"Reese."

She picked up the laptop. She opened it. She began reading the conversion runbook for the eighth time.

The Gulfstream crossed into Nevada airspace at altitude forty-one thousand.

---

Wheels down at Phoenix-Goodyear at 3:52 AM Mountain.

The hangar at the south end of the field was a single-bay general-aviation structure with the lights at seventy percent and the south doors closed against the wind off the desert. The Citation Reese had flown in twenty-two minutes ahead was already inside. Special Agent Pilar Reyes of the FBI Phoenix field office stood at the personnel door in a navy windbreaker with her badge on a lanyard and her phone in her hand.

Cole walked across the apron with Mara on his left and Bear on his right.

He stopped at the personnel door.

"Agent Reyes."

"Mr. Westerlund."

"What do you need from me."

"I need you to stay out of the operational frame. I need your COO at the facility running the conversion as if she does not know anything. I need your engineer to stand the partition up clean and to feed me the keystroke log in real time. I need you to not call your general counsel until oh-six-thirty Phoenix at the earliest, because if Halverson's handler is monitoring outbound legal traffic from Carrick HQ between now and the patch landing, the handler pulls and we lose the trade tape. After oh-six-thirty you can call anyone in the country."

"Understood."

"One more thing."

"Yes."

"The cleanest version of this case includes a contemporaneous decision by you, on the record, not to interfere with the patch execution. I have a recorder. I would like sixty seconds of your voice on it before you go inside."

"Now."

"Now."

She held up the recorder. He spoke for fifty-three seconds. He named the threat. He named the decision. He named the time. He stepped back.

"Inside, Mr. Westerlund."

He went inside.

---

The hangar interior was cold and lit white. Reese Okonkwo was at a folding table with two laptops open and a single cable run to a portable battery on the floor. He had taken his suit jacket off. He was in shirtsleeves and the same tie he had worn to the office Friday morning.

He looked up.

"Cole."

"Reese."

"The partition is up. I built it on a clean instance of the Year-Two WMS image that I pulled from the Carrick Cloud snapshot library at one-eighteen AM Pacific. The handshake responder is wired to mirror the production handshake exactly. I have routed Halverson's badge-level API credentials to the partition. When he hits the cutover console at five fifty-eight, his console will read production. His commands will execute against the partition. Production will see none of his traffic."

"The patch."

"The patch was uploaded to the staging server in Halverson's locker partition at one fifty-three AM Phoenix. I have a copy. I have read it. It does what Mara said it does. It is sophisticated. It is not state-grade. It is Greenwich-grade. Whoever wrote it knows tenant-coordination architecture, which means whoever wrote it has read the architecture documents Eliot Brennan walked out of headquarters with in November."

"Production."

"Production runs the cutover at oh-six-hundred on the real WMS. The Carry tenant-coordination layer comes up clean. The eight hundred get the wage shift at five fifty-eight. The three hundred and twenty get the lay-off notice at six-fifteen the way Anjali walked it on Friday with HR. Nobody on the floor sees the second branch. The second branch lives in a partition that exists for ninety minutes and then is destroyed."

"Telemetry."

"Two consoles. One reads production. One reads the partition. Reyes gets the partition feed in real time. I get both. You get both."

Cole walked around the table and looked at the two screens.

"Reese."

"Yes."

"What is the failure mode."

"The failure mode is that Halverson notices the partition. The partition is identical to production at the API surface. He cannot see the difference from his console. He could see the difference if he ran a low-level disk-IO trace against the WMS host and noticed that the host's I/O signature is virtualized rather than bare metal. He has done that trace once before, in October of Year Minus One, on a different host. He has not done it in sixteen months. The probability he does it tonight is non-zero."

"Mitigation."

"I have replicated the production host's I/O signature on the partition. The replication is not perfect. A determined sysadmin running a focused trace would notice in maybe forty seconds. A sysadmin executing a paid patch on a deadline does not run a focused trace, because the deadline is the trace."

"All right."

He turned to Anjali, who was standing six feet behind him with her arms crossed and her vest on over her flannel shirt.

"Anjali."

"Yes."

"Go run the conversion."

She walked to the rental. She drove out of the south hangar door at 4:51 AM and turned east on the access road toward the fulfillment center.

---

Roberto Cordero was at the south end of the inbound dock at 5:19 AM Mountain with a clipboard in his hand and a coffee. The lot was three-quarters full. The night shift had been working since six PM Sunday. The eight trailers in the eight doors were the eight trailers the rotation had called for. Two for Carrick Basics. Six for Retail. The unload crews were running at the rate Anjali had clocked for ten years.

He saw her cross the floor.

"Anjali."

"Roberto."

"You walked it on your own."

"I walked it on my own."

"Cutover."

"Cutover at oh-six-hundred. Roster shift at five fifty-eight. HR walks the laid-off list at six-fifteen the way we mapped it Thursday. The eight hundred get the new wage on the same call. The two hundred and eighty roll into the slightly redefined roles. The twelve get the promotion at the four PM standup. The Carry tenant-coordination unit comes live at six-oh-three."

"On the WMS console you and I sat at on Friday."

"On the WMS console you and I sat at on Friday."

"Trent Halverson is at the console tonight. He swapped the Sunday-night cutover slot with Mac Ramirez two weeks ago. I signed the swap."

"I know you did. The swap is fine. Run it the way you were going to run it."

He looked at her one beat longer than he would have looked on a normal Sunday night.

"Anjali."

"Yes."

"Is something happening I should know about."

"Run the conversion, Roberto. Run it clean. We talk at oh-seven-hundred."

"All right."

She walked past him onto the floor.

---

Cole watched the production telemetry from the back of the Suburban at the south end of the FC lot at 5:54 AM Mountain. Mara in the front passenger seat. The driver was the operator she had pulled out of Tysons in November and parked in Phoenix for exactly this kind of night. Bear was in a second Suburban thirty yards behind them with two more operators and Reyes's number on a burner.

On the laptop on Cole's knees the production console showed:

- Retail WMS, green
- Carry tenant-coordination layer, staged
- Cutover sequence, armed
- Operator, T. HALVERSON, console 3
- Estimated handshake, 06:00:00.4

Reese's voice came through the earpiece.

"Halverson is at console three. He is logged in. He has the patch loaded in a separate window. He is watching the cutover clock."

"Partition."

"Partition is live. His credentials are routed. His console reads production."

"Production."

"Production is also live. The real cutover will execute against the real WMS in five minutes thirty-one seconds. Both branches are armed."

Cole watched the cutover clock count down.

5:58:00.

The roster shift fired on the HR system. Eight hundred associates received the new-wage notification on their badge readers as they hit the floor. Two hundred and eighty saw the role-update notification. Twelve saw the promotion notification. The three hundred and twenty lay-off letters sat in the south-end break room in the binder Anjali had carried in from the rental, ready for the six-fifteen walk with HR.

6:00:00.

The Carry tenant-coordination layer handshake fired on the real WMS.

The handshake closed at 6:00:00.7.

The first three tenant onboarding API calls executed against the real WMS at 6:00:01.2, 6:00:01.4, and 6:00:01.9.

Reese's voice in the earpiece.

"Production is up. Carry is live. Tenant calls are clean."

Cole did not move his eyes from the screen.

"Halverson."

"Halverson sees production on his console. His console says the platform came up the way the runbook said it would come up. He is now executing the patch against the partition. The patch is uploading. Upload completes in six seconds."

6:03:11.

"Patch landed in the partition. Tenant-coordination layer in the partition is corrupted. The partition is reading the way Halverson expected the production environment to read. He is seeing API failures on his console. His console says the pivot failed at launch."

6:03:38.

"He has sent an outbound text from his personal phone to a Greenwich area code. Three words. *Patch landed clean.*"

Cole exhaled once.

"Reyes."

Mara had already lifted the burner.

She said one sentence to Reyes.

She set the burner down.

---

Special Agent Reyes and four agents walked through the north employee entrance of the Goodyear fulfillment center at 6:14 AM Mountain. They badged through with credentials Roberto Cordero had pre-cleared on the Sunday-night manifest at Anjali's request at 5:21 AM under the cover of a routine cyber-compliance audit. They walked the long corridor past the north locker rooms. They walked the cross-aisle behind the picking floor. They walked to the WMS console bay at the rear of the building.

Trent Halverson was at console three with his phone face-down on the desk and the partition console open in front of him reading a cascade of red API failures.

Reyes stopped beside him.

"Mr. Halverson."

He looked up.

She walked him out the north door at 6:17.

Roberto Cordero, at the south end of the inbound dock, did not see it. The night-shift floor supervisors did not see it. The eight hundred associates collecting their new wage at their stations did not see it. The three hundred and twenty associates queuing for the HR walk did not see it. The forty-three original associates from 2017, who would learn later that morning which side of the roster they had landed on, did not see it.

The conversion went live clean.

The Carry tenant-coordination layer ran twelve thousand four hundred tenant API calls in the first hour without a fault.

---

Owen Friedlander called Cole at 9:21 AM Mountain.

Cole was on the Gulfstream airstairs at the south hangar. The G700 had been spinning up for nine minutes. Wheels-up was 9:28.

"Cole."

"Owen."

"The trade tape."

"Tell me."

"Thane Bridgeport executed a one-point-five-billion-dollar incremental short against Carrick between six-oh-one and six-oh-four Mountain this morning. Across three brokers. Off three separate desks. The order tickets are time-stamped to inside the four-minute window. The window opens one minute after the Carry tenant-coordination layer came up clean and closes one minute after Halverson's text to the Greenwich area code. There is no public information in that four-minute window that would justify a one-point-five-billion-dollar short. The SEC will see the tape inside seventy-two hours. They will open the inquiry inside ten days."

"And the position."

"The position is now four-point-three billion against a stock that is going to open up at the bell because the conversion landed clean and the press release Reese is going to send at ten AM Mountain says the Carry platform's largest conversion to date executed without incident. Thane is going to spend the day covering into a rising tape. The fund clears a six-hundred-million-dollar loss minimum. The SEC inquiry costs him another two hundred and the firm. Investors pull within ninety days. Thane resigns inside six months."

"Owen."

"Yes."

"Eliot Brennan."

"Already in custody. Reyes coordinated with the New York field office. Brennan was picked up at his apartment in Tribeca at oh-nine-oh-four Eastern. He is cooperating. He is naming the Thane chain of approval. Marcus Thane personally signed the wire for Brennan's December retainer. The wire is in evidence."

"Halverson."

"Cooperating. Two years' probation plus restitution. He spends what is left of his life paying back the one hundred twelve thousand dollars."

"Mara."

"Mara is the reason we caught it. The signals desk you funded in November of Year Minus One is the reason the desk caught the relay fragment in November of Year One. The chain runs back to the budget line you wrote on a Tuesday afternoon in your study at Bainbridge fifteen months ago."

Cole did not respond to that.

"Owen."

"Yes."

"Goodyear is the eighth and last of the first wave. The second wave starts Monday. Sixteen facilities. We are going to assume Thane is not the only fund that ran this play. We are going to assume the play has been priced in to the short side of the book at every fund that has been adding against the pivot. We are going to harden the cutover protocol across all sixteen of the second wave before close of business Wednesday."

"On it."

"And Owen."

"Yes."

"The press release at ten AM Mountain does not name the patch. The press release says the conversion executed without incident. The SEC inquiry will run on its own schedule. Reese and I will sit with Reyes on Thursday in Phoenix to walk through the cyber posture for the second wave. None of this is public until Reyes says it is public."

"Understood."

He killed the call.

He walked up the airstairs.

---

Anjali walked the Goodyear floor for the next eighteen hours.

She walked it with Roberto Cordero in the morning. She walked it with the night-shift floor supervisors in the evening. She sat in the south-end break room with the HR director for ninety minutes between two PM and three-thirty. She did the work the floor manager would have done on conversion day if the floor manager had been her, which was most of why she had taken the trip.

She did not tell Roberto Cordero what had happened at console three.

She told him at oh-seven-hundred the following morning, in his office, with the door closed, with the operational binder closed on his desk, in the four minutes between the night-shift handover and the day-shift call.

Roberto absorbed it. He asked two questions. She answered both. He nodded.

He said: "Anjali."

She said: "Yes."

He said: "Mac Ramirez is the cutover lead on every console at this facility from this morning forward. Trent Halverson's badge is voided. I will write a new sysadmin rotation for the second wave by Friday."

She said: "Good."

She walked out of his office.

She drove to Sky Harbor.

She boarded the corporate jet at three forty-eight PM.

She was at her desk at Carrick HQ in Seattle by six-forty.

---

The Gulfstream lifted off Phoenix-Goodyear at 9:28 AM Mountain.

Cole slept three hours of the two-hour flight, which he could do, and which he did.

He woke over the Cascades.

He went to the galley. He poured coffee. He carried it back to the conference seat. He opened the laptop.

The production telemetry from Goodyear was on the screen. The Carry tenant-coordination layer had been live for four hours and twenty-six minutes. Twenty-eight thousand seven hundred tenant API calls. Zero faults.

He read the number twice.

He closed the laptop.

The G700 banked over Puget Sound at 12:14 PM Pacific. The water was gray. The Olympics were the same black ridge they had been on the morning of the dinner at R Street.

Boeing Field, 12:21.

Mara opened the door. Cole walked down the airstairs. The Suburban took him to Bainbridge.

He was in the home gym with Bear at 1:30.

Bear had three-eighty on the trap bar.

Cole pulled it for triples.

He went to work.
