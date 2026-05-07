"""BabyAI — Co-Op Intelligence Engine.

OpenAI-compatible API that routes requests through multiple AI providers
with predictive self-assessment, skill doc injection, and continuous learning.
"""

import asyncio
import hashlib
import json
import math
import os
import re
import sqlite3
import time
import uuid
from contextvars import ContextVar
from pathlib import Path
from typing import Optional

import httpx
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

DATA_DIR = Path(os.getenv("BABYAI_DATA_DIR", "/app/data"))
DATA_DIR.mkdir(parents=True, exist_ok=True)

SKILL_DOCS_DIR = Path(os.getenv("BABYAI_SKILLS_DIR", "/app/skill_docs"))
SKILL_DOCS_DIR.mkdir(parents=True, exist_ok=True)

DB_PATH = DATA_DIR / "babyai.db"

# Provider API keys — read dynamically so Space secrets are always current
def get_key(name: str) -> str:
    return os.getenv(name, "")

# BYOK (Bring Your Own Key) — per-request overrides sent via x-*-key headers
_byok_keys: ContextVar[dict] = ContextVar("byok_keys", default={})

# Convenience accessors (BYOK overrides take priority over env vars)
def HF_TOKEN(): return get_key("HF_TOKEN")
def ANTHROPIC_API_KEY(): return _byok_keys.get({}).get("anthropic") or get_key("ANTHROPIC_API_KEY")
def OPENAI_API_KEY(): return _byok_keys.get({}).get("openai") or get_key("OPENAI_API_KEY")
def GOOGLE_API_KEY(): return _byok_keys.get({}).get("google") or get_key("GOOGLE_API_KEY")
def XAI_API_KEY(): return _byok_keys.get({}).get("xai") or get_key("XAI_API_KEY")
def BABYAI_API_KEY(): return get_key("BABYAI_API_KEY")
def BRAVE_API_KEY(): return get_key("BRAVE_API_KEY")


# ---------------------------------------------------------------------------
# Database
# ---------------------------------------------------------------------------

def get_db() -> sqlite3.Connection:
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def init_db():
    conn = get_db()
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS predictions (
            id TEXT PRIMARY KEY,
            timestamp REAL NOT NULL,
            prompt_hash TEXT NOT NULL,
            predicted_tier TEXT NOT NULL,
            predicted_model TEXT NOT NULL,
            predicted_task_type TEXT NOT NULL,
            confidence REAL NOT NULL,
            actual_tier TEXT,
            actual_model TEXT,
            actual_task_type TEXT,
            winner_correct INTEGER,
            latency_ms REAL,
            total_tokens INTEGER,
            cost_cents REAL
        );

        CREATE TABLE IF NOT EXISTS routing_calibration (
            task_type TEXT NOT NULL,
            model TEXT NOT NULL,
            wins REAL DEFAULT 0,
            losses REAL DEFAULT 0,
            total_calls INTEGER DEFAULT 0,
            avg_latency_ms REAL DEFAULT 0,
            avg_confidence REAL DEFAULT 0.5,
            last_updated REAL NOT NULL,
            PRIMARY KEY (task_type, model)
        );

        CREATE TABLE IF NOT EXISTS feedback (
            id TEXT PRIMARY KEY,
            request_id TEXT NOT NULL,
            timestamp REAL NOT NULL,
            rating INTEGER NOT NULL,
            comment TEXT,
            model TEXT,
            task_type TEXT,
            applied INTEGER DEFAULT 0
        );

        CREATE INDEX IF NOT EXISTS idx_feedback_request ON feedback(request_id);

        CREATE TABLE IF NOT EXISTS usage_log (
            id TEXT PRIMARY KEY,
            timestamp REAL NOT NULL,
            tier TEXT NOT NULL,
            model TEXT NOT NULL,
            prompt_tokens INTEGER,
            completion_tokens INTEGER,
            total_tokens INTEGER,
            latency_ms REAL,
            cost_cents REAL,
            task_type TEXT,
            skill_doc TEXT,
            cache_hit INTEGER DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS telemetry (
            id TEXT PRIMARY KEY,
            timestamp REAL NOT NULL,
            node_id TEXT NOT NULL,
            node_type TEXT NOT NULL,
            location TEXT,
            readings TEXT NOT NULL,
            metadata TEXT
        );

        CREATE INDEX IF NOT EXISTS idx_predictions_timestamp ON predictions(timestamp);
        CREATE INDEX IF NOT EXISTS idx_usage_timestamp ON usage_log(timestamp);
        CREATE INDEX IF NOT EXISTS idx_telemetry_node ON telemetry(node_id);
        CREATE INDEX IF NOT EXISTS idx_telemetry_timestamp ON telemetry(timestamp);

        -- Sprint 7: Unified request traces for richer calibration analysis
        CREATE TABLE IF NOT EXISTS request_traces (
            id TEXT PRIMARY KEY,
            timestamp REAL NOT NULL,
            request_id TEXT NOT NULL,
            provider_key TEXT NOT NULL,
            model_id TEXT NOT NULL,
            task_type TEXT NOT NULL,
            complexity REAL NOT NULL,
            skill_doc TEXT,
            input_tokens INTEGER DEFAULT 0,
            output_tokens INTEGER DEFAULT 0,
            latency_ms REAL DEFAULT 0,
            cost_cents REAL DEFAULT 0,
            is_mosh_pit INTEGER DEFAULT 0,
            mosh_pit_candidates INTEGER DEFAULT 0,
            is_winner INTEGER DEFAULT 1,
            user_selected INTEGER DEFAULT 0,
            error TEXT
        );

        CREATE INDEX IF NOT EXISTS idx_traces_timestamp ON request_traces(timestamp);
        CREATE INDEX IF NOT EXISTS idx_traces_request ON request_traces(request_id);
        CREATE INDEX IF NOT EXISTS idx_traces_task ON request_traces(task_type);
    """)
    conn.close()


# ---------------------------------------------------------------------------
# Calibration Learning Loop
# ---------------------------------------------------------------------------

def record_calibration(
    task_type: str,
    model: str,
    won: bool,
    latency_ms: float,
    confidence: float,
    weight: float = 1.0,
) -> None:
    """Record a calibration event (win/loss from Mosh Pit or feedback).

    weight=1.0 for Mosh Pit head-to-head, 0.5 for user feedback, 0.3 for single-model success.
    """
    try:
        conn = get_db()
        existing = conn.execute(
            "SELECT wins, losses, total_calls, avg_latency_ms FROM routing_calibration WHERE task_type=? AND model=?",
            (task_type, model),
        ).fetchone()

        now = time.time()
        if existing:
            total = existing["total_calls"] + 1
            new_wins = existing["wins"] + (weight if won else 0)
            new_losses = existing["losses"] + (weight if not won else 0)
            # Running average for latency
            prev_total = existing["total_calls"] or 1
            new_avg_lat = (existing["avg_latency_ms"] * prev_total + latency_ms) / total
            conn.execute(
                """UPDATE routing_calibration
                   SET wins=?, losses=?, total_calls=?, avg_latency_ms=?, avg_confidence=?, last_updated=?
                   WHERE task_type=? AND model=?""",
                (new_wins, new_losses, total, round(new_avg_lat, 1), round(confidence, 3), now,
                 task_type, model),
            )
        else:
            conn.execute(
                """INSERT INTO routing_calibration (task_type, model, wins, losses, total_calls, avg_latency_ms, avg_confidence, last_updated)
                   VALUES (?, ?, ?, ?, 1, ?, ?, ?)""",
                (task_type, model, weight if won else 0, weight if not won else 0,
                 round(latency_ms, 1), round(confidence, 3), now),
            )
        conn.commit()
        conn.close()
    except Exception:
        pass  # Never fail the request over calibration logging


def get_calibration_scores(task_type: str) -> dict[str, float]:
    """Return model -> calibration_score for models with data for this task type.

    Score factors in win rate with a confidence discount for low sample sizes.
    Returns empty dict if no calibration data exists.
    """
    try:
        conn = get_db()
        rows = conn.execute(
            "SELECT model, wins, losses, total_calls, avg_latency_ms FROM routing_calibration WHERE task_type=?",
            (task_type,),
        ).fetchall()
        conn.close()
    except Exception:
        return {}

    scores = {}
    for row in rows:
        total_battles = row["wins"] + row["losses"]
        if total_battles < 1:
            continue
        win_rate = row["wins"] / total_battles
        # Confidence discount: need ~10 battles before fully trusting the signal
        sample_confidence = min(1.0, total_battles / 10.0)
        # Slight latency penalty for very slow models (>30s)
        latency_factor = max(0.0, 1.0 - (row["avg_latency_ms"] / 30000.0))
        scores[row["model"]] = (win_rate * sample_confidence) * 0.85 + latency_factor * 0.15
    return scores


# ---------------------------------------------------------------------------
# Sprint 7: Trace Collection
# ---------------------------------------------------------------------------

def record_trace(
    request_id: str,
    provider_key: str,
    model_id: str,
    task_type: str,
    complexity: float,
    skill_doc: Optional[str] = None,
    input_tokens: int = 0,
    output_tokens: int = 0,
    latency_ms: float = 0,
    cost_cents: float = 0,
    is_mosh_pit: bool = False,
    mosh_pit_candidates: int = 0,
    is_winner: bool = True,
    user_selected: bool = False,
    error: Optional[str] = None,
) -> None:
    """Record a structured trace for a single model call within a request."""
    try:
        conn = get_db()
        conn.execute(
            """INSERT INTO request_traces
               (id, timestamp, request_id, provider_key, model_id, task_type, complexity,
                skill_doc, input_tokens, output_tokens, latency_ms, cost_cents,
                is_mosh_pit, mosh_pit_candidates, is_winner, user_selected, error)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (str(uuid.uuid4()), time.time(), request_id, provider_key, model_id,
             task_type, round(complexity, 3), skill_doc, input_tokens, output_tokens,
             round(latency_ms, 1), round(cost_cents, 4),
             int(is_mosh_pit), mosh_pit_candidates, int(is_winner),
             int(user_selected), error),
        )
        conn.commit()
        conn.close()
    except Exception:
        pass  # Never fail the request over trace logging


