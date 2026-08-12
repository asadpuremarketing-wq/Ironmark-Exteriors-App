import { auth } from "@/auth";
import ChangePasswordForm from "@/components/ChangePasswordForm";
import BusinessSettingsForm from "@/components/settings/BusinessSettingsForm";
import { getBusinessSettings, serializeBusinessSettings } from "@/lib/settings";

export default async function SettingsPage() {
  const session = await auth();
  const user = session?.user;
  const canEditBusiness = user?.role === "OWNER" || user?.role === "ADMIN";

  const businessSettingsRaw = await getBusinessSettings();
  const businessSettings = serializeBusinessSettings(businessSettingsRaw);

  return (
    <div>
      <h1 className="text-2xl font-extrabold tracking-tight text-ink-900">Settings</h1>
      <p className="mt-1 text-sm text-ink-900/60">Manage your account.</p>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-ink-900/10 bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-base font-bold text-ink-900">Profile</h2>
          <dl className="flex flex-col gap-4">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-ink-900/40">
                Name
              </dt>
              <dd className="mt-0.5 text-sm text-ink-900">{user?.name}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-ink-900/40">
                Email
              </dt>
              <dd className="mt-0.5 text-sm text-ink-900">{user?.email}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-ink-900/40">
                Role
              </dt>
              <dd className="mt-0.5">
                <span className="inline-flex rounded-full bg-brand-electric/10 px-3 py-1 text-xs font-bold text-brand-electric">
                  {user?.role}
                </span>
              </dd>
            </div>
          </dl>
        </div>

        <div className="rounded-2xl border border-ink-900/10 bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-base font-bold text-ink-900">Change Password</h2>
          <ChangePasswordForm />
        </div>

        <div className="rounded-2xl border border-ink-900/10 bg-white p-6 shadow-sm lg:col-span-2">
          <h2 className="mb-1 text-base font-bold text-ink-900">Business Settings</h2>
          <p className="mb-5 text-sm text-ink-900/60">
            {canEditBusiness
              ? "Used on invoices and other business documents."
              : "Used on invoices and other business documents. Only Owner/Admin can edit these."}
          </p>
          <BusinessSettingsForm settings={businessSettings} readOnly={!canEditBusiness} />
        </div>
      </div>
    </div>
  );
}
