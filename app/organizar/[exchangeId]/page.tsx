import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AddAssistedForm } from "@/components/organizer/AddAssistedForm";
import { AnnounceLink } from "@/components/organizer/AnnounceLink";
import { GroupRow, type GroupRowData } from "@/components/organizer/GroupRow";
import { OwnerSteps } from "@/components/organizer/OwnerSteps";
import { PanelOptions } from "@/components/organizer/PanelOptions";
import { IdeasRequestedCard, ListUpdatedCard } from "@/components/participant/Nudges";
import { AddToCalendar } from "@/components/ui/AddToCalendar";
import { Alert } from "@/components/ui/Alert";
import { AppShell } from "@/components/ui/AppShell";
import { BrandBar } from "@/components/ui/BrandBar";
import { CopyButton } from "@/components/ui/CopyButton";
import { BackIcon, MegaphoneIcon, SettingsIcon } from "@/components/ui/icons";
import { Avatar, Card, Eyebrow, ScreenTitle } from "@/components/ui/primitives";
import { StatTile } from "@/components/ui/StatTile";
import { PageTransition } from "@/components/ui/Transitions";
import { getAssignments, getExclusions, getPanelParticipants } from "@/lib/data/exchanges";
import { getMyAssignment, getUnread } from "@/lib/data/gifts";
import { getNudges } from "@/lib/data/nudges";
import { exchangeCalendar } from "@/lib/calendar";
import { requireOwnedExchange } from "@/lib/data/owner";
import type { Exchange, PanelParticipant } from "@/lib/data/types";
import { appUrl, formatEvent, formatMoney, formatShortDate, whatsappHref } from "@/lib/format";
import { t } from "@/lib/i18n";
import { LIST_GOAL } from "@/lib/ownerSteps";

export const metadata: Metadata = { title: "Tu intercambio", robots: { index: false } };

function daysLeft(iso: string): string {
  const days = Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);
  if (days <= 0) return t("panel.today");
  return days === 1 ? t("panel.dayLeft") : t("panel.daysLeft", { n: days });
}

function names(list: PanelParticipant[]): string {
  const shown = list.slice(0, 3).map((p) => p.name.split(" ")[0]);
  const rest = list.length - shown.length;
  if (rest > 0) return t("panel.namesMore", { names: shown.join(", "), n: rest });
  if (shown.length < 2) return shown.join("");
  return t("panel.namesAnd", { a: shown.slice(0, -1).join(", "), b: shown[shown.length - 1] });
}

/** «1 de 3 ideas» antes del sorteo (el objetivo importa); después, solo cuántas tiene. */
function ideasLabel(n: number, goal: boolean): string {
  if (n === 0) return t("panel.ideasNone");
  if (goal && n < LIST_GOAL) return t("panel.ideasGoal", { n });
  return n === 1 ? t("panel.ideasOne") : t("panel.ideasCount", { n });
}

const ghostButton = "flex h-[52px] items-center justify-center gap-2 rounded-boton bg-white px-4 text-[15px] font-medium transition-transform active:scale-[0.98] lg:h-11";

