//! Tauri commands for workflow + project disk I/O.
//!
//! Workflow commands read and write a single .agi file with its
//! companion .agi.layout.json sidecar. Atomic write semantics: tempfile
//! + rename so partial-state on disk is impossible even if the process
//! is killed mid-save.
//!
//! Project commands operate on a directory — list the .agi files in it,
//! create a new empty file, delete an existing file (plus its sidecar).
//! Sidecar layout files stay invisible to the explorer surface — they
//! are filtered out of the listing.

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
    /// Unix epoch seconds of the .agi file at load time. Used by the
    /// hot-reload poller to detect external modifications.
    pub modified_at: i64,
}

#[tauri::command]
pub fn save_workflow_to_disk(
    path: String,
    agi_source: String,
    layout_json: String,
) -> Result<i64, String> {
    let agi_path = PathBuf::from(&path);
    let sidecar_path = sidecar_path_for(&agi_path);

    write_atomic(&agi_path, agi_source.as_bytes()).map_err(|e| e.to_string())?;
    write_atomic(&sidecar_path, layout_json.as_bytes()).map_err(|e| e.to_string())?;
    // Return the post-save mtime so the renderer can bump its
    // loadedMtime baseline atomically. Otherwise the next hot-reload
    // poll would read its own save as an external modification.
    let mtime = fs::metadata(&agi_path).as_ref().map(mtime_seconds).unwrap_or(0);
    Ok(mtime)
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

    let modified_at = fs::metadata(&agi_path).as_ref().map(mtime_seconds).unwrap_or(0);

    Ok(LoadedWorkflow { agi_source, layout_json, modified_at })
}

fn sidecar_path_for(agi_path: &Path) -> PathBuf {
    let mut s = agi_path.as_os_str().to_owned();
    s.push(".layout.json");
    PathBuf::from(s)
}

// ============================================================================
// Project directory commands
// ============================================================================

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectFile {
    pub name: String,
    pub path: String,
    /// Unix epoch seconds. The hot-reload poller diffs this against
    /// what the workflow store remembers from load-time to detect
    /// external edits (e.g. git pull, another editor).
    pub modified_at: i64,
}

fn mtime_seconds(meta: &fs::Metadata) -> i64 {
    use std::time::SystemTime;
    meta.modified()
        .ok()
        .and_then(|t| t.duration_since(SystemTime::UNIX_EPOCH).ok())
        .map(|d| d.as_secs() as i64)
        .unwrap_or(0)
}

#[tauri::command]
pub fn list_project_files(root_path: String) -> Result<Vec<ProjectFile>, String> {
    let root = PathBuf::from(&root_path);
    if !root.is_dir() {
        return Err(format!("not a directory: {}", root_path));
    }
    let mut files: Vec<ProjectFile> = Vec::new();
    for entry in fs::read_dir(&root).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path();
        if !path.is_file() {
            continue;
        }
        // Only .agi files; sidecar .agi.layout.json files filtered out.
        let name = match path.file_name().and_then(|n| n.to_str()) {
            Some(n) => n.to_string(),
            None => continue,
        };
        if !name.ends_with(".agi") {
            continue;
        }
        let modified_at = entry
            .metadata()
            .as_ref()
            .map(mtime_seconds)
            .unwrap_or(0);
        files.push(ProjectFile {
            name,
            path: path.to_string_lossy().into_owned(),
            modified_at,
        });
    }
    files.sort_by(|a, b| a.name.cmp(&b.name));
    Ok(files)
}

#[tauri::command]
pub fn create_project_file(
    root_path: String,
    file_name: String,
) -> Result<ProjectFile, String> {
    let mut name = file_name.trim().to_string();
    if name.is_empty() {
        return Err("file name is empty".into());
    }
    if !name.ends_with(".agi") {
        name.push_str(".agi");
    }
    // Prevent path traversal — only filenames, no slashes.
    if name.contains('/') || name.contains('\\') {
        return Err("file name must not contain path separators".into());
    }
    let root = PathBuf::from(&root_path);
    if !root.is_dir() {
        return Err(format!("not a directory: {}", root_path));
    }
    let target = root.join(&name);
    if target.exists() {
        return Err(format!("file already exists: {}", name));
    }
    let stub = format!(
        "// {}\n\nWORKFLOW untitled_workflow {{\n}}\n",
        name.trim_end_matches(".agi")
    );
    write_atomic(&target, stub.as_bytes()).map_err(|e| e.to_string())?;
    let modified_at = fs::metadata(&target).as_ref().map(mtime_seconds).unwrap_or(0);
    Ok(ProjectFile {
        name,
        path: target.to_string_lossy().into_owned(),
        modified_at,
    })
}

#[tauri::command]
pub fn delete_project_file(path: String) -> Result<(), String> {
    let target = PathBuf::from(&path);
    if !target.is_file() {
        return Err(format!("not a file: {}", path));
    }
    fs::remove_file(&target).map_err(|e| e.to_string())?;
    let sidecar = sidecar_path_for(&target);
    if sidecar.exists() {
        // Best-effort sidecar cleanup; don't fail if it's gone.
        let _ = fs::remove_file(sidecar);
    }
    Ok(())
}

// ============================================================================
// Internals
// ============================================================================

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
