"use client";

import Link from "next/link";
import {
  Bell,
  Building2,
  Check,
  ChevronRight,
  Grid3X3,
  Mail,
  Moon,
  ReceiptText,
  ShieldCheck,
  UserRoundCog,
  UsersRound,
} from "lucide-react";
import { systemUsers } from "@/services/dashboardService";

function PageHeader({ title, description, actionLabel, actionIcon: ActionIcon = Check, onAction }) {
  return (
    <section className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-[-0.01em] text-[#191c1e]">{title}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#45474c]">{description}</p>
      </div>
      {actionLabel && (
        <button
          type="button"
          onClick={onAction}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-[#091426] px-5 text-sm font-bold text-white hover:bg-[#16253a]"
        >
          <ActionIcon className="h-4 w-4" />
          {actionLabel}
        </button>
      )}
    </section>
  );
}

function Card({ children, className = "" }) {
  return (
    <section className={`rounded-xl border border-[#e2e8f0] bg-white shadow-[0_1px_2px_rgba(9,20,38,0.06)] ${className}`}>
      {children}
    </section>
  );
}

function SettingsGroup({ title, children }) {
  return (
    <section>
      <h2 className="mb-3 px-1 text-xs font-bold uppercase tracking-[0.08em] text-[#45474c]">{title}</h2>
      <Card className="overflow-hidden">{children}</Card>
    </section>
  );
}

function SettingRow({ icon: Icon, title, description, toggle = false, off = false, action, href }) {
  const actionContent = (
    <>
      {action || "Open"}
      <ChevronRight className="h-4 w-4" />
    </>
  );

  return (
    <div className="flex items-center justify-between gap-4 border-b border-[#e2e8f0] p-5 last:border-b-0">
      <div className="flex items-center gap-4">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#f2f4f6] text-[#505f76]">
          <Icon className="h-5 w-5" />
        </span>
        <span>
          <span className="block text-sm font-bold text-[#091426]">{title}</span>
          <span className="block text-sm text-[#6b7280]">{description}</span>
        </span>
      </div>
      {toggle ? (
        <span className={`relative h-6 w-11 rounded-full ${off ? "bg-slate-300" : "bg-[#091426]"}`}>
          <span className={`absolute top-1 h-4 w-4 rounded-full bg-white transition ${off ? "left-1" : "left-6"}`} />
        </span>
      ) : href ? (
        <Link
          href={href}
          aria-label={`${action || "Open"} ${title}`}
          className="inline-flex shrink-0 items-center gap-2 rounded-md px-2 py-1 text-sm font-bold text-[#505f76] transition-colors hover:bg-[#f2f4f6] hover:text-[#091426] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#091426]/20"
        >
          {actionContent}
        </Link>
      ) : (
        <span className="inline-flex items-center gap-2 text-sm font-bold text-[#505f76]">
          {actionContent}
        </span>
      )}
    </div>
  );
}

export default function SettingsPage() {
  return (
    <>
      <PageHeader title="Settings" description="Manage your account and application preferences" />
      <Card className="overflow-hidden">
        <div className="bg-[#091426] p-8 text-white">
          <div className="flex items-center gap-6">
            <span className="flex h-20 w-20 items-center justify-center rounded-full bg-white/15 text-2xl font-bold">A</span>
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-bold">Admin User</h2>
                <span className="rounded-full border border-emerald-300/40 bg-emerald-300/10 px-3 py-1 text-xs font-bold text-emerald-200">
                  Owner
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-300">admin@dormmanager.vn</p>
            </div>
          </div>
        </div>
        <SettingRow
          icon={UserRoundCog}
          title="Personal Information"
          description="Update name, phone and email."
          href="/dashboard/profile"
        />
        <SettingRow
          icon={ShieldCheck}
          title="Security & Password"
          description="Manage your password and login security."
          href="/dashboard/settings/security"
        />
      </Card>
      <section className="grid gap-6 xl:grid-cols-2">
        <SettingsGroup title="PROPERTY SETTINGS">
          <SettingRow icon={Building2} title="Property Profile" description="Address, branding and operating contacts." />
          <SettingRow icon={UsersRound} title="Tenant Portal" description="Configure tenant self-service permissions." />
          <SettingRow icon={ReceiptText} title="Billing Rules" description="Late fees, billing cycle and invoice template." />
        </SettingsGroup>
        <SettingsGroup title="USER & ROLE MANAGEMENT">
          <div className="grid gap-3 p-5">
            {systemUsers.map((user) => (
              <div key={user.id} className="flex items-center justify-between gap-4 rounded-lg border border-[#e2e8f0] p-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#d3e4fe] text-xs font-bold text-[#091426]">
                    {user.name.slice(0, 1)}
                  </span>
                  <span>
                    <span className="block text-sm font-bold text-[#091426]">{user.name}</span>
                    <span className="block text-xs text-[#6b7280]">{user.role}</span>
                  </span>
                </div>
                <span className="text-xs font-bold text-[#505f76]">{user.status}</span>
              </div>
            ))}
          </div>
        </SettingsGroup>
        <SettingsGroup title="NOTIFICATIONS">
          <SettingRow icon={Bell} title="Push Notifications" description="New deposit and maintenance alerts." toggle />
          <SettingRow icon={Mail} title="Email Summary" description="Daily financial and occupancy digest." toggle />
        </SettingsGroup>
        <SettingsGroup title="APPEARANCE">
          <SettingRow icon={Moon} title="Dark Mode" description="Use dark theme for management screens." toggle off />
          <SettingRow icon={Grid3X3} title="Density" description="Compact table display." action="Compact" />
        </SettingsGroup>
      </section>
    </>
  );
}
