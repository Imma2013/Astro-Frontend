use std::sync::Mutex;
use tauri::{AppHandle, Emitter, Manager, RunEvent};
use tauri_plugin_shell::process::CommandChild;
use tauri_plugin_shell::ShellExt;
use tauri_plugin_shell::process::CommandEvent;
use sysinfo::System;

#[derive(Clone, serde::Serialize)]
struct HardwareInfo {
    total_memory_mb: u64,
}

#[tauri::command]
fn get_hardware_info() -> HardwareInfo {
    let mut sys = System::new_all();
    sys.refresh_memory();
    HardwareInfo {
        total_memory_mb: sys.total_memory() / 1024 / 1024,
    }
}

struct SidecarState(Mutex<Option<CommandChild>>);

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
async fn start_engine(app: AppHandle, model_path: String, use_gpu: bool) -> Result<(), String> {
    let start_time = std::time::Instant::now();
    
    // Kill existing engine if any
    let state = app.state::<SidecarState>();
    if let Some(old_child) = state.0.lock().unwrap().take() {
        let _ = old_child.kill();
    }

    // Spawn the sidecar
    let sidecar_command = app
        .shell()
        .sidecar("binaries/llama-server")
        .map_err(|e| format!("Binary not found: {}", e))?;

    let mut args = vec![
        "--model".to_string(), model_path,
        "--port".to_string(), "8081".to_string(),
        "--host".to_string(), "127.0.0.1".to_string(),
        "-c".to_string(), "4096".to_string(),
        "--threads".to_string(), "8".to_string(), // Optimal for physical cores
        "--no-mmap".to_string(), 
        "--mlock".to_string(), // Keep model in RAM to prevent swapping
    ];

    if use_gpu {
        args.push("--n-gpu-layers".to_string());
        args.push("99".to_string());
    } else {
        args.push("--n-gpu-layers".to_string());
        args.push("0".to_string());
    }

    let (mut rx, child) = sidecar_command.args(args).spawn()
        .map_err(|e| format!("Spawn failed: {}", e))?;

    // Store the new child
    *state.0.lock().unwrap() = Some(child);

    let duration = start_time.elapsed();
    log::info!("Engine process spawned in {:?}", duration);

    // Monitor for immediate failure (DLL errors, etc)
    let app_clone = app.clone();
    tauri::async_runtime::spawn(async move {
        while let Some(event) = rx.recv().await {
            match event {
                CommandEvent::Terminated(payload) => {
                    if let Some(code) = payload.code {
                        if code != 0 {
                            let _ = app_clone.emit("engine-error", format!("Engine exited with code: {}. This often means a missing DLL or GPU driver issue.", code));
                        }
                    }
                    break;
                }
                CommandEvent::Error(err) => {
                    let _ = app_clone.emit("engine-error", format!("Sidecar Error: {}", err));
                    break;
                }
                _ => {}
            }
        }
    });

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_fs::init())
    .plugin(tauri_plugin_shell::init())
    .invoke_handler(tauri::generate_handler![
        download_model, 
        start_engine, 
        check_engine_health, 
        get_hardware_info
    ])
    .setup(|app| {
      app.manage(SidecarState(Mutex::new(None)));
      
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .build(tauri::generate_context!())
    .expect("error while building tauri application")
    .run(|app_handle, event| match event {
        RunEvent::Exit => {
            let state = app_handle.state::<SidecarState>();
            if let Some(child) = state.0.lock().unwrap().take() {
                let _ = child.kill();
            }
        }
        _ => {}
    });
}
