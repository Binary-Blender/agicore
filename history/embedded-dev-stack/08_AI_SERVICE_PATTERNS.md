# 08 — AI Service Patterns

AI integration patterns for NovaSyn embedded devices. Every device has access to multiple AI tiers — from hardcoded rules to full cloud model access. The goal is to use the cheapest, fastest tier that can handle the task, and only escalate when necessary.

---

## The AI Hierarchy

Four tiers, ordered from most capable (most expensive) to least capable (free):

```
┌──────────────────────────────────────────────────┐
│  Tier 1: BabyAI Phone-Home                       │
│  Full model access via API                       │
│  Complex queries, creative tasks, multi-turn     │
│  Requires: internet + API key + token budget     │
│  Latency: 2–15 seconds                           │
│  Cost: per-token via BabyAI                      │
├──────────────────────────────────────────────────┤
│  Tier 2: Local LLM (Ollama on RPi)              │
│  Qwen 3 0.6B, Phi-3 Mini, Gemma 2B             │
│  Simple Q&A, command interpretation, summaries   │
│  Requires: Ollama installed, model pulled        │
│  Latency: 1–8 seconds (RPi 5), 3–20s (RPi 4)   │
│  Cost: electricity only                          │
├──────────────────────────────────────────────────┤
│  Tier 3: Local Classifier (TFLite)              │
│  Wake word, gesture, anomaly detection           │
│  Instant classification, minimal compute         │
│  Requires: TFLite model file                     │
│  Latency: 10–100 milliseconds                    │
│  Cost: negligible                                │
├──────────────────────────────────────────────────┤
│  Tier 4: Rule-Based                              │
│  Hardcoded decision trees, lookup tables         │
│  Safety-critical, ultra-low-latency paths        │
│  Requires: nothing (compiled in)                 │
│  Latency: <1 millisecond                         │
│  Cost: zero                                      │
└──────────────────────────────────────────────────┘
```

### Tier Details

**Tier 1: BabyAI Phone-Home**

- Endpoint: `https://novasynchris-babyai.hf.space/v1/chat/completions`
- Routes to the best available model (Claude, GPT, Gemini, Grok) via BabyAI's model routing
- Supports skill doc injection (FARMING_MISSOURI, GENERAL_CODING, EDUCATION, CREATIVE_WRITING)
- Single response mode only on embedded (no Mosh Pit — save bandwidth)
- Device context injected into system prompt automatically
- Use when: local LLM confidence is below threshold, user explicitly requests cloud, query requires current knowledge or creative ability

**Tier 2: Local LLM (Ollama)**

- Runs on RPi via Ollama (localhost:11434)
- Recommended models by hardware:

| Hardware | RAM | Recommended Model | Tokens/sec (est.) |
|---|---|---|---|
| RPi 5 8GB | 8GB | Qwen 3 0.6B (Q4_K_M) | 8–15 t/s |
| RPi 5 4GB | 4GB | Qwen 3 0.6B (Q4_K_S) | 6–12 t/s |
| RPi 4 8GB | 8GB | Phi-3 Mini 3.8B (Q4_0) | 3–6 t/s |
| RPi 4 4GB | 4GB | Qwen 3 0.6B (Q4_K_S) | 4–8 t/s |

- Model kept warm in memory (sacrifices ~1.5–2.5GB RAM, but eliminates cold-start delay of 10–30s)
- Use when: simple commands, conversational queries, summarization, intent disambiguation

**Tier 3: Local Classifier (TFLite)**

- TensorFlow Lite models running on RPi CPU (or ESP32-S3 for wake word)
- Common classifier models:
  - Wake word detection: custom "Hey Nova" model (~200KB)
  - Intent classification: fine-tuned DistilBERT (~70MB) or keyword-based fallback
  - Audio event detection: YAMNet-derived model for glass breaking, smoke alarm, etc.
  - Anomaly detection: autoencoder trained on normal sensor patterns (~1MB)
- Use when: real-time classification needed, high frequency (every audio frame), or when other tiers are unavailable

**Tier 4: Rule-Based**

- Hardcoded in Zig (firmware level) or Python (application level)
- Examples: emergency stop on overcurrent, temperature shutdown above 85C, motor stall detection
- **Safety-critical paths MUST be rule-based.** Never route a safety decision through an LLM.
- Use when: deterministic behavior required, latency under 1ms required, safety-critical

---

## Decision Routing

The routing engine classifies each input and directs it to the appropriate AI tier.

### Routing Logic

```python
# src/ai/router.py

from enum import Enum
from dataclasses import dataclass

class AiTier(Enum):
    RULE_BASED = 4
    LOCAL_CLASSIFIER = 3
    LOCAL_LLM = 2
    BABYAI = 1

@dataclass
class RoutingDecision:
    tier: AiTier
    reason: str
    fallback_tier: AiTier | None = None

class AiRouter:
    """Route queries to the appropriate AI tier."""

    # Keywords that indicate simple commands (rule-based or classifier)
    SIMPLE_COMMANDS = {
        "turn on", "turn off", "set", "start", "stop",
        "what time", "what's the time", "timer", "alarm",
    }

    # Keywords that indicate complex queries (BabyAI)
    COMPLEX_INDICATORS = {
        "write", "explain", "analyze", "compare", "create",
        "why", "how does", "what if", "tell me about",
        "recommend", "suggest", "plan", "design",
    }

    # Safety keywords (rule-based ONLY)
    SAFETY_KEYWORDS = {
        "emergency", "stop", "halt", "shutdown", "danger",
        "fire", "help", "panic",
    }

    def route(self, query: str, context: dict | None = None) -> RoutingDecision:
        """Determine which AI tier should handle this query."""
        query_lower = query.lower().strip()

        # Safety-critical: ALWAYS rule-based, no fallback through AI
        if any(kw in query_lower for kw in self.SAFETY_KEYWORDS):
            return RoutingDecision(
                tier=AiTier.RULE_BASED,
                reason="Safety keyword detected",
                fallback_tier=None,  # no fallback — rule-based is final
            )

        # Simple device commands
        if any(query_lower.startswith(cmd) for cmd in self.SIMPLE_COMMANDS):
            return RoutingDecision(
                tier=AiTier.RULE_BASED,
                reason="Simple command pattern matched",
                fallback_tier=AiTier.LOCAL_LLM,
            )

        # Complex/creative queries
        if any(kw in query_lower for kw in self.COMPLEX_INDICATORS):
            return RoutingDecision(
                tier=AiTier.BABYAI,
                reason="Complex query indicators detected",
                fallback_tier=AiTier.LOCAL_LLM,
            )

        # Default: try local LLM, fall back to BabyAI if confidence is low
        return RoutingDecision(
            tier=AiTier.LOCAL_LLM,
            reason="Default routing — conversational query",
            fallback_tier=AiTier.BABYAI,
        )
```

