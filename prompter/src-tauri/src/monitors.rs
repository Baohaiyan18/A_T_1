//! Liệt kê màn hình và theo dõi việc cắm/rút màn hình.

use std::time::Duration;

use serde::Serialize;
use tauri::{AppHandle, Emitter, Manager};

use crate::output::{self, OutputState};

/// Khoảng thời gian giữa hai lần dò danh sách màn hình.
const WATCH_INTERVAL: Duration = Duration::from_millis(1500);

/// Thông tin một màn hình. Vị trí và kích thước tính theo điểm ảnh thật.
#[derive(Debug, Clone, PartialEq, Serialize)]
pub struct MonitorInfo {
    /// Khóa nhận diện, ghép từ tên, vị trí và kích thước (hệ thống không cấp id ổn định).
    pub key: String,
    /// Số thứ tự, bắt đầu từ 1.
    pub index: usize,
    pub name: String,
    pub width: u32,
    pub height: u32,
    pub x: i32,
    pub y: i32,
    pub primary: bool,
}

fn monitor_key(name: &str, x: i32, y: i32, width: u32, height: u32) -> String {
    format!("{name}|{x},{y}|{width}x{height}")
}

pub fn list(app: &AppHandle) -> Vec<MonitorInfo> {
    let primary = app
        .primary_monitor()
        .ok()
        .flatten()
        .map(|m| (m.position().x, m.position().y));
    app.available_monitors()
        .unwrap_or_default()
        .iter()
        .enumerate()
        .map(|(i, m)| {
            let name = m.name().cloned().unwrap_or_default();
            let (x, y) = (m.position().x, m.position().y);
            let (width, height) = (m.size().width, m.size().height);
            MonitorInfo {
                key: monitor_key(&name, x, y, width, height),
                index: i + 1,
                name,
                width,
                height,
                x,
                y,
                primary: primary == Some((x, y)),
            }
        })
        .collect()
}

/// Chọn màn hình đích: đúng khóa yêu cầu → màn phụ đầu tiên → màn đầu tiên.
pub fn pick<'a>(list: &'a [MonitorInfo], key: Option<&str>) -> Option<&'a MonitorInfo> {
    key.and_then(|k| list.iter().find(|m| m.key == k))
        .or_else(|| list.iter().find(|m| !m.primary))
        .or_else(|| list.first())
}

#[tauri::command]
pub fn list_monitors(app: AppHandle) -> Vec<MonitorInfo> {
    list(&app)
}

/// Có nên tự chiếu khi khởi động hay không (khi máy có từ 2 màn hình).
#[tauri::command]
pub fn should_auto_project(app: AppHandle) -> bool {
    list(&app).len() > 1
}

/// Dò định kỳ danh sách màn hình (Tauri không có sự kiện cắm/rút). Khi danh sách đổi:
/// báo cho màn điều khiển, và tắt chiếu nếu màn hình đang chiếu đã biến mất.
pub fn spawn_watcher(app: AppHandle) {
    std::thread::spawn(move || {
        let mut last = list(&app);
        loop {
            std::thread::sleep(WATCH_INTERVAL);
            let now = list(&app);
            if now == last {
                continue;
            }
            let projecting_on = app.state::<OutputState>().monitor_key();
            if let Some(key) = projecting_on
                && !now.iter().any(|m| m.key == key)
            {
                output::close(&app);
            }
            let _ = app.emit_to("main", "monitors-changed", ());
            last = now;
        }
    });
}

#[cfg(test)]
mod tests {
    use super::*;

    fn monitor(index: usize, x: i32, primary: bool) -> MonitorInfo {
        MonitorInfo {
            key: monitor_key("DISPLAY", x, 0, 1920, 1080),
            index,
            name: "DISPLAY".into(),
            width: 1920,
            height: 1080,
            x,
            y: 0,
            primary,
        }
    }

    #[test]
    fn key_changes_with_position_and_size() {
        assert_eq!(monitor_key("A", 0, 0, 1920, 1080), "A|0,0|1920x1080");
        assert_ne!(
            monitor_key("A", 0, 0, 1920, 1080),
            monitor_key("A", 1920, 0, 1920, 1080)
        );
    }

    #[test]
    fn pick_prefers_requested_key() {
        let list = [
            monitor(1, 0, true),
            monitor(2, 1920, false),
            monitor(3, 3840, false),
        ];
        let wanted = list[2].key.clone();
        assert_eq!(pick(&list, Some(&wanted)).unwrap().index, 3);
        assert_eq!(pick(&list, Some(&list[0].key.clone())).unwrap().index, 1);
    }

    #[test]
    fn pick_falls_back_to_first_secondary() {
        let list = [monitor(1, 0, true), monitor(2, 1920, false)];
        assert_eq!(pick(&list, None).unwrap().index, 2);
        assert_eq!(pick(&list, Some("không còn")).unwrap().index, 2);
    }

    #[test]
    fn pick_falls_back_to_primary_when_alone() {
        let list = [monitor(1, 0, true)];
        assert_eq!(pick(&list, None).unwrap().index, 1);
        assert!(pick(&[], None).is_none());
    }
}
