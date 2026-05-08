# 00 — Philosophy: NovaSyn Embedded Dev Stack

> The Windows stack optimizes for developer velocity across identical Electron apps.
> The embedded stack optimizes for reliability across heterogeneous hardware.

This document defines the core principles governing all NovaSyn embedded development — ambient AI devices (RPi + mic + speaker), robotics (RPi brain + MCU body), sensor networks, and any future physical-world hardware. Every design decision, code review, and architecture choice must pass through these principles.

---

## 1. AI-to-AI Development

This stack is not optimized for human developers. It is optimized for AI agents that:

- **Parse entire hardware datasheets** and extract register maps, timing constraints, and electrical characteristics without fatigue or misreading.
- **Maintain perfect pin mappings** across dozens of peripherals, boards, and revisions simultaneously.
- **Generate thousands of lines of driver code** correctly — provided the patterns are consistent and the reference documents are machine-verifiable.
- **Cross-reference constraints** between documents (e.g., "the I2C bus specified in 01_TECH_STACK runs at 400kHz, which means the BME280 driver in 02_CODING_STANDARDS must respect the timing in the HAL layer").

**What this means in practice:**

- Documents are structured for parsing, not skimming. Tables over prose. Exact values over approximations. Enumerations over hand-waving.
- Every document is self-contained enough to be loaded into a context window independently, but cross-references other documents by number (e.g., "see 01_TECH_STACK § Communication").
- Consistency is not a nice-to-have — it is the mechanism by which correctness scales. If a naming convention has one exception, every AI agent must now track that exception forever. Zero exceptions.
- Code patterns are templated. A sensor driver for the BME280 looks structurally identical to a sensor driver for the VL53L0X. An AI can generate the second from the first by substituting register addresses and data formats.

**Contrast with the Windows stack:**

The NovaSyn Windows dev stack (14 documents, 00-12) governs Electron apps where the runtime is homogeneous (Node.js + Chromium), the deployment target is identical (Windows x64), and the failure mode is "the app crashes and the user restarts it." AI agents working in that stack optimize for development speed — scaffold a new feature, wire up the store, ship it.

The embedded stack operates in a fundamentally different reality:

| Dimension | Windows Stack | Embedded Stack |
|-----------|--------------|----------------|
| Runtime | Node.js (uniform) | Zig bare-metal, Python on Linux, RTOS (heterogeneous) |
| Memory | 16GB+ available | 512KB SRAM on MCU, 4-8GB on RPi |
| Failure cost | User restarts app | Motor runs away, battery overheats, sensor data lost |
| Deployment | User runs installer | OTA to device in a field, possibly offline |
| Connectivity | Always online | Intermittent at best |
| Determinism | Not required | Hard real-time for motor control |
| Target count | 1 (Windows x64) | 5+ (RPi5, RPi4, ESP32-S3, STM32F4, STM32H7) |

AI agents working in this stack must internalize that **correctness and safety outrank velocity**. A driver that compiles and runs correctly on the first deployment is worth more than a driver written quickly that requires three debugging cycles — especially when the debugging cycle requires physical access to hardware that may be mounted on a robot in a barn.

---

## 2. Safety-First

Embedded devices operate in the physical world. Code has physical consequences.

**A motor that does not stop is a hazard.** A heater that does not turn off is a fire. A battery that overcharges can explode. A robot arm that moves unexpectedly can injure. These are not theoretical concerns — they are the baseline failure modes of every actuator-bearing system.

**Mandatory safety rules:**

