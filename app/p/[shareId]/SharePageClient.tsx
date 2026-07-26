"use client";
import { useState } from "react";
import Link from "next/link";
import type { PublicProject } from "@/lib/projectService";

type Props = {
  project: PublicProject;
  shareId: string;
};

function formatMintDate(isoDate: string | null): string {
  if (!isoDate) return "TBA";
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    month: "long", day: "numeric", year: "numeric",
  });
}

function getDaysLeft(isoDate: string | null): number | null {
  if (!isoDate) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [y, m, d] = isoDate.split("-").map(Number);
  const mint = new Date(y, m - 1, d);
  return Math.max(0, Math.ceil((mint.getTime() - today.getTime()) / 86400000));
}

export default function SharePageClient({ project, shareId }: Props) {
  const [importing, setImporting] = useState(false);
  const [imported, setImported] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const daysLeft = getDaysLeft(project.mint_date);

  const handleImport = async () => {
    setImporting(true);
    setError(null);
    try {
      const res = await fetch("/api/projects/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shareId }),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error ?? "Import failed");
      }
      setImported(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(16,185,129,0.12),transparent)]" />

      <div className="relative mx-auto max-w-2xl px-4 py-12 sm:px-6 lg:px-8">

        {/* Nav */}
        <div className="mb-8 flex items-center justify-between">
          <Link href="/" className="text-sm text-zinc-500 transition-colors hover:text-zinc-300">
            ← MintKeeper
          </Link>
          <span className="rounded-full border border-zinc-800 bg-zinc-900 px-3 py-1 text-xs text-zinc-500">
            Public Project
          </span>
        </div>

        {/* Banner */}
        {project.image_url ? (
          <div className="mb-6 h-52 w-full overflow-hidden rounded-2xl">
            <img src={project.image_url} alt={project.name} className="h-full w-full object-cover" />
          </div>
        ) : (
          <div className="mb-6 flex h-52 w-full items-center justify-center rounded-2xl bg-gradient-to-br from-zinc-800 to-zinc-900">
            <span className="text-6xl font-bold text-zinc-700">
              {project.name.slice(0, 2).toUpperCase()}
            </span>
          </div>
        )}

        {/* Header */}
        <div className="mb-8 flex items-start justify-between gap-4">
          <h1 className="text-3xl font-bold text-white">{project.name}</h1>
          <span className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-medium ring-1 ring-inset ${
            project.wl_status === "GTD"
              ? "bg-emerald-500/10 text-emerald-400 ring-emerald-500/20"
              : "bg-amber-500/10 text-amber-400 ring-amber-500/20"
          }`}>
            {project.wl_status}
          </span>
        </div>

        {/* Info grid */}
        <div className="mb-8 grid gap-3 sm:grid-cols-2">
          <div className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3.5">
            <span className="text-sm text-zinc-500">Mint Date</span>
            <div className="text-right">
              <p className="text-sm font-medium text-zinc-200">{formatMintDate(project.mint_date)}</p>
              {daysLeft !== null && (
                <p className={`text-xs font-semibold ${daysLeft === 0 ? "text-red-400" : "text-emerald-400"}`}>
                  {daysLeft === 0 ? "Today" : `${daysLeft} days left`}
                </p>
              )}
            </div>
          </div>

          {project.mint_price && (
            <div className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3.5">
              <span className="text-sm text-zinc-500">Mint Price</span>
              <span className="text-sm font-medium text-zinc-200">
                {project.mint_price} {project.mint_currency}
              </span>
            </div>
          )}
        </div>

        {/* Notes */}
        {project.notes && (
          <div className="mb-8 rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-4">
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-zinc-500">Notes</p>
            <p className="text-sm text-zinc-300 whitespace-pre-wrap">{project.notes}</p>
          </div>
        )}

        {/* Links */}
        {(project.x_link || project.discord_link) && (
          <div className="mb-8 flex gap-3">
            {project.x_link && (
              <a href={project.x_link} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-2.5 text-sm font-medium text-zinc-300 transition-colors hover:border-zinc-700 hover:text-white">
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.253 5.622 5.911-5.622Zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
                X / Twitter
              </a>
            )}
            {project.discord_link && (
              <a href={project.discord_link} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-2.5 text-sm font-medium text-zinc-300 transition-colors hover:border-zinc-700 hover:text-white">
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.002.022.015.045.03.056a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/>
                </svg>
                Discord
              </a>
            )}
          </div>
        )}

        {/* Import CTA */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
          <h2 className="mb-1 text-base font-semibold text-white">Track this project</h2>
          <p className="mb-4 text-sm text-zinc-400">
            Import into your MintKeeper to get reminders and track your mint.
          </p>

          {imported ? (
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-emerald-400">✓ Added to your dashboard</span>
              <Link href="/" className="text-sm text-zinc-500 underline hover:text-zinc-300">
                View dashboard
              </Link>
            </div>
          ) : (
            <>
              <button
                type="button"
                onClick={handleImport}
                disabled={importing}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-zinc-950 shadow-lg shadow-emerald-500/20 transition-all hover:bg-emerald-400 disabled:opacity-40 active:scale-[0.98]"
              >
                {importing ? "Importing..." : "Import to MintKeeper"}
              </button>
              {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
            </>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-zinc-700">
          Shared via MintKeeper · mintkeeper.app
        </p>
      </div>
    </div>
  );
}