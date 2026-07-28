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

export type ProjectRow = {
  id: string;
  user_id: string;
  name: string;
  wl_status: "FCFS" | "GTD";
  mint_date: string | null;
  wallet_id: string | null;
  image_url: string | null;
  notes: string | null;
  x_link: string | null;
  discord_link: string | null;
  mint_price: number | null;
  mint_currency: string | null;
  minted: boolean;
  original_project_id: string | null;
  created_at: string;
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
 * Fetch any project by ID regardless of ownership.
 * Used to render read-only view for non-owners.
 */
export async function getProjectById(projectId: string): Promise<ProjectRow | null> {
  const { data, error } = await supabase
    .from("projects")
    .select("*, wallets(id, name, address)")
    .eq("id", projectId)
    .single();

  if (error || !data) return null;
  return data as ProjectRow;
}

/**
 * Import a project into the current user's workspace.
 * Creates an independent copy. Stores original_project_id for duplicate detection.
 * Private fields (wallet, minted, reminders) are never copied.
 */
export async function importProject(
  userId: string,
  sourceProjectId: string
): Promise<string> {
  const source = await getProjectById(sourceProjectId);
  if (!source) throw new Error("Project not found");

  // Duplicate check
  const { data: existing } = await supabase
    .from("projects")
    .select("id")
    .eq("user_id", userId)
    .eq("original_project_id", sourceProjectId)
    .maybeSingle();

  if (existing) return existing.id;

  const { data, error } = await supabase
    .from("projects")
    .insert([{
      user_id: userId,
      name: source.name,
      image_url: source.image_url,
      mint_date: source.mint_date,
      mint_price: source.mint_price,
      mint_currency: source.mint_currency,
      wl_status: source.wl_status,
      notes: source.notes,
      x_link: source.x_link,
      discord_link: source.discord_link,
      minted: false,
      wallet_id: null,
      original_project_id: sourceProjectId,
    }])
    .select("id")
    .single();

  if (error || !data) throw new Error(`Failed to import project: ${error?.message}`);

  return data.id;
}

/**
 * Check if the current user has already imported a specific project.
 * Returns the imported project's ID if found, null otherwise.
 */
export async function getExistingImport(
  userId: string,
  sourceProjectId: string
): Promise<string | null> {
  const { data } = await supabase
    .from("projects")
    .select("id")
    .eq("user_id", userId)
    .eq("original_project_id", sourceProjectId)
    .maybeSingle();

  return data?.id ?? null;
}