### Routing Examples

| User Input | Route | Reason |
|---|---|---|
| "Turn on the kitchen light" | Rule-Based | Simple command, deterministic |
| "What's the temperature?" | Rule-Based | Direct sensor query, no AI needed |
| "What's the weather going to be like?" | Local LLM | Conversational, uses sensor context |
| "Write a poem about my garden data" | BabyAI | Creative task, needs large model |
| "Why are my tomatoes wilting?" | BabyAI | Analytical, benefits from FARMING_MISSOURI skill doc |
| "Emergency stop" | Rule-Based | Safety-critical, immediate |
| "Set a timer for 10 minutes" | Rule-Based | Simple command |
| "Tell me about the history of this area" | BabyAI | Knowledge query, needs current info |
| "Good morning" | Local LLM | Conversational, simple response |

### Confidence-Based Escalation

When the local LLM responds, it can self-assess confidence. If confidence is below the threshold (default 0.6), the query is re-sent to BabyAI:

```python
# src/ai/inference.py

import httpx

from config import DeviceConfig

OLLAMA_URL = "http://localhost:11434"

async def query_local_llm(
    query: str,
    system_prompt: str,
    config: DeviceConfig,
) -> tuple[str, float]:
    """Query local Ollama and return (response, confidence)."""
    payload = {
        "model": config.ai.local_model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": query},
        ],
        "stream": False,
        "options": {
            "num_predict": config.ai.max_local_tokens,
            "temperature": 0.7,
        },
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            f"{config.ai.local_ollama_url}/api/chat",
            json=payload,
        )
        response.raise_for_status()
        data = response.json()

    content = data["message"]["content"]

    # Estimate confidence heuristically:
    # - Short responses to complex queries = low confidence
    # - "I don't know" / "I'm not sure" = low confidence
    # - Hedging language = medium confidence
    confidence = estimate_confidence(query, content)

    return content, confidence


def estimate_confidence(query: str, response: str) -> float:
    """Heuristic confidence estimation for local LLM responses."""
    score = 0.7  # baseline

    # Penalty for uncertainty phrases
    uncertainty_phrases = [
        "i don't know", "i'm not sure", "i cannot", "i can't",
        "i don't have", "beyond my", "not certain", "hard to say",
        "you might want to", "i would suggest asking",
    ]
    response_lower = response.lower()
    for phrase in uncertainty_phrases:
        if phrase in response_lower:
            score -= 0.15

    # Penalty for very short responses to long queries
    if len(query) > 50 and len(response) < 30:
        score -= 0.2

    # Penalty for repetitive content
    words = response_lower.split()
    if len(words) > 10:
        unique_ratio = len(set(words)) / len(words)
        if unique_ratio < 0.5:
            score -= 0.2

    # Bonus for structured responses (lists, specific numbers)
    if any(c.isdigit() for c in response):
        score += 0.05
    if "\n" in response and ("- " in response or "1." in response):
        score += 0.05

    return max(0.0, min(1.0, score))


async def query_with_escalation(
    query: str,
    system_prompt: str,
    config: DeviceConfig,
) -> tuple[str, str]:
    """Query local LLM with automatic escalation to BabyAI.
    Returns (response, tier_used)."""
    try:
        response, confidence = await query_local_llm(query, system_prompt, config)

        if confidence >= config.ai.confidence_threshold:
            return response, "local_llm"

        # Confidence too low — escalate to BabyAI
        logger.info(
            "Local LLM confidence %.2f below threshold %.2f, escalating to BabyAI",
            confidence, config.ai.confidence_threshold,
        )
    except Exception:
        logger.warning("Local LLM failed, escalating to BabyAI")

    # Phone home to BabyAI
    try:
        from services.babyai_client import phone_home
        response = await phone_home(
            config.network.babyai.api_key,
            system_prompt,
            query,
            skill_docs=config.network.babyai.skill_docs,
        )
        return response, "babyai"
    except Exception:
        logger.warning("BabyAI also failed, using canned response")
        return get_canned_response(query), "canned"


def get_canned_response(query: str) -> str:
    """Last-resort canned responses when all AI tiers fail."""
    query_lower = query.lower()
    if "temperature" in query_lower or "temp" in query_lower:
        return "I can check the temperature sensor for you, but I'm having trouble processing complex queries right now."
    if "time" in query_lower:
        from datetime import datetime
        return f"The current time is {datetime.now().strftime('%I:%M %p')}."
    return "I'm having trouble connecting to my AI services right now. I can still read sensors and respond to simple commands."
```

---

## Voice Pipeline (Ambient AI)

The complete audio pipeline from wake word to spoken response:

```
┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐
│ Wake Word│──>│ Capture  │──>│   STT    │──>│  Route   │──>│   LLM    │──>│   TTS    │──> Speaker
│ Detect   │   │ Audio    │   │ Whisper  │   │ & Infer  │   │ Generate │   │  Piper   │
│ (TFLite) │   │ (ALSA)   │   │ (.cpp)   │   │          │   │          │   │          │
│ ~50ms    │   │ ~0ms     │   │ ~800ms   │   │ ~100ms   │   │ ~1500ms  │   │ ~400ms   │
└──────────┘   └──────────┘   └──────────┘   └──────────┘   └──────────┘   └──────────┘
                                                                           Total: ~2.85s
```

### Timing Budget (RPi 5)

