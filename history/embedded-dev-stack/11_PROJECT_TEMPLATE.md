# 11 — Project Template: Boilerplate for New Device Projects

> Copy-paste-ready templates. Every new device starts from these files.

This document contains complete, working boilerplate for scaffolding a new NovaSyn embedded device project. Templates are organized by language/platform. Copy the relevant sections into your project directory and customize the placeholder values.

**Placeholders used throughout:**
- `{device_name}` — lowercase device name (e.g., `nova`, `hex`, `robot`)
- `{device_id}` — unique device instance identifier (e.g., `nova-001`)
- `{Device}` — PascalCase device name (e.g., `Nova`, `Hex`, `Robot`)
- `{DEVICE}` — SCREAMING_SNAKE device name (e.g., `NOVA`, `HEX`, `ROBOT`)

---

## Zig Templates

### build.zig

```zig
const std = @import("std");

pub fn build(b: *std.Build) void {
    // Default to ReleaseSmall for embedded targets
    const optimize = b.standardOptimizeOption(.{ .preferred = .ReleaseSmall });

    // Target selection: host (dev/test), RPi, ESP32, STM32
    const target = b.standardTargetOptions(.{
        .default_target = .{},
    });

    // --- Main executable ---
    const exe = b.addExecutable(.{
        .name = "novasyn_{device_name}",
        .root_source_file = b.path("src/main.zig"),
        .target = target,
        .optimize = optimize,
    });
    b.installArtifact(exe);

    // --- Run step ---
    const run_cmd = b.addRunArtifact(exe);
    run_cmd.step.dependOn(b.getInstallStep());
    if (b.args) |args| {
        run_cmd.addArgs(args);
    }
    const run_step = b.step("run", "Run the device firmware");
    run_step.dependOn(&run_cmd.step);

    // --- Unit tests ---
    const unit_tests = b.addTest(.{
        .root_source_file = b.path("src/main.zig"),
        .target = target,
        .optimize = optimize,
    });
    const run_unit_tests = b.addRunArtifact(unit_tests);
    const test_step = b.step("test", "Run unit tests");
    test_step.dependOn(&run_unit_tests.step);

    // --- Flash step (MCU targets) ---
    const flash_step = b.step("flash", "Flash firmware to MCU via probe-rs");
    const flash_cmd = b.addSystemCommand(&.{
        "probe-rs",
        "download",
        "--chip",
        "STM32H743ZITx", // Change per target MCU
    });
    flash_cmd.addArtifactArg(exe);
    flash_step.dependOn(&flash_cmd.step);
}
```

### build.zig.zon

```zig
.{
    .name = .@"novasyn_{device_name}",
    .version = "0.1.0",
    .fingerprint = 0x0000000000000000, // Generate: zig build --generate-fingerprint
    .minimum_zig_version = "0.15.0",
    .paths = .{
        "build.zig",
        "build.zig.zon",
        "src",
    },
}
```

### src/main.zig

```zig
const std = @import("std");
const config = @import("config.zig");

const VERSION = "0.1.0";

const Command = enum {
    run,
    simulate,
    @"test-hardware",
    version,
    help,
};

pub fn main() !void {
    var gpa_instance: std.heap.GeneralPurposeAllocator(.{}) = .{};
    defer _ = gpa_instance.deinit();
    const gpa = gpa_instance.allocator();

    const args = try std.process.argsAlloc(gpa);
    defer std.process.argsFree(gpa, args);

    const command: Command = if (args.len > 1)
        std.meta.stringToEnum(Command, args[1]) orelse .help
    else
        .help;

    switch (command) {
        .run => try runDevice(gpa, false),
        .simulate => try runDevice(gpa, true),
        .@"test-hardware" => try testHardware(gpa),
        .version => try printVersion(),
        .help => try printHelp(),
    }
}

fn runDevice(allocator: std.mem.Allocator, simulate: bool) !void {
    const cfg = try config.load(allocator);
    defer cfg.deinit(allocator);

    if (simulate) {
        std.log.info("Running in SIMULATION mode — no hardware access", .{});
    }

    std.log.info("NovaSyn {device_name} v{s} starting", .{VERSION});
    std.log.info("Device ID: {s}", .{cfg.device_id});

    // TODO: Initialize HAL (real or simulated based on `simulate`)
    // TODO: Initialize drivers
    // TODO: Initialize services
    // TODO: Start main loop

    std.log.info("Device running. Press Ctrl+C to stop.", .{});

    // Main loop placeholder — replace with actual service loop
    while (true) {
        std.time.sleep(1_000_000_000); // 1 second
    }
}

fn testHardware(allocator: std.mem.Allocator) !void {
    const cfg = try config.load(allocator);
    defer cfg.deinit(allocator);

    std.log.info("Running hardware self-test...", .{});

    // TODO: Test each peripheral:
    // 1. GPIO: toggle status LED
    // 2. I2C: scan bus, verify expected addresses respond
    // 3. Sensors: read each sensor, verify data in valid range
    // 4. Actuators: move to known position and back (SAFE values only)
    // 5. Communication: publish test MQTT message

    std.log.info("Hardware self-test complete.", .{});
}

fn printVersion() !void {
    const stdout = std.io.getStdOut().writer();
    try stdout.print("novasyn_{device_name} v{s}\n", .{VERSION});
}

fn printHelp() !void {
    const stdout = std.io.getStdOut().writer();
    try stdout.writeAll(
        \\novasyn_{device_name} — NovaSyn {Device} Device Firmware
        \\
        \\Usage: novasyn_{device_name} <command>
        \\
        \\Commands:
        \\  run             Run the device firmware (requires hardware)
        \\  simulate        Run in simulation mode (no hardware required)
        \\  test-hardware   Run hardware self-test
        \\  version         Print version
        \\  help            Print this help
        \\
    );
}

test "config loads with defaults" {
    const cfg = try config.load(std.testing.allocator);
    defer cfg.deinit(std.testing.allocator);
    try std.testing.expect(cfg.device_id.len > 0);
}
```

