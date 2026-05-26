//! Tauri commands for workflow disk I/O.
//!
//! MVP scope: read and write a single .agi file at a time, with its
//! companion .agi.layout.json sidecar. Atomic write semantics: the .agi
//! and sidecar are written via a tempfile + rename so partial-state on
//! disk is impossible even if the process is killed mid-save.

use serde::{Deserialize, Serialize};
use std::fs;
use std::io::Write;
use std::path::{Path, PathBuf};

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LoadedWorkflow {
    pub agi_source: String,
    /// Sidecar contents, or null if the sidecar doesn't exist on disk.
    pub layout_json: Option<String>,
}

#[tauri::command]
pub fn save_workflow_to_disk(
    path: String,
    agi_source: String,
    layout_json: String,
) -> Result<(), String> {
    let agi_path = PathBuf::from(&path);
    let sidecar_path = sidecar_path_for(&agi_path);

    write_atomic(&agi_path, agi_source.as_bytes()).map_err(|e| e.to_string())?;
    write_atomic(&sidecar_path, layout_json.as_bytes()).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn load_workflow_from_disk(path: String) -> Result<LoadedWorkflow, String> {
    let agi_path = PathBuf::from(&path);
    let agi_source = fs::read_to_string(&agi_path).map_err(|e| e.to_string())?;

    let sidecar_path = sidecar_path_for(&agi_path);
    let layout_json = if sidecar_path.exists() {
        Some(fs::read_to_string(&sidecar_path).map_err(|e| e.to_string())?)
    } else {
        None
    };

    Ok(LoadedWorkflow { agi_source, layout_json })
}

fn sidecar_path_for(agi_path: &Path) -> PathBuf {
    let mut s = agi_path.as_os_str().to_owned();
    s.push(".layout.json");
    PathBuf::from(s)
}

fn write_atomic(path: &Path, bytes: &[u8]) -> std::io::Result<()> {
    if let Some(parent) = path.parent() {
        if !parent.as_os_str().is_empty() {
            fs::create_dir_all(parent)?;
        }
    }
    let tmp = path.with_extension(format!(
        "{}.tmp",
        path.extension().and_then(|e| e.to_str()).unwrap_or("tmp")
    ));
    {
        let mut f = fs::File::create(&tmp)?;
        f.write_all(bytes)?;
        f.sync_all()?;
    }
    fs::rename(&tmp, path)?;
    Ok(())
}
