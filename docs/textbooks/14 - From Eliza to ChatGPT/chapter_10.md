# Chapter 10: GPT-3, 2020

On June 11, 2020, the San Francisco research company OpenAI released, via a tightly controlled private API, a language model called GPT-3.

The model was the third in a series whose predecessors had been comparatively modest. GPT — the *Generative Pretrained Transformer* — had been released in June 2018 with one hundred and seventeen million parameters. GPT-2 had been released in February 2019 with one and a half billion parameters; OpenAI had famously, and controversially, withheld the full model from public release for several months on the stated grounds that it might be misused for disinformation. GPT-3, at one hundred and seventy-five billion parameters, was approximately a hundred times the size of GPT-2 and approximately fifteen hundred times the size of the original GPT.

The model was a transformer — the neural-network architecture introduced by a team of Google researchers in a 2017 paper titled *Attention Is All You Need*. The transformer architecture had, across the three years since its publication, become the dominant architecture for natural-language processing, replacing the recurrent neural networks that had been the previous standard. GPT-3's only conceptual innovation was scale. The architecture was familiar; the training procedure was familiar; the training corpus was a larger, cleaner version of the corpora used to train GPT-2 and other contemporaries; the engineering challenges of training a model at GPT-3's size had been substantial but had not required any fundamental research advance.

The result, when the model went into private beta in mid-2020, was unsettling.

The model could, given a prompt of a few sentences in natural language describing what the user wanted, produce output that resembled what the user wanted, across a startling range of tasks. Translation. Summarization. Question answering. Creative writing. Code generation. Logical reasoning at the level of a particularly bright high-school student. Conversation that — given a few example exchanges in the prompt — could be made to imitate any of a wide range of personas.

The user did not need to fine-tune the model.

The user did not need to provide a training dataset.

The user simply wrote, in plain natural language, a description of the task, optionally with a small number of worked examples, and the model produced output that addressed the task.

OpenAI's researchers, in the paper they released alongside the model, called this property *few-shot learning*. The practical community that grew up around the private beta — initially a few hundred selected researchers and developers, expanding through 2020 and 2021 to a community of perhaps fifty thousand — called the property *prompt engineering*. The terms were not synonymous: few-shot learning was a technical description of the model's behavior; prompt engineering was the craft that emerged around the practical challenge of getting the model to behave well.

The craft was new.

The craft did not exist in any prior era of computing.

---

To appreciate how strange this was, the reader must remember the entire history we have covered in the previous nine chapters.

Eliza had a fixed rule-base. To make Eliza behave differently, you edited the rules. SHRDLU had a fixed encoding of the blocks world. To make SHRDLU behave differently, you rewrote the encoding. MYCIN had a fixed clinical knowledge base. Cyc had a fixed common-sense ontology. Deep Blue had a fixed evaluation function. Watson had a fixed evidence-scoring algorithm. AlexNet had fixed network weights produced by training. AlphaGo had fixed value and policy networks produced by training.

Every AI system in this book before GPT-3 had a behavior that was determined at *build time* — at the time the rules were encoded, the network was trained, the knowledge base was loaded. The behavior could be changed by going back to build time and changing the build inputs. The behavior could not be substantively changed at *use time* by the user.

GPT-3 inverted the relationship.

GPT-3's build was fixed: the model weights were what they were. But GPT-3's behavior at use time was determined, to a startling degree, by what the user put in the prompt. The user, in the prompt, could specify a persona for the model to adopt, a domain for the model to reason about, a format for the model to produce output in, a length for the response, a tone, a register, a target audience. The user could give the model worked examples. The user could give the model rules. The user could give the model context that the model would then use to answer questions the model had not been trained on.

The user's prompt was, in effect, the program.

This is the structural shift that GPT-3 introduced. The thing that had previously lived inside the system — the encoded behavior — moved outside the system, into the prompt the user wrote at use time. The user became, in a meaningful sense, the programmer. The model became, in a meaningful sense, an interpreter that ran the user's prompt against the model's pretrained knowledge.

The craft of writing the prompt — prompt engineering — was therefore the craft of programming. It was not, however, programming in any of the senses the field had previously meant by that word. Prompt engineering was empirical, often iterative, frequently mysterious. A prompt that worked in one form often broke in a slightly rephrased form. The same prompt produced different outputs on different days, with different temperature settings, with different small adjustments to phrasing. The community that grew up around the private beta spent enormous amounts of time discovering, sharing, and codifying patterns of prompts that consistently worked — *role prompting*, *chain-of-thought prompting*, *few-shot prompting*, *retrieval-augmented prompting* — and each of those patterns was, on its honest description, an empirical discovery rather than a derivation from any underlying theory.

