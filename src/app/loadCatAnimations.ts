import type { AssetCatalogData } from "../assets/AssetCatalog";
import type { LoadedSpriteSheet } from "../assets/SpriteSheetLoader";
import { findAssetEntry, loadSpriteSheet } from "../assets/SpriteSheetLoader";
import { CAT_ACTIONS, type CatAction, type CatAnimationSet } from "../game/entities/CatAnimations";

export type CatVariant = "fluffy" | "ink";

const CAT_ASSET_IDS: Record<CatVariant, Record<CatAction, string>> = {
  fluffy: {
    idle: "cat.fluffy.idle.01",
    walk: "cat.fluffy.walk.01",
    run: "cat.fluffy.run.01",
    attack: "cat.fluffy.attack.01",
    fall: "cat.fluffy.fall.01",
    groom: "cat.fluffy.groom.01",
    hit: "cat.fluffy.hit.01",
    jump: "cat.fluffy.jump.01",
    land: "cat.fluffy.land.01",
    scratch: "cat.fluffy.scratch.01",
    sleep: "cat.fluffy.sleep.01",
    surprise: "cat.fluffy.surprise.01",
    scruffLift: "cat.fluffy.scruff-lift.01",
  },
  ink: {
    idle: "cat.ink.idle.01",
    walk: "cat.ink.walk.01",
    run: "cat.ink.run.01",
    attack: "cat.ink.attack.01",
    fall: "cat.ink.fall.01",
    groom: "cat.ink.groom.01",
    hit: "cat.ink.hit.01",
    jump: "cat.ink.jump.01",
    land: "cat.ink.land.01",
    scratch: "cat.ink.scratch.01",
    sleep: "cat.ink.sleep.01",
    surprise: "cat.ink.surprise.01",
    scruffLift: "cat.ink.scruff-lift.01",
  },
};

/**
 * 현재 플레이어 고양이에 필요한 모든 동작 시트를 카탈로그 ID로 불러온다.
 *
 * @param catalog - 앱 시작 시 불러온 게임 리소스 카탈로그.
 * @param onProgress - 각 동작 시트가 준비될 때 완료 비율, 동작 이름과 로드된 클립을 받는 선택 콜백.
 * @param variant - 불러올 고양이 리소스 세트. 지정하지 않으면 1번 검은 고양이를 사용한다.
 * @returns 동작 이름으로 조회할 수 있는 완전한 고양이 애니메이션 세트.
 * @throws 필수 ID, 스프라이트 메타데이터 또는 이미지 로딩에 문제가 있으면 오류를 던진다.
 * @remarks idle을 먼저 준비해 로딩 장면에 실제 고양이를 표시한 뒤 나머지 동작을 병렬로 불러온다.
 */
export async function loadCatAnimations(
  catalog: AssetCatalogData,
  onProgress?: (progress: number, action: CatAction, clip: LoadedSpriteSheet) => void,
  variant: CatVariant = "ink",
): Promise<CatAnimationSet> {
  const assetIds = CAT_ASSET_IDS[variant];
  let completed = 0;
  const loadAction = async (action: CatAction): Promise<LoadedSpriteSheet> => {
    const clip = await loadSpriteSheet(findAssetEntry(catalog, assetIds[action]));
    completed += 1;
    onProgress?.(completed / CAT_ACTIONS.length, action, clip);
    return clip;
  };

  const idle = await loadAction("idle");
  const [walk, run, attack, fall, groom, hit, jump, land, scratch, sleep, surprise, scruffLift] = await Promise.all([
    loadAction("walk"),
    loadAction("run"),
    loadAction("attack"),
    loadAction("fall"),
    loadAction("groom"),
    loadAction("hit"),
    loadAction("jump"),
    loadAction("land"),
    loadAction("scratch"),
    loadAction("sleep"),
    loadAction("surprise"),
    loadAction("scruffLift"),
  ]);

  return { idle, walk, run, attack, fall, groom, hit, jump, land, scratch, sleep, surprise, scruffLift };
}
