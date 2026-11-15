mod fonts;
mod monitors;
mod output;
mod script_io;
mod update;

use serde::Serialize;
use tauri::{AppHandle, Emitter, Manager, WindowEvent};

/// Thông tin hiển thị trong hộp thoại Giới thiệu.
#[derive(Serialize)]
struct AppInfo {
    version: String,
    tauri: &'static str,
    webview: String,
}

#[tauri::command]
fn app_info(app: AppHandle) -> AppInfo {
    AppInfo {
        version: app.package_info().version.to_string(),
        tauri: tauri::VERSION,
        webview: tauri::webview_version().unwrap_or_default(),
    }
}

/// Đưa cửa sổ điều khiển lên trước (khôi phục nếu đang thu nhỏ).
fn focus_main(app: &AppHandle) {
    if let Some(main) = app.get_webview_window("main") {
        let _ = main.unminimize();
        let _ = main.set_focus();
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // Phải đăng ký đầu tiên: mở ứng dụng lần hai thì chỉ đưa cửa sổ đang chạy lên trước.
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            focus_main(app);
        }))
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .manage(output::OutputState::default())
        .manage(update::PendingUpdate::default())
        .invoke_handler(tauri::generate_handler![
            fonts::list_fonts,
            script_io::open_script,
            script_io::save_script,
            monitors::list_monitors,
            monitors::should_auto_project,
            output::open_output,
            output::close_output,
            update::check_update,
            update::install_update,
            app_info
        ])
        .setup(|app| {
            if let Some(main) = app.get_webview_window("main") {
                let version = &app.package_info().version;
                let _ = main.set_title(&format!("Prompter {version}"));
            }
            monitors::spawn_watcher(app.handle().clone());
            Ok(())
        })
        .on_window_event(|window, event| {
            if !matches!(event, WindowEvent::Destroyed) {
                return;
            }
            let app = window.app_handle();
            match window.label() {
                // Đóng màn điều khiển là thoát ứng dụng, kéo theo màn chiếu.
                "main" => app.exit(0),
                output::LABEL => {
                    app.state::<output::OutputState>().set(None);
                    let _ = app.emit_to("main", "output-closed", ());
                }
                _ => {}
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
