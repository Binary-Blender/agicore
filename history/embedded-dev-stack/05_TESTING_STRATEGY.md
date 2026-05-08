# 05 — Testing Strategy

> NovaSyn Embedded Dev Stack — AI-to-AI Reference
> Zig 0.15.x (firmware/drivers/real-time) + Python 3.12+ (application layer)
> Platforms: RPi 4/5, ESP32-S3, STM32F4/H7

Testing embedded systems is fundamentally different from testing desktop or web software. You cannot mock gravity. You cannot unit-test whether a motor stalls under load. The testing strategy here is a pyramid that starts with fast, cheap, hardware-free tests and builds up to slow, expensive, physical-world tests. Every layer exists because the layers below it cannot catch certain classes of bugs.

The governing principle: **if it can be tested without hardware, it MUST be tested without hardware.** Physical boards are slow, expensive, and flaky. Reserve them for what only they can validate.

---

## Test Pyramid

```
                    ┌───────────────┐
                    │  5. Stability │  Hours/days. Memory leaks, thermal,
                    │     Tests     │  resource exhaustion.
                   ┌┴───────────────┴┐
                   │ 4. Integration  │  Full device assembled. End-to-end
                   │    Tests        │  pipelines. Brain-body. Voice loop.
                  ┌┴─────────────────┴┐
                  │ 3. Hardware-in-   │  Real board, real I2C/GPIO/UART.
                  │    Loop (HIL)     │  Timing and electrical validation.
                 ┌┴───────────────────┴┐
                 │ 2. Mock Hardware    │  HAL interfaces mocked. Drivers
                 │    Tests            │  and services against simulated HW.
                ┌┴─────────────────────┴┐
                │ 1. Unit Tests         │  Pure logic. No hardware. Runs on
                │                       │  dev host. FAST.
                └───────────────────────┘

     Speed:    ████████████████████████████████  (fast)
     Cost:     ░                                 (cheap)
     Coverage: ████████████████                  (broad logic)

                         to

     Speed:    ███                               (slow)
     Cost:     ████████████████████████████████  (expensive)
     Coverage: ████                              (narrow physical)
```

---

## Layer 1: Unit Tests

Pure logic tests. No hardware dependencies. Run on the development host (x86_64 Linux/macOS/Windows). Execute in milliseconds.

### What to Unit Test

- Mathematical functions: sensor compensation formulas, Kalman filter math, PID controller gains
- Data structures: ring buffers, protocol frame encoding/decoding, JSON config parsing
- State machines: device mode transitions, conversation state, error escalation logic
- Protocol logic: brain-body frame construction, checksum calculation, command dispatch

### What NOT to Unit Test

- Hardware I/O (that is Layer 2-3)
- Timing-dependent behavior (that is Layer 3-4)
- Multi-device interaction (that is Layer 4)

### Zig Unit Testing

All Zig tests use `std.testing.allocator`, which is a `GeneralPurposeAllocator` with leak detection enabled. Every test that allocates memory MUST free it before the test ends, or the test fails.

```zig
// tests/test_bme280_compensation.zig

const std = @import("std");
const bme280 = @import("../src/drivers/bme280.zig");

test "bme280_compensate_temperature_typical" {
    // Known calibration data from a real BME280 datasheet example
    const cal = bme280.CalibrationData{
        .dig_T1 = 27504,
        .dig_T2 = 26435,
        .dig_T3 = -1000,
    };

    // Raw ADC value for ~25.08C (from datasheet)
    const raw: i32 = 519888;
    const temp = bme280.compensateTemperature(raw, cal);

    try std.testing.expectApproxEqAbs(@as(f32, 25.08), temp, 0.1);
}

test "bme280_compensate_temperature_freezing" {
    const cal = bme280.CalibrationData{ .dig_T1 = 27504, .dig_T2 = 26435, .dig_T3 = -1000 };
    const raw: i32 = 320000; // ~0C
    const temp = bme280.compensateTemperature(raw, cal);

    try std.testing.expect(temp > -1.0 and temp < 1.0);
}

test "bme280_rejects_out_of_range_reading" {
    const cal = bme280.CalibrationData{ .dig_T1 = 27504, .dig_T2 = 26435, .dig_T3 = -1000 };
    const raw: i32 = 0; // Would compute to far below -40C
    const result = bme280.compensateAndValidate(raw, cal);

    try std.testing.expectError(error.ReadingOutOfRange, result);
}

test "protocol_frame_checksum" {
    const frame = protocol.Frame{
        .command = .move_servo,
        .payload = &[_]u8{ 0x01, 0x00, 0x5A, 0x80 },
    };
    const encoded = frame.encode();
    const expected_checksum: u8 = 0x04 ^ 0x10 ^ 0x01 ^ 0x00 ^ 0x5A ^ 0x80;

    try std.testing.expectEqual(expected_checksum, encoded[encoded.len - 1]);
}

test "protocol_frame_decode_rejects_bad_checksum" {
    var raw = [_]u8{ 0xAA, 0x02, 0x10, 0x01, 0x5A, 0xFF }; // bad checksum
    const result = protocol.Frame.decode(&raw);

    try std.testing.expectError(error.ChecksumMismatch, result);
}

test "ring_buffer_wraps_correctly" {
    var buf = RingBuffer(u8, 4){};
    try buf.push(1);
    try buf.push(2);
    try buf.push(3);
    try buf.push(4);
    try buf.push(5); // overwrites 1

    try std.testing.expectEqual(@as(u8, 2), buf.oldest());
    try std.testing.expectEqual(@as(u8, 5), buf.newest());
}

test "motor_ramp_calculates_intermediate_steps" {
    const allocator = std.testing.allocator;

    var ramp = try MotorRamp.init(allocator, .{
        .start_pct = 0,
        .end_pct = 100,
        .ramp_ms = 200,
        .step_ms = 10,
    });
    defer ramp.deinit(allocator);

    // Should have 20 steps (200ms / 10ms)
    try std.testing.expectEqual(@as(usize, 20), ramp.steps.len);

    // First step should be small, last step should reach target
    try std.testing.expect(ramp.steps[0] < 10);
    try std.testing.expectEqual(@as(i8, 100), ramp.steps[ramp.steps.len - 1]);
}
```

