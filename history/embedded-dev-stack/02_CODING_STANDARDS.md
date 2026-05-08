# 02 — Coding Standards: NovaSyn Embedded Dev Stack

> Naming conventions, code style, file organization, and comment standards for all NovaSyn embedded code. Consistency is the mechanism by which AI-to-AI correctness scales.

---

## Zig Standards

All Zig code in this stack follows NullClaw patterns: vtable-driven dispatch, explicit allocators, zero external dependencies beyond libc and SQLite.

### Naming Conventions

| Element | Convention | Example |
|---------|-----------|---------|
| Functions | snake_case | `read_register`, `set_pwm_duty`, `init_sensor` |
| Variables | snake_case | `sensor_value`, `motor_speed`, `is_connected` |
| Struct fields | snake_case | `.sample_rate`, `.bus_address`, `.max_retries` |
| Types / Structs | PascalCase | `SensorReading`, `MotorConfig`, `MqttClient` |
| Enums | PascalCase (type), snake_case (values) | `SensorState { .idle, .reading, .error_timeout }` |
| Unions | PascalCase | `HalError`, `CommandPayload` |
| Compile-time constants | SCREAMING_SNAKE_CASE | `MAX_BUFFER_SIZE`, `DEFAULT_I2C_SPEED` |
| Runtime constants | PascalCase | `DefaultTimeout`, `SensorPollInterval` |
| Files / modules | snake_case.zig | `motor_control.zig`, `bme280.zig`, `mqtt.zig` |
| Test names | subject_expected_behavior | `bme280_returns_error_on_i2c_nack`, `servo_clamps_angle_to_range` |

### Vtable Pattern (NullClaw Standard)

All hardware abstractions use vtable dispatch. This enables runtime polymorphism without heap allocation or dynamic dispatch overhead beyond a single pointer indirection.

```zig
/// Generic I2C interface — drivers program against this.
pub const I2cBus = struct {
    ptr: *anyopaque,
    vtable: *const VTable,

    pub const VTable = struct {
        read_register: *const fn (ptr: *anyopaque, addr: u7, reg: u8, buf: []u8) Error!void,
        write_register: *const fn (ptr: *anyopaque, addr: u7, reg: u8, data: []const u8) Error!void,
    };

    pub fn read_register(self: I2cBus, addr: u7, reg: u8, buf: []u8) Error!void {
        return self.vtable.read_register(self.ptr, addr, reg, buf);
    }

    pub fn write_register(self: I2cBus, addr: u7, reg: u8, data: []const u8) Error!void {
        return self.vtable.write_register(self.ptr, addr, reg, data);
    }
};
```

**Naming rules for vtable implementers:**

| Role | Naming Pattern | Example |
|------|---------------|---------|
| Sensor driver | `<PartNumber>Sensor` | `Bme280Sensor`, `Vl53l0xSensor` |
| Actuator driver | `<PartNumber>Actuator` or `<Type>Driver` | `Pca9685ServoDriver`, `Tmc2209StepperDriver` |
| HAL implementation | `<Platform><Peripheral>` | `LinuxI2c`, `Esp32Spi`, `Stm32Uart` |
| Communication client | `<Protocol>Client` | `MqttClient`, `BleClient`, `LoraRadio` |
| Service | `<Domain>Service` | `SensorFusionService`, `MotorControlService` |

**Factory keys** (for runtime driver registration and lookup): lowercase, no separators. Examples: `"bme280"`, `"servo"`, `"mqtt"`, `"lora"`.

### Memory Management

**Rule 1: Explicit allocator on every function that allocates.**

```zig
// CORRECT — allocator passed explicitly
pub fn init(allocator: std.mem.Allocator, config: Config) !*Self {
    const self = try allocator.create(Self);
    errdefer allocator.destroy(self);
    self.* = .{
        .buffer = try allocator.alloc(u8, config.buffer_size),
        // ...
    };
    return self;
}

// WRONG — hidden allocation
pub fn init(config: Config) !*Self {
    const self = try std.heap.page_allocator.create(Self); // NO — hidden allocator
    // ...
}
```

