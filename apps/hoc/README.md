# Home Operations Center (HOC) — v0.1

> The Andon Loop architecture, applied to your house.

A 350-line `.agi` source that compiles to a complete Tauri desktop app for monitoring your home network — with AI proposing new firewall and device-classification rules, and deterministic gates making sure AI cannot lock you out of your own router.

This is the first working showcase of the [Andon Loop architecture](../../ANDON_LOOP.md) in a real-world domain. It pairs naturally with a Home Assistant Green: HA's MQTT broker becomes the andon-light surface (red/yellow/green smart bulbs literally), and HA's device discovery feeds the device table here.

---

## What it does

**Internet uptime monitoring**
- Probes your router (`192.168.1.1`), your ISP gateway, and a public target (`1.1.1.1`) on a cadence you choose.
- Classifies failures: DNS-only down, ISP outage, router-needs-reboot, congestion (high latency), healthy.
- Records every probe + every outage with start/end times.

**Device discovery + classification**
- ARP-scans your local network every minute; records every MAC + IP + OUI-vendor seen.
- Classifies devices by vendor: phones, laptops, smart bulbs (LIFX/Hue), Raspberry Pi, etc.
- New unrecognized device? `EXPECTS_MATCH true` on the classifier module fires an andon — AI proposes a classification rule, you approve it in the console, the next time that vendor shows up the system knows what it is.

**Andon lights via Home Assistant**
- A `notify_andon` workflow publishes color changes to MQTT topic `hoc/andon/<zone>/color`.
- Set up an HA automation that subscribes to that topic and sets your bulb color (template in [`HA_INTEGRATION.md`](./HA_INTEGRATION.md)).
- Red = unresolved andon / internet down. Yellow = pending approval queue / bandwidth anomaly. Green = healthy.
- Your dormant smart bulbs become a physical status light in your living room.

**AI-proposed mutations, gated by you**
- T1 (auto-deploy): AI can refine existing rule thresholds after the regression suite passes. "Probe target was slow at 450ms 12 times this week, tighten the slow threshold from 500ms → 425ms" — auto-deployed, logged.
- T2 (approval required): AI proposing a new device classification rule needs your explicit OK in the MutationConsole. "I saw a 'Espressif Inc' device — that's an ESP32 sensor, add a rule classifying it as IoT?" — you click approve, the rule joins the library.
- T5 (governance locked): nothing touches the MUTATION_POLICY itself without your ordered signoff. The "AI cannot expand its own authorization" property is mechanically enforced — the tier verifier rejects under-declared scopes before the sandbox runs.

**Tamper-evident audit chain**
- Every state transition appended to a SHA-256 hash-chained mutation ledger.
- Optional file-system mirror to `<path>/<ledger_name>.jsonl` via `AGICORE_LEDGER_SINK_PATH` env var.
- One-click integrity verification in the console.

---

## Compile it

From the repo root:

```bash
cd core/compiler && npm install && npm run build && cd ../..
node -e "
import('./core/compiler/dist/index.js').then(async (m) => {
  const fs = await import('fs');
  const path = await import('path');
  const src = fs.readFileSync('apps/hoc/hoc.agi', 'utf-8');
  const result = m.compile(src);
  const out = 'apps/hoc/generated';
  fs.mkdirSync(out, { recursive: true });
  for (const [rel, content] of result.files) {
    const full = path.join(out, rel);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, content);
  }
  console.log(\`Wrote \${result.files.size} files to \${out}/\`);
  console.log(\`Diagnostics: \${result.diagnostics.length}\`);
});
"
```

You'll get a complete Tauri project at `apps/hoc/generated/` — Rust + TypeScript + React + SQLite migrations. **72 files, all generated from the single `hoc.agi` source.**

---

## Fill in the actions

Five `ACTION` declarations need their bodies filled in (the codegen emits typed signatures + Tauri commands; you supply the implementation). Edit the files in `apps/hoc/generated/src-tauri/src/actions/`:

| Action | What it does | Implementation hint |
|---|---|---|
| `ping_target` | HTTPS probe a target, return latency + status | `reqwest::Client::get(target).timeout(Duration::from_secs(5)).send()` — match on `Ok`/timeout/network error to set `status` and `failure_kind` |
| `arp_scan` | List devices on the local network | `Command::new("arp").arg("-a").output()` on macOS/Linux; parse `host (ip) at mac on iface` lines |
| `publish_andon_mqtt` | Push color to HA MQTT broker | Use [`rumqttc`](https://crates.io/crates/rumqttc); topic `hoc/andon/{zone}/color`, payload `{"color": "...", "reason": "..."}` |
| `send_notification` | OS notification | `tauri-plugin-notification` is the canonical path |
| `update_andon_state` | Upsert AndonLightState row | `crate::commands::andon_light_state::create_or_update_andon_light_state(...)` (generated for you from the ENTITY) |

Canonical implementations land in this directory in a follow-up commit (apps/hoc/impl/). For now, the scaffolds compile but return stubs.

---

## Wire the frontend tick

The probe workflow runs on demand (via the generated `run_probe_internet` Tauri command). For a periodic cadence, add a `setInterval` to `generated/src/App.tsx`:

```typescript
import { invoke } from '@tauri-apps/api/core';
import { MutationConsole } from './components/MutationConsole';

function App() {
  useEffect(() => {
    const probe = async () => {
      for (const target of ['192.168.1.1', '1.1.1.1', 'https://google.com']) {
        try { await invoke('run_probe_internet', { input: { target } }); }
        catch (e) { console.error('probe failed:', e); }
      }
    };
    probe();
    const id = setInterval(probe, 30_000);   // every 30 seconds
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const scan = () => invoke('run_scan_network', { input: {} }).catch(console.error);
    scan();
    const id = setInterval(scan, 60_000);    // every 60 seconds
    return () => clearInterval(id);
  }, []);

  return (
    <div className="h-screen">
      <MutationConsole />       {/* The Andon Loop UI from Phase 8c */}
      {/* ... your other views ... */}
    </div>
  );
}
```

That's the entire reactive loop. The workflows + their andon-pull semantics are already wired.

---

## What you get without writing more code

By declaring one `MUTATION_POLICY`, you inherit:

- **Tier verifier** — mechanically blocks AI from proposing mutations outside its allowed scope (Phase 4a)
- **Sandbox** — runs the regression suite against any proposed mutation before deploy (Phase 4b)
- **Andon responder** — when a workflow ANDONs, AI is invoked to propose a fix (Phase 4c stub; Phase 4d real AI via `send_chat`)
- **Improvement reasoner** — weekly cron-spawned task that scans recent activity, proposes refinements (Phase 5a stub; Phase 5b scheduler; Phase 5c real AI)
- **Shadow evaluation** — for tiers with `NBVE_WINDOW`, mutations run against live traffic for the window before promotion (Phase 5d/5e; uses `evaluateWithShadow` helper)
- **Multi-signer approval chains** — N-of-N, ordered or unordered, configured per tier (Phase 6 / 6b / 6c)
- **Hash-chained ledger** — SHA-256 chain over every state transition with optional FS sink (Phase 7 / 7b)
- **MutationConsole React UI** — 5 tabs (Proposals / Approvals / Shadow / Ledger / Andon Events) (Phase 8c)
- **Module bindings** — `EXPECTS_MATCH true` makes "no rule matched" pull an andon automatically (Phase 11.8 / 11.8b)

All generated from `hoc.agi`.

---

## Roadmap (post v0.1)

- **Canonical action implementations** in `apps/hoc/impl/` — drop-in replacements for the stub bodies.
- **HA device-discovery bridge** — subscribe to HA's `homeassistant/sensor/+/state` topic, populate the `Device` table without ARP scanning.
- **Real mutation interpreters** — `apply_mutation_to_rule_set` for the four common kinds (add_rule, adjust_threshold, disable_rule, add_catchall) so `evaluateWithShadow` can dual-route without consumer wiring.
- **Bandwidth accounting** — per-device byte counters, anomaly detection rules.
- **DNS-level monitoring** — pi-hole log scraper, query pattern analysis.
- **Family approval mode** — `APPROVAL_AUTHORITY ORDERED [primary_admin, secondary_admin]` so kid-account firewall changes need both parents.

The Andon Loop substrate makes each of these an incremental rule + action addition rather than a redesign.

---

## License

MIT (matches the parent Agicore repo).
