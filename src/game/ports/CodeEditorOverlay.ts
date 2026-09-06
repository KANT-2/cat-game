export type CodeEditorLanguage = "python" | "sql";

export type CodeEditorOverlayBounds = {
  left: number;
  top: number;
  width: number;
  height: number;
  scale: number;
};

export type CodeEditorOverlayOptions = {
  language: CodeEditorLanguage;
  signature: string;
  initialValue: string;
  ariaLabel: string;
  onFocusChange: (focused: boolean) => void;
  onLoadError: () => void;
};

export interface CodeEditorOverlay {
  /** 현재 편집 중인 함수 본문 또는 SQL 답안을 반환한다. */
  getValue(): string;

  /** 기존 내용을 새 값으로 교체하고 커서를 문서 끝으로 이동한다. */
  setValue(value: string): void;

  /** 현재 선택 영역에 텍스트를 삽입하고 편집기로 포커스를 옮긴다. */
  append(value: string): void;

  /** Canvas 논리 좌표를 화면 픽셀로 변환한 영역에 편집기를 맞춘다. */
  setBounds(bounds: CodeEditorOverlayBounds): void;

  /** Canvas 피드백 창이 편집기 위를 덮을 때 DOM 편집기의 표시 상태를 전환한다. */
  setVisible(visible: boolean): void;

  /** 키보드 입력을 받을 수 있도록 편집기로 포커스를 옮긴다. */
  focus(): void;

  /** 편집기 인스턴스와 연결된 DOM 요소 및 이벤트를 정리한다. */
  destroy(): void;
}

export interface CodeEditorOverlayFactory {
  /**
   * 학습 화면의 코드 입력을 담당할 편집기를 생성한다.
   *
   * @remarks 반환된 편집기는 화면 전환 시 호출자가 반드시 `destroy()`해야 한다.
   */
  create(options: CodeEditorOverlayOptions): CodeEditorOverlay;
}
