"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { updateProject } from "@/lib/projectService";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
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
  user_id: string;
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
  original_project_id: string | null;
  created_at: string;
  wallets?: Wallet | null;
};

type SaveStatus = "idle" | "saving" | "saved" | "error";

const STATUS_STYLES = {
  GTD:  "bg-emerald-500/10 text-emerald-400 ring-emerald-500/20",
  FCFS: "bg-amber-500/10 text-amber-400 ring-amber-500/20",
} as const;

function formatMintDate(isoDate: string | null): string {
  if (!isoDate) return "Not set";
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    month: "long", day: "numeric", year: "numeric",
  });
}

function getDaysRemaining(isoDate: string | null): number | null {
  if (!isoDate) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [y, m, d] = isoDate.split("-").map(Number);
  return Math.max(0, Math.ceil((new Date(y, m - 1, d).getTime() - today.getTime()) / 86400000));
}

function cleanOptionalText(val: string | null | undefined): string {
  if (!val) return "";
  if (["null", "nullable", "undefined"].includes(val.trim().toLowerCase())) return "";
  return val;
}

function SaveIndicator({ status, onRetry }: { status: SaveStatus; onRetry?: () => void }) {
  if (status === "idle") return null;
  return (
    <span className="text-xs">
      {status === "saving" && <span className="text-zinc-500">Saving...</span>}
      {status === "saved"  && <span className="text-emerald-400">✓ Saved</span>}
      {status === "error"  && (
        <span className="text-red-400">
          Failed.{" "}
          <button type="button" onClick={onRetry} className="underline hover:text-red-300">Retry</button>
        </span>
      )}
    </span>
  );
}

function useAutoSave(saveFn: () => Promise<void>, delay = 800) {
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
    } catch { setStatus("error"); }
  }, [saveFn]);

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  return { status, trigger, retry };
}

// ── Read-only view ─────────────────────────────────────────────────────────────

