import { supabase } from "@/lib/supabase";

export async function connectDiscord() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "discord",
    options: {
      redirectTo: `${window.location.origin}/settings/callback?provider=discord`,
      scopes: "identify",
    },
  });
  if (error) console.error("Discord OAuth error:", error.message);
} 