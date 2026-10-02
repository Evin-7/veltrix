"use client";

import { type FormEvent, useCallback, useEffect, useState } from "react";
import { Building2, Check, Pencil, Plus } from "lucide-react";
import {
  AdminButton,
  AdminCheckbox,
  AdminDialogFooter,
  AdminField,
  AdminInput,
  AdminTextarea,
  useAdminFormValidation,
} from "@/components/admin-form";
import { AdminModal } from "@/components/admin-modal";
import { AdminSelect } from "@/components/admin-select";
import {
  AdminShell,
  EmptyState,
  PageIntro,
  Panel,
  StatusPill,
} from "@/components/admin-shell";
import { ThumbnailUpload } from "@/components/thumbnail-upload";
import { apiFetch, jsonBody } from "@/lib/api";
import { notifyAdminSuccess } from "@/lib/admin-toast";

type Provider = {
  id: string;
  name: string;
  slug: string;
  status: "ACTIVE" | "INACTIVE";
  _count: { games: number };
};
type Game = {
  id: string;
  providerId: string;
  name: string;
  slug: string;
  description: string;
  category: string;
  thumbnail: string | null;
  status: "ACTIVE" | "INACTIVE" | "MAINTENANCE";
  featured: boolean;
  newGame: boolean;
  popular: boolean;
  demoRtp: number;
  provider: Provider;
  _count: { gameSessions: number };
};

const categories = [
  "SLOTS",
  "TABLE_GAMES",
  "LIVE_STYLE",
  "BLACKJACK",
  "ROULETTE",
  "ARCADE",
];

function selectedThumbnailFile(form: FormData) {
  const value = form.get("thumbnailFile");
  return typeof File !== "undefined" && value instanceof File && value.size > 0
    ? value
    : null;
}

async function uploadGameThumbnail(
  file: File,
  onUploadingChange?: (uploading: boolean) => void,
) {
  const formData = new FormData();
  formData.set("file", file);
  onUploadingChange?.(true);
  try {
    const result = await apiFetch<{ thumbnailUrl: string }>(
      "/api/v1/admin/uploads/game-thumbnail",
      { method: "POST", body: formData },
    );
    return result.data.thumbnailUrl;
  } finally {
    onUploadingChange?.(false);
  }
}

