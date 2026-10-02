"use client";

import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import {
  AdminButton,
  AdminField,
  AdminInput,
  useAdminFormValidation,
} from "@/components/admin-form";
import { AdminVeltrixLogo } from "@/components/veltrix-logo";
import { apiFetch, jsonBody } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const { errors, validate, setErrors } = useAdminFormValidation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!validate(event.currentTarget)) return;
    setBusy(true);
    try {
      await apiFetch("/api/v1/admin/auth/login", {
        method: "POST",
        body: jsonBody({ email, password }),
      });
      router.replace("/");
    } catch {
      // apiFetch surfaces operation errors through the shared admin toast.
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center px-5 py-10">
      <div className="w-full max-w-[24rem]">
        <div className="mb-8 text-center">
          <AdminVeltrixLogo className="mx-auto mb-5 w-[190px]" priority />
          <div className="text-xs font-bold uppercase tracking-[0.28em] text-[#83f5c5]">
            Veltrix Admin
          </div>
        </div>
        <form
          className="admin-login-card grid gap-5 rounded-3xl border p-6"
          noValidate
          onSubmit={submit}
        >
          <AdminField error={errors.email} label="Email" name="email">
            <AdminInput
              autoComplete="username"
              name="email"
              onChange={(event) => {
                setEmail(event.target.value);
                setErrors((current) => ({ ...current, email: "" }));
              }}
              required
              type="email"
              value={email}
            />
          </AdminField>
          <AdminField error={errors.password} label="Password" name="password">
            <AdminInput
              autoComplete="current-password"
              name="password"
              onChange={(event) => {
                setPassword(event.target.value);
                setErrors((current) => ({ ...current, password: "" }));
              }}
              required
              type="password"
              value={password}
            />
          </AdminField>
          <AdminButton
            className="mt-1 w-full"
            loading={busy}
            loadingText="Logging in…"
            type="submit"
          >
            Login
          </AdminButton>
        </form>
        <div className="mt-6 flex items-center justify-center gap-2 text-[11px] text-[#637089]">
          <ShieldCheck
            aria-hidden="true"
            className="text-[#83f5c5]"
            size={14}
          />{" "}
          Session protected by Veltrix auth
        </div>
      </div>
    </main>
  );
}
