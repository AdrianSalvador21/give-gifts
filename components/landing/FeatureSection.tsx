import Image, { type StaticImageData } from "next/image";
import type { CSSProperties, ReactNode } from "react";
import { DotButton, type DotVariant } from "@/components/ui/DotButton";
import { Blob } from "./Decor";
import { RevealOnce } from "./RevealOnce";

type Props = {
  id: string;
  fx: 1 | 2 | 3;
  title: string;
  text: string;
  cta: { label: string; href: string; variant: DotVariant };
  image: { src: string | StaticImageData; width: number; height: number; alt: string; maxWidth: number };
  reverse?: boolean;
  blobStyle: CSSProperties;
  decor?: ReactNode;
};

/**
 * Sección de la landing: ilustración con parallax sobre una mancha verde + tarjeta blanca
 * que entra una sola vez al aparecer en pantalla.
 */
export function FeatureSection({ id, fx, title, text, cta, image, reverse, blobStyle, decor }: Props) {
  const m = `var(--m${fx}, 0.5)`;

  const art = (
    <div className="relative z-[1] min-w-0 flex-[1_1_460px]" style={{ transform: `translateY(calc((0.5 - ${m}) * 90px))` }}>
      <Image src={image.src} width={image.width} height={image.height} alt={image.alt} className="mx-auto h-auto w-full" style={{ maxWidth: image.maxWidth }} />
    </div>
  );

  const card = (
    <div className="relative z-[2] flex min-w-0 flex-[1_1_420px] justify-center">
      <RevealOnce className="w-full max-w-[560px]">
        <div className="flex flex-col gap-[22px] rounded-tarjeta bg-white px-6 py-9 sm:px-12 sm:py-[52px]">
          <h2 className="text-[clamp(36px,3.6vw,53px)] leading-[1.05] font-medium tracking-[-0.04em]">{title}</h2>
          <p className="text-lg leading-relaxed">{text}</p>
          <DotButton href={cta.href} variant={cta.variant} className="self-start">
            {cta.label}
          </DotButton>
        </div>
      </RevealOnce>
    </div>
  );

  return (
    <section
      id={id}
      data-fx={fx}
      className={`relative mx-auto flex max-w-[1296px] items-center gap-14 px-6 pt-20 pb-[120px] ${reverse ? "flex-wrap-reverse" : "flex-wrap"}`}
    >
      <Blob style={{ ...blobStyle, transform: `${blobStyle.transform ?? ""} translateY(calc((0.5 - ${m}) * -70px))` }} />
      {decor}
      {reverse ? (
        <>
          {card}
          {art}
        </>
      ) : (
        <>
          {art}
          {card}
        </>
      )}
    </section>
  );
}
