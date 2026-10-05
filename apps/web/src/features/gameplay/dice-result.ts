/** Converts the server's percentile result into the fewest possible D6 faces. */
export function resultToDice(total: number): number[] {
  if (!Number.isSafeInteger(total) || total < 1 || total > 100) {
    throw new RangeError("Dice results must be whole numbers from 1 to 100.");
  }

  const sixes = Math.floor((total - 1) / 6);
  const finalFace = total - sixes * 6;
  return [...Array.from({ length: sixes }, () => 6), finalFace];
}
