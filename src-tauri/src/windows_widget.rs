#![cfg_attr(not(target_os = "windows"), allow(dead_code))]

use std::sync::atomic::{AtomicBool, Ordering};
use tauri::Manager;

#[derive(Clone, Copy, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct InteractionRegion {
    x: f64,
    y: f64,
    width: f64,
    height: f64,
}

#[derive(Clone, Copy, PartialEq, serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct CursorPosition {
    x: f64,
    y: f64,
}

static INTERACTION_REGIONS: std::sync::Mutex<Vec<InteractionRegion>> =
    std::sync::Mutex::new(Vec::new());
static INPUT_LOCKED: AtomicBool = AtomicBool::new(false);

const SHOW_WIDGET_MENU_ID: &str = "show-widget";
const HIDE_WIDGET_MENU_ID: &str = "hide-widget";
const CENTER_WIDGET_MENU_ID: &str = "center-widget";
const QUIT_MENU_ID: &str = "quit";
const TRAY_ICON: tauri::image::Image<'_> = tauri::include_image!("./icons/32x32.png");

pub(crate) fn setup(app: &mut tauri::App, widget: &tauri::WebviewWindow) -> tauri::Result<()> {
    use tauri::{menu::MenuBuilder, tray::TrayIconBuilder, WindowEvent};

    cover_primary_monitor(widget)?;
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
pub fn set_widget_interaction_regions(
    window: tauri::WebviewWindow,
    regions: Vec<InteractionRegion>,
) -> Result<(), String> {
    if window.label() != "widget" {
        return Err("interaction regions are only available for the desktop widget".to_owned());
    }
    if regions.iter().any(|region| {
        !region.x.is_finite()
            || !region.y.is_finite()
            || !region.width.is_finite()
            || !region.height.is_finite()
            || region.width <= 0.0
            || region.height <= 0.0
    }) {
        return Err("interaction regions must contain finite positive dimensions".to_owned());
    }

    let mut current_regions = INTERACTION_REGIONS
        .lock()
        .map_err(|_| "the interaction region lock is unavailable".to_owned())?;
    *current_regions = regions;
    Ok(())
}

#[tauri::command]
pub fn set_widget_input_locked(
    window: tauri::WebviewWindow,
    locked: bool,
) -> Result<(), String> {
    if window.label() != "widget" {
        return Err("input locking is only available for the desktop widget".to_owned());
    }
    INPUT_LOCKED.store(locked, Ordering::Relaxed);
    Ok(())
}

#[cfg(target_os = "windows")]
fn start_pointer_passthrough(widget: &tauri::WebviewWindow) -> tauri::Result<()> {
    use std::{io, thread, time::Duration};
    use tauri::Emitter;
    use windows::Win32::Foundation::HWND;

    widget.set_ignore_cursor_events(true)?;
    let hwnd_value = widget.hwnd()?.0 as isize;
    let widget = widget.clone();
    thread::Builder::new()
        .name("nyang-pointer-passthrough".to_owned())
        .spawn(move || {
            let hwnd = HWND(hwnd_value as _);
            let mut ignored = true;
            let mut last_cursor_position = None;
            loop {
                let cursor_position = cursor_position_in_window(hwnd);
                if cursor_position != last_cursor_position {
                    if let Some(position) = cursor_position {
                        let _ = widget.emit("widget-cursor-moved", position);
                    }
                    last_cursor_position = cursor_position;
                }
                let regions = INTERACTION_REGIONS
                    .lock()
                    .ok()
                    .map(|current_regions| current_regions.clone())
                    .unwrap_or_default();
                let should_ignore = should_ignore_pointer(
                    cursor_position,
                    &regions,
                    INPUT_LOCKED.load(Ordering::Relaxed),
                );

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

fn should_ignore_pointer(
    cursor: Option<CursorPosition>,
    regions: &[InteractionRegion],
    input_locked: bool,
) -> bool {
    !input_locked && cursor.is_none_or(|position| !cursor_is_inside_regions(position, regions))
}

fn cursor_is_inside_regions(
    cursor: CursorPosition,
    regions: &[InteractionRegion],
) -> bool {
    regions.iter().any(|region| {
        cursor.x >= region.x
            && cursor.x <= region.x + region.width
            && cursor.y >= region.y
            && cursor.y <= region.y + region.height
    })
}

#[cfg(target_os = "windows")]
fn cursor_position_in_window(
    hwnd: windows::Win32::Foundation::HWND,
) -> Option<CursorPosition> {
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
    Some(CursorPosition {
        x: cursor_x,
        y: cursor_y,
    })
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
    let _ = cover_primary_monitor(&widget);
    let _ = widget.show();
    let _ = widget.unminimize();
    let _ = widget.set_focus();
}

fn hide_widget(app: &tauri::AppHandle) {
    if let Some(widget) = app.get_webview_window("widget") {
        INPUT_LOCKED.store(false, Ordering::Relaxed);
        let _ = widget.hide();
    }
}

fn center_widget(app: &tauri::AppHandle) {
    let Some(widget) = app.get_webview_window("widget") else {
        return;
    };
    let _ = cover_primary_monitor(&widget);
    let _ = widget.show();
    let _ = widget.set_focus();
}

fn cover_primary_monitor(widget: &tauri::WebviewWindow) -> tauri::Result<()> {
    let Some(monitor) = widget.primary_monitor()? else {
        return Ok(());
    };
    widget.set_position(*monitor.position())?;
    widget.set_size(*monitor.size())?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::{should_ignore_pointer, CursorPosition, InteractionRegion};

    const CAT_REGION: InteractionRegion = InteractionRegion {
        x: 100.0,
        y: 200.0,
        width: 150.0,
        height: 120.0,
    };

    #[test]
    fn pointer_outside_cat_passes_through() {
        let cursor = Some(CursorPosition { x: 40.0, y: 80.0 });
        assert!(should_ignore_pointer(cursor, &[CAT_REGION], false));
    }

    #[test]
    fn pointer_inside_cat_is_interactive() {
        let cursor = Some(CursorPosition { x: 160.0, y: 250.0 });
        assert!(!should_ignore_pointer(cursor, &[CAT_REGION], false));
    }

    #[test]
    fn drag_lock_keeps_input_when_pointer_leaves_cat() {
        let cursor = Some(CursorPosition { x: 40.0, y: 80.0 });
        assert!(!should_ignore_pointer(cursor, &[CAT_REGION], true));
    }
}
