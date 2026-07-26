import { NextRequest, NextResponse } from "next/server";
import { enableSharing, disableSharing } from "@/lib/projectService";

// POST → enable sharing, returns { shareId, url }
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const shareId = await enableSharing(id);
    return NextResponse.json({
      shareId,
      url: `${process.env.NEXT_PUBLIC_APP_URL}/p/${shareId}`,
    });
  } catch (err: any) {
    const status = err.message.includes("authenticated") ? 401
      : err.message.includes("access denied") ? 403
      : 500;
    return NextResponse.json({ error: err.message }, { status });
  }
}

// DELETE → disable sharing
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    await disableSharing(id);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    const status = err.message.includes("authenticated") ? 401 : 500;
    return NextResponse.json({ error: err.message }, { status });
  }
}