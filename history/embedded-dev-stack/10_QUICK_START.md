# 10 — Quick Start: Scaffolding a New NovaSyn Embedded Device

> From zero to first deploy in 12 steps. Each step is small, testable, and reversible.

This document walks through creating a new NovaSyn embedded device project from scratch. Follow the steps in order. Do not skip steps — each one builds on the previous.

---

## The 12 Steps

### Step 1: Name & Register

Choose a device name and register it in the ecosystem.

1. **Pick a name.** Short, lowercase, no spaces. Examples: `nova`, `hex`, `robot`, `nullclaw_node`, `voice_sat`.
2. **Assign a device type ID.** Two-character code used in MQTT topics and telemetry. See 12_DEVICE_REGISTRY.md for existing assignments.
3. **Determine platforms:**
   - Brain platform: RPi 4, RPi 5, or none (MCU-only device)
   - Body platform: ESP32-S3, STM32F4, STM32H7, or none (brain-only device)
   - Both (brain + body architecture, see 03_ARCHITECTURE_PATTERNS)
4. **Add the device to 12_DEVICE_REGISTRY.md** with status "In Development."
5. **Define primary purpose** in one sentence. This constrains scope for all future sprints.

### Step 2: Create Repository

Create the project directory and initialize version control.

```bash
# From the novasyn_suite directory
mkdir novasyn_{device_name}
cd novasyn_{device_name}
git init

# Create .gitignore
cat > .gitignore << 'EOF'
# Zig
zig-out/
zig-cache/
.zig-cache/

# Python
__pycache__/
*.pyc
.venv/
.mypy_cache/
.pytest_cache/

# IDE
.vscode/
.idea/

# Build artifacts
*.bin
*.elf
*.hex

# Device secrets (never commit)
device.json
*.pem
*.key
EOF
```

### Step 3: Zig Firmware Scaffold

Set up the Zig project structure. See 11_PROJECT_TEMPLATE.md for complete boilerplate code to copy.

```
novasyn_{device_name}/
  firmware/
    build.zig              # Build system with cross-compilation targets
    build.zig.zon          # Package metadata
    src/
      main.zig             # Entry point (CLI: run, simulate, test-hardware, version)
      config.zig            # JSON config loader from /etc/novasyn/device.json
      hal/
        gpio.zig           # GPIO HAL interface (vtable-based)
        i2c.zig            # I2C HAL interface (vtable-based)
        spi.zig            # SPI HAL interface (vtable-based)
        uart.zig           # UART HAL interface (vtable-based)
        pwm.zig            # PWM HAL interface (vtable-based)
        platform/
          rpi.zig          # RPi HAL implementation (Linux sysfs/devmem)
          esp32.zig        # ESP32 HAL implementation (hardware registers)
          stm32.zig        # STM32 HAL implementation (CMSIS-like)
          sim.zig          # Simulation HAL (mock, for host testing)
      drivers/
        (sensor and actuator drivers go here)
      services/
        (application-level services go here)
      comms/
        mqtt.zig           # MQTT client (Zig, for MCU-only devices)
        uart_protocol.zig  # Brain-body UART command protocol
```

**Action:** Copy `build.zig`, `build.zig.zon`, `src/main.zig`, `src/config.zig`, `src/hal/gpio.zig`, and `src/hal/i2c.zig` from 11_PROJECT_TEMPLATE.md.

### Step 4: Python Application Scaffold (RPi devices only)

If the device has an RPi brain, set up the Python application layer.

```
novasyn_{device_name}/
  app/
    pyproject.toml           # uv project with dependencies
    src/
      novasyn_{device}/
        __init__.py
        main.py              # Async entry point with signal handling
        config.py            # Pydantic settings from device.json
        comms/
          __init__.py
          mqtt_client.py     # MQTT client with auto-reconnect, LWT
        ai/
          __init__.py
          babyai_client.py   # BabyAI phone-home (httpx async)
        services/
          __init__.py
          (device-specific services go here)
    tests/
      __init__.py
      conftest.py
      test_config.py
      test_mqtt.py
```

**Action:** Copy `pyproject.toml`, `__init__.py`, `main.py`, `config.py`, `mqtt_client.py`, and `babyai_client.py` from 11_PROJECT_TEMPLATE.md.

### Step 5: Hardware Spec

Document the physical device before writing any driver code.

1. **Create `HARDWARE_SPEC.md`:**
   - List every physical component (board, sensor, actuator, connector, power supply).
   - For each component: part number, datasheet link (or title), supply voltage, communication bus, I2C/SPI address.
   - Draw wiring diagrams as ASCII art or structured tables.
   - Calculate power budget: sum all peak current draws, compare to supply capacity, document margin.

2. **Create `PIN_MAP.md`:**
   - One table per board (RPi, ESP32, STM32).
   - Every GPIO: function, direction, peripheral, notes (pull-up/down, voltage level, series resistor).
   - Explicitly list unassigned GPIOs and "do not use" GPIOs.
   - See 09_AI_COLLABORATION.md section 2.3 for format.

