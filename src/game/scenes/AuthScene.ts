import { Container, Graphics, Rectangle, Sprite, Text, type Texture } from "pixi.js";
import { type MessageId, message } from "../../content/messages";
import { CanvasButton } from "../components/CanvasButton";
import { textStyle } from "../config";

const CARD_WIDTH = 620;
const CARD_HEIGHT = 690;

export type AuthMode = "login" | "register";

export type AuthSubmitResult = { ok: true } | { ok: false; messageId: MessageId };

export type AuthSceneOptions = {
  background: Texture;
  logo: Texture;
  onSubmit: (mode: AuthMode, email: string, password: string) => Promise<AuthSubmitResult>;
};

/** 운영 백엔드의 쿠키 세션을 시작하는 Canvas 전용 로그인·가입 화면이다. */
export class AuthScene extends Container {
  private readonly background: Sprite;
  private readonly shade = new Graphics();
  private readonly content = new Container();
  private readonly card = new Graphics();
  private readonly logo: Sprite;
  private readonly title = new Text({ text: "", style: textStyle(30, 0x3d2b22, "800") });
  private readonly subtitle = new Text({
    text: "",
    style: { ...textStyle(16, 0x6d5849, "600"), align: "center", lineHeight: 24 },
  });
  private readonly email = new CanvasAuthField({
    label: message("auth.emailLabel"),
    placeholder: message("auth.emailPlaceholder"),
    maxLength: 320,
  });
  private readonly password = new CanvasAuthField({
    label: message("auth.passwordLabel"),
    placeholder: message("auth.passwordPlaceholder"),
    maxLength: 128,
    secret: true,
  });
  private readonly loginTab: CanvasButton;
  private readonly registerTab: CanvasButton;
  private readonly submitButton: CanvasButton;
  private readonly status = new Text({
    text: "",
    style: { ...textStyle(15, 0x8c3b2d, "700"), align: "center", wordWrap: true, wordWrapWidth: 500 },
  });
  private readonly helper = new Text({
    text: message("auth.sessionNotice"),
    style: { ...textStyle(13, 0x756456, "600"), align: "center", wordWrap: true, wordWrapWidth: 500 },
  });
  private mode: AuthMode = "login";
  private submitting = false;
  private screenWidth = 1600;
  private screenHeight = 900;
  private readonly keyHandler = (event: KeyboardEvent): void => this.handleKey(event);

  constructor(private readonly options: AuthSceneOptions) {
    super({ label: "auth-scene" });
    this.background = new Sprite(options.background);
    this.background.anchor.set(0.5);
    this.logo = new Sprite(options.logo);
    this.logo.anchor.set(0.5);
    this.logo.width = 240;
    this.logo.height = (240 * options.logo.height) / options.logo.width;

    this.title.anchor.set(0.5);
    this.subtitle.anchor.set(0.5);
    this.status.anchor.set(0.5);
    this.helper.anchor.set(0.5);
    this.loginTab = new CanvasButton({
      label: message("auth.loginTab"),
      width: 184,
      height: 48,
      color: 0xffc875,
      onPress: () => this.setMode("login"),
    });
    this.registerTab = new CanvasButton({
      label: message("auth.registerTab"),
      width: 184,
      height: 48,
      color: 0xffe2b5,
      onPress: () => this.setMode("register"),
    });
    this.submitButton = new CanvasButton({
      label: message("auth.loginAction"),
      width: 360,
      height: 58,
      color: 0xf4b85f,
      fontSize: 19,
      onPress: () => void this.submit(),
    });

    this.content.addChild(
      this.card,
      this.logo,
      this.title,
      this.subtitle,
      this.loginTab,
      this.registerTab,
      this.email,
      this.password,
      this.submitButton,
      this.status,
      this.helper,
    );
    this.addChild(this.background, this.shade, this.content);
    this.hitArea = new Rectangle(0, 0, this.screenWidth, this.screenHeight);
    this.eventMode = "static";
    this.on("pointertap", () => this.focusField(null));
    this.email.onFocus = () => this.focusField(this.email);
    this.password.onFocus = () => this.focusField(this.password);
    window.addEventListener("keydown", this.keyHandler);
    this.drawCard();
    this.positionContent();
    this.setMode("login");
  }

