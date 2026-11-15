//! Liệt kê các font chữ đã cài trong hệ thống.

use std::collections::HashSet;

fn normalize_fonts(names: impl IntoIterator<Item = String>) -> Vec<String> {
    let mut seen = HashSet::new();
    let mut out = Vec::new();
    for raw in names {
        let name = raw.trim();
        // Bỏ tên rỗng hoặc font dọc bắt đầu bằng '@' (một số API Windows vẫn trả về).
        if name.is_empty() || name.starts_with('@') {
            continue;
        }
        if seen.insert(name.to_lowercase()) {
            out.push(name.to_string());
        }
    }
    out.sort_by_key(|a| a.to_lowercase());
    out
}

#[cfg(windows)]
fn system_fonts() -> Vec<String> {
    use windows::Win32::Graphics::DirectWrite::{
        DWRITE_FACTORY_TYPE_SHARED, DWriteCreateFactory, IDWriteFactory, IDWriteFontCollection,
    };
    use windows::core::{BOOL, w};

    let Ok(factory) =
        (unsafe { DWriteCreateFactory::<IDWriteFactory>(DWRITE_FACTORY_TYPE_SHARED) })
    else {
        return Vec::new();
    };

    let mut collection: Option<IDWriteFontCollection> = None;
    if unsafe { factory.GetSystemFontCollection(&mut collection, false) }.is_err() {
        return Vec::new();
    }
    let Some(collection) = collection else {
        return Vec::new();
    };

    let count = unsafe { collection.GetFontFamilyCount() };
    let mut raw = Vec::with_capacity(count as usize);

    for i in 0..count {
        let Ok(family) = (unsafe { collection.GetFontFamily(i) }) else {
            continue;
        };
        let Ok(names) = (unsafe { family.GetFamilyNames() }) else {
            continue;
        };

        let mut index = 0u32;
        let mut exists = BOOL(0);
        let found_en = unsafe { names.FindLocaleName(w!("en-us"), &mut index, &mut exists) }
            .is_ok()
            && exists.as_bool();
        if !found_en {
            index = 0;
        }

        let Ok(len) = (unsafe { names.GetStringLength(index) }) else {
            continue;
        };
        let mut buf = vec![0u16; len as usize + 1];
        if unsafe { names.GetString(index, &mut buf) }.is_ok() {
            raw.push(String::from_utf16_lossy(&buf[..len as usize]));
        }
    }

    normalize_fonts(raw)
}

#[cfg(not(windows))]
fn system_fonts() -> Vec<String> {
    Vec::new()
}

/// Trả về danh sách tên họ font chữ đã cài trong hệ thống, đã loại trùng và sắp xếp.
#[tauri::command]
pub fn list_fonts() -> Vec<String> {
    system_fonts()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn normalizes_dedups_and_sorts_case_insensitively() {
        let list = normalize_fonts([
            "Verdana".into(),
            "arial".into(),
            "Arial".into(),
            "@Yu Gothic".into(),
            "  ".into(),
            "Segoe UI".into(),
            "Segoe UI".into(),
        ]);
        assert_eq!(list, vec!["arial", "Segoe UI", "Verdana"]);
    }

    #[cfg(windows)]
    #[test]
    fn reads_windows_system_fonts() {
        let list = system_fonts();
        assert!(!list.is_empty());
        assert!(list.iter().any(|f| f.eq_ignore_ascii_case("Arial")));
    }
}