### Step 6: Device Configuration

Create the `device.json` template and its documentation.

1. **Create `config/device.json.example`** — a complete example configuration (see 11_PROJECT_TEMPLATE.md for template).
2. **Create `DEVICE_CONFIG.md`** — document every field: name, type, default, valid range, description.
3. **Deployment path:** `/etc/novasyn/device.json` on the device. Never committed to git (contains device-specific identity and potentially secrets).

### Step 7: HAL Implementation

Implement the Hardware Abstraction Layer for the device's target platform(s).

1. **Start with GPIO** — the simplest interface. Implement the vtable for the target platform.
2. **Add the primary bus** — I2C or SPI, whichever the device's sensors/peripherals use.
3. **Implement the simulation HAL** — mock implementations of GPIO and bus for host testing. This is critical: without the simulation HAL, you cannot run tests on the development host.
4. **Verify:** `zig build test --summary all` passes with the simulation HAL.

### Step 8: First Driver

Pick the simplest sensor or peripheral on the device and implement the full driver.

1. **Read the datasheet.** Extract register map, initialization sequence, timing requirements.
2. **Implement the driver** using only HAL interfaces (no platform imports).
3. **Write unit tests** using the simulation HAL.
4. **If hardware is available:** ask the user to wire the sensor (per PIN_MAP.md) and run the binary on the device.

**Why the simplest sensor first:** it validates the entire HAL → driver → config → test pipeline end-to-end. Fixing problems here is cheap. Fixing them after 10 drivers are built is expensive.

### Step 9: Communication

Set up the device's communication layer.

1. **Install/configure MQTT broker** (Mosquitto on RPi gateway, or connect to existing broker).
2. **Implement MQTT client:**
   - Python: use `paho-mqtt` with the wrapper from 11_PROJECT_TEMPLATE.md.
   - Zig (MCU): use the lightweight MQTT client in `comms/mqtt.zig`.
3. **Define initial topics** — at minimum: `novasyn/{device_id}/status` (published) and `novasyn/{device_id}/cmd/#` (subscribed).
4. **Create `MQTT_TOPICS.md`** with the topic table (see 09_AI_COLLABORATION.md section 2.4).
5. **Verify:** publish a status message, subscribe to a command topic, confirm round-trip on local broker.

### Step 10: BabyAI Integration

Wire up the phone-home client to BabyAI.

1. **Use the `babyai_client.py` template** from 11_PROJECT_TEMPLATE.md.
2. **Configure in `device.json`:** BabyAI URL, API key, phone-home interval.
3. **Test health check:** `GET /health` to BabyAI. Verify response.
4. **Test simple query:** `POST /v1/chat/completions` with a test prompt. Verify response.
5. **Test telemetry push:** `POST /v1/telemetry` with device health data. Verify acceptance.
6. **Verify offline behavior:** disconnect network, confirm device continues operating, confirm telemetry is buffered locally.

### Step 11: Simulation Mode

Implement the `--simulate` flag for the complete application.

1. **Zig firmware:** when `--simulate` is passed, select the simulation HAL instead of the platform HAL. All drivers use mock data.
2. **Python app:** when `NOVASYN_SIMULATE=1` is set, use mock MQTT (in-memory), mock sensors (random data within valid ranges), mock BabyAI (local echo).
3. **Verify:** the entire application stack runs on the development host (Linux x86_64 or WSL2) without any hardware attached.
4. **Why this matters:** simulation mode enables AI agents to develop and test without physical hardware. It also enables CI/CD pipelines.

### Step 12: Deployment

Deploy to the physical device for the first time.

1. **Create systemd service file(s)** — see 11_PROJECT_TEMPLATE.md for template. One service for Zig firmware (if it runs as a daemon), one for Python application.
2. **Create `deploy.sh`** — deployment script that stops service, copies binary/package, starts service, runs health check.
3. **Set up OTA update manifest** — version, binary URL, checksum, rollback instructions.
4. **Deploy:**
   ```bash
   # From dev host
   scp firmware/zig-out/bin/novasyn_{device} pi@{device_ip}:/usr/local/bin/
   scp app/ pi@{device_ip}:/opt/novasyn/{device}/
   ssh pi@{device_ip} "sudo systemctl restart novasyn-{device}"
   ```
5. **Verify:** device comes online, publishes status on MQTT, responds to commands, phones home to BabyAI.
6. **Document the deployment procedure** in the project README.

---

## Common Pitfalls

These are the mistakes that cost hours. Read them before you start.

