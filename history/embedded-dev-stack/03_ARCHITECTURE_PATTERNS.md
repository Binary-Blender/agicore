# 03 — Architecture Patterns

> NovaSyn Embedded Dev Stack — AI-to-AI Reference
> Zig 0.15.x (firmware/drivers/real-time) + Python 3.12+ (application layer)
> Platforms: RPi 4/5, ESP32-S3, STM32F4/H7

This document defines the layered architecture for all NovaSyn embedded devices, from ambient AI assistants (RPi + mic + speaker) to robotics (RPi brain + MCU body). It is the embedded equivalent of the Windows stack's `03_ARCHITECTURE_PATTERNS.md` (IPC bridge pattern), adapted for real hardware, real-time constraints, and physical safety.

Every architectural decision here serves one principle: **layers enforce isolation so that a bug in AI inference never burns out a motor, and a sensor failure never crashes the voice pipeline.**

---

## The Layer Stack

Five layers, bottom to top. Each layer depends ONLY on the layer directly below it. No skipping.

```
┌─────────────────────────────────────────────────────┐
│  5. COMMUNICATION LAYER  (cross-cutting)            │
│     MQTT pub/sub, HTTP phone-home, I2C/UART inter-  │
│     board. Runs at service level, serves all layers. │
├─────────────────────────────────────────────────────┤
│  4. APPLICATION LAYER                                │
│     Python (RPi) or Zig (MCU). Behavior logic,       │
│     AI inference, user interaction, BabyAI client.   │
├─────────────────────────────────────────────────────┤
│  3. SERVICE LAYER                                    │
│     Zig or Python. Combines drivers into functional  │
│     units: SensorFusion, MotorController, Audio-     │
│     Pipeline, VoicePipeline.                         │
├─────────────────────────────────────────────────────┤
│  2. DRIVER LAYER                                     │
│     Portable Zig modules per hardware chip.          │
│     Depends ONLY on HAL interfaces. Reusable         │
│     across all boards.                               │
├─────────────────────────────────────────────────────┤
│  1. HAL (Hardware Abstraction Layer)                 │
│     Thin Zig wrappers around board-specific I/O.     │
│     One implementation per board. The ONLY layer     │
│     that knows which board it's running on.          │
└─────────────────────────────────────────────────────┘
```

---

### Layer 1: HAL (Hardware Abstraction Layer)

The HAL is a set of Zig interfaces (vtables) that abstract raw hardware access. There is exactly one HAL implementation per supported board.

**Files:**
- `src/hal/hal.zig` — Interface definitions (vtables)
- `src/hal/hal_rpi.zig` — Raspberry Pi 4/5 implementation (via `/dev/gpiomem`, `/dev/i2c-*`, `/dev/spidev*`)
- `src/hal/hal_esp32.zig` — ESP32-S3 implementation (via ESP-IDF register access)
- `src/hal/hal_stm32.zig` — STM32F4/H7 implementation (via CMSIS/LL register access)

**Exposed interfaces:**

```zig
// hal.zig — interface definitions

pub const GpioPin = struct {
    ptr: *anyopaque,
    vtable: *const VTable,

    pub const VTable = struct {
        read: *const fn (ptr: *anyopaque) Error!Level,
        write: *const fn (ptr: *anyopaque, level: Level) Error!void,
        setDirection: *const fn (ptr: *anyopaque, dir: Direction) Error!void,
        setInterrupt: *const fn (ptr: *anyopaque, edge: Edge, callback: *const fn () void) Error!void,
    };

    pub const Level = enum { low, high };
    pub const Direction = enum { input, output };
    pub const Edge = enum { rising, falling, both };
    pub const Error = error{ AccessDenied, BusError, Timeout, InvalidPin };

    pub fn read(self: GpioPin) Error!Level {
        return self.vtable.read(self.ptr);
    }
    // ... delegate all methods through vtable
};

pub const I2cBus = struct {
    ptr: *anyopaque,
    vtable: *const VTable,

    pub const VTable = struct {
        read: *const fn (ptr: *anyopaque, addr: u7, buf: []u8) Error!usize,
        write: *const fn (ptr: *anyopaque, addr: u7, data: []const u8) Error!void,
        writeRead: *const fn (ptr: *anyopaque, addr: u7, write_data: []const u8, read_buf: []u8) Error!usize,
    };

    pub const Error = error{ Nack, BusError, Timeout, ArbitrationLost };
    // ... delegate methods
};

pub const SpiBus = struct { /* same vtable pattern */ };
pub const UartPort = struct { /* same vtable pattern */ };
pub const PwmChannel = struct { /* same vtable pattern */ };
pub const AdcChannel = struct { /* same vtable pattern */ };
```

