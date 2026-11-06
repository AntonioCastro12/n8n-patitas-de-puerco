const fs = require('fs');
const path = 'C:/Users/antonio.castro/documents/desarrollo/patitas-puerco/workflow_current.json';
const w = JSON.parse(fs.readFileSync(path, 'utf8'));

// 1. Update "Es Comando Admin?"
const nodeEsAdmin = w.nodes.find(n => n.name === 'Es Comando Admin?');
if (nodeEsAdmin) {
  nodeEsAdmin.parameters = {
    conditions: {
      options: {
        caseSensitive: false,
        leftValue: "",
        typeValidation: "loose",
        version: 2
      },
      conditions: [
        {
          id: "cond-is-admin-or-repartidor",
          leftValue: `={{ (() => {
  const payload = $json.body?.payload || {};
  const text = (payload.body || '').trim().toLowerCase();
  if (!text || text.length === 0) return false;

  const from = payload.from || '';
  const alt = payload._data?.key?.remoteJidAlt || '';
  const to = payload.to || '';

  let esperandoRepartidor = false;
  let repEsperado = '';
  try {
    const fs = require('fs');
    if (fs.existsSync('/home/node/.n8n/ultimo_pedido.json')) {
      const p = JSON.parse(fs.readFileSync('/home/node/.n8n/ultimo_pedido.json', 'utf8'));
      if (p.estado === 'esperando_cotizacion_repartidor') {
        esperandoRepartidor = true;
        repEsperado = (p.repartidor || '').toLowerCase();
      }
    }
  } catch(e) {}

  // Números registrados:
  // Admin: 4621472372 o 4623361636
  // Edgar: 4623688190
  const isFromEdgar  = from.includes('4623688190') || alt.includes('4623688190');
  const isFromAdmin  = from.includes('4621472372') || alt.includes('4621472372') ||
                       from.includes('4623361636') || alt.includes('4623361636') ||
                       to.includes('4623361636');

  // Si un repartidor responde con el precio (ej: 90, 45, $90):
  const isPriceNumber = /^\\$?(\\d{2,3})$/.test(text);
  if (esperandoRepartidor && isPriceNumber) {
    if (repEsperado === 'edgar'  && (isFromEdgar  || isFromAdmin)) return true;
    return true; // Cualquier repartidor asignado respondiendo el precio
  }

  // Comandos de selección del Administrador (1, 2, 3 [costo], miguel, edgar, manual):
  const isFood = /\\b(orden|media|tostada|patita|pata|cuerito|oreja|queso|ceviche|tartara|t[aá]rtara|men[uú]|buenas?|hola|antojo|kilo|para llevar|recoger|domicilio|precio|cu[aá]nto|calle|colonia|efectivo|transferencia)\\b/i.test(text);
  const isDispatch = /^ *(1|2|3|miguel|migue|migel|edgar|edgr|edgard|manual|mano|\\$?\\d{2,3})( *\\$?\\d{2,3}| *(miguel|migue|migel|edgar|edgr|edgard|manual|mano))? *$/i.test(text);

  return (isFromAdmin || isFromEdgar) && !isFood && isDispatch;
})() }}`,
          rightValue: "",
          operator: {
            type: "boolean",
            operation: "true",
            singleValue: true
          }
        }
      ],
      combinator: "and"
    }
  };
}

