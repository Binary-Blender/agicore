use tauri::Emitter;
use tokio::io::AsyncBufReadExt;
use tokio::process::Command;

#[derive(serde::Serialize, Clone)]
struct ShellLine {
    stream: String,
    text: String,
}

#[tauri::command]
pub async fn shell_run(
    app: tauri::AppHandle,
    command: String,
    cwd: Option<String>,
) -> Result<i32, String> {
    #[cfg(target_os = "windows")]
    let mut cmd = {
        let mut c = Command::new("cmd");
        c.args(["/C", &command]);
        c
    };
    #[cfg(not(target_os = "windows"))]
    let mut cmd = {
        let mut c = Command::new("sh");
        c.args(["-c", &command]);
        c
    };

    cmd.stdout(std::process::Stdio::piped());
    cmd.stderr(std::process::Stdio::piped());

    if let Some(ref dir) = cwd {
        cmd.current_dir(dir);
    }

    let mut child = cmd.spawn().map_err(|e| e.to_string())?;

    let stdout = child.stdout.take().ok_or("no stdout")?;
    let stderr = child.stderr.take().ok_or("no stderr")?;

    let app_out = app.clone();
    let stdout_task = tokio::spawn(async move {
        let mut lines = tokio::io::BufReader::new(stdout).lines();
        while let Ok(Some(line)) = lines.next_line().await {
            let _ = app_out.emit("shell-line", ShellLine { stream: "stdout".into(), text: line });
        }
    });

    let app_err = app.clone();
    let stderr_task = tokio::spawn(async move {
        let mut lines = tokio::io::BufReader::new(stderr).lines();
        while let Ok(Some(line)) = lines.next_line().await {
            let _ = app_err.emit("shell-line", ShellLine { stream: "stderr".into(), text: line });
        }
    });

    let status = child.wait().await.map_err(|e| e.to_string())?;
    let _ = stdout_task.await;
    let _ = stderr_task.await;

    Ok(status.code().unwrap_or(-1))
}

#[tauri::command]
pub fn shell_get_home() -> String {
    dirs::home_dir()
        .map(|p| p.to_string_lossy().into_owned())
        .unwrap_or_else(|| ".".to_string())
}
