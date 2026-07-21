"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";

type Wallet = {
  id: string;
  name: string;
  address: string;
  blockchain: string;
  notes: string | null;
  created_at: string;
};

type FormState = {
  name: string;
  address: string;
  blockchain: string;
  notes: string;
};

const BLOCKCHAINS = [
  "ETH", "SOL","BASE","ETHr", "BNB", "ABS", 
];

const emptyForm: FormState = { name: "", address: "", blockchain: "ETH", notes: "" };

const inputClassName = "w-full rounded-lg border border-zinc-700 bg-zinc-800/60 px-3.5 py-2.5 text-sm text-white placeholder:text-zinc-500 transition-colors focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20";

const CHAIN_COLORS: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  ETH:  { bg: "bg-blue-500/10",    text: "text-blue-400",    border: "border-blue-500/20",    dot: "bg-blue-400" },
  SOL:  { bg: "bg-purple-500/10",  text: "text-purple-400",  border: "border-purple-500/20",  dot: "bg-purple-400" },
  POL:  { bg: "bg-violet-500/10",  text: "text-violet-400",  border: "border-violet-500/20",  dot: "bg-violet-400" },
  BASE: { bg: "bg-blue-600/10",    text: "text-blue-300",    border: "border-blue-600/20",    dot: "bg-blue-300" },
};

function ChainIcon({ chain, size = 20 }: { chain: string; size?: number }) {
  const colors = CHAIN_COLORS[chain];
  const dot = colors?.dot ?? "bg-zinc-400";

  if (chain === "ETH" || chain === "BASE" || chain === "ARB" || chain === "ABS" || chain === "MON") {
    const c = chain === "ETH" ? "#627EEA" : chain === "BASE" ? "#0052FF" : chain === "ARB" ? "#28A0F0" : chain === "MON" ? "#836EF9" : "#627EEA";
    return (
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
        <circle cx="16" cy="16" r="16" fill={c} fillOpacity="0.15" />
        <path d="M16 6l-6.5 10.5L16 20l6.5-3.5L16 6z" fill={c} opacity="0.8" />
        <path d="M16 20l-6.5-3.5L16 26l6.5-6.5L16 20z" fill={c} />
      </svg>
    );
  }
  if (chain === "SOL") return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <circle cx="16" cy="16" r="16" fill="#9945FF" fillOpacity="0.15" />
      <path d="M10 20h12l-2 2H8l2-2zM10 15h12l-2 2H8l2-2zM22 10H10l2-2h12l-2 2z" fill="#9945FF" />
    </svg>
  );
  if (chain === "OP") return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <circle cx="16" cy="16" r="16" fill="#FF0420" fillOpacity="0.15" />
      <circle cx="16" cy="16" r="7" fill="#FF0420" fillOpacity="0.8" />
    </svg>
  );
  if (chain === "BNB") return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <circle cx="16" cy="16" r="16" fill="#F3BA2F" fillOpacity="0.15" />
      <path d="M16 8l2 2-2 2-2-2 2-2zM10 14l2 2-2 2-2-2 2-2zM16 14l2 2-2 2-2-2 2-2zM22 14l2 2-2 2-2-2 2-2zM16 20l2 2-2 2-2-2 2-2z" fill="#F3BA2F" />
    </svg>
  );
  const color = chain === "POL" ? "#8247E5" : chain === "AVAX" ? "#E84142" : chain === "APE" ? "#0054F9" : chain === "SON" ? "#888" : "#888";
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <circle cx="16" cy="16" r="16" fill={color} fillOpacity="0.15" />
      <circle cx="16" cy="16" r="7" fill={color} fillOpacity="0.8" />
    </svg>
  );
}

function truncateAddress(address: string): string {
  if (address.length <= 16) return address;
  return `${address.slice(0, 6)}...${address.slice(-6)}`;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      type="button"
      onClick={handleCopy}
      className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-300"
      title="Copy address"
    >
      {copied ? (
        <>
          <svg className="h-3 w-3 text-emerald-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
          </svg>
          <span className="text-emerald-400">Copied</span>
        </>
      ) : (
        <>
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0 0 13.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 0 1-.75.75H9a.75.75 0 0 1-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 0 1 1.927-.184" />
          </svg>
          Copy
        </>
      )}
    </button>
  );
}

function CloseIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
    </svg>
  );
}