**Rules:**
- HAL implementations NEVER import from driver or service layers.
- HAL implementations NEVER allocate heap memory. Stack only.
- HAL implementations MUST set hardware to a safe default state in `init()` (pins as input, pull-ups off, peripherals disabled).
- HAL implementations MUST release hardware in `deinit()` (unexport pins, close file descriptors).
- All HAL operations have timeouts. No infinite blocking.

---

### Layer 2: Driver Layer

Portable Zig modules, one per hardware component. Drivers depend ONLY on HAL interfaces — never on a specific HAL implementation, never on each other.

**Lifecycle:**

```zig
// drivers/bme280.zig — temperature/humidity/pressure sensor

pub const Bme280 = struct {
    bus: hal.I2cBus,
    addr: u7,
    calibration: CalibrationData,

    pub fn init(bus: hal.I2cBus, addr: u7) !Bme280 {
        var self = Bme280{ .bus = bus, .addr = addr, .calibration = undefined };
        // Read calibration registers
        const raw = try bus.writeRead(self.ptr, addr, &[_]u8{0x88}, &cal_buf);
        self.calibration = parseCalibration(raw);
        // Set oversampling and mode
        try bus.write(self.ptr, addr, &[_]u8{ 0xF2, 0x01 }); // humidity 1x
        try bus.write(self.ptr, addr, &[_]u8{ 0xF4, 0x27 }); // temp 1x, pressure 1x, normal mode
        return self;
    }

    pub fn readTemperature(self: *Bme280) !f32 {
        const raw = try self.bus.writeRead(self.ptr, self.addr, &[_]u8{0xFA}, &temp_buf);
        return self.compensateTemperature(raw);
    }

    pub fn readAll(self: *Bme280) !SensorReading {
        // Read all 8 bytes in one burst for consistency
        const raw = try self.bus.writeRead(self.ptr, self.addr, &[_]u8{0xF7}, &all_buf);
        return .{
            .temperature_c = self.compensateTemperature(raw[3..6]),
            .pressure_pa = self.compensatePressure(raw[0..3]),
            .humidity_pct = self.compensateHumidity(raw[6..8]),
        };
    }

    pub fn deinit(self: *Bme280) void {
        // Put sensor in sleep mode
        self.bus.write(self.ptr, self.addr, &[_]u8{ 0xF4, 0x00 }) catch {};
    }
};
```

**Rules:**
- Every driver has `init()`, one or more `read`/`write` methods, and `deinit()`.
- Drivers NEVER hardcode pin numbers, I2C addresses, or bus indices. These come from config via the caller.
- Drivers NEVER allocate heap memory. Pre-sized buffers on the stack.
- Drivers return error unions for all fallible operations. No panics.
- Drivers are testable against mock HAL implementations (see `05_TESTING_STRATEGY.md`).

**Common drivers in the NovaSyn ecosystem:**
| Driver | Chip | Function | Bus |
|--------|------|----------|-----|
| `bme280.zig` | BME280 | Temperature, humidity, pressure | I2C |
| `vl53l0x.zig` | VL53L0X | Time-of-flight distance | I2C |
| `pca9685.zig` | PCA9685 | 16-channel PWM (servos, LEDs) | I2C |
| `mpu6050.zig` | MPU-6050 | 6-axis IMU (accel + gyro) | I2C |
| `max98357.zig` | MAX98357A | I2S audio amplifier | I2S |
| `inmp441.zig` | INMP441 | I2S MEMS microphone | I2S |
| `ws2812.zig` | WS2812B | Addressable RGB LEDs | GPIO (bitbang/SPI) |
| `soil_cap.zig` | Capacitive | Soil moisture (analog) | ADC |

