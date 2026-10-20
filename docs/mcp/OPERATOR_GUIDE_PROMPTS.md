# Guía de Operaciones MCP y Catálogo de Prompts Conversacionales (Gate G5)

**Destinatario:** Operadores de tienda, agentes de atención al cliente y coordinadores de fulfillment.  
**Plataforma:** Traxo MCP Gateway × Davebeauty Venezuela  
**Modo Operativo:** Fail-Closed / Read-Only por Defecto (Seguridad Grado Staging/Producción).

---

## 1. Principios Operativos y Guardrails de Seguridad

> [!IMPORTANT]
> El Gateway MCP de Traxo opera bajo el principio de **Mínimo Privilegio**. Todas las consultas están aisladas por tienda (`tenantId`). El asistente de IA **nunca creará guías con cobro real ni mutará pedidos en Dropi de forma automática**. Las operaciones de escritura requieren modo activo y aprobación humana explícita.

---

## 2. Prompts Conversacionales para Operadores No Técnicos

A continuación se presentan los prompts recomendados para interactuar con Traxo a través de clientes compatibles con MCP (Claude Desktop, Codex CLI, Cursor, etc.):

### Prompt 1: Resumen y Estado de la Tienda
```text
"Hola Traxo, por favor dame un resumen del estado actual de la tienda Davebeauty: cuántos pedidos tenemos, cuántos envíos están en tránsito o con incidencias, y cuáles servicios están conectados."
```
* **Herramienta invocada:** `traxo_estado`
* **Resultado:** Resumen de órdenes, guías activas, aprobaciones pendientes y desglose de conexiones reales/simuladas.

---

### Prompt 2: Conciliación de Órdenes y Detección de Faltantes
```text
"Traxo, concilia los últimos pedidos de WooCommerce con Dropi Venezuela. Indícame si hay órdenes pendientes por despachar, guías duplicadas o discrepancias de estado."
```
* **Herramienta invocada:** `conciliar_pedidos`
* **Resultado:** Reporte fidedigno (`source: "reconciliation_engine"`) categorizando:
  - Pedidos sincronizados en tránsito o entregados.
  - Pedidos en WooCommerce faltantes en Dropi.
  - Conflictos de estado (ej. pedidos cancelados en Woo pero en tránsito en Dropi).
  - Guías duplicadas entre diferentes clientes.

---

### Prompt 3: Verificación de Cobertura Logística en Venezuela
```text
"Un cliente desea comprar desde Lechería (estado Anzoátegui) y otro desde San Fernando de Atabapo (Amazonas). ¿Tenemos cobertura confirmada con Dropi para esas dos localidades?"
```
* **Herramienta invocada:** `consultar_cobertura` (ejecutada para `VE-B, Lechería` y `VE-Y, San Fernando de Atabapo`).
* **Resultado:**
  - `Lechería (VE-B)`: Cobertura confirmada con identificador de plaza Dropi (`dropi_place_ve-b_lecheria`).
  - `San Fernando de Atabapo (VE-Y)`: Localidad remota sin cobertura verificada en Dropi (Requiere revisión manual fuera de plataforma).

---

### Prompt 4: Cotización y Borrador de Guía sin Gasto de Saldo
```text
"Por favor cotiza el envío del pedido #1001 y muéstrame el borrador de la guía con las opciones de transportadoras disponibles, sin generar todavía la guía oficial."
```
* **Herramienta invocada:** `cotizar_envio`
* **Resultado:** Comparativa de tarifas y tiempos de entrega (MRW, Zoom, Tealca) sin deducción de saldo ni llamadas mutativas.

---

### Prompt 5: Flujo de Aprobación Humana (Human-in-the-Loop)
```text
"Revisa la cotización del pedido #1001. Si la mejor opción es MRW por $3.50, genera una solicitud de aprobación para que yo la autorice."
```
* **Comportamiento:** El sistema genera un borrador de aprobación (`pending_approval`) con token criptográfico. Ningún despacho se emite hasta que el operador responde: `"Autorizo el despacho #1001 con MRW"`.

---

## 3. Conector Shopify Opcional (Arquitectura Multi-Tienda)

Traxo es agnóstico a la plataforma comercial. Para operar tiendas Shopify en paralelo o como canal secundario:

1. **Variables de Entorno requeridas (`.env`):**
   ```bash
   SHOPIFY_STORE_DOMAIN=davebeauty-ve.myshopify.com
   SHOPIFY_ADMIN_TOKEN=shpat_xxxxxxxxxxxxxxxxxxxxxxxx
   SHOPIFY_WEBHOOK_SECRET=shpss_xxxxxxxxxxxxxxxxxxxxxxx
   SHOPIFY_API_VERSION=2025-01
   ```
2. **Interoperabilidad:**
   - La fábrica [`packages/commerce/src/factory.ts`](file:///home/daverod/Documents/01_Productos_Davetech/traxo-agente/packages/commerce/src/factory.ts) detecta automáticamente las credenciales e inicializa `ShopifyCommerce` bajo el mismo contrato unificado `CommerceAdapter`.
   - Admite direcciones venezolanas con normalización telefónica internacional E.164 (+58).
   - Si no se definen credenciales de Shopify, el sistema opera exclusivamente con WooCommerce sin emitir advertencias ni degradar el rendimiento.
