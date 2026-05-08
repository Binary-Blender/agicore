# 04 — Error Handling

> NovaSyn Embedded Dev Stack — AI-to-AI Reference
> Zig 0.15.x (firmware/drivers/real-time) + Python 3.12+ (application layer)
> Platforms: RPi 4/5, ESP32-S3, STM32F4/H7

Error handling in embedded systems is not about showing a dialog box. Errors can mean a motor stalls and overheats, a robot arm swings into a person, or a device catches fire. Every error pattern in this document is designed with physical safety as the first priority.

The governing principle: **software safety is defense-in-depth, never the sole protection.** Hardware interlocks (current limiters, thermal fuses, E-stop) exist independently of software. Software error handling adds layers of protection, graceful degradation, and diagnostic visibility on top of the hardware safety floor.

---

## Error Severity Hierarchy

Four levels. Every error in the system is classified into exactly one of these.

### Level 1: CRITICAL

**Immediate physical danger. Stop all actuators. Enter safe mode.**

Examples:
- Motor thermal runaway (temperature sensor on motor driver exceeds threshold)
- Sensor reports physically impossible value on a safety-critical input (e.g., distance sensor reads 0mm when robot is known to be in motion)
- Body firmware watchdog timeout (main loop stalled)
- E-stop signal received
- Power supply voltage outside safe range

**Response:**
1. All actuators immediately disabled (motors stopped, servos released).
2. Error state latched — device does NOT auto-recover from CRITICAL. Requires human intervention (power cycle, or explicit reset command from authenticated source).
3. Error LED pattern: fast red blink (250ms on/250ms off).
4. Error logged to persistent storage (flash/SD).
5. MQTT error published if network available (best-effort, not blocking).

**In Zig:**
```zig
fn handleCritical(err: CriticalError) noreturn {
    // 1. Kill all actuators — direct register writes, bypass driver layer
    hw.disableAllMotors();
    hw.releaseAllServos();

    // 2. Set error LED
    hw.setErrorLed(.fast_blink_red);

    // 3. Log to flash
    flash_log.write("CRITICAL: {}", .{@errorName(err)}) catch {};

    // 4. Enter infinite safe loop — only E-stop reset or power cycle exits
    while (true) {
        hw.feedWatchdog(); // Keep watchdog fed so we don't reset into unknown state
        hw.setErrorLed(.fast_blink_red);
        std.time.sleep(250 * std.time.ns_per_ms);
    }
}
```

### Level 2: RECOVERABLE

**Operation failed but the device can continue. Retry with backoff, or skip and move on.**

Examples:
- I2C read timeout (bus noise, sensor busy)
- MQTT publish failed (broker temporarily unreachable)
- BabyAI API returned HTTP 500 or timeout
- UART frame checksum mismatch (retry)
- File write failed (disk full — trigger log rotation)

**Response:**
1. Retry with exponential backoff (max 3 retries, delays: 10ms, 100ms, 1000ms).
2. If all retries fail, downgrade to DEGRADED for that subsystem.
3. Log at WARN level.
4. Increment error counter for that subsystem (used by health monitoring).

**In Zig:**
```zig
fn readWithRetry(bus: hal.I2cBus, addr: u7, reg: u8, buf: []u8, max_retries: u3) !usize {
    var retries: u3 = 0;
    var backoff_ms: u64 = 10;

    while (true) {
        const result = bus.writeRead(bus.ptr, addr, &[_]u8{reg}, buf);
        if (result) |bytes_read| {
            return bytes_read;
        } else |err| {
            retries += 1;
            if (retries >= max_retries) return err;

            log.warn("I2C read retry {d}/{d} for addr 0x{x:02}: {}", .{
                retries, max_retries, addr, @errorName(err),
            });

            std.time.sleep(backoff_ms * std.time.ns_per_ms);
            backoff_ms *= 10;
        }
    }
}
```

### Level 3: DEGRADED

**Feature lost but device continues operating. The device is functional but reduced.**

Examples:
- One sensor permanently offline (failed after all retries)
- Voice pipeline unavailable (mic hardware fault detected)
- WiFi disconnected (continue local operation, buffer telemetry)
- Ollama/LLM inference not available (use canned responses)
- One motor driver not responding (disable that axis, continue with others)

**Response:**
1. Mark the subsystem as degraded in the device status register.
2. Publish degradation event on MQTT (if available).
3. Adjust behavior — skip readings from dead sensor, route around dead motor, use fallback for unavailable AI.
4. Periodically attempt recovery (every 60 seconds, try to re-init the failed subsystem).
5. Log at WARN level with structured context.

