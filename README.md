<p align="center">
  <img src="docs/hero.svg" alt="Traxo: Sistema Operativo Agéntico de E-Commerce para Venezuela y LatAm" width="100%">
</p>

<p align="center">
  <a href="LICENSE"><img alt="Licencia MIT" src="https://img.shields.io/badge/licencia-MIT-FFC800"></a>
  <img alt="Node >=22" src="https://img.shields.io/badge/node-%E2%89%A522-111111">
  <img alt="Mercado: Venezuela (VE)" src="https://img.shields.io/badge/mercado-Venezuela%20(VE)-00247D">
  <img alt="Bimoneda: USD / VES BCV" src="https://img.shields.io/badge/moneda-USD%20%2F%20Bs.%20BCV-007A3D">
  <img alt="Headless: WooCommerce + Astro" src="https://img.shields.io/badge/stack-WooCommerce%20%2B%20Astro-96588A">
  <img alt="Dokploy Ready" src="https://img.shields.io/badge/dokploy-ready--to--prod-blue">
</p>

---

# Traxo Agente: Sistema Operativo Agéntico de E-Commerce para Venezuela

**Traxo** es un sistema operativo agéntico autónomo de código abierto diseñado para operar, automatizar y escalar comercios electrónicos en Venezuela y Latinoamérica. Administra la logística nacional, conciliación de pagos en Bolívares y divisas, mensajería conversacional por WhatsApp (+58), marketing y sincronización bidireccional con tiendas Headless (WooCommerce + Astro).

---

## 🇻🇪 Adaptación Nativa para Venezuela (Venezolanización Integral)

1. **Bimoneda Nativa Oficial (USD & Bolívares BCV):**
   - Moneda base en **Dólares estadounidenses (USD)** con conversión referencial en **Bolívares (VES)** a la **Tasa Oficial del Banco Central de Venezuela (`TRAXO_BCV_RATE="880.00"`)**.
   - Cálculos financieros con precisión decimal exacta (`packages/core/src/money.ts`). Cero pérdidas cambiarias en catálogos y reportes.

