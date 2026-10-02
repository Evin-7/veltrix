"use client";

import Link from "next/link";
import { Search, UserCheck, UserX } from "lucide-react";
import { useEffect, useState } from "react";
import { AdminModal } from "@/components/admin-modal";
import { AdminSelect } from "@/components/admin-select";
import { AdminShell, EmptyState, PageIntro, Panel, StatusPill, formatDate, formatVc } from "@/components/admin-shell";
import { apiFetch, type ApiMeta } from "@/lib/api";
import { notifyAdminSuccess } from "@/lib/admin-toast";

type Player = { id: string; email: string; status: "ACTIVE" | "DISABLED"; createdAt: string; lastLoginAt: string | null; profile: { username: string; displayName: string | null } | null; wallet: { balance: number }; _count: { gameSessions: number; walletTransactions: number } };

function PlayersContent() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [meta, setMeta] = useState<ApiMeta | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [playerToToggle, setPlayerToToggle] = useState<Player | null>(null);

  async function load() { setError(""); const params = new URLSearchParams({ page: String(page), pageSize: "20" }); if (search) params.set("search", search); if (status) params.set("status", status); try { const result = await apiFetch<Player[]>(`/api/v1/admin/players?${params}`); setPlayers(result.data); setMeta(result.meta ?? null); } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to load players."); } }
  // The search field is submitted explicitly; only pagination/status changes auto-refresh this list.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { void load(); }, [page, status]);

  async function toggle() {
    if (!playerToToggle) return;
    const player = playerToToggle;
    setBusy(player.id);
    try {
      await apiFetch(`/api/v1/admin/players/${player.id}/status`, { method: "PATCH", body: JSON.stringify({ status: player.status === "ACTIVE" ? "DISABLED" : "ACTIVE" }) });
      setPlayerToToggle(null);
      notifyAdminSuccess(`${player.email} is now ${player.status === "ACTIVE" ? "disabled" : "active"}.`);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to update player.");
    } finally {
      setBusy("");
    }
  }

  return <>
    <PageIntro eyebrow="Account operations" title="Players" description="Search player accounts, inspect wallet activity, and manage access with every status change recorded in the audit log." action={<div className="rounded-xl border border-[#245a4c] bg-[#12352e] px-3 py-2 text-xs font-semibold text-[#8af0c4]">{meta?.total ?? "—"} player accounts</div>} />
    <Panel className="mb-6 p-4"><form onSubmit={(event) => { event.preventDefault(); setPage(1); void load(); }} className="grid gap-3 md:grid-cols-[1fr_180px_auto]"><div className="flex items-center gap-3 rounded-xl border border-[#2b3547] bg-[#0c1018] px-3"><Search size={16} className="text-[#637089]" /><input aria-label="Search players" value={search} onChange={(event) => setSearch(event.target.value)} className="w-full bg-transparent py-3 text-sm text-white outline-none" /></div><AdminSelect ariaLabel="Player status" onValueChange={(value) => { setStatus(value); setPage(1); }} options={[{ value: "", label: "All statuses" }, { value: "ACTIVE", label: "Active" }, { value: "DISABLED", label: "Disabled" }]} value={status} /><button className="rounded-xl bg-[#83f5c5] px-5 py-3 text-sm font-bold text-[#09120f] hover:bg-[#a5fbd8]">Search players</button></form></Panel>
    {error && <Panel className="mb-6 border-[#643443] p-4 text-sm text-[#ffadbd]">{error}</Panel>}
    <AdminModal description={playerToToggle?.status === "ACTIVE" ? "Disabling revokes the player's active sessions and blocks further access." : "Enabling restores this player's access to the platform."} onClose={() => setPlayerToToggle(null)} open={Boolean(playerToToggle)} title={`${playerToToggle?.status === "ACTIVE" ? "Disable" : "Enable"} ${playerToToggle?.profile?.displayName ?? playerToToggle?.email ?? "player"}`}>
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><button className="rounded-xl border border-[#2b3547] px-4 py-3 text-sm font-semibold text-[#b5c0d3] hover:border-[#83f5c5] hover:text-white" onClick={() => setPlayerToToggle(null)} type="button">Cancel</button><button className="rounded-xl bg-[#83f5c5] px-4 py-3 text-sm font-bold text-[#09120f]" disabled={Boolean(busy)} onClick={() => void toggle()} type="button">{busy ? "Saving…" : playerToToggle?.status === "ACTIVE" ? "Disable player" : "Enable player"}</button></div>
    </AdminModal>
    <Panel className="overflow-hidden"><div className="overflow-x-auto"><table className="w-full min-w-[820px] text-left"><thead className="border-b border-[#252d3d] bg-[#151a25] text-[10px] uppercase tracking-[0.16em] text-[#637089]"><tr><th className="px-6 py-4 font-semibold">Player</th><th className="px-4 py-4 font-semibold">Status</th><th className="px-4 py-4 font-semibold">Wallet</th><th className="px-4 py-4 font-semibold">Sessions</th><th className="px-4 py-4 font-semibold">Joined</th><th className="px-6 py-4 text-right font-semibold">Action</th></tr></thead><tbody className="divide-y divide-[#202837]">{players.map((player) => <tr key={player.id} className="transition hover:bg-[#151a25]"><td className="px-6 py-4"><Link href={`/players/${player.id}`} className="group flex items-center gap-3"><div className="grid h-9 w-9 place-items-center rounded-full bg-[#21352f] text-xs font-bold text-[#83f5c5]">{(player.profile?.displayName ?? player.profile?.username ?? player.email).slice(0, 1).toUpperCase()}</div><div><div className="text-sm font-semibold text-[#edf3fd] group-hover:text-[#83f5c5]">{player.profile?.displayName ?? player.profile?.username ?? "Unnamed player"}</div><div className="mt-1 text-xs text-[#718097]">{player.email}</div></div></Link></td><td className="px-4 py-4"><StatusPill value={player.status} /></td><td className="px-4 py-4 text-sm text-[#dce4f1]">{formatVc(player.wallet.balance)}</td><td className="px-4 py-4 text-sm text-[#aab4c8]">{player._count.gameSessions}</td><td className="px-4 py-4 text-xs text-[#8994aa]">{formatDate(player.createdAt)}</td><td className="px-6 py-4 text-right"><button disabled={busy === player.id} onClick={() => setPlayerToToggle(player)} className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold ${player.status === "ACTIVE" ? "border-[#643443] text-[#ffadbd] hover:bg-[#321b26]" : "border-[#245a4c] text-[#8af0c4] hover:bg-[#12352e]"}`}>{player.status === "ACTIVE" ? <UserX size={14} /> : <UserCheck size={14} />}{busy === player.id ? "Saving…" : player.status === "ACTIVE" ? "Disable" : "Enable"}</button></td></tr>)}</tbody></table>{!players.length && <EmptyState>No players match those filters.</EmptyState>}</div><div className="flex items-center justify-between border-t border-[#252d3d] px-6 py-4 text-xs text-[#718097]"><span>{meta ? `Page ${meta.page} of ${Math.max(1, meta.totalPages)}` : "Loading…"}</span><div className="flex gap-2"><button disabled={page <= 1} onClick={() => setPage((value) => value - 1)} className="rounded-lg border border-[#2b3547] px-3 py-2 disabled:opacity-40">Previous</button><button disabled={!meta || page >= meta.totalPages} onClick={() => setPage((value) => value + 1)} className="rounded-lg border border-[#2b3547] px-3 py-2 disabled:opacity-40">Next</button></div></div></Panel>
  </>;
}

export default function PlayersPage() { return <AdminShell><PlayersContent /></AdminShell>; }