### src/config.zig

```zig
const std = @import("std");

/// Device configuration loaded from /etc/novasyn/device.json (or defaults).
pub const Config = struct {
    // --- Identity ---
    device_id: []const u8,
    device_type: []const u8,
    device_name: []const u8,

    // --- Network ---
    mqtt_broker: []const u8,
    mqtt_port: u16,
    mqtt_client_id: []const u8,

    // --- BabyAI ---
    babyai_url: []const u8,
    babyai_api_key: []const u8,
    babyai_phone_home_interval_s: u32,

    // --- Power ---
    power_profile: []const u8, // "mains", "battery", "solar"

    // --- Simulation ---
    simulate: bool,

    // Internal: holds allocated memory for JSON strings
    _arena: std.heap.ArenaAllocator,

    const Self = @This();

    pub const CONFIG_PATH = "/etc/novasyn/device.json";

    pub fn load(allocator: std.mem.Allocator) !Self {
        var arena = std.heap.ArenaAllocator.init(allocator);
        errdefer arena.deinit();
        const arena_alloc = arena.allocator();

        // Try to read config file; use defaults if not found
        const file_content = std.fs.cwd().readFileAlloc(
            arena_alloc,
            CONFIG_PATH,
            1024 * 64, // 64KB max config
        ) catch |err| switch (err) {
            error.FileNotFound => return defaults(arena),
            else => return err,
        };

        return parse(arena, file_content);
    }

    fn parse(arena: std.heap.ArenaAllocator, content: []const u8) !Self {
        const arena_alloc = arena.allocator();
        const parsed = try std.json.parseFromSlice(
            std.json.Value,
            arena_alloc,
            content,
            .{},
        );

        const root = parsed.value.object;

        return Self{
            .device_id = getStr(root, "device_id") orelse "unprovisioned",
            .device_type = getStr(root, "device_type") orelse "{device_name}",
            .device_name = getStr(root, "device_name") orelse "NovaSyn {Device}",
            .mqtt_broker = getStr(root, "mqtt_broker") orelse "localhost",
            .mqtt_port = getU16(root, "mqtt_port") orelse 1883,
            .mqtt_client_id = getStr(root, "mqtt_client_id") orelse "unprovisioned",
            .babyai_url = getStr(root, "babyai_url") orelse "https://novasynchris-babyai.hf.space",
            .babyai_api_key = getStr(root, "babyai_api_key") orelse "",
            .babyai_phone_home_interval_s = getU32(root, "babyai_phone_home_interval_s") orelse 300,
            .power_profile = getStr(root, "power_profile") orelse "mains",
            .simulate = getBool(root, "simulate") orelse false,
            ._arena = arena,
        };
    }

    fn defaults(arena: std.heap.ArenaAllocator) Self {
        return Self{
            .device_id = "unprovisioned",
            .device_type = "{device_name}",
            .device_name = "NovaSyn {Device}",
            .mqtt_broker = "localhost",
            .mqtt_port = 1883,
            .mqtt_client_id = "unprovisioned",
            .babyai_url = "https://novasynchris-babyai.hf.space",
            .babyai_api_key = "",
            .babyai_phone_home_interval_s = 300,
            .power_profile = "mains",
            .simulate = false,
            ._arena = arena,
        };
    }

    pub fn deinit(self: *const Self, _: std.mem.Allocator) void {
        // Arena owns all allocated strings — one call frees everything
        var arena = self._arena;
        arena.deinit();
    }

    // --- JSON helpers ---

    fn getStr(obj: std.json.ObjectMap, key: []const u8) ?[]const u8 {
        if (obj.get(key)) |val| {
            if (val == .string) return val.string;
        }
        return null;
    }

    fn getU16(obj: std.json.ObjectMap, key: []const u8) ?u16 {
        if (obj.get(key)) |val| {
            if (val == .integer) return @intCast(val.integer);
        }
        return null;
    }

    fn getU32(obj: std.json.ObjectMap, key: []const u8) ?u32 {
        if (obj.get(key)) |val| {
            if (val == .integer) return @intCast(val.integer);
        }
        return null;
    }

    fn getBool(obj: std.json.ObjectMap, key: []const u8) ?bool {
        if (obj.get(key)) |val| {
            if (val == .bool) return val.bool;
        }
        return null;
    }
};

test "defaults load without config file" {
    const cfg = try Config.load(std.testing.allocator);
    defer cfg.deinit(std.testing.allocator);
    try std.testing.expectEqualStrings("unprovisioned", cfg.device_id);
    try std.testing.expectEqualStrings("localhost", cfg.mqtt_broker);
    try std.testing.expectEqual(@as(u16, 1883), cfg.mqtt_port);
    try std.testing.expectEqual(false, cfg.simulate);
}
```

