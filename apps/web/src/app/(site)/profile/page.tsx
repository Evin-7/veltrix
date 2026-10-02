import type { Metadata } from "next";
import { Heart } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AccountNav } from "@/features/account/account-nav";
import { ProfileForm } from "@/features/account/profile-form";
import { PageHeader, Stat } from "@/components/ui/layout-primitives";
import { formatCurrency } from "@/lib/currency";
import { getCurrentUser } from "@/server/auth/session";
import { listFavouriteGameIds, listRecentGames } from "@/server/users/service";
import {
  getWalletSummary,
  listWalletTransactions,
} from "@/server/wallet/service";

export const metadata: Metadata = { title: "Profile" };
export const dynamic = "force-dynamic";

function initials(label: string) {
  return label.slice(0, 2).toUpperCase();
}

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/profile");
  const profile = user.profile;
  const label = profile?.displayName || profile?.username || user.email;
  const playerData =
    user.role === "PLAYER"
      ? await Promise.all([
          listRecentGames(user.id, 4),
          listFavouriteGameIds(user.id),
          getWalletSummary(user.id),
          listWalletTransactions(user.id, { page: 1, pageSize: 1 }),
        ])
      : null;

  return (
    <main className="page-shell player-page">
      <PageHeader
        action={
          <Link
            className="focus-ring hidden items-center rounded-[var(--radius-control)] border border-border px-4 py-3 text-xs font-semibold text-muted-strong hover:bg-surface-hover hover:text-ink sm:inline-flex"
            href="/casino"
          >
            Explore lobby
          </Link>
        }
        description="Keep your identity close, and let the lobby remember your rhythm."
        eyebrow="Your corner of Veltrix"
        title="Profile"
      />
      <div className="mt-8 max-w-4xl">
        <AccountNav />
      </div>
      <section className="player-section grid gap-10 lg:grid-cols-[0.72fr_1.28fr]">
        <div className="border-y border-border py-7 sm:py-9">
          <div className="flex items-center gap-4">
            <span
              className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-2xl bg-gradient-to-br from-[#e8b86a] to-[#a86246] text-lg font-bold text-[#17110a]"
              style={
                profile?.avatarUrl
                  ? {
                      backgroundImage: `url(\"${profile.avatarUrl}\")`,
                      backgroundPosition: "center",
                      backgroundSize: "cover",
                    }
                  : undefined
              }
            >
              {profile?.avatarUrl ? (
                <span className="sr-only">{initials(label)}</span>
              ) : (
                initials(label)
              )}
            </span>
            <div className="min-w-0">
              <h2 className="truncate text-xl font-semibold text-ink">
                {label}
              </h2>
              <p className="mt-1 truncate text-xs text-muted">
                @{profile?.username ?? "veltrix-player"}
              </p>
            </div>
          </div>
          <div className="mt-8 grid gap-5 border-t border-border pt-6">
            <div className="flex items-center gap-3">
              <div>
                <p className="text-[10px] uppercase tracking-[0.12em] text-muted">
                  Member since
                </p>
                <p className="mt-1 text-sm font-semibold text-ink">
                  {new Intl.DateTimeFormat("en-US", {
                    month: "long",
                    year: "numeric",
                  }).format(new Date(user.createdAt))}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div>
                <p className="text-[10px] uppercase tracking-[0.12em] text-muted">
                  Account
                </p>
                <p className="mt-1 text-sm font-semibold text-ink">
                  {user.role === "PLAYER"
                    ? "Player access"
                    : `${user.role.replace("_", " ")} · internal access`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div>
                <p className="text-[10px] uppercase tracking-[0.12em] text-muted">
                  Email
                </p>
                <p className="mt-1 truncate text-sm font-semibold text-ink">
                  {user.email}
                </p>
              </div>
            </div>
          </div>
        </div>
        <div className="lg:border-l lg:border-border lg:pl-10">
          <p className="eyebrow">Personal information</p>
          <h2 className="display mt-3 text-3xl text-ink">
            Make it feel like yours.
          </h2>
          <p className="mt-3 max-w-lg text-sm leading-6 text-muted">
            Update your display name and optional avatar. Protected account
            fields remain unchanged here.
          </p>
          <div className="mt-7">
            <ProfileForm
              initialAvatarUrl={profile?.avatarUrl ?? null}
              initialDisplayName={
                profile?.displayName ?? profile?.username ?? ""
              }
            />
          </div>
        </div>
      </section>
      {playerData ? (
        <section className="mt-14 grid gap-6 border-y border-border py-6 sm:grid-cols-3">
          <Link className="group" href="/wallet">
            <Stat
              label="Balance"
              value={
                <>
                  {formatCurrency(playerData[2].balance)}
                </>
              }
              detail={
                <>
                  Open wallet
                </>
              }
            />
          </Link>
          <Link className="group" href="/transactions">
            <Stat
              label="Ledger entries"
              value={playerData[3].meta.total.toLocaleString("en-US")}
              detail={
                <>
                  View history
                </>
              }
            />
          </Link>
          <Stat
            label="Saved rhythm"
            value={playerData[1].length + playerData[0].length}
            detail={
              <>
                <Heart className="mr-1 inline text-favorite" size={12} />{" "}
                Favourites + recent
              </>
            }
          />
        </section>
      ) : null}
    </main>
  );
}
