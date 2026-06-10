"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

type WlStatus = "FCFS" | "GTD";
type WlStatusColor = "emerald" | "amber";
type ProjectFilter = "all" | "active" | "minted";

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
  x_link: string | null;
  discord_link: string | null;
  wallets?: Wallet | null;
};

type FormState = {
  name: string;
  wl_status: WlStatus;
  mint_date: string;
  wallet_id: string;
  image: File | null;
};

const WL_STATUS_OPTIONS: WlStatus[] = ["FCFS", "GTD"];

const statusColorMap: Record<WlStatus, WlStatusColor> = {
  FCFS: "amber",
  GTD: "emerald",
};

const FILTER_OPTIONS: { value: ProjectFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "minted", label: "Minted" },
];

const emptyForm: FormState = {
  name: "",
  wl_status: "FCFS",
  mint_date: "",
  wallet_id: "",
  image: null,
};

const statusStyles = {
  emerald: "bg-emerald-500/10 text-emerald-400 ring-emerald-500/20",
  amber: "bg-amber-500/10 text-amber-400 ring-amber-500/20",
} as const;

const inputClassName =
  "w-full rounded-lg border border-zinc-700 bg-zinc-800/60 px-3.5 py-2.5 text-sm text-white placeholder:text-zinc-500 transition-colors focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20";

function formatMintDate(isoDate: string): string {
  if (!isoDate) return "";
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

function getDaysRemaining(isoDate: string): number {
  if (!isoDate) return 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [year, month, day] = isoDate.split("-").map(Number);
  const mint = new Date(year, month - 1, day);
  return Math.max(0, Math.ceil((mint.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
}

function PlusIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg className="h-4 w-4 text-zinc-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg className="h-4 w-4 text-zinc-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
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

function TrashIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
    </svg>
  );
}

function WalletIcon() {
  return (
    <svg className="h-4 w-4 text-zinc-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 0 0-2.25-2.25H15a3 3 0 1 1-6 0H5.25A2.25 2.25 0 0 0 3 12m18 0v6a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 18v-6m18 0V9M3 12V9m18-3a2.25 2.25 0 0 0-2.25-2.25H5.25A2.25 2.25 0 0 0 3 9m18 0V6a2.25 2.25 0 0 0-2.25-2.25H5.25A2.25 2.25 0 0 0 3 6v3" />
    </svg>
  );
}

export default function Home() {
  const [search, setSearch] = useState("");
  const [projects, setProjects] = useState<Project[]>([]);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [filter, setFilter] = useState<ProjectFilter>("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [uploading, setUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const [{ data: projectsData, error: projectsError }, { data: walletsData, error: walletsError }] = await Promise.all([
        supabase.from("projects").select("*, wallets(id, name, address)").order("mint_date", { ascending: true }),
        supabase.from("wallets").select("*").order("created_at", { ascending: false }),
      ]);
      if (projectsError) console.error("Projects error:", projectsError.message);
      if (walletsError) console.error("Wallets error:", walletsError.message);
      if (projectsData) setProjects(projectsData);
      if (walletsData) setWallets(walletsData);
    };
    load();
  }, []);

  const filteredProjects = projects.filter((p) => {
  const matchesFilter = filter === "active" ? !p.minted : filter === "minted" ? p.minted : true;
  const matchesSearch = search === "" ||
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.wallets?.name ?? "").toLowerCase().includes(search.toLowerCase());
  return matchesFilter && matchesSearch;
});

  const activeCount = projects.filter((p) => !p.minted).length;
  const mintedCount = projects.filter((p) => p.minted).length;
