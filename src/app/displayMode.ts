export type AppDisplayMode = "desktop-widget" | "game";

/**
 * 앱 URL에서 일반 게임과 데스크톱 위젯 표시 모드를 구분한다.
 *
 * @param search - 선행 물음표를 포함할 수 있는 URL 검색 문자열.
 * @returns `display=desktop-widget`일 때만 데스크톱 위젯 모드이며 그 외에는 일반 게임 모드다.
 *
 * @remarks 알 수 없는 값은 일반 게임으로 처리해 웹/PWA 진입 경로가 실수로 축소 UI를 표시하지 않게 한다.
 */
export function resolveAppDisplayMode(search: string): AppDisplayMode {
  const parameters = new URLSearchParams(search);
  return parameters.get("display") === "desktop-widget" ? "desktop-widget" : "game";
}
