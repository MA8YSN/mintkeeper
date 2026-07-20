"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { MintPriceInput } from "@/components/MintPriceInput";
import { useCryptoPrices, getUsdValue } from "@/lib/useCryptoPrices";

type WlStatus = "FCFS" | "GTD";

type Wallet = {
  id: string;
  name: string;
  address: string | null;
};

type Project = {
  id: string;
  name: string;
  wl_status: WlStatus;
  mint_date: string | null;
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

type SaveStatus = "idle" | "saving" | "saved" | "error";

const statusStyles = {
  GTD: "bg-emerald-500/10 text-emerald-400 ring-emerald-500/20",
  FCFS: "bg-amber-500/10 text-amber-400 ring-amber-500/20",
} as const;

function formatMintDate(isoDate: string | null): string {
  if (!isoDate) return "Not set";

  const [year, month, day] = isoDate.split("-").map(Number);

  return new Date(year, month - 1, day).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function getDaysRemaining(isoDate: string | null): number | null {
  if (!isoDate) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [year, month, day] = isoDate.split("-").map(Number);

  const mint = new Date(year, month - 1, day);

  return Math.max(
    0,
    Math.ceil((mint.getTime() - today.getTime()) / 86400000)
  );
}

function cleanOptionalText(val: string | null | undefined): string {
  if (!val) return "";
  if (["null", "nullable", "undefined"].includes(val.trim().toLowerCase())) return "";
  return val;
}

function SaveIndicator({ status, onRetry }: { status: SaveStatus; onRetry?: () => void }) {
  if (status === "idle") return null;
  return (
    <span className="text-xs transition-all">
      {status === "saving" && <span className="text-zinc-500">Saving...</span>}
      {status === "saved" && <span className="text-emerald-400">✓ Saved</span>}
      {status === "error" && (
        <span className="text-red-400">
          Failed to save.{" "}
          <button type="button" onClick={onRetry} className="underline hover:text-red-300">
            Retry
          </button>
        </span>
      )}
    </span>
  );
}

function useAutoSave(
  saveFn: () => Promise<void>,
  delay = 800
) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [status, setStatus] = useState<SaveStatus>("idle");

  const trigger = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setStatus("saving");
    timerRef.current = setTimeout(async () => {
      try {
        await saveFn();
        setStatus("saved");
        setTimeout(() => setStatus("idle"), 2000);
      } catch {
        setStatus("error");
      }
    }, delay);
  }, [saveFn, delay]);

  const retry = useCallback(async () => {
    setStatus("saving");
    try {
      await saveFn();
      setStatus("saved");
      setTimeout(() => setStatus("idle"), 2000);
    } catch {
      setStatus("error");
    }
  }, [saveFn]);

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  return { status, trigger, retry };
}

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState("");
  const [xLink, setXLink] = useState("");
  const [discordLink, setDiscordLink] = useState("");
  const [mintPrice, setMintPrice] = useState("");
  const [mintCurrency, setMintCurrency] = useState("ETH");
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const cryptoPrices = useCryptoPrices();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
  router.push("/sign-in");
  return;
}
    };
    checkAuth();
  }, []);

  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*, wallets(id, name, address)")
        .eq("id", id)
        .single();
      if (error) { console.error("Load error:", error.message); setLoading(false); return; }
      if (data) {
       setProject({
  ...data,

  wl_status:
    data.wl_status === "FCFS" || data.wl_status === "GTD"
      ? data.wl_status
      : "FCFS",

  mint_date: data.mint_date ?? null,

  notes: typeof data.notes === "string"
    ? cleanOptionalText(data.notes) || null
    : null,

  x_link: typeof data.x_link === "string"
    ? cleanOptionalText(data.x_link) || null
    : null,

  discord_link: typeof data.discord_link === "string"
    ? cleanOptionalText(data.discord_link) || null
    : null,

  wallets: Array.isArray(data.wallets)
    ? data.wallets[0] ?? null
    : data.wallets ?? null,
});
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

  // Auto-save functions
  const saveNotesFn = useCallback(async () => {
    if (!project) return;
    const { error } = await supabase.from("projects")
      .update({ notes: notes || null })
      .eq("id", project.id);
    if (error) throw error;
  }, [project, notes]);

  const saveLinksFn = useCallback(async () => {
    if (!project) return;
    const { error } = await supabase.from("projects")
      .update({ x_link: xLink || null, discord_link: discordLink || null })
      .eq("id", project.id);
    if (error) throw error;
  }, [project, xLink, discordLink]);

  const saveMintFn = useCallback(async () => {
    if (!project) return;
    const { error } = await supabase.from("projects")
      .update({
        mint_price: mintPrice ? parseFloat(mintPrice) : null,
        mint_currency: mintCurrency,
      })
      .eq("id", project.id);
    if (error) throw error;
  }, [project, mintPrice, mintCurrency]);

  const notesAutoSave = useAutoSave(saveNotesFn);
  const linksAutoSave = useAutoSave(saveLinksFn);
  const mintAutoSave = useAutoSave(saveMintFn);

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

      <div className="relative mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">

        <Link href="/" className="mb-6 inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-300 transition-colors">
          ← Back to Projects
        </Link>

        {project.image_url ? (
          <div className="mb-6 h-56 w-full overflow-hidden rounded-2xl sm:h-72">
            <img
  src={project.image_url || "/placeholder.png"}
  alt={project.name}
  className="h-full w-full object-cover"
/>
          </div>
        ) : (
          <div className="mb-6 flex h-56 w-full items-center justify-center rounded-2xl bg-gradient-to-br from-zinc-800 to-zinc-900 sm:h-72">
            <span className="text-6xl font-bold text-zinc-700">{project.name.slice(0, 2).toUpperCase()}</span>
          </div>
        )}

        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white">{project.name}</h1>
            {project.minted && (
              <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-zinc-700/50 px-3 py-1 text-xs font-medium text-zinc-400">
                ✓ Minted
              </span>
            )}
          </div>
          <span className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-medium ring-1 ring-inset ${
  statusStyles[project.wl_status as WlStatus] ?? statusStyles.FCFS
}`}>
            {project.wl_status}
          </span>
        </div>

        <div className="mb-8 grid gap-3 sm:grid-cols-2">
          <div className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3.5">
            <span className="text-sm text-zinc-500">Mint Date</span>
            <div className="text-right">
              <p className="text-sm font-medium text-zinc-200">
  {formatMintDate(project.mint_date)}
</p>

<p
  className={`text-xs font-semibold ${
    daysRemaining === null
      ? "text-zinc-500"
      : daysRemaining === 0
      ? "text-red-400"
      : "text-emerald-400"
  }`}
>
  {daysRemaining === null
    ? "No mint date"
    : daysRemaining === 0
    ? "Today"
    : `${daysRemaining} days left`}
</p>
            </div>
          </div>
          {project.wallets && (
            <div className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3.5">
              <span className="text-sm text-zinc-500">Wallet</span>
              <span className="text-sm font-medium text-zinc-200">{project.wallets.name}</span>
            </div>
          )}
          {project.wallets && (
  <div className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3.5">
    <span className="text-sm text-zinc-500">Address</span>

    <span className="font-mono text-xs text-zinc-400">
      {typeof project.wallets?.address === "string"
  ? `${project.wallets.address.slice(0,6)}...${project.wallets.address.slice(-4)}`
  : "No wallet"}
    </span>
  </div>
)}
          <div className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3.5">
            <span className="text-sm text-zinc-500">Status</span>
            <span className={`text-sm font-medium ${project.minted ? "text-zinc-500" : "text-emerald-400"}`}>
              {project.minted ? "Minted" : "Active"}
            </span>
          </div>
          <div className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3.5">
            <span className="text-sm text-zinc-500">Added</span>
            <span className="text-sm text-zinc-400">
              {project.created_at
  ? new Date(project.created_at).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  : "Unknown"}
            </span>
          </div>
        </div>

        {/* Mint Price */}
        <div className="mb-8">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-medium uppercase tracking-wider text-zinc-500">Mint Price</h2>
            <SaveIndicator status={mintAutoSave.status} onRetry={mintAutoSave.retry} />
          </div>
          <MintPriceInput
            price={mintPrice}
            currency={mintCurrency}
            onPriceChange={(v) => {
              setMintPrice(v);
              mintAutoSave.trigger();
            }}
            onCurrencyChange={(v) => {
              setMintCurrency(v);
              mintAutoSave.trigger();
            }}
          />
          {mintPrice && cryptoPrices[mintCurrency] && (
            <p className="mt-1.5 px-1 text-xs text-zinc-500">
              ≈ <span className="text-emerald-400">{getUsdValue(parseFloat(mintPrice), mintCurrency, cryptoPrices)}</span> USD
            </p>
          )}
        </div>

      

        {/* Notes */}
        <div className="mb-8">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-medium uppercase tracking-wider text-zinc-500">Notes</h2>
            <SaveIndicator status={notesAutoSave.status} onRetry={notesAutoSave.retry} />
          </div>
          <textarea
            value={notes}
            onChange={(e) => { setNotes(e.target.value); notesAutoSave.trigger(); }}
            placeholder="Add notes about this project..."
            rows={4}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-sm text-white placeholder:text-zinc-600 transition-colors focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 resize-none"
          />
        </div>

        {/* Actions */}
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