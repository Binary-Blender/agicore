// Tauri Configuration Generator
// Generates tauri.conf.json and Cargo.toml from APP declaration

import type { AgiFile } from '@agicore/parser';
import { toSnakeCase } from '../naming.js';

export function generateTauriConfig(ast: AgiFile): Map<string, string> {
  const files = new Map<string, string>();
  const app = ast.app;
  const hasAiService = ast.aiService !== null && ast.aiService !== undefined;
  const identifier = `com.agicore.${toSnakeCase(app.name)}`;

  const config = {
    "$schema": "https://schema.tauri.app/config/2",
    productName: app.title,
    version: "0.1.0",
    identifier,
    build: {
      beforeBuildCommand: "npm run build",
      beforeDevCommand: "npm run dev",
      devUrl: `http://localhost:${app.port ?? 5173}`,
      frontendDist: "../dist"
    },
    app: {
      windows: [
        {
          label: "main",
          title: app.title,
          width: app.window?.width ?? 1200,
          height: app.window?.height ?? 800,
          decorations: !(app.window?.frameless ?? true),
          center: true,
          minWidth: 1000,
          minHeight: 700,
        }
      ],
      security: {
        csp: null
      }
    },
    bundle: {
      active: true,
      targets: "all",
      icon: [
        "icons/32x32.png",
        "icons/128x128.png",
        "icons/icon.ico"
      ]
    }
  };

  files.set('src-tauri/tauri.conf.json', JSON.stringify(config, null, 2));

  // Cargo.toml
  const hasVault = ast.vault !== undefined && ast.vault !== null;
  const hasTray = app.tray === true;
  const hasHotkey = typeof app.hotkey === 'string' && app.hotkey.length > 0;
  const tauriFeatures = hasTray ? `["tray-icon"]` : `[]`;
  const aiServiceDeps = hasAiService
    ? `reqwest = { version = "0.12", features = ["json", "stream"] }\ntokio = { version = "1", features = ["full"] }\nfutures-util = "0.3"\n`
    : '';
  const vaultDeps = hasVault
    ? `dirs = "5"\n`
    : '';
  const hotkeyDep = hasHotkey
    ? `tauri-plugin-global-shortcut = "2"\n`
    : '';
  const cargoToml = `[package]
name = "${toSnakeCase(app.name)}"
version = "0.1.0"
edition = "2021"

[dependencies]
tauri = { version = "2", features = ${tauriFeatures} }
serde = { version = "1", features = ["derive"] }
serde_json = "1"
rusqlite = { version = "0.31", features = ["bundled"] }
uuid = { version = "1", features = ["v4"] }
chrono = { version = "0.4", features = ["serde"] }
${aiServiceDeps}${vaultDeps}${hotkeyDep}
[build-dependencies]
tauri-build = { version = "2", features = [] }
`;

  files.set('src-tauri/Cargo.toml', cargoToml);

  // build.rs
  files.set('src-tauri/build.rs', 'fn main() {\n    tauri_build::build()\n}\n');

  return files;
}

// --- Frontend project files ---