**In Python:**
```python
class SubsystemHealth:
    def __init__(self, name: str):
        self.name = name
        self.status: Literal["ok", "degraded", "failed"] = "ok"
        self.error_count: int = 0
        self.last_error: str | None = None
        self.degraded_since: float | None = None

    def mark_degraded(self, reason: str) -> None:
        self.status = "degraded"
        self.last_error = reason
        self.degraded_since = time.time()
        logger.warning(
            "subsystem_degraded",
            subsystem=self.name,
            reason=reason,
        )

    def attempt_recovery(self) -> bool:
        """Called periodically. Returns True if recovered."""
        # Subclass implements actual recovery logic
        raise NotImplementedError
```

### Level 4: INFORMATIONAL

**Expected condition. Log and continue. No action needed.**

Examples:
- BabyAI returned a response from a fallback model (expected when preferred model is overloaded)
- Audio buffer underrun during low-priority playback (brief audio glitch)
- Configuration loaded with default values for optional fields
- Sensor reading within normal range but near threshold
- Scheduled maintenance task completed (log rotation, telemetry flush)

**Response:**
1. Log at INFO or DEBUG level.
2. No error counter increment.
3. No status change.

---

## Zig Error Patterns

### Error Sets per Layer

Each layer defines its own error set. Error sets do not leak across layer boundaries — services translate driver errors into service-level errors.

```zig
// HAL errors — low-level hardware
pub const HalError = error{
    AccessDenied,    // Permission denied (e.g., /dev/i2c not accessible)
    BusError,        // Hardware bus fault
    Timeout,         // Operation exceeded time limit
    InvalidPin,      // Pin number out of range for this board
    NotInitialized,  // Attempted operation before init()
};

// Driver errors — peripheral-specific
pub const SensorError = error{
    HardwareNotFound,    // Device not detected on bus (no ACK)
    ChecksumMismatch,    // Data integrity check failed
    CalibrationInvalid,  // Calibration data corrupt
    ReadingOutOfRange,   // Value outside physically possible range
    BusError,            // Passed through from HAL
    Timeout,             // Passed through from HAL
};

// Service errors — functional units
pub const MotorControlError = error{
    StallDetected,       // Motor current exceeds stall threshold
    ThermalOverload,     // Temperature exceeded safe operating range
    PositionOutOfBounds, // Requested position outside configured limits
    RampInterrupted,     // Acceleration ramp aborted (e.g., by E-stop)
    CommandTimeout,      // Command not acknowledged by motor driver
    SafetyInterlock,     // Safety system preventing this action
};
```

### Production Rules

1. **Never `@panic` in production code.** Panics are for development-time assertions only. Use `if (builtin.mode == .Debug) @panic(...)` for debug-only checks.

2. **Never `unreachable` unless you can mathematically prove it.** Prefer returning an error.

3. **Always use error unions for fallible operations.** Every function that touches hardware, network, or file I/O returns an error union.

4. **Wrap all hardware I/O in retry.** Single-try I/O is a bug for any non-safety-critical read.

5. **Timeout on all blocking I/O.** No function waits forever. Every blocking call has a timeout parameter. Default timeouts are in `device.json`.

6. **ISR safety: no allocations, no error handling in ISRs.** Interrupt Service Routines set a flag (atomic write to a volatile variable). The main loop reads the flag and handles the event with full error handling.

```zig
// ISR pattern — minimal work in interrupt context
var motion_detected: std.atomic.Value(bool) = std.atomic.Value(bool).init(false);

fn motionISR() void {
    // ISR: set flag only. No allocations, no error handling.
    motion_detected.store(true, .release);
}

fn mainLoop() void {
    while (true) {
        if (motion_detected.load(.acquire)) {
            motion_detected.store(false, .release);
            // Full error handling happens here, in main loop context
            handleMotionEvent() catch |err| {
                log.err("Motion event handler failed: {}", .{@errorName(err)});
            };
        }
        // ... other main loop work
    }
}
```

7. **Example: complete sensor driver error set and handling:**

