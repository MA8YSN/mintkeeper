import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-zinc-950 px-4 text-center">
      <div className="mb-2 text-4xl">🔒</div>
      <h1 className="text-lg font-semibold text-white">Project unavailable</h1>
      <p className="text-sm text-zinc-500">
        This project doesn't exist or sharing has been disabled by the owner.
      </p>
      <Link href="/"
        className="mt-4 rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-zinc-950 shadow-lg shadow-emerald-500/20 transition-all hover:bg-emerald-400">
        Open MintKeeper
      </Link>
    </div>
  );
}