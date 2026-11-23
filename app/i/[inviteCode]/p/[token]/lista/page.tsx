import type { Metadata } from "next";
import Image from "next/image";
import { Suspense } from "react";
import { AddWishForm } from "@/components/participant/AddWishForm";
import { WishItem } from "@/components/participant/WishItem";
import { Pill, Screen, ScreenTitle, TopBar } from "@/components/ui/primitives";
import { requireParticipant } from "@/lib/data/access";
import { getWishes, MAX_WISHES } from "@/lib/data/exchanges";
import { t } from "@/lib/i18n";

export const metadata: Metadata = { title: "Mi lista", robots: { index: false } };

async function MyList({ params }: { params: Promise<{ inviteCode: string; token: string }> }) {
  const { exchange, me, inviteCode, token, base } = await requireParticipant(params);
  const wishes = await getWishes(exchange.id, me.id);
  const empty = wishes.length === 0;

  return (
    <>
      <TopBar backHref={base} title={exchange.name} />
      {empty ? (
        <>
          <Image src="/illustrations/web/10-lista-vacia.webp" width={783} height={582} alt={t("list.alt")} priority className="mx-auto mt-6 mb-1.5 h-[190px] w-auto" />
          <ScreenTitle>{t("list.empty")}</ScreenTitle>
          <p className="mt-2.5 text-[17px] leading-snug text-gris">{t("list.emptyText")}</p>
        </>
      ) : (
        <>
          <div className="mt-5 flex items-end justify-between gap-3">
            <ScreenTitle>{t("list.title")}</ScreenTitle>
            <Pill className="bg-pasto">{wishes.length === 1 ? t("list.countOne") : t("list.count", { n: wishes.length })}</Pill>
          </div>
          <p className="mt-2 text-[15px] text-gris">{t("list.subtitle")}</p>
        </>
      )}

      <div className={empty ? "mt-6" : "mt-4"}>
        <AddWishForm inviteCode={inviteCode} token={token} full={wishes.length >= MAX_WISHES} />
      </div>

      {!empty && (
        <ul className="mt-4 flex flex-col gap-2.5">
          {wishes.map((w, i) => (
            <WishItem key={w.id} wish={w} index={i} inviteCode={inviteCode} token={token} />
          ))}
        </ul>
      )}
    </>
  );
}

export default function ListaPage({ params }: PageProps<"/i/[inviteCode]/p/[token]/lista">) {
  return (
    <Screen>
      <Suspense fallback={<p className="pt-10 text-gris">{t("common.loading")}</p>}>
        <MyList params={params} />
      </Suspense>
    </Screen>
  );
}