// 2. Update "Guardar y Preparar Alerta Admin" (Sends alert to Admin to choose 1, 2 or 3)
const nodeAlerta = w.nodes.find(n => n.name === 'Guardar y Preparar Alerta Admin');
if (nodeAlerta) {
  nodeAlerta.parameters.jsCode = `const fs = require('fs');
const ctx = $('Preparar Contexto').first().json;
const res = $('Formatear Respuesta').first().json;
const p = res.pedidoData || {};

const rawTotal = (p.total || p.subtotal || '0').replace(/[^0-9]/g, '');
const totalComida = parseInt(rawTotal || '0', 10);

const tipoEntrega = p.tipoEntrega || 'A Domicilio';
const esDomicilio = !tipoEntrega.toLowerCase().includes('recoger');

const pedidoObj = {
  cliente: p.cliente || ctx.clienteNombre,
  telefono: ctx.telefono,
  chatId: ctx.chatId,
  tipoEntrega: tipoEntrega,
  direccion: p.direccion || 'Dirección en conversación',
  detalle: p.detalle || 'Detalle en conversación',
  totalComida: totalComida,
  totalStr: p.total || ('$' + totalComida + ' MXN'),
  fecha: p.fecha || ctx.fechaActual,
  pago: p.pago || 'Efectivo',
  estado: 'pendiente_seleccion_repartidor'
};

try {
  fs.writeFileSync('/home/node/.n8n/ultimo_pedido.json', JSON.stringify(pedidoObj, null, 2));
} catch (e) {}

let mensajeAdmin = '';
if (esDomicilio) {
  mensajeAdmin = "🛵 *NUEVA COTIZACIÓN DE ENVÍO - DOÑA IMELDA* 🐷\\n\\n" +
    "👤 *Cliente:* " + pedidoObj.cliente + "\\n" +
    "📱 *Teléfono:* +" + pedidoObj.telefono + "\\n" +
    "📍 *Dirección:* " + pedidoObj.direccion + "\\n\\n" +
    "📋 *Comanda:*\\n" + pedidoObj.detalle + "\\n\\n" +
    "💵 *Subtotal Comida:* " + pedidoObj.totalStr + "\\n" +
    "💳 *Método de Pago:* " + pedidoObj.pago + "\\n\\n" +
    "👉 *¿A QUIÉN SE LO ENVIAMOS A COTIZAR?*\\n\\n" +
    "• *1* 👉 Enviar a *Miguel*\\n" +
    "• *2* 👉 Enviar a *Edgar* (+52 1 462 368 8190)\\n" +
    "• *3 [costo]* 👉 Ingresar costo *Manual* (ej: *3 35* o *35*)";
} else {
  mensajeAdmin = "🔔 *NUEVO PEDIDO PARA RECOGER - DOÑA IMELDA* 🐷\\n\\n" +
    "👤 *Cliente:* " + pedidoObj.cliente + "\\n" +
    "📱 *Teléfono:* +" + pedidoObj.telefono + "\\n\\n" +
    "📋 *Comanda:*\\n" + pedidoObj.detalle + "\\n\\n" +
    "💵 *Total:* " + pedidoObj.totalStr + "\\n" +
    "💳 *Pago:* " + pedidoObj.pago + "\\n" +
    "🏪 *Entrega:* En sucursal Los Reyes (15-25 min)\\n" +
    "✅ _Registrado automáticamente en Google Sheets._";
}

// Se envía la alerta al administrador (Antonio en 4621472372)
return [{
  json: {
    adminChatId: "5214621472372@c.us",
    mensajeAdmin
  }
}];`;
}

