use crate::db::DbPool;
use crate::commands::folder_item::{FolderItem, CreateFolderItemInput, create_folder_item};
use std::path::Path;

fn strip_html(s: &str) -> String {
    let mut out = String::with_capacity(s.len());
    let mut in_tag = false;
    for ch in s.chars() {
        match ch {
            '<' => in_tag = true,
            '>' => in_tag = false,
            _ if !in_tag => out.push(ch),
            _ => {}
        }
    }
    // decode common entities
    out.replace("&amp;", "&")
       .replace("&lt;", "<")
       .replace("&gt;", ">")
       .replace("&nbsp;", " ")
       .replace("&quot;", "\"")
       .replace("&#39;", "'")
       .replace("&apos;", "'")
}

fn epub_to_text(file_path: &str) -> Result<String, String> {
    let mut doc = epub::doc::EpubDoc::new(file_path).map_err(|e| e.to_string())?;
    let mut parts: Vec<String> = Vec::new();

    loop {
        if let Some((content, mime)) = doc.get_current_str() {
            if mime.contains("html") || mime.contains("xhtml") || mime.contains("xml") {
                let text = strip_html(&content);
                let trimmed = text.split_whitespace().collect::<Vec<_>>().join(" ");
                if !trimmed.is_empty() {
                    parts.push(trimmed);
                }
            }
        }
        if !doc.go_next() {
            break;
        }
    }

    Ok(parts.join("\n\n"))
}

fn estimate_tokens(text: &str) -> i64 {
    (text.len() / 4).max(1) as i64
}

#[tauri::command]
pub fn upload_file_to_folder(
    db: tauri::State<'_, DbPool>,
    folder_id: String,
    file_path: String,
) -> Result<FolderItem, String> {
    let path = Path::new(&file_path);
    let ext = path.extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_lowercase();
    let filename = path.file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("unknown")
        .to_string();

    let content = match ext.as_str() {
        "txt" | "md" | "markdown" | "rst" | "csv" => {
            std::fs::read_to_string(&file_path)
                .map_err(|e| format!("Failed to read file: {}", e))?
        }
        "epub" => {
            epub_to_text(&file_path)?
        }
        other => {
            return Err(format!("Unsupported file type: .{other}. Supported: .txt, .md, .epub"));
        }
    };

    if content.trim().is_empty() {
        return Err("File appears to be empty or could not be parsed.".into());
    }

    let tokens = estimate_tokens(&content);
    let source_type = match ext.as_str() {
        "epub" => "epub",
        "md" | "markdown" => "markdown",
        _ => "text",
    };

    let input = CreateFolderItemInput {
        content,
        tokens,
        item_type: Some("file-upload".to_string()),
        filename: Some(filename),
        source_type: Some(source_type.to_string()),
        folder_id: folder_id.clone(),
    };

    let item = create_folder_item(db.clone(), input)?;

    // Update folder total_tokens
    {
        let conn = db.lock().map_err(|e| e.to_string())?;
        let now = chrono::Utc::now().to_rfc3339();
        conn.execute(
            "UPDATE folders SET total_tokens = total_tokens + ?, updated_at = ? WHERE id = ?",
            rusqlite::params![tokens, now, folder_id],
        ).ok();
    }

    Ok(item)
}
