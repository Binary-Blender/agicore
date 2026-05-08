# 07 — Shared Infrastructure

Cross-device shared systems for the NovaSyn embedded ecosystem. This is the equivalent of the Windows stack's shared API keys, theme system, and database patterns — adapted for hardware devices that communicate over MQTT, phone home to BabyAI, and need to be provisioned, updated, and managed in the field.

---

## BabyAI Phone-Home Protocol

Every NovaSyn embedded device is a BabyAI client. BabyAI is the co-op intelligence engine running at `https://novasynchris-babyai.hf.space` with an OpenAI-compatible API.

### Authentication

- API key format: `bai-` prefixed string (e.g., `bai-a1b2c3d4e5f6`)
- Storage: `device.json` field `network.babyai.api_key`
- **Never hardcoded** in source. Provisioned at first boot or via config update.
- Request header: `Authorization: Bearer bai-xxxx`
- On HuggingFace private space, also requires HF token: `X-HF-Token: hf_xxxx`

### Phone-Home Triggers

| Trigger | When | Priority |
|---|---|---|
| Complex query | Local LLM confidence below threshold (default 0.6) | High |
| Scheduled check-in | Hourly (configurable) | Low |
| User request | User explicitly asks to "ask the cloud" or query exceeds local capability | High |
| OTA check | Every 6 hours or on boot | Medium |
| Calibration sync | After user provides feedback or correction | Medium |
| Error escalation | Repeated driver failures or anomalous sensor patterns | Medium |

### Request Format

Standard OpenAI-compatible `/v1/chat/completions`:

```python
import httpx

BABYAI_URL = "https://novasynchris-babyai.hf.space"

async def phone_home(
    api_key: str,
    device_context: str,
    user_message: str,
    skill_docs: list[str] | None = None,
) -> str:
    """Send a query to BabyAI and return the response."""
    payload = {
        "model": "auto",  # let BabyAI route to best available model
        "messages": [
            {"role": "system", "content": device_context},
            {"role": "user", "content": user_message},
        ],
        "max_tokens": 500,  # keep responses concise for embedded
        "stream": False,    # no streaming on embedded — simpler handling
    }
    if skill_docs:
        payload["skill_docs"] = skill_docs

    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(
            f"{BABYAI_URL}/v1/chat/completions",
            json=payload,
            headers={"Authorization": f"Bearer {api_key}"},
        )
        response.raise_for_status()
        data = response.json()
        return data["choices"][0]["message"]["content"]
```

### Device Context Template

Every phone-home request includes a system prompt with device state:

```python
def build_device_context(config: DeviceConfig, sensors: EnvironmentSnapshot) -> str:
    """Build system prompt context for BabyAI requests."""
    return (
        f"You are assisting a NovaSyn {config.device.type} device "
        f"(ID: {config.device.id}). "
        f"Current sensor state: {sensors.to_context_string()}. "
        f"Location: {config.device.location}. "
        f"Mode: {config.power.current_profile}. "
        f"Capabilities: {', '.join(config.device.capabilities)}. "
        f"User preferences: {config.device.user_preferences or 'none set'}."
    )
```

Example rendered context:

```
You are assisting a NovaSyn ambient-ai device (ID: novasyn-ambient-a1b2c3).
Current sensor state: temp=24.3C, humidity=62%, pressure=101325Pa, motion=no.
Location: Springfield, MO. Mode: ACTIVE.
Capabilities: voice, temperature, humidity, pressure, display.
User preferences: prefers Fahrenheit, wake word sensitivity high.
```

### Fallback When BabyAI Is Unreachable

```python
async def query_ai(query: str, context: str) -> str:
    """Query AI with automatic fallback chain."""
    # Try BabyAI first (if internet available)
    if network_available():
        try:
            return await phone_home(config.network.babyai.api_key, context, query)
        except (httpx.ConnectError, httpx.TimeoutException):
            logger.warning("BabyAI unreachable, falling back to local LLM")

    # Fall back to local Ollama
    try:
        return await query_local_llm(query, context)
    except Exception:
        logger.warning("Local LLM failed, using canned response")

    # Last resort: canned responses
    return get_canned_response(query)
```

### Cost Management

- Track token usage via BabyAI: `GET /v1/users/me/usage`
- Daily budget limit in config: `network.babyai.daily_token_budget` (default: 10000)
- When budget exhausted: fall back to local LLM for remainder of the day
- Budget resets at midnight UTC
- Token tracking is approximate (estimate from message length before sending)

```python
class TokenBudget:
    def __init__(self, daily_limit: int = 10000):
        self.daily_limit = daily_limit
        self.tokens_used_today = 0
        self.reset_date = date.today()

    def can_spend(self, estimated_tokens: int) -> bool:
        if date.today() > self.reset_date:
            self.tokens_used_today = 0
            self.reset_date = date.today()
        return (self.tokens_used_today + estimated_tokens) <= self.daily_limit

    def record_usage(self, tokens: int):
        self.tokens_used_today += tokens
```

---

## MQTT Infrastructure

### Broker

- **Default**: Mosquitto running locally on the RPi (for single-device or local mesh)
- **Multi-device**: Mosquitto on a dedicated RPi or cloud broker (e.g., EMQX, HiveMQ Cloud free tier)
- **Config**: `network.mqtt.broker_host`, `network.mqtt.broker_port` (default 1883, TLS on 8883)
- **Authentication**: username/password in `device.json`, TLS client certificates for production

### Topic Hierarchy

```
novasyn/{device_id}/{subsystem}/{data_type}
```

**Standard Subsystems**:

| Subsystem | Description | Example Topics |
|---|---|---|
| `sensors` | All sensor readings and status | `novasyn/abc123/sensors/bme280/reading` |
| `actuators` | Motor, servo, relay state and commands | `novasyn/abc123/actuators/servo0/position` |
| `audio` | Voice pipeline events | `novasyn/abc123/audio/wake_word/detected` |
| `system` | Device health, power, connectivity | `novasyn/abc123/system/status` |
| `ai` | AI inference events, routing decisions | `novasyn/abc123/ai/query/response` |
| `commands` | Inbound commands to the device | `novasyn/abc123/commands/reboot` |

**Standard Data Types**:

| Data Type | Direction | Description |
|---|---|---|
| `reading` | Device -> Broker | Periodic sensor data |
| `event` | Device -> Broker | One-time occurrence (wake word detected, button press) |
| `status` | Device -> Broker | Current state (online/offline, driver health) |
| `command` | Broker -> Device | Action request (move servo, change config) |
| `response` | Device -> Broker | Reply to a command |

### QoS Levels

| QoS | Use Case | Examples |
|---|---|---|
| 0 (At most once) | High-frequency sensor data where occasional loss is acceptable | Temperature readings every 5s |
| 1 (At least once) | Commands and events that should be delivered | Reboot command, alert events |
| 2 (Exactly once) | Critical operations where duplicates could cause problems | OTA update triggers, config changes |

### Retained Messages

- `novasyn/{device_id}/system/status` — **Retained**. Payload: `{"status": "online", ...}`. Set Last Will and Testament (LWT) to `{"status": "offline"}` so the broker publishes it if the device disconnects unexpectedly.
- `novasyn/{device_id}/sensors/latest` — **Retained**. Most recent aggregated sensor snapshot. Allows new subscribers to immediately get current state.

### Message Format

All MQTT messages are JSON with a common envelope:

```json
{
  "device_id": "novasyn-ambient-a1b2c3",
  "timestamp": "2026-03-13T14:30:00.000Z",
  "payload": { }
}
```

### Example Messages

**Sensor Reading** (`novasyn/abc123/sensors/bme280/reading`, QoS 0):

```json
{
  "device_id": "novasyn-ambient-a1b2c3",
  "timestamp": "2026-03-13T14:30:00.000Z",
  "payload": {
    "temperature_c": 24.3,
    "humidity_pct": 62.1,
    "pressure_pa": 101325.0
  }
}
```