GPT-3 was the first AI system whose primary skill was *conversation about the task*, rather than execution of the task itself.

Every subsequent large language model — GPT-3.5, GPT-4, Claude, Gemini, Llama, the open-source models that exploded in 2023 — has been a refinement of this pattern. The models have gotten larger. The training has gotten more sophisticated. The prompts have gotten longer. The community of prompt engineers has gotten larger and more skilled. But the structural pattern that GPT-3 established — *the user writes a prompt, the model interprets the prompt, the model produces output, the user reads the output and either acts on it or revises the prompt* — has held.

The pattern is, on the working practitioner's reading, the central practical pattern of modern AI.

The pattern is also, on the working practitioner's honest reading, the pattern that most resembles what humans imagine when they imagine talking to a knowledgeable colleague.

This is not an accident.

It is also not, on the deeper reading, evidence that the model is a knowledgeable colleague. The model is a statistical pattern-matcher of unprecedented sophistication that has, on the surface, learned to produce output that *resembles* the output a knowledgeable colleague would produce. Whether the resemblance is shallow or deep is a question the field has been arguing about since the day of the private beta release, and the argument will not be settled, on any reasonable reading, in the lifetime of this book's readers.

---

## The lesson

GPT-3's lesson is the lesson of *behavior at use time*.

Every previous AI system had its behavior determined at build time. The build was where the work happened. The use time was where the build was applied. The user had little to do at use time other than provide inputs and read outputs.

GPT-3 moved a substantial amount of the work to use time. The user, at use time, became responsible for specifying the task — and *how* the user specified the task determined how well the task was performed. A user who wrote a vague prompt got vague output. A user who wrote a precise prompt with worked examples and clear constraints got precise output. The skill of writing the prompt became the skill of using the system.

The practitioner who has internalized GPT-3's lesson treats prompt engineering as a serious technical discipline. The discipline is not, on its own, a substitute for the discipline of building good models; the discipline is the discipline of using good models well. Both disciplines are necessary. Neither, on its own, is sufficient.

The corollary lesson — the one the field has been slow to absorb — is that the use-time skill *transfers across models*. A prompt that works well on GPT-3 often works well on GPT-4, on Claude, on Llama. The transfer is not perfect — models have personalities, models have idiosyncrasies, models respond differently to the same prompt patterns — but the transfer is sufficient that an experienced prompt engineer is approximately equally productive across the available frontier models.

This means, in practical terms, that prompt engineering is a *durable* skill. The model you learned prompt engineering on may be obsolete in eighteen months. The skill you developed will remain useful for as long as language models have prompts.

The skill is, on the working practitioner's reading, the central practical skill of modern AI.

The reader of this book has been doing prompt engineering, in a structured form, in every chapter of this book that uses an `ai_call` node. The PROMPT fields in those nodes are prompts. The reader has been writing them, refining them, watching the models respond. The reader, by this point in the book, has more prompt-engineering experience than most practicing AI engineers had as of the day of GPT-3's release.

---

## The build: Super Chatbot

The reference implementation for this chapter is the Accelerando suite's customer-service chatbot:

```
agicore-examples/accelerando/chatbot/accelerando_chatbot.agi
```

The application is a web service exposed on port 3001, with a React frontend, an Axum API, and a PostgreSQL backing store. The chatbot handles inbound customer-service inquiries — refund requests, product questions, shipping status, account issues — and either resolves them directly or escalates them to a human agent. The system is the modern customer-service operator: friendly, capable, occasionally wrong, always faster than a human.

The structural analogy to GPT-3 is the prompt-engineered-LLM-as-interpreter shape. Super Chatbot's behavior is configured almost entirely through `PROMPT` declarations on its `ai_call` nodes. The reader can change the chatbot's personality, the chatbot's permitted scope of action, the chatbot's escalation criteria, by editing those PROMPT strings. No code regeneration. No retraining. Edit the prompt, recompile (which takes seconds), and the chatbot's behavior has changed.

The `.agi` source is approximately three hundred and seventy lines.

The entities:

```
ENTITY Customer {
  account_id:  string
  name:        string
  contact:     json
  history_summary: string?
}

ENTITY Conversation {
  customer_id: id
  channel:     string
  started_at:  timestamp
  resolved_at: timestamp?
  escalated_to_id: id?
  resolution_category: string?
}

ENTITY Message {
  conversation_id: id
  speaker:     string
  text:        string
  intent:      string?
  spoken_at:   timestamp
}

ENTITY PromptTemplate {
  name:        string
  scope:       string
  template:    string
  version:     number
  active:      bool
}
```