### src/hal/gpio.zig

```zig
const std = @import("std");

/// GPIO pin direction.
pub const Direction = enum {
    input,
    output,
};

/// GPIO pin pull mode.
pub const Pull = enum {
    none,
    up,
    down,
};

/// GPIO pin level.
pub const Level = enum(u1) {
    low = 0,
    high = 1,
};

/// GPIO HAL interface — vtable-based for platform abstraction.
///
/// Usage:
///   const gpio = platform.getGpio();      // returns Gpio
///   try gpio.setDirection(17, .output);
///   try gpio.write(17, .high);
///   const level = try gpio.read(17);
pub const Gpio = struct {
    ptr: *anyopaque,
    vtable: *const VTable,

    pub const VTable = struct {
        set_direction: *const fn (ctx: *anyopaque, pin: u8, dir: Direction) anyerror!void,
        set_pull: *const fn (ctx: *anyopaque, pin: u8, pull: Pull) anyerror!void,
        read: *const fn (ctx: *anyopaque, pin: u8) anyerror!Level,
        write: *const fn (ctx: *anyopaque, pin: u8, level: Level) anyerror!void,
    };

    pub fn setDirection(self: Gpio, pin: u8, dir: Direction) !void {
        return self.vtable.set_direction(self.ptr, pin, dir);
    }

    pub fn setPull(self: Gpio, pin: u8, pull: Pull) !void {
        return self.vtable.set_pull(self.ptr, pin, pull);
    }

    pub fn read(self: Gpio, pin: u8) !Level {
        return self.vtable.read(self.ptr, pin);
    }

    pub fn write(self: Gpio, pin: u8, level: Level) !void {
        return self.vtable.write(self.ptr, pin, level);
    }
};

/// Simulation GPIO — stores pin state in memory. Used for host testing.
pub const SimGpio = struct {
    pin_levels: [64]Level = [_]Level{.low} ** 64,
    pin_directions: [64]Direction = [_]Direction{.input} ** 64,

    const Self = @This();

    pub fn gpio(self: *Self) Gpio {
        return .{
            .ptr = @ptrCast(self),
            .vtable = &vtable,
        };
    }

    const vtable = Gpio.VTable{
        .set_direction = setDirectionImpl,
        .set_pull = setPullImpl,
        .read = readImpl,
        .write = writeImpl,
    };

    fn setDirectionImpl(ctx: *anyopaque, pin: u8, dir: Direction) !void {
        const self: *Self = @ptrCast(@alignCast(ctx));
        if (pin >= 64) return error.InvalidPin;
        self.pin_directions[pin] = dir;
    }

    fn setPullImpl(_: *anyopaque, pin: u8, _: Pull) !void {
        if (pin >= 64) return error.InvalidPin;
        // Simulation: pull mode has no effect on pin level
    }

    fn readImpl(ctx: *anyopaque, pin: u8) !Level {
        const self: *Self = @ptrCast(@alignCast(ctx));
        if (pin >= 64) return error.InvalidPin;
        return self.pin_levels[pin];
    }

    fn writeImpl(ctx: *anyopaque, pin: u8, level: Level) !void {
        const self: *Self = @ptrCast(@alignCast(ctx));
        if (pin >= 64) return error.InvalidPin;
        if (self.pin_directions[pin] != .output) return error.PinNotOutput;
        self.pin_levels[pin] = level;
    }
};

// --- Tests ---

test "sim gpio set direction and write" {
    var sim = SimGpio{};
    const g = sim.gpio();

    try g.setDirection(5, .output);
    try g.write(5, .high);
    try std.testing.expectEqual(Level.high, try g.read(5));

    try g.write(5, .low);
    try std.testing.expectEqual(Level.low, try g.read(5));
}

test "sim gpio write to input pin fails" {
    var sim = SimGpio{};
    const g = sim.gpio();

    // Pin defaults to input — writing should fail
    try std.testing.expectError(error.PinNotOutput, g.write(5, .high));
}

test "sim gpio invalid pin" {
    var sim = SimGpio{};
    const g = sim.gpio();

    try std.testing.expectError(error.InvalidPin, g.read(64));
    try std.testing.expectError(error.InvalidPin, g.setDirection(64, .output));
}
```

### src/hal/i2c.zig

