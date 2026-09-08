import type {
  CodeEditorOverlay,
  CodeEditorOverlayBounds,
  CodeEditorOverlayFactory,
  CodeEditorOverlayOptions,
} from "../game/ports/CodeEditorOverlay";

const MAX_EDITOR_CHARACTERS = 8_000;

/** CodeMirror를 코드 과제를 열 때만 불러오고 DOM 수명주기를 앱 계층에 격리한다. */
export class CodeMirrorEditorOverlayFactory implements CodeEditorOverlayFactory {
  private readonly mount: HTMLElement;

  constructor(mount: HTMLElement) {
    this.mount = mount;
  }

  create(options: CodeEditorOverlayOptions): CodeEditorOverlay {
    return new LazyCodeMirrorEditorOverlay(this.mount, options);
  }
}

class LazyCodeMirrorEditorOverlay implements CodeEditorOverlay {
  private readonly mount: HTMLElement;
  private readonly options: CodeEditorOverlayOptions;
  private runtime: CodeEditorOverlay | null = null;
  private pendingValue: string;
  private bounds: CodeEditorOverlayBounds | null = null;
  private visible = true;
  private focusRequested = false;
  private destroyed = false;

  constructor(mount: HTMLElement, options: CodeEditorOverlayOptions) {
    this.mount = mount;
    this.options = options;
    this.pendingValue = options.initialValue.slice(0, MAX_EDITOR_CHARACTERS);
    void this.loadRuntime();
  }

  getValue(): string {
    return this.runtime?.getValue() ?? this.pendingValue;
  }

  setValue(value: string): void {
    this.pendingValue = value.slice(0, MAX_EDITOR_CHARACTERS);
    this.runtime?.setValue(this.pendingValue);
  }

  append(value: string): void {
    if (this.runtime) {
      this.runtime.append(value);
      return;
    }
    this.pendingValue = `${this.pendingValue}${value}`.slice(0, MAX_EDITOR_CHARACTERS);
    this.focusRequested = true;
  }

  setBounds(bounds: CodeEditorOverlayBounds): void {
    this.bounds = bounds;
    this.runtime?.setBounds(bounds);
  }

  setVisible(visible: boolean): void {
    this.visible = visible;
    this.runtime?.setVisible(visible);
  }

  focus(): void {
    this.focusRequested = true;
    this.runtime?.focus();
  }

  destroy(): void {
    this.destroyed = true;
    this.runtime?.destroy();
    this.runtime = null;
  }

  private async loadRuntime(): Promise<void> {
    let CodeMirrorEditorRuntime: typeof import("./CodeMirrorEditorRuntime").CodeMirrorEditorRuntime;
    try {
      ({ CodeMirrorEditorRuntime } = await import("./CodeMirrorEditorRuntime"));
    } catch (error) {
      console.error("CodeMirror editor chunk could not be loaded", error);
      if (!this.destroyed) {
        this.options.onLoadError();
      }
      return;
    }
    if (this.destroyed) {
      return;
    }
    const runtime = new CodeMirrorEditorRuntime(this.mount, {
      ...this.options,
      initialValue: this.pendingValue,
    });
    this.runtime = runtime;
    if (this.bounds) {
      runtime.setBounds(this.bounds);
    }
    runtime.setVisible(this.visible);
    if (this.focusRequested) {
      runtime.focus();
    }
  }
}