async function Panel({ params }: { params: Promise<{ exchangeId: string }> }) {
  const { exchangeId } = await params;
  const { exchange, organizer } = await requireOwnedExchange(exchangeId, `/organizar/${exchangeId}`);
  const drawn = exchange.status === "drawn";
  const [participants, exclusions] = await Promise.all([getPanelParticipants(exchange), drawn ? Promise.resolve([]) : getExclusions(exchange.id)]);
  // Las asignaciones solo se leen si el organizador eligió verlas: si no, ni siquiera llegan al HTML.
  const assignments = drawn && exchange.rules.ownerSeesMap ? await getAssignments(exchange.id) : null;
  const byId = new Map(participants.map((p) => [p.id, p]));
  const owner = participants.find((p) => p.kind === "owner");
  const tz = exchange.timeZone;
  const inviteLink = appUrl(`/i/${exchange.inviteCode}`);
  const total = participants.length;
  const withList = participants.filter((p) => p.wishCount > 0).length;
  const revealed = participants.filter((p) => p.revealed).length;
  const bought = participants.filter((p) => p.bought).length;
  // No leídos del buzón de quien organiza (el mismo helper que usa su inicio personal).
  const ownerUnread = owner && drawn && exchange.rules.mailboxEnabled ? await getUnread(exchange.id, owner.id, owner.revealed) : null;
  const unread = ownerUnread ? ownerUnread.giver + ownerUnread.receiver : 0;
  // Avisos secretos de quien organiza como participante (SPEC 03). Solo los suyos: nunca los de los demás.
  const ownerNudges = owner?.path && drawn ? await getNudges(exchange, owner) : null;
  const ownerKey = owner?.path ? { inviteCode: exchange.inviteCode, token: owner.path.split("/").pop() ?? "" } : null;
  const ownerReceiver =
    owner && ownerNudges?.listNudgePending && owner.revealed ? ((await getMyAssignment(exchange.id, owner.id))?.receiver.name ?? null) : null;
  const calendar = exchangeCalendar(exchange, appUrl(`/organizar/${exchange.id}`));

  const rows: GroupRowData[] = participants.map((p) => ({
    id: p.id,
    name: p.name,
    color: p.color,
    isOwner: p.kind === "owner",
    assisted: p.kind === "assisted",
    link: p.link, // null para quienes se apuntaron solos: quien organiza no tiene su link (R1)
    ideas: ideasLabel(p.wishCount, !drawn),
    pill: drawn
      ? p.bought
        ? { label: t("panel.boughtPill"), tone: "pasto-50" as const }
        : p.revealed
          ? { label: t("panel.revealedPill"), tone: "cielo-50" as const }
          : { label: t("panel.notRevealed"), tone: "sol-50" as const }
      : p.wishCount >= LIST_GOAL
        ? { label: t("panel.pillListReady"), tone: "pasto-50" as const }
        : p.wishCount > 0
          ? { label: t("panel.pillNeedsIdeas"), tone: "sol-50" as const }
          : { label: t("panel.noList"), tone: "arena" as const },
    givesTo: assignments ? byId.get(assignments.get(p.id)?.receiverId ?? "")?.name : undefined,
    // A quien se apuntó solo se le recuerda con el link de invitación (no tenemos el suyo); a los asistidos los maneja quien organiza.
    remindHref:
      drawn && !p.revealed && p.kind === "self"
        ? whatsappHref(t("panel.remindText", { name: p.name.split(" ")[0], exchange: exchange.name, link: inviteLink }))
        : undefined,
  }));

  const announce = drawn
    ? t("panel.drawnAnnounceText", { exchange: exchange.name, date: formatShortDate(exchange.eventAt, tz), link: inviteLink })
    : t("panel.announceText", { name: exchange.name, date: formatEvent(exchange.eventAt, tz), n: total, link: inviteLink });
  const announceHref = whatsappHref(announce);
  const stats = drawn
    ? t("panel.statsDrawn", { n: total, revealed, bought })
    : t("panel.statsOpen", { n: total, lists: withList, exclusions: exclusions.length });

  return (
    <AppShell
      variant="tablero"
      pattern="puntos"
      className="md:max-w-[1180px]!"
      header={
        <BrandBar
          className="pt-2"
          action={
            <>
              <Link
                href="/mis-intercambios"
                transitionTypes={["nav-back"]}
                className="hidden min-h-11 items-center gap-1.5 rounded-[10px] px-2 text-[15px] font-medium no-underline underline-offset-4 hover:underline lg:inline-flex"
              >
                <BackIcon size={18} />
                {t("panel.back")}
              </Link>
              <span className="hidden lg:block" title={organizer.email}>
                <Avatar name={owner?.name || organizer.name || organizer.email} color={owner?.color ?? "pasto"} size={40} />
                <span className="sr-only">{t("panel.account")}</span>
              </span>
              <Link
                href={`/organizar/${exchange.id}/editar`}
                aria-label={t("panel.settings")}
                transitionTypes={["nav-forward"]}
                className="grid size-11 place-items-center rounded-boton border-2 border-tinta bg-hueso transition-transform active:scale-90 lg:hidden"
              >
                <SettingsIcon size={18} />
              </Link>
            </>
          }
        />
      }
    >
      <PageTransition>
        <div className="flex flex-col gap-5 lg:gap-7">
          <Link
            href="/mis-intercambios"
            transitionTypes={["nav-back"]}
            className="-mt-1 inline-flex min-h-11 items-center gap-1.5 self-start text-[15px] font-medium no-underline lg:hidden"
          >
            <BackIcon size={18} />
            {t("panel.back")}
          </Link>

          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between lg:pt-4">
            <div className="min-w-0">
              <Eyebrow>
                {drawn
                  ? `${t("panel.badge")} · ${t("panel.drawnOn", { date: formatShortDate(exchange.drawnAt ?? exchange.eventAt, tz) })} · ${daysLeft(exchange.eventAt)}`
                  : t("panel.eyebrow", { days: daysLeft(exchange.eventAt) })}
              </Eyebrow>
              <ScreenTitle size="sm" className="mt-2 break-words">
                {exchange.name}
              </ScreenTitle>
              <p className="mt-2 text-[15px] text-gris lg:text-lg">
                {[formatEvent(exchange.eventAt, tz), exchange.place, t("panel.budget", { budget: formatMoney(exchange.budget.amount) })].filter(Boolean).join(" · ")}
              </p>
              <AddToCalendar
                icsHref={`/organizar/${exchange.id}/calendario`}
                googleHref={calendar.google}
                summary={`${exchange.name} · ${formatEvent(exchange.eventAt, tz)}`}
                role="owner"
                variant="link"
                className="lg:hidden"
              />
            </div>
            <div className="hidden shrink-0 gap-2 lg:flex">
              <AddToCalendar
                icsHref={`/organizar/${exchange.id}/calendario`}
                googleHref={calendar.google}
                summary={`${exchange.name} · ${formatEvent(exchange.eventAt, tz)}`}
                role="owner"
                variant="fantasma"
              />
              <Link href={`/organizar/${exchange.id}/editar`} transitionTypes={["nav-forward"]} className={ghostButton}>
                <SettingsIcon size={18} />
                {t("panel.editRules")}
              </Link>
              <AnnounceLink exchangeId={exchange.id} href={announceHref} track={drawn} className={ghostButton}>
                <MegaphoneIcon size={18} />
                {t("panel.announce")}
              </AnnounceLink>
            </div>
          </div>

          {!drawn && !exchange.registrationOpen && <Alert tone="info">{t("panel.registrationClosed")}</Alert>}

          {ownerKey && ownerNudges && (ownerNudges.ideasPending || ownerNudges.listNudgePending) && owner?.path && (
            <div className="grid gap-3 lg:grid-cols-2 lg:gap-4">
              {ownerNudges.ideasPending && <IdeasRequestedCard {...ownerKey} href={`${owner.path}/lista`} layout="panel" />}
              {ownerNudges.listNudgePending && (
                <ListUpdatedCard
                  {...ownerKey}
                  href={owner.revealed ? `${owner.path}/persona` : `${owner.path}/sobre`}
                  layout="panel"
                  name={ownerReceiver}
                  revealed={owner.revealed}
                />
              )}
            </div>
          )}

          <OwnerSteps exchange={exchange} owner={owner?.path ? owner : null} total={total} unread={unread} announceHref={announceHref} />

          <section aria-labelledby="grupo" className="flex flex-col gap-2.5 lg:gap-3">
            <div className="flex items-baseline justify-between gap-3">
              <h2 id="grupo" className="etiqueta text-gris">
                {t("panel.group")}
              </h2>
              <span className="hidden text-sm text-gris md:inline">{stats}</span>
            </div>

            <div className="grid grid-cols-3 gap-2 md:hidden">
              {drawn ? (
                <>
                  <StatTile label={t("panel.revealed")} value={revealed} of={total} />
                  <StatTile label={t("panel.kpiLists")} value={withList} of={total} />
                  <StatTile label={t("panel.bought")} value={bought} of={total} />
                </>
              ) : (
                <>
                  <StatTile label={t("panel.kpiJoined")} value={total} />
                  <StatTile label={t("panel.kpiLists")} value={withList} />
                  <StatTile label={t("panel.kpiExclusions")} value={exclusions.length} />
                </>
              )}
            </div>

            {drawn && (
              <p className="text-sm text-gris">{revealed === total ? t("panel.allRevealed") : t("panel.pendingReveal", { names: names(participants.filter((p) => !p.revealed)) })}</p>
            )}

            <ul className="escalonado flex flex-col divide-y divide-arena rounded-tarjeta bg-white px-4 py-1 md:grid md:grid-cols-2 md:gap-3.5 md:divide-y-0 md:bg-transparent md:p-0 xl:grid-cols-4">
              {rows.map((row) => (
                <GroupRow key={row.id} row={row} exchangeId={exchange.id} exchangeName={exchange.name} drawn={drawn} />
              ))}
            </ul>

            <AnnounceLink exchangeId={exchange.id} href={announceHref} track={drawn} className={`${ghostButton} lg:hidden`}>
              <MegaphoneIcon size={18} />
              {t("panel.announce")}
            </AnnounceLink>

            {drawn && !exchange.rules.ownerSeesMap && (
              <p className="rounded-boton border-2 border-dashed border-punteado px-4 py-3.5 text-sm leading-snug text-gris">{t("panel.mapHidden")}</p>
            )}
          </section>

          <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
            <div className="flex min-w-0 flex-col gap-4">
              {!drawn && (
                <Card className="flex flex-col gap-3">
                  <h2 className="text-lg font-medium">{t("panel.inviteLinkTitle")}</h2>
                  <div className="flex flex-wrap items-center gap-2 rounded-[12px] bg-crema py-1.5 pr-1.5 pl-3">
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">{inviteLink.replace(/^https?:\/\//, "")}</span>
                    <CopyButton text={inviteLink} />
                  </div>
                </Card>
              )}
              {!drawn && (
                <Card>
                  <AddAssistedForm exchangeId={exchange.id} />
                </Card>
              )}
              <RulesCard exchange={exchange} />
            </div>
            <PanelOptions exchangeId={exchange.id} exchangeName={exchange.name} drawn={drawn} registrationOpen={exchange.registrationOpen} />
          </div>
        </div>
      </PageTransition>
    </AppShell>
  );
}

function RulesCard({ exchange }: { exchange: Exchange }) {
  const r = exchange.rules;
  return (
    <Card className="flex flex-col gap-2.5">
      <h2 className="text-lg font-medium">{t("panel.rulesTitle")}</h2>
      <p className="text-sm leading-relaxed text-gris">
        {[t("panel.rulesManual"), r.mailboxEnabled ? t("panel.rulesMailboxOn") : t("panel.rulesMailboxOff"), r.ownerSeesMap ? t("panel.rulesSeesMapOn") : t("panel.rulesSeesMapOff")].join(" · ")}
      </p>
      <Link href={`/organizar/${exchange.id}/editar`} transitionTypes={["nav-forward"]} className="inline-flex min-h-11 items-center self-start text-[15px] font-medium underline underline-offset-4">
        {t("panel.editRules")}
      </Link>
    </Card>
  );
}

export default function OrganizarPage({ params }: PageProps<"/organizar/[exchangeId]">) {
  return (
    <Suspense
      fallback={
        <AppShell variant="tablero">
          <p className="pt-10 text-gris">{t("common.loading")}</p>
        </AppShell>
      }
    >
      <Panel params={params} />
    </Suspense>
  );
}
