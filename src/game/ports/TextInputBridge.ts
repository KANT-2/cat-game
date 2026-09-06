export type TextInputBridgeOptions = {
  initialValue: string;
  maxLength: number;
  ariaLabel: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
};

export interface TextInputBridge {
  /** 브라우저의 한글 조합 입력을 받을 수 있도록 숨은 네이티브 입력에 포커스를 옮긴다. */
  focus(): void;

  /** Canvas에 표시된 값과 네이티브 입력 값을 동기화한다. */
  setValue(value: string): void;

  /** 연결된 DOM 입력과 이벤트를 정리한다. */
  destroy(): void;
}

export interface TextInputBridgeFactory {
  /** 보이는 UI는 Canvas에 유지하면서 키보드·IME 입력만 전달하는 브리지를 만든다. */
  create(options: TextInputBridgeOptions): TextInputBridge;
}