| Stage | Component | Latency | Notes |
|---|---|---|---|
| Wake word detection | TFLite, continuous | ~50ms | Per audio frame, runs always |
| Audio capture | ALSA/PipeWire | ~0ms | Begins immediately on wake word |
| End-of-speech detection | VAD (Silero) | ~300ms | 300ms of silence = end of utterance |
| Speech-to-text | whisper.cpp (tiny) | ~600–1000ms | For 3–5 second utterance on RPi 5 |
| Intent routing | Keyword/classifier | ~50–100ms | Determines which AI tier to use |
| LLM inference (local) | Ollama (Qwen 3 0.6B) | ~1000–2000ms | For ~100 token response |
| LLM inference (BabyAI) | API call | ~2000–8000ms | Network dependent |
| Text-to-speech | Piper | ~300–500ms | For ~50 word response |
| Audio output | ALSA/PipeWire | ~0ms | Streams as TTS generates |
| **Total (local path)** | | **~2.3–3.9s** | End of speech to start of audio |
| **Total (cloud path)** | | **~3.3–9.9s** | End of speech to start of audio |

**Target**: Under 3 seconds for the local path. Under 5 seconds for the cloud path (acceptable for complex queries).

### Implementation

```python
# src/audio/voice_pipeline.py

import asyncio
import logging
from enum import Enum, auto
from pathlib import Path

logger = logging.getLogger(__name__)


class PipelineState(Enum):
    IDLE = auto()         # listening for wake word
    LISTENING = auto()    # capturing user speech
    PROCESSING = auto()   # STT + AI inference
    SPEAKING = auto()     # TTS output


class VoicePipeline:
    """Complete voice interaction pipeline for Ambient AI."""

    def __init__(self, config, sensors, ai_router, mqtt):
        self.config = config
        self.sensors = sensors
        self.ai_router = ai_router
        self.mqtt = mqtt
        self.state = PipelineState.IDLE

        # Components initialized in start()
        self.wake_detector = None
        self.audio_capture = None
        self.stt = None
        self.tts = None
        self.vad = None

    async def start(self):
        """Initialize all pipeline components."""
        from audio.wake_word import WakeWordDetector
        from audio.capture import AudioCapture
        from audio.stt import WhisperSTT
        from audio.tts import PiperTTS
        from audio.vad import SileroVAD

        self.wake_detector = WakeWordDetector(
            model_path="/opt/novasyn/models/hey_nova.tflite",
            sensitivity=self.config.audio.wake_word_sensitivity,
        )
        self.audio_capture = AudioCapture(
            device=self.config.audio.input_device,
            sample_rate=self.config.audio.sample_rate,
        )
        self.stt = WhisperSTT(
            model=self.config.audio.stt_model,  # "whisper-tiny" or "whisper-base"
        )
        self.tts = PiperTTS(
            voice=self.config.audio.tts_voice,
            speed=self.config.audio.tts_speed,
        )
        self.vad = SileroVAD(
            threshold=0.5,
            silence_duration_ms=300,
        )

        logger.info("Voice pipeline initialized")
        asyncio.create_task(self._run())

    async def _run(self):
        """Main pipeline loop."""
        while True:
            try:
                # Stage 1: Wait for wake word
                self.state = PipelineState.IDLE
                await self._update_leds("idle")
                await self.wake_detector.wait_for_activation(self.audio_capture)

                # Announce wake word detection on MQTT
                await self.mqtt.publish("audio/wake_word/detected", {
                    "wake_word": self.config.audio.wake_word,
                    "confidence": self.wake_detector.last_confidence,
                })

                # Stage 2: Capture user speech
                self.state = PipelineState.LISTENING
                await self._update_leds("listening")
                await self._play_listen_chime()

                audio_data = await self.audio_capture.record_until_silence(
                    vad=self.vad,
                    max_duration_s=15,
                )

                if not audio_data or len(audio_data) < 1600:  # less than 0.1s of audio
                    logger.debug("No speech detected after wake word")
                    continue

                # Stage 3: Speech to text
                self.state = PipelineState.PROCESSING
                await self._update_leds("processing")

                transcript = await self.stt.transcribe(audio_data)
                logger.info("User said: %s", transcript)

                if not transcript.strip():
                    continue

                # Stage 4: Route and infer
                device_context = self._build_context()
                routing = self.ai_router.route(transcript)
                logger.info("Routing to %s: %s", routing.tier.name, routing.reason)

                if routing.tier == AiTier.RULE_BASED:
                    response_text = await self._handle_rule_based(transcript)
                    tier_used = "rule_based"
                else:
                    response_text, tier_used = await query_with_escalation(
                        transcript, device_context, self.config,
                    )

                logger.info("AI response (%s): %s", tier_used, response_text[:100])

                # Stage 5: Text to speech
                self.state = PipelineState.SPEAKING
                await self._update_leds("speaking")
                await self.tts.speak(response_text, volume=self.config.audio.volume_pct)

                # Log the interaction
                await self.mqtt.publish("ai/query/response", {
                    "query": transcript,
                    "response": response_text,
                    "ai_tier": tier_used,
                    "latency_ms": 0,  # TODO: measure actual latency
                })

            except asyncio.CancelledError:
                break
            except Exception:
                logger.exception("Voice pipeline error")
                await asyncio.sleep(1)  # brief pause before retrying

    def _build_context(self) -> str:
        """Build the LLM system prompt with device context."""
        snapshot = self.sensors.latest
        return (
            f"You are {self.config.ai.personality_name}, "
            f"a NovaSyn {self.config.device.type} assistant. "
            f"{self.config.ai.personality_prompt} "
            f"{snapshot.to_context_string()} "
            f"Location: {self.config.device.location}."
        )

    async def _handle_rule_based(self, command: str) -> str:
        """Handle simple commands without AI."""
        command_lower = command.lower().strip()

        if "temperature" in command_lower or "temp" in command_lower:
            t = self.sensors.latest.temperature_c
            if t is not None:
                return f"The temperature is {t:.1f} degrees Celsius, or {t * 9/5 + 32:.0f} Fahrenheit."
            return "The temperature sensor isn't available right now."

        if "humidity" in command_lower:
            h = self.sensors.latest.humidity_pct
            if h is not None:
                return f"The humidity is {h:.0f} percent."
            return "The humidity sensor isn't available right now."

        if "time" in command_lower:
            from datetime import datetime
            now = datetime.now()
            return f"It's {now.strftime('%I:%M %p')}."

        if any(kw in command_lower for kw in ("turn on", "turn off", "set light")):
            on = "on" in command_lower
            await self.mqtt.publish(
                "commands/light/set",
                {"brightness": 100 if on else 0},
                qos=1,
            )
            return f"Light turned {'on' if on else 'off'}."

        if any(kw in command_lower for kw in ("emergency", "stop", "halt")):
            await self.mqtt.publish("commands/emergency_stop", {}, qos=2)
            return "Emergency stop triggered. All actuators halted."

        return "I didn't understand that command. Could you try again?"

    async def _update_leds(self, pattern: str):
        """Update LED ring to reflect pipeline state."""
        await self.mqtt.publish("commands/neopixel/pattern", {"pattern": pattern}, qos=0)

    async def _play_listen_chime(self):
        """Play a brief chime to indicate the device is listening."""
        await self.mqtt.publish("commands/audio/play", {"sound": "listen_chime"}, qos=0)
```

