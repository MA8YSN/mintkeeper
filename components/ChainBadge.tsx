"use client";

export type Chain = "ETH" | "SOL" | "POL" | "BTC" | "BNB" | "AVAX" | "SUI" | "APE";

export const CHAINS: Chain[] = ["ETH", "SOL", "POL", "BTC", "BNB", "AVAX", "SUI", "APE"];

export const CHAIN_COLORS: Record<Chain, string> = {
  ETH: "#627EEA",
  SOL: "#9945FF",
  POL: "#8247E5",
  BTC: "#F7931A",
  BNB: "#F3BA2F",
  AVAX: "#E84142",
  SUI: "#4DA2FF",
  APE: "#0054F9",
};

export const CHAIN_LABELS: Record<Chain, string> = {
  ETH: "Ethereum",
  SOL: "Solana",
  POL: "Polygon",
  BTC: "Bitcoin",
  BNB: "BNB Chain",
  AVAX: "Avalanche",
  SUI: "Sui",
  APE: "ApeChain",
};

function ChainIcon({ chain, size = 20 }: { chain: Chain; size?: number }) {
  const color = CHAIN_COLORS[chain];

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

  // Generic fallback for POL, AVAX, SUI, APE
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <circle cx="16" cy="16" r="16" fill={color} fillOpacity="0.15" />
      <circle cx="16" cy="16" r="7" fill={color} fillOpacity="0.8" />
    </svg>
  );
}

interface ChainBadgeProps {
  chain: Chain;
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