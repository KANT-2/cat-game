#![cfg_attr(not(target_os = "windows"), allow(dead_code))]

use tauri::Manager;

const SHOW_WIDGET_MENU_ID: &str = "show-widget";
const HIDE_WIDGET_MENU_ID: &str = "hide-widget";
const CENTER_WIDGET_MENU_ID: &str = "center-widget";
const QUIT_MENU_ID: &str = "quit";
const TRAY_ICON: tauri::image::Image<'_> = tauri::include_image!("./icons/32x32.png");

pub(crate) fn setup(app: &mut tauri::App, widget: &tauri::WebviewWindow) -> tauri::Result<()> {
    use tauri::{menu::MenuBuilder, tray::TrayIconBuilder, WindowEvent};

    widget.set_always_on_top(true)?;
    let widget_for_close = widget.clone();
    widget.on_window_event(move |event| {
        if let WindowEvent::CloseRequested { api, .. } = event {
            api.prevent_close();
            let _ = widget_for_close.hide();
        }
    });

    let menu = MenuBuilder::new(app)
        .text(SHOW_WIDGET_MENU_ID, "냥이 보이기")
        .text(HIDE_WIDGET_MENU_ID, "냥이 숨기기")
        .text(CENTER_WIDGET_MENU_ID, "화면 가운데로 이동")
        .separator()
        .text(QUIT_MENU_ID, "{ 냥 } 종료")
        .build()?;

    let tray = TrayIconBuilder::with_id("nyang-tray")
        .tooltip("{ 냥 }")
        .icon(TRAY_ICON)
        .menu(&menu)
        .on_menu_event(|app, event| match event.id().as_ref() {
            SHOW_WIDGET_MENU_ID => show_widget(app),
            HIDE_WIDGET_MENU_ID => hide_widget(app),
            CENTER_WIDGET_MENU_ID => center_widget(app),
            QUIT_MENU_ID => app.exit(0),
            _ => {}
        });
    tray.build(app)?;
    Ok(())
}

fn show_widget(app: &tauri::AppHandle) {
    let Some(widget) = app.get_webview_window("widget") else {
        return;
    };
    let _ = widget.show();
    let _ = widget.unminimize();
    let _ = widget.set_focus();
}

fn hide_widget(app: &tauri::AppHandle) {
    if let Some(widget) = app.get_webview_window("widget") {
        let _ = widget.hide();
    }
}

fn center_widget(app: &tauri::AppHandle) {
    let Some(widget) = app.get_webview_window("widget") else {
        return;
    };
    let _ = widget.center();
    let _ = widget.show();
    let _ = widget.set_focus();
}
