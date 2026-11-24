"use client";

import Image from "next/image";
import { useState } from "react";
import { DotButton } from "@/components/ui/DotButton";
import { CheckIcon } from "@/components/ui/icons";
import { t } from "@/lib/i18n";

const OCCASIONS = [
  { label: t("landing.final.o1Label"), name: t("landing.final.o1Name"), group: t("landing.final.o1Group") },
  { label: t("landing.final.o2Label"), name: t("landing.final.o2Name"), group: t("landing.final.o2Group") },
  { label: t("landing.final.o3Label"), name: t("landing.final.o3Name"), group: t("landing.final.o3Group") },
  { label: t("landing.final.o4Label"), name: t("landing.final.o4Name"), group: t("landing.final.o4Group") },
];

const FEATURES = [t("landing.final.f1"), t("landing.final.f2"), t("landing.final.f3")];

/**
 * Cierre de la landing: nombre del intercambio (→ /crear?nombre=…, funciona sin JS) y, al lado,
 * cómo le llega la invitación al chat del grupo. Las ocasiones llenan el nombre y la vista previa.
 */
export function FinalCta({ host }: { host: string }) {
  const [name, setName] = useState(OCCASIONS[0].name);
  const trimmed = name.trim();
  const occasion = OCCASIONS.find((o) => o.name === trimmed);

  return (
    <section className="mx-4 mt-16 overflow-hidden rounded-[40px] bg-pasto bg-puntos px-5 pt-10 pb-8 sm:mt-24 sm:px-10 sm:py-14 lg:rounded-hoja lg:px-14 lg:py-16">
      <div className="mx-auto grid max-w-[1184px] gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-14">
        <div className="flex flex-col gap-[22px]">
          <p className="etiqueta">{t("landing.final.eyebrow")}</p>
          <h2 className="text-[clamp(44px,7vw,96px)] leading-[0.92] font-medium tracking-[-0.06em] text-balance">{t("landing.final.title")}</h2>
          <p className="max-w-[34ch] text-[clamp(18px,1.8vw,22px)] leading-[1.3] font-medium tracking-[-0.02em]">{t("landing.final.text")}</p>

          <div role="group" aria-label={t("landing.final.occasionsLabel")} className="flex flex-wrap gap-2">
            {OCCASIONS.map((o) => {
              const selected = o === occasion;
              return (
                <button
                  key={o.name}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setName(o.name)}
                  className={`min-h-10 rounded-full border-2 px-3.5 py-2 text-[15px] font-medium transition-transform duration-150 ease-rebote hover:-translate-y-px ${
                    selected ? "border-tinta bg-white shadow-tinta-sm" : "border-transparent bg-white/55"
                  }`}
                >
                  {o.label}
                </button>
              );
            })}
          </div>

          <form action="/crear" method="get" className="flex flex-wrap gap-3">
            <label htmlFor="gg-nombre-final" className="sr-only">
              {t("landing.intro.inputLabel")}
            </label>
            <input
              id="gg-nombre-final"
              name="nombre"
              maxLength={60}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("landing.intro.inputPlaceholder")}
              className="h-[68px] min-w-0 flex-[1_1_240px] rounded-boton border-2 border-tinta bg-white px-[22px] text-lg font-medium outline-none placeholder:font-normal placeholder:text-gris"
            />
            <DotButton type="submit" variant="tinta" size="lg" ink>
              {t("landing.intro.cta")}
            </DotButton>
          </form>

          <ul className="flex flex-wrap gap-x-5 gap-y-2 text-[15px] font-medium">
            {FEATURES.map((f) => (
              <li key={f} className="inline-flex items-center gap-2">
                <span aria-hidden className="grid size-[22px] shrink-0 place-items-center rounded-full bg-tinta text-pasto">
                  <CheckIcon size={12} />
                </span>
                {f}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative px-2 pt-2 pb-[52px]">
          <div
            role="img"
            aria-label={t("landing.final.chatLabel")}
            className="overflow-hidden rounded-panel border-2 border-tinta bg-hueso shadow-tinta-lg lg:rotate-[1.5deg]"
          >
            <div className="flex items-center gap-2.5 border-b-[1.5px] border-arena px-[18px] py-3.5">
              <span className="grid size-9 shrink-0 place-items-center rounded-full border-[1.5px] border-tinta bg-sol text-sm font-semibold">
                {(occasion?.group ?? t("landing.final.chatGroupFallback")).charAt(0)}
              </span>
              <span className="min-w-0">
                <strong className="block truncate text-[15px] leading-tight font-semibold">{occasion?.group ?? t("landing.final.chatGroupFallback")}</strong>
                <span className="block truncate text-[13px] text-gris">{t("landing.final.chatMembers")}</span>
              </span>
            </div>
            <div className="grid gap-2.5 bg-[radial-gradient(rgb(44_46_42/0.07)_1.2px,transparent_1.6px)] bg-size-[22px_22px] p-[18px] text-[15px] leading-[1.35]">
              <div className="max-w-[92%] justify-self-end rounded-2xl rounded-br-[4px] bg-pasto-50 px-3 py-2.5">
                <div className="mb-2 grid grid-cols-[84px_1fr] items-center gap-3 rounded-xl border-[1.5px] border-arena bg-white p-2">
                  <Image src="/illustrations/web/07-invitar.webp" width={845} height={612} alt="" sizes="84px" className="size-[84px] rounded-lg bg-pasto object-contain" />
                  <span className="min-w-0">
                    <b className="block text-[15px] leading-tight font-semibold tracking-[-0.01em] [overflow-wrap:anywhere]">{trimmed || t("landing.final.previewFallback")}</b>
                    <span className="block text-[13px] text-gris">{t("landing.final.previewMeta")}</span>
                    <span className="mt-1 block text-xs text-gris">{host}</span>
                  </span>
                </div>
                {t("landing.final.message")}
                <span className="mt-0.5 block text-right text-[11px] text-gris">19:42</span>
              </div>
              <ChatReply who={t("landing.final.reply1Name")} text={t("landing.final.reply1")} time="19:45" />
              <ChatReply who={t("landing.final.reply2Name")} text={t("landing.final.reply2")} time="19:46" />
            </div>
          </div>
          <span aria-hidden className="mano absolute bottom-0 left-0 -rotate-6 text-xl leading-[1.1]">
            <svg width="40" height="28" viewBox="0 0 40 28" className="mb-0.5 ml-10 block">
              <path d="M4 24 C 10 8, 22 4, 34 6 M28 1 L35 6 L29 12" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {t("landing.final.note")}
          </span>
        </div>
      </div>
    </section>
  );
}

function ChatReply({ who, text, time }: { who: string; text: string; time: string }) {
  return (
    <div className="max-w-[92%] justify-self-start rounded-2xl rounded-bl-[4px] border-[1.5px] border-arena bg-white px-3 py-2.5">
      <span className="mb-0.5 block text-xs font-semibold text-coral-700">{who}</span>
      {text}
      <span className="mt-0.5 block text-right text-[11px] text-gris">{time}</span>
    </div>
  );
}
