# Chapter 8: AlexNet, 2012

On the morning of September 30, 2012, a graduate student at the University of Toronto named Alex Krizhevsky received an email that quietly ended one era of artificial intelligence and started another.

The email was the official results notification from the ImageNet Large Scale Visual Recognition Challenge, the field's most-watched annual benchmark for image classification. The challenge that year had a single task: take a photograph from a held-out test set of 150,000 images, predict the object category from a list of 1,000 possible categories (German shepherd, mountain bike, espresso, tabby cat, banjo, and approximately nine hundred and ninety-six others), and the contestant's submission was scored by the fraction of test images for which the correct category appeared in the top five predictions.

The competition had run, in some form, since 2010. The top-five error rate in 2010 had been 28.2 percent. In 2011, the top entry — a team from Xerox's research center using a hand-engineered combination of features and support vector machines — had achieved 25.8 percent. The year-over-year improvement was approximately two percentage points, which was, on the field's working consensus, about what could be expected.

The 2012 entry from the University of Toronto, submitted by Krizhevsky and his advisors Ilya Sutskever and Geoff Hinton, posted a top-five error rate of 15.3 percent.

The second-place entry was at 26.2 percent.

The margin — over ten percentage points — was, on the field's collective subsequent reading, the largest single-year improvement in the history of the benchmark, before or since. It was also, on the same reading, the moment the field stopped being a field of clever algorithms and started being a field of large neural networks trained on lots of data with lots of compute.

The architecture Krizhevsky had submitted was an eight-layer convolutional neural network — five convolutional layers, two fully-connected layers, and a thousand-way softmax classifier — with approximately sixty million trainable parameters. The architecture was a modest extension of designs Yann LeCun had been publishing since the late 1980s. The training was performed on a pair of NVIDIA GeForce GTX 580 consumer gaming GPUs across approximately six days in Krizhevsky's basement apartment in Toronto.

The architecture was old.

The compute was new.

That was the entire story.

---

The neural-network approach to artificial intelligence had been kicking around the field since the 1950s. Frank Rosenblatt's Perceptron, in 1957, was the first widely publicized neural-net implementation. The Perceptron generated extraordinary excitement — Rosenblatt told *The New York Times* in 1958 that the Perceptron would, within a few years, be able to walk, talk, see, write, reproduce itself, and be conscious of its existence — and was, predictably, oversold. By 1969 Marvin Minsky and Seymour Papert had published a book titled *Perceptrons* that mathematically proved the single-layer Perceptron could not learn certain simple functions (the XOR function being the most famous example), and the neural-network research line went into hibernation for approximately fifteen years.

The hibernation broke in 1986 when Geoffrey Hinton, David Rumelhart, and Ronald Williams published a paper formalizing the backpropagation algorithm — a procedure for training multi-layer neural networks via gradient descent through the layers. Backpropagation made multi-layer networks practical to train; multi-layer networks could learn functions the single-layer Perceptron could not; the field's enthusiasm for neural networks revived.

Across the 1990s and 2000s, neural networks remained a respected research line but not the dominant one. The dominant line was support vector machines and kernel methods, which on most benchmarks of the era achieved comparable or better accuracy with smaller training data and lower computational cost. Neural networks, in the early 2000s, were widely regarded as a worse-than-SVM approach with the consoling property that they were biologically inspired and might one day, when computers got fast enough, become competitive.

The bet that some small number of researchers — Hinton at Toronto, LeCun at NYU, Yoshua Bengio at Montreal, a handful of others — kept making was that *the day computers got fast enough would arrive*, and that on that day neural networks would suddenly become decisively better than SVMs, because the gradient-descent training procedure scaled with both data and compute in ways the kernel methods did not.

That day, on the field's collective reading, was September 30, 2012.

---

The technical trick that made AlexNet work was not the architecture.

The architecture was, again, an extension of LeCun's late-1980s designs. The trick was the use of consumer-grade GPUs to perform the training.

In 2012 a pair of NVIDIA GTX 580 cards cost approximately $1,000 — well within the budget of a graduate student's research stipend. The cards had been designed for video-game rendering. They contained approximately five hundred small parallel processors each, optimized for the kind of dense linear-algebra operations that video games and, as it turned out, neural-network training both require. Krizhevsky had spent approximately a year before the 2012 submission rewriting the neural-network training procedure to run on those cards rather than on the conventional CPU stack the field had been using.

The performance gain from the GPU rewrite was approximately a hundredfold.

