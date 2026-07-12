"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCryptoPrices, getUsdValue } from "@/lib/useCryptoPrices";
import { MintPriceInput } from "@/components/MintPriceInput";
import { ChainBadge, type Chain } from "@/components/ChainBadge";

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
  notes: string | null;
  x_link: string | null;
  discord_link: string | null;
mint_price: number | null;
mint_currency: string | null;
wallets?: Wallet | null;
};

type FormState = {
  name: string;
  wl_status: WlStatus;
  mint_date: string;
  wallet_id: string;
  image: File | null;
  mint_price: string;
  mint_currency: string;
  
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
  mint_price: "",
  mint_currency: "ETH",
  
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

function normalizeSearchText(value: string | null | undefined): string {
  return (value ?? "")
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/[@_/-]/g, " ");
}

function cleanOptionalText(value: string | null | undefined): string {
  const text = (value ?? "").trim();
  return ["null", "nullable", "undefined"].includes(text.toLowerCase()) ? "" : text;
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

function DuplicateIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 7.5V6A2.25 2.25 0 0 1 10.5 3.75h7.5A2.25 2.25 0 0 1 20.25 6v7.5A2.25 2.25 0 0 1 18 15.75h-1.5m-8.25-8.25H6A2.25 2.25 0 0 0 3.75 9.75v8.25A2.25 2.25 0 0 0 6 20.25h8.25A2.25 2.25 0 0 0 16.5 18v-8.25A2.25 2.25 0 0 0 14.25 7.5h-6Z" />
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
  
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [projects, setProjects] = useState<Project[]>([]);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [filter, setFilter] = useState<ProjectFilter>("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [uploading, setUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [editProject, setEditProject] = useState<Project | null>(null);
  const [editForm, setEditForm] = useState<FormState>(emptyForm);
  const [editImagePreview, setEditImagePreview] = useState<string | null>(null);
  const [editUploading, setEditUploading] = useState(false);
  const [duplicatingProjectId, setDuplicatingProjectId] = useState<string | null>(null);
  const cryptoPrices = useCryptoPrices();
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
      }
    };
    checkAuth();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };
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
    const searchTerm = normalizeSearchText(search);
    const searchableProjectText = [
      p.name,
      cleanOptionalText(p.x_link),
      p.wallets?.name,
      cleanOptionalText(p.notes),
      cleanOptionalText(p.discord_link),
      cleanOptionalText(p.x_link) ? "x twitter" : "",
      cleanOptionalText(p.discord_link) ? "discord" : "",
    ]
      .map(normalizeSearchText)
      .join(" ");
    const matchesSearch = searchTerm === "" || searchableProjectText.includes(searchTerm);
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

    const { data: { user } } = await supabase.auth.getUser();