```zig
pub const Bme280Error = error{
    HardwareNotFound,
    CalibrationInvalid,
    BusError,
    Timeout,
    ReadingOutOfRange,
};

pub const Bme280 = struct {
    bus: hal.I2cBus,
    addr: u7,
    consecutive_errors: u8 = 0,
    status: Peripheral.Status = .ok,

    const MAX_CONSECUTIVE_ERRORS = 5;

    pub fn readTemperature(self: *Bme280) Bme280Error!f32 {
        const raw = readWithRetry(self.bus, self.addr, 0xFA, &temp_buf, 3) catch |err| {
            self.consecutive_errors += 1;
            if (self.consecutive_errors >= MAX_CONSECUTIVE_ERRORS) {
                self.status = .offline;
            }
            return err;
        };

        self.consecutive_errors = 0;
        self.status = .ok;

        const temp = compensate(raw);
        if (temp < -40.0 or temp > 85.0) {
            // BME280 operating range is -40 to +85 C
            return error.ReadingOutOfRange;
        }
        return temp;
    }
};
```

---

## Python Error Patterns

### Custom Exception Hierarchy

```python
# errors.py — NovaSyn embedded Python error hierarchy

class DeviceError(Exception):
    """Base for all device-related errors."""
    def __init__(self, message: str, subsystem: str, severity: str = "RECOVERABLE"):
        super().__init__(message)
        self.subsystem = subsystem
        self.severity = severity


class SensorError(DeviceError):
    """Sensor read/init failure."""
    def __init__(self, message: str, sensor_id: str, **kwargs):
        super().__init__(message, subsystem="sensors", **kwargs)
        self.sensor_id = sensor_id


class ActuatorError(DeviceError):
    """Motor/servo/LED command failure."""
    def __init__(self, message: str, actuator_id: str, **kwargs):
        super().__init__(message, subsystem="actuators", **kwargs)
        self.actuator_id = actuator_id


class CommunicationError(DeviceError):
    """Network, MQTT, or BabyAI API failure."""
    def __init__(self, message: str, endpoint: str, **kwargs):
        super().__init__(message, subsystem="communication", **kwargs)
        self.endpoint = endpoint


class SafetyError(DeviceError):
    """Safety interlock triggered. ALWAYS severity=CRITICAL."""
    def __init__(self, message: str, **kwargs):
        super().__init__(message, subsystem="safety", severity="CRITICAL", **kwargs)


class ConfigError(DeviceError):
    """Configuration validation failure. Raised at startup only."""
    def __init__(self, message: str, field: str):
        super().__init__(message, subsystem="config", severity="CRITICAL")
        self.field = field
```

### Usage Rules

1. **Never bare `except`.** Always catch specific exceptions.

```python
# WRONG
try:
    reading = sensor.read()
except:
    pass

# RIGHT
try:
    reading = sensor.read()
except SensorError as e:
    logger.warning("sensor_read_failed", sensor_id=e.sensor_id, error=str(e))
    reading = last_known_good_reading
```

2. **Context managers for hardware cleanup.**

```python
class Motor:
    def __init__(self, config: MotorConfig):
        self.config = config
        self._pwm = None

    def __enter__(self):
        self._pwm = PWM(self.config.pin)
        self._pwm.start(0)
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        if self._pwm:
            self._pwm.stop()
            self._pwm = None
        # Don't suppress exceptions — return False (default)

    def set_speed(self, pct: int) -> None:
        clamped = max(self.config.min_speed, min(self.config.max_speed, pct))
        if clamped != pct:
            logger.info("motor_speed_clamped", requested=pct, actual=clamped)
        self._pwm.ChangeDutyCycle(clamped)
```

3. **`asyncio.shield` for critical cleanup.**

```python
async def shutdown(services: list[Service]) -> None:
    """Ensure cleanup completes even if outer task is cancelled."""
    for service in reversed(services):
        try:
            await asyncio.shield(service.stop())
        except Exception as e:
            logger.error("shutdown_error", service=service.name, error=str(e))
```

4. **Structured logging for all errors.** Use `structlog` with device context.

```python
import structlog

logger = structlog.get_logger()

# Configure once at startup
structlog.configure(
    processors=[
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.add_log_level,
        structlog.processors.JSONRenderer(),
    ],
)

# Bind device context
logger = logger.bind(device_id="ambient-01", board="rpi5")

# Usage — structured key-value pairs, not format strings
logger.info("sensor_read", sensor="bme280", temperature_c=22.5, humidity_pct=45.2)
logger.warning("i2c_retry", addr=0x76, attempt=2, max_retries=3)
logger.error("mqtt_publish_failed", topic="sensors/temperature", error="ConnectionRefused")
```

---

## Watchdog Patterns

### Hardware Watchdog Timer (WDT) — MCU

