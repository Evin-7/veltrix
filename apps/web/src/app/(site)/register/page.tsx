import type { Metadata } from "next";
import { AuthForm } from "@/features/auth/auth-form";
import { sanitizeNextPath } from "@/server/auth/redirect";

export const metadata: Metadata = { title: "Create account" };

type RegisterPageProps = { searchParams?: Promise<{ next?: string | string[] }> };

export default async function RegisterPage({ searchParams }: RegisterPageProps) {
  const params = await searchParams;
  const next = sanitizeNextPath(typeof params?.next === "string" ? params.next : undefined);
  return <AuthForm mode="register" next={next} />;
}
