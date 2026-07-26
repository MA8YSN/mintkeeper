import { supabase } from "@/lib/supabase";

export type ProjectUpdatePayload = {
  name?: string;
  wl_status?: "FCFS" | "GTD";
  mint_date?: string | null;
  wallet_id?: string | null;
  image_url?: string | null;
  notes?: string | null;
  x_link?: string | null;
  discord_link?: string | null;
  mint_price?: number | null;
  mint_currency?: string | null;
  minted?: boolean;
};

export type ProjectRow = ProjectUpdatePayload & {
  id: string;
  user_id: string;
  created_at: string;
};

/**
 * Single canonical function for updating a project.
 * Enforces ownership by scoping the update to the authenticated user's ID.
 * Throws on any Supabase error or if the row is not found (wrong owner or bad ID).
 * Returns the updated project row.
 */
export async function updateProject(
  userId: string,
  projectId: string,
  payload: ProjectUpdatePayload
): Promise<ProjectRow> {
 

  const { data, error } = await supabase
    .from("projects")
    .update(payload)
    .eq("id", projectId)
   .eq("user_id", userId)
    .select()
    .single();
console.log("UPDATE RESULT");

console.log({
  projectId,
  userId,
  payload,
  data,
  error,
});
  if (error) {
    throw new Error(`Failed to update project: ${error.message}`);
  }

  if (!data) {
    throw new Error(
      "Project not found or you do not have permission to update it."
    );
  }

  return data as ProjectRow;
}
import { generateShareId } from "@/lib/shareId";

// ── Public shape exposed on the share page ────────────────────────────────────
// Never include: user_id, wallet_id, minted, reminder history, internal IDs.
export type PublicProject = {
  share_id: string;
  name: string;
  image_url: string | null;
  mint_date: string | null;
  mint_price: number | null;
  mint_currency: string | null;
  wl_status: "FCFS" | "GTD";
  notes: string | null;
  x_link: string | null;
  discord_link: string | null;
  shared_at: string;
};

// Fields an importer's new project is seeded with.
// Intentionally omits: minted, wallet_id, user_id, share_id, is_shared.
export type ImportPayload = {
  name: string;
  image_url: string | null;
  mint_date: string | null;
  mint_price: number | null;
  mint_currency: string | null;
  wl_status: "FCFS" | "GTD";
  notes: string | null;
  x_link: string | null;
  discord_link: string | null;
};

/**
 * Enable sharing for a project owned by the authenticated user.
 * Generates a stable share_id on first share; reuses it on subsequent enables.
 * Returns the share_id.
 */
export async function enableSharing(projectId: string): Promise<string> {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw new Error("Not authenticated");

  // Fetch existing share_id so we can reuse it if the owner re-enables sharing.
  const { data: existing, error: fetchError } = await supabase
    .from("projects")
    .select("share_id")
    .eq("id", projectId)
    .eq("user_id", user.id)
    .single();

  if (fetchError || !existing) throw new Error("Project not found or access denied");

  const shareId = existing.share_id ?? generateShareId();

  const { error } = await supabase
    .from("projects")
    .update({
      share_id: shareId,
      is_shared: true,
      shared_at: new Date().toISOString(),
    })
    .eq("id", projectId)
    .eq("user_id", user.id);

  if (error) throw new Error(`Failed to enable sharing: ${error.message}`);

  return shareId;
}

/**
 * Disable sharing. The share_id is intentionally preserved so
 * the same link can be re-enabled later without breaking bookmarks.
 */
export async function disableSharing(projectId: string): Promise<void> {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("projects")
    .update({ is_shared: false })
    .eq("id", projectId)
    .eq("user_id", user.id);

  if (error) throw new Error(`Failed to disable sharing: ${error.message}`);
}

/**
 * Fetch a public project by share_id.
 * Returns only the public fields — never exposes private data.
 * Returns null if the project doesn't exist or sharing is disabled.
 */
export async function getPublicProject(shareId: string): Promise<PublicProject | null> {
  const { data, error } = await supabase
    .from("projects")
    .select(`
      share_id,
      name,
      image_url,
      mint_date,
      mint_price,
      mint_currency,
      wl_status,
      notes,
      x_link,
      discord_link,
      shared_at
    `)
    .eq("share_id", shareId)
    .eq("is_shared", true)
    .single();

  if (error || !data) return null;
  return data as PublicProject;
}

/**
 * Import a public project into the authenticated user's workspace.
 * Creates an independent copy — never links back to the original.
 * Private fields (wallet, minted, reminders) are never copied.
 */
export async function importProject(shareId: string): Promise<string> {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw new Error("Not authenticated");

  const source = await getPublicProject(shareId);
  if (!source) throw new Error("Project unavailable");

  const payload: ImportPayload & { user_id: string; minted: boolean } = {
    name: source.name,
    image_url: source.image_url,
    mint_date: source.mint_date,
    mint_price: source.mint_price,
    mint_currency: source.mint_currency,
    wl_status: source.wl_status,
    notes: source.notes,
    x_link: source.x_link,
    discord_link: source.discord_link,
    user_id: user.id,
    minted: false,
  };

  const { data, error } = await supabase
    .from("projects")
    .insert([payload])
    .select("id")
    .single();

  if (error || !data) throw new Error(`Failed to import project: ${error?.message}`);

  return data.id;
}