1. **Every actuator must have a software watchdog.** If the control loop does not refresh the watchdog within its period, the actuator enters a safe state (motor off, valve closed, heater off). This is implemented in the HAL, not the application layer.
2. **Every actuator must have defined safe states.** The safe state is documented per actuator type: motors → coast or brake, servos → hold last position or center, heaters → off, valves → closed. Safe states are defined at the HAL level and cannot be overridden by application code.
3. **Current limits are enforced in hardware where possible, in software always.** If a motor driver supports current limiting (e.g., TMC2209 StallGuard), use it. Regardless, software monitors current draw via ADC and shuts down if thresholds are exceeded.
4. **No unbounded loops in actuator control.** Every movement command has a maximum duration. "Move until sensor reads X" must also have "or until T milliseconds elapse."
5. **Emergency stop is always available.** A hardware E-stop (physical button or relay) that cuts power to all actuators. Software cannot override hardware E-stop. Software E-stop (kill command via MQTT or local) sets all actuators to safe state.
6. **Thermal monitoring is mandatory for power electronics.** If the board has a temperature sensor (most MCUs do), monitor it. If external power electronics are used (motor drivers, voltage regulators), add thermal sensing.

**Safety is not negotiable for velocity.** An AI agent asked to "make the motor faster" must verify that the requested speed does not exceed the mechanical or electrical limits documented in the hardware configuration before generating any code.

---

## 3. Resource-Constrained Thinking

There are two tiers of constraint in this stack, and AI agents must know which one they are operating in:

**Tier 1 — MCU (ESP32-S3, STM32F4/H7):**
- 512KB SRAM is the total working memory. Every byte of every buffer is budgeted.
- No heap allocation in the hot path. Stack allocation, static buffers, arena allocators with known upper bounds.
- No standard library luxuries — no HashMap with dynamic resizing, no ArrayList that grows, no string formatting that allocates.
- Binary size matters. Every function pulled in from a library adds to flash usage. Dead code elimination is not a suggestion — it is a requirement.
- CPU cycles are budgeted. A sensor polling loop that takes 2ms instead of 200us means something else does not run in time.

**Tier 2 — RPi (Raspberry Pi 4/5):**
- 4-8GB RAM is generous compared to MCU, but not infinite. Running Ollama with a 0.6B parameter model consumes 1-2GB. Running Whisper.cpp consumes another 500MB-1GB. PipeWire, MQTT broker, Python runtime, SQLite — it adds up.
- CPU is shared across inference, audio processing, sensor polling, network communication. No single service can monopolize the CPU.
- SD card I/O is slow. Minimize writes (SD cards wear out). Buffer logs and batch-write. Use tmpfs for transient data.
- Thermal throttling is real. The RPi 5 throttles at 85C. Sustained inference loads will hit this without active cooling.

**Practical rules:**

- Every buffer has a compile-time or configuration-time size. No unbounded growth.
- Every allocation has a corresponding deallocation on every code path (including error paths).
- Memory budgets are documented per subsystem: "sensor polling: 4KB stack, 2KB static buffers. Motor control: 8KB stack, 1KB static buffers. MQTT client: 16KB receive buffer, 4KB transmit buffer."
- On RPi, Python services declare their expected memory ceiling in configuration. If a service exceeds its ceiling, it is restarted by systemd.

---

## 4. Deterministic Behavior

Some operations must complete within a guaranteed time window. Missing a deadline is a bug, not a performance issue.

**Hard real-time (MCU):**
- Motor control loops: 1kHz minimum (1ms period). PID update, encoder read, PWM write — all within 1ms.
- Sensor polling: defined per sensor. IMU at 100Hz (10ms), temperature at 1Hz (1000ms), distance at 10Hz (100ms).
- Audio I2S: sample rate determines deadline. At 16kHz mono, a buffer of 256 samples must be ready every 16ms.
- Interrupt latency: sub-microsecond for hardware interrupts. ISR executes, sets a flag, returns. Processing happens in the main loop.

**Soft real-time (RPi):**
- Voice pipeline: end-to-end latency from speech end to response start under 2 seconds (local inference) or 5 seconds (cloud inference).
- MQTT publish: sensor data batched and sent within 1 second of collection.
- Telemetry upload: buffered and sent within 60 seconds of generation (or on next connectivity).

**Rules for determinism:**

- No dynamic memory allocation in hard real-time paths. Pre-allocate everything.
- No blocking I/O in hard real-time paths. Use DMA or interrupt-driven I/O.
- No locks that can cause priority inversion. Use lock-free queues (ring buffers) for inter-task communication.
- Profile and measure. Timing constraints are verified with logic analyzers or cycle counters during development, not assumed.

