import Image from "next/image";
import Link from "next/link";
import { BoughtButton, PlanButton, UndoBoughtButton } from "@/app/i/[inviteCode]/p/[token]/persona/GiftActions";
import { Alert } from "@/components/ui/Alert";
import { DotButton } from "@/components/ui/DotButton";
import { EmptySlot } from "@/components/ui/EmptySlots";
import { CheckIcon } from "@/components/ui/icons";
import { Card, Columns, Pill, StickyPanel } from "@/components/ui/primitives";
import { UnreadBadge } from "@/components/ui/UnreadBadge";
import type { Exchange, Participant, Wish } from "@/lib/data/types";
import { formatDateTime, formatMoney } from "@/lib/format";
import { t } from "@/lib/i18n";
import { withDesde, type Desde } from "@/lib/nav";
import { wishMeta, WishThumb } from "./WishDisplay";

export type PersonData = {
  exchange: Exchange;
  me: Participant;
  receiverName: string;
  plannedWishId: string | null;
  wishes: Wish[];
  unread: number;
  inviteCode: string;
  token: string;
  base: string;
  /** Origen de la navegación: se propaga a Buzón y Compré para que «atrás» vuelva ahí. */
  desde: Desde | null;
};

/**
 * Tu persona: ficha fija a la izquierda (lg) con el nombre y las acciones; su lista en rejilla a la derecha.
 * En móvil el orden es ficha → lista → acciones (el <aside> se vuelve `contents` para reordenar sus hijos).
 */
export function PersonView({ exchange, me, receiverName, plannedWishId, wishes, unread, inviteCode, token, base, desde }: PersonData) {
  const mailbox = exchange.rules.mailboxEnabled;

  return (
    <Columns layout="ficha" className="mt-3 lg:mt-6">
      <StickyPanel as="aside" className="contents lg:flex lg:flex-col lg:gap-4">
        <Card variant="protagonista" tone="pasto" ribbon="sol" className="order-1 flex flex-col gap-1 pr-16 lg:order-none lg:p-7 lg:pr-20">
          <span className="text-sm font-medium">{t("person.givesTo")}</span>
          <span className="text-[44px] leading-[0.95] font-medium tracking-[-0.05em] break-words lg:text-[56px]">{receiverName}</span>
          <Pill tone="blanco" className="mt-3 self-start">
            {t("person.budget", { budget: formatMoney(exchange.budget.amount) })}
          </Pill>
        </Card>

        {me.assignmentChangedAt && (
          <Alert tone="aviso" className="order-1 lg:order-none">
            {t("person.changed", { date: formatDateTime(me.assignmentChangedAt, exchange.timeZone) })}
          </Alert>
        )}

        <div className="order-3 flex flex-col gap-2.5 lg:order-none">
          {mailbox && (
            <DotButton href={withDesde(`${base}/buzon`, desde)} variant="tinta" full transitionTypes={["nav-forward"]}>
              <span>
                {t("person.ask")}
                <UnreadBadge n={unread} />
              </span>
            </DotButton>
          )}
          {me.bought ? (
            <>
              <Link
                href={withDesde(`${base}/compre`, desde)}
                transitionTypes={["nav-forward"]}
                className="flex h-[60px] items-center justify-center gap-2 rounded-boton bg-pasto-50 text-lg font-medium no-underline transition-transform active:scale-[0.99]"
              >
                <CheckIcon size={18} />
                {t("person.boughtDone")}
              </Link>
              <UndoBoughtButton inviteCode={inviteCode} token={token} desde={desde} />
            </>
          ) : (
            <BoughtButton inviteCode={inviteCode} token={token} desde={desde} />
          )}
          <p className="text-center text-[13px] text-gris lg:text-left">{t("person.planHint")}</p>
        </div>
      </StickyPanel>

      <section className="order-2 flex min-w-0 flex-col lg:order-none" aria-labelledby="su-lista">
        <div className="flex items-baseline justify-between gap-3">
          <h1 id="su-lista" className="text-2xl font-medium tracking-[-0.03em] lg:text-[40px] lg:tracking-[-0.05em]">
            {t("person.list")}
          </h1>
          <span className="cifra text-sm text-gris">{wishes.length === 1 ? t("person.countOne") : t("person.count", { n: wishes.length })}</span>
        </div>

        {wishes.length === 0 ? (
          <>
            <Card className="mt-3 flex flex-col items-center p-5 text-center lg:mt-5 lg:flex-row lg:gap-6 lg:p-6 lg:text-left">
              <Image src="/illustrations/web/10-lista-vacia.webp" width={783} height={582} alt="" loading="eager" className="h-[110px] w-auto lg:h-[130px]" />
              <div className="flex flex-col">
                <p className="mt-2 text-base font-medium lg:mt-0 lg:text-lg">{t("person.empty")}</p>
                <p className="mt-1 text-sm text-gris">{t("person.emptyText")}</p>
              </div>
            </Card>
            <Columns layout="deseos" as="ul" className="escalonado mt-4" aria-hidden>
              {[0, 1, 2].map((i) => (
                <li key={i} className={i > 0 ? "hidden sm:block" : ""}>
                  <EmptySlot layout="tarjeta" fade={(i + 1) as 1 | 2 | 3} className="h-full w-full">
                    {/* Sin «+»: es la lista de otra persona y aquí no se puede agregar nada. */}
                    {i === 0 ? t("person.emptySlot") : <span />}
                  </EmptySlot>
                </li>
              ))}
            </Columns>
          </>
        ) : (
          <Columns layout="deseos" as="ul" className="escalonado mt-3 lg:mt-5">
            {wishes.map((w, i) => {
              const planned = plannedWishId === w.id;
              return (
                <li
                  key={w.id}
                  className={`levantable flex flex-col gap-3 rounded-tarjeta border-2 bg-white p-3.5 ${planned ? "border-pasto" : "border-transparent"}`}
                >
                  <div className="flex items-start gap-3">
                    <WishThumb wish={w} index={i} />
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="text-[15px] leading-snug font-medium">{w.title}</span>
                      <span className="text-[13px] text-gris">
                        {wishMeta(w)}
                        {w.note ? ` · «${w.note}»` : ""}
                      </span>
                      {w.favorite && (
                        <Pill tone="pasto-50" className="mt-1 self-start px-2.5 py-0.5 text-xs">
                          {t("person.favorite")}
                        </Pill>
                      )}
                    </span>
                  </div>
                  <div className="mt-auto flex flex-wrap items-center justify-between gap-2">
                    <PlanButton inviteCode={inviteCode} token={token} wishId={w.id} planned={planned} />
                    {w.url && (
                      <a
                        href={w.url}
                        target="_blank"
                        rel="noopener noreferrer nofollow"
                        className="inline-flex min-h-11 items-center text-[13px] font-medium underline underline-offset-4"
                      >
                        {t("person.open", { store: w.store ?? "la tienda" })}
                      </a>
                    )}
                  </div>
                </li>
              );
            })}
          </Columns>
        )}
      </section>
    </Columns>
  );
}
