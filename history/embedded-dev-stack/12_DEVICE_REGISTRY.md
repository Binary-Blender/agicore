# 12 — Device Registry: NovaSyn Embedded Devices

> One table per device. Every field has a value. No hand-waving.

This document is the single source of truth for all NovaSyn embedded devices — planned, in development, and active. Every device that will be built, is being built, or has been built is registered here.

**Rules:**
- A device must be registered here before its repository is created.
- Status transitions: Planned → In Development → Active → Retired.
- When a device moves to "In Development," its repository must exist and contain at minimum: build.zig, SPRINT_PLAN.md, and HARDWARE_SPEC.md.
- When a device moves to "Active," it must have passed the 8-Point Verification Checklist (see 09_AI_COLLABORATION.md section 7) and be deployed on at least one physical unit.

---

## Device 1: Ambient AI Assistant ("Nova")

> The WALL-E concept. A stationary voice-first AI companion that lives in your home, listens, thinks, and speaks.

| Field | Value |
|-------|-------|
| **Device Name** | Nova |
| **Type ID** | `NV` |
| **Repository** | `novasyn_nova` in novasyn_suite |
| **Brain** | Raspberry Pi 5 (4GB or 8GB) |
| **Body** | Optional ESP32-S3 (extra GPIO for LED strips, additional sensors) |
| **Primary Purpose** | Always-on voice assistant with local + cloud AI, personality via NullClaw |
| **Key Peripherals** | ReSpeaker 4-Mic Array HAT (or XIAO-ESP32S3 Sense mic), 3W amplifier (MAX98357A) + 40mm speaker, 1.3" OLED display (SH1106, optional), status LED ring (WS2812B, optional), PIR motion sensor (optional) |
| **Communication** | WiFi (onboard RPi), BLE (onboard RPi, for phone pairing), MQTT (local broker on RPi) |
| **Power Source** | Mains (5V/4A USB-C power supply) |
| **BabyAI Integration** | Full: phone-home for complex queries, telemetry push (interaction logs, query types, latency metrics), feedback submission (user preference signals via voice confirmation) |
| **Voice Pipeline** | Wake word (OpenWakeWord on RPi) → STT (Whisper.cpp, tiny/base model) → LLM (Ollama, Qwen3-0.6B or Gemma-2B local; BabyAI cloud for complex) → TTS (Piper, en_US voice) |
| **NullClaw Role** | Personality engine — NullClaw runs as agent on RPi, provides the assistant's character, memory, and conversational style |
| **Estimated BOM** | RPi 5 ($60-80) + mic array ($15-35) + amp+speaker ($5) + case ($10-20) + PSU ($10) = **$100-150** |
| **Status** | **Planned** (Sprint 1 target) |

### Nova — Sprint Roadmap

| Sprint | Scope |
|--------|-------|
| 1 | Scaffold project. RPi setup (OS, Ollama, PipeWire). Basic mic input → STT → console output. |
| 2 | TTS output. Full voice loop: wake word → STT → LLM → TTS → speaker. |
| 3 | MQTT integration. Status publishing. Remote command subscription. |
| 4 | BabyAI phone-home. Cloud fallback for complex queries. Telemetry push. |
| 5 | NullClaw personality integration. Conversational memory. |
| 6 | Optional: OLED display, LED ring, motion-aware wake. |

---

## Device 2: Hex Sensor Node

> Low-cost, solar-powered environmental sensor for agricultural monitoring. Deploys in fields by the dozen.

