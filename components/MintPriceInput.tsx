"use client";
import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { ChainBadge } from "./ChainBadge";
import { useCryptoPrices, getUsdValue } from "@/lib/useCryptoPrices";

const CHAINS = [
  { symbol: "ETH",       label: "Ethereum"       },
  { symbol: "SOL",       label: "Solana"          },
  { symbol: "ROBINHOOD", label: "Robinhood Chain" },
] as const;

type ChainSymbol = typeof CHAINS[number]["symbol"];

interface MintPriceInputProps {
  price: string;
  currency: string;
  onPriceChange: (val: string) => void;
  onCurrencyChange: (val: string) => void;
}

export function MintPriceInput({
  price,
  currency,
  onPriceChange,
  onCurrencyChange,
}: MintPriceInputProps) {
  const [open, setOpen] = useState(false);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const cryptoPrices = useCryptoPrices();

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (buttonRef.current && !buttonRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleOpen = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPos({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
      });
    }
    setOpen((o) => !o);
  };

  const usd =
    price && cryptoPrices[currency]
      ? getUsdValue(parseFloat(price), currency, cryptoPrices)
      : null;

  const selectedChain = CHAINS.find((c) => c.symbol === currency) ?? CHAINS[0];

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

        <button
          ref={buttonRef}
          type="button"
          onClick={handleOpen}
          className="flex h-full items-center gap-2 border-l border-zinc-700 bg-zinc-800 px-3 py-3 transition-colors hover:bg-zinc-700"
        >
          <ChainBadge chain={selectedChain.symbol} showLabel={true} size={18} />
          <svg
            className={`h-3 w-3 text-zinc-400 transition-transform ${open ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="m19 9-7 7-7-7" />
          </svg>
        </button>
      </div>

      {usd && (
        <p className="px-1 text-xs text-zinc-500">
          ≈ <span className="text-emerald-400">{usd}</span> USD
        </p>
      )}

      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            style={{
              position: "absolute",
              top: dropdownPos.top,
              left: dropdownPos.left,
              width: 200,
              zIndex: 9999,
            }}
            className="overflow-hidden rounded-xl border border-zinc-700 bg-zinc-900 shadow-2xl shadow-black/50"
          >
            {CHAINS.map((c) => (
              <button
                key={c.symbol}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  onCurrencyChange(c.symbol);
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-zinc-800 ${
                  currency === c.symbol ? "bg-zinc-800/80" : ""
                }`}
              >
                <ChainBadge chain={c.symbol} showLabel={false} size={22} />
                <div>
                  <p className="text-sm font-medium text-white">{c.symbol}</p>
                  <p className="text-xs text-zinc-500">{c.label}</p>
                </div>
                {currency === c.symbol && (
                  <svg
                    className="ml-auto h-4 w-4 shrink-0 text-emerald-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                  </svg>
                )}
              </button>
            ))}
          </div>,
          document.body
        )}
    </div>
  );
}