**Audio Event** (`novasyn/abc123/audio/wake_word/detected`, QoS 1):

```json
{
  "device_id": "novasyn-ambient-a1b2c3",
  "timestamp": "2026-03-13T14:30:05.123Z",
  "payload": {
    "wake_word": "hey_nova",
    "confidence": 0.92,
    "audio_level_db": -24.5
  }
}
```

**System Status** (`novasyn/abc123/system/status`, QoS 1, Retained):

```json
{
  "device_id": "novasyn-ambient-a1b2c3",
  "timestamp": "2026-03-13T14:30:00.000Z",
  "payload": {
    "status": "online",
    "uptime_s": 86400,
    "firmware_version": "0.3.0",
    "app_version": "0.3.0",
    "cpu_temp_c": 52.3,
    "memory_used_mb": 412,
    "memory_total_mb": 1024,
    "disk_used_pct": 34,
    "wifi_rssi_dbm": -42,
    "power_profile": "ACTIVE"
  }
}
```

**Actuator Command** (`novasyn/abc123/commands/servo0/move`, QoS 1):

```json
{
  "device_id": "novasyn-ambient-a1b2c3",
  "timestamp": "2026-03-13T14:31:00.000Z",
  "payload": {
    "command": "move_to",
    "angle_deg": 90,
    "speed_dps": 180,
    "request_id": "cmd-x7y8z9"
  }
}
```

**Actuator Response** (`novasyn/abc123/actuators/servo0/response`, QoS 1):

```json
{
  "device_id": "novasyn-ambient-a1b2c3",
  "timestamp": "2026-03-13T14:31:00.250Z",
  "payload": {
    "request_id": "cmd-x7y8z9",
    "status": "completed",
    "actual_angle_deg": 90.2,
    "duration_ms": 245
  }
}
```

**AI Query/Response** (`novasyn/abc123/ai/query/response`, QoS 1):

```json
{
  "device_id": "novasyn-ambient-a1b2c3",
  "timestamp": "2026-03-13T14:32:00.000Z",
  "payload": {
    "query": "What's the weather going to be like?",
    "response": "Based on the dropping barometric pressure, it looks like weather may be changing. Current conditions are 24C and 62% humidity.",
    "ai_tier": "local_llm",
    "model": "qwen3:0.6b",
    "latency_ms": 1840,
    "tokens_used": 87
  }
}
```

### MQTT Client Implementation (Python)

```python
# src/services/mqtt_service.py

import asyncio
import json
from datetime import datetime, timezone

import aiomqtt

from config import DeviceConfig

class MqttService:
    def __init__(self, config: DeviceConfig):
        self.config = config
        self.device_id = config.device.id
        self.client: aiomqtt.Client | None = None
        self._command_handlers: dict[str, callable] = {}

    async def connect(self):
        """Connect to MQTT broker with LWT."""
        lwt = aiomqtt.Will(
            topic=f"novasyn/{self.device_id}/system/status",
            payload=json.dumps({
                "device_id": self.device_id,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "payload": {"status": "offline"},
            }),
            qos=1,
            retain=True,
        )

        self.client = aiomqtt.Client(
            hostname=self.config.network.mqtt.broker_host,
            port=self.config.network.mqtt.broker_port,
            username=self.config.network.mqtt.username,
            password=self.config.network.mqtt.password,
            will=lwt,
        )
        await self.client.__aenter__()

        # Publish online status
        await self.publish("system/status", {"status": "online"}, qos=1, retain=True)

        # Subscribe to commands
        await self.client.subscribe(f"novasyn/{self.device_id}/commands/#", qos=1)

        # Start command listener
        asyncio.create_task(self._listen_commands())

    async def publish(
        self,
        subtopic: str,
        payload: dict,
        qos: int = 0,
        retain: bool = False,
    ):
        """Publish a message with standard envelope."""
        topic = f"novasyn/{self.device_id}/{subtopic}"
        message = {
            "device_id": self.device_id,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "payload": payload,
        }
        await self.client.publish(topic, json.dumps(message), qos=qos, retain=retain)

    def on_command(self, command_path: str, handler: callable):
        """Register a handler for incoming commands."""
        self._command_handlers[command_path] = handler

    async def _listen_commands(self):
        """Listen for incoming commands and dispatch to handlers."""
        prefix = f"novasyn/{self.device_id}/commands/"
        async for message in self.client.messages:
            topic = str(message.topic)
            if topic.startswith(prefix):
                command_path = topic[len(prefix):]
                handler = self._command_handlers.get(command_path)
                if handler:
                    try:
                        payload = json.loads(message.payload)
                        await handler(payload.get("payload", {}))
                    except Exception as e:
                        logger.exception("Command handler error: %s", command_path)

    async def disconnect(self):
        """Publish offline status and disconnect."""
        if self.client:
            await self.publish("system/status", {"status": "offline"}, qos=1, retain=True)
            await self.client.__aexit__(None, None, None)
```

---

## OTA Update System

### Architecture

```
┌─────────────────────┐     ┌──────────────────────┐
│  Update Server      │     │  NovaSyn Device      │
│  (GitHub Releases   │────>│                      │
│   or self-hosted)   │     │  1. Check manifest   │
│                     │     │  2. Download binary   │
│  manifest.json      │     │  3. Verify checksum  │
│  firmware-rpi4.bin  │     │  4. Swap binary       │
│  app-0.3.0.tar.gz  │     │  5. Restart service   │
└─────────────────────┘     │  6. Health check      │
                            │  7. Rollback if fail  │
                            └──────────────────────┘
```

### Update Manifest

Hosted at a known URL (configured in `device.json`):

```json
{
  "latest": {
    "version": "0.3.0",
    "release_date": "2026-03-13",
    "release_notes": "Added BME280 sensor support, improved voice latency",
    "platforms": {
      "rpi4": {
        "firmware": {
          "url": "https://github.com/novasynchris/novasyn-embedded/releases/download/v0.3.0/firmware-rpi4.bin",
          "sha256": "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2",
          "size_bytes": 524288
        },
        "app": {
          "url": "https://github.com/novasynchris/novasyn-embedded/releases/download/v0.3.0/app-0.3.0.tar.gz",
          "sha256": "f7e8d9c0b1a2f7e8d9c0b1a2f7e8d9c0b1a2f7e8d9c0b1a2f7e8d9c0b1a2f7e8",
          "size_bytes": 2097152
        },
        "config_migration": "0.2.0_to_0.3.0"
      },
      "esp32s3": {
        "firmware": {
          "url": "https://github.com/novasynchris/novasyn-embedded/releases/download/v0.3.0/firmware-esp32s3.bin",
          "sha256": "1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
          "size_bytes": 262144
        }
      }
    }
  },
  "minimum_version": "0.1.0"
}
```

### Update Flow