| Field | Value |
|-------|-------|
| **Device Name** | Hex |
| **Type ID** | `HX` |
| **Repository** | `novasyn_hex` in novasyn_suite |
| **Brain** | None (MCU-only device) |
| **Body** | ESP32-S3-WROOM-1 (8MB flash, 2MB PSRAM) |
| **Primary Purpose** | Collect environmental data (soil, air, light), transmit to gateway via LoRa, sleep between readings |
| **Key Peripherals** | Capacitive soil moisture sensor (v1.2 analog), BME280 (temperature, humidity, pressure via I2C at 0x76), BH1750 (ambient light via I2C at 0x23), SX1262 LoRa transceiver (SPI, 915MHz US / 868MHz EU) |
| **Communication** | LoRa (SX1262, long-range mesh to gateway node), WiFi (ESP32 onboard, for initial provisioning and firmware update only) |
| **Power Source** | Solar panel (5V/1W) + TP4056 charge controller + 18650 LiPo (3.7V, 2600mAh). Target: indefinite operation with 15-minute wake cycles. |
| **BabyAI Integration** | Indirect: Hex nodes transmit to a gateway (RPi with LoRa HAT). The gateway aggregates sensor data and phones home to BabyAI. Individual Hex nodes never contact the internet directly. |
| **Deep Sleep Cycle** | Wake every 15 minutes → read sensors (~200ms) → transmit LoRa packet (~500ms) → deep sleep. Target average current: <50uA (sleep) + brief wake bursts. |
| **Estimated BOM** | ESP32-S3 module ($4) + BME280 ($2) + BH1750 ($1) + soil sensor ($2) + SX1262 module ($5) + solar panel ($3) + TP4056 ($0.50) + 18650 cell ($3) + PCB+enclosure ($5) = **$25-30** |
| **Status** | **Planned** |

### Hex — Sprint Roadmap

| Sprint | Scope |
|--------|-------|
| 1 | Scaffold project. ESP32-S3 bringup. BME280 I2C driver. Read temp/humidity to console. |
| 2 | BH1750 light sensor driver. Soil moisture ADC driver. Sensor fusion service. |
| 3 | SX1262 LoRa driver (SPI). Transmit sensor packet. Receive ACK. |
| 4 | Deep sleep implementation. Wake → read → transmit → sleep cycle. Power measurement. |
| 5 | Solar charge monitoring (ADC on battery voltage). Low-battery behavior. |
| 6 | Gateway integration: RPi with LoRa receives Hex packets, stores in SQLite, pushes to BabyAI. |

---

## Device 3: Robot Controller

> Household robotics platform. RPi brain thinks and sees; STM32 body moves and feels.

| Field | Value |
|-------|-------|
| **Device Name** | Robot |
| **Type ID** | `RB` |
| **Repository** | `novasyn_robot` in novasyn_suite |
| **Brain** | Raspberry Pi 5 (8GB) |
| **Body** | STM32H743ZIT6 (Nucleo-H743ZI2 dev board for prototyping) |
| **Primary Purpose** | Mobile household robot with voice, vision, and navigation |
| **Key Peripherals** | **Motors:** 2x DC gear motors (12V, 1.5A stall) with L298N dual H-bridge driver. **Servos:** 2x SG90 micro servos (pan-tilt head mount). **Distance:** 3x VL53L0X ToF sensors (I2C, front arc: left/center/right). **IMU:** MPU6050 6-axis (I2C at 0x68). **Bumpers:** 2x microswitch (front left/right, GPIO interrupt). **Camera:** RPi Camera Module 3 (CSI, on brain). **Encoders:** 2x magnetic rotary encoder (GPIO interrupt on body). **E-Stop:** Physical pushbutton → relay cuts motor driver power rail. |
| **Communication** | Brain-Body: USB-UART (115200 baud, structured command protocol). WiFi (RPi onboard). BLE (RPi, for phone pairing). MQTT (local broker on RPi). |
| **Power Source** | 11.1V 3S LiPo (2200mAh). 5V/3A buck converter for RPi. 3.3V LDO for STM32. Motor power direct from battery through E-stop relay. Estimated runtime: ~2 hours active, ~8 hours idle. |
| **BabyAI Integration** | Full: phone-home for navigation planning, object identification, complex voice queries. Telemetry: motor runtime, battery level, obstacle encounters, voice interactions. |
| **Control Loop** | STM32 runs 1kHz PID motor control + 100Hz IMU read + 10Hz distance scan. RPi sends high-level commands ("move forward 50cm", "turn left 90 degrees"). STM32 executes trajectory and reports completion/failure. |
| **Safety Systems** | Hardware E-stop button (cuts motor power rail via relay). Software watchdog on STM32 (500ms, motors coast on timeout). Brain-body link watchdog (if no command in 2s, motors stop). Max speed bounded in config AND firmware. Current monitoring via L298N sense resistors + ADC. |
| **Estimated BOM** | RPi 5 ($80) + STM32 Nucleo ($25) + motors+encoders ($15) + L298N ($5) + servos ($4) + VL53L0X x3 ($15) + MPU6050 ($3) + camera ($25) + battery ($20) + chassis ($15) + E-stop+relay ($5) + wiring ($10) = **$220-250** |
| **Status** | **Planned** |

