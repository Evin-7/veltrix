export type CurrencyFormatOptions = {
  sign?: "auto" | "always";
};

/** Formats the internal virtual balance for player-facing displays. */
export function formatCurrency(
  value: number,
  { sign = "auto" }: CurrencyFormatOptions = {},
) {
  const prefix = value < 0 ? "-" : sign === "always" && value > 0 ? "+" : "";
  return `${prefix}€${Math.abs(value).toLocaleString("en-US")}`;
}

/** Converts legacy persisted currency copy without changing internal wallet data. */
export function replaceLegacyCurrencyText(text: string) {
  return text.replace(
    /([+-]?)\s*([\d,]+)\s*VC\b/g,
    (_, sign: string, digits: string) => {
      const value =
        Number(digits.replaceAll(",", "")) * (sign === "-" ? -1 : 1);
      return formatCurrency(value, { sign: sign === "+" ? "always" : "auto" });
    },
  );
}