```zig
const std = @import("std");

/// I2C HAL interface — vtable-based for platform abstraction.
///
/// Usage:
///   const i2c = platform.getI2c();      // returns I2c
///   var buf: [6]u8 = undefined;
///   try i2c.readRegister(0x76, 0xFA, &buf);
pub const I2c = struct {
    ptr: *anyopaque,
    vtable: *const VTable,

    pub const VTable = struct {
        /// Read `buf.len` bytes starting at `register` from device at `address`.
        read_register: *const fn (
            ctx: *anyopaque,
            address: u7,
            register: u8,
            buf: []u8,
        ) anyerror!void,

        /// Write `data` starting at `register` to device at `address`.
        write_register: *const fn (
            ctx: *anyopaque,
            address: u7,
            register: u8,
            data: []const u8,
        ) anyerror!void,

        /// Scan the bus and return a list of responding addresses.
        scan: *const fn (
            ctx: *anyopaque,
            results: *std.BoundedArray(u7, 128),
        ) anyerror!void,
    };

    pub fn readRegister(self: I2c, address: u7, register: u8, buf: []u8) !void {
        return self.vtable.read_register(self.ptr, address, register, buf);
    }

    pub fn writeRegister(self: I2c, address: u7, register: u8, data: []const u8) !void {
        return self.vtable.write_register(self.ptr, address, register, data);
    }

    pub fn scan(self: I2c, results: *std.BoundedArray(u7, 128)) !void {
        return self.vtable.scan(self.ptr, results);
    }
};

/// Simulation I2C — stores register banks per address. Used for host testing.
///
/// Pre-populate simulated devices:
///   var sim = SimI2c{};
///   sim.addDevice(0x76, &bme280_registers);
pub const SimI2c = struct {
    /// Simulated device register banks: address → 256-byte register file.
    devices: [128]?*[256]u8 = [_]?*[256]u8{null} ** 128,

    const Self = @This();

    /// Register a simulated device at the given I2C address.
    /// The caller provides a pointer to a 256-byte register file that persists
    /// for the lifetime of the SimI2c.
    pub fn addDevice(self: *Self, address: u7, registers: *[256]u8) void {
        self.devices[@intCast(address)] = registers;
    }

    pub fn i2c(self: *Self) I2c {
        return .{
            .ptr = @ptrCast(self),
            .vtable = &vtable,
        };
    }

    const vtable = I2c.VTable{
        .read_register = readRegisterImpl,
        .write_register = writeRegisterImpl,
        .scan = scanImpl,
    };

    fn readRegisterImpl(ctx: *anyopaque, address: u7, register: u8, buf: []u8) !void {
        const self: *Self = @ptrCast(@alignCast(ctx));
        const dev = self.devices[@intCast(address)] orelse return error.DeviceNotFound;
        const start: usize = @intCast(register);
        if (start + buf.len > 256) return error.RegisterOutOfRange;
        @memcpy(buf, dev[start..][0..buf.len]);
    }

    fn writeRegisterImpl(ctx: *anyopaque, address: u7, register: u8, data: []const u8) !void {
        const self: *Self = @ptrCast(@alignCast(ctx));
        const dev = self.devices[@intCast(address)] orelse return error.DeviceNotFound;
        const start: usize = @intCast(register);
        if (start + data.len > 256) return error.RegisterOutOfRange;
        @memcpy(dev[start..][0..data.len], data);
    }

    fn scanImpl(ctx: *anyopaque, results: *std.BoundedArray(u7, 128)) !void {
        const self: *Self = @ptrCast(@alignCast(ctx));
        results.len = 0;
        for (self.devices, 0..) |dev, i| {
            if (dev != null) {
                try results.append(@intCast(i));
            }
        }
    }
};

// --- Tests ---

test "sim i2c read and write register" {
    var sim = SimI2c{};
    var regs = [_]u8{0} ** 256;
    sim.addDevice(0x76, &regs);
    const bus = sim.i2c();

    // Write calibration data
    try bus.writeRegister(0x76, 0x88, &[_]u8{ 0xAA, 0xBB, 0xCC });

    // Read it back
    var buf: [3]u8 = undefined;
    try bus.readRegister(0x76, 0x88, &buf);
    try std.testing.expectEqualSlices(u8, &[_]u8{ 0xAA, 0xBB, 0xCC }, &buf);
}

test "sim i2c read from absent device" {
    var sim = SimI2c{};
    const bus = sim.i2c();

    var buf: [1]u8 = undefined;
    try std.testing.expectError(error.DeviceNotFound, bus.readRegister(0x76, 0x00, &buf));
}

test "sim i2c scan finds registered devices" {
    var sim = SimI2c{};
    var regs_a = [_]u8{0} ** 256;
    var regs_b = [_]u8{0} ** 256;
    sim.addDevice(0x50, &regs_a);
    sim.addDevice(0x76, &regs_b);
    const bus = sim.i2c();

    var results: std.BoundedArray(u7, 128) = .{};
    try bus.scan(&results);
    try std.testing.expectEqual(@as(usize, 2), results.len);
    try std.testing.expectEqual(@as(u7, 0x50), results.buffer[0]);
    try std.testing.expectEqual(@as(u7, 0x76), results.buffer[1]);
}
```

---

## Python Templates

### pyproject.toml