### Robot — Sprint Roadmap

| Sprint | Scope |
|--------|-------|
| 1 | Scaffold project. STM32 bringup. GPIO test (LED blink). UART echo test with RPi. |
| 2 | Motor driver (L298N). PWM control. E-stop interrupt. Watchdog timer. Basic forward/backward/turn. |
| 3 | Encoder reading. PID speed control. Odometry estimation. |
| 4 | VL53L0X distance sensors (I2C, 3 units via XSHUT multiplexing). Obstacle detection. |
| 5 | MPU6050 IMU. Heading estimation. Bump switch interrupts. Sensor fusion with odometry. |
| 6 | Brain-body command protocol. RPi sends movement commands, STM32 executes and reports. |
| 7 | RPi camera. Basic object detection (TFLite). Voice pipeline (same as Nova). |
| 8 | BabyAI integration. Navigation planning queries. Telemetry push. |
| 9 | Pan-tilt servo head. Camera tracking. Look-at-speaker behavior. |
| 10 | Full integration. Autonomous behavior loop: listen → think → move → speak. |

---

## Device 4: NullClaw Comm Node

> Mesh networking relay. Bridges LoRa sensor networks to the internet. Solar-powered outdoor deployment.

| Field | Value |
|-------|-------|
| **Device Name** | NullClaw Node |
| **Type ID** | `NC` |
| **Repository** | `novasyn_nullclaw_node` in novasyn_suite |
| **Brain** | None (MCU-only device) |
| **Body** | ESP32-S3-WROOM-1 (8MB flash, 2MB PSRAM) |
| **Primary Purpose** | Relay messages between Hex Sensor Nodes (LoRa) and BabyAI cloud (WiFi). Mesh networking backbone. |
| **Key Peripherals** | SX1262 LoRa transceiver (SPI, 915MHz US), BME280 (optional, for local weather data, I2C at 0x76), status LED (GPIO) |
| **Communication** | LoRa (SX1262, receive from Hex nodes + relay to other Comm Nodes), WiFi (ESP32 onboard, for internet uplink to BabyAI) |
| **Power Source** | Solar panel (5V/2W) + TP4056 + 18650 LiPo (3.7V, 3400mAh). Higher capacity than Hex node because WiFi transmit is power-hungry. Target: indefinite outdoor operation. |
| **BabyAI Integration** | Gateway: aggregates LoRa packets from multiple Hex nodes, batches them, and pushes to BabyAI via `POST /v1/telemetry`. Also forwards BabyAI commands back to Hex nodes via LoRa. |
| **Mesh Protocol** | Simple store-and-forward: each packet has a TTL (default 3 hops). Comm Nodes rebroadcast packets they have not seen before (dedup by source ID + sequence number). Gateway node (with WiFi) consumes packets for cloud upload. |
| **Estimated BOM** | ESP32-S3 ($4) + SX1262 ($5) + BME280 ($2, optional) + solar panel ($5) + TP4056 ($0.50) + 18650 ($4) + weatherproof enclosure ($8) = **$28-35** |
| **Status** | **Planned** |

### NullClaw Node — Sprint Roadmap

| Sprint | Scope |
|--------|-------|
| 1 | Scaffold project. ESP32-S3 bringup. SX1262 LoRa driver (shared with Hex). Transmit/receive test. |
| 2 | Store-and-forward mesh: receive packet, check TTL, rebroadcast. Dedup by source+seq. |
| 3 | WiFi uplink. HTTP client to BabyAI. Batch and push aggregated sensor data. |
| 4 | Power management. Solar charge monitoring. Sleep between relay windows (if no traffic). |
| 5 | Optional BME280 for local weather. OTA firmware update via WiFi. |

---

## Device 5: Voice Satellite

> Thin client mic/speaker node. Extends Nova's voice reach to every room. No local AI processing.

