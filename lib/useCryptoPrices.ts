import { useEffect, useState } from "react";

const CURRENCIES = ["ethereum", "solana", "matic-network", "bitcoin", "binancecoin", "avalanche-2", "sui", "apecoin"];

const SYMBOL_MAP: Record<string, string> = {
  ETH: "ethereum",
  SOL: "solana",
  POL: "matic-network",
  BTC: "bitcoin",
  BNB: "binancecoin",
  AVAX: "avalanche-2",
  SUI: "sui",
  APE: "apecoin",
};

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

    const ids = CURRENCIES.join(",");
    fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`)
      .then((r) => r.json())
      .then((data) => {
        const result: Record<string, number> = {};
        for (const [symbol, id] of Object.entries(SYMBOL_MAP)) {
          result[symbol] = data[id]?.usd ?? 0;
        }
        cachedPrices = result;
        lastFetch = Date.now();
        setPrices(result);
      })
      .catch(() => {});
  }, []);

  return prices;
}

export function getUsdValue(price: number, currency: string, prices: Record<string, number>): string | null {
  const rate = prices[currency];
  if (!rate) return null;
  const usd = price * rate;
  return usd < 0.01 ? "<$0.01" : `$${usd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}