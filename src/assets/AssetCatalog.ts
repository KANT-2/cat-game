/** 런타임이 구분하는 리소스의 시각적 용도다. */
export type AssetKind = "background" | "environment" | "furniture" | "cat" | "ui" | "effect";

/** 애니메이션 또는 상태별 단일 프레임 파일이다. */
export type AssetFrame = {
  name: string;
  src: string;
};

/** 한 이미지에 같은 크기의 프레임을 행 우선으로 배치한 애니메이션 정보다. */
export type SpriteSheetMetadata = {
  frameWidth: number;
  frameHeight: number;
  columns: number;
  frameCount: number;
  framesPerSecond: number;
  playback: "loop" | "once" | "hold";
};

/** 리소스 작업자가 `catalog.json`에 등록하는 단일 항목이다. */
export type AssetEntry = {
  id: string;
  kind: AssetKind;
  src: string;
  anchor?: { x: number; y: number };
  frames?: AssetFrame[];
  spriteSheet?: SpriteSheetMetadata;
  tags?: string[];
};

/** 현재 지원하는 버전 1 리소스 카탈로그의 전체 JSON 구조다. */
export type AssetCatalogData = {
  version: 1;
  bundles: Record<string, AssetEntry[]>;
};

/**
 * 리소스 카탈로그 JSON을 네트워크에서 불러와 런타임 구조로 반환한다.
 *
 * @param url - 카탈로그를 요청할 앱 origin 기준 또는 절대 URL.
 * @returns 버전 1 형식의 번들별 리소스 항목을 담은 Promise.
 *
 * @throws HTTP 응답이 성공 범위가 아니면 상태 코드를 포함한 오류를 던진다.
 * @throws JSON의 버전이 `1`이 아니거나 최상위 `bundles` 객체가 없으면 형식 오류를 던진다.
 *
 * @remarks
 * 이 함수는 빠른 런타임 진입 검증만 수행한다. 개별 ID 중복, 파일 존재 여부, anchor 범위와
 * 금지된 게임 규칙 필드는 빌드 전에 `npm run assets:check`로 검증한다.
 */
export async function loadAssetCatalog(url = "/assets/catalog.json"): Promise<AssetCatalogData> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Asset catalog request failed: ${response.status}`);
  }
  const catalog = (await response.json()) as AssetCatalogData;
  if (catalog.version !== 1 || typeof catalog.bundles !== "object") {
    throw new Error("Unsupported asset catalog format");
  }
  return catalog;
}

/**
 * 카탈로그에서 요청한 안정적인 리소스 ID의 런타임 경로를 찾는다.
 *
 * @param catalog - `loadAssetCatalog()`로 검증한 전체 카탈로그.
 * @param id - 코드와 저장 데이터에서 사용하는 안정적인 asset ID.
 * @returns ID에 등록된 앱 origin 기준 이미지 경로.
 * @throws 어떤 번들에도 요청한 ID가 없으면 개발 중 누락을 드러내는 오류를 던진다.
 */
export function assetPath(catalog: AssetCatalogData, id: string): string {
  for (const entries of Object.values(catalog.bundles)) {
    const entry = entries.find((candidate) => candidate.id === id);
    if (entry) {
      return entry.src;
    }
  }
  throw new Error(`Asset ID is not registered: ${id}`);
}
