#![cfg_attr(not(target_os = "windows"), allow(dead_code))]

use tauri::Manager;

#[derive(Clone, Copy)]
struct InteractionRegion {
    x: f64,
    y: f64,
    width: f64,
    height: f64,
}

static INTERACTION_REGION: std::sync::Mutex<Option<InteractionRegion>> =
    std::sync::Mutex::new(None);

const SHOW_WIDGET_MENU_ID: &str = "show-widget";
const HIDE_WIDGET_MENU_ID: &str = "hide-widget";
const CENTER_WIDGET_MENU_ID: &str = "center-widget";
const QUIT_MENU_ID: &str = "quit";
const TRAY_ICON: tauri::image::Image<'_> = tauri::include_image!("./icons/32x32.png");

pub(crate) fn setup(app: &mut tauri::App, widget: &tauri::WebviewWindow) -> tauri::Result<()> {
    use tauri::{menu::MenuBuilder, tray::TrayIconBuilder, WindowEvent};

    widget.set_always_on_top(true)?;
    widget.set_focusable(false)?;
    prevent_pointer_activation(widget)?;
    start_pointer_passthrough(widget)?;
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

#[tauri::command]
pub fn focus_widget(window: tauri::WebviewWindow) -> Result<(), String> {
    if window.label() != "widget" {
        return Err("focus is only available for the desktop widget".to_owned());
    }
    window.set_focus().map_err(|error| error.to_string())
}

#[tauri::command]
pub fn set_widget_interaction_region(
    window: tauri::WebviewWindow,
    x: f64,
    y: f64,
    width: f64,
    height: f64,
) -> Result<(), String> {
    if window.label() != "widget" {
        return Err("the interaction region is only available for the desktop widget".to_owned());
    }
    if !x.is_finite()
        || !y.is_finite()
        || !width.is_finite()
        || !height.is_finite()
        || width <= 0.0
        || height <= 0.0
    {
        return Err("the interaction region must contain finite positive dimensions".to_owned());
    }

    let mut current_region = INTERACTION_REGION
        .lock()
        .map_err(|_| "the interaction region lock is unavailable".to_owned())?;
    *current_region = Some(InteractionRegion {
        x,
        y,
        width,
        height,
    });
    Ok(())
}

#[cfg(target_os = "windows")]
fn start_pointer_passthrough(widget: &tauri::WebviewWindow) -> tauri::Result<()> {
    use std::{io, thread, time::Duration};
    use windows::Win32::Foundation::HWND;

    widget.set_ignore_cursor_events(true)?;
    let hwnd_value = widget.hwnd()?.0 as isize;
    let widget = widget.clone();
    thread::Builder::new()
        .name("nyang-pointer-passthrough".to_owned())
        .spawn(move || {
            let hwnd = HWND(hwnd_value as _);
            let mut ignored = true;
            loop {
                let region = INTERACTION_REGION
                    .lock()
                    .ok()
                    .and_then(|current_region| *current_region);
                let should_ignore = region
                    .and_then(|region| cursor_is_inside_region(hwnd, region))
                    .is_none_or(|is_inside| !is_inside);

                if should_ignore != ignored
                    && widget.set_ignore_cursor_events(should_ignore).is_ok()
                {
                    ignored = should_ignore;
                }
                thread::sleep(Duration::from_millis(16));
            }
        })
        .map_err(io::Error::other)?;
    Ok(())
}

#[cfg(target_os = "windows")]
fn cursor_is_inside_region(
    hwnd: windows::Win32::Foundation::HWND,
    region: InteractionRegion,
) -> Option<bool> {
    use windows::Win32::{
        Foundation::{POINT, RECT},
        UI::{
            HiDpi::GetDpiForWindow,
            WindowsAndMessaging::{GetCursorPos, GetWindowRect},
        },
    };

    let mut cursor = POINT::default();
    let mut window_rect = RECT::default();
    unsafe { GetCursorPos(&mut cursor) }.ok()?;
    unsafe { GetWindowRect(hwnd, &mut window_rect) }.ok()?;
    let scale = f64::from(unsafe { GetDpiForWindow(hwnd) }) / 96.0;
    let cursor_x = f64::from(cursor.x - window_rect.left) / scale;
    let cursor_y = f64::from(cursor.y - window_rect.top) / scale;
    Some(
        cursor_x >= region.x
            && cursor_x <= region.x + region.width
            && cursor_y >= region.y
            && cursor_y <= region.y + region.height,
    )
}

#[cfg(not(target_os = "windows"))]
fn start_pointer_passthrough(_widget: &tauri::WebviewWindow) -> tauri::Result<()> {
    Ok(())
}

#[cfg(target_os = "windows")]
fn prevent_pointer_activation(widget: &tauri::WebviewWindow) -> tauri::Result<()> {
    use std::io;
    use windows::Win32::{
        Foundation::{GetLastError, SetLastError, WIN32_ERROR},
        UI::WindowsAndMessaging::{
            GetWindowLongPtrW, SetWindowLongPtrW, SetWindowPos, GWL_EXSTYLE, SWP_FRAMECHANGED,
            SWP_NOMOVE, SWP_NOSIZE, SWP_NOZORDER, WS_EX_NOACTIVATE,
        },
    };

    let hwnd = widget.hwnd()?;
    let current_style = unsafe { GetWindowLongPtrW(hwnd, GWL_EXSTYLE) };
    let no_activate_style = current_style | WS_EX_NOACTIVATE.0 as isize;
    if current_style == no_activate_style {
        return Ok(());
    }

    unsafe { SetLastError(WIN32_ERROR(0)) };
    let previous_style = unsafe { SetWindowLongPtrW(hwnd, GWL_EXSTYLE, no_activate_style) };
    let style_error = unsafe { GetLastError() };
    if previous_style == 0 && style_error.0 != 0 {
        return Err(io::Error::from_raw_os_error(style_error.0 as i32).into());
    }

    unsafe {
        SetWindowPos(
            hwnd,
            None,
            0,
            0,
            0,
            0,
            SWP_FRAMECHANGED | SWP_NOMOVE | SWP_NOSIZE | SWP_NOZORDER,
        )
    }
    .map_err(|error| io::Error::other(error))?;
    Ok(())
}

#[cfg(not(target_os = "windows"))]
fn prevent_pointer_activation(_widget: &tauri::WebviewWindow) -> tauri::Result<()> {
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