**Rule 2: Always defer free/deinit.**

```zig
pub fn deinit(self: *Self, allocator: std.mem.Allocator) void {
    allocator.free(self.buffer);
    allocator.destroy(self);
}

// Caller:
const sensor = try Bme280Sensor.init(allocator, config);
defer sensor.deinit(allocator);
```

**Rule 3: Use `std.testing.allocator` in tests.** It detects leaks.

```zig
test "bme280_init_deinit_no_leak" {
    const sensor = try Bme280Sensor.init(std.testing.allocator, test_config);
    defer sensor.deinit(std.testing.allocator);
    // ... test logic ...
}
```

**Rule 4: No allocations in ISRs or time-critical paths.** Pre-allocate all buffers during init. Use ring buffers (fixed size, no allocation) for ISR-to-main communication.

**Rule 5: Prefer stack allocation.** If the lifetime is the current scope, allocate on the stack.

```zig
// CORRECT — stack buffer for temporary sensor read
var buf: [6]u8 = undefined;
try self.i2c.read_register(self.addr, REG_DATA, &buf);

// WRONG — heap allocation for temporary use
const buf = try allocator.alloc(u8, 6);
defer allocator.free(buf);
```

**Rule 6: Arena allocators for grouped lifetimes.** When many allocations share a lifetime (e.g., a request/response cycle), use an arena allocator and free everything at once.

### Error Handling

**Rule: Error unions everywhere. Never `@panic` in production code.**

```zig
// CORRECT — return error
pub fn read_temperature(self: *Self) !f32 {
    const raw = self.i2c.read_register(self.addr, REG_TEMP, &buf) catch |err| {
        self.consecutive_errors += 1;
        return err;
    };
    return compensate_temperature(raw);
}

// WRONG — panic on error
pub fn read_temperature(self: *Self) f32 {
    const raw = self.i2c.read_register(self.addr, REG_TEMP, &buf) catch @panic("I2C read failed"); // NO
    return compensate_temperature(raw);
}
```

**`@panic` is permitted only in:**
- Test code (`test "..." { ... }`)
- `unreachable` branches that are provably unreachable (e.g., after exhaustive switch)
- Debug/development builds (gated behind `@import("builtin").mode == .Debug`)

**Error sets are explicit and documented:**

```zig
pub const SensorError = error{
    I2cNack,          // Sensor did not acknowledge address
    I2cBusBusy,       // I2C bus held low (possible short or hung device)
    InvalidCalibration, // Calibration data failed checksum
    ReadTimeout,       // Sensor did not produce data within expected time
    OutOfRange,        // Reading outside physically plausible range
};
```

---

## Python Standards

All Python code runs on the Raspberry Pi application layer. It orchestrates AI inference, manages the voice pipeline, communicates with BabyAI, and runs high-level behavior logic.

### Naming Conventions

| Element | Convention | Example |
|---------|-----------|---------|
| Functions | snake_case | `read_sensor`, `start_inference`, `phone_home` |
| Variables | snake_case | `sensor_data`, `model_name`, `is_online` |
| Classes | PascalCase | `BabyAiClient`, `VoicePipeline`, `TelemetryService` |
| Constants | SCREAMING_SNAKE_CASE | `MAX_RETRIES`, `DEFAULT_MQTT_PORT`, `BABYAI_ENDPOINT` |
| Modules / files | snake_case.py | `babyai_client.py`, `voice_pipeline.py`, `telemetry.py` |
| Private | leading underscore | `_internal_buffer`, `_parse_response` |
| Type aliases | PascalCase | `SensorReading = dict[str, float]` |

### Type Hints

**Required on all function signatures. No exceptions.**

```python
# CORRECT
def read_sensor(sensor_id: str, timeout_ms: int = 1000) -> SensorReading | None:
    ...

# WRONG — missing type hints
def read_sensor(sensor_id, timeout_ms=1000):
    ...
```

**Use `mypy --strict` for type checking.** All code must pass with zero errors.

