"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import { addExclusion, removeExclusion, runDraw } from "@/app/actions/draw";
import { Alert } from "@/components/ui/Alert";
import { Columns, StickyPanel } from "@/components/ui/AppShell";
import { ConfirmDialog } from "@/components/ui/Dialog";
import { DotButton } from "@/components/ui/DotButton";
import { CloseIcon, PlusIcon } from "@/components/ui/icons";
import { Avatar, AvatarStack, Card, CardTitle } from "@/components/ui/primitives";
import { StatTile } from "@/components/ui/StatTile";
import type { AvatarColor } from "@/lib/data/types";
import { t } from "@/lib/i18n";

type Person = { id: string; name: string; color: AvatarColor };
type DrawError = "min" | "impossible" | "already" | "same" | "duplicate" | "generic";

const selectClass = "h-12 w-full rounded-boton border-2 border-transparent bg-crema px-3 text-base font-medium outline-none focus:border-tinta";

function peopleText(people: Person[]): string {
  const shown = people.slice(0, 3).map((p) => p.name.split(" ")[0]);
  const rest = people.length - shown.length;
  if (rest > 0) return t("panel.namesMore", { names: shown.join(", "), n: rest });
  if (shown.length < 2) return shown.join("");
  return t("panel.namesAnd", { a: shown.slice(0, -1).join(", "), b: shown[shown.length - 1] });
}

/** Antes de sortear: exclusiones a la izquierda y resumen fijo con el botón de sortear a la derecha (lg). */
export function DrawForm({
  exchangeId,
  people,
  exclusions,
  seesMap,
  intro,
}: {
  exchangeId: string;
  people: Person[];
  exclusions: { id: string; a: string; b: string }[];
  seesMap: boolean;
  intro: ReactNode;
}) {
  const router = useRouter();
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const [error, setError] = useState<DrawError | null>(null);
  const [drawError, setDrawError] = useState<DrawError | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [pending, start] = useTransition();
  const [drawing, startDraw] = useTransition();
  const byId = new Map(people.map((p) => [p.id, p]));
  const tooFew = people.length < 3;

  function draw() {
    setDrawError(null);
    startDraw(async () => {
      const res = await runDraw(exchangeId);
      if (res.ok) router.push(`/organizar/${exchangeId}`, { transitionTypes: ["nav-back"] });
      else setDrawError(res.error);
    });
  }

  return (
    <Columns layout="resumen" className="flex-1 pb-4">
      <div className="flex min-w-0 flex-col gap-5">
        <div>{intro}</div>

        <Card className="flex flex-col gap-4">
          <CardTitle>{t("draw.exclusionsTitle")}</CardTitle>

          {exclusions.length === 0 ? (
            <p className="text-sm text-gris">{t("draw.none")}</p>
          ) : (
            <ul className="escalonado flex flex-col gap-2">
              {exclusions.map((x) => {
                const pa = byId.get(x.a);
                const pb = byId.get(x.b);
                if (!pa || !pb) return null;
                return (
                  <li key={x.id} className="flex items-center gap-3 rounded-boton bg-crema py-1.5 pr-1.5 pl-2">
                    <span className="flex shrink-0" aria-hidden>
                      <Avatar name={pa.name} color={pa.color} size={30} ring />
                      <Avatar name={pb.name} color={pb.color} size={30} ring className="-ml-2" />
                    </span>
                    <span className="min-w-0 flex-1 text-[15px] leading-snug font-medium">{t("draw.pair", { a: pa.name, b: pb.name })}</span>
                    <button
                      type="button"
                      disabled={pending}
                      aria-label={t("draw.removeExclusion", { a: pa.name, b: pb.name })}
                      onClick={() =>
                        start(async () => {
                          const res = await removeExclusion(exchangeId, x.id);
                          setError(res.ok ? null : res.error);
                          if (res.ok) setDrawError(null);
                        })
                      }
                      className="grid size-11 shrink-0 place-items-center rounded-full bg-white transition-transform active:scale-90 disabled:opacity-50"
                    >
                      <CloseIcon size={14} />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          <form
            className="flex flex-col gap-2.5 border-t border-arena pt-4"
            onSubmit={(e) => {
              e.preventDefault();
              setError(null);
              start(async () => {
                const res = await addExclusion(exchangeId, a, b);
                if (res.ok) {
                  setDrawError(null);
                  setA("");
                  setB("");
                } else setError(res.error);
              });
            }}
          >
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
              {(
                [
                  ["x-a", t("draw.personA"), a, setA],
                  ["x-b", t("draw.personB"), b, setB],
                ] as const
              ).map(([id, label, value, setValue]) => (
                <div key={id} className="flex min-w-0 flex-col gap-1">
                  <label htmlFor={id} className="text-[13px] font-medium">
                    {label}
                  </label>
                  <select
                    id={id}
                    value={value}
                    onChange={(e) => {
                      setValue(e.target.value);
                      setError(null);
                    }}
                    className={selectClass}
                  >
                    <option value="">{t("draw.choose")}</option>
                    {people.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
              <button
                type="submit"
                disabled={pending || !a || !b}
                className="col-span-2 flex h-12 items-center justify-center gap-1.5 rounded-boton bg-tinta px-5 font-medium text-white transition-transform active:scale-[0.98] disabled:opacity-40 sm:col-span-1"
              >
                <PlusIcon size={16} />
                {t("draw.add")}
              </button>
            </div>
            {error && <Alert tone="error">{t(`draw.errors.${error}`)}</Alert>}
          </form>
        </Card>
      </div>

      <StickyPanel as="aside" className="lg:pt-4">
        <Card variant="protagonista" tone="pasto" className="flex flex-col gap-4">
          <Image src="/illustrations/web/13-exclusiones.webp" width={897} height={527} alt="" className="mx-auto hidden h-[150px] w-auto lg:block" />
          <CardTitle>{t("draw.summaryTitle")}</CardTitle>
          <div className="flex items-center gap-3">
            <AvatarStack people={people} max={4} size={36} />
            <span className="min-w-0 text-sm leading-snug">{peopleText(people)}</span>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <StatTile label={t("draw.people")} value={people.length} />
            <StatTile label={t("draw.exclusionsCount")} value={exclusions.length} />
          </div>
          <p className="text-sm leading-snug">{seesMap ? t("draw.seesMapOn") : t("draw.seesMapOff")}</p>
          {tooFew && <Alert tone="aviso">{t("draw.errors.min")}</Alert>}
          {drawError && !confirming && <Alert tone="error">{t(`draw.errors.${drawError}`)}</Alert>}
          <DotButton
            variant="tinta"
            full
            disabled={drawing || pending || tooFew}
            onClick={() => {
              setDrawError(null);
              setConfirming(true);
            }}
          >
            {drawing ? t("draw.drawing") : t("draw.submit", { n: people.length })}
          </DotButton>
          <p className="text-[13px] leading-snug text-tinta/75">{t("draw.warning")}</p>
        </Card>
      </StickyPanel>

      <ConfirmDialog
        open={confirming}
        onClose={() => setConfirming(false)}
        onConfirm={() => {
          draw();
        }}
        title={t("draw.confirmTitle", { n: people.length })}
        description={t("draw.warning")}
        confirmLabel={t("draw.confirmYes")}
        tone="normal"
        pending={drawing}
        error={drawError ? t(`draw.errors.${drawError}`) : null}
      />
    </Columns>
  );
}
