import { registerSW } from "virtual:pwa-register";
import type { MessageId } from "../content/messages";

interface InstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

type PwaHooks = {
  onInstallAvailable: (install: (() => void) | null) => void;
  onMessage: (messageId: MessageId) => void;
};

/**
 * PWA 설치 프롬프트와 service worker 생명주기를 Canvas 애플리케이션에 연결한다.
 *
 * @param hooks - 설치 동작의 가용 상태와 사용자 알림 메시지 키를 받을 애플리케이션 콜백.
 * @returns 등록 이후에는 브라우저 이벤트로 동작하며 별도의 값을 반환하지 않는다.
 *
 * @remarks
 * `beforeinstallprompt`의 기본 동작을 보류하고 실제 사용자 입력 시 실행할 함수를
 * `onInstallAvailable`로 전달한다. 프롬프트는 한 번 사용한 뒤 제거된다. 앱 설치 완료와
 * 오프라인 캐시 준비는 문자열 대신 `MessageId`로 통지한다.
 *
 * service worker 등록 오류는 사용자 메시지로 변환하지 않고 개발자 오류로 콘솔에 기록한다.
 * 이 함수는 브라우저 전용이며 SSR이나 Node.js 환경에서 호출하지 않는다.
 */
export function registerPwa(hooks: PwaHooks): void {
  let installPrompt: InstallPromptEvent | null = null;

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    installPrompt = event as InstallPromptEvent;
    hooks.onInstallAvailable(() => {
      if (!installPrompt) {
        return;
      }
      const prompt = installPrompt;
      void prompt
        .prompt()
        .then(() => prompt.userChoice)
        .then(({ outcome }) => {
          if (outcome === "accepted") {
            hooks.onMessage("pwa.installStarted");
          }
          installPrompt = null;
          hooks.onInstallAvailable(null);
        });
    });
  });

  window.addEventListener("appinstalled", () => {
    installPrompt = null;
    hooks.onInstallAvailable(null);
    hooks.onMessage("pwa.installed");
  });

  registerSW({
    immediate: true,
    onOfflineReady: () => hooks.onMessage("pwa.offlineReady"),
    onRegisterError: (error) => console.error("PWA service worker registration failed", error),
  });
}
