"use client";

import { Eye, EyeOff, LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type ChangeEvent, type FormEvent, type MouseEvent, type ReactNode, useEffect, useState } from "react";
import { useToast } from "@/components/ui/toast";
import { requestJson } from "@/lib/api-client";
import { errorMessage } from "@/lib/app-error";
import { beginRouteTransition } from "@/lib/route-transition";
import { AuthExperience } from "./auth-experience";

type AuthMode = "login" | "register";
type AuthFormProps = { mode: AuthMode; next?: string; googleError?: string };
type FieldName = "email" | "username" | "password" | "confirmPassword";
type FieldError = { field: FieldName; message: string } | null;

function strengthFor(password: string) {
  if (!password) return { label: "", width: "0%" };
  if (password.length >= 16) return { label: "Strong", width: "100%" };
  if (password.length >= 12) return { label: "Good", width: "70%" };
  return { label: "Needs 12+", width: "35%" };
}

export function AuthForm({ mode, next = "/", googleError }: AuthFormProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const isRegister = mode === "register";
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldError, setFieldError] = useState<FieldError>(null);

  useEffect(() => {
    if (googleError) showToast(googleError, "error");
  }, [googleError, showToast]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFieldError(null);

    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setFieldError({ field: "email", message: "Enter a valid email address." });
      return;
    }
    if (isRegister && !/^[a-zA-Z0-9_]{3,24}$/.test(username)) {
      setFieldError({ field: "username", message: "Use 3–24 letters, numbers, or underscores." });
      return;
    }
    if (isRegister && password.length < 12) {
      setFieldError({ field: "password", message: "Use at least 12 characters." });
      return;
    }
    if (isRegister && password !== confirmPassword) {
      setFieldError({ field: "confirmPassword", message: "Passwords do not match." });
      return;
    }

    setIsSubmitting(true);
    try {
      await requestJson(`/api/v1/auth/${mode}`, {
        method: "POST",
        body: JSON.stringify(isRegister ? { email, username, password } : { email, password }),
      });
      showToast(isRegister ? "Welcome to Veltrix · Your account is ready." : "Welcome back to Veltrix.", "success");
      beginRouteTransition(next);
      router.push(next);
      router.refresh();
    } catch (error) {
      showToast(`${isRegister ? "Couldn’t create account" : "Couldn’t log in"} · ${errorMessage(error, "BAD_REQUEST")}`, "error");
    } finally {
      setIsSubmitting(false);
    }
  }

  const strength = strengthFor(password);
  const title = isRegister ? "Enter the atmosphere." : "Return to the table.";
  const eyebrow = isRegister ? "Welcome to Veltrix" : "Welcome back";
  const supportingCopy = isRegister ? "Create your account and step into the lobby." : "Your games, rewards and balance are waiting.";
  const switchPath = isRegister ? "/login" : "/register";
  const switchHref = next === "/" ? switchPath : `${switchPath}?next=${encodeURIComponent(next)}`;
  const googleHref = next === "/" ? "/api/v1/auth/google" : `/api/v1/auth/google?next=${encodeURIComponent(next)}`;
  const [isGoogleConnecting, setIsGoogleConnecting] = useState(false);

  function connectGoogle(event: MouseEvent<HTMLAnchorElement>) {
    if (isGoogleConnecting) {
      event.preventDefault();
      return;
    }
    setIsGoogleConnecting(true);
  }

  return <AuthExperience mode={mode}>
    <div className="auth-form-shell">
      <div className="auth-form-heading"><p className="eyebrow">{eyebrow}</p><h1 className="display">{title}</h1><p>{supportingCopy}</p>{googleError ? <p className="auth-provider-error" role="alert">{googleError}</p> : null}</div>
      <form className="auth-form" noValidate onSubmit={submit}>
        {isRegister ? <AuthField autoComplete="username" error={fieldError?.field === "username" ? fieldError.message : null} id="username" label="Username" onChange={(event) => setUsername(event.target.value)} required value={username} /> : null}
        <AuthField autoComplete="email" error={fieldError?.field === "email" ? fieldError.message : null} id="email" label="Email" onChange={(event) => setEmail(event.target.value)} required type="email" value={email} />
        <AuthField autoComplete={isRegister ? "new-password" : "current-password"} error={fieldError?.field === "password" ? fieldError.message : null} id="password" label="Password" minLength={isRegister ? 12 : 1} onChange={(event) => setPassword(event.target.value)} required type={showPassword ? "text" : "password"} value={password} trailing={<button aria-label={showPassword ? "Hide password" : "Show password"} className="auth-password-toggle focus-ring" onClick={() => setShowPassword((value) => !value)} type="button">{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button>} />
        {isRegister ? <>
          <div aria-hidden="true" className="auth-strength"><div className="auth-strength-line"><span style={{ width: strength.width }} /></div><span>{strength.label ? `Password strength · ${strength.label}` : "Password strength"}</span></div>
          <AuthField autoComplete="new-password" error={fieldError?.field === "confirmPassword" ? fieldError.message : null} id="confirm-password" label="Confirm password" onChange={(event) => setConfirmPassword(event.target.value)} required type={showConfirmPassword ? "text" : "password"} value={confirmPassword} trailing={<button aria-label={showConfirmPassword ? "Hide confirmation password" : "Show confirmation password"} className="auth-password-toggle focus-ring" onClick={() => setShowConfirmPassword((value) => !value)} type="button">{showConfirmPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button>} />
        </> : null}
        <button className="auth-submit-button focus-ring" disabled={isSubmitting} type="submit">{isSubmitting ? <><LoaderCircle className="animate-spin" size={17} /> {isRegister ? "Creating account…" : "Logging in…"}</> : isRegister ? "Create account" : "Log in"}</button>
      </form>
      <div className="auth-provider-divider"><span /> <span>or continue with</span> <span /></div>
      <a aria-disabled={isGoogleConnecting} className="auth-google-button focus-ring" href={googleHref} onClick={connectGoogle}><GoogleMark /> <span>{isGoogleConnecting ? "Connecting…" : "Continue with Google"}</span></a>
      <p className="auth-switch">{isRegister ? "Already have an account?" : "New to Veltrix?"} <Link className="focus-ring" href={switchHref}>{isRegister ? "Log in" : "Create account"}</Link></p>
      <div className="auth-form-rule"><span /> <span /></div>
    </div>
  </AuthExperience>;
}

function GoogleMark() {
  return <svg aria-hidden="true" className="auth-google-mark" viewBox="0 0 24 24"><path d="M21.35 12.27c0-.74-.07-1.45-.22-2.13H12v4.03h5.23a4.47 4.47 0 0 1-1.94 2.94v2.45h3.15c1.85-1.7 2.91-4.2 2.91-7.29Z" fill="#4285F4" /><path d="M12 21.5c2.65 0 4.88-.88 6.51-2.39l-3.15-2.45c-.88.59-2 .94-3.36.94-2.57 0-4.75-1.74-5.53-4.08H3.22v2.53A9.83 9.83 0 0 0 12 21.5Z" fill="#34A853" /><path d="M6.47 13.52a5.9 5.9 0 0 1 0-3.04V7.95H3.22a9.5 9.5 0 0 0 0 8.1l3.25-2.53Z" fill="#FBBC05" /><path d="M12 6.4c1.45 0 2.75.5 3.77 1.48l2.82-2.82C16.87 3.47 14.65 2.5 12 2.5a9.83 9.83 0 0 0-8.78 5.45l3.25 2.53C7.25 8.14 9.43 6.4 12 6.4Z" fill="#EA4335" /></svg>;
}

type AuthFieldProps = { autoComplete: string; error: string | null; id: string; label: string; minLength?: number; onChange: (event: ChangeEvent<HTMLInputElement>) => void; required?: boolean; trailing?: ReactNode; type?: string; value: string };

function AuthField({ autoComplete, error, id, label, minLength, onChange, required = false, trailing, type = "text", value }: AuthFieldProps) {
  const describedBy = error ? `${id}-error` : undefined;
  return <div className="auth-field-group"><label className="auth-field"><input aria-describedby={describedBy} aria-invalid={Boolean(error)} autoComplete={autoComplete} id={id} minLength={minLength} name={id} onChange={onChange} required={required} type={type} value={value} /><span className="auth-field-label">{label}</span>{trailing}</label>{error ? <p className="auth-field-error" id={describedBy} role="alert">{error}</p> : null}</div>;
}
