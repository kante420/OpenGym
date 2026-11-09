# OpenGym 🏋️‍♂️

> **Software de gestión integral para centros deportivos, boxes de CrossFit, estudios de entrenamiento personal y artes marciales.**
> Multi-centro, sin suscripciones abusivas, diseñado para que cada gimnasio funcione de forma autónoma con su propia dirección y personalización.

---

## ⚡ ¿Qué es OpenGym?

**OpenGym** es una plataforma web moderna creada para simplificar el día a día de directores, entrenadores y socios. Permite a cualquier centro deportivo registrarse y disponer al instante de su propio entorno bajo una URL exclusiva (`tudominio.com/<nombre-gimnasio>`), con control total sobre socios, clases, cobros y entrenamientos.

A diferencia de los programas tradicionales lentos y complicados, OpenGym combina una interfaz ultra-rápida, modo de presentación en pantalla grande para las clases y diseño adaptable a móvil y ordenador.

---

## 🚀 Principales Módulos y Funcionalidades

### 1. 👥 Gestión de Socios y Asistencia
* **Altas y bajas rápidas:** Datos personales, contacto, DNI y estado del socio (al día, pendiente o vencido).
* **Control de acceso por roles:**
  * **Administración:** Control financiero, socios, profesores, horarios y ajustes del centro.
  * **Entrenadores:** Diseño de sesiones, pase de lista interactivo y control de marcas de alumnos.
  * **Socios:** Portal privado «Mi semana» para ver sus reservas, horarios, histórico de entrenamientos y recibos de pago.

### 2. 📋 Diseñador de Rutinas y Modo Presentación TV
* **Constructor por bloques:** Crea sesiones divididas en Calentamiento, Fuerza, WOD/Principal, Técnica o Vuelta a la calma con series y repeticiones.
* **Auto-registro en catálogo:** Escribe cualquier ejercicio nuevo y se añadirá solo al catálogo de tu centro para futuras sesiones.
* **Modo Pantalla Grande (`/<slug>/present/<id>`):** Proyecta la sesión en una televisión o proyector del box con alto contraste. Muestra las marcas anteriores de cada alumno y permite apuntar nuevos récords en vivo.
* **Historial y Reutilización:** Busca entre todas las rutinas creadas, duplícalas o reasígnalas a otro día o clase con un solo clic.

### 3. 💳 Cobros, Recibos en PDF e Informes Fiscales
* **Cuotas mensuales automáticas:** Control de pagos en efectivo, Bizum o transferencia.
* **Recibos profesionales en PDF:** Generación instantánea con el logotipo y datos fiscales de tu gimnasio.
* **Envío automático por email:** Cada socio puede recibir su recibo adjunto en PDF directamente en su correo.
* **Exportación a Excel / CSV:** Descarga informes contables con desglose de Base Imponible e IVA preparados para tu gestor.

### 4. 🎨 Identidad de Marca y Color Personalizado
* **Tu propio logo:** Sube el escudo o logotipo de tu centro; se adapta automáticamente en menús, recibos y pantalla de bienvenida.
* **Selector de paleta de colores:** Adapta la aplicación a los colores corporativos de tu gimnasio (Oro & Bronce, Azul Océano, Verde Esmeralda, Rojo Carmesí, Violeta Neón o Turquesa Ártico).

### 5. 📈 Progreso y Composición Corporal
* Registro de peso corporal (kg) y porcentaje graso de los alumnos.
* Gráficas visuales de evolución para que los socios vean su progreso físico a lo largo de las semanas.

---

## 💻 Pila Tecnológica

* **Frontend & Backend:** [Next.js 16](https://nextjs.org/) (App Router & Server Actions) con [React 19](https://react.dev/).
* **Estilos:** [Tailwind CSS 4](https://tailwindcss.com/) con tokens dinámicos por centro.
* **Base de datos & Auth:** [Supabase](https://supabase.com/) (PostgreSQL con funciones PL/pgSQL y Row-Level Security para aislamiento estricto de cada gimnasio).
* **Protección anti-bots:** [Cloudflare Turnstile](https://www.cloudflare.com/products/turnstile/).
* **Generación de documentos:** [jsPDF](https://github.com/parallax/jsPDF) para recibos vectoriales.
* **Mensajería:** [Nodemailer](https://nodemailer.com/) / [Resend](https://resend.com/) con cifrado AES-256-GCM para credenciales de correo.

---

## 🛠️ Puesta en Marcha Rápida (Local)

1. **Clonar el repositorio:**
   ```bash
   git clone https://github.com/kante420/OpenGym.git
   cd open-gym
   npm install
   ```

2. **Variables de entorno:**
   Copia el archivo de ejemplo y completa tus claves de Supabase y correo:
   ```bash
   cp .env.example .env.local
   ```

3. **Ejecutar migraciones en Supabase:**
   En el SQL Editor de tu proyecto en Supabase, ejecuta los scripts de `supabase/migrations/` en orden (`0000` a `0006`).

4. **Iniciar en desarrollo:**
   ```bash
   npm run dev
   ```
   Abre [http://localhost:3000](http://localhost:3000) y pulsa en **"Crear gimnasio"** para registrar tu centro deportivo.

---

## 📄 Licencia

Este proyecto está bajo licencia de código abierto **MIT**. Puedes usarlo, modificarlo y desplegarlo libremente para tu centro deportivo.
