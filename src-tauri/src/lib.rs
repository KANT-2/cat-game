mod windows_widget;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|_app| {
            #[cfg(target_os = "windows")]
            {
                use tauri::Manager;

                let widget = _app
                    .get_webview_window("widget")
                    .expect("the desktop widget window must exist");
                windows_widget::setup(_app, &widget)?;
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("failed to run the desktop widget host");
}
