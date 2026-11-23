import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { AddAssistedForm } from "@/components/organizer/AddAssistedForm";
import { GroupRow, type GroupRowData } from "@/components/organizer/GroupRow";
import { CopyButton } from "@/components/ui/CopyButton";
import { DotButton } from "@/components/ui/DotButton";
import { ArrowIcon, BackIcon, MegaphoneIcon, PlusIcon, SettingsIcon } from "@/components/ui/icons";
import { Pill, RoundIconLink } from "@/components/ui/primitives";
import { getAssignments, getParticipants } from "@/lib/data/exchanges";
import { requireOwnedExchange } from "@/lib/data/owner";
import type { Exchange, Participant } from "@/lib/data/types";
import { appUrl, formatEvent, formatMoney, formatShortDate, whatsappHref } from "@/lib/format";
import { t } from "@/lib/i18n";

export const metadata: Metadata = { title: "Tu intercambio", robots: { index: false } };

function daysLeft(iso: string): string {
  const days = Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);
  if (days <= 0) return t("panel.today");
  return days === 1 ? t("panel.dayLeft") : t("panel.daysLeft", { n: days });
}

function Bar({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pct = total ? Math.round((value / total) * 100) : 0;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-between text-[15px]">
        <span className="font-medium">{label}</span>
        <span>
          {value} de {total}
        </span>
      </div>
      <div className="h-2.5 rounded-full bg-arena" role="progressbar" aria-label={label} aria-valuenow={value} aria-valuemin={0} aria-valuemax={total}>
        <div className={`h-2.5 rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function names(list: Participant[]): string {
  const shown = list.slice(0, 3).map((p) => p.name.split(" ")[0]);
  const rest = list.length - shown.length;
  return rest > 0 ? `${shown.join(", ")} y ${rest} más` : shown.join(" y ").replace(/ y (?=.* y )/, ", ");
}

async function Panel({ params }: { params: Promise<{ exchangeId: string }> }) {
  const { exchangeId } = await params;
  const { exchange } = await requireOwnedExchange(exchangeId, `/organizar/${exchangeId}`);
  const participants = await getParticipants(exchange.id);
  const drawn = exchange.status === "drawn";
  // Las asignaciones solo se leen si el organizador eligió verlas: si no, ni siquiera llegan al HTML.
  const assignments = drawn && exchange.rules.ownerSeesMap ? await getAssignments(exchange.id) : null;
  const byId = new Map(participants.map((p) => [p.id, p]));
  const owner = participants.find((p) => p.kind === "owner");
  const inviteLink = appUrl(`/i/${exchange.inviteCode}`);
  const personalLink = (p: Participant) => appUrl(`/i/${exchange.inviteCode}/p/${p.token}`);
  const total = participants.length;
  const withList = participants.filter((p) => p.wishCount > 0).length;

  const rows: GroupRowData[] = participants.map((p) => ({
    id: p.id,
    name: p.name,
    color: p.color,
    isOwner: p.kind === "owner",
    assisted: p.kind === "assisted",
    link: personalLink(p),
    pills: drawn
      ? [
          ...(p.revealed ? [{ label: t("panel.revealed"), tone: "cielo" as const }] : [{ label: "Sobre sin abrir", tone: "coral-outline" as const }]),
          ...(p.bought ? [{ label: "Ya compró", tone: "pasto" as const }] : []),
        ]
      : [p.wishCount > 0 ? { label: t("panel.hasList"), tone: "pasto" as const } : { label: t("panel.noList"), tone: "arena" as const }],
    givesTo: assignments ? byId.get(assignments.get(p.id)?.receiverId ?? "")?.name : undefined,
    remindHref:
      drawn && !p.revealed && p.kind !== "owner" && p.kind !== "assisted"
        ? whatsappHref(t("panel.remindText", { name: p.name.split(" ")[0], exchange: exchange.name, link: personalLink(p) }))
        : undefined,
  }));

  const announce = drawn
    ? t("panel.drawnAnnounceText", { exchange: exchange.name, date: formatShortDate(exchange.eventAt) })
    : t("panel.announceText", { name: exchange.name, date: formatEvent(exchange.eventAt), n: total, link: inviteLink });

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between pt-4">
        <RoundIconLink href="/mis-intercambios" label={t("panel.back")}>
          <BackIcon />
        </RoundIconLink>
        <Pill className="bg-tinta text-white">{t("panel.badge")}</Pill>
        <RoundIconLink href={`/organizar/${exchange.id}/editar`} label={t("panel.settings")}>
          <SettingsIcon size={18} />
        </RoundIconLink>
      </div>

      <div>
        <h1 className="text-[32px] leading-[1.02] font-medium tracking-[-0.05em] lg:text-[60px]">{exchange.name}</h1>
        <p className="mt-1.5 text-[15px] text-gris lg:text-lg">
          {drawn
            ? `${t("panel.drawnOn", { date: formatShortDate(exchange.drawnAt ?? exchange.eventAt) })} · ${daysLeft(exchange.eventAt)}`
            : `${formatEvent(exchange.eventAt)}${exchange.place ? ` · ${exchange.place}` : ""} · Hasta ${formatMoney(exchange.budget.amount)}`}
        </p>
      </div>

      <div className="flex flex-wrap gap-5">
        <div className="flex min-w-0 flex-[999_1_560px] flex-col gap-4">
          {drawn ? (
            <>
              {owner && (
                <Link href={`/i/${exchange.inviteCode}/p/${owner.token}/sobre`} className="flex items-center gap-3 rounded-[24px] bg-coral p-4">
                  <Image src="/illustrations/web/09-revelacion.webp" width={692} height={669} alt="" className="h-[86px] w-[90px] object-contain" />
                  <span className="flex flex-1 flex-col gap-1">
                    <span className="text-[22px] leading-tight font-medium tracking-[-0.03em]">{t("panel.envelopeTitle")}</span>
                    <span className="text-sm">{t("panel.envelopeText")}</span>
                  </span>
                  <span className="grid size-10 place-items-center rounded-full bg-white">
                    <ArrowIcon size={14} />
                  </span>
                </Link>
              )}
              <div className="flex flex-col gap-4 rounded-[24px] bg-white p-[18px]">
                <Bar label={t("panel.revealed")} value={participants.filter((p) => p.revealed).length} total={total} color="bg-cielo" />
                <Bar label={t("panel.lists")} value={withList} total={total} color="bg-sol" />
                <Bar label={t("panel.bought")} value={participants.filter((p) => p.bought).length} total={total} color="bg-pasto" />
                <p className="text-sm text-gris">
                  {participants.every((p) => p.revealed)
                    ? t("panel.allRevealed")
                    : t("panel.pendingReveal", { names: names(participants.filter((p) => !p.revealed)) })}
                </p>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-3 rounded-[24px] bg-pasto p-[18px] lg:p-7">
              <div className="flex flex-1 flex-col gap-2.5">
                <span className="text-[22px] leading-[1.1] font-medium tracking-[-0.03em] lg:text-[38px] lg:leading-none">
                  {total >= 3 ? (
                    <>
                      {t("panel.ready", { n: total })}
                      <br />
                      {t("panel.readySub")}
                    </>
                  ) : 3 - total === 1 ? (
                    t("panel.needMoreOne")
                  ) : (
                    t("panel.needMore", { n: 3 - total })
                  )}
                </span>
                {total >= 3 && (
                  <DotButton href={`/organizar/${exchange.id}/sorteo`} variant="blanco" dotClassName="bg-coral" className="h-[50px] self-start text-base">
                    {t("panel.drawCta")}
                  </DotButton>
                )}
              </div>
              <Image src="/illustrations/web/08-esperando.webp" width={845} height={385} alt="" className="h-[90px] w-[130px] object-contain lg:h-[150px] lg:w-[300px]" />
            </div>
          )}

          <div className="grid grid-cols-2 gap-2.5">
            {!drawn && (
              <Link href={`/crear/listo/${exchange.id}`} className="flex h-[52px] items-center justify-center gap-2 rounded-boton bg-white text-[15px] font-medium">
                <PlusIcon size={18} />
                {t("panel.invite")}
              </Link>
            )}
            <a
              href={whatsappHref(announce)}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex h-[52px] items-center justify-center gap-2 rounded-boton bg-white text-[15px] font-medium ${drawn ? "col-span-2" : ""}`}
            >
              <MegaphoneIcon size={18} />
              {t("panel.announce")}
            </a>
          </div>

          <section className="rounded-[20px] bg-white px-4 pt-3 pb-1">
            <div className="flex items-baseline justify-between">
              <h2 className="text-xl font-medium tracking-[-0.02em]">{t("panel.group")}</h2>
              <span className="text-sm text-gris">{t("panel.withList", { n: withList, total })}</span>
            </div>
            <ul>
              {rows.map((row) => (
                <GroupRow key={row.id} row={row} exchangeId={exchange.id} canRemove={!drawn} />
              ))}
            </ul>
          </section>

          {!drawn && (
            <section className="rounded-[20px] bg-white p-4">
              <AddAssistedForm exchangeId={exchange.id} />
            </section>
          )}
          {drawn && !exchange.rules.ownerSeesMap && (
            <p className="rounded-boton border border-dashed border-gris px-4 py-3.5 text-sm leading-snug text-gris">{t("panel.mapHidden")}</p>
          )}
        </div>

        <aside className="flex min-w-0 flex-[1_1_300px] flex-col gap-4">
          {!drawn && (
            <div className="flex flex-col gap-3 rounded-panel bg-white p-5">
              <h2 className="text-lg font-medium">{t("panel.inviteLinkTitle")}</h2>
              <div className="flex items-center gap-2 rounded-[12px] bg-crema py-1.5 pr-1.5 pl-3">
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{inviteLink.replace(/^https?:\/\//, "")}</span>
                <CopyButton text={inviteLink} />
              </div>
            </div>
          )}
          <RulesCard exchange={exchange} />
        </aside>
      </div>
    </div>
  );
}

function RulesCard({ exchange }: { exchange: Exchange }) {
  const r = exchange.rules;
  return (
    <div className="flex flex-col gap-2.5 rounded-panel bg-white p-5">
      <h2 className="text-lg font-medium">{t("panel.rulesTitle")}</h2>
      <p className="text-sm leading-relaxed text-gris">
        {[t("panel.rulesManual"), r.mailboxEnabled ? t("panel.rulesMailboxOn") : t("panel.rulesMailboxOff"), r.ownerSeesMap ? t("panel.rulesSeesMapOn") : t("panel.rulesSeesMapOff")].join(" · ")}
      </p>
      <Link href={`/organizar/${exchange.id}/editar`} className="text-[15px] font-medium underline underline-offset-4">
        {t("panel.editRules")}
      </Link>
    </div>
  );
}

export default function OrganizarPage({ params }: PageProps<"/organizar/[exchangeId]">) {
  return (
    <div className="min-h-dvh bg-crema">
      <main className="mx-auto w-full max-w-[440px] px-5 pb-10 lg:max-w-[1232px] lg:px-6">
        <Suspense fallback={<p className="pt-10 text-gris">{t("common.loading")}</p>}>
          <Panel params={params} />
        </Suspense>
      </main>
    </div>
  );
}
