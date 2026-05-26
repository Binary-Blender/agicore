# Chapter 18: Haikus, Pop Choruses, and Dr. Seuss

I want to give you three case studies.

The case studies are real, with some details fuzzed for the legal department's nerves. The case studies happened at three different companies, all of which I would classify as Wise Corporations, none of which is Mendacium Corp.

The case studies are useful because they let you see the *texture* of what exploratory cognition density looks like in practice — the absurd-sounding idea, the eight-week incubation, the moment somebody notices the idea is working, the moment the executive team decides whether to ship it.

I will tell you the three cases. I will tell you the moral. The moral is the same in each case.

---

**Case Study One. Haikus and semantic retrieval.**

A senior engineer at a small research-tooling company in the Bay Area, in Year Seven, ran a Bad Ideas Hour proposal one Friday afternoon: *what if our retrieval system was structured around Haikus instead of around standard query syntax.*

The proposal was a joke when it was first made. The room laughed.

The engineer, the following Monday, in his own personal time, wrote a small test rig that compared semantic retrieval quality on a standardized internal evaluation set, using three input formats: standard keyword queries, natural-language full sentences, and Haiku-formatted queries.

The test rig ran in approximately ninety minutes. The results were these.

Keyword queries: baseline retrieval quality, normalized to 100.

Natural-language queries: retrieval quality 118 (eighteen percent improvement over keywords).

Haiku-formatted queries: retrieval quality 144 (forty-four percent improvement over keywords).

The engineer was, at first, suspicious of his own results. He ran the test rig again. The results held. He showed the results to a colleague. The colleague was also suspicious. The two of them re-ran the test rig with three different evaluation sets. The results held across all three.

The Haiku-formatted queries were doing something specific to the structure of semantic retrieval that the natural-language queries were not.

The engineer presented the result at the next Friday's Bad Ideas Hour.

The product team picked the result up the following Monday.

The product team, after four weeks of investigation, identified the underlying mechanism. The Haiku format was — for reasons related to the specific encoding behavior of the embedding model they were using — producing query embeddings that were significantly more semantically separated from each other than either keyword or natural-language queries. The increased separation was producing the retrieval improvement.

The mechanism, once identified, was generalizable.

The product team built a *structured query reformulation layer* that mapped any incoming query into a high-separation embedding space using a learned reformulation function. The reformulation function had been trained on, among other things, a corpus of Haikus the engineer had collected for the original test.

The structured query reformulation layer was shipped in the next quarter.

The retrieval quality improvement on the product's flagship feature was, on the public release, thirty-one percent.

The thirty-one-percent improvement was the largest single product improvement the company had shipped in three years.

The improvement originated in a Friday afternoon Bad Ideas Hour proposal that the room had laughed at.

The proposal was *what if Haikus.*

The proposal was, on its face, ridiculous.

The proposal was right.

---

**Case Study Two. Pop choruses and prompt compression.**

A different small company. A different city. A different year.

The company was working on a problem that, in 2025, was extremely common: their AI product was hitting token-cost ceilings on long-context customer queries, and the cost of the customer-context prompt was eating their margin.

A junior engineer, in a Bad Ideas Hour proposal, suggested *what if we structured the prompt format like a pop song.*

The room laughed.

The junior engineer, the following week, wrote a test rig. He took fifty customer conversations from the product. He compressed each one into a *pop song* format — with a *verse* containing the customer history, a *chorus* containing the recurring instruction the model needed to remember, a *bridge* containing the edge cases, and an *outro* containing the recent user input.

He measured two things. First, the token cost of the compressed prompt versus the original prompt. Second, the model's output quality on the compressed prompt versus the original prompt.

The compressed prompt was, on average, forty-three percent shorter.

The model's output quality on the compressed prompt was, on the company's standard evaluation, *one and a half percent higher.*

The compression worked. The compression made the model slightly *better.*

The engineer investigated. The investigation revealed that the chorus structure — repeating the core instruction in a slightly varied form at predictable intervals in the prompt — was acting as a kind of attention anchor for the model. The model was using the repeated chorus to maintain instruction-following across the longer context. The chorus was, in operational terms, doing for the model what choruses do for human song-listeners: making the key information memorable across the duration of the input.

The mechanism was generalizable.

