#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            commands::save_workflow_to_disk,
            commands::load_workflow_from_disk,
            commands::list_project_files,
            commands::create_project_file,
            commands::delete_project_file,
            commands::search_project_files,
            commands::read_api_keys,
            commands::write_api_keys,
            commands::write_recovery,
            commands::list_recovery,
            commands::drop_recovery,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Agicore Studio");
}