**Naming convention:** `subject_expected_behavior`
- `bme280_compensate_temperature_typical`
- `protocol_frame_decode_rejects_bad_checksum`
- `motor_ramp_calculates_intermediate_steps`

**Memory leak detection:**
`std.testing.allocator` tracks all allocations. If any allocation is not freed when the test ends, the test fails with a leak report showing the allocation site. This catches:
- Missing `defer deinit()` calls
- Early returns that skip cleanup
- Collections that grow but are never freed

**Running Zig tests:**
```bash
zig build test --summary all
```

Expected output: 0 failures, 0 leaks. Any leak is a test failure.

**`builtin.is_test` guards:**

Use `@import("builtin").is_test` to skip real hardware I/O in code that runs in both test and production contexts.

```zig
pub fn init(bus: hal.I2cBus) !Bme280 {
    if (@import("builtin").is_test) {
        // In test mode, skip hardware init
        return .{ .bus = bus, .calibration = test_calibration };
    }
    // Real hardware init
    const cal_raw = try bus.writeRead(/* ... */);
    // ...
}
```

### Python Unit Testing

```python
# tests/test_voice_pipeline.py

import pytest
from unittest.mock import AsyncMock, MagicMock
from novasyn.services.voice_pipeline import VoicePipeline

@pytest.fixture
def mock_config():
    return VoicePipelineConfig(
        ollama_model="qwen3:1.5b",
        ollama_url="http://localhost:11434",
        system_prompt="You are Nova.",
        max_response_tokens=256,
        conversation_timeout_s=120,
    )

@pytest.fixture
def mock_bus():
    bus = MagicMock()
    bus.publish = AsyncMock()
    return bus

@pytest.mark.asyncio
async def test_conversation_timeout_resets_context(mock_config, mock_bus):
    """After conversation_timeout_s of silence, context should be cleared."""
    pipeline = VoicePipeline(mock_config, mock_bus)
    pipeline._last_interaction = time.monotonic() - 200  # 200s ago, timeout is 120s

    await pipeline._check_timeout()

    assert pipeline._conversation_context == []
    mock_bus.publish.assert_called_once_with("voice/context_reset", {"reason": "timeout"})


@pytest.mark.asyncio
async def test_fallback_to_canned_response_on_llm_timeout(mock_config, mock_bus):
    """When LLM inference times out, use a canned response."""
    pipeline = VoicePipeline(mock_config, mock_bus)
    pipeline._ollama_client = AsyncMock(side_effect=asyncio.TimeoutError())

    response = await pipeline._get_response("What's the weather?")

    assert response in pipeline.CANNED_RESPONSES
    mock_bus.publish.assert_any_call(
        "voice/fallback",
        {"reason": "llm_timeout", "response": response},
    )


def test_config_validation_rejects_invalid_model():
    """Config with empty model name should raise ConfigError."""
    with pytest.raises(ConfigError, match="ollama_model"):
        VoicePipelineConfig(
            ollama_model="",
            ollama_url="http://localhost:11434",
            system_prompt="test",
            max_response_tokens=256,
            conversation_timeout_s=120,
        )
```

**Running Python tests:**
```bash
uv run pytest --tb=short -q
```

**Coverage target:** 80% on application logic (services, state machines, protocol handling). No coverage requirement on hardware glue code (GPIO wrappers, ALSA bindings) — those are tested at Layer 2-3.

---

## Layer 2: Mock Hardware Tests

HAL interfaces are mocked with test implementations. Drivers and services are tested against simulated hardware. Catches logic bugs, state machine errors, and error handling paths without requiring physical boards.

### Mock HAL (Zig)

