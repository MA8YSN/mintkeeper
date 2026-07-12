import { supabase } from "@/lib/supabase";

export async function connectTwitter() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "twitter",
    options: {
      redirectTo: `${window.location.origin}/settings/callback?provider=twitter`,
    },
  });
  if (error) {
    console.error("Twitter link error:", error.message);
    throw error;
  }
}