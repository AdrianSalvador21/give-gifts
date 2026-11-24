import Image from "next/image";
import Link from "next/link";
import { Cloud, Dot, LogoMark, Squiggle, VerticalSquiggle } from "@/components/landing/Decor";
import { FeatureSection } from "@/components/landing/FeatureSection";
import { Nav } from "@/components/landing/Nav";
import { ScrollFx } from "@/components/landing/ScrollFx";
import { DotButton } from "@/components/ui/DotButton";
import { AvatarStack, Eyebrow, type AvatarColor } from "@/components/ui/primitives";
import { t } from "@/lib/i18n";
import { CONTACT_EMAIL } from "@/lib/site";

const SHEET_ID = "gg-sheet";

/** Mismo `sizes` en las dos copias de la ilustración del hero (móvil / lg) para que el navegador baje un solo archivo. */
const HERO_SIZES = "(min-width: 1024px) 620px, 88vw";

/** Pila decorativa del hero (aria-hidden): sólo ilustra el grupo. */
const HERO_PEOPLE: { name: string; color: AvatarColor }[] = [
  { name: "A M", color: "sol" },
  { name: "L P", color: "cielo" },
  { name: "J R", color: "coral" },
];

const FOOTER_LINKS = [
  { href: "#pasos", label: t("nav.how") },
  { href: "/privacidad", label: t("landing.footer.privacy") },
  { href: "/terminos", label: t("landing.footer.terms") },
  { href: `mailto:${CONTACT_EMAIL}`, label: t("landing.footer.contact") },
];

const FOOTER_LINK = "inline-flex min-h-11 items-center px-3 underline decoration-gris underline-offset-[6px] hover:decoration-tinta";

/** «Ponle nombre a tu intercambio» → /crear?nombre=… (funciona sin JS). */
function NameForm({ id, ink, className = "" }: { id: string; ink?: boolean; className?: string }) {
  return (
    <form action="/crear" method="get" className={`flex flex-wrap gap-3 ${className}`}>
      <label htmlFor={id} className="sr-only">
        {t("landing.intro.inputLabel")}
      </label>
      <input
        id={id}
        name="nombre"
        maxLength={60}
        placeholder={t("landing.intro.inputPlaceholder")}
        className={`h-[68px] min-w-0 flex-[1_1_280px] rounded-boton border-2 bg-white px-[22px] text-lg font-medium outline-none placeholder:font-normal placeholder:text-gris focus:border-tinta ${
          ink ? "border-tinta" : "border-arena"
        }`}
      />
      <DotButton type="submit" variant={ink ? "tinta" : "blanco"} size="lg" ink={ink}>
        {t("landing.intro.cta")}
      </DotButton>
    </form>
  );
}

const STEPS = [
  { n: 1, title: t("landing.steps.s1Title"), text: t("landing.steps.s1Text"), alt: t("landing.steps.s1Alt"), src: "/illustrations/web/06-crear.webp", w: 790, h: 635, badge: "bg-pasto" },
  { n: 2, title: t("landing.steps.s2Title"), text: t("landing.steps.s2Text"), alt: t("landing.steps.s2Alt"), src: "/illustrations/web/07-invitar.webp", w: 845, h: 612, badge: "bg-sol" },
  { n: 3, title: t("landing.steps.s3Title"), text: t("landing.steps.s3Text"), alt: t("landing.steps.s3Alt"), src: "/illustrations/web/09-revelacion.webp", w: 692, h: 669, badge: "bg-coral" },
];

