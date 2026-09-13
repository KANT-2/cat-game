import type { MessageId } from "../../content/messages";

export type ProfileImagePresentation = {
  isLinked: boolean;
  statusMessage: MessageId;
};

/** 프로필 이미지 URL 유무를 Canvas 표시 상태로 변환한다. */
export function profileImagePresentation(profileImageUrl: string | null): ProfileImagePresentation {
  return profileImageUrl
    ? { isLinked: true, statusMessage: "settings.profileImageAvailable" }
    : { isLinked: false, statusMessage: "settings.profileImageUnavailable" };
}
