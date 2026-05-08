# 09 — AI Collaboration: Sprint-Based Development & Handoff Protocols

> The Windows stack hands off feature state between AI sessions via sprint plans and store schemas.
> The embedded stack hands off hardware state — because an AI cannot look at the wiring.

This document defines how AI agents collaborate on NovaSyn embedded device projects across sessions. Every sprint, every handoff, every safety review follows these protocols. No exceptions for actuator-bearing devices.

---

## 1. Sprint Structure

Sprints for embedded development follow the same philosophy as the NovaSyn Windows dev stack (scoped, incremental, documented) but are adapted for hardware realities.

### 1.1 Sprint Scope

- **1-3 features per sprint**, scoped to a single device type (e.g., "Nova ambient assistant" or "Hex sensor node").
- A feature in the embedded context is one of: a new driver, a new service, a communication pathway, a deployment target, or a hardware integration.
- Cross-device features (e.g., "add LoRa mesh support to both Hex Node and Comm Node") are split into separate sprints per device.

### 1.2 Sprint Phases

Every sprint proceeds through four phases:

| Phase | What Happens | Who Does It |
|-------|-------------|-------------|
| **Hardware Spec Review** | Verify physical components, wiring, power budget, pin assignments. Read datasheets if new peripherals are introduced. Update HARDWARE_SPEC.md and PIN_MAP.md. | AI (reads docs, generates specs) |
| **Implementation** | Write driver code, service logic, configuration, tests. Follow patterns from 02_CODING_STANDARDS and 03_ARCHITECTURE_PATTERNS. | AI (writes code) |
| **Testing** | Run unit tests (host simulation), verify cross-compilation, run HIL tests if hardware is available. Complete the 8-Point Verification Checklist (see section 5). | AI (runs tests) + User (physical verification) |
| **Deployment** | Deploy to physical device. Verify operation. Update all handoff documents. | User (deploys) + AI (updates docs) |

### 1.3 Hardware-In-The-Loop Gaps

Some sprints require physical prototyping between AI sessions. This is normal and expected.

**Pattern:**

1. AI Session 1: Write driver code and tests for a new sensor. Specify exact wiring in HARDWARE_SPEC.md and PIN_MAP.md.
2. User: Wire up the sensor on the physical device. Run the binary. Report results.
3. AI Session 2: Read the user's report. Debug any issues. Refine the driver. Update handoff documents.

**Rules:**

- The AI must always produce a wiring specification precise enough for the user to follow without ambiguity. Pin numbers, voltage levels, pull-up/pull-down requirements, bus addresses.
- The user reports physical results in plain language. The AI must not assume success — always ask for confirmation or error output.
- If the user reports an unexpected behavior, the AI diagnoses from the error output and the documented wiring, not from assumptions about "what usually works."

---

## 2. Handoff Documents

Every device project maintains a set of handoff documents. These are the mechanism by which one AI session transfers complete understanding to the next. An AI that does not read the handoff documents before working is operating blind.

### 2.1 Required Handoff Documents

| Document | Purpose | Updated When |
|----------|---------|-------------|
| `SPRINT_PLAN.md` | What is built, what is next, current sprint scope, blockers | Every sprint start and end |
| `HARDWARE_SPEC.md` | Physical components, wiring diagrams (text-based ASCII art or tables), power budget, connector pinouts | When hardware changes |
| `PIN_MAP.md` | Complete pin assignment table for every board in the device | When any pin assignment changes |
| `MQTT_TOPICS.md` | All MQTT topics this device publishes and subscribes to, with payload schemas | When communication changes |
| `API_REFERENCE.md` | Brain-body UART command protocol, local HTTP/REST APIs, BabyAI integration endpoints | When any API changes |
| `DEVICE_CONFIG.md` | Current `device.json` schema with field descriptions, defaults, and valid ranges | When config schema changes |

### 2.2 SPRINT_PLAN.md Format

```markdown
# Sprint Plan — {Device Name}

## Current Sprint: {N} — {Title}

**Scope:**
- [ ] Feature 1: brief description
- [ ] Feature 2: brief description
- [x] Feature 3: completed (date)

**Blockers:**
- Awaiting physical wiring of BME280 sensor (user action)

**Hardware Changes This Sprint:**
- Added BME280 to I2C bus 1 at address 0x76

## Completed Sprints

### Sprint 1 — {Title} (completed YYYY-MM-DD)
- Feature A: what was built
- Feature B: what was built
- Tested: zig build test (0 failures), pytest (12 passed), HIL (sensor reads verified)

### Sprint 0 — Scaffold (completed YYYY-MM-DD)
- Project scaffolded from 11_PROJECT_TEMPLATE
- Basic directory structure, build.zig, device.json
```

### 2.3 PIN_MAP.md Format

