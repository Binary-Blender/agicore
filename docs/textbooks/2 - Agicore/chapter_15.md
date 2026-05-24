# Chapter 15: The Ambient + Embedded Layer

A textbook treatment of a programming discipline that confined itself to disembodied software would be incomplete in a specific way: it would treat as accidental the boundary between programs that move bytes and programs that move things. That boundary is not accidental. It is the place where the discipline's commitments — determinism, governance, mechanical verification — are tested by physics. A motor turning the wrong way is not a logging concern. A heater that does not enter its safe state when the controller crashes is not a quality issue. The same architectural posture that lets Agicore generate a chat client cannot generate an autonomous robot without confronting the categorical difference between an output displayed and an output exerted. The Ambient + Embedded Layer is where Agicore confronts that difference and where the same compiler-first discipline extends across the boundary into the physical world.

This chapter covers seventeen declarations across three layers — the ambient/embedded cluster (`NODE`, `SENSOR`, `ZONE`, `MESH`, `ACTUATOR`, `PLATFORM`, `NULLCLAW`, `BRAIN_BODY`), the deployment trio (`TARGET`, `AUTH`, `TENANT`), and the primitives layer (`MACRO`, `MACRO_REGISTRY`, `LOG`, `THEME`, `SEED`, `TYPE`). The treatment is not equally weighted. `NULLCLAW` and `BRAIN_BODY` are the load-bearing declarations of the embedded cluster — they are where the agent runtime and the safety-critical communication between cognition and body live. The deployment trio is operational machinery that earns brief but precise treatment. The primitives are scaffolding that the entire DSL leans on and that warrant familiarity but not extended exposition.

The ambient/embedded cluster's intellectual ancestry deserves brief acknowledgment. ROS — the Robot Operating System — has been the lingua franca of academic and increasingly industrial robotics since the late 2000s. Its contribution is real: a standard publish-subscribe message bus, a standard tooling stack, a standard simulation environment. Its limitations are also real, and they map precisely onto the limitations Agicore is designed to address. ROS programs are written in conventional code; the safety properties they exhibit are properties of programmer discipline rather than structural guarantees; the integration of cognition (typically Python-side AI components) with actuation (typically C++ controllers) is hand-rolled per project. The DSL-first posture Agicore takes to the embedded layer is the structural alternative to ROS's framework-first posture. The declarations are the contract; the runtime is generated; the safety properties are structural rather than aspirational.

Begin with the physical-systems cluster. `NODE` is the atom of an embedded deployment: a single compute unit with a declared type (`personal`, `environment`, `business`, `actor`), a hardware designation, an AI tier (`edge`, `cloud`, `hybrid`), communication protocols, attached sensors, zone membership, and — critically — a safety classification (`low`, `medium`, `high`, `critical`). The safety field is not metadata; it is the contract that constrains every other declaration that references the node. A `critical` node's actuators must declare safe states; its watchdog timeouts must be explicit; its communications must be redundant.

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

The runtime generates a hardware type file, a device-dashboard React component for monitoring, and registry entries that other declarations resolve their references against. The `OFFLINE true` flag is operationally significant: the node continues to function when network connectivity is lost. For an actor-class node in a critical safety category, offline operation is a requirement, not a feature.

`SENSOR` and `ACTUATOR` are paired primitives at opposite ends of the perception-action loop. A sensor declares an input device with type (`camera`, `microphone`, `imu`, `gps`, `environmental`, `proximity`, `custom`), a model identifier, capabilities, latency in milliseconds, accuracy as a fraction, and a failure-mode specification.

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
```

The failure-mode declaration is the discipline's encoding of graceful degradation. Sensors fail. The system's response to failure is not the place to be inventive at runtime. The DSL forces the question — what does this sensor do when it cannot supply a fresh reading — and the runtime enforces the declared behavior. The IMU's failure mode returns its last known value and flags the reading as stale; downstream consumers can choose to treat stale data differently than fresh data, but they receive data rather than a hang.

`ACTUATOR` is the more consequential primitive. Every actuator declaration carries a `SAFE_STATE` field that is non-negotiable. The safe state is the position, current, or output the actuator returns to when commands stop arriving — when the brain crashes, when the link drops, when the watchdog expires.

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
```