```toml
[project]
name = "novasyn-{device_name}"
version = "0.1.0"
description = "NovaSyn {Device} — device application layer"
requires-python = ">=3.12"
dependencies = [
    "paho-mqtt>=2.1.0",
    "structlog>=24.4.0",
    "pydantic>=2.10.0",
    "pydantic-settings>=2.7.0",
    "httpx>=0.28.0",
    "ollama>=0.4.0",
]

[project.optional-dependencies]
dev = [
    "pytest>=8.3.0",
    "pytest-asyncio>=0.24.0",
    "mypy>=1.13.0",
    "ruff>=0.8.0",
]

[project.scripts]
novasyn-{device_name} = "novasyn_{device_name}.main:run"

[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"

[tool.hatch.build.targets.wheel]
packages = ["src/novasyn_{device_name}"]

[tool.mypy]
python_version = "3.12"
strict = true
warn_return_any = true
warn_unused_configs = true

[tool.pytest.ini_options]
testpaths = ["tests"]
asyncio_mode = "auto"

[tool.ruff]
target-version = "py312"
line-length = 100

[tool.ruff.lint]
select = ["E", "F", "I", "N", "W", "UP", "ANN", "B", "SIM"]
```

### src/novasyn_{device_name}/\_\_init\_\_.py

```python
"""NovaSyn {Device} — device application layer."""

__version__ = "0.1.0"
```

### src/novasyn_{device_name}/main.py

```python
"""Async entry point for the NovaSyn {Device} application."""

import asyncio
import signal
import sys

import structlog

from .config import Settings

log = structlog.get_logger()


class Application:
    """Main application lifecycle manager."""

    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self._shutdown_event = asyncio.Event()
        self._tasks: list[asyncio.Task[None]] = []

    async def start(self) -> None:
        """Initialize all services and start the main loop."""
        log.info(
            "starting",
            device_id=self.settings.device_id,
            device_type=self.settings.device_type,
            simulate=self.settings.simulate,
        )

        # Register signal handlers for graceful shutdown
        loop = asyncio.get_running_loop()
        for sig in (signal.SIGINT, signal.SIGTERM):
            loop.add_signal_handler(sig, self._handle_shutdown)

        # TODO: Initialize services
        # self._tasks.append(asyncio.create_task(self._mqtt_loop()))
        # self._tasks.append(asyncio.create_task(self._phone_home_loop()))
        # self._tasks.append(asyncio.create_task(self._sensor_loop()))

        log.info("all services started, waiting for shutdown signal")
        await self._shutdown_event.wait()
        await self._shutdown()

    def _handle_shutdown(self) -> None:
        """Signal handler — triggers graceful shutdown."""
        log.info("shutdown signal received")
        self._shutdown_event.set()

    async def _shutdown(self) -> None:
        """Stop all services gracefully."""
        log.info("shutting down services")

        # Cancel all running tasks
        for task in self._tasks:
            task.cancel()

        # Wait for tasks to finish (with timeout)
        if self._tasks:
            await asyncio.wait(self._tasks, timeout=10.0)

        # TODO: Set hardware to safe state before exit
        # await self._set_safe_state()

        log.info("shutdown complete")


def run() -> None:
    """CLI entry point."""
    try:
        settings = Settings.load()
    except Exception as e:
        print(f"Failed to load configuration: {e}", file=sys.stderr)
        sys.exit(1)

    structlog.configure(
        processors=[
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.processors.add_log_level,
            structlog.dev.ConsoleRenderer(),
        ],
    )

    app = Application(settings)
    asyncio.run(app.start())


if __name__ == "__main__":
    run()
```

### src/novasyn_{device_name}/config.py

```python
"""Configuration management — loads from /etc/novasyn/device.json."""

from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any

from pydantic import BaseModel, Field


CONFIG_PATH = Path(os.environ.get("NOVASYN_CONFIG", "/etc/novasyn/device.json"))


class MqttSettings(BaseModel):
    """MQTT broker connection settings."""

    broker: str = "localhost"
    port: int = 1883
    client_id: str = "unprovisioned"
    username: str = ""
    password: str = ""
    tls: bool = False
    keepalive_s: int = 60


class BabyAiSettings(BaseModel):
    """BabyAI phone-home configuration."""

    url: str = "https://novasynchris-babyai.hf.space"
    api_key: str = ""
    phone_home_interval_s: int = 300
    timeout_s: int = 30
    enabled: bool = True


class Settings(BaseModel):
    """Root device configuration."""

    # Identity
    device_id: str = "unprovisioned"
    device_type: str = "{device_name}"
    device_name: str = "NovaSyn {Device}"

    # Subsystems
    mqtt: MqttSettings = Field(default_factory=MqttSettings)
    babyai: BabyAiSettings = Field(default_factory=BabyAiSettings)

    # Power
    power_profile: str = "mains"  # "mains", "battery", "solar"

    # Runtime
    simulate: bool = False
    log_level: str = "INFO"

    @classmethod
    def load(cls) -> Settings:
        """Load settings from device.json, falling back to defaults."""
        # Environment override for simulation mode
        simulate = os.environ.get("NOVASYN_SIMULATE", "").lower() in ("1", "true", "yes")

        if CONFIG_PATH.exists():
            raw: dict[str, Any] = json.loads(CONFIG_PATH.read_text())
            settings = cls.model_validate(raw)
        else:
            settings = cls()

        if simulate:
            settings.simulate = True

        return settings
```