Common type patterns:

```python
from typing import Any
from collections.abc import Sequence, Mapping, AsyncIterator

# Use built-in generics (Python 3.12+)
def process_readings(readings: list[SensorReading]) -> dict[str, float]:
    ...

# Use | for unions (Python 3.10+)
def get_value(key: str) -> str | int | None:
    ...

# Async generators
async def stream_inference(prompt: str) -> AsyncIterator[str]:
    ...
```

### Data Structures

**Use dataclasses for simple data containers. Use Pydantic for validated configuration.**

```python
from dataclasses import dataclass, field
from pydantic import BaseModel, Field

# Simple data — dataclass
@dataclass(frozen=True)
class SensorReading:
    sensor_id: str
    value: float
    timestamp: float
    is_stale: bool = False

# Validated configuration — Pydantic
class DeviceConfig(BaseModel):
    device_id: str = Field(min_length=1, max_length=64)
    mqtt_broker: str = "localhost"
    mqtt_port: int = Field(default=8883, ge=1, le=65535)
    babyai_endpoint: str = "https://novasynchris-babyai.hf.space"
    phone_home_interval_s: int = Field(default=60, ge=10)
    privacy_level: str = Field(default="standard", pattern=r"^(minimal|standard|full)$")
```

### Async/Await

**All I/O-bound operations must be async.** This includes network calls, file operations, and hardware polling from Python.

```python
import asyncio
import aiohttp

# CORRECT — async I/O
async def phone_home(client: aiohttp.ClientSession, payload: dict[str, Any]) -> bool:
    try:
        async with client.post(BABYAI_ENDPOINT, json=payload, timeout=aiohttp.ClientTimeout(total=10)) as resp:
            return resp.status == 200
    except (aiohttp.ClientError, asyncio.TimeoutError):
        return False

# WRONG — blocking I/O in async context
async def phone_home_bad(payload: dict[str, Any]) -> bool:
    import requests  # NO — blocking library
    resp = requests.post(BABYAI_ENDPOINT, json=payload)
    return resp.status_code == 200
```

### Context Managers for Hardware

**Hardware resources must be acquired and released via context managers.**

```python
from contextlib import asynccontextmanager
from collections.abc import AsyncIterator

@asynccontextmanager
async def open_gpio(pin: int, mode: str = "output") -> AsyncIterator[GpioPin]:
    gpio = GpioPin(pin, mode)
    try:
        await gpio.setup()
        yield gpio
    finally:
        await gpio.cleanup()  # ALWAYS release, even on exception

# Usage:
async with open_gpio(GPIO_SERVO_PAN, mode="pwm") as servo_pin:
    await servo_pin.set_duty_cycle(0.075)  # Center position
```

### Logging

**Use `structlog` for all logging. Structured, JSON-serializable.**

```python
import structlog

log = structlog.get_logger()

# CORRECT — structured logging
log.info("sensor_read", sensor_id="bme280", temperature=22.5, humidity=45.0)
log.warning("sensor_stale", sensor_id="vl53l0x", last_read_ms=5200, max_staleness_ms=2000)
log.error("mqtt_publish_failed", topic="novasyn/device01/sensors/temp", error=str(e))

# WRONG — unstructured string formatting
logger.info(f"Read temperature: {temp} from sensor {sensor_id}")  # NO
```

### Prohibited Patterns

```python
# NO bare except
try:
    result = await read_sensor()
except:  # NO — catches SystemExit, KeyboardInterrupt
    pass

# YES — specific exceptions
try:
    result = await read_sensor()
except (SensorError, TimeoutError) as e:
    log.error("sensor_read_failed", error=str(e))
    result = None

# NO global mutable state
_global_config = {}  # NO

# YES — pass state explicitly
class SensorService:
    def __init__(self, config: DeviceConfig) -> None:
        self._config = config
```

---

## Pin Definitions

Pin constants are the bridge between software and physical wiring. Errors here cause hardware damage or mysterious failures. Absolute precision is required.

### Naming Convention

