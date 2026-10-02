import { cn } from "@/lib/cn";

const cards = [
  { suit: "♠", className: "veltrix-loader-card" },
  { suit: "♥", className: "veltrix-loader-card veltrix-loader-card--red" },
  { suit: "♣", className: "veltrix-loader-card" },
  { suit: "♦", className: "veltrix-loader-card veltrix-loader-card--red" },
];

export function VeltrixLoader({ className, label = "Loading" }: { className?: string; label?: string }) {
  return (
    <span aria-label={label} className={cn("veltrix-loader", className)} role="status">
      {cards.map((card) => <span aria-hidden="true" className={card.className} key={card.suit}>{card.suit}</span>)}
      <span className="sr-only">{label}</span>
    </span>
  );
}
