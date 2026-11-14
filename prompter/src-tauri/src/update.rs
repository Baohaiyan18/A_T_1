//! Kiểm tra, tải và cài bản cập nhật qua `tauri-plugin-updater`.
//!
//! Địa chỉ máy chủ và khóa công khai nằm trong `tauri.conf.json` (`plugins.updater`).
//! File mô tả bản phát hành có thể kèm trường tùy biến `"mandatory": true` để buộc cập nhật.

use std::sync::Mutex;

use serde::Serialize;
use tauri::{AppHandle, Emitter, State};
use tauri_plugin_updater::{Error, Update, UpdaterExt};

const NOT_CONFIGURED: &str = "Chưa cấu hình máy chủ cập nhật.";

/// Bản cập nhật tìm thấy ở lần kiểm tra gần nhất, giữ lại để cài.
#[derive(Default)]
pub struct PendingUpdate(Mutex<Option<Update>>);

#[derive(Debug, Clone, PartialEq, Serialize)]
pub struct UpdateInfo {
    pub version: String,
    pub current_version: String,
    /// Ghi chú phát hành.
    pub notes: Option<String>,
    pub mandatory: bool,
}

#[derive(Clone, Serialize)]
struct Progress {
    done: u64,
    total: Option<u64>,
}

/// Đọc trường tùy biến `mandatory` trong file mô tả bản phát hành; thiếu thì coi là không bắt buộc.
fn is_mandatory(raw: &serde_json::Value) -> bool {
    raw.get("mandatory")
        .and_then(serde_json::Value::as_bool)
        .unwrap_or(false)
}

fn describe(err: Error) -> String {
    match err {
        Error::EmptyEndpoints => NOT_CONFIGURED.into(),
        other => format!("Không kiểm tra được cập nhật: {other}"),
    }
}

/// Hỏi máy chủ xem có bản mới không; `None` nếu đang dùng bản mới nhất.
#[tauri::command]
pub async fn check_update(
    app: AppHandle,
    pending: State<'_, PendingUpdate>,
) -> Result<Option<UpdateInfo>, String> {
    let update = app
        .updater()
        .map_err(describe)?
        .check()
        .await
        .map_err(describe)?;
    let info = update.as_ref().map(|u| UpdateInfo {
        version: u.version.clone(),
        current_version: u.current_version.clone(),
        notes: u.body.clone(),
        mandatory: is_mandatory(&u.raw_json),
    });
    *pending.0.lock().unwrap() = update;
    Ok(info)
}

/// Tải bản cập nhật vừa tìm thấy (kiểm tra chữ ký), cài rồi khởi động lại.
/// Tiến độ tải được báo qua sự kiện `update-progress`.
#[tauri::command]
pub async fn install_update(
    app: AppHandle,
    pending: State<'_, PendingUpdate>,
) -> Result<(), String> {
    let update = pending
        .0
        .lock()
        .unwrap()
        .take()
        .ok_or("Chưa có bản cập nhật nào để cài. Hãy kiểm tra cập nhật trước.")?;

    let mut done: u64 = 0;
    let progress_app = app.clone();
    update
        .download_and_install(
            move |chunk, total| {
                done += chunk as u64;
                let _ = progress_app.emit_to("main", "update-progress", Progress { done, total });
            },
            || {},
        )
        .await
        .map_err(|e| format!("Không cài được bản cập nhật: {e}"))?;

    // Trên Windows bộ cài tự đóng ứng dụng; các nền tảng khác thì khởi động lại ở đây.
    app.restart();
}

#[cfg(test)]
mod tests {
    use super::is_mandatory;
    use serde_json::json;

    #[test]
    fn mandatory_flag_is_read_from_manifest() {
        assert!(is_mandatory(
            &json!({ "version": "1.2.0", "mandatory": true })
        ));
        assert!(!is_mandatory(
            &json!({ "version": "1.2.0", "mandatory": false })
        ));
    }

    #[test]
    fn missing_or_malformed_flag_means_optional() {
        assert!(!is_mandatory(&json!({ "version": "1.2.0" })));
        assert!(!is_mandatory(&json!({ "mandatory": "yes" })));
    }
}