The conversational workflow:

```
WORKFLOW handle_message {
  INPUT  conversation_id: id
         user_text:       string
  OUTPUT response: Message

  NODE start { TYPE start }

  NODE classify_intent {
    TYPE      ai_call
    PROMPT    "{{prompt_template 'intent_classifier'}}
               User said: {{input.user_text}}"
    OUTPUT    intent: string
  }

  NODE check_scope {
    TYPE      branch
    WHEN      classify_intent.intent in_scope
  }

  NODE compose_response {
    TYPE      ai_call
    PROMPT    "{{prompt_template 'response_composer'}}
               Conversation history: {{conversation.recent_messages}}
               Customer profile: {{customer.history_summary}}
               User said: {{input.user_text}}
               Intent: {{classify_intent.intent}}
               Compose a friendly, concise response."
    OUTPUT    text: string
  }

  NODE escalate {
    TYPE      ai_call
    PROMPT    "{{prompt_template 'escalation_handoff'}}
               Generate the handoff message for the human agent
               summarizing the conversation and the issue."
    OUTPUT    handoff_text: string
  }

  NODE end { TYPE end }

  EDGE start          -> classify_intent
  EDGE classify_intent -> check_scope
  EDGE check_scope    -> compose_response  WHEN check_scope.matched == true
  EDGE check_scope    -> escalate          WHEN check_scope.matched == false
  EDGE compose_response -> end
  EDGE escalate       -> end
}
```

The crucial design pattern is the `{{prompt_template 'name'}}` expansion. The chatbot's prompts are not inlined in the workflow; they are stored as `PromptTemplate` entities, versioned, marked active or inactive, editable at runtime through the admin UI. The Agicore runtime expands `{{prompt_template 'name'}}` to the body of the active version of the named template at evaluation time.

To compile and run:

```
cd agicore-examples/accelerando/chatbot
agicore compile accelerando_chatbot.agi
docker-compose up
agicore seed --synthetic   # loads sample prompt templates + 50 conversations

# point your browser at http://localhost:3001 and open a chat session
```

The chat window appears. You type a customer-service question. The chatbot responds. The responses are produced by a sequence of `ai_call` nodes whose behavior is determined, almost entirely, by the active `PromptTemplate` for each node.

You are now running a small GPT-3-shaped system.

The system is small only in the sense that the prompts are short and the orchestration is simple. The underlying model is a frontier language model — whichever model you have provided an API key for in your Agicore configuration. The system's intelligence is the model's intelligence. The system's behavior is the prompts' behavior.

You have arrived at the modern era.

---

## The homework

Open `accelerando_chatbot.agi`.

Run a few conversations to get a sense of the chatbot's current behavior.

Now open the admin UI in another browser tab and navigate to the prompt-template editor.

Find the `response_composer` template.

Read the current version. It is, in the seed data, a short prompt that instructs the model to be friendly, concise, and helpful, and to flag any request that the chatbot is not authorized to handle.

Modify the template. Add three sentences that change the chatbot's personality. Suggestions: *Respond in the voice of a small-town hardware-store clerk who has worked there for thirty years. Use folksy phrasings. Occasionally mention a fictional dog named Gunner who sleeps behind the counter.*

Save the template.

Increment the version.

Mark the new version active.

Open a new conversation in the chat window. Ask the same questions you asked before.

Watch the responses come back in a completely different voice.

You have just done, in three minutes of prompt editing, what would have taken an entire team three months of model fine-tuning before GPT-3. You have substantively reshaped a production system's behavior by editing a string.

This is the new programming.

The new programming is fast.

The new programming is also, on its honest reading, fragile in ways the old programming was not. Your prompt edits will sometimes produce results that you did not expect. Your prompt edits will sometimes produce results that pass review on the example inputs you tested but fail in subtle ways on real customer messages. Your prompt edits will sometimes produce results that the model interprets differently depending on the day of the week, the model version, the temperature setting.

The trade-off — speed of iteration in exchange for empirical brittleness — is the trade-off of the era we have entered.

The practitioner who has internalized GPT-3's lesson learns to operate within the trade-off. The practitioner writes prompts. The practitioner tests prompts. The practitioner versions prompts. The practitioner reverts when a prompt produces unexpected behavior in production. The practitioner does not pretend the system is more reliable than it is. The practitioner also does not pretend the system is less useful than it is.

The practitioner ships.

You have just shipped.
