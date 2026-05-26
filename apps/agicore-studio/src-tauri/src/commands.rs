//! Tauri commands for workflow + project disk I/O, plus user-config
//! storage shared across sibling Agicore apps.
//!
//! Workflow commands read and write a single .agi file with its
//! companion .agi.layout.json sidecar. Atomic write semantics: tempfile
//! + rename so partial-state on disk is impossible even if the process
//! is killed mid-save.
//!
//! Project commands operate on a directory — list the .agi files in it,
//! create a new empty file, delete an existing file (plus its sidecar),
//! search across files. Sidecar layout files stay invisible to the
//! explorer surface — they are filtered out of the listing.
//!
//! User-config commands manage the shared %APPDATA%/Agicore/ store:
//! api-keys.json, recovery/<id>.json, recent-projects.json. All three
//! follow the same write-atomic pattern.

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
        let modified_at = entry.metadata().as_ref().map(mtime_seconds).unwrap_or(0);
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

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchHit {
    pub file_path: String,
    pub file_name: String,
    pub line_number: u32,
    pub line_text: String,
    /// Byte index of the match within line_text. The renderer uses
    /// this to bold the matched substring rather than recomputing.
    pub match_start: u32,
    pub match_end: u32,
}

const MAX_SEARCH_HITS: usize = 200;

#[tauri::command]
pub fn search_project_files(
    root_path: String,
    query: String,
) -> Result<Vec<SearchHit>, String> {
    let needle = query.trim();
    if needle.is_empty() {
        return Ok(Vec::new());
    }
    let needle_lc = needle.to_lowercase();

    let root = PathBuf::from(&root_path);
    if !root.is_dir() {
        return Err(format!("not a directory: {}", root_path));
    }

    let mut entries: Vec<PathBuf> = Vec::new();
    for entry in fs::read_dir(&root).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let p = entry.path();
        if !p.is_file() {
            continue;
        }
        let name = match p.file_name().and_then(|n| n.to_str()) {
            Some(n) => n,
            None => continue,
        };
        if !name.ends_with(".agi") {
            continue;
        }
        entries.push(p);
    }
    entries.sort();

    let mut hits: Vec<SearchHit> = Vec::new();
    for path in entries {
        let contents = match fs::read_to_string(&path) {
            Ok(c) => c,
            Err(_) => continue,
        };
        let file_name = path
            .file_name()
            .and_then(|n| n.to_str())
            .map(|s| s.to_string())
            .unwrap_or_default();
        let file_path = path.to_string_lossy().into_owned();

        for (idx, line) in contents.lines().enumerate() {
            let line_lc = line.to_lowercase();
            if let Some(pos) = line_lc.find(&needle_lc) {
                hits.push(SearchHit {
                    file_path: file_path.clone(),
                    file_name: file_name.clone(),
                    line_number: (idx + 1) as u32,
                    line_text: line.to_string(),
                    match_start: pos as u32,
                    match_end: (pos + needle.len()) as u32,
                });
                if hits.len() >= MAX_SEARCH_HITS {
                    return Ok(hits);
                }
            }
        }
    }
    Ok(hits)
}

// ============================================================================
// User-config root resolver — %APPDATA%/Agicore on Windows;
// ~/Library/Application Support/Agicore on macOS; $XDG_CONFIG_HOME/Agicore
// or ~/.config/Agicore on Linux.
// ============================================================================

fn user_config_dir() -> Result<PathBuf, String> {
    let base = std::env::var_os("APPDATA")
        .or_else(|| std::env::var_os("XDG_CONFIG_HOME"))
        .map(PathBuf::from)
        .or_else(|| {
            std::env::var_os("HOME").map(|h| {
                let mut p = PathBuf::from(h);
                if cfg!(target_os = "macos") {
                    p.push("Library/Application Support");
                } else {
                    p.push(".config");
                }
                p
            })
        })
        .ok_or_else(|| "could not resolve user config directory".to_string())?;
    Ok(base.join("Agicore"))
}

fn safe_filename(id: &str) -> String {
    id.chars()
        .map(|c| if c.is_ascii_alphanumeric() || c == '_' || c == '-' { c } else { '_' })
        .collect()
}

// ============================================================================
// API key storage — shared with sibling Agicore apps per OQ-4.
// ============================================================================

#[derive(Debug, Serialize, Deserialize, Default)]
pub struct ApiKeys(pub std::collections::BTreeMap<String, String>);

