use serde::Serialize;
use std::fs;
use std::path::Path;
use tauri::{AppHandle, Manager};

#[derive(Serialize, Default)]
pub struct Usage {
    files: u64,
    bytes: u64,
}

#[derive(Serialize)]
pub struct StorageUsage {
    database: Usage,
    stores: Usage,
    images: Usage,
}

fn add_file(usage: &mut Usage, path: &Path) {
    if let Ok(meta) = fs::metadata(path) {
        usage.files += 1;
        usage.bytes += meta.len();
    }
}

fn add_dir(usage: &mut Usage, path: &Path) {
    let Ok(entries) = fs::read_dir(path) else { return };
    for entry in entries.flatten() {
        match entry.metadata() {
            Ok(meta) if meta.is_dir() => add_dir(usage, &entry.path()),
            Ok(meta) => {
                usage.files += 1;
                usage.bytes += meta.len();
            }
            Err(_) => {}
        }
    }
}

#[tauri::command]
pub fn delete_database(app: AppHandle) -> Result<(), String> {
    let data = app.path().app_data_dir().map_err(|e| e.to_string())?;
    for name in ["nai_ats.db", "nai_ats.db-wal", "nai_ats.db-shm"] {
        let path = data.join(name);
        if path.exists() {
            fs::remove_file(path).map_err(|e| e.to_string())?;
        }
    }
    restart_app(app)
}

#[tauri::command]
pub fn restart_app(app: AppHandle) -> Result<(), String> {
    #[cfg(desktop)]
    app.restart();
    #[cfg(mobile)]
    {
        app.exit(0);
        Ok(())
    }
}

#[tauri::command]
pub fn storage_usage(app: AppHandle) -> Result<StorageUsage, String> {
    let data = app.path().app_data_dir().map_err(|e| e.to_string())?;

    let mut database = Usage::default();
    for name in ["nai_ats.db", "nai_ats.db-wal", "nai_ats.db-shm"] {
        add_file(&mut database, &data.join(name));
    }

    let mut stores = Usage::default();
    if let Ok(entries) = fs::read_dir(&data) {
        for entry in entries.flatten() {
            if entry.path().extension().is_some_and(|ext| ext == "json") {
                add_file(&mut stores, &entry.path());
            }
        }
    }

    let mut images = Usage::default();
    add_dir(&mut images, &data.join("images"));

    Ok(StorageUsage { database, stores, images })
}
