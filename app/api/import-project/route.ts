import { NextRequest, NextResponse } from "next/server";
import { validateApiKey } from "@/lib/apiKey";
import { supabase } from "@/lib/supabase";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, x-api-key",
  "Access-Control-Allow-Methods":
    "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};
export async function OPTIONS() {
  console.log("OPTIONS HIT");

  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers":
        "Content-Type, Authorization, x-api-key",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
    },
  });
}

export async function POST(req: NextRequest) {
  // Auth
  console.log("POST HIT");
const authHeader = req.headers.get("authorization");
const xApiKey = req.headers.get("x-api-key");

const apiKey =
  authHeader?.replace("Bearer ", "").trim() ||
  xApiKey?.trim();

  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing API key" },
      {
        status: 401,
        headers: corsHeaders,
      }
    );
  }

  const userId = await validateApiKey(apiKey);

  if (!userId) {
    return NextResponse.json(
      { error: "Invalid API key" },
      {
        status: 401,
        headers: corsHeaders,
      }
    );
  }

  // Parse body
  let body: any;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON" },
      {
        status: 400,
        headers: corsHeaders,
      }
    );
  }

  const { name, username, bio, website, avatar, banner } = body;

  if (!name?.trim()) {
    return NextResponse.json(
      { error: "Project name is required" },
      {
        status: 400,
        headers: corsHeaders,
      }
    );
  }

  const { data, error } = await supabase
    .from("projects")
    .insert([
      {
        user_id: userId,
        name: name.trim(),
        wl_status: "FCFS",
        minted: false,
        image_url: banner || avatar || null,
        x_link: username ? `https://x.com/${username}` : null,
        notes:
          [
            bio ? `Bio: ${bio}` : null,
            website ? `Website: ${website}` : null,
          ]
            .filter(Boolean)
            .join("\n") || null,
      },
    ])
    .select("id")
    .single();

 if (error) {
  console.error("SUPABASE ERROR:", error);

  return NextResponse.json(
    {
      error: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    },
    {
      status: 500,
      headers: corsHeaders,
    }
  );
}

  return NextResponse.json(
    {
      success: true,
      projectId: data.id,
    },
    {
      status: 201,
      headers: corsHeaders,
    }
  );
}