```zig
// test_support/mock_hal.zig — mock HAL for testing

pub const MockI2cBus = struct {
    /// Pre-loaded responses: key is (addr, register), value is response bytes
    responses: std.AutoHashMap(AddressRegister, []const u8),
    /// Record of all writes for assertions
    write_log: std.ArrayList(WriteRecord),
    /// If set, all operations return this error
    force_error: ?hal.I2cBus.Error = null,
    /// Count of operations (for verifying call counts)
    read_count: usize = 0,
    write_count: usize = 0,

    const AddressRegister = struct { addr: u7, reg: u8 };
    const WriteRecord = struct { addr: u7, data: []const u8 };

    pub fn asI2cBus(self: *MockI2cBus) hal.I2cBus {
        return .{
            .ptr = @ptrCast(self),
            .vtable = &vtable,
        };
    }

    const vtable = hal.I2cBus.VTable{
        .read = mockRead,
        .write = mockWrite,
        .writeRead = mockWriteRead,
    };

    fn mockWriteRead(ptr: *anyopaque, addr: u7, write_data: []const u8, read_buf: []u8) hal.I2cBus.Error!usize {
        const self: *MockI2cBus = @ptrCast(@alignCast(ptr));
        self.read_count += 1;

        if (self.force_error) |err| return err;

        const key = AddressRegister{ .addr = addr, .reg = write_data[0] };
        const response = self.responses.get(key) orelse return error.Nack;
        const len = @min(response.len, read_buf.len);
        @memcpy(read_buf[0..len], response[0..len]);
        return len;
    }

    // ... mockRead, mockWrite similarly
};
```

### Testing Drivers Against Mock HAL

```zig
test "bme280_driver_reads_calibration_on_init" {
    const allocator = std.testing.allocator;

    var mock = MockI2cBus.init(allocator);
    defer mock.deinit();

    // Load calibration register responses
    try mock.responses.put(.{ .addr = 0x76, .reg = 0x88 }, &calibration_bytes);
    // Load chip ID response
    try mock.responses.put(.{ .addr = 0x76, .reg = 0xD0 }, &[_]u8{0x60}); // BME280 ID

    var sensor = try Bme280.init(mock.asI2cBus(), 0x76);
    defer sensor.deinit();

    // Verify driver read calibration registers
    try std.testing.expect(mock.read_count >= 2); // chip ID + calibration
}

test "bme280_driver_handles_i2c_timeout" {
    const allocator = std.testing.allocator;

    var mock = MockI2cBus.init(allocator);
    defer mock.deinit();

    mock.force_error = error.Timeout;

    const result = Bme280.init(mock.asI2cBus(), 0x76);
    try std.testing.expectError(error.Timeout, result);
}

test "bme280_driver_enters_degraded_after_consecutive_errors" {
    const allocator = std.testing.allocator;

    var mock = MockI2cBus.init(allocator);
    defer mock.deinit();

    // Init succeeds
    try mock.responses.put(.{ .addr = 0x76, .reg = 0x88 }, &calibration_bytes);
    try mock.responses.put(.{ .addr = 0x76, .reg = 0xD0 }, &[_]u8{0x60});
    var sensor = try Bme280.init(mock.asI2cBus(), 0x76);
    defer sensor.deinit();

    // Now make reads fail
    mock.force_error = error.BusError;

    // Read fails 5 times — should transition to offline
    var i: u8 = 0;
    while (i < 5) : (i += 1) {
        _ = sensor.readTemperature() catch {};
    }

    try std.testing.expectEqual(Peripheral.Status.offline, sensor.status);
}
```

### Contract Tests (from NullClaw)

Every HAL implementation MUST pass the same contract test suite. This ensures that switching from `hal_rpi.zig` to `hal_esp32.zig` does not break any driver.

```zig
// test_support/hal_contract.zig — HAL interface contract tests

pub fn testGpioPinContract(pin: hal.GpioPin) !void {
    // Test: can set direction to output
    try pin.setDirection(.output);

    // Test: can write high
    try pin.write(.high);

    // Test: reading after writing high returns high (if loopback wired)
    // Note: this test requires physical loopback — skip in pure mock mode
    if (!is_mock) {
        try pin.setDirection(.input);
        const level = try pin.read();
        try std.testing.expectEqual(hal.GpioPin.Level.high, level);
    }

    // Test: can set direction to input
    try pin.setDirection(.input);

    // Test: read does not error (value is indeterminate without loopback)
    _ = try pin.read();
}

pub fn testI2cBusContract(bus: hal.I2cBus) !void {
    // Test: writing to a non-existent address returns Nack
    const result = bus.write(bus.ptr, 0x7F, &[_]u8{0x00});
    try std.testing.expectError(error.Nack, result);

    // Test: reading with zero-length buffer succeeds (address probe)
    // This is how I2C device scanning works
    _ = bus.read(bus.ptr, 0x7F, &[_]u8{}) catch |err| {
        try std.testing.expect(err == error.Nack);
    };
}
```

Run contract tests against mock HAL (in unit tests) and against real HAL (in HIL tests). Same test code, different HAL implementation injected.

### Python Mock Hardware Tests

