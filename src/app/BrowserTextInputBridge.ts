import type { TextInputBridge, TextInputBridgeFactory, TextInputBridgeOptions } from "../game/ports/TextInputBridge";

export class BrowserTextInputBridgeFactory implements TextInputBridgeFactory {
  constructor(private readonly mount: HTMLElement) {}

  create(options: TextInputBridgeOptions): TextInputBridge {
    return new BrowserTextInputBridge(this.mount, options);
  }
}

class BrowserTextInputBridge implements TextInputBridge {
  private readonly input: HTMLTextAreaElement;
  private composing = false;

  constructor(
    mount: HTMLElement,
    private readonly options: TextInputBridgeOptions,
  ) {
    this.input = document.createElement("textarea");
    this.input.value = options.initialValue.slice(0, options.maxLength);
    this.input.maxLength = options.maxLength;
    this.input.setAttribute("aria-label", options.ariaLabel);
    this.input.autocapitalize = "off";
    this.input.autocomplete = "off";
    this.input.spellcheck = false;
    Object.assign(this.input.style, {
      position: "fixed",
      left: "0",
      top: "0",
      width: "1px",
      height: "1px",
      opacity: "0",
      pointerEvents: "none",
      resize: "none",
    });
    this.input.addEventListener("input", this.handleInput);
    this.input.addEventListener("keydown", this.handleKeyDown);
    this.input.addEventListener("compositionstart", this.handleCompositionStart);
    this.input.addEventListener("compositionend", this.handleCompositionEnd);
    mount.appendChild(this.input);
  }

  focus(): void {
    this.input.focus({ preventScroll: true });
    this.input.setSelectionRange(this.input.value.length, this.input.value.length);
  }

  setValue(value: string): void {
    this.input.value = value.slice(0, this.options.maxLength);
  }

  destroy(): void {
    this.input.removeEventListener("input", this.handleInput);
    this.input.removeEventListener("keydown", this.handleKeyDown);
    this.input.removeEventListener("compositionstart", this.handleCompositionStart);
    this.input.removeEventListener("compositionend", this.handleCompositionEnd);
    this.input.remove();
  }

  private readonly handleInput = () => {
    this.options.onChange(this.input.value.slice(0, this.options.maxLength));
  };

  private readonly handleKeyDown = (event: KeyboardEvent) => {
    if (event.key !== "Enter" || event.shiftKey || this.composing || event.isComposing) {
      return;
    }
    event.preventDefault();
    this.options.onSubmit();
  };

  private readonly handleCompositionStart = () => {
    this.composing = true;
  };

  private readonly handleCompositionEnd = () => {
    this.composing = false;
  };
}
