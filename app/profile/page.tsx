"use client";
import { useUser, useClerk } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

type Wallet = {
  id: string;
  name: string;
  address: string;
  blockchain: string;
  notes: string | null;
  is_primary: boolean;
  created_at: string;
};

type WalletForm = {
  name: string;
  address: string;
  notes: string;
  is_primary: boolean;
};

type ProjectWallet = {
  project_id: string;
  wallet_id: string;
  projects: { name: string };
};

const CHAINS = [
  { id: "ETH",  label: "Ethereum",  color: "#627EEA" },
  { id: "POL",  label: "Polygon",   color: "#8247E5" },
  { id: "BASE", label: "Base",      color: "#0052FF" },
  { id: "ARB",  label: "Arbitrum",  color: "#28A0F0" },
  { id: "OP",   label: "Optimism",  color: "#FF0420" },
  { id: "SOL",  label: "Solana",    color: "#9945FF" },
  { id: "BNB",  label: "BNB Chain", color: "#F3BA2F" },
  { id: "AVAX", label: "Avalanche", color: "#E84142" },
  { id: "ABS",  label: "Abstract",  color: "#888888" },
  { id: "APE",  label: "ApeChain",  color: "#0054F9" },
  { id: "SON",  label: "Soneium",   color: "#888888" },
  { id: "MON",  label: "Monad",     color: "#836EF9" },
];

function ChainIcon({ chainId, size = 24 }: { chainId: string; size?: number }) {
  const chain = CHAINS.find((c) => c.id === chainId);
  const color = chain?.color ?? "#888";
  if (["ETH","BASE","ARB","MON","ABS"].includes(chainId)) return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <circle cx="16" cy="16" r="16" fill={color} fillOpacity="0.15"/>
      <path d="M16 6l-6.5 10.5L16 20l6.5-3.5L16 6z" fill={color} opacity="0.8"/>
      <path d="M16 20l-6.5-3.5L16 26l6.5-6.5L16 20z" fill={color}/>
    </svg>
  );
  if (chainId === "SOL") return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <circle cx="16" cy="16" r="16" fill="#9945FF" fillOpacity="0.15"/>
      <path d="M10 20h12l-2 2H8l2-2zM10 15h12l-2 2H8l2-2zM22 10H10l2-2h12l-2 2z" fill="#9945FF"/>
    </svg>
  );
  if (chainId === "BNB") return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <circle cx="16" cy="16" r="16" fill="#F3BA2F" fillOpacity="0.15"/>
      <path d="M16 8l2 2-2 2-2-2 2-2zM10 14l2 2-2 2-2-2 2-2zM16 14l2 2-2 2-2-2 2-2zM22 14l2 2-2 2-2-2 2-2zM16 20l2 2-2 2-2-2 2-2z" fill="#F3BA2F"/>
    </svg>
  );
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <circle cx="16" cy="16" r="16" fill={color} fillOpacity="0.15"/>
      <circle cx="16" cy="16" r="7" fill={color} fillOpacity="0.8"/>
    </svg>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button type="button"
      onClick={async (e) => { e.stopPropagation(); await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="rounded p-1 text-zinc-600 transition-colors hover:text-zinc-300">
      {copied
        ? <svg className="h-3.5 w-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5"/></svg>
        : <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0 0 13.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 0 1-.75.75H9a.75.75 0 0 1-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 0 1 1.927-.184"/></svg>
      }
    </button>
  );
}

