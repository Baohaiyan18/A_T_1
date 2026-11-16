//! Mở và lưu kịch bản dạng file văn bản `.txt`.

use serde::Serialize;
use tauri::WebviewWindow;
use tauri_plugin_dialog::DialogExt;

const FILTER_NAME: &str = "Văn bản";

/// Kịch bản đọc từ file: tên file bỏ đuôi (làm tên tab) và nội dung.
#[derive(Serialize)]
pub struct OpenedScript {
    name: String,
    text: String,
}

/// Đọc nội dung file như UTF-8: bỏ BOM ở đầu, byte không hợp lệ thay bằng U+FFFD.
fn decode_utf8(bytes: &[u8]) -> String {
    let bytes = bytes.strip_prefix(b"\xEF\xBB\xBF").unwrap_or(bytes);
    String::from_utf8_lossy(bytes).into_owned()
}

/// Hiện hộp thoại chọn file `.txt` và trả về tên + nội dung; `None` nếu người dùng hủy.
#[tauri::command]
pub async fn open_script(window: WebviewWindow) -> Result<Option<OpenedScript>, String> {
    let picked = window
        .dialog()
        .file()
        .set_parent(&window)
        .add_filter(FILTER_NAME, &["txt"])
        .blocking_pick_file();
    let Some(file) = picked else {
        return Ok(None);
    };
    let path = file.into_path().map_err(|e| e.to_string())?;
    let bytes = std::fs::read(&path).map_err(|e| format!("Không đọc được file: {e}"))?;
    let name = path
        .file_stem()
        .map(|s| s.to_string_lossy().into_owned())
        .unwrap_or_default();
    Ok(Some(OpenedScript {
        name,
        text: decode_utf8(&bytes),
    }))
}

/// Hiện hộp thoại lưu file (gợi ý tên `file_name`) và ghi kịch bản dạng UTF-8; `false` nếu người dùng hủy.
#[tauri::command]
pub async fn save_script(
    window: WebviewWindow,
    text: String,
    file_name: String,
) -> Result<bool, String> {
    let picked = window
        .dialog()
        .file()
        .set_parent(&window)
        .add_filter(FILTER_NAME, &["txt"])
        .set_file_name(&file_name)
        .blocking_save_file();
    let Some(file) = picked else {
        return Ok(false);
    };
    let path = file.into_path().map_err(|e| e.to_string())?;
    std::fs::write(&path, text).map_err(|e| format!("Không ghi được file: {e}"))?;
    Ok(true)
}

#[cfg(test)]
mod tests {
    use super::decode_utf8;

    #[test]
    fn keeps_vietnamese_text() {
        assert_eq!(
            decode_utf8("Kính thưa quý vị".as_bytes()),
            "Kính thưa quý vị"
        );
    }

    #[test]
    fn strips_bom() {
        assert_eq!(decode_utf8(b"\xEF\xBB\xBFabc"), "abc");
    }

    #[test]
    fn replaces_invalid_bytes() {
        assert_eq!(decode_utf8(b"a\xFFb"), "a\u{FFFD}b");
    }
}
