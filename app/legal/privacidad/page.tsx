import { LegalPage, LEGAL_EMAIL, LEGAL_NAME } from '@/components/legal';

export const metadata = { title: 'Política de privacidad' };

export default function Privacidad() {
  return (
    <LegalPage title="Política de privacidad" updated="octubre de 2026">
      <h2>1. Quién trata tus datos</h2>
      <p>Esta política distingue dos situaciones. <strong>Del administrador de cada gimnasio</strong> (nombre, email, datos del centro, ubicación aproximada del alta) es responsable {LEGAL_NAME} (contacto: {LEGAL_EMAIL}). <strong>De los socios y entrenadores de cada gimnasio</strong> es responsable el propio gimnasio; OpenGym actúa como encargado del tratamiento (ver Términos, apartado 5).</p>
      <h2>2. Qué datos recogemos</h2>
      <ul>
        <li>Del administrador: nombre, email, datos del gimnasio y contraseña (almacenada cifrada por el proveedor de autenticación; nosotros no la vemos).</li>
        <li>Del alta: país, región y ciudad aproximados deducidos de la conexión, y una huella irreversible de la IP para limitar altas masivas. No guardamos la IP en claro.</li>
        <li>Por cuenta de cada gimnasio: datos de socios y entrenadores, asistencia, pesos de entrenamiento, peso corporal, cobros y recibos. El peso corporal puede considerarse dato relativo a la salud: cada gimnasio debe tener base legal para tratarlo.</li>
      </ul>
      <h2>3. Para qué y con qué base</h2>
      <p>Prestar el servicio solicitado (ejecución del contrato), mantener la seguridad y prevenir abusos (interés legítimo) y cumplir obligaciones legales.</p>
      <h2>4. Con quién lo compartimos</h2>
      <p>Con proveedores necesarios para operar: Supabase (base de datos y autenticación), Vercel (alojamiento), Cloudflare (verificación anti-bots) y el proveedor de correo electrónico. No vendemos datos ni los usamos para publicidad.</p>
      <h2>5. Cuánto tiempo</h2>
      <p>Mientras el gimnasio mantenga su cuenta. Al darla de baja, los datos se eliminan o se devuelven al gimnasio, salvo lo que la ley obligue a conservar. Las solicitudes de alta sin verificar se borran a las 24 horas.</p>
      <h2>6. Tus derechos</h2>
      <p>Acceso, rectificación, supresión, oposición, limitación y portabilidad. Los socios deben dirigirse a su gimnasio; los administradores, a {LEGAL_EMAIL}. También puedes reclamar ante la Agencia Española de Protección de Datos (aepd.es).</p>
    </LegalPage>
  );
}