All pin constants use SCREAMING_SNAKE_CASE with a prefix indicating the interface type:

```python
# Pin definitions — board: Raspberry Pi 5
# Physical connector: J8 (40-pin GPIO header)

# I2C Bus 1
I2C1_SDA = 2        # J8 pin 3, BCM2, I2C1 data
I2C1_SCL = 3        # J8 pin 5, BCM3, I2C1 clock

# SPI Bus 0
SPI0_MOSI = 10      # J8 pin 19, BCM10, SPI0 MOSI
SPI0_MISO = 9       # J8 pin 21, BCM9, SPI0 MISO
SPI0_SCLK = 11      # J8 pin 23, BCM11, SPI0 clock
SPI0_CE0 = 8        # J8 pin 24, BCM8, SPI0 chip enable 0

# UART
UART_TX = 14        # J8 pin 8, BCM14, UART0 TX
UART_RX = 15        # J8 pin 10, BCM15, UART0 RX

# PWM — Servo control
GPIO_SERVO_PAN = 18   # J8 pin 12, BCM18, PWM0 channel 0, servo pan axis
GPIO_SERVO_TILT = 19  # J8 pin 35, BCM19, PWM1 channel 1, servo tilt axis

# Digital I/O — Motor direction
GPIO_MOTOR_A_DIR = 23  # J8 pin 16, BCM23, motor A direction
GPIO_MOTOR_B_DIR = 24  # J8 pin 18, BCM24, motor B direction

# Digital I/O — Status LEDs
GPIO_LED_STATUS = 25   # J8 pin 22, BCM25, system status LED
GPIO_LED_ERROR = 7     # J8 pin 26, BCM7, error indicator LED

# ADC (via external ADS1115 on I2C)
ADC_SOIL_MOISTURE = 0  # ADS1115 channel 0, capacitive soil sensor
ADC_LIGHT_LEVEL = 1    # ADS1115 channel 1, LDR voltage divider
ADC_BATTERY_VOLTAGE = 2 # ADS1115 channel 2, battery monitor (voltage divider 1:3)
```

Zig equivalent:

```zig
// Pin definitions — board: ESP32-S3-DevKitC-1
// Reference: Espressif ESP32-S3-DevKitC-1 schematic v1.1

pub const Pin = struct {
    // I2C Bus 0
    pub const I2C0_SDA: u8 = 8;   // GPIO8, I2C0 data
    pub const I2C0_SCL: u8 = 9;   // GPIO9, I2C0 clock

    // SPI Bus 2 (HSPI)
    pub const SPI2_MOSI: u8 = 11;  // GPIO11, SPI2 MOSI
    pub const SPI2_MISO: u8 = 13;  // GPIO13, SPI2 MISO
    pub const SPI2_SCLK: u8 = 12;  // GPIO12, SPI2 clock
    pub const SPI2_CS_LORA: u8 = 10; // GPIO10, SPI2 CS for LoRa radio (SX1276)

    // I2S — Audio
    pub const I2S_BCLK: u8 = 16;   // GPIO16, I2S bit clock
    pub const I2S_WS: u8 = 17;     // GPIO17, I2S word select (L/R)
    pub const I2S_DIN: u8 = 15;    // GPIO15, I2S data in (from INMP441 mic)
    pub const I2S_DOUT: u8 = 18;   // GPIO18, I2S data out (to MAX98357A amp)

    // PWM — Motor control
    pub const PWM_MOTOR_A: u8 = 38; // GPIO38, LEDC PWM channel 0, motor A speed
    pub const PWM_MOTOR_B: u8 = 39; // GPIO39, LEDC PWM channel 1, motor B speed

    // Digital I/O
    pub const MOTOR_A_DIR: u8 = 40; // GPIO40, motor A direction
    pub const MOTOR_B_DIR: u8 = 41; // GPIO41, motor B direction
    pub const LED_STATUS: u8 = 48;  // GPIO48, onboard RGB LED (WS2812B, active high)

    // ADC — Analog sensors
    pub const ADC_SOIL: u8 = 1;     // GPIO1, ADC1 channel 0, soil moisture
    pub const ADC_LIGHT: u8 = 2;    // GPIO2, ADC1 channel 1, light sensor
    pub const ADC_BATT: u8 = 3;     // GPIO3, ADC1 channel 2, battery voltage (1:3 divider)

    // LoRa radio control
    pub const LORA_RST: u8 = 42;    // GPIO42, LoRa radio reset (active low)
    pub const LORA_DIO0: u8 = 21;   // GPIO21, LoRa DIO0 (RX done / TX done interrupt)
};
```

