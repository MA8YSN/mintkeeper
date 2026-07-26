import { getPublicProject } from "@/lib/projectService";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import SharePageClient from "./SharePageClient";

type Props = { params: { shareId: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const project = await getPublicProject(params.shareId);
  if (!project) return { title: "Project Unavailable — MintKeeper" };
  return {
    title: `${project.name} — MintKeeper`,
    description: project.notes?.slice(0, 160) ?? `Mint date: ${project.mint_date ?? "TBA"}`,
    openGraph: {
      title: project.name,
      images: project.image_url ? [project.image_url] : [],
    },
  };
}

export default async function SharePage({ params }: Props) {
  const project = await getPublicProject(params.shareId);
  if (!project) notFound();
  return <SharePageClient project={project} shareId={params.shareId} />;
}