The company shipped a *pop-song-formatted prompt compression layer* the following quarter.

The layer was, in the year after its release, the company's single largest cost-reduction initiative.

The layer was named, in the company's internal documentation, *the Chorus Layer.*

The Chorus Layer originated in a Friday afternoon Bad Ideas Hour proposal that the room had laughed at.

The proposal was *what if pop choruses.*

The proposal was, on its face, ridiculous.

The proposal was right.

---

**Case Study Three. Dr. Seuss and onboarding conversion.**

A third small company.

The company was a B2B SaaS company that had been struggling with customer-onboarding conversion. The standard industry benchmark for the conversion they were measuring was somewhere around fifty-eight percent. The company was at forty-one. They had been at forty-one for two years. They had tried six different versions of the onboarding flow. None of the versions had moved the number.

A product designer, at a Friday afternoon ideation session, said: *what if the onboarding emails were Dr. Seuss books.*

The room laughed.

The product designer wrote a Dr. Seuss-style version of the four-email onboarding sequence the following weekend. The version was not, technically, a Dr. Seuss book. The version had the *rhythm* of Dr. Seuss — short, rhyming lines, simple vocabulary, playful structure — applied to the company's standard onboarding content.

The company ran an A/B test with the Dr. Seuss-style emails against the existing onboarding flow.

The A/B test ran for six weeks.

The Dr. Seuss-style emails produced an onboarding conversion of sixty-three percent.

The existing onboarding flow produced an onboarding conversion of forty-one percent.

The improvement was twenty-two percentage points.

The improvement, when annualized across the company's customer pipeline, was worth approximately fourteen million dollars in additional ARR.

The improvement originated in a Friday afternoon ideation session in which a product designer had said *what if Dr. Seuss.*

The room had laughed.

The proposal was right.

---

I want you to notice the pattern.

In all three cases:

1. The idea was proposed in a low-stakes social setting.

2. The room laughed.

3. The person who made the proposal followed it up *in their own time*, with a small test, because the company tolerated the spending of personal time on weird hypotheses.

4. The small test produced a measurable signal.

5. The signal was investigated, the underlying mechanism was identified, and the mechanism was generalized into a shippable product change.

6. The product change produced a commercially significant improvement.

The pattern is the pattern.

The pattern requires all six steps.

Most companies have killed at least one of the six steps. The most common killed step is step three. Most companies do not allow engineers or designers to spend their personal time on weird hypotheses, because most companies have, through some combination of culture and management practice, told their employees that their job is to execute the roadmap and that exploring weird hypotheses is *not their job.*

When the company tells employees that exploration is not their job, the employees comply. They stop exploring. The pattern stops happening. The signals that would have produced the next Chorus Layer, or the next Haiku-formatted query reformulation, or the next Dr. Seuss-style onboarding flow, are never investigated, because the test rigs are never written, because the personal time is never spent.

The company starves itself of its own future product line.

The starvation is invisible on the dashboard for years.

By the time the starvation is visible, the engineers who would have written the test rigs are at other companies.

---

I want to give you one more pattern from the three case studies.

The pattern is this. **All three of the ideas were drawn from domains outside the business domain of the company.**

Haikus are not a business-software domain.

Pop songs are not a business-software domain.

Dr. Seuss books are not a business-software domain.

The proposals were made by people who had read widely enough, in domains unrelated to their jobs, that they had something to draw on when the *what if* moment arrived.

This is, by the way, the entire reason cross-domain reading is item 2 on the Skill Stack list in Chapter 13.

Cross-domain reading is not a hobby.

Cross-domain reading is the substrate that produces the *what if* moments.

The *what if* moments are the substrate that produces the test rigs.

The test rigs are the substrate that produces the discoveries.

The discoveries are the substrate that produces the company's next product.

The company that does not value cross-domain reading is the company that has, in operational terms, decided not to produce another product.

The decision is invisible at the time it is made.

The decision is the most consequential decision the company will make in any given decade.

The decision is usually made by a CEO who has not read a book outside of his business specialty in five years.

I am not naming any names.

---

The next chapter is going to give you a worksheet for identifying your own skill stack. The worksheet is for you to keep. The worksheet is the most actionable single artifact in this book.

The chapter after that is the chapter on how to quit on Tuesday.

We are getting close to Part III.

Part III is the part you want.
