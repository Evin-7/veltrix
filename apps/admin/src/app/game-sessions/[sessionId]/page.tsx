"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  AdminShell,
  EmptyState,
  PageIntro,
  Panel,
  StatusPill,
  formatDate,
  formatVc,
} from "@/components/admin-shell";
import { apiFetch } from "@/lib/api";

type Session = {
  id: string;
  status: string;
  startedAt: string;
  endedAt: string | null;
  createdAt: string;
  totalWagered: number;
  totalWon: number;
  roundCount: number;
  user: { id: string; email: string; username: string | null };
  game: { name: string; slug: string; provider: { name: string } };
  rounds: Array<{
    id: string;
    roundNumber: number;
    status: string;
    wager: number;
    payout: number;
    netResult: number;
    gameType: string;
    createdAt: string;
    settledAt: string | null;
    actions: Array<{
      id: string;
      type: string;
      idempotencyKey: string;
      createdAt: string;
    }>;
  }>;
};

function SessionDetailContent() {
  const params = useParams<{ sessionId: string }>();
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setSession(null);
    void apiFetch<Session>(`/api/v1/admin/sessions/${params.sessionId}`)
      .then((result) => {
        if (active) setSession(result.data);
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [params.sessionId]);

  return (
    <>
      <Link
        href="/game-sessions"
        className="mb-7 inline-flex min-h-10 items-center gap-2 text-xs font-semibold text-[var(--admin-accent)] hover:opacity-80"
      >
        <ArrowLeft aria-hidden="true" size={15} /> Back to sessions
      </Link>
      {isLoading ? (
        <Panel className="p-6">
          <div
            aria-busy="true"
            aria-live="polite"
            className="admin-empty-state"
            role="status"
          >
            Loading session details…
          </div>
        </Panel>
      ) : null}
      {session ? (
        <>
          <PageIntro
            eyebrow="Session detail"
            title={session.game.name}
            description={`${session.user.username ?? session.user.email} · ${session.game.provider.name} · ${session.id}`}
            action={<StatusPill value={session.status} />}
          />
          <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Panel className="p-5">
              <div className="text-[10px] uppercase tracking-wider text-[var(--admin-muted)]">
                Rounds
              </div>
              <div className="mt-3 text-2xl font-semibold">
                {session.roundCount}
              </div>
            </Panel>
            <Panel className="p-5">
              <div className="text-[10px] uppercase tracking-wider text-[var(--admin-muted)]">
                Wagered
              </div>
              <div className="mt-3 text-2xl font-semibold">
                {formatVc(session.totalWagered)}
              </div>
            </Panel>
            <Panel className="p-5">
              <div className="text-[10px] uppercase tracking-wider text-[var(--admin-muted)]">
                Won
              </div>
              <div className="mt-3 text-2xl font-semibold text-[var(--admin-success)]">
                {formatVc(session.totalWon)}
              </div>
            </Panel>
            <Panel className="p-5">
              <div className="text-[10px] uppercase tracking-wider text-[var(--admin-muted)]">
                Started
              </div>
              <div className="mt-3 text-sm font-semibold">
                {formatDate(session.startedAt)}
              </div>
            </Panel>
          </div>
          <Panel className="overflow-hidden">
            <div className="border-b border-[var(--admin-border)] px-5 py-5 sm:px-6">
              <h2 className="text-sm font-semibold">Rounds and actions</h2>
              <p className="mt-1 text-xs text-[var(--admin-muted)]">
                Immutable gameplay history
              </p>
            </div>
            {session.rounds.length ? (
              <div className="divide-y divide-[var(--admin-border)]">
                {session.rounds.map((round) => (
                  <article key={round.id} className="px-5 py-5 sm:px-6">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="text-xs font-bold text-[var(--admin-accent)]">
                          Round {round.roundNumber}
                        </span>
                        <StatusPill value={round.status} />
                        <span className="text-[10px] uppercase tracking-wider text-[var(--admin-muted)]">
                          {round.gameType}
                        </span>
                      </div>
                      <div
                        className={`text-sm font-semibold ${round.netResult >= 0 ? "text-[var(--admin-success)]" : "text-[var(--admin-danger)]"}`}
                      >
                        {round.netResult >= 0 ? "+" : ""}
                        {formatVc(round.netResult)}
                      </div>
                    </div>
                    <dl className="mt-4 grid gap-4 text-xs sm:grid-cols-2 xl:grid-cols-4">
                      <div>
                        <dt className="text-[var(--admin-muted)]">Wager</dt>
                        <dd className="mt-1">{formatVc(round.wager)}</dd>
                      </div>
                      <div>
                        <dt className="text-[var(--admin-muted)]">Payout</dt>
                        <dd className="mt-1">{formatVc(round.payout)}</dd>
                      </div>
                      <div>
                        <dt className="text-[var(--admin-muted)]">Created</dt>
                        <dd className="mt-1">{formatDate(round.createdAt)}</dd>
                      </div>
                      <div>
                        <dt className="text-[var(--admin-muted)]">Actions</dt>
                        <dd className="mt-1">{round.actions.length}</dd>
                      </div>
                    </dl>
                  </article>
                ))}
              </div>
            ) : (
              <EmptyState>No rounds recorded.</EmptyState>
            )}
          </Panel>
        </>
      ) : null}
    </>
  );
}

export default function SessionDetailPage() {
  return (
    <AdminShell>
      <SessionDetailContent />
    </AdminShell>
  );
}
