import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { importProject } from "@/lib/projectService";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let sourceProjectId: string;
  try {
    const body = await req.json();
    sourceProjectId = body.sourceProjectId;
    if (!sourceProjectId || typeof sourceProjectId !== "string") {
      return NextResponse.json({ error: "sourceProjectId is required" }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  try {
    const projectId = await importProject(userId, sourceProjectId);
    return NextResponse.json({ success: true, projectId }, { status: 201 });
  } catch (err: any) {
    const status = err.message.includes("not found") ? 404 : 500;
    return NextResponse.json({ error: err.message }, { status });
  }
}