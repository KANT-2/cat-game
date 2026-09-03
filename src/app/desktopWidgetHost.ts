import { invoke, isTauri } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

export type DesktopWidgetInteractionRegion = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type DesktopWidgetCursorPosition = {
  x: number;
  y: number;
};

const INTERACTION_REGION_UPDATE_INTERVAL_MS = 50;
let pendingInteractionRegions: DesktopWidgetInteractionRegion[] | null = null;
let interactionRegionTimer: number | null = null;

/**
 * 고양이 포인터 입력으로 데스크톱 위젯 창의 포커스를 요청한다.
 *
 * @returns Tauri 호스트가 아니면 아무 작업도 하지 않으며, 호스트 명령이 끝나면 완료되는 Promise다.
 *
 * @remarks 일반 웹/PWA에서는 안전한 no-op이다. 호출 실패는 상위 조립 코드가 개발자 로그로 처리한다.
 */
export async function focusDesktopWidget(): Promise<void> {
  if (!isTauri()) {
    return;
  }
  await invoke("focus_widget");
}

/**
 * Windows가 각 고양이 주변에서만 마우스 입력을 받도록 최신 화면 영역들을 전달한다.
 *
 * @param regions - 위젯 WebView 왼쪽 위를 원점으로 하는 고양이별 CSS 픽셀 영역.
 *
 * @remarks 연속 이동 중에는 마지막 좌표만 50ms 간격으로 전송한다. Tauri가 아닌 웹/PWA에서는 no-op이다.
 */
export function updateDesktopWidgetInteractionRegions(regions: DesktopWidgetInteractionRegion[]): void {
  if (!isTauri()) {
    return;
  }
  pendingInteractionRegions = regions;
  if (interactionRegionTimer !== null) {
    return;
  }
  interactionRegionTimer = window.setTimeout(flushInteractionRegion, INTERACTION_REGION_UPDATE_INTERVAL_MS);
}

/**
 * 고양이를 누르는 동안 네이티브 창의 포인터 통과 전환을 잠근다.
 *
 * @param locked - `true`면 커서가 고양이 영역을 벗어나도 버튼을 놓을 때까지 WebView 입력을 유지한다.
 * @remarks 드래그가 끝나거나 취소될 때 반드시 `false`를 전달해야 한다. Tauri가 아니면 no-op이다.
 */
export async function setDesktopWidgetInputLocked(locked: boolean): Promise<void> {
  if (!isTauri()) {
    return;
  }
  await invoke("set_widget_input_locked", { locked });
}

/**
 * Windows 전역 커서의 위젯 상대 위치 변경을 구독한다.
 *
 * @param onMove - WebView 왼쪽 위 기준 CSS 픽셀 좌표를 받을 콜백.
 * @returns 등록된 이벤트 구독을 해제하는 함수. Tauri가 아니면 안전한 no-op을 반환한다.
 * @remarks 네이티브 호스트가 실제 커서 픽셀이 달라질 때만 이벤트를 보내므로 프레임별 invoke를 만들지 않는다.
 */
export async function listenDesktopWidgetCursor(
  onMove: (position: DesktopWidgetCursorPosition) => void,
): Promise<() => void> {
  if (!isTauri()) {
    return () => {};
  }
  return listen<DesktopWidgetCursorPosition>("widget-cursor-moved", (event) => {
    onMove(event.payload);
  });
}

function flushInteractionRegion(): void {
  interactionRegionTimer = null;
  const regions = pendingInteractionRegions;
  pendingInteractionRegions = null;
  if (!regions) {
    return;
  }
  void invoke("set_widget_interaction_regions", { regions }).catch((error: unknown) => {
    console.error("Failed to update the desktop widget interaction regions", error);
  });
}
