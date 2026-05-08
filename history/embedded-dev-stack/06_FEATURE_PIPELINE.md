# 06 — Feature Development Pipeline

This is the embedded equivalent of the NovaSyn Windows stack's 10-step schema-first pipeline. In the Windows stack, every feature starts with SQL schema. In embedded, every feature starts with **hardware specification and pin mapping**. The discipline is identical: define the contract first, then implement layer by layer.

---

## The 10-Step Pipeline

```
┌─────────────────────────────────────────────────────────┐
│  1. Hardware Requirements    ← the "schema" of embedded │
│  2. HAL Interface            ← abstract the hardware    │
│  3. Driver Implementation    ← portable business logic  │
│  4. Configuration Schema     ← device.json additions    │
│  5. Service Integration      ← wire into the system     │
│  6. Communication Protocol   ← MQTT topics & messages   │
│  7. Application Logic        ← behavior & interaction   │
│  8. BabyAI Integration       ← feed the flywheel        │
│  9. Test Suite               ← unit, integration, HIL   │
│ 10. Deployment Manifest      ← OTA, migration, rollback │
└─────────────────────────────────────────────────────────┘
```

**Rule**: Never skip a step. Never start implementation (step 3) before the interface is defined (step 2). Never define MQTT topics (step 6) before the service layer exists (step 5). The pipeline is sequential and each step's output is the next step's input.

---

## Step 1: Hardware Requirements

**Purpose**: Define the physical contract. What hardware does this feature need, how is it wired, and what are its constraints?

**Output**: A section in `HARDWARE_SPEC.md` (or a new file if the feature is complex enough).

**Required Information**:

| Field | Description | Example |
|---|---|---|
| Peripheral | What IC/sensor/actuator | BME280 |
| Interface | I2C, SPI, UART, GPIO | I2C @ 0x76 |
| Pins | Exact GPIO assignments | SDA=GPIO2, SCL=GPIO3 |
| Voltage | Operating voltage and logic level | 3.3V, 3.3V logic |
| Current Draw | Active, idle, and peak | 3.6mA active, 0.1uA sleep |
| Polling Rate | How often to read/write | Every 5 seconds |
| Response Time | Max latency for reads | <40ms per measurement |
| Physical Mounting | Where on the device | On main PCB, vented to ambient air |
| Dependencies | Other peripherals needed | Shared I2C bus with display |

**Template for HARDWARE_SPEC.md section**:

```markdown
## BME280 Temperature/Humidity/Pressure Sensor

- **IC**: Bosch BME280
- **Interface**: I2C, address 0x76 (SDO to GND) or 0x77 (SDO to VCC)
- **Pins**: SDA → GPIO2 (pin 3), SCL → GPIO3 (pin 5)
- **Voltage**: 1.71V–3.6V operating, 3.3V from RPi rail
- **Current**: 3.6mA during measurement, 0.1uA in sleep mode
- **Polling**: Every 5 seconds (configurable, minimum 1s)
- **Response Time**: Forced measurement ~40ms (16x oversampling all channels)
- **Mounting**: Main PCB, near vent holes, away from heat sources (RPi SoC, power regulator)
- **Bus Sharing**: Shares I2C0 with SSD1306 OLED display (different address 0x3C)
- **Datasheet**: https://www.bosch-sensortec.com/media/boschsensortec/downloads/datasheets/bst-bme280-ds002.pdf
```

**Key Discipline**: Measure the power budget. If the device is battery-powered, every milliamp matters. Sum all peripherals and verify the total fits within the power profile.

---

## Step 2: HAL Interface

**Purpose**: Define the abstract interface that the driver will program against. The driver never touches hardware registers directly — it calls HAL functions. This makes the driver portable across RPi, ESP32, STM32, and simulation.

**Output**: A Zig interface file in `src/hal/` (or extension of an existing interface).

**HAL Design Rules**:
- Every HAL interface is a vtable (Zig tagged union or function pointer struct)
- Every operation returns an error union (`!void`, `!u16`, etc.)
- Every interface has `init()` and `deinit()` lifecycle methods
- Timing delays are HAL-provided (not `std.time.sleep` — the HAL knows the platform)
- No platform-specific types leak through the interface

**Standard HAL interfaces**:

```
src/hal/
├── i2c.zig          // I2C bus read/write/writeRead
├── spi.zig          // SPI transfer/read/write
├── uart.zig         // UART send/receive
├── gpio.zig         // GPIO input/output/interrupt
├── timer.zig        // Delay, periodic timer, timestamps
├── adc.zig          // ADC read (for analog sensors on MCU)
└── platform.zig     // Platform detection, capabilities
```

**I2C HAL Interface Example**:

```zig
// src/hal/i2c.zig

pub const I2cError = error{
    BusError,
    NackReceived,
    ArbitrationLost,
    Timeout,
    InvalidAddress,
};

pub const I2c = struct {
    ptr: *anyopaque,
    vtable: *const VTable,

    pub const VTable = struct {
        write: *const fn (ctx: *anyopaque, addr: u7, data: []const u8) I2cError!void,
        read: *const fn (ctx: *anyopaque, addr: u7, buf: []u8) I2cError!usize,
        write_read: *const fn (
            ctx: *anyopaque,
            addr: u7,
            write_data: []const u8,
            read_buf: []u8,
        ) I2cError!usize,
    };

    pub fn write(self: I2c, addr: u7, data: []const u8) I2cError!void {
        return self.vtable.write(self.ptr, addr, data);
    }

    pub fn read(self: I2c, addr: u7, buf: []u8) I2cError!usize {
        return self.vtable.read(self.ptr, addr, buf);
    }

    pub fn writeRead(
        self: I2c,
        addr: u7,
        write_data: []const u8,
        read_buf: []u8,
    ) I2cError!usize {
        return self.vtable.write_read(self.ptr, addr, write_data, read_buf);
    }
};
```