# ---------------------------------------------------------------------------
# Skill Doc Loader
# ---------------------------------------------------------------------------

def load_skill_docs() -> dict[str, str]:
    """Load all skill documents from the skill_docs directory."""
    docs = {}
    if SKILL_DOCS_DIR.exists():
        for f in SKILL_DOCS_DIR.glob("*.md"):
            docs[f.stem] = f.read_text(encoding="utf-8")
    return docs


def _extract_keywords(doc_content: str) -> list[str]:
    """Extract keywords from a skill doc's ## Keywords section."""
    keywords = []
    in_keywords = False
    for line in doc_content.split("\n"):
        stripped = line.strip()
        if stripped.lower().startswith("## keywords"):
            in_keywords = True
            continue
        if in_keywords:
            if stripped.startswith("##"):
                break  # next section
            if stripped:
                keywords.extend(kw.strip().lower() for kw in stripped.split(",") if kw.strip())
    return keywords


def match_skill_doc(messages: list[dict], skill_docs: dict[str, str]) -> Optional[str]:
    """Match a conversation to the most relevant skill doc based on keywords."""
    if not skill_docs:
        return None

    text = " ".join(m.get("content", "") for m in messages if m.get("content")).lower()

    best_match = None
    best_score = 0

    for name, content in skill_docs.items():
        # Parse keywords from the doc's ## Keywords section
        keywords = _extract_keywords(content)
        # Fallback to filename words if no keywords section
        if not keywords:
            keywords = name.lower().replace("_", " ").split()
        score = sum(1 for kw in keywords if kw in text)
        if score > best_score:
            best_score = score
            best_match = name

    return best_match if best_score > 0 else None


# ---------------------------------------------------------------------------
# Task Classification & Complexity Analysis
# ---------------------------------------------------------------------------

# Sprint 7: Compiled regex patterns for fast, deterministic pre-classification
_CODE_PATTERNS = re.compile(
    r"```|`[^`]+`|\bdef\s|\bclass\s|\bimport\s|\bfunction\s|\bconst\s|\bvar\s|\blet\s|"
    r"\bif\s*\(|->|=>|\{\s*\}|\bfor\s+\w+\s+in\s|#include|System\.out",
    re.IGNORECASE,
)
_MATH_PATTERNS = re.compile(
    r"\bsolve\b|\bintegral\b|\bequation\b|\bproof\b|\bderivative\b|\bmatrix\b|"
    r"\btheorem\b|\bcalculate\b|\bcompute\b|\bsigma\b|\bsum\b|\blimit\b|\bprobability\b",
    re.IGNORECASE,
)
_REASONING_PATTERNS = re.compile(
    r"\bexplain\b|\banalyze\b|\bcompare\b|\bwhy\b"
    r"|\bstep[- ]by[- ]step\b|\breason\b|\bthink\b",
    re.IGNORECASE,
)

COMPLEXITY_KEYWORDS = {
    "high": [
        "architecture", "design", "security", "optimize", "performance",
        "refactor", "migrate", "scale", "distributed", "concurrent",
        "algorithm", "machine learning", "infrastructure", "deploy",
    ],
    "medium": [
        "implement", "build", "create", "function", "class", "api",
        "database", "query", "test", "debug", "fix", "error",
        "component", "service", "endpoint", "integrate",
    ],
    "low": [
        "explain", "what is", "how to", "example", "simple",
        "hello", "help", "list", "show", "describe", "define",
    ],
}

TASK_TYPES = [
    "coding", "creative_writing", "analysis", "math",
    "conversation", "research", "education", "farming",
    "general", "unknown",
]


def classify_task(messages: list[dict]) -> tuple[str, float]:
    """Classify task type and compute complexity score (0.0 to 1.0)."""
    text = " ".join(m.get("content", "") for m in messages if m.get("content")).lower()
    raw_text = " ".join(m.get("content", "") for m in messages if m.get("content"))
    word_count = len(text.split())

    # Sprint 7: Regex pre-classification (fast, deterministic signals)
    has_code = bool(_CODE_PATTERNS.search(raw_text))
    has_math = bool(_MATH_PATTERNS.search(text))
    has_reasoning = bool(_REASONING_PATTERNS.search(text))

    # Complexity scoring
    score = 0.0

    # Regex-detected complexity boost
    if has_code:
        score += 0.15
    if has_math:
        score += 0.1
    if has_reasoning:
        score += 0.05

    # Length factor
    if word_count > 1000:
        score += 0.2
    elif word_count > 500:
        score += 0.1

    # Keyword analysis
    high_hits = sum(1 for kw in COMPLEXITY_KEYWORDS["high"] if kw in text)
    med_hits = sum(1 for kw in COMPLEXITY_KEYWORDS["medium"] if kw in text)
    low_hits = sum(1 for kw in COMPLEXITY_KEYWORDS["low"] if kw in text)

    score += min(high_hits * 0.1, 0.3)
    score += min(med_hits * 0.05, 0.15)
    score -= min(low_hits * 0.05, 0.15)

    # Message count factor
    if len(messages) > 10:
        score += 0.1
    elif len(messages) > 5:
        score += 0.05

    score = max(0.0, min(1.0, score))

    # Task type classification
    task_type = "general"
    coding_kw = ["code", "function", "class", "variable", "bug", "error", "api", "python", "javascript", "zig", "rust", "sql", "html", "css", "programming", "compile", "syntax", "algorithm", "regex", "git", "docker", "server", "backend", "frontend", "npm", "pip"]
    creative_kw = ["write", "story", "novel", "chapter", "poem", "character", "plot", "voice", "fiction", "creative", "narrative", "dialogue", "author", "draft", "rewrite", "essay", "blog"]
    farming_kw = ["soil", "crop", "plant", "harvest", "weather", "pest", "seed", "farm", "field", "moisture", "irrigation", "fertilizer", "livestock", "cattle", "corn", "soybean", "wheat", "garden", "compost", "tractor"]
    education_kw = ["learn", "teach", "student", "homework", "project", "curriculum", "lesson", "grade", "school", "tutor", "quiz", "exam", "study", "course", "classroom", "education"]
    math_kw = ["calculate", "equation", "formula", "solve", "proof", "theorem", "statistics", "probability", "integral", "derivative", "algebra", "geometry", "percentage", "ratio"]
    research_kw = ["research", "compare", "analyze", "history", "explain", "difference between", "how does", "what causes", "why do", "science", "geography", "economics", "philosophy"]
    conversation_kw = ["recipe", "cook", "recommend", "suggest", "opinion", "advice", "help me", "how to", "what should", "idea", "plan", "travel", "health", "fitness", "repair", "fix", "clean", "organize"]

    type_scores = {
        "coding": sum(1 for kw in coding_kw if kw in text),
        "creative_writing": sum(1 for kw in creative_kw if kw in text),
        "farming": sum(1 for kw in farming_kw if kw in text),
        "education": sum(1 for kw in education_kw if kw in text),
        "math": sum(1 for kw in math_kw if kw in text),
        "research": sum(1 for kw in research_kw if kw in text),
        "conversation": sum(1 for kw in conversation_kw if kw in text),
    }

    # Sprint 7: Boost scores from regex pre-classification
    if has_code:
        type_scores["coding"] += 3  # Strong signal — backticks, def/class, arrow functions
    if has_math:
        type_scores["math"] += 3
    if has_reasoning:
        type_scores["research"] += 1  # Mild boost — reasoning keywords overlap many types

    best_type = max(type_scores, key=type_scores.get)
    if type_scores[best_type] > 0:
        task_type = best_type

    return task_type, score


# ---------------------------------------------------------------------------
# Provider Definitions — Structured Model Catalog (Sprint 7)
# ---------------------------------------------------------------------------

class ModelSpec(BaseModel):
    """Structured model specification with architecture-aware metadata."""
    tier: int
    name: str
    model_id: str
    provider: str
    cost_per_1k_tokens: float = 0.0
    max_tokens: int = 4096
    context_window: int = 32768
    strengths: list[str] = Field(default_factory=list)
    is_default: bool = False
    # Sprint 7: OpenJarvis-inspired fields
    parameter_count_b: float = 0.0          # Total parameter count in billions
    active_parameter_count_b: float = 0.0   # Active params for MoE models (0 = dense)
    architecture: str = "dense"             # "dense" or "moe"
    min_vram_gb: float = 0.0                # Minimum VRAM for local inference
    pricing_input: float = 0.0              # Per-million input tokens (cloud models)
    pricing_output: float = 0.0             # Per-million output tokens (cloud models)