function ReadOnlyView({
  project,
  cryptoPrices,
}: {
  project: Project;
  cryptoPrices: Record<string, number>;
}) {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const [importing, setImporting] = useState(false);
  const [importedId, setImportedId] = useState<string | null>(null);
  const [alreadyImported, setAlreadyImported] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const daysRemaining = getDaysRemaining(project.mint_date);

  useEffect(() => {
    if (!isLoaded || !user) return;
    // Check if already imported
    supabase
      .from("projects")
      .select("id")
      .eq("user_id", user.id)
      .eq("original_project_id", project.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setAlreadyImported(true);
      });
  }, [isLoaded, user, project.id]);

  const handleImport = async () => {
    if (!user) {
      sessionStorage.setItem("mk_pending_import", project.id);
      router.push(`/sign-in?redirect_url=/project/${project.id}`);
      return;
    }
    setImporting(true);
    setError(null);
    try {
      const res = await fetch("/api/projects/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceProjectId: project.id }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Import failed");
      setImportedId(json.projectId);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-zinc-950">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(16,185,129,0.12),transparent)]" aria-hidden="true" />

      <div className="relative mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">

        <div className="mb-6 flex items-center justify-between">
          <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors">
            ← MintKeeper
          </Link>
          <span className="rounded-full border border-zinc-800 bg-zinc-900 px-3 py-1 text-xs text-zinc-500">
            Public Project
          </span>
        </div>

        {project.image_url ? (
          <div className="mb-6 h-56 w-full overflow-hidden rounded-2xl sm:h-72">
            <img src={project.image_url} alt={project.name} className="h-full w-full object-cover" />
          </div>
        ) : (
          <div className="mb-6 flex h-56 w-full items-center justify-center rounded-2xl bg-gradient-to-br from-zinc-800 to-zinc-900 sm:h-72">
            <span className="text-6xl font-bold text-zinc-700">{project.name.slice(0, 2).toUpperCase()}</span>
          </div>
        )}

        <div className="mb-8 flex items-start justify-between gap-4">
          <h1 className="text-3xl font-bold text-white">{project.name}</h1>
          <span className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-medium ring-1 ring-inset ${STATUS_STYLES[project.wl_status] ?? STATUS_STYLES.FCFS}`}>
            {project.wl_status}
          </span>
        </div>

        <div className="mb-8 grid gap-3 sm:grid-cols-2">
          <div className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3.5">
            <span className="text-sm text-zinc-500">Mint Date</span>
            <div className="text-right">
              <p className="text-sm font-medium text-zinc-200">{formatMintDate(project.mint_date)}</p>
              {daysRemaining !== null && (
                <p className={`text-xs font-semibold ${daysRemaining === 0 ? "text-red-400" : "text-emerald-400"}`}>
                  {daysRemaining === 0 ? "Today" : `${daysRemaining} days left`}
                </p>
              )}
            </div>
          </div>

          {project.mint_price && (
            <div className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3.5">
              <span className="text-sm text-zinc-500">Mint Price</span>
              <div className="text-right">
                <p className="text-sm font-medium text-zinc-200">
                  {project.mint_price} {project.mint_currency}
                </p>
                {project.mint_currency && cryptoPrices[project.mint_currency] && (
                  <p className="text-xs text-emerald-400">
                    ≈ {getUsdValue(project.mint_price, project.mint_currency, cryptoPrices)} USD
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3.5">
            <span className="text-sm text-zinc-500">Status</span>
            <span className="text-sm font-medium text-emerald-400">Active</span>
          </div>
        </div>

        {project.notes && (
          <div className="mb-8 rounded-xl border border-zinc-800 bg-zinc-900/50 px-5 py-4">
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-zinc-500">About</p>
            <p className="text-sm leading-relaxed text-zinc-300 whitespace-pre-wrap">{project.notes}</p>
          </div>
        )}

        {(project.x_link || project.discord_link) && (
          <div className="mb-8 flex flex-wrap gap-3">
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
          {importedId ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-emerald-400">✓ Added to your MintKeeper</p>
                <p className="text-xs text-zinc-500 mt-0.5">You'll be reminded before the mint date.</p>
              </div>
              <div className="flex gap-2">
                <Link href={`/project/${importedId}`}
                  className="rounded-xl border border-zinc-700 bg-zinc-800/50 px-4 py-2 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-white">
                  View Project
                </Link>
                <Link href="/"
                  className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-zinc-950 shadow-lg shadow-emerald-500/20 transition-all hover:bg-emerald-400">
                  Dashboard
                </Link>
              </div>
            </div>
          ) : alreadyImported ? (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-zinc-300">Already in your dashboard</p>
                <p className="text-xs text-zinc-500 mt-0.5">You've already imported this project.</p>
              </div>
              <Link href="/"
                className="rounded-xl border border-zinc-700 bg-zinc-800/50 px-4 py-2 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-white">
                Go to Dashboard
              </Link>
            </div>
          ) : (
            <>
              <h2 className="mb-1 text-base font-semibold text-white">Track this mint</h2>
              <p className="mb-4 text-sm text-zinc-400">
                Add to your MintKeeper to get reminders and never miss the mint.
              </p>
              <button type="button" onClick={handleImport} disabled={importing || !isLoaded}
                className="w-full rounded-xl bg-emerald-500 py-3 text-sm font-semibold text-zinc-950 shadow-lg shadow-emerald-500/20 transition-all hover:bg-emerald-400 disabled:opacity-40 active:scale-[0.98] sm:w-auto sm:px-8">
                {importing ? "Adding..." : "➕ Add to My MintKeeper"}
              </button>
              {!isLoaded || !user ? (
                <p className="mt-2 text-xs text-zinc-600">Sign in to import — your project will be saved automatically.</p>
              ) : null}
              {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
            </>
          )}
        </div>

      </div>
    </div>
  );
}

// ── Owner edit view ────────────────────────────────────────────────────────────

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);
  const [notes, setNotes] = useState("");
  const [xLink, setXLink] = useState("");
  const [discordLink, setDiscordLink] = useState("");
  const [mintPrice, setMintPrice] = useState("");
  const [mintCurrency, setMintCurrency] = useState("ETH");
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const cryptoPrices = useCryptoPrices();

  // Auto-import after sign-in redirect
  useEffect(() => {
    if (!isLoaded || !user) return;
    const pending = sessionStorage.getItem("mk_pending_import");
    if (!pending || pending !== id) return;
    sessionStorage.removeItem("mk_pending_import");
    fetch("/api/projects/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sourceProjectId: pending }),
    })
      .then((r) => r.json())
      .then((json) => { if (json.projectId) router.push(`/project/${json.projectId}`); })
      .catch(console.error);
  }, [isLoaded, user, id]);

  useEffect(() => {
    if (!isLoaded) return;
    const load = async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*, wallets(id, name, address)")
        .eq("id", id)
        .single();

      if (error || !data) { setLoading(false); return; }

      setProject(data as Project);
      setIsOwner(!!user && data.user_id === user.id);
      setNotes(cleanOptionalText(data.notes));
      setXLink(cleanOptionalText(data.x_link));
      setDiscordLink(cleanOptionalText(data.discord_link));
      setMintPrice(data.mint_price?.toString() || "");
      setMintCurrency(data.mint_currency || "ETH");
      setLoading(false);
    };
    load();
  }, [id, isLoaded, user]);

  const saveNotesFn = useCallback(async () => {
    if (!project || !user) return;
    await updateProject(user.id, project.id, { notes: notes || null });
  }, [project, user, notes]);

  const saveLinksFn = useCallback(async () => {
    if (!project || !user) return;
    await updateProject(user.id, project.id, {
      x_link: xLink || null,
      discord_link: discordLink || null,
    });
  }, [project, user, xLink, discordLink]);

  const saveMintFn = useCallback(async () => {
    if (!project || !user) return;
    await updateProject(user.id, project.id, {
      mint_price: mintPrice ? parseFloat(mintPrice) : null,
      mint_currency: mintCurrency,
    });
  }, [project, user, mintPrice, mintCurrency]);

  const notesAutoSave = useAutoSave(saveNotesFn);
  const linksAutoSave = useAutoSave(saveLinksFn);
  const mintAutoSave  = useAutoSave(saveMintFn);

  const handleMarkAsMinted = async () => {
    if (!project || !user) return;
    try {
      const updated = await updateProject(user.id, project.id, { minted: true });
      setProject((p) => p ? { ...p, ...updated } : p);
    } catch (err) { console.error("Minted error:", err); }
  };

  const handleDelete = async () => {
    if (!project || !user) return;
    const { error } = await supabase.from("projects").delete()
      .eq("id", project.id).eq("user_id", user.id);
    if (error) { console.error("Delete error:", error.message); return; }
    router.push("/");
  };

  if (loading || !isLoaded) {
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
        <Link href="/" className="text-sm text-emerald-400 hover:text-emerald-300">← Back</Link>
      </div>
    );
  }

  // Non-owner → read-only view
  if (!isOwner) {
    return <ReadOnlyView project={project} cryptoPrices={cryptoPrices} />;
  }

  // Owner → full edit view
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
            <img src={project.image_url} alt={project.name} className="h-full w-full object-cover" />
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
          <span className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-medium ring-1 ring-inset ${STATUS_STYLES[project.wl_status] ?? STATUS_STYLES.FCFS}`}>
            {project.wl_status}
          </span>
        </div>

        <div className="mb-8 grid gap-3 sm:grid-cols-2">
          <div className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3.5">
            <span className="text-sm text-zinc-500">Mint Date</span>
            <div className="text-right">
              <p className="text-sm font-medium text-zinc-200">{formatMintDate(project.mint_date)}</p>
              {daysRemaining !== null && (
                <p className={`text-xs font-semibold ${daysRemaining === 0 ? "text-red-400" : "text-emerald-400"}`}>
                  {daysRemaining === 0 ? "Today" : `${daysRemaining} days left`}
                </p>
              )}
            </div>
          </div>

          {project.wallets && (
            <div className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3.5">
              <span className="text-sm text-zinc-500">Wallet</span>
              <span className="text-sm font-medium text-zinc-200">{project.wallets.name}</span>
            </div>
          )}

          {project.wallets?.address && (
            <div className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3.5">
              <span className="text-sm text-zinc-500">Address</span>
              <span className="font-mono text-xs text-zinc-400">
                {project.wallets.address.slice(0, 6)}...{project.wallets.address.slice(-4)}
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
              {new Date(project.created_at).toLocaleDateString("en-US", {
                month: "short", day: "numeric", year: "numeric",
              })}
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
            onPriceChange={(v) => { setMintPrice(v); mintAutoSave.trigger(); }}
            onCurrencyChange={(v) => { setMintCurrency(v); mintAutoSave.trigger(); }}
          />
          {mintPrice && cryptoPrices[mintCurrency] && (
            <p className="mt-1.5 px-1 text-xs text-zinc-500">
              ≈ <span className="text-emerald-400">{getUsdValue(parseFloat(mintPrice), mintCurrency, cryptoPrices)}</span> USD
            </p>
          )}
        </div>

        {/* Quick Links */}
        <div className="mb-8">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-medium uppercase tracking-wider text-zinc-500">Quick Links</h2>
            <SaveIndicator status={linksAutoSave.status} onRetry={linksAutoSave.retry} />
          </div>
          <div className="space-y-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-500">X / Twitter URL</label>
              <input type="text" value={xLink}
                onChange={(e) => { setXLink(e.target.value); linksAutoSave.trigger(); }}
                placeholder="https://x.com/..."
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-sm text-white placeholder:text-zinc-600 transition-colors focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-500">Discord URL</label>
              <input type="text" value={discordLink}
                onChange={(e) => { setDiscordLink(e.target.value); linksAutoSave.trigger(); }}
                placeholder="https://discord.gg/..."
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-sm text-white placeholder:text-zinc-600 transition-colors focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
            </div>
            <div className="flex gap-3">
              {xLink && (
                <a href={xLink} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-2.5 text-sm font-medium text-zinc-300 transition-colors hover:border-zinc-700 hover:text-white">
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.253 5.622 5.911-5.622Zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                  </svg>
                  Open X
                </a>
              )}
              {discordLink && (
                <a href={discordLink} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-2.5 text-sm font-medium text-zinc-300 transition-colors hover:border-zinc-700 hover:text-white">
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.002.022.015.045.03.056a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/>
                  </svg>
                  Discord
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="mb-8">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-medium uppercase tracking-wider text-zinc-500">Notes</h2>
            <SaveIndicator status={notesAutoSave.status} onRetry={notesAutoSave.retry} />
          </div>
          <textarea value={notes}
            onChange={(e) => { setNotes(e.target.value); notesAutoSave.trigger(); }}
            placeholder="Add notes about this project..."
            rows={4}
            className="w-full resize-none rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-sm text-white placeholder:text-zinc-600 transition-colors focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
        </div>

        {/* Actions */}
        <div className="mb-8 flex flex-col gap-3 sm:flex-row">
          {!project.minted && (
            <button type="button" onClick={handleMarkAsMinted}
              className="flex-1 rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-zinc-950 shadow-lg shadow-emerald-500/20 transition-all hover:bg-emerald-400">
              ✓ Mark as Minted
            </button>
          )}
          <button type="button" onClick={() => setDeleteConfirm(true)}
            className="flex-1 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm font-semibold text-red-400 transition-colors hover:bg-red-500/10">
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
              <button type="button" onClick={() => setDeleteConfirm(false)}
                className="flex-1 rounded-xl border border-zinc-700 bg-zinc-800/50 px-4 py-2.5 text-sm font-medium text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors">
                Cancel
              </button>
              <button type="button" onClick={handleDelete}
                className="flex-1 rounded-xl bg-red-500/90 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-500 transition-colors">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}