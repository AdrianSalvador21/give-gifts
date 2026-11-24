import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { wishMeta, WishThumb } from "@/components/participant/WishDisplay";
import { DotButton } from "@/components/ui/DotButton";
import { CheckIcon } from "@/components/ui/icons";
import { BrandBar } from "@/components/ui/BrandBar";
import { Pill, Screen, TopBar } from "@/components/ui/primitives";
import { UnreadBadge } from "@/components/ui/UnreadBadge";
import { requireParticipant } from "@/lib/data/access";
import { getWishes } from "@/lib/data/exchanges";
import { getMyAssignment, getUnread } from "@/lib/data/gifts";
import { formatMoney } from "@/lib/format";
import { t } from "@/lib/i18n";
import { BoughtButton, PlanButton } from "./GiftActions";

export const metadata: Metadata = { title: "Tu persona", robots: { index: false } };

async function Person({ params }: { params: Promise<{ inviteCode: string; token: string }> }) {
  const { exchange, me, inviteCode, token, base } = await requireParticipant(params);
  if (exchange.status !== "drawn") redirect(base);
  // Sin abrir el sobre no se muestra el nombre: primero el ritual del sobre.
  if (!me.revealed) redirect(`${base}/sobre`);
  const mine = await getMyAssignment(exchange.id, me.id);
  if (!mine) redirect(base);
  const { assignment, receiver } = mine;
  const [wishes, unread] = await Promise.all([
    getWishes(exchange.id, receiver.id, true),
    exchange.rules.mailboxEnabled ? getUnread(exchange.id, me.id, true) : { giver: 0, receiver: 0 },
  ]);

  return (
    <>
      <BrandBar className="pt-2" />
      <TopBar backHref={base} title={t("person.title")} />
      <div className="mt-4 flex items-end justify-between gap-3 rounded-[24px] bg-pasto px-[22px] py-5">
        <div className="flex min-w-0 flex-col gap-1">
          <span className="text-sm font-medium">{t("person.givesTo")}</span>
          <span className="text-[44px] leading-[0.95] font-medium tracking-[-0.05em] break-words">{receiver.name}</span>
        </div>
        <span className="shrink-0 text-sm font-medium">{t("person.budget", { budget: formatMoney(exchange.budget.amount) })}</span>
      </div>

      <div className="mt-5 flex items-baseline justify-between">
        <h1 className="text-2xl font-medium tracking-[-0.03em]">{t("person.list")}</h1>
        <span className="text-sm text-gris">{wishes.length === 1 ? t("person.countOne") : t("person.count", { n: wishes.length })}</span>
      </div>

      {wishes.length === 0 ? (
        <div className="mt-3 flex flex-col items-center rounded-tarjeta bg-white p-5 text-center">
          <Image src="/illustrations/web/10-lista-vacia.webp" width={783} height={582} alt="" className="h-[120px] w-auto" />
          <p className="mt-2 text-base font-medium">{t("person.empty")}</p>
          <p className="mt-1 text-sm text-gris">{t("person.emptyText")}</p>
        </div>
      ) : (
        <>
          <p className="mt-1 text-[13px] text-gris">{t("person.planHint")}</p>
          <ul className="mt-2.5 flex flex-col gap-2.5">
            {wishes.map((w, i) => {
              const planned = assignment.plannedWishId === w.id;
              return (
                <li key={w.id} className={`flex flex-col gap-2.5 rounded-[18px] border-2 bg-white p-3 ${planned ? "border-pasto" : "border-transparent"}`}>
                  <div className="flex items-center gap-3">
                    <WishThumb wish={w} index={i} />
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="text-[15px] leading-snug font-medium">{w.title}</span>
                      <span className="text-[13px] text-gris">
                        {wishMeta(w)}
                        {w.note ? ` · «${w.note}»` : ""}
                      </span>
                      {w.favorite && <Pill className="mt-1 self-start bg-pasto px-2.5 py-0.5 text-xs">{t("person.favorite")}</Pill>}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 pl-[72px]">
                    <PlanButton inviteCode={inviteCode} token={token} wishId={w.id} planned={planned} />
                    {w.url && (
                      <a href={w.url} target="_blank" rel="noopener noreferrer nofollow" className="text-[13px] font-medium underline underline-offset-4">
                        {t("person.open", { store: w.store ?? "la tienda" })}
                      </a>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}

      <div className="mt-auto flex flex-col gap-2.5 pt-6">
        {exchange.rules.mailboxEnabled && (
          <DotButton href={`${base}/buzon`} variant="tinta" full>
            <span>
              {t("person.ask")}
              <UnreadBadge n={unread.giver + unread.receiver} />
            </span>
          </DotButton>
        )}
        {me.bought ? (
          <Link href={`${base}/compre`} className="flex h-[60px] items-center justify-center gap-2 rounded-boton bg-pasto text-lg font-medium">
            <CheckIcon size={18} />
            {t("person.boughtDone")}
          </Link>
        ) : (
          <BoughtButton inviteCode={inviteCode} token={token} />
        )}
      </div>
    </>
  );
}

export default function PersonaPage({ params }: PageProps<"/i/[inviteCode]/p/[token]/persona">) {
  return (
    <Screen>
      <Suspense fallback={<p className="pt-10 text-gris">{t("common.loading")}</p>}>
        <Person params={params} />
      </Suspense>
    </Screen>
  );
}