---

### Layer 3: Service Layer

Higher-level modules that combine multiple drivers into functional units. Services run as Zig modules on MCU or Python modules on RPi.

**Examples:**

**SensorFusion (Zig, on MCU):**
- Combines IMU + distance + pressure into spatial awareness.
- Applies Kalman filter to IMU data.
- Publishes fused readings on the internal event bus.
- Owns its driver instances — creates them in `init()`, destroys them in `deinit()`.

**MotorController (Zig, on MCU):**
- Coordinates multi-motor movement with trapezoidal acceleration curves.
- Accepts high-level commands (move_to, rotate, stop).
- Enforces safety limits (max speed, max acceleration, position bounds).
- Monitors motor current via ADC — cuts power on stall detection.

**AudioPipeline (Python, on RPi):**
- Mic capture via ALSA → ring buffer → wake word detection → STT → LLM → TTS → speaker.
- Non-blocking: runs as asyncio tasks.
- Graceful degradation: if mic dies, switches to text input mode.

**VoicePipeline (Python, on RPi):**
- Whisper (local, distil-whisper-small) → BabyAI/Ollama → Piper TTS.
- Manages conversation state, context window, response caching.
- Falls back to canned responses if LLM is unavailable.

```
Service Layer Structure:

┌──────────────────────────────────────────────┐
│ AudioPipeline  │  VoicePipeline  │  BabyAI   │  ← Python on RPi
├──────────────────────────────────────────────┤
│ SensorFusion   │  MotorController │  Safety   │  ← Zig on MCU
└───────┬────────┴────────┬─────────┴─────┬────┘
        │                 │               │
   ┌────┴────┐      ┌────┴────┐    ┌─────┴────┐
   │BME280   │      │PCA9685  │    │ MPU6050  │    ← Driver Layer
   │VL53L0X  │      │DC Motor │    │          │
   └────┬────┘      └────┬────┘    └─────┬────┘
        │                 │               │
   ┌────┴─────────────────┴───────────────┴────┐
   │               HAL Layer                    │   ← Board-specific
   └───────────────────────────────────────────┘
```

**Rules:**
- Services own their driver instances. No shared mutable state between services.
- Services communicate via the event bus (see Message Bus Pattern below), never by direct reference.
- Services are the boundary between Zig (real-time) and Python (application). A service either runs entirely in Zig or entirely in Python — never split.
- Services declare their required drivers and config keys at initialization. Missing dependencies are a startup error, not a runtime surprise.

---

### Layer 4: Application Layer

The top-level behavior logic. On RPi devices, this is Python. On standalone MCU devices (e.g., sensor nodes), this is Zig.

**RPi Application Layer (Python):**

```python
# app.py — Ambient AI assistant application

import asyncio
from novasyn.services import AudioPipeline, VoicePipeline, BabyAIClient
from novasyn.config import DeviceConfig
from novasyn.bus import EventBus

async def main():
    config = DeviceConfig.load("device.json")
    bus = EventBus()

    audio = AudioPipeline(config.audio, bus)
    voice = VoicePipeline(config.voice, bus)
    babyai = BabyAIClient(config.babyai, bus)

    # Wire up the pipeline
    bus.subscribe("audio/wake_word", voice.on_wake_word)
    bus.subscribe("voice/user_utterance", babyai.on_user_input)
    bus.subscribe("babyai/response", voice.on_ai_response)
    bus.subscribe("voice/tts_complete", audio.on_tts_complete)

    # Start all services
    await asyncio.gather(
        audio.run(),
        voice.run(),
        babyai.run(),
        heartbeat_loop(config, bus),
    )

async def heartbeat_loop(config, bus):
    while True:
        bus.publish("system/heartbeat", {"uptime": get_uptime()})
        await asyncio.sleep(config.heartbeat_interval_s)
```

**MCU Application Layer (Zig):**