export default function WalletsPage() {
  const { user, isLoaded } = useUser();
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [projectCounts, setProjectCounts] = useState<Record<string, number>>({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editWallet, setEditWallet] = useState<Wallet | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isLoaded || !user) return;
    const load = async () => {
      const { data } = await supabase
        .from("wallets")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (data) {
        setWallets(data);
        const { data: pw } = await supabase
          .from("project_wallets")
          .select("wallet_id")
          .eq("user_id", user.id);
        if (pw) {
          const counts: Record<string, number> = {};
          pw.forEach(({ wallet_id }) => {
            counts[wallet_id] = (counts[wallet_id] || 0) + 1;
          });
          setProjectCounts(counts);
        }
      }
    };
    load();
  }, [isLoaded, user]);

  const openAdd = () => { setEditWallet(null); setForm(emptyForm); setIsModalOpen(true); };
  const openEdit = (wallet: Wallet) => {
    setEditWallet(wallet);
    setForm({ name: wallet.name, address: wallet.address, blockchain: wallet.blockchain, notes: wallet.notes || "" });
    setIsModalOpen(true);
  };
  const closeModal = () => { setIsModalOpen(false); setEditWallet(null); setForm(emptyForm); };

  const handleSave = async () => {
    if (!form.name.trim() || !form.address.trim() || !user) return;
    setSaving(true);
    if (editWallet) {
      const { data, error } = await supabase
        .from("wallets")
        .update({ name: form.name.trim(), address: form.address.trim(), blockchain: form.blockchain, notes: form.notes.trim() || null })
        .eq("id", editWallet.id)
        .select().single();
      if (!error && data) setWallets((prev) => prev.map((w) => w.id === editWallet.id ? data : w));
    } else {
      const { data, error } = await supabase
        .from("wallets")
        .insert([{ name: form.name.trim(), address: form.address.trim(), blockchain: form.blockchain, notes: form.notes.trim() || null, user_id: user.id }])
        .select().single();
      if (!error && data) setWallets((prev) => [data, ...prev]);
    }
    setSaving(false);
    closeModal();
  };

  const handleDelete = async () => {
    if (!deleteTargetId) return;
    const { error } = await supabase.from("wallets").delete().eq("id", deleteTargetId);
    if (!error) setWallets((prev) => prev.filter((w) => w.id !== deleteTargetId));
    setDeleteTargetId(null);
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-zinc-950">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(16,185,129,0.15),transparent)]" aria-hidden="true" />
      <div className="pointer-events-none absolute -right-32 top-1/3 h-96 w-96 rounded-full bg-emerald-500/5 blur-3xl" aria-hidden="true" />

      <div className="relative mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-10">
          <div>
            <Link href="/" className="mb-4 inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-300 transition-colors">
              ← Back to Projects
            </Link>
            <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">Wallets</h1>
            <p className="mt-2 text-base text-zinc-400">
              {wallets.length} wallet{wallets.length !== 1 ? "s" : ""} saved
            </p>
          </div>
          <button
            type="button"
            onClick={openAdd}
            className="inline-flex shrink-0 items-center justify-center gap-2 self-start rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-zinc-950 shadow-lg shadow-emerald-500/20 transition-all hover:bg-emerald-400 hover:shadow-emerald-400/30 active:scale-[0.98]"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Add Wallet
          </button>
        </header>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
          {wallets.map((wallet) => {
            const chain = CHAIN_COLORS[wallet.blockchain] ?? { bg: "bg-zinc-700/30", text: "text-zinc-300", border: "border-zinc-600/30", dot: "bg-zinc-400" };
            const projectCount = projectCounts[wallet.id] ?? 0;
            return (
              <div
                key={wallet.id}
                className="group relative flex flex-col gap-4 rounded-2xl border border-zinc-800/80 bg-zinc-900/50 p-5 backdrop-blur-sm transition-all duration-300 hover:border-emerald-500/30 hover:bg-zinc-900/80 hover:shadow-xl hover:shadow-emerald-500/5"
              >
                {/* Top Row */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <ChainIcon chain={wallet.blockchain} size={36} />
                    <div className="min-w-0">
                      <p className="text-base font-semibold text-white truncate group-hover:text-emerald-50 transition-colors">
                        {wallet.name}
                      </p>
                      <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium mt-0.5 ${chain.bg} ${chain.text} ${chain.border}`}>
                        {wallet.blockchain}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => openEdit(wallet)}
                      className="rounded-lg p-2 text-zinc-500 transition-all hover:bg-emerald-500/10 hover:text-emerald-400 hover:scale-110"
                      title="Edit wallet"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTargetId(wallet.id)}
                      className="rounded-lg p-2 text-zinc-500 transition-all hover:bg-red-500/10 hover:text-red-400 hover:scale-110"
                      title="Delete wallet"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Address Row */}
                <div className="flex items-center justify-between gap-2 rounded-lg bg-zinc-800/40 px-3 py-2">
                  <p className="font-mono text-xs text-zinc-400 truncate">
                    {truncateAddress(wallet.address)}
                  </p>
                  <CopyButton text={wallet.address} />
                </div>

                {/* Notes */}
                {wallet.notes && (
                  <p className="text-xs text-zinc-500 line-clamp-2">{wallet.notes}</p>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between pt-1 border-t border-zinc-800/60">
                  <p className="text-xs text-zinc-600">
                    {projectCount === 0
                      ? "Not used by any project"
                      : `Used by ${projectCount} project${projectCount !== 1 ? "s" : ""}`}
                  </p>
                </div>
              </div>
            );
          })}

          {wallets.length === 0 && (
            <div className="col-span-full rounded-2xl border border-dashed border-zinc-800 p-16 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-zinc-800/50">
                <svg className="h-6 w-6 text-zinc-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 0 0-2.25-2.25H15a3 3 0 1 1-6 0H5.25A2.25 2.25 0 0 0 3 12m18 0v6a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 18v-6m18 0V9M3 12V9m18-3a2.25 2.25 0 0 0-2.25-2.25H5.25A2.25 2.25 0 0 0 3 9m18 0V6a2.25 2.25 0 0 0-2.25-2.25H5.25A2.25 2.25 0 0 0 3 6v3" />
                </svg>
              </div>
              <p className="text-sm font-medium text-zinc-500">No wallets yet</p>
              <p className="mt-1 text-xs text-zinc-600">Add your first wallet to start tracking mints.</p>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirm */}
      {deleteTargetId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="alertdialog" aria-modal="true">
          <button type="button" className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setDeleteTargetId(null)} />
          <div className="relative w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl shadow-black/50">
            <h2 className="text-lg font-semibold text-white">Delete this wallet?</h2>
            <p className="mt-2 text-sm text-zinc-400">Projects using this wallet will have it unassigned.</p>
            <div className="mt-6 flex gap-3">
              <button type="button" onClick={() => setDeleteTargetId(null)} className="flex-1 rounded-xl border border-zinc-700 bg-zinc-800/50 px-4 py-2.5 text-sm font-medium text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors">Cancel</button>
              <button type="button" onClick={handleDelete} className="flex-1 rounded-xl bg-red-500/90 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-500 transition-colors">Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <button type="button" className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
              <h2 className="text-lg font-semibold text-white">{editWallet ? "Edit Wallet" : "Add Wallet"}</h2>
              <button type="button" onClick={closeModal} className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors">
                <CloseIcon />
              </button>
            </div>
            <form className="space-y-4 px-6 py-5" onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-zinc-300">Wallet Name</label>
                <input type="text" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="e.g. Main Wallet" className={inputClassName} autoFocus />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-zinc-300">Address</label>
                <input type="text" value={form.address} onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))} placeholder="0x..." className={inputClassName} />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-zinc-300">Blockchain</label>
                <select value={form.blockchain} onChange={(e) => setForm((p) => ({ ...p, blockchain: e.target.value }))} className={`${inputClassName} cursor-pointer`}>
                  {BLOCKCHAINS.map((b) => (<option key={b} value={b}>{b}</option>))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-zinc-300">Notes <span className="text-zinc-600">(optional)</span></label>
                <textarea value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} placeholder="e.g. Main minting wallet" rows={2} className={`${inputClassName} resize-none`} />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={closeModal} className="flex-1 rounded-xl border border-zinc-700 bg-zinc-800/50 px-4 py-2.5 text-sm font-medium text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors">Cancel</button>
                <button type="submit" disabled={saving || !form.name.trim() || !form.address.trim()} className="flex-1 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-zinc-950 shadow-lg shadow-emerald-500/20 hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
                  {saving ? "Saving..." : editWallet ? "Save Changes" : "Add Wallet"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}