### src/novasyn_{device_name}/comms/\_\_init\_\_.py

```python
"""Communication subsystems — MQTT, UART, etc."""
```

### src/novasyn_{device_name}/comms/mqtt_client.py

```python
"""MQTT client wrapper with auto-reconnect and Last Will and Testament."""

from __future__ import annotations

import json
from typing import Any, Callable

import paho.mqtt.client as mqtt
import structlog

from ..config import MqttSettings

log = structlog.get_logger()

MessageHandler = Callable[[str, dict[str, Any]], None]


class MqttClient:
    """MQTT client for device communication.

    Features:
    - Auto-reconnect with exponential backoff (handled by paho loop)
    - Last Will and Testament (device goes offline → broker publishes status)
    - Structured JSON payloads
    - Topic prefix based on device ID
    """

    def __init__(
        self,
        device_id: str,
        settings: MqttSettings,
    ) -> None:
        self.device_id = device_id
        self.settings = settings
        self.topic_prefix = f"novasyn/{device_id}"
        self._handlers: dict[str, MessageHandler] = {}

        # Configure client
        self._client = mqtt.Client(
            client_id=settings.client_id,
            protocol=mqtt.MQTTv5,
            callback_api_version=mqtt.CallbackAPIVersion.VERSION2,
        )

        if settings.username:
            self._client.username_pw_set(settings.username, settings.password)

        if settings.tls:
            self._client.tls_set()

        # Last Will and Testament — broker publishes this if we disconnect unexpectedly
        lwt_topic = f"{self.topic_prefix}/status"
        lwt_payload = json.dumps({"state": "offline", "ts": 0})
        self._client.will_set(lwt_topic, lwt_payload, qos=1, retain=True)

        # Callbacks
        self._client.on_connect = self._on_connect
        self._client.on_message = self._on_message
        self._client.on_disconnect = self._on_disconnect

    def connect(self) -> None:
        """Connect to the MQTT broker and start the network loop."""
        log.info(
            "mqtt connecting",
            broker=self.settings.broker,
            port=self.settings.port,
        )
        self._client.connect(
            self.settings.broker,
            self.settings.port,
            keepalive=self.settings.keepalive_s,
        )
        self._client.loop_start()

    def disconnect(self) -> None:
        """Publish online=false, then disconnect cleanly."""
        self.publish("status", {"state": "offline"}, retain=True)
        self._client.loop_stop()
        self._client.disconnect()
        log.info("mqtt disconnected")

    def publish(
        self,
        subtopic: str,
        payload: dict[str, Any],
        qos: int = 1,
        retain: bool = False,
    ) -> None:
        """Publish a JSON payload to {topic_prefix}/{subtopic}."""
        topic = f"{self.topic_prefix}/{subtopic}"
        raw = json.dumps(payload)
        self._client.publish(topic, raw, qos=qos, retain=retain)

    def subscribe(self, subtopic: str, handler: MessageHandler) -> None:
        """Subscribe to {topic_prefix}/{subtopic} with a handler."""
        topic = f"{self.topic_prefix}/{subtopic}"
        self._handlers[topic] = handler
        self._client.subscribe(topic, qos=1)
        log.info("mqtt subscribed", topic=topic)

    # --- Callbacks ---

    def _on_connect(
        self,
        client: mqtt.Client,
        userdata: Any,
        flags: mqtt.ConnectFlags,
        reason_code: mqtt.ReasonCode,
        properties: mqtt.Properties | None,
    ) -> None:
        if reason_code.is_failure:
            log.error("mqtt connection failed", reason=str(reason_code))
            return

        log.info("mqtt connected")

        # Publish online status
        self.publish("status", {"state": "online"}, retain=True)

        # Re-subscribe to all registered topics (in case of reconnect)
        for topic in self._handlers:
            client.subscribe(topic, qos=1)

    def _on_message(
        self,
        client: mqtt.Client,
        userdata: Any,
        msg: mqtt.MQTTMessage,
    ) -> None:
        handler = self._handlers.get(msg.topic)
        if handler is None:
            log.warning("mqtt unhandled message", topic=msg.topic)
            return

        try:
            payload: dict[str, Any] = json.loads(msg.payload.decode())
            handler(msg.topic, payload)
        except (json.JSONDecodeError, UnicodeDecodeError) as e:
            log.error("mqtt invalid payload", topic=msg.topic, error=str(e))

    def _on_disconnect(
        self,
        client: mqtt.Client,
        userdata: Any,
        flags: mqtt.DisconnectFlags,
        reason_code: mqtt.ReasonCode,
        properties: mqtt.Properties | None,
    ) -> None:
        log.warning("mqtt disconnected", reason=str(reason_code))
```

### src/novasyn_{device_name}/ai/\_\_init\_\_.py

```python
"""AI integration — BabyAI phone-home, local inference."""
```

### src/novasyn_{device_name}/ai/babyai_client.py