```zig
// main.zig — Sensor node firmware

const hal = @import("hal/hal_esp32.zig");
const SensorFusion = @import("services/sensor_fusion.zig").SensorFusion;
const MqttClient = @import("comm/mqtt.zig").MqttClient;

pub fn main() !void {
    var gpa = std.heap.GeneralPurposeAllocator(.{}){};
    defer _ = gpa.deinit();

    const config = try Config.load("device.json", gpa.allocator());
    var hw = try hal.init(config.pins);
    defer hw.deinit();

    var sensors = try SensorFusion.init(hw.i2c_bus, config.sensors);
    defer sensors.deinit();

    var mqtt = try MqttClient.init(config.mqtt, gpa.allocator());
    defer mqtt.deinit();

    // Main loop: read sensors, publish, sleep
    while (true) {
        const reading = sensors.readAll() catch |err| {
            try mqtt.publish("system/error", errorToJson(err));
            continue;
        };

        try mqtt.publish("sensors/environment", reading.toJson());
        hw.wdt.feed(); // Feed the watchdog
        std.time.sleep(config.poll_interval_ns);
    }
}
```

**Rules:**
- The application layer NEVER touches hardware directly. Always goes through services.
- The application layer is the ONLY layer that knows about BabyAI, user preferences, conversation history.
- The application layer owns the event bus and wires services together.
- On RPi, the application runs as a systemd service with watchdog support.

---

### Layer 5: Communication Layer

Cross-cutting layer that provides connectivity. Runs at the service level but is available to all layers above HAL.

**MQTT (pub/sub between devices and to cloud):**
- Broker: Mosquitto on a local RPi or cloud MQTT broker.
- QoS 0 for telemetry (sensor readings, heartbeats — loss acceptable).
- QoS 1 for commands (actuator commands — delivery guaranteed).
- QoS 2 never used (overhead not justified for this use case).

**HTTP (BabyAI phone-home):**
- Python `httpx` async client on RPi.
- Zig `std.http.Client` on MCU (only for direct-to-cloud MCU nodes).
- Endpoint: `https://novasynchris-babyai.hf.space/v1/chat/completions`
- Auth: `Authorization: Bearer {HF_TOKEN}` + `X-Api-Key: bai-{user_key}`
- Telemetry batched and sent every 5 minutes (configurable).

**I2C/UART (inter-board, brain-body link):**
- Used for the brain-body pattern (see below).
- Simple framed protocol: `[START_BYTE, LENGTH, COMMAND, PAYLOAD..., CHECKSUM]`
- Not for general-purpose messaging — only for the tight brain-body loop.

---

## The Brain-Body Pattern

The critical architecture for any NovaSyn robot or actuated device. The brain handles intelligence; the body handles physics. They are separate computers connected by a serial link.

```
┌─────────────────────────────┐     USB-UART or I2C     ┌─────────────────────────────┐
│         BRAIN (RPi)         │◄─────────────────────────►│       BODY (STM32/ESP32)     │
│                             │                           │                              │
│  Python Application Layer   │    Command/Response       │  Zig Firmware                │
│  ┌───────────────────────┐  │    Protocol               │  ┌──────────────────────┐   │
│  │ VoicePipeline         │  │                           │  │ MotorController      │   │
│  │ BabyAI Client         │  │    Brain → Body:          │  │ SensorFusion         │   │
│  │ Conversation State    │  │    MOVE_SERVO  id  angle  │  │ SafetyMonitor        │   │
│  │ Decision Engine       │  │    SET_LED  r  g  b       │  │                      │   │
│  └───────────────────────┘  │    READ_SENSORS           │  └──────────────────────┘   │
│                             │    SET_MODE  mode          │                              │
│  Ollama (local LLM)        │                           │  Independent Safety Limits   │
│  Whisper (STT)             │    Body → Brain:           │  ┌──────────────────────┐   │
│  Piper (TTS)               │    ACK  command  status    │  │ Max motor speed      │   │
│                             │    SENSOR_DATA  payload    │  │ Thermal cutoffs      │   │
│  WiFi / MQTT / BabyAI      │    ERROR  code  message    │  │ Position bounds      │   │
│                             │    HEARTBEAT_ACK           │  │ Current limiters     │   │
└─────────────────────────────┘                           │  │ Watchdog timer       │   │
                                                          │  └──────────────────────┘   │
                                                          └─────────────────────────────┘
```

### Brain-Body Protocol

