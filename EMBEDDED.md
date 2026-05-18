# Embedded — Robots, Sensors, and Actuators

Agicore's embedded declarations describe physical hardware topology. The Tauri desktop app becomes the **operator console** — it monitors sensor nodes, issues actuator commands, manages the NullClaw agent, and bridges the brain-body UART protocol. Firmware for the devices themselves (Zig/Python) is scaffolded separately.

---

## Declaration Overview

| Declaration | What it models |
|-------------|---------------|
| `NODE` | A physical compute node (RPi, ESP32, etc.) with sensors, comms, and AI tier |
| `SENSOR` | A hardware sensor attached to a node (IMU, camera, environmental, etc.) |
| `ZONE` | A spatial grouping of nodes (room, greenhouse bay, building floor) |
| `ACTUATOR` | A hardware output device (motor, servo, relay, LED) with safety constraints |
| `PLATFORM` | Chip-level target for cross-compilation (RPi5, ESP32-S3, STM32H7) |
| `NULLCLAW` | NullClaw agent runtime config: providers, tool bindings, personality |
| `BRAIN_BODY` | UART brain-body protocol for split-architecture robots |

---

## NODE — Physical compute node

```agi
NODE robot_brain {
  DESCRIPTION "Mobile robot brain — RPi 5 with vision and voice"
  TYPE        actor
  HARDWARE    "Raspberry Pi 5"
  AI_TIER     edge
  COMMS       [wifi, uart]
  SENSORS     [camera_front, imu_body, mic_array]
  ZONE        workshop
  OFFLINE     true
  SAFETY      critical
}
```

### NODE fields

| Field | Required | Description |
|-------|----------|-------------|
| `DESCRIPTION` | Yes | Human-readable description |
| `TYPE` | Yes | `personal`, `environment`, `business`, `actor` |
| `HARDWARE` | Yes | Platform string (e.g., `"Raspberry Pi 5"`) |
| `AI_TIER` | Yes | `edge`, `cloud`, `hybrid` |
| `COMMS` | No | List of communication protocol names |
| `SENSORS` | No | List of SENSOR declaration names |
| `ZONE` | No | ZONE declaration name this node belongs to |
| `OFFLINE` | No | `true` if node operates without network |
| `SAFETY` | Yes | `low`, `medium`, `high`, `critical` |

---

## SENSOR — Hardware sensor

```agi
SENSOR imu_body {
  DESCRIPTION "6-axis IMU for robot body orientation"
  TYPE        imu
  MODEL       "MPU6050"
  CAPABILITIES [accelerometer, gyroscope]
  LATENCY     1
  ACCURACY    0.98
  FAILURE     "return last known value, flag stale"
}

SENSOR env_ambient {
  DESCRIPTION "Temperature, humidity, pressure"
  TYPE        environmental
  MODEL       "BME280"
  CAPABILITIES [temperature, humidity, pressure]
  LATENCY     40
  ACCURACY    0.95
}
```

### SENSOR fields

| Field | Required | Description |
|-------|----------|-------------|
| `DESCRIPTION` | Yes | Human-readable description |
| `TYPE` | Yes | `camera`, `microphone`, `imu`, `gps`, `environmental`, `proximity`, `custom` |
| `MODEL` | No | Hardware part number (e.g., `"MPU6050"`) |
| `CAPABILITIES` | No | List of capability strings |
| `LATENCY` | Yes | Measurement latency in milliseconds |
| `ACCURACY` | Yes | Accuracy as decimal 0.0–1.0 |
| `FAILURE` | No | Failure mode description for safety review |

---

## ZONE — Spatial grouping

```agi
ZONE workshop {
  DESCRIPTION "Robot workshop — motion detection active"
  NODES       [robot_brain, hex_sensor_01]
  AMBIENT     true
  CAPACITY    4
  HOURS       "8-20"
}
```

### ZONE fields

| Field | Required | Description |
|-------|----------|-------------|
| `DESCRIPTION` | Yes | Human-readable description |
| `NODES` | Yes | List of NODE names in this zone |
| `AMBIENT` | No | `true` if zone is always-on monitoring |
| `CAPACITY` | No | Occupancy capacity (informational) |
| `HOURS` | No | Operating hours string (e.g., `"8-20"`) |
| `BOUNDS` | No | Spatial bounds string (informational) |

---

## ACTUATOR — Hardware output device

