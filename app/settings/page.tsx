"use client";
import { useUser, useClerk } from "@clerk/nextjs";
import Link from "next/link";
import { useState } from "react";

export default function SettingsPage() {
  const { user, isLoaded } = useUser();
  const { openUserProfile } = useClerk();
  const [disconnecting, setDisconnecting] = useState<string | null>(null);

  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-700 border-t-emerald-400" />
      </div>
    );
  }

  if (!user) return null;

  const discordAccount = user.externalAccounts.find((a) => a.provider === "discord");

  const twitterAccount = user.externalAccounts.find((a) => {
  const p = a.provider as string;
  return p === "x" || p === "twitter" || p.includes("twitter") || p.includes("x_oauth");
});

  const handleConnect = () => {
    openUserProfile();
  };

  const handleDisconnect = async (accountId: string, provider: string) => {
    setDisconnecting(provider);
    try {
      const account = user.externalAccounts.find((a) => a.id === accountId);
      if (account) {
        await account.destroy();
        await user.reload();
      }
    } catch (err: any) {
      console.error("Disconnect error:", err);
    } finally {
      setDisconnecting(null);
    }
  };

  return (
    <div className="relative min-h-screen bg-zinc-950">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(16,185,129,0.12),transparent)]" aria-hidden="true" />

      <div className="relative mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">

        <Link href="/" className="mb-6 inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-300 transition-colors">
          ← Back to Projects
        </Link>

        <h1 className="mb-8 text-3xl font-bold text-white">Settings</h1>

        {/* Account */}
        <section className="mb-8 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
          <h2 className="mb-4 text-sm font-medium uppercase tracking-wider text-zinc-500">Account</h2>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3.5">
            <p className="text-xs text-zinc-500 mb-0.5">Email</p>
            <p className="text-sm font-medium text-white">{user.primaryEmailAddress?.emailAddress}</p>
          </div>
        </section>

        {/* Connected Accounts */}
        <section className="mb-8 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
          <h2 className="mb-1 text-sm font-medium uppercase tracking-wider text-zinc-500">Connected Accounts</h2>
          <p className="mb-6 text-xs text-zinc-600">Link your social accounts to MintKeeper.</p>

          <div className="space-y-3">
            {/* X / Twitter */}
            <div className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3.5">
              <div className="flex items-center gap-3">
                <svg className="h-5 w-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.253 5.622 5.911-5.622Zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-white">X / Twitter</p>
                  {twitterAccount ? (
                    <p className="text-xs text-emerald-400 mt-0.5">@{twitterAccount.username ?? "Connected"}</p>
                  ) : (
                    <p className="text-xs text-zinc-600 mt-0.5">Not connected</p>
                  )}
                </div>
              </div>
              {twitterAccount ? (
                <button
                  type="button"
                  onClick={() => handleDisconnect(twitterAccount.id, "twitter")}
                  disabled={disconnecting === "twitter"}
                  className="rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-1.5 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/10 disabled:opacity-40"
                >
                  {disconnecting === "twitter" ? "Disconnecting..." : "Disconnect"}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleConnect}
                  className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-1.5 text-xs font-medium text-emerald-400 transition-colors hover:bg-emerald-500/10"
                >
                  Connect →
                </button>
              )}
            </div>

            {/* Discord */}
            <div className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3.5">
              <div className="flex items-center gap-3">
                <svg className="h-5 w-5 text-indigo-400" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.002.022.015.045.03.056a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-white">Discord</p>
                  {discordAccount ? (
                    <p className="text-xs text-emerald-400 mt-0.5">@{discordAccount.username ?? "Connected"}</p>
                  ) : (
                    <p className="text-xs text-zinc-600 mt-0.5">Not connected</p>
                  )}
                </div>
              </div>
              {discordAccount ? (
                <button
                  type="button"
                  onClick={() => handleDisconnect(discordAccount.id, "discord")}
                  disabled={disconnecting === "discord"}
                  className="rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-1.5 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/10 disabled:opacity-40"
                >
                  {disconnecting === "discord" ? "Disconnecting..." : "Disconnect"}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleConnect}
                  className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-1.5 text-xs font-medium text-emerald-400 transition-colors hover:bg-emerald-500/10"
                >
                  Connect →
                </button>
              )}
            </div>
          </div>

          <p className="mt-4 text-xs text-zinc-600">
            Clicking "Connect →" opens Clerk's account manager where you can safely link social accounts.
          </p>
        </section>

        {/* Danger Zone */}
        <section className="rounded-2xl border border-red-500/10 bg-red-500/5 p-6">
          <h2 className="mb-1 text-sm font-medium uppercase tracking-wider text-red-400/70">Danger Zone</h2>
          <p className="mb-4 text-xs text-zinc-600">Permanently delete your account and all associated data.</p>
          <button
            type="button"
            className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-2 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/10"
            onClick={() => alert("Contact support to delete your account.")}
          >
            Delete Account
          </button>
        </section>

      </div>
    </div>
  );
}