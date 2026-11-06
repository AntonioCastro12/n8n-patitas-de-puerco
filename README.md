# Bot Patitas de Puerco Doña Imelda 🐷🍽️

Asistente virtual de toma de pedidos y cotización de envíos vía WhatsApp con Inteligencia Artificial (Gemini), n8n y WAHA.

---

## 📱 Números Configurados
- **Restaurante / Bot Choche:** `+52 1 462 336 1636`
- **Administrador:** `+52 1 462 147 2372`
- **Repartidor 1 (Miguel):** `+52 1 462 492 1594`
- **Repartidor 2 (Edgar):** `+52 1 462 368 8190`

---

## 🛵 Flujo de Cotización y Despacho
1. **Comensal:** Ordena y confirma productos.
2. **Dirección y Pago:** Proporciona dirección a domicilio y método de pago (Efectivo).
3. **Pausa:** El bot indica: *"¡Perfecto! Dame un momento en lo que confirmo el costo de envío hasta tu domicilio."*
4. **Alerta a Administrador:**
   - Opción `1`: Preguntar a Miguel por WhatsApp con dirección y teléfono.
   - Opción `2`: Preguntar a Edgar por WhatsApp con dirección y teléfono.
   - Opción `3 [costo]`: Ingresar tarifa Manual (ej: `3 35` o `35`).
5. **Cierre:** Cuando el repartidor o administrador responde la tarifa (ej: `90`), el bot suma comida + flete, calcula el total final, envía tiempo de 30 a 50 min y registra la fila en Google Sheets en una sola celda como menú/ticket.

---

## 🚀 Despliegue con Docker
```bash
docker compose up -d
```
- **n8n:** Puerto `5679` (local)
- **WAHA:** Puerto `3001` (local)
- **Workflow principal:** `workflow_current.json`
