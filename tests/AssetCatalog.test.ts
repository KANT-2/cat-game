import { afterEach, describe, expect, it, vi } from "vitest";
import { loadAssetCatalog } from "../src/assets/AssetCatalog";

const catalog = { version: 1, bundles: { home: [] } };

afterEach(() => {
  vi.restoreAllMocks();
});

describe("asset catalog loading", () => {
  it("bypasses stale browser and service-worker caches while online", async () => {
    vi.spyOn(Date, "now").mockReturnValue(1234);
    const fetcher = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(JSON.stringify(catalog), { status: 200 }));

    await expect(loadAssetCatalog()).resolves.toEqual(catalog);
    expect(fetcher).toHaveBeenCalledWith("/assets/catalog.json?catalog-revision=1234", {
      cache: "no-store",
    });
  });

  it("uses the service-worker cached stable URL when the network is unavailable", async () => {
    vi.spyOn(Date, "now").mockReturnValue(5678);
    const fetcher = vi
      .spyOn(globalThis, "fetch")
      .mockRejectedValueOnce(new TypeError("offline"))
      .mockResolvedValueOnce(new Response(JSON.stringify(catalog), { status: 200 }));

    await expect(loadAssetCatalog()).resolves.toEqual(catalog);
    expect(fetcher).toHaveBeenNthCalledWith(1, "/assets/catalog.json?catalog-revision=5678", {
      cache: "no-store",
    });
    expect(fetcher).toHaveBeenNthCalledWith(2, "/assets/catalog.json");
  });
});
