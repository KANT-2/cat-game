import type { MessageId } from "../../content/messages";
import type { FurnitureKind } from "../../domain/room";

/** 절차형 가구 placeholder의 UI 전용 라벨 키와 색상이다. */
export type FurniturePresentation = {
  labelMessage: MessageId;
  color: number;
  accent: number;
};

/**
 * 절차형 프로토타입의 표시 데이터다. 점유 크기·충돌·가격 같은 게임 규칙은
 * 이 파일에 두지 않으며, 실제 이미지 경로는 public/assets/catalog.json에서 관리한다.
 */
export const furniturePresentation: Record<FurnitureKind, FurniturePresentation> = {
  sofa: { labelMessage: "furniture.sofa", color: 0x8a6a47, accent: 0xc59b69 },
  desk: { labelMessage: "furniture.desk", color: 0x86542f, accent: 0xd8a25e },
  plant: { labelMessage: "furniture.plant", color: 0x4f8052, accent: 0xa85f3b },
  catTree: { labelMessage: "furniture.catTree", color: 0xb58b55, accent: 0xe1c18d },
  bed: { labelMessage: "furniture.bed", color: 0xe1cdaa, accent: 0xaabfbb },
};