function truncate(addr: string) {
  return addr.length <= 16 ? addr : `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

const emptyForm: WalletForm = { name: "", address: "", notes: "", is_primary: false };

export default function ProfilePage() {
  const { user, isLoaded } = useUser();
  const { openUserProfile, signOut } = useClerk();
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [projectWallets, setProjectWallets] = useState<ProjectWallet[]>([]);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);
  const [step, setStep] = useState<"closed" | "chain" | "form">("closed");
  const [selectedChain, setSelectedChain] = useState<string | null>(null);
  const [chainSearch, setChainSearch] = useState("");
  const [walletForm, setWalletForm] = useState<WalletForm>(emptyForm);
  const [editingWallet, setEditingWallet] = useState<Wallet | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
const [apiKey, setApiKey] = useState<string | null>(null);
const [apiKeyLoading, setApiKeyLoading] = useState(true);
const [apiKeyVisible, setApiKeyVisible] = useState(false);
const [apiKeyCopied, setApiKeyCopied] = useState(false);
const [apiKeyGenerating, setApiKeyGenerating] = useState(false);
  useEffect(() => {
    if (!isLoaded || !user) return;
    const load = async () => {
      const { data: w } = await supabase.from("wallets").select("*")
        .eq("user_id", user.id)
        .order("is_primary", { ascending: false })
        .order("created_at", { ascending: false });
      if (w) setWallets(w);
const res = await fetch("/api/api-keys");
const json = await res.json();
setApiKey(json.key?.key ?? null);
setApiKeyLoading(false);
      const { data: pw } = await supabase
        .from("project_wallets")
        .select("project_id, wallet_id, projects(name)")
        .eq("user_id", user.id);
      if (pw) setProjectWallets(pw as any);
    };
    load();
  }, [isLoaded, user]);

  const discordAccount = user?.externalAccounts.find((a) => a.provider === "discord");
  const twitterAccount = user?.externalAccounts.find((a) =>
    (a.provider as string).includes("twitter") || (a.provider as string) === "x"
  );

  const handleConnect = async (provider: "oauth_discord" | "oauth_twitter") => {
    try {
      const acc = await user!.createExternalAccount({ strategy: provider, redirectUrl: `${window.location.origin}/profile` });
      const url = acc.verification?.externalVerificationRedirectURL;
      if (url) window.location.href = url.toString();
    } catch (err: any) {
      if (err.message?.includes("verification")) openUserProfile();
      else alert(err.message);
    }
  };
const handleGenerateKey = async () => {
  setApiKeyGenerating(true);
  const res = await fetch("/api/api-keys", { method: "POST" });
  const json = await res.json();
  setApiKey(json.key?.key ?? null);
  setApiKeyVisible(true);
  setApiKeyGenerating(false);
};

const handleRevokeKey = async () => {
  if (!confirm("Revoke your API key? The Chrome Extension will stop working until you generate a new one.")) return;
  await fetch("/api/api-keys", { method: "DELETE" });
  setApiKey(null);
  setApiKeyVisible(false);
};

const handleCopyKey = async () => {
  if (!apiKey) return;
  await navigator.clipboard.writeText(apiKey);
  setApiKeyCopied(true);
  setTimeout(() => setApiKeyCopied(false), 2000);
};
  const handleDisconnect = async (id: string, key: string) => {
    setDisconnecting(key);
    try {
      const acc = user!.externalAccounts.find((a) => a.id === id);
      if (acc) { await acc.destroy(); await user!.reload(); }
    } finally { setDisconnecting(null); }
  };

  const openAdd = () => { setEditingWallet(null); setSelectedChain(null); setChainSearch(""); setWalletForm(emptyForm); setStep("chain"); };
  const openEdit = (w: Wallet) => { setEditingWallet(w); setSelectedChain(w.blockchain); setWalletForm({ name: w.name, address: w.address, notes: w.notes || "", is_primary: w.is_primary }); setStep("form"); };
  const closeModal = () => { setStep("closed"); setEditingWallet(null); setSelectedChain(null); setWalletForm(emptyForm); };

  const handleSave = async () => {
    if (!walletForm.name.trim() || !walletForm.address.trim() || !selectedChain || !user) return;
    setSaving(true);
    try {
      if (editingWallet) {
        const { data } = await supabase.from("wallets")
          .update({ name: walletForm.name.trim(), address: walletForm.address.trim(), blockchain: selectedChain, notes: walletForm.notes.trim() || null, is_primary: walletForm.is_primary })
          .eq("id", editingWallet.id).select().single();
        if (data) setWallets((prev) => {
          const u = prev.map((w) => w.id === editingWallet.id ? data : (walletForm.is_primary ? { ...w, is_primary: false } : w));
          return u.sort((a, b) => (b.is_primary ? 1 : 0) - (a.is_primary ? 1 : 0));
        });
      } else {
        const { data } = await supabase.from("wallets")
          .insert([{ name: walletForm.name.trim(), address: walletForm.address.trim(), blockchain: selectedChain, notes: walletForm.notes.trim() || null, is_primary: walletForm.is_primary, user_id: user.id }])
          .select().single();
        if (data) setWallets((prev) => {
          const u = walletForm.is_primary ? prev.map((w) => ({ ...w, is_primary: false })) : [...prev];
          return [data, ...u].sort((a, b) => (b.is_primary ? 1 : 0) - (a.is_primary ? 1 : 0));
        });
      }
      closeModal();
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTargetId) return;
    await supabase.from("wallets").delete().eq("id", deleteTargetId);
    setWallets((prev) => prev.filter((w) => w.id !== deleteTargetId));
    setDeleteTargetId(null);
  };

  const filteredChains = CHAINS.filter((c) =>
    c.label.toLowerCase().includes(chainSearch.toLowerCase()) || c.id.toLowerCase().includes(chainSearch.toLowerCase())
  );

  const getWalletProjects = (walletId: string) =>
    projectWallets.filter((pw) => pw.wallet_id === walletId).map((pw) => pw.projects?.name).filter(Boolean);

  const displayName = user?.username ?? user?.firstName ?? user?.primaryEmailAddress?.emailAddress?.split("@")[0] ?? "User";

  if (!isLoaded) return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-700 border-t-emerald-400" />
    </div>
  );
  if (!user) return null;

  return (
    <div className="min-h-screen bg-zinc-950">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(16,185,129,0.08),transparent)]" />

      <div className="relative mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">

        {/* ── Top nav ── */}
        <div className="mb-8 flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-2 text-sm text-zinc-500 transition-colors hover:text-zinc-300">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18"/></svg>
            Back to Dashboard
          </Link>
          <button type="button" onClick={() => signOut({ redirectUrl: "/sign-in" })}
            className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-400 transition-colors hover:border-zinc-700 hover:text-white">
            Sign Out
          </button>
        </div>

        {/* ── Identity Bar ── */}
        <div className="mb-8 flex flex-col gap-4 rounded-2xl border border-zinc-800/80 bg-zinc-900/50 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-2xl border border-zinc-700/50 bg-zinc-800 shadow-lg">
              {user.imageUrl
                ? <img src={user.imageUrl} alt="" className="h-full w-full object-cover" />
                : <div className="flex h-full w-full items-center justify-center text-xl font-bold text-zinc-400">{displayName[0]?.toUpperCase()}</div>
              }
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-white">{displayName}</h1>
                <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-400">
                  {wallets.length} wallet{wallets.length !== 1 ? "s" : ""}
                </span>
              </div>
              <p className="text-sm text-zinc-500">{user.primaryEmailAddress?.emailAddress}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {twitterAccount && (
              <div className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2">
                <svg className="h-3.5 w-3.5 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.253 5.622 5.911-5.622Zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                <span className="text-xs font-medium text-zinc-300">@{twitterAccount.username}</span>
              </div>
            )}
            {discordAccount && (
              <div className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2">
                <svg className="h-3.5 w-3.5 text-indigo-400" fill="currentColor" viewBox="0 0 24 24"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.002.022.015.045.03.056a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/></svg>
                <span className="text-xs font-medium text-zinc-300">@{discordAccount.username}</span>
              </div>
            )}
          </div>
        </div>

        {/* ── Wallets (PRIMARY SECTION) ── */}
        <div className="mb-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-white">Wallets</h2>
              <p className="text-xs text-zinc-500 mt-0.5">Your minting wallets and their assigned projects.</p>
            </div>
            <button type="button" onClick={openAdd}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-zinc-950 shadow-lg shadow-emerald-500/20 transition-all hover:bg-emerald-400 active:scale-[0.98]">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15"/></svg>
              Add Wallet
            </button>
          </div>

          {wallets.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-800 py-16 text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-900">
                <svg className="h-6 w-6 text-zinc-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 0 0-2.25-2.25H15a3 3 0 1 1-6 0H5.25A2.25 2.25 0 0 0 3 12m18 0v6a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 18v-6m18 0V9M3 12V9m18-3a2.25 2.25 0 0 0-2.25-2.25H5.25A2.25 2.25 0 0 0 3 9m18 0V6a2.25 2.25 0 0 0-2.25-2.25H5.25A2.25 2.25 0 0 0 3 6v3"/></svg>
              </div>
              <p className="text-sm font-medium text-zinc-500">No wallets yet</p>
              <p className="mt-1 text-xs text-zinc-600">Add your first wallet to start tracking mints.</p>
              <button type="button" onClick={openAdd}
                className="mt-4 rounded-xl border border-zinc-700 bg-zinc-800/50 px-4 py-2 text-sm text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-white">
                Add Wallet
              </button>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {wallets.map((wallet) => {
                const chain = CHAINS.find((c) => c.id === wallet.blockchain);
                const projects = getWalletProjects(wallet.id);
                return (
                  <div key={wallet.id}
                    className="group relative flex flex-col gap-3 overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-900/80 p-4 transition-all duration-200 hover:border-zinc-700/80 hover:bg-zinc-900 hover:shadow-lg hover:shadow-black/20">

                    {/* Chain glow */}
                    <div className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full blur-2xl opacity-20 transition-opacity group-hover:opacity-40"
                      style={{ backgroundColor: chain?.color ?? "#888" }} />

                    {/* Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <ChainIcon chainId={wallet.blockchain} size={32} />
                        <div>
                          <div className="flex items-center gap-1.5">
                            <p className="text-sm font-semibold text-white leading-tight">{wallet.name}</p>
                            {wallet.is_primary && (
                              <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-px text-xs font-medium text-emerald-400">
                                Primary
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-zinc-600">{chain?.label ?? wallet.blockchain}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button type="button" onClick={() => openEdit(wallet)}
                          className="rounded-lg p-1.5 text-zinc-600 transition-colors hover:bg-emerald-500/10 hover:text-emerald-400">
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Z"/></svg>
                        </button>
                        <button type="button" onClick={() => setDeleteTargetId(wallet.id)}
                          className="rounded-lg p-1.5 text-zinc-600 transition-colors hover:bg-red-500/10 hover:text-red-400">
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0"/></svg>
                        </button>
                      </div>
                    </div>

                    {/* Address */}
                    <div className="flex items-center justify-between rounded-lg bg-zinc-950/60 px-3 py-2 border border-zinc-800/60">
                      <span className="font-mono text-xs text-zinc-400">{truncate(wallet.address)}</span>
                      <CopyButton text={wallet.address} />
                    </div>

                    {/* Assigned projects */}
                    {projects.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {projects.map((name) => (
                          <span key={name} className="rounded-md bg-zinc-800/60 px-2 py-0.5 text-xs text-zinc-500">
                            {name}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-zinc-700">No projects assigned</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Connected Accounts ── */}
        <div className="mb-6 rounded-2xl border border-zinc-800/80 bg-zinc-900/50">
          <div className="border-b border-zinc-800/60 px-5 py-4">
            <h2 className="text-sm font-semibold text-white">Connected Accounts</h2>
            <p className="mt-0.5 text-xs text-zinc-500">Social accounts linked to MintKeeper.</p>
          </div>
          <div className="divide-y divide-zinc-800/60">
            {[
              {
                key: "twitter",
                label: "X / Twitter",
                account: twitterAccount,
                provider: "oauth_twitter" as const,
                icon: <svg className="h-4 w-4 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.253 5.622 5.911-5.622Zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>,
                iconBg: "bg-zinc-800",
              },
              {
                key: "discord",
                label: "Discord",
                account: discordAccount,
                provider: "oauth_discord" as const,
                icon: <svg className="h-4 w-4 text-indigo-400" fill="currentColor" viewBox="0 0 24 24"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.002.022.015.045.03.056a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/></svg>,
                iconBg: "bg-zinc-800",
              },
            ].map(({ key, label, account, provider, icon, iconBg }) => (
              <div key={key} className="flex items-center justify-between px-5 py-3.5">
                <div className="flex items-center gap-3">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${iconBg}`}>{icon}</div>
                  <div>
                    <p className="text-sm font-medium text-white">{label}</p>
                    <p className="text-xs text-zinc-500">{account ? `@${account.username ?? "Connected"}` : "Not connected"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {account && (
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  )}
                  {account ? (
                    <button type="button" onClick={() => handleDisconnect(account.id, key)} disabled={disconnecting === key}
                      className="rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/10 disabled:opacity-40 transition-colors">
                      {disconnecting === key ? "..." : "Disconnect"}
                    </button>
                  ) : (
                    <button type="button" onClick={() => handleConnect(provider)}
                      className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-1.5 text-xs font-medium text-emerald-400 hover:bg-emerald-500/10 transition-colors">
                      Connect
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
{/* ── Chrome Extension / API Key ── */}
<div className="mb-6 rounded-2xl border border-zinc-800/80 bg-zinc-900/50">
  <div className="border-b border-zinc-800/60 px-5 py-4">
    <div className="flex items-center gap-2">
      <svg className="h-4 w-4 text-zinc-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />
      </svg>
      <h2 className="text-sm font-semibold text-white">Chrome Extension</h2>
    </div>
    <p className="mt-0.5 text-xs text-zinc-500">Use this API key to connect the MintKeeper Helper extension.</p>
  </div>
  <div className="p-5">
    {apiKeyLoading ? (
      <div className="h-10 animate-pulse rounded-xl bg-zinc-800" />
    ) : apiKey ? (
      <div className="space-y-3">
        <div className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3">
          <code className="flex-1 font-mono text-xs text-emerald-400 truncate">
            {apiKeyVisible ? apiKey : `mk_live_${"•".repeat(24)}`}
          </code>
          <button
            type="button"
            onClick={() => setApiKeyVisible((v) => !v)}
            className="shrink-0 rounded-lg p-1.5 text-zinc-600 transition-colors hover:text-zinc-300"
            title={apiKeyVisible ? "Hide" : "Show"}
          >
            {apiKeyVisible ? (
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88"/></svg>
            ) : (
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z"/><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"/></svg>
            )}
          </button>
          <button
            type="button"
            onClick={handleCopyKey}
            className="shrink-0 rounded-lg p-1.5 text-zinc-600 transition-colors hover:text-zinc-300"
            title="Copy"
          >
            {apiKeyCopied ? (
              <svg className="h-4 w-4 text-emerald-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5"/></svg>
            ) : (
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0 0 13.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 0 1-.75.75H9a.75.75 0 0 1-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 0 1 1.927-.184"/></svg>
            )}
          </button>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={handleGenerateKey} disabled={apiKeyGenerating}
            className="rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-white disabled:opacity-40">
            {apiKeyGenerating ? "Generating..." : "Regenerate"}
          </button>
          <button type="button" onClick={handleRevokeKey}
            className="rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-1.5 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/10">
            Revoke
          </button>
        </div>
        <p className="text-xs text-zinc-600">Keep this key secret. Anyone with this key can add projects to your account.</p>
      </div>
    ) : (
      <div className="flex flex-col items-start gap-3">
        <p className="text-xs text-zinc-500">No API key generated yet. Generate one to use the Chrome Extension.</p>
        <button type="button" onClick={handleGenerateKey} disabled={apiKeyGenerating}
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-zinc-950 shadow-lg shadow-emerald-500/20 transition-all hover:bg-emerald-400 disabled:opacity-40 active:scale-[0.98]">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 0 1 3 3m3 0a6 6 0 0 1-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 0 1 21.75 8.25Z"/></svg>
          {apiKeyGenerating ? "Generating..." : "Generate API Key"}
        </button>
      </div>
    )}
  </div>
</div>
        {/* ── Danger Zone ── */}
        <div className="rounded-2xl border border-red-500/10 bg-red-500/5 px-5 py-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-red-400/80">Delete Account</p>
              <p className="text-xs text-zinc-600">Permanently delete your account and all data.</p>
            </div>
            <button type="button" onClick={() => alert("Contact support to delete your account.")}
              className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-2 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/10">
              Delete
            </button>
          </div>
        </div>

      </div>

      {/* ── Chain Modal ── */}
      {step === "chain" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button type="button" className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-900 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">
              <h2 className="text-sm font-semibold text-white">Choose blockchain</h2>
              <button type="button" onClick={closeModal} className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-white transition-colors">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12"/></svg>
              </button>
            </div>
            <div className="p-4">
              <input type="text" placeholder="Search..." value={chainSearch} onChange={(e) => setChainSearch(e.target.value)} autoFocus
                className="w-full rounded-xl border border-zinc-700 bg-zinc-800/60 px-3.5 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
              <div className="mt-2 max-h-64 overflow-y-auto">
                {filteredChains.map((c) => (
                  <button key={c.id} type="button" onClick={() => { setSelectedChain(c.id); setStep("form"); }}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-zinc-800">
                    <ChainIcon chainId={c.id} size={32} />
                    <div>
                      <p className="text-sm font-medium text-white">{c.label}</p>
                      <p className="text-xs text-zinc-500">{c.id}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Wallet Form Modal ── */}
      {step === "form" && selectedChain && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button type="button" className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">
              <div className="flex items-center gap-2.5">
                <ChainIcon chainId={selectedChain} size={24} />
                <h2 className="text-sm font-semibold text-white">
                  {editingWallet ? "Edit wallet" : `Add ${CHAINS.find(c => c.id === selectedChain)?.label} wallet`}
                </h2>
              </div>
              <button type="button" onClick={closeModal} className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-white transition-colors">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12"/></svg>
              </button>
            </div>
            <form className="space-y-4 p-5" onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-400">Wallet nickname</label>
                <input type="text" value={walletForm.name} onChange={(e) => setWalletForm((p) => ({ ...p, name: e.target.value }))} placeholder="e.g. Main Wallet" autoFocus
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-800/60 px-4 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-400">Wallet address</label>
                <input type="text" value={walletForm.address} onChange={(e) => setWalletForm((p) => ({ ...p, address: e.target.value }))} placeholder="0x..."
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-800/60 px-4 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-400">Notes <span className="text-zinc-600">(optional)</span></label>
                <textarea value={walletForm.notes} onChange={(e) => setWalletForm((p) => ({ ...p, notes: e.target.value }))} placeholder="e.g. Used for minting only" rows={2}
                  className="w-full resize-none rounded-xl border border-zinc-700 bg-zinc-800/60 px-4 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
              </div>
              <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-800/30 p-3.5 transition-colors hover:border-zinc-700">
                <input type="checkbox" checked={walletForm.is_primary} onChange={(e) => setWalletForm((p) => ({ ...p, is_primary: e.target.checked }))}
                  className="h-4 w-4 rounded border-zinc-600 bg-zinc-700 text-emerald-500 focus:ring-emerald-500/20" />
                <div>
                  <p className="text-sm font-medium text-white">Set as primary wallet</p>
                  <p className="text-xs text-zinc-500">Removes primary from other wallets</p>
                </div>
              </label>
              <div className="flex gap-2.5 pt-1">
                {!editingWallet && (
                  <button type="button" onClick={() => setStep("chain")}
                    className="rounded-xl border border-zinc-700 bg-zinc-800/50 px-4 py-2.5 text-sm font-medium text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors">
                    ← Back
                  </button>
                )}
                <button type="button" onClick={closeModal}
                  className="flex-1 rounded-xl border border-zinc-700 bg-zinc-800/50 px-4 py-2.5 text-sm font-medium text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={saving || !walletForm.name.trim() || !walletForm.address.trim()}
                  className="flex-1 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-zinc-950 shadow-lg shadow-emerald-500/20 hover:bg-emerald-400 disabled:opacity-40 transition-all">
                  {saving ? "Saving..." : editingWallet ? "Save Changes" : "Save Wallet"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete Confirm ── */}
      {deleteTargetId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button type="button" className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setDeleteTargetId(null)} />
          <div className="relative w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl">
            <h2 className="text-base font-semibold text-white">Delete this wallet?</h2>
            <p className="mt-1.5 text-sm text-zinc-400">Projects using this wallet will have it unassigned.</p>
            <div className="mt-5 flex gap-3">
              <button type="button" onClick={() => setDeleteTargetId(null)}
                className="flex-1 rounded-xl border border-zinc-700 bg-zinc-800/50 px-4 py-2.5 text-sm font-medium text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors">Cancel</button>
              <button type="button" onClick={handleDelete}
                className="flex-1 rounded-xl bg-red-500/90 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-500 transition-colors">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}