import { supabase } from "@/lib/supabase";
import { generateShareId } from "@/lib/shareId";

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
 * Single canonical function for updating a project.
 * Scoped to userId to enforce ownership.
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

  if (error) throw new Error(`Failed to update project: ${error.message}`);
  if (!data) throw new Error("Project not found or you do not have permission to update it.");

  return data as ProjectRow;
}

/**
 * Enable sharing for a project.
 * Reuses existing share_id if already generated so links remain stable.
 */
export async function enableSharing(
  userId: string,
  projectId: string
): Promise<string> {
  const { data: existing, error: fetchError } = await supabase
    .from("projects")
    .select("share_id")
    .eq("id", projectId)
    .eq("user_id", userId)
    .single();

  if (fetchError || !existing) {
    throw new Error("Project not found or access denied");
  }

  const shareId = existing.share_id ?? generateShareId();

  const { error } = await supabase
    .from("projects")
    .update({
      share_id: shareId,
      is_shared: true,
      shared_at: new Date().toISOString(),
    })
    .eq("id", projectId)
    .eq("user_id", userId);

  if (error) throw new Error(`Failed to enable sharing: ${error.message}`);

  return shareId;
}

/**
 * Disable sharing.
 * Preserves share_id so the same link can be re-enabled later.
 */
export async function disableSharing(
  userId: string,
  projectId: string
): Promise<void> {
  const { error } = await supabase
    .from("projects")
    .update({ is_shared: false })
    .eq("id", projectId)
    .eq("user_id", userId);

  if (error) throw new Error(`Failed to disable sharing: ${error.message}`);
}

/**
 * Fetch a public project by share_id.
 * Returns only public fields — never exposes private data.
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
 * Saves share_id on the imported row so duplicate checks work correctly.
 * Private fields (wallet, minted, reminders) are never copied.
 */
export async function importProject(
  userId: string,
  shareId: string
): Promise<string> {
  const source = await getPublicProject(shareId);
  if (!source) throw new Error("Project unavailable");

  // Duplicate check — has this user already imported this exact share?
  const { data: existing } = await supabase
    .from("projects")
    .select("id")
    .eq("user_id", userId)
    .eq("share_id", shareId)
    .maybeSingle();

  if (existing) return existing.id;

  const { data, error } = await supabase
    .from("projects")
    .insert([{
      name: source.name,
      image_url: source.image_url,
      mint_date: source.mint_date,
      mint_price: source.mint_price,
      mint_currency: source.mint_currency,
      wl_status: source.wl_status,
      notes: source.notes,
      x_link: source.x_link,
      discord_link: source.discord_link,
      user_id: userId,
      minted: false,
      share_id: shareId,   // enables duplicate detection on future imports
      is_shared: false,    // imported copy starts as private
    }])
    .select("id")
    .single();

  if (error || !data) throw new Error(`Failed to import project: ${error?.message}`);

  return data.id;
}