Simple framed binary protocol over UART (115200 baud default, configurable).

**Frame format:**

```
┌──────┬────────┬─────────┬──────────────┬──────────┐
│ 0xAA │ Length │ Command │ Payload      │ Checksum │
│ 1B   │ 1B    │ 1B      │ 0-252B       │ 1B       │
└──────┴────────┴─────────┴──────────────┴──────────┘
```

- Start byte: `0xAA` (sync marker)
- Length: total payload bytes (0-252)
- Command: see command table below
- Payload: command-specific data
- Checksum: XOR of all bytes from Length through end of Payload

**Command table:**

| Command | Code | Direction | Payload | Response |
|---------|------|-----------|---------|----------|
| `PING` | `0x01` | Brain→Body | none | `PONG` |
| `PONG` | `0x02` | Body→Brain | none | — |
| `MOVE_SERVO` | `0x10` | Brain→Body | servo_id(1B) + angle_deg(2B) + speed(1B) | `ACK` |
| `SET_MOTOR` | `0x11` | Brain→Body | motor_id(1B) + speed_pct(1B, signed) | `ACK` |
| `SET_LED` | `0x12` | Brain→Body | led_id(1B) + r(1B) + g(1B) + b(1B) | `ACK` |
| `READ_SENSORS` | `0x20` | Brain→Body | sensor_mask(2B) | `SENSOR_DATA` |
| `SENSOR_DATA` | `0x21` | Body→Brain | sensor_id(1B) + data(variable) | — |
| `SET_MODE` | `0x30` | Brain→Body | mode(1B): 0=idle, 1=active, 2=sleep | `ACK` |
| `ACK` | `0xF0` | Body→Brain | original_cmd(1B) + status(1B) | — |
| `NACK` | `0xF1` | Body→Brain | original_cmd(1B) + error_code(1B) | — |
| `ERROR` | `0xFE` | Body→Brain | error_code(1B) + message(variable) | — |
| `HEARTBEAT` | `0xFF` | Brain→Body | uptime_ms(4B) | `HEARTBEAT_ACK` |
| `HEARTBEAT_ACK` | `0xFD` | Body→Brain | uptime_ms(4B) + status_flags(1B) | — |

### Safety Rules (Non-Negotiable)

1. **Body has independent safety limits that the brain CANNOT override.** Max motor speed, thermal cutoffs, and position bounds are compiled into the body firmware or loaded from body-local config at boot. The brain cannot change them at runtime.

2. **Heartbeat timeout triggers safe mode.** The body expects a `HEARTBEAT` from the brain at a configurable interval (default: 1 second). If 3 consecutive heartbeats are missed, the body enters safe mode:
   - All motors stopped (coast, not brake, unless configured otherwise).
   - All actuators set to neutral/safe position.
   - Error LED pattern activated (slow red blink).
   - Body continues to read sensors and respond to `PING` but ignores all actuator commands until a valid heartbeat resumes.

3. **Command rate limiting.** The body enforces a maximum command rate per actuator. Rapid-fire commands from a buggy brain are throttled, not obeyed.

4. **Actuator slew rate limiting.** No actuator goes from 0% to 100% in one step. The body applies configurable acceleration/deceleration ramps to all motor and servo commands.

5. **E-stop is hardware.** A physical button wired directly to the MCU (not through the brain) that cuts power to all motors via a relay or MOSFET. Software cannot prevent an E-stop.

---

## The Message Bus Pattern

All inter-component communication within a device (and between devices) goes through a message bus. No direct function calls between services.

### Internal Event Bus

**Zig (on MCU):**

```zig
// bus.zig — lightweight callback-based event bus

pub const EventBus = struct {
    const MAX_SUBSCRIBERS = 32;
    const MAX_TOPICS = 16;

    subscribers: [MAX_TOPICS][MAX_SUBSCRIBERS]?Callback = .{.{null} ** MAX_SUBSCRIBERS} ** MAX_TOPICS,
    topic_names: [MAX_TOPICS]?[]const u8 = .{null} ** MAX_TOPICS,

    pub const Callback = *const fn (payload: []const u8) void;

    pub fn subscribe(self: *EventBus, topic: []const u8, cb: Callback) !void {
        const idx = self.findOrCreateTopic(topic) orelse return error.TopicsFull;
        for (&self.subscribers[idx]) |*slot| {
            if (slot.* == null) {
                slot.* = cb;
                return;
            }
        }
        return error.SubscribersFull;
    }

    pub fn publish(self: *EventBus, topic: []const u8, payload: []const u8) void {
        const idx = self.findTopic(topic) orelse return;
        for (self.subscribers[idx]) |maybe_cb| {
            if (maybe_cb) |cb| cb(payload);
        }
    }
};
```