### Rules

1. **Never hardcode pins in driver code.** Drivers receive pin numbers from configuration. The pin definition module is the single source of truth.
2. **Every pin constant has a comment** with: physical connector/GPIO number, alternate function name, and what it connects to.
3. **Pin definitions are grouped by interface type** (I2C, SPI, UART, PWM, digital I/O, ADC) within the config module.
4. **One pin definition file per board variant.** `pins_rpi5.py`, `pins_esp32s3_devkit.zig`, `pins_stm32f446_nucleo.zig`. The build system or runtime config selects the correct file.
5. **Pin conflicts are compile-time/startup errors.** If two drivers claim the same pin, the system refuses to start. The config module validates uniqueness.

---

## File Organization

### Zig Firmware Project

```
firmware/
├── build.zig              — Build system entry point. Target detection, HAL selection,
│                            cross-compilation configuration.
├── build.zig.zon          — Package dependencies (if any).
├── src/
│   ├── main.zig           — Entry point. Init sequence: HAL → drivers → services → main loop.
│   ├── config.zig         — Configuration loading (compile-time defaults + flash KV overrides).
│   ├── hal/               — Hardware Abstraction Layer (one implementation per target)
│   │   ├── gpio.zig       — GPIO vtable interface + platform implementations.
│   │   ├── i2c.zig        — I2C vtable interface + platform implementations.
│   │   ├── spi.zig        — SPI vtable interface + platform implementations.
│   │   ├── uart.zig       — UART vtable interface + platform implementations.
│   │   ├── pwm.zig        — PWM vtable interface + platform implementations.
│   │   ├── adc.zig        — ADC vtable interface + platform implementations.
│   │   └── timer.zig      — Hardware timers, watchdog configuration.
│   ├── drivers/           — Sensor/actuator drivers (portable across platforms)
│   │   ├── bme280.zig     — BME280 temp/humidity/pressure (I2C).
│   │   ├── vl53l0x.zig    — VL53L0X time-of-flight distance (I2C).
│   │   ├── mpu6050.zig    — MPU6050 6-axis IMU (I2C).
│   │   ├── servo.zig      — Generic servo via PCA9685 (I2C → PWM).
│   │   ├── stepper.zig    — Stepper motor via A4988/TMC2209 (GPIO step/dir).
│   │   └── neopixel.zig   — WS2812B LED strip (SPI bit-bang or hardware PIO).
│   ├── services/          — Higher-level application logic
│   │   ├── sensor_fusion.zig   — Aggregate and filter multi-sensor data.
│   │   ├── motor_control.zig   — PID loops, trajectory planning, safety watchdogs.
│   │   ├── audio.zig           — I2S audio capture/playback management.
│   │   └── watchdog.zig        — Software watchdog supervisor for all services.
│   └── comms/             — Communication protocols
│       ├── mqtt.zig       — MQTT 5.0 client (pub/sub, QoS, retained messages).
│       ├── ble.zig        — BLE GATT server (configuration, status advertising).
│       ├── lora.zig       — LoRa radio driver + mesh protocol.
│       └── serial_cmd.zig — USB/UART command protocol (RPi ↔ MCU brain-body link).
├── tests/
│   ├── hal/               — HAL mock implementations for host-target testing.
│   │   └── mock_i2c.zig
│   ├── drivers/           — Driver unit tests (using mock HAL).
│   │   └── bme280_test.zig
│   └── integration/       — Integration tests (require real hardware or emulator).
│       └── i2c_scan_test.zig
└── boards/                — Board-specific pin definitions and initialization
    ├── rpi5.zig           — Raspberry Pi 5 pin map and HAL wiring.
    ├── esp32s3_devkit.zig — ESP32-S3-DevKitC-1 pin map and HAL wiring.
    ├── stm32f446_nucleo.zig — STM32F446RE Nucleo pin map and HAL wiring.
    └── sim_host.zig       — Simulated hardware for x86_64 host testing.
```