### Wake Word Detection Detail

```python
# src/audio/wake_word.py

import numpy as np
import tflite_runtime.interpreter as tflite

class WakeWordDetector:
    """TFLite-based wake word detector running on RPi CPU."""

    def __init__(self, model_path: str, sensitivity: float = 0.7):
        self.sensitivity = sensitivity
        self.last_confidence = 0.0

        # Load TFLite model
        self.interpreter = tflite.Interpreter(model_path=model_path)
        self.interpreter.allocate_tensors()
        self.input_details = self.interpreter.get_input_details()
        self.output_details = self.interpreter.get_output_details()

        # Audio preprocessing params
        self.frame_size = 1600       # 100ms at 16kHz
        self.hop_size = 800          # 50ms hop (50% overlap)
        self.n_mels = 40             # mel spectrogram bands
        self.window_frames = 16      # ~800ms of audio context

    async def wait_for_activation(self, audio_capture):
        """Block until wake word is detected."""
        ring_buffer = np.zeros((self.window_frames, self.n_mels), dtype=np.float32)

        async for frame in audio_capture.stream_frames(self.frame_size, self.hop_size):
            # Compute mel spectrogram for this frame
            mel = self._compute_mel(frame)
            ring_buffer = np.roll(ring_buffer, -1, axis=0)
            ring_buffer[-1] = mel

            # Run inference
            input_data = ring_buffer.reshape(1, self.window_frames, self.n_mels, 1)
            self.interpreter.set_tensor(self.input_details[0]["index"], input_data)
            self.interpreter.invoke()
            output = self.interpreter.get_tensor(self.output_details[0]["index"])

            confidence = float(output[0][0])
            if confidence >= self.sensitivity:
                self.last_confidence = confidence
                return

    def _compute_mel(self, audio_frame: np.ndarray) -> np.ndarray:
        """Compute mel spectrogram for a single audio frame."""
        # Apply FFT
        spectrum = np.abs(np.fft.rfft(audio_frame * np.hanning(len(audio_frame))))
        # Apply mel filterbank (simplified — in production use librosa or torchaudio)
        mel_matrix = self._get_mel_filterbank(len(spectrum), self.n_mels, 16000)
        return np.dot(spectrum, mel_matrix.T)

    def _get_mel_filterbank(self, n_fft: int, n_mels: int, sample_rate: int):
        """Generate mel filterbank matrix."""
        # Simplified — in production, precompute and cache this
        import librosa
        return librosa.filters.mel(sr=sample_rate, n_fft=(n_fft - 1) * 2, n_mels=n_mels)
```

### Speech-to-Text Detail

```python
# src/audio/stt.py

import subprocess
import tempfile
from pathlib import Path

import numpy as np

class WhisperSTT:
    """Local speech-to-text using whisper.cpp."""

    def __init__(self, model: str = "whisper-tiny"):
        self.model_path = Path(f"/opt/novasyn/models/ggml-{model}.bin")
        self.whisper_bin = Path("/opt/novasyn/bin/whisper-cpp")

        if not self.model_path.exists():
            raise FileNotFoundError(f"Whisper model not found: {self.model_path}")
        if not self.whisper_bin.exists():
            raise FileNotFoundError(f"whisper.cpp binary not found: {self.whisper_bin}")

    async def transcribe(self, audio_pcm: np.ndarray) -> str:
        """Transcribe PCM audio (16kHz mono float32) to text."""
        # Write audio to temp WAV file (whisper.cpp expects WAV input)
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as f:
            temp_path = f.name
            self._write_wav(f, audio_pcm, sample_rate=16000)

        try:
            # Run whisper.cpp inference
            result = subprocess.run(
                [
                    str(self.whisper_bin),
                    "-m", str(self.model_path),
                    "-f", temp_path,
                    "--no-timestamps",
                    "--language", "en",
                    "--threads", "4",
                ],
                capture_output=True,
                text=True,
                timeout=30,
            )

            if result.returncode != 0:
                raise RuntimeError(f"whisper.cpp failed: {result.stderr}")

            # Parse output — whisper.cpp outputs text to stdout
            transcript = result.stdout.strip()
            # Remove any leading/trailing artifacts
            transcript = transcript.strip("[]() \n")
            return transcript

        finally:
            Path(temp_path).unlink(missing_ok=True)

    @staticmethod
    def _write_wav(f, audio: np.ndarray, sample_rate: int):
        """Write PCM float32 audio as WAV."""
        import struct
        pcm16 = (audio * 32767).astype(np.int16)
        data = pcm16.tobytes()
        # WAV header
        f.write(b"RIFF")
        f.write(struct.pack("<I", 36 + len(data)))
        f.write(b"WAVE")
        f.write(b"fmt ")
        f.write(struct.pack("<I", 16))           # chunk size
        f.write(struct.pack("<H", 1))            # PCM
        f.write(struct.pack("<H", 1))            # mono
        f.write(struct.pack("<I", sample_rate))
        f.write(struct.pack("<I", sample_rate * 2))  # byte rate
        f.write(struct.pack("<H", 2))            # block align
        f.write(struct.pack("<H", 16))           # bits per sample
        f.write(b"data")
        f.write(struct.pack("<I", len(data)))
        f.write(data)
```

