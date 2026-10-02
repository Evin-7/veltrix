"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { Pencil, ShieldCheck, Sparkles, Trophy } from "lucide-react";
import {
  AdminButton,
  AdminDialogFooter,
  AdminField,
  AdminInput,
  AdminTextarea,
  useAdminFormValidation,
  type AdminValidationErrors,
} from "@/components/admin-form";
import { AdminModal } from "@/components/admin-modal";
import {
  AdminUser,
  PageIntro,
  Panel,
  StatusPill,
  formatDate,
  formatVc,
  useAdminUser,
} from "@/components/admin-shell";
import { apiFetch, jsonBody } from "@/lib/api";
import { notifyAdminSuccess } from "@/lib/admin-toast";

type Promotion = {
  id: string;
  title: string;
  slug: string;
  description: string;
  status: string;
  rewardVC: number;
  startAt: string;
  endAt: string;
  _count: { claims: number };
};

type VipConfig = { level: string; xpThreshold: number; rewardVC: number };

type Restriction = {
  user: {
    id: string;
    email: string;
    status: string;
    profile: { username: string; displayName: string | null } | null;
  };
  settings: {
    dailyWagerLimit: number | null;
    maxWager: number | null;
    coolOffUntil: string | null;
    selfExcludedUntil: string | null;
    updatedAt: string;
  };
};

