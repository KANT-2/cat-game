/** 현재 프로토타입에서 배치할 수 있는 가구 원형 ID다. */
export type FurnitureKind = "sofa" | "desk" | "plant" | "catTree" | "bed";

export const ROOM_GRID_WIDTH = 10;

export const ROOM_GRID_HEIGHT = 8;

/** 가구 원형이 점유하는 논리 셀 크기다. 시각 속성은 포함하지 않는다. */
export type FurnitureDefinition = {
  width: number;
  height: number;
};

/** 방에 배치된 단일 가구 인스턴스의 저장 형식이다. */
export type PlacedFurniture = {
  id: string;
  kind: FurnitureKind;
  x: number;
  y: number;
  rotation: 0 | 1;
};

/** 로컬 또는 원격 저장소로 직렬화할 수 있는 게임 스냅샷이다. */
export type GameState = {
  economyVersion: 1;
  coins: number;
  gems: number;
  completedQuizIds: string[];
  furniture: PlacedFurniture[];
  inventory: Record<FurnitureKind, number>;
};

export const furnitureDefinitions: Record<FurnitureKind, FurnitureDefinition> = {
  sofa: { width: 3, height: 1 },
  desk: { width: 2, height: 1 },
  plant: { width: 1, height: 1 },
  catTree: { width: 2, height: 1 },
  bed: { width: 3, height: 2 },
};

export const defaultFurniture: PlacedFurniture[] = [
  { id: "desk-1", kind: "desk", x: 1, y: 1, rotation: 0 },
  { id: "sofa-1", kind: "sofa", x: 5, y: 1, rotation: 0 },
  { id: "plant-1", kind: "plant", x: 8, y: 2, rotation: 0 },
  { id: "tree-1", kind: "catTree", x: 1, y: 5, rotation: 0 },
  { id: "bed-1", kind: "bed", x: 6, y: 5, rotation: 0 },
];

/**
 * 새 플레이어 또는 복구 불가능한 저장 데이터에 사용할 기본 상태를 만든다.
 *
 * @returns 초기 재화, 빈 퀴즈 완료 이력과 기본 가구 배치를 가진 새 `GameState`.
 *
 * @remarks
 * 호출할 때마다 가구 배열과 각 인스턴스를 새로 복제한다. 반환된 상태를 변경해도
 * `defaultFurniture` 또는 다른 호출에서 받은 상태에는 영향을 주지 않는다.
 */
export function createDefaultState(): GameState {
  return {
    economyVersion: 1,
    coins: 1_000_000,
    gems: 8,
    completedQuizIds: [],
    furniture: defaultFurniture.map((item) => ({ ...item })),
    inventory: { sofa: 0, desk: 0, plant: 1, catTree: 0, bed: 0 },
  };
}

/**
 * 회전 상태를 반영한 가구의 실제 점유 크기를 계산한다.
 *
 * @param definition - 원본 방향의 논리 셀 너비와 높이.
 * @param rotation - `0`이면 원본 방향, `1`이면 너비와 높이를 맞바꾼 방향.
 * @returns 배치·충돌 검사에 사용할 새 `{ width, height }` 객체.
 *
 * @remarks 전달받은 정의를 변경하지 않는 순수 함수다.
 */
export function rotatedSize(definition: FurnitureDefinition, rotation: 0 | 1): { width: number; height: number } {
  return rotation === 0
    ? { width: definition.width, height: definition.height }
    : { width: definition.height, height: definition.width };
}

/**
 * 지정한 직사각형 셀이 방 안에 있고 기존 가구와 겹치지 않는지 검사한다.
 *
 * @param furniture - 현재 방에 배치된 가구 인스턴스 전체.
 * @param gridWidth - 방의 논리 셀 너비.
 * @param gridHeight - 방의 논리 셀 높이.
 * @param x - 검사할 영역의 좌측 논리 셀 X 좌표.
 * @param y - 검사할 영역의 상단 논리 셀 Y 좌표.
 * @param width - 검사할 영역이 점유하는 셀 너비.
 * @param height - 검사할 영역이 점유하는 셀 높이.
 * @returns 모든 셀이 방 안에 있고 기존 가구와 겹치지 않으면 `true`.
 *
 * @remarks
 * 서로의 경계만 맞닿은 직사각형은 겹친 것으로 처리하지 않는다. `width`와 `height`는
 * 양수라는 전제이며, 함수는 입력 배열과 가구 인스턴스를 변경하지 않는다.
 */
export function isPlacementFree(
  furniture: PlacedFurniture[],
  gridWidth: number,
  gridHeight: number,
  x: number,
  y: number,
  width: number,
  height: number,
): boolean {
  if (x < 0 || y < 0 || x + width > gridWidth || y + height > gridHeight) {
    return false;
  }
  return !furniture.some((item) => {
    const size = rotatedSize(furnitureDefinitions[item.kind], item.rotation);
    return x < item.x + size.width && x + width > item.x && y < item.y + size.height && y + height > item.y;
  });
}
