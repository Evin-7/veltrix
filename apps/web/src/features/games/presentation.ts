type GamePresentation = {
  accent: string;
  palette: [string, string];
  symbol: string;
};

const presentationBySlug: Record<string, GamePresentation> = {
  "neon-relics": { accent: "#a6f7db", palette: ["#17445a", "#171d3d"], symbol: "✧" },
  "veltrix-blackjack": { accent: "#f2ca7b", palette: ["#27564b", "#121c25"], symbol: "♣" },
  "european-roulette": { accent: "#ff9b9e", palette: ["#662b3c", "#171b2f"], symbol: "◎" },
  "lunar-circuit": { accent: "#82e4c1", palette: ["#153b49", "#172034"], symbol: "◒" },
  "velvet-roulette": { accent: "#e9b46a", palette: ["#5e2637", "#1b1425"], symbol: "✦" },
  "signal-blackjack": { accent: "#f4c675", palette: ["#324a43", "#101e21"], symbol: "♠" },
  "neon-paddock": { accent: "#fb8eb9", palette: ["#522446", "#1e2343"], symbol: "↗" },
  "orbit-reels": { accent: "#9db3ff", palette: ["#273a74", "#1a1831"], symbol: "✳" },
  "gilded-dice": { accent: "#f4d68c", palette: ["#6a4626", "#261a1d"], symbol: "◆" },
  "tide-chase": { accent: "#69d3ec", palette: ["#155665", "#161d38"], symbol: "≈" },
  "ember-room": { accent: "#f18a63", palette: ["#713127", "#211a2b"], symbol: "✺" },
  "afterglow-baccarat": { accent: "#d99eff", palette: ["#3c2a64", "#1d1830"], symbol: "◈" },
  "cinder-club": { accent: "#ffbb72", palette: ["#6b332e", "#262035"], symbol: "●" },
  "prism-pulse": { accent: "#82a5ff", palette: ["#273c75", "#321d55"], symbol: "＋" },
  "moonlit-mint": { accent: "#9af5d7", palette: ["#1b5751", "#171c31"], symbol: "⌁" },
};

const fallbackPresentation: GamePresentation = {
  accent: "#e8b86a",
  palette: ["#334155", "#111827"],
  symbol: "✦",
};

export function getGamePresentation(slug: string) {
  return presentationBySlug[slug] ?? fallbackPresentation;
}
