# OpenGym

Sistema de gestión gratuito para centros deportivos, multicentro: cualquier administrador crea su gimnasio desde la web y lo usa en
`tu-dominio/nombre-del-gimnasio`. Socios y cobros con IVA, actividades con aforo y horario por zonas, rutinas con modo presentación,
progreso y peso corporal, recibos en PDF por email. Los datos de cada gimnasio están aislados por reglas de seguridad en la base de datos.

Next.js 16 · React 19 · Tailwind 4 · Supabase (Auth + Postgres con RLS) · Vercel · Cloudflare Turnstile · SMTP/Resend.

## Cómo funciona

| Quién | Dónde | Qué hace |
|---|---|---|
| Visitante | `/` | Portada y acceso por código de gimnasio |
| Futuro administrador | `/crear-gimnasio` | Formulario de alta → email de verificación → `/verificar` crea el gimnasio |
| Administrador, entrenador, socio | `/<código>` | Acceso (usuario o email). Redirige a `/<código>/admin`, `/coach` o `/me` |
| Propietario de la plataforma | `/superadmin` | Gimnasios, altas por día, desde dónde se registraron, uso de la base de datos, suspender y límites |

Un solo proyecto de Supabase aloja todos los gimnasios (`gym_id` + RLS). El panel del propietario solo muestra recuentos y datos del
gimnasio; nunca nombres de socios, pesos ni importes.

## Puesta en marcha (todo en planes gratuitos)

### 1. Supabase
1. Crea un proyecto en supabase.com. Para producción usa uno distinto del de pruebas (el plan gratuito permite dos).
2. **SQL Editor**: ejecuta, en este orden y una vez cada una: `0000_base_schema.sql`, `0001_hardening_and_features.sql`,
   `0002_billing_first_of_month.sql`, `0003_platform.sql`. (`0009_drop_legacy_password.sql` es solo para migrar el proyecto antiguo.)
   No repitas la 0001 después de las demás: se niega a ejecutarse para no deshacer la seguridad.
3. **Authentication → Sign In / Providers**: deja activado *Email* y **desactiva «Allow new users to sign up»** (las cuentas las crea
   el servidor) y «Confirm email».
4. **Authentication → Users → Add user**: crea tu cuenta de propietario (email real, contraseña larga, *Auto Confirm User*).
5. **Project Settings → API**: copia la URL, `anon` y `service_role`.

### 2. Cloudflare Turnstile (anti-bots, gratis)
dash.cloudflare.com → Turnstile → *Add site* (dominio de tu Vercel) → copia la *site key* y la *secret key*. Sin ellas, en producción
el formulario de alta queda desactivado a propósito.

### 3. Correo
Gratis y sin dominio propio: SMTP de Gmail. Activa la verificación en dos pasos y crea una *contraseña de aplicación*
(myaccount.google.com → Seguridad). Límite orientativo de Gmail: unos 500 correos al día.

### 4. GitHub y Vercel
1. Sube el proyecto a GitHub (el `.gitignore` ya excluye `.env*`). **Revisa antes `git status`: no debe aparecer ningún `.env.local`.**
2. En vercel.com → *Add New → Project* → importa el repositorio.
3. En *Environment Variables* añade todas las de `.env.example` (rellena `NEXT_PUBLIC_SITE_URL` con la URL que te asigne Vercel y
   `SUPERADMIN_EMAILS` con tu email). Despliega.
4. Abre `https://tu-url/crear-gimnasio` y crea un gimnasio de prueba para comprobar el recorrido completo.

### 5. Mantenimiento automático (GitHub Actions)
En el repositorio → *Settings → Secrets and variables → Actions*:
- **Variables**: `SITE_URL` = tu URL pública. Activa `keepalive.yml` (llama a `/api/health` cada día para que Supabase no pause el proyecto).
- **Secretos**: `SUPABASE_DB_URL` (cadena de conexión *Session pooler* de Connect; las ejecuciones de GitHub son IPv4) y `BACKUP_PASSPHRASE`
  (frase larga que guardas tú). Activa `backup.yml`: copia diaria **cifrada**, 14 días. **Sin la frase no se puede restaurar: guárdala.**

## Límites del plan gratuito (a 2026)
Supabase: 500 MB de base de datos, 50.000 usuarios activos al mes, proyecto pausado tras una semana sin actividad y sin copias
diarias propias. Vercel Hobby: uso personal no comercial; si ofreces el servicio a terceros de forma sostenida o cobras, revisa sus
condiciones y valora el plan Pro. El panel `/superadmin` muestra el uso de la base de datos frente a los 500 MB.
Cada gimnasio tiene un límite de socios activos (150 por defecto) que puedes cambiar desde el panel.

## Seguridad: qué asumir
- `SUPABASE_SERVICE_ROLE_KEY` salta las reglas de seguridad: solo en el servidor (Vercel), nunca en el navegador ni en git.
- Un administrador no puede cambiar el código, el estado ni el límite de su gimnasio (permisos de columna en la base de datos).
- Un gimnasio suspendido pierde el acceso a sus datos también por la API.
- Altas: Turnstile + campo trampa + tiempo mínimo + límites por IP (hash), por email y globales + verificación de email. La contraseña
  no se guarda en las tablas de solicitudes.
- Recuperar contraseña: enlace de un solo uso y 1 hora; misma respuesta exista o no la cuenta.
- Rota las claves si alguna vez se subieron a git. Considera activar 2FA en Supabase, Vercel, GitHub y tu cuenta de propietario.

## Legal
Las páginas `/legal/privacidad` y `/legal/terminos` son **plantillas** (incluyen el contrato de encargado del tratamiento). Rellena
`NEXT_PUBLIC_LEGAL_NAME` y `NEXT_PUBLIC_LEGAL_EMAIL` y que un profesional las revise antes de abrir el servicio a terceros: los
gimnasios te confiarán datos personales de sus socios, y el peso corporal puede considerarse dato de salud. No es asesoramiento jurídico.

## Cobros: cómo funciona el vencimiento
Cada cuota es un mes natural y vence el día 1 del siguiente. No se prorratea el primer mes. Métodos: Bizum, Transferencia y Efectivo.
El IVA (tipo y si los precios lo incluyen) se configura en *Ajustes*; el 21 % es el tipo general para un gimnasio privado en España.
Los recibos son comprobantes de pago: confirma con tu gestor el tipo de factura y el IVA que te corresponden.

## Modo «Presentar» (entrenador)
Botón **Presentar** en cada rutina: pantalla completa con todos los ejercicios y un panel de pesos por alumno con el último peso en
gris. Si el peso sube se escribe y se actualiza; si no, se deja vacío y se conserva el anterior. Un peso menor se guarda como escrito.

## Desarrollo local
```bash
npm install
cp .env.example .env.local     # para probar sin Turnstile: ALLOW_SIGNUP_WITHOUT_CAPTCHA=true
npm run dev                    # http://localhost:3000
npm run typecheck && npm run lint && npm run build
```
`supabase/tests/` contiene las pruebas SQL (aislamiento entre gimnasios, cobros, permisos); ver su README.

## Migrar el proyecto antiguo (Forza)
`npm run migrate:users` (simulación) y `npm run migrate:users -- --apply` convierten los usuarios con contraseña en la tabla en cuentas
reales conservando su id; después `0009_drop_legacy_password.sql`. Para crear un gimnasio a mano: `npm run create:gym -- --help`.
