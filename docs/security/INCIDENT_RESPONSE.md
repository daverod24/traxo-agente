# Protocolo y Runbook de Respuesta a Incidentes de Seguridad (Gate G6)

**Plataforma:** Traxo VE Gateway & WordPress Headless  
**Nivel de Severidad:** Alta / Crítica  
**Responsable Técnico:** Agente A3 (MCP, AI Agent Security & Tooling Engineer)  
**Fecha de Vigencia:** Octubre 2026 en adelante  

---

## 1. Clasificación de Incidentes de Seguridad

| Nivel | Tipo de Incidente | Criterio de Activación | Tiempo Máximo de Respuesta (SLA) |
|---|---|---|---|
| **P1 - Crítico** | **Fuga de Credenciales / Acceso Cross-Tenant no Autorizado** | Filtración de `TRAXO_MCP_TOKEN`, acceso a datos de una tienda desde otra, o bypass de autenticación. | **< 15 minutos** |
| **P2 - Alto** | **Ataque de Fuerza Bruta / Denegación de Servicio (DoS)** | Exceso masivo de peticiones HTTP en `/api` o `/mcp` disparando 429 recurrentes de una misma subred. | **< 1 hora** |
| **P3 - Medio** | **Firma HMAC Inválida Recurrente en Webhooks** | Múltiples errores 401 en `/webhooks/commerce/woocommerce` indicando posible ataque de falsificación o replay. | **< 4 horas** |
| **P4 - Bajo** | **Discrepancia Masiva en Conciliación de Órdenes** | Desincronización anómala entre WooCommerce y Dropi por cambio no anunciado en la API externa. | **< 12 horas** |

---

## 2. Protocolo de Contención Inmediata (Incidente P1 / P2)

### Paso 1: Aislamiento Fail-Closed
Si se sospecha compromiso de credenciales o ataque en curso, detener el tráfico entrante al worker o degradar a modo seguro:
```bash
# Apagar temporalmente el Gateway MCP o restablecer token a valor vacío (Fail-Closed inmediato)
export TRAXO_MCP_TOKEN=""
# En producción Docker / Compose:
docker compose -p davebeauty restart worker
```

### Paso 2: Rotación de Secretos y Credenciales
1. **Rotar `TRAXO_MCP_TOKEN`:**
   Generar nuevo token criptográfico de alta entropía (mínimo 32 caracteres):
   ```bash
   NEW_TOKEN=$(openssl rand -hex 24)
   echo "TRAXO_MCP_TOKEN=tok_${NEW_TOKEN}"
   ```
2. **Rotar WooCommerce REST Keys:**
   - En wp-admin: `WooCommerce > Ajustes > Avanzado > REST API`.
   - Revocar la clave comprometida (`ck_...` / `cs_...`).
   - Emitir nuevo par de claves con permisos de Lectura/Escritura y actualizar `.env`.
3. **Rotar Webhook Secret:**
   - Actualizar `WOOCOMMERCE_WEBHOOK_SECRET` en el archivo `.env` del worker.
   - Actualizar el secreto en los ajustes del webhook en WordPress.

### Paso 3: Restablecimiento y Validación
1. Reiniciar contenedores afectados.
2. Ejecutar la suite de seguridad:
   ```bash
   pnpm vitest run apps/worker/test/mcp-auth-security.test.ts apps/worker/test/e2e-security-sandbox.test.ts
   ```
3. Verificar que el token revocado recibe `401 Unauthorized` y el nuevo opera correctamente.

---

## 3. Auditoría Forense y Redacción de PII

1. **Revisión de Logs:**
   Examinar los registros de auditoría en busca de accesos no autorizados:
   - Gracias a las políticas de sanitización de Gate G4 ([`apps/worker/src/security.ts`](file:///home/daverod/Documents/01_Productos_Davetech/traxo-agente/apps/worker/src/security.ts)), los números de teléfono (+58), correos y contraseñas no se almacenan en texto plano en los archivos de log.
2. **Registro de Auditoría:**
   Documentar en un informe post-mortem:
   - Vector de entrada inicial.
   - Tiendas y órdenes consultadas durante la ventana del incidente.
   - Acciones correctivas implementadas y confirmación de rotación.