**New Feature HAL Checklist**:
- [ ] Does this feature need a new HAL interface, or does it use existing ones?
- [ ] If new: define the vtable with all required operations
- [ ] Define the error set (be specific — not just `GenericError`)
- [ ] Define init/deinit lifecycle
- [ ] Create mock implementation for testing (step 9 depends on this)

---

## Step 3: Driver Implementation

**Purpose**: Write the portable driver that implements the feature's logic using only HAL interfaces. This is the core of the feature — the part that reads datasheets and translates them into code.

**Output**: `src/drivers/<name>.zig` with embedded tests.

**Driver Rules**:
- Import only from `src/hal/`, `src/config/`, and `std`
- Never import platform-specific code
- All timing values come from datasheet, referenced in comments
- All register addresses are named constants, not magic numbers
- Error handling is explicit — every HAL call's error is handled or propagated
- Include `comptime` validation where possible (e.g., validate config ranges)

**Driver Structure Template**:

```zig
// src/drivers/bme280.zig

const std = @import("std");
const hal = @import("../hal/i2c.zig");
const timer = @import("../hal/timer.zig");

// --- Register Map (BME280 Datasheet Section 5.3) ---
const REG_CHIP_ID = 0xD0;
const REG_CTRL_HUM = 0xF2;
const REG_STATUS = 0xF3;
const REG_CTRL_MEAS = 0xF4;
const REG_CONFIG = 0xF5;
const REG_PRESS_MSB = 0xF7;
const REG_CALIB_00 = 0x88;  // calibration data block 1 (0x88–0xA1)
const REG_CALIB_26 = 0xE1;  // calibration data block 2 (0xE1–0xF0)

const CHIP_ID_BME280 = 0x60;

// --- Oversampling Modes (Datasheet Table 20) ---
pub const Oversampling = enum(u3) {
    skip = 0,
    x1 = 1,
    x2 = 2,
    x4 = 3,
    x8 = 4,
    x16 = 5,
};

// --- Configuration ---
pub const Config = struct {
    i2c_address: u7 = 0x76,
    temp_oversampling: Oversampling = .x16,
    hum_oversampling: Oversampling = .x16,
    press_oversampling: Oversampling = .x16,
};

// --- Calibration Data (Datasheet Section 4.2.2) ---
const CalibrationData = struct {
    dig_t1: u16,
    dig_t2: i16,
    dig_t3: i16,
    dig_p1: u16,
    dig_p2: i16,
    dig_p3: i16,
    dig_p4: i16,
    dig_p5: i16,
    dig_p6: i16,
    dig_p7: i16,
    dig_p8: i16,
    dig_p9: i16,
    dig_h1: u8,
    dig_h2: i16,
    dig_h3: u8,
    dig_h4: i16,
    dig_h5: i16,
    dig_h6: i8,
};

// --- Reading Result ---
pub const Reading = struct {
    temperature_c: f32,     // degrees Celsius
    humidity_pct: f32,      // relative humidity percentage
    pressure_pa: f32,       // pressure in Pascals
    timestamp_ms: u64,      // reading timestamp
};

// --- Driver ---
pub const Bme280 = struct {
    i2c: hal.I2c,
    delay: timer.Timer,
    config: Config,
    calibration: CalibrationData,
    t_fine: i32,  // shared between temperature and pressure compensation

    pub fn init(i2c: hal.I2c, delay: timer.Timer, config: Config) !Bme280 {
        var self = Bme280{
            .i2c = i2c,
            .delay = delay,
            .config = config,
            .calibration = undefined,
            .t_fine = 0,
        };

        // Verify chip ID (Datasheet Section 5.3, register 0xD0)
        const chip_id = try self.readRegister(REG_CHIP_ID);
        if (chip_id != CHIP_ID_BME280) {
            return error.InvalidChipId;
        }

        // Soft reset (Datasheet Section 5.3, register 0xE0)
        try self.writeRegister(0xE0, 0xB6);
        // Wait 2ms for reset (Datasheet Section 1, startup time)
        try self.delay.delayMs(2);

        // Read calibration data
        self.calibration = try self.readCalibration();

        // Configure oversampling
        // Humidity must be written before ctrl_meas (Datasheet Section 5.4.3)
        try self.writeRegister(REG_CTRL_HUM, @intFromEnum(config.hum_oversampling));
        try self.writeRegister(REG_CTRL_MEAS,
            (@as(u8, @intFromEnum(config.temp_oversampling)) << 5) |
            (@as(u8, @intFromEnum(config.press_oversampling)) << 2) |
            0b00  // sleep mode — we use forced mode per reading
        );

        return self;
    }

    pub fn deinit(self: *Bme280) void {
        // Put sensor to sleep mode
        self.writeRegister(REG_CTRL_MEAS, 0b00) catch {};
    }

    /// Trigger a single measurement and return the result.
    /// Forced mode: sensor measures once, then returns to sleep.
    /// Measurement time depends on oversampling (Datasheet Table 16).
    pub fn read(self: *Bme280) !Reading {
        // Trigger forced measurement
        const ctrl_meas =
            (@as(u8, @intFromEnum(self.config.temp_oversampling)) << 5) |
            (@as(u8, @intFromEnum(self.config.press_oversampling)) << 2) |
            0b01; // forced mode
        try self.writeRegister(REG_CTRL_MEAS, ctrl_meas);

        // Wait for measurement to complete
        // Max measurement time with 16x oversampling: ~40ms (Datasheet Appendix B)
        try self.delay.delayMs(45);

        // Poll status register until measuring bit clears
        var attempts: u8 = 0;
        while (attempts < 10) : (attempts += 1) {
            const status = try self.readRegister(REG_STATUS);
            if (status & 0x08 == 0) break; // bit 3 = measuring
            try self.delay.delayMs(5);
        }

        // Read raw data (8 bytes: press[3] + temp[3] + hum[2])
        var raw_data: [8]u8 = undefined;
        _ = try self.i2c.writeRead(
            self.config.i2c_address,
            &[_]u8{REG_PRESS_MSB},
            &raw_data,
        );

        const raw_press = (@as(i32, raw_data[0]) << 12) |
                          (@as(i32, raw_data[1]) << 4) |
                          (@as(i32, raw_data[2]) >> 4);
        const raw_temp = (@as(i32, raw_data[3]) << 12) |
                         (@as(i32, raw_data[4]) << 4) |
                         (@as(i32, raw_data[5]) >> 4);
        const raw_hum = (@as(i32, raw_data[6]) << 8) |
                        @as(i32, raw_data[7]);

        // Compensate using calibration data (Datasheet Section 4.2.3)
        const temp = self.compensateTemperature(raw_temp);
        const press = self.compensatePressure(raw_press);
        const hum = self.compensateHumidity(raw_hum);

        return Reading{
            .temperature_c = temp,
            .humidity_pct = hum,
            .pressure_pa = press,
            .timestamp_ms = try self.delay.millis(),
        };
    }

    // --- Private Helpers ---

    fn readRegister(self: *Bme280, reg: u8) !u8 {
        var buf: [1]u8 = undefined;
        _ = try self.i2c.writeRead(
            self.config.i2c_address,
            &[_]u8{reg},
            &buf,
        );
        return buf[0];
    }

    fn writeRegister(self: *Bme280, reg: u8, value: u8) !void {
        try self.i2c.write(
            self.config.i2c_address,
            &[_]u8{ reg, value },
        );
    }

    fn readCalibration(self: *Bme280) !CalibrationData {
        // Read calibration block 1 (0x88–0xA1, 26 bytes)
        var block1: [26]u8 = undefined;
        _ = try self.i2c.writeRead(
            self.config.i2c_address,
            &[_]u8{REG_CALIB_00},
            &block1,
        );

        // Read calibration block 2 (0xE1–0xF0, 16 bytes)
        var block2: [7]u8 = undefined;
        _ = try self.i2c.writeRead(
            self.config.i2c_address,
            &[_]u8{REG_CALIB_26},
            &block2,
        );

        return CalibrationData{
            .dig_t1 = @as(u16, block1[1]) << 8 | block1[0],
            .dig_t2 = @bitCast(@as(u16, block1[3]) << 8 | block1[2]),
            .dig_t3 = @bitCast(@as(u16, block1[5]) << 8 | block1[4]),
            .dig_p1 = @as(u16, block1[7]) << 8 | block1[6],
            .dig_p2 = @bitCast(@as(u16, block1[9]) << 8 | block1[8]),
            .dig_p3 = @bitCast(@as(u16, block1[11]) << 8 | block1[10]),
            .dig_p4 = @bitCast(@as(u16, block1[13]) << 8 | block1[12]),
            .dig_p5 = @bitCast(@as(u16, block1[15]) << 8 | block1[14]),
            .dig_p6 = @bitCast(@as(u16, block1[17]) << 8 | block1[16]),
            .dig_p7 = @bitCast(@as(u16, block1[19]) << 8 | block1[18]),
            .dig_p8 = @bitCast(@as(u16, block1[21]) << 8 | block1[20]),
            .dig_p9 = @bitCast(@as(u16, block1[23]) << 8 | block1[22]),
            .dig_h1 = block1[25],
            .dig_h2 = @bitCast(@as(u16, block2[1]) << 8 | block2[0]),
            .dig_h3 = block2[2],
            .dig_h4 = @bitCast(@as(u16, block2[3]) << 4 | (block2[4] & 0x0F)),
            .dig_h5 = @bitCast(@as(u16, block2[5]) << 4 | (block2[4] >> 4)),
            .dig_h6 = @bitCast(block2[6]),
        };
    }

    /// Temperature compensation (Datasheet Section 4.2.3, "compensate_temperature")
    fn compensateTemperature(self: *Bme280, raw: i32) f32 {
        const cal = self.calibration;
        const var1 = ((@as(f64, @floatFromInt(raw)) / 16384.0 -
            @as(f64, @floatFromInt(cal.dig_t1)) / 1024.0)) *
            @as(f64, @floatFromInt(cal.dig_t2));
        const var2 = ((@as(f64, @floatFromInt(raw)) / 131072.0 -
            @as(f64, @floatFromInt(cal.dig_t1)) / 8192.0)) *
            ((@as(f64, @floatFromInt(raw)) / 131072.0 -
            @as(f64, @floatFromInt(cal.dig_t1)) / 8192.0)) *
            @as(f64, @floatFromInt(cal.dig_t3));
        self.t_fine = @intFromFloat(var1 + var2);
        return @floatCast((var1 + var2) / 5120.0);
    }

    /// Pressure compensation (Datasheet Section 4.2.3, "compensate_pressure")
    fn compensatePressure(self: *Bme280, raw: i32) f32 {
        const cal = self.calibration;
        var var1 = @as(f64, @floatFromInt(self.t_fine)) / 2.0 - 64000.0;
        var var2 = var1 * var1 * @as(f64, @floatFromInt(cal.dig_p6)) / 32768.0;
        var2 = var2 + var1 * @as(f64, @floatFromInt(cal.dig_p5)) * 2.0;
        var2 = var2 / 4.0 + @as(f64, @floatFromInt(cal.dig_p4)) * 65536.0;
        var1 = (@as(f64, @floatFromInt(cal.dig_p3)) * var1 * var1 / 524288.0 +
            @as(f64, @floatFromInt(cal.dig_p2)) * var1) / 524288.0;
        var1 = (1.0 + var1 / 32768.0) * @as(f64, @floatFromInt(cal.dig_p1));
        if (var1 == 0.0) return 0.0;
        var p = 1048576.0 - @as(f64, @floatFromInt(raw));
        p = (p - var2 / 4096.0) * 6250.0 / var1;
        var1 = @as(f64, @floatFromInt(cal.dig_p9)) * p * p / 2147483648.0;
        var2 = p * @as(f64, @floatFromInt(cal.dig_p8)) / 32768.0;
        p = p + (var1 + var2 + @as(f64, @floatFromInt(cal.dig_p7))) / 16.0;
        return @floatCast(p);
    }

    /// Humidity compensation (Datasheet Section 4.2.3, "compensate_humidity")
    fn compensateHumidity(self: *Bme280, raw: i32) f32 {
        const cal = self.calibration;
        var h = @as(f64, @floatFromInt(self.t_fine)) - 76800.0;
        h = (@as(f64, @floatFromInt(raw)) -
            (@as(f64, @floatFromInt(cal.dig_h4)) * 64.0 +
            @as(f64, @floatFromInt(cal.dig_h5)) / 16384.0 * h)) *
            (@as(f64, @floatFromInt(cal.dig_h2)) / 65536.0 *
            (1.0 + @as(f64, @floatFromInt(cal.dig_h6)) / 67108864.0 * h *
            (1.0 + @as(f64, @floatFromInt(cal.dig_h3)) / 67108864.0 * h)));
        h = h * (1.0 - @as(f64, @floatFromInt(cal.dig_h1)) * h / 524288.0);
        if (h > 100.0) h = 100.0;
        if (h < 0.0) h = 0.0;
        return @floatCast(h);
    }
};

// --- Tests ---
test "BME280 init detects correct chip ID" {
    var mock = MockI2c.init();
    mock.setRegister(REG_CHIP_ID, CHIP_ID_BME280);
    var mock_timer = MockTimer.init();

    const sensor = try Bme280.init(mock.interface(), mock_timer.interface(), .{});
    _ = sensor;
}

test "BME280 init rejects wrong chip ID" {
    var mock = MockI2c.init();
    mock.setRegister(REG_CHIP_ID, 0xFF); // wrong ID
    var mock_timer = MockTimer.init();

    const result = Bme280.init(mock.interface(), mock_timer.interface(), .{});
    try std.testing.expectError(error.InvalidChipId, result);
}
```

