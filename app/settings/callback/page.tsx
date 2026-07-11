import { Suspense } from "react";
import CallbackContent from "./CallbackContent";


export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-zinc-950">
          <div className="text-center">
            <div className="mx-auto mb-4 h-6 w-6 animate-spin rounded-full border-2 border-zinc-700 border-t-emerald-400" />
            <p className="text-sm text-zinc-500">Connecting account...</p>
          </div>
        </div>
      }
    >
      <CallbackContent />
    </Suspense>
  );
}