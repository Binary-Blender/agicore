// PLATFORM Code Generator
// Generates scaffold/platform.json for each declared PLATFORM.
// Also generates a Zig build target stub and Python pyproject.toml snippet.
// Activated when ast.platforms.length > 0.

import type { AgiFile, PlatformDecl } from '@agicore/parser';

const CHIP_CONFIG: Record<string, { arch: string; os: string; default_ai: string; triple: string }> = {
  rpi5:    { arch: 'aarch64', os: 'linux',     default_ai: 'ollama',  triple: 'aarch64-linux-gnu' },
  rpi4:    { arch: 'aarch64', os: 'linux',     default_ai: 'ollama',  triple: 'aarch64-linux-gnu' },
  esp32s3: { arch: 'xtensa', os:  'bare-metal', default_ai: 'tflite', triple: 'xtensa-esp32s3-none-elf' },
  stm32h7: { arch: 'thumb',  os:  'bare-metal', default_ai: 'tflite', triple: 'thumbv7em-none-eabihf' },
  stm32f4: { arch: 'thumb',  os:  'bare-metal', default_ai: 'tflite', triple: 'thumbv7em-none-eabihf' },
  x86:     { arch: 'x86_64', os:  'linux',      default_ai: 'ollama', triple: 'x86_64-linux-gnu' },
  custom:  { arch: 'custom', os:  'custom',     default_ai: 'none',   triple: 'custom' },
};

function generatePlatformJson(platform: PlatformDecl): string {
  const cfg = CHIP_CONFIG[platform.chip] ?? CHIP_CONFIG.custom;
  const obj = {
    name: platform.name,
    chip: platform.chip,
    arch: cfg.arch,
    os: platform.os ?? cfg.os,
    ai_runtime: platform.aiRuntime ?? cfg.default_ai,
    cross_target: platform.crossTarget ?? cfg.triple,
    zig_target: platform.crossTarget ?? cfg.triple,
    generated: new Date().toISOString().split('T')[0],
  };
  return JSON.stringify(obj, null, 2);
}

function generateBuildZig(platforms: PlatformDecl[]): string {
  const steps = platforms.map(p => {
    const cfg = CHIP_CONFIG[p.chip] ?? CHIP_CONFIG.custom;
    const triple = p.crossTarget ?? cfg.triple;
    return `    // Platform: ${p.name} (${p.chip})
    const ${snakeCase(p.name)}_target = b.resolveTargetQuery(.{
        .cpu_arch = .${zigArch(p.chip)},
        .os_tag = .${zigOs(p.chip)},
    });
    const ${snakeCase(p.name)}_exe = b.addExecutable(.{
        .name = "${p.name}",
        .root_source_file = b.path("src/main.zig"),
        .target = ${snakeCase(p.name)}_target,
        .optimize = optimize,
    });
    b.installArtifact(${snakeCase(p.name)}_exe);
    // Cross-compile: zig build -Dtarget=${triple} -Doptimize=ReleaseSmall`;
  }).join('\n\n');

  return `// Agicore Generated — DO NOT EDIT BY HAND
// Zig build steps for all declared PLATFORM targets.
// Integrate into your build.zig pub fn build() by copying the relevant step.

const std = @import("std");

pub fn build(b: *std.Build) void {
    const optimize = b.standardOptimizeOption(.{});

${steps}
}
`;
}

export function generatePlatform(ast: AgiFile): Map<string, string> {
  const files = new Map<string, string>();
  if (ast.platforms.length === 0) return files;

  for (const platform of ast.platforms) {
    files.set(`scaffold/platforms/${platform.name}.json`, generatePlatformJson(platform));
  }
  files.set('scaffold/build_targets.zig', generateBuildZig(ast.platforms));
  return files;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function snakeCase(s: string): string {
  return s.replace(/([A-Z])/g, '_$1').replace(/-/g, '_').toLowerCase().replace(/^_/, '');
}

function zigArch(chip: string): string {
  switch (chip) {
    case 'rpi5': case 'rpi4': return 'aarch64';
    case 'esp32s3': return 'xtensa';
    case 'stm32h7': case 'stm32f4': return 'thumb';
    default: return 'x86_64';
  }
}

function zigOs(chip: string): string {
  switch (chip) {
    case 'rpi5': case 'rpi4': case 'x86': return 'linux';
    default: return 'freestanding';
  }
}
