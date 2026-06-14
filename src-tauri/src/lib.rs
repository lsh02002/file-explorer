use serde::Serialize;
use std::{
    fs,
    path::{Path, PathBuf},
    time::UNIX_EPOCH,
};

#[derive(Debug, Serialize)]
struct FileItem {
    name: String,
    path: String,
    is_dir: bool,
    size: Option<u64>,
    extension: Option<String>,
    modified_ms: Option<u128>,
}

fn safe_child_path(dir: &str, name: &str) -> Result<PathBuf, String> {
    if name.contains('/') || name.contains('\\') || name == "." || name == ".." || name.trim().is_empty() {
        return Err("잘못된 이름입니다.".into());
    }
    Ok(Path::new(dir).join(name))
}

#[tauri::command]
fn list_dir(path: String) -> Result<Vec<FileItem>, String> {
    let mut items = Vec::new();
    let read_dir = fs::read_dir(&path).map_err(|e| format!("디렉터리를 읽을 수 없습니다: {e}"))?;

    for entry in read_dir {
        let entry = match entry {
            Ok(entry) => entry,
            Err(_) => continue,
        };
        let metadata = match entry.metadata() {
            Ok(metadata) => metadata,
            Err(_) => continue,
        };
        let file_name = entry.file_name().to_string_lossy().to_string();
        let modified_ms = metadata
            .modified()
            .ok()
            .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
            .map(|d| d.as_millis());

        let extension = entry
            .path()
            .extension()
            .and_then(|e| e.to_str())
            .map(|s| s.to_string());

        items.push(FileItem {
            name: file_name,
            path: entry.path().to_string_lossy().to_string(),
            is_dir: metadata.is_dir(),
            size: if metadata.is_file() { Some(metadata.len()) } else { None },
            extension,
            modified_ms,
        });
    }

    Ok(items)
}

#[tauri::command]
fn create_file(dir: String, name: String) -> Result<(), String> {
    let path = safe_child_path(&dir, &name)?;
    fs::OpenOptions::new()
        .write(true)
        .create_new(true)
        .open(path)
        .map(|_| ())
        .map_err(|e| format!("파일을 만들 수 없습니다: {e}"))
}

#[tauri::command]
fn create_dir(dir: String, name: String) -> Result<(), String> {
    let path = safe_child_path(&dir, &name)?;
    fs::create_dir(path).map_err(|e| format!("폴더를 만들 수 없습니다: {e}"))
}

#[tauri::command]
fn rename_path(path: String, new_name: String) -> Result<(), String> {
    let old_path = PathBuf::from(&path);
    let parent = old_path.parent().ok_or("상위 경로를 찾을 수 없습니다.")?;
    let new_path = safe_child_path(&parent.to_string_lossy(), &new_name)?;
    fs::rename(old_path, new_path).map_err(|e| format!("이름을 변경할 수 없습니다: {e}"))
}

#[tauri::command]
fn delete_path(path: String) -> Result<(), String> {
    let p = Path::new(&path);

    if !p.exists() {
        return Err("파일 또는 폴더가 존재하지 않습니다.".into());
    }

    trash::delete(p)
        .map_err(|e| format!("휴지통으로 이동할 수 없습니다: {e}"))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            list_dir,
            create_file,
            create_dir,
            rename_path,
            delete_path,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
