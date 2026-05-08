# 01 — Tech Stack: NovaSyn Embedded Dev Stack

> Exact technologies and versions. No ambiguity. If it is not listed here, it is not in the stack.

---

## Languages

| Language | Version | Role | Notes |
|----------|---------|------|-------|
| **Zig** | 0.15.x (latest stable) | Firmware, drivers, HAL, real-time critical paths, bare-metal MCU code | Follows NullClaw patterns: vtable-driven dispatch, zero external deps beyond libc/SQLite. Cross-compiles to all targets from a single source tree. |
| **Python** | 3.12+ | Application layer on RPi: AI inference orchestration, voice pipeline, BabyAI phone-home, high-level behavior logic, OTA management | Package management via `uv`. Type hints required (mypy strict). |
| **C** | C11 (vendor SDK only) | Wrapping existing vendor SDKs (ESP-IDF) where Zig cannot directly substitute | Zig imports C headers via `@cImport`. Minimize C surface area — wrap, do not extend. |

**Explicitly excluded:**
- C++ — not used. Zig replaces all C++ use cases. If a vendor library requires C++ (rare), isolate it behind a C ABI boundary.
- Rust — not used. Zig provides equivalent memory safety guarantees for this stack's requirements with simpler cross-compilation.
- JavaScript/TypeScript — not used on embedded targets. Exists only in the Windows NovaSyn apps (separate stack).
- MicroPython/CircuitPython — not used. Too slow, too much overhead, unpredictable GC pauses.

---

## Target Platforms

### Tier 1 — Primary Targets (all code must compile and run)

| Platform | Architecture | Role | Memory | Key Peripherals |
|----------|-------------|------|--------|-----------------|
| **Raspberry Pi 5** | aarch64-linux-gnu | Primary "brain" | 8GB RAM, 32GB+ SD | CSI camera, I2C/SPI/UART, USB3, PCIe, WiFi 5, BLE 5.0, GPIO 40-pin |
| **Raspberry Pi 4** | aarch64-linux-gnu | Budget "brain" | 4GB RAM, 32GB+ SD | CSI camera, I2C/SPI/UART, USB3, WiFi 5, BLE 5.0, GPIO 40-pin |
| **ESP32-S3** | xtensa-lx7 | Sensor/actuator "body", WiFi/BLE gateway | 512KB SRAM, 8MB PSRAM, 16MB flash | WiFi, BLE 5.0, I2C, SPI, UART, I2S, ADC, GPIO, USB OTG |

### Tier 2 — Secondary Targets (supported, not primary)

| Platform | Architecture | Role | Memory | Key Peripherals |
|----------|-------------|------|--------|-----------------|
| **STM32F4** (STM32F411/F446) | arm-none-eabi (Cortex-M4F) | Real-time motor control, precise timing | 128-512KB SRAM, 512KB-1MB flash | I2C, SPI, UART, ADC, PWM timers, DMA |
| **STM32H7** (STM32H743/H750) | arm-none-eabi (Cortex-M7) | High-performance real-time (advanced robotics) | 1MB SRAM, 2MB flash | I2C, SPI, UART, ADC (16-bit), PWM, DMA, FPU (double), Ethernet |

### Tier 3 — Development / Simulation

| Platform | Architecture | Role | Notes |
|----------|-------------|------|-------|
| **x86_64 Linux** (WSL2 or native) | x86_64-linux-gnu | Build host, simulation, unit tests, CI | Zig cross-compiles from here to all Tier 1/2 targets. Python tests run here. |

### Zig Cross-Compilation Targets

```
zig build                                    # native (dev host)
zig build -Dtarget=aarch64-linux-gnu         # Raspberry Pi 4/5
zig build -Dtarget=xtensa-esp32s3-none       # ESP32-S3 (via espressif Zig fork or ESP-IDF)
zig build -Dtarget=thumb-none-eabihf         # STM32F4 (Cortex-M4F, hard float)
zig build -Dtarget=thumb-none-eabihf         # STM32H7 (Cortex-M7, hard float)
```

