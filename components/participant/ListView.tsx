import Image from "next/image";
import { Card, CardTitle, Columns, HandNote, Pill, ScreenTitle, StickyPanel } from "@/components/ui/primitives";
import type { Wish } from "@/lib/data/types";
import { t } from "@/lib/i18n";
import { AddWishForm } from "./AddWishForm";
import { EmptyListSlots, WishGridFillers } from "./ListFillers";
import { IdeasBanner, NudgeGiverCard, type CanNudge } from "./Nudges";
import { WishItem } from "./WishItem";

export type ListData = {
  wishes: Wish[];
  max: number;
  inviteCode: string;
  token: string;
  /** Después del sorteo (y antes del evento): «Avisarle que ya está» y, si me pidieron ideas, el aviso. */
  nudge?: { ideasPending: boolean; canNudge: CanNudge; timeZone: string } | null;
};

/** Mi lista: formulario fijo a la izquierda (lg) y la rejilla de deseos con huecos punteados a la derecha. */
export function ListView({ wishes, max, inviteCode, token, nudge }: ListData) {
  const n = wishes.length;
  const empty = n === 0;
  const missing = Math.max(0, 3 - n);
  // Huecos: hasta el objetivo de 3; después, uno de «Otra idea» mientras quepan más.
  const target = n < 3 ? 3 : n < max ? n + 1 : n;

  return (
    <>
      <div className="mt-3 flex flex-col gap-2 lg:mt-6 lg:flex-row lg:items-end lg:justify-between lg:gap-6">
        <div className="flex flex-wrap items-center gap-3">
          <ScreenTitle>{empty ? t("list.empty") : t("list.title")}</ScreenTitle>
          {!empty && (
            <Pill tone="pasto" className="cifra">
              {t("list.countOf", { n, max })}
            </Pill>
          )}
          {missing > 0 && !empty && (
            <HandNote className="hidden text-[20px] md:block" rotate={-3}>
              {missing === 1 ? t("list.goalNoteOne") : t("list.goalNote", { n: missing })}
            </HandNote>
          )}
        </div>
        <p className="max-w-[440px] text-[15px] leading-snug text-gris lg:text-right">{empty ? t("list.emptyText") : t("list.subtitle")}</p>
      </div>

      {nudge && (
        <div className="mt-5 flex flex-col gap-3 lg:mt-8 lg:max-w-[620px]">
          {nudge.ideasPending && <IdeasBanner />}
          <NudgeGiverCard inviteCode={inviteCode} token={token} canNudge={nudge.canNudge} timeZone={nudge.timeZone} />
        </div>
      )}

      <Columns layout="formulario" className="mt-5 lg:mt-8">
        <StickyPanel as="aside" className="flex flex-col gap-4">
          <Card variant="protagonista" className="flex flex-col gap-3 lg:p-7">
            <CardTitle>{t("list.formTitle")}</CardTitle>
            <AddWishForm inviteCode={inviteCode} token={token} full={n >= max} ideas={n < 3} />
          </Card>
          <Image
            src="/illustrations/web/10-lista-vacia.webp"
            width={783}
            height={582}
            alt={t("list.alt")}
            className={`mx-auto hidden h-auto lg:block ${empty ? "w-[80%] max-w-[320px]" : "w-[60%] max-w-[260px]"}`}
          />
        </StickyPanel>

        <section aria-label={t("list.title")} className="min-w-0">
          {empty && <EmptyListSlots className="lg:hidden" />}
          {/* En el celular basta un hueco bajito; los demás (aria-hidden) aparecen desde sm para completar la fila. */}
          <Columns
            layout="deseos"
            as="ul"
            className={`escalonado max-sm:[&>li[aria-hidden]]:hidden max-sm:[&>li>button]:min-h-24 ${empty ? "hidden lg:grid" : ""}`}
          >
            {wishes.map((w, i) => (
              <WishItem key={w.id} wish={w} index={i} inviteCode={inviteCode} token={token} />
            ))}
            <WishGridFillers filled={n} target={target} />
          </Columns>
        </section>
      </Columns>
    </>
  );
}
