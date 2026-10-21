# Instrucciones y Guía para Agentes de IA (AGENTS.md)

Este documento define la arquitectura, normas operativas, restricciones y pautas de codificación para agentes de IA (Claude Code, Antigravity, Cursor, Windsurf) que desarrollen sobre **Traxo Agente**.

---

## 1. Visión y Propósito del Repositorio

Traxo es un **sistema operativo agéntico de e-commerce autónomo** adaptado de raíz para operar comercios electrónicos en **Venezuela y Latinoamérica**. Cuenta con bimoneda oficial (USD / Bs. BCV), pasarelas bancarias locales (Pago Móvil, Bancrecer Connect, MisPidi, AvilaPay), logística nacional (Dropi Flash Courier, MRW, Zoom, Tealca), y conexión bidireccional con tiendas Headless (WooCommerce HPOS + Astro).

---

## 2. Reglas Inquebrantables de Mercado y Moneda (Venezuela)

1. **Entorno y Mercado:**
   - La variable `MARKET` debe ser `"VE"` por defecto.
   - Moneda principal: **`USD`** (Dólares estadounidenses con formato `$ 55.00`).
   - Moneda secundaria: **`VES`** (Bolívares con formato `Bs. 48.400,00` a tasa oficial del BCV).
2. **Tasa Oficial del BCV:**
   - Debe leerse dinámicamente de `process.env.TRAXO_BCV_RATE` o configuraciones de la tienda.
   - Tasa de referencia por defecto: **`880.00 Bs. / USD`**.
   - Nunca hardcodear tasas obsoletas ni conversiones a pesos colombianos (COP) en tiendas venezolanas.
3. **Formatos Geográficos y Telefónicos:**
   - Teléfonos: formato venezolano E.164 (`+58 412/414/424/416/426`).
   - Estados y ciudades: Caracas (Distrito Capital), Valencia (Carabobo), Maracaibo (Zulia), Barquisimeto (Lara), Maracay (Aragua), San Cristóbal (Táchira), Ciudad Guayana / Puerto Ordaz (Bolívar), Lechería / Barcelona (Anzoátegui) y Porlamar (Nueva Esparta).
   - Prohibido utilizar ciudades o códigos DANE de Colombia en tiendas o flujos configurados para Venezuela.

---

## 3. Delimitación de Capas y Paquetes (Monorepo)

* **`packages/core`:** Contratos Zod puros, cálculos con `Money` exacto y utilidades matemáticas. No debe contener dependencias de base de datos ni librerías de servidor.
* **`packages/market-ve`:** Normalizadores específicos de Venezuela (RIF/cédulas `V-`/`J-`, teléfonos `+58`, estados y fixtures).
* **`packages/payments`:** Integración con pasarelas:
  - `MisPidiGateway`: API y validación HMAC-SHA256 de webhooks (Banco Sofitasa).
  - `AvilaPayGateway`: Pasarela multimoneda USD/VES.
  - `BancrecerValidator`: Consulta en tiempo real al validador interbancario de Pago Móvil de Bancrecer (0174).
  - `VenezuelanPaymentOrchestrator`: Enrutador unificado de validación.
* **`packages/commerce`:** Adaptadores de plataformas de comercio (`WooCommerce`, `Shopify`, `Tiendanube`). En WooCommerce, siempre interactuar mediante la REST API v3 con soporte HPOS; nunca escribir consultas SQL directas a tablas de WordPress.
* **`packages/messaging`:** Plantillas conversacionales para WhatsApp y mensajería en español natural con tono cercano y tuteo respetuoso.
* **`packages/storefront`:** Generación de bloques Gutenberg (`<!-- wp:group -->`, `templateLock="contentOnly"`) y componentes Astro Headless.
* **`packages/db`:** Prisma ORM con soporte dual: PostgreSQL (producción) y PGlite en WASM (desarrollo local).
* **`apps/worker`:** Servidor Hono con API REST, webhooks, bus de eventos reactivo, asistente conversacional y flujo de aprobaciones.
* **`apps/dashboard`:** SPA en React 19 + Vite. Consume la API mediante `/api/*`. No realiza llamadas directas a bases de datos ni servicios externos.

---

## 4. Política de Seguridad y Aprobaciones ("Human-in-the-Loop")

* Cualquier acción que involucre movimiento financiero, cambio drástico de precios, publicación o eliminación de datos debe pasar por el flujo de **Aprobación 1-Clic** (`apps/worker/src/approvals.ts`).
* En modo producción (`TRAXO_DEMO=0`), las cuentas demo predeterminadas (`admin@traxo.demo`) quedan inhabilitadas y se exige autenticación segura con tokens firmados vía cookie (`TRAXO_SESSION_SECRET`).

---

## 5. Cuidado del Entorno y Disco

* **Espacio en disco:** En entornos Docker o servidores con almacenamiento limitado, evitar la reconstrucción innecesaria de imágenes (`docker build`). Priorizar la actualización de código en caliente o copias selectivas (`docker cp`) y reinicio de contenedores.
* **Persistencia:** Asegurar siempre que `/app/.traxo-data` esté respaldado por un volumen persistente (`traxo_data`).

---

## 6. Comandos de Verificación Obligatorios

Antes de dar por completado cualquier cambio:
```bash
# 1. Compilación de tipos TypeScript
pnpm typecheck

# 2. Suite completa de Venezuela (83+ pruebas)
pnpm test:ve

# 3. Compilación del Dashboard frontend
pnpm --filter @traxo/dashboard build
```