### Text-to-Speech Detail

```python
# src/audio/tts.py

import subprocess
import tempfile
from pathlib import Path

class PiperTTS:
    """Local text-to-speech using Piper."""

    def __init__(self, voice: str = "en_US-lessac-medium", speed: float = 1.0):
        self.voice = voice
        self.speed = speed
        self.piper_bin = Path("/opt/novasyn/bin/piper")
        self.model_path = Path(f"/opt/novasyn/models/piper/{voice}.onnx")

    async def speak(self, text: str, volume: int = 70):
        """Convert text to speech and play through speakers."""
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as f:
            temp_path = f.name

        try:
            # Generate audio with Piper
            process = subprocess.run(
                [
                    str(self.piper_bin),
                    "--model", str(self.model_path),
                    "--output_file", temp_path,
                    "--length_scale", str(1.0 / self.speed),
                ],
                input=text.encode(),
                capture_output=True,
                timeout=30,
            )

            if process.returncode != 0:
                raise RuntimeError(f"Piper TTS failed: {process.stderr.decode()}")

            # Play audio through ALSA/PipeWire
            subprocess.run(
                ["aplay", "-D", "default", "-q", temp_path],
                timeout=60,
                check=True,
            )

        finally:
            Path(temp_path).unlink(missing_ok=True)
```

---

## Sensor AI Patterns

### Anomaly Detection

Train a TFLite model on "normal" sensor patterns, then flag deviations in real-time:

```python
# src/ai/anomaly_detector.py

import numpy as np
import tflite_runtime.interpreter as tflite

class SensorAnomalyDetector:
    """Detect anomalous sensor readings using an autoencoder."""

    def __init__(self, model_path: str, threshold: float = 0.1):
        self.threshold = threshold
        self.interpreter = tflite.Interpreter(model_path=model_path)
        self.interpreter.allocate_tensors()

        # Normalization params (from training data)
        self.feature_means = np.array([22.0, 55.0, 101325.0])  # temp, hum, press
        self.feature_stds = np.array([5.0, 15.0, 500.0])

    def check(self, readings: dict) -> tuple[bool, float]:
        """Check if readings are anomalous. Returns (is_anomaly, reconstruction_error)."""
        features = np.array([
            readings.get("temperature_c", 22.0),
            readings.get("humidity_pct", 55.0),
            readings.get("pressure_pa", 101325.0),
        ], dtype=np.float32)

        # Normalize
        normalized = (features - self.feature_means) / self.feature_stds
        input_data = normalized.reshape(1, -1).astype(np.float32)

        # Run autoencoder
        self.interpreter.set_tensor(
            self.interpreter.get_input_details()[0]["index"],
            input_data,
        )
        self.interpreter.invoke()
        output = self.interpreter.get_tensor(
            self.interpreter.get_output_details()[0]["index"],
        )

        # Reconstruction error
        error = float(np.mean((input_data - output) ** 2))
        is_anomaly = error > self.threshold

        return is_anomaly, error
```

### Predictive Maintenance

Track sensor trends over time to predict equipment issues:

```python
# src/ai/predictive_maintenance.py

from collections import deque
from dataclasses import dataclass
from datetime import datetime

@dataclass
class TrendAlert:
    sensor: str
    metric: str
    direction: str  # "rising" or "falling"
    rate: float     # units per hour
    message: str

class TrendAnalyzer:
    """Analyze sensor trends for predictive maintenance."""

    def __init__(self, window_size: int = 360):
        # Store last N readings (at 5s intervals, 360 = 30 minutes)
        self.history: dict[str, deque] = {}
        self.window_size = window_size

    def add_reading(self, sensor: str, value: float, timestamp: datetime):
        if sensor not in self.history:
            self.history[sensor] = deque(maxlen=self.window_size)
        self.history[sensor].append((timestamp, value))

    def check_trends(self) -> list[TrendAlert]:
        """Analyze all sensor histories for concerning trends."""
        alerts = []

        for sensor, history in self.history.items():
            if len(history) < 10:
                continue

            timestamps, values = zip(*history)
            values = list(values)

            # Simple linear regression for trend
            n = len(values)
            x = list(range(n))
            x_mean = sum(x) / n
            y_mean = sum(values) / n
            numerator = sum((x[i] - x_mean) * (values[i] - y_mean) for i in range(n))
            denominator = sum((x[i] - x_mean) ** 2 for i in range(n))

            if denominator == 0:
                continue

            slope = numerator / denominator  # units per reading

            # Convert to units per hour
            duration_hours = (timestamps[-1] - timestamps[0]).total_seconds() / 3600
            if duration_hours == 0:
                continue
            rate_per_hour = slope * n / duration_hours

            # Check thresholds
            alerts.extend(self._check_sensor_thresholds(sensor, rate_per_hour, values[-1]))

        return alerts

    def _check_sensor_thresholds(
        self, sensor: str, rate_per_hour: float, current_value: float,
    ) -> list[TrendAlert]:
        alerts = []

        if sensor == "temperature_c":
            if rate_per_hour > 2.0:
                alerts.append(TrendAlert(
                    sensor=sensor, metric="temperature",
                    direction="rising", rate=rate_per_hour,
                    message=f"Temperature rising rapidly ({rate_per_hour:.1f}C/hr). "
                            f"Current: {current_value:.1f}C. Check for heat sources.",
                ))
            elif rate_per_hour < -2.0:
                alerts.append(TrendAlert(
                    sensor=sensor, metric="temperature",
                    direction="falling", rate=rate_per_hour,
                    message=f"Temperature falling rapidly ({abs(rate_per_hour):.1f}C/hr). "
                            f"Current: {current_value:.1f}C. Window or door may be open.",
                ))

        if sensor == "humidity_pct":
            if rate_per_hour > 5.0 and current_value > 70:
                alerts.append(TrendAlert(
                    sensor=sensor, metric="humidity",
                    direction="rising", rate=rate_per_hour,
                    message=f"Humidity rising quickly ({rate_per_hour:.0f}%/hr), "
                            f"now at {current_value:.0f}%. Consider ventilation.",
                ))

        return alerts
```

