"use client";
import { CHAIN_LIST, type ChainSymbol } from "@/lib/useCryptoPrices";

export type Chain = ChainSymbol;
export { CHAIN_LIST };

export const CHAIN_COLORS: Record<string, string> = {
  ETH: "#627EEA",
  BASE: "#0052FF",
  SOL: "#9945FF",
  ROBINHOOD: "#C7FF00",
};

function ChainIcon({ chain, size = 20 }: { chain: string; size?: number }) {
  const color = CHAIN_COLORS[chain] ?? "#888";

  if (chain === "ETH" || chain === "BASE") {
    const c = chain === "ETH" ? "#627EEA" : "#0052FF";
    return (
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
        <circle cx="16" cy="16" r="16" fill={c} fillOpacity="0.15" />
        <path d="M16 6l-6.5 10.5L16 20l6.5-3.5L16 6z" fill={c} opacity="0.8" />
        <path d="M16 20l-6.5-3.5L16 26l6.5-6.5L16 20z" fill={c} />
      </svg>
    );
  }

  if (chain === "SOL") return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <circle cx="16" cy="16" r="16" fill="#9945FF" fillOpacity="0.15" />
      <path d="M10 20h12l-2 2H8l2-2zM10 15h12l-2 2H8l2-2zM22 10H10l2-2h12l-2 2z" fill="#9945FF" />
    </svg>
  );
if (chain === "ROBINHOOD") return (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
    <circle cx="16" cy="16" r="16" fill="#C7FF00" fillOpacity="0.15" />
    <text
      x="16"
      y="21"
      textAnchor="middle"
      fontSize="15"
      fontWeight="bold"
      fill="#C7FF00"
    >
      R
    </text>
  </svg>
);
  if (chain === "BTC") return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <circle cx="16" cy="16" r="16" fill="#F7931A" fillOpacity="0.15" />
      <text x="16" y="21" textAnchor="middle" fontSize="14" fontWeight="bold" fill="#F7931A">₿</text>
    </svg>
  );

  if (chain === "BNB") return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <circle cx="16" cy="16" r="16" fill="#F3BA2F" fillOpacity="0.15" />
      <path d="M16 8l2 2-2 2-2-2 2-2zM10 14l2 2-2 2-2-2 2-2zM16 14l2 2-2 2-2-2 2-2zM22 14l2 2-2 2-2-2 2-2zM16 20l2 2-2 2-2-2 2-2z" fill="#F3BA2F" />
    </svg>
  );

  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <circle cx="16" cy="16" r="16" fill={color} fillOpacity="0.15" />
      <circle cx="16" cy="16" r="7" fill={color} fillOpacity="0.8" />
    </svg>
  );
}

interface ChainBadgeProps {
  chain: string;
  showLabel?: boolean;
  size?: number;
}

export function ChainBadge({ chain, showLabel = true, size = 20 }: ChainBadgeProps) {
  return (
    <div className="flex items-center gap-1.5">
      <ChainIcon chain={chain} size={size} />
      {showLabel && <span className="text-sm font-medium text-white">{chain}</span>}
    </div>
  );
}