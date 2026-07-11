"use client";
import { useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter, useSearchParams } from "next/navigation";

export default function SettingsCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const provider = searchParams.get("provider");

  useEffect(() => {
    const save = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/login"); return; }

      const user = session.user;
      const identity = user.identities?.find((i) => i.provider === provider);

      if (identity && provider) {
        const identityData = identity.identity_data ?? {};
        await supabase.from("connected_accounts").upsert({
          user_id: user.id,
          provider,
          provider_user_id: identity.id,
          username: identityData.user_name ?? identityData.username ?? null,
          display_name: identityData.full_name ?? identityData.name ?? null,
          avatar_url: identityData.avatar_url ?? null,
          connected_at: new Date().toISOString(),
        }, { onConflict: "user_id,provider" });
      }

      router.push("/settings");
    };

    save();
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