The MCU (STM32/ESP32) enables a hardware watchdog at boot. If the main loop does not feed the watchdog within the configured timeout, the MCU performs a hard reset.

```zig
// watchdog.zig — hardware WDT wrapper

pub const Watchdog = struct {
    timeout_ms: u32,

    pub fn init(timeout_ms: u32) !Watchdog {
        // Configure hardware WDT registers
        hw.wdt_registers.timeout = timeout_ms;
        hw.wdt_registers.enable = true;
        return .{ .timeout_ms = timeout_ms };
    }

    pub fn feed(self: Watchdog) void {
        _ = self;
        // Write the reload key to the WDT reload register
        hw.wdt_registers.reload_key = 0xAAAA;
    }

    // Note: once enabled, hardware WDT cannot be disabled (by design).
    // The only way to stop it is a power cycle.
};
```

**Rules:**
- WDT timeout is set longer than the worst-case main loop iteration (typically 5-10 seconds).
- The watchdog feed is in the main loop, AFTER all critical work. If any critical task stalls, the feed is not reached, and the WDT resets the MCU.
- After a WDT reset, the firmware checks a reset-reason register and logs "WDT_RESET" as a CRITICAL event.

### Software Watchdog — RPi (systemd)

The Python application on RPi uses systemd's watchdog support.

**systemd service file:**
```ini
# /etc/systemd/system/novasyn-ambient.service

[Unit]
Description=NovaSyn Ambient Assistant
After=network-online.target
Wants=network-online.target

[Service]
Type=notify
ExecStart=/usr/bin/python3 /opt/novasyn/app.py
WatchdogSec=30
Restart=on-failure
RestartSec=5
Environment=NOVASYN_CONFIG=/opt/novasyn/device.json

[Install]
WantedBy=multi-user.target
```

**Python side:**
```python
import sdnotify

notifier = sdnotify.SystemdNotifier()

async def watchdog_loop(interval_s: float = 10.0) -> None:
    """Notify systemd we're still alive."""
    while True:
        notifier.notify("WATCHDOG=1")
        await asyncio.sleep(interval_s)

# Called once at startup, after all services initialized
notifier.notify("READY=1")
```

**Rules:**
- `WatchdogSec` is set to 3x the notification interval (30s timeout, notify every 10s). This gives margin for GC pauses and load spikes.
- `Restart=on-failure` ensures systemd restarts the service if it crashes or watchdog times out.
- The watchdog notification is in its own asyncio task. If the event loop is blocked, the notification stops, and systemd restarts the process.

### Task Watchdog — Per-Service Monitoring

Each async task (service) reports its health to a central task watchdog. If a task stops reporting, it is cancelled and restarted.

```python
class TaskWatchdog:
    def __init__(self, timeout_s: float = 30.0):
        self.timeout_s = timeout_s
        self._heartbeats: dict[str, float] = {}
        self._tasks: dict[str, asyncio.Task] = {}

    def register(self, name: str, task: asyncio.Task) -> None:
        self._tasks[name] = task
        self._heartbeats[name] = time.monotonic()

    def heartbeat(self, name: str) -> None:
        self._heartbeats[name] = time.monotonic()

    async def monitor(self) -> None:
        while True:
            now = time.monotonic()
            for name, last_beat in self._heartbeats.items():
                if now - last_beat > self.timeout_s:
                    logger.error("task_stalled", task=name, silent_s=now - last_beat)
                    task = self._tasks.get(name)
                    if task and not task.done():
                        task.cancel()
                        logger.info("task_cancelled", task=name)
                        # The service manager will restart it
            await asyncio.sleep(self.timeout_s / 3)
```

### Brain-Body Heartbeat

See `03_ARCHITECTURE_PATTERNS.md` (Brain-Body Pattern, Safety Rules). The body firmware expects a `HEARTBEAT` command from the brain at a regular interval. Missed heartbeats trigger safe mode on the body.

```zig
// In body firmware main loop
var heartbeat_timer: u64 = 0;
const HEARTBEAT_TIMEOUT_MS: u64 = 3000; // 3 missed @ 1000ms interval

fn checkHeartbeat(current_ms: u64) void {
    if (current_ms - heartbeat_timer > HEARTBEAT_TIMEOUT_MS) {
        enterSafeMode(.brain_heartbeat_lost);
    }
}

fn onHeartbeatReceived(payload: []const u8) void {
    heartbeat_timer = getCurrentMs();
    // Send ACK back to brain with body status
    sendFrame(.heartbeat_ack, &statusPayload());
}

fn enterSafeMode(reason: SafeModeReason) void {
    // Stop all motors (coast)
    for (motors) |*motor| motor.setSpeed(0);
    // Release all servos
    for (servos) |*servo| servo.release();
    // Set error LED
    setLedPattern(.slow_red_blink);
    // Log reason
    flash_log.write("SAFE_MODE: {}", .{@tagName(reason)}) catch {};
    // Enter safe loop — only responds to PING and HEARTBEAT
    safeLoop();
}
```

