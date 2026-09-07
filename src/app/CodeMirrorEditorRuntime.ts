import { indentWithTab } from "@codemirror/commands";
import { python } from "@codemirror/lang-python";
import { sql } from "@codemirror/lang-sql";
import { EditorSelection, EditorState } from "@codemirror/state";
import { oneDark } from "@codemirror/theme-one-dark";
import { keymap } from "@codemirror/view";
import { basicSetup, EditorView } from "codemirror";
import type {
  CodeEditorOverlay,
  CodeEditorOverlayBounds,
  CodeEditorOverlayOptions,
} from "../game/ports/CodeEditorOverlay";

const MAX_EDITOR_CHARACTERS = 8_000;

export class CodeMirrorEditorRuntime implements CodeEditorOverlay {
  private readonly root: HTMLDivElement;
  private readonly view: EditorView;
  private visible = true;
  private positioned = false;

  constructor(mount: HTMLElement, options: CodeEditorOverlayOptions) {
    this.root = document.createElement("div");
    this.root.className = "nyang-code-editor-overlay";
    this.root.dataset.language = options.language;
    this.root.style.visibility = "hidden";

    const editorHost = document.createElement("div");
    editorHost.className = "nyang-code-editor-host";
    this.root.append(editorHost);
    mount.append(this.root);

    const language = options.language === "sql" ? sql() : python();
    const characterLimit = EditorState.changeFilter.of((transaction) => {
      return transaction.newDoc.length <= MAX_EDITOR_CHARACTERS || !transaction.docChanged;
    });
    this.view = new EditorView({
      parent: editorHost,
      doc: options.initialValue.slice(0, MAX_EDITOR_CHARACTERS),
      extensions: [
        basicSetup,
        language,
        oneDark,
        keymap.of([indentWithTab]),
        EditorView.lineWrapping,
        characterLimit,
        EditorView.updateListener.of((update) => {
          if (update.focusChanged) {
            options.onFocusChange(update.view.hasFocus);
          }
        }),
      ],
    });
    this.view.contentDOM.setAttribute("aria-label", options.ariaLabel);
    this.view.contentDOM.setAttribute("spellcheck", "false");
  }

  getValue(): string {
    return this.view.state.doc.toString();
  }

  setValue(value: string): void {
    const nextValue = value.slice(0, MAX_EDITOR_CHARACTERS);
    this.view.dispatch({
      changes: { from: 0, to: this.view.state.doc.length, insert: nextValue },
      selection: EditorSelection.cursor(nextValue.length),
    });
  }

  append(value: string): void {
    const selection = this.view.state.selection.main;
    const availableLength = MAX_EDITOR_CHARACTERS - (this.view.state.doc.length - (selection.to - selection.from));
    const insert = value.slice(0, Math.max(0, availableLength));
    this.view.dispatch({
      changes: { from: selection.from, to: selection.to, insert },
      selection: EditorSelection.cursor(selection.from + insert.length),
    });
    this.focus();
  }

  setBounds(bounds: CodeEditorOverlayBounds): void {
    this.root.style.left = `${bounds.left}px`;
    this.root.style.top = `${bounds.top}px`;
    this.root.style.width = `${bounds.width}px`;
    this.root.style.height = `${bounds.height}px`;
    this.root.style.setProperty("--nyang-editor-scale", String(bounds.scale));
    this.positioned = true;
    this.updateVisibility();
    this.view.requestMeasure();
  }

  setVisible(visible: boolean): void {
    this.visible = visible;
    this.updateVisibility();
  }

  focus(): void {
    this.view.focus();
  }

  destroy(): void {
    this.view.destroy();
    this.root.remove();
  }

  private updateVisibility(): void {
    this.root.style.visibility = this.visible && this.positioned ? "visible" : "hidden";
    this.root.style.pointerEvents = this.visible ? "auto" : "none";
  }
}