```python
# tests/test_audio_pipeline.py

import pytest
from unittest.mock import MagicMock, AsyncMock, patch
from novasyn.services.audio_pipeline import AudioPipeline

@pytest.fixture
def mock_alsa():
    """Mock ALSA audio capture."""
    with patch("novasyn.services.audio_pipeline.alsaaudio") as mock:
        pcm = MagicMock()
        pcm.read.return_value = (160, b"\x00" * 320)  # 10ms of 16kHz 16-bit
        mock.PCM.return_value = pcm
        yield mock

@pytest.fixture
def mock_wake_word():
    """Mock wake word detector."""
    detector = MagicMock()
    detector.process.return_value = 0.1  # Below threshold — no detection
    return detector

@pytest.mark.asyncio
async def test_audio_pipeline_detects_wake_word(mock_alsa, mock_wake_word, mock_bus):
    mock_wake_word.process.return_value = 0.95  # Above threshold

    pipeline = AudioPipeline(config, mock_bus)
    pipeline._wake_detector = mock_wake_word

    await pipeline._process_audio_chunk(b"\x00" * 320)

    mock_bus.publish.assert_called_with(
        "audio/wake_word",
        {"word": "hey nova", "confidence": 0.95},
    )

@pytest.mark.asyncio
async def test_audio_pipeline_handles_mic_failure(mock_alsa, mock_bus):
    """When mic read fails, pipeline should degrade gracefully."""
    mock_alsa.PCM.return_value.read.side_effect = Exception("Device disconnected")

    pipeline = AudioPipeline(config, mock_bus)

    with pytest.raises(SensorError, match="microphone"):
        await pipeline._read_audio()

    # Should publish degradation event
    mock_bus.publish.assert_called_with(
        "system/degraded",
        {"subsystem": "audio", "reason": "microphone read failed"},
    )
```

---

## Layer 3: Hardware-in-Loop (HIL) Tests

Real board connected to a development host. Tests real I2C timing, GPIO electrical behavior, UART framing, and sensor response characteristics. These tests catch bugs that mocks cannot: race conditions, electrical noise, bus contention, timing violations.

### HIL Test Rig Architecture

```
┌──────────────────────┐         ┌──────────────────────┐
│   TEST RUNNER (RPi)  │         │   DUT (Device Under  │
│                      │         │   Test)               │
│  pytest + GPIO lib   │◄───────►│                      │
│                      │  I2C    │  Firmware being       │
│  Powers DUT via      │◄───────►│  tested               │
│  relay/MOSFET        │  UART   │                      │
│                      │◄───────►│                      │
│  Monitors DUT via    │  GPIO   │                      │
│  logic analyzer      │         │                      │
└──────────────────────┘         └──────────────────────┘
```

**Components:**
- **Test runner:** Dedicated RPi (not the DUT) running pytest. Connected to DUT via GPIO, I2C, UART, and a power relay.
- **Power control:** Test runner controls DUT power via a relay on a GPIO pin. This enables power-cycle tests and clean boot sequences.
- **GPIO loopback:** Test runner GPIO outputs connected to DUT GPIO inputs (and vice versa) for digital I/O verification.
- **I2C sensor emulation:** Test runner acts as an I2C slave, emulating a sensor. DUT firmware reads from the test runner as if it were a real sensor.
- **UART verification:** Test runner sends commands to DUT and verifies responses (brain-body protocol testing).

### HIL Test Examples

```python
# hil_tests/test_gpio_loopback.py
# Runs on the test runner RPi, connected to DUT via loopback wires

import pytest
import RPi.GPIO as GPIO
import time

# Test runner pins connected to DUT pins via jumper wires
RUNNER_OUTPUT_PIN = 17  # Connected to DUT input pin
RUNNER_INPUT_PIN = 27   # Connected to DUT output pin

@pytest.fixture(autouse=True)
def setup_gpio():
    GPIO.setmode(GPIO.BCM)
    GPIO.setup(RUNNER_OUTPUT_PIN, GPIO.OUT)
    GPIO.setup(RUNNER_INPUT_PIN, GPIO.IN)
    yield
    GPIO.cleanup()

def test_dut_echoes_gpio_high():
    """DUT firmware should echo input pin state to output pin."""
    GPIO.output(RUNNER_OUTPUT_PIN, GPIO.HIGH)
    time.sleep(0.01)  # Allow DUT to react (10ms budget)
    assert GPIO.input(RUNNER_INPUT_PIN) == GPIO.HIGH

def test_dut_echoes_gpio_low():
    GPIO.output(RUNNER_OUTPUT_PIN, GPIO.LOW)
    time.sleep(0.01)
    assert GPIO.input(RUNNER_INPUT_PIN) == GPIO.LOW

def test_dut_gpio_response_time():
    """DUT should respond to GPIO change within 5ms."""
    GPIO.output(RUNNER_OUTPUT_PIN, GPIO.LOW)
    time.sleep(0.01)

    start = time.perf_counter_ns()
    GPIO.output(RUNNER_OUTPUT_PIN, GPIO.HIGH)

    # Poll until DUT responds or timeout
    timeout_ns = 5_000_000  # 5ms
    while time.perf_counter_ns() - start < timeout_ns:
        if GPIO.input(RUNNER_INPUT_PIN) == GPIO.HIGH:
            elapsed_us = (time.perf_counter_ns() - start) / 1000
            print(f"GPIO response time: {elapsed_us:.0f}us")
            return

    pytest.fail("DUT did not respond within 5ms")
```