  override destroy(options?: Parameters<Container["destroy"]>[0]): void {
    window.removeEventListener("keydown", this.keyHandler);
    super.destroy(options);
  }

  /** 배경 cover와 인증 카드 scale을 현재 Canvas 크기에 맞춘다. */
  layout(width: number, height: number): void {
    this.screenWidth = width;
    this.screenHeight = height;
    this.hitArea = new Rectangle(0, 0, width, height);
    const backgroundScale = Math.max(width / this.background.texture.width, height / this.background.texture.height);
    this.background.position.set(width / 2, height / 2);
    this.background.scale.set(backgroundScale);
    this.shade.clear().rect(0, 0, width, height).fill({ color: 0x2b1b16, alpha: 0.34 });
    this.positionContent();
  }

  private drawCard(): void {
    this.card
      .clear()
      .roundRect(0, 12, CARD_WIDTH, CARD_HEIGHT, 36)
      .fill({ color: 0x1f120d, alpha: 0.22 })
      .roundRect(0, 0, CARD_WIDTH, CARD_HEIGHT, 36)
      .fill({ color: 0xfff5df, alpha: 0.97 })
      .stroke({ color: 0x81583a, width: 4 })
      .roundRect(12, 12, CARD_WIDTH - 24, CARD_HEIGHT - 24, 28)
      .stroke({ color: 0xffffff, width: 2, alpha: 0.75 });
    this.logo.position.set(CARD_WIDTH / 2, 86);
    this.title.position.set(CARD_WIDTH / 2, 174);
    this.subtitle.position.set(CARD_WIDTH / 2, 212);
    this.loginTab.position.set(112, 250);
    this.registerTab.position.set(324, 250);
    this.email.position.set(80, 326);
    this.password.position.set(80, 430);
    this.submitButton.position.set(130, 545);
    this.status.position.set(CARD_WIDTH / 2, 622);
    this.helper.position.set(CARD_WIDTH / 2, 661);
  }

  private positionContent(): void {
    const scale = Math.min(1, (this.screenWidth - 32) / CARD_WIDTH, (this.screenHeight - 32) / CARD_HEIGHT);
    this.content.scale.set(scale);
    this.content.position.set(
      (this.screenWidth - CARD_WIDTH * scale) / 2,
      (this.screenHeight - CARD_HEIGHT * scale) / 2,
    );
  }

  private setMode(mode: AuthMode): void {
    if (this.submitting) {
      return;
    }
    this.mode = mode;
    this.status.text = "";
    this.title.text = message(mode === "login" ? "auth.loginTitle" : "auth.registerTitle");
    this.subtitle.text = message(mode === "login" ? "auth.loginSubtitle" : "auth.registerSubtitle");
    this.submitButton.setLabel(message(mode === "login" ? "auth.loginAction" : "auth.registerAction"));
    this.loginTab.alpha = mode === "login" ? 1 : 0.62;
    this.registerTab.alpha = mode === "register" ? 1 : 0.62;
  }

  private focusField(field: CanvasAuthField | null): void {
    this.email.setFocused(field === this.email);
    this.password.setFocused(field === this.password);
  }

