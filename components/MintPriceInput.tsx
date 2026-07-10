"use client";
import { useState, useRef, useEffect } from "react";
import { ChainBadge, CHAINS, CHAIN_LABELS, type Chain } from "./ChainBadge";
import { useCryptoPrices, getUsdValue } from "@/lib/useCryptoPrices";

interface MintPriceInputProps {
  price: string;
  currency: string;
  onPriceChange: (val: string) => void;
  onCurrencyChange: (val: string) => void;
}

export function MintPriceInput({ price, currency, onPriceChange, onCurrencyChange }: MintPriceInputProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const cryptoPrices = useCryptoPrices();

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const usd = price && cryptoPrices[currency]
    ? getUsdValue(parseFloat(price), currency, cryptoPrices)
    : null;

  return (
    <div className="space-y-1.5">
      <div className="flex overflow-hidden rounded-xl border border-zinc-700 bg-zinc-800/60 transition-all focus-within:border-emerald-500/50 focus-within:ring-2 focus-within:ring-emerald-500/20">
        <input
          type="number"
          step="any"
          min="0"
          value={price}
          onChange={(e) => onPriceChange(e.target.value)}
          placeholder="0.00"
          className="flex-1 bg-transparent px-4 py-3 text-sm text-white placeholder:text-zinc-500 focus:outline-none"
        />

        <div className="relative" ref={ref}>
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="flex h-full items-center gap-2 border-l border-zinc-700 bg-zinc-800 px-3 py-3 transition-colors hover:bg-zinc-700"
          >
            <ChainBadge chain={currency as Chain} showLabel={true} size={18} />
            <svg className={`h-3 w-3 text-zinc-400 transition-transform ${open ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m19 9-7 7-7-7" />
            </svg>
          </button>

          {open && (
            <div className="absolute right-0 top-full z-50 mt-1 w-52 overflow-hidden rounded-xl border border-zinc-700 bg-zinc-900 shadow-2xl shadow-black/50">
              {CHAINS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => { onCurrencyChange(c); setOpen(false); }}
                  className={`flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-zinc-800 ${currency === c ? "bg-zinc-800" : ""}`}
                >
                  <ChainBadge chain={c} showLabel={false} size={22} />
                  <div>
                    <p className="text-sm font-medium text-white">{c}</p>
                    <p className="text-xs text-zinc-500">{CHAIN_LABELS[c]}</p>
                  </div>
                  {currency === c && (
                    <svg className="ml-auto h-4 w-4 text-emerald-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {usd && (
        <p className="px-1 text-xs text-zinc-500">
          ≈ <span className="text-emerald-400">{usd}</span> USD
        </p>
      )}
    </div>
  );
}