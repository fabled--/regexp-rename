use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use regex::Regex;
use tauri::Manager;
use tauri_plugin_window_state::{AppHandleExt, StateFlags, WindowExt};
use unicode_normalization::UnicodeNormalization;

#[derive(Debug, Serialize, Deserialize, Clone, Copy)]
pub struct NormalizationOptions {
    pub space: bool,
    #[serde(rename = "waveDash")]
    pub wave_dash: bool,
    pub dash: bool,
    #[serde(rename = "middleDot")]
    pub middle_dot: bool,
    pub brackets: bool,
    pub colon: bool,
    pub slash: bool,
}

impl Default for NormalizationOptions {
    fn default() -> Self {
        Self {
            space: true,
            wave_dash: true,
            dash: true,
            middle_dot: true,
            brackets: true,
            colon: true,
            slash: true,
        }
    }
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(tag = "type")]
pub enum RenameStep {
    #[serde(rename = "regex")]
    Regex { pattern: String, replacement: String },
    #[serde(rename = "normalize")]
    Normalize,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct RenameResult {
    pub success: bool,
    #[serde(rename = "oldName")]
    pub old_name: String,
    #[serde(rename = "newName")]
    pub new_name: Option<String>,
    pub error: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Group {
    pub id: String,
    pub name: String,
    pub steps: Vec<serde_json::Value>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct RegexDef {
    pub id: String,
    pub name: Option<String>,
    pub pattern: String,
    pub replacement: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub sample: Option<String>,
    #[serde(default)]
    pub tags: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Settings {
    pub groups: Vec<Group>,
    #[serde(rename = "ungroupedSteps")]
    pub ungrouped_steps: Vec<serde_json::Value>,
    #[serde(rename = "activeGroupId")]
    pub active_group_id: Option<String>,
    #[serde(rename = "regexLibrary")]
    pub regex_library: Vec<RegexDef>,
    #[serde(default)]
    pub normalization: NormalizationOptions,
}

fn get_settings_path(app_handle: &tauri::AppHandle) -> PathBuf {
    app_handle
        .path()
        .app_config_dir()
        .expect("failed to get config dir")
        .join("settings.json")
}

mod commands {
    use super::*;

    fn apply_normalization(input: &str, options: NormalizationOptions) -> String {
        let mut s: String = input.nfkc().collect();

        if options.space {
            s = s.replace('\u{3000}', " ");
            while s.contains("  ") {
                s = s.replace("  ", " ");
            }
        }
        if options.wave_dash {
            s = s.replace(['〜', '∼', '～'], "～");
        }
        if options.dash {
            s = s.replace(['‐', '‑', '–', '—', '―', '－'], "-");
        }
        if options.middle_dot {
            s = s.replace(['･', '·', '·', '•'], "・");
        }
        if options.brackets {
            s = s.replace('（', "(").replace('）', ")");
        }
        if options.colon {
            s = s.replace(':', "：");
        }
        if options.slash {
            s = s.replace('/', "／");
        }

        s
    }

    #[tauri::command]
    pub async fn load_settings(app_handle: tauri::AppHandle) -> Result<Settings, String> {
        let path = get_settings_path(&app_handle);
        if !path.exists() {
            return Ok(Settings {
                groups: Vec::new(),
                ungrouped_steps: Vec::new(),
                active_group_id: None,
                regex_library: Vec::new(),
                normalization: NormalizationOptions::default(),
            });
        }
        let content = fs::read_to_string(path).map_err(|e| e.to_string())?;
        serde_json::from_str(&content).map_err(|e| e.to_string())
    }

    #[tauri::command]
    pub async fn save_settings(app_handle: tauri::AppHandle, settings: Settings) -> Result<(), String> {
        let path = get_settings_path(&app_handle);
        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }
        let content = serde_json::to_string_pretty(&settings).map_err(|e| e.to_string())?;
        fs::write(path, content).map_err(|e| e.to_string())
    }

    pub fn apply_rename(
        stem: &str,
        ext: &str,
        steps: &[RenameStep],
        normalization: NormalizationOptions,
    ) -> Result<String, String> {
        let mut current_name = stem.to_string();
        for step in steps {
            match step {
                RenameStep::Normalize => {
                    current_name = apply_normalization(&current_name, normalization);
                }
                RenameStep::Regex { pattern, replacement } => {
                    let re = Regex::new(pattern).map_err(|e| e.to_string())?;
                    current_name = re.replace_all(&current_name, replacement.as_str()).into_owned();
                }
            }
        }

        if ext.is_empty() {
            Ok(current_name)
        } else {
            Ok(format!("{}.{}", current_name, ext))
        }
    }

    #[tauri::command]
    pub async fn execute_rename_files(
        files: Vec<String>,
        steps: Vec<RenameStep>,
        normalization: NormalizationOptions,
    ) -> Vec<RenameResult> {
        let mut results = Vec::new();

        for file_path in files {
            let path = Path::new(&file_path);
            let old_name = match path.file_name() {
                Some(name) => name.to_string_lossy().into_owned(),
                None => {
                    results.push(RenameResult {
                        success: false,
                        old_name: file_path.clone(),
                        new_name: None,
                        error: Some("Invalid file path".to_string()),
                    });
                    continue;
                }
            };

            let parent = path.parent().unwrap_or_else(|| Path::new(""));
            let ext = path.extension().and_then(|s| s.to_str()).unwrap_or("");
            let stem = path.file_stem().and_then(|s| s.to_str()).unwrap_or("");

            match apply_rename(stem, ext, &steps, normalization) {
                Ok(new_file_name) => {
                    if new_file_name == old_name {
                        results.push(RenameResult {
                            success: false,
                            old_name: old_name.clone(),
                            new_name: None,
                            error: Some("Name unchanged".to_string()),
                        });
                        continue;
                    }

                    let new_path = parent.join(&new_file_name);
                    match fs::rename(&path, &new_path) {
                        Ok(_) => {
                            results.push(RenameResult {
                                success: true,
                                old_name: old_name.clone(),
                                new_name: Some(new_file_name),
                                error: None,
                            });
                        }
                        Err(e) => {
                            results.push(RenameResult {
                                success: false,
                                old_name: old_name.clone(),
                                new_name: None,
                                error: Some(e.to_string()),
                            });
                        }
                    }
                }
                Err(e) => {
                    results.push(RenameResult {
                        success: false,
                        old_name: old_name.clone(),
                        new_name: None,
                        error: Some(e),
                    });
                }
            }
        }

        results
    }
}

#[cfg(test)]
mod tests {
    use super::commands::*;
    use crate::RenameStep;
    use crate::NormalizationOptions;

    #[test]
    fn test_rename_logic() {
        let stem = "2023-12-25";
        let ext = "txt";
        let steps = vec![
            RenameStep::Regex {
                pattern: r"(\d{4})-(\d{2})-(\d{2})".to_string(),
                replacement: "$1年$2月$3日".to_string(),
            }
        ];

        let result = apply_rename(stem, ext, &steps, NormalizationOptions::default()).unwrap();
        assert_eq!(result, "2023年12月25日.txt");
    }

    #[test]
    fn test_multiple_renames() {
        let stem = "test-file";
        let ext = "txt";
        let steps = vec![
            RenameStep::Regex {
                pattern: "test".to_string(),
                replacement: "prod".to_string(),
            },
            RenameStep::Regex {
                pattern: "file".to_string(),
                replacement: "data".to_string(),
            }
        ];

        let result = apply_rename(stem, ext, &steps, NormalizationOptions::default()).unwrap();
        assert_eq!(result, "prod-data.txt");
    }

    #[test]
    fn test_normalize_step() {
        let stem = "ＮＨＫ　2025:12/25";
        let ext = "txt";
        let steps = vec![RenameStep::Normalize];

        let result = apply_rename(stem, ext, &steps, NormalizationOptions::default()).unwrap();
        assert_eq!(result, "NHK 2025：12／25.txt");
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            commands::execute_rename_files,
            commands::load_settings,
            commands::save_settings
        ])
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { .. } = event {
                let _ = window.app_handle().save_window_state(StateFlags::all());
            }
        })
        .setup(|_app| {
            #[cfg(desktop)]
            let _ = _app
                .handle()
                .plugin(tauri_plugin_window_state::Builder::default().build());

            #[cfg(desktop)]
            {
                if let Some(window) = _app.get_webview_window("main") {
                    let _ = window.restore_state(StateFlags::all());
                }
            }

            #[cfg(debug_assertions)]
            {
                let window = _app.get_webview_window("main").unwrap();
                window.open_devtools();
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
