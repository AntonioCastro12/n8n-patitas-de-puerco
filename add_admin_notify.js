const sqlite3 = require('/usr/local/lib/node_modules/n8n/node_modules/sqlite3');
const db = new sqlite3.Database('/home/node/.n8n/database.sqlite');

db.get("SELECT * FROM workflow_entity WHERE id = 'PatitasChoche01'", (err, row) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }

  const nodes = JSON.parse(row.nodes);
  const connections = JSON.parse(row.connections);

  // 1. Add "Notificar Administrador" node
  const notifyNode = {
    parameters: {
      method: "POST",
      url: "http://waha_restaurante:3000/api/sendButtons",
      sendHeaders: true,
      headerParameters: {
        parameters: [
          { name: "X-Api-Key", value: "patitas123" },
          { name: "Content-Type", value: "application/json" }
        ]
      },
      sendBody: true,
      specifyBody: "json",
      jsonBody: `={
  "session": "restaurante_session",
  "chatId": "5214621472372@c.us",
  "header": "🔔 NUEVO PEDIDO - DOÑA IMELDA 🐷",
  "body": "👤 Cliente: " + $('Formatear Respuesta').first().json.pedidoData.cliente + "\\n📱 WhatsApp: " + $('Formatear Respuesta').first().json.pedidoData.telefono + "\\n🛵 Entrega: " + $('Formatear Respuesta').first().json.pedidoData.tipoEntrega + "\\n📍 Dirección: " + $('Formatear Respuesta').first().json.pedidoData.direccion + "\\n\\n📋 Comanda:\\n" + $('Formatear Respuesta').first().json.pedidoData.detalle + "\\n\\n💵 Total Comida: " + $('Formatear Respuesta').first().json.pedidoData.total + "\\n\\n🛵 Elige repartidor o responde con el número y costo (ej: 1 35):",
  "footer": "Patitas de Puerco Doña Imelda",
  "buttons": [
    { "id": "btn_miguel", "text": "🛵 Miguel" },
    { "id": "btn_edgar", "text": "🛵 Edgar" },
    { "id": "btn_manual", "text": "✍️ Manual" }
  ]
}`,
      options: {}
    },
    type: "n8n-nodes-base.httpRequest",
    typeVersion: 4.5,
    position: [850, -100],
    id: "f1a2b3c4-0001-4000-8000-000000000012",
    name: "Notificar Administrador",
    retryOnFail: true,
    maxTries: 2,
    waitBetweenTries: 1000,
    onError: "continueRegularOutput"
  };

  const existingIdx = nodes.findIndex(n => n.name === 'Notificar Administrador');
  if (existingIdx !== -1) nodes.splice(existingIdx, 1);
  nodes.push(notifyNode);

  // 2. Connect:
  // Hay Pedido? (true) ->
  //    1) Preparar Fila Sheet -> Registrar Pedido en Google Sheets
  //    2) Notificar Administrador
  connections['Hay Pedido?'] = {
    main: [
      [
        { node: 'Preparar Fila Sheet', type: 'main', index: 0 },
        { node: 'Notificar Administrador', type: 'main', index: 0 }
      ],
      []
    ]
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
      console.log('Updated workflow_entity with Notificar Administrador');

      db.run(
        "INSERT INTO workflow_history (versionId, workflowId, nodes, connections, authors, createdAt, updatedAt) VALUES (?, 'PatitasChoche01', ?, ?, 'system', ?, ?)",
        [newVersionId, JSON.stringify(nodes), JSON.stringify(connections), now, now],
        function(histErr) {
          if (histErr) console.warn(histErr.message);
          else console.log('Updated workflow_history');
          process.exit(0);
        }
      );
    }
  );
});