```markdown
# Pin Map — {Device Name}

## Board: Raspberry Pi 5

| GPIO | Function | Direction | Peripheral | Notes |
|------|----------|-----------|------------|-------|
| GPIO2 (SDA1) | I2C1 Data | Bidirectional | BME280, BH1750 | 4.7k pull-up to 3.3V |
| GPIO3 (SCL1) | I2C1 Clock | Output | BME280, BH1750 | 4.7k pull-up to 3.3V |
| GPIO17 | E-Stop Input | Input (pull-up) | Physical button | Active LOW |
| GPIO18 | Status LED | Output | Green LED | 330R series resistor |

## Board: ESP32-S3

| GPIO | Function | Direction | Peripheral | Notes |
|------|----------|-----------|------------|-------|
| GPIO1 | I2C SDA | Bidirectional | BME280 | Internal pull-up enabled |
| GPIO2 | I2C SCL | Output | BME280 | Internal pull-up enabled |
| GPIO5 | LoRa CS | Output | SX1262 | Active LOW |
| GPIO6 | LoRa IRQ | Input | SX1262 | Rising edge interrupt |

**Unassigned GPIOs:** GPIO7, GPIO8, GPIO15, GPIO16 (reserved for expansion)
**Do not use:** GPIO0 (boot mode), GPIO3 (UART0 RX, used for debug)
```

### 2.4 MQTT_TOPICS.md Format

```markdown
# MQTT Topics — {Device Name}

## Published by This Device

| Topic | QoS | Retain | Frequency | Payload Schema |
|-------|-----|--------|-----------|----------------|
| `novasyn/{device_id}/sensor/bme280` | 1 | No | Every 15 min | `{"temp_c": float, "humidity_pct": float, "pressure_hpa": float, "ts": int}` |
| `novasyn/{device_id}/status` | 1 | Yes | Every 60s + on change | `{"state": "online"|"degraded"|"safe_mode", "uptime_s": int, "ts": int}` |

## Subscribed by This Device

| Topic | QoS | Handler | Expected Payload |
|-------|-----|---------|-----------------|
| `novasyn/{device_id}/cmd/config` | 1 | ConfigUpdateHandler | `{"key": string, "value": any}` |
| `novasyn/{device_id}/cmd/reboot` | 1 | RebootHandler | `{}` (empty payload) |

## Last Will and Testament

| Topic | QoS | Retain | Payload |
|-------|-----|--------|---------|
| `novasyn/{device_id}/status` | 1 | Yes | `{"state": "offline", "ts": 0}` |
```

---

## 3. Documentation as Handoff

### 3.1 The Core Rule

**When an AI completes a sprint, it updates ALL handoff documents that were affected by the sprint.** This is not optional. It is the mechanism by which the next AI session can function.

### 3.2 Why This Matters for Embedded

In the Windows dev stack, if an AI forgets to document a Zustand store change, the next AI can read the source code and reconstruct the state. The code is the truth.

In the embedded stack, the code is only part of the truth. The other part is:

- What is physically wired to what
- What voltages are present on which pins
- Which I2C addresses are occupied
- How much current the power supply can deliver
- Which GPIO is connected to the E-stop button

**An AI cannot observe physical wiring.** If PIN_MAP.md says GPIO17 is the E-stop input, that is the only way the next AI session knows. If the user rewired the E-stop to GPIO22 and nobody updated PIN_MAP.md, the next AI will generate code that does not work — or worse, code that bypasses the E-stop.

### 3.3 Validation Complements Documentation

Documentation tells the AI what should be true. Validation tells it what is actually true.

- **Type checking** (`zig build`, `mypy`) validates code correctness.
- **Unit tests** (`zig build test`, `pytest`) validate behavioral correctness.
- **Cross-compilation** validates platform compatibility.
- **HIL testing** validates hardware correctness — but only when a human runs it on physical hardware.

The handoff protocol requires documentation AND validation. Neither alone is sufficient.

---

## 4. Safety Review Checklist

**REQUIRED for any sprint involving actuators** (motors, servos, heaters, valves, relays, solenoids — anything that converts electrical signals into physical motion, heat, or force).

Before a sprint involving actuators is marked complete, every item must be checked:

```markdown
## Safety Review — Sprint {N}

- [ ] Maximum actuator values bounded in config AND in driver code
      Config limit: {value}. Driver hard limit: {value}. Units: {units}.
- [ ] Watchdog timer configured and tested
      Period: {ms}. Tested by: {method — e.g., "delayed main loop, verified motor stop"}.
- [ ] Safe mode behavior defined and tested
      What happens when brain crashes: {description}.
      What happens when body loses UART link: {description}.
- [ ] Thermal limits set for motors/heaters
      Motor max temp: {C}. Thermal sensor: {yes/no, which pin}.
- [ ] E-stop path tested (physical button to motor power cut)
      Button GPIO: {pin}. Relay/driver shutdown GPIO: {pin}. Tested: {yes/no}.
- [ ] Power budget verified (sum of all peripherals < supply capacity)
      Total draw at peak: {mA}. Supply capacity: {mA}. Margin: {mA}.
- [ ] No floating inputs (all unused GPIO pulled up/down)
      Method: {internal pull-up/external resistor}. Verified in PIN_MAP.md: {yes/no}.
- [ ] Rate limiting on actuator command frequency
      Max command rate: {Hz}. Enforced in: {driver/service layer}.
```