fn api_keys_path() -> Result<PathBuf, String> {
    Ok(user_config_dir()?.join("api-keys.json"))
}

#[tauri::command]
pub fn read_api_keys() -> Result<ApiKeys, String> {
    let path = api_keys_path()?;
    if !path.exists() {
        return Ok(ApiKeys::default());
    }
    let contents = fs::read_to_string(&path).map_err(|e| e.to_string())?;
    let keys: ApiKeys = serde_json::from_str(&contents).unwrap_or_default();
    Ok(keys)
}

#[tauri::command]
pub fn write_api_keys(keys: ApiKeys) -> Result<(), String> {
    let path = api_keys_path()?;
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let json = serde_json::to_string_pretty(&keys).map_err(|e| e.to_string())?;
    write_atomic(&path, json.as_bytes()).map_err(|e| e.to_string())?;
    Ok(())
}

// ============================================================================
// Crash-recovery storage — autosaved drafts at
// %APPDATA%/Agicore/recovery/<id>.json.
// ============================================================================

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RecoveryDraft {
    /// Stable identifier. The renderer derives this from the file path
    /// when known, or uses a per-session id for unsaved workflows.
    pub id: String,
    pub source_path: Option<String>,
    pub agi_source: String,
    pub layout_json: String,
    pub saved_at: i64,
}

fn recovery_dir() -> Result<PathBuf, String> {
    Ok(user_config_dir()?.join("recovery"))
}

#[tauri::command]
pub fn write_recovery(draft: RecoveryDraft) -> Result<(), String> {
    let dir = recovery_dir()?;
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let path = dir.join(format!("{}.json", safe_filename(&draft.id)));
    let json = serde_json::to_string_pretty(&draft).map_err(|e| e.to_string())?;
    write_atomic(&path, json.as_bytes()).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn list_recovery() -> Result<Vec<RecoveryDraft>, String> {
    let dir = recovery_dir()?;
    if !dir.is_dir() {
        return Ok(Vec::new());
    }
    let mut drafts: Vec<RecoveryDraft> = Vec::new();
    for entry in fs::read_dir(&dir).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path();
        if !path.is_file() {
            continue;
        }
        let contents = match fs::read_to_string(&path) {
            Ok(c) => c,
            Err(_) => continue,
        };
        if let Ok(draft) = serde_json::from_str::<RecoveryDraft>(&contents) {
            drafts.push(draft);
        }
    }
    drafts.sort_by(|a, b| b.saved_at.cmp(&a.saved_at));
    Ok(drafts)
}

#[tauri::command]
pub fn drop_recovery(id: String) -> Result<(), String> {
    let dir = recovery_dir()?;
    let path = dir.join(format!("{}.json", safe_filename(&id)));
    if path.exists() {
        let _ = fs::remove_file(&path);
    }
    Ok(())
}

// ============================================================================
// Recent projects — surfaces in the Welcome panel's "Open recent" list.
// MRU-ordered, capped at MAX_RECENT_PROJECTS entries.
// ============================================================================

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct RecentProject {
    pub root_path: String,
    pub name: String,
    pub last_opened_at: i64,
}

const MAX_RECENT_PROJECTS: usize = 8;

fn recent_projects_path() -> Result<PathBuf, String> {
    Ok(user_config_dir()?.join("recent-projects.json"))
}

#[tauri::command]
pub fn read_recent_projects() -> Result<Vec<RecentProject>, String> {
    let path = recent_projects_path()?;
    if !path.exists() {
        return Ok(Vec::new());
    }
    let contents = fs::read_to_string(&path).map_err(|e| e.to_string())?;
    let mut list: Vec<RecentProject> = serde_json::from_str(&contents).unwrap_or_default();
    // Drop entries whose directories no longer exist — old paths shouldn't
    // haunt the Welcome panel forever.
    list.retain(|p| PathBuf::from(&p.root_path).is_dir());
    list.sort_by(|a, b| b.last_opened_at.cmp(&a.last_opened_at));
    list.truncate(MAX_RECENT_PROJECTS);
    Ok(list)
}

