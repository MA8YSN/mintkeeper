import { useEffect, useState } from "react";

export const CHAIN_LIST = [
  { symbol: "ETH", label: "Ethereum", coingeckoId: "ethereum" },
  { symbol: "POL", label: "Polygon", coingeckoId: "matic-network" },
  { symbol: "BASE", label: "Base", coingeckoId: "ethereum" },
  { symbol: "ARB", label: "Arbitrum", coingeckoId: "ethereum" },
  { symbol: "OP", label: "Optimism", coingeckoId: "ethereum" },
  { symbol: "SOL", label: "Solana", coingeckoId: "solana" },
  { symbol: "BNB", label: "BNB Chain", coingeckoId: "binancecoin" },
  { symbol: "AVAX", label: "Avalanche", coingeckoId: "avalanche-2" },
  { symbol: "ABS", label: "Abstract", coingeckoId: "ethereum" },
  { symbol: "APE", label: "ApeChain", coingeckoId: "apecoin" },
  { symbol: "SON", label: "Soneium", coingeckoId: "ethereum" },
  { symbol: "MON", label: "Monad", coingeckoId: "ethereum" },
] as const;

export type ChainSymbol = typeof CHAIN_LIST[number]["symbol"];

const COINGECKO_IDS = [...new Set(CHAIN_LIST.map((c) => c.coingeckoId))];

const SYMBOL_TO_ID: Record<string, string> = {};
for (const chain of CHAIN_LIST) {
  SYMBOL_TO_ID[chain.symbol] = chain.coingeckoId;
}

let cachedPrices: Record<string, number> | null = null;
let lastFetch = 0;

export function useCryptoPrices() {
  const [prices, setPrices] = useState<Record<string, number>>(cachedPrices || {});

  useEffect(() => {
    const now = Date.now();
    if (cachedPrices && now - lastFetch < 5 * 60 * 1000) {
      setPrices(cachedPrices);
      return;
    }

    const ids = COINGECKO_IDS.join(",");
    fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`)
      .then((r) => r.json())
      .then((data) => {
        const result: Record<string, number> = {};
        for (const chain of CHAIN_LIST) {
          result[chain.symbol] = data[chain.coingeckoId]?.usd ?? 0;
        }
        cachedPrices = result;
        lastFetch = Date.now();
        setPrices(result);
      })
      .catch(() => {});
  }, []);

  return prices;
}

export function getUsdValue(
  price: number,
  currency: string,
  prices: Record<string, number>
): string | null {
  const rate = prices[currency];
  if (!rate) return null;
  const usd = price * rate;
  return usd < 0.01 ? "<$0.01" : `$${usd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}