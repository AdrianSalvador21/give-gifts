"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { signOut } from "@/app/actions/session";
import { t } from "@/lib/i18n";

export function SignOutButton() {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        start(async () => {
          await signOut();
          router.refresh();
        })
      }
      className="text-[15px] font-medium underline underline-offset-4 disabled:opacity-50"
    >
      {t("auth.signOut")}
    </button>
  );
}
