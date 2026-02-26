use futures_util::StreamExt;
use reqwest::Client;
use std::fs::File;
use std::io::Write;
use std::path::PathBuf;
use tauri::{AppHandle, Emitter, Manager};
use tauri_plugin_shell::ShellExt;
use tauri_plugin_shell::process::CommandEvent;

#[derive(Clone, serde::Serialize)]
struct DownloadProgress {
    downloaded: u64,
    total: u64,
}

#[tauri::command]
async fn download_model(
    app: AppHandle,
    url: String,
    filename: String,
) -> Result<String, String> {
    let app_data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let models_dir = app_data_dir.join("models");

    // Ensure models directory exists
    std::fs::create_dir_all(&models_dir).map_err(|e| e.to_string())?;

    let file_path = models_dir.join(&filename);

    // If it already exists, return success early
    if file_path.exists() {
        return Ok(file_path.to_string_lossy().to_string());
    }

    let client = Client::new();
    let res = client
        .get(&url)
        .send()
        .await
        .map_err(|e| format!("Failed to request model: {}", e))?;

    let total_size = res
        .content_length()
        .ok_or("Failed to get content length from response")?;

    let mut file = File::create(&file_path).map_err(|e| format!("Failed to create file: {}", e))?;
    let mut downloaded: u64 = 0;
    let mut stream = res.bytes_stream();

    while let Some(chunk_result) = stream.next().await {
        let chunk = chunk_result.map_err(|e| format!("Error reading chunk: {}", e))?;
        file.write_all(&chunk)
            .map_err(|e| format!("Error writing chunk to file: {}", e))?;
        downloaded += chunk.len() as u64;

        // Emit progress event to the frontend
        let _ = app.emit(
            "download-progress",
            DownloadProgress {
                downloaded,
                total: total_size,
            },
        );
    }

    Ok(file_path.to_string_lossy().to_string())
}

#[tauri::command]
async fn check_engine_health() -> Result<String, String> {
    let client = Client::new();
    let res = client
        .get("http://127.0.0.1:8081/health")
        .send()
        .await
        .map_err(|e| format!("Engine not responding: {}", e))?;

    let body = res
        .text()
        .await
        .map_err(|e| format!("Failed to read health response: {}", e))?;

    Ok(body)
}

#[tauri::command]
async fn start_engine(app: AppHandle, model_path: String) -> Result<(), String> {
    // Spawn the sidecar
    let sidecar_command = app
        .shell()
        .sidecar("llama-server")
        .map_err(|e| format!("Failed to create sidecar command: {}", e))?;

    // High-performance arguments for llama-server
    // -ngl 99: Offload all layers to GPU if possible
    // -t 16: Use 16 threads for processing
    let (_rx, _child) = sidecar_command
        .args([
            "--model", &model_path, 
            "--port", "8081", 
            "--host", "127.0.0.1", 
            "-c", "4096",
            "--n-gpu-layers", "99",
            "--threads", "16"
        ])
        .spawn()
        .map_err(|e| format!("Failed to spawn sidecar: {}", e))?;

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_fs::init())
    .plugin(tauri_plugin_shell::init())
    .invoke_handler(tauri::generate_handler![download_model, start_engine, check_engine_health])
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
