import { LegalPage, LEGAL_EMAIL, LEGAL_NAME } from '@/components/legal';

export const metadata = { title: 'Términos de uso' };

export default function Terminos() {
  return (
    <LegalPage title="Términos de uso" updated="octubre de 2026">
      <h2>1. El servicio</h2>
      <p>OpenGym es una herramienta de gestión para centros deportivos, ofrecida por {LEGAL_NAME} de forma gratuita y «tal cual», sin garantía de disponibilidad continua. Puede haber interrupciones, límites de uso por gimnasio (por ejemplo, un máximo de socios) y cambios.</p>
      <h2>2. Responsabilidad del gimnasio</h2>
      <p>El gimnasio es responsable de la información que introduce, de informar y, cuando proceda, obtener el consentimiento de sus socios, de emitir sus facturas conforme a la normativa fiscal que le aplique y de custodiar las credenciales de su equipo. Los recibos que genera la herramienta son comprobantes de pago; el gimnasio debe confirmar con su gestor el tratamiento fiscal que le corresponde.</p>
      <h2>3. Uso aceptable</h2>
      <p>Prohibido el uso ilícito, el intento de acceder a datos de otros gimnasios, la sobrecarga del servicio y las altas automatizadas o falsas. Podemos suspender un gimnasio que incumpla estos términos.</p>
      <h2>4. Copias de seguridad y baja</h2>
      <p>Hacemos esfuerzos razonables por conservar los datos, pero el gimnasio debe exportar la información que considere crítica (por ejemplo, el CSV mensual de cobros). Puede solicitar su baja en {LEGAL_EMAIL}.</p>
      <h2>5. Contrato de encargado del tratamiento (art. 28 RGPD)</h2>
      <p>Respecto a los datos personales de socios y entrenadores, el gimnasio es el responsable del tratamiento y OpenGym el encargado. OpenGym se compromete a:</p>
      <ul>
        <li>tratar los datos únicamente para prestar el servicio y siguiendo las instrucciones del gimnasio;</li>
        <li>garantizar la confidencialidad del personal con acceso y aplicar medidas de seguridad adecuadas (aislamiento de datos entre gimnasios, cifrado en tránsito, control de acceso);</li>
        <li>recurrir únicamente a los subencargados necesarios (Supabase, Vercel, Cloudflare y el proveedor de correo);</li>
        <li>asistir al gimnasio en el ejercicio de los derechos de los interesados y notificar sin dilación indebida cualquier brecha de seguridad que le afecte;</li>
        <li>al terminar el servicio, eliminar o devolver los datos, salvo obligación legal de conservarlos.</li>
      </ul>
      <h2>6. Limitación de responsabilidad y ley aplicable</h2>
      <p>En la medida permitida por la ley, el servicio gratuito se presta sin garantías y {LEGAL_NAME} no responde de daños indirectos ni de la pérdida de datos. Estos términos se rigen por la ley española.</p>
    </LegalPage>
  );
}
