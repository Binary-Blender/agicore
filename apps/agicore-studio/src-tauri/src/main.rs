#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            commands::save_workflow_to_disk,
            commands::load_workflow_from_disk,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Agicore Studio");
}