The runtime generates a Tauri command per actuator and a watchdog timer that resets the actuator to its safe state if no command has arrived within the declared interval. The discipline is structural: an actuator that has no declared safe state will not compile. A motor without `coast` or `brake`, a servo without `center` or a declared neutral position, a relay without `off` — the compiler rejects these declarations. The reasoning is from the safety-critical-systems literature: an autonomous device's response to control loss should be a property of the device's specification, not of the controller's hope.

`ZONE`, `MESH`, and `PLATFORM` complete the structural cluster. A `ZONE` groups nodes spatially — a workshop, a greenhouse bay, a building floor — and serves as the scope for location-aware rules ("turn off all lights in the workshop"). A `MESH` declares the topology that connects nodes (`mesh`, `star`, `ring`), the governing authority, and accounting machinery that prevents one node from free-riding on another's compute. A `PLATFORM` declares a cross-compilation target — RPi5 with ARM64 Linux, ESP32-S3 with the Espressif toolchain, STM32H7 bare-metal — and the AI runtime (`ollama`, `tflite`, `onnx`, `none`) the platform supports. These three are connective tissue. They earn brief mention because they exist; their use is straightforward when the load-bearing declarations are in place.

The two load-bearing declarations of the embedded cluster are `NULLCLAW` and `BRAIN_BODY`. `NULLCLAW` is the agent runtime — the substrate that lets an AI agent take action in the physical world under explicit constraint. The declaration names the LLM providers the agent may use (in priority order), the tools the agent is permitted to invoke (each bound to a Tauri command), and the personality the agent operates under.

```agi
NULLCLAW {
  PATH "~/.nullclaw/config.json"
  PROVIDERS {
    ollama "http://localhost:11434"               1
    babyai "https://novasynchris-babyai.hf.space" 2
  }
  TOOLS {
    read_temperature   sensor_temperature_read
    set_led            actuator_status_led_set
    speak              tts_speak
    move_servo         actuator_pan_servo_set
  }
  PERSONALITY "You are Nova, a helpful home assistant robot. You can read sensors and control actuators."
}
```

The runtime generates the NullClaw configuration file, a TypeScript dispatcher that routes tool calls to the declared Tauri commands, and a Rust process launcher that starts and supervises the NullClaw binary. NullClaw itself is a small, dependency-free Zig binary on the order of seven hundred kilobytes that runs an agent loop locally on the device. The loop's structure is conventional — receive a request, route through the priority-ordered provider list, parse tool calls from the model output, dispatch each tool call to a registered Tauri command, return results to the model, iterate to completion — but the constraints are everything.

The agent can only call the tools declared in the `TOOLS` block. A model-generated tool call that names something outside the whitelist is rejected at the dispatcher before any side effect occurs. The agent runs locally — the providers can be cloud-based, but the agent loop itself is on the device, which means the agent functions when the cloud is unreachable. The tool dispatch is mechanical — there is no negotiation, no clever routing, no inference about what the agent "meant." The agent calls a named tool; the dispatcher invokes the matching Tauri command; the command runs; the result returns. Every step is loggable, every step is auditable, and every step is constrained.

This is the Cattle Dog Principle (CSE Ch 7) extended to embodied agents. The agent is capable — it can read sensors, control actuators, speak, observe. The handler — the authority who declared the `NULLCLAW` block, the safety classification on each node and actuator, the watchdog that returns actuators to safe states when commands stop — retains directive control. The agent acts; the structural constraints prevent action outside its lane; the audit log records every action taken. A misbehaving agent cannot escape the boundary the DSL declared.

`BRAIN_BODY` is the wire protocol that links the cognitive computer to the actuator-bearing microcontroller in split-architecture robots. The classical division: a Linux-capable computer (Raspberry Pi, Jetson Nano) runs cognition — vision processing, language models, planning, the NullClaw agent — over UART to a real-time microcontroller (STM32, ESP32) that executes timing-critical actuator control. The split is necessary because Linux cannot meet hard real-time deadlines reliably, and a microcontroller cannot run a language model. `BRAIN_BODY` declares the protocol that ties them.

