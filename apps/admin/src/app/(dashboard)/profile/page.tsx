"use client";

import * as React from "react";
import { Heading, Input, Label, Skeleton, toast } from "@agency/ui";
import { authClient } from "@/lib/auth-client";
import { PasswordInput } from "@/components/password-input";

interface Me {
  name: string;
  email: string;
  role: string | null;
}

// My profile: the signed-in admin edits their own name and password here.
export default function ProfilePage() {
  const { data: session, isPending, refetch } = authClient.useSession();
  const user = session?.user as (Me & { role?: string | null }) | undefined;

  const [name, setName] = React.useState("");
  const [savingName, setSavingName] = React.useState(false);
  const [current, setCurrent] = React.useState("");
  const [next, setNext] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [others, setOthers] = React.useState(true);
  const [savingPw, setSavingPw] = React.useState(false);

  React.useEffect(() => {
    if (user?.name) setName(user.name);
  }, [user?.name]);

  async function saveName(e: React.FormEvent) {
    e.preventDefault();
    if (name.trim().length < 2) return toast.error("Enter your name");
    setSavingName(true);
    try {
      const { error } = await authClient.updateUser({ name: name.trim() });
      if (error) return toast.error(error.message ?? "Could not update your name");
      toast.success("Profile updated");
      refetch?.();
    } finally {
      setSavingName(false);
    }
  }

  async function savePassword(e: React.FormEvent) {
    e.preventDefault();
    if (!current) return toast.error("Enter your current password");
    if (next.length < 8) return toast.error("The new password must be at least 8 characters");
    if (next !== confirm) return toast.error("The two new passwords do not match");
    if (next === current) return toast.error("Choose a password you have not used just now");
    setSavingPw(true);
    try {
      const { error } = await authClient.changePassword({ currentPassword: current, newPassword: next, revokeOtherSessions: others });
      if (error) return toast.error(error.message ?? "Could not change the password. Check your current password.");
      toast.success("Password changed");
      setCurrent("");
      setNext("");
      setConfirm("");
    } finally {
      setSavingPw(false);
    }
  }

  const card = "rounded-[10px] border border-neutral-200 bg-neutral-50 p-5 sm:p-6";
  const head = "font-heading text-[1.125rem] font-extrabold tracking-tight text-heading";
  const btn = "inline-flex h-10 items-center rounded-full bg-accent-500 px-5 text-[13px] font-bold text-on-accent transition-opacity hover:opacity-90 disabled:opacity-50";

  return (
    <div>
      <Heading level={2} className="admin-page-title">
        My profile
      </Heading>
      <p className="mt-2 max-w-2xl text-body-sm text-neutral-500">Your own account: change your name and password. Roles and other users are managed under Access.</p>

      {isPending || !user ? (
        <Skeleton className="mt-6 h-64 w-full" />
      ) : (
        <div className="mt-6 grid items-start gap-5 xl:grid-cols-2">
          <section className={card}>
            <h3 className={head}>Profile</h3>
            <div className="mt-4 flex items-center gap-4">
              <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-accent-500 font-heading text-[1.25rem] font-extrabold text-on-accent">{(user.name || user.email).charAt(0).toUpperCase()}</span>
              <div className="min-w-0">
                <p className="truncate font-semibold text-heading">{user.name}</p>
                <p className="truncate text-body-sm text-neutral-500">{user.email}</p>
              </div>
            </div>
            <form onSubmit={saveName} className="mt-5 grid gap-4" noValidate>
              <div>
                <Label htmlFor="profile-name">Full name</Label>
                <Input id="profile-name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
              </div>
              <div>
                <Label htmlFor="profile-email">Email</Label>
                <Input id="profile-email" value={user.email} disabled readOnly />
                <p className="mt-1.5 text-label text-neutral-500">The email is your sign-in name. Ask a super admin if it needs to change.</p>
              </div>
              <div>
                <button type="submit" disabled={savingName || name.trim() === user.name} className={btn}>
                  {savingName ? "Saving…" : "Save profile"}
                </button>
              </div>
            </form>
          </section>

          <section className={card}>
            <h3 className={head}>Change password</h3>
            <form onSubmit={savePassword} className="mt-4 grid gap-4" noValidate>
              <div>
                <Label htmlFor="current-password">Current password</Label>
                <PasswordInput id="current-password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="new-password">New password</Label>
                  <PasswordInput id="new-password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="confirm-password">Confirm new password</Label>
                  <PasswordInput id="confirm-password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
                </div>
              </div>
              <p className="-mt-1 text-label text-neutral-500">At least 8 characters.</p>
              <label className="flex items-start gap-3 text-body-sm text-neutral-500">
                <input type="checkbox" checked={others} onChange={(e) => setOthers(e.target.checked)} className="mt-1 size-4 accent-[var(--accent)]" />
                <span>Sign me out of my other devices after changing the password.</span>
              </label>
              <div>
                <button type="submit" disabled={savingPw} className={btn}>
                  {savingPw ? "Saving…" : "Change password"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
