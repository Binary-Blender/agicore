#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod basic;
mod commands;
mod db;
mod platforms;
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
            let db_path = app_dir.join("gen_x_simulator.db");
            let pool = db::init_db(db_path);
            app.manage(pool);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::list_platforms,
            commands::boot_platform,
            commands::get_lessons,
            commands::ensure_profile,
            commands::choose_platform,
            commands::run_program,
            commands::resume_program,
            commands::record_attempt,
            commands::get_skill_snapshot,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Gen-X Simulator");
}