```agi
BRAIN_BODY {
  BAUD      115200
  HEARTBEAT 1000
  WATCHDOG  3000
  ESTOP     "GPIO_24"
  COMMANDS  [PING, MOVE_SERVO, SET_MOTOR, SET_LED, READ_SENSORS, SET_MODE, ACK, NACK]
}
```

The runtime generates a Rust module on the brain side that encodes and decodes frames in the declared protocol, the matching firmware on the body side, and the wire format itself: a start byte, command identifier, length, payload, checksum, and end byte. The heartbeat is the brain's continuous assertion that it is alive; the watchdog is the body's response to heartbeat loss. If the brain crashes, loses power, or otherwise stops sending heartbeats, the body autonomously enters safe mode — every actuator reverts to its declared safe state, the e-stop GPIO is asserted, and the body waits for the brain to re-establish contact.

This is the second instance of the same discipline: the body's behavior under control loss is a property of the body's specification, not of the brain's reliability. The brain is presumed unreliable. The body presumes nothing about the brain. The communication is designed for the failure mode and the failure mode is recovered without intelligence — the body knows what safe state means because every actuator declared one, and the body's only behavior under control loss is to enter that state and wait.

A further point about NullClaw's locality: the Zig binary's small size and absence of dependencies is not an aesthetic preference. It is a deployment property. An embedded device with constrained storage, intermittent connectivity, and a long expected service life cannot rely on a multi-gigabyte Python runtime to host an agent loop. NullClaw fits in less than a megabyte, runs without a runtime, starts in milliseconds, and supervises itself. The brain's overall footprint — Tauri runtime plus NullClaw plus whatever local models the operator chooses to install via Ollama — can be tuned to the device's constraints without rewriting the agent architecture. A workshop robot on a Raspberry Pi 5 with sixteen gigabytes of storage can run a seven-billion-parameter local model; a greenhouse sensor node on a Raspberry Pi Zero with two gigabytes can route to a cloud provider exclusively. The same NULLCLAW declaration covers both deployments; only the providers list differs.

Together, `NULLCLAW` and `BRAIN_BODY` make Agicore an embedded-systems architecture. The agent runs on the cognitive computer; the agent invokes tools through a constrained whitelist; the tools that command actuators do so by sending frames over the BRAIN_BODY protocol; the actuators execute commands while a watchdog runs in the background; if anything in the chain fails, the actuators revert to safe states. The whole architecture is declarative. The whole architecture is generated. The whole architecture is auditable.

A point about the protocol's frame format is worth surfacing. The wire format `[0xAA][CMD: u8][LEN: u8][PAYLOAD: LEN bytes][CHECKSUM: u8][0x55]` is unremarkable engineering — a sync byte, a command identifier, a length, a payload, a checksum, an end byte. What is significant is that the runtime generates both ends of the protocol from a single declaration. The brain's encoder and the body's decoder are not two implementations that have to be kept in sync by developer discipline; they are two outputs of one compiler that emits from the same AST. The category of bug that dominates split-architecture embedded projects in the wild — frame-format mismatches between the cognitive computer and the microcontroller, discovered only when the system is on the workbench and behaving incomprehensibly — is structurally absent because the two sides cannot drift relative to one another.

Asimov's Three Laws are the wrong reference here. The laws are policies — high-level constraints that presume an agent capable of reasoning about consequences and refraining from prohibited action. The Agicore approach is structural: the agent is not asked to refrain from invoking a tool that is not whitelisted; the dispatcher refuses to invoke it. The agent is not asked to consider the safety implications of running a motor when the heartbeat has stopped; the body autonomously coasts the motor when no heartbeat has arrived in three seconds. Safety is not a property of the agent's judgment; it is a property of the system's construction. This is the long-arc thesis of CSE Part II made physical: governance around a non-deterministic core is policy that the system hopes the agent respects; governance through a deterministic core is structure that the agent cannot violate.