A hundredfold performance gain meant that Krizhevsky could train a network ten times larger than the field had previously considered practical, on ten times more data, in less calendar time. The combination — bigger network, more data, less time — was the combination that produced the margin.

The lesson the field took from AlexNet was, on the working consensus, *that scaling works*.

The lesson the field should have taken from AlexNet was, on the more careful reading, *that the bottleneck on neural networks had been compute, not algorithm, and that the field had been wrong for fifteen years to interpret the inferior performance of neural networks as evidence against the neural-network approach*. The neural networks had been right all along. The compute had been wrong.

This is the deepest practical lesson the modern AI field has produced about its own history. The field had been working on the wrong bottleneck. The right bottleneck — compute — was unlocked not by a clever algorithmic insight but by the consumer video-game industry's accidental production of suitable hardware. The field was rescued from its own twenty-year detour by the gaming market.

In the years following AlexNet, the field reallocated essentially all of its research effort to the neural-network approach. Every major AI breakthrough since — the deep-learning revival in image recognition (2013-2015), the renaissance of natural-language processing via word embeddings (2013) and recurrent networks (2014-2015), the transformer architecture (2017), the large language models that followed (2018 onward) — has been a refinement of the basic AlexNet template: more layers, more parameters, more data, more compute.

The template is, on the honest reading, a single template.

The template, twelve years after AlexNet, has produced more practical AI value than the previous sixty years of the field combined.

---

## The lesson

AlexNet's lesson is the lesson of *the bottleneck you are not looking at*.

For twenty years before AlexNet, the field believed neural networks were inferior because every published comparison showed them performing worse than the dominant alternatives. The comparisons were honest. The inferiority was real. The field's mistake was the interpretation: the field interpreted the inferiority as evidence about the algorithms when the inferiority was, on the deepest reading, evidence about the compute.

Practitioners who have internalized AlexNet's lesson ask, when an approach is underperforming: *what is the bottleneck?* If the bottleneck is the approach, the approach is wrong. If the bottleneck is something the approach is currently constrained by — compute, data, deployment context, evaluation methodology — the approach may be right but constrained.

The hardest practical version of this question is: *what bottleneck is binding right now, and what bottleneck will be binding ten years from now?* The bottleneck that is binding today is the obvious one. The bottleneck that will be binding in ten years is the one we are not currently looking at. The practitioners who built AlexNet were the practitioners who, in 2007, looked at GPUs and asked whether they were the bottleneck the field had not been looking at. They were right. The field, on average, was wrong.

The next AlexNet is, on the working practitioner's reading, somewhere in the small set of bottlenecks the field is currently not looking at.

The reader's job, after building the AlexNet of the day, is to start looking.

---

## The build: Super Radiology

The reference implementation for this chapter is the Accelerando suite's radiology information system:

```
agicore-examples/accelerando/radiology/accelerando_radiology.agi
```

The application is a web service exposed on port 3010, with a React frontend, an Axum API, a PostgreSQL backing store, and a DICOM image ingestion pipeline. The crucial feature for this chapter is the image-classification module that ingests chest X-rays and produces a triage recommendation: *normal*, *abnormal — non-urgent review*, *abnormal — urgent review*, or *uncertain — flag for the on-call radiologist*.