const gtdCount = projects.filter((p) => p.wl_status === "GTD" && !p.minted).length;
const fcfsCount = projects.filter((p) => p.wl_status === "FCFS" && !p.minted).length;
const mintingThisWeek = projects.filter((p) => {
  if (p.minted || !p.mint_date) return false;
  const days = getDaysRemaining(p.mint_date);
  return days <= 7;
}).length;

  const openModal = () => { setForm(emptyForm); setImagePreview(null); setIsModalOpen(true); };
  const closeModal = () => { setIsModalOpen(false); setForm(emptyForm); setImagePreview(null); };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setForm((p) => ({ ...p, image: file }));
    setImagePreview(URL.createObjectURL(file));
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.mint_date.match(/^\d{4}-\d{2}-\d{2}$/)) return;
    setUploading(true);

    let image_url: string | null = null;

    if (form.image) {
      const ext = form.image.name.split(".").pop();
      const fileName = `${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("project-images")
        .upload(fileName, form.image);

      if (uploadError) {
        console.error("Upload error:", uploadError.message);
        setUploading(false);
        return;
      }

      const { data: urlData } = supabase.storage
        .from("project-images")
        .getPublicUrl(fileName);

      image_url = urlData.publicUrl;
    }

    const { data, error } = await supabase
      .from("projects")
      .insert([{
        name: form.name.trim(),
        wl_status: form.wl_status,
        mint_date: form.mint_date,
        wallet_id: form.wallet_id || null,
        minted: false,
        image_url,
      }])
      .select("*, wallets(id, name, address)")
      .single();

    setUploading(false);
    if (error) { console.error("Insert error:", error.message); return; }
    if (data) setProjects((prev) => [data, ...prev]);
    closeModal();
  };

  const handleConfirmDelete = async () => {
    if (!deleteTargetId) return;
    const { error } = await supabase.from("projects").delete().eq("id", deleteTargetId);
    if (error) { console.error("Delete error:", error.message); return; }
    setProjects((prev) => prev.filter((p) => p.id !== deleteTargetId));
    setDeleteTargetId(null);
  };

  const handleMarkAsMinted = async (id: string) => {
  const project = projects.find((p) => p.id === id);
  if (!project) return;
  const newMinted = !project.minted;
  const { error } = await supabase.from("projects").update({ minted: newMinted }).eq("id", id);
  if (error) { console.error("Update error:", error.message); return; }
  setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, minted: newMinted } : p)));
};

  const isOverlayOpen = isModalOpen || deleteTargetId !== null;

  useEffect(() => {
    if (!isOverlayOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (deleteTargetId) setDeleteTargetId(null);
        else closeModal();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", handleKeyDown); document.body.style.overflow = ""; };
  }, [isOverlayOpen, deleteTargetId]);

  return (
    <div className="relative min-h-full overflow-hidden bg-zinc-950">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(16,185,129,0.15),transparent)]" aria-hidden="true" />
      <div className="pointer-events-none absolute -right-32 top-1/3 h-96 w-96 rounded-full bg-emerald-500/5 blur-3xl" aria-hidden="true" />
      <div className="pointer-events-none absolute -left-32 bottom-0 h-80 w-80 rounded-full bg-teal-500/5 blur-3xl" aria-hidden="true" />

      <div className="relative mx-auto flex min-h-full max-w-6xl flex-col px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        <header className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/5 px-3 py-1 text-xs font-medium tracking-wide text-emerald-400">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
              </span>
              Live tracker
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">MintKeeper</h1>
            <p className="mt-2 text-base text-zinc-400 sm:text-lg">Never miss a mint again</p>
          </div>

          <div className="flex items-center gap-3 self-start">
            <Link href="/wallets" className="inline-flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-800/50 px-4 py-2.5 text-sm font-medium text-zinc-300 transition-colors hover:border-zinc-600 hover:bg-zinc-800 hover:text-white">
              <WalletIcon />
              Wallets
            </Link>
            <button
              type="button"
              onClick={openModal}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-zinc-950 shadow-lg shadow-emerald-500/20 transition-all hover:bg-emerald-400 active:scale-[0.98]"
            >
              <PlusIcon />
              Add Project
            </button>
          </div>
        </header>
<div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-5">
  <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3.5 text-center">
    <p className="text-2xl font-bold text-white">{activeCount}</p>
    <p className="mt-0.5 text-xs text-zinc-500">Active</p>
  </div>
  <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3.5 text-center">
    <p className="text-2xl font-bold text-white">{mintedCount}</p>
    <p className="mt-0.5 text-xs text-zinc-500">Minted</p>
  </div>
  <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3.5 text-center">
    <p className="text-2xl font-bold text-emerald-400">{mintingThisWeek}</p>
    <p className="mt-0.5 text-xs text-zinc-500">This Week</p>
  </div>
  <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3.5 text-center">
    <p className="text-2xl font-bold text-emerald-400">{gtdCount}</p>
    <p className="mt-0.5 text-xs text-zinc-500">GTD</p>
  </div>
  <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3.5 text-center">
    <p className="text-2xl font-bold text-amber-400">{fcfsCount}</p>
    <p className="mt-0.5 text-xs text-zinc-500">FCFS</p>
  </div>
</div>
        <section className="mt-10 sm:mt-14">
          <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-sm font-medium uppercase tracking-wider text-zinc-500">Your Projects</h2>
            <span className="text-sm text-zinc-600">{activeCount} active</span>
          </div>
<div className="mb-4">
  <input
    type="text"
    placeholder="🔍 Search projects..."
    value={search}
    onChange={(e) => setSearch(e.target.value)}
    className="w-full rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-2.5 text-sm text-white placeholder:text-zinc-600 transition-colors focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
  />
</div>
          <div className="mb-6 inline-flex rounded-xl border border-zinc-800 bg-zinc-900/50 p-1">
            {FILTER_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setFilter(option.value)}
                className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-colors ${filter === option.value ? "bg-zinc-800 text-white shadow-sm" : "text-zinc-500 hover:text-zinc-300"}`}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
            {filteredProjects.map((project) => {
              const daysRemaining = getDaysRemaining(project.mint_date);
              const wlStatusColor = statusColorMap[project.wl_status];
              return (
                <article
                  key={project.id}
                  className={`group relative flex flex-col rounded-2xl border overflow-hidden backdrop-blur-sm transition-all duration-300 ${
                    project.minted
                      ? "border-zinc-600/70 bg-zinc-900/30 opacity-50"
                      : "border-zinc-800/80 bg-zinc-900/50 hover:border-emerald-500/30 hover:bg-zinc-900/80 hover:shadow-xl hover:shadow-emerald-500/5"
                  }`}
                >
                  <Link href={`/project/${project.id}`} className="absolute inset-0 z-10" aria-label={`View ${project.name}`} />

                  {project.image_url ? (
                    <div className="h-36 w-full overflow-hidden">
                      <img src={project.image_url} alt={project.name} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                    </div>
                  ) : (
                    <div className="h-36 w-full bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center">
                      <span className="text-3xl font-bold text-zinc-700">{project.name.slice(0, 2).toUpperCase()}</span>
                    </div>
                  )}

                  <div className="flex flex-col p-6 flex-1">
                    <button
                      type="button"
                      onClick={() => setDeleteTargetId(project.id)}
                      className="absolute right-4 top-4 z-20 rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-red-500/10 hover:text-red-400 bg-zinc-900/70"
                    >
                      <TrashIcon />
                    </button>

                    <div className="mb-5 flex items-start justify-between gap-3">
                      <h3 className="text-lg font-semibold text-white transition-colors group-hover:text-emerald-50">{project.name}</h3>
                      <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${statusStyles[wlStatusColor]}`}>
                        {project.wl_status}
                      </span>
                    </div>

                    <dl className="mt-auto space-y-3">
                      <div className="flex items-center justify-between gap-4 rounded-lg bg-zinc-800/40 px-3 py-2.5">
                        <dt className="flex items-center gap-2 text-sm text-zinc-500"><CalendarIcon />Mint date</dt>
                        <dd className="text-sm font-medium text-zinc-200">{formatMintDate(project.mint_date)}</dd>
                      </div>
                      <div className="flex items-center justify-between gap-4 rounded-lg bg-zinc-800/40 px-3 py-2.5">
                        <dt className="flex items-center gap-2 text-sm text-zinc-500"><ClockIcon />Days remaining</dt>
                        <dd className="text-sm font-semibold tabular-nums text-emerald-400">
                          {daysRemaining} <span className="font-normal text-zinc-500">days</span>
                        </dd>
                      </div>
                      {project.wallets && (
                        <div className="flex items-center justify-between gap-4 rounded-lg bg-zinc-800/40 px-3 py-2.5">
                          <dt className="flex items-center gap-2 text-sm text-zinc-500"><WalletIcon />Wallet</dt>
                          <dd className="text-sm font-medium text-zinc-200">{project.wallets.name}</dd>
                        </div>
                      )}
                    </dl>

                    {(project.x_link || project.discord_link) && (
                      <div className="flex items-center gap-2 pt-3">
                        {project.x_link && (
                          <a
                            href={project.x_link}
  target="_blank"
  rel="noopener noreferrer"
  onClick={(e) => e.stopPropagation()}
  className="relative z-20 inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800/40 px-2.5 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:border-zinc-600 hover:text-white"
>
  𝕏 Twitter
</a>
                        )}
                        {project.discord_link && (
                          <a
                            href={project.discord_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="relative z-20 inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800/40 px-2.5 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:border-zinc-600 hover:text-white"
                          >
                            <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 24 24"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.002.022.015.045.03.056a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" /></svg>
                            Discord
                          </a>
                        )}
                      </div>
                    )}

                    <button
  type="button"
  onClick={() => handleMarkAsMinted(project.id)}
  className={`relative z-20 mt-4 w-full rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
    project.minted
      ? "border-zinc-700 bg-zinc-800/40 text-zinc-500 hover:text-zinc-300"
      : "border-zinc-700 bg-zinc-800/40 text-zinc-300 hover:border-zinc-600 hover:bg-zinc-800 hover:text-white"
  }`}
>
  {project.minted ? "↩ Undo Minted" : "Mark as Minted"}
</button>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </div>

      {deleteTargetId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="alertdialog" aria-modal="true">
          <button type="button" className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setDeleteTargetId(null)} />
          <div className="relative w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl shadow-black/50">
            <h2 className="text-lg font-semibold text-white">Delete this project?</h2>
            <div className="mt-6 flex gap-3">
              <button type="button" onClick={() => setDeleteTargetId(null)} className="flex-1 rounded-xl border border-zinc-700 bg-zinc-800/50 px-4 py-2.5 text-sm font-medium text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors">Cancel</button>
              <button type="button" onClick={handleConfirmDelete} className="flex-1 rounded-xl bg-red-500/90 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-500 transition-colors">Delete</button>
            </div>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <button type="button" className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 shadow-2xl shadow-black/50 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
              <h2 className="text-lg font-semibold text-white">Add Project</h2>
              <button type="button" onClick={closeModal} className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"><CloseIcon /></button>
            </div>
            <form className="space-y-4 px-6 py-5" onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-zinc-300">Cover Image <span className="text-zinc-600">(optional)</span></label>
                {imagePreview ? (
                  <div className="relative h-32 w-full overflow-hidden rounded-lg">
                    <img src={imagePreview} alt="Preview" className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => { setImagePreview(null); setForm((p) => ({ ...p, image: null })); }}
                      className="absolute right-2 top-2 rounded-lg bg-zinc-900/80 p-1 text-zinc-400 hover:text-white"
                    >
                      <CloseIcon />
                    </button>
                  </div>
                ) : (
                  <label className="flex h-32 w-full cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-zinc-700 bg-zinc-800/40 transition-colors hover:border-zinc-600 hover:bg-zinc-800/60">
                    <svg className="h-8 w-8 text-zinc-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
                    </svg>
                    <span className="mt-2 text-xs text-zinc-500">Click to upload image</span>
                    <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                  </label>
                )}
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-zinc-300">Project Name</label>
                <input type="text" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="e.g. Zelij Origins" className={inputClassName} autoFocus />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-zinc-300">WL Status</label>
                <select value={form.wl_status} onChange={(e) => setForm((p) => ({ ...p, wl_status: e.target.value as WlStatus }))} className={`${inputClassName} cursor-pointer`}>
                  {WL_STATUS_OPTIONS.map((s) => (<option key={s} value={s}>{s}</option>))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-zinc-300">Mint Date</label>
                <div className="grid grid-cols-3 gap-2">
                  <select
                    value={form.mint_date ? form.mint_date.split("-")[1] : ""}
                    onChange={(e) => {
                      const parts = form.mint_date ? form.mint_date.split("-") : ["", "", ""];
                      parts[1] = e.target.value;
                      setForm((p) => ({ ...p, mint_date: parts.join("-") }));
                    }}
                    className={`${inputClassName} cursor-pointer`}
                  >
                    <option value="">Month</option>
                    {["January","February","March","April","May","June","July","August","September","October","November","December"].map((m, i) => (
                      <option key={m} value={String(i + 1).padStart(2, "0")}>{m}</option>
                    ))}
                  </select>
                  <select
                    value={form.mint_date ? form.mint_date.split("-")[2] : ""}
                    onChange={(e) => {
                      const parts = form.mint_date ? form.mint_date.split("-") : ["", "", ""];
                      parts[2] = e.target.value;
                      setForm((p) => ({ ...p, mint_date: parts.join("-") }));
                    }}
                    className={`${inputClassName} cursor-pointer`}
                  >
                    <option value="">Day</option>
                    {Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, "0")).map((d) => (
                      <option key={d} value={d}>{Number(d)}</option>
                    ))}
                  </select>
                  <select
                    value={form.mint_date ? form.mint_date.split("-")[0] : ""}
                    onChange={(e) => {
                      const parts = form.mint_date ? form.mint_date.split("-") : ["", "", ""];
                      parts[0] = e.target.value;
                      setForm((p) => ({ ...p, mint_date: parts.join("-") }));
                    }}
                    className={`${inputClassName} cursor-pointer`}
                  >
                    <option value="">Year</option>
                    {["2026", "2027", "2028"].map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-zinc-300">Wallet <span className="text-zinc-600">(optional)</span></label>
                <select value={form.wallet_id} onChange={(e) => setForm((p) => ({ ...p, wallet_id: e.target.value }))} className={`${inputClassName} cursor-pointer`}>
                  <option value="">No wallet</option>
                  {wallets.map((w) => (<option key={w.id} value={w.id}>{w.name} — {w.address.slice(0, 6)}...{w.address.slice(-4)}</option>))}
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={closeModal} className="flex-1 rounded-xl border border-zinc-700 bg-zinc-800/50 px-4 py-2.5 text-sm font-medium text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors">Cancel</button>
                <button
                  type="submit"
                  disabled={uploading || !form.name.trim() || !form.mint_date.match(/^\d{4}-\d{2}-\d{2}$/)}
                  className="flex-1 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-zinc-950 shadow-lg shadow-emerald-500/20 hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  {uploading ? "Uploading..." : "Save Project"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}