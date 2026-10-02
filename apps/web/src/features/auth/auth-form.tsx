"use client";

import { Eye, EyeOff, LoaderCircle, LockKeyhole, Mail, UserRound } from "lucide-react";
import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

type AuthMode = "login" | "register";
type AuthFormProps = { mode: AuthMode };
type ApiErrorPayload = { error?: { message?: string } };

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const isRegister = mode === "register";
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);

    if (isRegister && !/^[a-zA-Z0-9_]{3,24}$/.test(username)) {
      setErrorMessage("Use 3–24 letters, numbers, or underscores for your username.");
      return;
    }
    if (isRegister && password.length < 12) {
      setErrorMessage("Your password needs at least 12 characters.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/v1/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isRegister ? { email, username, password } : { email, password }),
      });
      const payload = (await response.json()) as ApiErrorPayload;
      if (!response.ok) {
        setErrorMessage(payload.error?.message ?? "We could not complete that request.");
        return;
      }
      router.push("/");
      router.refresh();
    } catch {
      setErrorMessage("The service is unavailable right now. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="page-shell grid min-h-[calc(100vh-72px)] items-center gap-10 py-10 lg:grid-cols-[0.95fr_1.05fr] lg:py-16">
      <div className="relative hidden overflow-hidden rounded-[30px] border border-border bg-surface p-8 lg:block lg:min-h-[590px]">
        <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(circle_at_78%_16%,color-mix(in_srgb,var(--accent)_22%,transparent),transparent_26%),radial-gradient(circle_at_10%_90%,color-mix(in_srgb,var(--primary)_13%,transparent),transparent_28%)]" />
        <div aria-hidden="true" className="hero-mesh absolute inset-0 opacity-60" />
        <div className="relative flex h-full flex-col justify-between">
          <div><p className="eyebrow">The Veltrix signal</p><h1 className="display mt-5 max-w-md text-6xl leading-[0.95] text-ink">A calmer way into the lobby.</h1><p className="mt-5 max-w-sm text-sm leading-7 text-muted">Create a demo account, keep your place, and explore an original world built entirely around fictional credits.</p></div>
          <div className="grid grid-cols-2 gap-3"><div className="surface-subtle rounded-2xl p-4"><p className="text-[10px] uppercase tracking-[0.14em] text-foreground-muted">Built for</p><p className="mt-3 text-sm font-semibold text-foreground">Curiosity</p></div><div className="surface-subtle rounded-2xl p-4"><p className="text-[10px] uppercase tracking-[0.14em] text-foreground-muted">Currency</p><p className="mt-3 text-sm font-semibold text-foreground">Virtual only</p></div></div>
        </div>
      </div>

      <section className="mx-auto w-full max-w-md">
        <div className="mb-8 lg:hidden"><p className="eyebrow">The Veltrix signal</p><h1 className="display mt-3 text-5xl leading-none text-ink">{isRegister ? "Make it yours." : "Welcome back."}</h1></div>
        <div className="surface rounded-[28px] p-6 sm:p-8">
          <div className="mb-7"><p className="eyebrow">{isRegister ? "Start a new session" : "Return to the lobby"}</p><h2 className="display mt-3 text-4xl text-ink">{isRegister ? "Create account" : "Log in"}</h2><p className="mt-3 text-sm leading-6 text-muted">{isRegister ? "Your account is for the demo world only." : "Continue exploring your fictional game collection."}</p></div>
          <form className="grid gap-4" onSubmit={submit}>
            {isRegister ? <label className="block"><span className="mb-2 block text-xs font-semibold text-foreground-subtle">Username</span><span className="relative block"><UserRound aria-hidden="true" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-foreground-muted" size={16} /><input autoComplete="username" className="focus-ring h-12 w-full rounded-xl border border-border bg-surface-hover/40 pl-10 pr-3 text-sm text-foreground outline-none placeholder:text-foreground-muted/60 hover:border-border-strong focus:border-primary/50" onChange={(event) => setUsername(event.target.value)} placeholder="orbit_player" required value={username} /></span></label> : null}
            <label className="block"><span className="mb-2 block text-xs font-semibold text-foreground-subtle">Email</span><span className="relative block"><Mail aria-hidden="true" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-foreground-muted" size={16} /><input autoComplete="email" className="focus-ring h-12 w-full rounded-xl border border-border bg-surface-hover/40 pl-10 pr-3 text-sm text-foreground outline-none placeholder:text-foreground-muted/60 hover:border-border-strong focus:border-primary/50" onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" required type="email" value={email} /></span></label>
            <label className="block"><span className="mb-2 block text-xs font-semibold text-foreground-subtle">Password</span><span className="relative block"><LockKeyhole aria-hidden="true" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-foreground-muted" size={16} /><input autoComplete={isRegister ? "new-password" : "current-password"} className="focus-ring h-12 w-full rounded-xl border border-border bg-surface-hover/40 px-10 text-sm text-foreground outline-none placeholder:text-foreground-muted/60 hover:border-border-strong focus:border-primary/50" minLength={isRegister ? 12 : 1} onChange={(event) => setPassword(event.target.value)} placeholder={isRegister ? "12+ characters" : "Your password"} required type={showPassword ? "text" : "password"} value={password} /><button aria-label={showPassword ? "Hide password" : "Show password"} className="focus-ring absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-foreground-muted hover:bg-surface-hover hover:text-foreground" onClick={() => setShowPassword((value) => !value)} type="button">{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button></span></label>
            {errorMessage ? <p aria-live="polite" className="rounded-xl border border-danger/25 bg-danger/10 px-3 py-2.5 text-xs font-semibold leading-5 text-danger">{errorMessage}</p> : null}
            <Button className="mt-2 w-full" disabled={isSubmitting} size="lg" type="submit">{isSubmitting ? <><LoaderCircle className="animate-spin" size={16} /> Working…</> : isRegister ? "Create demo account" : "Log in"}</Button>
          </form>
          <p className="mt-6 text-center text-xs text-muted">{isRegister ? "Already have an account?" : "New to Veltrix?"} <Link className="focus-ring rounded-sm font-semibold text-amber-bright hover:text-ink" href={isRegister ? "/login" : "/register"}>{isRegister ? "Log in" : "Create account"}</Link></p>
        </div>
        <p className="mt-5 text-center text-[11px] leading-5 text-muted/70">Veltrix is a portfolio demonstration. No deposits, withdrawals, or real-money wagering.</p>
      </section>
    </main>
  );
}