```python
# src/services/ota_service.py

import hashlib
import shutil
import subprocess
from pathlib import Path

import httpx

from config import DeviceConfig

INSTALL_DIR = Path("/opt/novasyn")
BACKUP_DIR = Path("/opt/novasyn/backup")
DOWNLOAD_DIR = Path("/tmp/novasyn-update")


class OtaService:
    def __init__(self, config: DeviceConfig):
        self.config = config
        self.manifest_url = config.system.ota.manifest_url
        self.current_version = config.system.version
        self.platform = config.device.platform  # "rpi4", "rpi5", "esp32s3"

    async def check_for_update(self) -> dict | None:
        """Check if an update is available. Returns manifest entry or None."""
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(self.manifest_url)
            response.raise_for_status()
            manifest = response.json()

        latest = manifest["latest"]
        if self._version_gt(latest["version"], self.current_version):
            platform_info = latest["platforms"].get(self.platform)
            if platform_info:
                return {"version": latest["version"], **platform_info}
        return None

    async def apply_update(self, update: dict) -> bool:
        """Download, verify, and apply an update. Returns True on success."""
        DOWNLOAD_DIR.mkdir(parents=True, exist_ok=True)
        BACKUP_DIR.mkdir(parents=True, exist_ok=True)

        try:
            # 1. Download firmware binary
            if "firmware" in update:
                fw = update["firmware"]
                fw_path = DOWNLOAD_DIR / "firmware.bin"
                await self._download_file(fw["url"], fw_path)

                # 2. Verify checksum
                if not self._verify_checksum(fw_path, fw["sha256"]):
                    raise ValueError("Firmware checksum mismatch")

                # 3. Backup current binary
                current_fw = INSTALL_DIR / "firmware"
                if current_fw.exists():
                    shutil.copy2(current_fw, BACKUP_DIR / "firmware.bak")

                # 4. Swap binary
                shutil.copy2(fw_path, current_fw)
                current_fw.chmod(0o755)

            # 5. Download and apply app update
            if "app" in update:
                app = update["app"]
                app_path = DOWNLOAD_DIR / "app.tar.gz"
                await self._download_file(app["url"], app_path)

                if not self._verify_checksum(app_path, app["sha256"]):
                    raise ValueError("App checksum mismatch")

                shutil.copy2(
                    INSTALL_DIR / "app" / "pyproject.toml",
                    BACKUP_DIR / "pyproject.toml.bak",
                )
                subprocess.run(
                    ["tar", "xzf", str(app_path), "-C", str(INSTALL_DIR / "app")],
                    check=True,
                )
                subprocess.run(
                    ["uv", "sync"],
                    cwd=str(INSTALL_DIR / "app"),
                    check=True,
                )

            # 6. Run config migration if needed
            if "config_migration" in update:
                self._run_config_migration(update["config_migration"])

            # 7. Restart services
            subprocess.run(["systemctl", "restart", "novasyn"], check=True)

            # 8. Health check (caller should verify within 60s)
            return True

        except Exception:
            logger.exception("Update failed, rolling back")
            self._rollback()
            return False

        finally:
            # Clean up download directory
            shutil.rmtree(DOWNLOAD_DIR, ignore_errors=True)

    def _rollback(self):
        """Restore backed-up binaries."""
        fw_backup = BACKUP_DIR / "firmware.bak"
        if fw_backup.exists():
            shutil.copy2(fw_backup, INSTALL_DIR / "firmware")
            (INSTALL_DIR / "firmware").chmod(0o755)
        subprocess.run(["systemctl", "restart", "novasyn"], check=False)

    async def _download_file(self, url: str, dest: Path):
        async with httpx.AsyncClient(timeout=300.0) as client:
            async with client.stream("GET", url) as response:
                response.raise_for_status()
                with open(dest, "wb") as f:
                    async for chunk in response.aiter_bytes(8192):
                        f.write(chunk)

    def _verify_checksum(self, path: Path, expected_sha256: str) -> bool:
        sha256 = hashlib.sha256()
        with open(path, "rb") as f:
            for chunk in iter(lambda: f.read(8192), b""):
                sha256.update(chunk)
        return sha256.hexdigest() == expected_sha256

    @staticmethod
    def _version_gt(a: str, b: str) -> bool:
        """Simple semver comparison."""
        def parse(v): return tuple(int(x) for x in v.split("."))
        return parse(a) > parse(b)

    def _run_config_migration(self, migration_id: str):
        """Run the appropriate config migration script."""
        subprocess.run(
            ["python3", f"/opt/novasyn/app/scripts/migrate_config.py", migration_id],
            check=True,
        )
```

### Rollback

- After restart, the device has 60 seconds to pass a health check (`GET /health` on the local API)
- If the health check fails (service does not start, crash loop, etc.), the systemd watchdog triggers rollback
- Rollback restores the backed-up firmware binary and restarts
- Rollback also restores `device.json.bak` if config migration was applied

### Zig Firmware Build

```bash
# Build optimized firmware binary for RPi 4
zig build -Doptimize=ReleaseSmall -Dtarget=aarch64-linux-gnu

# Output: zig-out/bin/novasyn-firmware (~200KB–500KB)
# Deploy to: /opt/novasyn/firmware
```

### Python App Deployment

```bash
# On the device, after extracting the tarball:
cd /opt/novasyn/app
uv sync  # installs/updates dependencies from pyproject.toml
```

---

## Device Identity and Provisioning

### Device ID Format

```
novasyn-{type}-{short_uuid}
```

Examples:
- `novasyn-ambient-a1b2c3` — Ambient AI Assistant
- `novasyn-hexnode-d4e5f6` — Hex Sensor Node (agriculture)
- `novasyn-rover-g7h8i9` — Mobile robot
- `novasyn-wallbot-j0k1l2` — WALL-E home assistant robot

### First Boot Provisioning

```python
# src/provisioning/first_boot.py

import json
import uuid
from pathlib import Path

DEVICE_ID_PATH = Path("/etc/novasyn/device_id")
CONFIG_PATH = Path("/etc/novasyn/device.json")
CONFIG_TEMPLATE_PATH = Path("/opt/novasyn/config/device.json.template")


def provision_device(device_type: str):
    """Run on first boot to generate identity and initial config."""
    # 1. Generate device ID
    if not DEVICE_ID_PATH.exists():
        short_uuid = uuid.uuid4().hex[:6]
        device_id = f"novasyn-{device_type}-{short_uuid}"
        DEVICE_ID_PATH.parent.mkdir(parents=True, exist_ok=True)
        DEVICE_ID_PATH.write_text(device_id)
    else:
        device_id = DEVICE_ID_PATH.read_text().strip()

    # 2. Create device.json from template
    if not CONFIG_PATH.exists():
        template = json.loads(CONFIG_TEMPLATE_PATH.read_text())
        template["device"]["id"] = device_id
        template["device"]["type"] = device_type
        template["config_version"] = "0.1.0"
        CONFIG_PATH.parent.mkdir(parents=True, exist_ok=True)
        CONFIG_PATH.write_text(json.dumps(template, indent=2))

    # 3. Register with BabyAI (best-effort, device works without this)
    try:
        register_with_babyai(device_id, device_type)
    except Exception:
        logger.warning("Could not register with BabyAI (will retry later)")

    # 4. Announce on MQTT (best-effort)
    try:
        announce_on_mqtt(device_id, device_type)
    except Exception:
        logger.warning("Could not announce on MQTT (will retry on connect)")

    return device_id
```

### Provisioning Methods

**Method 1: USB Config File**

1. Create `novasyn-provision.json` on a USB drive
2. Insert USB into device before first boot
3. Provisioning script detects and reads the file
4. Copies WiFi credentials, BabyAI API key, MQTT credentials

```json
{
  "wifi": {
    "ssid": "MyNetwork",
    "password": "mypassword"
  },
  "babyai": {
    "api_key": "bai-xxxxxxxxxxxx"
  },
  "mqtt": {
    "broker_host": "192.168.1.100",
    "username": "novasyn",
    "password": "mqttpassword"
  },
  "device": {
    "name": "Kitchen Assistant",
    "location": "Springfield, MO"
  }
}
```

**Method 2: BLE Pairing** (future)

1. Device boots into pairing mode (blue LED flashing)
2. NovaSyn mobile app scans for BLE devices
3. User selects device, enters WiFi and API credentials
4. Credentials transmitted over BLE encrypted channel
5. Device reboots into normal mode

**Method 3: QR Code** (future)

1. Device has a unique QR code on its label
2. QR encodes device serial number and provisioning URL
3. User scans QR, enters credentials in web form
4. Device fetches config from provisioning server using its serial number

---

## NullClaw Integration

NullClaw is the Zig runtime for autonomous agent behavior. It is already built (<1MB binary, 678KB typical) and provides tool-calling capability for LLMs.