```agi
ACTUATOR drive_left {
  DESCRIPTION "Left drive motor — differential drive"
  TYPE        motor
  MODEL       "L298N"
  SAFE_STATE  coast
  MAX_CURRENT 2000
  SLEW_RATE   10
  WATCHDOG    3000
}

ACTUATOR pan_servo {
  DESCRIPTION "Camera pan servo — 180° range"
  TYPE        servo
  MODEL       "SG90"
  SAFE_STATE  center
  WATCHDOG    5000
}

ACTUATOR status_led {
  DESCRIPTION "System status NeoPixel ring"
  TYPE        neopixel
  SAFE_STATE  off
}
```

### ACTUATOR fields

| Field | Required | Description |
|-------|----------|-------------|
| `DESCRIPTION` | Yes | Human-readable description |
| `TYPE` | Yes | `servo`, `motor`, `stepper`, `relay`, `led`, `neopixel`, `custom` |
| `MODEL` | No | Hardware part number |
| `SAFE_STATE` | Yes | State to enter on watchdog timeout: `off`, `coast`, `brake`, `center` |
| `MAX_CURRENT` | No | Maximum current draw in mA |
| `SLEW_RATE` | No | Maximum speed change per millisecond (% of range) |
| `WATCHDOG` | No | Heartbeat timeout in ms — actuator enters safe state if no command received |

### Safety contract

Every ACTUATOR has a `SAFE_STATE`. If the Tauri app goes silent (crash, disconnect), the embedded body should revert actuators to their safe states after the watchdog expires. The BRAIN_BODY declaration sets the overall watchdog timer; ACTUATOR watchdog is per-device.

**Never skip safe states for motors, relays, or anything that can cause physical harm.**

---

## PLATFORM — Cross-compile target

```agi
PLATFORM robot_brain {
  CHIP         rpi5
  OS           "Raspberry Pi OS Lite 64-bit"
  AI_RUNTIME   "ollama"
  CROSS_TARGET "aarch64-linux-gnu"
}

PLATFORM robot_body {
  CHIP         stm32h7
  OS           "bare-metal"
  AI_RUNTIME   "tflite"
  CROSS_TARGET "thumbv7em-none-eabihf"
}
```

### PLATFORM fields

| Field | Required | Description |
|-------|----------|-------------|
| `CHIP` | Yes | `rpi5`, `rpi4`, `esp32s3`, `stm32h7`, `stm32f4`, `x86`, `custom` |
| `OS` | No | OS description string (informational) |
| `AI_RUNTIME` | No | AI inference runtime: `ollama`, `tflite`, `onnx`, `none` |
| `CROSS_TARGET` | No | Zig/GCC triple for cross-compilation |

### What gets generated

- `scaffold/platforms/<name>.json` — complete platform config (arch, triple, AI runtime, OS)
- `scaffold/build_targets.zig` — Zig `build()` steps for each platform

---

## NULLCLAW — Agent runtime

See [NULLCLAW.md](NULLCLAW.md) for the full guide. Quick reference:

```agi
NULLCLAW {
  PATH "~/.nullclaw/config.json"
  PROVIDERS {
    ollama "http://localhost:11434"    1
    babyai "https://novasynchris-babyai.hf.space" 2
  }
  TOOLS {
    read_temperature  sensor_temperature_read
    set_led           actuator_led_set
    speak             tts_speak
    move_servo        actuator_pan_servo_set
  }
  PERSONALITY "You are Nova, a helpful home assistant robot. You can read sensors and control actuators."
}
```

---

## BRAIN_BODY — UART split-architecture protocol

```agi
BRAIN_BODY {
  BAUD      115200
  HEARTBEAT 1000
  WATCHDOG  3000
  ESTOP     "GPIO_24"
  COMMANDS  [PING, MOVE_SERVO, SET_MOTOR, SET_LED, READ_SENSORS, SET_MODE, ACK, NACK]
}
```

### BRAIN_BODY fields

| Field | Required | Description |
|-------|----------|-------------|
| `BAUD` | No | UART baud rate (default: 115200) |
| `HEARTBEAT` | No | Heartbeat interval in ms (default: 1000) |
| `WATCHDOG` | No | Watchdog timeout in ms — missing heartbeats → safe mode (default: 3000) |
| `ESTOP` | No | GPIO identifier for hardware E-stop input |
| `COMMANDS` | No | List of command names to put in the command enum |

### Frame format

```
[0xAA][CMD: u8][LEN: u8][PAYLOAD: LEN bytes][CHECKSUM: u8][0x55]
```

Checksum: XOR of CMD + LEN + all PAYLOAD bytes. The generated `brain_body.rs` includes frame encode/decode methods.

### Safety non-negotiables

- Body must enforce watchdog independently — if brain goes silent, all actuators enter safe states
- Hardware E-stop (physical button → relay) cannot be overridden by software
- Command rate limiting on body prevents runaway commands from software bugs
- Current monitoring via ADC catches motor stalls before thermal damage