PROVIDERS: dict[str, dict] = {
    # Tier 1: Free (HuggingFace Inference Router)
    "hf_qwen3_8b": ModelSpec(
        tier=1, name="Qwen3-8B", model_id="Qwen/Qwen3-8B", provider="huggingface",
        context_window=32768, parameter_count_b=8.2, architecture="dense",
        strengths=["general", "math", "creative_writing", "research", "coding"],
        is_default=True,
    ).model_dump(),
    "hf_llama_8b": ModelSpec(
        tier=1, name="Llama-3.1-8B", model_id="meta-llama/Llama-3.1-8B-Instruct", provider="huggingface",
        context_window=131072, parameter_count_b=8.0, architecture="dense",
        strengths=["general", "conversation", "education"],
    ).model_dump(),
    "hf_deepseek_r1_7b": ModelSpec(
        tier=1, name="DeepSeek-R1-7B", model_id="deepseek-ai/DeepSeek-R1-Distill-Qwen-7B", provider="huggingface",
        context_window=32768, parameter_count_b=7.0, architecture="dense",
        strengths=["math", "analysis"],
    ).model_dump(),
    "hf_qwen_coder_7b": ModelSpec(
        tier=1, name="Qwen2.5-Coder-7B", model_id="Qwen/Qwen2.5-Coder-7B-Instruct", provider="huggingface",
        context_window=32768, parameter_count_b=7.0, architecture="dense",
        strengths=["coding"],
    ).model_dump(),
    # Tier 2: Mid-range
    "anthropic_haiku": ModelSpec(
        tier=2, name="Claude Haiku", model_id="claude-haiku-4-5-20251001", provider="anthropic",
        cost_per_1k_tokens=0.1, max_tokens=8192, context_window=200000,
        pricing_input=1.00, pricing_output=5.00, architecture="dense",
        strengths=["coding", "analysis", "general"],
    ).model_dump(),
    "openai_gpt4mini": ModelSpec(
        tier=2, name="GPT-4o-mini", model_id="gpt-4o-mini", provider="openai",
        cost_per_1k_tokens=0.015, max_tokens=16384, context_window=128000,
        pricing_input=0.15, pricing_output=0.60, architecture="dense",
        strengths=["general", "coding", "creative_writing"],
    ).model_dump(),
    "openai_gpt5mini": ModelSpec(
        tier=2, name="GPT-5 Mini", model_id="gpt-5-mini", provider="openai",
        cost_per_1k_tokens=0.05, max_tokens=16384, context_window=400000,
        pricing_input=0.25, pricing_output=2.00, architecture="dense",
        strengths=["general", "coding", "analysis", "research"],
    ).model_dump(),
    "google_gemini_flash": ModelSpec(
        tier=2, name="Gemini 2.5 Flash", model_id="gemini-2.5-flash-preview-05-20", provider="google",
        cost_per_1k_tokens=0.05, max_tokens=8192, context_window=1048576,
        pricing_input=0.30, pricing_output=2.50, architecture="dense",
        strengths=["general", "coding", "research", "math"],
    ).model_dump(),
    # Tier 3: Premium (use sparingly)
    "anthropic_sonnet": ModelSpec(
        tier=3, name="Claude Sonnet", model_id="claude-sonnet-4-6", provider="anthropic",
        cost_per_1k_tokens=0.3, max_tokens=8192, context_window=200000,
        pricing_input=3.00, pricing_output=15.00, architecture="dense",
        strengths=["coding", "analysis", "creative_writing"],
    ).model_dump(),
    "anthropic_opus": ModelSpec(
        tier=3, name="Claude Opus", model_id="claude-opus-4-6", provider="anthropic",
        cost_per_1k_tokens=1.5, max_tokens=8192, context_window=200000,
        pricing_input=5.00, pricing_output=25.00, architecture="dense",
        strengths=["coding", "analysis", "creative_writing", "research"],
    ).model_dump(),
    "openai_gpt4o": ModelSpec(
        tier=3, name="GPT-4o", model_id="gpt-4o", provider="openai",
        cost_per_1k_tokens=0.5, max_tokens=16384, context_window=128000,
        pricing_input=2.50, pricing_output=10.00, architecture="dense",
        strengths=["general", "research", "analysis"],
    ).model_dump(),
    "xai_grok": ModelSpec(
        tier=3, name="Grok", model_id="grok-3-latest", provider="xai",
        cost_per_1k_tokens=0.3, max_tokens=8192, context_window=131072,
        pricing_input=3.00, pricing_output=15.00, architecture="dense",
        strengths=["general", "coding", "research"],
    ).model_dump(),
    "google_gemini": ModelSpec(
        tier=3, name="Gemini 2.5 Pro", model_id="gemini-2.5-pro", provider="google",
        cost_per_1k_tokens=0.3, max_tokens=8192, context_window=1048576,
        pricing_input=1.25, pricing_output=10.00, architecture="dense",
        strengths=["general", "coding", "research", "math"],
    ).model_dump(),
}


def estimate_tokens(messages: list[dict]) -> int:
    """Estimate token count for a message list.

    Uses ~4 chars per token as a rough heuristic. Slightly overestimates
    to stay safely under limits. No external tokenizer needed.
    """
    total_chars = sum(len(m.get("content", "")) for m in messages)
    # Add overhead for message framing (role tags, separators)
    overhead = len(messages) * 4
    return int(total_chars / 3.5) + overhead  # ~3.5 chars/token is conservative


def smart_truncate(messages: list[dict], max_input_tokens: int) -> list[dict]:
    """Truncate a message list to fit within a token budget.

    Strategy:
    1. Always keep system messages (skill docs live here)
    2. Always keep the last 2 user/assistant exchanges (most recent context)
    3. Always keep the first user message (sets up the conversation)
    4. Drop middle messages oldest-first until under budget
    5. If still over, truncate the longest remaining message's content

    Returns a new list — does not modify the original.
    """
    current_tokens = estimate_tokens(messages)
    if current_tokens <= max_input_tokens:
        return messages  # fits as-is

    # Separate system messages from conversation
    system_msgs = [m for m in messages if m.get("role") == "system"]
    conv_msgs = [m for m in messages if m.get("role") != "system"]

    if not conv_msgs:
        return messages

    # Protect: first message + last 4 messages (2 exchanges)
    protected_count = min(4, len(conv_msgs))
    first_msg = [conv_msgs[0]] if len(conv_msgs) > protected_count else []
    last_msgs = conv_msgs[-protected_count:]
    middle_msgs = conv_msgs[1:-protected_count] if len(conv_msgs) > protected_count + 1 else []

    # Drop middle messages from oldest until under budget
    while middle_msgs:
        candidate = system_msgs + first_msg + middle_msgs + last_msgs
        if estimate_tokens(candidate) <= max_input_tokens:
            return candidate
        middle_msgs.pop(0)  # drop oldest middle message

    # All middle dropped — check if it fits now
    candidate = system_msgs + first_msg + last_msgs
    if estimate_tokens(candidate) <= max_input_tokens:
        return candidate

    # Still over — drop first_msg
    candidate = system_msgs + last_msgs
    if estimate_tokens(candidate) <= max_input_tokens:
        return candidate

    # Still over — truncate the longest non-system message content
    result = list(candidate)
    for _ in range(10):  # max 10 truncation rounds
        if estimate_tokens(result) <= max_input_tokens:
            break
        # Find the longest non-system message
        longest_idx = -1
        longest_len = 0
        for i, m in enumerate(result):
            if m.get("role") != "system" and len(m.get("content", "")) > longest_len:
                longest_len = len(m.get("content", ""))
                longest_idx = i
        if longest_idx >= 0 and longest_len > 200:
            # Trim to ~75% of current length, keeping the end (most recent context)
            content = result[longest_idx]["content"]
            keep_len = int(longest_len * 0.75)
            result[longest_idx] = dict(result[longest_idx])
            result[longest_idx]["content"] = "... [truncated] ...\n" + content[-keep_len:]
        else:
            break  # nothing left to trim

    return result


def get_available_providers() -> dict:
    """Return only providers whose API keys are configured."""
    available = {}
    for key, cfg in PROVIDERS.items():
        provider = cfg["provider"]
        if provider == "huggingface" and HF_TOKEN():
            available[key] = cfg
        elif provider == "anthropic" and ANTHROPIC_API_KEY():
            available[key] = cfg
        elif provider == "openai" and OPENAI_API_KEY():
            available[key] = cfg
        elif provider == "google" and GOOGLE_API_KEY():
            available[key] = cfg
        elif provider == "xai" and XAI_API_KEY():
            available[key] = cfg
    return available


# ---------------------------------------------------------------------------
# Model Router
# ---------------------------------------------------------------------------

def select_model(
    task_type: str,
    complexity: float,
    requested_model: Optional[str] = None,
    input_tokens: int = 0,
) -> tuple[str, dict]:
    """Select the best model for a request based on task type and complexity."""
    available = get_available_providers()

    if not available:
        raise HTTPException(status_code=503, detail="No AI providers configured. Set API keys in Space secrets.")

    # If user requested a specific model, honor it
    if requested_model and requested_model != "auto":
        for key, cfg in available.items():
            if requested_model in (key, cfg["model_id"], cfg["name"]):
                return key, cfg
        # If not found by exact match, try partial
        for key, cfg in available.items():
            if requested_model.lower() in cfg["name"].lower() or requested_model.lower() in cfg["model_id"].lower():
                return key, cfg

    # Auto-routing based on complexity and task type
    if complexity < 0.25:
        target_tier = 1
    elif complexity < 0.55:
        target_tier = 2
    else:
        target_tier = 3

    # Find best model in target tier (prefer models with matching strengths)
    candidates = [(k, v) for k, v in available.items() if v["tier"] == target_tier]

    if not candidates:
        # Fall back to any available tier
        tiers = sorted(set(v["tier"] for v in available.values()))
        for tier in tiers:
            candidates = [(k, v) for k, v in available.items() if v["tier"] == tier]
            if candidates:
                break

    if not candidates:
        raise HTTPException(status_code=503, detail="No models available for this request.")

    # Score candidates by strength match + default preference + learned calibration + context fit + MoE bonus
    cal_scores = get_calibration_scores(task_type)

    scored = []
    for key, cfg in candidates:
        strength_score = 2 if task_type in cfg.get("strengths", []) else 0
        default_bonus = 1 if cfg.get("is_default") else 0
        # Calibration: up to 3 points from learned win rate (overrides static strengths when confident)
        calibration_bonus = cal_scores.get(key, 0) * 3
        # Context window: penalize models that need truncation, bonus for large windows
        context_penalty = 0
        if input_tokens > 0:
            available_ctx = cfg.get("context_window", 32768) - cfg.get("max_tokens", 4096)
            if input_tokens > available_ctx:
                context_penalty = -3  # heavy penalty — will need truncation
            elif input_tokens > available_ctx * 0.8:
                context_penalty = -1  # getting close to the limit
        # Sprint 7: MoE-aware routing bonus
        # MoE models offer large-model reasoning with small-model speed
        moe_bonus = 0
        active_params = cfg.get("active_parameter_count_b", 0)
        total_params = cfg.get("parameter_count_b", 0)
        if active_params > 0 and total_params > active_params:
            # MoE model: bonus = log ratio of total/active (capped at 2)
            # A 35B/3B model gets ~1.5 bonus; a 122B/10B gets ~1.8
            moe_bonus = min(2.0, math.log2(total_params / active_params) * 0.5)
        scored.append((strength_score + default_bonus + calibration_bonus + context_penalty + moe_bonus, key, cfg))

    scored.sort(key=lambda x: x[0], reverse=True)
    _, best_key, best_cfg = scored[0]
    return best_key, best_cfg