**Driver Checklist**:
- [ ] All register addresses are named constants with datasheet section references
- [ ] init() verifies chip ID or equivalent handshake
- [ ] init() loads calibration data if applicable
- [ ] All HAL errors are propagated with `try`
- [ ] Timing delays reference datasheet values in comments
- [ ] deinit() puts hardware in low-power state
- [ ] Embedded tests use mock HAL implementations

---

## Step 4: Configuration Schema

**Purpose**: Add the new feature's configurable parameters to `device.json`. Every tunable value (pin assignments, polling intervals, thresholds, enable flags) must be in config, not hardcoded.

**Output**: Updated config type in `src/config/config.zig` (for Zig firmware) or `config.py` (for Python application layer).

**Rules**:
- Every configurable value has a sensible default
- Pin assignments always have defaults but can be overridden
- Polling intervals have minimum bounds (prevent bus flooding)
- Enable/disable flag for every optional feature
- Calibration offsets for sensors that need user calibration

**Zig Config Addition**:

```zig
// In src/config/config.zig

pub const Bme280Config = struct {
    enabled: bool = true,
    i2c_bus: u8 = 0,             // which I2C bus (0 or 1 on RPi)
    i2c_address: u7 = 0x76,      // 0x76 (SDO→GND) or 0x77 (SDO→VCC)
    poll_interval_ms: u32 = 5000, // minimum 1000
    temp_offset_c: f32 = 0.0,    // user calibration offset
    hum_offset_pct: f32 = 0.0,   // user calibration offset
    press_offset_pa: f32 = 0.0,  // user calibration offset
    oversampling: u8 = 16,       // 1, 2, 4, 8, or 16
};
```