```python
"""BabyAI phone-home client — async HTTP client for the BabyAI co-op API."""

from __future__ import annotations

import time
from typing import Any

import httpx
import structlog

from ..config import BabyAiSettings

log = structlog.get_logger()


class BabyAiClient:
    """Async client for BabyAI phone-home.

    Provides:
    - Health check (verify connectivity)
    - Chat completions (complex queries the device cannot handle locally)
    - Telemetry push (device health, sensor data, interaction logs)
    - Feedback submission (user preference signals)
    """

    def __init__(self, device_id: str, settings: BabyAiSettings) -> None:
        self.device_id = device_id
        self.settings = settings
        self._client = httpx.AsyncClient(
            base_url=settings.url,
            timeout=httpx.Timeout(settings.timeout_s),
            headers={
                "Authorization": f"Bearer {settings.api_key}",
                "X-Device-Id": device_id,
                "User-Agent": f"NovaSyn-Device/{device_id}",
            },
        )

    async def close(self) -> None:
        """Close the HTTP client."""
        await self._client.aclose()

    async def health_check(self) -> bool:
        """Check if BabyAI is reachable."""
        try:
            response = await self._client.get("/health")
            healthy = response.status_code == 200
            log.debug("babyai health check", healthy=healthy)
            return healthy
        except httpx.HTTPError as e:
            log.warning("babyai health check failed", error=str(e))
            return False

    async def chat(
        self,
        messages: list[dict[str, str]],
        model: str | None = None,
        max_tokens: int = 1024,
    ) -> dict[str, Any] | None:
        """Send a chat completion request to BabyAI.

        Returns the full response dict, or None if the request failed.
        The device should fall back to local inference on failure.
        """
        payload: dict[str, Any] = {
            "messages": messages,
            "max_tokens": max_tokens,
        }
        if model:
            payload["model"] = model

        try:
            response = await self._client.post("/v1/chat/completions", json=payload)
            response.raise_for_status()
            result: dict[str, Any] = response.json()
            log.debug("babyai chat response", model=result.get("model"))
            return result
        except httpx.HTTPError as e:
            log.warning("babyai chat failed", error=str(e))
            return None

    async def push_telemetry(
        self,
        data: dict[str, Any],
    ) -> bool:
        """Push telemetry data to BabyAI.

        Data should include device health metrics, sensor summaries,
        and interaction statistics. Raw sensor data should be aggregated
        before sending (see 00_PHILOSOPHY § BabyAI Flywheel).
        """
        payload = {
            "device_id": self.device_id,
            "timestamp": int(time.time()),
            "data": data,
        }

        try:
            response = await self._client.post("/v1/telemetry", json=payload)
            response.raise_for_status()
            log.debug("babyai telemetry pushed")
            return True
        except httpx.HTTPError as e:
            log.warning("babyai telemetry push failed", error=str(e))
            return False

    async def submit_feedback(
        self,
        interaction_id: str,
        selected_response_id: str,
    ) -> bool:
        """Submit user preference feedback (Mosh Pit selection signal).

        When the device presents multiple AI responses and the user selects one,
        this feedback strengthens BabyAI's calibration for that model/context.
        """
        payload = {
            "interaction_id": interaction_id,
            "selected_id": selected_response_id,
            "device_id": self.device_id,
        }

        try:
            response = await self._client.post("/v1/feedback/select", json=payload)
            response.raise_for_status()
            return True
        except httpx.HTTPError as e:
            log.warning("babyai feedback failed", error=str(e))
            return False
```

---

## Deployment Templates

### config/device.json.example

```json
{
    "device_id": "{device_name}-001",
    "device_type": "{device_name}",
    "device_name": "NovaSyn {Device}",

    "mqtt": {
        "broker": "localhost",
        "port": 1883,
        "client_id": "{device_name}-001",
        "username": "",
        "password": "",
        "tls": false,
        "keepalive_s": 60
    },

    "babyai": {
        "url": "https://novasynchris-babyai.hf.space",
        "api_key": "",
        "phone_home_interval_s": 300,
        "timeout_s": 30,
        "enabled": true
    },

    "power_profile": "mains",
    "simulate": false,
    "log_level": "INFO",

    "sensors": {
        "poll_interval_s": 15,
        "devices": [
            {
                "name": "bme280",
                "bus": "i2c",
                "address": "0x76",
                "enabled": true
            }
        ]
    },

    "actuators": {
        "watchdog_timeout_ms": 500,
        "devices": []
    },

    "voice": {
        "enabled": false,
        "wake_word": "hey nova",
        "stt_model": "whisper-tiny",
        "tts_engine": "piper",
        "sample_rate": 16000
    },

    "privacy": {
        "phone_home_telemetry": true,
        "phone_home_interactions": false,
        "local_audio_retention_hours": 0
    }
}
```

### deploy/novasyn-{device_name}.service

```ini
[Unit]
Description=NovaSyn {Device} Application
After=network-online.target mosquitto.service
Wants=network-online.target

[Service]
Type=simple
User=novasyn
Group=novasyn
WorkingDirectory=/opt/novasyn/{device_name}

# Python application entry point
ExecStart=/opt/novasyn/{device_name}/.venv/bin/novasyn-{device_name}

# Graceful shutdown — sends SIGTERM, waits, then SIGKILL
TimeoutStopSec=15
KillMode=mixed
KillSignal=SIGTERM

# Restart policy
Restart=on-failure
RestartSec=5
StartLimitIntervalSec=300
StartLimitBurst=5

# Memory limit (adjust per device — prevents runaway services)
MemoryMax=512M
MemoryHigh=384M

# Logging
StandardOutput=journal
StandardError=journal
SyslogIdentifier=novasyn-{device_name}

# Environment
Environment=NOVASYN_CONFIG=/etc/novasyn/device.json
Environment=PYTHONUNBUFFERED=1

[Install]
WantedBy=multi-user.target
```

