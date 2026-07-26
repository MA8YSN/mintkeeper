import { NextRequest, NextResponse } from "next/server";
import { importProject } from "@/lib/projectService";

export async function POST(req: NextRequest) {
  try {
    const { shareId } = await req.json();
    if (!shareId || typeof shareId !== "string") {
      return NextResponse.json({ error: "shareId is required" }, { status: 400 });
    }
    const projectId = await importProject(shareId);
    return NextResponse.json({ success: true, projectId }, { status: 201 });
  } catch (err: any) {
    const status = err.message.includes("authenticated") ? 401
      : err.message.includes("unavailable") ? 404
      : 500;
    return NextResponse.json({ error: err.message }, { status });
  }
}