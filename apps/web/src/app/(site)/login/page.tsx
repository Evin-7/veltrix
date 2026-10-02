import type { Metadata } from "next";
import { AuthForm } from "@/features/auth/auth-form";
import { sanitizeNextPath } from "@/server/auth/redirect";

export const metadata: Metadata = { title: "Log in" };

const googleErrorMessages: Record<string, string> = {
  google_config: "Google sign-in is not configured yet.",
  google_denied: "Google sign-in was cancelled.",
  google_state: "That Google sign-in session expired. Please try again.",
  google_code: "Google did not return a sign-in code. Please try again.",
  google_identity: "Google could not verify this account.",
  google_disabled: "This Veltrix account is currently disabled.",
  google_link: "This Google account cannot be linked on the player sign-in page.",
  google_error: "Google sign-in could not be completed. Please try again.",
};

type LoginPageProps = { searchParams?: Promise<{ next?: string | string[]; error?: string | string[] }> };

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const next = sanitizeNextPath(typeof params?.next === "string" ? params.next : undefined);
  const error = typeof params?.error === "string" ? googleErrorMessages[params.error] : undefined;
  return <AuthForm mode="login" next={next} googleError={error} />;
}