2. **Pasarelas de Pago Venezolanas y Conciliación 1-Clic:**
   - **MisPidi ([mispidi.com](https://mispidi.com)):** Pasarela con respaldo de Banco Sofitasa, verificación de webhooks firmados con HMAC-SHA256 y API de verificación de transacciones.
   - **AvilaPay ([avilapay.com](https://avilapay.com)):** Orquestador multimoneda USD/VES y liquidación automática.
   - **Bancrecer Connect (0174):** Consulta interbancaria en tiempo real contra el core de Bancrecer validando número de referencia, teléfono emisor, cédula/RIF y monto en Bs.
   - **Flujo de Conciliación 1-Clic:** El operador valida comprobantes con un solo clic desde el Dashboard, pasando el pedido en Traxo a `prepaid`/`confirmed`, sincronizando el estado en WooCommerce a `processing` y disparando la guía logística.
   - **Endpoint Automatizado:** `POST /api/payments/validate-ve` para validación directa mediante APIs bancarias.

3. **Logística y Couriers Nacionales:**
   - Integración nativa con **Dropi Venezuela** (Flash Courier bajo demanda).
   - Envíos nacionales con agencias y puerta a puerta: **MRW**, **Grupo Zoom** y **Tealca**.
   - Regiones y hubs logísticos: Caracas (Distrito Capital), Valencia (Carabobo), Maracaibo (Zulia), Barquisimeto (Lara), Maracay (Aragua), San Cristóbal (Táchira), Puerto Ordaz / Guayana (Bolívar), Lechería (Anzoátegui) y Porlamar (Nueva Esparta).

4. **Comercio Conversacional por WhatsApp (+58):**
   - Notificaciones transaccionales automáticas con formato venezolano E.164 (`+58 412/414/424/416/426`).
   - Plantillas contextuales para confirmación de pedidos, actualización de despachos, entrega en camino y recordatorios de pago.

5. **Arquitectura Headless (WooCommerce HPOS + Astro):**
   - **WooCommerce REST API v3:** Sincronización continua de pedidos, clientes y notas con High-Performance Order Storage (HPOS).
   - **Store Builder Headless:** Generador de patrones Gutenberg con bloqueo de maquetación (`templateLock="contentOnly"`) y exportación a componentes Astro Headless empaquetados (`tokens.json`, `Hero.astro`, `Showcase.astro`).
   - Acceso y edición visual directa desde el panel a `wp-admin` y páginas en vivo.

6. **Asistente IA Venezolanizado:**
   - Consulta interactiva en lenguaje natural de ventas, pedidos con novedad, tasas oficiales BCV y transportadoras locales.

---

## 🏛️ Arquitectura del Monorepo

```
traxo-agente/
├── apps/
│   ├── dashboard/        # Panel de control SPA en React 19 + Vite (conmutador multi-tienda, bimoneda, constructor)
│   ├── worker/           # Servidor de ejecución y API REST en Hono + Node.js (agente, asistente, aprobaciones, webhooks)
│   └── mcp-server/       # Servidor MCP con 41 herramientas para integración con Claude Code, Cursor y Windsurf
├── packages/
│   ├── core/             # Tipos de dominio, validadores Zod y operaciones financieras bimoneda
│   ├── commerce/         # Adaptadores de e-commerce (WooCommerce HPOS, Shopify, Tiendanube, Mock)
│   ├── market-ve/        # Normalizadores de teléfonos (+58), estados, cédulas y fixtures venezolanos
│   ├── payments/         # Integración de pasarelas VE (MisPidi, AvilaPay, Bancrecer Connect, validadores)
│   ├── messaging/        # Motor de plantillas conversacionales para WhatsApp y mensajería
│   ├── storefront/       # Generador de temas Gutenberg y componentes Astro Headless
│   ├── carriers/         # Cotización y seguimiento de envíos (Dropi VE, MRW, Zoom, Tealca)
│   ├── growth/           # Generación de copys, campañas publicitarias y auditorías de catálogo
│   └── db/               # Cliente Prisma ORM con soporte PostgreSQL y PGlite en WASM
```

---

## 🚀 Inicio Rápido (Desarrollo Local)

### Requisitos
* Node.js $\ge 22$ y pnpm $\ge 9$
* Docker y Docker Compose (opcional para stack completo con WordPress)

### Instalación
```bash
# 1. Clonar repositorio
git clone https://github.com/daverod24/traxo-agente.git
cd traxo-agente

# 2. Instalar dependencias
pnpm install

# 3. Generar cliente Prisma
pnpm db:generate

# 4. Iniciar en modo desarrollo
pnpm dev
```

El panel estará disponible en `http://localhost:8787` (o `http://localhost:3000` si usas el proxy local).

### Credenciales de Demo Local
* **Email:** `admin@traxo.demo`
* **Contraseña:** `traxo-demo`

---

## 🧪 Pruebas Automatizadas

El proyecto cuenta con una amplia suite de pruebas unitarias y de integración que certifican la adaptación venezolana:

```bash
# Ejecutar suite especializada de Venezuela
pnpm test:ve

# Ejecutar pruebas del asistente conversacional
pnpm vitest run apps/worker/test/assistant-ve.test.ts

# Ejecutar pruebas de pasarelas venezolanas (MisPidi, AvilaPay, Bancrecer)
pnpm vitest run packages/payments/test/venezuela.test.ts

# Ejecutar pruebas de conciliación y sincronización con WooCommerce
pnpm vitest run apps/worker/test/payment-reconciliation.test.ts
```

---

## 🚢 Despliegue en Producción (Dokploy / VPS)

Traxo está certificado para producción en Dokploy junto con el stack WordPress Headless (`daveecomsolutions`):

* **Imagen Docker:** `traxo-agente:latest` construida mediante el [`Dockerfile`](Dockerfile).
* **Persistencia:** Almacenamiento seguro mediante volumen persistente `traxo_data:/app/.traxo-data`.
* **Seguridad:** Cero puertos expuestos al exterior; enrutamiento mediante proxy inverso Traefik con SSL automático (Let's Encrypt).
* **Variables de Entorno Clave:**
  ```ini
  TRAXO_DEMO=0
  TRAXO_SESSION_SECRET=generar_hex_secreto_64_chars
  TRAXO_STORE_NAME=Davebeauty
  TRAXO_STORE_URL=https://api.davebeauty.daverod.tech
  WOOCOMMERCE_URL=http://nginx
  WOOCOMMERCE_KEY=ck_tu_clave_real
  WOOCOMMERCE_SECRET=cs_tu_secreto_real
  MARKET=VE
  TRAXO_CURRENCY=USD
  TRAXO_SECONDARY_CURRENCY=VES
  TRAXO_BCV_RATE=880.00
  ```

---

## 📄 Licencia

Este proyecto está bajo la Licencia **MIT**. Consulta el archivo [LICENSE](LICENSE) para más detalles.
