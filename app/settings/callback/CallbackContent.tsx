"use client";
import { useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const provider = searchParams.get("provider");

  useEffect(() => {
    const run = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        router.push("/login");
        return;
      }

      const user = session.user;
      const identity = user.identities?.find((i) => i.provider === provider);

      if (identity && provider) {
        const d = identity.identity_data ?? {};
        await supabase.from("connected_accounts").upsert({
          user_id: user.id,
          provider,
          provider_user_id: identity.id,
          username: d.user_name ?? d.username ?? d.preferred_username ?? null,
          display_name: d.full_name ?? d.name ?? null,
          avatar_url: d.avatar_url ?? null,
          connected_at: new Date().toISOString(),
        }, { onConflict: "user_id,provider" });
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