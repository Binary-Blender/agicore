#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod baseline;
mod commands;
mod db;
mod dispatch;
mod personas;
mod revelation;
mod scoring;
mod types;

use tauri::Manager;

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            let app_dir = app
                .path()
                .app_data_dir()
                .expect("failed to resolve app data dir");
            std::fs::create_dir_all(&app_dir).ok();
            let db_path = app_dir.join("reality_ai.db");
            let pool = db::init_db(db_path);
            app.manage(pool);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::list_conversations,
            commands::create_conversation,
            commands::delete_conversation,
            commands::get_messages,
            commands::send_message,
            commands::reset_conversation,
            commands::get_stats,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Reality.AI");
}
