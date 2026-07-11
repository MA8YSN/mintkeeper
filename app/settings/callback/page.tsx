"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { connectTwitter } from "@/lib/oauth/twitter";
import { connectDiscord } from "@/lib/oauth/discord";

type ConnectedAccount = {
  id: string;
  provider: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  connected_at: string;
};

type UserProfile = {
  email: string;
  id: string;
};
 
const PROVIDERS = [
  {
    key: "twitter",
    label: "X / Twitter",
    icon: (
      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.253 5.622 5.911-5.622Zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
    color: "text-white",
    bg: "bg-zinc-900 border-zinc-700",
  },
  {
    key: "discord",
    label: "Discord",
    icon: (
      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.002.022.015.045.03.056a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" />
      </svg>
    ),
    color: "text-indigo-400",
    bg: "bg-zinc-900 border-zinc-700",
  },
];

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setUser({ email: user.email ?? "", id: user.id });

      const { data } = await supabase
        .from("connected_accounts")
        .select("*")
        .eq("user_id", user.id);

      if (data) setAccounts(data);
      setLoading(false);
    };
    load();
  }, []);

  const handleConnect = async (provider: "twitter" | "discord") => {
  if (provider === "twitter") await connectTwitter();
  if (provider === "discord") await connectDiscord();
};

  const handleDisconnect = async (provider: string) => {
    setDisconnecting(provider);
    const { error } = await supabase
      .from("connected_accounts")
      .delete()
      .eq("user_id", user!.id)
      .eq("provider", provider);

    if (!error) {
      setAccounts((prev) => prev.filter((a) => a.provider !== provider));
    }
    setDisconnecting(null);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-700 border-t-emerald-400" />
      </div>
    );
  } 

  return (
    <div className="relative min-h-screen bg-zinc-950">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(16,185,129,0.12),transparent)]" aria-hidden="true" />

      <div className="relative mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">

        <Link href="/" className="mb-6 inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-300 transition-colors">
          ← Back to Projects
        </Link>

        <h1 className="mb-8 text-3xl font-bold text-white">Settings</h1>

        {/* Account Info */}
        <section className="mb-8 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
          <h2 className="mb-4 text-sm font-medium uppercase tracking-wider text-zinc-500">Account</h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-white">{user?.email}</p>
              <p className="mt-0.5 text-xs text-zinc-500">Signed in with email</p>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-xl border border-zinc-700 bg-zinc-800/50 px-4 py-2 text-sm font-medium text-zinc-300 transition-colors hover:border-zinc-600 hover:bg-zinc-800 hover:text-white"
            >
              Sign Out
            </button>
          </div>
        </section>

        {/* Connected Accounts */}
        <section className="mb-8 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
          <h2 className="mb-1 text-sm font-medium uppercase tracking-wider text-zinc-500">Connected Accounts</h2>
          <p className="mb-6 text-xs text-zinc-600">Connect your social accounts to enhance your MintKeeper experience.</p>

          <div className="space-y-3">
            {PROVIDERS.map((provider) => {
              const connected = accounts.find((a) => a.provider === provider.key);
              return (
                <div
                  key={provider.key}
                  className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3.5"
                >
                  <div className="flex items-center gap-3">
                    <div className={provider.color}>{provider.icon}</div>
                    <div>
                      <p className="text-sm font-medium text-white">{provider.label}</p>
                      {connected ? (
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {connected.avatar_url && (
                            <img src={connected.avatar_url} alt="" className="h-4 w-4 rounded-full" />
                          )}
                          <p className="text-xs text-zinc-400">
                            @{connected.username ?? connected.display_name}
                          </p>
                          <span className="text-xs text-zinc-600">·</span>
                          <p className="text-xs text-zinc-600">
                            Connected {new Date(connected.connected_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                          </p>
                        </div>
                      ) : (
                        <p className="text-xs text-zinc-600 mt-0.5">Not connected</p>
                      )}
                    </div>
                  </div>

                  {connected ? (
                    <button
                      type="button"
                      onClick={() => handleDisconnect(provider.key)}
                      disabled={disconnecting === provider.key}
                      className="rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-1.5 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/10 disabled:opacity-40"
                    >
                      {disconnecting === provider.key ? "Disconnecting..." : "Disconnect"}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleConnect(provider.key as "twitter" | "discord")}
                      className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-1.5 text-xs font-medium text-emerald-400 transition-colors hover:bg-emerald-500/10"
                    >
                      Connect
                    </button>
                  )}
                </div>
              );
            })}
          </div>
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