# Chapter 11: ChatGPT and BabyAI, 2022

On Wednesday, November 30, 2022, OpenAI released a free public web interface to a fine-tuned variant of GPT-3.5 called ChatGPT.

The product had been built across approximately three months by a small internal team. The team's stated objective had been to gather user feedback on the model's conversational behavior; the team had expected the product to attract a few tens of thousands of users in its first month, mostly developers and researchers already familiar with the company. The release was treated, internally, as a research preview rather than a product launch.

By December 5, ChatGPT had reached one million users.

By January 30, 2023, ChatGPT had reached one hundred million users — making it, by the consensus of the technology industry's analyst community, the fastest consumer product in history to reach that threshold, faster than TikTok, faster than Instagram, faster than any of the major social-media platforms whose adoption curves had previously been considered exceptional.

By March 2023, every Fortune 500 company in the United States had, on its working executive team's agenda, the question of what ChatGPT meant for the company's strategy.

By the end of 2023, ChatGPT had reached approximately two hundred million users and had been substantively integrated into the workflows of an unknown but plausibly large fraction of the world's knowledge-economy workforce. Programmers used ChatGPT to write code. Lawyers used ChatGPT to draft contracts. Students used ChatGPT to write essays. Translators used ChatGPT to translate. Marketing copywriters, customer-service agents, executive assistants, financial analysts, journalists, screenwriters, novelists, schoolteachers, doctors, real-estate agents, scientists, and every other category of knowledge worker discovered that the model would, given a prompt, produce useful output, and that the useful output was often a substantial fraction of the work the worker would otherwise have had to do by hand.

The product, on the technical reading, was not novel.

The underlying model — fine-tuned GPT-3.5 — had been available via OpenAI's API for approximately a year before ChatGPT's release. The fine-tuning approach — reinforcement learning from human feedback, applied to a base language model to align its conversational behavior — had been published in academic papers since at least 2019. The chat interface — a simple text input, a streaming text output, a thread of preserved context — was nothing the technology industry had not built before in a thousand variations.

What was novel was the *packaging*.

OpenAI had wrapped a model that had previously required an API key, technical knowledge, and a developer's intuition for how to write prompts, in a product that required none of those things. The web page was free. The model was, on the launch configuration, freely accessible without sign-up beyond an email address. The product produced output that anyone who had used a search engine could appreciate. The product produced the output *fast* — the streaming-token rendering gave each response the feel of being typed by a real interlocutor in real time, a small interface choice with outsized psychological consequences.

The packaging was the launch.

The packaging is the lesson.

---

The years since ChatGPT have been the years of the AI-as-consumer-product era.

OpenAI's competitors — Anthropic with Claude, Google with Bard and then Gemini, Meta with the open-source Llama family, Alibaba with Qwen, the various French and Chinese and South Korean labs with their own models — have each released their own ChatGPT-shaped consumer products. The products have, in their underlying technology, converged on a roughly common standard: a frontier-scale transformer-based language model, fine-tuned for conversation, wrapped in a chat interface, served at low or zero cost to consumers through a subscription or advertising-supported business model.

The technological convergence has been substantial enough that, by 2026, the practical difference between the leading consumer LLM products is, on most tasks, smaller than the practical difference between the same product on a Monday morning and on a Friday afternoon. Each model has personality. Each model has idiosyncrasies. Each model is, on any objective benchmark you care to apply, very nearly indistinguishable from the others.

The cost of running these models, however, has remained — for the operating companies — substantial. The compute required to serve a single user query through a frontier-scale language model is non-trivial. The hardware required to operate such a model at consumer scale — millions of concurrent users, billions of queries per day — is enormous. The operating companies have been, across the years since the ChatGPT launch, locked in a sustained capital-expenditure race for the GPU capacity required to serve their users.

The operating cost has produced an interesting consequence.

