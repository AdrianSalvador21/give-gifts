"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { addExclusion, removeExclusion, runDraw } from "@/app/actions/draw";
import { DotButton } from "@/components/ui/DotButton";
import { CloseIcon } from "@/components/ui/icons";
import { Avatar } from "@/components/ui/primitives";
import type { AvatarColor } from "@/lib/data/types";
import { t } from "@/lib/i18n";

type Person = { id: string; name: string; color: AvatarColor };
type DrawError = "min" | "impossible" | "already" | "same" | "duplicate" | "generic";

const selectClass = "h-12 w-full rounded-boton border-2 border-transparent bg-crema px-3 text-base font-medium outline-none focus:border-tinta";

export function DrawForm({ exchangeId, people, exclusions }: { exchangeId: string; people: Person[]; exclusions: { id: string; a: string; b: string }[] }) {
  const router = useRouter();
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const [error, setError] = useState<DrawError | null>(null);
  const [drawError, setDrawError] = useState<DrawError | null>(null);
  const [pending, start] = useTransition();
  const [drawing, startDraw] = useTransition();
  const byId = new Map(people.map((p) => [p.id, p]));

  return (
    <div className="flex flex-1 flex-col gap-4">
      <section className="flex flex-col gap-3 rounded-tarjeta bg-white p-4">
        <div>
          <h2 className="text-xl font-medium tracking-[-0.02em]">{t("draw.exclusionsTitle")}</h2>
          <p className="mt-1 text-sm text-gris">{t("draw.exclusionsText")}</p>
        </div>

        {exclusions.length === 0 ? (
          <p className="text-sm text-gris">{t("draw.none")}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {exclusions.map((x) => {
              const pa = byId.get(x.a);
              const pb = byId.get(x.b);
              if (!pa || !pb) return null;
              return (
                <li key={x.id} className="flex items-center gap-2 rounded-boton bg-crema py-2 pr-2 pl-3">
                  <Avatar name={pa.name} color={pa.color} size={28} />
                  <span className="min-w-0 flex-1 truncate text-[15px] font-medium">
                    {pa.name} <span className="text-gris">↔</span> {pb.name}
                  </span>
                  <Avatar name={pb.name} color={pb.color} size={28} />
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
                    className="grid size-9 shrink-0 place-items-center rounded-full bg-white"
                  >
                    <CloseIcon size={14} />
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        <form
          className="flex flex-col gap-2"
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
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                ["x-a", t("draw.personA"), a, setA],
                ["x-b", t("draw.personB"), b, setB],
              ] as const
            ).map(([id, label, value, setValue]) => (
              <div key={id} className="flex flex-col gap-1">
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
          </div>
          <button type="submit" disabled={pending || !a || !b} className="h-12 rounded-boton bg-tinta font-medium text-white disabled:opacity-40">
            {t("draw.add")}
          </button>
          {error && (
            <p role="alert" className="text-sm text-[#B23A2A]">
              {t(`draw.errors.${error}`)}
            </p>
          )}
        </form>
      </section>

      <div className="mt-auto flex flex-col gap-3 pt-2">
        {drawError && (
          <p role="alert" className="rounded-boton bg-white px-4 py-3 text-sm text-[#B23A2A]">
            {t(`draw.errors.${drawError}`)}
          </p>
        )}
        <DotButton
          variant="pasto"
          full
          size="lg"
          disabled={drawing || pending}
          onClick={() => {
            setDrawError(null);
            startDraw(async () => {
              const res = await runDraw(exchangeId);
              if (res.ok) router.push(`/organizar/${exchangeId}`);
              else setDrawError(res.error);
            });
          }}
        >
          {drawing ? t("draw.drawing") : t("draw.submit", { n: people.length })}
        </DotButton>
        <p className="text-center text-sm text-gris">{t("draw.warning")}</p>
      </div>
    </div>
  );
}
