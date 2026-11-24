import type { Metadata } from "next";
import Link from "next/link";
import { LEGAL } from "@/lib/site";
import { LegalPage, LegalSection, legalToc, Mail } from "../_legal/LegalPage";

export const metadata: Metadata = {
  title: "Términos de uso",
  description: "Las reglas para usar givegifts: quién puede usarlo, qué contenido se vale y qué responsabilidades tenemos.",
  alternates: { canonical: "/terminos" },
};

const { toc, section } = legalToc([
  { id: "servicio", title: "1. Qué es givegifts" },
  { id: "edad", title: "2. Quién puede usarlo" },
  { id: "cuenta", title: "3. Tu cuenta y tus links" },
  { id: "contenido", title: "4. Contenido que publican las personas usuarias" },
  { id: "garantia", title: "5. Sin garantía" },
  { id: "responsabilidad", title: "6. Limitación de responsabilidad" },
  { id: "datos", title: "7. Tus datos" },
  { id: "cambios", title: "8. Cambios y ley aplicable" },
] as const);

export default function TerminosPage() {
  return (
    <LegalPage
      title="Términos de uso"
      toc={toc}
      intro={
        <p>
          givegifts es una herramienta gratuita para organizar intercambios de regalos. Al crear una cuenta, organizar un intercambio o apuntarte a
          uno, aceptas estos términos. Los ofrece {LEGAL.responsable}. Si no estás de acuerdo, por favor no uses el servicio.
        </p>
      }
    >
      <LegalSection {...section("servicio")}>
        <p>
          givegifts te deja crear un intercambio, invitar a tu grupo con un link, hacer un sorteo secreto, compartir listas de deseos y mandar
          mensajes anónimos. No vendemos regalos ni intervenimos en las compras: los links a tiendas son de terceros y cada compra es un trato entre
          tú y esa tienda.
        </p>
      </LegalSection>

      <LegalSection {...section("edad")}>
        <ul>
          <li>Para crear una cuenta y organizar intercambios debes tener al menos 18 años.</li>
          <li>
            Las personas menores de edad sólo pueden participar en un intercambio con permiso y supervisión de su madre, padre o tutor, por ejemplo
            en un intercambio familiar o escolar organizado por un adulto.
          </li>
        </ul>
      </LegalSection>

      <LegalSection {...section("cuenta")}>
        <ul>
          <li>Eres responsable de lo que pase con tu cuenta de organizador. Usa una contraseña segura y no la compartas.</li>
          <li>
            Cada participante recibe un link personal que funciona como llave. Quien lo tenga puede entrar a esa página, así que no lo publiques ni
            lo reenvíes.
          </li>
          <li>Quien organiza se compromete a invitar sólo a personas que quieran participar y a usar sus nombres sólo para el intercambio.</li>
        </ul>
      </LegalSection>

      <LegalSection {...section("contenido")}>
        <p>
          Los nombres, listas de deseos, notas y mensajes del buzón los escriben las personas usuarias, y cada quien es responsable de lo que
          publica. No se vale usar givegifts para:
        </p>
        <ul>
          <li>Acosar, amenazar, discriminar o molestar a otras personas, aunque sea en el buzón anónimo.</li>
          <li>Publicar contenido ilegal, sexual explícito, violento o que infrinja derechos de terceros.</li>
          <li>Compartir datos personales de otras personas sin su permiso, o datos sensibles.</li>
          <li>Hacer spam, estafas, o intentar acceder a intercambios o links que no son tuyos.</li>
        </ul>
        <p>
          Podemos borrar contenido o suspender intercambios y cuentas que incumplan estas reglas. Para reportar algo, escríbenos a <Mail />.
        </p>
      </LegalSection>

      <LegalSection {...section("garantia")}>
        <p>
          Ofrecemos givegifts gratis y «tal cual». Hacemos lo posible para que funcione bien, pero no garantizamos que esté disponible siempre, que
          no tenga errores ni que los datos de productos leídos de tiendas (títulos, precios, imágenes) sean exactos. Podemos cambiar, pausar o
          dejar de ofrecer funciones en cualquier momento.
        </p>
      </LegalSection>

      <LegalSection {...section("responsabilidad")}>
        <p>
          En la medida en que la ley lo permita, givegifts no es responsable por regalos no entregados, compras hechas en tiendas de terceros,
          desacuerdos entre participantes, ni por daños indirectos derivados del uso del servicio o de su falta de disponibilidad. Nada de esto
          limita los derechos que te otorgan las leyes de protección al consumidor que no pueden renunciarse.
        </p>
      </LegalSection>

      <LegalSection {...section("datos")}>
        <p>
          Cómo usamos tus datos personales se explica en el <Link href="/privacidad" className="underline underline-offset-4">aviso de privacidad</Link>
          . Los datos de cada intercambio se borran {LEGAL.retentionDays} días después de la fecha del evento.
        </p>
      </LegalSection>

      <LegalSection {...section("cambios")}>
        <p>
          Podemos actualizar estos términos; la versión vigente siempre estará en esta página con su fecha. Si sigues usando givegifts después de un
          cambio, se entiende que lo aceptas. Estos términos se rigen por las leyes de los Estados Unidos Mexicanos. Para dudas, escríbenos a{" "}
          <Mail />.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
