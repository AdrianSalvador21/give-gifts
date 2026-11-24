import Image, { type StaticImageData } from "next/image";
import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { ArrowIcon } from "@/components/ui/icons";
import { Blob } from "./Decor";
import { RevealOnce } from "./RevealOnce";

type Props = {
  id: string;
  fx: 1 | 2 | 3;
  title: string;
  text: string;
  /** Muestra del producto que va debajo del texto (ver FeatureSamples). */
  sample: ReactNode;
  /** Link de texto secundario: la CTA principal vive en el hero y en el cierre. */
  more: { label: string; href: string };
  image: { src: string | StaticImageData; width: number; height: number; alt: string; maxWidth: number };
  reverse?: boolean;
  blobStyle: CSSProperties;
  decor?: ReactNode;
};

/**
 * Sección de la landing: ilustración con parallax sobre una mancha verde + tarjeta blanca
 * (título, una línea, muestra del producto y link de texto) que entra una sola vez al aparecer en pantalla.
 */
export function FeatureSection({ id, fx, title, text, sample, more, image, reverse, blobStyle, decor }: Props) {
  const m = `var(--m${fx}, 0.5)`;

  const art = (
    <div className="relative z-[1] min-w-0 flex-[1_1_460px]" style={{ transform: `translateY(calc((0.5 - ${m}) * 90px))` }}>
      <Image src={image.src} width={image.width} height={image.height} alt={image.alt} className="mx-auto h-auto w-full" style={{ maxWidth: image.maxWidth }} />
    </div>
  );

  const card = (
    <div className="relative z-[2] flex min-w-0 flex-[1_1_420px] justify-center">
      <RevealOnce className="w-full max-w-[560px]">
        <div className="flex flex-col gap-5 rounded-tarjeta bg-white px-6 pt-9 pb-6 sm:px-12 sm:pt-[52px] sm:pb-9">
          <h2 className="text-[clamp(36px,3.6vw,53px)] leading-[1.05] font-medium tracking-[-0.04em]">{title}</h2>
          <p className="text-lg leading-normal">{text}</p>
          {sample}
          <Link
            href={more.href}
            className="group inline-flex min-h-11 items-center gap-1.5 self-start font-medium underline decoration-punteado underline-offset-[6px] hover:decoration-tinta"
          >
            {more.label}
            <ArrowIcon size={14} className="transition-transform duration-200 ease-rebote group-hover:translate-x-1" />
          </Link>
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