```python
# hil_tests/test_brain_body_uart.py
# Test runner sends brain-body protocol frames to DUT body firmware

import pytest
import serial
import struct

DUT_SERIAL_PORT = "/dev/ttyUSB0"
BAUD = 115200

@pytest.fixture
def uart():
    ser = serial.Serial(DUT_SERIAL_PORT, BAUD, timeout=1.0)
    yield ser
    ser.close()

def build_frame(command: int, payload: bytes) -> bytes:
    length = len(payload)
    checksum = length ^ command
    for b in payload:
        checksum ^= b
    return bytes([0xAA, length, command, *payload, checksum & 0xFF])

def parse_response(data: bytes) -> tuple[int, bytes]:
    assert data[0] == 0xAA, f"Bad start byte: {data[0]:#x}"
    length = data[1]
    command = data[2]
    payload = data[3:3 + length]
    checksum = data[3 + length]
    expected = length ^ command
    for b in payload:
        expected ^= b
    assert checksum == (expected & 0xFF), "Checksum mismatch"
    return command, payload

def test_ping_pong(uart):
    """Body should respond to PING with PONG."""
    uart.write(build_frame(0x01, b""))  # PING
    response = uart.read(64)
    cmd, payload = parse_response(response)
    assert cmd == 0x02  # PONG

def test_move_servo_ack(uart):
    """Body should ACK a valid MOVE_SERVO command."""
    # servo_id=0, angle=90 (0x005A), speed=128
    payload = struct.pack("BHB", 0, 90, 128)
    uart.write(build_frame(0x10, payload))
    response = uart.read(64)
    cmd, resp_payload = parse_response(response)
    assert cmd == 0xF0  # ACK
    assert resp_payload[0] == 0x10  # Echoes original command
    assert resp_payload[1] == 0x00  # Status OK

def test_move_servo_nack_on_out_of_bounds(uart):
    """Body should NACK servo angle beyond configured max."""
    # servo_id=0, angle=270 (beyond max 180), speed=128
    payload = struct.pack("BHB", 0, 270, 128)
    uart.write(build_frame(0x10, payload))
    response = uart.read(64)
    cmd, resp_payload = parse_response(response)
    assert cmd == 0xF1  # NACK
    assert resp_payload[1] != 0x00  # Error code set

def test_heartbeat_response(uart):
    """Body should respond to HEARTBEAT with HEARTBEAT_ACK."""
    uptime = struct.pack("<I", 1000)  # 1000ms
    uart.write(build_frame(0xFF, uptime))
    response = uart.read(64)
    cmd, resp_payload = parse_response(response)
    assert cmd == 0xFD  # HEARTBEAT_ACK
    assert len(resp_payload) == 5  # 4 bytes uptime + 1 byte status flags

def test_safe_mode_on_heartbeat_timeout(uart):
    """If brain stops sending heartbeats, body should enter safe mode."""
    # Send one heartbeat to establish connection
    uart.write(build_frame(0xFF, struct.pack("<I", 1000)))
    uart.read(64)  # consume ACK

    # Wait for 3x heartbeat timeout (3 seconds default)
    time.sleep(4.0)

    # Send a MOVE_SERVO — body should NACK because it is in safe mode
    payload = struct.pack("BHB", 0, 90, 128)
    uart.write(build_frame(0x10, payload))
    response = uart.read(64)
    cmd, resp_payload = parse_response(response)
    assert cmd == 0xF1  # NACK — safe mode, rejecting commands
```

### HIL Test Automation

```bash
#!/bin/bash
# hil_tests/run_hil.sh — automated HIL test sequence

set -e

DUT_POWER_PIN=22  # GPIO pin controlling DUT power relay

echo "=== NovaSyn HIL Test Suite ==="

# 1. Power cycle DUT
echo "Powering off DUT..."
gpio write $DUT_POWER_PIN 0
sleep 2

echo "Flashing firmware..."
# Flash the firmware to DUT (specific to board type)
# For STM32: st-flash write firmware.bin 0x08000000
# For ESP32: esptool.py write_flash 0x0 firmware.bin

echo "Powering on DUT..."
gpio write $DUT_POWER_PIN 1
sleep 3  # Wait for DUT boot

# 2. Run HIL tests
echo "Running HIL tests..."
uv run pytest hil_tests/ --tb=short -q --junitxml=hil_results.xml

# 3. Power off DUT
echo "Powering off DUT..."
gpio write $DUT_POWER_PIN 0

echo "=== HIL Tests Complete ==="
```

---

## Layer 4: Integration Tests

Full device assembled and running. Tests end-to-end pipelines: sensor reading through AI inference through actuator output. Tests brain-body communication under realistic conditions. Tests voice loop (mic → STT → LLM → TTS → speaker) end to end.

### What Integration Tests Catch

- Latency budget violations (voice loop must respond within 3 seconds)
- Resource contention (audio pipeline and MQTT client competing for CPU)
- Service initialization order issues
- Real-world MQTT broker behavior (reconnection, message ordering)
- BabyAI phone-home under real network conditions

### Integration Test Examples

