import { describe, expect, it } from "vitest";
import type { PlacedFurniture } from "../src/domain/room";
import { resolveFurnitureShadow } from "../src/game/presentation/furnitureShadow";

function furniture(kind: PlacedFurniture["kind"], shopItemId?: PlacedFurniture["shopItemId"]): PlacedFurniture {
  return { id: "placed-1", kind, x: 1, y: 1, rotation: 0, shopItemId };
}

describe("furniture shadow presentation", () => {
  it("does not add a projected silhouette to rugs and thin ground props", () => {
    expect(resolveFurnitureShadow(furniture("rug", "furniture.forest.rug"))).toBeNull();
    expect(resolveFurnitureShadow(furniture("plant", "decor.alley-food-bowl"))).toBeNull();
    expect(resolveFurnitureShadow(furniture("plant", "decor.newspaper-stack"))).toBeNull();
  });

  it("keeps a restrained alpha shadow for raised furniture", () => {
    const shadow = resolveFurnitureShadow(furniture("catTree", "furniture.forest.cat-tower"));

    expect(shadow).not.toBeNull();
    expect(shadow?.alpha).toBeGreaterThan(0);
    expect(shadow?.alpha).toBeLessThan(0.2);
    expect(shadow?.scaleY).toBeLessThan(shadow?.scaleX ?? 0);
  });

  it("keeps the fallen log grounded despite its rug placement kind", () => {
    expect(resolveFurnitureShadow(furniture("rug", "decor.fallen-log"))).toMatchObject({ alpha: 0.1 });
  });
});
