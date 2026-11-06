const fs = require('fs');
const sqlite3 = require('/usr/local/lib/node_modules/n8n/node_modules/sqlite3');
const db = new sqlite3.Database('/home/node/.n8n/database.sqlite');

db.get("SELECT * FROM workflow_entity WHERE id = 'PatitasChoche01'", (err, row) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }

  const nodes = JSON.parse(row.nodes);
  const connections = JSON.parse(row.connections);

  // 1. Update/Create Node "Router Admin vs Cliente"
  const routerNode = {
    parameters: {
      jsCode: `const body = $json.body || {};
const payload = body.payload || {};
const from = (payload.from || '').replace(/@.*$/, '');
const text = (payload.body || '').trim().toLowerCase();

// Admin phone check (matches 4621472372)
const isAdmin = from.includes('4621472372');

const hasNumber = text.match(/\\$?(\\d{2,3})\\b/);
const hasRepartidor = /\\b(1|2|3|miguel|migue|migel|edgar|edgr|edgard|manual|mano)\\b/i.test(text);

if (isAdmin && (hasRepartidor || hasNumber)) {
  let repartidor = 'Manual';
  if (/\\b(1|miguel|migue|migel)\\b/i.test(text)) repartidor = 'Miguel';
  else if (/\\b(2|edgar|edgr|edgard)\\b/i.test(text)) repartidor = 'Edgar';
  else if (/\\b(3|manual|mano)\\b/i.test(text)) repartidor = 'Manual';

  const costo = hasNumber ? parseInt(hasNumber[1], 10) : 35;

  return [
    [], // Output 0: Cliente
    [{ json: { isAdminCommand: true, repartidor, costo, rawText: text } }] // Output 1: Admin
  ];
}

// Normal customer message -> Output 0
return [
  [{ json: $json }],
  []
];`
    },
    type: "n8n-nodes-base.code",
    typeVersion: 2,
    position: [-680, 0],
    id: "f1a2b3c4-0001-4000-8000-000000000020",
    name: "Router Admin vs Cliente"
  };

  // 2. Node "Guardar y Notificar Admin" (replaces Notificar Administrador)
  // Saves pending order to /home/node/ultimo_pedido.json and sends WhatsApp to admin
  const saveAndNotifyNode = {
    parameters: {
      jsCode: `const fs = require('fs');
const ctx = $('Preparar Contexto').first().json;
const res = $('Formatear Respuesta').first().json;
const p = res.pedidoData || {};

const rawTotal = (p.total || '0').replace(/[^0-9]/g, '');
const totalComida = parseInt(rawTotal || '0', 10);

const pedidoObj = {
  cliente: p.cliente || ctx.clienteNombre,
  telefono: ctx.telefono,
  chatId: ctx.chatId,
  tipoEntrega: p.tipoEntrega || 'A Domicilio',
  direccion: p.direccion || 'Dirección en conversación',
  detalle: p.detalle || 'Detalle en conversación',
  totalComida: totalComida,
  totalStr: p.total || ('$' + totalComida + ' MXN'),
  fecha: p.fecha || ctx.fechaActual
};

try {
  fs.writeFileSync('/home/node/ultimo_pedido.json', JSON.stringify(pedidoObj, null, 2));
} catch (e) {}

const mensajeAdmin = "🔔 *NUEVO PEDIDO A DOMICILIO - DOÑA IMELDA* 🐷\\n\\n" +
  "👤 *Cliente:* " + pedidoObj.cliente + "\\n" +
  "📱 *Teléfono:* +" + pedidoObj.telefono + "\\n" +
  "📍 *Dirección:* " + pedidoObj.direccion + "\\n\\n" +
  "📋 *Comanda:*\\n" + pedidoObj.detalle + "\\n\\n" +
  "💵 *Total Comida:* " + pedidoObj.totalStr + "\\n\\n" +
  "🛵 *ASIGNAR REPARTIDOR:*\\n" +
  "Responde a este mensaje con el repartidor y costo:\\n\\n" +
  "*1 [costo]* 👉 Enviar con *Miguel* (ejemplo: *1 35*)\\n" +
  "*2 [costo]* 👉 Enviar con *Edgar* (ejemplo: *2 30*)\\n" +
  "*3 [costo]* 👉 Asignación *Manual* (ejemplo: *3 25*)";

return [{
  json: {
    adminChatId: "5214621472372@c.us",
    mensajeAdmin
  }
}];`
    },
    type: "n8n-nodes-base.code",
    typeVersion: 2,
    position: [850, -120],
    id: "f1a2b3c4-0001-4000-8000-000000000021",
    name: "Guardar y Preparar Alerta Admin"
  };

  const enviarAlertaAdminNode = {
    parameters: {
      method: "POST",
      url: "http://waha_restaurante:3000/api/sendText",
      sendHeaders: true,
      headerParameters: {
        parameters: [
          { name: "X-Api-Key", value: "patitas123" },
          { name: "Content-Type", value: "application/json" }
        ]
      },
      sendBody: true,
      specifyBody: "json",
      jsonBody: `={{
  JSON.stringify({
    session: "restaurante_session",
    chatId: $('Guardar y Preparar Alerta Admin').first().json.adminChatId,
    text: $('Guardar y Preparar Alerta Admin').first().json.mensajeAdmin
  })
}}`,
      options: {}
    },
    type: "n8n-nodes-base.httpRequest",
    typeVersion: 4.5,
    position: [1050, -120],
    id: "f1a2b3c4-0001-4000-8000-000000000022",
    name: "Enviar Alerta WhatsApp Admin",
    onError: "continueRegularOutput"
  };

  // 3. Admin Command Pipeline nodes:
  // Node "Procesar Despacho":
  const procesarDespachoNode = {
    parameters: {
      jsCode: `const fs = require('fs');
const cmd = $json;
const repartidor = cmd.repartidor || 'Miguel';
const costo = cmd.costo || 35;

let pedido = null;
try {
  if (fs.existsSync('/home/node/ultimo_pedido.json')) {
    pedido = JSON.parse(fs.readFileSync('/home/node/ultimo_pedido.json', 'utf8'));
  }
} catch (e) {}

if (!pedido) {
  return [{
    json: {
      error: true,
      msgAdmin: "⚠️ No hay pedidos a domicilio pendientes en el sistema para despachar."
    }
  }];
}

const totalFinal = (pedido.totalComida || 0) + costo;

const msgCliente = "¡Oinc oinc! 🐷 ¡Excelentes noticias, *" + pedido.cliente + "*!\\n\\n" +
  "Tu pedido ya fue preparado y va en camino con nuestro repartidor *" + repartidor + "* 🛵💨.\\n\\n" +
  "• Comida: " + pedido.totalStr + "\\n" +
  "• Costo de envío: *$" + costo + " MXN*\\n" +
  "👉 *Total final a pagar: $" + totalFinal + " MXN*\\n\\n" +
  "¡Muchísimas gracias por tu preferencia en *Patitas de Puerco Doña Imelda*! ¡Para chuparse los dedos! 🐷🌶️🍋";

const msgAdmin = "✅ *¡PEDIDO DESPACHADO CON ÉXITO!* 🛵\\n\\n" +
  "• Cliente: *" + pedido.cliente + "*\\n" +
  "• Repartidor asignado: *" + repartidor + "*\\n" +
  "• Costo de envío: *$" + costo + " MXN*\\n" +
  "• Total final cliente: *$" + totalFinal + " MXN*\\n" +
  "• Notificación enviada al WhatsApp del cliente.\\n" +
  "• Registro actualizado en Google Sheets.";

return [{
  json: {
    clienteChatId: pedido.chatId,
    adminChatId: "5214621472372@c.us",
    msgCliente,
    msgAdmin,
    filaSheet: {
      "Fecha y Hora": pedido.fecha,
      "Cliente": pedido.cliente,
      "Teléfono / WhatsApp": "+" + pedido.telefono + " (https://wa.me/" + pedido.telefono + ")",
      "Tipo de Entrega": "A Domicilio (Repartidor: " + repartidor + " - Envío: $" + costo + ")",
      "Detalle del Pedido": pedido.detalle + "\\n• Envío con " + repartidor + " ($" + costo + ")",
      "Total Estimado": "$" + totalFinal + " MXN",
      "Forma de Pago": "Por definir",
      "Dirección / Referencias": pedido.direccion,
      "Estatus del Pedido": "En camino con " + repartidor
    }
  }
}];`
    },
    type: "n8n-nodes-base.code",
    typeVersion: 2,
    position: [-450, 250],
    id: "f1a2b3c4-0001-4000-8000-000000000023",
    name: "Procesar Despacho Admin"
  };

  const avisarClienteNode = {
    parameters: {
      method: "POST",
      url: "http://waha_restaurante:3000/api/sendText",
      sendHeaders: true,
      headerParameters: {
        parameters: [
          { name: "X-Api-Key", value: "patitas123" },
          { name: "Content-Type", value: "application/json" }
        ]
      },
      sendBody: true,
      specifyBody: "json",
      jsonBody: `={{
  JSON.stringify({
    session: "restaurante_session",
    chatId: $('Procesar Despacho Admin').first().json.clienteChatId,
    text: $('Procesar Despacho Admin').first().json.msgCliente
  })
}}`,
      options: {}
    },
    type: "n8n-nodes-base.httpRequest",
    typeVersion: 4.5,
    position: [-220, 200],
    id: "f1a2b3c4-0001-4000-8000-000000000024",
    name: "Avisar al Cliente Despacho",
    onError: "continueRegularOutput"
  };

  const confirmarAdminNode = {
    parameters: {
      method: "POST",
      url: "http://waha_restaurante:3000/api/sendText",
      sendHeaders: true,
      headerParameters: {
        parameters: [
          { name: "X-Api-Key", value: "patitas123" },
          { name: "Content-Type", value: "application/json" }
        ]
      },
      sendBody: true,
      specifyBody: "json",
      jsonBody: `={{
  JSON.stringify({
    session: "restaurante_session",
    chatId: $('Procesar Despacho Admin').first().json.adminChatId,
    text: $('Procesar Despacho Admin').first().json.msgAdmin
  })
}}`,
      options: {}
    },
    type: "n8n-nodes-base.httpRequest",
    typeVersion: 4.5,
    position: [-220, 320],
    id: "f1a2b3c4-0001-4000-8000-000000000025",
    name: "Confirmar a Admin Despacho",
    onError: "continueRegularOutput"
  };

  const sheetDespachoNode = {
    parameters: {
      authentication: "serviceAccount",
      operation: "append",
      documentId: {
        __rl: true,
        value: "1L_RZBWUpsB8bMt9Ij-MavigEEN5BifnLv8fWIm0tzKc",
        mode: "list",
        cachedResultName: "Pedidos - Patitas Doña Imelda",
        cachedResultUrl: "https://docs.google.com/spreadsheets/d/1L_RZBWUpsB8bMt9Ij-MavigEEN5BifnLv8fWIm0tzKc/edit"
      },
      sheetName: {
        __rl: true,
        value: "gid=0",
        mode: "list",
        cachedResultName: "Hoja 1",
        cachedResultUrl: "https://docs.google.com/spreadsheets/d/1L_RZBWUpsB8bMt9Ij-MavigEEN5BifnLv8fWIm0tzKc/edit#gid=0"
      },
      columns: {
        mappingMode: "autoMapInputData"
      },
      options: {
        handlingExtraData: "insertInNewColumn"
      }
    },
    type: "n8n-nodes-base.googleSheets",
    typeVersion: 4.5,
    position: [0, 250],
    id: "f1a2b3c4-0001-4000-8000-000000000026",
    name: "Actualizar Sheet Despachado",
    onError: "continueRegularOutput",
    credentials: {
      googleApi: {
        id: "GvhAo92zAhKkkHGj",
        name: "Google Service Account account"
      }
    }
  };

  // Replace / Add nodes in nodes array
  const nodeNamesToRemove = [
    'Notificar Administrador',
    'Router Admin vs Cliente',
    'Guardar y Preparar Alerta Admin',
    'Enviar Alerta WhatsApp Admin',
    'Procesar Despacho Admin',
    'Avisar al Cliente Despacho',
    'Confirmar a Admin Despacho',
    'Actualizar Sheet Despachado'
  ];

  for (let i = nodes.length - 1; i >= 0; i--) {
    if (nodeNamesToRemove.includes(nodes[i].name)) {
      nodes.splice(i, 1);
    }
  }

  nodes.push(routerNode);
  nodes.push(saveAndNotifyNode);
  nodes.push(enviarAlertaAdminNode);
  nodes.push(procesarDespachoNode);
  nodes.push(avisarClienteNode);
  nodes.push(confirmarAdminNode);
  nodes.push(sheetDespachoNode);

  // Update Connections:
  // Webhook Pedido -> Router Admin vs Cliente
  connections['Webhook Pedido'] = {
    main: [[{ node: 'Router Admin vs Cliente', type: 'main', index: 0 }]]
  };

  // Router Admin vs Cliente:
  // Output 0 (Cliente) -> Filtro Mensajes
  // Output 1 (Admin) -> Procesar Despacho Admin
  connections['Router Admin vs Cliente'] = {
    main: [
      [{ node: 'Filtro Mensajes', type: 'main', index: 0 }],
      [{ node: 'Procesar Despacho Admin', type: 'main', index: 0 }]
    ]
  };

  // Hay Pedido? (true) ->
  // 1) Preparar Fila Sheet -> Registrar Pedido en Google Sheets
  // 2) Guardar y Preparar Alerta Admin -> Enviar Alerta WhatsApp Admin
  connections['Hay Pedido?'] = {
    main: [
      [
        { node: 'Preparar Fila Sheet', type: 'main', index: 0 },
        { node: 'Guardar y Preparar Alerta Admin', type: 'main', index: 0 }
      ],
      []
    ]
  };
  connections['Guardar y Preparar Alerta Admin'] = {
    main: [[{ node: 'Enviar Alerta WhatsApp Admin', type: 'main', index: 0 }]]
  };

  // Procesar Despacho Admin ->
  // 1) Avisar al Cliente Despacho
  // 2) Confirmar a Admin Despacho
  // 3) Code node or direct to Actualizar Sheet Despachado
  const filaSheetNode = {
    parameters: {
      jsCode: `return [{ json: $('Procesar Despacho Admin').first().json.filaSheet }];`
    },
    type: "n8n-nodes-base.code",
    typeVersion: 2,
    position: [-100, 250],
    id: "f1a2b3c4-0001-4000-8000-000000000027",
    name: "Preparar Fila Sheet Despacho"
  };
  nodes.push(filaSheetNode);

  connections['Procesar Despacho Admin'] = {
    main: [
      [
        { node: 'Avisar al Cliente Despacho', type: 'main', index: 0 },
        { node: 'Confirmar a Admin Despacho', type: 'main', index: 0 },
        { node: 'Preparar Fila Sheet Despacho', type: 'main', index: 0 }
      ]
    ]
  };
  connections['Preparar Fila Sheet Despacho'] = {
    main: [[{ node: 'Actualizar Sheet Despachado', type: 'main', index: 0 }]]
  };

  const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
  const newVersionId = require('crypto').randomUUID();

  db.run(
    "UPDATE workflow_entity SET nodes = ?, connections = ?, updatedAt = ?, versionId = ?, activeVersionId = ? WHERE id = 'PatitasChoche01'",
    [JSON.stringify(nodes), JSON.stringify(connections), now, newVersionId, newVersionId],
    function(updateErr) {
      if (updateErr) {
        console.error(updateErr);
        process.exit(1);
      }
      console.log('Complete Admin Dispatch Workflow installed in workflow_entity');

      db.run(
        "INSERT INTO workflow_history (versionId, workflowId, nodes, connections, authors, createdAt, updatedAt) VALUES (?, 'PatitasChoche01', ?, ?, 'system', ?, ?)",
        [newVersionId, JSON.stringify(nodes), JSON.stringify(connections), now, now],
        function(histErr) {
          if (histErr) console.warn(histErr.message);
          else console.log('Saved to workflow_history');
          process.exit(0);
        }
      );
    }
  );
});
