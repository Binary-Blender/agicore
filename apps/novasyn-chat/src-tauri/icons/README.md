# App icons

Tauri requires icon files at build time. To generate the full icon set from a
single 1024x1024 PNG:

```
npx @tauri-apps/cli icon path/to/source.png
```

This will produce `32x32.png`, `128x128.png`, `128x128@2x.png`, `icon.icns`,
`icon.ico`, and the Windows Store tiles.

Until you generate real icons, placeholder files in this directory keep
`tauri build` from failing.