### How NullClaw Fits

```
┌────────────────────────────┐
│  NullClaw (Agent Runtime)  │  ← personality, decision-making
├────────────────────────────┤
│  Python Application Layer  │  ← services, MQTT, HTTP
├────────────────────────────┤
│  Zig Firmware Layer        │  ← HAL, drivers, real-time control
├────────────────────────────┤
│  Hardware                  │
└────────────────────────────┘
```

### NullClaw Config for Embedded

```json
// ~/.nullclaw/config.json on the RPi
{
  "providers": [
    {
      "name": "local",
      "url": "http://localhost:11434/v1",
      "model": "qwen3:0.6b",
      "priority": 1
    },
    {
      "name": "babyai",
      "url": "https://novasynchris-babyai.hf.space/v1",
      "api_key": "bai-xxxxxxxxxxxx",
      "model": "auto",
      "priority": 2
    }
  ],
  "tools": [
    "read_temperature",
    "read_humidity",
    "read_pressure",
    "set_light",
    "play_sound",
    "send_mqtt",
    "check_time",
    "set_reminder"
  ],
  "personality": {
    "name": "Nova",
    "system_prompt": "You are Nova, a helpful ambient AI assistant. You can sense the environment and help with daily tasks. Be concise and friendly."
  },
  "constraints": {
    "max_tokens_per_response": 200,
    "max_tool_calls_per_turn": 5,
    "timeout_seconds": 30
  }
}
```

### Tool Mapping

NullClaw tools map directly to device capabilities through the Python application layer:

```python
# src/nullclaw/tool_bridge.py

from services.sensor_fusion import SensorFusionService
from services.mqtt_service import MqttService

class NullClawToolBridge:
    """Bridge NullClaw tool calls to device hardware."""

    def __init__(self, sensors: SensorFusionService, mqtt: MqttService):
        self.sensors = sensors
        self.mqtt = mqtt
        self.tools = {
            "read_temperature": self._read_temperature,
            "read_humidity": self._read_humidity,
            "read_pressure": self._read_pressure,
            "set_light": self._set_light,
            "play_sound": self._play_sound,
            "send_mqtt": self._send_mqtt,
        }

    async def execute_tool(self, name: str, args: dict) -> str:
        handler = self.tools.get(name)
        if not handler:
            return f"Unknown tool: {name}"
        return await handler(args)

    async def _read_temperature(self, args: dict) -> str:
        snapshot = self.sensors.latest
        if snapshot.temperature_c is None:
            return "Temperature sensor not available"
        unit = args.get("unit", "C")
        if unit == "F":
            return f"{snapshot.temperature_c * 9/5 + 32:.1f}F"
        return f"{snapshot.temperature_c:.1f}C"

    async def _read_humidity(self, args: dict) -> str:
        snapshot = self.sensors.latest
        if snapshot.humidity_pct is None:
            return "Humidity sensor not available"
        return f"{snapshot.humidity_pct:.0f}%"

    async def _read_pressure(self, args: dict) -> str:
        snapshot = self.sensors.latest
        if snapshot.pressure_pa is None:
            return "Pressure sensor not available"
        hpa = snapshot.pressure_pa / 100.0
        return f"{hpa:.1f} hPa"

    async def _set_light(self, args: dict) -> str:
        # Publish command to actuator via MQTT
        await self.mqtt.publish(
            "commands/light/set",
            {"brightness": args.get("brightness", 100), "color": args.get("color", "warm_white")},
            qos=1,
        )
        return "Light command sent"

    async def _play_sound(self, args: dict) -> str:
        # Trigger audio playback through the audio service
        sound = args.get("sound", "notification")
        await self.mqtt.publish("commands/audio/play", {"sound": sound}, qos=1)
        return f"Playing {sound}"

    async def _send_mqtt(self, args: dict) -> str:
        topic = args.get("topic", "")
        payload = args.get("payload", {})
        await self.mqtt.publish(topic, payload, qos=1)
        return f"Published to {topic}"
```

---

## Power Management

### Power Profiles

| Profile | Description | WiFi | Sensors | AI | Current Draw (est.) |
|---|---|---|---|---|---|
| `ACTIVE` | Full power, user present | On (continuous) | All polling | LLM loaded | ~2000mA (RPi 4) |
| `IDLE` | User away, monitoring | On (continuous) | Reduced polling (30s) | LLM unloaded | ~1200mA |
| `SLEEP` | Low power, wake on event | On (periodic, every 5 min) | Motion sensor only | Off | ~500mA |
| `DEEP_SLEEP` | Minimum power (MCU only) | Off | Wake on timer/GPIO | Off | ~10mA (ESP32) |

### Profile Transitions

```
         ┌─── voice/motion detected ───┐
         │                              │
         v                              │
   ┌──────────┐                  ┌──────────┐
   │  ACTIVE  │── 15 min idle ──>│   IDLE   │
   └──────────┘                  └──────────┘
                                      │
                                 30 min idle
                                      │
                                      v
                                 ┌──────────┐
                                 │  SLEEP   │
                                 └──────────┘
                                      │
                            (battery devices only)
                                      │
                                      v
                                ┌────────────┐
                                │ DEEP_SLEEP │
                                └────────────┘
```

### Power Budget Tracking

```python
# src/services/power_service.py

from dataclasses import dataclass

@dataclass
class PeripheralPower:
    name: str
    active_ma: float
    idle_ma: float
    sleep_ma: float

# Power budget for Ambient AI Assistant
POWER_BUDGET = [
    PeripheralPower("RPi 4 SoC",         600, 400, 200),
    PeripheralPower("WiFi (onboard)",     200, 200,  50),
    PeripheralPower("USB microphone",      50,  50,   0),
    PeripheralPower("Speaker amplifier",  500,  10,   0),
    PeripheralPower("BME280",               4,   0,   0),
    PeripheralPower("SSD1306 OLED",        20,  20,   0),
    PeripheralPower("PIR motion sensor",    1,   1,   1),
    PeripheralPower("NeoPixel LED ring",  600,  60,   0),
    # Total ACTIVE:                     ~1975mA
    # Total IDLE:                        ~741mA
    # Total SLEEP:                       ~251mA
]

def estimate_current_draw(profile: str) -> float:
    """Estimate total current draw in mA for a power profile."""
    attr = {"ACTIVE": "active_ma", "IDLE": "idle_ma", "SLEEP": "sleep_ma"}
    field = attr.get(profile, "active_ma")
    return sum(getattr(p, field) for p in POWER_BUDGET)
```

### Solar Charging (Hex Sensor Nodes)

For outdoor battery-powered sensor nodes:

- Solar panel: 6V 2W mini panel
- Charge controller: TP4056 or BQ25185 MPPT
- Battery: 18650 LiPo cell (3000mAh)
- Monitor: INA219 current/voltage sensor on I2C
- Logic: when battery drops below 20%, enter DEEP_SLEEP with longer wake intervals

---

## Shared Configuration Format

### File Location

All devices store configuration at `/etc/novasyn/device.json`.

### Schema Structure

```
device.json
├── device          # identity and metadata
├── network         # connectivity
│   ├── wifi
│   ├── mqtt
│   └── babyai
├── power           # power management
├── sensors         # sensor-specific configs (per device type)
├── actuators       # actuator-specific configs (per device type)
├── audio           # audio pipeline config (ambient AI only)
├── ai              # AI/LLM configuration
├── logging         # log level and destinations
└── system          # version, OTA, maintenance
```

### Complete Example: Ambient AI Assistant

