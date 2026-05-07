# BabyAI Evolutionary Reproduction System

## Design Document — March 2026

---

## Overview

When a BabyAI instance becomes stale (its calibration data no longer reflects current conditions), it doesn't just retire — it **reproduces**. Two parent BabyAIs combine a fraction of their learned knowledge into a new child instance that inherits proven patterns while maintaining 70% fresh capacity to adapt to the present.

This complements the existing **temporal graduation** system (v1 → Elder, v2 starts fresh) by adding a **genetic/evolutionary** dimension. Graduation handles staleness over time. Reproduction handles cross-domain evolution and knowledge transfer between specialists.

---

## The 15/15/70 Knowledge Inheritance Split

```
Parent A (e.g., Ag Baby v2)     Parent B (e.g., Code Baby v3)
        \                              /
         \--- 15% calibration ------- /--- 15% calibration ---\
                                                                 \
                              Child Instance
                         (AgTech Baby v1)

                    15% from Parent A (farming routing patterns)
                    15% from Parent B (coding routing patterns)
                    70% fresh capacity (adapts to NOW)
```

### Why 15/15/70

- **30% total inheritance** is enough to avoid cold-start on known patterns, but low enough that the child isn't weighed down by stale assumptions
- **70% fresh capacity** means the child will quickly develop its own calibration based on current conditions — the inherited patterns are a head start, not a ceiling
- **Equal parent contribution** (15/15) prevents either parent from dominating the child's behavior — true crossover, not cloning

### What "Knowledge" Actually Means

In BabyAI's architecture, inherited knowledge is concrete and measurable:

| Knowledge Type | What Gets Inherited (15% per parent) |
|---|---|
| **Routing calibration** | Win/loss records for model×task_type pairs — which models handle which tasks best |
| **Skill doc associations** | Which skill docs matched which query patterns, weighted by success |
| **Mosh Pit history** | Which model combinations produced the best results for which task types |
| **Complexity thresholds** | Learned boundaries for tier escalation (when to stay free vs. go paid) |
| **Task classification refinements** | Keyword→task_type mappings that improved over the parent's lifetime |

The 15% is selected by **highest confidence** — take the parent's most proven, most validated calibration entries. Low-confidence or contested entries are left behind. The child inherits what the parent was SURE about, not what it was still figuring out.

---

## Reproduction Triggers

A BabyAI instance becomes a reproduction candidate when:

1. **Staleness threshold:** Prediction accuracy drops below baseline for 7+ consecutive days (the world changed faster than the instance adapted)
2. **Saturation:** Calibration table exceeds a size threshold with diminishing accuracy gains (the instance learned what it can learn)
3. **Domain gap:** The instance consistently escalates queries to elders for a pattern that two existing specialists could cover if combined
4. **Manual trigger:** An operator identifies a valuable cross-domain combination

### Staleness Detection

```python
def is_stale(instance_id: str, window_days: int = 7) -> bool:
    """Check if prediction accuracy has been declining."""
    recent = get_predictions(instance_id, days=window_days)
    if len(recent) < 50:  # not enough data
        return False

    accuracy = sum(1 for p in recent if p.winner_correct) / len(recent)
    baseline = get_baseline_accuracy(instance_id)

    return accuracy < baseline * 0.85  # 15% drop from personal best
```

---

## Parent Selection

Not every pair of BabyAIs should reproduce. Parent selection uses **fitness criteria**:

### Fitness Score

```
fitness = (
    prediction_accuracy * 0.4     # how often it picks the right model
    + domain_depth * 0.3          # how specialized its knowledge is
    + cost_efficiency * 0.2       # how well it minimizes API spend
    + mosh_pit_judge_quality * 0.1 # how good it is at picking winners
)
```

### Pairing Rules