No heap allocations. Fixed-size arrays. Compile-time bounded. Suitable for ISR-adjacent code (callbacks must be fast and non-blocking).

**Python (on RPi):**

```python
# bus.py — asyncio-based event bus

import asyncio
from collections import defaultdict
from typing import Callable, Any

class EventBus:
    def __init__(self):
        self._subscribers: dict[str, list[Callable]] = defaultdict(list)

    def subscribe(self, topic: str, callback: Callable) -> None:
        self._subscribers[topic].append(callback)

    async def publish(self, topic: str, payload: Any) -> None:
        for callback in self._subscribers.get(topic, []):
            if asyncio.iscoroutinefunction(callback):
                await callback(payload)
            else:
                callback(payload)

    def unsubscribe(self, topic: str, callback: Callable) -> None:
        self._subscribers[topic] = [
            cb for cb in self._subscribers[topic] if cb is not callback
        ]
```

### External Message Bus (MQTT)

**Topic hierarchy:**

```
novasyn/{device_id}/{subsystem}/{event_type}
```

**Standard topics:**

```
novasyn/ambient-01/sensors/temperature       → {"value": 22.5, "unit": "C", "ts": 1710300000}
novasyn/ambient-01/sensors/humidity          → {"value": 45.2, "unit": "%", "ts": 1710300000}
novasyn/ambient-01/audio/wake_word           → {"word": "hey nova", "confidence": 0.92}
novasyn/ambient-01/audio/user_utterance      → {"text": "what's the weather", "ts": 1710300001}
novasyn/ambient-01/voice/response            → {"text": "It's 22 degrees...", "ts": 1710300002}
novasyn/ambient-01/system/heartbeat          → {"uptime_s": 3600, "cpu_temp": 55.2, "mem_pct": 42}
novasyn/ambient-01/system/error              → {"severity": "RECOVERABLE", "msg": "I2C timeout"}
novasyn/ambient-01/system/status             → {"mode": "active", "services": ["audio", "voice"]}

novasyn/hex-farm-03/sensors/soil_moisture    → {"zone": 2, "value": 680, "raw_adc": 2048}
novasyn/hex-farm-03/sensors/light            → {"lux": 45000, "ts": 1710300000}

novasyn/robot-01/body/motor_status           → {"motor_id": 0, "speed_pct": 50, "current_ma": 320}
novasyn/robot-01/body/safety_event           → {"event": "stall_detected", "motor_id": 1}
novasyn/robot-01/brain/decision              → {"action": "turn_left", "confidence": 0.85}
```

**Rules:**
- Device IDs are set in `device.json`, not auto-generated.
- Telemetry topics use QoS 0 (fire and forget).
- Command topics use QoS 1 (at least once delivery).
- All payloads are JSON. No binary MQTT payloads (keep it debuggable).
- Timestamps are Unix epoch seconds (integer, not float).

---

## The Peripheral Interface Pattern

Derived from NullClaw's vtable-driven architecture. All peripherals implement a common interface that enables runtime discovery, hot-swap, and uniform health monitoring.