Move to the deployment trio. `TARGET` declares a compilation target — desktop, web, CLI, library — with a runtime (`tauri`, `axum`, `rocket`), a bundling format, and optional host and port for network deployments. Multiple `TARGET` declarations in the same source file produce multi-target builds: the same Agicore source compiles to a desktop application bundle and a web service deployment in a single invocation.

```agi
TARGET DesktopBundle {
  KIND      desktop
  RUNTIME   tauri
  BUNDLE_AS msi | dmg | appimage
}

TARGET WebService {
  KIND      web
  RUNTIME   axum
  BUNDLE_AS docker
  HOST      "0.0.0.0"
  PORT      3008
}
```

`AUTH` declares an authentication strategy — provider, session model, timeout, requirements — and produces the routes, middleware, and `useAuth()` hook that consume those declarations. `TENANT` declares the multi-tenancy isolation strategy — a key field (typically `organization_id`), a scope (typically `all` entities), and a resolution source (typically the auth session). The compiler rewrites every query in the generated code to include the tenant predicate, making cross-tenant access mechanically impossible rather than policy-enforced.

```agi
TENANT OrgIsolation {
  KEY          organization_id
  SCOPE        all
  RESOLVE_FROM auth_session
}
```

The trio is operational discipline rather than conceptual breakthrough. Multi-tenancy is hard precisely because every query in a large application has to remember the tenant predicate; forgetting once is a data-leak incident. The Agicore generation strategy makes forgetting impossible — the compiler rewrites the queries.

A few words on what the trio elides. `TARGET`, `AUTH`, and `TENANT` are mature engineering concerns whose mechanics have been studied for decades; the Agicore contribution is not to invent them but to integrate them into the same compilation pipeline as everything else. The reader looking for novelty in this part of the layer will find none. The reader looking for the elimination of a familiar category of operational error — a query that forgets the tenant predicate, an auth middleware that drifts from the route specifications, a build pipeline that diverges across deployment targets — will find that the declarations close those gaps by making the missing scaffolding impossible to omit. That is the proper expectation for this part of the layer: not breakthroughs, but the systematic elimination of operational accidents.

The primitives layer is the scaffolding the entire DSL depends on. `MACRO` allows parameterized capability patterns to be defined once and reused: a `timestamped_entity` macro that adds `created_at` and `updated_at` fields automatically; a `soft_delete` macro that adds a `deleted_at` column and rewrites queries to exclude soft-deleted rows. `MACRO_REGISTRY` allows macros to be packaged and exposed across applications.

```agi
MACRO timestamped_entity(name: identifier, fields: block) {
  ENTITY ${name} {
    ${fields}
    created_at: datetime DEFAULT now()
    updated_at: datetime DEFAULT now()
  }
}

@timestamped_entity(Article, {
  title: string REQUIRED
  body:  text
})
```

`TYPE` provides named type aliases — convenient for complex shapes that recur throughout a specification. `LOG` declares the file-based logging configuration that the generated Rust code uses, with zero new dependencies beyond what the Tauri runtime already pulls in. `THEME` declares design tokens that compile to Tailwind configuration and CSS custom properties. `SEED` declares initial data that is inserted via `INSERT OR IGNORE` statements on first run, idempotent on every subsequent run.

```agi
SEED Tag {
  RECORDS [
    { id: "tag-1", name: "AI",          color: "#3b82f6" },
    { id: "tag-2", name: "Writing",     color: "#10b981" },
    { id: "tag-3", name: "Engineering", color: "#f59e0b" }
  ]
}
```

The primitives are not the chapter's focus and need no extended treatment beyond familiarity. They are the joinery that makes the more elaborate declarations cohere into deployable applications.

A worked example pulls the embedded cluster together. Consider a home-workshop robot — the canonical small-scale embodied AI deployment. The brain is a Raspberry Pi 5 running Tauri; the body is an STM32H7 driving two drive motors, a pan servo for the camera, and a status LED. The robot perceives through a camera, an IMU, and a microphone array. It is governed by a NullClaw agent whose personality is "Nova, a helpful home assistant robot," with cloud LLM access via Ollama (local) and a Hugging Face fallback.