# ---------------------------------------------------------------------------
# Provider Call Implementations
# ---------------------------------------------------------------------------

async def call_openai(model_id: str, messages: list[dict], max_tokens: int, temperature: float, base_url: str = "https://api.openai.com/v1", api_key: str = "") -> dict:
    """Call OpenAI-compatible API (works for OpenAI, xAI, HuggingFace, etc.)."""
    async with httpx.AsyncClient(timeout=120.0) as client:
        resp = await client.post(
            f"{base_url}/chat/completions",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": model_id,
                "messages": messages,
                "max_tokens": max_tokens,
                "temperature": temperature,
            },
        )

    if resp.status_code != 200:
        raise HTTPException(status_code=resp.status_code, detail=f"API error: {resp.text}")

    data = resp.json()
    choice = data["choices"][0]
    usage = data.get("usage", {})

    return {
        "content": choice["message"]["content"],
        "prompt_tokens": usage.get("prompt_tokens", 0),
        "completion_tokens": usage.get("completion_tokens", 0),
        "total_tokens": usage.get("total_tokens", 0),
    }


async def call_huggingface(model_id: str, messages: list[dict], max_tokens: int, temperature: float) -> dict:
    """Call HuggingFace Inference API (OpenAI-compatible router)."""
    return await call_openai(
        model_id, messages, max_tokens, temperature,
        base_url="https://router.huggingface.co/v1",
        api_key=HF_TOKEN(),
    )


async def call_anthropic(model_id: str, messages: list[dict], max_tokens: int, temperature: float) -> dict:
    """Call Anthropic Claude API."""
    system_msg = ""
    chat_messages = []

    for msg in messages:
        if msg.get("role") == "system":
            system_msg = msg.get("content", "")
        else:
            chat_messages.append({"role": msg["role"], "content": msg.get("content", "")})

    if not chat_messages:
        chat_messages = [{"role": "user", "content": "Hello"}]

    body = {
        "model": model_id,
        "max_tokens": max_tokens,
        "temperature": temperature,
        "messages": chat_messages,
    }
    if system_msg:
        body["system"] = system_msg

    async with httpx.AsyncClient(timeout=120.0) as client:
        resp = await client.post(
            "https://api.anthropic.com/v1/messages",
            headers={
                "x-api-key": ANTHROPIC_API_KEY(),
                "anthropic-version": "2023-06-01",
                "content-type": "application/json",
            },
            json=body,
        )

    if resp.status_code != 200:
        raise HTTPException(status_code=resp.status_code, detail=f"Anthropic API error: {resp.text}")

    data = resp.json()
    content = ""
    for block in data.get("content", []):
        if block.get("type") == "text":
            content += block.get("text", "")

    usage = data.get("usage", {})
    return {
        "content": content,
        "prompt_tokens": usage.get("input_tokens", 0),
        "completion_tokens": usage.get("output_tokens", 0),
        "total_tokens": usage.get("input_tokens", 0) + usage.get("output_tokens", 0),
    }


async def call_google(model_id: str, messages: list[dict], max_tokens: int, temperature: float) -> dict:
    """Call Google Gemini API."""
    system_msg = ""
    parts = []
    for msg in messages:
        if msg.get("role") == "system":
            system_msg = msg.get("content", "")
        elif msg.get("role") == "user":
            parts.append({"role": "user", "parts": [{"text": msg.get("content", "")}]})
        elif msg.get("role") == "assistant":
            parts.append({"role": "model", "parts": [{"text": msg.get("content", "")}]})

    body = {
        "contents": parts,
        "generationConfig": {
            "maxOutputTokens": max_tokens,
            "temperature": temperature,
        },
    }
    if system_msg:
        body["systemInstruction"] = {"parts": [{"text": system_msg}]}

    async with httpx.AsyncClient(timeout=120.0) as client:
        resp = await client.post(
            f"https://generativelanguage.googleapis.com/v1beta/models/{model_id}:generateContent?key={GOOGLE_API_KEY()}",
            headers={"Content-Type": "application/json"},
            json=body,
        )

    if resp.status_code != 200:
        raise HTTPException(status_code=resp.status_code, detail=f"Google API error: {resp.text}")

    data = resp.json()
    content = ""
    for candidate in data.get("candidates", []):
        for part in candidate.get("content", {}).get("parts", []):
            content += part.get("text", "")

    usage = data.get("usageMetadata", {})
    return {
        "content": content,
        "prompt_tokens": usage.get("promptTokenCount", 0),
        "completion_tokens": usage.get("candidatesTokenCount", 0),
        "total_tokens": usage.get("totalTokenCount", 0),
    }


async def call_provider(provider_key: str, provider_cfg: dict, messages: list[dict], max_tokens: int, temperature: float) -> dict:
    """Route to the correct provider implementation, with smart truncation."""
    provider = provider_cfg["provider"]
    model_id = provider_cfg["model_id"]

    # Smart truncation: fit messages into the model's context window
    context_window = provider_cfg.get("context_window", 32768)
    max_input_tokens = context_window - max_tokens  # reserve space for output
    messages = smart_truncate(messages, max_input_tokens)

    if provider == "huggingface":
        return await call_huggingface(model_id, messages, max_tokens, temperature)
    elif provider == "anthropic":
        return await call_anthropic(model_id, messages, max_tokens, temperature)
    elif provider == "openai":
        return await call_openai(model_id, messages, max_tokens, temperature, api_key=OPENAI_API_KEY())
    elif provider == "xai":
        return await call_openai(model_id, messages, max_tokens, temperature, base_url="https://api.x.ai/v1", api_key=XAI_API_KEY())
    elif provider == "google":
        return await call_google(model_id, messages, max_tokens, temperature)
    else:
        raise HTTPException(status_code=500, detail=f"Unknown provider: {provider}")


# ---------------------------------------------------------------------------
# Streaming Provider Calls
# ---------------------------------------------------------------------------

async def stream_openai(model_id: str, messages: list[dict], max_tokens: int, temperature: float, base_url: str = "https://api.openai.com/v1", api_key: str = ""):
    """Stream from OpenAI-compatible API. Yields SSE chunks."""
    async with httpx.AsyncClient(timeout=120.0) as client:
        async with client.stream(
            "POST",
            f"{base_url}/chat/completions",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": model_id,
                "messages": messages,
                "max_tokens": max_tokens,
                "temperature": temperature,
                "stream": True,
            },
        ) as resp:
            if resp.status_code != 200:
                body = await resp.aread()
                raise HTTPException(status_code=resp.status_code, detail=f"API error: {body.decode()}")
            async for line in resp.aiter_lines():
                if line.startswith("data: "):
                    yield line[6:]


async def stream_anthropic(model_id: str, messages: list[dict], max_tokens: int, temperature: float):
    """Stream from Anthropic API. Yields text delta strings."""
    system_msg = ""
    chat_messages = []
    for msg in messages:
        if msg.get("role") == "system":
            system_msg = msg.get("content", "")
        else:
            chat_messages.append({"role": msg["role"], "content": msg.get("content", "")})
    if not chat_messages:
        chat_messages = [{"role": "user", "content": "Hello"}]

    body = {
        "model": model_id,
        "max_tokens": max_tokens,
        "temperature": temperature,
        "messages": chat_messages,
        "stream": True,
    }
    if system_msg:
        body["system"] = system_msg

    async with httpx.AsyncClient(timeout=120.0) as client:
        async with client.stream(
            "POST",
            "https://api.anthropic.com/v1/messages",
            headers={
                "x-api-key": ANTHROPIC_API_KEY(),
                "anthropic-version": "2023-06-01",
                "content-type": "application/json",
            },
            json=body,
        ) as resp:
            if resp.status_code != 200:
                body_bytes = await resp.aread()
                raise HTTPException(status_code=resp.status_code, detail=f"Anthropic API error: {body_bytes.decode()}")
            async for line in resp.aiter_lines():
                if line.startswith("data: "):
                    data = line[6:]
                    if data.strip() == "[DONE]":
                        continue
                    try:
                        event = json.loads(data)
                        if event.get("type") == "content_block_delta":
                            delta = event.get("delta", {})
                            if delta.get("type") == "text_delta":
                                yield delta.get("text", "")
                    except json.JSONDecodeError:
                        pass


