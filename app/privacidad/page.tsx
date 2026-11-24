import type { Metadata } from "next";
import Link from "next/link";
import { LEGAL } from "@/lib/site";
import { LegalPage, LegalSection, legalToc, Mail } from "../_legal/LegalPage";

export const metadata: Metadata = {
  title: "Aviso de privacidad",
  description: "Qué datos guarda givegifts, para qué los usa, cuánto tiempo los conserva y cómo ejercer tus derechos ARCO.",
  alternates: { canonical: "/privacidad" },
};

const { toc, section } = legalToc([
  { id: "responsable", title: "1. Quién es responsable de tus datos" },
  { id: "datos", title: "2. Qué datos recabamos" },
  { id: "finalidades", title: "3. Para qué usamos tus datos" },
  { id: "transferencias", title: "4. Con quién compartimos tus datos" },
  { id: "arco", title: "5. Tus derechos ARCO" },
  { id: "conservacion", title: "6. Cuánto tiempo guardamos tus datos" },
  { id: "seguridad", title: "7. Cómo protegemos tus datos" },
  { id: "cookies", title: "8. Cookies y almacenamiento en tu navegador" },
  { id: "cambios", title: "9. Cambios a este aviso" },
] as const);

export default function PrivacidadPage() {
  return (
    <LegalPage
      title="Aviso de privacidad"
      toc={toc}
      intro={
        <p>
          Este aviso explica qué datos personales usa givegifts, para qué y cómo puedes controlarlos, conforme a la Ley Federal de Protección de Datos
          Personales en Posesión de los Particulares (LFPDPPP) y su normativa aplicable. Lo escribimos claro a propósito: si algo no se entiende,
          escríbenos a <Mail />.
        </p>
      }
    >
      <LegalSection {...section("responsable")}>
        <p>
          <strong>{LEGAL.responsable}</strong> (en adelante, «givegifts»), con domicilio en {LEGAL.domicilio}, es responsable del uso y protección de
          tus datos personales. Para cualquier asunto de privacidad, el medio de contacto es <Mail />.
        </p>
      </LegalSection>

      <LegalSection {...section("datos")}>
        <p>Sólo pedimos lo necesario para que el intercambio funcione:</p>
        <ul>
          <li>
            <strong>Quien organiza:</strong> nombre y correo electrónico (o los que comparta tu cuenta de Google al entrar con ella). La contraseña la
            administra Firebase Authentication; nosotros nunca la vemos.
          </li>
          <li>
            <strong>Datos del intercambio:</strong> nombre, fecha, hora, lugar, presupuesto, mensaje y reglas que define quien organiza.
          </li>
          <li>
            <strong>Participantes:</strong> el nombre o apodo con el que se apuntan, o con el que quien organiza los agrega. No pedimos correo,
            teléfono ni cuenta a los participantes.
          </li>
          <li>
            <strong>Listas de deseos:</strong> títulos, links, imágenes, precios y notas que cada participante agrega.
          </li>
          <li>
            <strong>Mensajes del buzón anónimo</strong> entre quien regala y quien recibe.
          </li>
          <li>
            <strong>Datos técnicos:</strong> cookies de sesión y de dispositivo (ver sección 8) y los registros que generan nuestros proveedores de
            infraestructura (por ejemplo, dirección IP y navegador) por seguridad.
          </li>
        </ul>
        <p>
          No solicitamos datos personales sensibles. Te pedimos no escribirlos en listas, notas ni mensajes. Si agregas a otra persona como
          participante, asegúrate de que esté de acuerdo en que usemos su nombre para el intercambio.
        </p>
      </LegalSection>

      <LegalSection {...section("finalidades")}>
        <p>Finalidades necesarias para darte el servicio:</p>
        <ul>
          <li>Crear y administrar tu cuenta de organizador y tu sesión.</li>
          <li>Crear el intercambio, registrar a los participantes y hacer el sorteo secreto.</li>
          <li>Mostrar a cada persona su link personal, su lista, la lista de la persona a quien le regala y el buzón anónimo.</li>
          <li>Prevenir abusos, resolver fallas y mantener la seguridad del servicio.</li>
          <li>Atender tus dudas y solicitudes de derechos ARCO.</li>
        </ul>
        <p>
          No usamos tus datos para publicidad, no los vendemos y no tenemos finalidades secundarias. Si algún día las hubiera, actualizaremos este
          aviso y te daremos la opción de negarte antes de usarlos así.
        </p>
      </LegalSection>

      <LegalSection {...section("transferencias")}>
        <p>
          No transferimos tus datos personales a terceros para sus propios fines. Para operar, los alojamos con proveedores que actúan como
          encargados, es decir, que sólo los tratan siguiendo nuestras instrucciones:
        </p>
        <ul>
          <li>
            <strong>Google (Firebase y Google Cloud):</strong> base de datos, autenticación y almacenamiento. Sus servidores pueden estar fuera de
            México.
          </li>
          <li>
            <strong>Vercel:</strong> alojamiento del sitio y métricas de uso agregadas.
          </li>
        </ul>
        <p>
          Dentro del intercambio, otros participantes ven tu nombre, y quien te tocó en el sorteo ve tu lista de deseos. Quien organiza ve los
          nombres del grupo y el avance. Sólo compartiríamos datos con autoridades cuando una ley o una orden competente nos obligue.
        </p>
        <p>
          Cuando pegas el link de un producto, nuestro servidor visita esa página para leer su título, imagen y precio. A la tienda no le enviamos
          datos tuyos.
        </p>
      </LegalSection>

      <LegalSection {...section("arco")}>
        <p>
          Tienes derecho a <strong>Acceder</strong> a tus datos, <strong>Rectificarlos</strong> si son inexactos, <strong>Cancelarlos</strong>{" "}
          cuando consideres que no se necesitan y <strong>Oponerte</strong> a su uso para fines específicos. También puedes revocar tu
          consentimiento o pedir que limitemos el uso de tus datos.
        </p>
        <p>Para ejercerlos, escribe a <Mail /> con:</p>
        <ul>
          <li>Tu nombre y un medio para responderte.</li>
          <li>Qué derecho quieres ejercer y sobre qué datos.</li>
          <li>
            El link de tu intercambio o de tu página personal (o el correo de tu cuenta, si organizas), para poder ubicar tus datos. Si actúas en
            nombre de otra persona, un documento que acredite tu representación.
          </li>
        </ul>
        <p>
          Te responderemos en un plazo máximo de 20 días hábiles y, si procede, haremos el cambio dentro de los 15 días hábiles siguientes. Si no
          quedas conforme con la respuesta, puedes acudir a la autoridad de protección de datos personales competente.
        </p>
      </LegalSection>

      <LegalSection {...section("conservacion")}>
        <p>
          Los datos de cada intercambio (participantes, listas, sorteo y mensajes del buzón) se borran <strong>{LEGAL.retentionDays} días después
          de la fecha del evento</strong>. Los datos de tu cuenta de organizador se conservan mientras la tengas; puedes pedirnos borrarla en
          cualquier momento. Algunos registros técnicos de seguridad pueden conservarse por el tiempo que fije cada proveedor.
        </p>
      </LegalSection>

      <LegalSection {...section("seguridad")}>
        <p>
          Toda la información viaja cifrada (HTTPS) y sólo nuestro servidor puede leer la base de datos. Los links personales son aleatorios y
          funcionan como una llave: no los compartas, porque quien tenga tu link puede entrar a tu página del intercambio.
        </p>
      </LegalSection>

      <LegalSection {...section("cookies")}>
        <p>No usamos cookies de publicidad ni de rastreo entre sitios. Sólo usamos:</p>
        <ul>
          <li>
            <strong>Cookie de sesión</strong> (<code>__session</code>): mantiene abierta la sesión de quien organiza hasta por 14 días.
          </li>
          <li>
            <strong>Cookie de dispositivo</strong> (<code>gg_p_…</code>): recuerda en este navegador tu link personal de un intercambio para que no
            tengas que volver a apuntarte. Dura hasta un año.
          </li>
          <li>
            <strong>Almacenamiento local:</strong> guarda en tu navegador la lista de intercambios que abriste para mostrarlos en «Mis
            intercambios», y Firebase guarda ahí los datos de inicio de sesión.
          </li>
        </ul>
        <p>Puedes borrarlas desde la configuración de tu navegador; si lo haces, tendrás que volver a entrar o abrir tu link personal.</p>
      </LegalSection>

      <LegalSection {...section("cambios")}>
        <p>
          Si cambiamos este aviso, publicaremos la nueva versión en esta página con su fecha de actualización. Si el cambio es importante, también
          lo avisaremos dentro de la app. Consulta también nuestros <Link href="/terminos" className="underline underline-offset-4">términos de uso</Link>.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
