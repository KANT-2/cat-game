import { Assets, Rectangle, Texture } from "pixi.js";
import type { AssetCatalogData, AssetEntry } from "./AssetCatalog";

export type LoadedSpriteSheet = {
  textures: Texture[];
  framesPerSecond: number;
  playback: "loop" | "once" | "hold";
  anchor: { x: number; y: number };
};

/**
 * 카탈로그 전체 번들에서 안정적인 ID와 일치하는 리소스를 찾는다.
 *
 * @param catalog - `loadAssetCatalog`가 반환한 버전 1 카탈로그.
 * @param assetId - 화면 코드가 파일 경로 대신 사용하는 안정적인 리소스 ID.
 * @returns ID와 일치하는 단일 카탈로그 항목.
 * @throws ID를 찾을 수 없으면 누락된 ID를 포함한 오류를 던진다.
 */
export function findAssetEntry(catalog: AssetCatalogData, assetId: string): AssetEntry {
  for (const entries of Object.values(catalog.bundles)) {
    const entry = entries.find((candidate) => candidate.id === assetId);
    if (entry) {
      return entry;
    }
  }
  throw new Error(`Asset catalog entry not found: ${assetId}`);
}

/**
 * 카탈로그 항목의 단일 이미지를 PixiJS 텍스처 캐시에 불러온다.
 *
 * @param entry - 파일 경로가 카탈로그에 등록된 리소스 항목.
 * @returns 이후 Sprite가 공유할 수 있는 캐시된 PixiJS 텍스처.
 * @throws 이미지 요청이나 디코딩에 실패하면 PixiJS 로더 오류를 전달한다.
 */
export async function loadTexture(entry: AssetEntry): Promise<Texture> {
  return Assets.load<Texture>(entry.src);
}

/**
 * 카탈로그의 행 우선 스프라이트 시트를 PixiJS 프레임 텍스처로 불러온다.
 *
 * @param entry - `spriteSheet`와 원본 이미지 경로가 등록된 리소스 항목.
 * @returns 프레임 텍스처와 재생 속도, 방식, 바닥 anchor를 담은 Promise.
 * @throws 스프라이트 시트 메타데이터 또는 anchor가 없으면 형식 오류를 던진다.
 *
 * @remarks 원본 이미지는 PixiJS `Assets` 캐시에 한 번만 적재된다. 생성된 프레임은
 * 카탈로그의 `frameCount`까지만 포함하므로 마지막 행의 투명한 빈 칸은 재생하지 않는다.
 */
export async function loadSpriteSheet(entry: AssetEntry): Promise<LoadedSpriteSheet> {
  const metadata = entry.spriteSheet;
  if (!metadata) {
    throw new Error(`Asset is not a sprite sheet: ${entry.id}`);
  }
  if (!entry.anchor) {
    throw new Error(`Sprite sheet anchor is missing: ${entry.id}`);
  }

  const sheetTexture = await loadTexture(entry);
  const textures = Array.from({ length: metadata.frameCount }, (_, index) => {
    const column = index % metadata.columns;
    const row = Math.floor(index / metadata.columns);
    return new Texture({
      source: sheetTexture.source,
      frame: new Rectangle(
        column * metadata.frameWidth,
        row * metadata.frameHeight,
        metadata.frameWidth,
        metadata.frameHeight,
      ),
      label: `${entry.id}:${index}`,
    });
  });

  return {
    textures,
    framesPerSecond: metadata.framesPerSecond,
    playback: metadata.playback,
    anchor: entry.anchor,
  };
}
