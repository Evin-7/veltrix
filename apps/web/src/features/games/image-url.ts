const cloudinaryArtworkSizes = {
  compact: { width: 480, height: 600 },
  card: { width: 640, height: 800 },
  detail: { width: 1200, height: 1500 },
} as const;

export type GameArtworkSize = keyof typeof cloudinaryArtworkSizes;

export function getGameArtworkUrl(
  source: string,
  size: GameArtworkSize = "card",
) {
  let imageUrl: URL;

  try {
    imageUrl = new URL(source);
  } catch {
    return source;
  }

  if (
    imageUrl.protocol !== "https:" ||
    imageUrl.hostname !== "res.cloudinary.com"
  ) {
    return source;
  }

  const uploadPath = "/image/upload/";
  const uploadPathIndex = imageUrl.pathname.indexOf(uploadPath);
  if (uploadPathIndex === -1) return source;

  const uploadPathEnd = uploadPathIndex + uploadPath.length;
  const originalAssetPath = imageUrl.pathname.slice(uploadPathEnd);
  if (!/^v\d+\//.test(originalAssetPath)) return source;

  const { width, height } = cloudinaryArtworkSizes[size];
  imageUrl.pathname =
    `${imageUrl.pathname.slice(0, uploadPathEnd)}` +
    `c_fill,w_${width},h_${height},g_auto/f_auto/q_auto:good/` +
    originalAssetPath;

  return imageUrl.toString();
}