**device.json Addition**:

```json
{
  "sensors": {
    "bme280": {
      "enabled": true,
      "i2c_bus": 0,
      "i2c_address": "0x76",
      "poll_interval_ms": 5000,
      "temp_offset_c": 0.0,
      "hum_offset_pct": 0.0,
      "press_offset_pa": 0.0,
      "oversampling": 16
    }
  }
}
```

**Validation at Startup**:

```zig
pub fn validate(config: Bme280Config) !void {
    if (config.poll_interval_ms < 1000) return error.PollIntervalTooLow;
    if (config.i2c_address != 0x76 and config.i2c_address != 0x77) return error.InvalidAddress;
    if (!isValidOversampling(config.oversampling)) return error.InvalidOversampling;
}
```

---

## Step 5: Service Integration

**Purpose**: Wire the driver into the application's service layer. The service layer owns the lifecycle: it initializes drivers, runs polling loops, aggregates data, and exposes results to higher layers.

**Output**: Updated or new service module.

**Service Architecture**:

```
┌──────────────────────────────────────────┐
│  Application Logic (behavior, AI)        │
├──────────────────────────────────────────┤
│  Services (sensor fusion, motor ctrl)    │  ← THIS STEP
├──────────────────────────────────────────┤
│  Drivers (BME280, motor, display)        │
├──────────────────────────────────────────┤
│  HAL (I2C, SPI, GPIO, Timer)            │
└──────────────────────────────────────────┘
```