---

## Graceful Degradation Matrix

Every anticipated failure has a pre-planned response. The device never enters an undefined state.

| Failure | Severity | Response | Degraded Capability | Recovery |
|---------|----------|----------|---------------------|----------|
| WiFi lost | DEGRADED | Continue local operation, buffer telemetry to flash | No BabyAI phone-home, no OTA updates, no MQTT | Auto-reconnect every 30s |
| Mic dead | DEGRADED | Switch to text/gesture input if available, or LED-only interaction | No voice interaction | Re-init mic every 60s |
| Speaker dead | DEGRADED | Switch to text/LED output | No audio feedback | Re-init speaker every 60s |
| One sensor offline | DEGRADED | Mark sensor as unreliable, exclude from fusion, continue with remaining sensors | Reduced environmental awareness | Re-init sensor every 60s |
| All sensors offline | CRITICAL | Enter safe mode (if robot), continue with cached data (if ambient) | No environmental awareness | Manual intervention |
| Brain crash | CRITICAL | Body enters safe mode (stop motors, LED error, wait for heartbeat) | No AI, no voice, no decision-making | Body waits; brain auto-restarts via systemd |
| Body crash | CRITICAL | Brain logs error, publishes MQTT alert, waits for body to reboot | No physical actuation | Body WDT auto-resets; brain detects heartbeat resume |
| Motor stall detected | RECOVERABLE | Cut power to stalled motor, report via MQTT, continue other motors | No movement on that axis | Manual clear required |
| Motor thermal overload | CRITICAL | Cut power to ALL motors (thermal events may cascade), enter safe mode | No movement | Cool-down period, then manual reset |
| Flash/SD full | RECOVERABLE | Rotate oldest logs, delete telemetry buffer, alert via MQTT | Reduced logging retention | Auto-resolved by rotation |
| LLM inference timeout | RECOVERABLE | Use cached response if available, else canned response | Reduced intelligence | Auto-retry next request |
| Ollama process dead | DEGRADED | All LLM requests use canned responses, attempt restart | No local AI | Restart Ollama via subprocess every 60s |
| MQTT broker unreachable | DEGRADED | Buffer messages locally (up to 1000), continue local operation | No inter-device comms, no cloud telemetry | Auto-reconnect every 30s, flush buffer on reconnect |
| Power supply voltage low | CRITICAL | Graceful shutdown — save state, stop actuators, close files | Device offline | Requires power fix |
| BabyAI API 429 (rate limit) | RECOVERABLE | Back off exponentially, use local LLM only | No cloud AI | Auto-retry with increasing delay |
| BabyAI API 500 | RECOVERABLE | Retry 3x with backoff, then fall back to local | No cloud AI | Auto-retry next telemetry window |
| I2C bus locked | RECOVERABLE | Toggle SCL line to unstick bus, re-init all I2C devices | Brief sensor blackout | Auto-recovery via bus reset |
| Checksum error on brain-body UART | RECOVERABLE | NACK the frame, sender retries | Brief command delay | Automatic retry |
| Config file corrupt | CRITICAL | Refuse to start, error LED, log to stderr | Device offline | Requires config fix and restart |

---

## Safety Interlocks

Safety interlocks exist at two levels: hardware (primary) and software (defense-in-depth).

### Hardware Interlocks (Independent of Software)

These protections work even if all software has crashed.

1. **Current limiters on motor drivers.** Hardware current limit set on the motor driver IC (e.g., DRV8833 ILIM resistor). If motor current exceeds the limit, the driver IC cuts power. Software cannot override this.

2. **Thermal fuses on high-power lines.** Resettable PTC fuses on motor power rails. If current exceeds rating for sustained period, the fuse opens. Self-resets when cool.

3. **E-stop button.** Physical pushbutton wired to a relay/MOSFET that disconnects motor power rails. The relay is normally-open (power flows through NC contact) — pressing the button opens the circuit. This means even a wiring fault (disconnected E-stop wire) results in motors being disabled (fail-safe).