### deploy/novasyn-{device_name}-firmware.service

```ini
[Unit]
Description=NovaSyn {Device} Firmware Daemon
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=root
ExecStart=/usr/local/bin/novasyn_{device_name} run

# Hardware access requires root or appropriate group membership
# If using GPIO/I2C via sysfs, add User=novasyn and group permissions instead

# Restart policy — firmware should always be running
Restart=always
RestartSec=2
StartLimitIntervalSec=60
StartLimitBurst=10

# Watchdog integration — systemd kills the service if it stops pinging
WatchdogSec=30

# Logging
StandardOutput=journal
StandardError=journal
SyslogIdentifier=novasyn-{device_name}-fw

[Install]
WantedBy=multi-user.target
```

### deploy/deploy.sh

```bash
#!/usr/bin/env bash
set -euo pipefail

# NovaSyn Device Deployment Script
# Usage: ./deploy.sh <device_ip> [--firmware-only | --app-only]

DEVICE_NAME="{device_name}"
DEVICE_IP="${1:?Usage: ./deploy.sh <device_ip> [--firmware-only | --app-only]}"
MODE="${2:-all}"
SSH_USER="pi"
REMOTE="$SSH_USER@$DEVICE_IP"

FW_BINARY="firmware/zig-out/bin/novasyn_${DEVICE_NAME}"
FW_REMOTE="/usr/local/bin/novasyn_${DEVICE_NAME}"
FW_SERVICE="novasyn-${DEVICE_NAME}-firmware"

APP_DIR="app/"
APP_REMOTE="/opt/novasyn/${DEVICE_NAME}"
APP_SERVICE="novasyn-${DEVICE_NAME}"

echo "=== NovaSyn ${DEVICE_NAME} Deployment ==="
echo "Target: ${DEVICE_IP}"
echo "Mode: ${MODE}"
echo ""

# --- Firmware deployment ---
deploy_firmware() {
    echo "[1/4] Building firmware..."
    cd firmware
    zig build -Dtarget=arm-linux-gnueabihf -Doptimize=ReleaseSmall
    cd ..

    echo "[2/4] Stopping firmware service..."
    ssh "$REMOTE" "sudo systemctl stop ${FW_SERVICE} || true"

    echo "[3/4] Copying firmware binary..."
    scp "$FW_BINARY" "$REMOTE:/tmp/novasyn_${DEVICE_NAME}"
    ssh "$REMOTE" "sudo mv /tmp/novasyn_${DEVICE_NAME} ${FW_REMOTE} && sudo chmod +x ${FW_REMOTE}"

    echo "[4/4] Starting firmware service..."
    ssh "$REMOTE" "sudo systemctl start ${FW_SERVICE}"

    echo "Firmware deployed. Checking health..."
    sleep 2
    ssh "$REMOTE" "sudo systemctl is-active ${FW_SERVICE}"
}

# --- App deployment ---
deploy_app() {
    echo "[1/4] Syncing application..."
    rsync -avz --delete \
        --exclude '.venv' \
        --exclude '__pycache__' \
        --exclude '.mypy_cache' \
        --exclude '.pytest_cache' \
        "$APP_DIR" "$REMOTE:${APP_REMOTE}/"

    echo "[2/4] Stopping app service..."
    ssh "$REMOTE" "sudo systemctl stop ${APP_SERVICE} || true"

    echo "[3/4] Installing dependencies..."
    ssh "$REMOTE" "cd ${APP_REMOTE} && uv sync"

    echo "[4/4] Starting app service..."
    ssh "$REMOTE" "sudo systemctl start ${APP_SERVICE}"

    echo "App deployed. Checking health..."
    sleep 3
    ssh "$REMOTE" "sudo systemctl is-active ${APP_SERVICE}"
}

# --- Service file installation (first deploy only) ---
install_services() {
    echo "Installing systemd service files..."
    scp deploy/novasyn-${DEVICE_NAME}.service "$REMOTE:/tmp/"
    scp deploy/novasyn-${DEVICE_NAME}-firmware.service "$REMOTE:/tmp/"
    ssh "$REMOTE" "sudo mv /tmp/novasyn-${DEVICE_NAME}*.service /etc/systemd/system/ && sudo systemctl daemon-reload"
    ssh "$REMOTE" "sudo systemctl enable ${FW_SERVICE} ${APP_SERVICE}"
    echo "Service files installed and enabled."
}

case "$MODE" in
    --firmware-only) deploy_firmware ;;
    --app-only)      deploy_app ;;
    --install)       install_services ;;
    all)             deploy_firmware; deploy_app ;;
    *)               echo "Unknown mode: $MODE"; exit 1 ;;
esac

echo ""
echo "=== Deployment complete ==="
```
