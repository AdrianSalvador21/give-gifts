"use client";

import type { ReactNode } from "react";
import { markAnnounced } from "@/app/actions/organizer";
import { DotButton } from "@/components/ui/DotButton";

type Props = {
  exchangeId: string;
  /** Link de WhatsApp (wa.me) con el mensaje para el grupo. */
  href: string;
  /** Después del sorteo: marca «Avísale al grupo» como hecho (announcedAt). Antes, solo abre WhatsApp. */
  track: boolean;
  /** Como DotButton (bloque «Ahora») en lugar de un <a> con `className`. */
  dot?: boolean;
  className?: string;
  children: ReactNode;
};

/**
 * «Avisar al grupo»: abre WhatsApp y, si ya se sorteó, guarda el aviso en segundo plano.
 * Sin preventDefault ni await: el link se abre al instante aunque la acción tarde o falle.
 */
export function AnnounceLink({ exchangeId, href, track, dot, className = "", children }: Props) {
  const onClick = track
    ? () => {
        markAnnounced(exchangeId).catch(() => {});
      }
    : undefined;

  if (dot) {
    return (
      <DotButton href={href} target="_blank" rel="noopener noreferrer" variant="tinta" size="sm" icon="send" full="mobile" className={className} onClick={onClick}>
        {children}
      </DotButton>
    );
  }
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className} onClick={onClick}>
      {children}
    </a>
  );
}
