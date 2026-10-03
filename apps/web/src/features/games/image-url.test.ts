import { describe, expect, it } from "vitest";
import { getGameArtworkUrl } from "./image-url";

describe("getGameArtworkUrl", () => {
  it("requests a card-sized, automatically optimized Cloudinary derivative", () => {
    expect(
      getGameArtworkUrl(
        "https://res.cloudinary.com/veltrix/image/upload/v123/veltrix/game-thumbnails/cover.jpg",
      ),
    ).toBe(
      "https://res.cloudinary.com/veltrix/image/upload/c_fill,w_640,h_800,g_auto/f_auto/q_auto:good/v123/veltrix/game-thumbnails/cover.jpg",
    );
  });

  it("uses a larger derivative for the game detail view", () => {
    expect(
      getGameArtworkUrl(
        "https://res.cloudinary.com/veltrix/image/upload/v123/cover.jpg",
        "detail",
      ),
    ).toContain("c_fill,w_1200,h_1500,g_auto/f_auto/q_auto:good/v123/");
  });

  it("leaves non-Cloudinary and already transformed images unchanged", () => {
    const externalImage = "https://images.example.com/cover.jpg";
    const transformedImage =
      "https://res.cloudinary.com/veltrix/image/upload/c_fill,w_640/v123/cover.jpg";

    expect(getGameArtworkUrl(externalImage)).toBe(externalImage);
    expect(getGameArtworkUrl(transformedImage)).toBe(transformedImage);
    expect(getGameArtworkUrl("/games/lunar-circuit/cover.webp")).toBe(
      "/games/lunar-circuit/cover.webp",
    );
  });
});
