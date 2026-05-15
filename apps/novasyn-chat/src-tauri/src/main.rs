#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod db;
mod ai_service;
mod router;
mod compiler;
mod vault;
mod tests;

use std::sync::Mutex;
use tauri::Manager;
use tauri::tray::{TrayIconBuilder, TrayIconEvent, MouseButton};
use tauri::menu::{Menu, MenuItem};
use tauri_plugin_global_shortcut::GlobalShortcutExt;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            let app_dir = app.path().app_data_dir().expect("failed to resolve app data dir");
            std::fs::create_dir_all(&app_dir).ok();
            let db_path = app_dir.join("novasyn_chat.db");
            let pool = db::init_db(db_path.clone());
            app.manage(pool);
            app.manage(Mutex::new(db_path));
            let api_keys = Mutex::new(ai_service::load_api_keys());
            app.manage(api_keys);
            let vault_path = vault::resolve_vault_path("%APPDATA%/NovaSyn/vault.db");
            let vault_pool = vault::init_vault(vault_path);
            app.manage(vault_pool);
            // System tray setup
            let show = MenuItem::with_id(app, "show", "Show NovaSyn Chat", true, None::<&str>)?;
            let quit = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show, &quit])?;
            TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "show" => {
                        if let Some(w) = app.get_webview_window("main") {
                            let _ = w.show(); let _ = w.set_focus();
                        }
                    }
                    "quit" => app.exit(0),
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click { button: MouseButton::Left, .. } = event {
                        let app = tray.app_handle();
                        if let Some(w) = app.get_webview_window("main") {
                            let _ = w.show(); let _ = w.set_focus();
                        }
                    }
                })
                .build(app)?;
            // Global hotkey — toggle window visibility
            app.global_shortcut().on_shortcut("Ctrl+Shift+N", |app, _shortcut, _event| {
                if let Some(w) = app.get_webview_window("main") {
                    if w.is_visible().unwrap_or(false) {
                        let _ = w.hide();
                    } else {
                        let _ = w.show();
                        let _ = w.set_focus();
                    }
                }
            })?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            ai_service::send_chat,
            ai_service::get_api_keys,
            ai_service::set_api_key,
            commands::user::list_users,
            commands::user::create_user,
            commands::user::get_user,
            commands::user::update_user,
            commands::user::delete_user,
            commands::workspace::list_workspaces,
            commands::workspace::create_workspace,
            commands::workspace::get_workspace,
            commands::workspace::update_workspace,
            commands::workspace::delete_workspace,
            commands::session::list_sessions,
            commands::session::create_session,
            commands::session::get_session,
            commands::session::update_session,
            commands::session::delete_session,
            commands::folder::list_folders,
            commands::folder::create_folder,
            commands::folder::get_folder,
            commands::folder::update_folder,
            commands::folder::delete_folder,
            commands::folder_item::list_folder_items,
            commands::folder_item::create_folder_item,
            commands::folder_item::get_folder_item,
            commands::folder_item::update_folder_item,
            commands::folder_item::delete_folder_item,
            commands::tag::list_tags,
            commands::tag::create_tag,
            commands::tag::get_tag,
            commands::tag::update_tag,
            commands::tag::delete_tag,
            commands::chat_message::list_chat_messages,
            commands::chat_message::list_chat_messages_by_session,
            commands::chat_message::create_chat_message,
            commands::chat_message::get_chat_message,
            commands::chat_message::update_chat_message,
            commands::chat_message::delete_chat_message,
            commands::chat_message_tag::list_chat_message_tags,
            commands::chat_message_tag::create_chat_message_tag,
            commands::chat_message_tag::get_chat_message_tag,
            commands::chat_message_tag::update_chat_message_tag,
            commands::chat_message_tag::delete_chat_message_tag,
            commands::chat_message_folder::list_chat_message_folders,
            commands::chat_message_folder::create_chat_message_folder,
            commands::chat_message_folder::get_chat_message_folder,
            commands::chat_message_folder::update_chat_message_folder,
            commands::chat_message_folder::delete_chat_message_folder,
            commands::exchange::list_exchanges,
            commands::exchange::create_exchange,
            commands::exchange::get_exchange,
            commands::exchange::update_exchange,
            commands::exchange::delete_exchange,
            commands::exchange_tag::list_exchange_tags,
            commands::exchange_tag::create_exchange_tag,
            commands::exchange_tag::get_exchange_tag,
            commands::exchange_tag::update_exchange_tag,
            commands::exchange_tag::delete_exchange_tag,
            commands::document::list_documents,
            commands::document::create_document,
            commands::document::get_document,
            commands::document::update_document,
            commands::document::delete_document,
            commands::orchestration::list_orchestrations,
            commands::orchestration::create_orchestration,
            commands::orchestration::get_orchestration,
            commands::orchestration::update_orchestration,
            commands::orchestration::delete_orchestration,
            commands::orchestration_run::list_orchestration_runs,
            commands::orchestration_run::create_orchestration_run,
            commands::orchestration_run::get_orchestration_run,
            commands::orchestration_run::update_orchestration_run,
            commands::orchestration_run::delete_orchestration_run,
            commands::actions::search_chats,
            commands::actions::web_search,
            commands::actions::export_session_md,
            router::broadcast_chat,
            router::council_chat,
            compiler::read_document_content,
            compiler::write_document_content,
            compiler::scan_documents_dir,
            compiler::chat_to_exchange,
            compiler::chat_to_folder,
            compiler::chat_to_skilldoc,
            compiler::chat_to_requirements,
            compiler::chat_to_post,
            vault::vault_list_assets,
            vault::vault_get_asset,
            vault::vault_save_asset,
            vault::vault_update_asset,
            vault::vault_delete_asset,
            vault::vault_search_assets,
            vault::vault_list_tags,
            vault::vault_tag_asset,
            vault::vault_record_provenance,
            vault::vault_get_provenance,
            commands::workspaces::get_db_path,
            commands::workspaces::switch_db,
            commands::shell::shell_run,
            commands::shell::shell_get_home,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
