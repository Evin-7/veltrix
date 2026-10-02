"use client";

import Link from "next/link";
import { ArrowLeft, CircleDollarSign, ShieldAlert } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { useParams } from "next/navigation";
import {
  AdminButton,
  AdminDialogFooter,
  AdminField,
  AdminInput,
  AdminTextarea,
  useAdminFormValidation,
} from "@/components/admin-form";
import { AdminModal } from "@/components/admin-modal";
import {
  AdminShell,
  EmptyState,
  PageIntro,
  Panel,
  StatusPill,
  formatDate,
  formatVc,
  useAdminUser,
} from "@/components/admin-shell";
import { apiFetch, jsonBody } from "@/lib/api";
import { notifyAdminSuccess } from "@/lib/admin-toast";

type Player = {
  id: string;
  email: string;
  role: string;
  status: "ACTIVE" | "DISABLED";
  createdAt: string;
  lastLoginAt: string | null;
  profile: { username: string; displayName: string | null } | null;
  wallet: { balance: number; updatedAt?: string } | null;
  walletTransactions: Array<{
    id: string;
    type: string;
    amount: number;
    balanceBefore: number;
    balanceAfter: number;
    createdAt: string;
    referenceId: string | null;
  }>;
  gameSessions: Array<{
    id: string;
    status: string;
    startedAt: string;
    endedAt: string | null;
    totalWagered: number;
    totalWon: number;
    roundCount: number;
    game: { name: string; slug: string };
  }>;
};