---

## Build Systems

| Tool | Version | Scope | Notes |
|------|---------|-------|-------|
| **Zig build system** (build.zig) | Zig 0.15.x | Primary build for all Zig firmware/drivers | Handles cross-compilation, HAL selection (comptime target detection), test execution, binary size reporting. Single `build.zig` per project. |
| **CMake** | 3.24+ | ESP-IDF component wrapping only | Used only when integrating ESP-IDF components that require CMake. Zig build system calls into CMake as a build step. Minimize CMake surface area. |
| **uv** | latest | Python package management | Replaces pip, pip-tools, virtualenv. Lock file: `uv.lock`. Project config: `pyproject.toml`. |
| **pyproject.toml** | PEP 621 | Python project metadata, dependencies, tool config | Single source of truth for Python project configuration. |

---

## Communication Protocols

### Device-to-Cloud / Device-to-Device

| Protocol | Version / Impl | Role | Transport | Notes |
|----------|---------------|------|-----------|-------|
| **MQTT** | 5.0 (Mosquitto 2.x broker) | Primary device-to-cloud pub/sub, device-to-device messaging | TCP/TLS (port 8883) | QoS 1 default (at-least-once). QoS 2 for actuator commands. Retained messages for device status. Topic schema: `novasyn/{device_id}/{subsystem}/{metric}`. |
| **HTTP** | 1.1 / HTTPS | BabyAI API phone-home, OTA download | TCP/TLS (port 443) | Used for BabyAI `/v1/chat/completions`, `/v1/telemetry`, `/v1/feedback/select`. OTA firmware download via HTTPS GET. |
| **WebSocket** | RFC 6455 | BabyAI streaming inference | TCP/TLS (port 443) | Used when streaming responses from BabyAI API. Falls back to HTTP polling if WebSocket unavailable. |

### Inter-Board (Wired)

| Protocol | Speed | Role | Notes |
|----------|-------|------|-------|
| **I2C** | 100kHz (standard), 400kHz (fast) | Sensor communication, RPi ↔ sensor breakouts | Bus address conflicts must be documented per project. Use multiplexer (TCA9548A) if >8 devices. Pull-up resistors: 4.7kΩ for 100kHz, 2.2kΩ for 400kHz. |
| **SPI** | Up to 10MHz (device-dependent) | High-speed peripherals: displays, SD cards, ADC, LoRa radio | CS (chip select) per device. Clock polarity/phase (CPOL/CPHA) documented per device. |
| **UART** | 115200 baud default, up to 921600 | MCU-to-MCU communication, debug output | Flow control (RTS/CTS) required for >115200. Frame: 8N1 default. |
| **USB** | 2.0 (Full/High Speed) | RPi ↔ STM32 brain-body link | CDC ACM (virtual serial) for command/response. Bulk transfers for firmware update. |
| **I2S** | 16kHz-48kHz sample rate | Digital audio to/from MCU | INMP441 microphone (input), MAX98357A amplifier (output). Word select, bit clock, data lines. |

### Wireless (Short/Long Range)

| Protocol | Version / Chip | Role | Range | Notes |
|----------|---------------|------|-------|-------|
| **BLE** | 5.0 (ESP32-S3 integrated) | Local device pairing, phone proximity, configuration | ~100m (line of sight) | GATT services for device config and status. BLE advertising for discovery. |
| **LoRa** | SX1276 (915MHz NA) / SX1262 | Long-range mesh networking for sensor nodes | 1-15km (line of sight) | LoRaWAN Class A for battery nodes. Custom P2P for mesh. Spreading factor SF7-SF12 (trade range vs data rate). Duty cycle limits apply. |
| **WiFi** | 802.11n/ac (ESP32-S3, RPi integrated) | Primary network connectivity | ~50m indoor | Station mode default. AP mode for initial provisioning. WPA3 preferred, WPA2 minimum. |

---

## AI & Inference