**Key conventions:**

- `hal/` files define the vtable interface at the top, then `pub const LinuxImpl`, `pub const Esp32Impl`, etc. below. Comptime target detection selects the correct impl.
- `drivers/` files depend ONLY on `hal/` interfaces. They never import platform-specific code.
- `services/` files depend on `drivers/` and `comms/`. They contain the application logic.
- `boards/` files wire together the HAL, drivers, and pin definitions for a specific physical board. `main.zig` imports the board file selected at build time.

### Python Application Project

```
novasyn-device/
├── pyproject.toml          — Project metadata, dependencies, tool config (mypy, ruff, pytest).
├── uv.lock                 — Locked dependency versions. Committed to git.
├── src/
│   └── novasyn_device/
│       ├── __init__.py     — Package version, public API exports.
│       ├── main.py         — Entry point. Async event loop, service orchestration.
│       ├── config.py       — Pydantic settings: DeviceConfig, loaded from env/file/defaults.
│       ├── ai/             — AI inference and BabyAI integration
│       │   ├── __init__.py
│       │   ├── inference.py      — Ollama client, ONNX runtime, model management.
│       │   ├── babyai_client.py  — BabyAI API client (phone-home, feedback, telemetry).
│       │   └── voice_pipeline.py — Whisper STT → LLM → Piper TTS pipeline.
│       ├── hardware/       — Hardware interface layer (wraps RPi.GPIO, ALSA, etc.)
│       │   ├── __init__.py
│       │   ├── gpio.py     — GPIO context managers, pin validation.
│       │   ├── camera.py   — libcamera / OpenCV capture.
│       │   └── audio.py    — ALSA/PipeWire audio capture and playback.
│       ├── services/       — Application-level services
│       │   ├── __init__.py
│       │   ├── behavior.py     — Device behavior state machine (idle, listening, responding, acting).
│       │   ├── telemetry.py    — Telemetry collection, buffering, and upload.
│       │   └── ota.py          — Over-the-air update manager (check, download, verify, apply).
│       └── comms/          — Network communication
│           ├── __init__.py
│           ├── mqtt_client.py  — asyncio MQTT client (aiomqtt wrapper).
│           └── websocket.py    — WebSocket client for BabyAI streaming.
├── tests/
│   ├── conftest.py         — Shared fixtures (mock hardware, test config).
│   ├── test_babyai_client.py
│   ├── test_voice_pipeline.py
│   ├── test_telemetry.py
│   └── test_behavior.py
├── boards/
│   ├── pins_rpi5.py        — Pin definitions for Raspberry Pi 5.
│   ├── pins_rpi4.py        — Pin definitions for Raspberry Pi 4.
│   └── pins_sim.py         — Simulated pins for development host testing.
└── scripts/
    ├── provision.sh         — First-time device setup (OS config, deps, systemd units).
    ├── deploy.sh            — Deploy updated code to a device via SSH.
    └── flash_mcu.sh         — Flash MCU firmware via USB (zig build + upload).
```

**Key conventions:**

- `hardware/` modules are thin wrappers around system libraries. They provide context managers and async interfaces. They do not contain business logic.
- `ai/` modules handle all inference-related logic. The voice pipeline is a composed service (STT → inference → TTS), not a monolith.
- `services/` modules contain the application behavior. They depend on `hardware/`, `ai/`, and `comms/`. They are testable with mock dependencies.
- `boards/` contains pin definitions. The correct board file is selected via `DeviceConfig.board` setting.
- `scripts/` contains operational scripts. They are not part of the Python package.

---

