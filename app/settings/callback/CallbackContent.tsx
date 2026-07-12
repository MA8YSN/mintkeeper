"use client";
import { useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { handleOAuthCallback } from "@/lib/oauth/handleCallback";

export default function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const provider = searchParams.get("provider");

  useEffect(() => {
    const run = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error || !session) {
        router.push("/login");
        return;
      }

      if (provider) {
        await handleOAuthCallback(session.user, provider);
      }

      router.push("/settings");
    };

    run();
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950">
      <div className="text-center">
        <div className="mx-auto mb-4 h-6 w-6 animate-spin rounded-full border-2 border-zinc-700 border-t-emerald-400" />
        <p className="text-sm text-zinc-500">Connecting account...</p>
      </div>
    </div>
  );
}