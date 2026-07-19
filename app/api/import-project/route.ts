import { NextRequest, NextResponse } from "next/server";
import { validateApiKey } from "@/lib/apiKey";
import { supabase } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  // Auth
  const authHeader = req.headers.get("authorization");
  const apiKey = authHeader?.replace("Bearer ", "").trim();

  if (!apiKey) {
    return NextResponse.json({ error: "Missing API key" }, { status: 401 });
  }

  const userId = await validateApiKey(apiKey);
  if (!userId) {
    return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
  }

  // Parse body
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { name, username, bio, website, avatar, banner } = body;

  if (!name?.trim()) {
    return NextResponse.json({ error: "Project name is required" }, { status: 400 });
  }

  // Map to existing projects schema
  const { data, error } = await supabase
    .from("projects")
    .insert([{
      user_id: userId,
      name: name.trim(),
      wl_status: "FCFS",
      minted: false,
      image_url: banner || avatar || null,
      x_link: username ? `https://x.com/${username}` : null,
      notes: [
        bio ? `Bio: ${bio}` : null,
        website ? `Website: ${website}` : null,
      ].filter(Boolean).join("\n") || null,
    }])
    .select("id")
    .single();

  if (error) {
    console.error("Import error:", error.message);
    return NextResponse.json({ error: "Failed to create project" }, { status: 500 });
  }

  return NextResponse.json({ success: true, projectId: data.id }, { status: 201 });
}