import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-zinc-950">
      <p className="text-zinc-400">Project unavailable.</p>
      <p className="text-xs text-zinc-600">
        This project may not exist or sharing has been disabled.
      </p>
      <Link href="/" className="text-sm text-emerald-400 hover:text-emerald-300">
        Open MintKeeper
      </Link>
    </div>
  );
}