**Standard Services**:

| Service | Responsibility | Drivers It Owns |
|---|---|---|
| `SensorFusionService` | Poll all sensors, aggregate, publish | BME280, soil moisture, light, PIR |
| `MotorControlService` | Accept movement commands, PID control | Stepper, servo, DC motor |
| `AudioService` | Wake word, STT, TTS pipeline | I2S microphone, I2S speaker |
| `DisplayService` | Render UI to screens | SSD1306 OLED, e-ink |
| `PowerService` | Monitor battery, manage sleep | INA219, GPIO wake |

**Example: Adding BME280 to SensorFusionService (Python, RPi)**:

```python
# src/services/sensor_fusion.py

from dataclasses import dataclass
from datetime import datetime
import asyncio
import logging

from drivers.bme280 import Bme280Driver, Bme280Reading
from config import DeviceConfig

logger = logging.getLogger(__name__)

@dataclass
class EnvironmentSnapshot:
    """Aggregated sensor state at a point in time."""
    temperature_c: float | None = None
    humidity_pct: float | None = None
    pressure_pa: float | None = None
    soil_moisture: int | None = None     # ADC value 0-4095
    light_level: int | None = None       # lux
    motion_detected: bool = False
    timestamp: datetime = None

    def to_context_string(self) -> str:
        """Format for LLM system prompt injection."""
        parts = []
        if self.temperature_c is not None:
            parts.append(f"temp={self.temperature_c:.1f}C")
        if self.humidity_pct is not None:
            parts.append(f"humidity={self.humidity_pct:.0f}%")
        if self.pressure_pa is not None:
            parts.append(f"pressure={self.pressure_pa:.0f}Pa")
        if self.soil_moisture is not None:
            parts.append(f"soil_moisture={self.soil_moisture}")
        if self.light_level is not None:
            parts.append(f"light={self.light_level}lux")
        parts.append(f"motion={'yes' if self.motion_detected else 'no'}")
        return "Current readings: " + ", ".join(parts)


class SensorFusionService:
    def __init__(self, config: DeviceConfig):
        self.config = config
        self.latest: EnvironmentSnapshot = EnvironmentSnapshot()
        self._drivers: dict[str, object] = {}

    async def start(self):
        """Initialize all configured sensors and start polling."""
        if self.config.sensors.bme280.enabled:
            try:
                bme = Bme280Driver(
                    bus=self.config.sensors.bme280.i2c_bus,
                    address=self.config.sensors.bme280.i2c_address,
                )
                await bme.init()
                self._drivers["bme280"] = bme
                asyncio.create_task(self._poll_bme280())
                logger.info("BME280 initialized on I2C bus %d", self.config.sensors.bme280.i2c_bus)
            except Exception:
                logger.exception("Failed to initialize BME280")

        # ... initialize other sensors similarly ...

    async def _poll_bme280(self):
        """Polling loop for BME280."""
        bme = self._drivers["bme280"]
        interval = self.config.sensors.bme280.poll_interval_ms / 1000.0
        offsets = self.config.sensors.bme280

        while True:
            try:
                reading: Bme280Reading = await bme.read()
                self.latest.temperature_c = reading.temperature_c + offsets.temp_offset_c
                self.latest.humidity_pct = reading.humidity_pct + offsets.hum_offset_pct
                self.latest.pressure_pa = reading.pressure_pa + offsets.press_offset_pa
                self.latest.timestamp = datetime.now()
            except Exception:
                logger.exception("BME280 read failed")
            await asyncio.sleep(interval)

    async def stop(self):
        """Deinitialize all drivers."""
        for name, driver in self._drivers.items():
            try:
                await driver.deinit()
            except Exception:
                logger.exception("Failed to deinit %s", name)
```

---

## Step 6: Communication Protocol

**Purpose**: Define MQTT topics and message formats so other devices and services can consume this feature's data and send commands.

