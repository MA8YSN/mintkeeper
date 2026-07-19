import { supabase } from "@/lib/supabase";

export function generateApiKey(): string {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const random = Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map((b) => chars[b % chars.length])
    .join("");
  return `mk_live_${random}`;
}

export async function validateApiKey(key: string): Promise<string | null> {
  if (!key?.startsWith("mk_live_")) return null;

  const { data, error } = await supabase
    .from("api_keys")
    .select("user_id")
    .eq("key", key)
    .single();

  if (error || !data) return null;

  // Update last_used_at in background
  supabase
    .from("api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("key", key)
    .then(() => {});

  return data.user_id;
}