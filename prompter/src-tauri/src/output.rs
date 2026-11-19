//! Cửa sổ chiếu: không viền, toàn màn hình trên màn hình máy nhắc chữ.

use std::sync::Mutex;
use std::time::Duration;

use tauri::{
    AppHandle, Manager, PhysicalPosition, PhysicalSize, State, WebviewUrl, WebviewWindow,
    WebviewWindowBuilder,
};

use crate::monitors::{self, MonitorInfo};

pub const LABEL: &str = "output";

/// Khóa của màn hình đang được chiếu; `None` khi không chiếu.
#[derive(Default)]
pub struct OutputState(Mutex<Option<String>>);

impl OutputState {
    pub fn monitor_key(&self) -> Option<String> {
        self.0.lock().unwrap().clone()
    }

    pub fn set(&self, key: Option<String>) {
        *self.0.lock().unwrap() = key;
    }
}

/// Đưa cửa sổ sang màn hình `m` rồi bật toàn màn hình.
fn place(win: &WebviewWindow, m: &MonitorInfo) -> tauri::Result<()> {
    let position = PhysicalPosition::new(m.x, m.y);
    win.set_fullscreen(false)?;
    win.set_position(position)?;
    win.set_size(PhysicalSize::new(m.width, m.height))?;
    // Chờ hệ điều hành dời cửa sổ xong (hệ số phóng to có thể đổi theo màn hình),
    // rồi đặt lại vị trí trước khi bật toàn màn hình.
    std::thread::sleep(Duration::from_millis(60));
    win.set_position(position)?;
    win.set_fullscreen(true)?;
    // Trên màn phụ thì luôn nằm trên cùng; trên màn chính thì không, để còn thao tác được.
    win.set_always_on_top(!m.primary)?;
    Ok(())
}

/// Mở cửa sổ chiếu trên màn hình có khóa `monitor_key`; đã mở thì dời sang màn hình đó.
/// Không tìm thấy khóa thì chiếu lên màn phụ đầu tiên, không có thì màn chính.
#[tauri::command]
pub async fn open_output(
    app: AppHandle,
    state: State<'_, OutputState>,
    monitor_key: Option<String>,
) -> Result<(), String> {
    let list = monitors::list(&app);
    let target = monitors::pick(&list, monitor_key.as_deref())
        .ok_or("Không tìm thấy màn hình nào")?
        .clone();

    let win = match app.get_webview_window(LABEL) {
        Some(win) => win,
        None => WebviewWindowBuilder::new(&app, LABEL, WebviewUrl::App("index.html".into()))
            .title("Rec Media – Màn chiếu")
            .decorations(false)
            .visible(false)
            .build()
            .map_err(|e| e.to_string())?,
    };
    place(&win, &target).map_err(|e| e.to_string())?;
    win.show().map_err(|e| e.to_string())?;
    state.set(Some(target.key));

    // Giữ bàn phím ở màn điều khiển để người vận hành dùng phím tắt ngay.
    if let Some(main) = app.get_webview_window("main") {
        let _ = main.set_focus();
    }
    Ok(())
}

pub fn close(app: &AppHandle) {
    if let Some(win) = app.get_webview_window(LABEL) {
        let _ = win.close();
    }
}

#[tauri::command]
pub fn close_output(app: AppHandle) {
    close(&app);
}