| Field | Value |
|-------|-------|
| **Device Name** | Voice Satellite |
| **Type ID** | `VS` |
| **Repository** | `novasyn_voice_sat` in novasyn_suite |
| **Brain** | None (MCU-only device) |
| **Body** | ESP32-S3-WROOM-1 (8MB flash, 2MB PSRAM — PSRAM needed for audio buffers and TFLite wake word) |
| **Primary Purpose** | Distributed microphone/speaker endpoint. Detects wake word locally, streams audio to Nova brain for processing. Plays back TTS audio from Nova. |
| **Key Peripherals** | INMP441 I2S MEMS microphone (I2S input), MAX98357A I2S amplifier + 40mm speaker (I2S output), status LED (WS2812B single NeoPixel — blue=listening, green=processing, white=speaking), button (mute toggle, GPIO) |
| **Communication** | WiFi (ESP32 onboard). Audio streaming: raw PCM over TCP socket to Nova brain. Control: MQTT for state coordination (mute, volume, wake events). |
| **Power Source** | Mains (USB-C 5V/1A). Always-on device — no power management needed beyond WiFi power save. |
| **BabyAI Integration** | None directly. Voice Satellites are peripheral to the Nova brain. Nova handles all BabyAI communication. |
| **Audio Pipeline** | Continuous mic capture (16kHz, 16-bit mono) → ring buffer → TFLite wake word model (runs on ESP32-S3, ~50ms inference) → on detection: stream audio to Nova via TCP → receive TTS audio from Nova → play through speaker |
| **Pairing** | Voice Satellites discover Nova brain via mDNS (`_novasyn-nova._tcp.local`). First connection requires button press on satellite for security. Paired brain IP stored in NVS flash. |
| **Estimated BOM** | ESP32-S3 ($4) + INMP441 ($2) + MAX98357A ($3) + speaker ($2) + NeoPixel ($0.50) + button ($0.25) + PCB ($2) + enclosure ($3) + USB-C cable ($2) = **$18-22** |
| **Status** | **Planned** |

### Voice Satellite — Sprint Roadmap

| Sprint | Scope |
|--------|-------|
| 1 | Scaffold project. ESP32-S3 bringup. I2S microphone capture to serial (verify audio). |
| 2 | I2S speaker output. Play test tone. Verify full-duplex I2S (simultaneous mic + speaker). |
| 3 | TFLite wake word detection. "Hey Nova" model (train or use OpenWakeWord export). |
| 4 | TCP audio streaming to Nova brain. Receive TTS playback stream. |
| 5 | MQTT integration. Mute button. Status LED. Volume control via MQTT command. |
| 6 | mDNS discovery. Auto-pairing with Nova brain. NVS storage for paired brain. |

---

## Port Assignments

Standard port assignments for NovaSyn devices running local services:

| Port | Protocol | Service | Used By |
|------|----------|---------|---------|
| 1883 | TCP | MQTT broker (Mosquitto, unencrypted) | Nova, Robot (gateway RPi) |
| 8883 | TCP | MQTT broker (TLS) | Nova, Robot (production) |
| 8080 | HTTP | Device local web UI (status, config, diagnostics) | Any RPi device |
| 11434 | HTTP | Ollama API (local LLM inference) | Nova, Robot |
| 5353 | UDP | mDNS (device discovery) | All devices |
| 9090 | TCP | Audio streaming (PCM over TCP) | Voice Satellite → Nova |

**Rules:**
- Ports are not configurable by default — consistency across all devices simplifies debugging and documentation.
- If a port conflict arises on a specific deployment, override in `device.json` with a comment explaining why.
- No device exposes any port to the public internet. All services are LAN-only. BabyAI communication is outbound HTTPS only.

---

## Device ID Format

All device IDs follow the pattern: `{type_id}-{serial}`.

| Component | Format | Example |
|-----------|--------|---------|
| Type ID | 2 uppercase letters (from registry above) | `NV` |
| Serial | 3-digit zero-padded number | `001` |
| Full ID | `{type}-{serial}` | `NV-001` |

Examples:
- `NV-001` — First Nova ambient assistant
- `HX-014` — Fourteenth Hex sensor node
- `RB-001` — First robot controller
- `NC-003` — Third NullClaw comm node
- `VS-007` — Seventh voice satellite

The device ID is set in `device.json` during provisioning and is used as:
- MQTT client ID
- MQTT topic prefix (`novasyn/NV-001/...`)
- BabyAI telemetry device identifier
- Systemd service instance identifier (if running multiple devices on one host)