**Output**: Topic documentation in `MQTT_TOPICS.md`.

**Topic Hierarchy**:

```
novasyn/{device_id}/sensors/bme280/reading     ← periodic sensor data
novasyn/{device_id}/sensors/bme280/status       ← driver health
novasyn/{device_id}/commands/bme280/configure   ← runtime reconfiguration
```

**Message Schemas**:

```json
// Topic: novasyn/{device_id}/sensors/bme280/reading
// QoS: 0 (high frequency, loss acceptable)
// Retained: No
// Frequency: every poll_interval_ms
{
  "device_id": "novasyn-ambient-a1b2c3",
  "timestamp": "2026-03-13T14:30:00.000Z",
  "sensor": "bme280",
  "readings": {
    "temperature_c": 24.3,
    "humidity_pct": 62.1,
    "pressure_pa": 101325.0
  }
}
```

```json
// Topic: novasyn/{device_id}/sensors/bme280/status
// QoS: 1 (delivery important)
// Retained: Yes
// Frequency: on state change
{
  "device_id": "novasyn-ambient-a1b2c3",
  "timestamp": "2026-03-13T14:30:00.000Z",
  "sensor": "bme280",
  "status": "online",
  "last_reading_ms": 1710340200000,
  "error_count": 0,
  "uptime_s": 86400
}
```

```json
// Topic: novasyn/{device_id}/commands/bme280/configure
// QoS: 1 (delivery important)
// Retained: No
// Direction: External → Device
{
  "poll_interval_ms": 10000,
  "temp_offset_c": -0.5
}
```

**MQTT Publishing (Python)**:

```python
# src/services/mqtt_publisher.py

import json
from datetime import datetime, timezone

import aiomqtt

class MqttPublisher:
    def __init__(self, client: aiomqtt.Client, device_id: str):
        self.client = client
        self.device_id = device_id

    async def publish_sensor_reading(
        self,
        sensor_name: str,
        readings: dict[str, float],
    ):
        topic = f"novasyn/{self.device_id}/sensors/{sensor_name}/reading"
        payload = {
            "device_id": self.device_id,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "sensor": sensor_name,
            "readings": readings,
        }
        await self.client.publish(topic, json.dumps(payload), qos=0)
```

---

## Step 7: Application Logic

**Purpose**: Integrate the new feature into the device's behavior system. How does this data affect what the device does?

**Output**: Application layer module (Python for RPi, Zig for MCU).

**For the Ambient AI Assistant, adding BME280 means**:
- Environmental context in every LLM prompt
- Proactive alerts ("It's getting cold — should I remind you to close the windows?")
- Trend tracking ("Humidity has been rising for the past hour")
- Room comfort scoring

```python
# src/app/environment_context.py

from services.sensor_fusion import EnvironmentSnapshot

def build_environment_context(snapshot: EnvironmentSnapshot) -> str:
    """Build the environment section of the LLM system prompt."""
    parts = [snapshot.to_context_string()]

    # Add qualitative descriptions for the AI
    if snapshot.temperature_c is not None:
        if snapshot.temperature_c < 18:
            parts.append("The room feels cold.")
        elif snapshot.temperature_c > 28:
            parts.append("The room feels warm.")
        else:
            parts.append("Room temperature is comfortable.")

    if snapshot.humidity_pct is not None:
        if snapshot.humidity_pct > 70:
            parts.append("Humidity is high — it may feel muggy.")
        elif snapshot.humidity_pct < 30:
            parts.append("Humidity is low — the air is dry.")

    if snapshot.pressure_pa is not None:
        # Rough heuristic: below ~1010 hPa suggests incoming weather
        if snapshot.pressure_pa < 101000:
            parts.append("Barometric pressure is dropping — weather may be changing.")

    return "\n".join(parts)


def check_alerts(snapshot: EnvironmentSnapshot) -> list[str]:
    """Return any proactive alerts based on current environment."""
    alerts = []
    if snapshot.temperature_c is not None and snapshot.temperature_c < 15:
        alerts.append("Temperature has dropped below 15C. Consider heating.")
    if snapshot.temperature_c is not None and snapshot.temperature_c > 35:
        alerts.append("Temperature is above 35C. This could be uncomfortable or dangerous.")
    if snapshot.humidity_pct is not None and snapshot.humidity_pct > 80:
        alerts.append("Humidity is very high. Consider ventilation to prevent mold.")
    return alerts
```

---

## Step 8: BabyAI Integration

**Purpose**: Connect this feature to the BabyAI flywheel. Every sensor reading, every user interaction, every device behavior is potential learning signal.

**Output**: Telemetry schema, updated skill doc section.

**Telemetry Data (sent to BabyAI)**:

```python
# src/services/babyai_telemetry.py

import httpx
from config import DeviceConfig

BABYAI_URL = "https://novasynchris-babyai.hf.space"

async def send_environment_telemetry(
    config: DeviceConfig,
    readings: dict,
    context_used: str,
    response_helpful: bool | None = None,
):
    """Send anonymized environment telemetry to BabyAI."""
    payload = {
        "device_id": config.device.id,
        "device_type": config.device.type,
        "event": "environment_reading",
        "data": {
            "temperature_c": readings.get("temperature_c"),
            "humidity_pct": readings.get("humidity_pct"),
            "pressure_pa": readings.get("pressure_pa"),
            # Location is coarse (city level) for privacy
            "location_region": config.device.location,
            "context_string": context_used,
        },
        "feedback": {
            "response_helpful": response_helpful,
        } if response_helpful is not None else None,
    }

    async with httpx.AsyncClient() as client:
        await client.post(
            f"{BABYAI_URL}/v1/telemetry",
            json=payload,
            headers={
                "Authorization": f"Bearer {config.network.babyai.api_key}",
            },
            timeout=10.0,
        )
```