export function PromotionsAdmin() {
  const [items, setItems] = useState<Promotion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [promotionToUpdate, setPromotionToUpdate] = useState<Promotion | null>(
    null,
  );
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const createValidation = useAdminFormValidation();

  const load = useCallback(async () => {
    setIsLoading(true);
    setLoadFailed(false);
    try {
      const result = await apiFetch<Promotion[]>(
        "/api/v1/admin/promotions?page=1&pageSize=50",
      );
      setItems(result.data);
    } catch {
      // apiFetch reports request failures through the shared admin toast.
      setLoadFailed(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const startAt = String(form.get("startAt") ?? "");
    const endAt = String(form.get("endAt") ?? "");
    const dateErrors: AdminValidationErrors =
      startAt && endAt && new Date(endAt) <= new Date(startAt)
        ? { endAt: "End must be later than the start." }
        : {};
    if (!createValidation.validate(formElement, dateErrors)) return;

    setIsCreating(true);
    try {
      await apiFetch("/api/v1/admin/promotions", {
        method: "POST",
        body: jsonBody({
          title: form.get("title"),
          slug: form.get("slug"),
          description: form.get("description"),
          startAt,
          endAt,
          status: "DRAFT",
          rewardVC: Number(form.get("rewardVC")),
          eligibility: {},
        }),
      });
      setShowCreate(false);
      createValidation.clear();
      notifyAdminSuccess("Promotion created in draft state.");
      await load();
    } catch {
      // The API helper owns request error feedback; field errors stay inline.
    } finally {
      setIsCreating(false);
    }
  }

  async function updatePromotion() {
    if (!promotionToUpdate || isUpdating) return;
    const item = promotionToUpdate;
    setIsUpdating(true);
    try {
      await apiFetch(`/api/v1/admin/promotions/${item.id}`, {
        method: "PATCH",
        body: jsonBody({
          status: item.status === "ACTIVE" ? "ENDED" : "ACTIVE",
        }),
      });
      setPromotionToUpdate(null);
      notifyAdminSuccess(`${item.title} updated.`);
      await load();
    } catch {
      // Request failures are announced by the shared admin toast.
    } finally {
      setIsUpdating(false);
    }
  }

  return (
    <>
      <PageIntro
        eyebrow="Growth operations"
        title="Promotions"
        description="Create explicit fictional-credit campaigns and manage their lifecycle. Claims are one-time, idempotent, and ledger-backed."
        action={
          <AdminButton
            onClick={() => {
              createValidation.clear();
              setShowCreate(true);
            }}
          >
            <Sparkles aria-hidden="true" className="mr-2 inline" size={14} />
            New promotion
          </AdminButton>
        }
      />

      <AdminModal
        description="Draft promotions can be activated after their details are reviewed."
        footer={
          <AdminDialogFooter>
            <AdminButton
              disabled={isCreating}
              onClick={() => setShowCreate(false)}
              variant="secondary"
            >
              Cancel
            </AdminButton>
            <AdminButton
              disabled={isCreating}
              form="promotion-create-form"
              loading={isCreating}
              loadingText="Creating…"
              type="submit"
            >
              Create draft
            </AdminButton>
          </AdminDialogFooter>
        }
        onClose={() => {
          if (!isCreating) setShowCreate(false);
        }}
        open={showCreate}
        title="New promotion"
      >
        <form
          className="grid gap-4 md:grid-cols-2"
          id="promotion-create-form"
          noValidate
          onSubmit={create}
        >
          <AdminField
            error={createValidation.errors.title}
            label="Title"
            name="title"
          >
            <AdminInput autoComplete="off" name="title" required />
          </AdminField>
          <AdminField
            error={createValidation.errors.slug}
            label="Slug"
            name="slug"
          >
            <AdminInput autoComplete="off" name="slug" required />
          </AdminField>
          <AdminField
            className="admin-field--wide"
            error={createValidation.errors.description}
            label="Description"
            name="description"
          >
            <AdminTextarea name="description" required rows={3} />
          </AdminField>
          <AdminField
            error={createValidation.errors.startAt}
            label="Start"
            name="startAt"
          >
            <AdminInput name="startAt" required type="datetime-local" />
          </AdminField>
          <AdminField
            error={createValidation.errors.endAt}
            label="End"
            name="endAt"
          >
            <AdminInput name="endAt" required type="datetime-local" />
          </AdminField>
          <AdminField
            className="admin-field--wide"
            error={createValidation.errors.rewardVC}
            label="Reward amount"
            name="rewardVC"
          >
            <AdminInput
              min="1"
              name="rewardVC"
              required
              step="1"
              type="number"
            />
          </AdminField>
        </form>
      </AdminModal>

      <AdminModal
        description={
          promotionToUpdate?.status === "ACTIVE"
            ? "Ending a promotion stops new claims without removing its history."
            : "Activating a promotion makes it available according to its configured window."
        }
        footer={
          <AdminDialogFooter>
            <AdminButton
              disabled={isUpdating}
              onClick={() => setPromotionToUpdate(null)}
              variant="secondary"
            >
              Cancel
            </AdminButton>
            <AdminButton
              disabled={isUpdating}
              loading={isUpdating}
              loadingText="Saving…"
              onClick={() => void updatePromotion()}
              variant={
                promotionToUpdate?.status === "ACTIVE" ? "danger" : "primary"
              }
            >
              {promotionToUpdate?.status === "ACTIVE"
                ? "End promotion"
                : "Activate promotion"}
            </AdminButton>
          </AdminDialogFooter>
        }
        onClose={() => {
          if (!isUpdating) setPromotionToUpdate(null);
        }}
        open={Boolean(promotionToUpdate)}
        title={`${promotionToUpdate?.status === "ACTIVE" ? "End" : "Activate"} ${promotionToUpdate?.title ?? "promotion"}`}
      >
        <p className="text-sm leading-6 text-[var(--admin-text-soft)]">
          {promotionToUpdate?.status === "ACTIVE"
            ? "Players will no longer be able to make new claims. Existing claims and ledger records remain available."
            : "This changes the promotion status to active. Its configured start and end window still applies."}
        </p>
      </AdminModal>

      <Panel className="overflow-hidden">
        <div className="admin-table-scroll">
          <table className="admin-table admin-table--dense min-w-[850px]">
            <thead>
              <tr>
                <th>Promotion</th>
                <th>Window</th>
                <th>Reward</th>
                <th>Claims</th>
                <th>Status</th>
                <th className="text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>
                    <p className="text-sm font-semibold text-[var(--admin-text-strong)]">
                      {item.title}
                    </p>
                    <p className="mt-1 text-xs text-[var(--admin-muted)]">
                      {item.slug}
                    </p>
                  </td>
                  <td className="text-xs text-[var(--admin-text-soft)]">
                    {formatDate(item.startAt)}
                    <br />
                    to {formatDate(item.endAt)}
                  </td>
                  <td className="text-xs font-semibold text-[var(--admin-accent)]">
                    {formatVc(item.rewardVC)}
                  </td>
                  <td className="text-xs text-[var(--admin-text-soft)]">
                    {item._count.claims}
                  </td>
                  <td>
                    <StatusPill value={item.status} />
                  </td>
                  <td className="text-right">
                    <AdminButton
                      onClick={() => setPromotionToUpdate(item)}
                      size="sm"
                      variant="secondary"
                    >
                      {item.status === "ACTIVE" ? "End" : "Activate"}
                    </AdminButton>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!isLoading && !loadFailed && items.length === 0 ? (
            <div className="admin-empty-state">No promotions yet.</div>
          ) : null}
          {isLoading ? (
            <div aria-live="polite" className="admin-empty-state">
              Loading promotions…
            </div>
          ) : null}
        </div>
      </Panel>
    </>
  );
}

export function RewardsAdmin() {
  const user = useAdminUser() as AdminUser | null;
  const canEdit = user?.role === "SUPER_ADMIN";
  const [configs, setConfigs] = useState<VipConfig[]>([]);
  const [history, setHistory] = useState<
    Array<{
      id: string;
      type: string;
      amountVC: number;
      createdAt: string;
      user: { email: string; username: string | null };
    }>
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [savingLevel, setSavingLevel] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setLoadFailed(false);
    try {
      const [config, records] = await Promise.all([
        apiFetch<VipConfig[]>("/api/v1/admin/rewards/config"),
        apiFetch<
          Array<{
            id: string;
            type: string;
            amountVC: number;
            createdAt: string;
            user: { email: string; username: string | null };
          }>
        >("/api/v1/admin/rewards/history?page=1&pageSize=25"),
      ]);
      setConfigs(config.data);
      setHistory(records.data);
    } catch {
      // apiFetch reports request failures through the shared admin toast.
      setLoadFailed(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const save = useCallback(
    async (config: VipConfig) => {
      if (savingLevel) return false;
      setSavingLevel(config.level);
      try {
        await apiFetch("/api/v1/admin/rewards/config", {
          method: "PATCH",
          body: jsonBody(config),
        });
        notifyAdminSuccess(`${config.level} configuration updated.`);
        await load();
        return true;
      } catch {
        // Request failures are announced by the shared admin toast.
        return false;
      } finally {
        setSavingLevel(null);
      }
    },
    [load, savingLevel],
  );

  return (
    <>
      <PageIntro
        eyebrow="Player incentives"
        title="Rewards"
        description="Configure the transparent VIP ladder and inspect immutable reward history. Only Super Admin can change thresholds or reward amounts."
      />
      <Panel className="p-6">
        <div className="mb-5 flex items-center gap-2">
          <Trophy
            aria-hidden="true"
            className="text-[var(--admin-accent)]"
            size={17}
          />
          <h2 className="text-sm font-semibold text-[var(--admin-text-strong)]">
            VIP configuration
          </h2>
        </div>
        <div aria-busy={isLoading} className="grid gap-3">
          {configs.map((config) => (
            <RewardRow
              config={config}
              canEdit={canEdit}
              isSaving={savingLevel === config.level}
              onSave={save}
              key={config.level}
            />
          ))}
          {!isLoading && !loadFailed && configs.length === 0 ? (
            <div className="admin-empty-state">
              No VIP levels are configured.
            </div>
          ) : null}
          {isLoading ? (
            <div aria-live="polite" className="admin-empty-state">
              Loading VIP configuration…
            </div>
          ) : null}
        </div>
      </Panel>
      <Panel className="mt-6 overflow-hidden">
        <div className="border-b border-[var(--admin-border)] px-6 py-5">
          <h2 className="text-sm font-semibold text-[var(--admin-text-strong)]">
            Reward history
          </h2>
          <p className="mt-1 text-xs text-[var(--admin-muted)]">
            {history.length} recent records
          </p>
        </div>
        <div className="divide-y divide-[var(--admin-border)]">
          {history.map((item) => (
            <div
              className="flex items-center justify-between gap-4 px-6 py-4"
              key={item.id}
            >
              <div>
                <p className="text-sm font-semibold text-[var(--admin-text-strong)]">
                  {item.type.replaceAll("_", " ")}
                </p>
                <p className="mt-1 text-xs text-[var(--admin-muted)]">
                  {item.user.username ?? item.user.email} ·{" "}
                  {formatDate(item.createdAt)}
                </p>
              </div>
              <span className="text-sm font-semibold text-[var(--admin-accent)]">
                +{formatVc(item.amountVC)}
              </span>
            </div>
          ))}
          {!isLoading && !loadFailed && history.length === 0 ? (
            <div className="admin-empty-state">No reward history.</div>
          ) : null}
          {isLoading ? (
            <div aria-live="polite" className="admin-empty-state">
              Loading reward history…
            </div>
          ) : null}
        </div>
      </Panel>
    </>
  );
}

function RewardRow({
  config,
  canEdit,
  isSaving,
  onSave,
}: {
  config: VipConfig;
  canEdit: boolean;
  isSaving: boolean;
  onSave: (config: VipConfig) => Promise<boolean>;
}) {
  const [threshold, setThreshold] = useState(String(config.xpThreshold));
  const [reward, setReward] = useState(String(config.rewardVC));
  const [showEdit, setShowEdit] = useState(false);
  const validation = useAdminFormValidation();
  const formId = `vip-reward-${config.level.replace(/[^a-zA-Z0-9_-]/g, "-")}`;

  useEffect(() => {
    setThreshold(String(config.xpThreshold));
    setReward(String(config.rewardVC));
  }, [config]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!validation.validate(event.currentTarget)) return;
    const saved = await onSave({
      level: config.level,
      xpThreshold: Number(threshold),
      rewardVC: Number(reward),
    });
    if (saved) {
      setShowEdit(false);
      validation.clear();
    }
  }

  return (
    <>
      <div className="flex items-center justify-between gap-4 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-panel-soft)] p-4">
        <div>
          <p className="text-sm font-semibold text-[var(--admin-text-strong)]">
            {config.level}
          </p>
          <p className="mt-1 text-xs text-[var(--admin-muted)]">
            XP {config.xpThreshold.toLocaleString()} ·{" "}
            {formatVc(config.rewardVC)} milestone reward
          </p>
        </div>
        <AdminButton
          disabled={!canEdit || isSaving}
          onClick={() => {
            validation.clear();
            setShowEdit(true);
          }}
          size="sm"
          variant="secondary"
        >
          <Pencil aria-hidden="true" size={13} />
          Edit
        </AdminButton>
      </div>
      <AdminModal
        description="Update the XP threshold and milestone reward for this level."
        footer={
          <AdminDialogFooter>
            <AdminButton
              disabled={isSaving}
              onClick={() => setShowEdit(false)}
              variant="secondary"
            >
              Cancel
            </AdminButton>
            <AdminButton
              disabled={!canEdit || isSaving}
              form={formId}
              loading={isSaving}
              loadingText="Saving…"
              type="submit"
            >
              Save changes
            </AdminButton>
          </AdminDialogFooter>
        }
        onClose={() => {
          if (!isSaving) setShowEdit(false);
        }}
        open={showEdit}
        title={`Edit ${config.level} rewards`}
      >
        <form className="grid gap-4" id={formId} noValidate onSubmit={save}>
          <AdminField
            error={validation.errors.xpThreshold}
            label="XP threshold"
            name="xpThreshold"
          >
            <AdminInput
              disabled={!canEdit || isSaving}
              min="0"
              name="xpThreshold"
              onChange={(event) => setThreshold(event.target.value)}
              required
              step="1"
              type="number"
              value={threshold}
            />
          </AdminField>
          <AdminField
            error={validation.errors.rewardVC}
            label="Reward amount"
            name="rewardVC"
          >
            <AdminInput
              disabled={!canEdit || isSaving}
              min="0"
              name="rewardVC"
              onChange={(event) => setReward(event.target.value)}
              required
              step="1"
              type="number"
              value={reward}
            />
          </AdminField>
        </form>
      </AdminModal>
    </>
  );
}

export function ResponsibleAdmin() {
  const [items, setItems] = useState<Restriction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    let active = true;
    setLoadFailed(false);
    apiFetch<Restriction[]>(
      "/api/v1/admin/responsible-gaming?page=1&pageSize=50",
    )
      .then((result) => {
        if (active) setItems(result.data);
      })
      .catch(() => {
        // apiFetch reports request failures through the shared admin toast.
        if (active) setLoadFailed(true);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <>
      <PageIntro
        eyebrow="Player safety"
        title="Responsible gaming"
        description="Read-only inspection of player-configured limits and active pauses. Operators cannot casually override player restrictions from this view."
      />
      <Panel className="overflow-hidden">
        <div className="flex items-center gap-2 border-b border-[var(--admin-border)] px-6 py-5">
          <ShieldCheck
            aria-hidden="true"
            className="text-[var(--admin-accent)]"
            size={17}
          />
          <div>
            <h2 className="text-sm font-semibold text-[var(--admin-text-strong)]">
              Active controls and limits
            </h2>
            <p className="mt-1 text-xs text-[var(--admin-muted)]">
              {items.length} players with configured restrictions
            </p>
          </div>
        </div>
        <div
          aria-busy={isLoading}
          className="divide-y divide-[var(--admin-border)]"
        >
          {items.map((item) => (
            <div
              className="grid gap-4 px-6 py-5 lg:grid-cols-[1.1fr_1fr_auto]"
              key={item.user.id}
            >
              <div>
                <p className="text-sm font-semibold text-[var(--admin-text-strong)]">
                  {item.user.profile?.displayName ??
                    item.user.profile?.username ??
                    item.user.email}
                </p>
                <p className="mt-1 text-xs text-[var(--admin-muted)]">
                  {item.user.email}
                </p>
              </div>
              <div className="flex flex-wrap gap-2 text-xs text-[var(--admin-text-soft)]">
                {item.settings.dailyWagerLimit !== null ? (
                  <span className="rounded-lg border border-[var(--admin-border)] px-2.5 py-1.5">
                    Daily {formatVc(item.settings.dailyWagerLimit)}
                  </span>
                ) : null}
                {item.settings.maxWager !== null ? (
                  <span className="rounded-lg border border-[var(--admin-border)] px-2.5 py-1.5">
                    Max {formatVc(item.settings.maxWager)}
                  </span>
                ) : null}
                {item.settings.coolOffUntil ? (
                  <StatusPill value="COOL-OFF" />
                ) : null}
                {item.settings.selfExcludedUntil ? (
                  <StatusPill value="SELF-EXCLUDED" />
                ) : null}
              </div>
              <p className="text-xs text-[var(--admin-muted)] lg:text-right">
                Updated {formatDate(item.settings.updatedAt)}
              </p>
            </div>
          ))}
          {!isLoading && !loadFailed && items.length === 0 ? (
            <div className="admin-empty-state">No configured restrictions.</div>
          ) : null}
          {isLoading ? (
            <div aria-live="polite" className="admin-empty-state">
              Loading player restrictions…
            </div>
          ) : null}
        </div>
      </Panel>
    </>
  );
}
