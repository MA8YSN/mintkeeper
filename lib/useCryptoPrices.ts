import { useEffect, useState } from "react";

export const CHAIN_LIST = [
  { symbol: "ETH",       label: "Ethereum",        coingeckoId: "ethereum" },
  { symbol: "SOL",       label: "Solana",           coingeckoId: "solana"   },
  { symbol: "ROBINHOOD", label: "Robinhood Chain",  coingeckoId: "ethereum" },
] as const;

export type ChainSymbol = typeof CHAIN_LIST[number]["symbol"];

const UNIQUE_IDS = [...new Set(CHAIN_LIST.map((c) => c.coingeckoId))];

let cachedPrices: Record<string, number> | null = null;
let lastFetch = 0;

export function useCryptoPrices(): Record<string, number> {
  const [prices, setPrices] = useState<Record<string, number>>(cachedPrices ?? {});

  useEffect(() => {
    const now = Date.now();
    if (cachedPrices && now - lastFetch < 5 * 60 * 1000) {
      setPrices(cachedPrices);
      return;
    }

    const ids = UNIQUE_IDS.join(",");
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
  return usd < 0.01
    ? "<$0.01"
    : `$${usd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}