1. **Complementary domains preferred:** Ag Baby × Code Baby > Ag Baby × Ag Baby. Cross-domain children are more novel than intra-domain children.
2. **Generational diversity:** Prefer parents from different generations. v2 × v3 > v3 × v3. This prevents genetic bottlenecks.
3. **Minimum fitness threshold:** Both parents must have a fitness score above 0.5. No reproducing from failing instances.
4. **No self-pairing:** An instance cannot reproduce with itself (that's just graduation).
5. **Cooldown period:** A parent can only reproduce once per lifecycle window (prevent runaway spawning).

### Pairing Score

```
pair_score = (
    parent_a.fitness * 0.3
    + parent_b.fitness * 0.3
    + domain_complementarity(a, b) * 0.25  # higher if different domains
    + generational_diversity(a, b) * 0.15   # higher if different generations
)
```

---

## The Reproduction Process

### Step 1: Select Calibration Data

From each parent, extract the top 15% of calibration entries by confidence:

```python
def select_inheritance(parent_calibration: list, percentage: float = 0.15) -> list:
    """Select the highest-confidence calibration entries."""
    sorted_cal = sorted(parent_calibration, key=lambda x: x.confidence, reverse=True)
    count = max(1, int(len(sorted_cal) * percentage))
    return sorted_cal[:count]
```

### Step 2: Merge and Deduplicate

If both parents have calibration for the same model×task_type pair:
- Take the entry from the parent with higher confidence
- If confidence is within 10%, average the values (both parents validated this pattern)

### Step 3: Initialize Child

```python
def create_child(parent_a_id: str, parent_b_id: str) -> str:
    """Create a new BabyAI instance via reproduction."""
    child_id = generate_instance_id()

    # Extract parent knowledge
    a_cal = get_calibration(parent_a_id)
    b_cal = get_calibration(parent_b_id)

    # Select top 15% from each
    a_inherit = select_inheritance(a_cal, 0.15)
    b_inherit = select_inheritance(b_cal, 0.15)

    # Merge (handles duplicates)
    child_cal = merge_calibration(a_inherit, b_inherit)

    # Initialize child with inherited calibration
    init_instance(child_id, calibration=child_cal)

    # Record lineage
    record_lineage(
        child_id=child_id,
        parent_a=parent_a_id,
        parent_b=parent_b_id,
        generation=max(get_generation(parent_a_id), get_generation(parent_b_id)) + 1,
        inherited_entries=len(child_cal),
        total_parent_entries=len(a_cal) + len(b_cal),
    )

    return child_id
```

### Step 4: Graduate Parents

After successful reproduction:
- Parent A → Elder status (available for escalation, no longer actively routing)
- Parent B → Elder status OR continues if it hasn't hit its own staleness threshold
- Child → Active status, begins learning from current interactions

---

## Lineage Tracking

Every instance tracks its full ancestry:

```sql
CREATE TABLE lineage (
    instance_id TEXT PRIMARY KEY,
    parent_a_id TEXT,          -- NULL for founding instances
    parent_b_id TEXT,          -- NULL for founding/graduated instances
    generation INTEGER NOT NULL DEFAULT 0,
    birth_timestamp REAL NOT NULL,
    death_timestamp REAL,      -- when graduated to elder
    fitness_at_birth REAL,     -- inherited fitness baseline
    peak_fitness REAL,         -- best fitness achieved
    cause_of_reproduction TEXT, -- 'staleness', 'saturation', 'domain_gap', 'manual'
    inherited_entries INTEGER,  -- how many calibration entries inherited
    domain_tags TEXT           -- JSON array of primary domains
);

CREATE TABLE lineage_traits (
    instance_id TEXT NOT NULL,
    trait_name TEXT NOT NULL,   -- e.g., 'farming_routing', 'code_mosh_pit'
    origin_ancestor TEXT,       -- which ancestor this trait traces back to
    confidence REAL,
    generations_survived INTEGER, -- how many generations this trait persisted
    PRIMARY KEY (instance_id, trait_name)
);
```

### Lineage Visualization

```
Founding Generation (Gen 0):
    Ag Baby v1    Code Baby v1    Edu Baby v1    General v1

Gen 1 (first reproduction):
    Ag Baby v1 × Code Baby v1 → AgTech Baby v1
    Edu Baby v1 × General v1  → EduGen Baby v1

Gen 2:
    AgTech Baby v1 × EduGen Baby v1 → STEM-Farm Baby v1
    (A baby that routes farming questions to code-aware models
     and codes farm-data pipelines with educational clarity)
```

---

## Generational Selection Pressure

Over multiple generations, the strongest patterns survive:

1. **Trait persistence:** If a routing pattern (e.g., "use DeepSeek for math") persists across 3+ generations, it's a validated truth. Flag it as a **core trait**.
2. **Trait extinction:** If a pattern dies out within 1 generation, it was either wrong or context-dependent. Don't mourn it.
3. **Emergent specialization:** Children that combine complementary domains will naturally develop novel routing patterns neither parent had. This is the evolution payoff.
4. **Fitness plateau detection:** If a lineage's peak fitness stops improving across generations, introduce genetic diversity by pairing with a distant-lineage instance.

---

## Integration with Existing Systems

### Elder Escalation (from VISION.md)

Reproduction works WITH temporal graduation:

```
Active instances (routing queries NOW)
    |
    +-- Staleness detected → Reproduce (if good pair available)
    |                        OR Graduate (if no good pair / solo domain)
    |
Elder instances (available for escalation)
    |
    +-- Child can't handle a query → Escalate to parent Elder
    +-- Neither Elder knows → Escalate up the lineage chain
```

### Mosh Pit Integration

Children inherit Mosh Pit history from parents. A child born from Ag Baby × Code Baby already knows:
- Ag Baby's discovery that Qwen3-8B beats Llama for soil analysis questions
- Code Baby's discovery that Qwen-Coder crushes everything for Python debugging

The child starts with both insights. Its 70% fresh capacity lets it discover that for **farm data pipeline code**, neither parent's preferred model is best — maybe Llama with the farming skill doc injected actually wins.

### Skill Doc Inheritance

Parents pass down their skill doc association weights:
- Which skill docs they loaded most often
- Which skill docs correlated with highest prediction accuracy
- The child starts with a pre-ranked skill doc priority list

---

## Safeguards

1. **Population control:** Maximum active instances = `num_domains * 2`. Prevent runaway spawning.
2. **Minimum lifetime:** An instance must be active for at least 14 days before it can reproduce. No premature reproduction from temporary accuracy dips.
3. **Founding preservation:** Gen 0 instances are NEVER deleted. They represent founding knowledge and remain available as deepest-level Elders.
4. **Rollback capability:** If a child performs significantly worse than both parents within its first 7 days, it can be terminated and parents restored to active status.
5. **Genetic diversity monitoring:** Track the "genetic distance" between active instances. If all active instances share >60% of their calibration entries, force a fresh-start instance (new Gen 0) to inject diversity.

---

## Implementation Phases

### Phase 1: Lineage Tracking (Sprint 4)
- Add lineage tables to SQLite schema
- Tag current BabyAI as Gen 0 founding instance
- Track fitness metrics on every request

### Phase 2: Staleness Detection (Sprint 5)
- Implement rolling accuracy tracking
- Define staleness thresholds per domain
- Dashboard/endpoint to view instance health

### Phase 3: Reproduction Engine (Sprint 6)
- Calibration extraction and selection
- Merge algorithm with deduplication
- Child initialization with inherited state
- Parent graduation on successful reproduction

### Phase 4: Generational Selection (Sprint 7+)
- Trait persistence tracking
- Lineage visualization endpoint
- Genetic diversity monitoring
- Automated pair selection

---

## Why This Beats Linear Graduation

| Linear Graduation | Evolutionary Reproduction |
|---|---|
| v1 → Elder, v2 starts fresh | v1 × v2 → child with best of both |
| Knowledge preserved but frozen | Knowledge evolves across generations |
| No cross-domain learning | Cross-domain pollination creates novel specializations |
| Each generation independent | Each generation builds on proven patterns |
| Cold start every time | 30% warm start from inherited calibration |
| No selection pressure | Natural selection amplifies what works |

The key insight: **linear graduation preserves knowledge. Reproduction evolves it.**

Both are needed. Graduation handles the time axis. Reproduction handles the knowledge axis. Together they create a system that gets smarter in ways neither mechanism achieves alone.

---

*Biological evolution found this solution 3.8 billion years ago. We're just applying it to routing tables.*
