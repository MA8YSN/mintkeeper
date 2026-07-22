"use client";
import { CHAIN_LIST, type ChainSymbol } from "@/lib/useCryptoPrices";

export type Chain = ChainSymbol;
export { CHAIN_LIST };

export const CHAIN_COLORS: Record<ChainSymbol, string> = {
  ETH:       "#627EEA",
  SOL:       "#9945FF",
  ROBINHOOD: "#00C805",
};

function ChainIcon({ chain, size = 20 }: { chain: ChainSymbol; size?: number }) {
  if (chain === "ETH") return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <circle cx="16" cy="16" r="16" fill="#627EEA" fillOpacity="0.15" />
      <path d="M16 6l-6.5 10.5L16 20l6.5-3.5L16 6z" fill="#627EEA" opacity="0.8" />
      <path d="M16 20l-6.5-3.5L16 26l6.5-6.5L16 20z" fill="#627EEA" />
    </svg>
  );

  if (chain === "SOL") return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <circle cx="16" cy="16" r="16" fill="#9945FF" fillOpacity="0.15" />
      <path d="M10 20h12l-2 2H8l2-2zM10 15h12l-2 2H8l2-2zM22 10H10l2-2h12l-2 2z" fill="#9945FF" />
    </svg>
  );

  // ROBINHOOD
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <circle cx="16" cy="16" r="16" fill="#00C805" fillOpacity="0.15" />
      <circle cx="16" cy="16" r="7" fill="#00C805" fillOpacity="0.8" />
    </svg>
  );
}

interface ChainBadgeProps {
  chain: ChainSymbol | string;
  showLabel?: boolean;
  size?: number;
}

export function ChainBadge({ chain, showLabel = true, size = 20 }: ChainBadgeProps) {
  const validChain = (["ETH", "SOL", "ROBINHOOD"] as string[]).includes(chain)
    ? (chain as ChainSymbol)
    : "ETH";

  return (
    <div className="flex items-center gap-1.5">
      <ChainIcon chain={validChain} size={size} />
      {showLabel && (
        <span className="text-sm font-medium text-white">{validChain}</span>
      )}
    </div>
  );
}