import { AdminShell, PageIntro, Panel } from "@/components/admin-shell";

export default function SettingsPage() {
  return (
    <AdminShell>
      <PageIntro
        eyebrow="Platform configuration"
        title="Settings"
        description="Environment and security configuration stays server-owned. This view is intentionally read-only until a dedicated settings policy exists."
      />
      <Panel className="p-10 text-center">
        <div className="text-sm font-semibold text-[var(--admin-text-strong)]">
          Settings controls are scoped for a later phase.
        </div>
        <p className="mt-2 text-xs text-[var(--admin-muted)]">
          No secrets or deployment values are exposed in the admin UI.
        </p>
      </Panel>
    </AdminShell>
  );
}