```zig
// peripheral.zig — universal peripheral interface

pub const Peripheral = struct {
    ptr: *anyopaque,
    vtable: *const VTable,

    pub const VTable = struct {
        /// Initialize the peripheral. Returns error if hardware not found.
        init: *const fn (ptr: *anyopaque) Error!void,

        /// Clean shutdown. Release hardware resources.
        deinit: *const fn (ptr: *anyopaque) void,

        /// Read data from the peripheral into the provided buffer.
        /// Returns the number of bytes written to buf.
        read: *const fn (ptr: *anyopaque, buf: []u8) Error!usize,

        /// Write data to the peripheral.
        write: *const fn (ptr: *anyopaque, data: []const u8) Error!void,

        /// Get peripheral health status.
        status: *const fn (ptr: *anyopaque) Status,

        /// Human-readable name for logging.
        name: *const fn (ptr: *anyopaque) []const u8,
    };

    pub const Status = enum {
        ok,            // Operating normally
        degraded,      // Working but with issues (high error rate, slow response)
        offline,       // Not responding, will retry
        failed,        // Permanently failed, needs physical intervention
    };

    pub const Error = error{
        NotInitialized,
        HardwareNotFound,
        BusError,
        Timeout,
        ChecksumMismatch,
        BufferTooSmall,
    };

    // Convenience methods that delegate to vtable
    pub fn init(self: Peripheral) Error!void { return self.vtable.init(self.ptr); }
    pub fn deinit(self: Peripheral) void { self.vtable.deinit(self.ptr); }
    pub fn read(self: Peripheral, buf: []u8) Error!usize { return self.vtable.read(self.ptr, buf); }
    pub fn write(self: Peripheral, data: []const u8) Error!void { return self.vtable.write(self.ptr, data); }
    pub fn status(self: Peripheral) Status { return self.vtable.status(self.ptr); }
    pub fn name(self: Peripheral) []const u8 { return self.vtable.name(self.ptr); }
};
```

**Usage pattern — peripheral registry:**

```zig
pub const PeripheralRegistry = struct {
    peripherals: [MAX_PERIPHERALS]?Peripheral = .{null} ** MAX_PERIPHERALS,
    count: usize = 0,

    pub fn register(self: *PeripheralRegistry, p: Peripheral) !void {
        if (self.count >= MAX_PERIPHERALS) return error.RegistryFull;
        self.peripherals[self.count] = p;
        self.count += 1;
    }

    pub fn healthCheck(self: *PeripheralRegistry) void {
        for (self.peripherals[0..self.count]) |maybe_p| {
            if (maybe_p) |p| {
                const s = p.status();
                if (s == .offline or s == .failed) {
                    log.warn("Peripheral '{s}' status: {}", .{ p.name(), s });
                }
            }
        }
    }

    pub fn initAll(self: *PeripheralRegistry) void {
        for (self.peripherals[0..self.count]) |maybe_p| {
            if (maybe_p) |p| {
                p.init() catch |err| {
                    log.err("Failed to init '{s}': {}", .{ p.name(), err });
                };
            }
        }
    }

    pub fn deinitAll(self: *PeripheralRegistry) void {
        // Deinit in reverse order
        var i = self.count;
        while (i > 0) {
            i -= 1;
            if (self.peripherals[i]) |p| p.deinit();
        }
    }
};
```

---

## The Configuration Pattern

Every device has a `device.json` that defines its identity, pin assignments, network config, and service parameters. No pin numbers or addresses are hardcoded anywhere.

**Schema:**

```json
{
  "device": {
    "id": "ambient-01",
    "type": "ambient_assistant",
    "name": "Living Room Nova",
    "board": "rpi5"
  },
  "pins": {
    "i2c_sda": 2,
    "i2c_scl": 3,
    "i2s_bclk": 18,
    "i2s_lrclk": 19,
    "i2s_din": 20,
    "i2s_dout": 21,
    "status_led": 25,
    "estop_pin": 17
  },
  "i2c": {
    "bus": 1,
    "speed_hz": 400000
  },
  "mqtt": {
    "host": "192.168.1.100",
    "port": 1883,
    "username": null,
    "password": null,
    "client_id": "ambient-01",
    "keepalive_s": 60
  },
  "babyai": {
    "endpoint": "https://novasynchris-babyai.hf.space",
    "hf_token_env": "HF_TOKEN",
    "api_key_env": "BABYAI_API_KEY",
    "model": "auto",
    "telemetry_interval_s": 300,
    "timeout_s": 30
  },
  "sensors": {
    "bme280": {
      "enabled": true,
      "i2c_addr": "0x76",
      "poll_interval_ms": 5000
    },
    "inmp441": {
      "enabled": true,
      "sample_rate": 16000,
      "bit_depth": 16
    }
  },
  "audio": {
    "wake_word": "hey nova",
    "wake_word_model": "models/hey_nova.onnx",
    "stt_model": "distil-whisper-small",
    "tts_model": "piper-en-us-amy",
    "volume": 75,
    "vad_threshold": 0.5
  },
  "voice": {
    "ollama_model": "qwen3:1.5b",
    "ollama_url": "http://localhost:11434",
    "system_prompt": "You are Nova, a helpful home assistant.",
    "max_response_tokens": 256,
    "conversation_timeout_s": 120
  },
  "safety": {
    "heartbeat_interval_ms": 1000,
    "heartbeat_timeout_count": 3,
    "max_cpu_temp_c": 80,
    "watchdog_timeout_s": 10
  },
  "logging": {
    "level": "INFO",
    "file": "/var/log/novasyn/ambient-01.log",
    "max_size_mb": 50,
    "rotate_count": 3
  }
}
```

