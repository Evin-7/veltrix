"use client";

import { FormEvent, useEffect, useState } from "react";
import { Building2, Check, Pencil, Plus } from "lucide-react";
import { AdminModal } from "@/components/admin-modal";
import { AdminSelect } from "@/components/admin-select";
import { AdminShell, PageIntro, Panel, StatusPill } from "@/components/admin-shell";
import { apiFetch, ApiError, jsonBody } from "@/lib/api";
import { notifyAdminSuccess } from "@/lib/admin-toast";

type Provider = { id: string; name: string; slug: string; status: "ACTIVE" | "INACTIVE"; _count: { games: number } };
type Game = { id: string; providerId: string; name: string; slug: string; description: string; category: string; thumbnail: string | null; status: "ACTIVE" | "INACTIVE" | "MAINTENANCE"; featured: boolean; newGame: boolean; popular: boolean; demoRtp: number; provider: Provider; _count: { gameSessions: number } };

const categories = ["SLOTS", "TABLE_GAMES", "LIVE_STYLE", "BLACKJACK", "ROULETTE", "ARCADE"];

function GamesContent() {
  const [games, setGames] = useState<Game[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [showProviderCreate, setShowProviderCreate] = useState(false);
  const [providerToToggle, setProviderToToggle] = useState<Provider | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [providerId, setProviderId] = useState("");
  const [category, setCategory] = useState(categories[0]);

  async function load() {
    try {
      const result = await apiFetch<{ games: Game[]; providers: Provider[] }>("/api/v1/admin/games");
      setGames(result.data.games);
      setProviders(result.data.providers);
      setProviderId((current) => current || result.data.providers[0]?.id || "");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to load games.");
    }
  }

  useEffect(() => { void load(); }, []);

  async function save(game: Game, patch: Partial<Game>) {
    try {
      await apiFetch(`/api/v1/admin/games/${game.id}`, { method: "PATCH", body: jsonBody(patch) });
      const nextMessage = `${game.name} updated.`;
      setMessage(nextMessage);
      notifyAdminSuccess(nextMessage);
      await load();
      return true;
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : "Unable to update game.");
      return false;
    }
  }

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      await apiFetch("/api/v1/admin/games", { method: "POST", body: jsonBody({ providerId, name: form.get("name"), slug: form.get("slug"), description: form.get("description"), category, thumbnail: form.get("thumbnail") || null, demoRtp: Number(form.get("demoRtp")), status: "INACTIVE" }) });
      setShowCreate(false);
      const nextMessage = "Game created in inactive state.";
      setMessage(nextMessage);
      notifyAdminSuccess(nextMessage);
      await load();
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : "Unable to create game.");
    }
  }

  async function createProvider(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      await apiFetch("/api/v1/admin/providers", { method: "POST", body: jsonBody({ name: form.get("name"), slug: form.get("slug"), status: "INACTIVE" }) });
      setShowProviderCreate(false);
      const nextMessage = "Provider created in inactive state.";
      setMessage(nextMessage);
      notifyAdminSuccess(nextMessage);
      await load();
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : "Unable to create provider.");
    }
  }

  async function toggleProvider() {
    if (!providerToToggle) return;
    const provider = providerToToggle;
    try {
      await apiFetch(`/api/v1/admin/providers/${provider.id}`, { method: "PATCH", body: jsonBody({ status: provider.status === "ACTIVE" ? "INACTIVE" : "ACTIVE" }) });
      setProviderToToggle(null);
      const nextMessage = `${provider.name} updated.`;
      setMessage(nextMessage);
      notifyAdminSuccess(nextMessage);
      await load();
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : "Unable to update provider.");
    }
  }

  return <>
    <PageIntro eyebrow="Catalog operations" title="Games & providers" description="Manage catalog metadata and availability. Outcomes, rounds, and settlement data remain server-authoritative and are never editable here." action={<div className="flex flex-wrap gap-2"><button onClick={() => setShowProviderCreate(true)} className="flex items-center gap-2 rounded-xl border border-[#2b3547] px-4 py-3 text-xs font-bold text-[#b5c0d3] hover:border-[#83f5c5] hover:text-white"><Building2 size={15} /> Add provider</button><button onClick={() => setShowCreate(true)} className="flex items-center gap-2 rounded-xl bg-[#83f5c5] px-4 py-3 text-xs font-bold text-[#09120f] hover:bg-[#a5fbd8]"><Plus size={15} /> Add game</button></div>} />
    {message && <div className="mb-5 rounded-xl border border-[#245a4c] bg-[#12352e] px-4 py-3 text-xs text-[#8af0c4]">{message}</div>}
    {error && <div className="mb-5 rounded-xl border border-[#643443] bg-[#321b26] px-4 py-3 text-xs text-[#ffadbd]">{error}</div>}
    <AdminModal description="New games start inactive until an operator reviews the metadata." onClose={() => setShowCreate(false)} open={showCreate} title="New catalog game">
      <form onSubmit={create} className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-2 text-xs font-semibold text-[#8994aa]">Game name<input aria-label="Game name" name="name" required className="admin-input" /></label>
        <label className="grid gap-2 text-xs font-semibold text-[#8994aa]">Game slug<input aria-label="Game slug" name="slug" required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" className="admin-input" /></label>
        <label className="grid gap-2 text-xs font-semibold text-[#8994aa]">Provider<AdminSelect ariaLabel="Game provider" disabled={providers.length === 0} onValueChange={setProviderId} options={providers.map((provider) => ({ value: provider.id, label: provider.name }))} value={providerId} /></label>
        <label className="grid gap-2 text-xs font-semibold text-[#8994aa]">Category<AdminSelect ariaLabel="Game category" onValueChange={setCategory} options={categories.map((item) => ({ value: item, label: item }))} value={category} /></label>
        <label className="grid gap-2 text-xs font-semibold text-[#8994aa]">Demo RTP<input aria-label="Demo RTP" name="demoRtp" required type="number" min="0" max="100" step="0.01" className="admin-input" /></label>
        <label className="grid gap-2 text-xs font-semibold text-[#8994aa] md:col-span-2">Thumbnail URL<input aria-label="Thumbnail URL" name="thumbnail" type="url" className="admin-input" /></label>
        <label className="grid gap-2 text-xs font-semibold text-[#8994aa] md:col-span-2">Description<textarea aria-label="Game description" name="description" required className="admin-input resize-none" rows={3} /></label>
        {providers.length === 0 ? <p className="text-xs text-[#ffadbd] md:col-span-2">Create a provider before adding a game.</p> : null}
        <div className="flex flex-col-reverse gap-3 pt-2 sm:col-span-2 sm:flex-row sm:justify-end"><button className="rounded-xl bg-[#83f5c5] px-4 py-3 text-sm font-bold text-[#09120f]" disabled={providers.length === 0} type="submit">Create inactive game</button></div>
      </form>
    </AdminModal>
    <AdminModal description="Providers start inactive until they are reviewed and activated." onClose={() => setShowProviderCreate(false)} open={showProviderCreate} title="New provider">
      <form onSubmit={createProvider} className="grid gap-4">
        <label className="grid gap-2 text-xs font-semibold text-[#8994aa]">Provider name<input aria-label="Provider name" name="name" required className="admin-input" /></label>
        <label className="grid gap-2 text-xs font-semibold text-[#8994aa]">Provider slug<input aria-label="Provider slug" name="slug" required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" className="admin-input" /></label>
        <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end"><button className="rounded-xl bg-[#83f5c5] px-4 py-3 text-sm font-bold text-[#09120f]" type="submit">Create inactive provider</button></div>
      </form>
    </AdminModal>
    <AdminModal description={providerToToggle?.status === "ACTIVE" ? "Inactive providers remain in history but their games leave the player catalog." : "Activate this provider to make its games available to players."} onClose={() => setProviderToToggle(null)} open={Boolean(providerToToggle)} title={`${providerToToggle?.status === "ACTIVE" ? "Disable" : "Activate"} ${providerToToggle?.name ?? "provider"}`}>
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><button className="rounded-xl border border-[#2b3547] px-4 py-3 text-sm font-semibold text-[#b5c0d3] hover:border-[#83f5c5] hover:text-white" onClick={() => setProviderToToggle(null)} type="button">Cancel</button><button className="rounded-xl bg-[#83f5c5] px-4 py-3 text-sm font-bold text-[#09120f]" onClick={() => void toggleProvider()} type="button">{providerToToggle?.status === "ACTIVE" ? "Disable provider" : "Activate provider"}</button></div>
    </AdminModal>
    <Panel className="overflow-hidden"><div className="flex items-center justify-between border-b border-[#252d3d] px-6 py-5"><div><h2 className="text-sm font-semibold text-white">Catalog inventory</h2><p className="mt-1 text-xs text-[#718097]">{games.length} games · {providers.length} providers</p></div></div><div className="overflow-x-auto"><table className="w-full min-w-[960px] text-left"><thead className="border-b border-[#252d3d] bg-[#151a25] text-[10px] uppercase tracking-[0.16em] text-[#637089]"><tr><th className="px-6 py-4">Game</th><th className="px-4 py-4">Provider</th><th className="px-4 py-4">Status</th><th className="px-4 py-4">RTP</th><th className="px-4 py-4">Flags</th><th className="px-6 py-4 text-right">Edit</th></tr></thead><tbody className="divide-y divide-[#202837]">{games.map((game) => <GameRow key={game.id} game={game} onSave={save} />)}</tbody></table></div></Panel>
    <Panel className="mt-6 overflow-hidden"><div className="border-b border-[#252d3d] px-6 py-5"><h2 className="text-sm font-semibold text-white">Providers</h2><p className="mt-1 text-xs text-[#718097]">Disable providers to remove their games from the player catalog without deleting history.</p></div><div className="grid gap-px bg-[#252d3d] sm:grid-cols-2 lg:grid-cols-3">{providers.map((provider) => <div key={provider.id} className="flex items-center justify-between gap-4 bg-[#11151f] px-6 py-5"><div><div className="text-sm font-semibold text-white">{provider.name}</div><div className="mt-1 text-xs text-[#718097]">{provider._count.games} games · {provider.slug}</div></div><button onClick={() => setProviderToToggle(provider)} className="shrink-0"><StatusPill value={provider.status} /></button></div>)}</div></Panel>
  </>;
}

function GameRow({ game, onSave }: { game: Game; onSave: (game: Game, patch: Partial<Game>) => Promise<boolean> }) {
  const [status, setStatus] = useState(game.status);
  const [featured, setFeatured] = useState(game.featured);
  const [popular, setPopular] = useState(game.popular);
  const [newGame, setNewGame] = useState(game.newGame);
  const [name, setName] = useState(game.name);
  const [description, setDescription] = useState(game.description);
  const [category, setCategory] = useState(game.category);
  const [demoRtp, setDemoRtp] = useState(String(game.demoRtp));
  const [thumbnail, setThumbnail] = useState(game.thumbnail ?? "");
  const [saving, setSaving] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const flagButtons: Array<{ label: string; name: string; checked: boolean; set: (value: boolean) => void }> = [{ label: "Featured", name: "F", checked: featured, set: setFeatured }, { label: "Popular", name: "P", checked: popular, set: setPopular }, { label: "New", name: "N", checked: newGame, set: setNewGame }];

  useEffect(() => {
    setStatus(game.status);
    setFeatured(game.featured);
    setPopular(game.popular);
    setNewGame(game.newGame);
    setName(game.name);
    setDescription(game.description);
    setCategory(game.category);
    setDemoRtp(String(game.demoRtp));
    setThumbnail(game.thumbnail ?? "");
  }, [game]);

  async function save() {
    setSaving(true);
    const saved = await onSave(game, { name, description, category, demoRtp: Number(demoRtp), thumbnail: thumbnail || null, status, featured, popular, newGame });
    setSaving(false);
    if (saved) setShowEdit(false);
  }

  return <>
    <tr className="hover:bg-[#151a25]"><td className="px-6 py-4"><div className="text-sm font-semibold text-[#edf3fd]">{game.name}</div><div className="mt-1 text-xs text-[#718097]">{game.slug}</div></td><td className="px-4 py-4 text-xs text-[#aab4c8]">{game.provider.name}</td><td className="px-4 py-4"><StatusPill value={status} /></td><td className="px-4 py-4 text-xs text-[#aab4c8]">{game.demoRtp.toFixed(2)}%</td><td className="px-4 py-4"><div className="flex gap-2">{flagButtons.map(({ name, label, checked }) => <span aria-label={`${label}: ${checked ? "yes" : "no"}`} className={`grid h-7 w-7 place-items-center rounded-md border text-[10px] font-bold ${checked ? "border-[#245a4c] bg-[#12352e] text-[#83f5c5]" : "border-[#2b3547] text-[#637089]"}`} key={name}>{checked ? <Check aria-hidden="true" size={13} /> : name}</span>)}</div></td><td className="px-6 py-4 text-right"><button disabled={saving} onClick={() => setShowEdit(true)} className="inline-flex items-center gap-2 rounded-lg border border-[#2b3547] px-3 py-2 text-xs font-semibold text-[#b5c0d3] hover:border-[#83f5c5] hover:text-white"><Pencil size={13} />Edit</button></td></tr>
    <AdminModal description="Update the catalog metadata, availability, and flags for this game." onClose={() => setShowEdit(false)} open={showEdit} title={`Edit ${game.name}`}>
      <form onSubmit={(event) => { event.preventDefault(); void save(); }} className="grid gap-4">
        <label className="grid gap-2 text-xs font-semibold text-[#8994aa]">Game name<input required value={name} onChange={(event) => setName(event.target.value)} className="admin-input" /></label>
        <label className="grid gap-2 text-xs font-semibold text-[#8994aa]">Description<textarea required value={description} onChange={(event) => setDescription(event.target.value)} rows={3} className="admin-input resize-none" /></label>
        <label className="grid gap-2 text-xs font-semibold text-[#8994aa]">Category<AdminSelect ariaLabel={`${game.name} category`} onValueChange={setCategory} options={categories.map((item) => ({ value: item, label: item }))} value={category} /></label>
        <label className="grid gap-2 text-xs font-semibold text-[#8994aa]">Demo RTP<input required min="0" max="100" step="0.01" value={demoRtp} onChange={(event) => setDemoRtp(event.target.value)} type="number" className="admin-input" /></label>
        <label className="grid gap-2 text-xs font-semibold text-[#8994aa]">Thumbnail URL<input value={thumbnail} onChange={(event) => setThumbnail(event.target.value)} type="url" className="admin-input" /></label>
        <label className="grid gap-2 text-xs font-semibold text-[#8994aa]">Status<AdminSelect ariaLabel={`${game.name} status`} onValueChange={(value) => setStatus(value as Game["status"])} options={[{ value: "ACTIVE", label: "ACTIVE" }, { value: "INACTIVE", label: "INACTIVE" }, { value: "MAINTENANCE", label: "MAINTENANCE" }]} value={status} /></label>
        <div><div className="mb-2 text-xs font-semibold text-[#8994aa]">Catalog flags</div><div className="grid gap-2 sm:grid-cols-3">{flagButtons.map(({ label, name, checked, set }) => <button key={name} onClick={() => set(!checked)} className={`flex items-center gap-2 rounded-xl border px-3 py-3 text-xs font-semibold ${checked ? "border-[#245a4c] bg-[#12352e] text-[#83f5c5]" : "border-[#2b3547] text-[#8994aa]"}`} type="button">{checked ? <Check aria-hidden="true" size={14} /> : <span className="grid h-4 w-4 place-items-center rounded border border-current text-[9px]">{name}</span>}{label}</button>)}</div></div>
        <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end"><button className="rounded-xl bg-[#83f5c5] px-4 py-3 text-sm font-bold text-[#09120f]" disabled={saving} type="submit">{saving ? "Saving…" : "Save changes"}</button></div>
      </form>
    </AdminModal>
  </>;
}

export default function GamesPage() { return <AdminShell><GamesContent /></AdminShell>; }
