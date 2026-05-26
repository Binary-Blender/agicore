#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

// Sprint 0 — minimal Tauri shell. The renderer hosts both bench tests
// (React Flow canvas + CodeMirror 6 editor). MVP work adds the command
// surface for project I/O, workflow runs, and QC decisions.

fn main() {
    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("error while running Agicore Studio");
}
