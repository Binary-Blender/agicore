# NovaSyn Embedded Dev Stack

An AI-to-AI development stack for building ambient AI devices and robotics within the NovaSyn ecosystem. Every device built with this stack is pre-wired for BabyAI integration, feeding the co-op intelligence flywheel.

## Reference Documents

| Doc | Name | Purpose |
|-----|------|---------|
| 00 | Philosophy | Core principles for embedded AI development |
| 01 | Tech Stack | Languages, toolchains, target platforms, exact versions |
| 02 | Coding Standards | Naming conventions, memory rules, style per language |
| 03 | Architecture Patterns | Layered architecture, Brain-Body split, HAL/driver/service/app |
| 04 | Error Handling | Embedded error patterns, watchdogs, graceful degradation |
| 05 | Testing Strategy | Unit, HIL, simulation, contract tests, stability tests |
| 06 | Feature Pipeline | 10-step schema-first process adapted for hardware features |
| 07 | Shared Infrastructure | BabyAI integration, MQTT, OTA, device provisioning |
| 08 | AI Service Patterns | Local inference, phone-home, voice pipeline, sensor AI |
| 09 | AI Collaboration | Sprint-based dev, handoff protocols, safety reviews |
| 10 | Quick Start | New device project scaffold guide |
| 11 | Project Template | Boilerplate for Zig and Python embedded projects |
| 12 | Device Registry | Active and planned devices, specs, status |

## Inspiration References

- `AGENTS.md` — NullClaw engineering protocol (Zig vtable patterns, security, validation)
- `CLAUDE.md` — NullClaw build/test commands and architecture reference

## Target Devices

- **Ambient AI Assistant** — RPi 5 + mic array + speaker + display (the WALL-E concept)
- **Hex Sensor Node** — ESP32-S3 + environmental sensors ($15-30 per unit, agriculture)
- **Robot Controller** — RPi 5 (brain) + STM32 (body) + motors/servos
- **NullClaw Comm Node** — ESP32 + LoRa for mesh networking

## Quick Reference

```bash
# Zig firmware build
zig build -Dtarget=arm-linux-gnueabihf -Doptimize=ReleaseSmall

# Python application layer (RPi)
uv run python -m novasyn_device

# Flash ESP32
zig build flash -Dtarget=xtensa-esp32s3

# Run all tests (host simulation)
zig build test --summary all && uv run pytest
```
