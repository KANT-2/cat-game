import { Assets, type Texture } from "pixi.js";
import type { MessageId } from "../../content/messages";

export type ProfileImagePresentation = {
  isLinked: boolean;
  statusMessage: MessageId;
};

/** 확장자가 없는 인증 API 응답을 Pixi 텍스처로 명시적으로 해석해 캐시한다. */
export async function loadProfileImageTexture(profileImageUrl: string | null): Promise<Texture | null> {
  if (!profileImageUrl) {
    return null;
  }
  return (
    (await Assets.load<Texture>({
      alias: profileImageUrl,
      src: profileImageUrl,
      parser: "loadTextures",
    })) ?? null
  );
}

/** 설정 화면은 로드가 확인된 프로필 텍스처만 사용하고, 캐시 누락 시 안전하게 대체 이미지를 쓴다. */
export function cachedProfileImageTexture(profileImageUrl: string | null): Texture | null {
  if (!profileImageUrl || !Assets.cache.has(profileImageUrl)) {
    return null;
  }
  return Assets.cache.get<Texture>(profileImageUrl) ?? null;
}

/** 프로필 이미지 URL 유무를 Canvas 표시 상태로 변환한다. */
export function profileImagePresentation(profileImageUrl: string | null): ProfileImagePresentation {
  return profileImageUrl
    ? { isLinked: true, statusMessage: "settings.profileImageAvailable" }
    : { isLinked: false, statusMessage: "settings.profileImageUnavailable" };
}