**Skill Doc Context**:

When the device sends a request to BabyAI for environmental queries, it includes a skill doc request:

```python
# In the BabyAI chat completion request
{
    "model": "auto",
    "messages": [
        {
            "role": "system",
            "content": (
                f"You are assisting a NovaSyn {device_type} device (ID: {device_id}). "
                f"Current sensor state: {sensor_context}. "
                f"Location: {location}. Mode: {operating_mode}."
            )
        },
        {"role": "user", "content": user_query}
    ],
    "skill_docs": ["FARMING_MISSOURI"],  # if agriculture device
    # No mosh_pit on embedded — single response only
}
```

**Calibration Feedback**:

When a user corrects the device ("actually it's warmer than that"), send to BabyAI:

```python
await client.post(
    f"{BABYAI_URL}/v1/feedback/select",
    json={
        "device_id": device_id,
        "context": "User corrected temperature reading",
        "correction": "User says actual temp is higher than reported",
        "sensor_reading": 22.1,
        "user_estimate": 24.0,
    },
    headers={"Authorization": f"Bearer {api_key}"},
)
```

---

## Step 9: Test Suite

**Purpose**: Every feature needs tests at multiple levels. Embedded testing is harder than desktop testing — hardware may not be available. Solution: mock HAL at the bottom, simulate at the top.

**Output**: Test files and simulation mocks.

**Test Levels**:

| Level | What It Tests | HAL | Hardware | Where It Runs |
|---|---|---|---|---|
| Unit | Driver logic, compensation math | Mock | No | Dev machine (zig test) |
| Integration | Service + driver + config | Mock | No | Dev machine or CI |
| HIL (Hardware-in-Loop) | Real driver on real hardware | Real | Yes | Target device |
| System | Full pipeline end-to-end | Real | Yes | Target device |

**Unit Test (Zig — Mock HAL)**:

```zig
// tests/drivers/test_bme280.zig

const std = @import("std");
const Bme280 = @import("../../src/drivers/bme280.zig").Bme280;
const MockI2c = @import("../mocks/mock_i2c.zig").MockI2c;
const MockTimer = @import("../mocks/mock_timer.zig").MockTimer;

test "BME280 compensate temperature known values" {
    // Known raw value from datasheet example
    // Raw temp = 519888 → expected ~25.08°C with reference calibration
    var mock_i2c = MockI2c.init();
    var mock_timer = MockTimer.init();

    // Load reference calibration data
    mock_i2c.loadCalibrationData(&REFERENCE_CALIBRATION);
    mock_i2c.setRegister(0xD0, 0x60); // chip ID

    var sensor = try Bme280.init(
        mock_i2c.interface(),
        mock_timer.interface(),
        .{},
    );

    // Set raw reading data
    mock_i2c.setRawReading(519888, 415148, 36487);

    const reading = try sensor.read();
    try std.testing.expectApproxEqAbs(reading.temperature_c, 25.08, 0.1);
}

test "BME280 handles I2C bus error gracefully" {
    var mock_i2c = MockI2c.init();
    mock_i2c.setError(.BusError); // all reads will fail
    var mock_timer = MockTimer.init();

    const result = Bme280.init(mock_i2c.interface(), mock_timer.interface(), .{});
    try std.testing.expectError(error.BusError, result);
}
```

**Integration Test (Python — Simulated Sensor)**:

```python
# tests/services/test_sensor_fusion.py

import pytest
import asyncio
from unittest.mock import AsyncMock, MagicMock

from services.sensor_fusion import SensorFusionService, EnvironmentSnapshot
from config import DeviceConfig, Bme280Config


@pytest.fixture
def config():
    return DeviceConfig(
        sensors=SensorConfig(
            bme280=Bme280Config(enabled=True, poll_interval_ms=100),
        ),
    )


@pytest.mark.asyncio
async def test_sensor_fusion_aggregates_bme280(config, monkeypatch):
    """SensorFusionService should update latest snapshot with BME280 readings."""
    mock_reading = MagicMock(temperature_c=24.3, humidity_pct=62.0, pressure_pa=101325.0)
    mock_driver = AsyncMock()
    mock_driver.read.return_value = mock_reading

    service = SensorFusionService(config)
    monkeypatch.setattr(service, "_create_bme280_driver", lambda: mock_driver)

    await service.start()
    await asyncio.sleep(0.2)  # allow at least one poll
    await service.stop()

    assert service.latest.temperature_c == pytest.approx(24.3, abs=0.1)
    assert service.latest.humidity_pct == pytest.approx(62.0, abs=0.1)


@pytest.mark.asyncio
async def test_sensor_fusion_handles_driver_failure(config, monkeypatch):
    """Service should continue running if a single sensor fails."""
    mock_driver = AsyncMock()
    mock_driver.read.side_effect = OSError("I2C bus error")

    service = SensorFusionService(config)
    monkeypatch.setattr(service, "_create_bme280_driver", lambda: mock_driver)

    await service.start()
    await asyncio.sleep(0.2)
    await service.stop()

    # Service stayed running, latest snapshot just has None values
    assert service.latest.temperature_c is None
```