```agi
PLATFORM brain_target {
  CHIP         rpi5
  OS           "Raspberry Pi OS Lite 64-bit"
  AI_RUNTIME   "ollama"
  CROSS_TARGET "aarch64-linux-gnu"
}

PLATFORM body_target {
  CHIP         stm32h7
  OS           "bare-metal"
  AI_RUNTIME   "tflite"
  CROSS_TARGET "thumbv7em-none-eabihf"
}

ZONE workshop {
  NODES   [robot_brain]
  AMBIENT true
  CAPACITY 4
  HOURS   "8-20"
}

NODE robot_brain {
  TYPE     actor
  HARDWARE "Raspberry Pi 5"
  AI_TIER  edge
  COMMS    [wifi, uart]
  SENSORS  [camera_front, imu_body, mic_array]
  ZONE     workshop
  OFFLINE  true
  SAFETY   critical
}

ACTUATOR drive_left  { TYPE motor MODEL "L298N" SAFE_STATE coast  MAX_CURRENT 2000 WATCHDOG 3000 }
ACTUATOR drive_right { TYPE motor MODEL "L298N" SAFE_STATE coast  MAX_CURRENT 2000 WATCHDOG 3000 }
ACTUATOR pan_servo   { TYPE servo MODEL "SG90"  SAFE_STATE center                    WATCHDOG 5000 }
ACTUATOR status_led  { TYPE led   MODEL "WS2812B" SAFE_STATE off                     WATCHDOG 10000 }

BRAIN_BODY {
  BAUD      115200
  HEARTBEAT 1000
  WATCHDOG  3000
  ESTOP     "GPIO_24"
  COMMANDS  [PING, MOVE_SERVO, SET_MOTOR, SET_LED, READ_SENSORS, SET_MODE, ACK, NACK]
}

NULLCLAW {
  PROVIDERS {
    ollama "http://localhost:11434"               1
    babyai "https://novasynchris-babyai.hf.space" 2
  }
  TOOLS {
    read_imu           sensor_imu_body_read
    drive              actuator_drive_motor_set
    pan_camera         actuator_pan_servo_set
    set_status         actuator_status_led_set
    listen             sensor_mic_array_read
    speak              tts_speak
  }
  PERSONALITY "You are Nova, a helpful workshop robot. You can move, look around, and communicate."
}
```

What this declaration set produces is a deployable system: cross-compiled binaries for the brain and the body, a wire protocol implementation linking them, a sandboxed agent runtime on the brain with a constrained tool whitelist, watchdog-guarded actuators that revert to safe states under control loss, and an audit log of every tool invocation and every actuator command. The declaration set is on the order of seventy lines. The generated runtime is several thousand lines of Rust, firmware C, and TypeScript. The discipline encoded — safe states are mandatory, watchdogs are mandatory, tool whitelists are mandatory, agent action is bounded by structure rather than judgment — is what extends the Agicore architecture across the boundary into physical systems.

The long-arc thesis the chapter closes on is that the same architectural commitments that make Agicore safe for desktop applications and web services apply unchanged to embedded robotics. AI at the edit boundary, determinism at runtime, the DSL as constraint boundary, mechanical safety properties rather than policy ones. The Andon Loop's principles will extend to the embedded layer in future generations: a robot whose autonomous behavior pulls an andon cord when an unfamiliar scenario arises, invoking AI at the edit boundary to propose a policy refinement, sandbox-testing it against captured incident data, shadow-evaluating it on subsequent traffic, and promoting it only after the same statistical gate that governs rule promotion in disembodied systems. The architecture composes. The discipline travels. The compiler's reach extends from screens to motors without abandoning a single one of its commitments.

This is what Part III has been preparing the reader for. Fifty-eight declarations across ten layers have been treated, each as a theoretical construct, a generated artifact, and a working snippet. The reader emerging here can look at any `.agi` source and predict what the compiler will emit, can write specifications that the compiler will accept, can reason about the runtime properties that the declarations guarantee. Part IV will take that foundation and develop the Andon Loop — the architecture that lets AI safely modify the rules of the systems Part III has now taught the reader to declare.