async def stream_provider(provider_key: str, provider_cfg: dict, messages: list[dict], max_tokens: int, temperature: float, response_id: str):
    """Stream SSE events in OpenAI-compatible format from any provider."""
    provider = provider_cfg["provider"]
    model_id = provider_cfg["model_id"]

    # Smart truncation
    context_window = provider_cfg.get("context_window", 32768)
    max_input_tokens = context_window - max_tokens
    messages = smart_truncate(messages, max_input_tokens)

    if provider in ("openai", "xai", "huggingface"):
        # These are already OpenAI-compatible SSE streams
        if provider == "huggingface":
            base_url = "https://router.huggingface.co/v1"
            api_key = HF_TOKEN()
        elif provider == "xai":
            base_url = "https://api.x.ai/v1"
            api_key = XAI_API_KEY()
        else:
            base_url = "https://api.openai.com/v1"
            api_key = OPENAI_API_KEY()

        async for chunk_data in stream_openai(model_id, messages, max_tokens, temperature, base_url, api_key):
            if chunk_data.strip() == "[DONE]":
                yield "data: [DONE]\n\n"
                return
            # Re-wrap with our response ID
            try:
                chunk = json.loads(chunk_data)
                chunk["id"] = response_id
                yield f"data: {json.dumps(chunk)}\n\n"
            except json.JSONDecodeError:
                pass

    elif provider == "anthropic":
        # Convert Anthropic stream to OpenAI-compatible SSE
        async for text_delta in stream_anthropic(model_id, messages, max_tokens, temperature):
            chunk = {
                "id": response_id,
                "object": "chat.completion.chunk",
                "created": int(time.time()),
                "model": model_id,
                "choices": [{
                    "index": 0,
                    "delta": {"content": text_delta},
                    "finish_reason": None,
                }],
            }
            yield f"data: {json.dumps(chunk)}\n\n"
        # Final chunk
        final = {
            "id": response_id,
            "object": "chat.completion.chunk",
            "created": int(time.time()),
            "model": model_id,
            "choices": [{"index": 0, "delta": {}, "finish_reason": "stop"}],
        }
        yield f"data: {json.dumps(final)}\n\n"
        yield "data: [DONE]\n\n"

    elif provider == "google":
        # Google doesn't have a clean SSE stream; fall back to non-streaming and emit as one chunk
        result = await call_google(model_id, messages, max_tokens, temperature)
        chunk = {
            "id": response_id,
            "object": "chat.completion.chunk",
            "created": int(time.time()),
            "model": model_id,
            "choices": [{
                "index": 0,
                "delta": {"content": result["content"]},
                "finish_reason": "stop",
            }],
        }
        yield f"data: {json.dumps(chunk)}\n\n"
        yield "data: [DONE]\n\n"


# ---------------------------------------------------------------------------
# Mosh Pit — Run top 2 models at a tier, pick the best
# ---------------------------------------------------------------------------

async def mosh_pit(
    messages: list[dict],
    max_tokens: int,
    temperature: float,
    task_type: str,
    tier: int = 1,
    input_tokens: int = 0,
) -> tuple[str, dict, dict]:
    """Call 3 models in parallel, score responses, return the best with alternatives.

    Always targets 3 models. If the target tier has fewer than 3 candidates,
    fills remaining slots from Tier 1 (free) models whose context window fits.

    Returns (winning_provider_key, winning_provider_cfg, result_dict).
    """
    TARGET_PIT_SIZE = 3
    available = get_available_providers()
    tier_models = {k: v for k, v in available.items() if v["tier"] == tier}

    # Score all target-tier models by calibration + strengths
    cal_scores = get_calibration_scores(task_type)
    scored_candidates = []
    for k, v in tier_models.items():
        s = 2 if task_type in v.get("strengths", []) else 0
        s += 1 if v.get("is_default") else 0
        s += cal_scores.get(k, 0) * 3  # learned calibration bonus
        scored_candidates.append((s, k, v))
    scored_candidates.sort(key=lambda x: x[0], reverse=True)

    # Start with top candidates from the target tier
    pit_models = {k: v for _, k, v in scored_candidates[:TARGET_PIT_SIZE]}

    # Fill remaining slots from Tier 1 (free) if we don't have 3 yet
    if len(pit_models) < TARGET_PIT_SIZE and tier != 1:
        free_models = {k: v for k, v in available.items()
                       if v["tier"] == 1 and k not in pit_models}
        # Score free models the same way
        free_scored = []
        for k, v in free_models.items():
            # Skip if context window can't fit the input
            if input_tokens > 0 and input_tokens > v.get("context_window", 32768) * 0.9:
                continue
            s = 2 if task_type in v.get("strengths", []) else 0
            s += 1 if v.get("is_default") else 0
            s += cal_scores.get(k, 0) * 3
            free_scored.append((s, k, v))
        free_scored.sort(key=lambda x: x[0], reverse=True)
        for _, k, v in free_scored:
            if len(pit_models) >= TARGET_PIT_SIZE:
                break
            pit_models[k] = v

    # If target tier IS Tier 1 and we still need more, we already have all free models
    # Just make sure we have at least 1
    if not pit_models:
        raise HTTPException(status_code=503, detail="No models available for the mosh pit.")

    # Call selected models in parallel with individual timeouts
    async def safe_call(key: str, cfg: dict) -> tuple[str, dict, Optional[dict], Optional[str]]:
        try:
            result = await asyncio.wait_for(
                call_provider(key, cfg, messages, min(max_tokens, cfg["max_tokens"]), temperature),
                timeout=90.0,
            )
            return key, cfg, result, None
        except asyncio.TimeoutError:
            return key, cfg, None, "timeout"
        except Exception as e:
            return key, cfg, None, str(e)

    tasks = [safe_call(k, v) for k, v in pit_models.items()]
    results = await asyncio.gather(*tasks)

    # Filter out failures and empty responses
    valid = [(k, cfg, r) for k, cfg, r, _err in results if r and r.get("content", "").strip()]
    errors = {k: err for k, _cfg, _r, err in results if err}

    if not valid:
        raise HTTPException(
            status_code=503,
            detail=f"All models failed. Errors: {json.dumps(errors)}",
        )

    # Score all valid responses by calibration + strengths (no heuristic judge)
    preference_scores = {}
    for k, cfg, r in valid:
        cal = cal_scores.get(k, 0)
        strength = 1.0 if task_type in cfg.get("strengths", []) else 0
        default = 0.5 if cfg.get("is_default") else 0
        preference_scores[k] = round(cal * 3 + strength + default, 2)

    # Pick the preferred response
    preferred_key = max(preference_scores, key=preference_scores.get)
    preferred_idx = next(i for i, (k, _, _) in enumerate(valid) if k == preferred_key)
    preferred_key, preferred_cfg, preferred_result = valid[preferred_idx]

    # Build alternatives list with ALL valid responses
    alternatives = []
    for k, cfg, r in valid:
        alternatives.append({
            "provider": k,
            "provider_name": cfg["name"],
            "model_id": cfg["model_id"],
            "tier": cfg["tier"],
            "content": r.get("content", ""),
            "tokens": r.get("total_tokens", 0),
            "preferred": k == preferred_key,
            "preference_score": preference_scores.get(k, 0),
        })
    # Sort so preferred is first
    alternatives.sort(key=lambda a: (-int(a["preferred"]), -a["preference_score"]))

    # --- CALIBRATION: Record win for preferred, loss for others ---
    for k, cfg, r in valid:
        record_calibration(
            task_type=task_type,
            model=k,
            won=(k == preferred_key),
            latency_ms=0,
            confidence=0.5,
            weight=1.0,
        )

    preferred_result["alternatives"] = alternatives
    preferred_result["mosh_pit"] = {
        "tier": tier,
        "candidates": len(valid),
        "attempted": len(results),
        "winner": preferred_key,
        "method": "calibration_score",
        "scores": preference_scores,
        "errors": errors or None,
    }
    return preferred_key, preferred_cfg, preferred_result


# ---------------------------------------------------------------------------
# Request / Response Models
# ---------------------------------------------------------------------------

class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    model: str = Field(default="auto", description="Model name or 'auto' for intelligent routing")
    messages: list[ChatMessage]
    temperature: float = Field(default=0.7, ge=0.0, le=2.0)
    max_tokens: int = Field(default=2048, ge=1, le=32768)
    stream: bool = Field(default=False, description="Stream response as SSE events")
    skill_doc: Optional[str] = Field(default=None, description="Skill doc name to inject")


class FeedbackRequest(BaseModel):
    request_id: str = Field(description="The babyai-XXXXXXXX id from the chat response")
    rating: int = Field(ge=-1, le=1, description="-1 = bad, 0 = neutral, 1 = good")
    comment: Optional[str] = None


class SelectionFeedback(BaseModel):
    request_id: str = Field(description="The babyai-XXXXXXXX id from the chat response")
    selected_provider: str = Field(description="Provider key the user chose")
    all_providers: list[str] = Field(description="All provider keys that were in the mosh pit")
    task_type: Optional[str] = None


# ---------------------------------------------------------------------------
# FastAPI App
# ---------------------------------------------------------------------------

