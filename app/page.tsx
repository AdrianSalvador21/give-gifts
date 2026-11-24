import Image from "next/image";
import Link from "next/link";
import { Cloud, Dot, Squiggle, VerticalSquiggle } from "@/components/landing/Decor";
import { FeatureSection } from "@/components/landing/FeatureSection";
import { Nav } from "@/components/landing/Nav";
import { ScrollFx } from "@/components/landing/ScrollFx";
import { ArrowIcon } from "@/components/ui/icons";
import { DotButton } from "@/components/ui/DotButton";
import { t } from "@/lib/i18n";

const SHEET_ID = "gg-sheet";

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

      {/* HERO: verde, fijo; se oscurece mientras la hoja crema sube */}
      <section className="sticky top-0 z-[1] flex h-dvh min-h-[600px] flex-col items-center justify-start gap-[22px] overflow-clip bg-pasto px-6 pt-[clamp(112px,20dvh,190px)] text-center lg:min-h-[720px] lg:justify-center lg:pt-[110px] lg:pb-[300px]">
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-noche" style={{ opacity: "calc(var(--hero, 0) * 0.32)" }} />
        <Cloud className="top-[22%] left-[4%] animate-drift" />
        <Cloud width={200} className="top-[16%] right-[6%] animate-drift [animation-delay:-4s]" />
        <Squiggle className="top-[44%] right-[14%] animate-sway" />
        <Dot color="#2BA0FF" className="top-[52%] left-[18%] animate-bob" />
        <Dot color="#FF705D" size={16} className="top-[28%] right-[28%] animate-bob-lento" />
        <h1
          className="relative text-[clamp(64px,11vw,152px)] leading-[0.92] font-medium tracking-[-0.06em]"
          style={{ transform: "translateY(calc(var(--hero, 0) * -90px)) scale(calc(1 - var(--hero, 0) * 0.06))" }}
        >
          {t("landing.hero.titleLine1")}
          <br />
          {t("landing.hero.titleLine2")}
        </h1>
        <p className="relative text-[clamp(20px,2vw,27px)] font-medium tracking-[-0.03em]" style={{ transform: "translateY(calc(var(--hero, 0) * -60px))" }}>
          {t("landing.hero.subtitle")}
        </p>
      </section>

      {/* HOJA crema */}
      <main id={SHEET_ID} className="relative z-[2] rounded-t-[36px] bg-crema lg:rounded-t-hoja">
        {/* Regalitos cargando el regalo: en escritorio cruzan del hero a la hoja; en móvil quedan casi completos sobre el hero. */}
        <div
          aria-hidden
          className="pointer-events-none absolute right-[max(8px,calc(50%-640px))] z-[3] w-(--hero-art) [--hero-art:min(660px,92vw,calc(80dvh-140px))] [--hero-overlap:28px] lg:[--hero-overlap:56px]"
          style={{ top: "calc(var(--hero-art) * -0.797 + var(--hero-overlap))" }}
        >
          <Image src="/illustrations/web/01-hero-v2.webp" width={1012} height={807} alt="" priority className="h-auto w-full animate-bob-lento" />
        </div>

        {/* Intro + nombre del intercambio */}
        <section className="relative z-[4] mx-auto max-w-[1296px] px-6 pt-[72px] pb-[120px] lg:pt-[96px]">
          <div className="flex max-w-[620px] flex-col gap-9">
            <p className="text-[clamp(24px,2.4vw,33px)] leading-[1.2] font-medium tracking-[-0.03em]">{t("landing.intro.text")}</p>
            <form action="/crear" method="get" className="flex flex-wrap gap-3">
              <label htmlFor="gg-nombre" className="sr-only">
                {t("landing.intro.inputLabel")}
              </label>
              <input
                id="gg-nombre"
                name="nombre"
                maxLength={60}
                placeholder={t("landing.intro.inputPlaceholder")}
                className="h-[68px] min-w-0 flex-[1_1_280px] rounded-boton border-2 border-arena bg-white px-[22px] text-lg font-medium outline-none placeholder:font-normal placeholder:text-gris focus:border-tinta"
              />
              <DotButton type="submit" variant="blanco" size="lg">
                {t("landing.intro.cta")}
              </DotButton>
            </form>
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
        <footer className="mx-auto flex max-w-[1296px] flex-wrap items-center justify-between gap-6 px-6 pt-14 pb-16">
          <span className="text-[28px] font-medium tracking-[-0.04em]">{t("brand.name")}</span>
          <nav aria-label={t("nav.footer")} className="flex flex-wrap gap-7 text-base">
            {(["guides", "faq", "privacy", "terms", "contact"] as const).map((k) => (
              <Link key={k} href="#" className="border-b border-gris">
                {t(`landing.footer.${k}`)}
              </Link>
            ))}
          </nav>
          <span className="w-full text-sm text-gris">{t("brand.madeIn")}</span>
        </footer>
      </main>

      <Link href="/crear" aria-label={t("nav.create")} className="fixed right-4 bottom-4 z-40 grid size-14 place-items-center rounded-full bg-coral shadow-none sm:hidden">
        <ArrowIcon size={20} />
      </Link>
    </div>
  );
}
