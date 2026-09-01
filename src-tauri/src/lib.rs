use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let widget = app
                .get_webview_window("widget")
                .expect("the desktop widget window must exist");
            widget.set_always_on_top(true)?;
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("failed to run the desktop widget host");
}