---

## What gets generated

| Generated file | When |
|---------------|------|
| `src/types/hardware.ts` | NODE, SENSOR, or ZONE declared |
| `src-tauri/src/embedded/node_types.rs` | NODE or SENSOR declared |
| `src/components/DeviceDashboard.tsx` | NODE declared (protected) |
| `src/lib/actuators.ts` | ACTUATOR declared |
| `src-tauri/src/embedded/actuators.rs` | ACTUATOR declared |
| `scaffold/platforms/<name>.json` | Each PLATFORM declared |
| `scaffold/build_targets.zig` | PLATFORM declared |
| `scaffold/nullclaw/config.json` | NULLCLAW declared |
| `src/lib/nullclaw.ts` | NULLCLAW declared |
| `src-tauri/src/nullclaw.rs` | NULLCLAW declared |
| `src-tauri/src/embedded/brain_body.rs` | BRAIN_BODY declared |

---

## Example: complete robot declaration

```agi
PLATFORM robot_brain {
  CHIP         rpi5
  AI_RUNTIME   "ollama"
  CROSS_TARGET "aarch64-linux-gnu"
}

PLATFORM robot_body {
  CHIP         stm32h7
  AI_RUNTIME   "tflite"
  CROSS_TARGET "thumbv7em-none-eabihf"
}

SENSOR camera_front {
  DESCRIPTION "Pi Camera 3 — forward vision"
  TYPE        camera
  MODEL       "Pi Camera Module 3"
  CAPABILITIES [rgb, autofocus]
  LATENCY     30
  ACCURACY    0.99
}

SENSOR imu_body {
  DESCRIPTION "6-axis orientation"
  TYPE        imu
  MODEL       "MPU6050"
  CAPABILITIES [accelerometer, gyroscope]
  LATENCY     1
  ACCURACY    0.98
  FAILURE     "flag stale, hold last value"
}

ACTUATOR drive_left {
  DESCRIPTION "Left drive motor"
  TYPE        motor
  MODEL       "L298N"
  SAFE_STATE  coast
  MAX_CURRENT 2000
  SLEW_RATE   10
  WATCHDOG    3000
}

ACTUATOR drive_right {
  DESCRIPTION "Right drive motor"
  TYPE        motor
  MODEL       "L298N"
  SAFE_STATE  coast
  MAX_CURRENT 2000
  SLEW_RATE   10
  WATCHDOG    3000
}

NODE robot_rbi {
  DESCRIPTION "Mobile robot — brain (vision, voice, planning)"
  TYPE        actor
  HARDWARE    "Raspberry Pi 5"
  AI_TIER     edge
  COMMS       [wifi, uart]
  SENSORS     [camera_front, imu_body]
  OFFLINE     true
  SAFETY      critical
}

ZONE workshop {
  DESCRIPTION "Robot workshop"
  NODES       [robot_rbi]
  AMBIENT     true
}

BRAIN_BODY {
  BAUD      115200
  HEARTBEAT 1000
  WATCHDOG  3000
  ESTOP     "GPIO_24"
  COMMANDS  [PING, MOVE_SERVO, SET_MOTOR, SET_LED, READ_SENSORS, ACK, NACK]
}

NULLCLAW {
  PATH "~/.nullclaw/config.json"
  PROVIDERS {
    ollama "http://localhost:11434" 1
    babyai "https://novasynchris-babyai.hf.space" 2
  }
  TOOLS {
    read_imu          sensor_imu_body_read
    set_motor_left    actuator_drive_left_set
    set_motor_right   actuator_drive_right_set
    speak             tts_speak
  }
  PERSONALITY "You are Nova, a mobile robot assistant. Move carefully and announce your intentions before acting."
}
```

---

## Device registry

The 3G stack planned five device types. In Agicore DSL terms:

| Device | Brain | Body | Key declarations |
|--------|-------|------|-----------------|
| **Nova** (ambient AI) | RPi 5 | ESP32-S3 (opt) | NODE, SENSOR (mic/camera), ACTUATOR (speaker), NULLCLAW |
| **Hex** (sensor node) | None | ESP32-S3 | NODE, SENSOR (soil/temp/light), CHANNEL (MQTT) |
| **Robot** | RPi 5 | STM32H7 | NODE, SENSOR, ACTUATOR, BRAIN_BODY, NULLCLAW, PLATFORM ×2 |
| **NullClaw Node** | None | ESP32-S3 | NODE (LoRa gateway), CHANNEL |
| **Voice Satellite** | None | ESP32-S3 | NODE, SENSOR (mic), ACTUATOR (speaker) |