```json
{
  "config_version": "0.3.0",

  "device": {
    "id": "novasyn-ambient-a1b2c3",
    "type": "ambient-ai",
    "name": "Kitchen Assistant",
    "location": "Springfield, MO",
    "platform": "rpi4",
    "capabilities": ["voice", "temperature", "humidity", "pressure", "motion", "display", "led"]
  },

  "network": {
    "wifi": {
      "ssid": "MyNetwork",
      "password": "encrypted:xxxxx",
      "country_code": "US"
    },
    "mqtt": {
      "broker_host": "192.168.1.100",
      "broker_port": 1883,
      "username": "novasyn",
      "password": "encrypted:xxxxx",
      "tls": false,
      "keepalive_s": 60
    },
    "babyai": {
      "url": "https://novasynchris-babyai.hf.space",
      "api_key": "encrypted:xxxxx",
      "daily_token_budget": 10000,
      "timeout_s": 60,
      "skill_docs": ["GENERAL_CODING", "FARMING_MISSOURI"]
    }
  },

  "power": {
    "source": "mains",
    "current_profile": "ACTIVE",
    "idle_timeout_m": 15,
    "sleep_timeout_m": 30,
    "wake_sources": ["voice", "motion", "mqtt_command"]
  },

  "sensors": {
    "bme280": {
      "enabled": true,
      "i2c_bus": 0,
      "i2c_address": "0x76",
      "poll_interval_ms": 5000,
      "temp_offset_c": -0.3,
      "hum_offset_pct": 0.0,
      "press_offset_pa": 0.0,
      "oversampling": 16
    },
    "pir": {
      "enabled": true,
      "gpio_pin": 17,
      "cooldown_s": 10
    }
  },

  "actuators": {
    "neopixel": {
      "enabled": true,
      "gpio_pin": 18,
      "num_leds": 12,
      "brightness_pct": 50,
      "idle_pattern": "breathing_blue",
      "active_pattern": "solid_white",
      "listening_pattern": "pulsing_green"
    }
  },

  "audio": {
    "input_device": "default",
    "output_device": "default",
    "sample_rate": 16000,
    "wake_word": "hey_nova",
    "wake_word_sensitivity": 0.7,
    "stt_model": "whisper-tiny",
    "tts_engine": "piper",
    "tts_voice": "en_US-lessac-medium",
    "tts_speed": 1.0,
    "volume_pct": 70,
    "noise_gate_db": -40
  },

  "ai": {
    "local_model": "qwen3:0.6b",
    "local_ollama_url": "http://localhost:11434",
    "confidence_threshold": 0.6,
    "max_local_tokens": 200,
    "max_remote_tokens": 500,
    "personality_name": "Nova",
    "personality_prompt": "You are Nova, a helpful ambient AI assistant. Be concise and friendly. You can sense the environment around you.",
    "enable_proactive_alerts": true,
    "alert_cooldown_m": 30
  },

  "logging": {
    "level": "INFO",
    "file": "/var/log/novasyn/device.log",
    "max_size_mb": 50,
    "max_files": 5,
    "mqtt_logging": false
  },

  "system": {
    "version": "0.3.0",
    "ota": {
      "enabled": true,
      "manifest_url": "https://github.com/novasynchris/novasyn-embedded/releases/latest/download/manifest.json",
      "check_interval_h": 6,
      "auto_update": false
    },
    "health_check_port": 8080,
    "watchdog_timeout_s": 60
  }
}
```

### Configuration Validation

```python
# src/config/validator.py

import json
from pathlib import Path
from dataclasses import dataclass
from typing import Any

CONFIG_PATH = Path("/etc/novasyn/device.json")

REQUIRED_FIELDS = [
    "config_version",
    "device.id",
    "device.type",
    "network.mqtt.broker_host",
]

def validate_config(config: dict) -> list[str]:
    """Validate device.json, return list of errors (empty = valid)."""
    errors = []

    # Check required fields
    for field_path in REQUIRED_FIELDS:
        obj = config
        for key in field_path.split("."):
            if isinstance(obj, dict) and key in obj:
                obj = obj[key]
            else:
                errors.append(f"Missing required field: {field_path}")
                break

    # Validate sensor configs
    sensors = config.get("sensors", {})
    if "bme280" in sensors:
        bme = sensors["bme280"]
        if bme.get("enabled"):
            addr = bme.get("i2c_address", "")
            if addr not in ("0x76", "0x77"):
                errors.append(f"Invalid BME280 address: {addr} (must be 0x76 or 0x77)")
            poll = bme.get("poll_interval_ms", 0)
            if poll < 1000:
                errors.append(f"BME280 poll interval too low: {poll}ms (minimum 1000)")

    # Validate power config
    power = config.get("power", {})
    valid_profiles = {"ACTIVE", "IDLE", "SLEEP", "DEEP_SLEEP"}
    if power.get("current_profile") not in valid_profiles:
        errors.append(f"Invalid power profile: {power.get('current_profile')}")

    # Validate AI config
    ai = config.get("ai", {})
    threshold = ai.get("confidence_threshold", 0.6)
    if not (0.0 <= threshold <= 1.0):
        errors.append(f"AI confidence threshold out of range: {threshold}")

    return errors


def load_and_validate() -> dict:
    """Load and validate device.json. Raises on invalid config."""
    config = json.loads(CONFIG_PATH.read_text())
    errors = validate_config(config)
    if errors:
        raise ValueError(f"Invalid config: {'; '.join(errors)}")
    return config
```

---

## NS Vault — Device Telemetry

Embedded devices write sensor readings, AI inference results, and significant events to NS Vault as vault items. This makes device data accessible from any NovaSyn app — a user can browse sensor history from their phone, or a web dashboard can chart telemetry trends.

