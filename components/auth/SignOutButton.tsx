"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { signOut } from "@/app/actions/session";
import { TextButton } from "@/components/ui/DotButton";
import { t } from "@/lib/i18n";

export function SignOutButton() {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <TextButton
      disabled={pending}
      aria-busy={pending || undefined}
      onClick={() =>
        start(async () => {
          await signOut();
          router.refresh();
        })
      }
      className="-mx-3 text-[15px] underline underline-offset-4"
    >
      {pending ? t("common.loading") : t("auth.signOut")}
    </TextButton>
  );
}
