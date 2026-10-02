"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { LockKeyhole, ShieldCheck } from "lucide-react";
import { apiFetch, ApiError, jsonBody } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try { await apiFetch("/api/v1/admin/auth/login", { method: "POST", body: jsonBody({ email, password }) }); router.replace("/"); }
    catch (reason) { setError(reason instanceof ApiError ? reason.message : "Unable to sign in."); }
    finally { setBusy(false); }
  }

  return <main className="grid min-h-screen place-items-center px-5 py-10"><div className="w-full max-w-[440px]"><div className="mb-10 text-center"><div className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-2xl bg-[#83f5c5] text-2xl font-black text-[#09120f] shadow-[0_0_60px_rgba(131,245,197,.2)]">V</div><div className="text-xs font-bold uppercase tracking-[0.28em] text-[#83f5c5]">Veltrix Control Room</div><h1 className="mt-4 text-3xl font-semibold tracking-[-0.03em] text-white">Secure operations access</h1><p className="mt-3 text-sm leading-6 text-[#8994aa]">Sign in with an administrator account to manage the platform.</p></div><form onSubmit={submit} className="rounded-3xl border border-[#252d3d] bg-[#11151f] p-7 shadow-2xl shadow-black/20"><label className="block text-xs font-semibold text-[#b3bdd0]">Email<input autoComplete="username" required type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2 w-full rounded-xl border border-[#2b3547] bg-[#0c1018] px-4 py-3 text-sm text-white outline-none transition focus:border-[#83f5c5]" /></label><label className="mt-5 block text-xs font-semibold text-[#b3bdd0]">Password<input autoComplete="current-password" required type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 w-full rounded-xl border border-[#2b3547] bg-[#0c1018] px-4 py-3 text-sm text-white outline-none transition focus:border-[#83f5c5]" /></label>{error && <div aria-live="polite" className="mt-4 rounded-xl border border-[#643443] bg-[#321b26] px-4 py-3 text-xs text-[#ffadbd]">{error}</div>}<button disabled={busy} className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-[#83f5c5] px-4 py-3.5 text-sm font-bold text-[#09120f] transition hover:bg-[#a5fbd8] disabled:cursor-wait disabled:opacity-60"><LockKeyhole size={16} />{busy ? "Verifying…" : "Enter control room"}</button></form><div className="mt-6 flex items-center justify-center gap-2 text-[11px] text-[#637089]"><ShieldCheck size={14} className="text-[#83f5c5]" /> Session protected by Veltrix auth</div></div></main>;
}