function GamesContent() {
  const [games, setGames] = useState<Game[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [showProviderCreate, setShowProviderCreate] = useState(false);
  const [providerToToggle, setProviderToToggle] = useState<Provider | null>(
    null,
  );
  const [creating, setCreating] = useState(false);
  const [uploadingCreateThumbnail, setUploadingCreateThumbnail] =
    useState(false);
  const [creatingProvider, setCreatingProvider] = useState(false);
  const [togglingProvider, setTogglingProvider] = useState(false);
  const [uploadingGameId, setUploadingGameId] = useState<string | null>(null);
  const [providerId, setProviderId] = useState("");
  const [category, setCategory] = useState("");
  const createValidation = useAdminFormValidation();
  const providerValidation = useAdminFormValidation();

  const load = useCallback(async () => {
    setLoadFailed(false);
    try {
      const result = await apiFetch<{ games: Game[]; providers: Provider[] }>(
        "/api/v1/admin/games",
      );
      setGames(result.data.games);
      setProviders(result.data.providers);
      setProviderId((current) =>
        result.data.providers.some((provider) => provider.id === current)
          ? current
          : "",
      );
    } catch {
      // apiFetch reports operation errors through the shared admin toast.
      setLoadFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function save(
    game: Game,
    patch: Partial<Game>,
    thumbnailFile?: File | null,
  ) {
    try {
      const thumbnail = thumbnailFile
        ? await uploadGameThumbnail(thumbnailFile, (uploading) =>
            setUploadingGameId(
              uploading
                ? game.id
                : (current) => (current === game.id ? null : current),
            ),
          )
        : (patch.thumbnail ?? null);
      await apiFetch(`/api/v1/admin/games/${game.id}`, {
        method: "PATCH",
        body: jsonBody({ ...patch, thumbnail }),
      });
      notifyAdminSuccess(`${game.name} updated.`);
      await load();
      return true;
    } catch {
      return false;
    }
  }

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const formErrors = {
      ...(!providers.some((provider) => provider.id === providerId)
        ? {
            provider: providers.length
              ? "Select a provider."
              : "Create a provider before adding a game.",
          }
        : {}),
      ...(!categories.includes(category)
        ? { category: "Select a category." }
        : {}),
    };
    if (!createValidation.validate(formElement, formErrors)) return;
    const form = new FormData(formElement);
    setCreating(true);
    try {
      const thumbnailFile = selectedThumbnailFile(form);
      const thumbnail = thumbnailFile
        ? await uploadGameThumbnail(thumbnailFile, setUploadingCreateThumbnail)
        : null;
      await apiFetch("/api/v1/admin/games", {
        method: "POST",
        body: jsonBody({
          providerId,
          name: form.get("name"),
          slug: form.get("slug"),
          description: form.get("description"),
          category,
          thumbnail,
          demoRtp: Number(form.get("demoRtp")),
          status: "INACTIVE",
        }),
      });
      setShowCreate(false);
      createValidation.clear();
      notifyAdminSuccess("Game created in inactive state.");
      await load();
    } catch {
      // Keep the dialog and entered values available for retry; apiFetch shows the error toast.
    } finally {
      setCreating(false);
    }
  }

  async function createProvider(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!providerValidation.validate(event.currentTarget)) return;
    const form = new FormData(event.currentTarget);
    setCreatingProvider(true);
    try {
      await apiFetch("/api/v1/admin/providers", {
        method: "POST",
        body: jsonBody({
          name: form.get("name"),
          slug: form.get("slug"),
          status: "INACTIVE",
        }),
      });
      setShowProviderCreate(false);
      providerValidation.clear();
      notifyAdminSuccess("Provider created in inactive state.");
      await load();
    } catch {
      // Keep the dialog and entered values available for retry; apiFetch shows the error toast.
    } finally {
      setCreatingProvider(false);
    }
  }

  async function toggleProvider() {
    if (!providerToToggle) return;
    const provider = providerToToggle;
    setTogglingProvider(true);
    try {
      await apiFetch(`/api/v1/admin/providers/${provider.id}`, {
        method: "PATCH",
        body: jsonBody({
          status: provider.status === "ACTIVE" ? "INACTIVE" : "ACTIVE",
        }),
      });
      setProviderToToggle(null);
      notifyAdminSuccess(`${provider.name} updated.`);
      await load();
    } catch {
      // apiFetch shows the operation error through the shared toast.
    } finally {
      setTogglingProvider(false);
    }
  }

  return (
    <>
      <PageIntro
        eyebrow="Catalog operations"
        title="Games & providers"
        description="Manage catalog metadata and availability. Outcomes, rounds, and settlement data remain server-authoritative and are never editable here."
        action={
          <div className="flex flex-wrap gap-2">
            <AdminButton
              onClick={() => setShowProviderCreate(true)}
              variant="secondary"
            >
              <Building2 aria-hidden="true" size={15} />
              Add provider
            </AdminButton>
            <AdminButton onClick={() => setShowCreate(true)}>
              <Plus aria-hidden="true" size={15} />
              Add game
            </AdminButton>
          </div>
        }
      />

      <AdminModal
        description="New games start inactive until an operator reviews the metadata."
        footer={
          <AdminDialogFooter>
            <AdminButton
              onClick={() => {
                setShowCreate(false);
                createValidation.clear();
              }}
              variant="secondary"
            >
              Cancel
            </AdminButton>
            <AdminButton
              form="create-game-form"
              loading={creating}
              loadingText="Creating…"
              type="submit"
            >
              Create inactive game
            </AdminButton>
          </AdminDialogFooter>
        }
        onClose={() => {
          if (!creating) {
            setShowCreate(false);
            createValidation.clear();
          }
        }}
        open={showCreate}
        title="New catalog game"
      >
        <form
          className="admin-form-grid"
          id="create-game-form"
          noValidate
          onSubmit={create}
        >
          <AdminField
            error={createValidation.errors.name}
            label="Game name"
            name="name"
          >
            <AdminInput autoComplete="off" name="name" required />
          </AdminField>
          <AdminField
            error={createValidation.errors.slug}
            hint="Use lowercase letters, numbers, and hyphens."
            label="Game slug"
            name="slug"
          >
            <AdminInput
              autoComplete="off"
              name="slug"
              pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
              required
            />
          </AdminField>
          <AdminField
            error={createValidation.errors.provider}
            label="Provider"
            name="provider"
          >
            <AdminSelect
              ariaLabel="Game provider"
              disabled={providers.length === 0}
              onValueChange={(value) => {
                setProviderId(value);
                createValidation.setErrors((current) => ({
                  ...current,
                  provider: "",
                }));
              }}
              options={[
                { value: "", label: "Select a provider", disabled: true },
                ...providers.map((provider) => ({
                  value: provider.id,
                  label: provider.name,
                })),
              ]}
              value={providerId}
            />
          </AdminField>
          <AdminField
            error={createValidation.errors.category}
            label="Category"
            name="category"
          >
            <AdminSelect
              ariaLabel="Game category"
              onValueChange={(value) => {
                setCategory(value);
                createValidation.setErrors((current) => ({
                  ...current,
                  category: "",
                }));
              }}
              options={[
                { value: "", label: "Select a category", disabled: true },
                ...categories.map((item) => ({ value: item, label: item })),
              ]}
              value={category}
            />
          </AdminField>
          <AdminField
            error={createValidation.errors.demoRtp}
            hint="Enter a percentage from 0 to 100."
            label="Demo RTP"
            name="demoRtp"
          >
            <AdminInput
              inputMode="decimal"
              max="100"
              min="0"
              name="demoRtp"
              required
              step="0.01"
              type="number"
            />
          </AdminField>
          <ThumbnailUpload
            disabled={creating}
            imageUrl={null}
            open={showCreate}
            uploading={uploadingCreateThumbnail}
          />
          <AdminField
            className="admin-field--wide"
            error={createValidation.errors.description}
            label="Description"
            name="description"
          >
            <AdminTextarea
              maxLength={1000}
              name="description"
              required
              rows={3}
            />
          </AdminField>
        </form>
      </AdminModal>

      <AdminModal
        description="Providers start inactive until they are reviewed and activated."
        footer={
          <AdminDialogFooter>
            <AdminButton
              onClick={() => {
                setShowProviderCreate(false);
                providerValidation.clear();
              }}
              variant="secondary"
            >
              Cancel
            </AdminButton>
            <AdminButton
              form="create-provider-form"
              loading={creatingProvider}
              loadingText="Creating…"
              type="submit"
            >
              Create inactive provider
            </AdminButton>
          </AdminDialogFooter>
        }
        onClose={() => {
          if (!creatingProvider) {
            setShowProviderCreate(false);
            providerValidation.clear();
          }
        }}
        open={showProviderCreate}
        title="New provider"
      >
        <form
          className="admin-form-stack"
          id="create-provider-form"
          noValidate
          onSubmit={createProvider}
        >
          <AdminField
            error={providerValidation.errors.name}
            label="Provider name"
            name="name"
          >
            <AdminInput autoComplete="off" name="name" required />
          </AdminField>
          <AdminField
            error={providerValidation.errors.slug}
            hint="Use lowercase letters, numbers, and hyphens."
            label="Provider slug"
            name="slug"
          >
            <AdminInput
              autoComplete="off"
              name="slug"
              pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
              required
            />
          </AdminField>
        </form>
      </AdminModal>

      <AdminModal
        description={
          providerToToggle?.status === "ACTIVE"
            ? "Inactive providers remain in history but their games leave the player catalog."
            : "Activate this provider to make its games available to players."
        }
        footer={
          <AdminDialogFooter>
            <AdminButton
              disabled={togglingProvider}
              onClick={() => setProviderToToggle(null)}
              variant="secondary"
            >
              Cancel
            </AdminButton>
            <AdminButton
              loading={togglingProvider}
              loadingText="Updating…"
              onClick={() => void toggleProvider()}
              variant={
                providerToToggle?.status === "ACTIVE" ? "danger" : "primary"
              }
            >
              {providerToToggle?.status === "ACTIVE"
                ? "Disable provider"
                : "Activate provider"}
            </AdminButton>
          </AdminDialogFooter>
        }
        onClose={() => {
          if (!togglingProvider) setProviderToToggle(null);
        }}
        open={Boolean(providerToToggle)}
        title={`${providerToToggle?.status === "ACTIVE" ? "Disable" : "Activate"} ${providerToToggle?.name ?? "provider"}`}
      >
        <p className="text-sm leading-6 text-[var(--admin-text-soft)]">
          {providerToToggle?.status === "ACTIVE"
            ? "This removes its games from the player catalog while keeping historical records."
            : "Players will be able to access this provider’s active games."}
        </p>
      </AdminModal>

      <Panel className="overflow-hidden">
        <div className="admin-panel-heading flex items-center justify-between px-6 py-5">
          <div>
            <h2 className="text-sm font-semibold text-white">
              Catalog inventory
            </h2>
            <p className="mt-1 text-xs text-[#718097]">
              {games.length} games · {providers.length} providers
            </p>
          </div>
        </div>
        <div className="admin-table-scroll">
          <table className="admin-table min-w-[900px]">
            <thead>
              <tr>
                <th>Game</th>
                <th>Provider</th>
                <th>Status</th>
                <th>RTP</th>
                <th>Flags</th>
                <th className="text-right">Edit</th>
              </tr>
            </thead>
            <tbody>
              {games.map((game) => (
                <GameRow
                  game={game}
                  key={game.id}
                  onSave={save}
                  uploading={uploadingGameId === game.id}
                />
              ))}
              {!loading && !loadFailed && games.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <EmptyState>No games in the catalog yet.</EmptyState>
                  </td>
                </tr>
              ) : null}
              {loading ? (
                <tr>
                  <td colSpan={6}>
                    <EmptyState>Loading catalog…</EmptyState>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel className="mt-6 overflow-hidden">
        <div className="admin-panel-heading px-6 py-5">
          <h2 className="text-sm font-semibold text-white">Providers</h2>
          <p className="mt-1 text-xs text-[#718097]">
            Disable providers to remove their games from the player catalog
            without deleting history.
          </p>
        </div>
        {providers.length ? (
          <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-3">
            {providers.map((provider) => (
              <div
                key={provider.id}
                className="flex items-center justify-between gap-4 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-panel-soft)] px-5 py-4"
              >
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-white">
                    {provider.name}
                  </div>
                  <div className="mt-1 text-xs text-[#718097]">
                    {provider._count.games} games · {provider.slug}
                  </div>
                </div>
                <AdminButton
                  aria-label={`${provider.status === "ACTIVE" ? "Disable" : "Activate"} ${provider.name}`}
                  onClick={() => setProviderToToggle(provider)}
                  size="sm"
                  variant="secondary"
                >
                  <StatusPill value={provider.status} />
                </AdminButton>
              </div>
            ))}
          </div>
        ) : loadFailed ? null : (
          <EmptyState>
            {loading ? "Loading providers…" : "No providers have been created."}
          </EmptyState>
        )}
      </Panel>
    </>
  );
}

function GameRow({
  game,
  onSave,
  uploading,
}: {
  game: Game;
  onSave: (
    game: Game,
    patch: Partial<Game>,
    thumbnailFile?: File | null,
  ) => Promise<boolean>;
  uploading: boolean;
}) {
  const [status, setStatus] = useState(game.status);
  const [featured, setFeatured] = useState(game.featured);
  const [popular, setPopular] = useState(game.popular);
  const [newGame, setNewGame] = useState(game.newGame);
  const [name, setName] = useState(game.name);
  const [description, setDescription] = useState(game.description);
  const [category, setCategory] = useState(game.category);
  const [demoRtp, setDemoRtp] = useState(String(game.demoRtp));
  const [saving, setSaving] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const validation = useAdminFormValidation();
  const formId = `edit-game-${game.id}`;
  const flagControls = [
    { label: "Featured", checked: featured, set: setFeatured },
    { label: "Popular", checked: popular, set: setPopular },
    { label: "New", checked: newGame, set: setNewGame },
  ];

  useEffect(() => {
    setStatus(game.status);
    setFeatured(game.featured);
    setPopular(game.popular);
    setNewGame(game.newGame);
    setName(game.name);
    setDescription(game.description);
    setCategory(game.category);
    setDemoRtp(String(game.demoRtp));
  }, [game]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    if (!validation.validate(form)) return;
    const thumbnailFile = selectedThumbnailFile(new FormData(form));
    const thumbnailValue = new FormData(form).get("thumbnail");
    setSaving(true);
    try {
      const saved = await onSave(
        game,
        {
          name,
          description,
          category,
          demoRtp: Number(demoRtp),
          thumbnail:
            typeof thumbnailValue === "string" && thumbnailValue
              ? thumbnailValue
              : null,
          status,
          featured,
          popular,
          newGame,
        },
        thumbnailFile,
      );
      if (saved) {
        setShowEdit(false);
        validation.clear();
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <tr>
        <td>
          <div className="text-sm font-semibold text-[#edf3fd]">
            {game.name}
          </div>
          <div className="mt-1 text-xs text-[#718097]">{game.slug}</div>
        </td>
        <td className="text-xs text-[#aab4c8]">{game.provider.name}</td>
        <td>
          <StatusPill value={game.status} />
        </td>
        <td className="text-xs text-[#aab4c8]">{game.demoRtp.toFixed(2)}%</td>
        <td>
          <div
            aria-label={`Catalog flags for ${game.name}`}
            className="flex gap-2"
          >
            {[
              { label: "Featured", checked: game.featured, short: "F" },
              { label: "Popular", checked: game.popular, short: "P" },
              { label: "New", checked: game.newGame, short: "N" },
            ].map((flag) => (
              <span
                aria-label={`${flag.label}: ${flag.checked ? "yes" : "no"}`}
                className={`grid h-7 w-7 place-items-center rounded-md border text-[10px] font-bold ${flag.checked ? "border-[#245a4c] bg-[#12352e] text-[#83f5c5]" : "border-[#2b3547] text-[#637089]"}`}
                key={flag.label}
              >
                {flag.checked ? (
                  <Check aria-hidden="true" size={13} />
                ) : (
                  flag.short
                )}
              </span>
            ))}
          </div>
        </td>
        <td className="text-right">
          <AdminButton
            disabled={saving}
            onClick={() => setShowEdit(true)}
            size="sm"
            variant="secondary"
          >
            <Pencil aria-hidden="true" size={13} />
            Edit
          </AdminButton>
        </td>
      </tr>

      <AdminModal
        description="Update the catalog metadata, availability, and flags for this game."
        footer={
          <AdminDialogFooter>
            <AdminButton
              disabled={saving}
              onClick={() => {
                setShowEdit(false);
                validation.clear();
              }}
              variant="secondary"
            >
              Cancel
            </AdminButton>
            <AdminButton
              form={formId}
              loading={saving}
              loadingText="Saving…"
              type="submit"
            >
              Save changes
            </AdminButton>
          </AdminDialogFooter>
        }
        onClose={() => {
          if (!saving) {
            setShowEdit(false);
            validation.clear();
          }
        }}
        open={showEdit}
        title={`Edit ${game.name}`}
      >
        <form
          className="admin-form-grid"
          id={formId}
          noValidate
          onSubmit={(event) => {
            void submit(event);
          }}
        >
          <AdminField
            error={validation.errors.name}
            label="Game name"
            name="name"
          >
            <AdminInput
              autoComplete="off"
              name="name"
              onChange={(event) => setName(event.target.value)}
              required
              value={name}
            />
          </AdminField>
          <AdminField label="Category" name="category">
            <AdminSelect
              ariaLabel={`${game.name} category`}
              onValueChange={setCategory}
              options={categories.map((item) => ({ value: item, label: item }))}
              value={category}
            />
          </AdminField>
          <AdminField
            className="admin-field--wide"
            error={validation.errors.description}
            label="Description"
            name="description"
          >
            <AdminTextarea
              maxLength={1000}
              name="description"
              onChange={(event) => setDescription(event.target.value)}
              required
              rows={3}
              value={description}
            />
          </AdminField>
          <AdminField
            error={validation.errors.demoRtp}
            hint="Enter a percentage from 0 to 100."
            label="Demo RTP"
            name="demoRtp"
          >
            <AdminInput
              inputMode="decimal"
              max="100"
              min="0"
              name="demoRtp"
              onChange={(event) => setDemoRtp(event.target.value)}
              required
              step="0.01"
              type="number"
              value={demoRtp}
            />
          </AdminField>
          <AdminField label="Status" name="status">
            <AdminSelect
              ariaLabel={`${game.name} status`}
              onValueChange={(value) => setStatus(value as Game["status"])}
              options={[
                { value: "ACTIVE", label: "Active" },
                { value: "INACTIVE", label: "Inactive" },
                { value: "MAINTENANCE", label: "Maintenance" },
              ]}
              value={status}
            />
          </AdminField>
          <ThumbnailUpload
            disabled={saving}
            imageUrl={game.thumbnail}
            open={showEdit}
            uploading={uploading}
          />
          <div className="admin-field admin-field--wide">
            <span className="admin-field-label">Catalog flags</span>
            <div className="grid gap-2 sm:grid-cols-3">
              {flagControls.map(({ label, checked, set }) => (
                <AdminCheckbox
                  checked={checked}
                  key={label}
                  label={label}
                  onChange={set}
                />
              ))}
            </div>
          </div>
        </form>
      </AdminModal>
    </>
  );
}

export default function GamesPage() {
  return (
    <AdminShell>
      <GamesContent />
    </AdminShell>
  );
}
