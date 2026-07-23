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