---

## 5. Graceful Degradation

A device that panics is worse than a device that limps. Embedded devices must operate in hostile conditions — power fluctuations, sensor failures, connectivity loss, corrupt data, unexpected temperature extremes.

**Degradation hierarchy (most graceful to least graceful):**

1. **Full operation** — all systems nominal.
2. **Degraded operation** — one or more non-critical subsystems offline, device continues primary mission. Example: temperature sensor fails → robot continues moving, reports missing temperature data.
3. **Safe mode** — critical subsystem offline, device stops primary mission but maintains communication and diagnostics. Example: motor driver fault → all motors safe-state, device reports fault, awaits commands.
4. **Emergency stop** — unrecoverable hardware fault, device cuts actuator power, enters minimum-power state, attempts to report. Example: overcurrent detected → E-stop, transmit alert.
5. **Watchdog reset** — software has hung, hardware watchdog reboots the device. Device boots into safe mode, reports watchdog event.

**Never:**
- Never `@panic` in production Zig code. Return errors. Log them. Enter degraded mode.
- Never `sys.exit()` in production Python code without logging the reason and attempting to set hardware to safe state.
- Never assume a sensor read will succeed. Every read returns a result or an error. Stale data is flagged as stale.
- Never assume network operations will complete. Every network call has a timeout. Every timeout has a fallback.

**Sensor failure handling:**
- Each sensor has a `last_valid_reading` timestamp. If the reading is older than `max_staleness` (configured per sensor), it is reported as stale.
- Stale sensor data is still available to consumers but flagged. The consumer decides whether stale data is usable for its purpose.
- If a sensor fails three consecutive reads, it enters a cooldown period before retry. This prevents a broken sensor from consuming bus bandwidth.

---

## 6. Offline-First

Connectivity is a luxury, not a requirement. Every NovaSyn device must be useful without any network connection.

**Design rules:**

- The device's primary function works without internet. A voice assistant can do local wake-word detection + local Whisper + local LLM inference. A sensor node can collect, store, and act on data locally.
- Cloud features (BabyAI phone-home, OTA updates, remote monitoring) are enhancements, not dependencies.
- Data generated while offline is buffered locally (SQLite on RPi, flash KV on MCU) and synchronized when connectivity returns. Synchronization is idempotent — sending the same data twice does not corrupt state.
- The device must know its own connectivity state and adjust behavior accordingly:
  - **Online**: stream telemetry, use cloud inference for complex queries, check for OTA updates.
  - **Degraded connectivity**: batch telemetry, fall back to local inference, defer OTA.
  - **Offline**: local-only operation, buffer all outbound data, use local inference exclusively.
- Connectivity state transitions are logged as events (not just checked passively).

---

## 7. Hardware Abstraction

Write driver logic once, deploy it across platforms where the hardware interface is equivalent.

**Abstraction layers:**

- **HAL (Hardware Abstraction Layer)**: board-specific implementations of GPIO, I2C, SPI, UART, PWM, ADC. One HAL per target platform. HAL exposes a vtable interface (following NullClaw patterns) that driver code programs against.
- **Drivers**: portable code that speaks to sensors and actuators through the HAL vtable. A BME280 driver does not know whether it is running on RPi (via Linux I2C) or ESP32 (via hardware I2C peripheral) — it calls `i2c.read_register()` and gets data.
- **Services**: application logic that uses drivers. A `sensor_fusion` service reads from multiple sensor drivers and does not know or care which HAL is underneath.

**Rules:**

- Driver code never imports platform-specific headers. It imports the HAL interface.
- If a sensor requires platform-specific initialization (e.g., ESP32 I2C pin configuration), that goes in the HAL, not the driver.
- When a driver cannot be made portable (e.g., ESP32-specific ADC calibration), it is placed in a platform-specific directory and clearly documented as non-portable.
- Cross-compilation is the default. `zig build -Dtarget=aarch64-linux` produces RPi binaries. `zig build -Dtarget=xtensa-esp32s3-none` produces ESP32 binaries. Same source tree, different HAL selection at build time.