**Simulation Mode**:

For development without hardware, drivers can run in simulation mode:

```python
# src/drivers/bme280_sim.py

import random
from dataclasses import dataclass

@dataclass
class SimulatedBme280:
    """Simulated BME280 for development without hardware."""
    base_temp: float = 22.0
    base_humidity: float = 55.0
    base_pressure: float = 101325.0

    async def init(self): pass
    async def deinit(self): pass

    async def read(self):
        return Bme280Reading(
            temperature_c=self.base_temp + random.gauss(0, 0.5),
            humidity_pct=self.base_humidity + random.gauss(0, 2.0),
            pressure_pa=self.base_pressure + random.gauss(0, 50.0),
        )
```

---

## Step 10: Deployment Manifest

**Purpose**: Define how this feature gets to devices in the field. OTA update package, config migration, rollback plan.

**Output**: Deployment documentation, version bump.

**OTA Manifest Entry**:

```json
{
  "version": "0.3.0",
  "previous_version": "0.2.0",
  "platform": "rpi4",
  "components": [
    {
      "name": "novasyn-firmware",
      "type": "zig_binary",
      "url": "https://github.com/novasynchris/novasyn-embedded/releases/download/v0.3.0/firmware-rpi4.bin",
      "sha256": "a1b2c3d4...",
      "install_path": "/opt/novasyn/firmware"
    },
    {
      "name": "novasyn-app",
      "type": "python_package",
      "url": "https://github.com/novasynchris/novasyn-embedded/releases/download/v0.3.0/app-0.3.0.tar.gz",
      "sha256": "e5f6g7h8...",
      "install_cmd": "cd /opt/novasyn/app && uv sync"
    }
  ],
  "config_migration": {
    "from_version": "0.2.0",
    "add_fields": {
      "sensors.bme280": {
        "enabled": false,
        "i2c_bus": 0,
        "i2c_address": "0x76",
        "poll_interval_ms": 5000,
        "temp_offset_c": 0.0,
        "hum_offset_pct": 0.0,
        "press_offset_pa": 0.0,
        "oversampling": 16
      }
    }
  },
  "rollback": {
    "health_check_url": "http://localhost:8080/health",
    "health_check_timeout_s": 60,
    "auto_rollback": true
  }
}
```

**Config Migration Script**:

```python
# scripts/migrate_config.py

import json
import shutil
from pathlib import Path

CONFIG_PATH = Path("/etc/novasyn/device.json")

def migrate_0_2_to_0_3(config: dict) -> dict:
    """Add BME280 sensor configuration."""
    if "sensors" not in config:
        config["sensors"] = {}
    if "bme280" not in config["sensors"]:
        config["sensors"]["bme280"] = {
            "enabled": False,  # disabled by default — user opts in
            "i2c_bus": 0,
            "i2c_address": "0x76",
            "poll_interval_ms": 5000,
            "temp_offset_c": 0.0,
            "hum_offset_pct": 0.0,
            "press_offset_pa": 0.0,
            "oversampling": 16,
        }
    config["config_version"] = "0.3.0"
    return config


MIGRATIONS = {
    "0.2.0": migrate_0_2_to_0_3,
}


def run_migration():
    config = json.loads(CONFIG_PATH.read_text())
    current = config.get("config_version", "0.1.0")

    if current in MIGRATIONS:
        # Backup before migration
        shutil.copy(CONFIG_PATH, CONFIG_PATH.with_suffix(".json.bak"))

        config = MIGRATIONS[current](config)
        CONFIG_PATH.write_text(json.dumps(config, indent=2))
        print(f"Migrated config from {current} to {config['config_version']}")
    else:
        print(f"No migration needed (current: {current})")
```

**Deployment Checklist**:
- [ ] Version bumped in build.zig and pyproject.toml
- [ ] Config migration script written and tested
- [ ] OTA manifest updated with new binaries and checksums
- [ ] Rollback tested: new version intentionally fails health check, verify auto-rollback works
- [ ] Release notes document the new sensor support
- [ ] MQTT_TOPICS.md updated with new topics

---

## Summary: Mapping Windows Stack to Embedded Stack

| Windows Stack Step | Embedded Stack Step | Key Difference |
|---|---|---|
| 1. SQL Schema | 1. Hardware Requirements | Physical constraints replace data model |
| 2. TypeScript Types | 2. HAL Interface | Hardware abstraction replaces type definitions |
| 3. IPC Handlers | 3. Driver Implementation | Peripheral protocol replaces process communication |
| 4. Preload Bridge | 4. Configuration Schema | device.json replaces Electron preload |
| 5. Zustand Store | 5. Service Integration | Service layer replaces client state |
| 6. React Components | 6. Communication Protocol | MQTT replaces UI rendering |
| 7. Feature Logic | 7. Application Logic | Same concept, different runtime |
| 8. (no equivalent) | 8. BabyAI Integration | Unique to embedded — feed the flywheel |
| 9. (informal) | 9. Test Suite | Mock HAL replaces DOM testing |
| 10. Electron Builder | 10. Deployment Manifest | OTA replaces app packaging |