app = FastAPI(
    title="BabyAI",
    description="Co-Op Intelligence Engine — OpenAI-compatible API with intelligent routing",
    version="0.4.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup():
    init_db()


@app.middleware("http")
async def auth_middleware(request: Request, call_next):
    """Optional API key authentication."""
    if BABYAI_API_KEY() and request.url.path.startswith("/v1/"):
        auth = request.headers.get("authorization", "")
        api_key = request.headers.get("x-api-key", "")
        token = ""
        if auth.startswith("Bearer "):
            token = auth[7:]
        elif api_key:
            token = api_key

        if token != BABYAI_API_KEY():
            return JSONResponse(status_code=401, content={"error": "Invalid API key"})

    return await call_next(request)


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@app.get("/")
async def root():
    available = get_available_providers()
    skill_docs = load_skill_docs()
    return {
        "name": "BabyAI",
        "version": "0.4.0",
        "description": "Co-Op Intelligence Engine",
        "providers_configured": len(available),
        "providers": {k: v["name"] for k, v in available.items()},
        "skill_docs_loaded": list(skill_docs.keys()),
        "status": "operational",
        "env_keys_present": {
            "HF_TOKEN": bool(HF_TOKEN()),
            "ANTHROPIC_API_KEY": bool(ANTHROPIC_API_KEY()),
            "OPENAI_API_KEY": bool(OPENAI_API_KEY()),
            "GOOGLE_API_KEY": bool(GOOGLE_API_KEY()),
            "XAI_API_KEY": bool(XAI_API_KEY()),
        },
    }


@app.get("/health")
async def health():
    return {"status": "healthy", "timestamp": time.time()}


@app.get("/v1/models")
async def list_models():
    available = get_available_providers()
    models = []
    for key, cfg in available.items():
        model_info = {
            "id": key,
            "object": "model",
            "created": 1709000000,
            "owned_by": cfg["provider"],
            "name": cfg["name"],
            "tier": cfg["tier"],
            "strengths": cfg.get("strengths", []),
            "context_window": cfg.get("context_window", 0),
            "cost_per_1k_tokens": cfg["cost_per_1k_tokens"],
            # Sprint 7: ModelSpec enriched fields
            "parameter_count_b": cfg.get("parameter_count_b", 0),
            "active_parameter_count_b": cfg.get("active_parameter_count_b", 0),
            "architecture": cfg.get("architecture", "dense"),
            "pricing_input": cfg.get("pricing_input", 0),
            "pricing_output": cfg.get("pricing_output", 0),
        }
        models.append(model_info)
    return {"object": "list", "data": models}


@app.get("/v1/skill_docs")
async def list_skill_docs():
    docs = load_skill_docs()
    return {
        "skill_docs": [
            {"name": name, "size_chars": len(content)}
            for name, content in docs.items()
        ]
    }


@app.post("/v1/chat/completions")
async def chat_completions(request: ChatRequest, http_request: Request):
    start_time = time.time()

    # Extract BYOK (Bring Your Own Key) headers — lets clients forward their
    # own provider keys so BabyAI can use them for Mosh Pit routing even when
    # the server-side env vars are not set for that provider.
    byok: dict[str, str] = {}
    if http_request.headers.get("x-anthropic-key"):
        byok["anthropic"] = http_request.headers["x-anthropic-key"]
    if http_request.headers.get("x-openai-key"):
        byok["openai"] = http_request.headers["x-openai-key"]
    if http_request.headers.get("x-google-key"):
        byok["google"] = http_request.headers["x-google-key"]
    if http_request.headers.get("x-xai-key"):
        byok["xai"] = http_request.headers["x-xai-key"]
    _byok_keys.set(byok)

    messages = [m.model_dump() for m in request.messages]

    # --- Skill doc injection ---
    skill_docs = load_skill_docs()
    skill_name = request.skill_doc
    if not skill_name:
        skill_name = match_skill_doc(messages, skill_docs)

    if skill_name and skill_name in skill_docs:
        skill_content = skill_docs[skill_name]
        skill_msg = {
            "role": "system",
            "content": f"[SKILL: {skill_name}]\n{skill_content}\n[/SKILL]",
        }
        has_system = any(m["role"] == "system" for m in messages)
        if has_system:
            for i, m in enumerate(messages):
                if m["role"] == "system":
                    messages[i]["content"] = m["content"] + f"\n\n[SKILL: {skill_name}]\n{skill_content}\n[/SKILL]"
                    break
        else:
            messages.insert(0, skill_msg)

    # --- Task classification ---
    task_type, complexity = classify_task(messages)

    # --- Estimate input size for context-aware routing ---
    input_tokens = estimate_tokens(messages)

    # --- Streaming path: skip Mosh Pit, go direct to single model ---
    if request.stream:
        provider_key, provider_cfg = select_model(task_type, complexity, request.model, input_tokens)
        prediction_id = str(uuid.uuid4())
        response_id = f"babyai-{prediction_id[:8]}"

        # Log the prediction (we won't have token counts until after streaming)
        try:
            conn = get_db()
            conn.execute(
                """INSERT INTO predictions (id, timestamp, prompt_hash, predicted_tier,
                   predicted_model, predicted_task_type, confidence, actual_tier, actual_model)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (prediction_id, time.time(),
                 hashlib.md5(json.dumps(messages, sort_keys=True).encode()).hexdigest(),
                 str(provider_cfg["tier"]), provider_key, task_type, round(complexity, 3),
                 str(provider_cfg["tier"]), provider_key),
            )
            conn.commit()
            conn.close()
        except Exception:
            pass

        record_calibration(task_type, provider_key, won=True, latency_ms=0, confidence=complexity, weight=0.3)

        return StreamingResponse(
            stream_provider(
                provider_key, provider_cfg, messages,
                min(request.max_tokens, provider_cfg["max_tokens"]),
                request.temperature, response_id,
            ),
            media_type="text/event-stream",
            headers={"X-BabyAI-Provider": provider_key, "X-BabyAI-Task": task_type, "X-BabyAI-Skill": skill_name or ""},
        )

    # --- Non-streaming path: Mosh Pit routing (always 3 responses) ---
    auto_route = not request.model or request.model == "auto"

    if auto_route:
        # Determine target tier by complexity
        if complexity < 0.25:
            target_tier = 1
        elif complexity < 0.55:
            target_tier = 2
        else:
            target_tier = 3

        try:
            provider_key, provider_cfg, result = await mosh_pit(
                messages, request.max_tokens, request.temperature,
                task_type, tier=target_tier, input_tokens=input_tokens,
            )
        except HTTPException:
            raise
        except Exception as e:
            # Fallback to single model
            provider_key, provider_cfg = select_model(task_type, complexity, "auto", input_tokens)
            result = await call_provider(
                provider_key, provider_cfg, messages,
                min(request.max_tokens, provider_cfg["max_tokens"]),
                request.temperature,
            )
            result["mosh_pit"] = {"error": str(e), "fallback": True}
    else:
        # Specific model requested — single model
        provider_key, provider_cfg = select_model(task_type, complexity, request.model, input_tokens)
        result = await call_provider(
            provider_key, provider_cfg, messages,
            min(request.max_tokens, provider_cfg["max_tokens"]),
            request.temperature,
        )

    # Record calibration for single-model calls (weak signal, weight=0.3)
    if "mosh_pit" not in result:
        record_calibration(task_type, provider_key, won=True, latency_ms=0, confidence=complexity, weight=0.3)

    # --- Prediction record ---
    prediction_id = str(uuid.uuid4())
    prediction = {
        "id": prediction_id,
        "timestamp": time.time(),
        "prompt_hash": hashlib.md5(json.dumps(messages, sort_keys=True).encode()).hexdigest(),
        "predicted_tier": str(provider_cfg["tier"]),
        "predicted_model": provider_key,
        "predicted_task_type": task_type,
        "confidence": round(complexity, 3),
    }

    latency_ms = (time.time() - start_time) * 1000
    cost = (result["total_tokens"] / 1000) * provider_cfg["cost_per_1k_tokens"]

    # --- Log prediction + usage ---
    try:
        conn = get_db()
        conn.execute(
            """INSERT INTO predictions (id, timestamp, prompt_hash, predicted_tier,
               predicted_model, predicted_task_type, confidence, actual_tier,
               actual_model, latency_ms, total_tokens, cost_cents)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (prediction["id"], prediction["timestamp"], prediction["prompt_hash"],
             prediction["predicted_tier"], prediction["predicted_model"],
             prediction["predicted_task_type"], prediction["confidence"],
             str(provider_cfg["tier"]), provider_key,
             latency_ms, result["total_tokens"], cost),
        )
        conn.execute(
            """INSERT INTO usage_log (id, timestamp, tier, model, prompt_tokens,
               completion_tokens, total_tokens, latency_ms, cost_cents, task_type, skill_doc)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (str(uuid.uuid4()), time.time(), str(provider_cfg["tier"]), provider_key,
             result["prompt_tokens"], result["completion_tokens"], result["total_tokens"],
             latency_ms, cost, task_type, skill_name),
        )
        conn.commit()
        conn.close()
    except Exception:
        pass  # Don't fail the request over logging

    # --- Sprint 7: Record structured trace ---
    response_id = f"babyai-{prediction_id[:8]}"
    is_mosh = "mosh_pit" in result and result.get("mosh_pit", {}).get("candidates", 0) > 1
    mosh_candidates = result.get("mosh_pit", {}).get("candidates", 0) if is_mosh else 0

    if is_mosh and result.get("alternatives"):
        # Record a trace for each model in the Mosh Pit
        for alt in result["alternatives"]:
            record_trace(
                request_id=response_id, provider_key=alt["provider"],
                model_id=alt["model_id"], task_type=task_type, complexity=complexity,
                skill_doc=skill_name, input_tokens=0, output_tokens=alt.get("tokens", 0),
                latency_ms=latency_ms, cost_cents=0, is_mosh_pit=True,
                mosh_pit_candidates=mosh_candidates, is_winner=alt["preferred"],
            )
    else:
        # Single model call
        record_trace(
            request_id=response_id, provider_key=provider_key,
            model_id=provider_cfg["model_id"], task_type=task_type, complexity=complexity,
            skill_doc=skill_name, input_tokens=result["prompt_tokens"],
            output_tokens=result["completion_tokens"], latency_ms=latency_ms,
            cost_cents=cost, is_mosh_pit=False,
        )

    # --- OpenAI-compatible response ---
    alternatives = result.get("alternatives", [])

    # Build choices: if we have alternatives from the mosh pit, include all of them
    if alternatives:
        choices = []
        for i, alt in enumerate(alternatives):
            choices.append({
                "index": i,
                "message": {
                    "role": "assistant",
                    "content": alt["content"],
                },
                "finish_reason": "stop",
                "babyai_choice": {
                    "provider": alt["provider"],
                    "provider_name": alt["provider_name"],
                    "model_id": alt["model_id"],
                    "tier": alt["tier"],
                    "preferred": alt["preferred"],
                    "preference_score": alt["preference_score"],
                    "tokens": alt["tokens"],
                },
            })
    else:
        choices = [
            {
                "index": 0,
                "message": {
                    "role": "assistant",
                    "content": result["content"],
                },
                "finish_reason": "stop",
            }
        ]

    return {
        "id": response_id,
        "object": "chat.completion",
        "created": int(time.time()),
        "model": provider_cfg["model_id"],
        "choices": choices,
        "usage": {
            "prompt_tokens": result["prompt_tokens"],
            "completion_tokens": result["completion_tokens"],
            "total_tokens": result["total_tokens"],
        },
        "babyai": {
            "provider": provider_key,
            "provider_name": provider_cfg["name"],
            "tier": provider_cfg["tier"],
            "task_type": task_type,
            "complexity": round(complexity, 3),
            "skill_doc": skill_name,
            "latency_ms": round(latency_ms, 1),
            "cost_cents": round(cost, 4),
            "input_tokens_estimate": input_tokens,
            "context_window": provider_cfg.get("context_window", 0),
            "mosh_pit": result.get("mosh_pit"),
        },
    }


@app.post("/v1/feedback")
async def submit_feedback(request: FeedbackRequest):
    """Submit feedback on a response. Feeds into calibration learning."""
    # Strip the babyai- prefix to match prediction IDs
    match_id = request.request_id.replace("babyai-", "")

    conn = get_db()

    # Check for duplicate feedback
    existing = conn.execute(
        "SELECT id FROM feedback WHERE request_id=?", (request.request_id,)
    ).fetchone()
    if existing:
        conn.close()
        return {"status": "already_submitted", "message": "Feedback already recorded for this request."}

    # Look up the original prediction
    prediction = conn.execute(
        "SELECT predicted_model, predicted_task_type, confidence FROM predictions WHERE id LIKE ?",
        (f"{match_id}%",),
    ).fetchone()

    model = prediction["predicted_model"] if prediction else None
    task_type = prediction["predicted_task_type"] if prediction else None

    # Record feedback
    feedback_id = str(uuid.uuid4())
    conn.execute(
        "INSERT INTO feedback (id, request_id, timestamp, rating, comment, model, task_type, applied) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        (feedback_id, request.request_id, time.time(), request.rating, request.comment, model, task_type, 0),
    )
    conn.commit()
    conn.close()

    # Apply to calibration (weight=0.5, weaker than Mosh Pit head-to-head)
    if model and task_type and request.rating != 0:
        record_calibration(
            task_type=task_type,
            model=model,
            won=(request.rating > 0),
            latency_ms=0,
            confidence=0.5,
            weight=0.5,
        )
        # Mark as applied
        try:
            conn = get_db()
            conn.execute("UPDATE feedback SET applied=1 WHERE id=?", (feedback_id,))
            conn.commit()
            conn.close()
        except Exception:
            pass

    return {
        "status": "recorded",
        "feedback_id": feedback_id,
        "applied_to_calibration": bool(model and task_type and request.rating != 0),
    }


@app.post("/v1/feedback/select")
async def submit_selection_feedback(request: SelectionFeedback):
    """User selected a preferred response from the Mosh Pit alternatives.

    This is the strongest calibration signal (weight 1.5) — ground truth from the user.
    """
    # Look up the original prediction to get the task type if not provided
    task_type = request.task_type
    if not task_type:
        match_id = request.request_id.replace("babyai-", "")
        try:
            conn = get_db()
            prediction = conn.execute(
                "SELECT predicted_task_type FROM predictions WHERE id LIKE ?",
                (f"{match_id}%",),
            ).fetchone()
            conn.close()
            task_type = prediction["predicted_task_type"] if prediction else "general"
        except Exception:
            task_type = "general"

    # Record calibration: selected provider wins, all others lose
    for provider in request.all_providers:
        won = provider == request.selected_provider
        record_calibration(
            task_type=task_type,
            model=provider,
            won=won,
            latency_ms=0,
            confidence=0.8,
            weight=1.5,  # strongest signal — user ground truth
        )

    # Sprint 7: Update traces to mark user selection
    try:
        conn = get_db()
        conn.execute(
            "UPDATE request_traces SET user_selected=1 WHERE request_id=? AND provider_key=?",
            (request.request_id, request.selected_provider),
        )
        conn.commit()
        conn.close()
    except Exception:
        pass

    return {
        "status": "recorded",
        "selected": request.selected_provider,
        "task_type": task_type,
        "providers_updated": len(request.all_providers),
    }


@app.get("/v1/calibration")
async def calibration():
    """View current calibration learning state — win rates per model per task type."""
    conn = get_db()
    rows = conn.execute("""
        SELECT task_type, model, wins, losses, total_calls,
               avg_latency_ms, avg_confidence, last_updated,
               CASE WHEN (wins + losses) > 0
                    THEN ROUND(wins * 1.0 / (wins + losses), 3)
                    ELSE NULL END as win_rate
        FROM routing_calibration
        ORDER BY task_type, wins DESC
    """).fetchall()
    conn.close()

    # Group by task_type
    by_task = {}
    for row in rows:
        task = row["task_type"]
        if task not in by_task:
            by_task[task] = []
        by_task[task].append({
            "model": row["model"],
            "wins": row["wins"],
            "losses": row["losses"],
            "win_rate": row["win_rate"],
            "total_calls": row["total_calls"],
            "avg_latency_ms": row["avg_latency_ms"],
            "last_updated": row["last_updated"],
        })

    return {
        "calibration": by_task,
        "total_entries": len(rows),
        "task_types_learned": list(by_task.keys()),
        "description": "Win rates from Mosh Pit head-to-head battles and user feedback. Higher win_rate = model consistently produces better responses for this task type.",
    }


@app.get("/v1/calibration/learn")
async def calibration_learn():
    """Sprint 7: Learn-evaluate-gate — analyze routing accuracy and flag regressions.

    Queries recent traces to compute:
    - Routing accuracy: how often auto-routing matched user selections
    - Cost efficiency: average cost per request by tier
    - Model performance: win rates from Mosh Pit selections
    - Quality gate: flags if accuracy dropped below threshold
    """
    conn = get_db()

    # Total Mosh Pit traces with user selections (the gold standard)
    user_selections = conn.execute("""
        SELECT provider_key, task_type, is_winner, user_selected, cost_cents
        FROM request_traces
        WHERE is_mosh_pit = 1 AND user_selected = 1
        ORDER BY timestamp DESC LIMIT 500
    """).fetchall()

    # Compute routing accuracy: did the auto-preferred model match user selection?
    total_selections = len(user_selections)
    auto_correct = sum(1 for r in user_selections if r["is_winner"] == 1)
    accuracy = round(auto_correct / total_selections, 3) if total_selections > 0 else None

    # Cost efficiency by tier
    cost_by_tier = conn.execute("""
        SELECT
            CASE
                WHEN cost_cents = 0 THEN 'free'
                WHEN cost_cents < 0.1 THEN 'mid'
                ELSE 'premium'
            END as cost_tier,
            COUNT(*) as count,
            ROUND(AVG(cost_cents), 4) as avg_cost,
            ROUND(SUM(cost_cents), 4) as total_cost
        FROM request_traces
        WHERE timestamp > ?
        GROUP BY cost_tier
    """, (time.time() - 86400 * 7,)).fetchall()  # last 7 days

    # Model win rates from user selections
    model_wins = conn.execute("""
        SELECT provider_key, task_type,
               COUNT(*) as selections,
               SUM(CASE WHEN is_winner = 1 THEN 1 ELSE 0 END) as auto_agreed
        FROM request_traces
        WHERE is_mosh_pit = 1 AND user_selected = 1
        GROUP BY provider_key, task_type
        ORDER BY selections DESC
    """).fetchall()

    # Recent trace volume
    trace_count = conn.execute(
        "SELECT COUNT(*) as c FROM request_traces WHERE timestamp > ?",
        (time.time() - 86400 * 7,),
    ).fetchone()["c"]

    conn.close()

    # Quality gate
    ACCURACY_THRESHOLD = 0.6
    status = "healthy"
    if accuracy is not None and accuracy < ACCURACY_THRESHOLD:
        status = "degraded"

    return {
        "status": status,
        "routing_accuracy": accuracy,
        "accuracy_threshold": ACCURACY_THRESHOLD,
        "total_user_selections": total_selections,
        "auto_correct": auto_correct,
        "cost_efficiency_7d": [dict(r) for r in cost_by_tier],
        "model_performance": [dict(r) for r in model_wins],
        "trace_volume_7d": trace_count,
        "description": "Routing accuracy measures how often auto-routing matched user's Mosh Pit selection. Below threshold = routing needs recalibration.",
    }


@app.get("/v1/stats")
async def stats():
    """Return usage and calibration statistics."""
    conn = get_db()

    total = conn.execute("SELECT COUNT(*) as c FROM usage_log").fetchone()["c"]
    total_cost = conn.execute("SELECT COALESCE(SUM(cost_cents), 0) as c FROM usage_log").fetchone()["c"]
    total_tokens = conn.execute("SELECT COALESCE(SUM(total_tokens), 0) as c FROM usage_log").fetchone()["c"]

    by_tier = conn.execute(
        "SELECT tier, COUNT(*) as count, SUM(cost_cents) as cost FROM usage_log GROUP BY tier ORDER BY tier"
    ).fetchall()

    by_model = conn.execute(
        "SELECT model, COUNT(*) as count, AVG(latency_ms) as avg_latency, SUM(cost_cents) as cost FROM usage_log GROUP BY model ORDER BY count DESC"
    ).fetchall()

    by_task = conn.execute(
        "SELECT task_type, COUNT(*) as count FROM usage_log GROUP BY task_type ORDER BY count DESC"
    ).fetchall()

    # Calibration learning stats
    cal_entries = conn.execute(
        "SELECT COUNT(*) as c FROM routing_calibration WHERE wins + losses > 0"
    ).fetchone()["c"]

    top_models = conn.execute("""
        SELECT model, task_type, wins, losses,
               ROUND(wins * 1.0 / (wins + losses), 3) as win_rate
        FROM routing_calibration
        WHERE wins + losses >= 3
        ORDER BY win_rate DESC
        LIMIT 10
    """).fetchall()

    feedback_count = conn.execute("SELECT COUNT(*) as c FROM feedback").fetchone()["c"]
    feedback_positive = conn.execute("SELECT COUNT(*) as c FROM feedback WHERE rating > 0").fetchone()["c"]
    feedback_negative = conn.execute("SELECT COUNT(*) as c FROM feedback WHERE rating < 0").fetchone()["c"]

    conn.close()

    return {
        "total_requests": total,
        "total_cost_cents": round(total_cost, 4),
        "total_tokens": total_tokens,
        "by_tier": [dict(r) for r in by_tier],
        "by_model": [dict(r) for r in by_model],
        "by_task_type": [dict(r) for r in by_task],
        "calibration": {
            "entries_with_battles": cal_entries,
            "top_models_by_win_rate": [dict(r) for r in top_models],
            "feedback_received": feedback_count,
            "feedback_positive": feedback_positive,
            "feedback_negative": feedback_negative,
        },
    }


# ---------------------------------------------------------------------------
# Web Search (Brave Search API with DuckDuckGo fallback)
# ---------------------------------------------------------------------------

class SearchRequest(BaseModel):
    query: str = Field(description="Search query string")
    num_results: int = Field(default=5, ge=1, le=20, description="Number of results to return")
    fetch_content: bool = Field(default=False, description="Whether to fetch full page content for top 3 results")


@app.post("/v1/search")
async def web_search(request: SearchRequest, req: Request):
    """Search the web using Brave Search API (or DuckDuckGo fallback).

    Available to any NovaSyn app via the cloud. Returns structured results
    with optional full-page content extraction.
    """
    brave_key = BRAVE_API_KEY()
    results = []

    async with httpx.AsyncClient(timeout=15.0) as client:
        if brave_key:
            # --- Brave Search API ---
            try:
                resp = await client.get(
                    "https://api.search.brave.com/res/v1/web/search",
                    params={"q": request.query, "count": request.num_results},
                    headers={
                        "Accept": "application/json",
                        "Accept-Encoding": "gzip",
                        "X-Subscription-Token": brave_key,
                    },
                )
                resp.raise_for_status()
                data = resp.json()
                for r in (data.get("web", {}).get("results", []))[:request.num_results]:
                    results.append({
                        "title": r.get("title", ""),
                        "url": r.get("url", ""),
                        "snippet": r.get("description", ""),
                    })
            except Exception as e:
                # Fall back to DuckDuckGo on Brave failure
                results = await _ddg_search(client, request.query, request.num_results)
        else:
            # --- DuckDuckGo fallback (no API key needed) ---
            results = await _ddg_search(client, request.query, request.num_results)

        # Optionally fetch full page content for top results
        if request.fetch_content and results:
            for i in range(min(3, len(results))):
                try:
                    page_resp = await client.get(
                        results[i]["url"],
                        headers={"User-Agent": "BabyAI/1.0"},
                        follow_redirects=True,
                        timeout=10.0,
                    )
                    if page_resp.status_code == 200:
                        content_type = page_resp.headers.get("content-type", "")
                        if "text/" in content_type or "xhtml" in content_type:
                            text = _extract_text(page_resp.text)
                            results[i]["content"] = text[:5000]
                except Exception:
                    results[i]["content"] = "[Failed to fetch content]"

    return {
        "query": request.query,
        "provider": "brave" if brave_key else "duckduckgo",
        "results": results,
        "result_count": len(results),
    }


async def _ddg_search(client: httpx.AsyncClient, query: str, num_results: int) -> list[dict]:
    """Fallback search using DuckDuckGo's lite HTML endpoint."""
    results = []
    try:
        resp = await client.get(
            "https://lite.duckduckgo.com/lite/",
            params={"q": query},
            headers={"User-Agent": "BabyAI/1.0"},
        )
        if resp.status_code == 200:
            html = resp.text
            # Parse result links and snippets from the lite HTML
            import re as _re
            links = _re.findall(r'<a[^>]*class="result-link"[^>]*href="([^"]*)"[^>]*>([^<]*)</a>', html)
            snippets = _re.findall(r'<td[^>]*class="result-snippet"[^>]*>([\s\S]*?)</td>', html)
            for i in range(min(len(links), num_results)):
                snippet = _re.sub(r'<[^>]*>', '', snippets[i]).strip() if i < len(snippets) else ""
                results.append({
                    "title": links[i][1].strip(),
                    "url": links[i][0],
                    "snippet": snippet,
                })
    except Exception:
        pass  # Return empty results on failure
    return results


def _extract_text(html: str) -> str:
    """Strip HTML tags and return readable text."""
    import re as _re
    text = html
    # Remove script/style blocks
    text = _re.sub(r'<script[\s\S]*?</script>', '', text, flags=_re.IGNORECASE)
    text = _re.sub(r'<style[\s\S]*?</style>', '', text, flags=_re.IGNORECASE)
    text = _re.sub(r'<noscript[\s\S]*?</noscript>', '', text, flags=_re.IGNORECASE)
    text = _re.sub(r'<!--[\s\S]*?-->', '', text)
    # Block-level elements -> newlines
    text = _re.sub(r'</(p|div|h[1-6]|li|tr|blockquote|article|section)>', '\n', text, flags=_re.IGNORECASE)
    text = _re.sub(r'<br\s*/?>', '\n', text, flags=_re.IGNORECASE)
    # Remove remaining tags
    text = _re.sub(r'<[^>]*>', ' ', text)
    # Decode common entities
    text = text.replace('&amp;', '&').replace('&lt;', '<').replace('&gt;', '>')
    text = text.replace('&quot;', '"').replace('&#39;', "'").replace('&nbsp;', ' ')
    # Collapse whitespace
    text = _re.sub(r'[ \t]+', ' ', text)
    text = _re.sub(r'\n\s*\n+', '\n\n', text)
    return text.strip()


# ---------------------------------------------------------------------------
# Sensor Telemetry Ingestion (for Hex Nodes / NullClaw)
# ---------------------------------------------------------------------------

class TelemetryReading(BaseModel):
    node_id: str = Field(description="Unique node identifier (e.g., 'hex-soil-001')")
    node_type: str = Field(description="Node type: soil, air, pest, water, growth")
    location: Optional[str] = Field(default=None, description="GPS or descriptive location")
    readings: dict = Field(description="Sensor readings (e.g., {'moisture': 42.1, 'temperature': 68.5})")
    metadata: Optional[dict] = Field(default=None, description="Additional context")


class TelemetryBatch(BaseModel):
    readings: list[TelemetryReading]


@app.post("/v1/telemetry")
async def ingest_telemetry(batch: TelemetryBatch):
    """Ingest sensor telemetry from hex nodes and NullClaw devices."""
    conn = get_db()
    now = time.time()
    inserted = 0

    for reading in batch.readings:
        tel_id = str(uuid.uuid4())
        conn.execute(
            "INSERT INTO telemetry (id, timestamp, node_id, node_type, location, readings, metadata) VALUES (?, ?, ?, ?, ?, ?, ?)",
            (tel_id, now, reading.node_id, reading.node_type, reading.location,
             json.dumps(reading.readings), json.dumps(reading.metadata) if reading.metadata else None),
        )
        inserted += 1

    conn.commit()
    conn.close()

    return {
        "status": "ingested",
        "readings_accepted": inserted,
        "timestamp": now,
    }


@app.get("/v1/telemetry")
async def query_telemetry(node_id: Optional[str] = None, node_type: Optional[str] = None, limit: int = 100):
    """Query recent telemetry readings."""
    conn = get_db()

    query = "SELECT * FROM telemetry WHERE 1=1"
    params = []
    if node_id:
        query += " AND node_id=?"
        params.append(node_id)
    if node_type:
        query += " AND node_type=?"
        params.append(node_type)
    query += " ORDER BY timestamp DESC LIMIT ?"
    params.append(min(limit, 1000))

    rows = conn.execute(query, params).fetchall()
    conn.close()

    results = []
    for row in rows:
        results.append({
            "id": row["id"],
            "timestamp": row["timestamp"],
            "node_id": row["node_id"],
            "node_type": row["node_type"],
            "location": row["location"],
            "readings": json.loads(row["readings"]),
            "metadata": json.loads(row["metadata"]) if row["metadata"] else None,
        })

    return {"readings": results, "count": len(results)}


# ---------------------------------------------------------------------------
# NullClaw Configuration
# ---------------------------------------------------------------------------

@app.get("/v1/config/nullclaw")
async def nullclaw_config():
    """Return configuration for NullClaw edge nodes to connect to BabyAI."""
    return {
        "api_base": "https://novasynchris-babyai.hf.space",
        "api_version": "v1",
        "endpoints": {
            "chat": "/v1/chat/completions",
            "models": "/v1/models",
            "search": "/v1/search",
            "telemetry": "/v1/telemetry",
            "health": "/health",
        },
        "auth": {
            "type": "bearer",
            "header": "Authorization",
            "note": "Use HF token or BABYAI_API_KEY as Bearer token",
        },
        "telemetry": {
            "batch_size": 10,
            "flush_interval_seconds": 300,
            "node_types": ["soil", "air", "pest", "water", "growth"],
        },
        "streaming": {
            "supported": True,
            "format": "sse",
            "content_type": "text/event-stream",
        },
    }