---

## 8. Observability Without Overhead

You cannot debug what you cannot observe. But telemetry that interferes with real-time behavior is worse than no telemetry.

**Telemetry tiers:**

| Tier | When | Overhead | Examples |
|------|------|----------|----------|
| Always-on | Production | < 1% CPU, < 1KB/s | Heartbeat, error counts, uptime, watchdog events |
| Standard | Production (default) | < 5% CPU, < 10KB/s | Sensor readings, actuator states, inference latency |
| Debug | Development only | Unbounded | Raw I2C bus traffic, audio buffers, model internals |
| Trace | Development + logic analyzer | Minimal (GPIO toggles) | ISR entry/exit, loop timing, DMA completion |

**Rules:**

- Telemetry is buffered and batched, never blocking. A ring buffer per telemetry stream. If the buffer fills because the network is slow, oldest entries are dropped (not application code blocked).
- Telemetry format is structured (JSON on RPi, CBOR or packed binary on MCU). Every telemetry message includes: device ID, timestamp (monotonic clock), sequence number, payload.
- Telemetry is opt-in per tier. Production devices default to "Standard." Changing the tier does not require a firmware update — it is configurable via MQTT command or local config.
- On MCU, timing-critical telemetry uses GPIO pin toggles read by a logic analyzer, not serial output. Serial output introduces latency.

---

## 9. The BabyAI Flywheel

Every NovaSyn device is a node in the BabyAI co-op intelligence network. Every interaction generates learning data.

**How it works:**

1. **Device generates data.** Sensor readings, user voice commands, inference requests and responses, actuator outcomes, error events.
2. **Data is buffered locally.** SQLite on RPi, flash KV on MCU. Nothing is lost if connectivity is unavailable.
3. **When connected, data phones home to BabyAI.** Via the standard BabyAI API (`POST /v1/chat/completions` with metadata, `POST /v1/feedback/select` for user preference signals, `POST /v1/telemetry` for device health).
4. **BabyAI learns from the aggregate.** Calibration scores adjust. Skill documents evolve. Model routing improves.
5. **Improved intelligence flows back to devices.** Updated skill docs, better model selection, new inference capabilities — all delivered via the same API.
6. **The flywheel accelerates.** More devices → more data → better intelligence → more useful devices → more devices.

**Key principles:**

- **Data sovereignty**: data belongs to the co-op, not to NovaSyn, not to any corporation. The co-op model (see BabyAI VISION.md) means no data is sold, no corporate access, no free-rider exploitation.
- **Privacy by design**: raw audio is never transmitted to BabyAI. Transcribed text may be. Sensor data is aggregated before transmission where possible. Users control what phones home via per-device privacy configuration.
- **Useful datasets are unreplicable moats**: sensor + folk wisdom correlations (farming), children's unfiltered questions (education), ambient interaction patterns (household AI) — these datasets do not exist anywhere else and cannot be replicated by a company with a data center.
- **Phone-home is not surveillance**: the device phones home to contribute and to learn. If a user disables phone-home, the device still works (offline-first). The device is never degraded as punishment for not contributing data.

---

## 10. Principle Hierarchy

When principles conflict, resolve in this order:

1. **Safety** — physical world consequences override all other concerns.
2. **Graceful degradation** — a limping device is better than a crashed device.
3. **Determinism** — real-time guarantees protect safety and degradation.
4. **Offline-first** — the device must work without the network.
5. **Resource constraints** — memory and CPU budgets enable determinism.
6. **Observability** — you can only fix what you can see, but not at the cost of real-time.
7. **Hardware abstraction** — portability enables scale but never at the cost of correctness.
8. **BabyAI flywheel** — data generation is valuable but never at the cost of device function.
9. **AI-to-AI development** — consistency enables correctness but is a means, not an end.

This hierarchy is not a ranking of importance — all principles matter. It is a tiebreaker for design decisions where two principles suggest different solutions. Safety always wins.