### On-Device (RPi)

| Tool | Version | Role | Memory Usage | Notes |
|------|---------|------|-------------|-------|
| **Ollama** | latest | Local LLM inference | 1-4GB depending on model | Models: Qwen 3 0.6B (fast, low memory), Phi-3 Mini 3.8B (capable, 4GB), Gemma 2B (balanced). Quantized (Q4_K_M) for RPi. |
| **Whisper.cpp** | latest | Local speech-to-text | 500MB-1.5GB | Models: tiny.en (fastest, least accurate), base.en (balanced), small.en (most accurate, RPi 5 only). |
| **Piper TTS** | latest | Local text-to-speech | 50-200MB | ONNX voice models. Low latency. Multiple voices available. |
| **ONNX Runtime** | 1.17+ | Custom model inference | Model-dependent | For custom-trained models (gesture recognition, object detection). CPU execution provider (no GPU on RPi). |

### On-Device (MCU)

| Tool | Version | Role | Flash Usage | Notes |
|------|---------|------|-------------|-------|
| **TensorFlow Lite Micro** | latest | Edge inference | 50-500KB depending on model | Wake word detection (10-50KB model). Gesture recognition (100-200KB model). Quantized INT8 models only. |

### Cloud

| Service | Endpoint | Role | Notes |
|---------|----------|------|-------|
| **BabyAI API** | `https://novasynchris-babyai.hf.space/v1/chat/completions` | Complex inference, multi-model routing | OpenAI-compatible API. Streaming supported. Phone-home with metadata for co-op learning. |

---

## Storage

| Technology | Platform | Role | Notes |
|------------|----------|------|-------|
| **SQLite** | RPi (via better-sqlite3 or Python sqlite3) | Structured data: event logs, configuration, telemetry buffer, conversation history | WAL mode for concurrent reads. DB file on SD card. Backup to cloud when connected. |
| **Flash KV** (NVS on ESP32, custom on STM32) | MCU | Key-value pairs in flash: configuration, calibration data, buffered telemetry | Wear-leveled. Max 4KB per value. Keys: string, max 15 chars (NVS limit). |
| **SD Card** (via SPI or SDIO) | RPi or MCU with SD slot | Large data: audio recordings, firmware images, model weights, extended logs | FAT32 for MCU compatibility. ext4 for RPi-only cards. Sector-aligned writes for performance. |
| **tmpfs** | RPi | Transient data: audio buffers, inference scratch space | Mounted at `/tmp`. Size limited to 512MB. No SD card wear. Lost on reboot (by design). |

---

## Audio Pipeline

| Component | Platform | Role | Notes |
|-----------|----------|------|-------|
| **ALSA** | RPi | Low-level audio I/O | Direct hardware access. Used by Whisper.cpp and Piper TTS. |
| **PipeWire** | RPi | Audio routing, mixing, session management | Replaces PulseAudio. Routes between Whisper input, Piper output, and application audio. WirePlumber for session policy. |
| **I2S** | MCU (ESP32-S3) | Digital audio bus | INMP441 MEMS microphone (input): I2S master, 16kHz, 16-bit, mono. MAX98357A I2S amplifier (output): I2S slave, 16kHz, 16-bit, mono. |
| **ReSpeaker 2-Mic Pi HAT** | RPi | Microphone array input | I2S interface. 2-channel. Onboard codec (WM8960). Enables beam-forming and noise suppression. |
| **XIAO-ESP32S3 Sense** | Standalone MCU | Compact mic + camera module | Onboard PDM microphone + OV2640 camera. Useful for small form-factor nodes. |

---

## Sensors