Devices write to the vault via the BabyAI API (which proxies to the web backend's vault endpoints). Ambient AI devices can also browse the vault via voice commands.

### Architecture

```
NovaSyn Embedded Device
    |
    | POST /v1/vault/items (via BabyAI API)
    |
BabyAI Mothership (HuggingFace Space)
    |
    | Proxies to web backend vault API
    |
NovaSyn Web Backend
    |
    | PostgreSQL vault database
    |
NS Vault
    |
    | GET /v1/vault/items (from mobile/web apps)
    |
NovaSyn Mobile / Web Apps
```

### Vault Item Type: "telemetry"

Embedded devices use the `telemetry` item type for sensor data. This distinguishes device-generated data from user-generated content (chat exchanges, images, documents).

```python
# src/services/vault_writer.py

import httpx
from datetime import datetime, timezone
from config import DeviceConfig

BABYAI_URL = "https://novasynchris-babyai.hf.space"


class VaultWriter:
    """Write device data to NS Vault via the BabyAI API."""

    def __init__(self, config: DeviceConfig):
        self.config = config
        self.device_id = config.device.id
        self.api_key = config.network.babyai.api_key
        self.source_app = f"novasyn-device-{config.device.type}"

    async def write_telemetry(
        self,
        title: str,
        content: str,
        tags: list[str] | None = None,
        metadata: dict | None = None,
    ) -> str | None:
        """
        Write a telemetry item to NS Vault.

        Returns the vault item ID on success, None on failure.
        Non-critical — failures are logged but never block device operation.
        """
        payload = {
            "item_type": "telemetry",
            "source_app": self.source_app,
            "title": title,
            "content": content,
            "tags": tags or [],
            "metadata": {
                "device_id": self.device_id,
                "device_type": self.config.device.type,
                "location": self.config.device.location,
                **(metadata or {}),
            },
        }

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{BABYAI_URL}/v1/vault/items",
                    json=payload,
                    headers={"Authorization": f"Bearer {self.api_key}"},
                )
                if response.status_code == 201:
                    return response.json().get("id")
                else:
                    logger.warning(
                        "Vault write failed: %d %s",
                        response.status_code,
                        response.text,
                    )
                    return None
        except Exception:
            logger.warning("Vault write failed (network error)", exc_info=True)
            return None

    async def write_sensor_snapshot(
        self,
        sensors: dict[str, float],
        units: dict[str, str],
    ) -> str | None:
        """Write a sensor snapshot to the vault."""
        lines = [f"- {name}: {value} {units.get(name, '')}" for name, value in sensors.items()]
        content = "\n".join(lines)
        title = f"Sensor snapshot — {self.device_id}"

        return await self.write_telemetry(
            title=title,
            content=content,
            tags=["sensor-data", "automated"],
            metadata={
                "reading_type": "snapshot",
                "sensor_count": str(len(sensors)),
                "timestamp": datetime.now(timezone.utc).isoformat(),
                **{f"sensor_{k}": str(v) for k, v in sensors.items()},
            },
        )

    async def write_ai_result(
        self,
        query: str,
        response: str,
        model: str,
        ai_tier: str,
        tokens_used: int,
    ) -> str | None:
        """Write an AI inference result to the vault."""
        content = f"Query: {query}\n\nResponse: {response}"
        title = f"AI response — {query[:60]}"

        return await self.write_telemetry(
            title=title,
            content=content,
            tags=["ai-response", ai_tier],
            metadata={
                "model": model,
                "ai_tier": ai_tier,
                "tokens_used": str(tokens_used),
            },
        )

    async def write_alert(
        self,
        alert_type: str,
        message: str,
        severity: str = "info",
        sensor_data: dict | None = None,
    ) -> str | None:
        """Write a device alert to the vault."""
        title = f"Alert [{severity.upper()}]: {alert_type} — {self.device_id}"

        return await self.write_telemetry(
            title=title,
            content=message,
            tags=["alert", alert_type, severity],
            metadata={
                "alert_type": alert_type,
                "severity": severity,
                **({"sensor_data": str(sensor_data)} if sensor_data else {}),
            },
        )
```

### When to Write to Vault

Not every sensor reading goes to the vault — that would generate thousands of items per day. Devices write to the vault on significant events:

| Trigger | Item Type | Tags | Frequency |
|---|---|---|---|
| Hourly sensor snapshot | `telemetry` | `sensor-data`, `automated` | Every hour |
| AI inference result (from BabyAI) | `telemetry` | `ai-response`, tier name | Per cloud query |
| Alert (threshold exceeded) | `telemetry` | `alert`, type, severity | On occurrence |
| Daily summary | `telemetry` | `daily-summary`, `automated` | Once per day |
| User-initiated "save this reading" | `telemetry` | `sensor-data`, `user-saved` | On request |
| Firmware update event | `telemetry` | `system-event`, `ota` | On occurrence |

### Buffering for Offline

When the device is offline, vault writes are buffered locally and flushed when connectivity returns:

```python
# src/services/vault_buffer.py

import json
import sqlite3
from pathlib import Path
from datetime import datetime, timezone

BUFFER_DB = Path("/var/lib/novasyn/vault_buffer.db")


class VaultBuffer:
    """
    Buffer vault writes for offline operation.

    Writes are stored in a local SQLite database and flushed to the
    vault API when connectivity is restored.
    """

    def __init__(self):
        self.db = sqlite3.connect(str(BUFFER_DB))
        self.db.execute("""
            CREATE TABLE IF NOT EXISTS pending_writes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                payload TEXT NOT NULL,
                created_at TEXT NOT NULL,
                attempts INTEGER NOT NULL DEFAULT 0
            )
        """)
        self.db.commit()

    def enqueue(self, payload: dict) -> None:
        """Add a vault write to the buffer."""
        self.db.execute(
            "INSERT INTO pending_writes (payload, created_at) VALUES (?, ?)",
            (json.dumps(payload), datetime.now(timezone.utc).isoformat()),
        )
        self.db.commit()

    def get_pending(self, limit: int = 20) -> list[tuple[int, dict]]:
        """Get pending writes, oldest first."""
        rows = self.db.execute(
            "SELECT id, payload FROM pending_writes ORDER BY id ASC LIMIT ?",
            (limit,),
        ).fetchall()
        return [(row[0], json.loads(row[1])) for row in rows]

    def mark_sent(self, row_id: int) -> None:
        """Remove a successfully sent item from the buffer."""
        self.db.execute("DELETE FROM pending_writes WHERE id = ?", (row_id,))
        self.db.commit()

    def mark_failed(self, row_id: int) -> None:
        """Increment attempt count. Items with >5 attempts are dropped."""
        self.db.execute(
            "UPDATE pending_writes SET attempts = attempts + 1 WHERE id = ?",
            (row_id,),
        )
        self.db.execute("DELETE FROM pending_writes WHERE attempts > 5")
        self.db.commit()

    @property
    def pending_count(self) -> int:
        row = self.db.execute("SELECT COUNT(*) FROM pending_writes").fetchone()
        return row[0]
```

### Flush Task

```python
# In the main application loop or as a periodic task

async def flush_vault_buffer(
    buffer: VaultBuffer,
    writer: VaultWriter,
) -> None:
    """Flush buffered vault writes. Call periodically (e.g., every 5 minutes)."""
    pending = buffer.get_pending(limit=20)
    if not pending:
        return

    for row_id, payload in pending:
        try:
            result = await writer.write_telemetry(
                title=payload["title"],
                content=payload["content"],
                tags=payload.get("tags"),
                metadata=payload.get("metadata"),
            )
            if result:
                buffer.mark_sent(row_id)
            else:
                buffer.mark_failed(row_id)
        except Exception:
            buffer.mark_failed(row_id)
```

### Voice Vault Browsing (Ambient AI)

Ambient AI devices with voice capability can browse the vault using natural language:

```
User: "Hey Nova, what's in my vault tagged cover art?"

Nova -> BabyAI: {
  "messages": [
    {"role": "system", "content": "...device context..."},
    {"role": "user", "content": "Search my vault for items tagged 'cover art'"}
  ],
  "tools": [
    {
      "type": "function",
      "function": {
        "name": "search_vault",
        "description": "Search the user's NS Vault for items",
        "parameters": {
          "type": "object",
          "properties": {
            "query": {"type": "string"},
            "tags": {"type": "array", "items": {"type": "string"}},
            "item_types": {"type": "array", "items": {"type": "string"}}
          }
        }
      }
    }
  ]
}

BabyAI -> Vault API: POST /v1/vault/search { "tags": ["cover art"] }

Vault API -> BabyAI: { "items": [...] }

BabyAI -> Nova: "You have 3 items tagged 'cover art': 'Cyberpunk cityscape',
                  'Forest temple at dawn', and 'Book 1 final cover'. The most
                  recent was saved 2 days ago from NovaSyn Studio."

Nova -> Speaker: (TTS) "You have three items tagged cover art..."
```

The NullClaw tool bridge implements the vault search tool:

```python
# Added to src/nullclaw/tool_bridge.py

async def _search_vault(self, args: dict) -> str:
    """Search the user's vault via BabyAI."""
    query = args.get("query", "")
    tags = args.get("tags", [])
    item_types = args.get("item_types", [])

    payload = {
        "query": query,
        "tags": tags,
        "item_types": item_types,
        "limit": 5,
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            f"{BABYAI_URL}/v1/vault/search",
            json=payload,
            headers={"Authorization": f"Bearer {self.api_key}"},
        )

        if response.status_code != 200:
            return "Could not search the vault right now."

        data = response.json()
        items = data.get("items", [])

        if not items:
            return f"No vault items found matching '{query}'."

        summaries = []
        for item in items:
            tags_str = ", ".join(t["name"] for t in item.get("tags", []))
            summaries.append(
                f"- '{item['title']}' ({item['item_type']}, "
                f"from {item['source_app']}, tags: {tags_str})"
            )

        return f"Found {len(items)} vault items:\n" + "\n".join(summaries)
```

### Difference from Windows and Web Stacks

| Concern | Windows Stack | Web Stack | Embedded Stack |
|---|---|---|---|
| Vault access | Direct SQLite | REST API (owns DB) | REST API via BabyAI proxy |
| Primary use | Store user content | Store user content | Store device telemetry |
| Item type | Various (chat, image, etc.) | Various | Primarily `telemetry` |
| Write frequency | User-initiated | User-initiated | Automated (hourly + events) |
| Offline handling | N/A (always local) | N/A (always online) | Local buffer, flush on reconnect |
| Browsing | VaultBrowser UI component | VaultBrowser UI component | Voice commands via NullClaw |
| Auth | N/A (local file) | JWT token | BabyAI API key |

---

## Macro System — Device Actions

Embedded devices expose macros that can be invoked by the NovaSyn Orchestrator, web apps, or mobile apps. Unlike desktop apps that register macros in a local JSON file, embedded devices register their macros with the web backend's Macro Gateway via the BabyAI API.

### Architecture

```
NovaSyn Orchestrator / Web App / Mobile App
    |
    | POST /v1/macros/invoke
    |
Macro Gateway (Web Backend)
    |
    | Routes to device via BabyAI → MQTT
    |
BabyAI Mothership
    |
    | MQTT command to device
    |
NovaSyn Embedded Device
    |
    | Executes action, returns result
    |
    | MQTT response
    |
BabyAI Mothership
    |
    | Returns to Macro Gateway
    |
Macro Gateway
    |
    | HTTP response to caller
```

### Device Macros

Each device type exposes a set of macros based on its capabilities:

**Ambient AI Assistant (`novasyn-ambient-*`):**

| Macro | Description | Input | Output |
|---|---|---|---|
| `ambient.speak` | Speak text via TTS | `{ text, voice?, speed? }` | `{ spoken: true, duration_ms }` |
| `ambient.set_reminder` | Set a timed reminder | `{ message, when }` | `{ reminder_id, scheduled_at }` |
| `ambient.read_sensors` | Read current sensor values | `{ sensors?: string[] }` | `{ temperature_c, humidity_pct, pressure_pa, ... }` |
| `ambient.set_led` | Set LED pattern/color | `{ pattern, color?, brightness? }` | `{ applied: true }` |
| `ambient.play_sound` | Play a notification sound | `{ sound }` | `{ played: true }` |
| `ambient.get_status` | Get device status | `{}` | `{ online, uptime_s, power_profile, ... }` |

**Hex Sensor Node (`novasyn-hexnode-*`):**

| Macro | Description | Input | Output |
|---|---|---|---|
| `sensor.read_latest` | Read latest sensor values | `{ sensors?: string[] }` | `{ soil_moisture_pct, temperature_c, humidity_pct, ... }` |
| `sensor.read_history` | Read historical readings | `{ sensor, hours?: int }` | `{ readings: [...] }` |
| `sensor.set_interval` | Change polling interval | `{ interval_ms }` | `{ applied: true, previous_ms }` |
| `sensor.calibrate` | Trigger sensor calibration | `{ sensor }` | `{ calibrated: true }` |

**WALL-E Home Robot (`novasyn-wallbot-*`):**

| Macro | Description | Input | Output |
|---|---|---|---|
| `wallbot.move` | Move to a location | `{ direction, distance_cm, speed? }` | `{ moved: true, actual_cm }` |
| `wallbot.speak` | Speak text | `{ text }` | `{ spoken: true }` |
| `wallbot.take_photo` | Capture camera image | `{ resolution? }` | `{ vault_item_id, content_url }` |
| `wallbot.get_battery` | Read battery level | `{}` | `{ battery_pct, charging }` |

### Macro Registration

Devices register their macros on boot and when reconnecting to the network:

```python
# src/services/macro_registry.py

import httpx
from datetime import datetime, timezone
from config import DeviceConfig

BABYAI_URL = "https://novasynchris-babyai.hf.space"


class DeviceMacroRegistry:
    """Register device macros with the Macro Gateway via BabyAI."""

    def __init__(self, config: DeviceConfig):
        self.config = config
        self.device_id = config.device.id
        self.api_key = config.network.babyai.api_key

    async def register(self, macros: list[dict]) -> bool:
        """
        Register device macros with the Macro Gateway.

        Args:
            macros: List of macro definitions with name, description,
                    input_schema, and output_schema.

        Returns:
            True on successful registration.
        """
        payload = {
            "app_id": self.device_id,
            "display_name": f"{self.config.device.name} ({self.config.device.type})",
            "callback_url": f"mqtt://novasyn/{self.device_id}/commands/macro",
            "registered_at": datetime.now(timezone.utc).isoformat(),
            "macros": macros,
            "device_metadata": {
                "device_type": self.config.device.type,
                "platform": self.config.device.platform,
                "firmware_version": self.config.system.get("version", "unknown"),
                "capabilities": self.config.device.capabilities,
                "location": self.config.device.location,
            },
        }

        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                response = await client.post(
                    f"{BABYAI_URL}/v1/macros/register",
                    json=payload,
                    headers={"Authorization": f"Bearer {self.api_key}"},
                )
                return response.status_code == 200
        except Exception:
            logger.warning("Macro registration failed", exc_info=True)
            return False

    async def send_heartbeat(self) -> bool:
        """Send heartbeat to keep macros registered as online."""
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.post(
                    f"{BABYAI_URL}/v1/macros/heartbeat",
                    json={"app_id": self.device_id},
                    headers={"Authorization": f"Bearer {self.api_key}"},
                )
                return response.status_code == 200
        except Exception:
            return False
```

### Ambient AI Macro Definitions

```python
# src/macros/ambient_macros.py

AMBIENT_MACROS = [
    {
        "name": "ambient.speak",
        "description": "Speak text aloud via the device's TTS engine",
        "input_schema": {
            "type": "object",
            "properties": {
                "text": {"type": "string", "description": "Text to speak"},
                "voice": {"type": "string", "description": "TTS voice name (optional)"},
                "speed": {"type": "number", "description": "Speech speed multiplier (default 1.0)"},
            },
            "required": ["text"],
        },
        "output_schema": {
            "type": "object",
            "properties": {
                "spoken": {"type": "boolean"},
                "duration_ms": {"type": "integer"},
            },
        },
    },
    {
        "name": "ambient.set_reminder",
        "description": "Set a timed reminder that the device will announce via TTS",
        "input_schema": {
            "type": "object",
            "properties": {
                "message": {"type": "string", "description": "Reminder text"},
                "when": {"type": "string", "description": "ISO 8601 datetime for the reminder"},
            },
            "required": ["message", "when"],
        },
        "output_schema": {
            "type": "object",
            "properties": {
                "reminder_id": {"type": "string"},
                "scheduled_at": {"type": "string"},
            },
        },
    },
    {
        "name": "ambient.read_sensors",
        "description": "Read current sensor values from the device",
        "input_schema": {
            "type": "object",
            "properties": {
                "sensors": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Specific sensors to read (default: all)",
                },
            },
        },
        "output_schema": {
            "type": "object",
            "properties": {
                "temperature_c": {"type": "number"},
                "humidity_pct": {"type": "number"},
                "pressure_pa": {"type": "number"},
                "motion_detected": {"type": "boolean"},
            },
        },
    },
    {
        "name": "ambient.set_led",
        "description": "Set the LED ring pattern and color",
        "input_schema": {
            "type": "object",
            "properties": {
                "pattern": {
                    "type": "string",
                    "enum": ["solid", "breathing", "pulsing", "rainbow", "off"],
                },
                "color": {"type": "string", "description": "Hex color (e.g., '#3b82f6')"},
                "brightness": {"type": "integer", "description": "0-100 percent"},
            },
            "required": ["pattern"],
        },
        "output_schema": {
            "type": "object",
            "properties": {
                "applied": {"type": "boolean"},
            },
        },
    },
    {
        "name": "ambient.play_sound",
        "description": "Play a notification or alert sound",
        "input_schema": {
            "type": "object",
            "properties": {
                "sound": {
                    "type": "string",
                    "enum": ["notification", "alert", "chime", "success", "error"],
                },
            },
            "required": ["sound"],
        },
        "output_schema": {
            "type": "object",
            "properties": {
                "played": {"type": "boolean"},
            },
        },
    },
    {
        "name": "ambient.get_status",
        "description": "Get the device's current operational status",
        "input_schema": {
            "type": "object",
            "properties": {},
        },
        "output_schema": {
            "type": "object",
            "properties": {
                "online": {"type": "boolean"},
                "uptime_s": {"type": "integer"},
                "power_profile": {"type": "string"},
                "firmware_version": {"type": "string"},
                "cpu_temp_c": {"type": "number"},
                "memory_used_pct": {"type": "number"},
                "wifi_rssi_dbm": {"type": "integer"},
            },
        },
    },
]
```

### Macro Executor (Device Side)

The device receives macro invocations via MQTT and executes them locally:

```python
# src/macros/executor.py

import json
from datetime import datetime, timezone
from services.mqtt_service import MqttService
from services.sensor_fusion import SensorFusionService
from services.audio_service import AudioService
from services.reminder_service import ReminderService
from services.led_service import LedService
from services.system_monitor import SystemMonitor


class DeviceMacroExecutor:
    """Execute macro invocations received via MQTT."""

    def __init__(
        self,
        mqtt: MqttService,
        sensors: SensorFusionService,
        audio: AudioService,
        reminders: ReminderService,
        leds: LedService,
        monitor: SystemMonitor,
    ):
        self.mqtt = mqtt
        self.sensors = sensors
        self.audio = audio
        self.reminders = reminders
        self.leds = leds
        self.monitor = monitor

        self._handlers = {
            "ambient.speak": self._handle_speak,
            "ambient.set_reminder": self._handle_set_reminder,
            "ambient.read_sensors": self._handle_read_sensors,
            "ambient.set_led": self._handle_set_led,
            "ambient.play_sound": self._handle_play_sound,
            "ambient.get_status": self._handle_get_status,
        }

    def register_mqtt_handlers(self) -> None:
        """Register MQTT command handler for macro invocations."""
        self.mqtt.on_command("macro", self._on_macro_command)

    async def _on_macro_command(self, payload: dict) -> None:
        """Handle an incoming macro invocation via MQTT."""
        request_id = payload.get("request_id", "unknown")
        macro_name = payload.get("macro", "")
        macro_input = payload.get("input", {})

        handler = self._handlers.get(macro_name)
        if not handler:
            await self._respond(request_id, macro_name, "failed", error=f"Unknown macro: {macro_name}")
            return

        try:
            output = await handler(macro_input)
            await self._respond(request_id, macro_name, "completed", output=output)
        except Exception as e:
            await self._respond(request_id, macro_name, "failed", error=str(e))

    async def _respond(
        self,
        request_id: str,
        macro_name: str,
        status: str,
        output: dict | None = None,
        error: str | None = None,
    ) -> None:
        """Send macro execution result back via MQTT."""
        response = {
            "request_id": request_id,
            "macro": macro_name,
            "status": status,
            "completed_at": datetime.now(timezone.utc).isoformat(),
        }
        if output:
            response["output"] = output
        if error:
            response["error"] = error

        await self.mqtt.publish("macros/response", response, qos=1)

    # --- Handlers ---

    async def _handle_speak(self, input: dict) -> dict:
        text = input["text"]
        voice = input.get("voice")
        speed = input.get("speed", 1.0)
        duration_ms = await self.audio.speak(text, voice=voice, speed=speed)
        return {"spoken": True, "duration_ms": duration_ms}

    async def _handle_set_reminder(self, input: dict) -> dict:
        message = input["message"]
        when = datetime.fromisoformat(input["when"])
        reminder_id = self.reminders.schedule(message, when)
        return {"reminder_id": reminder_id, "scheduled_at": when.isoformat()}

    async def _handle_read_sensors(self, input: dict) -> dict:
        requested = input.get("sensors")
        snapshot = self.sensors.latest
        result = {}

        if not requested or "temperature" in requested:
            result["temperature_c"] = snapshot.temperature_c
        if not requested or "humidity" in requested:
            result["humidity_pct"] = snapshot.humidity_pct
        if not requested or "pressure" in requested:
            result["pressure_pa"] = snapshot.pressure_pa
        if not requested or "motion" in requested:
            result["motion_detected"] = snapshot.motion_detected

        return result

    async def _handle_set_led(self, input: dict) -> dict:
        pattern = input["pattern"]
        color = input.get("color")
        brightness = input.get("brightness")
        self.leds.set_pattern(pattern, color=color, brightness=brightness)
        return {"applied": True}

    async def _handle_play_sound(self, input: dict) -> dict:
        sound = input["sound"]
        await self.audio.play_sound(sound)
        return {"played": True}

    async def _handle_get_status(self, input: dict) -> dict:
        status = self.monitor.get_status()
        return {
            "online": True,
            "uptime_s": status.uptime_s,
            "power_profile": status.power_profile,
            "firmware_version": status.firmware_version,
            "cpu_temp_c": status.cpu_temp_c,
            "memory_used_pct": status.memory_used_pct,
            "wifi_rssi_dbm": status.wifi_rssi_dbm,
        }
```

### Startup Integration

```python
# In src/main.py (device application startup)

from macros.ambient_macros import AMBIENT_MACROS
from macros.executor import DeviceMacroExecutor
from services.macro_registry import DeviceMacroRegistry

async def startup(config: DeviceConfig, services: dict) -> None:
    # ... existing startup code ...

    # Register device macros with the Macro Gateway
    registry = DeviceMacroRegistry(config)
    registered = await registry.register(AMBIENT_MACROS)
    if registered:
        logger.info("Device macros registered with Macro Gateway")
    else:
        logger.warning("Macro registration failed — will retry on next heartbeat")

    # Set up macro executor for incoming MQTT commands
    executor = DeviceMacroExecutor(
        mqtt=services["mqtt"],
        sensors=services["sensors"],
        audio=services["audio"],
        reminders=services["reminders"],
        leds=services["leds"],
        monitor=services["monitor"],
    )
    executor.register_mqtt_handlers()

    # Start heartbeat (keeps macros registered as online)
    async def heartbeat_loop():
        while True:
            await registry.send_heartbeat()
            await asyncio.sleep(30)

    asyncio.create_task(heartbeat_loop())
```

### Orchestrator Integration

The NovaSyn Orchestrator (future app) can chain device macros with other app macros to build workflows:

```
Example workflow: "Morning routine"
1. ambient.read_sensors → get temperature
2. chat.send_prompt → "Suggest outfit for {temperature}F weather"
3. ambient.speak → speak the suggestion
4. ambient.set_led → set LED to a warm color
```

The Orchestrator invokes each macro via the Macro Gateway. Device macros and web service macros are invoked through the same API — the caller does not need to know whether the target is a web service or an embedded device.

### Difference from Windows and Web Stacks

| Concern | Windows Stack | Web Stack | Embedded Stack |
|---|---|---|---|
| Registry | Local JSON file | HTTP registration on Macro Gateway | HTTP registration via BabyAI proxy |
| Invocation channel | File-based queue | HTTP (direct to service) | MQTT (command topic on device) |
| Macro types | App operations (generate, draft, rewrite) | Same as Windows | Device actions (speak, read sensor, set LED) |
| Availability | While Electron app is running | While web service is running | While device is powered and connected |
| Latency | ~2s (file poll) | ~100-500ms (HTTP) | ~1-5s (MQTT round trip) |
| Heartbeat | PID in JSON file | HTTP heartbeat every 30s | HTTP heartbeat every 30s via BabyAI |
| Offline | Works locally | Requires server | Macro invocations fail; device operates independently |
