"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

type Wallet = {
  id: string;
  name: string;
  address: string;
  created_at: string;
  user_id: string | null;
};

type FormState = {
  name: string;
  address: string;
};

const emptyForm: FormState = { name: "", address: "" };

const inputClassName =
  "w-full rounded-lg border border-zinc-700 bg-zinc-800/60 px-3.5 py-2.5 text-sm text-white placeholder:text-zinc-500 transition-colors focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20";

function PlusIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
    </svg>
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
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase.from("wallets").select("*").order("created_at", { ascending: false });
      if (error) { console.error("Load error:", error.message); return; }
      if (data) setWallets(data);
    };
    load();
  }, []);

  const handleSave = async () => {
    if (!form.name.trim() || !form.address.trim()) return;
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error("Insert error: no signed-in user");
      setSaving(false);
      return;
    }
    const { data, error } = await supabase
      .from("wallets")
      .insert([{ name: form.name.trim(), address: form.address.trim(), user_id: user.id }])
      .select()
      .single();
    setSaving(false);
    if (error) { console.error("Insert error:", error.message); return; }
    if (data) setWallets((prev) => [data, ...prev]);
    setIsModalOpen(false);
    setForm(emptyForm);
  };

  const handleDelete = async () => {
    if (!deleteTargetId) return;
    const { error } = await supabase.from("wallets").delete().eq("id", deleteTargetId);
    if (error) { console.error("Delete error:", error.message); return; }
    setWallets((prev) => prev.filter((w) => w.id !== deleteTargetId));
    setDeleteTargetId(null);
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-zinc-950">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(16,185,129,0.15),transparent)]" aria-hidden="true" />

      <div className="relative mx-auto max-w-4xl px-3 py-6 sm:px-6 sm:py-12 md:px-8">
        <header className="mb-8 flex flex-col gap-4 sm:mb-10 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
          <div className="min-w-0">
            <Link href="/" className="mb-3 inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-300 transition-colors sm:mb-4">
              ← Back to Projects
            </Link>
            <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Wallets</h1>
            <p className="mt-2 text-sm text-zinc-400 sm:text-base">{wallets.length} wallet{wallets.length !== 1 ? "s" : ""} saved</p>
          </div>
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="inline-flex w-full shrink-0 items-center justify-center gap-2 self-start rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-zinc-950 shadow-lg shadow-emerald-500/20 transition-all hover:bg-emerald-400 active:scale-[0.98] sm:w-auto sm:px-5"
          >
            <PlusIcon />
            Add Wallet
          </button>
        </header>

        <div className="grid gap-3 sm:gap-4 sm:grid-cols-2">
          {wallets.map((wallet) => (
            <div key={wallet.id} className="relative flex flex-col gap-2 rounded-2xl border border-zinc-800/80 bg-zinc-900/50 p-4 sm:gap-3 sm:p-5">
              <button
                type="button"
                onClick={() => setDeleteTargetId(wallet.id)}
                className="absolute right-4 top-4 rounded-lg p-1.5 text-zinc-600 transition-colors hover:bg-red-500/10 hover:text-red-400"
              >
                <TrashIcon />
              </button>

              <div className="pr-8">
                <p className="text-base font-semibold text-white">{wallet.name}</p>
                <p className="mt-1 font-mono text-xs text-zinc-500 break-all">{wallet.address}</p>
              </div>
            </div>
          ))}

          {wallets.length === 0 && (
            <div className="col-span-full rounded-2xl border border-dashed border-zinc-800 p-8 text-center text-sm text-zinc-600 sm:p-10">
              No wallets yet. Add one to get started.
            </div>
          )}
        </div>
      </div>

      {deleteTargetId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="alertdialog" aria-modal="true">
          <button type="button" className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setDeleteTargetId(null)} />
          <div className="relative w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl">
            <h2 className="text-lg font-semibold text-white">Delete this wallet?</h2>
            <p className="mt-2 text-sm text-zinc-400">Projects using this wallet will have their wallet unassigned.</p>
            <div className="mt-6 flex gap-3">
              <button type="button" onClick={() => setDeleteTargetId(null)} className="flex-1 rounded-xl border border-zinc-700 bg-zinc-800/50 px-4 py-2.5 text-sm font-medium text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors">Cancel</button>
              <button type="button" onClick={handleDelete} className="flex-1 rounded-xl bg-red-500/90 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-500 transition-colors">Delete</button>
            </div>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <button type="button" className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => { setIsModalOpen(false); setForm(emptyForm); }} />
          <div className="relative w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3 sm:px-6 sm:py-4">
              <h2 className="text-lg font-semibold text-white">Add Wallet</h2>
              <button type="button" onClick={() => { setIsModalOpen(false); setForm(emptyForm); }} className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors">
                <CloseIcon />
              </button>
            </div>
            <form className="space-y-4 px-4 py-4 sm:px-6 sm:py-5" onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-zinc-300">Wallet Name</label>
                <input type="text" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="e.g. Main Wallet" className={inputClassName} autoFocus />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-zinc-300">Address</label>
                <input type="text" value={form.address} onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))} placeholder="0x..." className={inputClassName} />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setIsModalOpen(false); setForm(emptyForm); }} className="flex-1 rounded-xl border border-zinc-700 bg-zinc-800/50 px-4 py-2.5 text-sm font-medium text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors">Cancel</button>
                <button type="submit" disabled={saving || !form.name.trim() || !form.address.trim()} className="flex-1 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-zinc-950 shadow-lg shadow-emerald-500/20 hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all">{saving ? "Saving..." : "Save Wallet"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
