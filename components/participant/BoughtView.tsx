import Image from "next/image";
import { UndoBoughtButton } from "@/app/i/[inviteCode]/p/[token]/persona/GiftActions";
import { BrandBar } from "@/components/ui/BrandBar";
import { Confetti } from "@/components/ui/Confetti";
import { DotButton } from "@/components/ui/DotButton";
import { Card, DateTile, HandNote, ScreenTitle, SplitShell } from "@/components/ui/primitives";
import { ProgressRing } from "@/components/ui/ProgressRing";
import type { Exchange } from "@/lib/data/types";
import { calendarHref, calendarParts, formatEvent } from "@/lib/format";
import { t } from "@/lib/i18n";
import type { Desde } from "@/lib/nav";
import { BackLink } from "./ParticipantTop";

export type BoughtData = {
  exchange: Exchange;
  /** «Atrás» según el origen (backTarget de lib/nav). */
  back: { href: string; label: string };
  text: string;
  bought: number;
  total: number;
  /** Nombres (de pila) de quienes faltan por comprar. No revela asignaciones: solo quién no ha marcado «ya compré». */
  missing: string[];
  /** Para «Deshacer, aún no lo compro» (vuelve a /persona con el mismo `?desde=`). */
  undo: { inviteCode: string; token: string; desde: Desde | null };
};

function missingText(names: string[]): string {
  if (names.length === 0) return t("bought.allDone");
  const list = new Intl.ListFormat("es-MX", { style: "long", type: "conjunction" });
  if (names.length <= 3) return t("bought.missing", { names: list.format(names) });
  return t("bought.missingMore", { names: names.slice(0, 3).join(", "), n: names.length - 3 });
}

/** ¡Regalo comprado!: split sol con confeti; anillo de avance del grupo y la fecha a la derecha. */
export function BoughtView({ exchange, back, text, bought, total, missing, undo }: BoughtData) {
  const tz = exchange.timeZone;
  const cal = calendarParts(exchange.eventAt, tz);
  const [day, time] = formatEvent(exchange.eventAt, tz).split(" · ");
  const progress = t("bought.progress", { n: bought, total });

  return (
    <SplitShell
      tone="sol"
      pattern="confeti"
      ratio="mitad"
      width="normal"
      header={<BrandBar pill={exchange.name} className="pt-2" />}
      art={
        <div className="relative flex flex-col lg:h-full">
          <div className="lg:hidden">
            <BackLink href={back.href} label={back.label} />
          </div>
          <div className="relative mx-auto mt-2 lg:mt-10">
            <Image src="/illustrations/web/12-ya-compre.webp" width={603} height={549} alt={t("bought.alt")} priority className="h-[180px] w-auto lg:h-[340px] xl:h-[400px]" />
            <Confetti delay={250} spread={1.1} />
          </div>
          <ScreenTitle className="mt-4 text-center lg:mt-auto lg:mb-6 lg:text-left lg:text-[72px] xl:text-[84px]">{t("bought.title")}</ScreenTitle>
        </div>
      }
    >
      <div className="mb-4 hidden lg:block">
        <BackLink href={back.href} label={back.label} />
      </div>
      <p className="text-[17px] leading-snug lg:text-xl">{text}</p>

      <Card className="mt-5 flex items-center gap-5 lg:p-6">
        <ProgressRing value={bought} max={total} size={96} label={progress} />
        <span className="flex min-w-0 flex-col gap-1">
          <span className="text-[17px] font-medium lg:text-lg">{progress}</span>
          <span className="text-sm text-gris">{missingText(missing)}</span>
        </span>
      </Card>

      <Card className="mt-3 flex flex-wrap items-center gap-3.5">
        <DateTile month={cal.month} day={cal.day} tone="pasto" />
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-[15px] font-medium">{`${day.charAt(0).toUpperCase()}${day.slice(1)} · ${time}`}</span>
          {exchange.place && <span className="truncate text-sm text-gris">{exchange.place}</span>}
        </span>
        <a
          href={calendarHref(exchange.name, exchange.eventAt, exchange.place, tz)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 shrink-0 items-center rounded-[12px] bg-crema px-3.5 text-[13px] font-medium no-underline transition-transform active:scale-95"
        >
          {t("bought.calendar")}
        </a>
      </Card>

      <HandNote className="mt-5 self-center text-[20px] lg:self-start">{t("bought.note")}</HandNote>

      <div className="mt-6 flex flex-col gap-2.5 lg:flex-row lg:flex-wrap">
        <DotButton href={back.href} variant="pasto" ink full="mobile" transitionTypes={["nav-back"]}>
          {back.href.startsWith("/organizar") ? t("bought.backPanel") : t("bought.back")}
        </DotButton>
        <DotButton href="/mis-intercambios" variant="blanco" full="mobile">
          {t("bought.mine")}
        </DotButton>
      </div>
      <UndoBoughtButton {...undo} className="mt-3" />
    </SplitShell>
  );
}