```python
# integration_tests/test_voice_loop.py

import pytest
import asyncio
import time

@pytest.mark.integration
@pytest.mark.asyncio
async def test_voice_loop_end_to_end():
    """Full voice pipeline: audio in → STT → LLM → TTS → audio out.
    Must complete within 5 seconds total latency budget."""

    device = await DeviceHarness.start("device.json")

    try:
        # Inject a pre-recorded audio clip (simulates user speaking)
        await device.inject_audio("test_data/what_time_is_it.wav")

        # Wait for TTS output
        start = time.monotonic()
        tts_event = await asyncio.wait_for(
            device.wait_for_event("voice/tts_complete"),
            timeout=5.0,
        )
        elapsed = time.monotonic() - start

        assert elapsed < 5.0, f"Voice loop took {elapsed:.1f}s (budget: 5.0s)"
        assert len(tts_event["text"]) > 0, "Response was empty"
        print(f"Voice loop latency: {elapsed:.2f}s")
        print(f"Response: {tts_event['text']}")

    finally:
        await device.stop()


@pytest.mark.integration
@pytest.mark.asyncio
async def test_sensor_to_mqtt_pipeline():
    """Sensor readings should appear on MQTT within 2x poll interval."""

    device = await DeviceHarness.start("device.json")
    mqtt = await MQTTTestClient.connect(device.config.mqtt)

    try:
        messages = []
        await mqtt.subscribe(
            f"novasyn/{device.config.device.id}/sensors/temperature",
            lambda msg: messages.append(msg),
        )

        # Wait for 2 poll intervals
        poll_interval = device.config.sensors.bme280.poll_interval_ms / 1000
        await asyncio.sleep(poll_interval * 2.5)

        assert len(messages) >= 2, f"Expected 2+ readings, got {len(messages)}"

        for msg in messages:
            assert "value" in msg
            assert "unit" in msg
            assert msg["unit"] == "C"
            assert -40 < msg["value"] < 85  # BME280 operating range

    finally:
        await mqtt.disconnect()
        await device.stop()


@pytest.mark.integration
@pytest.mark.asyncio
async def test_brain_body_coordination():
    """Brain sends movement command, body executes and reports back."""

    brain = await BrainHarness.start("brain_config.json")
    # Body is physical hardware, already running

    try:
        # Send a servo command through the brain
        await brain.send_command("move_servo", servo_id=0, angle=90, speed=128)

        # Wait for ACK
        ack = await asyncio.wait_for(
            brain.wait_for_event("body/ack"),
            timeout=1.0,
        )
        assert ack["command"] == "move_servo"
        assert ack["status"] == "ok"

        # Read sensors through the brain
        await brain.send_command("read_sensors", mask=0xFFFF)
        sensor_data = await asyncio.wait_for(
            brain.wait_for_event("body/sensor_data"),
            timeout=1.0,
        )
        assert "temperature" in sensor_data
        assert "distance" in sensor_data

    finally:
        await brain.stop()
```

### Running Integration Tests

```bash
# Integration tests are tagged and run separately from unit tests
uv run pytest integration_tests/ -m integration --tb=short -q --timeout=30
```

Integration tests are NOT part of the normal CI loop. They run on physical hardware, on demand, before deployment.

---

## Layer 5: Stability Tests

Long-running tests (hours to days) that catch slow leaks, resource exhaustion, thermal issues, and degradation over time. These are the final gate before deploying firmware to a device that will run unattended.

### Stability Test Protocol

**Minimum duration:** 24 hours before any deployment to an unattended device.

**Monitored metrics:**

| Metric | Tool | Alert Threshold |
|--------|------|-----------------|
| Memory usage (RSS) | Zig: `std.testing.allocator` in debug builds; Python: `tracemalloc` | <1% growth over 24h |
| CPU temperature | RPi: `/sys/class/thermal/thermal_zone0/temp`; MCU: internal temp sensor | <80C sustained |
| Error rate | Structured log analysis | <5% of sensor reads |
| Response latency (voice loop) | Timestamped events | p99 < 5s |
| MQTT publish success rate | Client metrics | >99% |
| Uptime | Process monitor | No restarts |
| Open file descriptors | `/proc/{pid}/fd` count | No growth |
| Heap fragmentation (Zig) | GPA stats | Free block count stable |

### Zig Stability Testing

```zig
// stability_test.zig — run with: zig build stability -Druntime=24h

pub fn main() !void {
    var gpa = std.heap.GeneralPurposeAllocator(.{
        .enable_memory_limit = true,
        .verbose_log = false,
    }){};
    defer {
        const check = gpa.deinit();
        if (check == .leak) {
            std.log.err("STABILITY FAIL: Memory leak detected", .{});
            std.process.exit(1);
        }
    }

    const allocator = gpa.allocator();
    const start_time = std.time.milliTimestamp();
    const duration_ms: i64 = 24 * 60 * 60 * 1000; // 24 hours

    var stats_interval: i64 = 60 * 1000; // Log stats every minute
    var last_stats: i64 = 0;
    var total_reads: u64 = 0;
    var failed_reads: u64 = 0;

    // Init device (in simulation mode)
    var device = try Device.init(allocator, "--simulate");
    defer device.deinit();

    while (std.time.milliTimestamp() - start_time < duration_ms) {
        // Normal operation cycle
        device.tick() catch |err| {
            failed_reads += 1;
            std.log.warn("Tick error: {}", .{@errorName(err)});
        };
        total_reads += 1;

        // Periodic stats dump
        const now = std.time.milliTimestamp();
        if (now - last_stats > stats_interval) {
            const gpa_stats = gpa.stats();
            std.log.info("STABILITY [{d}h]: reads={d} errors={d} ({d:.1}%) alloc_bytes={d} free_blocks={d}", .{
                @divFloor(now - start_time, 3600000),
                total_reads,
                failed_reads,
                @as(f64, @floatFromInt(failed_reads)) / @as(f64, @floatFromInt(total_reads)) * 100.0,
                gpa_stats.total_allocated_bytes,
                gpa_stats.free_block_count,
            });
            last_stats = now;
        }
    }

    const error_rate = @as(f64, @floatFromInt(failed_reads)) / @as(f64, @floatFromInt(total_reads)) * 100.0;
    if (error_rate > 5.0) {
        std.log.err("STABILITY FAIL: Error rate {d:.1}% exceeds 5% threshold", .{error_rate});
        std.process.exit(1);
    }

    std.log.info("STABILITY PASS: {d} hours, {d} reads, {d:.1}% error rate", .{
        @divFloor(std.time.milliTimestamp() - start_time, 3600000),
        total_reads,
        error_rate,
    });
}
```