### Environmental Understanding

Combine raw sensor data into natural language context for the LLM:

```python
# src/ai/environment_interpreter.py

from services.sensor_fusion import EnvironmentSnapshot

def interpret_environment(snapshot: EnvironmentSnapshot) -> str:
    """Convert sensor readings into natural language context."""
    parts = []

    # Temperature interpretation
    if snapshot.temperature_c is not None:
        t = snapshot.temperature_c
        if t < 10:
            parts.append(f"It's quite cold at {t:.0f}C ({t * 9/5 + 32:.0f}F).")
        elif t < 18:
            parts.append(f"It's cool at {t:.0f}C ({t * 9/5 + 32:.0f}F).")
        elif t < 24:
            parts.append(f"Temperature is comfortable at {t:.0f}C ({t * 9/5 + 32:.0f}F).")
        elif t < 30:
            parts.append(f"It's warm at {t:.0f}C ({t * 9/5 + 32:.0f}F).")
        else:
            parts.append(f"It's hot at {t:.0f}C ({t * 9/5 + 32:.0f}F).")

    # Humidity interpretation
    if snapshot.humidity_pct is not None:
        h = snapshot.humidity_pct
        if h < 30:
            parts.append(f"The air is very dry ({h:.0f}% humidity).")
        elif h < 50:
            parts.append(f"Humidity is comfortable at {h:.0f}%.")
        elif h < 70:
            parts.append(f"Humidity is moderate at {h:.0f}%.")
        else:
            parts.append(f"It's quite humid ({h:.0f}%).")

    # Pressure interpretation
    if snapshot.pressure_pa is not None:
        hpa = snapshot.pressure_pa / 100.0
        if hpa < 1000:
            parts.append("Barometric pressure is low — stormy weather likely.")
        elif hpa < 1013:
            parts.append("Barometric pressure is slightly below normal.")
        elif hpa < 1025:
            parts.append("Barometric pressure is normal — fair weather.")
        else:
            parts.append("Barometric pressure is high — clear skies likely.")

    # Motion context
    if snapshot.motion_detected:
        parts.append("Motion was recently detected in the room.")
    else:
        parts.append("No recent motion detected — the room appears unoccupied.")

    # Soil moisture (agriculture devices)
    if snapshot.soil_moisture is not None:
        m = snapshot.soil_moisture
        if m < 200:
            parts.append(f"Soil is very dry (reading: {m}). Plants likely need watering.")
        elif m < 400:
            parts.append(f"Soil is moderately dry (reading: {m}).")
        elif m < 600:
            parts.append(f"Soil moisture is good (reading: {m}).")
        else:
            parts.append(f"Soil is very wet (reading: {m}). May be overwatered.")

    return " ".join(parts)
```

### Agriculture: Hex Sensor Node Pattern

The Hex Sensor Node combines sensors with BabyAI's FARMING_MISSOURI skill doc:

```python
# src/ai/agriculture.py

async def get_farming_recommendation(
    soil_moisture: int,
    temperature_c: float,
    humidity_pct: float,
    pressure_pa: float,
    crop_type: str,
    config: DeviceConfig,
) -> str:
    """Get farming recommendation from BabyAI with sensor context."""
    context = (
        f"Current readings: temp={temperature_c:.1f}C, humidity={humidity_pct:.0f}%, "
        f"soil_moisture={soil_moisture} (scale: 0=dry, 1023=saturated), "
        f"pressure={pressure_pa:.0f}Pa. "
        f"Crop: {crop_type}. "
        f"Historical trend: soil drying over past 3 days."
    )

    query = (
        f"Based on current conditions, should I water the {crop_type}? "
        f"Consider the weather trend from barometric pressure."
    )

    from services.babyai_client import phone_home
    return await phone_home(
        api_key=config.network.babyai.api_key,
        device_context=f"You are a NovaSyn Hex Sensor Node agricultural assistant. "
                       f"Location: {config.device.location}. {context}",
        user_message=query,
        skill_docs=["FARMING_MISSOURI"],
    )
```

---

## BabyAI Integration Patterns

### System Prompt Construction

Every request to BabyAI includes device-specific context:

```python
def build_babyai_system_prompt(config: DeviceConfig, sensors: EnvironmentSnapshot) -> str:
    """Build the complete system prompt for BabyAI requests."""
    device_context = (
        f"You are assisting a NovaSyn {config.device.type} device "
        f"(ID: {config.device.id}). "
    )

    sensor_context = sensors.to_context_string()
    env_interpretation = interpret_environment(sensors)

    capabilities = f"Device capabilities: {', '.join(config.device.capabilities)}."
    location = f"Location: {config.device.location}."
    mode = f"Operating mode: {config.power.current_profile}."

    personality = config.ai.personality_prompt or ""

    return (
        f"{device_context}\n"
        f"{personality}\n"
        f"{sensor_context}\n"
        f"{env_interpretation}\n"
        f"{capabilities}\n"
        f"{location} {mode}"
    )
```

### Mosh Pit: Not Used on Embedded

BabyAI's Mosh Pit feature sends multiple model responses and lets the user pick the best. On embedded devices, this is not used:
- Bandwidth cost of receiving multiple responses is too high
- Voice pipeline needs a single response to speak
- Latency would multiply (waiting for slowest model)
- Instead, BabyAI routes to a single best model via `"model": "auto"`

### Calibration Feedback

When users correct device behavior, send calibration signals to BabyAI:

```python
# src/services/babyai_feedback.py

import httpx

BABYAI_URL = "https://novasynchris-babyai.hf.space"

async def send_calibration_feedback(
    api_key: str,
    device_id: str,
    context: str,
    original_response: str,
    user_correction: str,
):
    """Send user correction as calibration feedback to BabyAI."""
    async with httpx.AsyncClient(timeout=10.0) as client:
        await client.post(
            f"{BABYAI_URL}/v1/feedback/select",
            json={
                "device_id": device_id,
                "context": context,
                "original_response": original_response,
                "user_correction": user_correction,
                "source": "embedded_device",
            },
            headers={"Authorization": f"Bearer {api_key}"},
        )
```

