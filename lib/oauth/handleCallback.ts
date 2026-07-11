import { supabase } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";

export async function handleOAuthCallback(user: User, provider: string) {
  const identity = user.identities?.find((i) => i.provider === provider);
  if (!identity) return;

  const data = identity.identity_data ?? {};

  const payload = {
    user_id: user.id,
    provider,
    provider_user_id: identity.id,
    username: data.user_name ?? data.username ?? data.preferred_username ?? null,
    display_name: data.full_name ?? data.name ?? null,
    avatar_url: data.avatar_url ?? null,
    connected_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("connected_accounts")
    .upsert(payload, { onConflict: "user_id,provider" });

  if (error) console.error(`OAuth callback error [${provider}]:`, error.message);
}