**Environment overrides:**
Any config value can be overridden by environment variable with the prefix `NOVASYN_` and the path joined by underscores, uppercased:
- `NOVASYN_MQTT_HOST=10.0.0.1` overrides `mqtt.host`
- `NOVASYN_BABYAI_ENDPOINT=http://localhost:8000` overrides `babyai.endpoint`
- `NOVASYN_SAFETY_HEARTBEAT_INTERVAL_MS=500` overrides `safety.heartbeat_interval_ms`

**Validation:**
Config is validated at startup against a JSON schema. Missing required fields, invalid types, or out-of-range values cause a startup failure with a clear error message. The device does not partially start with bad config.

**Robot-specific config additions:**

```json
{
  "device": {
    "id": "robot-01",
    "type": "robot",
    "board": "rpi5"
  },
  "body": {
    "port": "/dev/ttyUSB0",
    "baud": 115200,
    "heartbeat_interval_ms": 1000,
    "command_timeout_ms": 100
  },
  "motors": {
    "left_wheel": {
      "id": 0,
      "max_speed_pct": 80,
      "ramp_ms": 200
    },
    "right_wheel": {
      "id": 1,
      "max_speed_pct": 80,
      "ramp_ms": 200
    }
  },
  "servos": {
    "head_pan": {
      "id": 0,
      "min_deg": 0,
      "max_deg": 180,
      "home_deg": 90,
      "speed": 128
    },
    "head_tilt": {
      "id": 1,
      "min_deg": 30,
      "max_deg": 150,
      "home_deg": 90,
      "speed": 128
    }
  }
}
```

**Rules:**
- Config is read-only after startup. Services do not mutate config at runtime.
- Secrets (API keys, tokens) are NEVER in `device.json`. They are in environment variables referenced by `*_env` keys.
- Pin assignments in config, not in code. Changing a wiring connection means editing JSON, not recompiling firmware.
- Every device type has a JSON schema in `schemas/` that documents all valid fields, types, and ranges.

---

## Device Type Reference

| Type | Board(s) | Layers Used | Key Services |
|------|----------|-------------|--------------|
| Ambient Assistant | RPi 4/5 | All 5 | AudioPipeline, VoicePipeline, BabyAI |
| Sensor Node (Hex) | ESP32-S3 | HAL, Driver, Service, Comm | SensorFusion, MQTT |
| Robot | RPi 5 + STM32 | All 5 (brain-body split) | MotorController, SensorFusion, VoicePipeline |
| Display Node | RPi 4/5 | HAL, Service, App, Comm | DisplayRenderer, BabyAI |
| NullClaw Edge | ESP32-S3 | HAL, Driver, Comm | NullClaw runtime, MQTT bridge |

---

## Cross-References

- Error handling for all layers: `04_ERROR_HANDLING.md`
- Testing strategy including mock HAL: `05_TESTING_STRATEGY.md`
- NullClaw vtable pattern origin: NullClaw Zig runtime (678KB, zero-dependency)
- BabyAI API contract: BabyAI `VISION.md` and cloud endpoint docs
- Windows stack equivalent: NovaSyn Windows Dev Stack `03_ARCHITECTURE_PATTERNS.md` (IPC bridge)