| Pitfall | Why It Hurts | Prevention |
|---------|-------------|------------|
| Forgetting to configure I2C bus speed | Default may be 100kHz; some sensors need 400kHz, some fail above 100kHz | Set bus speed explicitly in HAL init AND document in HARDWARE_SPEC.md |
| Not handling sensor initialization delays | Many sensors need 10-50ms after power-on before first valid read | Add `std.time.sleep()` or polling loop in driver init, document delay in driver header comment |
| Hardcoding pin numbers | Works on your bench, breaks on every other build | Always read pin assignments from `device.json` via config.zig/config.py |
| Not testing on actual hardware before merging | Simulation hides timing issues, electrical noise, power supply sag | Mark sprint as "HIL pending" until physical verification is done |
| Forgetting to set up the hardware watchdog | First firmware hang = device is bricked until power-cycled | Enable watchdog in step 7 (HAL implementation), not "later" |
| Not documenting physical wiring | Next AI session has no way to know what is connected to what | Update PIN_MAP.md and HARDWARE_SPEC.md in the same commit as the driver |
| Using 3.3V logic with 5V sensors | Magic smoke. Dead GPIO pin. Possibly dead board. | Verify voltage levels in datasheet. Add level shifter if needed. Document in HARDWARE_SPEC.md |
| No pull-up resistors on I2C bus | Bus works intermittently, fails under load or with long wires | Always add external pull-ups (4.7k to 3.3V typical). Document in PIN_MAP.md |
| Deploying without a rollback plan | Bad firmware = bricked device in a field | Always keep previous known-good binary on device. OTA manifest includes rollback version |

---

## Complete Directory Structure

A fully scaffolded device project with both Zig firmware and Python application:

```
novasyn_{device_name}/
├── .git/
├── .gitignore
├── README.md
├── SPRINT_PLAN.md                    # What's built, what's next
├── HARDWARE_SPEC.md                  # Physical components and wiring
├── PIN_MAP.md                        # Complete pin assignments
├── MQTT_TOPICS.md                    # All MQTT topics
├── API_REFERENCE.md                  # Brain-body protocol, service APIs
├── DEVICE_CONFIG.md                  # device.json schema docs
│
├── config/
│   └── device.json.example           # Example config (committed)
│
├── firmware/
│   ├── build.zig                     # Zig build system
│   ├── build.zig.zon                 # Package metadata
│   └── src/
│       ├── main.zig                  # Entry point (run, simulate, test-hardware, version)
│       ├── config.zig                # JSON config loader
│       ├── hal/
│       │   ├── gpio.zig             # GPIO HAL interface
│       │   ├── i2c.zig              # I2C HAL interface
│       │   ├── spi.zig              # SPI HAL interface
│       │   ├── uart.zig             # UART HAL interface
│       │   ├── pwm.zig              # PWM HAL interface
│       │   ├── adc.zig              # ADC HAL interface
│       │   └── platform/
│       │       ├── rpi.zig          # RPi Linux HAL
│       │       ├── esp32.zig        # ESP32 register HAL
│       │       ├── stm32.zig        # STM32 CMSIS HAL
│       │       └── sim.zig          # Simulation mock HAL
│       ├── drivers/
│       │   ├── bme280.zig           # Example: temp/humidity sensor
│       │   ├── vl53l0x.zig          # Example: distance sensor
│       │   └── motor.zig            # Example: DC motor driver
│       ├── services/
│       │   ├── sensor_fusion.zig    # Example: multi-sensor aggregation
│       │   └── motor_control.zig    # Example: PID control loop
│       └── comms/
│           ├── mqtt.zig             # MQTT client (MCU)
│           └── uart_protocol.zig    # Brain-body command protocol
│
├── app/                              # Python application (RPi only)
│   ├── pyproject.toml
│   └── src/
│       └── novasyn_{device}/
│           ├── __init__.py
│           ├── main.py              # Async entry point
│           ├── config.py            # Pydantic settings
│           ├── comms/
│           │   ├── __init__.py
│           │   └── mqtt_client.py   # MQTT wrapper
│           ├── ai/
│           │   ├── __init__.py
│           │   └── babyai_client.py # BabyAI phone-home
│           └── services/
│               ├── __init__.py
│               └── voice.py         # Example: voice pipeline service
│
├── tests/                            # Python tests
│   ├── __init__.py
│   ├── conftest.py
│   ├── test_config.py
│   └── test_mqtt.py
│
├── deploy/
│   ├── novasyn-{device}-firmware.service   # systemd unit (Zig daemon)
│   ├── novasyn-{device}-app.service        # systemd unit (Python app)
│   ├── deploy.sh                           # Deployment script
│   └── ota-manifest.json                   # OTA update metadata
│
└── docs/
    └── datasheets/                   # Local copies of key datasheets (optional)
```

**Notes on structure:**

- `firmware/` and `app/` are separate build roots. The Zig firmware can be built and deployed independently of the Python application.
- Handoff documents (`SPRINT_PLAN.md`, `PIN_MAP.md`, etc.) live at the project root for immediate visibility.
- `config/device.json.example` is committed. The actual `device.json` is deployed to `/etc/novasyn/` on the device and is NOT committed (contains device identity and keys).
- `tests/` at the root is for Python tests. Zig tests live alongside their source files (Zig convention).
- `deploy/` contains everything needed to get the software onto a device.
