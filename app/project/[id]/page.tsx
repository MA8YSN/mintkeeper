"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { MintPriceInput } from "@/components/MintPriceInput";
type WlStatus = "FCFS" | "GTD";

type Wallet = {
  id: string;
  name: string;
  address: string;
};

type Project = {
  id: string;
  name: string;
  wl_status: WlStatus;
  mint_date: string;
  wallet_id: string | null;
  minted: boolean;
  image_url: string | null;
  notes: string | null;
  x_link: string | null;
  discord_link: string | null;
mint_price: number | null;
mint_currency: string | null;
created_at: string;
wallets?: Wallet | null;
};

const statusStyles = {
  GTD: "bg-emerald-500/10 text-emerald-400 ring-emerald-500/20",
  FCFS: "bg-amber-500/10 text-amber-400 ring-amber-500/20",
} as const;

function formatMintDate(isoDate: string): string {
  if (!isoDate) return "";
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-US", {
    month: "long", day: "numeric", year: "numeric",
  });
}

function getDaysRemaining(isoDate: string): number {
  if (!isoDate) return 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [year, month, day] = isoDate.split("-").map(Number);
  const mint = new Date(year, month - 1, day);
  return Math.max(0, Math.ceil((mint.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
}

function cleanOptionalText(value: string | null | undefined): string {
  const text = (value ?? "").trim();
  return ["null", "nullable", "undefined"].includes(text.toLowerCase()) ? "" : text;
}

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
const [notes, setNotes] = useState("");
const [xLink, setXLink] = useState("");
const [discordLink, setDiscordLink] = useState("");
const [savingNotes, setSavingNotes] = useState(false);
const [savingLinks, setSavingLinks] = useState(false);
const [deleteConfirm, setDeleteConfirm] = useState(false);
const [mintPrice, setMintPrice] = useState("");
const [mintCurrency, setMintCurrency] = useState("ETH");
const [savingMint, setSavingMint] = useState(false);


  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*, wallets(id, name, address)")
        .eq("id", id)
        .single();
      if (error) { console.error("Load error:", error.message); setLoading(false); return; }
      if (data) {
  setProject(data);
  setNotes(cleanOptionalText(data.notes));
  setXLink(cleanOptionalText(data.x_link));
  setDiscordLink(cleanOptionalText(data.discord_link));
  setMintPrice(data.mint_price?.toString() || "");
  setMintCurrency(data.mint_currency || "ETH");
  
}
      setLoading(false);
    };
    load();
  }, [id]);

  const handleSaveNotes = async () => {
    if (!project) return;
    setSavingNotes(true);
    const cleanNotes = cleanOptionalText(notes);
    const { error } = await supabase.from("projects").update({ notes: cleanNotes || null }).eq("id", project.id);
    if (error) console.error("Notes error:", error.message);
    else {
      setNotes(cleanNotes);
      setProject((p) => p ? { ...p, notes: cleanNotes || null } : p);
    }
    setSavingNotes(false);
  };