const { data, error } = await supabase
  .from("projects")
  .insert([{
    name: form.name.trim(),
    wl_status: form.wl_status,
    mint_date: form.mint_date,
    wallet_id: form.wallet_id || null,
    minted: false,
image_url,
user_id: user?.id,
mint_price: form.mint_price ? parseFloat(form.mint_price) : null,
mint_currency: form.mint_currency || "ETH",
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

  const handleDuplicateProject = async (project: Project) => {
    setDuplicatingProjectId(project.id);
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from("projects")
      .insert([{
        name: project.name,
        wl_status: project.wl_status,
        mint_date: project.mint_date,
        wallet_id: project.wallet_id,
        minted: false,
        image_url: project.image_url,
        notes: cleanOptionalText(project.notes) || null,
        x_link: cleanOptionalText(project.x_link) || null,
        discord_link: cleanOptionalText(project.discord_link) || null,
        user_id: user?.id,
        
      }])
      .select("*, wallets(id, name, address)")
      .single();

    setDuplicatingProjectId(null);
    if (error) { console.error("Duplicate error:", error.message); return; }
    if (data) setProjects((prev) => [data, ...prev]);
  };

  const openEditModal = (project: Project) => {
    setEditProject(project);
    setEditForm({
      name: project.name,
      wl_status: project.wl_status,
      mint_date: project.mint_date,
      wallet_id: project.wallet_id || "",
image: null,
mint_price: project.mint_price?.toString() || "",
mint_currency: project.mint_currency || "ETH",
    });
    setEditImagePreview(project.image_url || null);
  };

  const closeEditModal = () => {
    setEditProject(null);
    setEditForm(emptyForm);
    setEditImagePreview(null);
  };

  const handleEditSave = async () => {
    if (!editProject || !editForm.name.trim() || !editForm.mint_date.match(/^\d{4}-\d{2}-\d{2}$/)) return;
    setEditUploading(true);

    let image_url = editProject.image_url;

    if (editForm.image) {
      const ext = editForm.image.name.split(".").pop();
      const fileName = `${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("project-images")
        .upload(fileName, editForm.image);

      if (uploadError) {
        console.error("Upload error:", uploadError.message);
        setEditUploading(false);
        return;
      }

      const { data: urlData } = supabase.storage
        .from("project-images")
        .getPublicUrl(fileName);

      image_url = urlData.publicUrl;
    }

    const { data, error } = await supabase
      .from("projects")
      .update({
        name: editForm.name.trim(),
        wl_status: editForm.wl_status,
        mint_date: editForm.mint_date,
wallet_id: editForm.wallet_id || null,
image_url,
mint_price: editForm.mint_price ? parseFloat(editForm.mint_price) : null,
mint_currency: editForm.mint_currency || "ETH",
      })
      .eq("id", editProject.id)
      .select("*, wallets(id, name, address)")
      .single();

    setEditUploading(false);
    if (error) { console.error("Update error:", error.message); return; }
    if (data) setProjects((prev) => prev.map((p) => (p.id === editProject.id ? data : p)));
    closeEditModal();
  };

  const handleMarkAsMinted = async (id: string) => {
    const project = projects.find((p) => p.id === id);
    if (!project) return;
    const newMinted = !project.minted;
    const { error } = await supabase.from("projects").update({ minted: newMinted }).eq("id", id);
    if (error) { console.error("Update error:", error.message); return; }
    setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, minted: newMinted } : p)));
  };

  const isOverlayOpen = isModalOpen || deleteTargetId !== null || editProject !== null;

  useEffect(() => {
    if (!isOverlayOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (deleteTargetId) setDeleteTargetId(null);
        else if (editProject) closeEditModal();
        else closeModal();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", handleKeyDown); document.body.style.overflow = ""; };
  }, [isOverlayOpen, deleteTargetId, editProject]);

  return (
    <div className="relative min-h-full overflow-hidden bg-zinc-950">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(16,185,129,0.15),transparent)]" aria-hidden="true" />
      <div className="pointer-events-none absolute -right-32 top-1/3 h-96 w-96 rounded-full bg-emerald-500/5 blur-3xl" aria-hidden="true" />
      <div className="pointer-events-none absolute -left-32 bottom-0 h-80 w-80 rounded-full bg-teal-500/5 blur-3xl" aria-hidden="true" />

      <div className="relative mx-auto flex min-h-full max-w-6xl flex-col px-3 py-6 sm:px-6 sm:py-12 md:px-8">
        <header className="flex flex-col gap-4 sm:gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/5 px-3 py-1 text-xs font-medium tracking-wide text-emerald-400">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
              </span>
              Live tracker
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white min-[400px]:text-3xl sm:text-4xl lg:text-5xl">MintKeeper</h1>
            <p className="mt-2 text-sm text-zinc-400 sm:text-base md:text-lg">Never miss a mint again</p>
          </div>

          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:gap-3">
            <Link href="/wallets" className="inline-flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-800/50 px-4 py-2.5 text-sm font-medium text-zinc-300 transition-colors hover:border-zinc-600 hover:bg-zinc-800 hover:text-white">
  <WalletIcon />
  Wallets
</Link>
<Link href="/settings" className="inline-flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-800/50 px-4 py-2.5 text-sm font-medium text-zinc-300 transition-colors hover:border-zinc-600 hover:bg-zinc-800 hover:text-white">
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
  </svg>
  Settings
</Link>
            <button
  type="button"
  onClick={handleLogout}
  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-zinc-800/50 px-3 py-2.5 text-sm font-medium text-zinc-300 transition-colors hover:border-zinc-600 hover:bg-zinc-800 hover:text-white min-[400px]:flex-none min-[400px]:px-4"
>
  Sign Out
</button>
            <button
              type="button"
              onClick={openModal}
              className="inline-flex w-full basis-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-zinc-950 shadow-lg shadow-emerald-500/20 transition-all hover:bg-emerald-400 active:scale-[0.98] min-[400px]:w-auto min-[400px]:basis-auto min-[400px]:px-5"
            >
              <PlusIcon />
              <span className="sm:hidden">Add</span>
              <span className="hidden sm:inline">Add Project</span>
            </button>
          </div>
        </header>

        <div className="mt-6 grid grid-cols-2 gap-2 sm:mt-8 sm:gap-3 sm:grid-cols-3 md:grid-cols-5">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 px-3 py-3 text-center sm:px-4 sm:py-3.5">
            <p className="text-xl font-bold text-white sm:text-2xl">{activeCount}</p>
            <p className="mt-0.5 text-[11px] text-zinc-500 sm:text-xs">Active</p>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 px-3 py-3 text-center sm:px-4 sm:py-3.5">
            <p className="text-xl font-bold text-white sm:text-2xl">{mintedCount}</p>
            <p className="mt-0.5 text-[11px] text-zinc-500 sm:text-xs">Minted</p>
          </div>
          <div className="col-span-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-3 py-3 text-center sm:col-span-1 sm:px-4 sm:py-3.5">
            <p className="text-xl font-bold text-emerald-400 sm:text-2xl">{mintingThisWeek}</p>
            <p className="mt-0.5 text-[11px] text-zinc-500 sm:text-xs">This Week</p>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 px-3 py-3 text-center sm:px-4 sm:py-3.5">
            <p className="text-xl font-bold text-emerald-400 sm:text-2xl">{gtdCount}</p>
            <p className="mt-0.5 text-[11px] text-zinc-500 sm:text-xs">GTD</p>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 px-3 py-3 text-center sm:px-4 sm:py-3.5">
            <p className="text-xl font-bold text-amber-400 sm:text-2xl">{fcfsCount}</p>
            <p className="mt-0.5 text-[11px] text-zinc-500 sm:text-xs">FCFS</p>
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

          <div className="mb-6 flex w-full rounded-xl border border-zinc-800 bg-zinc-900/50 p-1 sm:inline-flex sm:w-auto">
            {FILTER_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setFilter(option.value)}
                className={`flex-1 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors sm:flex-none sm:px-4 ${filter === option.value ? "bg-zinc-800 text-white shadow-sm" : "text-zinc-500 hover:text-zinc-300"}`}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
            {filteredProjects.map((project) => {
              const daysRemaining = getDaysRemaining(project.mint_date);
              const wlStatusColor = statusColorMap[project.wl_status];
              const xLink = cleanOptionalText(project.x_link);
              const discordLink = cleanOptionalText(project.discord_link);
              return (
                <article
                  key={project.id}
                  className={`group relative flex flex-col overflow-hidden rounded-2xl border backdrop-blur-sm transition-all duration-500 ${
                    project.minted
                      ? "border-zinc-600/70 bg-zinc-900/30 opacity-60 hover:opacity-80"
                      : "border-zinc-800/80 bg-zinc-900/50 hover:-translate-y-1 hover:border-emerald-500/40 hover:bg-zinc-900/85 hover:shadow-2xl hover:shadow-emerald-500/10"
                  }`}
                >
                  <Link href={`/project/${project.id}`} className="absolute inset-0 z-10" aria-label={`View ${project.name}`} />

                  {project.image_url ? (
                    <div className="relative h-40 w-full overflow-hidden bg-zinc-900">
                      <img src={project.image_url} alt={project.name} className="h-full w-full object-cover transition duration-700 ease-out group-hover:scale-110 group-hover:brightness-110" />
                      <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/65 via-transparent to-zinc-950/20 opacity-80 transition-opacity duration-500 group-hover:opacity-60" />
                    </div>
                  ) : (
                    <div className="relative flex h-40 w-full items-center justify-center overflow-hidden bg-gradient-to-br from-zinc-800 via-zinc-900 to-emerald-950/40">
                      <div className="absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100 bg-[radial-gradient(circle_at_50%_0%,rgba(52,211,153,0.18),transparent_45%)]" />
                      <span className="relative text-3xl font-bold text-zinc-700 transition-colors duration-500 group-hover:text-emerald-400/50">{project.name.slice(0, 2).toUpperCase()}</span>
                    </div>
                  )}

                  <div className="flex flex-col p-4 flex-1 sm:p-6">
                    <div className="absolute right-2 top-2 z-20 flex gap-1">
                    <button
                      type="button"
                      onClick={() => handleDuplicateProject(project)}
                      disabled={duplicatingProjectId === project.id}
                      className="rounded-lg bg-zinc-900/70 p-1.5 text-zinc-400 transition-colors hover:bg-zinc-700/50 hover:text-white disabled:cursor-wait disabled:opacity-50"
                      aria-label={`Duplicate ${project.name}`}
                    >
                      <DuplicateIcon />
                    </button>

                    <button
                      type="button"
                      onClick={() => openEditModal(project)}
                      className="rounded-lg bg-zinc-900/70 p-1.5 text-emerald-400 transition-colors hover:bg-emerald-500/10 hover:text-emerald-300"
                      aria-label={`Edit ${project.name}`}
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                      </svg>
                    </button>

                    <button
                      type="button"
                      onClick={() => setDeleteTargetId(project.id)}
                      className="rounded-lg bg-zinc-900/70 p-1.5 text-red-400 transition-colors hover:bg-red-500/10 hover:text-red-300"
                      aria-label={`Delete ${project.name}`}
                    >
                      <TrashIcon />
                    </button>
                    </div>

                    <div className="mb-4 flex items-start justify-between gap-2 sm:mb-5 sm:gap-3">
                      <h3 className="min-w-0 flex-1 text-base font-semibold text-white transition-colors group-hover:text-emerald-50 sm:text-lg">{project.name}</h3>
                      <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${statusStyles[wlStatusColor]}`}>
                        {project.wl_status}
                      </span>
                    </div>

                    <dl className="mt-auto space-y-2 sm:space-y-3">
                      <div className="flex items-center justify-between gap-4 rounded-lg bg-zinc-800/40 px-3 py-2.5">
  <dt className="flex items-center gap-2 text-sm text-zinc-500">
    <CalendarIcon />
    Mint Date
  </dt>
  <dd className="text-right">
    <p className="text-sm font-medium text-zinc-200">{formatMintDate(project.mint_date)}</p>
    <p className={`text-xs font-semibold tabular-nums ${daysRemaining === 0 ? "text-red-400" : "text-emerald-400"}`}>
      {daysRemaining === 0 ? "Today" : `${daysRemaining} days left`}
    </p>
  </dd>
</div>
                      {project.wallets && (
                        <div className="flex flex-col gap-0.5 rounded-lg bg-zinc-800/40 px-3 py-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:py-2.5">
                          <dt className="flex items-center gap-2 text-xs text-zinc-500 sm:text-sm"><WalletIcon />Wallet</dt>
                          <dd className="truncate text-xs font-medium text-zinc-200 sm:text-sm">{project.wallets.name}</dd>
                        </div>
                      )}
                      {project.mint_price && (
  <div className="group/price relative flex items-center justify-between gap-4 rounded-lg bg-zinc-800/40 px-3 py-2.5">
    <dt className="text-sm text-zinc-500">Mint Price</dt>
    <dd className="flex items-center gap-2">
      <ChainBadge chain={(project.mint_currency ?? "ETH") as Chain} showLabel={false} size={16} />
      <div className="text-right">
        <p className="text-sm font-semibold text-white">{project.mint_price} {project.mint_currency}</p>
        {cryptoPrices[project.mint_currency ?? ""] && (
          <p className="text-xs text-emerald-400">
            ≈ {getUsdValue(project.mint_price, project.mint_currency ?? "", cryptoPrices)} USD
          </p>
        )}
      </div>
      <div className="pointer-events-none absolute bottom-full right-0 mb-2 hidden w-44 rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2.5 shadow-xl group-hover/price:block z-30">
        <p className="text-xs text-zinc-500 mb-1">Mint Price</p>
        <div className="flex items-center gap-2">
          <ChainBadge chain={(project.mint_currency ?? "ETH") as Chain} showLabel={false} size={18} />
          <span className="text-sm font-semibold text-white">{project.mint_price} {project.mint_currency}</span>
        </div>
        {cryptoPrices[project.mint_currency ?? ""] && (
          <p className="mt-1 text-xs text-emerald-400">≈ {getUsdValue(project.mint_price, project.mint_currency ?? "", cryptoPrices)} USD</p>
        )}
      </div>
    </dd>
  </div>
)}
                    </dl>

                    {(xLink || discordLink) && (
                      <div className="flex flex-wrap items-center gap-2 pt-3">
                        {xLink && (
                          <a href={xLink} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="relative z-20 inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800/40 px-2.5 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:border-zinc-600 hover:text-white">
                            𝕏 Twitter
                          </a>
                        )}
                        {discordLink && (
                          <a href={discordLink} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="relative z-20 inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800/40 px-2.5 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:border-zinc-600 hover:text-white">
                            💬 Discord
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
            <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3 sm:px-6 sm:py-4">
              <h2 className="text-lg font-semibold text-white">Add Project</h2>
              <button type="button" onClick={closeModal} className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"><CloseIcon /></button>
            </div>
            <form className="space-y-4 px-4 py-4 sm:px-6 sm:py-5" onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-zinc-300">Cover Image <span className="text-zinc-600">(optional)</span></label>
                {imagePreview ? (
                  <div className="relative h-32 w-full overflow-hidden rounded-lg">
                    <img src={imagePreview} alt="Preview" className="h-full w-full object-cover" />
                    <button type="button" onClick={() => { setImagePreview(null); setForm((p) => ({ ...p, image: null })); }} className="absolute right-2 top-2 rounded-lg bg-zinc-900/80 p-1 text-zinc-400 hover:text-white">
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
                <div className="grid grid-cols-1 gap-2 min-[400px]:grid-cols-3">
                  <select value={form.mint_date ? form.mint_date.split("-")[1] : ""} onChange={(e) => { const parts = form.mint_date ? form.mint_date.split("-") : ["", "", ""]; parts[1] = e.target.value; setForm((p) => ({ ...p, mint_date: parts.join("-") })); }} className={`${inputClassName} cursor-pointer`}>
                    <option value="">Month</option>
                    {["January","February","March","April","May","June","July","August","September","October","November","December"].map((m, i) => (<option key={m} value={String(i + 1).padStart(2, "0")}>{m}</option>))}
                  </select>
                  <select value={form.mint_date ? form.mint_date.split("-")[2] : ""} onChange={(e) => { const parts = form.mint_date ? form.mint_date.split("-") : ["", "", ""]; parts[2] = e.target.value; setForm((p) => ({ ...p, mint_date: parts.join("-") })); }} className={`${inputClassName} cursor-pointer`}>
                    <option value="">Day</option>
                    {Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, "0")).map((d) => (<option key={d} value={d}>{Number(d)}</option>))}
                  </select>
                  <select value={form.mint_date ? form.mint_date.split("-")[0] : ""} onChange={(e) => { const parts = form.mint_date ? form.mint_date.split("-") : ["", "", ""]; parts[0] = e.target.value; setForm((p) => ({ ...p, mint_date: parts.join("-") })); }} className={`${inputClassName} cursor-pointer`}>
                    <option value="">Year</option>
                    {["2026", "2027", "2028"].map((y) => (<option key={y} value={y}>{y}</option>))}
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
              
              <div>
  <label className="mb-1.5 block text-sm font-medium text-zinc-300">Mint Price <span className="text-zinc-600">(optional)</span></label>
  <MintPriceInput
    price={form.mint_price}
    currency={form.mint_currency}
    onPriceChange={(v) => setForm((p) => ({ ...p, mint_price: v }))}
    onCurrencyChange={(v) => setForm((p) => ({ ...p, mint_currency: v }))}
  />
</div>


              <div className="flex gap-3 pt-2">
                <button type="button" onClick={closeModal} className="flex-1 rounded-xl border border-zinc-700 bg-zinc-800/50 px-4 py-2.5 text-sm font-medium text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors">Cancel</button>
                <button type="submit" disabled={uploading || !form.name.trim() || !form.mint_date.match(/^\d{4}-\d{2}-\d{2}$/)} className="flex-1 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-zinc-950 shadow-lg shadow-emerald-500/20 hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
                  {uploading ? "Uploading..." : "Save Project"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <button type="button" className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={closeEditModal} />
          <div className="relative w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 shadow-2xl shadow-black/50 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3 sm:px-6 sm:py-4">
              <h2 className="text-lg font-semibold text-white">Edit Project</h2>
              <button type="button" onClick={closeEditModal} className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"><CloseIcon /></button>
            </div>
            <form className="space-y-4 px-4 py-4 sm:px-6 sm:py-5" onSubmit={(e) => { e.preventDefault(); handleEditSave(); }}>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-zinc-300">Cover Image <span className="text-zinc-600">(optional)</span></label>
                {editImagePreview ? (
                  <div className="relative h-32 w-full overflow-hidden rounded-lg">
                    <img src={editImagePreview} alt="Preview" className="h-full w-full object-cover" />
                    <button type="button" onClick={() => { setEditImagePreview(null); setEditForm((p) => ({ ...p, image: null })); }} className="absolute right-2 top-2 rounded-lg bg-zinc-900/80 p-1 text-zinc-400 hover:text-white">
                      <CloseIcon />
                    </button>
                  </div>
                ) : (
                  <label className="flex h-32 w-full cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-zinc-700 bg-zinc-800/40 transition-colors hover:border-zinc-600 hover:bg-zinc-800/60">
                    <svg className="h-8 w-8 text-zinc-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
                    </svg>
                    <span className="mt-2 text-xs text-zinc-500">Click to upload new image</span>
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (!file) return; setEditForm((p) => ({ ...p, image: file })); setEditImagePreview(URL.createObjectURL(file)); }} />
                  </label>
                )}
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-zinc-300">Project Name</label>
                <input type="text" value={editForm.name} onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))} placeholder="e.g. Zelij Origins" className={inputClassName} autoFocus />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-zinc-300">WL Status</label>
                <select value={editForm.wl_status} onChange={(e) => setEditForm((p) => ({ ...p, wl_status: e.target.value as WlStatus }))} className={`${inputClassName} cursor-pointer`}>
                  {WL_STATUS_OPTIONS.map((s) => (<option key={s} value={s}>{s}</option>))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-zinc-300">Mint Date</label>
                <div className="grid grid-cols-1 gap-2 min-[400px]:grid-cols-3">
                  <select value={editForm.mint_date ? editForm.mint_date.split("-")[1] : ""} onChange={(e) => { const parts = editForm.mint_date ? editForm.mint_date.split("-") : ["", "", ""]; parts[1] = e.target.value; setEditForm((p) => ({ ...p, mint_date: parts.join("-") })); }} className={`${inputClassName} cursor-pointer`}>
                    <option value="">Month</option>
                    {["January","February","March","April","May","June","July","August","September","October","November","December"].map((m, i) => (<option key={m} value={String(i + 1).padStart(2, "0")}>{m}</option>))}
                  </select>
                  <select value={editForm.mint_date ? editForm.mint_date.split("-")[2] : ""} onChange={(e) => { const parts = editForm.mint_date ? editForm.mint_date.split("-") : ["", "", ""]; parts[2] = e.target.value; setEditForm((p) => ({ ...p, mint_date: parts.join("-") })); }} className={`${inputClassName} cursor-pointer`}>
                    <option value="">Day</option>
                    {Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, "0")).map((d) => (<option key={d} value={d}>{Number(d)}</option>))}
                  </select>
                  <select value={editForm.mint_date ? editForm.mint_date.split("-")[0] : ""} onChange={(e) => { const parts = editForm.mint_date ? editForm.mint_date.split("-") : ["", "", ""]; parts[0] = e.target.value; setEditForm((p) => ({ ...p, mint_date: parts.join("-") })); }} className={`${inputClassName} cursor-pointer`}>
                    <option value="">Year</option>
                    {["2026", "2027", "2028"].map((y) => (<option key={y} value={y}>{y}</option>))}
                  </select>
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-zinc-300">Wallet <span className="text-zinc-600">(optional)</span></label>
                <select value={editForm.wallet_id} onChange={(e) => setEditForm((p) => ({ ...p, wallet_id: e.target.value }))} className={`${inputClassName} cursor-pointer`}>
                  <option value="">No wallet</option>
                  {wallets.map((w) => (<option key={w.id} value={w.id}>{w.name} — {w.address.slice(0, 6)}...{w.address.slice(-4)}</option>))}
                </select>
              </div>
              <div>
  <label className="mb-1.5 block text-sm font-medium text-zinc-300">Mint Price <span className="text-zinc-600">(optional)</span></label>
  <MintPriceInput
    price={editForm.mint_price}
    currency={editForm.mint_currency}
    onPriceChange={(v) => setEditForm((p) => ({ ...p, mint_price: v }))}
    onCurrencyChange={(v) => setEditForm((p) => ({ ...p, mint_currency: v }))}
  />
</div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={closeEditModal} className="flex-1 rounded-xl border border-zinc-700 bg-zinc-800/50 px-4 py-2.5 text-sm font-medium text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors">Cancel</button>
                <button type="submit" disabled={editUploading || !editForm.name.trim() || !editForm.mint_date.match(/^\d{4}-\d{2}-\d{2}$/)} className="flex-1 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-zinc-950 shadow-lg shadow-emerald-500/20 hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
                  {editUploading ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