The consequence is that, although the model providers have been able to serve consumer users at zero or near-zero marginal price (the marketing logic being that user adoption is more valuable in the long run than the short-term revenue), the model providers have not been able to do the same for *commercial* users. A business that wants to integrate a frontier LLM into its products pays per query. The per-query prices, while small in absolute terms, accumulate at scale. A modest business application that issues a hundred LLM queries per active user per day, across ten thousand active users, faces an annual LLM bill that is, on the published 2026 rate cards, somewhere between twenty thousand and two hundred thousand dollars depending on which model is used and how much context each query requires.

This is the commercial-AI cost problem.

The commercial-AI cost problem is the problem BabyAI was designed to address.

---

BabyAI is an open-source project, maintained by this book's author, available at the public BabyAI project page on GitHub. The project is, on its self-description, *a cooperative AI routing layer that lets users share inference cost and learning across a private collective*.

The architecture, on the simplest reading, has three components.

The first component is a *router*. The router sits between the user's request and the available models. For any given request, the router classifies the request — what kind of task is this, what level of difficulty is it, what kind of output is needed — and predicts which available model is most likely to produce a defensible result. The available models span three tiers. Tier one is the free local models — small open-source models like Llama 3 7B or Phi-3 that can be run on a consumer-grade laptop or a small homelab server. Tier two is the medium-cost API models — Mistral, Qwen, DeepSeek — that cost a fraction of the frontier models. Tier three is the frontier models — Claude, GPT, Gemini — used only when the router's prediction indicates that the cheaper tiers will not suffice.

The second component is a *learning loop*. After each request, BabyAI compares its router's prediction (which model was supposed to handle this) against the outcome (was the user satisfied with the response). The comparison is used to update the router's classification model. Over time, the router gets better at predicting which tier each kind of request actually needs. Over time, more requests get handled at tier one. Over time, the average cost per request drops toward zero while the average quality stays at or above what the user would have gotten from a frontier-only configuration.

The third component is *skill docs*. A skill doc is a small markdown file containing domain-specific knowledge — *how to grow corn in Missouri*, *the regulatory landscape for medical billing in California*, *the operating practices of a small bakery in rural Vermont*. When a request matches the domain of a loaded skill doc, BabyAI prepends the skill doc to the prompt before sending it to the model. The effect is that a small open-source model with a relevant skill doc loaded outperforms a frontier model without one. The skill doc is the human knowledge entering the system. The skill doc is the BabyAI-cooperative's accumulated wisdom.

The combination — router plus learning loop plus skill docs — produces a system that, on its operating principle, gets cheaper and better the more it is used. The user contributes to the cooperative by allowing BabyAI to learn from their interactions; the cooperative contributes to the user by routing the user's future requests through the accumulated learning of all prior users.

The system is the opposite of the commercial-AI cost trajectory.

The commercial-AI cost trajectory bills the user for each query and trains the provider's frontier model on the user's data. The BabyAI trajectory routes the user's query to the cheapest available model and trains the user's local router on the cooperative's accumulated experience.

This chapter walks the reader through installing BabyAI locally and using it as the inference backend for a ChatGPT-shaped assistant the reader controls.

---

## The build: BabyAI

The BabyAI installation is the first installation in this book that is not part of the agicore-examples bundle. BabyAI lives at its own repository. The installation has the following shape:

```
git clone https://github.com/Binary-Blender/babyai
cd babyai
./install.sh         # or .\install.ps1 on Windows
```

The install script sets up a small Python environment, downloads the default tier-one models (Llama 3 7B and Phi-3 Mini, approximately seven gigabytes total), launches a local inference server, and starts the routing service. The routing service exposes an OpenAI-compatible API on port 4000:

```
http://localhost:4000/v1/chat/completions
```

Anything that can talk to OpenAI can talk to BabyAI. The Agicore framework you have been using throughout this book can talk to BabyAI by changing one configuration line:

```
# in ~/.agicore/config.toml
ai_endpoint = "http://localhost:4000/v1"
```