// 3. Update "Procesar Despacho Admin"
const nodeProcesar = w.nodes.find(n => n.name === 'Procesar Despacho Admin');
if (nodeProcesar) {
  nodeProcesar.parameters.jsCode = `const fs = require('fs');
const body = $json.body || {};
const payload = body.payload || {};
const text = (payload.body || '').trim().toLowerCase();

const NUM_EDGAR  = "5214623688190@c.us"; // WhatsApp oficial de Edgar
const NUM_ADMIN  = "5214621472372@c.us"; // WhatsApp de Antonio (Admin)

let pedido = null;
try {
  if (fs.existsSync('/home/node/.n8n/ultimo_pedido.json')) {
    pedido = JSON.parse(fs.readFileSync('/home/node/.n8n/ultimo_pedido.json', 'utf8'));
  }
} catch (e) {}

if (!pedido) {
  return [];
}

async function sendWA(chatId, msg) {
  if (!chatId || !msg || typeof msg !== 'string' || msg.trim().length === 0) return;
  try {
    await fetch('http://waha_restaurante:3000/api/sendText', {
      method: 'POST',
      headers: {
        'X-Api-Key': 'patitas123',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        session: 'restaurante_session',
        chatId: chatId,
        text: msg.trim()
      })
    });
  } catch (err) {}
}

// CASO A: El repartidor (Miguel o Edgar) o Admin responde con el costo del flete (ej: "90", "$90", "45", "35")
const numOnlyMatch = text.match(/^\\$?(\\d{2,3})$/);
if (pedido.estado === 'esperando_cotizacion_repartidor' && numOnlyMatch) {
  const costo = parseInt(numOnlyMatch[1], 10);
  const repartidor = pedido.repartidor || 'Miguel';
  const totalFinal = (pedido.totalComida || 0) + costo;

  // PASO 5: Confirmación Final al Cliente (REGLA CRÍTICA: Jamás mencionar repartidores al cliente)
  const msgCliente = "¡Oinc oinc! 🐷 ¡Muchas gracias por tu espera, *" + pedido.cliente + "*!\\n\\n" +
    "Ya tenemos la cotización de tu envío. Aquí tienes tu resumen final:\\n\\n" +
    "📋 *Resumen Final:*\\n" +
    "• Subtotal de alimentos: *" + pedido.totalStr + "*\\n" +
    "• Costo de envío: *$" + costo + " MXN*\\n" +
    "👉 *Total a pagar en efectivo: $" + totalFinal + " MXN*\\n\\n" +
    "⏱️ Tu pedido quedará listo y llegará a tu domicilio en un tiempo aproximado de *30 a 50 minutos*, dependiendo de la carga de trabajo.\\n\\n" +
    "¡Buen provecho y a chuparse los dedos! 🐷🌶️🍋";

  await sendWA(pedido.chatId, msgCliente);

  // Avisar al repartidor que su tarifa fue aceptada
  const msgRep = "✅ *¡Tarifa de $" + costo + " MXN aceptada!* 🛵\\n\\nEl pedido de *" + pedido.cliente + "* con entrega en *" + pedido.direccion + "* ya está en preparación en cocina.";
  const repChat = (repartidor === 'Edgar') ? NUM_EDGAR : NUM_MIGUEL;
  await sendWA(repChat, msgRep);

  // Confirmar al Administrador
  const msgAdmin = "✅ *¡COTIZACIÓN CONFIRMADA!* 🛵\\n\\n" +
    "• Cliente: *" + pedido.cliente + "*\\n" +
    "• Repartidor: *" + repartidor + "*\\n" +
    "• Costo de envío: *$" + costo + " MXN*\\n" +
    "• Total comensal: *$" + totalFinal + " MXN*\\n" +
    "• Promesa entrega: *30 a 50 minutos*\\n" +
    "• Notificación enviada al cliente.\\n" +
    "• Registro guardado en Google Sheets.";
  await sendWA(NUM_ADMIN, msgAdmin);

  pedido.estado = 'despachado';
  pedido.costoEnvio = costo;
  pedido.repartidor = repartidor;
  pedido.totalFinal = totalFinal;
  fs.writeFileSync('/home/node/.n8n/ultimo_pedido.json', JSON.stringify(pedido, null, 2));

  return [{
    json: {
      filaSheet: {
        "Fecha y Hora": pedido.fecha,
        "Cliente": pedido.cliente,
        "Teléfono / WhatsApp": "+" + pedido.telefono + " (https://wa.me/" + pedido.telefono + ")",
        "Tipo de Entrega": "A Domicilio (" + repartidor + " - Envío: $" + costo + " MXN)",
        "Detalle del Pedido": pedido.detalle + "\\n• Costo de envío con " + repartidor + " ($" + costo + " MXN)",
        "Total Estimado": "$" + totalFinal + " MXN",
        "Forma de Pago": pedido.pago || "Efectivo",
        "Dirección / Referencias": pedido.direccion,
        "Estatus del Pedido": "En preparación (Entrega 30-50 min)"
      }
    }
  }];
}

// CASO B: El Administrador presiona "1" (MIGUEL) -> Se le envía dirección y teléfono a Miguel
if (/^(1|miguel|migue|migel)$/i.test(text)) {
  pedido.estado = 'esperando_cotizacion_repartidor';
  pedido.repartidor = 'Miguel';
  fs.writeFileSync('/home/node/.n8n/ultimo_pedido.json', JSON.stringify(pedido, null, 2));

  const msgMiguel = "🛵 *NUEVO VIAJE PARA COTIZAR - PATITAS DOÑA IMELDA* 🐷\\n\\n" +
    "Hola Miguel, tenemos un pedido para entrega:\\n" +
    "👤 *Cliente:* " + pedido.cliente + "\\n" +
    "📍 *Dirección:* " + pedido.direccion + "\\n" +
    "📱 *Teléfono Cliente:* +" + pedido.telefono + "\\n\\n" +
    "👉 *¿Cuánto cobras de envío por este viaje?*\\n" +
    "_(Responde directamente con la tarifa, ej: *35*, *45* o *90*)_";
  await sendWA(NUM_MIGUEL, msgMiguel);

  const msgAdmin = "📲 *SOLICITUD ENVIADA A MIGUEL* 🛵\\n\\n" +
    "Se le envió la dirección y teléfono a Miguel por WhatsApp.\\n" +
    "En cuanto Miguel responda su precio (ej: *90*), el bot cerrará la cuenta automáticamente con el cliente.";
  await sendWA(NUM_ADMIN, msgAdmin);

  return [{ json: { filaSheet: {} } }];
}

// CASO C: El Administrador presiona "2" (EDGAR) -> Se le envía dirección y teléfono a Edgar
if (/^(2|edgar|edgr|edgard)$/i.test(text)) {
  pedido.estado = 'esperando_cotizacion_repartidor';
  pedido.repartidor = 'Edgar';
  fs.writeFileSync('/home/node/.n8n/ultimo_pedido.json', JSON.stringify(pedido, null, 2));

  const msgEdgar = "🛵 *NUEVO VIAJE PARA COTIZAR - PATITAS DOÑA IMELDA* 🐷\\n\\n" +
    "Hola Edgar, tenemos un pedido para entrega:\\n" +
    "👤 *Cliente:* " + pedido.cliente + "\\n" +
    "📍 *Dirección:* " + pedido.direccion + "\\n" +
    "📱 *Teléfono Cliente:* +" + pedido.telefono + "\\n\\n" +
    "👉 *¿Cuánto cobras de envío por este viaje?*\\n" +
    "_(Responde directamente con la tarifa, ej: *35*, *45* o *90*)_";
  await sendWA(NUM_EDGAR, msgEdgar);

  const msgAdmin = "📲 *SOLICITUD ENVIADA A EDGAR (+52 1 462 368 8190)* 🛵\\n\\n" +
    "Se le envió la dirección y teléfono a Edgar por WhatsApp.\\n" +
    "En cuanto Edgar responda su precio (ej: *90*), el bot cerrará la cuenta automáticamente con el cliente.";
  await sendWA(NUM_ADMIN, msgAdmin);

  return [{ json: { filaSheet: {} } }];
}

// CASO D: El Administrador elige "3" o ingresa el precio Manualmente (ej: "3 35", "manual 40", "35")
const hasExplicitPrice = text.match(/\\$?(\\d{2,3})\\b/);
let repartidor = pedido.repartidor || 'Manual';
if (/\\b(1|miguel|migue|migel)\\b/i.test(text)) repartidor = 'Miguel';
else if (/\\b(2|edgar|edgr|edgard)\\b/i.test(text)) repartidor = 'Edgar';
else if (/\\b(3|manual|mano)\\b/i.test(text)) repartidor = 'Manual';

const costo = hasExplicitPrice ? parseInt(hasExplicitPrice[1], 10) : 35;
const totalFinal = (pedido.totalComida || 0) + costo;

const msgCliente = "¡Oinc oinc! 🐷 ¡Muchas gracias por tu espera, *" + pedido.cliente + "*!\\n\\n" +
  "Ya tenemos la cotización de tu envío. Aquí tienes tu resumen final:\\n\\n" +
  "📋 *Resumen Final:*\\n" +
  "• Subtotal de alimentos: *" + pedido.totalStr + "*\\n" +
  "• Costo de envío: *$" + costo + " MXN*\\n" +
  "👉 *Total a pagar en efectivo: $" + totalFinal + " MXN*\\n\\n" +
  "⏱️ Tu pedido quedará listo y llegará a tu domicilio en un tiempo aproximado de *30 a 50 minutos*, dependiendo de la carga de trabajo.\\n\\n" +
  "¡Buen provecho y a chuparse los dedos! 🐷🌶️🍋";

await sendWA(pedido.chatId, msgCliente);

const msgAdmin = "✅ *¡COTIZACIÓN CONFIRMADA MANUALMENTE!* 🛵\\n\\n" +
  "• Cliente: *" + pedido.cliente + "*\\n" +
  "• Repartidor: *" + repartidor + "*\\n" +
  "• Costo de envío: *$" + costo + " MXN*\\n" +
  "• Total comensal: *$" + totalFinal + " MXN*\\n" +
  "• Promesa entrega: *30 a 50 minutos*\\n" +
  "• Notificación enviada al cliente.\\n" +
  "• Registro guardado en Google Sheets.";
await sendWA(NUM_ADMIN, msgAdmin);

pedido.estado = 'despachado';
pedido.costoEnvio = costo;
pedido.repartidor = repartidor;
pedido.totalFinal = totalFinal;
fs.writeFileSync('/home/node/.n8n/ultimo_pedido.json', JSON.stringify(pedido, null, 2));

return [{
  json: {
    filaSheet: {
      "Fecha y Hora": pedido.fecha,
      "Cliente": pedido.cliente,
      "Teléfono / WhatsApp": "+" + pedido.telefono + " (https://wa.me/" + pedido.telefono + ")",
      "Tipo de Entrega": "A Domicilio (" + repartidor + " - Envío: $" + costo + " MXN)",
      "Detalle del Pedido": pedido.detalle + "\\n• Costo de envío con " + repartidor + " ($" + costo + " MXN)",
      "Total Estimado": "$" + totalFinal + " MXN",
      "Forma de Pago": pedido.pago || "Efectivo",
      "Dirección / Referencias": pedido.direccion,
      "Estatus del Pedido": "En preparación (Entrega 30-50 min)"
    }
  }
}];`;
}

fs.writeFileSync(path, JSON.stringify(w, null, 2));
console.log('Successfully written exact 1, 2, 3 dispatch with Miguel and Edgar numbers!');
