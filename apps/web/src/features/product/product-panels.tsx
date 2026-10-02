"use client";

import { LoaderCircle } from "lucide-react";
import { useState } from "react";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import {
  ActionRow,
  Divider,
  SectionHeader,
  SettingsRow,
  Stat,
} from "@/components/ui/layout-primitives";
import { useToast } from "@/components/ui/toast";
import { requestJson } from "@/lib/api-client";
import { errorMessage as safeErrorMessage } from "@/lib/app-error";
import { emitWalletUpdate } from "@/lib/wallet-sync";

type Promotion = {
  id: string;
  title: string;
  description: string;
  rewardVC: number;
  endAt: string;
  claimed: boolean;
};
type RewardOverview = {
  progression: {
    level: string;
    xp: number;
    currentThreshold: number;
    nextLevel: string | null;
    nextThreshold: number | null;
    progress: number;
  };
  configs: Array<{ level: string; xpThreshold: number; rewardVC: number }>;
  history: Array<{
    id: string;
    type: string;
    amountVC: number;
    level: string | null;
    createdAt: string;
  }>;
};
type Settings = {
  sessionReminderMinutes: number;
  dailyWagerLimit: number | null;
  maxWager: number | null;
  coolOffUntil: string | null;
  selfExcludedUntil: string | null;
};
type Status = {
  settings: Settings;
  dailyWagered: number;
  dailyRemaining: number | null;
  activeSession: { gameName: string; elapsedSeconds: number } | null;
};
type Notification = {
  id: string;
  type: string;
  title: string;
  message: string;
  readAt: string | null;
  createdAt: string;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function PromotionsPanel({
  initialPromotions,
}: {
  initialPromotions: Promotion[];
}) {
  const [promotions, setPromotions] = useState(initialPromotions);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const { showToast } = useToast();

  async function claim(promotionId: string) {
    setBusy(promotionId);
    setMessage(null);
    try {
      const payload = await requestJson<{ newBalance?: number }>(`/api/v1/promotions/${promotionId}/claim`, {
        method: "POST",
        headers: {
          "Idempotency-Key": `promotion-ui-${promotionId}-${crypto.randomUUID()}`,
        },
      });
      setPromotions((items) =>
        items.map((item) =>
          item.id === promotionId ? { ...item, claimed: true } : item,
        ),
      );
      setMessage("Reward added to your wallet.");
      if (typeof payload.newBalance === "number") emitWalletUpdate(payload.newBalance);
      showToast("Promotion reward claimed", "success");
    } catch (error) {
      const message = safeErrorMessage(error, "CONFLICT");
      setMessage(message);
      showToast(message, "error");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="grid gap-8 md:grid-cols-2">
      {promotions.map((promotion) => (
        <article
          className="relative overflow-hidden radius-surface border border-border bg-surface p-6 shadow-[0_18px_50px_rgb(0_0_0_/_0.08)]"
          key={promotion.id}
        >
          <div
            aria-hidden="true"
            className="absolute -right-10 -top-16 h-40 w-40 rounded-full bg-amber/10 blur-3xl"
          />
          <div className="relative">
            <div className="flex items-start justify-between gap-4">
              <span className="rounded-full border border-border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-muted">
                Ends {formatDate(promotion.endAt)}
              </span>
            </div>
            <h2 className="display mt-6 text-3xl text-ink">
              {promotion.title}
            </h2>
            <p className="mt-3 min-h-12 text-sm leading-6 text-muted">
              {promotion.description}
            </p>
            <div className="mt-6 flex items-center justify-between gap-3 border-t border-border pt-5">
              <div>
                <p className="text-[10px] uppercase tracking-[0.14em] text-muted">
                  Reward
                </p>
                <p className="mt-1 text-lg font-semibold text-mint">
                  {promotion.rewardVC.toLocaleString("en-US")} VC
                </p>
              </div>
              <button
                className="button-primary focus-ring inline-flex min-h-10 items-center gap-2 rounded-[var(--radius-control)] px-4 text-xs disabled:cursor-not-allowed"
                disabled={promotion.claimed || busy === promotion.id}
                onClick={() => claim(promotion.id)}
              >
                {busy === promotion.id ? <LoaderCircle className="animate-spin" size={14} /> : null}
                {promotion.claimed
                  ? "Claimed"
                  : busy === promotion.id
                    ? "Claiming…"
                    : "Claim reward"}
              </button>
            </div>
          </div>
        </article>
      ))}
      {promotions.length === 0 ? (
        <div className="py-16 text-center md:col-span-2">
          <p className="text-sm font-semibold text-ink">
            No promotions are available for you right now.
          </p>
          <p className="mt-2 text-xs text-muted">
            Check back as the Veltrix calendar changes.
          </p>
        </div>
      ) : null}
      {message ? (
        <p
          aria-live="polite"
          className="text-xs font-semibold text-mint md:col-span-2"
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}

export function RewardsPanel({ initial }: { initial: RewardOverview }) {
  return (
    <div className="grid gap-12 lg:grid-cols-[1.05fr_0.95fr]">
      <section className="rewards-progress-focus">
        <div className="relative">
          <div className="flex items-start justify-between">
            <div>
              <p className="eyebrow">Your progression</p>
              <h2 className="display mt-4 text-5xl text-ink">
                {initial.progression.level}
              </h2>
              <p className="mt-2 text-sm text-muted">
                {initial.progression.xp.toLocaleString("en-US")} XP earned
                through completed rounds.
              </p>
            </div>
          </div>
          <div className="mt-9">
            <div className="mb-2 flex justify-between text-xs font-semibold text-muted">
              <span>
                Progress to {initial.progression.nextLevel ?? "complete"}
              </span>
              <span>{initial.progression.progress}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-foreground/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber to-mint transition-all"
                style={{ width: `${initial.progression.progress}%` }}
              />
            </div>
            <p className="mt-3 text-xs text-muted">
              {initial.progression.nextThreshold === null
                ? "You have reached the highest configured level."
                : `${Math.max(0, initial.progression.nextThreshold - initial.progression.xp).toLocaleString("en-US")} XP to go`}
            </p>
          </div>
        </div>
      </section>
      <section>
        <SectionHeader
          eyebrow="The ladder"
          title="Earn as you play"
          description="A clear view of the next level and its reward."
        />
        <div className="border-y border-border">
          {initial.configs.map((config) => (
            <div
              className={`flex items-center justify-between gap-4 border-b border-border py-4 last:border-b-0 ${config.level === initial.progression.level ? "text-amber" : ""}`}
              key={config.level}
            >
              <div>
                <p className="text-sm font-semibold text-ink">{config.level}</p>
                <p className="mt-1 text-[11px] text-muted">
                  {config.xpThreshold.toLocaleString("en-US")} XP
                </p>
              </div>
              <span className="text-xs font-semibold text-mint">
                +{config.rewardVC.toLocaleString("en-US")} VC
              </span>
            </div>
          ))}
        </div>
      </section>
      <section className="lg:col-span-2">
        <SectionHeader
          eyebrow="Reward history"
          title="Milestones and bonuses"
        />
        <div className="border-y border-border">
          {initial.history.map((item) => (
            <div
              className="flex items-center justify-between gap-4 border-b border-border py-4 last:border-b-0"
              key={item.id}
            >
              <div>
                <p className="text-sm font-semibold text-ink">
                  {item.type === "VIP_MILESTONE"
                    ? `${item.level} milestone`
                    : item.type === "PROMOTION_REWARD"
                      ? "Promotion reward"
                      : "Daily reward"}
                </p>
                <p className="mt-1 text-xs text-muted">
                  {formatDate(item.createdAt)}
                </p>
              </div>
              <span className="text-sm font-semibold text-mint">
                +{item.amountVC.toLocaleString("en-US")} VC
              </span>
            </div>
          ))}
          {initial.history.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted">
              Your reward history will appear here.
            </p>
          ) : null}
        </div>
      </section>
    </div>
  );
}

type PendingAction = "coolOff" | "selfExclusion" | null;

export function ResponsibleGamingPanel({
  initialSettings,
  initialStatus,
}: {
  initialSettings: Settings;
  initialStatus: Status;
}) {
  const [settings, setSettings] = useState(initialSettings);
  const [status, setStatus] = useState(initialStatus);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [daily, setDaily] = useState(
    settings.dailyWagerLimit?.toString() ?? "",
  );
  const [max, setMax] = useState(settings.maxWager?.toString() ?? "");
  const [reminder, setReminder] = useState(
    String(settings.sessionReminderMinutes),
  );
  const { showToast } = useToast();

  async function request(path: string, options: RequestInit = {}) {
    return requestJson<Settings>(path, options);
  }

  async function save() {
    setBusy(true);
    setMessage(null);
    try {
      const payload = await request("/api/v1/responsible-gaming/settings", {
        method: "PATCH",
        body: JSON.stringify({
          sessionReminderMinutes: Number(reminder),
          dailyWagerLimit: daily ? Number(daily) : null,
          maxWager: max ? Number(max) : null,
        }),
      });
      setSettings(payload);
      setStatus((current) => ({ ...current, settings: payload }));
      setMessage("Your settings are active.");
    } catch (error) {
      setMessage(safeErrorMessage(error, "BAD_REQUEST"));
      showToast(safeErrorMessage(error, "BAD_REQUEST"), "error");
    } finally {
      setBusy(false);
    }
  }

  async function confirmAction() {
    if (!pendingAction) return;
    const isCoolOff = pendingAction === "coolOff";
    setBusy(true);
    setMessage(null);
    try {
      const payload = await request(
        isCoolOff
          ? "/api/v1/responsible-gaming/cool-off"
          : "/api/v1/responsible-gaming/self-exclusion",
        {
          method: "POST",
          body: JSON.stringify(isCoolOff ? { hours: 24 } : { days: 7 }),
        },
      );
      setSettings(payload);
      setStatus((current) => ({ ...current, settings: payload }));
      setMessage(
        isCoolOff
          ? "A 24-hour cool-off is active."
          : "Self-exclusion is active for 7 days.",
      );
      setPendingAction(null);
    } catch (error) {
      setMessage(safeErrorMessage(error, "BAD_REQUEST"));
      showToast(safeErrorMessage(error, "BAD_REQUEST"), "error");
    } finally {
      setBusy(false);
    }
  }

  const blocked = Boolean(
    settings.selfExcludedUntil &&
    new Date(settings.selfExcludedUntil) > new Date(),
  );
  const activeSession = status.activeSession
    ? `${status.activeSession.gameName} · ${Math.floor(status.activeSession.elapsedSeconds / 60)}m active`
    : "No active session";

  return (
    <div>
      <section>
        <SectionHeader
          eyebrow="Limits"
          title="Set your own pace"
          description="Set limits, manage session reminders and take a break whenever you need."
        />
        <div className="border-y border-border">
          <SettingsRow
            description="Get a reminder while you play."
            label="Session reminder"
          >
            <label className="block">
              <span className="sr-only">Session reminder in minutes</span>
              <input
                className="field"
                min="5"
                max="240"
                step="5"
                type="number"
                value={reminder}
                onChange={(event) => setReminder(event.target.value)}
              />
            </label>
          </SettingsRow>
          <Divider />
          <SettingsRow
            description="Keep your total wagers within a daily amount."
            label="Daily wager limit"
          >
            <label className="block">
              <span className="sr-only">Daily wager limit</span>
              <input
                className="field"
                min="1"
                type="number"
                value={daily}
                onChange={(event) => setDaily(event.target.value)}
              />
            </label>
          </SettingsRow>
          <Divider />
          <SettingsRow
            description="Set the largest single wager you want to place."
            label="Maximum wager"
          >
            <label className="block">
              <span className="sr-only">Maximum wager</span>
              <input
                className="field"
                min="1"
                max="500"
                type="number"
                value={max}
                onChange={(event) => setMax(event.target.value)}
              />
            </label>
          </SettingsRow>
        </div>
        <div className="mt-6 flex flex-wrap items-center gap-4">
          <button
            className="button-primary focus-ring inline-flex min-h-11 items-center gap-2 rounded-[var(--radius-control)] px-5 text-xs"
            disabled={busy}
            onClick={save}
            type="button"
          >
            {busy ? <LoaderCircle className="animate-spin" size={14} /> : null}{" "}
            Save settings
          </button>
          {message ? (
            <p aria-live="polite" className="text-xs font-semibold text-mint">
              {message}
            </p>
          ) : null}
        </div>
      </section>
      <section className="mt-14">
        <SectionHeader eyebrow="Today" title="A clear view of your session" />
        <div className="grid gap-6 border-y border-border py-6 sm:grid-cols-2 lg:grid-cols-4">
          <Stat
            detail="Total wagered in the UTC day."
            label="Wagered today"
            value={`${status.dailyWagered.toLocaleString("en-US")} VC`}
          />
          <Stat
            detail={
              status.dailyRemaining === null
                ? "No daily limit configured."
                : `${status.dailyRemaining.toLocaleString("en-US")} VC remaining.`
            }
            label="Daily limit"
            value={
              status.dailyRemaining === null
                ? "No limit"
                : `${status.dailyRemaining.toLocaleString("en-US")} VC left`
            }
          />
          <Stat
            detail="Your selected reminder interval."
            label="Reminder"
            value={`${settings.sessionReminderMinutes} min`}
          />
          <Stat
            detail="Play when you are ready."
            label="Session"
            value={activeSession}
          />
        </div>
      </section>
      <section className="mt-14">
        <SectionHeader
          eyebrow="Take a break"
          title="Pause when you need to"
          description="These actions are enforced across gameplay and need confirmation before they begin."
        />
        <div className="border-y border-border">
          <ActionRow
            description="Pause gameplay until tomorrow. You can return when the 24-hour period ends."
            label="24-hour cool-off"
            action={
              <button
                className="button-secondary focus-ring min-h-11 rounded-[var(--radius-control)] px-4 text-xs disabled:cursor-not-allowed"
                disabled={busy}
                onClick={() => setPendingAction("coolOff")}
                type="button"
              >
                Start cool-off
              </button>
            }
          />
          <Divider />
          <ActionRow
            description="Pause gameplay for seven days. This cannot be cancelled from the player interface."
            label="7-day self-exclusion"
            tone="danger"
            action={
              <button
                className="focus-ring min-h-11 rounded-[var(--radius-control)] border border-danger/40 px-4 text-xs font-bold text-danger hover:bg-danger/10 disabled:opacity-50"
                disabled={blocked || busy}
                onClick={() => setPendingAction("selfExclusion")}
                type="button"
              >
                Self-exclude
              </button>
            }
          />
        </div>
        {settings.coolOffUntil ? (
          <p className="mt-4 text-xs text-muted">
            Cool-off until {formatDate(settings.coolOffUntil)}.
          </p>
        ) : null}
        {settings.selfExcludedUntil ? (
          <p className="mt-2 text-xs text-muted">
            Self-exclusion until {formatDate(settings.selfExcludedUntil)}.
          </p>
        ) : null}
      </section>
      <ConfirmationDialog
        busy={busy}
        confirmLabel={
          pendingAction === "coolOff" ? "Start cool-off" : "Self-exclude"
        }
        danger={pendingAction === "selfExclusion"}
        description={
          pendingAction === "coolOff"
            ? "You will not be able to play during the next 24 hours."
            : "You will not be able to play during this period. This action cannot be cancelled from the player interface."
        }
        onCancel={() => setPendingAction(null)}
        onConfirm={() => void confirmAction()}
        open={pendingAction !== null}
        title={
          pendingAction === "coolOff"
            ? "Start a 24-hour cool-off?"
            : "Self-exclude for 7 days?"
        }
      />
    </div>
  );
}

export function NotificationsPanel({
  initialNotifications,
  initialUnread,
}: {
  initialNotifications: Notification[];
  initialUnread: number;
}) {
  const [items, setItems] = useState(initialNotifications);
  const [unread, setUnread] = useState(initialUnread);
  const [busy, setBusy] = useState<string | null>(null);
  const { showToast } = useToast();

  async function mark(id: string) {
    if (busy) return;
    setBusy(id);
    try {
      await requestJson(`/api/v1/notifications/${id}/read`, { method: "PATCH" });
      setItems((current) =>
        current.map((item) =>
          item.id === id ? { ...item, readAt: new Date().toISOString() } : item,
        ),
      );
      setUnread((current) => Math.max(0, current - 1));
    } catch (error) {
      showToast(safeErrorMessage(error, "NETWORK_ERROR"), "error");
    } finally {
      setBusy(null);
    }
  }

  async function markAll() {
    if (busy) return;
    setBusy("all");
    try {
      await requestJson("/api/v1/notifications/read-all", { method: "POST" });
      setItems((current) =>
        current.map((item) => ({
          ...item,
          readAt: item.readAt ?? new Date().toISOString(),
        })),
      );
      setUnread(0);
    } catch (error) {
      showToast(safeErrorMessage(error, "NETWORK_ERROR"), "error");
    } finally {
      setBusy(null);
    }
  }

  return (
    <section>
      <SectionHeader
        eyebrow="Inbox"
        title="Latest updates"
        description={`${unread} unread update${unread === 1 ? "" : "s"}.`}
      >
        <button
          className="focus-ring rounded-[var(--radius-control)] border border-border px-4 py-2 text-xs font-semibold text-muted-strong hover:bg-surface-hover hover:text-ink"
          disabled={busy !== null}
          onClick={() => void markAll()}
          type="button"
        >
          Mark all read
        </button>
      </SectionHeader>
      <div className="border-y border-border">
        {items.map((item) => (
          <button
            className={`focus-ring flex w-full items-start gap-4 border-b border-border py-5 text-left transition last:border-b-0 ${item.readAt ? "" : "bg-amber/[0.05]"}`}
            key={item.id}
            disabled={busy !== null}
            onClick={() => !item.readAt && void mark(item.id)}
            type="button"
          >
            <span className="min-w-0">
              <span className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold text-ink">
                  {item.title}
                </span>
                {!item.readAt ? (
                  <span className="rounded-full bg-amber px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-background">
                    New
                  </span>
                ) : null}
              </span>
              <span className="mt-1 block text-xs leading-5 text-muted">
                {item.message}
              </span>
              <span className="mt-2 block text-[10px] text-muted/70">
                {formatDate(item.createdAt)}
              </span>
            </span>
          </button>
        ))}
        {items.length === 0 ? (
          <div className="py-14 text-center">
            <p className="text-sm font-semibold text-ink">
              You’re all caught up.
            </p>
          </div>
        ) : null}
      </div>
    </section>
  );
}