Examples of calibration feedback:
- User says "it's actually warmer than that" after temperature report -> sends correction
- User says "no, turn off the bedroom light, not the kitchen" -> sends intent clarification
- User selects a different action than what was suggested -> sends preference signal

### Skill Doc Injection

Devices request relevant skill docs based on their type:

| Device Type | Skill Docs |
|---|---|
| ambient-ai | GENERAL_CODING (if dev tool), CREATIVE_WRITING |
| hexnode | FARMING_MISSOURI |
| edu-device | EDUCATION |
| dev-tool | GENERAL_CODING |

### Telemetry Reporting

Devices send anonymized usage telemetry to BabyAI periodically:

```python
# Telemetry payload (sent every hour or on significant events)
{
    "device_id": "novasyn-ambient-a1b2c3",
    "device_type": "ambient-ai",
    "period_start": "2026-03-13T13:00:00Z",
    "period_end": "2026-03-13T14:00:00Z",
    "stats": {
        "queries_total": 12,
        "queries_local_llm": 8,
        "queries_babyai": 3,
        "queries_rule_based": 1,
        "avg_local_latency_ms": 1840,
        "avg_remote_latency_ms": 4200,
        "escalations": 2,
        "wake_word_activations": 15,
        "false_wake_words": 3
    },
    "environment_summary": {
        "avg_temperature_c": 23.5,
        "avg_humidity_pct": 58.0,
        "motion_events": 24
    }
}
```

### BYOK (Bring Your Own Key)

Devices can store the user's own provider API keys in `device.json`, passed as BYOK headers to BabyAI:

```json
{
  "network": {
    "babyai": {
      "api_key": "bai-xxxx",
      "byok": {
        "anthropic": "sk-ant-xxxx",
        "openai": "sk-xxxx",
        "google": "AIzaSyxxxx"
      }
    }
  }
}
```

When making BabyAI requests with BYOK:

```python
headers = {
    "Authorization": f"Bearer {config.network.babyai.api_key}",
}
# Add BYOK headers if configured
byok = config.network.babyai.byok
if byok:
    if byok.get("anthropic"):
        headers["X-Anthropic-Key"] = byok["anthropic"]
    if byok.get("openai"):
        headers["X-OpenAI-Key"] = byok["openai"]
    if byok.get("google"):
        headers["X-Google-Key"] = byok["google"]
```

---

## Local Model Management

### First Boot Model Pull

```python
# src/setup/model_setup.py

import subprocess
import platform
import psutil

def get_recommended_model() -> str:
    """Select the best model for this hardware."""
    ram_gb = psutil.virtual_memory().total / (1024 ** 3)

    # RPi 5 with 8GB
    if ram_gb >= 7:
        return "qwen3:0.6b"  # fast, good quality for size

    # RPi 5 with 4GB or RPi 4 with 8GB
    if ram_gb >= 3.5:
        return "qwen3:0.6b"  # still fits, lower batch

    # RPi 4 with 2GB (tight)
    if ram_gb >= 1.8:
        return "qwen3:0.6b"  # 0.6B model is small enough

    # Very constrained — no local LLM
    return None

def pull_model(model: str):
    """Pull an Ollama model."""
    print(f"Pulling model {model}... (this may take several minutes)")
    subprocess.run(["ollama", "pull", model], check=True, timeout=600)

def setup_local_llm(config):
    """Set up local LLM on first boot."""
    model = config.ai.local_model or get_recommended_model()
    if model is None:
        print("Insufficient RAM for local LLM. Will use BabyAI only.")
        return

    # Check if model is already pulled
    result = subprocess.run(
        ["ollama", "list"],
        capture_output=True, text=True,
    )
    if model.split(":")[0] in result.stdout:
        print(f"Model {model} already available.")
        return

    pull_model(model)
    print(f"Model {model} ready.")
```

### Model Warm-Up

Keeping the model loaded eliminates the 10–30 second cold-start penalty:

```python
# src/ai/model_warmup.py

import httpx
import asyncio
import logging

logger = logging.getLogger(__name__)

async def keep_model_warm(ollama_url: str, model: str):
    """Send periodic keep-alive requests to prevent Ollama from unloading the model."""
    while True:
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                # Ollama unloads models after 5 minutes of inactivity
                # Send a minimal completion request every 4 minutes to keep it loaded
                await client.post(
                    f"{ollama_url}/api/chat",
                    json={
                        "model": model,
                        "messages": [{"role": "user", "content": "ping"}],
                        "stream": False,
                        "options": {"num_predict": 1},
                    },
                )
                logger.debug("Model keep-alive sent")
        except Exception:
            logger.debug("Model keep-alive failed (Ollama may be restarting)")

        await asyncio.sleep(240)  # 4 minutes
```

### Fallback Chain

```
Primary Model (Qwen 3 0.6B)
    │ fails?
    v
Smaller Fallback (tinyllama or none)
    │ fails?
    v
Canned Responses (hardcoded)
    │ complex query?
    v
BabyAI Phone-Home (cloud)
```

```python
# src/ai/fallback_chain.py

async def query_with_full_fallback(
    query: str,
    system_prompt: str,
    config: DeviceConfig,
) -> tuple[str, str]:
    """Try all AI tiers in order until one succeeds."""

    # 1. Try primary local model
    try:
        response = await query_ollama(config.ai.local_ollama_url, config.ai.local_model, query, system_prompt)
        return response, f"local:{config.ai.local_model}"
    except Exception as e:
        logger.warning("Primary model failed: %s", e)

    # 2. Try fallback local model (if configured and different)
    fallback_model = config.ai.get("fallback_model")
    if fallback_model and fallback_model != config.ai.local_model:
        try:
            response = await query_ollama(config.ai.local_ollama_url, fallback_model, query, system_prompt)
            return response, f"local:{fallback_model}"
        except Exception as e:
            logger.warning("Fallback model failed: %s", e)

    # 3. Try BabyAI phone-home
    if network_available():
        try:
            from services.babyai_client import phone_home
            response = await phone_home(
                config.network.babyai.api_key,
                system_prompt,
                query,
            )
            return response, "babyai"
        except Exception as e:
            logger.warning("BabyAI phone-home failed: %s", e)

    # 4. Last resort: canned response
    return get_canned_response(query), "canned"
```

