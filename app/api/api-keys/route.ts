import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabase } from "@/lib/supabase";
import { generateApiKey } from "@/lib/apiKey";

// GET — fetch user's API key
export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data } = await supabase
    .from("api_keys")
    .select("key, name, created_at, last_used_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  return NextResponse.json({ key: data ?? null });
}

// POST — generate new API key
export async function POST() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const newKey = generateApiKey();

  // Delete old keys for this user
  await supabase.from("api_keys").delete().eq("user_id", userId);

  // Insert new key
  const { data, error } = await supabase
    .from("api_keys")
    .insert([{ user_id: userId, key: newKey, name: "Chrome Extension" }])
    .select()
    .single();

  if (error) return NextResponse.json({ error: "Failed to generate key" }, { status: 500 });

  return NextResponse.json({ key: data });
}

// DELETE — revoke API key
export async function DELETE() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await supabase.from("api_keys").delete().eq("user_id", userId);

  return NextResponse.json({ success: true });
}