Once the endpoint is reconfigured, every `ai_call` node in every `.agi` file you have compiled in the previous ten chapters routes through BabyAI instead of through the commercial API you have been paying for.

The router classifies each call. Most of the calls will be tier-one calls — the small models, running on your machine, costing nothing. A small fraction will be tier-two or tier-three calls — paid models, called only when the router predicts that the cheaper tiers will not suffice. Your cumulative LLM bill, across the next month of using the systems you have built, will drop by approximately ninety percent. Your output quality will stay, on the published BabyAI calibration data, statistically indistinguishable from what you were getting before.

To verify the routing, BabyAI exposes a small admin UI at `http://localhost:4000/admin`. The UI shows, in real time, every routed request, the tier it was routed to, the model that handled it, the response time, the cost (in actual dollars for paid tiers, in compute-minutes for local tiers), and the user-feedback rating if one was provided. The reader can browse the log, click any request to see the full prompt-and-response, and override the routing decision if a frontier-tier response is required.

The skill-doc feature is configured via a small file at `~/.babyai/skill_docs/`. Each markdown file in that directory is a skill doc. The reader can drop in their own — the *what I know about my own domain* file — and BabyAI will, on requests that match the domain, prepend the doc to the prompt before sending it to the model.

The `accelerando_chatbot.agi` reference implementation from chapter ten — which you compiled and ran — works without modification against the reconfigured BabyAI endpoint. The reader can verify this by reopening the chatbot, running the same test conversations from chapter ten, and watching the responses appear at lower cost and equivalent quality.

You are now running a private ChatGPT-class system on your own machine.

The system is, on every relevant operational measure, what ChatGPT is: a conversational LLM-backed assistant, accessible through a chat interface, capable of handling the wide range of tasks the modern model-of-the-day handles. The differences are in what you cannot see: the data does not leave your machine for the tier-one calls, the cost is near-zero, the router learns from your feedback, the skill docs encode your own domain knowledge.

The structural inversion — from *centralized model, distributed cost* to *distributed model, centralized learning* — is the BabyAI contribution.

It is, on the working practitioner's reading, the contribution that lets the consumer LLM era have a sustainable commercial-AI underlayer.

---

## The homework

Open `~/.babyai/skill_docs/`.

Create a new file. Name it after a domain you know well: `CORN_MISSOURI_SKILL.md`, `MEDICAL_BILLING_CALIFORNIA_SKILL.md`, `RUST_PROGRAMMING_SKILL.md`, `KOREAN_CUISINE_SKILL.md`.

Write the skill doc. Aim for approximately five hundred to a thousand words. Include things that are, on your honest assessment, the kind of domain-specific knowledge that a model trained on the public web would not reliably have: the local terminology, the gotchas the textbooks do not mention, the rules of thumb you developed through experience, the recurring pitfalls you have learned to avoid, the regional or institutional variations from the textbook norms.

Save the file.

Restart BabyAI (or call the `reload-skills` admin endpoint).

Now open the Super Chatbot from chapter ten in the browser. Start a conversation with a question that is squarely in your skill doc's domain.

Watch the response come back. Pay attention to whether the response reflects the specific knowledge from your skill doc — the local terminology, the gotchas, the rules of thumb you wrote down.

You have just contributed your domain expertise to a system that will now apply that expertise on your behalf, automatically, every time it encounters a question in your domain.

You have made BabyAI smarter.

You have, by virtue of running BabyAI locally on your own machine and contributing your own skill doc, joined the cooperative.

The cooperative, on the working assumption of BabyAI's design, gets smarter the more users contribute their skill docs. The cooperative gets cheaper the more user-routing data accumulates. The cooperative is, on its long-term operational reading, what the early internet was: a small community of contributors building shared infrastructure that benefits everyone who participates.

You are, by the end of this chapter, a member of that community.

The membership has no fee.

The membership has only the cost of caring enough about your own domain to write down what you know.

That, on the working practitioner's reading, was always the cost of being a competent user of AI systems.

Now you know how to pay it.