4. **Voltage regulator protection.** Onboard voltage regulators (LDO/buck) have built-in over-temperature and over-current shutdown. Protects the logic boards from power supply faults.

### Software Interlocks (Defense-in-Depth)

These add additional safety margins and diagnostic capability on top of hardware protection.

1. **Actuator rate limiting.** No actuator command is executed if it exceeds the configured rate limit (e.g., max 50 commands per second per motor). Excess commands are dropped with a NACK.

2. **Slew rate limiting.** No actuator goes from 0% to 100% in one step. The firmware applies a trapezoidal ramp:
   ```
   Requested:  0% ──────────────── 100%  (step function)
   Actual:     0% ──/────────────\── 100%  (ramp over configured ms)
   ```
   Ramp time is configurable per actuator in `device.json`.

3. **Boundary checks.** Every actuator command is clamped to configured min/max values before execution. Servo angles clamped to `[min_deg, max_deg]`. Motor speeds clamped to `[-max_speed_pct, +max_speed_pct]`.

4. **Stall detection.** Motor current is monitored via ADC. If current exceeds stall threshold for more than the configured duration (default: 500ms), the motor is powered off and a `StallDetected` error is raised.

5. **Thermal monitoring.** MCU internal temperature sensor and any external temperature sensors on motor drivers are polled regularly. Exceeding thresholds triggers graduated response:
   - 60C: INFORMATIONAL log, increase fan speed if available
   - 70C: DEGRADED, reduce max motor speed to 50%
   - 80C: CRITICAL, stop all motors, enter safe mode

6. **Command authentication (brain-body).** The body firmware only accepts commands from the brain's UART. There is no wireless command path to the body. The brain is the sole authority, and it requires local authentication (systemd service, no remote shell).

---

## Error Logging and Telemetry

### On MCU (Zig)

```zig
const ErrorLog = struct {
    const MAX_ENTRIES = 256;

    entries: [MAX_ENTRIES]LogEntry = undefined,
    head: usize = 0,
    count: usize = 0,

    const LogEntry = struct {
        timestamp_ms: u64,
        severity: Severity,
        subsystem: [16]u8,
        message: [64]u8,
    };

    const Severity = enum(u8) {
        critical = 0,
        recoverable = 1,
        degraded = 2,
        informational = 3,
    };

    pub fn log(self: *ErrorLog, severity: Severity, subsystem: []const u8, msg: []const u8) void {
        const entry = &self.entries[self.head];
        entry.timestamp_ms = getCurrentMs();
        entry.severity = severity;
        @memcpy(entry.subsystem[0..@min(subsystem.len, 16)], subsystem[0..@min(subsystem.len, 16)]);
        @memcpy(entry.message[0..@min(msg.len, 64)], msg[0..@min(msg.len, 64)]);
        self.head = (self.head + 1) % MAX_ENTRIES;
        if (self.count < MAX_ENTRIES) self.count += 1;
    }
};
```

- Ring buffer, fixed size, no allocations.
- Survives soft reset (placed in `.noinit` section if supported).
- Dumped to flash on graceful shutdown.
- Brain can request error log via UART command (for remote diagnostics).

### On RPi (Python)

```python
# Structured JSON logging to file + MQTT

import structlog
from logging.handlers import RotatingFileHandler

def setup_logging(config: LoggingConfig) -> None:
    handler = RotatingFileHandler(
        config.file,
        maxBytes=config.max_size_mb * 1024 * 1024,
        backupCount=config.rotate_count,
    )

    structlog.configure(
        processors=[
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.processors.add_log_level,
            structlog.processors.StackInfoRenderer(),
            structlog.processors.ExceptionRenderer(),
            structlog.processors.JSONRenderer(),
        ],
        wrapper_class=structlog.make_filtering_bound_logger(
            getattr(logging, config.level)
        ),
        logger_factory=structlog.WriteLoggerFactory(file=handler.stream),
    )
```

- Rotating file logs — bounded disk usage.
- JSON format — parseable by log aggregators.
- Log level configurable in `device.json`.
- CRITICAL and RECOVERABLE errors also published to MQTT `novasyn/{device_id}/system/error`.

---

## Cross-References

- Architecture layers and safety design: `03_ARCHITECTURE_PATTERNS.md`
- Testing error handling paths: `05_TESTING_STRATEGY.md`
- Device configuration (safety thresholds, timeouts): `03_ARCHITECTURE_PATTERNS.md` (Configuration Pattern)
