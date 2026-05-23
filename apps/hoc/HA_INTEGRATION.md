# Home Assistant Integration

The HOC talks to Home Assistant entirely through MQTT. No Python integration, no custom_component, no HA REST API tokens to manage. Just topics.

This document covers the two integration directions:

- **HOC → HA**: HOC publishes andon-light color changes; HA bulbs subscribe.
- **HA → HOC** *(roadmap)*: HA publishes sensor + device-discovery events; HOC subscribes to enrich its device table.

For the v0.1 release the HOC→HA direction is the one that actually ships. The HA→HOC direction is sketched at the bottom.

---

## Prerequisites

You need:

1. A working Home Assistant instance — Home Assistant Green, HA Yellow, OS, Container, or Supervised all work.
2. The [Mosquitto add-on](https://github.com/home-assistant/addons/tree/master/mosquitto) installed and running (or any other MQTT broker HA can reach). The add-on is the easiest path on HA Green.
3. At least one smart bulb that supports color control through Home Assistant. LIFX, Hue, Tasmota, ESPHome, Zigbee2MQTT, WLED all work — anything that exposes `light.turn_on` with an `rgb_color` parameter.

You do NOT need:

- HA's REST API token. HOC doesn't talk to HA directly.
- A long-lived access token. Same reason.
- An HACS custom integration. Pure MQTT.

---

## Step 1 — Configure the MQTT broker address in HOC

When you run the generated HOC app, set the MQTT broker URL via environment variable:

```bash
export HOC_MQTT_BROKER=tcp://homeassistant.local:1883
export HOC_MQTT_USERNAME=hoc                  # whatever you set in step 2
export HOC_MQTT_PASSWORD=<password>
```

The canonical `publish_andon_mqtt` action implementation (drops in `apps/hoc/impl/`) reads these. The default broker URL is `tcp://homeassistant.local:1883` if unset.

---

## Step 2 — Add an MQTT user in HA

In the Mosquitto add-on configuration, add:

```yaml
logins:
  - username: hoc
    password: choose-a-strong-password
```

Restart the add-on. The HOC will authenticate as this user.

---

## Step 3 — Wire the MQTT topic to your bulb in HA

HOC publishes to topics shaped like:

```
hoc/andon/<zone>/color           {"color": "red", "reason": "ISP outage — 14m"}
hoc/andon/<zone>/color           {"color": "yellow", "reason": "Pending approvals (3)"}
hoc/andon/<zone>/color           {"color": "green", "reason": null}
```

Zone is whatever you put in the `AndonLightState.zone` field — "main", "office", "kitchen", etc. One bulb per zone.

In your HA configuration, add an MQTT automation that listens and updates the bulb. The cleanest way is a single automation per zone. Drop this into your `automations.yaml` (or paste into the UI editor):

```yaml
- alias: "HOC Andon Light — Main"
  description: "Sets the main andon light color based on HOC andon state"
  trigger:
    - platform: mqtt
      topic: hoc/andon/main/color
  action:
    - service: light.turn_on
      target:
        entity_id: light.living_room_andon_bulb     # ← your bulb's entity_id
      data:
        rgb_color: >
          {% set color = trigger.payload_json.color %}
          {% if color == 'red' %}    [255, 30, 30]
          {% elif color == 'yellow' %} [255, 200, 0]
          {% elif color == 'green' %}  [40, 200, 40]
          {% else %}                  [100, 100, 100]
          {% endif %}
        brightness: 255
        transition: 1
    - service: notify.persistent_notification
      data:
        message: "Andon: {{ trigger.payload_json.color }} — {{ trigger.payload_json.reason or 'no reason given' }}"
        notification_id: hoc_andon_main
```

Duplicate the block per bulb/zone, changing the `topic`, `entity_id`, and `alias`.

---

## Step 4 — Test the wiring

Without running HOC, you can confirm HA is listening by publishing a test message. From any machine with `mosquitto_pub`:

```bash
mosquitto_pub -h homeassistant.local -u hoc -P <password> \
  -t hoc/andon/main/color \
  -m '{"color": "red", "reason": "manual test"}'
```

Your bulb should turn red within a second. Try `yellow` and `green` too. If nothing happens:

1. Check the Mosquitto add-on logs — should show `New connection from <your_ip>... New client connected as <auto>.`
2. Check HA's Developer Tools → MQTT → "Listen to a topic" with `hoc/andon/#` — you should see the message arriving.
3. Check the automation's "Last triggered" timestamp in HA UI.

---

## Step 5 — Wire HOC's `notify_andon` workflow to actually publish

The `notify_andon` workflow is defined in `hoc.agi`:

```agi
WORKFLOW notify_andon {
  STEP write_state {
    ACTION update_andon_state
    ANDON_ON action_error
  }
  STEP publish {
    ACTION publish_andon_mqtt
    ANDON_ON action_error
    ROLLBACK_BOUNDARY external
  }
}
```

The canonical `publish_andon_mqtt` action (drops in `apps/hoc/impl/publish_andon_mqtt.rs`) uses `rumqttc`:

```rust
use rumqttc::{Client, MqttOptions, QoS};
use serde_json::json;
use std::time::Duration;

pub fn publish_andon_mqtt_impl(
    zone: String,
    color: String,
    reason: String,
) -> Result<bool, String> {
    let broker = std::env::var("HOC_MQTT_BROKER")
        .unwrap_or_else(|_| "tcp://homeassistant.local:1883".to_string());
    let user = std::env::var("HOC_MQTT_USERNAME").ok();
    let pass = std::env::var("HOC_MQTT_PASSWORD").ok();

    let host = broker.strip_prefix("tcp://").unwrap_or(&broker);
    let (host, port) = host.split_once(':').map(|(h, p)| (h, p.parse().unwrap_or(1883))).unwrap_or((host, 1883));

    let mut opts = MqttOptions::new(format!("hoc-{}", uuid::Uuid::new_v4()), host, port);
    opts.set_keep_alive(Duration::from_secs(5));
    if let (Some(u), Some(p)) = (user, pass) {
        opts.set_credentials(u, p);
    }
    let (mut client, mut connection) = Client::new(opts, 10);
    let topic = format!("hoc/andon/{}/color", zone);
    let payload = json!({ "color": color, "reason": reason }).to_string();

    client.publish(&topic, QoS::AtLeastOnce, false, payload.into_bytes())
        .map_err(|e| format!("publish failed: {}", e))?;

    // Spin the event loop briefly so the publish actually flushes.
    for _ in 0..10 {
        match connection.recv() { Ok(_) => {}, Err(_) => break }
    }
    Ok(true)
}
```

Add `rumqttc = "0.24"` to your generated `src-tauri/Cargo.toml`. (When the action implementations land in `apps/hoc/impl/`, the dependency will be added automatically.)

---

## Roadmap: HA → HOC (device discovery)

HA already knows about every device on your network through its various integrations (UPnP, mDNS, Zeroconf, DHCP). Rather than HOC re-scanning via ARP, it can subscribe to HA's discovery topics:

```
homeassistant/device/+/+/config        # devices HA discovered
homeassistant/sensor/+/state           # sensor readings (battery, signal, etc.)
```

A future `ACTION subscribe_ha_devices` would consume these and upsert into HOC's `Device` table — same row schema, just a different data source. The `EXPECTS_MATCH true` classifier module then fires the andon on unrecognized devices regardless of whether ARP or HA found them.

For v0.1 this is on the roadmap. The ARP scan in `arp_scan` works on its own and the device table populates correctly. Adding the HA subscription is purely additive when you want it.

---

## Why MQTT and not the REST API?

A few reasons:

- **Authentication is per-broker, not per-token**. No long-lived HA token to leak or rotate. The HOC's MQTT credentials are scoped to one user with topic-level ACLs.
- **Push, not poll**. HA doesn't need to poll HOC for status; HOC publishes when state changes. The bulb updates within ~1s of the andon event.
- **No HA add-on or custom_component**. The integration is a few lines of YAML in your existing automations. Survives HA upgrades.
- **Loose coupling**. HOC doesn't depend on HA's version, addon list, or integration registry. If HA is offline the publish fails (logged, surfaces as an andon), but HOC itself stays up.
- **The same pattern works for non-HA targets**. Want to drive a Govee bulb directly, or send to ntfy.sh, or push to Slack? Replace `publish_andon_mqtt`'s body — the workflow is unchanged.

The Andon Loop architecture is about loose coupling everywhere. HOC's coupling to HA is one topic + one automation. That's it.