### Model Update via OTA

When the OTA manifest includes a new model version:

```json
{
  "latest": {
    "version": "0.4.0",
    "platforms": {
      "rpi4": {
        "model_update": {
          "model": "qwen3:0.6b-q4_k_m",
          "action": "pull"
        }
      }
    }
  }
}
```

The OTA service triggers `ollama pull` for the new model tag after updating firmware and app.

---

## Inference Optimization

### Quantization

All local models use quantized GGUF format via Ollama:

| Quantization | Size (0.6B model) | Quality | Speed |
|---|---|---|---|
| Q4_K_M | ~400MB | Good (recommended) | Fast |
| Q4_K_S | ~350MB | Slightly lower | Faster |
| Q5_K_M | ~480MB | Better | Slower |
| Q8_0 | ~650MB | Near-original | Slowest |

Default: Q4_K_M — best tradeoff for RPi.

### Batching

For sensor-driven queries, batch multiple readings before inference:

```python
# src/ai/batch_inference.py

from collections import deque
from datetime import datetime, timedelta

class SensorBatcher:
    """Collect sensor readings and batch them for periodic AI analysis."""

    def __init__(self, batch_interval_s: int = 300):
        self.batch_interval_s = batch_interval_s
        self.readings: deque = deque(maxlen=1000)
        self.last_analysis: datetime = datetime.min

    def add_reading(self, reading: dict):
        self.readings.append({**reading, "timestamp": datetime.now()})

    def should_analyze(self) -> bool:
        elapsed = (datetime.now() - self.last_analysis).total_seconds()
        return elapsed >= self.batch_interval_s and len(self.readings) > 0

    def get_batch_summary(self) -> str:
        """Summarize recent readings for AI analysis."""
        if not self.readings:
            return "No recent readings."

        temps = [r["temperature_c"] for r in self.readings if "temperature_c" in r]
        hums = [r["humidity_pct"] for r in self.readings if "humidity_pct" in r]

        summary_parts = [
            f"Batch of {len(self.readings)} readings over the past "
            f"{self.batch_interval_s // 60} minutes.",
        ]
        if temps:
            summary_parts.append(
                f"Temperature: min={min(temps):.1f}C, max={max(temps):.1f}C, "
                f"avg={sum(temps)/len(temps):.1f}C."
            )
        if hums:
            summary_parts.append(
                f"Humidity: min={min(hums):.0f}%, max={max(hums):.0f}%, "
                f"avg={sum(hums)/len(hums):.0f}%."
            )

        self.last_analysis = datetime.now()
        return " ".join(summary_parts)
```

### Caching

Cache responses for frequently asked queries:

```python
# src/ai/response_cache.py

from datetime import datetime, timedelta
from hashlib import sha256

class ResponseCache:
    """TTL-based cache for AI responses."""

    def __init__(self, default_ttl_s: int = 300, max_entries: int = 100):
        self.default_ttl_s = default_ttl_s
        self.max_entries = max_entries
        self.cache: dict[str, tuple[str, datetime]] = {}

    def _key(self, query: str, context_hash: str) -> str:
        """Generate cache key from query and context."""
        return sha256(f"{query}:{context_hash}".encode()).hexdigest()[:16]

    def get(self, query: str, context_hash: str) -> str | None:
        """Get cached response, or None if expired/missing."""
        key = self._key(query, context_hash)
        entry = self.cache.get(key)
        if entry is None:
            return None

        response, expiry = entry
        if datetime.now() > expiry:
            del self.cache[key]
            return None

        return response

    def put(self, query: str, context_hash: str, response: str, ttl_s: int | None = None):
        """Cache a response."""
        # Evict oldest if at capacity
        if len(self.cache) >= self.max_entries:
            oldest_key = min(self.cache, key=lambda k: self.cache[k][1])
            del self.cache[oldest_key]

        key = self._key(query, context_hash)
        ttl = ttl_s or self.default_ttl_s
        self.cache[key] = (response, datetime.now() + timedelta(seconds=ttl))

    def invalidate_all(self):
        """Clear cache (call when sensor state changes significantly)."""
        self.cache.clear()
```

**Cache invalidation**: Clear the cache when sensor readings change significantly (temperature shifts by more than 2C, humidity by more than 10%, motion state changes). Stale environmental context produces incorrect responses.

### Async Inference

Never block the main event loop:

```python
# All AI calls are async and wrapped with timeouts

import asyncio

async def safe_inference(coro, timeout_s: int = 30) -> str | None:
    """Run an inference coroutine with timeout protection."""
    try:
        return await asyncio.wait_for(coro, timeout=timeout_s)
    except asyncio.TimeoutError:
        logger.warning("Inference timed out after %ds", timeout_s)
        return None
    except Exception:
        logger.exception("Inference failed")
        return None

# Usage:
response = await safe_inference(
    query_local_llm(query, context, config),
    timeout_s=30,
)
if response is None:
    response = await safe_inference(
        phone_home(api_key, context, query),
        timeout_s=60,  # longer timeout for network
    )
```

### Timeouts

| Operation | Timeout | Rationale |
|---|---|---|
| Local LLM inference | 30 seconds | RPi 4 can be slow on longer responses |
| BabyAI phone-home | 60 seconds | Network variability + model inference |
| Wake word detection | None (continuous) | Always running, no timeout |
| STT (Whisper) | 30 seconds | Should complete well within this |
| TTS (Piper) | 30 seconds | Should complete well within this |
| MQTT publish | 5 seconds | Fast, local network |
| Sensor read | 5 seconds | Hardware timeout |
| OTA download | 300 seconds | Large files over slow connections |

All timeouts are configurable in `device.json` under the relevant service section. Defaults are conservative — tighten them for faster hardware.
