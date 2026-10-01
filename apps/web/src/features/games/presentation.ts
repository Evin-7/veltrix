type GamePresentation = {
  players: string;
  accent: string;
  palette: [string, string];
  symbol: string;
};

const presentationBySlug: Record<string, GamePresentation> = {
  "neon-relics": { players: "new", accent: "#a6f7db", palette: ["#17445a", "#171d3d"], symbol: "✧" },
  "veltrix-blackjack": { players: "new", accent: "#f2ca7b", palette: ["#27564b", "#121c25"], symbol: "♣" },
  "european-roulette": { players: "new", accent: "#ff9b9e", palette: ["#662b3c", "#171b2f"], symbol: "◎" },
  "lunar-circuit": { players: "2.4k", accent: "#82e4c1", palette: ["#153b49", "#172034"], symbol: "◒" },
  "velvet-roulette": { players: "1.8k", accent: "#e9b46a", palette: ["#5e2637", "#1b1425"], symbol: "✦" },
  "signal-blackjack": { players: "1.1k", accent: "#f4c675", palette: ["#324a43", "#101e21"], symbol: "♠" },
  "neon-paddock": { players: "840", accent: "#fb8eb9", palette: ["#522446", "#1e2343"], symbol: "↗" },
  "orbit-reels": { players: "2.1k", accent: "#9db3ff", palette: ["#273a74", "#1a1831"], symbol: "✳" },
  "gilded-dice": { players: "690", accent: "#f4d68c", palette: ["#6a4626", "#261a1d"], symbol: "◆" },
  "tide-chase": { players: "518", accent: "#69d3ec", palette: ["#155665", "#161d38"], symbol: "≈" },
  "ember-room": { players: "1.3k", accent: "#f18a63", palette: ["#713127", "#211a2b"], symbol: "✺" },
  "afterglow-baccarat": { players: "970", accent: "#d99eff", palette: ["#3c2a64", "#1d1830"], symbol: "◈" },
  "cinder-club": { players: "430", accent: "#ffbb72", palette: ["#6b332e", "#262035"], symbol: "●" },
  "prism-pulse": { players: "1.6k", accent: "#82a5ff", palette: ["#273c75", "#321d55"], symbol: "＋" },
  "moonlit-mint": { players: "765", accent: "#9af5d7", palette: ["#1b5751", "#171c31"], symbol: "⌁" },
};

const fallbackPresentation: GamePresentation = {
  players: "—",
  accent: "#e8b86a",
  palette: ["#334155", "#111827"],
  symbol: "✦",
};

export function getGamePresentation(slug: string) {
  return presentationBySlug[slug] ?? fallbackPresentation;
}