export default function LandingPage() {
  return (
    <div className="overflow-x-clip bg-crema">
      <ScrollFx sheetId={SHEET_ID} />
      <Nav sheetId={SHEET_ID} />

      {/* HERO: verde, fijo; se oscurece mientras la hoja crema sube. En lg, texto | ilustración en rejilla. */}
      <section className="sticky top-0 z-[1] flex h-dvh min-h-[600px] flex-col items-center overflow-clip bg-pasto px-6 pt-[clamp(104px,16dvh,160px)] text-center lg:min-h-[720px] lg:justify-center lg:bg-puntos lg:pt-[104px] lg:pb-12 lg:text-left">
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-noche" style={{ opacity: "calc(var(--hero, 0) * 0.32)" }} />
        <Cloud className="top-[22%] left-[4%] animate-drift lg:top-[86%] lg:left-[3%]" />
        <Cloud width={200} className="top-[16%] right-[6%] animate-drift [animation-delay:-4s] lg:top-[12%]" />
        <Squiggle className="top-[44%] right-[14%] animate-sway lg:top-[78%] lg:right-[44%]" />
        <Dot color="#2BA0FF" className="top-[52%] left-[18%] animate-bob lg:top-[90%] lg:left-[34%]" />
        <Dot color="#FF705D" size={16} className="top-[28%] right-[28%] animate-bob-lento" />
        <div className="relative mx-auto flex w-full max-w-[1248px] flex-col items-center lg:grid lg:grid-cols-[1.05fr_1fr] lg:items-center lg:gap-12">
          <div className="flex flex-col items-center gap-[22px] lg:items-start lg:gap-6" style={{ transform: "translateY(calc(var(--hero, 0) * -60px))" }}>
            <Eyebrow className="hidden lg:block">{t("landing.hero.eyebrow")}</Eyebrow>
            <h1
              className="text-[clamp(64px,11vw,152px)] leading-[0.92] font-medium tracking-[-0.06em] lg:-mt-2 lg:text-[clamp(76px,7.4vw,124px)] lg:leading-[0.9]"
              style={{ transform: "translateY(calc(var(--hero, 0) * -30px)) scale(calc(1 - var(--hero, 0) * 0.06))" }}
            >
              {t("landing.hero.titleLine1")}
              <br />
              {t("landing.hero.titleLine2")}
            </h1>
            <p className="text-[clamp(20px,2vw,27px)] font-medium tracking-[-0.03em] text-balance">{t("landing.hero.subtitle")}</p>
            {/* Móvil: CTA visible sin hacer scroll (I10). */}
            <DotButton href="/crear" variant="blanco" ink dotClassName="bg-coral" className="mt-1 lg:hidden">
              {t("landing.hero.cta")}
            </DotButton>
            {/* Escritorio: la acción principal (ponerle nombre) sube al hero. */}
            <NameForm id="gg-nombre-hero" ink className="mt-3 hidden w-full max-w-[600px] lg:flex" />
            <div className="hidden items-center gap-3 lg:flex">
              <AvatarStack people={HERO_PEOPLE} size={36} />
              <span className="text-[15px] font-medium">{t("landing.hero.proof")}</span>
            </div>
          </div>
          <Image
            src="/illustrations/web/01-hero-v2.webp"
            width={1012}
            height={807}
            alt=""
            sizes={HERO_SIZES}
            fetchPriority="high"
            className="hidden h-auto w-full max-w-[620px] animate-bob-lento justify-self-center lg:block"
          />
        </div>
      </section>

      {/* HOJA crema */}
      <main id={SHEET_ID} className="relative z-[2] rounded-t-[36px] bg-crema lg:rounded-t-hoja">
        {/* Móvil: Regalitos cargando el regalo, casi completos sobre el hero. En lg viven dentro del hero. */}
        <div
          aria-hidden
          className="pointer-events-none absolute right-[max(8px,calc(50%-640px))] z-[3] w-(--hero-art) [--hero-art:min(560px,88vw,calc(80dvh-200px))] [--hero-overlap:28px] lg:hidden"
          style={{ top: "calc(var(--hero-art) * -0.797 + var(--hero-overlap))" }}
        >
          <Image src="/illustrations/web/01-hero-v2.webp" width={1012} height={807} alt="" sizes={HERO_SIZES} fetchPriority="high" className="h-auto w-full animate-bob-lento" />
        </div>

        {/* Intro + nombre del intercambio */}
        <section className="relative z-[4] mx-auto max-w-[1296px] px-6 pt-[72px] pb-[72px] lg:pt-[96px]">
          <div className="flex max-w-[620px] flex-col gap-9">
            <p className="text-[clamp(24px,2.4vw,33px)] leading-[1.2] font-medium tracking-[-0.03em]">{t("landing.intro.text")}</p>
            <NameForm id="gg-nombre" className="lg:hidden" />
          </div>
        </section>

        {/* TRES PASOS */}
        <section id="pasos" className="mx-auto flex max-w-[1296px] flex-col gap-12 px-6 pt-10 pb-[120px]">
          <h2 className="text-[clamp(44px,5.6vw,81px)] leading-none font-medium tracking-[-0.05em]">
            {t("landing.steps.titleLine1")}
            <br />
            {t("landing.steps.titleLine2")}
          </h2>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(300px,100%),1fr))] gap-5">
            {STEPS.map((s) => (
              <div key={s.n} className="flex flex-col gap-3.5 rounded-panel bg-white p-7 transition-transform hover:-translate-y-1.5 hover:-rotate-1">
                <Image src={s.src} width={s.w} height={s.h} alt={s.alt} className="h-[220px] w-full object-contain" />
                <span className={`self-start rounded-full px-3 py-1.5 text-sm font-medium ${s.badge}`}>{t("landing.steps.badge", { n: s.n })}</span>
                <h3 className="text-[30px] leading-[1.1] font-medium tracking-[-0.03em]">{s.title}</h3>
                <p className="text-[17px] leading-normal text-gris">{s.text}</p>
              </div>
            ))}
          </div>
        </section>

        <FeatureSection
          id="como"
          fx={1}
          title={t("landing.draw.title")}
          text={t("landing.draw.text")}
          cta={{ label: t("landing.draw.cta"), href: "/crear", variant: "coral" }}
          image={{ src: "/illustrations/web/02-sorteo.webp", width: 823, height: 720, alt: t("landing.draw.alt"), maxWidth: 560 }}
          blobStyle={{ left: "-14%", top: -40, width: "68%" }}
          decor={<Cloud width={180} className="top-[30px] left-[44%] z-[1] animate-drift" />}
        />
        <FeatureSection
          id="listas"
          fx={2}
          reverse
          title={t("landing.lists.title")}
          text={t("landing.lists.text")}
          cta={{ label: t("landing.lists.cta"), href: "/crear", variant: "sol" }}
          image={{ src: "/illustrations/web/03-lista.webp", width: 1143, height: 674, alt: t("landing.lists.alt"), maxWidth: 620 }}
          blobStyle={{ right: "-12%", top: -60, width: "64%", transform: "scaleX(-1)" }}
          decor={<VerticalSquiggle className="top-[70px] left-[46%] z-[1] animate-sway" />}
        />
        <FeatureSection
          id="secreto"
          fx={3}
          title={t("landing.secret.title")}
          text={t("landing.secret.text")}
          cta={{ label: t("landing.secret.cta"), href: "/crear", variant: "cielo" }}
          image={{ src: "/illustrations/web/04-secreto.webp", width: 928, height: 542, alt: t("landing.secret.alt"), maxWidth: 580 }}
          blobStyle={{ left: "-10%", top: -20, width: "62%", transform: "rotate(18deg)" }}
          decor={<Dot color="#2BA0FF" size={26} className="top-[90px] left-[48%] z-[1] animate-bob" />}
        />

        {/* FIESTA */}
        <section aria-hidden className="relative mx-auto mt-10 max-w-[1296px] px-6">
          <Cloud width={300} className="top-[30px] left-[2%] animate-drift" />
          <Cloud width={220} className="top-[120px] right-[2%] animate-drift [animation-delay:-5s]" />
          <Image src="/illustrations/web/05-fiesta.webp" width={1200} height={802} alt="" className="relative mx-auto -mb-1.5 h-auto w-full max-w-[920px]" />
        </section>

        {/* CTA FINAL */}
        <section className="mx-4 mt-16 flex flex-col items-center gap-8 rounded-hoja bg-pasto sm:mt-24 px-6 pt-20 pb-[120px] text-center">
          <h2 className="text-[clamp(40px,9vw,130px)] leading-[0.95] font-medium tracking-[-0.06em]">
            {t("landing.final.titleLine1")}
            <br />
            {t("landing.final.titleLine2")}
          </h2>
          <p className="max-w-[640px] text-[clamp(20px,2vw,28px)] leading-tight font-medium tracking-[-0.02em]">{t("landing.final.text")}</p>
          <DotButton href="/crear" variant="blanco" size="lg">
            {t("landing.final.cta")}
          </DotButton>
          <div className="mt-12 grid w-full max-w-[1000px] grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-6 text-xl font-medium">
            <span>{t("landing.final.f1")}</span>
            <span>{t("landing.final.f2")}</span>
            <span>{t("landing.final.f3")}</span>
          </div>
        </section>

        {/* FOOTER */}
        <footer className="mx-auto flex max-w-[1296px] flex-wrap items-center justify-between gap-x-6 gap-y-3 px-6 pt-14 pb-16">
          <Link href="/" className="flex min-h-11 items-center gap-2.5 no-underline">
            <LogoMark />
            <span className="text-[28px] font-medium tracking-[-0.04em]">{t("brand.name")}</span>
          </Link>
          <nav aria-label={t("nav.footer")} className="-mx-3 flex flex-wrap text-base">
            {FOOTER_LINKS.map((l) =>
              l.href.startsWith("mailto:") ? (
                <a key={l.href} href={l.href} className={FOOTER_LINK}>
                  {l.label}
                </a>
              ) : (
                <Link key={l.href} href={l.href} className={FOOTER_LINK}>
                  {l.label}
                </Link>
              ),
            )}
          </nav>
          <span className="w-full text-sm text-gris">{t("brand.madeIn")}</span>
        </footer>
      </main>

    </div>
  );
}