### Python Stability Testing

```python
# stability_tests/test_24h.py

import asyncio
import time
import tracemalloc
import psutil
import structlog

logger = structlog.get_logger()

async def run_stability_test(config_path: str, duration_hours: float = 24.0):
    """Run the full device stack for `duration_hours` and monitor for issues."""

    tracemalloc.start()
    process = psutil.Process()
    start_time = time.monotonic()
    duration_s = duration_hours * 3600
    snapshot_interval_s = 3600  # Memory snapshot every hour
    last_snapshot_time = start_time
    baseline_snapshot = tracemalloc.take_snapshot()
    baseline_rss = process.memory_info().rss

    # Track metrics
    error_count = 0
    total_cycles = 0
    max_latency_s = 0.0

    device = await DeviceHarness.start(config_path)

    try:
        while time.monotonic() - start_time < duration_s:
            cycle_start = time.monotonic()

            try:
                await device.tick()
                total_cycles += 1
            except Exception as e:
                error_count += 1
                logger.warning("stability_error", error=str(e), cycle=total_cycles)

            cycle_time = time.monotonic() - cycle_start
            max_latency_s = max(max_latency_s, cycle_time)

            # Hourly memory snapshot
            now = time.monotonic()
            if now - last_snapshot_time > snapshot_interval_s:
                current_snapshot = tracemalloc.take_snapshot()
                current_rss = process.memory_info().rss
                rss_growth_pct = (current_rss - baseline_rss) / baseline_rss * 100

                hours_elapsed = (now - start_time) / 3600
                error_rate = error_count / max(total_cycles, 1) * 100

                logger.info(
                    "stability_checkpoint",
                    hours=f"{hours_elapsed:.1f}",
                    rss_mb=current_rss / 1024 / 1024,
                    rss_growth_pct=f"{rss_growth_pct:.2f}",
                    total_cycles=total_cycles,
                    error_count=error_count,
                    error_rate_pct=f"{error_rate:.2f}",
                    max_latency_s=f"{max_latency_s:.3f}",
                    cpu_temp_c=get_cpu_temp(),
                    fd_count=len(process.open_files()),
                )

                # Compare top memory consumers
                top_stats = current_snapshot.compare_to(baseline_snapshot, "lineno")
                for stat in top_stats[:5]:
                    if stat.size_diff > 1024 * 1024:  # >1MB growth
                        logger.warning(
                            "memory_growth",
                            file=str(stat.traceback),
                            size_diff_mb=stat.size_diff / 1024 / 1024,
                        )

                last_snapshot_time = now

            await asyncio.sleep(0.1)  # Don't spin at 100% CPU

    finally:
        await device.stop()
        tracemalloc.stop()

    # Final assertions
    final_rss = process.memory_info().rss
    rss_growth_pct = (final_rss - baseline_rss) / baseline_rss * 100
    error_rate = error_count / max(total_cycles, 1) * 100
    hours = (time.monotonic() - start_time) / 3600

    logger.info(
        "stability_result",
        hours=f"{hours:.1f}",
        total_cycles=total_cycles,
        error_rate_pct=f"{error_rate:.2f}",
        rss_growth_pct=f"{rss_growth_pct:.2f}",
        max_latency_s=f"{max_latency_s:.3f}",
    )

    assert rss_growth_pct < 1.0, f"Memory grew {rss_growth_pct:.1f}% (limit: 1%)"
    assert error_rate < 5.0, f"Error rate {error_rate:.1f}% (limit: 5%)"


def get_cpu_temp() -> float:
    """Read RPi CPU temperature."""
    try:
        with open("/sys/class/thermal/thermal_zone0/temp") as f:
            return int(f.read().strip()) / 1000.0
    except (FileNotFoundError, ValueError):
        return -1.0
```

### Stability Pass Criteria

A stability test PASSES if ALL of the following hold over the full test duration:

| Criterion | Threshold | Rationale |
|-----------|-----------|-----------|
| Memory growth (RSS) | <1% over 24h | Any growth indicates a leak that will eventually OOM |
| Unhandled exceptions | 0 | Every exception must be caught and handled |
| Sensor read error rate | <5% | I2C noise causes occasional errors; >5% indicates hardware problem |
| Voice loop p99 latency | <5 seconds | User-perceptible delay threshold |
| CPU temperature | <80C sustained | Thermal throttling degrades performance unpredictably |
| Process restarts | 0 | Restart = crash = unacceptable for unattended device |
| Open file descriptor count | No growth | FD leak will hit ulimit and crash |
| Heap fragmentation (Zig) | Free block count stable | Growing fragmentation = eventual OOM even with no leak |