The structural analogy to AlexNet is direct. Super Radiology wires a pretrained convolutional neural network — currently a small Vision Transformer trained on the publicly available CheXpert and ChestX-ray14 datasets — as the inference module behind the triage workflow. The reader does not train the network; the network has been pretrained and ships with the application. The reader compiles the `.agi`, ingests synthetic DICOM images (the application's seed data includes approximately three hundred chest X-rays from the public datasets, with the ground-truth labels redacted), and watches the system produce triage recommendations.

The `.agi` source is approximately three hundred and ninety lines.

The entities:

```
ENTITY Study {
  patient_id:   id
  modality:     string
  body_part:    string
  acquired_at:  timestamp
  dicom_path:   string
  reading_radiologist_id: id?
}

ENTITY Image {
  study_id:     id
  series:       string
  view:         string
  width:        number
  height:       number
  pixel_format: string
}

ENTITY TriageRecommendation {
  study_id:     id
  category:     string
  confidence:   number
  attention_map: json?
  reviewed_by:  id?
  override_category: string?
  finalized_at: timestamp?
}

ENTITY Model {
  name:         string
  weights_path: string
  trained_on:   list<string>
  validation_metrics: json
}
```

The triage workflow:

```
WORKFLOW triage_study {
  INPUT  study_id: id
  OUTPUT recommendation: TriageRecommendation

  NODE start { TYPE start }

  NODE load_images {
    TYPE      ai_call
    PROMPT    "Load all images for study {{input.study_id}},
               preprocess each (resize to 224x224, normalize)."
    OUTPUT    tensors: list
  }

  NODE classify {
    TYPE      router_call
    ROUTER    chexpert_vit
    TASK_TYPE chest_xray_triage
  }

  NODE explain {
    TYPE      ai_call
    PROMPT    "For the classification, produce a Grad-CAM
               attention map showing which regions of the image
               drove the classification. Save the map to the
               study's directory."
    OUTPUT    attention_map_path: string
  }

  NODE record {
    TYPE      ai_call
    PROMPT    "Persist the triage recommendation with category,
               confidence, attention map reference, and the model
               version used."
    OUTPUT    recommendation: TriageRecommendation
  }

  NODE end { TYPE end }

  EDGE start       -> load_images
  EDGE load_images -> classify
  EDGE classify    -> explain
  EDGE explain     -> record
  EDGE record      -> end
}
```

The `router_call` node, with the router set to `chexpert_vit`, is the AlexNet-shaped piece of the system. The Agicore compiler, when it processes this declaration, generates the inference plumbing that loads the pretrained model weights, applies the preprocessed image tensor, and runs forward inference to produce class probabilities. The reader does not see the neural-network code; the reader sees the declaration. The compiler is responsible for the rest.

To compile and run:

```
cd agicore-examples/accelerando/radiology
agicore compile accelerando_radiology.agi
docker-compose up
agicore seed --synthetic   # ingests ~300 CheXpert images
curl -X POST http://localhost:3010/triage \
     -H "Content-Type: application/json" \
     -d '{"study_id": "study_0001"}'
```

The response includes the triage category, the confidence, and a URL to the attention map showing which pixels of the X-ray drove the classification.

You have just run a system whose inference module is the direct lineal descendant of AlexNet.

The chest X-ray triage problem is, on the honest assessment of the published medical-AI literature, one of the domains where deep convolutional networks have produced clinically defensible performance. The system you have just run will, on the public test sets, perform competitively with board-certified radiologists on the specific triage task it was trained for. The system will also, exactly as MYCIN did in 1979, fail to be deployed in actual clinical practice for exactly the reasons MYCIN failed: liability, integration, workflow, political acceptance.

The technology has moved forward by a factor of approximately one hundred million since 1976.

The deployment context has moved forward by approximately a meter.

---

## The homework

Open `accelerando_radiology.agi`.

Find the `WORKFLOW triage_study` block.

Notice that the `explain` node produces a Grad-CAM attention map showing which regions of the image drove the classification. The map is generated by a standard technique that hooks into the neural network's intermediate activations and back-propagates the classification gradient to the input image, highlighting the pixels with the largest influence on the output.

Run the triage workflow on three synthetic studies — the seed data includes one obvious-abnormality case, one subtle-abnormality case, and one normal case.

For each study, open the attention map.

Look at where the system is looking.

For the obvious case, the attention map will show the system looking at the obvious pathology. For the subtle case, the attention map may show the system looking at the subtle finding, or it may show the system looking at an unrelated structure that happens to correlate with the diagnosis in the training data. For the normal case, the attention map may show the system looking at the heart, the lungs, or — sometimes — at metadata in the image's corner that the system has learned correlates with the source hospital's case mix.

This last case is the famous failure mode of deep medical imaging models: the system has, on the training data, learned to predict the answer from spurious features rather than from the actual pathology.

The exercise is to *find* one of these failures in the synthetic data.

Look at the attention maps until you find one that is looking somewhere it should not be looking.

When you find it, take a screenshot. Write down, in your notebook, what the system was looking at, what you think it should have been looking at, and what the implications are for trusting the system in clinical practice.

You have just done — in twenty minutes, on a laptop — the kind of evaluation work that produced the academic critique that has correctly tempered the medical-imaging community's enthusiasm for these models across the past five years. The models work. The models also fail in specific, recognizable ways. The practitioner who knows the failure modes can build systems that catch the failures before they reach a patient.

AlexNet's lesson was that the field had been wrong about the bottleneck.

The complement of AlexNet's lesson is that the field is *still* wrong about some bottleneck — and the next breakthrough is, again, on the other side of looking carefully at the bottleneck the field has stopped looking at.

Your homework is to develop the habit of looking.
