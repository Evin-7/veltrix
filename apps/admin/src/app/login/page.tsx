"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { apiFetch, ApiError, jsonBody } from "@/lib/api";
import { AdminVeltrixLogo } from "@/components/veltrix-logo";

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

  return (
    <main className="grid min-h-screen place-items-center px-5 py-10">
      <div className="w-full max-w-[380px]">
        <div className="mb-8 text-center">
          <AdminVeltrixLogo className="mx-auto mb-5 w-[190px]" priority />
          <div className="text-xs font-bold uppercase tracking-[0.28em] text-[#83f5c5]">
            Veltrix Control Room
          </div>
        </div>
        <form
          className="rounded-3xl border border-[#252d3d] bg-[#11151f] p-6 shadow-2xl shadow-black/20"
          onSubmit={submit}
        >
          <label className="block text-xs font-semibold text-[#b3bdd0]">
            Email
            <input
              autoComplete="username"
              className="mt-2 w-full rounded-xl border border-[#2b3547] bg-[#0c1018] px-4 py-3 text-sm text-white outline-none transition focus:border-[#83f5c5]"
              onChange={(event) => setEmail(event.target.value)}
              required
              type="email"
              value={email}
            />
          </label>
          <label className="mt-5 block text-xs font-semibold text-[#b3bdd0]">
            Password
            <input
              autoComplete="current-password"
              className="mt-2 w-full rounded-xl border border-[#2b3547] bg-[#0c1018] px-4 py-3 text-sm text-white outline-none transition focus:border-[#83f5c5]"
              onChange={(event) => setPassword(event.target.value)}
              required
              type="password"
              value={password}
            />
          </label>
          {error ? (
            <div
              aria-live="polite"
              className="mt-4 rounded-xl border border-[#643443] bg-[#321b26] px-4 py-3 text-xs text-[#ffadbd]"
            >
              {error}
            </div>
          ) : null}
          <button
            className="mt-6 flex w-full items-center justify-center rounded-xl bg-[#83f5c5] px-4 py-3.5 text-sm font-bold text-[#09120f] transition hover:bg-[#a5fbd8] disabled:cursor-wait disabled:opacity-60"
            disabled={busy}
            type="submit"
          >
            {busy ? "Logging in…" : "Login"}
          </button>
        </form>
        <div className="mt-6 flex items-center justify-center gap-2 text-[11px] text-[#637089]">
          <ShieldCheck className="text-[#83f5c5]" size={14} /> Session protected by Veltrix auth
        </div>
      </div>
    </main>
  );
}