**If any item cannot be verified** (e.g., no physical hardware available), the sprint is marked as "Safety review pending HIL" and the next sprint must address it before adding new actuator features.

---

## 5. Cross-Platform Build Verification

These commands must pass before any sprint is marked complete:

```bash
# Zig unit tests — 0 failures, 0 leaks
zig build test --summary all

# RPi cross-compile (ARM Linux)
zig build -Dtarget=arm-linux-gnueabihf -Doptimize=ReleaseSmall

# MCU cross-compile (if device has an MCU body)
zig build -Dtarget=thumb-none-eabi

# Python tests
uv run pytest

# Python type checking
uv run mypy src/
```

**All five commands must succeed.** If the device does not have a Python application layer, the Python commands are skipped. If the device does not have an MCU body, the MCU cross-compile is skipped. Document which commands were run and which were skipped in the sprint completion notes.

---

## 6. Commit Message Format

Every commit in a device project follows this format:

```
[device-type] brief description

- Detail 1
- Detail 2

Tested: zig build test (0 failures), pytest (X passed), HIL (if applicable)
Safety: N/A or describe actuator safety verification
```

**Device type tags:**

| Tag | Device |
|-----|--------|
| `[nova]` | Ambient AI Assistant |
| `[hex]` | Hex Sensor Node |
| `[robot]` | Robot Controller |
| `[nullclaw-node]` | NullClaw Comm Node |
| `[voice-sat]` | Voice Satellite |
| `[infra]` | Shared infrastructure (affects multiple devices) |
| `[docs]` | Documentation only |

**Examples:**

```
[hex] add BME280 temperature/humidity driver

- Implemented I2C driver with HAL vtable interface
- Added simulation mock for host testing
- Config: sensor poll interval in device.json

Tested: zig build test (47 passed, 0 failures), HIL pending
Safety: N/A (sensor only, no actuators)
```

```
[robot] implement PID motor control loop

- 1kHz control loop on STM32H7
- Configurable PID gains in device.json
- Watchdog stops motors if loop stalls >5ms
- E-stop GPIO interrupt cuts motor driver enable

Tested: zig build test (83 passed, 0 failures), HIL (motors verified on bench)
Safety: Watchdog tested (delayed loop, motors stopped). E-stop tested (button press, motors cut).
        Max speed bounded at 80% PWM in config AND driver. Power budget OK (2.1A peak < 3A supply).
```

---

## 7. The 8-Point Embedded Verification Checklist

Every sprint completion requires passing this checklist. Copy it into the sprint completion notes and check each item:

```markdown
## Verification Checklist — Sprint {N}

1. [ ] Zig tests pass with 0 leaks
       `zig build test --summary all` — {N} passed, 0 failed
2. [ ] Python tests pass, mypy clean
       `uv run pytest` — {N} passed. `uv run mypy src/` — 0 errors
3. [ ] Cross-compilation succeeds for all target platforms
       RPi: {pass/skip}. MCU: {pass/skip}.
4. [ ] Simulation mode works on dev host
       `zig build run -- --simulate` — {verified/not applicable}
5. [ ] device.json schema validates
       All new config fields documented in DEVICE_CONFIG.md: {yes}
6. [ ] MQTT topics documented
       All new topics added to MQTT_TOPICS.md: {yes/not applicable}
7. [ ] Power budget within limits
       Peak draw: {mA}. Supply: {mA}. Margin: {mA or N/A}.
8. [ ] Safety review complete (if actuators involved)
       {Completed — see safety review above / N/A — no actuators in this sprint}
```

**A sprint with any unchecked item is not complete.** If an item genuinely does not apply (e.g., no Python layer, no actuators), mark it N/A with a reason. Do not leave items unchecked and uncommented.

---

## 8. Session Start Protocol

When an AI agent begins a new session on a device project, it must:

1. **Read SPRINT_PLAN.md** — understand what is built, what is in progress, what is blocked.
2. **Read HARDWARE_SPEC.md and PIN_MAP.md** — understand the physical device.
3. **Read DEVICE_CONFIG.md** — understand the current configuration schema.
4. **Ask the user for any updates** — "Has any wiring changed since the last session? Any new hardware?"
5. **Verify the build** — run `zig build test --summary all` and `uv run pytest` to confirm the codebase is in a known-good state.

Only then should the AI begin implementing new features. This protocol takes 2-3 minutes. Skipping it costs hours.

---

## 9. Session End Protocol

When an AI agent completes work on a device project, it must:

1. **Run the 8-Point Verification Checklist** (section 7).
2. **Update all affected handoff documents** (section 2).
3. **Update SPRINT_PLAN.md** — mark completed items, add any new blockers, update "next sprint" scope if needed.
4. **Summarize the session** — what was built, what was tested, what is pending, what the user needs to do physically (if anything).

The session summary becomes the first thing the next AI reads (after the handoff documents). Make it precise and actionable.