| Sensor | Interface | Measurement | Address / Config | Notes |
|--------|-----------|-------------|-----------------|-------|
| **BME280** | I2C | Temperature, humidity, barometric pressure | 0x76 (SDO=GND) or 0x77 (SDO=VCC) | Forced mode for lowest power. 2ms standby between measurements. Datasheet: Bosch BST-BME280-DS002. |
| **VL53L0X** | I2C | Time-of-flight distance (30mm-2000mm) | 0x29 (default, programmable) | Long-range mode for max distance. Timing budget 200ms for best accuracy. Datasheet: ST UM2039. |
| **MPU6050** | I2C | 6-axis IMU (3-axis accel + 3-axis gyro) | 0x68 (AD0=GND) or 0x69 (AD0=VCC) | 1kHz max sample rate. DLPF (digital low-pass filter) configured per application. Datasheet: InvenSense PS-MPU-6000A. |
| **Soil Moisture** (capacitive) | ADC | Volumetric water content (analog) | ADC channel (board-specific) | Capacitive (not resistive — resistive corrodes). Calibrate per soil type. 3.3V excitation. |
| **Pi Camera Module 3** | CSI (MIPI) | RGB video/stills, 12MP | CSI-2 lane config | libcamera API on RPi. Auto-focus. Wide and standard variants. |

---

## Actuators

| Actuator | Interface | Driver IC | Notes |
|----------|-----------|-----------|-------|
| **DC Motor** | PWM + direction GPIO | L298N (dual H-bridge) | Max 2A per channel, 46V. Built-in 5V regulator (disable above 12V input). PWM frequency 1-20kHz. |
| **Servo** (standard/continuous) | PWM | PCA9685 (16-channel I2C PWM) | 12-bit resolution (4096 steps). I2C address 0x40 (default). 50Hz PWM for standard servos. External 5-6V servo power supply required. |
| **Stepper Motor** | STEP + DIR GPIO | A4988 (basic) or TMC2209 (silent) | A4988: 1/16 microstepping, 2A max. TMC2209: 1/256 microstepping, 2.8A max, UART config, StallGuard sensorless homing. |
| **LED / NeoPixel** | GPIO (single) or data pin (WS2812B) | None / built-in | WS2812B: 800kHz timing-critical protocol. Use hardware SPI or PIO (RP2040) for reliable timing. |
| **Relay** | GPIO → transistor → relay coil | SRD-05VDC (5V SPDT) | Flyback diode required on coil. Do not switch relay directly from GPIO — use NPN transistor or MOSFET. Max 10A @ 250VAC (check relay rating). |

---

## OS & Deployment

| Component | Version / Config | Role | Notes |
|-----------|-----------------|------|-------|
| **Raspberry Pi OS Lite** | 64-bit (Bookworm-based) | Base OS for RPi | Headless (no desktop). Minimal install. `raspi-config` for initial setup. SSH enabled by default. |
| **systemd** | (bundled with OS) | Service management | Each NovaSyn service is a systemd unit: `novasyn-brain.service`, `novasyn-audio.service`, `novasyn-mqtt.service`. Restart=always, WatchdogSec configured. |
| **Docker** | 24.x (optional) | Containerized services on RPi | Optional for isolation. Useful for Ollama, Mosquitto. Not used on MCU. Overhead acceptable on RPi 5, marginal on RPi 4. |
| **NullClaw** | (built from source, Zig) | Runtime for agent behavior | 678KB binary. Vtable-driven. Already integrated into the NovaSyn ecosystem. Runs on RPi and MCU. |
| **OTA Updates** | Custom (HTTPS + signature verification) | Firmware and application updates | Firmware: dual-partition A/B on MCU (rollback on failure). Python: `uv sync` from updated lock file. Signed with Ed25519. |

---

## Version Pinning Policy

- **Zig**: pin to 0.15.x release branch. Do not chase nightly builds for production firmware.
- **Python**: pin to 3.12.x. All dependencies pinned in `uv.lock`.
- **Ollama models**: pin to specific model digest (SHA256). Do not use `latest` tag in production.
- **System packages**: pin in provisioning script. `apt` versions recorded.
- **ESP-IDF**: pin to v5.2.x (if used for ESP32 wrapping).

Upgrades are deliberate, tested, and documented. No automatic dependency updates in production.