  private handleKey(event: KeyboardEvent): void {
    if (this.submitting) {
      return;
    }
    if (event.key === "Tab") {
      this.focusField(this.email.focused ? this.password : this.email);
      event.preventDefault();
      return;
    }
    if (event.key === "Enter") {
      void this.submit();
      event.preventDefault();
      return;
    }
    let focused: CanvasAuthField | null = null;
    if (this.email.focused) {
      focused = this.email;
    } else if (this.password.focused) {
      focused = this.password;
    }
    if (!focused) {
      return;
    }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "v") {
      void this.pasteInto(focused);
      event.preventDefault();
      return;
    }
    if (event.key === "Backspace") {
      focused.erase();
      event.preventDefault();
      return;
    }
    if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      focused.append(event.key);
      event.preventDefault();
    }
  }

  private async pasteInto(field: CanvasAuthField): Promise<void> {
    try {
      field.append(await navigator.clipboard.readText());
    } catch {
      this.status.text = message("auth.clipboardUnavailable");
    }
  }

  private async submit(): Promise<void> {
    if (this.submitting) {
      return;
    }
    const email = this.email.value.trim().toLowerCase();
    const password = this.password.value;
    if (!isValidEmail(email)) {
      this.status.text = message("auth.invalidEmail");
      this.focusField(this.email);
      return;
    }
    if (this.mode === "register" && password.length < 12) {
      this.status.text = message("auth.passwordTooShort");
      this.focusField(this.password);
      return;
    }
    if (!password) {
      this.status.text = message("auth.passwordRequired");
      this.focusField(this.password);
      return;
    }

    this.submitting = true;
    this.focusField(null);
    this.status.style.fill = 0x6d5849;
    this.status.text = message(this.mode === "login" ? "auth.loggingIn" : "auth.creatingAccount");
    this.submitButton.setLabel(message("auth.working"));
    const result = await this.options.onSubmit(this.mode, email, password);
    if (result.ok) {
      this.status.text = message("auth.enteringGame");
      return;
    }
    this.submitting = false;
    this.password.clear();
    this.status.style.fill = 0x8c3b2d;
    this.status.text = message(result.messageId);
    this.submitButton.setLabel(message(this.mode === "login" ? "auth.loginAction" : "auth.registerAction"));
    this.focusField(this.password);
  }
}

type CanvasAuthFieldOptions = {
  label: string;
  placeholder: string;
  maxLength: number;
  secret?: boolean;
};

class CanvasAuthField extends Container {
  private readonly background = new Graphics();
  private readonly valueText: Text;
  private readonly placeholder: string;
  private readonly maxLength: number;
  private readonly secret: boolean;
  private rawValue = "";
  private hasFocus = false;
  onFocus: (() => void) | null = null;

  constructor(options: CanvasAuthFieldOptions) {
    super();
    this.placeholder = options.placeholder;
    this.maxLength = options.maxLength;
    this.secret = options.secret ?? false;
    const label = new Text({ text: options.label, style: textStyle(15, 0x574335, "700") });
    this.valueText = new Text({ text: "", style: textStyle(19, 0x3d2b22, "600") });
    this.valueText.position.set(20, 45);
    this.addChild(label, this.background, this.valueText);
    this.hitArea = new Rectangle(0, 28, 460, 66);
    this.eventMode = "static";
    this.cursor = "text";
    this.on("pointertap", (event) => {
      event.stopPropagation();
      this.onFocus?.();
    });
    this.refresh();
  }

  get value(): string {
    return this.rawValue;
  }

  get focused(): boolean {
    return this.hasFocus;
  }

  setFocused(focused: boolean): void {
    this.hasFocus = focused;
    this.refresh();
  }

  append(value: string): void {
    const sanitized = value.replace(/[\r\n\t]/g, "");
    this.rawValue = `${this.rawValue}${sanitized}`.slice(0, this.maxLength);
    this.refresh();
  }

  erase(): void {
    this.rawValue = Array.from(this.rawValue).slice(0, -1).join("");
    this.refresh();
  }

  clear(): void {
    this.rawValue = "";
    this.refresh();
  }

  private refresh(): void {
    const empty = this.rawValue.length === 0;
    const visibleValue = this.secret && !empty ? "•".repeat(Array.from(this.rawValue).length) : this.rawValue;
    this.valueText.text = empty ? this.placeholder : `${visibleValue}${this.hasFocus ? "▌" : ""}`;
    this.valueText.style.fill = empty ? 0xa79484 : 0x3d2b22;
    this.background
      .clear()
      .roundRect(0, 28, 460, 66, 16)
      .fill(0xfffdf8)
      .stroke({ color: this.hasFocus ? 0xe7a854 : 0xc9ad8e, width: this.hasFocus ? 4 : 2 });
  }
}

function isValidEmail(value: string): boolean {
  const separator = value.indexOf("@");
  return separator > 0 && separator === value.lastIndexOf("@") && separator < value.length - 1;
}