---

## Simulation Mode

Every device project supports a `--simulate` flag that runs the full application stack on a development machine with no physical hardware. This enables full-stack development and testing on a laptop.

### How Simulation Works

```
Real Mode:                          Simulation Mode:

┌─────────┐                         ┌─────────┐
│ App     │                         │ App     │  ← Same code
├─────────┤                         ├─────────┤
│ Service │                         │ Service │  ← Same code
├─────────┤                         ├─────────┤
│ Driver  │                         │ Driver  │  ← Same code
├─────────┤                         ├─────────┤
│ HAL     │  ← Real hardware        │ MockHAL │  ← Simulated
└─────────┘                         └─────────┘
```

Everything above the HAL is identical between real and simulated modes. Only the HAL implementation changes. This means simulation catches every bug except hardware-specific timing and electrical issues.

### Mock Sensor Behaviors

Simulated sensors support multiple data modes, configured per sensor in `device.json`:

```json
{
  "simulation": {
    "enabled": true,
    "sensors": {
      "bme280": {
        "mode": "playback",
        "data_file": "test_data/kitchen_24h.csv"
      },
      "vl53l0x": {
        "mode": "random",
        "min": 50,
        "max": 2000,
        "noise_pct": 5
      },
      "mpu6050": {
        "mode": "static",
        "accel": [0.0, 0.0, 9.81],
        "gyro": [0.0, 0.0, 0.0]
      }
    },
    "actuators": {
      "mode": "log",
      "log_file": "sim_actuator_log.jsonl"
    },
    "audio": {
      "mic_source": "test_data/conversation.wav",
      "speaker_sink": "sim_speaker_output.wav"
    }
  }
}
```

**Modes:**
- **static** — Returns the same value every read. Good for basic functional testing.
- **random** — Returns random values within a range with configurable noise. Good for testing data pipelines.
- **playback** — Replays recorded data from a CSV file. Good for reproducible testing with realistic data patterns.

**Mock actuators** log all commands to a JSONL file instead of moving real hardware:
```json
{"ts": 1710300000.123, "command": "move_servo", "servo_id": 0, "angle": 90, "speed": 128}
{"ts": 1710300000.456, "command": "set_motor", "motor_id": 0, "speed_pct": 50}
{"ts": 1710300001.789, "command": "set_led", "led_id": 0, "r": 0, "g": 255, "b": 0}
```

**Mock audio** uses file I/O instead of ALSA:
- Mic input reads from a WAV file (or generates silence if no file configured).
- Speaker output writes to a WAV file (for later inspection).

### Running in Simulation Mode

```bash
# Python (RPi application)
NOVASYN_SIMULATION=true uv run python app.py --config device.json

# Zig (MCU firmware, cross-compiled to host)
zig build run -- --simulate --config device.json
```

The `--simulate` flag or `NOVASYN_SIMULATION=true` env var causes the HAL layer to load `MockHAL` instead of the real board HAL. No other code changes are needed.

---

## Continuous Integration

### CI Pipeline (runs on every push)

```
┌─────────────────────┐
│ 1. Zig build        │  zig build --summary all
│    (all targets)     │  Cross-compile for RPi, ESP32, STM32, host
├─────────────────────┤
│ 2. Zig unit tests   │  zig build test --summary all
│    + leak detection  │  0 failures, 0 leaks required
├─────────────────────┤
│ 3. Python lint       │  ruff check src/ tests/
│    + type check      │  mypy src/ --strict
├─────────────────────┤
│ 4. Python unit tests │  uv run pytest tests/ --tb=short -q
│    + coverage        │  80% minimum on application logic
├─────────────────────┤
│ 5. Mock hardware     │  zig build test -Dtest-filter="mock_"
│    tests (Zig)       │  uv run pytest tests/ -m mock
├─────────────────────┤
│ 6. Simulation smoke  │  Run device in simulation mode for 60s
│    test              │  Verify: starts, reads sensors, publishes MQTT
└─────────────────────┘
```

Total CI time target: <5 minutes.

HIL tests, integration tests, and stability tests are NOT part of CI. They run on dedicated hardware, triggered manually or on a nightly schedule.

### Pre-Deployment Checklist

Before deploying firmware to a physical device that will run unattended:

- [ ] All CI checks pass (unit tests, mock tests, lint, type check)
- [ ] HIL tests pass on the target board type
- [ ] Integration tests pass on assembled device
- [ ] 24-hour stability test passes
- [ ] `device.json` validated against schema
- [ ] Secrets confirmed in environment variables (not in config file)
- [ ] systemd service file tested (start, stop, restart, watchdog)
- [ ] Rollback plan documented (previous firmware version noted)

---

## Cross-References

- Architecture and HAL vtable definitions: `03_ARCHITECTURE_PATTERNS.md`
- Error handling and degradation matrix: `04_ERROR_HANDLING.md`
- NullClaw contract test pattern: NullClaw Zig runtime `contract_test.zig`
- BabyAI API integration testing: BabyAI `VISION.md`