## Comment Standards

### Zig Comments

```zig
/// Reads temperature, humidity, and pressure from the BME280 sensor.
///
/// Performs a forced-mode measurement, waits for completion, then reads
/// all three values in a single I2C burst read (registers 0xF7-0xFE).
///
/// Returns `SensorError.ReadTimeout` if the sensor does not complete
/// measurement within 50ms (max per datasheet Table 1, oversampling x16).
pub fn read_all(self: *Self) SensorError!Bme280Reading {
    // Trigger forced-mode measurement (register 0xF4, mode bits [1:0] = 0b01)
    try self.i2c.write_register(self.addr, REG_CTRL_MEAS, &.{self.ctrl_meas_forced});

    // BME280 requires up to 44ms for measurement with max oversampling
    // (datasheet §9.1, Table 14: t_measure = 1.25 + 2.3*T_os + 2.3*P_os + 0.575 + 2.3*H_os)
    var attempts: u8 = 0;
    while (attempts < 10) : (attempts += 1) {
        std.time.sleep(5 * std.time.ns_per_ms); // 5ms polling interval
        const status = try self.i2c.read_register(self.addr, REG_STATUS, &status_buf);
        if (status_buf[0] & 0x08 == 0) break; // Bit 3: measuring flag
    } else {
        return SensorError.ReadTimeout;
    }

    // Burst read 8 bytes: press[19:12], press[11:4], press[3:0],
    //                      temp[19:12], temp[11:4], temp[3:0],
    //                      hum[15:8], hum[7:0]
    // (registers 0xF7-0xFE, datasheet §5.3.5)
    try self.i2c.read_register(self.addr, REG_DATA_START, &raw_buf);

    return self.compensate(raw_buf);
}
```

**Rules:**

- `///` doc comments on all `pub` functions and types. These form the API documentation.
- `//` inline comments for WHY decisions, not WHAT the code does (the code shows WHAT).
- **Hardware-specific comments always include**: part number, datasheet section/table/figure reference, and any timing constraints.
- **Register access comments include**: register address, bit field positions, and the meaning of the value being written/read.

### Python Docstrings

Google-style docstrings on all public functions and classes.

```python
async def phone_home(
    self,
    readings: list[SensorReading],
    inference_log: list[InferenceEvent],
) -> PhoneHomeResult:
    """Send buffered telemetry and learning data to BabyAI.

    Batches sensor readings and inference events into a single payload,
    compresses with gzip, and POSTs to the BabyAI telemetry endpoint.
    Idempotent — safe to retry on failure (server deduplicates by
    device_id + sequence_number).

    Args:
        readings: Sensor readings buffered since last successful phone-home.
        inference_log: Local inference events with prompt/response/latency.

    Returns:
        PhoneHomeResult with status, accepted count, and any server directives
        (e.g., updated skill docs, config changes).

    Raises:
        NetworkUnavailableError: If no connectivity and retry budget exhausted.
    """
```

**Rules:**

- Docstrings on all public functions and classes. Private functions get docstrings if the logic is non-obvious.
- Type hints replace most parameter type documentation. The docstring describes semantics, not types.
- Keep docstrings focused: one summary line, then details only if needed.

### Hardware-Specific Comments

**Every hardware interaction must be traceable to a datasheet.**

```zig
// BME280 requires 2ms standby between forced measurements (datasheet §3.3.1, Table 2)
```

```python
# VL53L0X: timing budget 200ms gives ±3% accuracy at max range
# (datasheet UM2039, §2.5.2, Figure 7)
```

```zig
// TMC2209: StallGuard threshold = 50 (register 0x41, SGTHRS[7:0])
// Lower = more sensitive. Tuned empirically for NEMA17 1.8° at 200rpm.
// Datasheet: Trinamic TMC2209-LA, §6.3.3
```

### Pin Comments

**Every pin constant includes physical connector reference.**

```python
GPIO_SERVO_PAN = 18  # J8 pin 12, BCM18, PWM0 channel 0, connected to pan servo signal wire
```

