import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(16,185,129,0.15),transparent)]" />
      <div className="relative">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-white">MintKeeper</h1>
          <p className="mt-2 text-sm text-zinc-500">Never miss a mint again</p>
        </div>
        <SignIn />
      </div>
    </div>
  );
}