const handleSaveLinks = async () => {
  if (!project) return;
  setSavingLinks(true);
  const cleanXLink = cleanOptionalText(xLink);
  const cleanDiscordLink = cleanOptionalText(discordLink);
  const { error } = await supabase.from("projects").update({ x_link: cleanXLink || null, discord_link: cleanDiscordLink || null }).eq("id", project.id);
  if (error) console.error("Links error:", error.message);
  else {
    setXLink(cleanXLink);
    setDiscordLink(cleanDiscordLink);
    setProject((p) => p ? { ...p, x_link: cleanXLink || null, discord_link: cleanDiscordLink || null } : p);
  }
  setSavingLinks(false);
};
const handleSaveMint = async () => {
  if (!project) return;
  setSavingMint(true);
  const { error } = await supabase.from("projects").update({
    mint_price: mintPrice ? parseFloat(mintPrice) : null,
    mint_currency: mintCurrency,
    
  }).eq("id", project.id);
  if (error) console.error("Mint error:", error.message);
  else setProject((p) => p ? {
    ...p,
    mint_price: mintPrice ? parseFloat(mintPrice) : null,
    mint_currency: mintCurrency,
    
  } : p);
  setSavingMint(false);
};
  const handleMarkAsMinted = async () => {
    if (!project) return;
    const { error } = await supabase.from("projects").update({ minted: true }).eq("id", project.id);
    if (error) { console.error("Minted error:", error.message); return; }
    setProject((p) => p ? { ...p, minted: true } : p);
  };

  const handleDelete = async () => {
    if (!project) return;
    const { error } = await supabase.from("projects").delete().eq("id", project.id);
    if (error) { console.error("Delete error:", error.message); return; }
    router.push("/");
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-700 border-t-emerald-400" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-zinc-950">
        <p className="text-zinc-400">Project not found.</p>
        <Link href="/" className="text-sm text-emerald-400 hover:text-emerald-300">← Back to Projects</Link>
      </div>
    );
  }

  const daysRemaining = getDaysRemaining(project.mint_date);

  return (
    <div className="relative min-h-screen bg-zinc-950">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(16,185,129,0.12),transparent)]" aria-hidden="true" />

      <div className="relative mx-auto max-w-3xl px-3 py-6 sm:px-6 sm:py-8 md:px-8">

        <Link href="/" className="mb-4 inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-300 transition-colors sm:mb-6">
          ← Back to Projects
        </Link>

        {project.image_url ? (
          <div className="mb-4 h-44 w-full overflow-hidden rounded-2xl sm:mb-6 sm:h-56 md:h-72">
            <img src={project.image_url} alt={project.name} className="h-full w-full object-cover" />
          </div>
        ) : (
          <div className="mb-4 flex h-44 w-full items-center justify-center rounded-2xl bg-gradient-to-br from-zinc-800 to-zinc-900 sm:mb-6 sm:h-56 md:h-72">
            <span className="text-4xl font-bold text-zinc-700 sm:text-6xl">{project.name.slice(0, 2).toUpperCase()}</span>
          </div>
        )}

        <div className="mb-6 flex flex-col gap-3 sm:mb-8 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-white sm:text-3xl">{project.name}</h1>
            {project.minted && (
              <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-zinc-700/50 px-3 py-1 text-xs font-medium text-zinc-400">
                ✓ Minted
              </span>
            )}
          </div>
          <span className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-medium ring-1 ring-inset ${statusStyles[project.wl_status]}`}>
            {project.wl_status}
          </span>
        </div>

        <div className="mb-6 grid gap-2 sm:mb-8 sm:gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-0.5 rounded-xl border border-zinc-800 bg-zinc-900/50 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4 sm:py-3.5">
            <span className="text-xs text-zinc-500 sm:text-sm">Mint Date</span>
            <span className="text-xs font-medium text-zinc-200 sm:text-sm">{formatMintDate(project.mint_date)}</span>
          </div>
          <div className="flex flex-col gap-0.5 rounded-xl border border-zinc-800 bg-zinc-900/50 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4 sm:py-3.5">
            <span className="text-xs text-zinc-500 sm:text-sm">Days Remaining</span>
            <span className="text-xs font-semibold text-emerald-400 sm:text-sm">{daysRemaining} days</span>
          </div>
          {project.wallets && (
            <div className="flex flex-col gap-0.5 rounded-xl border border-zinc-800 bg-zinc-900/50 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4 sm:py-3.5">
              <span className="text-xs text-zinc-500 sm:text-sm">Wallet</span>
              <span className="truncate text-xs font-medium text-zinc-200 sm:text-sm">{project.wallets.name}</span>
            </div>
          )}
          {project.wallets && (
            <div className="flex flex-col gap-0.5 rounded-xl border border-zinc-800 bg-zinc-900/50 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-2 sm:px-4 sm:py-3.5">
              <span className="shrink-0 text-xs text-zinc-500 sm:text-sm">Address</span>
              <span className="font-mono text-[11px] text-zinc-400 sm:text-xs">
                {project.wallets.address.slice(0, 6)}...{project.wallets.address.slice(-4)}
              </span>
            </div>
          )}
          <div className="flex flex-col gap-0.5 rounded-xl border border-zinc-800 bg-zinc-900/50 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4 sm:py-3.5">
            <span className="text-xs text-zinc-500 sm:text-sm">Status</span>
            <span className={`text-xs font-medium sm:text-sm ${project.minted ? "text-zinc-500" : "text-emerald-400"}`}>
              {project.minted ? "Minted" : "Active"}
            </span>
          </div>
          <div className="flex flex-col gap-0.5 rounded-xl border border-zinc-800 bg-zinc-900/50 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4 sm:py-3.5">
            <span className="text-xs text-zinc-500 sm:text-sm">Added</span>
            <span className="text-xs text-zinc-400 sm:text-sm">
              {new Date(project.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </span>
          </div>
        </div>

        
          <div className="mb-8">
  <h2 className="mb-3 text-sm font-medium uppercase tracking-wider text-zinc-500">Quick Links</h2>
  <div className="space-y-3">
    <div>
      <label className="mb-1.5 block text-xs font-medium text-zinc-500">X / Twitter URL</label>
      <input
        type="text"
        value={xLink}
        onChange={(e) => setXLink(e.target.value)}
        placeholder="https://x.com/..."
        className="w-full rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-sm text-white placeholder:text-zinc-600 transition-colors focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
      />
    </div>
    <div>
      <label className="mb-1.5 block text-xs font-medium text-zinc-500">Discord URL</label>
      <input
        type="text"
        value={discordLink}
        onChange={(e) => setDiscordLink(e.target.value)}
        placeholder="https://discord.gg/..."
        className="w-full rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-sm text-white placeholder:text-zinc-600 transition-colors focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
      />
    </div>
    <div className="flex flex-wrap gap-2 sm:gap-3">
      <button
        type="button"
        onClick={handleSaveLinks}
        disabled={savingLinks}
        className="rounded-lg bg-zinc-800 px-3 py-2 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-700 hover:text-white disabled:opacity-40 sm:px-4"
      >
        {savingLinks ? "Saving..." : "Save Links"}
      </button>
      {xLink && (
        <a href={xLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-2 text-sm font-medium text-zinc-300 hover:text-white transition-colors sm:px-4">
          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.253 5.622 5.911-5.622Zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
          Open X
        </a>
      )}
      {discordLink && (
        <a href={discordLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-2 text-sm font-medium text-zinc-300 hover:text-white transition-colors sm:px-4">
          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.002.022.015.045.03.056a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" /></svg>
          Open Discord
        </a>
      )}
    </div>
  </div>
</div>
       <div className="mb-8">
  <h2 className="mb-3 text-sm font-medium uppercase tracking-wider text-zinc-500">Mint Price</h2>
  <div className="space-y-3">
    <MintPriceInput
      price={mintPrice}
      currency={mintCurrency}
      onPriceChange={setMintPrice}
      onCurrencyChange={setMintCurrency}
    />
    <button
      type="button"
      onClick={handleSaveMint}
      disabled={savingMint}
      className="rounded-lg bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-700 hover:text-white disabled:opacity-40"
    >
      {savingMint ? "Saving..." : "Save Mint Price"}
    </button>
  </div>
</div>

        <div className="mb-8">
          <h2 className="mb-3 text-sm font-medium uppercase tracking-wider text-zinc-500">Notes</h2>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={handleSaveNotes}
            placeholder="Add notes about this project..."
            rows={4}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-sm text-white placeholder:text-zinc-600 transition-colors focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 resize-none"
          />
          <button
            type="button"
            onClick={handleSaveNotes}
            disabled={savingNotes}
            className="mt-2 rounded-lg bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-700 hover:text-white disabled:opacity-40"
          >
            {savingNotes ? "Saving..." : "Save Notes"}
          </button>
        </div>

        <div className="mb-8 flex flex-col gap-3 sm:flex-row">
          {!project.minted && (
            <button
              type="button"
              onClick={handleMarkAsMinted}
              className="flex-1 rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-zinc-950 shadow-lg shadow-emerald-500/20 transition-all hover:bg-emerald-400"
            >
              ✓ Mark as Minted
            </button>
          )}
          <button
            type="button"
            onClick={() => setDeleteConfirm(true)}
            className="flex-1 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm font-semibold text-red-400 transition-colors hover:bg-red-500/10"
          >
            Delete Project
          </button>
        </div>

      </div>

      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="alertdialog" aria-modal="true">
          <button type="button" className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setDeleteConfirm(false)} />
          <div className="relative w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl">
            <h2 className="text-lg font-semibold text-white">Delete this project?</h2>
            <p className="mt-2 text-sm text-zinc-400">This action cannot be undone.</p>
            <div className="mt-6 flex gap-3">
              <button type="button" onClick={() => setDeleteConfirm(false)} className="flex-1 rounded-xl border border-zinc-700 bg-zinc-800/50 px-4 py-2.5 text-sm font-medium text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors">Cancel</button>
              <button type="button" onClick={handleDelete} className="flex-1 rounded-xl bg-red-500/90 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-500 transition-colors">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
