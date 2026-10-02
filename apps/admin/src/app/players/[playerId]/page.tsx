"use client";

import Link from "next/link";
import { ArrowLeft, CircleDollarSign, ShieldAlert } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { AdminModal } from "@/components/admin-modal";
import { AdminShell, EmptyState, PageIntro, Panel, StatusPill, formatDate, formatVc, useAdminUser } from "@/components/admin-shell";
import { apiFetch, ApiError, jsonBody } from "@/lib/api";
import { notifyAdminSuccess } from "@/lib/admin-toast";

type Player = { id: string; email: string; role: string; status: "ACTIVE" | "DISABLED"; createdAt: string; lastLoginAt: string | null; profile: { username: string; displayName: string | null } | null; wallet: { balance: number; updatedAt: string } | null; walletTransactions: Array<{ id: string; type: string; amount: number; balanceBefore: number; balanceAfter: number; createdAt: string; referenceId: string | null }>; gameSessions: Array<{ id: string; status: string; startedAt: string; endedAt: string | null; totalWagered: number; totalWon: number; roundCount: number; game: { name: string; slug: string } }> };

function PlayerDetailContent() {
  const params = useParams<{ playerId: string }>();
  const user = useAdminUser();
  const [player, setPlayer] = useState<Player | null>(null);
  const [error, setError] = useState("");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [showAdjust, setShowAdjust] = useState(false);

  useEffect(() => { apiFetch<Player>(`/api/v1/admin/players/${params.playerId}`).then((result) => setPlayer(result.data)).catch((reason: Error) => setError(reason.message)); }, [params.playerId]);

  async function adjust(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const key = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}`;
      const result = await apiFetch<{ balance: number }>("/api/v1/admin/wallet/adjustments", { method: "POST", headers: { "Idempotency-Key": key }, body: jsonBody({ userId: params.playerId, amount: Number(amount), reason }) });
      const nextMessage = `Adjustment recorded. New balance: ${formatVc(result.data.balance)}`;
      notifyAdminSuccess(nextMessage);
      setAmount("");
      setReason("");
      setShowAdjust(false);
      const updated = await apiFetch<Player>(`/api/v1/admin/players/${params.playerId}`);
      setPlayer(updated.data);
    } catch (caught) {
      setMessage(caught instanceof ApiError ? caught.message : "Unable to adjust wallet.");
    } finally {
      setBusy(false);
    }
  }

  return <><Link href="/players" className="mb-7 inline-flex items-center gap-2 text-xs font-semibold text-[#83f5c5] hover:text-white"><ArrowLeft size={15} /> Back to players</Link>{error ? <Panel className="border-[#643443] p-6 text-sm text-[#ffadbd]">{error}</Panel> : player && <><PageIntro eyebrow="Player profile" title={player.profile?.displayName ?? player.profile?.username ?? player.email} description={`${player.email} · joined ${formatDate(player.createdAt)}`} action={<StatusPill value={player.status} />} /><div className="grid gap-6 xl:grid-cols-[1.2fr_.8fr]"><div className="space-y-6"><Panel className="p-6"><div className="grid gap-5 sm:grid-cols-3"><div><div className="text-[10px] uppercase tracking-wider text-[#637089]">Username</div><div className="mt-2 text-sm text-white">{player.profile?.username ?? "—"}</div></div><div><div className="text-[10px] uppercase tracking-wider text-[#637089]">Last login</div><div className="mt-2 text-sm text-white">{formatDate(player.lastLoginAt)}</div></div><div><div className="text-[10px] uppercase tracking-wider text-[#637089]">Game sessions</div><div className="mt-2 text-sm text-white">{player.gameSessions.length} recent</div></div></div></Panel><Panel className="overflow-hidden"><div className="flex items-center justify-between border-b border-[#252d3d] px-6 py-5"><div><h2 className="text-sm font-semibold text-white">Recent wallet activity</h2><p className="mt-1 text-xs text-[#718097]">Append-only ledger entries</p></div><CircleDollarSign size={18} className="text-[#83f5c5]" /></div>{player.walletTransactions.length ? <div className="divide-y divide-[#202837]">{player.walletTransactions.map((transaction) => <div key={transaction.id} className="flex items-center justify-between gap-4 px-6 py-4"><div><div className="text-xs font-semibold text-[#e4eaf5]">{transaction.type.replaceAll("_", " ")}</div><div className="mt-1 text-[10px] text-[#718097]">{formatDate(transaction.createdAt)}</div></div><div className={`text-sm font-semibold ${transaction.amount >= 0 ? "text-[#83f5c5]" : "text-[#ffadbd]"}`}>{transaction.amount >= 0 ? "+" : ""}{formatVc(transaction.amount)}</div></div>)}</div> : <EmptyState />}</Panel><Panel className="overflow-hidden"><div className="border-b border-[#252d3d] px-6 py-5"><h2 className="text-sm font-semibold text-white">Recent game sessions</h2></div>{player.gameSessions.length ? <div className="divide-y divide-[#202837]">{player.gameSessions.map((session) => <div key={session.id} className="flex items-center justify-between gap-4 px-6 py-4"><div><div className="text-xs font-semibold text-[#e4eaf5]">{session.game.name}</div><div className="mt-1 text-[10px] text-[#718097]">{formatDate(session.startedAt)} · {session.roundCount} rounds</div></div><div className="text-right"><StatusPill value={session.status} /><div className="mt-2 text-[10px] text-[#8994aa]">{formatVc(session.totalWagered)} wagered</div></div></div>)}</div> : <EmptyState />}</Panel></div><div>{user?.role === "SUPER_ADMIN" && <><Panel className="border-[#405e57] p-6"><button className="flex w-full items-start gap-3 text-left" onClick={() => { setMessage(""); setShowAdjust(true); }} type="button"><div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#18362f] text-[#83f5c5]"><ShieldAlert size={17} /></div><div><h2 className="text-sm font-semibold text-white">Adjust balance</h2><p className="mt-1 text-xs leading-5 text-[#8994aa]">Restricted to SUPER_ADMIN. Uses the locked wallet ledger and requires an auditable reason.</p><p className="mt-4 text-xs font-bold text-[#83f5c5]">Open adjustment form →</p></div></button></Panel><AdminModal description="Every adjustment is recorded in the locked wallet ledger and requires a reason." onClose={() => setShowAdjust(false)} open={showAdjust} title="Adjust balance"><form onSubmit={adjust} className="space-y-4"><label className="grid gap-2 text-xs font-semibold text-[#8994aa]">Amount<input required type="number" step="1" value={amount} onChange={(event) => setAmount(event.target.value)} className="admin-input" /></label><label className="grid gap-2 text-xs font-semibold text-[#8994aa]">Reason<textarea required minLength={3} maxLength={500} value={reason} onChange={(event) => setReason(event.target.value)} rows={4} className="admin-input resize-none" /></label>{message && <div className="rounded-xl border border-[#643443] bg-[#321b26] px-3 py-3 text-xs text-[#ffadbd]">{message}</div>}<div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end"><button className="rounded-xl bg-[#83f5c5] px-4 py-3 text-sm font-bold text-[#09120f]" disabled={busy} type="submit">{busy ? "Recording…" : "Record adjustment"}</button></div></form></AdminModal></>}</div></div></>}</>;
}

export default function PlayerDetailPage() { return <AdminShell><PlayerDetailContent /></AdminShell>; }