#[tauri::command]
pub fn push_recent_project(root_path: String) -> Result<Vec<RecentProject>, String> {
    let p = PathBuf::from(&root_path);
    if !p.is_dir() {
        return Err(format!("not a directory: {}", root_path));
    }
    let name = p
        .file_name()
        .and_then(|n| n.to_str())
        .map(|s| s.to_string())
        .unwrap_or_else(|| root_path.clone());
    let now = chrono::Utc::now().timestamp();

    let mut list: Vec<RecentProject> = read_recent_projects().unwrap_or_default();
    // Remove any existing entry for this path — we'll re-add at the front.
    list.retain(|e| e.root_path != root_path);
    list.insert(
        0,
        RecentProject {
            root_path: root_path.clone(),
            name,
            last_opened_at: now,
        },
    );
    list.truncate(MAX_RECENT_PROJECTS);

    let json = serde_json::to_string_pretty(&list).map_err(|e| e.to_string())?;
    let file_path = recent_projects_path()?;
    if let Some(parent) = file_path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    write_atomic(&file_path, json.as_bytes()).map_err(|e| e.to_string())?;
    Ok(list)
}

#[tauri::command]
pub fn remove_recent_project(root_path: String) -> Result<Vec<RecentProject>, String> {
    let mut list: Vec<RecentProject> = read_recent_projects().unwrap_or_default();
    list.retain(|e| e.root_path != root_path);
    let json = serde_json::to_string_pretty(&list).map_err(|e| e.to_string())?;
    let file_path = recent_projects_path()?;
    if let Some(parent) = file_path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    write_atomic(&file_path, json.as_bytes()).map_err(|e| e.to_string())?;
    Ok(list)
}

// ============================================================================
// Git status — shells out to `git status --porcelain` in the project
// root, returns a map keyed by absolute file path. Gracefully degrades
// when the directory isn't a git repo or git isn't installed.
// ============================================================================

use std::collections::HashMap;
use std::process::Command;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GitStatusReport {
    /// True when the directory is inside a git working tree.
    pub is_repo: bool,
    /// Absolute-path → two-char porcelain status code (e.g. " M", "A ", "??").
    pub statuses: HashMap<String, String>,
    /// Current branch name, or null when detached / not a repo.
    pub branch: Option<String>,
}

#[tauri::command]
pub fn git_status_for_project(root_path: String) -> Result<GitStatusReport, String> {
    let root = PathBuf::from(&root_path);
    if !root.is_dir() {
        return Ok(GitStatusReport { is_repo: false, statuses: HashMap::new(), branch: None });
    }

    // Probe — fast and idiomatic.
    let inside = Command::new("git")
        .arg("rev-parse")
        .arg("--is-inside-work-tree")
        .current_dir(&root)
        .output();
    let is_repo = match inside {
        Ok(out) => out.status.success() && String::from_utf8_lossy(&out.stdout).trim() == "true",
        Err(_) => false,
    };
    if !is_repo {
        return Ok(GitStatusReport { is_repo: false, statuses: HashMap::new(), branch: None });
    }

    // Status — porcelain v1 keeps the line shape stable across git versions.
    let status_out = Command::new("git")
        .arg("status")
        .arg("--porcelain")
        .current_dir(&root)
        .output()
        .map_err(|e| e.to_string())?;
    let mut statuses: HashMap<String, String> = HashMap::new();
    if status_out.status.success() {
        let stdout = String::from_utf8_lossy(&status_out.stdout);
        for line in stdout.lines() {
            // Format: "XY <path>" — XY is two chars, then space, then path.
            if line.len() < 4 {
                continue;
            }
            let code = line[..2].to_string();
            // Skip a single space then the path. Renames look like
            // "R  old -> new" — we take the new path.
            let after = line[3..].trim();
            let rel_path = if let Some(arrow) = after.find(" -> ") {
                &after[arrow + 4..]
            } else {
                after
            };
            // Only track .agi paths — sidecars and unrelated files don't
            // surface in the explorer rail anyway.
            if !rel_path.ends_with(".agi") {
                continue;
            }
            // Resolve to absolute path (root + rel_path).
            let abs = root.join(rel_path);
            statuses.insert(abs.to_string_lossy().into_owned(), code);
        }
    }

    // Branch name — `git rev-parse --abbrev-ref HEAD`.
    let branch_out = Command::new("git")
        .arg("rev-parse")
        .arg("--abbrev-ref")
        .arg("HEAD")
        .current_dir(&root)
        .output();
    let branch = match branch_out {
        Ok(out) if out.status.success() => {
            let s = String::from_utf8_lossy(&out.stdout).trim().to_string();
            if s == "HEAD" { None } else { Some(s) }
        }
        _ => None,
    };

    Ok(GitStatusReport { is_repo: true, statuses, branch })
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