export function generateProjectFiles(ast: AgiFile): Map<string, string> {
  const files = new Map<string, string>();

  // package.json
  const pkg = {
    name: toSnakeCase(ast.app.name),
    version: "0.1.0",
    private: true,
    type: "module",
    scripts: {
      dev: "vite",
      build: "tsc && vite build",
      "type-check": "tsc --noEmit",
      tauri: "tauri",
      "tauri:dev": "tauri dev",
      "tauri:build": "tauri build",
    },
    dependencies: {
      react: "^18.2.0",
      "react-dom": "^18.2.0",
      zustand: "^4.4.7",
      "@tauri-apps/api": "^2.0.0",
      "lucide-react": "^0.400.0",
    },
    devDependencies: {
      typescript: "^5.3.3",
      vite: "^5.0.10",
      "@vitejs/plugin-react": "^4.2.1",
      tailwindcss: "^3.4.0",
      postcss: "^8.4.32",
      autoprefixer: "^10.4.16",
      "@types/react": "^18.2.0",
      "@types/react-dom": "^18.2.0",
      "@tauri-apps/cli": "^2.0.0",
    },
  };
  files.set('package.json', JSON.stringify(pkg, null, 2));

  // src-tauri/capabilities/default.json — Tauri 2 ACL grants
  const hasHotkey = typeof ast.app.hotkey === 'string' && ast.app.hotkey.length > 0;
  const capabilityPermissions = [
    "core:default",
    "core:window:default",
    "core:webview:default",
    "core:event:default",
    ...(hasHotkey ? ["global-shortcut:default"] : []),
  ];
  const capability = {
    "$schema": "../gen/schemas/desktop-schema.json",
    identifier: "default",
    description: "Default capability granting core permissions to the main window.",
    windows: ["main"],
    permissions: capabilityPermissions,
  };
  files.set('src-tauri/capabilities/default.json', JSON.stringify(capability, null, 2));

  // src-tauri/icons/README.md — first-time setup note
  files.set('src-tauri/icons/README.md', `# App icons

Tauri requires icon files at build time. To generate the full icon set from a
single 1024x1024 PNG:

\`\`\`
npx @tauri-apps/cli icon path/to/source.png
\`\`\`

This will produce \`32x32.png\`, \`128x128.png\`, \`128x128@2x.png\`, \`icon.icns\`,
\`icon.ico\`, and the Windows Store tiles.

Until you generate real icons, placeholder files in this directory keep
\`tauri build\` from failing.
`);


  // tsconfig.json
  const tsconfig = {
    compilerOptions: {
      target: "ES2020",
      useDefineForClassFields: true,
      lib: ["ES2020", "DOM", "DOM.Iterable"],
      module: "ESNext",
      skipLibCheck: true,
      moduleResolution: "bundler",
      allowImportingTsExtensions: true,
      resolveJsonModule: true,
      isolatedModules: true,
      noEmit: true,
      jsx: "react-jsx",
      strict: true,
      noUnusedLocals: true,
      noUnusedParameters: true,
      noFallthroughCasesInSwitch: true,
    },
    include: ["src"],
  };
  files.set('tsconfig.json', JSON.stringify(tsconfig, null, 2));

  // vite.config.ts
  files.set('vite.config.ts', `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  server: {
    port: ${ast.app.port ?? 5173},
    strictPort: true,
  },
});
`);

  // tailwind.config.js
  files.set('tailwind.config.js', `/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: { extend: {} },
  plugins: [],
};
`);

  // postcss.config.js
  files.set('postcss.config.js', `export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
`);

  // index.html
  files.set('index.html', `<!DOCTYPE html>
<html lang="en" data-theme="${ast.app.theme ?? 'dark'}">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${ast.app.title}</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`);

  // src/main.tsx
  files.set('src/main.tsx', `import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './components/App';
import './styles/globals.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
`);

  // src/styles/globals.css
  const theme = ast.app.theme ?? 'dark';
  files.set('src/styles/globals.css', `@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --bg-page: #0f172a;
  --bg-panel: #1e293b;
  --bg-sidebar: #0f172a;
  --bg-titlebar: #0f172a;
  --bg-hover: #334155;
  --bg-active: #1e40af;
  --text-primary: #f1f5f9;
  --text-secondary: #94a3b8;
  --border: #334155;
}

[data-theme="light"] {
  --bg-page: #f8fafc;
  --bg-panel: #ffffff;
  --bg-sidebar: #f1f5f9;
  --bg-titlebar: #f1f5f9;
  --bg-hover: #e2e8f0;
  --bg-active: #3b82f6;
  --text-primary: #0f172a;
  --text-secondary: #64748b;
  --border: #e2e8f0;
}

body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  background: var(--bg-page);
  color: var(--text-primary);
  overflow: hidden;
}
`);

  return files;
}
