import { invoke, isTauri } from "@tauri-apps/api/core";

export type DesktopWidgetInteractionRegion = {
  x: number;
  y: number;
  width: number;
  height: number;
};

const INTERACTION_REGION_UPDATE_INTERVAL_MS = 50;
let pendingInteractionRegion: DesktopWidgetInteractionRegion | null = null;
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
 * Windows가 고양이 주변에서만 마우스 입력을 받도록 최신 화면 영역을 전달한다.
 *
 * @param region - 위젯 WebView 왼쪽 위를 원점으로 하는 CSS 픽셀 영역.
 *
 * @remarks 연속 이동 중에는 마지막 좌표만 50ms 간격으로 전송한다. Tauri가 아닌 웹/PWA에서는 no-op이다.
 */
export function updateDesktopWidgetInteractionRegion(region: DesktopWidgetInteractionRegion): void {
  if (!isTauri()) {
    return;
  }
  pendingInteractionRegion = region;
  if (interactionRegionTimer !== null) {
    return;
  }
  interactionRegionTimer = window.setTimeout(flushInteractionRegion, INTERACTION_REGION_UPDATE_INTERVAL_MS);
}

function flushInteractionRegion(): void {
  interactionRegionTimer = null;
  const region = pendingInteractionRegion;
  pendingInteractionRegion = null;
  if (!region) {
    return;
  }
  void invoke("set_widget_interaction_region", region).catch((error: unknown) => {
    console.error("Failed to update the desktop widget interaction region", error);
  });
}
