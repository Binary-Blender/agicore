# Building Agicore Studio Binaries

Per-platform notes for producing release artifacts. Each command runs
from `apps/agicore-studio/`. CI does the same on every push to `main`
— see `.github/workflows/agicore-studio-build.yml`.

---

## Prerequisites (all platforms)

- **Node.js** ≥ 18 (we test against 20)
- **Rust** stable toolchain (`rustup` install)
- **Tauri 2 CLI**: `cargo install tauri-cli --version "^2.0"` (or use
  the npm-wrapped `npm run tauri:build`)

Then install JS deps:

```bash
npm install
```

---

## Windows

### Prereqs

- **Microsoft Edge WebView2 Runtime** — pre-installed on Windows 11
  and on most up-to-date Windows 10 machines. If missing,
  [download the evergreen installer](https://developer.microsoft.com/microsoft-edge/webview2/).
- **Visual Studio Build Tools 2022** with the *Desktop development
  with C++* workload — needed for the MSVC linker that Cargo uses.

### Build

```bash
npm run tauri:build
```

Outputs land in `src-tauri/target/release/bundle/`:

- `msi/Agicore Studio_0.1.0_x64_en-US.msi` — MSI installer
- `nsis/Agicore Studio_0.1.0_x64-setup.exe` — NSIS installer
- The unwrapped binary is at `src-tauri/target/release/agicore_studio.exe`

### Code signing (TODO)

The `[bundle.windows]` section in `tauri.conf.json` has empty signing
slots. To enable Authenticode signing:

1. Acquire a code-signing certificate (EV preferred for SmartScreen
   reputation).
2. Set `WINDOWS_CERTIFICATE` (base64-encoded `.pfx`) and
   `WINDOWS_CERTIFICATE_PASSWORD` in the CI environment.
3. Fill in `bundle.windows.certificateThumbprint` or use Tauri's
   signing hooks documented at
   https://tauri.app/v2/guides/distribution/sign-windows.

---

## macOS

### Prereqs

- **Xcode Command Line Tools**: `xcode-select --install`
- macOS 10.15 (Catalina) or later for the build host. The produced
  `.dmg` runs on macOS 10.15+ (configured via `minimumSystemVersion`).

### Build

```bash
npm run tauri:build
```

Outputs:

- `src-tauri/target/release/bundle/dmg/Agicore Studio_0.1.0_x64.dmg`
- `src-tauri/target/release/bundle/macos/Agicore Studio.app`

For Apple Silicon builds, add `--target aarch64-apple-darwin` and
ensure the corresponding toolchain is installed via
`rustup target add aarch64-apple-darwin`.

### Notarization (TODO)

The `signingIdentity` slot in `tauri.conf.json` is null. To enable
notarized distribution:

1. Enroll in the Apple Developer Program.
2. Set `signingIdentity` to your Developer ID Application certificate
   common name.
3. Set `APPLE_ID`, `APPLE_PASSWORD` (app-specific password), and
   `APPLE_TEAM_ID` in the CI environment.
4. Tauri will sign and submit for notarization automatically when
   those env vars are present.

Reference: https://tauri.app/v2/guides/distribution/sign-macos

---

## Linux

### Prereqs

- **libwebkit2gtk-4.1-dev** — `sudo apt install libwebkit2gtk-4.1-dev`
  (Debian/Ubuntu) or the equivalent on your distro.
- **libgtk-3-dev**, **libayatana-appindicator3-dev**, **librsvg2-dev**
- Build essentials (`build-essential` on Debian/Ubuntu).

### Build

```bash
npm run tauri:build
```

Outputs:

- `src-tauri/target/release/bundle/deb/agicore-studio_0.1.0_amd64.deb`
- `src-tauri/target/release/bundle/appimage/agicore-studio_0.1.0_amd64.AppImage`

The `.deb` installs to `/usr/lib/agicore-studio/` and the binary is
linked at `/usr/bin/agicore-studio`. The AppImage is self-contained
and runs on most modern distros without installation.

---

## Icons

The bundle config references icons under `src-tauri/icons/`:

| File              | Used by                              |
|-------------------|--------------------------------------|
| `32x32.png`       | Linux small-icon variant             |
| `128x128.png`     | Linux + bundle metadata              |
| `128x128@2x.png`  | Retina displays                      |
| `icon.icns`       | macOS .app + .dmg                    |
| `icon.ico`        | Windows .exe + installer             |

Until proper icons land, Tauri's default placeholder is used. Drop
your assets into `src-tauri/icons/` matching the filenames above.

---

## CI

`.github/workflows/agicore-studio-build.yml` runs the per-platform
builds on every push to `main` and on every `v*` tag. Artifacts are
uploaded but not yet published as Releases — promoting an artifact to
a Release is a manual step pending the first signed build.

---

## Troubleshooting

### "msbuild not found" (Windows)
You need Visual Studio Build Tools 2022 with the Desktop C++
workload. Standalone .NET SDK isn't enough.

### "ld: framework not found WebKit" (macOS)
You're trying to build on a machine without Xcode Command Line Tools.
Run `xcode-select --install`.

### "Package webkit2gtk-4.1 was not found" (Linux)
Install `libwebkit2gtk-4.1-dev`. On older Debian/Ubuntu versions
this package may be named `libwebkit2gtk-4.0-dev` instead — Tauri 2
prefers 4.1.

### Bundle produces no .dmg / .msi / .deb
Check `bundle.targets` in `tauri.conf.json`. The default `"all"`
means Tauri picks per-platform defaults; if you've narrowed the list,
make sure your platform's preferred format is included.