```zig
pub const I2S_BCLK: u8 = 16;  // GPIO16, ESP32-S3-DevKitC-1 pin J3-16, I2S0 bit clock, to INMP441 SCK
```

The comment format is: `// <GPIO designation>, <physical pin/connector>, <alternate function>, <connected to what>`

---

## Testing Standards

### Zig Tests

```zig
// Tests are colocated in the same file or in tests/ directory.
// Use std.testing.allocator (leak-detecting) for all allocations.
// Mock HAL implementations live in tests/hal/.

test "bme280_returns_error_on_i2c_nack" {
    var mock_i2c = MockI2c.init(.{ .nack_on_address = 0x76 });
    var sensor = try Bme280Sensor.init(std.testing.allocator, .{
        .i2c = mock_i2c.bus(),
        .address = 0x76,
    });
    defer sensor.deinit(std.testing.allocator);

    const result = sensor.read_all();
    try std.testing.expectError(SensorError.I2cNack, result);
}

test "servo_clamps_angle_to_configured_range" {
    var mock_pwm = MockPwm.init(.{});
    var servo = try ServoDriver.init(std.testing.allocator, .{
        .pwm = mock_pwm.channel(),
        .min_angle = 0,
        .max_angle = 180,
        .min_pulse_us = 500,
        .max_pulse_us = 2500,
    });
    defer servo.deinit(std.testing.allocator);

    // Request beyond max — should clamp, not error
    try servo.set_angle(200);
    try std.testing.expectEqual(@as(u16, 2500), mock_pwm.last_pulse_us);
}
```

**Naming**: `test "subject_expected_behavior"` — the test name is a specification.

### Python Tests

```python
# tests/test_babyai_client.py

import pytest
from unittest.mock import AsyncMock, patch
from novasyn_device.ai.babyai_client import BabyAiClient
from novasyn_device.config import DeviceConfig

@pytest.fixture
def client() -> BabyAiClient:
    config = DeviceConfig(device_id="test-001", babyai_endpoint="http://localhost:8080")
    return BabyAiClient(config)

@pytest.mark.asyncio
async def test_phone_home_retries_on_timeout(client: BabyAiClient) -> None:
    """Phone-home retries up to max_retries on timeout, then raises."""
    with patch.object(client, "_post", new_callable=AsyncMock) as mock_post:
        mock_post.side_effect = TimeoutError("connection timed out")
        with pytest.raises(NetworkUnavailableError):
            await client.phone_home(readings=[], inference_log=[])
        assert mock_post.call_count == client.config.max_retries

@pytest.mark.asyncio
async def test_phone_home_succeeds_on_second_retry(client: BabyAiClient) -> None:
    """Phone-home succeeds after one transient failure."""
    with patch.object(client, "_post", new_callable=AsyncMock) as mock_post:
        mock_post.side_effect = [TimeoutError(), PhoneHomeResult(status="ok", accepted=5)]
        result = await client.phone_home(readings=[mock_reading()] * 5, inference_log=[])
        assert result.accepted == 5
```

**Naming**: `test_subject_expected_behavior` — mirrors the Zig convention in Python style.

---

## Linting & Formatting

| Language | Formatter | Linter | Config |
|----------|-----------|--------|--------|
| Zig | `zig fmt` (built-in) | `zig build test` (compiler warnings are errors) | None needed — `zig fmt` is canonical. |
| Python | `ruff format` | `ruff check` + `mypy --strict` | `pyproject.toml` `[tool.ruff]` and `[tool.mypy]` sections. |

**All code must pass formatting and linting before commit.** No exceptions. CI enforces this.

```toml
# pyproject.toml excerpt
[tool.ruff]
target-version = "py312"
line-length = 100

[tool.ruff.lint]
select = ["E", "F", "W", "I", "N", "UP", "ANN", "B", "A", "SIM", "TCH", "RUF"]
ignore = ["ANN101"]  # self type annotation not required

[tool.mypy]
python_version = "3.12"
strict = true
warn_return_any = true
warn_unused_configs = true
```
