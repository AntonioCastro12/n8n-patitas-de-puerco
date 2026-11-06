const sqlite3 = require('/usr/local/lib/node_modules/n8n/node_modules/sqlite3');
const db = new sqlite3.Database('/home/node/.n8n/database.sqlite');

db.get("SELECT * FROM workflow_entity WHERE id = 'PatitasChoche01'", (err, row) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }

  const nodes = JSON.parse(row.nodes);
  const connections = JSON.parse(row.connections);

  // 1. Replace Router Admin vs Cliente with an IF node
  const ifRouterNode = {
    parameters: {
      conditions: {
        options: {
          caseSensitive: false,
          leftValue: "",
          typeValidation: "loose",
          version: 2
        },
        conditions: [
          {
            id: "cond-is-admin-command",
            leftValue: "={{ ($json.body?.payload?.from || '').includes('4621472372') && (/\\b(1|2|3|miguel|migue|migel|edgar|edgr|edgard|manual|mano)\\b/i.test($json.body?.payload?.body || '') || /\\$?\\d{2,3}\\b/.test($json.body?.payload?.body || '')) }}",
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
    },
    type: "n8n-nodes-base.if",
    typeVersion: 2.2,
    position: [-680, 0],
    id: "f1a2b3c4-0001-4000-8000-000000000020",
    name: "Es Comando Admin?"
  };

  // Remove old router node if exists
  const rIdx = nodes.findIndex(n => n.name === 'Router Admin vs Cliente' || n.name === 'Es Comando Admin?');
  if (rIdx !== -1) nodes.splice(rIdx, 1);
  nodes.push(ifRouterNode);

  // 2. Connect:
  // Webhook Pedido -> Es Comando Admin?
  connections['Webhook Pedido'] = {
    main: [[{ node: 'Es Comando Admin?', type: 'main', index: 0 }]]
  };

  // Es Comando Admin?:
  // Output 0 (True = Admin) -> Procesar Despacho Admin
  // Output 1 (False = Cliente) -> Filtro Mensajes
  connections['Es Comando Admin?'] = {
    main: [
      [{ node: 'Procesar Despacho Admin', type: 'main', index: 0 }],
      [{ node: 'Filtro Mensajes', type: 'main', index: 0 }]
    ]
  };

  // In Procesar Despacho Admin, ensure it extracts rawText from body:
  const despNode = nodes.find(n => n.name === 'Procesar Despacho Admin');
  if (despNode) {
    despNode.parameters.jsCode = `const fs = require('fs');
const body = $json.body || {};
const payload = body.payload || {};
const text = (payload.body || '').trim().toLowerCase();

let repartidor = 'Manual';
if (/\\b(1|miguel|migue|migel)\\b/i.test(text)) repartidor = 'Miguel';
else if (/\\b(2|edgar|edgr|edgard)\\b/i.test(text)) repartidor = 'Edgar';
else if (/\\b(3|manual|mano)\\b/i.test(text)) repartidor = 'Manual';

const numMatch = text.match(/\\$?(\\d{2,3})\\b/);
const costo = numMatch ? parseInt(numMatch[1], 10) : 35;

let pedido = null;
try {
  if (fs.existsSync('/home/node/ultimo_pedido.json')) {
    pedido = JSON.parse(fs.readFileSync('/home/node/ultimo_pedido.json', 'utf8'));
  }
} catch (e) {}

if (!pedido) {
  return [{
    json: {
      adminChatId: "5214621472372@c.us",
      clienteChatId: "",
      msgAdmin: "⚠️ No hay ningún pedido pendiente de entrega para despachar.",
      msgCliente: "",
      filaSheet: {}
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
}];`;
  }

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
      console.log('Saved If router to workflow_entity');

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