function PlayerDetailContent() {
  const params = useParams<{ playerId: string }>();
  const user = useAdminUser();
  const [player, setPlayer] = useState<Player | null>(null);
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [showAdjust, setShowAdjust] = useState(false);
  const { errors, validate, clear, setErrors } = useAdminFormValidation();

  useEffect(() => {
    let active = true;
    setLoading(true);
    apiFetch<Player>(`/api/v1/admin/players/${params.playerId}`)
      .then((result) => {
        if (active) setPlayer(result.data);
      })
      .catch(() => {
        // apiFetch reports request failures through the shared admin toast.
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [params.playerId]);

  async function adjust(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !validate(event.currentTarget)) return;
    setBusy(true);
    try {
      const key =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now()}`;
      const result = await apiFetch<{ balance: number }>(
        "/api/v1/admin/wallet/adjustments",
        {
          method: "POST",
          headers: { "Idempotency-Key": key },
          body: jsonBody({
            userId: params.playerId,
            amount: Number(amount),
            reason,
          }),
        },
      );

      // Record and report the successful mutation before fetching the profile.
      // A refresh failure is a separate read error, not a failed adjustment.
      setPlayer((current) =>
        current
          ? {
              ...current,
              wallet: {
                balance: result.data.balance,
                ...(current.wallet?.updatedAt
                  ? { updatedAt: current.wallet.updatedAt }
                  : {}),
              },
            }
          : current,
      );
      notifyAdminSuccess(
        `Adjustment recorded. New balance: ${formatVc(result.data.balance)}`,
      );
      setAmount("");
      setReason("");
      clear();
      setShowAdjust(false);

      try {
        const updated = await apiFetch<Player>(
          `/api/v1/admin/players/${params.playerId}`,
        );
        setPlayer(updated.data);
      } catch {
        // The wallet POST succeeded; apiFetch shows the refresh error separately.
      }
    } catch {
      // apiFetch reports mutation failures through the shared admin toast.
    } finally {
      setBusy(false);
    }
  }

  function openAdjust() {
    setAmount("");
    setReason("");
    clear();
    setShowAdjust(true);
  }

  const closeAdjust = () => {
    if (!busy) setShowAdjust(false);
  };

  return (
    <>
      <Link
        href="/players"
        className="mb-7 inline-flex items-center gap-2 text-xs font-semibold text-[#83f5c5] hover:text-white"
      >
        <ArrowLeft aria-hidden="true" size={15} /> Back to players
      </Link>
      {loading ? (
        <Panel className="p-6">
          <div className="admin-empty-state" role="status">
            Loading player profile…
          </div>
        </Panel>
      ) : player ? (
        <>
          <PageIntro
            eyebrow="Player profile"
            title={
              player.profile?.displayName ??
              player.profile?.username ??
              player.email
            }
            description={`${player.email} · joined ${formatDate(player.createdAt)}`}
            action={<StatusPill value={player.status} />}
          />
          <div className="grid gap-6 xl:grid-cols-[1.2fr_.8fr]">
            <div className="space-y-6">
              <Panel className="p-6">
                <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-[#637089]">
                      Username
                    </div>
                    <div className="mt-2 text-sm text-white">
                      {player.profile?.username ?? "—"}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-[#637089]">
                      Last login
                    </div>
                    <div className="mt-2 text-sm text-white">
                      {formatDate(player.lastLoginAt)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-[#637089]">
                      Game sessions
                    </div>
                    <div className="mt-2 text-sm text-white">
                      {player.gameSessions.length} recent
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-[#637089]">
                      Wallet balance
                    </div>
                    <div className="mt-2 text-sm font-semibold text-white">
                      {player.wallet ? formatVc(player.wallet.balance) : "—"}
                    </div>
                  </div>
                </div>
              </Panel>
              <Panel className="overflow-hidden">
                <div className="flex items-center justify-between border-b border-[#252d3d] px-6 py-5">
                  <div>
                    <h2 className="text-sm font-semibold text-white">
                      Recent wallet activity
                    </h2>
                    <p className="mt-1 text-xs text-[#718097]">
                      Append-only ledger entries
                    </p>
                  </div>
                  <CircleDollarSign
                    aria-hidden="true"
                    size={18}
                    className="text-[#83f5c5]"
                  />
                </div>
                {player.walletTransactions.length ? (
                  <div className="divide-y divide-[#202837]">
                    {player.walletTransactions.map((transaction) => (
                      <div
                        key={transaction.id}
                        className="flex items-center justify-between gap-4 px-6 py-4"
                      >
                        <div>
                          <div className="text-xs font-semibold text-[#e4eaf5]">
                            {transaction.type.replaceAll("_", " ")}
                          </div>
                          <div className="mt-1 text-[10px] text-[#718097]">
                            {formatDate(transaction.createdAt)}
                          </div>
                        </div>
                        <div
                          className={`text-sm font-semibold ${transaction.amount >= 0 ? "text-[#83f5c5]" : "text-[#ffadbd]"}`}
                        >
                          {transaction.amount >= 0 ? "+" : ""}
                          {formatVc(transaction.amount)}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState />
                )}
              </Panel>
              <Panel className="overflow-hidden">
                <div className="border-b border-[#252d3d] px-6 py-5">
                  <h2 className="text-sm font-semibold text-white">
                    Recent game sessions
                  </h2>
                </div>
                {player.gameSessions.length ? (
                  <div className="divide-y divide-[#202837]">
                    {player.gameSessions.map((session) => (
                      <div
                        key={session.id}
                        className="flex items-center justify-between gap-4 px-6 py-4"
                      >
                        <div>
                          <div className="text-xs font-semibold text-[#e4eaf5]">
                            {session.game.name}
                          </div>
                          <div className="mt-1 text-[10px] text-[#718097]">
                            {formatDate(session.startedAt)} ·{" "}
                            {session.roundCount} rounds
                          </div>
                        </div>
                        <div className="text-right">
                          <StatusPill value={session.status} />
                          <div className="mt-2 text-[10px] text-[#8994aa]">
                            {formatVc(session.totalWagered)} wagered
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState />
                )}
              </Panel>
            </div>
            <div>
              {user?.role === "SUPER_ADMIN" && (
                <>
                  <Panel className="p-6">
                    <div className="mb-5 grid grid-cols-[auto_1fr] items-start gap-3">
                      <div className="grid h-9 w-9 place-items-center rounded-xl bg-[#18362f] text-[#83f5c5]">
                        <ShieldAlert aria-hidden="true" size={17} />
                      </div>
                      <div>
                        <h2 className="text-sm font-semibold text-white">
                          Adjust balance
                        </h2>
                        <p className="mt-1 text-xs leading-5 text-[#8994aa]">
                          Restricted to SUPER_ADMIN. Uses the locked wallet
                          ledger and requires an auditable reason.
                        </p>
                      </div>
                    </div>
                    <AdminButton onClick={openAdjust} variant="secondary">
                      Open adjustment form
                    </AdminButton>
                  </Panel>
                  <AdminModal
                    description="Every adjustment is recorded in the locked wallet ledger and requires a reason."
                    footer={
                      <AdminDialogFooter>
                        <AdminButton
                          disabled={busy}
                          onClick={closeAdjust}
                          variant="secondary"
                        >
                          Cancel
                        </AdminButton>
                        <AdminButton
                          form="wallet-adjustment-form"
                          loading={busy}
                          loadingText="Recording…"
                          type="submit"
                        >
                          Record adjustment
                        </AdminButton>
                      </AdminDialogFooter>
                    }
                    onClose={closeAdjust}
                    open={showAdjust}
                    title="Adjust balance"
                  >
                    <form
                      id="wallet-adjustment-form"
                      noValidate
                      onSubmit={adjust}
                      className="admin-form-stack"
                    >
                      <AdminField
                        error={errors.amount}
                        label="Amount"
                        name="amount"
                        hint="Enter a whole-number wallet adjustment."
                      >
                        <AdminInput
                          autoFocus
                          disabled={busy}
                          inputMode="numeric"
                          onChange={(event) => {
                            setAmount(event.target.value);
                            if (errors.amount)
                              setErrors((current) => ({
                                ...current,
                                amount: "",
                              }));
                          }}
                          required
                          step="1"
                          type="number"
                          value={amount}
                        />
                      </AdminField>
                      <AdminField
                        error={errors.reason}
                        label="Reason"
                        name="reason"
                        hint="This reason is saved to the audit trail."
                      >
                        <AdminTextarea
                          disabled={busy}
                          maxLength={500}
                          minLength={3}
                          onChange={(event) => {
                            setReason(event.target.value);
                            if (errors.reason)
                              setErrors((current) => ({
                                ...current,
                                reason: "",
                              }));
                          }}
                          required
                          rows={4}
                          value={reason}
                        />
                      </AdminField>
                    </form>
                  </AdminModal>
                </>
              )}
            </div>
          </div>
        </>
      ) : null}
    </>
  );
}

export default function PlayerDetailPage() {
  return (
    <AdminShell>
      <PlayerDetailContent />
    </AdminShell>
  );
}
