"use client";

import Link from "next/link";
import { UserCheck, UserX } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import {
  AdminButton,
  AdminDialogFooter,
  AdminSearchInput,
} from "@/components/admin-form";
import { AdminModal } from "@/components/admin-modal";
import { AdminSelect } from "@/components/admin-select";
import {
  AdminShell,
  EmptyState,
  PageIntro,
  Panel,
  StatusPill,
  formatDate,
  formatVc,
} from "@/components/admin-shell";
import { apiFetch, type ApiMeta } from "@/lib/api";
import { notifyAdminSuccess } from "@/lib/admin-toast";

type Player = {
  id: string;
  email: string;
  status: "ACTIVE" | "DISABLED";
  createdAt: string;
  lastLoginAt: string | null;
  profile: { username: string; displayName: string | null } | null;
  wallet: { balance: number };
  _count: { gameSessions: number; walletTransactions: number };
};

function PlayersContent() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [meta, setMeta] = useState<ApiMeta | null>(null);
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [busy, setBusy] = useState("");
  const [playerToToggle, setPlayerToToggle] = useState<Player | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setLoadFailed(false);
      const params = new URLSearchParams({
        page: String(page),
        pageSize: "20",
      });
      if (appliedSearch) params.set("search", appliedSearch);
      if (status) params.set("status", status);
      try {
        const result = await apiFetch<Player[]>(
          `/api/v1/admin/players?${params}`,
        );
        if (!active) return;
        setPlayers(result.data);
        setMeta(result.meta ?? null);
      } catch {
        // apiFetch reports request failures through the shared admin toast.
        if (active) setLoadFailed(true);
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [appliedSearch, page, refreshVersion, status]);

  function searchPlayers(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextSearch = search.trim();
    if (page !== 1) setPage(1);
    if (appliedSearch === nextSearch && page === 1) {
      // Re-submitting the current query is an explicit refresh.
      setRefreshVersion((value) => value + 1);
      return;
    }
    setAppliedSearch(nextSearch);
  }

  async function toggle() {
    if (!playerToToggle || busy) return;
    const player = playerToToggle;
    setBusy(player.id);
    try {
      await apiFetch(`/api/v1/admin/players/${player.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({
          status: player.status === "ACTIVE" ? "DISABLED" : "ACTIVE",
        }),
      });
      setPlayerToToggle(null);
      notifyAdminSuccess(
        `${player.email} is now ${player.status === "ACTIVE" ? "disabled" : "active"}.`,
      );
      // The status change succeeded. A later list refresh has its own toast and
      // must not make the completed mutation appear to have failed.
      setRefreshVersion((value) => value + 1);
    } catch {
      // apiFetch reports mutation failures through the shared admin toast.
    } finally {
      setBusy("");
    }
  }

  const closeToggle = () => {
    if (!busy) setPlayerToToggle(null);
  };

  return (
    <>
      <PageIntro
        title="Players"
        description="Search player accounts, inspect wallet activity, and manage access with every status change recorded in the audit log."
        action={
          <div className="admin-status admin-status--success">
            {meta?.total ?? "—"} player accounts
          </div>
        }
      />
      <Panel className="mb-6 p-4">
        <form
          onSubmit={searchPlayers}
          className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px_auto]"
        >
          <AdminSearchInput
            aria-label="Search players"
            label="Search players by name or email"
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name or email"
            value={search}
          />
          <AdminSelect
            ariaLabel="Player status"
            onValueChange={(value) => {
              setStatus(value);
              setPage(1);
            }}
            options={[
              { value: "", label: "All statuses" },
              { value: "ACTIVE", label: "Active" },
              { value: "DISABLED", label: "Disabled" },
            ]}
            value={status}
          />
          <AdminButton type="submit" loading={loading} loadingText="Searching…">
            Search players
          </AdminButton>
        </form>
      </Panel>
      <AdminModal
        description={
          playerToToggle?.status === "ACTIVE"
            ? "Disabling revokes the player's active sessions and blocks further access."
            : "Enabling restores this player's access to the platform."
        }
        footer={
          <AdminDialogFooter>
            <AdminButton
              disabled={Boolean(busy)}
              onClick={closeToggle}
              variant="secondary"
            >
              Cancel
            </AdminButton>
            <AdminButton
              loading={Boolean(busy)}
              loadingText="Saving…"
              onClick={() => void toggle()}
              variant={
                playerToToggle?.status === "ACTIVE" ? "danger" : "primary"
              }
            >
              {playerToToggle?.status === "ACTIVE"
                ? "Disable player"
                : "Enable player"}
            </AdminButton>
          </AdminDialogFooter>
        }
        onClose={closeToggle}
        open={Boolean(playerToToggle)}
        title={`${playerToToggle?.status === "ACTIVE" ? "Disable" : "Enable"} ${playerToToggle?.profile?.displayName ?? playerToToggle?.email ?? "player"}`}
      >
        <p className="text-sm leading-6 text-[#8994aa]">
          Confirm this account access change to continue.
        </p>
      </AdminModal>
      <Panel className="overflow-hidden">
        <div className="admin-table-scroll">
          <table className="admin-table min-w-[820px]">
            <thead>
              <tr>
                <th>Player</th>
                <th>Status</th>
                <th>Wallet</th>
                <th>Sessions</th>
                <th>Joined</th>
                <th className="text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {players.map((player) => (
                <tr key={player.id}>
                  <td>
                    <Link
                      href={`/players/${player.id}`}
                      className="group flex items-center gap-3"
                    >
                      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#21352f] text-xs font-bold text-[#83f5c5]">
                        {(
                          player.profile?.displayName ??
                          player.profile?.username ??
                          player.email
                        )
                          .slice(0, 1)
                          .toUpperCase()}
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-[#edf3fd] group-hover:text-[#83f5c5]">
                          {player.profile?.displayName ??
                            player.profile?.username ??
                            "Unnamed player"}
                        </div>
                        <div className="mt-1 text-xs text-[#718097]">
                          {player.email}
                        </div>
                      </div>
                    </Link>
                  </td>
                  <td>
                    <StatusPill value={player.status} />
                  </td>
                  <td>{formatVc(player.wallet.balance)}</td>
                  <td>{player._count.gameSessions}</td>
                  <td>{formatDate(player.createdAt)}</td>
                  <td className="text-right">
                    <AdminButton
                      aria-label={`${player.status === "ACTIVE" ? "Disable" : "Enable"} ${player.email}`}
                      disabled={Boolean(busy)}
                      onClick={() => setPlayerToToggle(player)}
                      size="sm"
                      variant={
                        player.status === "ACTIVE" ? "danger" : "secondary"
                      }
                    >
                      {player.status === "ACTIVE" ? (
                        <UserX aria-hidden="true" size={14} />
                      ) : (
                        <UserCheck aria-hidden="true" size={14} />
                      )}
                      {player.status === "ACTIVE" ? "Disable" : "Enable"}
                    </AdminButton>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && !loadFailed && !players.length && (
            <EmptyState>No players match those filters.</EmptyState>
          )}
          {loading && !players.length && (
            <div className="admin-empty-state" role="status">
              Loading players…
            </div>
          )}
        </div>
        <div className="flex flex-col gap-3 border-t border-[#252d3d] px-4 py-4 text-xs text-[#718097] sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <span>
            {meta
              ? `Page ${meta.page} of ${Math.max(1, meta.totalPages)}`
              : loading
                ? "Loading players…"
                : `${players.length} players`}
          </span>
          <div className="flex gap-2">
            <AdminButton
              disabled={page <= 1 || loading}
              onClick={() => setPage((value) => value - 1)}
              size="sm"
              variant="secondary"
            >
              Previous
            </AdminButton>
            <AdminButton
              disabled={!meta || page >= meta.totalPages || loading}
              onClick={() => setPage((value) => value + 1)}
              size="sm"
              variant="secondary"
            >
              Next
            </AdminButton>
          </div>
        </div>
      </Panel>
    </>
  );
}

export default function PlayersPage() {
  return (
    <AdminShell>
      <PlayersContent />
    </AdminShell>
  );
}
